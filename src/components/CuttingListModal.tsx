import React, { useState, useEffect } from 'react';
import { UPVCProject, UPVCFrame, CouplingConnection, CuttingItem } from '../types/upvc';
import { generateCuttingSchedule, generateProductionReports, DEFAULT_COLORS } from '../utils/upvcCalculations';
import { downloadText, downloadCostBreakupCsv } from '../utils/exportUtils';
import { getCompanyGstProfile } from './CompanyGstModal';
import { getActiveInventoryMaster, InventoryMasterItem } from '../constants/inventory';
import {
  Scissors,
  Printer,
  Download,
  FileText,
  Layers,
  CheckCircle2,
  Package,
  Wrench,
  ShieldCheck,
  Building2,
  X,
  ChevronRight,
  Barcode,
  QrCode,
  Scale,
  Sparkles,
  BarChart3,
  Maximize2,
  FileSpreadsheet,
  RefreshCw,
  Receipt,
  Boxes,
  Shield,
  Calculator,
} from 'lucide-react';
import { downloadQuotationExcelWithCad } from '../utils/excelExportUtils';
import { CadElevationDrawing } from './CadElevationDrawing';
import { CadLiveFormulaViewer } from './CadLiveFormulaViewer';

interface CuttingListModalProps {
  project?: UPVCProject;
  frames?: UPVCFrame[];
  couplings?: CouplingConnection[];
  onClose?: () => void;
  lang?: 'hi' | 'en';
  onOpenInventory?: () => void;
  initialTab?: 'production_report' | 'saw_cutting' | 'live_formula' | 'bar_nesting' | 'cost_breakup';
}

// Visual Frame Thumbnail using CadElevationDrawing (Double Size for Factory Clarity)
const ProductionFrameThumbnail: React.FC<{ frame: UPVCFrame }> = ({ frame }) => {
  return (
    <div className="w-full md:w-[460px] h-[360px] md:h-[384px] bg-white border border-slate-300 rounded-xl p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
      <CadElevationDrawing
        frames={[frame]}
        couplings={[]}
        width="100%"
        height="100%"
        showDimensions={true}
        showLabels={true}
        showHandles={true}
        showArrows={true}
        allowEnlarge={true}
        className="border-none shadow-none bg-white"
      />
    </div>
  );
};

// 1D Stock Bar Nesting Calculator (6-Meter / 6000mm Profile Bars)
interface BarCutPiece {
  id: string;
  tag: string;
  length: number;
  profileName: string;
  frameName: string;
}

interface NestingBar {
  barNumber: number;
  cuts: BarCutPiece[];
  usedLength: number;
  remainingLength: number;
}

function calculate6mNesting(sawItems: CuttingItem[], materialType: 'upvc' | 'steel' = 'upvc'): {
  bars: NestingBar[];
  totalBars: number;
  totalLinearMeters: number;
  totalCutLength: number;
  wastagePercent: number;
} {
  const BAR_LENGTH = 6000; // 6000 mm standard uPVC bar / GI steel pipe
  const SAW_KERF = 3; // 3mm saw blade cut allowance

  // Filter based on materialType
  const profilePieces: BarCutPiece[] = [];
  sawItems.forEach((item) => {
    if (materialType === 'steel') {
      if (item.itemType === 'Reinforcement') {
        for (let i = 0; i < item.quantity; i++) {
          profilePieces.push({
            id: `${item.id}-${i}`,
            tag: item.tag || 'GI-STEEL',
            length: item.length,
            profileName: item.profileName || 'GI Steel Reinforcement Tube',
            frameName: item.frameName,
          });
        }
      }
    } else {
      if (
        item.itemType === 'Outer Frame' ||
        item.itemType === 'Mullion' ||
        item.itemType === 'Transom' ||
        item.itemType === 'Sash' ||
        item.itemType === 'Coupler'
      ) {
        for (let i = 0; i < item.quantity; i++) {
          profilePieces.push({
            id: `${item.id}-${i}`,
            tag: item.tag,
            length: item.length,
            profileName: item.profileName,
            frameName: item.frameName,
          });
        }
      }
    }
  });

  // Sort descending (First-Fit Decreasing algorithm)
  profilePieces.sort((a, b) => b.length - a.length);

  const bars: NestingBar[] = [];

  profilePieces.forEach((piece) => {
    // Try to fit in an existing bar
    let placed = false;
    for (const bar of bars) {
      const neededSpace = bar.cuts.length > 0 ? piece.length + SAW_KERF : piece.length;
      if (bar.remainingLength >= neededSpace) {
        bar.cuts.push(piece);
        bar.usedLength += neededSpace;
        bar.remainingLength = BAR_LENGTH - bar.usedLength;
        placed = true;
        break;
      }
    }

    // Otherwise create a new 6m bar
    if (!placed) {
      const newBar: NestingBar = {
        barNumber: bars.length + 1,
        cuts: [piece],
        usedLength: piece.length,
        remainingLength: BAR_LENGTH - piece.length,
      };
      bars.push(newBar);
    }
  });

  const totalCutLength = profilePieces.reduce((sum, p) => sum + p.length, 0);
  const totalStockLength = bars.length * BAR_LENGTH;
  const wastageLength = Math.max(0, totalStockLength - totalCutLength);
  const wastagePercent = totalStockLength > 0 ? Math.round((wastageLength / totalStockLength) * 1000) / 10 : 0;

  return {
    bars,
    totalBars: bars.length,
    totalLinearMeters: Math.round((totalStockLength / 1000) * 10) / 10,
    totalCutLength: Math.round((totalCutLength / 1000) * 10) / 10,
    wastagePercent,
  };
}

