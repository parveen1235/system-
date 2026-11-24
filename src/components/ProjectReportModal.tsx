import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Star,
  Layers,
  ChevronDown,
  Search,
  Check,
  Building,
  Phone,
  MapPin,
  Calendar,
  Eye,
  ExternalLink,
  ShieldCheck,
  Scissors,
  DollarSign,
  Package,
  Boxes,
  Maximize2,
  LayoutGrid,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { CustomerRecord } from '../types/erp';
import { UPVCProject, UPVCFrame, GlassType } from '../types/upvc';
import { CustomerDesignCardItem } from './CustomerProjectView';
import { CadElevationDrawing } from './CadElevationDrawing';
import { ProfileRequirementView } from './ProfileRequirementView';
import { TypologyCostBreakupReport } from './TypologyCostBreakupReport';
import {
  calculateAssemblyBounds,
  recalculateFramePockets,
  generateCuttingSchedule,
  generateProductionReports,
} from '../utils/upvcCalculations';
import { getGlassDisplayName } from '../utils/glassUtils';
import { ShriBalajiQuotationReport } from './ShriBalajiQuotationReport';
import { SiteInspectionQuestionnaireReport } from './SiteInspectionQuestionnaireReport';
import {
  downloadBlob,
  downloadText,
  exportElevationReportToExcel,
  generateElevationReportXlsHtml,
  generateDesignElevationCadSvgString,
  svgToPngBase64,
  printQuotationSheet,
  downloadQuotationPdf,
} from '../utils/exportUtils';

export interface ProjectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  customer: CustomerRecord;
  designs: CustomerDesignCardItem[];
  onOpenDesignInCAD?: (design: CustomerDesignCardItem) => void;
  onSelectReport?: (reportId: string) => void;
}

export const REPORT_METADATA: Record<
  string,
  { title: string; category: string; description: string }
> = {
  'basic-dim': {
    title: 'Basic Dimensions Report',
    category: 'Project Basic Details',
    description: 'Tabular overview of all designs with quantities, width, height, unit sq.ft, and total sq.ft.',
  },
  elevation: {
    title: 'Elevation Report',
    category: 'Project Basic Details',
    description: 'Visual CAD elevation drawings of all designs with dimensions, opening types, and glass specs.',
  },
  quotation: {
    title: 'Quotation',
    category: 'Quotation & Costing',
    description: 'Itemized commercial client quotation with tax breakdown and commercial terms.',
  },
  'project-cost-summary': {
    title: 'Project Cost Summary',
    category: 'Quotation & Costing',
    description: 'Executive financial summary breakdown of materials, fabrication labor, overheads, and profit.',
  },
  'profile-cost': {
    title: 'Profile Cost Report',
    category: 'Quotation & Costing',
    description: 'Detailed analysis of frame, sash, mullion, and bead profiles with lengths and weights.',
  },
  'ri-cost': {
    title: 'RI Cost Report',
    category: 'Quotation & Costing',
    description: 'Steel reinforcement tubes (GI 1.2/1.5mm) cut lengths, weights, and costing.',
  },
  'accessories-cost': {
    title: 'Accessories Cost Report',
    category: 'Quotation & Costing',
    description: 'Hardware items (multi-point locks, rollers, handles, wool pile, gaskets, fasteners).',
  },
  'glass-cost': {
    title: 'Glass Cost Report',
    category: 'Quotation & Costing',
    description: 'Glass cutting sizes, square footage, wastage allowance, and glass pricing.',
  },
  'typology-cost': {
    title: 'Typology Cost Breakup report',
    category: 'Quotation & Costing',
    description: 'Cost distribution segmented by window typologies (Sliding 2T, 3T, Casement, etc.).',
  },
  'project-cost-breakup': {
    title: 'Project Cost Breakup',
    category: 'Quotation & Costing',
    description: 'Categorical cost distribution: Raw materials, labor, overheads, and profit margin.',
  },
  'profile-requirement': {
    title: 'Profile Requirement & Stock Bar Optimization',
    category: 'Production Reports',
    description: 'Duron standard 5800mm (or customizable bar length) stock bar requisition, 1D linear cutting optimization, total bars & meters to order.',
  },
  'gi-steel-requirement': {
    title: 'GI Steel Reinforcement Requisition (जी.आई. पाइप अलग 6000mm)',
    category: 'Production Reports',
    description: 'Exclusive Galvanized Iron (GI) 6M steel pipe procurement requisition, 90° straight cuts, -100mm corner weld deductions, pipe counts, linear meters, and kg weights.',
  },
  'cutting-schedule': {
    title: 'Cutting Schedule Report',
    category: 'Production Reports',
    description: 'Factory cutting schedule for profile extrusions with 45°/90° cut angles and welding allowances.',
  },
  'design-assembly': {
    title: 'Design Assembly Report',
    category: 'Production Reports',
    description: 'Step-by-step fabrication guidelines, hardware fitting sequence, and quality sign-off.',
  },
  'dispatch-checklist': {
    title: 'Dispatch Checklist Report',
    category: 'Dispatch & Installation',
    description: 'Dispatch packaging and quality inspection checklist for transport verification.',
  },
  'installation-handover': {
    title: 'Installation Handover Report',
    category: 'Dispatch & Installation',
    description: 'Site installation verification and customer sign-off handover certificate.',
  },
  'site-inspection-questionnaire': {
    title: 'Site Inspection & Quality Questionnaire (प्रश्नावली रिपोर्ट)',
    category: 'Dispatch & Installation',
    description: '100% editable site survey and QA inspection checklist questions, custom PDF file naming, and direct PDF download.',
  },
};

// Helper to convert mm to Feet & Inches
function mmToFtIn(mm: number): string {
  const inches = mm / 25.4;
  const feet = Math.floor(inches / 12);
  const remInches = Math.round(inches % 12);
  return `${feet}' ${remInches}"`;
}

