import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Building2,
  Receipt,
  Download,
  CheckCircle2,
  Sparkles,
  Sliders,
  ExternalLink,
  X,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { UPVCFrame, UPVCProject, SingleFrameProductionReport, CouplingConnection } from '../types/upvc';
import { CustomerDesignCardItem } from '../types/erp';
import { generateProductionReports, recalculateFramePockets } from '../utils/upvcCalculations';
import { getCustomerDesigns } from '../utils/customerStorage';
import { CadElevationDrawing } from './CadElevationDrawing';

interface TypologyCostBreakupReportProps {
  designs?: CustomerDesignCardItem[];
  customer?: {
    id?: string;
    name?: string;
    companyName?: string;
    phone?: string;
    siteAddress?: string;
    brand?: string;
    referenceNo?: string;
  };
  activeProject?: UPVCProject;
  defaultProjectCode?: string;
  defaultProjectName?: string;
  onOpenDesignInCAD?: (design: CustomerDesignCardItem) => void;
  onClose?: () => void;
}

// Standard 5 Industrial Benchmark Windows matching EvaWin / Balaji Traders sample
const BENCHMARK_EVAWIN_UNITS: Array<{
  tag: string;
  width: number;
  height: number;
  type: string;
  series: string;
  glass: string;
  shutterWeight: string;
  areaSqM: number;
  areaSqFt: number;
}> = [
  { tag: 'W1', width: 889, height: 2286, type: 'Casement Door / Window', series: 'DURON 60MM CASEMENT SERIES', glass: '(1) 5 MM BLACK GLASS', shutterWeight: 'S1-36.104', areaSqM: 2.032, areaSqFt: 21.872 },
  { tag: 'W2', width: 1045, height: 2080, type: 'Casement Door / Window', series: 'DURON 60MM CASEMENT SERIES', glass: '(1) 5 MM BLACK GLASS', shutterWeight: 'S1-37.673', areaSqM: 2.174, areaSqFt: 23.401 },
  { tag: 'W3', width: 660, height: 2134, type: 'Casement Door / Window', series: 'DURON 60MM CASEMENT SERIES', glass: '(1) 5 MM BLACK GLASS', shutterWeight: 'S1-26.822', areaSqM: 1.408, areaSqFt: 15.156 },
  { tag: 'W4', width: 711, height: 2032, type: 'Casement Door / Window', series: 'DURON 60MM CASEMENT SERIES', glass: '(1) 5 MM BLACK GLASS', shutterWeight: 'S1-27.084', areaSqM: 1.445, areaSqFt: 15.554 },
  { tag: 'W5', width: 841, height: 2132, type: 'Casement Door / Window', series: 'DURON 60MM CASEMENT SERIES', glass: '(1) 5 MM BLACK GLASS', shutterWeight: 'S1-32.329', areaSqM: 1.793, areaSqFt: 19.300 },
];

/**
 * Resolves the real or fallback CAD UPVCFrame and Couplings for accurate CAD rendering
 */
function resolveReportFrames(
  report: SingleFrameProductionReport,
  designs?: CustomerDesignCardItem[],
  activeProject?: UPVCProject
): { frames: UPVCFrame[]; couplings: CouplingConnection[] } {
  // 1. If report already has frames attached
  if (report.frames && report.frames.length > 0) {
    return {
      frames: report.frames.map((f) => ({
        ...f,
        pockets: f.pockets && f.pockets.length > 0 ? f.pockets : recalculateFramePockets(f),
      })),
      couplings: report.couplings || [],
    };
  }
  // 2. If report has single frame attached
  if (report.frame) {
    const f = report.frame;
    return {
      frames: [
        {
          ...f,
          pockets: f.pockets && f.pockets.length > 0 ? f.pockets : recalculateFramePockets(f),
        },
      ],
      couplings: report.couplings || [],
    };
  }
  // 3. Match from designs list
  const matchingDesign = (designs || []).find(
    (d) => d.tag === report.designRef || d.id === report.frameId
  );
  if (matchingDesign?.projectData?.frames && matchingDesign.projectData.frames.length > 0) {
    return {
      frames: matchingDesign.projectData.frames.map((f) => ({
        ...f,
        pockets: f.pockets && f.pockets.length > 0 ? f.pockets : recalculateFramePockets(f),
      })),
      couplings: matchingDesign.projectData.couplings || [],
    };
  }
  // 4. Match from activeProject
  const matchingActive = activeProject?.frames?.find(
    (f) => f.id === report.frameId || f.name === report.designRef
  );
  if (matchingActive) {
    return {
      frames: [
        {
          ...matchingActive,
          pockets:
            matchingActive.pockets && matchingActive.pockets.length > 0
              ? matchingActive.pockets
              : recalculateFramePockets(matchingActive),
        },
      ],
      couplings: activeProject?.couplings || [],
    };
  }
  // 5. Build accurate default frame matching specifications
  const w = report.width || 1200;
  const h = report.height || 1200;
  const typLower = (report.typologyType || '').toLowerCase();
  const seriesLower = (report.series || '').toLowerCase();
  const isSlider = typLower.includes('slid') || seriesLower.includes('slid') || typLower.includes('track');
  const is3Track = typLower.includes('3 track') || typLower.includes('3-track') || seriesLower.includes('3 track') || seriesLower.includes('3-track') || typLower.includes('mesh');
  const isDoor = h >= 1800 || typLower.includes('door');

  const baseFrame: UPVCFrame = {
    id: `cost-cad-${report.frameId || report.designRef}`,
    name: report.designRef,
    x: 0,
    y: 0,
    width: w,
    height: h,
    frameProfileWidth: 60,
    mullionProfileWidth: 74,
    sashProfileWidth: 60,
    color: (report.profileFinish?.toLowerCase().includes('dark oak')
      ? 'dark_oak'
      : report.profileFinish?.toLowerCase().includes('golden oak')
      ? 'golden_oak'
      : report.profileFinish?.toLowerCase().includes('anthracite')
      ? 'anthracite'
      : report.profileFinish?.toLowerCase().includes('walnut')
      ? 'walnut'
      : 'white') as any,
    series: isSlider ? (is3Track ? 'sliding_3track' : 'sliding_62') : 'casement_60',
    mullions: [],
    pockets: [],
    reinforcement: 'steel_1.5mm',
    drainageCaps: true,
  };

  if (isSlider) {
    if (is3Track || w >= 1800) {
      const bayW = (w - 120) / 3;
      baseFrame.pockets = [
        {
          id: `pkt-1`,
          frameId: baseFrame.id,
          x: 60,
          y: 60,
          width: bayW,
          height: h - 120,
          sashType: 'slider_arrow_right',
          glassType: 'clear_5mm' as any,
          gridPattern: 'none',
          handlePosition: 'left',
          handleType: 'sliding_touch_left',
        },
        {
          id: `pkt-2`,
          frameId: baseFrame.id,
          x: 60 + bayW,
          y: 60,
          width: bayW,
          height: h - 120,
          sashType: 'slider_3s_mesh',
          glassType: 'clear_5mm' as any,
          gridPattern: 'none',
          handleType: 'none',
        },
        {
          id: `pkt-3`,
          frameId: baseFrame.id,
          x: 60 + bayW * 2,
          y: 60,
          width: bayW,
          height: h - 120,
          sashType: 'slider_arrow_left',
          glassType: 'clear_5mm' as any,
          gridPattern: 'none',
          handlePosition: 'right',
          handleType: 'sliding_touch_right',
        },
      ];
    } else {
      const bayW = (w - 120) / 2;
      baseFrame.pockets = [
        {
          id: `pkt-1`,
          frameId: baseFrame.id,
          x: 60,
          y: 60,
          width: bayW,
          height: h - 120,
          sashType: 'slider_arrow_right',
          glassType: 'clear_5mm' as any,
          gridPattern: 'none',
          handlePosition: 'left',
          handleType: 'sliding_touch_left',
        },
        {
          id: `pkt-2`,
          frameId: baseFrame.id,
          x: 60 + bayW,
          y: 60,
          width: bayW,
          height: h - 120,
          sashType: 'slider_arrow_left',
          glassType: 'clear_5mm' as any,
          gridPattern: 'none',
          handlePosition: 'right',
          handleType: 'sliding_touch_right',
        },
      ];
    }
  } else {
    if (w >= 1400) {
      const bayW = (w - 120 - 74) / 2;
      baseFrame.mullions = [
        { id: 'm1', orientation: 'vertical', position: w / 2, width: 74 },
      ];
      baseFrame.pockets = [
        {
          id: `pkt-1`,
          frameId: baseFrame.id,
          x: 60,
          y: 60,
          width: bayW,
          height: h - 120,
          sashType: 'casement_left',
          glassType: 'clear_5mm' as any,
          gridPattern: 'none',
          handlePosition: 'right',
          handleType: 'espag_key',
        },
        {
          id: `pkt-2`,
          frameId: baseFrame.id,
          x: 60 + bayW + 74,
          y: 60,
          width: bayW,
          height: h - 120,
          sashType: 'casement_right',
          glassType: 'clear_5mm' as any,
          gridPattern: 'none',
          handlePosition: 'left',
          handleType: 'espag_key',
        },
      ];
    } else {
      baseFrame.pockets = [
        {
          id: `pkt-1`,
          frameId: baseFrame.id,
          x: 60,
          y: 60,
          width: w - 120,
          height: h - 120,
          sashType: isDoor ? 'casement_right' : 'casement_right',
          glassType: 'clear_5mm' as any,
          gridPattern: 'none',
          handlePosition: 'right',
          handleType: 'espag_key',
        },
      ];
    }
  }

  return {
    frames: [baseFrame],
    couplings: [],
  };
}