export const CuttingListModal: React.FC<CuttingListModalProps> = ({
  project,
  frames: propFrames,
  couplings: propCouplings,
  onClose,
  lang: initialLang = 'hi',
  onOpenInventory,
  initialTab = 'production_report',
}) => {
  const [activeTab, setActiveTab] = useState<
    'production_report' | 'saw_cutting' | 'live_formula' | 'bar_nesting' | 'cost_breakup'
  >(initialTab);
  const [filterType, setFilterType] = useState<string>('all');
  const [nestingMaterial, setNestingMaterial] = useState<'upvc' | 'steel'>('upvc');
  const [selectedReportFrameId, setSelectedReportFrameId] = useState<string>('all');
  const [currentLang, setCurrentLang] = useState<'hi' | 'en'>(initialLang);
  const [inventoryList, setInventoryList] = useState<InventoryMasterItem[]>(() => getActiveInventoryMaster());

  // Listen for local and cross-tab storage updates when inventory items change
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'erp_inventory_master') {
        setInventoryList(getActiveInventoryMaster());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleRefreshInventory = () => {
    setInventoryList(getActiveInventoryMaster());
  };

  const companyProfile = getCompanyGstProfile();
  const frames = project?.frames || propFrames || [];
  const couplings = project?.couplings || propCouplings || [];

  const sawItems = generateCuttingSchedule(frames, couplings, inventoryList);
  const productionReports = generateProductionReports(frames, couplings, project, inventoryList);
  const nestingResult = calculate6mNesting(sawItems, nestingMaterial);

  const filteredSawItems = sawItems.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'profiles')
      return (
        item.itemType === 'Outer Frame' ||
        item.itemType === 'Mullion' ||
        item.itemType === 'Transom' ||
        item.itemType === 'Sash' ||
        item.itemType === 'Coupler'
      );
    if (filterType === 'steel') return item.itemType === 'Reinforcement';
    if (filterType === 'glass') return item.itemType === 'Glass';
    if (filterType === 'bead') return item.itemType === 'Glazing Bead';
    return true;
  });

  const displayedReports =
    selectedReportFrameId === 'all'
      ? productionReports
      : productionReports.filter((r) => r.frameId === selectedReportFrameId);

  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const proj: UPVCProject = project || {
        id: 'proj-cutting',
        name: 'uPVC Cutting Schedule',
        frames: frames,
        couplings: couplings,
        pricingConfig: {
          profileRatePerMeter: 480,
          mullionRatePerMeter: 540,
          sashRatePerMeter: 510,
          couplerRatePerMeter: 350,
          reinforcementRatePerMeter: 120,
          glassRatePerSqM: 1400,
          laborPerSqM: 600,
          fabricationWastagePercent: 8,
          taxPercent: 18,
          contingencyRate: 0,
        },
      };

      await downloadQuotationExcelWithCad({
        project: proj,
        clientName: proj.clientName || 'Factory Saw Shop',
        refNo: proj.referenceNo || 'CUT-2026',
        filename: `${(proj.name || 'Cutting_Schedule').replace(/\s+/g, '_')}_CAD_Drawings.xlsx`,
      });
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'cost_breakup') {
      const proj: UPVCProject = project || ({
        id: 'proj-cost',
        name: 'uPVC Project',
        frames,
        couplings,
        pricingConfig: {
          profileRatePerMeter: 480,
          mullionRatePerMeter: 540,
          sashRatePerMeter: 510,
          couplerRatePerMeter: 350,
          reinforcementRatePerMeter: 120,
          glassRatePerSqM: 1400,
          laborPerSqM: 600,
          fabricationWastagePercent: 8,
          taxPercent: 18,
          contingencyRate: 0,
        },
      } as any);
      downloadCostBreakupCsv(proj);
      return;
    }

    const headers = [
      'Tag',
      'Frame',
      'Item Type',
      'Profile Description',
      'Length (mm)',
      'Width (mm)',
      'Height (mm)',
      'Qty',
      'Cut Left',
      'Cut Right',
      'Notes',
    ];
    const rows = sawItems.map((i) => [
      i.tag,
      i.frameName,
      i.itemType,
      `"${i.profileName}"`,
      i.length,
      i.width || '-',
      i.height || '-',
      i.quantity,
      i.cutAngleLeft,
      i.cutAngleRight,
      `"${i.notes || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    downloadText(
      `uPVC_Cutting_Production_Report_${project?.referenceNo || 'Report'}_${new Date().toISOString().split('T')[0]}.csv`,
      csvContent,
      'text/csv;charset=utf-8'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* ------------------------------------------------------------- */}
        {/* Header Bar */}
        {/* ------------------------------------------------------------- */}
        <div className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wide">
                  {currentLang === 'hi'
                    ? 'फैक्ट्री प्रोडक्शन रिपोर्ट और कटिंग शेड्यूल'
                    : 'Factory Production Report & Cutting Schedule'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                  DURON 60MM STD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentLang === 'hi'
                  ? 'प्रोफाइल कटिंग, जीआई स्टील, 6M बार नेस्टिंग, हार्डवेयर, स्क्रू व रबर गास्केट विवरण'
                  : 'Industrial uPVC fabrication bill of materials, 6m bar nesting, deductions & cutting sizes'}
              </p>
            </div>
          </div>

          {/* Tab Switcher & Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setActiveTab('production_report')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'production_report'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{currentLang === 'hi' ? 'जॉब शीट (BOM)' : 'Production Report'}</span>
              </button>
              <button
                onClick={() => setActiveTab('saw_cutting')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'saw_cutting'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{currentLang === 'hi' ? 'सॉ कटिंग' : 'Saw Cutting'}</span>
              </button>
              <button
                onClick={() => setActiveTab('live_formula')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'live_formula'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-slate-700/50'
                }`}
                title="CAD Live Formula Verification"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-300" />
                <span>{currentLang === 'hi' ? 'लाइव फॉर्मूला' : 'Live Formula'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
              <button
                onClick={() => setActiveTab('bar_nesting')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'bar_nesting'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentLang === 'hi' ? '6M बार नेस्टिंग' : '6M Bar Nesting'}</span>
              </button>
              <button
                onClick={() => setActiveTab('cost_breakup')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'cost_breakup'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentLang === 'hi' ? 'लागत ब्रेकअप' : 'Cost Breakup'}</span>
              </button>
            </div>

            {/* Language Toggle */}
            <button
              onClick={() => setCurrentLang(currentLang === 'hi' ? 'en' : 'hi')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-amber-400 transition cursor-pointer"
              title="Toggle Hindi / English"
            >
              {currentLang === 'hi' ? 'ENG' : 'हिंदी'}
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isGeneratingExcel}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                isGeneratingExcel
                  ? 'bg-teal-800 text-white opacity-80 cursor-wait'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs active:scale-95'
              }`}
              title="Download full CAD Drawings in Excel Sheet (.xlsx)"
            >
              {isGeneratingExcel ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              )}
              <span className="hidden sm:inline">{isGeneratingExcel ? 'Creating...' : 'CAD Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
              title="Export CSV data"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
              title="Print fabrication sheet"
            >
              <Printer className="w-4 h-4" />
              <span>{currentLang === 'hi' ? 'प्रिंट शीट' : 'Print Sheet'}</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: FULL FACTORY PRODUCTION REPORT WITH VISUAL CAD ELEVATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'production_report' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950">
            {/* Top Frame Selector Filter if multi-frame */}
            {productionReports.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl no-print">
                <span className="text-xs font-bold text-slate-400 px-2">Filter Frame:</span>
                <button
                  onClick={() => setSelectedReportFrameId('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedReportFrameId === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All Assembly ({productionReports.length} Frames)
                </button>
                {productionReports.map((r) => (
                  <button
                    key={r.frameId}
                    onClick={() => setSelectedReportFrameId(r.frameId)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedReportFrameId === r.frameId
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {r.designRef} ({r.width}×{r.height}mm)
                  </button>
                ))}
              </div>
            )}

            {/* Individual Frame Production Sheets */}
            {displayedReports.map((report) => {
              const matchingFrame = frames.find((f) => f.id === report.frameId) || frames[0];

              // Estimated Weights Calculation
              const approxProfileLengthM = (report.width * 2 + report.height * 2) / 1000;
              const approxProfileWeightKg = Math.round(approxProfileLengthM * 1.1 * 10) / 10; // ~1.1 kg/m
              const approxSteelWeightKg = Math.round(approxProfileLengthM * 0.85 * 10) / 10; // ~0.85 kg/m
              const approxGlassWeightKg = Math.round(report.areaSqM * 12.5 * 10) / 10; // ~12.5 kg/m² for 5mm glass
              const totalUnitWeightKg = Math.round((approxProfileWeightKg + approxSteelWeightKg + approxGlassWeightKg + 2.5) * 10) / 10;

              return (
                <div
                  key={report.frameId}
                  className="bg-white text-slate-900 border border-slate-300 rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 print:p-0 print:border-none print:shadow-none font-sans"
                >
                  {/* 1. FACTORY REPORT HEADER WITH BARCODE & BRAND */}
                  <div className="border-b-2 border-slate-900 pb-4 mb-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-blue-700 inline" />
                          <span>{companyProfile.companyName || report.brand || 'DURON POLYVINYL PVT LTD'}</span>
                        </div>
                        <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                          {report.series} — WORKSHOP PRODUCTION & CUTTING JOB SHEET
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Factory: {companyProfile.address || 'Industrial Fabrication Unit'}
                        </div>
                      </div>

                      {/* Barcode & Job Card ID */}
                      <div className="text-right flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 font-bold">
                            <Barcode className="w-8 h-4 text-slate-800 inline" />
                            <span>JOB-CARD-{report.designRef}</span>
                          </div>
                          <div className="text-xs font-black text-slate-900 font-mono tracking-wider">
                            {project?.referenceNo || report.projectCode}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium">Date: {report.date}</div>
                        </div>

                        <div className="p-2 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center">
                          <QrCode className="w-9 h-9 text-slate-800" />
                        </div>
                      </div>
                    </div>

                    {/* Visual CAD Drawing & Primary Typology Card */}
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-center gap-5">
                      {/* Left: Window SVG Thumbnail */}
                      <ProductionFrameThumbnail frame={matchingFrame} />

                      {/* Right: Technical Specification Metrics */}
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs w-full">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Typology / Type</span>
                          <span className="font-extrabold text-slate-900 text-xs block truncate" title={report.typologyType}>
                            {report.typologyType}
                          </span>
                          <span className="text-[10px] text-blue-600 font-semibold">{matchingFrame.series.toUpperCase()}</span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Outer Size (W×H)</span>
                          <span className="font-mono font-black text-blue-900 text-sm block">
                            {report.width} × {report.height} mm
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {report.areaSqFt} sq.ft ({report.areaSqM} m²)
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Color / Finish</span>
                          <span className="font-bold text-slate-900 block">{report.profileFinish}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">Virgin uPVC UV Resistant</span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Estimated Unit Weight</span>
                          <span className="font-mono font-black text-emerald-800 text-sm block">
                            ~{totalUnitWeightKg} KG
                          </span>
                          <span className="text-[10px] text-slate-500">Glass + Steel + Profile</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. PROFILES & REINFORCEMENT TABLES (Side-by-Side) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                    {/* uPVC Profiles Table */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-black uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-blue-400" />
                          <span>1. uPVC Profiles Cutting List</span>
                        </span>
                        <span className="text-[10px] text-blue-300 font-mono">+6mm Weld Allowance</span>
                      </div>
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase">
                            <th className="p-2.5">Description</th>
                            <th className="p-2.5 font-mono">Item Code</th>
                            <th className="p-2.5 text-right">Cut Length</th>
                            <th className="p-2.5 text-center">Cut Angle</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-center">Pos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {report.profiles.map((p) => (
                            <tr key={p.id} className="hover:bg-blue-50/50">
                              <td className="p-2 font-semibold text-slate-900">{p.description}</td>
                              <td className="p-2 font-mono text-slate-600 font-medium">{p.itemCode}</td>
                              <td className="p-2 text-right font-mono font-bold text-blue-800 text-xs">
                                {p.dimension} mm
                              </td>
                              <td className="p-2 text-center font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-bold">
                                  {p.cutAngle}
                                </span>
                              </td>
                              <td className="p-2 text-center font-bold text-slate-900">{p.quantity}</td>
                              <td className="p-2 text-center font-bold text-slate-500">{p.position}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Steel Reinforcement Table */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-black uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>2. Galvanized Steel Reinforcement (GI)</span>
                        </span>
                        <span className="text-[10px] text-amber-300 font-mono">-100mm Weld Deduction</span>
                      </div>
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase">
                            <th className="p-2.5">Description</th>
                            <th className="p-2.5 font-mono">Item Code</th>
                            <th className="p-2.5 text-right">Steel Length</th>
                            <th className="p-2.5 text-center">Cut</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-center">Pos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {report.reinforcements.map((r) => (
                            <tr key={r.id} className="hover:bg-amber-50/50">
                              <td className="p-2 font-semibold text-slate-900">{r.description}</td>
                              <td className="p-2 font-mono text-slate-600 font-medium">{r.itemCode}</td>
                              <td className="p-2 text-right font-mono font-bold text-amber-900 text-xs">
                                {r.dimension} mm
                              </td>
                              <td className="p-2 text-center font-mono text-slate-600">{r.cutAngle}</td>
                              <td className="p-2 text-center font-bold text-slate-900">{r.quantity}</td>
                              <td className="p-2 text-center font-bold text-slate-500">{r.position}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3. HARDWARE & SCREWS TABLES */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                    {/* Hardware Table */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-black uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                          <span>3. Hardware & Mechanism Accessories</span>
                        </span>
                        <span className="text-[10px] text-indigo-300">Fittings & Locks</span>
                      </div>
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase">
                            <th className="p-2.5">Description</th>
                            <th className="p-2.5 font-mono">Item Code</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-center">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {report.hardwares.map((h) => (
                            <tr key={h.id} className="hover:bg-slate-50">
                              <td className="p-2 font-semibold text-slate-900">{h.description}</td>
                              <td className="p-2 font-mono text-slate-600 font-medium">{h.itemCode}</td>
                              <td className="p-2 text-center font-bold text-blue-700">{h.quantity}</td>
                              <td className="p-2 text-center font-semibold text-slate-500">{h.unit || 'PCS'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Screws Table */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-black uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>4. Screws & Assembly Fasteners</span>
                        </span>
                        <span className="text-[10px] text-emerald-300">Self-Drilling SDS</span>
                      </div>
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase">
                            <th className="p-2.5">Description</th>
                            <th className="p-2.5 font-mono">Item Code</th>
                            <th className="p-2.5 text-center">Qty (Pcs)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {report.screws.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="p-2 font-semibold text-slate-900">{s.description}</td>
                              <td className="p-2 font-mono text-slate-600 font-medium">{s.itemCode}</td>
                              <td className="p-2 text-center font-bold text-slate-900">{s.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. GASKETS, GLAZING & INSTALLATION TABLES */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                    {/* Gaskets Table */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-black uppercase flex items-center justify-between">
                        <span>5. Gaskets & Weatherstrip</span>
                      </div>
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase">
                            <th className="p-2">Description</th>
                            <th className="p-2 text-right">Length</th>
                            <th className="p-2 text-center">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {report.gaskets.map((g) => (
                            <tr key={g.id}>
                              <td className="p-2 font-semibold text-slate-900">{g.description}</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-800">{g.dimension} mm</td>
                              <td className="p-2 text-center font-bold text-slate-900">{g.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Glazing Table */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-black uppercase flex items-center justify-between">
                        <span>6. Glass Panes (Glazing)</span>
                        <span className="text-[10px] text-cyan-300">W×H mm</span>
                      </div>
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase">
                            <th className="p-2">Glass Type</th>
                            <th className="p-2 text-right">Size (W×H)</th>
                            <th className="p-2 text-center">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {report.glazing.map((gl) => (
                            <tr key={gl.id}>
                              <td className="p-2 font-semibold text-slate-900">{gl.description}</td>
                              <td className="p-2 text-right font-mono font-black text-cyan-900 text-xs">
                                {gl.width} × {gl.height} mm
                              </td>
                              <td className="p-2 text-center font-bold text-slate-900">{gl.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Installation Table */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-900 text-white px-3.5 py-2 text-xs font-black uppercase flex items-center justify-between">
                        <span>7. Installation Materials</span>
                      </div>
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase">
                            <th className="p-2">Item</th>
                            <th className="p-2 text-center">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {report.installation.map((inst) => (
                            <tr key={inst.id}>
                              <td className="p-2 font-semibold text-slate-900">{inst.description}</td>
                              <td className="p-2 text-center font-bold text-slate-800">{inst.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer Signoff */}
                  <div className="pt-4 border-t-2 border-slate-300 flex flex-wrap items-center justify-between text-xs text-slate-600">
                    <div>
                      Checked By Quality Inspector: <span className="font-mono">___________________</span>
                    </div>
                    <div>
                      Approved For Saw Cutting: <span className="font-mono">___________________</span>
                    </div>
                    <div>
                      Saw Operator Sign: <span className="font-mono">___________________</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: SAW CUTTING SCHEDULE (Workshop Table View) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'saw_cutting' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4 bg-slate-950">
            {/* Filter Pills and Live Inventory Value Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
              <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs">
                {[
                  { id: 'all', label: currentLang === 'hi' ? 'सभी पीस (All)' : 'All Items' },
                  { id: 'profiles', label: currentLang === 'hi' ? 'uPVC प्रोफाइल' : 'uPVC Profiles' },
                  { id: 'steel', label: currentLang === 'hi' ? 'GI स्टील' : 'GI Steel' },
                  { id: 'glass', label: currentLang === 'hi' ? 'काँच (Glass)' : 'Glass Panels' },
                  { id: 'bead', label: currentLang === 'hi' ? 'ग्लेज़िंग बीड' : 'Glazing Beads' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      filterType === f.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2.5 text-xs font-mono">
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
                  Total Cut Pieces: <span className="text-white font-bold">{filteredSawItems.length}</span>
                </div>
                <div className="bg-emerald-950/70 border border-emerald-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>इन्वेंट्री लागत:</span>
                  <span className="font-bold text-white font-mono">
                    ₹{filteredSawItems.reduce((acc, item) => acc + (item.totalCost || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Conversion Explanation Callout */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-slate-300 text-xs no-print">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-500/40 text-amber-300 font-bold text-[10px] shrink-0">
                  प्रोफाइल दर: KG | गाइड रेल: मीटर
                </span>
                <span className="text-slate-300">
                  सभी uPVC प्रोफाइल्स की गणना <b className="text-amber-300">KG (किलोग्राम)</b> में की गई है (<code className="text-amber-200 font-mono font-bold">₹/KG दर × कुल वजन</code>), जबकि स्लाइडिंग ट्रैक के अंदर लगने वाली <b className="text-blue-300">Aluminium Guide Rail (DURON-GR)</b> को शुद्ध <b className="text-blue-300">मीटर (Mtr)</b> में निकाला गया है।
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('live_formula')}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentLang === 'hi' ? 'लाइव फॉर्मूला गणना देखें' : 'Inspect Live Formulas'}</span>
              </button>
            </div>

            {/* Saw Table */}
            <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/90 border-b border-slate-700 text-slate-300 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-3.5 px-4">Tag</th>
                    <th className="py-3.5 px-4">Frame</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Profile Specification</th>
                    <th className="py-3.5 px-4 text-right">Length / Size (mm)</th>
                    <th className="py-3.5 px-4 text-center">Cut Angle</th>
                    <th className="py-3.5 px-4 text-center">Qty & Weight</th>
                    <th className="py-3.5 px-4 text-right">Unit Rate (₹)</th>
                    <th className="py-3.5 px-4 text-right">Est. Cost (₹)</th>
                    <th className="py-3.5 px-4">Fabrication Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredSawItems.map((item) => {
                    const isProfile =
                      item.itemType === 'Outer Frame' ||
                      item.itemType === 'Mullion' ||
                      item.itemType === 'Transom' ||
                      item.itemType === 'Sash';
                    const isGlass = item.itemType === 'Glass';
                    const isSteel = item.itemType === 'Reinforcement';
                    const isCoupler = item.itemType === 'Coupler';
                    const isGuideRail = item.profileCode === 'DURON-GR' || (item.profileName || '').toLowerCase().includes('guide rail');
                    const isUPVC = item.unit === 'KG' || (isProfile && !isGuideRail);

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition group">
                        <td className="py-3 px-4 font-bold text-blue-400">
                          <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 text-[11px]">
                            {item.tag}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-300">{item.frameName}</td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isGuideRail
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : isProfile
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : isGlass
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : isSteel
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : isCoupler
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isGuideRail ? 'Alum. Rail' : item.itemType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-200">
                          <div className="font-medium text-slate-100">{item.profileName}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {item.profileCode && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-900/60 border border-blue-500/40 text-[10px] font-mono text-blue-300 font-bold">
                                {item.profileCode}
                              </span>
                            )}
                            {item.sashType && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-900/50 border border-emerald-500/30 text-[10px] text-emerald-300">
                                {item.pocketLabel ? `${item.pocketLabel}: ` : ''}{item.sashType.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400 text-sm">
                          {isGlass ? `${item.width} × ${item.height}` : `${item.length}`}
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">mm</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 text-[11px]">
                            {item.cutAngleLeft} ⮀ {item.cutAngleRight}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="font-bold text-white text-sm">
                            {item.quantity} <span className="text-[10px] text-slate-400 font-normal">pcs</span>
                          </div>
                          {isUPVC && item.totalWeightKg !== undefined && item.totalWeightKg > 0 ? (
                            <div className="text-[11px] font-mono font-bold text-amber-300" title={`कुल वजन: ${item.totalWeightKg} KG`}>
                              {item.totalWeightKg} KG
                            </div>
                          ) : isGuideRail ? (
                            <div className="text-[10px] font-mono font-bold text-sky-300" title="कुल लंबाई मीटर में">
                              {((item.length * item.quantity) / 1000).toFixed(2)} Mtr
                            </div>
                          ) : (
                            item.totalWeightKg !== undefined && item.totalWeightKg > 0 && (
                              <div className="text-[10px] font-mono text-cyan-400" title={`कुल वजन: ${item.totalWeightKg} kg`}>
                                {item.totalWeightKg} kg
                              </div>
                            )
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.fromInventory && (
                              <span
                                className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-600/40"
                                title={item.rateFormula || 'Live inventory rate'}
                              >
                                इन्वेंट्री
                              </span>
                            )}
                            <span className="text-slate-200 font-bold">
                              ₹{item.unitRate?.toFixed(2) || '0.00'}
                              <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                                /{item.unit || (isGlass ? 'm²' : 'm')}
                              </span>
                            </span>
                          </div>
                          {isUPVC && item.ratePerKg !== undefined && item.weightPerMtr !== undefined && (
                            <div className="text-[9.5px] text-amber-300/80 font-mono mt-0.5" title={item.rateFormula}>
                              (= ₹{(item.ratePerKg * item.weightPerMtr).toFixed(1)}/m @ {item.weightPerMtr} kg/m)
                            </div>
                          )}
                          {isGuideRail && (
                            <div className="text-[9.5px] text-sky-300/90 font-sans mt-0.5">
                              एल्युमिनियम गाइड रेल (मीटर)
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          ₹{item.totalCost?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-400 text-[11px]">{item.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2.5: CAD LIVE CUTTING FORMULA WORKBENCH */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'live_formula' && (
          <CadLiveFormulaViewer
            frames={frames}
            couplings={couplings}
            currentLang={currentLang}
            onOpenSettings={onOpenInventory}
          />
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: 6-METER STOCK BAR NESTING & CUTTING OPTIMIZER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'bar_nesting' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950">
            {/* Nesting Material Switcher (uPVC Bars vs GI Steel Pipes - ALAG) */}
            <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-xl no-print">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNestingMaterial('upvc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    nestingMaterial === 'upvc'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>uPVC प्रोफाइल (6000mm बार)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNestingMaterial('steel')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    nestingMaterial === 'steel'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                      : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>GI स्टील पाइप्स (6000mm / 20 Ft - अलग)</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                {nestingMaterial === 'steel' ? (
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    जी.आई. स्टील रिइन्फोर्समेंट अलग से 20 Ft पाइप में नेस्टेड (90° कट्स, -100mm डिडक्शन)
                  </span>
                ) : (
                  <span>uPVC एक्सट्रूज़न प्रोफाइल्स (45°/90° कट्स, वेल्डिंग अलाउंस)</span>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  {nestingMaterial === 'steel'
                    ? (currentLang === 'hi' ? 'कुल 6-मीटर GI स्टील पाइप' : 'Total 6M GI Steel Pipes')
                    : (currentLang === 'hi' ? 'कुल 6-मीटर बार की आवश्यकता' : 'Total 6M Stock Bars')}
                </span>
                <div className={`text-2xl font-extrabold font-mono ${nestingMaterial === 'steel' ? 'text-amber-400' : 'text-blue-400'}`}>
                  {nestingResult.totalBars} <span className="text-sm font-normal text-slate-400">{nestingMaterial === 'steel' ? 'Pipes' : 'Bars'}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {nestingResult.totalLinearMeters} Linear Meters ({nestingMaterial === 'steel' ? '6000mm / 20 Ft steel pipe' : '6000mm length'})
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  {currentLang === 'hi' ? 'उपयोगी कटिंग लंबाई' : 'Useful Profile Cut Length'}
                </span>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {nestingResult.totalCutLength} <span className="text-sm font-normal text-slate-400">meters</span>
                </div>
                <span className="text-[10px] text-emerald-300">Net finished cut {nestingMaterial === 'steel' ? 'steel core' : 'profile'}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  {currentLang === 'hi' ? 'स्क्रैप / वेस्टेज प्रतिशत' : 'Off-cut Wastage %'}
                </span>
                <div className="text-2xl font-extrabold text-amber-400 font-mono">
                  {nestingResult.wastagePercent}%
                </div>
                <span className="text-[10px] text-slate-400">Offcut scraps & 3mm saw kerf</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  {currentLang === 'hi' ? 'अल्गोरिदम' : 'Nesting Algorithm'}
                </span>
                <div className="text-sm font-extrabold text-white mt-1">1D Linear Bin-Packing</div>
                <span className="text-[10px] text-blue-400">First-Fit Decreasing (FFD) Optimized</span>
              </div>
            </div>

            {/* Visual 6M Bars List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span>
                      {nestingMaterial === 'steel'
                        ? (currentLang === 'hi'
                            ? 'GI स्टील 6-मीटर पाइप कटिंग विजुअलाइज़र (Steel Saw Cutting Layout)'
                            : '6-Meter GI Steel Pipe Linear Saw Cutting Layout')
                        : (currentLang === 'hi'
                            ? '6-मीटर बार कटिंग विजुअलाइज़र (Saw Operator Cutting Layout)'
                            : '6-Meter Bar Linear Saw Cutting Layout')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {nestingMaterial === 'steel'
                      ? (currentLang === 'hi'
                          ? 'प्रत्येक 6000mm (20 Ft) स्टील पाइप से कौन सा GI कोर पीस काटना है'
                          : 'Step-by-step steel core pieces to cut from each raw 6000mm GI pipe')
                      : (currentLang === 'hi'
                          ? 'प्रत्येक 6000mm बार से कौन सा पीस किस क्रम में काटना है'
                          : 'Step-by-step pieces to cut from each raw 6000mm bar in warehouse')}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className={`flex items-center gap-1 ${nestingMaterial === 'steel' ? 'text-amber-400' : 'text-blue-400'}`}>
                    <span className={`w-3 h-3 rounded ${nestingMaterial === 'steel' ? 'bg-amber-600' : 'bg-blue-600'} inline-block`} />
                    {nestingMaterial === 'steel' ? 'GI Steel Cut' : 'Profile Cut'}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Scrap Offcut
                  </span>
                </div>
              </div>

              {/* Bar List */}
              <div className="space-y-4 font-mono">
                {nestingResult.bars.map((bar) => {
                  const usedPct = (bar.usedLength / 6000) * 100;
                  const scrapPct = (bar.remainingLength / 6000) * 100;

                  return (
                    <div
                      key={bar.barNumber}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded border font-bold ${
                            nestingMaterial === 'steel'
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-blue-600/30 border-blue-500/40 text-blue-300'
                          }`}>
                            {nestingMaterial === 'steel' ? `GI PIPE #${bar.barNumber} (6000mm / 20 Ft)` : `BAR #${bar.barNumber} (6000mm)`}
                          </span>
                          <span className="text-slate-300 font-sans">
                            {bar.cuts.length} Pieces to Cut
                          </span>
                        </div>
                        <div className="text-right text-xs">
                          <span className="text-emerald-400 font-bold">{bar.usedLength} mm Used</span>
                          <span className="text-slate-500 mx-1.5">•</span>
                          <span className="text-amber-400 font-bold">{bar.remainingLength} mm Scrap</span>
                        </div>
                      </div>

                      {/* Visual Bar Strip */}
                      <div className="h-8 bg-slate-800 rounded-lg overflow-hidden flex border border-slate-700 shadow-inner">
                        {bar.cuts.map((c, cIdx) => {
                          const wPct = (c.length / 6000) * 100;
                          const upvcColors = [
                            'bg-blue-600 hover:bg-blue-500',
                            'bg-indigo-600 hover:bg-indigo-500',
                            'bg-cyan-600 hover:bg-cyan-500',
                            'bg-teal-600 hover:bg-teal-500',
                          ];
                          const steelColors = [
                            'bg-amber-600 hover:bg-amber-500',
                            'bg-yellow-600 hover:bg-yellow-500',
                            'bg-orange-600 hover:bg-orange-500',
                            'bg-amber-700 hover:bg-amber-600',
                          ];
                          const bgColors = nestingMaterial === 'steel' ? steelColors : upvcColors;
                          const color = bgColors[cIdx % bgColors.length];

                          return (
                            <div
                              key={c.id}
                              style={{ width: `${wPct}%` }}
                              className={`${color} h-full border-r border-slate-900/60 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1 transition`}
                              title={`${c.tag}: ${c.length}mm (${c.frameName})`}
                            >
                              <span className="truncate">{c.tag} ({c.length})</span>
                            </div>
                          );
                        })}

                        {/* Scrap Piece */}
                        {bar.remainingLength > 0 && (
                          <div
                            style={{ width: `${scrapPct}%` }}
                            className="bg-slate-800/80 h-full flex items-center justify-center text-[9px] text-slate-400 font-bold"
                            title={`Leftover off-cut scrap: ${bar.remainingLength}mm`}
                          >
                            <span className="truncate">{bar.remainingLength}mm</span>
                          </div>
                        )}
                      </div>

                      {/* Cut Sequence Legend for this bar */}
                      <div className="flex flex-wrap gap-2 text-[11px] font-sans">
                        {bar.cuts.map((c, cIdx) => (
                          <div
                            key={c.id}
                            className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-slate-300"
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                            <span className="font-bold text-white font-mono">{cIdx + 1}. {c.tag}:</span>
                            <span className="font-mono text-emerald-400 font-bold">{c.length}mm</span>
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">({c.frameName})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: DETAILED COST BREAKUP & HARDWARE SPECIFICATION REPORT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'cost_breakup' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950">
            {/* Live Inventory Banner */}
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-emerald-100 shadow-lg no-print">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">लाइव ERP इन्वेंट्री मूल्य निर्धारण सक्रिय (Live ERP Inventory Rates Active)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400 text-slate-950 uppercase tracking-wider">
                      Auto-Synced
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    कटिंग लिस्ट एवं कोस्ट ब्रेकअप की प्रत्येक सामग्री (प्रोफाइल, GI स्टील, हार्डवेयर, स्क्रू, गास्केट, ग्लास) की दरें इन्वेंट्री मास्टर से स्वचालित रूप से ली जा रही हैं।
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshInventory}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Reload current inventory rates"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  रीफ्रेश दरें (Refresh Rates)
                </button>
                {onOpenInventory && (
                  <button
                    onClick={onOpenInventory}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    इन्वेंट्री खोलें (Manage Inventory)
                  </button>
                )}
              </div>
            </div>

            {/* Top Frame Selector Filter if multi-frame */}
            {productionReports.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl no-print">
                <span className="text-xs font-bold text-slate-400 px-2">Filter Frame:</span>
                <button
                  onClick={() => setSelectedReportFrameId('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedReportFrameId === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All Assembly ({productionReports.length} Frames)
                </button>
                {productionReports.map((r) => (
                  <button
                    key={r.frameId}
                    onClick={() => setSelectedReportFrameId(r.frameId)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedReportFrameId === r.frameId
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {r.designRef} ({r.width}×{r.height}mm)
                  </button>
                ))}
              </div>
            )}

            {/* Individual Frame Cost Breakup Sheets */}
            {displayedReports.map((report) => {
              const matchingFrame = frames.find((f) => f.id === report.frameId) || frames[0];
              const categories = ['Profile', 'Reinforcement', 'Fabrication Hardware', 'Screws', 'Installation Hardware', 'Gasket and Woolpile', 'Glazing'];

              return (
                <div
                  key={`cost-breakup-sheet-${report.frameId}`}
                  className="bg-white text-slate-900 rounded-xl shadow-xl border border-slate-300 p-6 space-y-5 print:shadow-none print:border-none print:p-0 print:m-0 print:break-after-page"
                >
                  {/* Sheet Header */}
                  <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-emerald-700 no-print" />
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                          COST BREAKUP & HARDWARE SPECIFICATION
                        </h2>
                        <span className="text-xs font-semibold text-slate-500 font-sans">
                          (विस्तृत लागत एवं हार्डवेयर विवरण)
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        Project: <span className="font-bold text-slate-900">{project?.name || 'uPVC Project'}</span> • Ref: <span className="font-mono font-bold text-slate-900">{project?.referenceNo || 'UPVC-2026'}</span>
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold text-slate-900">{companyProfile.companyName}</div>
                      <div className="text-slate-500 font-mono">Date: {project?.date || new Date().toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>

                  {/* Frame Specs & CAD Elevation Thumbnail */}
                  <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-slate-900 text-white font-black text-xs rounded">
                          {report.designRef}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{report.typologyType}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                        <div>
                          <span className="text-slate-500 font-medium">Dimensions: </span>
                          <span className="font-mono font-bold text-slate-900">{report.width} × {report.height} mm</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Quantity: </span>
                          <span className="font-bold text-slate-900">{report.quantity} Pcs</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Total Area: </span>
                          <span className="font-mono font-bold text-slate-900">{report.areaSqM?.toFixed(3)} m² ({report.areaSqFt?.toFixed(3)} ft²)</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Series & Finish: </span>
                          <span className="font-semibold text-slate-900">{report.series} • {report.profileFinish}</span>
                        </div>
                      </div>
                    </div>
                    {matchingFrame && (
                      <div className="flex justify-center items-center bg-white p-2 rounded border border-slate-200">
                        <CadElevationDrawing
                          frames={[matchingFrame]}
                          couplings={[]}
                          width={360}
                          height={240}
                          showDimensions={true}
                          showLabels={false}
                          showHandles={true}
                          showArrows={true}
                          allowEnlarge={true}
                          className="border-none shadow-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Master Cost Breakup Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-200 text-slate-900 font-bold uppercase text-[10px] tracking-wider border-b border-slate-400">
                          <th className="p-2 border border-slate-300">Category</th>
                          <th className="p-2 border border-slate-300">Description</th>
                          <th className="p-2 border border-slate-300">Item Code</th>
                          <th className="p-2 border border-slate-300 text-right">Qty</th>
                          <th className="p-2 border border-slate-300 text-center">Unit</th>
                          <th className="p-2 border border-slate-300 text-right">Rate (₹) [इन्वेंट्री]</th>
                          <th className="p-2 border border-slate-300 text-right">Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {categories.map((cat) => {
                          const items = (report.costBreakupRows || []).filter((r) => r.category === cat);
                          if (items.length === 0) return null;
                          const catTotal = items.reduce((acc, curr) => acc + (curr.cost || 0), 0);

                          return (
                            <React.Fragment key={cat}>
                              <tr className="bg-slate-100 font-bold text-[11px] text-slate-800">
                                <td colSpan={6} className="p-1.5 pl-2 border border-slate-300">
                                  {cat}
                                </td>
                                <td className="p-1.5 pr-2 border border-slate-300 text-right font-mono text-emerald-800 font-bold">
                                  ₹{catTotal.toFixed(2)}
                                </td>
                              </tr>
                              {items.map((row, rIdx) => (
                                <tr key={`${cat}-${rIdx}`} className="hover:bg-slate-50 text-[11px]">
                                  <td className="p-1.5 pl-3 border border-slate-300 text-slate-500 font-medium">{row.category}</td>
                                  <td className="p-1.5 border border-slate-300 font-medium text-slate-900">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{row.description}</span>
                                      {row.fromInventory && (
                                        <span
                                          className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                          title={`इन्वेंट्री से लिंक: ${row.inventoryItemName || row.itemCode} (स्टॉक: ${row.inventoryStockQty ?? 'OK'})`}
                                        >
                                          ✓ इन्वेंट्री
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-1.5 border border-slate-300 font-mono text-slate-700">{row.itemCode}</td>
                                  <td className="p-1.5 border border-slate-300 text-right font-mono">
                                    <div className="font-bold text-slate-900">
                                      {row.qty.toFixed(row.unit === 'Pcs' || row.unit === 'Set' ? 0 : (row.unit === 'KG' ? 2 : 3))}
                                    </div>
                                    {row.unit === 'KG' && (
                                      <div className="text-[9px] text-amber-700 font-sans font-medium" title="कुल वजन (किलोग्राम में)">
                                        (किलोग्राम)
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-1.5 border border-slate-300 text-center">
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                        row.unit === 'KG'
                                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                          : row.unit === 'Mtr'
                                          ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {row.unit}
                                    </span>
                                  </td>
                                  <td className="p-1.5 border border-slate-300 text-right font-mono text-slate-700">
                                    <div className="font-bold">₹{row.rate.toFixed(2)}</div>
                                    {row.rateFormula && (
                                      <div className="text-[9px] text-slate-500 font-sans mt-0.5" title="इन्वेंट्री दर रूपांतरण">
                                        {row.rateFormula}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-900">₹{row.cost.toFixed(2)}</td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Cost Summary Table */}
                  {report.costSummary && (
                    <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                      <div className="bg-slate-200 px-3 py-1 font-black text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300 flex justify-between">
                        <span>COST SUMMARY (लागत सारांश)</span>
                        <span className="font-mono">PROJECT VALUE BREAKUP</span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-300">
                        <div className="p-2.5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Profile Cost (Wastage {report.costSummary.profileWastagePercent.toFixed(2)}%):</span>
                            <span className="font-mono font-bold">₹{(report.costSummary.profileCost + report.costSummary.profileWastageCost).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Reinforcement Cost (Wastage {report.costSummary.riWastagePercent.toFixed(2)}%):</span>
                            <span className="font-mono font-bold">₹{(report.costSummary.riCost + report.costSummary.riWastageCost).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Hardware & Fittings Cost:</span>
                            <span className="font-mono font-bold">₹{report.costSummary.hardwareCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Glass Cost (Wastage {report.costSummary.glassWastagePercent.toFixed(2)}%):</span>
                            <span className="font-mono font-bold">₹{(report.costSummary.glassCost + report.costSummary.glassWastageCost).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                            <span>Total Raw Material Cost:</span>
                            <span className="font-mono">₹{report.costSummary.totalRawMaterialCost.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="p-2.5 space-y-1 text-[11px] bg-slate-50/50">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Fabrication Labour:</span>
                            <span className="font-mono font-bold">₹{report.costSummary.fabricationLabourCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Installation Labour:</span>
                            <span className="font-mono font-bold">₹{report.costSummary.installationLabourCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Profit ({report.costSummary.profitPercent.toFixed(2)}%):</span>
                            <span className="font-mono font-bold">₹{report.costSummary.profitCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-900 font-extrabold pt-1 border-t border-slate-300 text-xs bg-emerald-50 p-1 rounded">
                            <span>GRAND TOTAL (Incl. GST {report.costSummary.gstPercent}%):</span>
                            <span className="font-mono text-emerald-800">₹{report.costSummary.grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Technical Approval Block */}
                  <div className="border-2 border-slate-900 grid grid-cols-3 divide-x-2 divide-slate-900 text-[11px] font-sans">
                    <div className="p-2">
                      <span className="font-bold text-slate-500 uppercase text-[9px] block">Prepared By</span>
                      <div className="text-slate-900 font-bold mt-1">uPVC Cost & CAD Engine</div>
                    </div>
                    <div className="p-2">
                      <span className="font-bold text-slate-500 uppercase text-[9px] block">Verified By (Factory Manager)</span>
                      <div className="text-slate-900 font-bold mt-1">______________________</div>
                    </div>
                    <div className="p-2 bg-slate-100">
                      <span className="font-bold text-slate-500 uppercase text-[9px] block">Authorized Signature & Stamp</span>
                      <div className="text-slate-900 font-bold mt-1">Date: ______________</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