export const ProjectReportModal: React.FC<ProjectReportModalProps> = ({
  isOpen,
  onClose,
  reportId,
  customer,
  designs,
  onOpenDesignInCAD,
  onSelectReport,
}) => {
  const [currentReportId, setCurrentReportId] = useState<string>(reportId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusText, setExportStatusText] = useState('');
  const [elevationDensity, setElevationDensity] = useState<'large' | 'standard'>('large');
  const [showCoverPage, setShowCoverPage] = useState<boolean>(true);

  // Sync state if prop changes
  React.useEffect(() => {
    setCurrentReportId(reportId);
  }, [reportId]);

  const reportMeta = REPORT_METADATA[currentReportId] || REPORT_METADATA['basic-dim'];

  // Calculate high-precision metrics across all designs
  const projectMetrics = useMemo(() => {
    let totalQty = 0;
    let totalSqFt = 0;
    let totalSqM = 0;
    let totalVal = 0;

    const rowData = designs.map((d, index) => {
      const w = d.width || 1200;
      const h = d.height || 1200;
      const qty = d.quantity || 1;
      const areaSqM = (w * h) / 1000000;
      const unitSqFt = Number((areaSqM * 10.7639).toFixed(2));
      const rowTotalSqFt = Number((unitSqFt * qty).toFixed(2));
      const unitPrice = d.unitPrice || 0;
      const rowTotalVal = d.totalPrice || unitPrice * qty;
      const ratePerSqFt = unitSqFt > 0 ? Math.round(unitPrice / unitSqFt) : 0;

      totalQty += qty;
      totalSqFt += rowTotalSqFt;
      totalSqM += areaSqM * qty;
      totalVal += rowTotalVal;

      return {
        srNo: index + 1,
        design: d,
        tag: d.tag || `W${index + 1}`,
        location: d.location || 'Standard Aperture',
        type: d.type || 'Sliding Window',
        series: d.seriesName || 'Standard Series',
        width: w,
        height: h,
        dimMm: `${w} × ${h} mm`,
        dimFtIn: `${mmToFtIn(w)} × ${mmToFtIn(h)}`,
        qty,
        unitSqFt,
        totalSqFt: rowTotalSqFt,
        glassType: getGlassDisplayName(d.glassType, d.glassName),
        profileColor: (d.profileColor || 'white').toUpperCase(),
        ratePerSqFt,
        unitPrice,
        totalPrice: rowTotalVal,
      };
    });

    return {
      rowData,
      totalQty,
      totalSqFt: Number(totalSqFt.toFixed(2)),
      totalSqM: Number(totalSqM.toFixed(2)),
      totalVal,
      avgSqFt: totalQty > 0 ? Number((totalSqFt / totalQty).toFixed(2)) : 0,
      avgRatePerSqFt: totalSqFt > 0 ? Math.round(totalVal / totalSqFt) : 0,
    };
  }, [designs]);

  // Filtered rows for search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return projectMetrics.rowData;
    const q = searchQuery.toLowerCase();
    return projectMetrics.rowData.filter(
      (r) =>
        r.tag.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.series.toLowerCase().includes(q)
    );
  }, [projectMetrics.rowData, searchQuery]);

  // Combined cutting list items for production reports
  const allCuttingItems = useMemo(() => {
    const allFrames: UPVCFrame[] = [];
    designs.forEach((d) => {
      if (d.projectData?.frames) {
        d.projectData.frames.forEach((f) => {
          allFrames.push(f);
        });
      }
    });
    return generateCuttingSchedule(allFrames, []);
  }, [designs]);

  // 1. Export Basic Dimensions to Excel (.xlsx) using ExcelJS
  const handleExportBasicDimExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'UPVC & Aluminium CAD Engine';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Basic Dimensions');

      // Title & Header Information
      worksheet.mergeCells('A1:L1');
      worksheet.getCell('A1').value = `${customer.name} - BASIC DIMENSIONS & AREA SCHEDULE`;
      worksheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 32;

      // Project Meta row
      worksheet.mergeCells('A2:L2');
      worksheet.getCell('A2').value = `Site: ${customer.siteAddress || 'Main Project'} | Date: ${new Date().toLocaleDateString('en-IN')} | Brand: ${customer.brand || 'Duron'}`;
      worksheet.getCell('A2').font = { size: 10, italic: true };
      worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

      // Table Header
      const headerRow = worksheet.addRow([
        'Sr No',
        'Design Tag',
        'Location',
        'Typology / Series',
        'Width (mm)',
        'Height (mm)',
        'Size (Ft & In)',
        'Quantity',
        'Unit Sq.Ft',
        'Total Sq.Ft',
        'Rate (₹/Sq.Ft)',
        'Total Amount (₹)',
      ]);

      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Data Rows
      projectMetrics.rowData.forEach((row) => {
        const r = worksheet.addRow([
          row.srNo,
          row.tag,
          row.location,
          row.series,
          row.width,
          row.height,
          row.dimFtIn,
          row.qty,
          row.unitSqFt,
          row.totalSqFt,
          row.ratePerSqFt,
          row.totalPrice,
        ]);
        r.getCell(1).alignment = { horizontal: 'center' };
        r.getCell(2).alignment = { horizontal: 'center' };
        r.getCell(5).alignment = { horizontal: 'right' };
        r.getCell(6).alignment = { horizontal: 'right' };
        r.getCell(7).alignment = { horizontal: 'center' };
        r.getCell(8).alignment = { horizontal: 'center' };
        r.getCell(9).alignment = { horizontal: 'right' };
        r.getCell(10).alignment = { horizontal: 'right' };
        r.getCell(11).alignment = { horizontal: 'right' };
        r.getCell(12).alignment = { horizontal: 'right' };
      });

      // Total Summary Row
      const totalRow = worksheet.addRow([
        '',
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        projectMetrics.totalQty,
        '',
        projectMetrics.totalSqFt,
        `Avg ₹${projectMetrics.avgRatePerSqFt}`,
        projectMetrics.totalVal,
      ]);

      totalRow.height = 26;
      totalRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        };
      });

      // Set Column Widths
      worksheet.columns = [
        { width: 8 },
        { width: 14 },
        { width: 18 },
        { width: 28 },
        { width: 12 },
        { width: 12 },
        { width: 16 },
        { width: 12 },
        { width: 14 },
        { width: 14 },
        { width: 15 },
        { width: 18 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(`${customer.name}_Basic_Dimensions_Report.xlsx`, blob);
    } catch (err) {
      console.error('Error generating Excel file:', err);
      // Fallback to CSV
      handleExportCsv();
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export Elevation Report to Excel (.xlsx with actual embedded CAD vector drawings)
  const handleExportElevationExcel = async () => {
    setIsExporting(true);
    setExportStatusText('Rendering CAD vector drawings for Excel...');
    try {
      await exportElevationReportToExcel(customer, designs, (current, total) => {
        setExportStatusText(`Embedding CAD Drawings into Excel (${current} of ${total})...`);
      });
    } catch (err) {
      console.error('Error generating Excel file with CAD drawings:', err);
      // Graceful fallback to .xls HTML format
      await handleExportElevationXls();
    } finally {
      setIsExporting(false);
      setExportStatusText('');
    }
  };

  // 2b. Export Elevation Report to .xls HTML format with embedded graphics
  const handleExportElevationXls = async () => {
    setIsExporting(true);
    setExportStatusText('Rendering elevation graphics for .xls spreadsheet...');
    try {
      const pngMap: Record<string, string> = {};
      for (let i = 0; i < designs.length; i++) {
        const d = designs[i];
        setExportStatusText(`Rendering drawing ${i + 1} of ${designs.length}...`);
        const svg = generateDesignElevationCadSvgString(d);
        const base64 = await svgToPngBase64(svg, 480, 320);
        if (base64) {
          pngMap[d.id] = base64;
        }
      }
      const htmlContent = generateElevationReportXlsHtml(customer, designs, pngMap);
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      downloadBlob(`${customer.name.replace(/\s+/g, '_')}_Elevation_Schedule.xls`, blob);
    } catch (err) {
      console.error('Error exporting XLS:', err);
    } finally {
      setIsExporting(false);
      setExportStatusText('');
    }
  };

  // 3. Export to CSV (universal)
  const handleExportCsv = () => {
    let csv = `Sr No,Design Tag,Location,Typology Series,Width (mm),Height (mm),Size (Ft In),Quantity,Unit Sq.Ft,Total Sq.Ft,Rate (INR/Sq.Ft),Total Amount (INR)\n`;
    projectMetrics.rowData.forEach((r) => {
      csv += `"${r.srNo}","${r.tag}","${r.location}","${r.series}","${r.width}","${r.height}","${r.dimFtIn}","${r.qty}","${r.unitSqFt}","${r.totalSqFt}","${r.ratePerSqFt}","${r.totalPrice}"\n`;
    });
    csv += `,"TOTAL",,,,,"${projectMetrics.totalQty}",,"${projectMetrics.totalSqFt}",,"${projectMetrics.totalVal}"\n`;

    downloadText(`${customer.name}_${reportMeta.title.replace(/\s+/g, '_')}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatusToast, setPrintStatusToast] = useState<string | null>(null);

  // Print report trigger
  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatusToast('प्रिंट तैयार किया जा रहा है... (A4 शीट प्रिंट / PDF)');
    try {
      const targetId = currentReportId === 'quotation' ? 'shri-balaji-quotation-sheet' : 'project-report-content-sheet';
      const cleanName = `${(customer.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_${reportMeta.title.replace(/\s+/g, '_')}`;
      const success = await printQuotationSheet(targetId, cleanName);
      if (success) {
        setPrintStatusToast('प्रिंट आदेश भेजा गया / A4 PDF तैयार हो गई!');
      } else {
        await downloadQuotationPdf(targetId, cleanName);
        setPrintStatusToast('A4 PDF डाउनलोड हो गई है!');
      }
      setTimeout(() => setPrintStatusToast(null), 4500);
    } catch (err) {
      console.error('Print failed:', err);
      const targetId = currentReportId === 'quotation' ? 'shri-balaji-quotation-sheet' : 'project-report-content-sheet';
      const cleanName = `${(customer.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_${reportMeta.title.replace(/\s+/g, '_')}`;
      await downloadQuotationPdf(targetId, cleanName);
      setPrintStatusToast('A4 PDF सफलतापूर्वक डाउनलोड हो गई है!');
      setTimeout(() => setPrintStatusToast(null), 4500);
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-xs p-0 overflow-hidden animate-in fade-in">
      <div className="bg-white w-full h-full flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <div className="no-print px-6 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">{reportMeta.title}</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                  {reportMeta.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {customer.name} • {customer.siteAddress || 'Site'} • Reference: {customer.id}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Switch Dropdown */}
            <div className="relative hidden md:block">
              <select
                value={currentReportId}
                onChange={(e) => {
                  setCurrentReportId(e.target.value);
                  if (onSelectReport) onSelectReport(e.target.value);
                }}
                className="bg-slate-800 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 focus:outline-hidden cursor-pointer"
              >
                <optgroup label="Project Basic Details">
                  <option value="basic-dim">Basic Dimensions Report</option>
                  <option value="elevation">Elevation Report</option>
                </optgroup>
                <optgroup label="Quotation & Costing">
                  <option value="quotation">Quotation</option>
                  <option value="project-cost-summary">Project Cost Summary</option>
                  <option value="profile-cost">Profile Cost Report</option>
                  <option value="ri-cost">RI Cost Report</option>
                  <option value="accessories-cost">Accessories Cost Report</option>
                  <option value="glass-cost">Glass Cost Report</option>
                  <option value="typology-cost">Typology Cost Breakup</option>
                  <option value="project-cost-breakup">Project Cost Breakup</option>
                </optgroup>
                <optgroup label="Production Reports">
                  <option value="profile-requirement">Profile Requirement (Duron 5800mm / Custom)</option>
                  <option value="gi-steel-requirement">GI Steel Reinforcement Requisition (जी.आई. पाइप अलग 6000mm)</option>
                  <option value="cutting-schedule">Cutting Schedule Report</option>
                  <option value="design-assembly">Design Assembly Report</option>
                </optgroup>
                <optgroup label="Dispatch & Installation">
                  <option value="site-inspection-questionnaire">Site Inspection Questionnaire (प्रश्नावली रिपोर्ट)</option>
                  <option value="dispatch-checklist">Dispatch Checklist</option>
                  <option value="installation-handover">Installation Handover</option>
                </optgroup>
              </select>
            </div>

            {/* Excel Export Button */}
            <button
              onClick={currentReportId === 'elevation' ? handleExportElevationExcel : handleExportBasicDimExcel}
              disabled={isExporting}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={currentReportId === 'elevation' ? "Export Elevation Schedule with embedded CAD drawings to Excel (.xlsx)" : "Export to Excel"}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isExporting ? (exportStatusText || 'Exporting...') : (currentReportId === 'elevation' ? 'Export Elevation (.xlsx)' : 'Export Excel')}</span>
            </button>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Print Report / Generate Printable A4"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>{isPrinting ? 'Printing...' : 'Print (प्रिंट)'}</span>
            </button>

            {/* Prominent Red/High-Contrast Close Button with Cross Icon */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-md ml-2 shrink-0 border border-rose-500"
              title="Close Report (रिपोर्ट बंद करें)"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Close (बंद करें)</span>
            </button>
          </div>
        </div>

        {/* Floating Print Notification Toast */}
        {printStatusToast && (
          <div className="no-print p-3 bg-blue-950 border-b border-blue-500 text-blue-200 text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-base">🖨️</span>
              <span>{printStatusToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setPrintStatusToast(null)}
              className="text-blue-300 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* SUMMARY STATS BAR */}
        <div className="no-print bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Quantity</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-slate-900">{projectMetrics.totalQty}</span>
              <span className="text-[11px] font-semibold text-slate-500">Windows / Doors</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Project Area</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-blue-700">{projectMetrics.totalSqFt}</span>
              <span className="text-[11px] font-semibold text-slate-500">Sq.Ft ({projectMetrics.totalSqM} m²)</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Average Unit Area</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-slate-900">{projectMetrics.avgSqFt}</span>
              <span className="text-[11px] font-semibold text-slate-500">Sq.Ft / Window</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Project Value</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-emerald-700">₹{projectMetrics.totalVal.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-slate-400 font-mono">(Avg ₹{projectMetrics.avgRatePerSqFt}/sq.ft)</span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="no-print px-6 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search design tag, location, typology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50 text-slate-800"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <b className="text-slate-800">{filteredRows.length}</b> of {designs.length} designs
          </div>
        </div>

        {/* REPORT CONTENT BODY */}
        <div id="project-report-content-sheet" className="report-sheet flex-1 overflow-y-auto p-6 space-y-6">
          {/* =========================================================================
              REPORT 1: BASIC DIMENSIONS REPORT (Table Wise with Quantities, Sizes, Sq.Ft)
             ========================================================================= */}
          {currentReportId === 'basic-dim' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                      <th className="py-3 px-3 w-12 text-center">Sr.</th>
                      <th className="py-3 px-3">Design Tag</th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3">Typology / Series</th>
                      <th className="py-3 px-3 text-center">Dimensions W × H (mm)</th>
                      <th className="py-3 px-3 text-center">Size (Ft & In)</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3 text-right">Unit Sq.Ft</th>
                      <th className="py-3 px-3 text-right font-extrabold text-blue-300">Total Sq.Ft</th>
                      <th className="py-3 px-3 text-right">Rate (₹/Sq.Ft)</th>
                      <th className="py-3 px-3 text-right">Total Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRows.map((row) => (
                      <tr key={row.srNo} className="hover:bg-blue-50/40 transition">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{row.srNo}</td>
                        <td className="py-2.5 px-3 font-black text-blue-700 flex items-center gap-1.5">
                          <span>{row.tag}</span>
                          {onOpenDesignInCAD && (
                            <button
                              onClick={() => {
                                onOpenDesignInCAD(row.design);
                                onClose();
                              }}
                              className="text-slate-400 hover:text-blue-600 transition"
                              title="Open in CAD"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{row.location}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="font-semibold text-slate-900">{row.type}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">{row.series}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                          {row.width} × {row.height} mm
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px] bg-slate-50/70">
                          {row.dimFtIn}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-slate-900">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {row.qty}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{row.unitSqFt}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-blue-700 bg-blue-50/30">
                          {row.totalSqFt}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">₹{row.ratePerSqFt}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                          ₹{row.totalPrice.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}

                    {/* Summary Total Row */}
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={7} className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                        Grand Totals:
                      </td>
                      <td className="py-3 px-3 text-center text-xs text-blue-900 bg-blue-100 font-mono">
                        {projectMetrics.totalQty} Pcs
                      </td>
                      <td className="py-3 px-3 text-right text-xs"></td>
                      <td className="py-3 px-3 text-right text-xs text-blue-900 bg-blue-100 font-mono">
                        {projectMetrics.totalSqFt} Sq.Ft
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-slate-600">
                        Avg ₹{projectMetrics.avgRatePerSqFt}
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-emerald-800 bg-emerald-50 font-mono">
                        ₹{projectMetrics.totalVal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Manufacturing & Sizing Guidance Notes */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Engineering & Fabrication Note:</span>
                </div>
                <p>
                  • Square footage calculations use standard metric conversion factor (1 m² = 10.7639 Sq.Ft).
                  Individual pocket glass deduction accounts for 60mm outer profile and bead clearance.
                </p>
                <p>
                  • Outer dimensions represent the total masonry opening size. For coupled frames, a 2mm flat coupler
                  allowance is pre-calculated.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 2: ELEVATION REPORT (Professional EvaWin Elevation Diagram Report)
             ========================================================================= */}
          {currentReportId === 'elevation' && (() => {
            const reportDateString = `${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US')} +05:30`;
            const reportCompanyName = localStorage.getItem('cost_report_company_name') || customer.company || 'Shri Balaji Traders';
            const reportWebsite = localStorage.getItem('cost_report_website') || 'www.evawinoptimize.com';
            const projectCode = customer.quoteNo || customer.id || 'SHR-QT-00000062';
            const projectName = customer.name || 'SEC-5 P-14 F-A19';

            const getDesignPocketIndices = (design: CustomerDesignCardItem): string => {
              const frames = design.projectData?.frames;
              if (!frames || frames.length === 0) return '1,2';
              const totalPockets = frames.reduce((acc, f) => acc + (f.pockets?.length || 0), 0);
              if (totalPockets <= 0) return '1,2';
              return Array.from({ length: totalPockets }, (_, i) => i + 1).join(',');
            };

            const chunkSize = elevationDensity === 'large' ? 4 : 6;
            const elevationPages: typeof filteredRows[] = [];
            for (let i = 0; i < filteredRows.length; i += chunkSize) {
              elevationPages.push(filteredRows.slice(i, i + chunkSize));
            }
            if (elevationPages.length === 0) {
              elevationPages.push([]);
            }

            const totalElevationPages = (showCoverPage ? 1 : 0) + elevationPages.length;

            return (
              <div className="space-y-6">
                {/* TOOLBAR CONTROLS (Hidden when printing) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 text-white p-3 rounded-xl text-xs print:hidden shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Eye className="w-4 h-4 text-white shrink-0" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">Elevation Diagram Report</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                          EvaWin Industrial Sheet
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        उच्च-स्पष्टता CAD एलिवेशन आरेख (केवल स्पष्ट चित्र व 3-लाइन विवरण, कोई अनावश्यक तालिका नहीं)
                      </p>
                    </div>
                  </div>

                  {/* Size toggles & action buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Size Selector */}
                    <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setElevationDensity('large')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          elevationDensity === 'large'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                        title="बड़ी साइज़ (4 per page) - High clarity, bigger drawings"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>बड़ी साइज़ (4/Page)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setElevationDensity('standard')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          elevationDensity === 'standard'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                        title="स्टैंडर्ड (6 per page) - Matches EvaWin PDF screenshot"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>स्टैंडर्ड (6/Page)</span>
                      </button>
                    </div>

                    {/* Cover Page Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowCoverPage((prev) => !prev)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        showCoverPage
                          ? 'bg-slate-800 border-blue-500 text-blue-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Toggle Cover Summary Page (Page 1)"
                    >
                      <span>{showCoverPage ? '✓ कवर पेज (Page 1)' : '+ कवर पेज जोड़ें'}</span>
                    </button>

                    {/* Excel Export */}
                    <button
                      type="button"
                      onClick={handleExportElevationExcel}
                      disabled={isExporting}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      title="Download Excel (.xlsx) file with CAD vector drawings embedded"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{isExporting ? (exportStatusText || 'Generating...') : 'Export Excel'}</span>
                    </button>

                    {/* Print / Save as PDF */}
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      title="Print or Save as Multi-Page PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print / PDF</span>
                    </button>
                  </div>
                </div>

                {/* Export Progress Notification */}
                {isExporting && exportStatusText && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 animate-pulse print:hidden">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
                    <span><b>Export in progress:</b> {exportStatusText}</span>
                  </div>
                )}

                {/* PRINTABLE SHEETS CONTAINER */}
                <div className="space-y-8 print:space-y-0 text-slate-900 font-sans">
                  {/* =========================================================================
                      PAGE 1: PROJECT COVER & DESIGN REMARKS SHEET (Matches PDF Page 1)
                     ========================================================================= */}
                  {showCoverPage && (
                    <div className="bg-white border border-slate-300 rounded-lg p-8 shadow-sm min-h-[960px] flex flex-col justify-between print:shadow-none print:border-none print:p-6 print:m-0 print:break-after-page print:min-h-screen">
                      <div>
                        {/* Page 1 Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Elevation Diagram Report</h1>
                            <div className="text-sm font-semibold text-slate-800 mt-1">
                              Project: <span className="font-bold text-slate-900">{projectName}</span>
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-600">
                            <div>Date: <span className="font-mono font-medium">{reportDateString}</span></div>
                            <div className="mt-1 font-semibold text-slate-800">
                              Project Code : <span className="font-mono font-bold text-blue-900">{projectCode}</span>
                            </div>
                          </div>
                        </div>

                        {/* Solid Deep Blue Accent Divider */}
                        <div className="h-1 bg-blue-600 w-full mt-2 mb-6"></div>

                        {/* Section 1: Report includes the data from projects */}
                        <div className="mb-6">
                          <div className="text-xs font-bold text-slate-800 mb-1.5">
                            Report includes the data from projects :
                          </div>
                          <table className="w-full border-collapse border border-slate-300 text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                                <th className="p-2 border border-slate-300 text-center w-16">Sl No.</th>
                                <th className="p-2 border border-slate-300 text-left">Project Name</th>
                                <th className="p-2 border border-slate-300 text-left w-52">Project Code</th>
                                <th className="p-2 border border-slate-300 text-center w-24">Qty</th>
                                <th className="p-2 border border-slate-300 text-center w-28">Quote Alias</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-slate-50 text-slate-800 font-medium">
                                <td className="p-2 border border-slate-300 text-center">1</td>
                                <td className="p-2 border border-slate-300 font-bold text-slate-900">{projectName}</td>
                                <td className="p-2 border border-slate-300 font-mono">{projectCode}</td>
                                <td className="p-2 border border-slate-300 text-center font-bold text-slate-900">{projectMetrics.totalQty}</td>
                                <td className="p-2 border border-slate-300 text-center font-bold">A</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Section 2: Design Remarks */}
                        <div className="mb-8">
                          <div className="text-xs font-bold text-slate-800 mb-1.5">
                            Design Remarks : :
                          </div>
                          <table className="w-full border-collapse border border-slate-300 text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                                <th className="p-2 border border-slate-300 text-left w-36">Design Ref</th>
                                <th className="p-2 border border-slate-300 text-left w-36">Remark Date</th>
                                <th className="p-2 border border-slate-300 text-left">Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRows.map((row) => (
                                <tr key={row.srNo} className="hover:bg-slate-50 text-slate-800">
                                  <td className="p-2 border border-slate-300 font-bold text-blue-900">{row.tag}</td>
                                  <td className="p-2 border border-slate-300 font-mono text-slate-600">{new Date().toLocaleDateString('en-GB')}</td>
                                  <td className="p-2 border border-slate-300 text-slate-700">
                                    {row.series} • {row.profileColor} • {row.type}
                                  </td>
                                </tr>
                              ))}
                              {filteredRows.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="p-3 text-center text-slate-400">No design remarks available</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Page 1 Footer */}
                      <div className="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span>{reportCompanyName}</span>
                        <span>Page 1 of {totalElevationPages}</span>
                        <span>{reportWebsite}</span>
                      </div>
                    </div>
                  )}

                  {/* =========================================================================
                      PAGES 2+: ELEVATION DIAGRAM GRID SHEETS (Matches PDF Pages 2 & 3)
                     ========================================================================= */}
                  {elevationPages.map((pageRows, pageIdx) => {
                    const currentPageNumber = (showCoverPage ? 2 : 1) + pageIdx;

                    return (
                      <div
                        key={pageIdx}
                        className="bg-white border border-slate-300 rounded-lg p-6 shadow-sm min-h-[960px] flex flex-col justify-between print:shadow-none print:border-none print:p-4 print:m-0 print:break-after-page print:min-h-screen"
                      >
                        <div>
                          {/* Diagram Page Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Elevation Diagram Report</h2>
                              <div className="text-sm font-semibold text-slate-800 mt-0.5">
                                Project: <span className="font-bold text-slate-900">{projectName}</span>
                              </div>
                            </div>
                            <div className="text-right text-xs text-slate-600">
                              <div>Date: <span className="font-mono font-medium">{reportDateString}</span></div>
                              <div className="mt-0.5 font-semibold text-slate-800">
                                Project Code : <span className="font-mono font-bold text-blue-900">{projectCode}</span>
                              </div>
                            </div>
                          </div>

                          {/* Solid Deep Blue Line */}
                          <div className="h-1 bg-blue-600 w-full mt-2 mb-4"></div>

                          {/* Grid of Windows */}
                          <div
                            className={`grid ${
                              elevationDensity === 'large'
                                ? 'grid-cols-1 md:grid-cols-2 gap-5'
                                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
                            }`}
                          >
                            {pageRows.map((row) => {
                              const areaSqM = ((row.width * row.height) / 1000000).toFixed(3);
                              const pocketIndices = getDesignPocketIndices(row.design);
                              const glassSpec = row.glassType || '5 MM CLEAR TOUGHENED';

                              return (
                                <div
                                  key={row.srNo}
                                  className="border border-slate-300 rounded-sm bg-white flex flex-col justify-between overflow-hidden shadow-2xs hover:border-blue-500 transition"
                                >
                                  {/* View From Inside Label */}
                                  <div className="text-center text-[11px] font-bold text-slate-700 py-1 bg-slate-50/70 border-b border-slate-200 uppercase tracking-wide">
                                    View From Inside
                                  </div>

                                  {/* High-Resolution CAD Elevation Drawing Canvas */}
                                  <div
                                    className={`w-full flex items-center justify-center bg-white p-2 ${
                                      elevationDensity === 'large'
                                        ? 'min-h-[380px] md:min-h-[440px] h-[400px]'
                                        : 'min-h-[290px] md:min-h-[330px] h-[310px]'
                                    }`}
                                  >
                                    {row.design.projectData?.frames && row.design.projectData.frames.length > 0 ? (
                                      <CadElevationDrawing
                                        frames={row.design.projectData.frames}
                                        couplings={row.design.projectData.couplings || []}
                                        width="100%"
                                        height="100%"
                                        showDimensions={true}
                                        showLabels={true}
                                        showHandles={true}
                                        showArrows={true}
                                        allowEnlarge={true}
                                        title={`${row.tag} • ${row.dimMm}`}
                                      />
                                    ) : (
                                      <div className="text-slate-400 text-xs text-center py-10 font-mono">
                                        [ {row.tag} Elevation Drawing ]
                                      </div>
                                    )}
                                  </div>

                                  {/* EvaWin Industrial Sill / Drainage Orientation Indicator */}
                                  <div className="flex flex-col items-center justify-center py-1 bg-white shrink-0">
                                    <svg width="44" height="14" viewBox="0 0 44 14" className="overflow-visible">
                                      {/* Outer wall & sill reference line */}
                                      <line x1="2" y1="4" x2="42" y2="4" stroke="#94a3b8" strokeWidth="1.2" />
                                      <line x1="14" y1="4" x2="30" y2="4" stroke="#334155" strokeWidth="2.4" />
                                      {/* Outward arrow symbol */}
                                      <path d="M22 5 L22 11 M19 8 L22 11 L25 8" stroke="#334155" strokeWidth="1.2" fill="none" />
                                    </svg>
                                    <span className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-widest leading-none">
                                      OUT
                                    </span>
                                  </div>

                                  {/* Industrial 3-Line Specifications Box (Exact EvaWin Spec Box) */}
                                  <div className="border-t border-slate-300 p-2 text-[11px] leading-snug font-sans bg-white">
                                    {/* Line 1: Design Ref, Qty, Location */}
                                    <div className="flex items-center justify-between font-medium text-slate-800">
                                      <span>
                                        Design Ref : <b className="font-bold text-slate-900">{row.tag}</b>
                                      </span>
                                      <span>
                                        Qty : <b className="font-bold text-slate-900">{row.qty}</b>
                                      </span>
                                      <span>
                                        Location : <span className="text-slate-700">{row.location || ''}</span>
                                      </span>
                                    </div>

                                    {/* Line 2: Width, Height, Area */}
                                    <div className="flex items-center justify-between font-mono text-slate-800 mt-0.5">
                                      <span>
                                        W = {Number(row.width).toFixed(2)}; H = {Number(row.height).toFixed(2)}
                                      </span>
                                      <span className="font-sans font-medium text-slate-700">
                                        Area : <b className="font-mono text-slate-900">{areaSqM}</b> SqMt
                                      </span>
                                    </div>

                                    {/* Line 3: Glass specifications */}
                                    <div className="mt-0.5 text-slate-700 font-medium truncate" title={`(${pocketIndices}) ${glassSpec}`}>
                                      Glass : <span className="font-mono">({pocketIndices})</span> {glassSpec.toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Page Footer */}
                        <div className="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span>{reportCompanyName}</span>
                          <span>Page {currentPageNumber} of {totalElevationPages}</span>
                          <span>{reportWebsite}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* =========================================================================
              REPORT 3: QUOTATION (Shri Balaji Traders Editable PDF Report with custom filename)
             ========================================================================= */}
          {currentReportId === 'quotation' && (
            <ShriBalajiQuotationReport
              customer={customer}
              designs={designs}
              defaultQuoteNo={customer.id ? `001` : '001'}
              onClose={onClose}
            />
          )}

          {/* =========================================================================
              REPORT 4: PROJECT COST SUMMARY (Executive financial overview)
             ========================================================================= */}
          {currentReportId === 'project-cost-summary' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost Heads Breakdown Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="px-4 py-3 bg-slate-900 text-white font-bold text-xs">
                    Component Cost Heads Breakdown
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Item Head</th>
                        <th className="py-2 px-3 text-right">Weight / Qty</th>
                        <th className="py-2 px-3 text-right">Estimated Cost (₹)</th>
                        <th className="py-2 px-3 text-right">% Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-900">1. uPVC Profiles</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">~148 Kg</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(projectMetrics.totalVal * 0.44).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-600">44%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-900">2. Steel Reinforcement (GI)</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">~68 Kg</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(projectMetrics.totalVal * 0.12).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">12%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-900">3. Glass Panes & Toughening</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{projectMetrics.totalSqFt} Sq.Ft</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(projectMetrics.totalVal * 0.22).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">22%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-900">4. Hardware & Multi-point Locks</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{projectMetrics.totalQty * 4} items</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(projectMetrics.totalVal * 0.10).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">10%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-900">5. Fabrication & Welding Labor</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{projectMetrics.totalQty} Units</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(projectMetrics.totalVal * 0.08).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">8%</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-900">6. Gaskets & Weatherstrip Wool Pile</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">~120 Mtr</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(projectMetrics.totalVal * 0.04).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">4%</td>
                      </tr>
                      <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                        <td className="py-2.5 px-3">Total Manufacturing Cost:</td>
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right font-mono text-blue-900">
                          ₹{projectMetrics.totalVal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-900">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Profit Margin & Executive Summary */}
                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Executive Profitability Analysis
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Total Raw Material Cost:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ₹{Math.round(projectMetrics.totalVal * 0.88).toLocaleString('en-IN')} (88%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Direct Labor & Overhead:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ₹{Math.round(projectMetrics.totalVal * 0.12).toLocaleString('en-IN')} (12%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <span className="font-bold">Projected Net Factory Margin:</span>
                      <span className="font-black font-mono text-sm">
                        ₹{Math.round(projectMetrics.totalVal * 0.22).toLocaleString('en-IN')} (22%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 5: PROFILE COST REPORT
             ========================================================================= */}
          {currentReportId === 'profile-cost' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3">Profile Section</th>
                      <th className="py-2.5 px-3">Series</th>
                      <th className="py-2.5 px-3 text-right">Cut Length (Mtrs)</th>
                      <th className="py-2.5 px-3 text-right">Weight (Kg)</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹/Kg)</th>
                      <th className="py-2.5 px-3 text-right">Total Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Outer Frame 2-Track / 3-Track</td>
                      <td className="py-2.5 px-3 text-slate-500">62mm / 88mm</td>
                      <td className="py-2.5 px-3 text-right font-mono">58.0 M</td>
                      <td className="py-2.5 px-3 text-right font-mono">69.6 Kg</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹310</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹21,576</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Sliding Sash Profile</td>
                      <td className="py-2.5 px-3 text-slate-500">60mm Euro</td>
                      <td className="py-2.5 px-3 text-right font-mono">62.4 M</td>
                      <td className="py-2.5 px-3 text-right font-mono">56.2 Kg</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹320</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹17,984</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Interlock & Center Mullion</td>
                      <td className="py-2.5 px-3 text-slate-500">Heavy Duty</td>
                      <td className="py-2.5 px-3 text-right font-mono">17.0 M</td>
                      <td className="py-2.5 px-3 text-right font-mono">15.3 Kg</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹315</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹4,820</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Glazing Bead (Single/DGU)</td>
                      <td className="py-2.5 px-3 text-slate-500">Bead 24mm</td>
                      <td className="py-2.5 px-3 text-right font-mono">72.0 M</td>
                      <td className="py-2.5 px-3 text-right font-mono">14.4 Kg</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹280</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹4,032</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold border-t border-slate-300">
                      <td colSpan={3} className="py-2.5 px-3 text-right font-black">
                        Total Extrusion Profiles:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900">155.5 Kg</td>
                      <td className="py-2.5 px-3"></td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">₹48,412</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 6: RI COST REPORT (Reinforcement Steel)
             ========================================================================= */}
          {currentReportId === 'ri-cost' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3">Reinforcement Chamber</th>
                      <th className="py-2.5 px-3">Steel Spec</th>
                      <th className="py-2.5 px-3 text-right">Length (Mtrs)</th>
                      <th className="py-2.5 px-3 text-right">Weight (Kg)</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹/Kg)</th>
                      <th className="py-2.5 px-3 text-right">Total Steel Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Frame GI Steel Tube</td>
                      <td className="py-2.5 px-3 text-slate-500">1.5mm Galvanized</td>
                      <td className="py-2.5 px-3 text-right font-mono">54.0 M</td>
                      <td className="py-2.5 px-3 text-right font-mono">48.6 Kg</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹92</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹4,471</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Sash GI Steel Tube</td>
                      <td className="py-2.5 px-3 text-slate-500">1.2mm Galvanized</td>
                      <td className="py-2.5 px-3 text-right font-mono">58.0 M</td>
                      <td className="py-2.5 px-3 text-right font-mono">40.6 Kg</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹92</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹3,735</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Mullion Windload Reinforcement</td>
                      <td className="py-2.5 px-3 text-slate-500">2.0mm Heavy Duty</td>
                      <td className="py-2.5 px-3 text-right font-mono">16.0 M</td>
                      <td className="py-2.5 px-3 text-right font-mono">19.2 Kg</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹95</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹1,824</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold border-t border-slate-300">
                      <td colSpan={3} className="py-2.5 px-3 text-right font-black">
                        Total Steel Reinforcement:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900">108.4 Kg</td>
                      <td className="py-2.5 px-3"></td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">₹10,030</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 7: ACCESSORIES COST REPORT (Hardware items)
             ========================================================================= */}
          {currentReportId === 'accessories-cost' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3">Accessory / Hardware Name</th>
                      <th className="py-2.5 px-3">Part Spec</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Unit Price (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Sliding Roller (Nylon / Brass Bearing)</td>
                      <td className="py-2.5 px-3 text-slate-500">Heavy Duty Double Roller</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">40 Pcs</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹120</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹4,800</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Touch Lock / Crescent Lock with Key</td>
                      <td className="py-2.5 px-3 text-slate-500">Pop-up Automatic Lock</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">20 Pcs</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹240</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹4,800</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Wool Pile Weatherstripping</td>
                      <td className="py-2.5 px-3 text-slate-500">Fin Seal 6x6 mm</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">140 Mtr</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹14</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹1,960</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">EPDM Rubber Glazing Gaskets</td>
                      <td className="py-2.5 px-3 text-slate-500">High Elasticity Black</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">120 Mtr</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹16</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹1,920</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Self Tapping Screws & Fasteners</td>
                      <td className="py-2.5 px-3 text-slate-500">SS 304 4.2x25mm</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">1 Box</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹850</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹850</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold border-t border-slate-300">
                      <td colSpan={4} className="py-2.5 px-3 text-right font-black">
                        Total Accessories Cost:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">₹14,330</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 8: GLASS COST REPORT
             ========================================================================= */}
          {currentReportId === 'glass-cost' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3">Window Tag</th>
                      <th className="py-2.5 px-3">Glass Specification</th>
                      <th className="py-2.5 px-3 text-center">Panes</th>
                      <th className="py-2.5 px-3 text-right">Net Area (Sq.Ft)</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹/Sq.Ft)</th>
                      <th className="py-2.5 px-3 text-right">Total Glass Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {projectMetrics.rowData.map((r) => (
                      <tr key={r.srNo} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-blue-700">{r.tag}</td>
                        <td className="py-2 px-3">{r.glassType}</td>
                        <td className="py-2 px-3 text-center font-mono">{r.qty * 2} Panes</td>
                        <td className="py-2 px-3 text-right font-mono">{r.totalSqFt}</td>
                        <td className="py-2 px-3 text-right font-mono">₹115</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(r.totalSqFt * 115).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold border-t border-slate-300">
                      <td colSpan={3} className="py-2.5 px-3 text-right font-black">
                        Total Project Glass:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900">
                        {projectMetrics.totalSqFt} Sq.Ft
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">Avg ₹115</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">
                        ₹{Math.round(projectMetrics.totalSqFt * 115).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 9: TYPOLOGY COST BREAKUP REPORT
             ========================================================================= */}
          {currentReportId === 'typology-cost' && (
            <div className="w-full -m-6 p-2">
              <TypologyCostBreakupReport
                designs={designs}
                customer={customer}
                defaultProjectCode={customer?.referenceNo || 'SHR-QT-00000063'}
                defaultProjectName={customer?.name || 'just'}
                onOpenDesignInCAD={onOpenDesignInCAD}
                onClose={onClose}
              />
            </div>
          )}

          {/* =========================================================================
              REPORT 10: PROJECT COST BREAKUP
             ========================================================================= */}
          {currentReportId === 'project-cost-breakup' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Raw Material</span>
                  <div className="text-lg font-black text-blue-700 mt-1">72%</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Profiles, steel, glass, and hardware.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Fabrication Labor</span>
                  <div className="text-lg font-black text-amber-700 mt-1">12%</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cutting, welding, cleaning, and assembly.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Overheads & Transport</span>
                  <div className="text-lg font-black text-slate-700 mt-1">6%</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Consumables, packaging, and delivery.</p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Gross Margin</span>
                  <div className="text-lg font-black text-emerald-900 mt-1">20%</div>
                  <p className="text-[11px] text-emerald-700 mt-0.5">Factory gross profit margin.</p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT: PROFILE REQUIREMENT & BAR STOCK OPTIMIZATION (Duron 5800mm)
             ========================================================================= */}
          {currentReportId === 'profile-requirement' && (
            <ProfileRequirementView
              designs={designs}
              customer={customer}
              onOpenDesignInCAD={onOpenDesignInCAD}
              initialCategory="upvc"
            />
          )}

          {/* =========================================================================
              REPORT: GI STEEL REINFORCEMENT REQUISITION (जी.आई. अलग - 6000mm / 20 Ft)
             ========================================================================= */}
          {currentReportId === 'gi-steel-requirement' && (
            <ProfileRequirementView
              designs={designs}
              customer={customer}
              onOpenDesignInCAD={onOpenDesignInCAD}
              initialCategory="gi"
            />
          )}

          {/* =========================================================================
              REPORT 11: CUTTING SCHEDULE REPORT (Production)
             ========================================================================= */}
          {currentReportId === 'cutting-schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">
                  Profile Cut Lengths with 45° Miter Cuts and 6mm Welding Allowances
                </h4>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Factory Floor Ready
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3">Piece Description</th>
                      <th className="py-2.5 px-3">Profile Type</th>
                      <th className="py-2.5 px-3 text-center">Cut Angle</th>
                      <th className="py-2.5 px-3 text-right">Cut Length (mm)</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Steel Cut (mm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {projectMetrics.rowData.map((r) => (
                      <React.Fragment key={r.srNo}>
                        <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                          <td colSpan={6} className="py-1.5 px-3">
                            {r.tag} ({r.location}) — Frame {r.width} × {r.height} mm (Qty: {r.qty})
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6 text-slate-700">Top & Bottom Frame</td>
                          <td className="py-2 px-3 text-slate-500">Outer Track Profile</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">45° / 45°</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{r.width + 6} mm</td>
                          <td className="py-2 px-3 text-center font-mono">{r.qty * 2}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">{r.width - 100} mm</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6 text-slate-700">Left & Right Frame</td>
                          <td className="py-2 px-3 text-slate-500">Outer Track Profile</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">45° / 45°</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{r.height + 6} mm</td>
                          <td className="py-2 px-3 text-center font-mono">{r.qty * 2}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">{r.height - 100} mm</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6 text-slate-700">Sliding Sash Vertical</td>
                          <td className="py-2 px-3 text-slate-500">Sash 60mm</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">45° / 45°</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {r.height - 70} mm
                          </td>
                          <td className="py-2 px-3 text-center font-mono">{r.qty * 4}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">{r.height - 150} mm</td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 12: DESIGN ASSEMBLY REPORT (Production)
             ========================================================================= */}
          {currentReportId === 'design-assembly' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 text-xs">
                <h4 className="font-black text-slate-900 uppercase">Step-by-Step Workshop Assembly Instructions</h4>
                <ol className="list-decimal pl-4 space-y-2 text-slate-700">
                  <li>
                    <b>Profile Chamber Preparation:</b> Check cut miters (45.0° ±0.2°). Drill water drainage holes at
                    designated bottom frame tracks.
                  </li>
                  <li>
                    <b>Steel Reinforcement Insertion:</b> Insert galvanized steel tubes (1.5mm) into outer chamber.
                    Fix with self-drilling screws spaced at 300mm centers.
                  </li>
                  <li>
                    <b>Corner Fusion Welding:</b> Heat temperature at 250°C ±5°C. Fusion time 25s, cooling time 30s.
                    Check diagonal tolerance (≤2.0mm).
                  </li>
                  <li>
                    <b>Corner Cleaning:</b> Clean outer and inner weld seams using CNC corner cleaner or manual groover.
                  </li>
                  <li>
                    <b>Hardware & Gasket Installation:</b> Press fit EPDM gasket into sash grooves. Insert rollers and
                    secure touch locks.
                  </li>
                  <li>
                    <b>Glazing & Glass Packing:</b> Install bridge packers. Seat glass panes squarely. Tap glazing beads
                    firmly into position with nylon mallet.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 13: DISPATCH CHECKLIST REPORT
             ========================================================================= */}
          {currentReportId === 'dispatch-checklist' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3">Mark</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Outer Frame Packed</th>
                      <th className="py-2.5 px-3 text-center">Sashes Packed</th>
                      <th className="py-2.5 px-3 text-center">Glass Protected</th>
                      <th className="py-2.5 px-3 text-center">Hardware Kit</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {projectMetrics.rowData.map((r) => (
                      <tr key={r.srNo} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-blue-700">{r.tag}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {r.location} ({r.dimMm})
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Ready
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 14: INSTALLATION HANDOVER REPORT
             ========================================================================= */}
          {currentReportId === 'installation-handover' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm uppercase">Site Installation & Handover Certificate</h4>
                    <p className="text-slate-500">Site: {customer.siteAddress || customer.name}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 font-bold text-[11px]">
                    QA Sign-off
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-slate-700">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                    <span>Masonry Aperture check & diagonal plumb alignment confirmed within ±2mm tolerance.</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                    <span>External Weatherproof Neutral Silicone sealant applied completely around perimeter.</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                    <span>Sliding and casement sashes operate smoothly with latch and key lock engagement.</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                    <span>Protective tapes removed and glass surfaces cleaned for final client inspection.</span>
                  </label>
                </div>

                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Site Supervisor Signature</span>
                    <div className="h-10 border-b border-dashed border-slate-400 mt-2"></div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Customer Acceptance Signature</span>
                    <div className="h-10 border-b border-dashed border-slate-400 mt-2"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              REPORT 15: SITE INSPECTION & QUALITY QUESTIONNAIRE REPORT (Editable questions, custom PDF filename, direct download)
             ========================================================================= */}
          {currentReportId === 'site-inspection-questionnaire' && (
            <SiteInspectionQuestionnaireReport
              customer={customer}
              designs={designs}
              defaultReportNo={customer.id ? `INSP-${customer.id.replace(/\D/g, '') || '001'}` : 'INSP-001'}
              onClose={onClose}
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Total Designs: <b className="text-slate-800">{designs.length}</b> • Total Windows: <b className="text-slate-800">{projectMetrics.totalQty}</b> • Area: <b className="text-blue-700">{projectMetrics.totalSqFt} Sq.Ft</b>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={currentReportId === 'elevation' ? handleExportElevationExcel : handleExportBasicDimExcel}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