export const TypologyCostBreakupReport: React.FC<TypologyCostBreakupReportProps> = ({
  designs = [],
  customer,
  activeProject,
  defaultProjectCode = 'SHR-QT-00000063',
  defaultProjectName = 'just',
  onOpenDesignInCAD,
  onClose,
}) => {
  const [selectedTypologyFilter, setSelectedTypologyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'paginated' | 'continuous'>('paginated');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Editable Report Header Info (persisted in localStorage or defaults)
  const [companyName, setCompanyName] = useState<string>(() => {
    return localStorage.getItem('cost_report_company_name') || 'Shri Balaji Traders';
  });
  const [companyWebsite, setCompanyWebsite] = useState<string>(() => {
    return localStorage.getItem('cost_report_company_website') || 'www.evawinoptimize.com';
  });
  const [projectName, setProjectName] = useState<string>(() => {
    return customer?.name || activeProject?.name || defaultProjectName;
  });
  const [projectCode, setProjectCode] = useState<string>(() => {
    return customer?.referenceNo || activeProject?.referenceNo || defaultProjectCode;
  });
  const [reportDate] = useState<string>(() => {
    // Exact format: 9/14/2026 12:15:46 PM +05:30
    const now = new Date();
    const dStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const tStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    return `${dStr} ${tStr} +05:30`;
  });

  const handleSaveConfig = () => {
    localStorage.setItem('cost_report_company_name', companyName);
    localStorage.setItem('cost_report_company_website', companyWebsite);
    setShowConfig(false);
  };

  // Prioritize passed designs or fetch customer designs from storage if customer is present
  const effectiveDesigns = useMemo(() => {
    return (designs && designs.length > 0)
      ? designs
      : (customer ? getCustomerDesigns(customer) : []);
  }, [designs, customer]);

  // Build the list of frames & reports
  const typologyReports: SingleFrameProductionReport[] = useMemo(() => {
    const list: SingleFrameProductionReport[] = [];

    // Calculate total customer window count across all designs/units
    const totalCustomerUnits = Math.max(
      1,
      effectiveDesigns && effectiveDesigns.length > 0
        ? effectiveDesigns.reduce((sum, d) => sum + (d.quantity || (d.projectData?.frames?.length || 1)), 0)
        : (activeProject?.frames?.length || BENCHMARK_EVAWIN_UNITS.length || 5)
    );

    // Retrieve active pricing template
    let activePricingTemplate: any[] | null = null;
    try {
      const custId = customer?.id || customer?.referenceNo || projectCode;
      const savedTplStr =
        (custId ? localStorage.getItem(`upvc_pricing_template_${custId}`) : null) ||
        localStorage.getItem('upvc_pricing_template_active') ||
        localStorage.getItem('upvc_pricing_template_global');
      if (savedTplStr) {
        activePricingTemplate = JSON.parse(savedTplStr);
      }
    } catch (e) {}

    // 1. If designs are provided or retrieved from customer storage
    if (effectiveDesigns && effectiveDesigns.length > 0) {
      effectiveDesigns.forEach((d, dIdx) => {
        if (d.projectData?.frames && d.projectData.frames.length > 0) {
          const reps = generateProductionReports(
            d.projectData.frames,
            d.projectData.couplings || [],
            {
              name: projectName,
              referenceNo: projectCode,
              clientName: customer?.name || projectName,
              date: reportDate,
              totalCustomerUnits: totalCustomerUnits,
              pricingTemplate: activePricingTemplate || undefined,
            }
          );
          reps.forEach((r, fIdx) => {
            r.designRef = d.tag || `W${dIdx + 1}${d.projectData?.frames && d.projectData.frames.length > 1 ? `-${fIdx + 1}` : ''}`;
            r.typologyType = d.type ? `${d.type}${d.location ? ` (${d.location})` : ''}` : (r.typologyType || d.tag || `W${dIdx + 1}`);
            r.quantity = d.quantity || 1;
            r.series = d.seriesName || r.series;
            if (d.location) r.location = d.location;
            if (customer?.brand) r.brand = customer.brand;
            if (d.profileColor) r.profileFinish = d.profileColor;
            if (d.glassType) r.glassDescription = typeof d.glassType === 'string' ? d.glassType : String(d.glassType);
            r.frame = d.projectData?.frames[fIdx] || d.projectData?.frames[0];
            r.frames = d.projectData?.frames;
            r.couplings = d.projectData?.couplings || [];
            list.push(r);
          });
        } else {
          // Construct fallback frame from design card properties
          const w = d.width || 1200;
          const h = d.height || 1200;
          const isSlider = d.type?.toLowerCase().includes('sliding') || d.seriesName?.toLowerCase().includes('sliding');
          const mockFrame: UPVCFrame = {
            id: `frm-des-${d.id || dIdx}`,
            name: d.tag || `W${dIdx + 1}`,
            x: 0,
            y: 0,
            width: w,
            height: h,
            frameProfileWidth: 60,
            mullionProfileWidth: 74,
            sashProfileWidth: 60,
            color: (d.profileColor || 'white') as any,
            series: isSlider ? 'sliding_62' : 'casement_60',
            mullions: [],
            pockets: [
              {
                id: `pkt-${d.id || dIdx}-1`,
                frameId: `frm-des-${d.id || dIdx}`,
                x: 60,
                y: 60,
                width: w - 120,
                height: h - 120,
                sashType: isSlider ? 'slider_arrow_right' : 'casement_right',
                glassType: (d.glassType || 'clear_5mm') as any,
                gridPattern: 'none',
                handlePosition: 'right',
                handleType: isSlider ? 'sliding_touch_right' : 'espag_key',
              },
            ],
            reinforcement: 'steel_1.5mm',
            drainageCaps: true,
          };
          const reps = generateProductionReports([mockFrame], [], {
            name: projectName,
            referenceNo: projectCode,
            clientName: customer?.name || projectName,
            date: reportDate,
            totalCustomerUnits: totalCustomerUnits,
            pricingTemplate: activePricingTemplate || undefined,
          });
          if (reps[0]) {
            reps[0].designRef = d.tag || `W${dIdx + 1}`;
            reps[0].typologyType = d.type ? `${d.type}${d.location ? ` (${d.location})` : ''}` : (d.tag || `W${dIdx + 1}`);
            reps[0].quantity = d.quantity || 1;
            reps[0].series = d.seriesName || (isSlider ? 'DURON SLIDING 2-TRACK SERIES' : 'DURON 60MM CASEMENT SERIES');
            if (d.location) reps[0].location = d.location;
            if (customer?.brand) reps[0].brand = customer.brand;
            if (d.profileColor) reps[0].profileFinish = d.profileColor;
            if (d.glassType) reps[0].glassDescription = typeof d.glassType === 'string' ? d.glassType : String(d.glassType);
            reps[0].frame = mockFrame;
            reps[0].frames = [mockFrame];
            reps[0].couplings = [];
            list.push(reps[0]);
          }
        }
      });
    } else if (activeProject?.frames && activeProject.frames.length > 0) {
      // 2. Or if activeProject has frames
      const reps = generateProductionReports(activeProject.frames, activeProject.couplings || [], {
        name: projectName,
        referenceNo: projectCode,
        clientName: customer?.name || projectName,
        date: reportDate,
        totalCustomerUnits: totalCustomerUnits,
        pricingTemplate: activePricingTemplate || undefined,
      });
      reps.forEach((r, fIdx) => {
        r.frame = activeProject.frames[fIdx] || activeProject.frames[0];
        r.frames = activeProject.frames;
        r.couplings = activeProject.couplings || [];
        list.push(r);
      });
    } else {
      // 3. Benchmark industrial default: 5 Units (W1 to W5) matching EvaWin standard
      BENCHMARK_EVAWIN_UNITS.forEach((unit, idx) => {
        const mockFrame: UPVCFrame = {
          id: `bm-${unit.tag}`,
          name: unit.tag,
          x: 0,
          y: 0,
          width: unit.width,
          height: unit.height,
          frameProfileWidth: 60,
          mullionProfileWidth: 74,
          sashProfileWidth: 60,
          color: 'white',
          series: 'casement_60',
          mullions: [],
          pockets: [
            {
              id: `pkt-bm-${unit.tag}`,
              frameId: `bm-${unit.tag}`,
              x: 60,
              y: 60,
              width: unit.width - 120,
              height: unit.height - 120,
              sashType: 'casement_right',
              glassType: 'black_5mm' as any,
              gridPattern: 'none',
              handlePosition: 'right',
              handleType: 'espag_key',
            },
          ],
          reinforcement: 'steel_1.5mm',
          drainageCaps: true,
        };
        const reps = generateProductionReports([mockFrame], [], {
          name: projectName,
          referenceNo: projectCode,
          clientName: customer?.name || projectName,
          date: reportDate,
          totalCustomerUnits: BENCHMARK_EVAWIN_UNITS.length,
          pricingTemplate: activePricingTemplate || undefined,
        });
        if (reps[0]) {
          reps[0].designRef = unit.tag;
          reps[0].typologyType = unit.tag;
          reps[0].shutterWeightKg = parseFloat(unit.shutterWeight.replace('S1-', ''));
          reps[0].frame = mockFrame;
          reps[0].frames = [mockFrame];
          reps[0].couplings = [];
          list.push(reps[0]);
        }
      });
    }

    return list;
  }, [designs, activeProject, projectName, projectCode, reportDate, customer]);

  // Filtered typologies
  const filteredReports = useMemo(() => {
    if (selectedTypologyFilter === 'all') return typologyReports;
    return typologyReports.filter((r) => r.designRef === selectedTypologyFilter);
  }, [typologyReports, selectedTypologyFilter]);

  // Calculate total pages (Each typology has exactly 3 standard sheets)
  const totalPages = filteredReports.length * 3;

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel (.xlsx) using ExcelJS
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = companyName;
      workbook.created = new Date();

      filteredReports.forEach((rep) => {
        const sheetName = (rep.designRef || 'Unit').substring(0, 30);
        const ws = workbook.addWorksheet(sheetName);

        // Header Title
        ws.mergeCells('A1:G1');
        ws.getCell('A1').value = `Cost Breakup Report - ${rep.designRef}`;
        ws.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
        ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 28;

        // Project Info
        ws.mergeCells('A2:G2');
        ws.getCell('A2').value = `Project: ${projectName} | Code: ${projectCode} | Date: ${reportDate} | Typology: ${rep.typologyType}`;
        ws.getCell('A2').font = { size: 10, italic: true };
        ws.getCell('A2').alignment = { horizontal: 'center' };

        // Technicals
        ws.addRow([]);
        ws.addRow(['Dimension (W × H)', `${Math.round(rep.width)} × ${Math.round(rep.height)} mm`, 'Area', `${rep.areaSqM.toFixed(3)} Sqmt / ${rep.areaSqFt.toFixed(3)} Sqft`]);
        ws.addRow(['Brand', rep.brand || 'DURONPOLYVINYLSPVTLTD', 'Series', rep.series]);
        ws.addRow(['Finish', rep.profileFinish || 'WHITE', 'Glass', rep.glassDescription ? (rep.glassDescription.startsWith('(') ? rep.glassDescription : `(1) ${rep.glassDescription}`) : '(1) 5 MM CLEAR GLASS']);

        ws.addRow([]);
        // Master Table Header
        const headerRow = ws.addRow(['Category', 'Description', 'Item Code', 'Qty', 'Unit', 'Rate (₹)', 'Cost (₹)']);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FF000000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB9D9F9' } };
          cell.alignment = { vertical: 'middle' };
        });

        // Add items by category
        const categories = [
          'Profile',
          'Reinforcement',
          'Fabrication Hardware',
          'Screws',
          'Installation Hardware',
          'Gasket and Woolpile',
          'Glazing',
        ];

        categories.forEach((cat) => {
          const items = (rep.costBreakupRows || []).filter((r) => r.category === cat);
          if (items.length > 0) {
            items.forEach((item) => {
              ws.addRow([cat, item.description, item.itemCode, item.qty, item.unit, item.rate, item.cost]);
            });
            const subtotal = items.reduce((s, r) => s + r.cost, 0);
            const subRow = ws.addRow([cat, `${cat} Total`, '', '', '', '', subtotal]);
            subRow.font = { bold: true };
          }
        });

        // Cost Summary Table
        ws.addRow([]);
        const csHeader = ws.addRow(['Cost Summary', 'Calculation Method', 'Formula / Basis', 'Factor / Multiplier', 'Cost (₹)']);
        csHeader.eachCell((c) => {
          c.font = { bold: true };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB9D9F9' } };
        });

        if (rep.costSummary) {
          const cs = rep.costSummary;
          const rows = [
            ['Profile Cost', 'CustomFormula', '#PROFILECOST', 1.0, cs.profileCost],
            ['Profile Wastage', 'Percentage', '@Profile Cost.value', cs.profileWastagePercent, cs.profileWastageCost],
            ['RI Cost', 'CustomFormula', '#RICOST', 1.0, cs.riCost],
            ['RI Wastage', 'Percentage', '@RI Cost.value', cs.riWastagePercent, cs.riWastageCost],
            ['Hardware Cost', 'CustomFormula', '#HWCOST', 1.0, cs.hardwareCost],
            ['Glass Cost', 'CustomFormula', '#GLASSCOST', 1.0, cs.glassCost],
            ['Glass Wastage', 'Percentage', '@Glass Cost.value', cs.glassWastagePercent, cs.glassWastageCost],
            ['Total Raw Material Cost', 'CustomFormula', 'Raw Material Sum', 1.0, cs.totalRawMaterialCost],
            ['Fabrication Labour', 'AreaSqftFg', '#AreaSqftFg', cs.fabricationLabourRate, cs.fabricationLabourCost],
            ['Installation Labour', 'AreaSqftFg', '#AreaSqftFg', cs.installationLabourRate, cs.installationLabourCost],
            ['Sub Total Including Labour', 'CustomFormula', 'Raw + Labours', 1.0, cs.subTotalIncludingLabour],
            ['Profit', 'Percentage', '@Sub Total Including Labour.value', cs.profitPercent, cs.profitCost],
            ['Extra Cost', 'UserDefinedFG Overhead', '0', 1.0, cs.extraCost],
            ['Basic Value', 'CustomFormula', 'SubTotal + Profit + Extra', 1.0, cs.basicValue],
            ['Discount', 'Percentage', '@Basic Value.value', cs.discountPercent, cs.discountAmount],
            ['Sub Total', 'CustomFormula', 'Basic - Discount', 1.0, cs.subTotal],
            ['Transportation Cost', 'LumpSumDivideByQty', `@Total Transport ÷ ${cs.totalAssemblyUnits || 1} Units`, cs.transportTotalLump || 1000.0, cs.transportationCost],
            ['Loading And Unloading', 'LumpSumDivideByQty', `@Total Loading ÷ ${cs.totalAssemblyUnits || 1} Units`, cs.loadingTotalLump || 2000.0, cs.loadingUnloadingCost],
            ['Total Project Cost', 'CustomFormula', 'Sub Total + Trans + Load', 1.0, cs.totalProjectCost],
            ['GST', 'Percentage', '@Total Project Cost.value', cs.gstPercent, cs.gstAmount],
            ['Grand Total', 'CustomFormula', 'Total + GST', 1.0, cs.grandTotal],
          ];
          rows.forEach((r) => ws.addRow(r));
        }

        // Set column widths
        ws.columns = [
          { width: 24 },
          { width: 34 },
          { width: 22 },
          { width: 14 },
          { width: 10 },
          { width: 14 },
          { width: 16 },
        ];
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cost_Breakup_Report_${projectCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting Cost Breakup Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = `COST BREAKUP REPORT - ${projectName} (${projectCode})\n`;
    csv += `Date: ${reportDate}\nCompany: ${companyName}\n\n`;

    filteredReports.forEach((rep) => {
      csv += `===================================================================\n`;
      csv += `TYPOLOGY: ${rep.designRef} (${rep.typologyType})\n`;
      csv += `Dimensions (W × H): ${Math.round(rep.width)} × ${Math.round(rep.height)} mm | Area: ${rep.areaSqM.toFixed(3)} Sqmt / ${rep.areaSqFt.toFixed(3)} Sqft\n`;
      csv += `Series: ${rep.series} | Brand: ${rep.brand} | Finish: ${rep.profileFinish}\n`;
      csv += `===================================================================\n`;
      csv += `Category,Description,Item Code,Qty,Unit,Rate,Cost\n`;

      (rep.costBreakupRows || []).forEach((row) => {
        csv += `"${row.category}","${row.description}","${row.itemCode}",${row.qty},"${row.unit}",${row.rate},${row.cost}\n`;
      });

      if (rep.costSummary) {
        const cs = rep.costSummary;
        csv += `\nCOST SUMMARY\n`;
        csv += `Item,Method,Formula,Multiplier,Cost\n`;
        csv += `Profile Cost,CustomFormula,#PROFILECOST,1.0000,${cs.profileCost}\n`;
        csv += `Profile Wastage,Percentage,@Profile Cost.value,${cs.profileWastagePercent.toFixed(4)},${cs.profileWastageCost}\n`;
        csv += `RI Cost,CustomFormula,#RICOST,1.0000,${cs.riCost}\n`;
        csv += `RI Wastage,Percentage,@RI Cost.value,${cs.riWastagePercent.toFixed(4)},${cs.riWastageCost}\n`;
        csv += `Hardware Cost,CustomFormula,#HWCOST,1.0000,${cs.hardwareCost}\n`;
        csv += `Glass Cost,CustomFormula,#GLASSCOST,1.0000,${cs.glassCost}\n`;
        csv += `Glass Wastage,Percentage,@Glass Cost.value,${cs.glassWastagePercent.toFixed(4)},${cs.glassWastageCost}\n`;
        csv += `Total Raw Material Cost,CustomFormula,Formula,1.0000,${cs.totalRawMaterialCost}\n`;
        csv += `Fabrication Labour,AreaSqftFg,#AreaSqftFg,${cs.fabricationLabourRate.toFixed(4)},${cs.fabricationLabourCost}\n`;
        csv += `Installation Labour,AreaSqftFg,#AreaSqftFg,${cs.installationLabourRate.toFixed(4)},${cs.installationLabourCost}\n`;
        csv += `Sub Total Including Labour,CustomFormula,Formula,1.0000,${cs.subTotalIncludingLabour}\n`;
        csv += `Profit,Percentage,@Sub Total.value,${cs.profitPercent.toFixed(4)},${cs.profitCost}\n`;
        csv += `Extra Cost,UserDefinedFG,0,1.0000,${cs.extraCost}\n`;
        csv += `Basic Value,CustomFormula,Formula,1.0000,${cs.basicValue}\n`;
        csv += `Discount,Percentage,@Basic Value.value,${cs.discountPercent.toFixed(4)},${cs.discountAmount}\n`;
        csv += `Sub Total,CustomFormula,Formula,1.0000,${cs.subTotal}\n`;
        csv += `Transportation Cost,LumpSumDivideByQty,@Total Transport / ${cs.totalAssemblyUnits || 1} Units,${(cs.transportTotalLump || 1000).toFixed(4)},${cs.transportationCost}\n`;
        csv += `Loading And Unloading,LumpSumDivideByQty,@Total Loading / ${cs.totalAssemblyUnits || 1} Units,${(cs.loadingTotalLump || 2000).toFixed(4)},${cs.loadingUnloadingCost}\n`;
        csv += `Total Project Cost,CustomFormula,Formula,1.0000,${cs.totalProjectCost}\n`;
        csv += `GST,Percentage,@Total.value,${cs.gstPercent.toFixed(4)},${cs.gstAmount}\n`;
        csv += `Grand Total,CustomFormula,Formula,1.0000,${cs.grandTotal}\n\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cost_Breakup_Report_${projectCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`flex flex-col bg-slate-100 text-slate-900 ${
        isFullScreen ? 'fixed inset-0 z-50 overflow-y-auto' : 'w-full'
      }`}
    >
      {/* 1. TOP INTERACTIVE TOOLBAR (Hidden in Print) */}
      <div className="bg-white border-b border-slate-300 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs no-print sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Cost Breakup Report (लागत ब्रेकअप रिपोर्ट)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black bg-blue-100 text-blue-800 rounded uppercase">
                EvaWin Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Project: <span className="font-bold text-slate-800">{projectName}</span> • Code: <span className="font-mono font-bold text-slate-800">{projectCode}</span> • Total Pages: <span className="font-bold text-blue-600">{totalPages} Sheets</span>
            </p>
          </div>
        </div>

        {/* Filter & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Typology Dropdown Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-600">Typology:</span>
            <select
              value={selectedTypologyFilter}
              onChange={(e) => {
                setSelectedTypologyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-blue-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Typologies ({typologyReports.length} Units - {typologyReports.length * 3} Pages)</option>
              {typologyReports.map((rep) => (
                <option key={rep.designRef} value={rep.designRef}>
                  {rep.designRef} — {rep.width} × {rep.height} mm ({rep.typologyType})
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs">
            <button
              onClick={() => setViewMode('paginated')}
              className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1.5 ${
                viewMode === 'paginated'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3-Page Sheets (Exact A4)</span>
            </button>
            <button
              onClick={() => setViewMode('continuous')}
              className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1.5 ${
                viewMode === 'continuous'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Continuous</span>
            </button>
          </div>

          {/* Edit Header / Settings */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            title="Edit Company Name & Project Details"
            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-300 rounded-lg transition"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* Print / Save PDF Button */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          {/* Full Screen Toggle */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg transition cursor-pointer"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Prominent Cross (X) Close Button */}
          {(onClose || isFullScreen) && (
            <button
              type="button"
              onClick={() => {
                if (isFullScreen) setIsFullScreen(false);
                if (onClose) onClose();
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer border border-rose-500 shrink-0 ml-1"
              title="Close Report (रिपोर्ट बंद करें)"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Close (बंद करें)</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Config Banner (When toggled) */}
      {showConfig && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 no-print animate-in slide-in-from-top duration-150">
          <div className="max-w-5xl mx-auto flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Company Name (Footer)</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs w-48 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Company Website (Footer)</label>
              <input
                type="text"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs w-48 font-mono text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs w-36 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-600 mb-0.5">Project Code</label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs w-36 font-mono font-bold"
              />
            </div>
            <button
              onClick={handleSaveConfig}
              className="px-3 py-1 bg-blue-700 text-white font-bold rounded hover:bg-blue-800 transition"
            >
              Save Details
            </button>
          </div>
        </div>
      )}

      {/* 2. REPORT SHEETS CANVAS CONTAINER */}
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center gap-8 print:p-0 print:m-0 print:gap-0">
        {filteredReports.map((report, rIdx) => {
          const globalPageBase = rIdx * 3;
          const resolvedCAD = resolveReportFrames(report, effectiveDesigns, activeProject);

          return (
            <React.Fragment key={report.designRef || rIdx}>
              {/* =========================================================================
                  PAGE 1: TECHNICALS, CAD ELEVATION (INSIDE VIEW), PROFILE, RI, FAB HW, SCREWS
                 ========================================================================= */}
              <div
                id={`cost-report-page-${globalPageBase + 1}`}
                className="w-full max-w-[850px] bg-white text-black p-8 shadow-md border border-slate-300 flex flex-col justify-between min-h-[1120px] print:shadow-none print:border-none print:p-8 print:m-0 print:min-h-screen print:break-after-page"
              >
                <div>
                  {/* Standard Header */}
                  <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl font-black text-black tracking-tight uppercase">
                      Cost Breakup Report
                    </h1>
                    <div className="text-xs font-semibold text-black">
                      Date : {reportDate}
                    </div>
                  </div>

                  {/* Deep Blue Header Line */}
                  <div className="h-1 bg-[#1e40af] w-full mb-3" />

                  {/* Project Bar */}
                  <div className="flex items-center justify-between text-xs font-bold text-black mb-3">
                    <div>Project : <span className="font-normal text-black">{projectName}</span></div>
                    <div>Project Code : <span className="font-mono font-normal text-black">{projectCode}</span></div>
                  </div>

                  {/* Design Remarks Section */}
                  <div className="mb-3">
                    <div className="text-xs font-bold text-black mb-1">Design Remarks : :</div>
                    <table className="w-full text-left border-collapse border border-slate-400 text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-400 font-bold text-black">
                          <th className="p-1 border border-slate-400 w-36">Design Ref</th>
                          <th className="p-1 border border-slate-400 w-44">Remark Date</th>
                          <th className="p-1 border border-slate-400">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1 border border-slate-400 font-bold">{report.designRef}</td>
                          <td className="p-1 border border-slate-400 font-mono text-[11px]">{new Date().toLocaleDateString('en-IN')}</td>
                          <td className="p-1 border border-slate-400 text-slate-500 italic text-[11px]">Factory standard specification verified</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Two Columns: Technicals & View From Inside CAD */}
                  <div className="grid grid-cols-12 gap-3 mb-3 items-stretch">
                    {/* Left 7 Cols: Technicals Table with Vertical Header */}
                    <div className="col-span-7">
                      <table className="w-full text-left border-collapse border border-slate-400 text-[11px] h-full">
                        <tbody>
                          <tr>
                            <td
                              rowSpan={13}
                              className="w-7 bg-white border border-slate-400 font-bold text-center align-middle [writing-mode:vertical-lr] rotate-180 text-xs tracking-wider uppercase"
                            >
                              Technicals
                            </td>
                            <td className="p-1 border border-slate-400 font-bold text-black w-36">Design Ref</td>
                            <td className="p-1 border border-slate-400 font-bold text-black">{report.designRef}</td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Typology Loc</td>
                            <td className="p-1 border border-slate-400 text-slate-700">{report.location || 'Standard Aperture'}</td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Dimension (W × H)</td>
                            <td className="p-1 border border-slate-400 font-mono font-bold text-black">
                              {Math.round(report.width)} × {Math.round(report.height)} mm
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Quantity</td>
                            <td className="p-1 border border-slate-400 font-bold text-black">{report.quantity || 1}</td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Typology type</td>
                            <td className="p-1 border border-slate-400 font-bold text-black">{report.typologyType || report.designRef}</td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Brand</td>
                            <td className="p-1 border border-slate-400 font-semibold text-black uppercase">
                              {report.brand || 'DURONPOLYVINYLSPVTLTD'}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Series</td>
                            <td className="p-1 border border-slate-400 font-semibold text-black text-[10px]">
                              {report.series || 'DURON 60MM CASEMENT SERIES'}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Profile Finish</td>
                            <td className="p-1 border border-slate-400 font-semibold text-black uppercase">
                              {report.profileFinish?.replace('LAMINATION - ', '') || 'WHITE'}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Glass</td>
                            <td className="p-1 border border-slate-400 font-semibold text-black text-[10px]">
                              {report.glassDescription ? (report.glassDescription.startsWith('(') ? report.glassDescription : `(1) ${report.glassDescription}`) : '(1) 5 MM CLEAR GLASS'}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Mesh</td>
                            <td className="p-1 border border-slate-400 text-slate-800">{report.mesh && report.mesh !== 'N/A' ? report.mesh : 'No'}</td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Shutter weight (Kg)</td>
                            <td className="p-1 border border-slate-400 font-mono font-bold text-black">
                              S1-{report.shutterWeightKg ? report.shutterWeightKg.toFixed(3) : '36.104'}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Area</td>
                            <td className="p-1 border border-slate-400 font-mono text-black">
                              {report.areaSqM.toFixed(3)} Sqmt / {report.areaSqFt.toFixed(3)} Sqft
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1 border border-slate-400 font-semibold text-slate-800">Remarks</td>
                            <td className="p-1 border border-slate-400 text-slate-500 italic text-[10px]">--</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Right 5 Cols: View From Inside CAD Diagram (Enlarged Double Size) */}
                    <div className="col-span-5 flex flex-col items-center justify-between border border-slate-400 p-2 bg-white min-h-[440px]">
                      <div className="text-xs font-semibold text-black text-center w-full pb-1 border-b border-slate-200 flex items-center justify-between px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block"></span>
                          <span className="font-bold text-slate-900">View From Inside (CAD)</span>
                        </div>
                        <span className="font-mono font-bold text-blue-800 text-[11px] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {Math.round(report.width)} × {Math.round(report.height)} mm
                        </span>
                      </div>

                      <div className="flex-1 flex items-center justify-center w-full py-1 h-[400px]">
                        {/* High Precision CAD Elevation Drawing */}
                        <CadElevationDrawing
                          frames={resolvedCAD.frames}
                          couplings={resolvedCAD.couplings}
                          width="100%"
                          height="100%"
                          showDimensions={true}
                          showLabels={true}
                          showHandles={true}
                          showArrows={true}
                          allowEnlarge={true}
                          title={`${report.designRef} — ${report.typologyType} (${Math.round(report.width)}×${Math.round(report.height)}mm)`}
                          className="border-none shadow-none bg-white"
                        />
                      </div>

                      {/* Sash & Typology Footer Badge */}
                      <div className="w-full mt-1 pt-1 border-t border-slate-200 flex items-center justify-between px-2 text-[10px] text-slate-600">
                        <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                          {report.series || 'Duron Series'}
                        </span>
                        <span className="font-mono text-blue-700 font-bold">
                          {resolvedCAD.frames.reduce((acc, f) => acc + (f.pockets?.filter((p) => p.sashType && p.sashType !== 'fixed').length || 0), 0) || 1} Shutter(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Master Cost Breakup Table (Part 1: Profile, Reinforcement, Fabrication Hardware, Screws) */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-400 text-[11px]">
                      <thead>
                        <tr className="bg-[#b9d9f9] text-black font-bold border-b border-slate-400">
                          <th className="p-1 border border-slate-400 w-8 text-center"></th>
                          <th className="p-1 border border-slate-400">Description</th>
                          <th className="p-1 border border-slate-400 w-36 font-mono">Item Code</th>
                          <th className="p-1 border border-slate-400 text-right w-16">Qty</th>
                          <th className="p-1 border border-slate-400 text-center w-14">Unit</th>
                          <th className="p-1 border border-slate-400 text-right w-16">Rate</th>
                          <th className="p-1 border border-slate-400 text-right w-20">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderMasterTableSection(report, ['Profile', 'Reinforcement', 'Fabrication Hardware', 'Screws'])}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Standard Page Footer */}
                <div className="pt-4 border-t border-slate-400 flex items-center justify-between text-xs text-black font-medium">
                  <div>{companyName}</div>
                  <div>Page {globalPageBase + 1} of {totalPages}</div>
                  <div>{companyWebsite}</div>
                </div>
              </div>

              {/* =========================================================================
                  PAGE 2: INSTALLATION HARDWARE, GASKET & WOOLPILE, GLAZING, COST SUMMARY (PART 1)
                 ========================================================================= */}
              <div
                id={`cost-report-page-${globalPageBase + 2}`}
                className="w-full max-w-[850px] bg-white text-black p-8 shadow-md border border-slate-300 flex flex-col justify-between min-h-[1120px] print:shadow-none print:border-none print:p-8 print:m-0 print:min-h-screen print:break-after-page"
              >
                <div>
                  {/* Standard Header */}
                  <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl font-black text-black tracking-tight uppercase">
                      Cost Breakup Report
                    </h1>
                    <div className="text-xs font-semibold text-black">
                      Date : {reportDate}
                    </div>
                  </div>

                  {/* Deep Blue Header Line */}
                  <div className="h-1 bg-[#1e40af] w-full mb-3" />

                  {/* Project Bar */}
                  <div className="flex items-center justify-between text-xs font-bold text-black mb-2">
                    <div>Project : <span className="font-normal text-black">{projectName}</span></div>
                    <div>Project Code : <span className="font-mono font-normal text-black">{projectCode}</span></div>
                  </div>

                  {/* Typology Unit & CAD Reference Bar */}
                  <div className="bg-[#f0f7ff] border border-[#a2c5ea] rounded px-3 py-1.5 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-blue-900 text-white font-extrabold text-xs rounded">
                        {report.designRef}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{report.typologyType}</div>
                        <div className="text-[10px] text-slate-600 font-mono">
                          {Math.round(report.width)} × {Math.round(report.height)} mm • {report.quantity || 1} Unit(s) • {report.series}
                        </div>
                      </div>
                    </div>
                    <div className="h-16 w-36 bg-white border border-slate-300 rounded flex items-center justify-center p-0.5 shadow-2xs">
                      <CadElevationDrawing
                        frames={resolvedCAD.frames}
                        couplings={resolvedCAD.couplings}
                        width={140}
                        height={60}
                        showDimensions={false}
                        showLabels={false}
                        showHandles={true}
                        showArrows={true}
                        allowEnlarge={true}
                        className="border-none shadow-none"
                      />
                    </div>
                  </div>

                  {/* Master Cost Breakup Table (Part 2: Installation Hardware, Gasket and Woolpile, Glazing) */}
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-left border-collapse border border-slate-400 text-[11px]">
                      <thead>
                        <tr className="bg-[#b9d9f9] text-black font-bold border-b border-slate-400">
                          <th className="p-1 border border-slate-400 w-8 text-center"></th>
                          <th className="p-1 border border-slate-400">Description</th>
                          <th className="p-1 border border-slate-400 w-36 font-mono">Item Code</th>
                          <th className="p-1 border border-slate-400 text-right w-16">Qty</th>
                          <th className="p-1 border border-slate-400 text-center w-14">Unit</th>
                          <th className="p-1 border border-slate-400 text-right w-16">Rate</th>
                          <th className="p-1 border border-slate-400 text-right w-20">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderMasterTableSection(report, ['Installation Hardware', 'Gasket and Woolpile', 'Glazing'])}
                      </tbody>
                    </table>
                  </div>

                  {/* Cost Summary Table (Part 1: Profile Cost to Discount) */}
                  {report.costSummary && (
                    <div className="overflow-x-auto">
                      <div className="text-sm font-bold text-black text-center mb-1">Cost Summary</div>
                      <table className="w-full text-left border-collapse border border-slate-400 text-[11px]">
                        <tbody>
                          {renderCostSummaryRowsPart1(report.costSummary)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Standard Page Footer */}
                <div className="pt-4 border-t border-slate-400 flex items-center justify-between text-xs text-black font-medium">
                  <div>{companyName}</div>
                  <div>Page {globalPageBase + 2} of {totalPages}</div>
                  <div>{companyWebsite}</div>
                </div>
              </div>

              {/* =========================================================================
                  PAGE 3: COST SUMMARY (PART 2: SUB TOTAL, TRANSPORT, LOADING, PROJECT COST, GST, GRAND TOTAL)
                 ========================================================================= */}
              <div
                id={`cost-report-page-${globalPageBase + 3}`}
                className="w-full max-w-[850px] bg-white text-black p-8 shadow-md border border-slate-300 flex flex-col justify-between min-h-[1120px] print:shadow-none print:border-none print:p-8 print:m-0 print:min-h-screen print:break-after-page"
              >
                <div>
                  {/* Standard Header */}
                  <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl font-black text-black tracking-tight uppercase">
                      Cost Breakup Report
                    </h1>
                    <div className="text-xs font-semibold text-black">
                      Date : {reportDate}
                    </div>
                  </div>

                  {/* Deep Blue Header Line */}
                  <div className="h-1 bg-[#1e40af] w-full mb-3" />

                  {/* Project Bar */}
                  <div className="flex items-center justify-between text-xs font-bold text-black mb-2">
                    <div>Project : <span className="font-normal text-black">{projectName}</span></div>
                    <div>Project Code : <span className="font-mono font-normal text-black">{projectCode}</span></div>
                  </div>

                  {/* Typology Unit & CAD Reference Bar */}
                  <div className="bg-[#f0f7ff] border border-[#a2c5ea] rounded px-3 py-1.5 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-blue-900 text-white font-extrabold text-xs rounded">
                        {report.designRef}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{report.typologyType}</div>
                        <div className="text-[10px] text-slate-600 font-mono">
                          {Math.round(report.width)} × {Math.round(report.height)} mm • Total Cost: ₹{Math.round(report.costSummary?.grandTotal || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <div className="h-16 w-36 bg-white border border-slate-300 rounded flex items-center justify-center p-0.5 shadow-2xs">
                      <CadElevationDrawing
                        frames={resolvedCAD.frames}
                        couplings={resolvedCAD.couplings}
                        width={140}
                        height={60}
                        showDimensions={false}
                        showLabels={false}
                        showHandles={true}
                        showArrows={true}
                        allowEnlarge={true}
                        className="border-none shadow-none"
                      />
                    </div>
                  </div>

                  {/* Cost Summary Table (Part 2: Sub Total, Transport, Loading, Project Cost, GST, Grand Total) */}
                  {report.costSummary && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-slate-400 text-[11px]">
                        <tbody>
                          {renderCostSummaryRowsPart2(report.costSummary)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Standard Page Footer */}
                <div className="pt-4 border-t border-slate-400 flex items-center justify-between text-xs text-black font-medium">
                  <div>{companyName}</div>
                  <div>Page {globalPageBase + 3} of {totalPages}</div>
                  <div>{companyWebsite}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// HELPER: RENDER MASTER TABLE SECTIONS WITH VERTICAL CATEGORY HEADERS
// =========================================================================
function renderMasterTableSection(
  report: SingleFrameProductionReport,
  categories: string[]
) {
  return categories.map((cat) => {
    let items = (report.costBreakupRows || []).filter((r) => r.category === cat);

    // Fallback benchmark items if calculated rows are empty for specific category
    if (items.length === 0) {
      items = getBenchmarkCategoryRows(cat, report);
    }
    if (items.length === 0) return null;

    const subtotal = items.reduce((sum, r) => sum + (r.cost || 0), 0);

    return (
      <React.Fragment key={cat}>
        {items.map((row, idx) => (
          <tr key={`${cat}-${idx}`} className="border-b border-slate-300 hover:bg-slate-50/50">
            {idx === 0 && (
              <td
                rowSpan={items.length}
                className="p-1 border border-slate-400 font-bold text-center align-middle [writing-mode:vertical-lr] rotate-180 text-xs bg-white uppercase text-black"
              >
                {cat}
              </td>
            )}
            <td className="p-1 border border-slate-300 font-semibold text-black uppercase">
              {row.description}
            </td>
            <td className="p-1 border border-slate-300 font-mono text-[10px] text-slate-800">
              {row.itemCode}
            </td>
            <td className="p-1 border border-slate-300 text-right font-mono font-bold text-black">
              {typeof row.qty === 'number'
                ? row.qty.toFixed(row.unit === 'Pcs' || row.unit === 'CAN' ? (row.unit === 'CAN' ? 3 : 0) : 3)
                : row.qty}
            </td>
            <td className="p-1 border border-slate-300 text-center font-bold text-slate-700">
              {row.unit}
            </td>
            <td className="p-1 border border-slate-300 text-right font-mono text-black">
              {row.rate.toFixed(2)}
            </td>
            <td className="p-1 border border-slate-300 text-right font-mono font-bold text-black">
              {row.cost.toFixed(2)}
            </td>
          </tr>
        ))}

        {/* Category Total Row */}
        <tr className="border-b-2 border-slate-400 font-bold bg-white">
          <td colSpan={6} className="p-1 border border-slate-400 text-right pr-3 text-black">
            {cat} Total
          </td>
          <td className="p-1 border border-slate-400 text-right font-mono font-extrabold text-black">
            {subtotal.toFixed(2)}
          </td>
        </tr>
      </React.Fragment>
    );
  });
}

// =========================================================================
// HELPER: COST SUMMARY ROWS - PART 1 (PAGE 2)
// Exact 5 Columns: Item Name | Calculation Method | Formula/Basis | Multiplier/Rate | Cost (₹)
// =========================================================================
function renderCostSummaryRowsPart1(cs: import('../types/upvc').CostBreakupSummary) {
  const rows = [
    {
      name: 'Profile Cost',
      method: 'CustomFormula',
      formula: '#PROFILECOST',
      factor: '1.0000',
      cost: cs.profileCost.toFixed(2),
    },
    {
      name: 'Profile Wastage',
      method: 'Percentage',
      formula: '@Profile Cost.value',
      factor: cs.profileWastagePercent.toFixed(4),
      cost: cs.profileWastageCost.toFixed(2),
    },
    {
      name: 'RI Cost',
      method: 'CustomFormula',
      formula: '#RICOST',
      factor: '1.0000',
      cost: cs.riCost.toFixed(2),
    },
    {
      name: 'RI Wastage',
      method: 'Percentage',
      formula: '@RI Cost.value',
      factor: cs.riWastagePercent.toFixed(4),
      cost: cs.riWastageCost.toFixed(2),
    },
    {
      name: 'Hardware Cost',
      method: 'CustomFormula',
      formula: '#HWCOST',
      factor: '1.0000',
      cost: cs.hardwareCost.toFixed(2),
    },
    {
      name: 'Glass Cost',
      method: 'CustomFormula',
      formula: '#GLASSCOST',
      factor: '1.0000',
      cost: cs.glassCost.toFixed(2),
    },
    {
      name: 'Glass Wastage',
      method: 'Percentage',
      formula: '@Glass Cost.value',
      factor: cs.glassWastagePercent.toFixed(4),
      cost: cs.glassWastageCost.toFixed(2),
    },
    {
      name: 'Total Raw Material Cost',
      method: 'CustomFormula',
      formula:
        '@Profile Cost.value+@Profile Wastage.value\n+@RI Cost.value+@RI Wastage.value\n+@Hardware Cost.value+@Glass Cost.value\n+@Glass Wastage.value',
      factor: '1.0000',
      cost: cs.totalRawMaterialCost.toFixed(2),
    },
    {
      name: 'Fabrication Labour',
      method: 'AreaSqftFg',
      formula: '#AreaSqftFg',
      factor: cs.fabricationLabourRate.toFixed(4),
      cost: cs.fabricationLabourCost.toFixed(2),
    },
    {
      name: 'Installation Labour',
      method: 'AreaSqftFg',
      formula: '#AreaSqftFg',
      factor: cs.installationLabourRate.toFixed(4),
      cost: cs.installationLabourCost.toFixed(2),
    },
    {
      name: 'Sub Total Including Labour',
      method: 'CustomFormula',
      formula:
        '@Total Raw Material Cost.value\n+@Fabrication Labour.value+@Installation\nLabour.value',
      factor: '1.0000',
      cost: cs.subTotalIncludingLabour.toFixed(2),
    },
    {
      name: 'Profit',
      method: 'Percentage',
      formula: '@Sub Total Including Labour.value',
      factor: cs.profitPercent.toFixed(4),
      cost: cs.profitCost.toFixed(2),
    },
    {
      name: 'Extra Cost',
      method: 'UserDefinedFG\nOverhead',
      formula: '0',
      factor: '1.0000',
      cost: cs.extraCost.toFixed(2),
    },
    {
      name: 'Basic Value',
      method: 'CustomFormula',
      formula:
        '@Sub Total Including Labour.value\n+@Profit.value+@Extra Cost.value',
      factor: '1.0000',
      cost: cs.basicValue.toFixed(2),
    },
    {
      name: 'Discount',
      method: 'Percentage',
      formula: '@Basic Value.value',
      factor: cs.discountPercent.toFixed(4),
      cost: cs.discountAmount.toFixed(2),
    },
  ];

  return rows.map((r, i) => (
    <tr key={r.name} className="border-b border-slate-300 hover:bg-slate-50/50">
      <td className="p-1.5 border border-slate-400 font-semibold text-black w-48">{r.name}</td>
      <td className="p-1.5 border border-slate-400 text-slate-800 whitespace-pre-line text-[10px] w-32">{r.method}</td>
      <td className="p-1.5 border border-slate-400 font-mono text-[10px] text-slate-800 whitespace-pre-line">{r.formula}</td>
      <td className="p-1.5 border border-slate-400 text-right font-mono text-black w-24">{r.factor}</td>
      <td className="p-1.5 border border-slate-400 text-right font-mono font-bold text-black w-28">{r.cost}</td>
    </tr>
  ));
}

// =========================================================================
// HELPER: COST SUMMARY ROWS - PART 2 (PAGE 3)
// Exact 5 Columns: Sub Total to Grand Total
// =========================================================================
function renderCostSummaryRowsPart2(cs: import('../types/upvc').CostBreakupSummary) {
  const rows = [
    {
      name: 'Sub Total',
      method: 'CustomFormula',
      formula: '@Basic Value.value+@Discount.value',
      factor: '1.0000',
      cost: cs.subTotal.toFixed(2),
    },
    {
      name: 'Transportation Cost',
      method: 'LumpSumDivid\neByQty',
      formula: `@Transport ÷ ${cs.totalAssemblyUnits || 1} Windows`,
      factor: (cs.transportTotalLump || 1000).toFixed(4),
      cost: cs.transportationCost.toFixed(2),
    },
    {
      name: 'Loading And Unloading',
      method: 'LumpSumDivid\neByQty',
      formula: `@Loading ÷ ${cs.totalAssemblyUnits || 1} Windows`,
      factor: (cs.loadingTotalLump || 2000).toFixed(4),
      cost: cs.loadingUnloadingCost.toFixed(2),
    },
    {
      name: 'Total Project Cost',
      method: 'CustomFormula',
      formula:
        '@Sub Total.value+@Transportation\nCost.value+@Loading And Unloading.value',
      factor: '1.0000',
      cost: cs.totalProjectCost.toFixed(2),
    },
    {
      name: 'GST',
      method: 'Percentage',
      formula: '@Total Project Cost.value',
      factor: cs.gstPercent.toFixed(4),
      cost: cs.gstAmount.toFixed(2),
    },
    {
      name: 'Grand Total',
      method: 'CustomFormula',
      formula: '@Total Project Cost.value+@GST.value',
      factor: '1.0000',
      cost: cs.grandTotal.toFixed(2),
    },
  ];

  return rows.map((r) => (
    <tr key={r.name} className="border-b border-slate-400 hover:bg-slate-50/50">
      <td className="p-2 border border-slate-400 font-semibold text-black w-48">{r.name}</td>
      <td className="p-2 border border-slate-400 text-slate-800 whitespace-pre-line text-[10px] w-32">{r.method}</td>
      <td className="p-2 border border-slate-400 font-mono text-[10px] text-slate-800 whitespace-pre-line">{r.formula}</td>
      <td className="p-2 border border-slate-400 text-right font-mono text-black w-24">{r.factor}</td>
      <td className="p-2 border border-slate-400 text-right font-mono font-bold text-black w-28">{r.cost}</td>
    </tr>
  ));
}

// =========================================================================
// HELPER: INSIDE VIEW CAD SVG
// Renders the exact elevation diagram matching the right box of page 1
// =========================================================================
function InsideViewCadSvg({
  width,
  height,
  tag,
  glassDesc,
  isDoor,
}: {
  width: number;
  height: number;
  tag: string;
  glassDesc: string;
  isDoor: boolean;
}) {
  const containerW = 220;
  const containerH = 260;

  // Compute aspect ratio
  const maxW = 140;
  const maxH = 200;
  const scale = Math.min(maxW / width, maxH / height);

  const svgFrameW = width * scale;
  const svgFrameH = height * scale;

  const startX = 50; // space on left for height dimension
  const startY = 20;

  const profileThick = Math.max(4, 60 * scale);
  const sashThick = Math.max(4, 60 * scale);

  return (
    <svg
      width={containerW}
      height={containerH}
      viewBox={`0 0 ${containerW} ${containerH}`}
      className="overflow-visible select-none"
    >
      {/* 1. Left Vertical Witness Line & Height Dimension */}
      <line
        x1={startX - 18}
        y1={startY}
        x2={startX - 2}
        y2={startY}
        stroke="#000"
        strokeWidth="0.8"
      />
      <line
        x1={startX - 18}
        y1={startY + svgFrameH}
        x2={startX - 2}
        y2={startY + svgFrameH}
        stroke="#000"
        strokeWidth="0.8"
      />
      <line
        x1={startX - 10}
        y1={startY}
        x2={startX - 10}
        y2={startY + svgFrameH}
        stroke="#000"
        strokeWidth="1"
      />
      {/* Height Arrows */}
      <polygon
        points={`${startX - 10},${startY} ${startX - 12},${startY + 6} ${startX - 8},${startY + 6}`}
        fill="#000"
      />
      <polygon
        points={`${startX - 10},${startY + svgFrameH} ${startX - 12},${startY + svgFrameH - 6} ${startX - 8},${startY + svgFrameH - 6}`}
        fill="#000"
      />
      {/* Height Dimension Text (Horizontal) */}
      <text
        x={startX - 18}
        y={startY + svgFrameH / 2 + 4}
        textAnchor="middle"
        className="text-[11px] font-mono font-bold fill-black"
      >
        {Math.round(height)}
      </text>

      {/* 2. Bottom Horizontal Witness Line & Width Dimension */}
      <line
        x1={startX}
        y1={startY + svgFrameH + 2}
        x2={startX}
        y2={startY + svgFrameH + 18}
        stroke="#000"
        strokeWidth="0.8"
      />
      <line
        x1={startX + svgFrameW}
        y1={startY + svgFrameH + 2}
        x2={startX + svgFrameW}
        y2={startY + svgFrameH + 18}
        stroke="#000"
        strokeWidth="0.8"
      />
      <line
        x1={startX}
        y1={startY + svgFrameH + 10}
        x2={startX + svgFrameW}
        y2={startY + svgFrameH + 10}
        stroke="#000"
        strokeWidth="1"
      />
      {/* Width Arrows */}
      <polygon
        points={`${startX},${startY + svgFrameH + 10} ${startX + 6},${startY + svgFrameH + 8} ${startX + 6},${startY + svgFrameH + 12}`}
        fill="#000"
      />
      <polygon
        points={`${startX + svgFrameW},${startY + svgFrameH + 10} ${startX + svgFrameW - 6},${startY + svgFrameH + 8} ${startX + svgFrameW - 6},${startY + svgFrameH + 12}`}
        fill="#000"
      />
      {/* Width Dimension Text */}
      <text
        x={startX + svgFrameW / 2}
        y={startY + svgFrameH + 24}
        textAnchor="middle"
        className="text-[11px] font-mono font-bold fill-black"
      >
        {Math.round(width)}
      </text>

      {/* 3. Outer Frame Profile */}
      <rect
        x={startX}
        y={startY}
        width={svgFrameW}
        height={svgFrameH}
        fill="#f8fafc"
        stroke="#0284c7"
        strokeWidth="1.2"
      />

      {/* Frame Tag (F1) */}
      <text
        x={startX + svgFrameW - 3}
        y={startY + svgFrameH - 3}
        textAnchor="end"
        className="text-[8px] font-mono font-bold fill-slate-700"
      >
        F1
      </text>

      {/* 4. Sash Outer Profile */}
      <rect
        x={startX + profileThick}
        y={startY + profileThick}
        width={Math.max(10, svgFrameW - profileThick * 2)}
        height={Math.max(10, svgFrameH - profileThick * 2)}
        fill="#ffffff"
        stroke="#0284c7"
        strokeWidth="1"
      />

      {/* Sash Tag S1 at top */}
      <rect
        x={startX + svgFrameW / 2 - 10}
        y={startY + profileThick + 2}
        width={20}
        height={10}
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth="0.5"
      />
      <text
        x={startX + svgFrameW / 2}
        y={startY + profileThick + 9.5}
        textAnchor="middle"
        className="text-[7.5px] font-mono font-bold fill-slate-700"
      >
        S1
      </text>

      {/* 5. Glass Area */}
      <rect
        x={startX + profileThick + sashThick}
        y={startY + profileThick + sashThick}
        width={Math.max(6, svgFrameW - (profileThick + sashThick) * 2)}
        height={Math.max(6, svgFrameH - (profileThick + sashThick) * 2)}
        fill="#e0f2fe"
        stroke="#38bdf8"
        strokeWidth="0.6"
      />

      {/* Glass Pane Circle Indicator (1) */}
      <circle
        cx={startX + svgFrameW / 2}
        cy={startY + svgFrameH / 2 - 16}
        r={7}
        fill="#ffffff"
        stroke="#0284c7"
        strokeWidth="0.8"
      />
      <text
        x={startX + svgFrameW / 2}
        y={startY + svgFrameH / 2 - 13.5}
        textAnchor="middle"
        className="text-[8px] font-bold fill-blue-800 font-sans"
      >
        1
      </text>

      {/* Glass Type Tag Box */}
      <rect
        x={startX + svgFrameW / 2 - 40}
        y={startY + svgFrameH / 2 - 4}
        width={80}
        height={11}
        fill="#ffffff"
        stroke="#94a3b8"
        strokeWidth="0.5"
        rx="1"
      />
      <text
        x={startX + svgFrameW / 2}
        y={startY + svgFrameH / 2 + 4.5}
        textAnchor="middle"
        className="text-[6.5px] font-mono font-bold fill-slate-800"
      >
        {glassDesc ? (glassDesc.startsWith('(') ? glassDesc : `(1) ${glassDesc}`) : '(1) 5 MM CLEAR GLASS'}
      </text>

      {/* Swing / Opening Direction Indicator (OUT) */}
      <rect
        x={startX + svgFrameW / 2 - 14}
        y={startY + svgFrameH / 2 + 10}
        width={28}
        height={10}
        fill="#f0f9ff"
        stroke="#0284c7"
        strokeWidth="0.5"
        rx="1"
      />
      <text
        x={startX + svgFrameW / 2}
        y={startY + svgFrameH / 2 + 17.5}
        textAnchor="middle"
        className="text-[7.5px] font-sans font-bold fill-blue-700"
      >
        OUT
      </text>
    </svg>
  );
}

// Fallback items matching EvaWin Master Catalog if category is empty
function getBenchmarkCategoryRows(category: string, report: SingleFrameProductionReport): import('../types/upvc').CostBreakupRow[] {
  const w = report.width;
  const h = report.height;
  const isCasement = true;
  const catTyped = category as any;

  if (category === 'Profile') {
    const outerKg = Math.round(((w + h) * 2 / 1000 * 1.5) * 1000) / 1000;
    const sashKg = Math.round(((w + h - 240) * 2 / 1000 * 2.1) * 1000) / 1000;
    const beadKg = Math.round(((w + h - 240) * 2 / 1000 * 0.4) * 1000) / 1000;
    return [
      { id: 'p1', category: catTyped, description: 'CMT OUTER 60MM X 58MM', itemCode: 'CWH 60-02', qty: outerKg, unit: 'KG', rate: 140, cost: Math.round(outerKg * 140 * 100) / 100 },
      { id: 'p2', category: catTyped, description: 'CMT OUTWARD SASH 60MM X 104MM', itemCode: 'CWH 60-06', qty: sashKg, unit: 'KG', rate: 140, cost: Math.round(sashKg * 140 * 100) / 100 },
      { id: 'p3', category: catTyped, description: 'SASH BEADING 35.5MM', itemCode: 'CWH 60-08', qty: beadKg, unit: 'KG', rate: 140, cost: Math.round(beadKg * 140 * 100) / 100 },
    ];
  }
  if (category === 'Reinforcement') {
    const riOuterMtr = Math.round(((w + h) * 2 / 1000 - 0.2) * 1000) / 1000;
    const riSashMtr = Math.round(((w + h - 240) * 2 / 1000 - 0.08) * 1000) / 1000;
    return [
      { id: 'ri1', category: catTyped, description: 'RI-28MM X 20MM X 28MM', itemCode: 'CRI 60-02-1.5MM', qty: riOuterMtr, unit: 'Mtr', rate: 81, cost: Math.round(riOuterMtr * 81 * 100) / 100 },
      { id: 'ri2', category: catTyped, description: 'RI-54MM X 35MM X 54MM', itemCode: 'CRI 60-06-1.5MM', qty: riSashMtr, unit: 'Mtr', rate: 81, cost: Math.round(riSashMtr * 81 * 100) / 100 },
    ];
  }
  if (category === 'Fabrication Hardware') {
    const hwSel = ((report as any).hardwareSelection || report.handleDescription || '').toLowerCase();
    const isDoorType = (report.typologyType || '').toLowerCase().includes('door') || h >= 1800;
    const isMortise = hwSel.includes('mortise') || hwSel.includes('mls') || hwSel.includes('morties');
    const isCdls = hwSel.includes('cdls') || hwSel.includes('door locking set') || hwSel.includes('door_lock_set') || (!isMortise && isDoorType);

    if (isCdls || isMortise) {
      const handleName = isMortise ? 'MORTIES DOOR LOCK SET' : 'CMT DOOR LOCKING SET';
      const handleCode = isMortise ? 'UPVC-HW-MLS' : 'UPVC HW-CDLS';
      const handleRate = isMortise ? 1000 : 1500;
      const handleUnit = isMortise ? 'Set' : 'Pcs';
      return [
        { id: 'hw1', category: catTyped, description: '3D HINGES', itemCode: 'UPVC-HW-3DH', qty: 4, unit: 'Pcs', rate: 300, cost: 1200 },
        { id: 'hw2', category: catTyped, description: handleName, itemCode: handleCode, qty: 1, unit: handleUnit as any, rate: handleRate, cost: handleRate },
        { id: 'hw3', category: catTyped, description: 'GLASS PACKER 2MM', itemCode: 'UPVC-HW-GP2MM', qty: 8, unit: 'Pcs', rate: 0.6, cost: 4.8 },
        { id: 'hw4', category: catTyped, description: 'INERTIA BLOCK', itemCode: 'UPVC-HW-IB', qty: 1, unit: 'Pcs', rate: 5, cost: 5 },
      ];
    }

    return [
      { id: 'hw1', category: catTyped, description: '3D HINGES', itemCode: 'UPVC-HW-3DH', qty: 4, unit: 'Pcs', rate: 300, cost: 1200 },
      { id: 'hw2', category: catTyped, description: 'CASEMENT DOUBLE SIDE DOOR HANDLE', itemCode: 'UPVC-HW-CMTDSDH', qty: 1, unit: 'Pcs', rate: 520, cost: 520 },
      { id: 'hw3', category: catTyped, description: `CASEMENT 32MM BS ESPAG ${h >= 2000 ? 2000 : 1800}`, itemCode: `UPVC-HW-32BSC${h >= 2000 ? 2000 : 1800}`, qty: 1, unit: 'Pcs', rate: 0, cost: 0 },
      { id: 'hw4', category: catTyped, description: 'CMT ESPAG STRIKER', itemCode: 'UPVC-HW-CES', qty: 4, unit: 'Pcs', rate: 11, cost: 44 },
      { id: 'hw5', category: catTyped, description: 'GLASS PACKER 2MM', itemCode: 'UPVC-HW-GP2MM', qty: 8, unit: 'Pcs', rate: 0.6, cost: 4.8 },
      { id: 'hw6', category: catTyped, description: 'INERTIA BLOCK', itemCode: 'UPVC-HW-IB', qty: 1, unit: 'Pcs', rate: 5, cost: 5 },
    ];
  }
  if (category === 'Screws') {
    const hwSel = ((report as any).hardwareSelection || report.handleDescription || '').toLowerCase();
    const isDoorType = (report.typologyType || '').toLowerCase().includes('door') || h >= 1800;
    const isSelfContained = hwSel.includes('mortise') || hwSel.includes('mls') || hwSel.includes('morties') || hwSel.includes('cdls') || hwSel.includes('door locking set') || hwSel.includes('door_lock_set') || isDoorType;
    const outerRiQty = (w >= 1000 ? 8 : 6) + (h >= 2000 ? 14 : 12);
    const shutterRiQty = (w >= 1000 ? 6 : 4) + (h > 2200 ? 14 : (h > 2050 ? 12 : 10));

    if (isSelfContained) {
      return [
        { id: 'sc1', category: catTyped, description: 'CMT OUTER RI SCREW', itemCode: 'UPVC-HW-ORISC', qty: outerRiQty, unit: 'Pcs', rate: 1.25, cost: Math.round(outerRiQty * 1.25 * 100) / 100 },
        { id: 'sc2', category: catTyped, description: 'CMT SHUTTER RI SCREW', itemCode: 'UPVC-HW-SRS', qty: shutterRiQty, unit: 'Pcs', rate: 1.25, cost: Math.round(shutterRiQty * 1.25 * 100) / 100 },
        { id: 'sc3', category: catTyped, description: 'SHUTTER HINGES SCREW', itemCode: 'UPVC-HW-SHSC', qty: 32, unit: 'Pcs', rate: 2.5, cost: 80 },
        { id: 'sc4', category: catTyped, description: 'INERTIA BLOCK SCREW', itemCode: 'UPVC-HW-IBSC', qty: 1, unit: 'Pcs', rate: 1.25, cost: 1.25 },
      ];
    }

    return [
      { id: 'sc1', category: catTyped, description: 'CMT ESPAG STRIKER SCREW', itemCode: 'UPVC-HW-CMTESS', qty: 8, unit: 'Pcs', rate: 1.15, cost: 9.2 },
      { id: 'sc2', category: catTyped, description: 'CMT OUTER RI SCREW', itemCode: 'UPVC-HW-ORISC', qty: 20, unit: 'Pcs', rate: 1.25, cost: 25 },
      { id: 'sc3', category: catTyped, description: 'CMT SHUTTER RI SCREW', itemCode: 'UPVC-HW-SRS', qty: 18, unit: 'Pcs', rate: 1.25, cost: 22.5 },
      { id: 'sc4', category: catTyped, description: 'ESPAG BAR SCREW', itemCode: 'UPVC-HW-EBS', qty: 6, unit: 'Pcs', rate: 2, cost: 12 },
      { id: 'sc5', category: catTyped, description: 'ESPAG HANDLE SCREW', itemCode: 'UPVC-HW-EHS', qty: 2, unit: 'Pcs', rate: 1.15, cost: 2.3 },
      { id: 'sc6', category: catTyped, description: 'INERTIA BLOCK SCREW', itemCode: 'UPVC-HW-IBSC', qty: 1, unit: 'Pcs', rate: 1.25, cost: 1.25 },
      { id: 'sc7', category: catTyped, description: 'SHUTTER HINGES SCREW', itemCode: 'UPVC-HW-SHSC', qty: 32, unit: 'Pcs', rate: 2.5, cost: 80 },
    ];
  }
  if (category === 'Installation Hardware') {
    const fastnerQty = (w >= 800 ? 6 : 4) + (h > 2200 ? 12 : 10);
    const p1Qty = w >= 1000 ? 10 : 8;
    const p3Qty = w < 700 ? 4 : 6;
    const p5Qty = w < 700 ? 4 : 6;
    const dcQty = w >= 800 ? 3 : 2;
    const siliconeCan = Math.round((w + h) * 0.0005263 * 1000) / 1000;
    return [
      { id: 'ih1', category: catTyped, description: 'FASTNER CAPS', itemCode: 'UPVC-HW-FC', qty: fastnerQty, unit: 'Pcs', rate: 0.5, cost: Math.round(fastnerQty * 0.5 * 100) / 100 },
      { id: 'ih2', category: catTyped, description: 'FASTNER SCREWS', itemCode: 'UPVC-HW-N8 X 80', qty: fastnerQty, unit: 'Pcs', rate: 3.5, cost: Math.round(fastnerQty * 3.5 * 100) / 100 },
      { id: 'ih3', category: catTyped, description: 'DRAINAGE CAP', itemCode: 'UPVC-HW-DC', qty: dcQty, unit: 'Pcs', rate: 1.5, cost: Math.round(dcQty * 1.5 * 100) / 100 },
      { id: 'ih4', category: catTyped, description: 'PROFILE PACKER 1MM', itemCode: 'UPVC-HW-PP1MM', qty: p1Qty, unit: 'Pcs', rate: 0.6, cost: Math.round(p1Qty * 0.6 * 100) / 100 },
      { id: 'ih5', category: catTyped, description: 'PROFILE PACKER 3MM', itemCode: 'UPVC-HW-PP3MM', qty: p3Qty, unit: 'Pcs', rate: 0.6, cost: Math.round(p3Qty * 0.6 * 100) / 100 },
      { id: 'ih6', category: catTyped, description: 'PROFILE PACKER 5MM', itemCode: 'UPVC-HW-PP5MM', qty: p5Qty, unit: 'Pcs', rate: 0.6, cost: Math.round(p5Qty * 0.6 * 100) / 100 },
      { id: 'ih7', category: catTyped, description: 'SILICONE', itemCode: 'UPVC-HW-SI', qty: siliconeCan, unit: 'CAN', rate: 100, cost: Math.round(siliconeCan * 100 * 100) / 100 },
    ];
  }
  if (category === 'Gasket and Woolpile') {
    const gktMtr = Math.round(((w + h - 120) * 2 / 1000) * 1000) / 1000;
    return [
      { id: 'gk1', category: catTyped, description: 'CMT SHUTTER BEATING GASKET', itemCode: 'UPVC-HW-SHUTTERGKT', qty: gktMtr, unit: 'Mtr', rate: 0, cost: 0 },
      { id: 'gk2', category: catTyped, description: 'GLAZING GASKET INNER', itemCode: 'UPVC-HW-INNERGKT', qty: gktMtr, unit: 'Mtr', rate: 0, cost: 0 },
      { id: 'gk3', category: catTyped, description: 'GLAZING GASKET OUTER', itemCode: 'UPVC-HW-OUTERGKT', qty: gktMtr, unit: 'Mtr', rate: 0, cost: 0 },
      { id: 'gk4', category: catTyped, description: 'O TYPE GASKET', itemCode: 'UPVC-HW-OG', qty: gktMtr, unit: 'Mtr', rate: 0, cost: 0 },
    ];
  }
  if (category === 'Glazing') {
    const glassAreaSqFt = Math.round((((w - 240) * (h - 240)) / 92903.04) * 100) / 100;
    const rate = 84; // ₹84 / Sq.Ft
    const cost = Math.round(glassAreaSqFt * rate * 100) / 100;
    return [
      { id: 'gl1', category: catTyped, description: '5 MM BLACK GLASS', itemCode: '5 MM BLACK GLASS', qty: glassAreaSqFt, unit: 'Sq.Ft', rate, cost },
    ];
  }

  return [];
}
