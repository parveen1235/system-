import React, { useState, useRef, useMemo } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  Layers,
  CheckCircle,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Scissors,
  DollarSign,
  FileText,
  Calculator,
  Receipt,
} from 'lucide-react';
import {
  UPVCFrame,
  SingleFrameProductionReport,
  UPVCProject,
  CouplingConnection,
  CustomerDesignCardItem,
  CostBreakupRow,
  CostBreakupSummary,
} from '../types/upvc';
import { CadElevationDrawing } from './CadElevationDrawing';
import { recalculateFramePockets } from '../utils/upvcCalculations';

interface OfficialProductionReportViewProps {
  project?: UPVCProject;
  productionReports: SingleFrameProductionReport[];
  frames: UPVCFrame[];
  couplings?: CouplingConnection[];
  designs?: CustomerDesignCardItem[];
  companyName?: string;
  companyWebsite?: string;
  onClose?: () => void;
  selectedFrameId?: string;
  onSelectFrameId?: (id: string) => void;
}

/**
 * High-precision CAD Elevation Diagram matching the real CAD design
 * Uses CadElevationDrawing so every window/door looks identical to what was designed in CAD.
 */
const CadElevationView: React.FC<{
  report: SingleFrameProductionReport;
  frame?: UPVCFrame;
  frames?: UPVCFrame[];
  couplings?: CouplingConnection[];
  designTag?: string;
}> = ({ report, frame, frames: propFrames, couplings = [], designTag }) => {
  // Determine frames to render with verified pockets
  const resolvedFrames: UPVCFrame[] = useMemo(() => {
    const sourceFrames = propFrames && propFrames.length > 0 ? propFrames : frame ? [frame] : [];
    if (sourceFrames.length === 0) {
      // Clean fallback frame with report dimensions
      const fallback: UPVCFrame = {
        id: report.frameId || 'rep-frame',
        name: designTag || report.designRef,
        x: 0,
        y: 0,
        width: report.width || 1200,
        height: report.height || 1200,
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: report.profileFinish?.toLowerCase().includes('oak') ? 'golden_oak' : 'white',
        series: report.series?.toLowerCase().includes('slid') ? 'sliding_62' : 'casement_60',
        mullions: [],
        pockets: [],
        reinforcement: 'steel_1.5mm',
        drainageCaps: true,
      };
      fallback.pockets = recalculateFramePockets(fallback);
      return [fallback];
    }

    return sourceFrames.map((f) => {
      let p = f.pockets;
      if (!p || p.length === 0) {
        p = recalculateFramePockets(f);
      }
      return {
        ...f,
        pockets: p,
      };
    });
  }, [propFrames, frame, report, designTag]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-2 bg-white">
      {/* Title & Inside View Label */}
      <div className="w-full flex items-center justify-between px-2 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span>
          <span className="text-[11px] font-mono font-black text-slate-900">
            {designTag || report.designRef} — CAD ELEVATION
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          View From Inside (अंदर से दृश्य)
        </span>
      </div>

      {/* Main CAD Drawing SVG Container (Double Size for High Clarity) */}
      <div className="w-full h-[520px] sm:h-[560px] flex items-center justify-center p-2 bg-slate-50/40 rounded-lg">
        <CadElevationDrawing
          frames={resolvedFrames}
          couplings={couplings}
          width="100%"
          height="100%"
          showDimensions={true}
          showLabels={true}
          showHandles={true}
          showArrows={true}
          allowEnlarge={true}
          title={`${designTag || report.designRef} — ${report.typologyType} (${Math.round(report.width)}×${Math.round(report.height)}mm)`}
          className="border-none shadow-none bg-white"
        />
      </div>

      {/* Industrial Sash / Shutter Summary Pill Bar */}
      <div className="w-full mt-1 pt-1 border-t border-slate-200 flex items-center justify-between px-2 text-[10px] text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">सैश / पल्ले:</span>
          <span className="font-mono text-blue-700 font-bold">
            {resolvedFrames.reduce((acc, f) => acc + (f.pockets?.filter((p) => p.sashType && p.sashType !== 'fixed').length || 0), 0) || (report.series?.toLowerCase().includes('slid') ? 2 : 1)} Shutter(s)
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono">
          <span className="text-slate-400">Dim:</span>
          <span className="font-bold text-slate-800">{Math.round(report.width)} × {Math.round(report.height)} mm</span>
        </div>
      </div>
    </div>
  );
};

export const OfficialProductionReportView: React.FC<
  OfficialProductionReportViewProps
> = ({
  project,
  productionReports,
  frames,
  couplings = [],
  designs = [],
  companyName = 'Shri Balaji Traders',
  companyWebsite = 'www.evawinoptimize.com',
  onClose,
  selectedFrameId,
  onSelectFrameId,
}) => {
  const [reportMode, setReportMode] = useState<'both' | 'fabrication' | 'cost_breakup'>('both');
  const [activePage, setActivePage] = useState<string | number>('all');
  const printRef = useRef<HTMLDivElement>(null);

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const currentTimeStr = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const projectName = project?.name || 'SEC-5 P-14 F-A19';
  const projectCode = project?.referenceNo || 'SHR-QT-00000062';

  // Calculate total pages count dynamically based on report mode
  const totalPagesCount = useMemo(() => {
    if (reportMode === 'both') return 1 + (productionReports.length * 2);
    return 1 + productionReports.length;
  }, [reportMode, productionReports.length]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'PRODUCTION & COST BREAKUP REPORT\n';
    csvContent += `Project,${projectName},Code,${projectCode},Date,${currentDateStr}\n\n`;

    productionReports.forEach((rep, idx) => {
      csvContent += `--- FRAME ${idx + 1}: ${rep.designRef} (${rep.width}x${rep.height}mm) - Qty: ${rep.quantity} ---\n`;
      
      if (reportMode === 'both' || reportMode === 'fabrication') {
        csvContent += 'FABRICATION CUTTING SCHEDULE\n';
        csvContent += 'Section,Description,Item Code,Dimension (mm),Cut Angle,Qty,Position\n';
        rep.profiles.forEach((p) => {
          csvContent += `Profile,"${p.description}",${p.itemCode},${p.dimension},"${p.cutAngle}",${p.quantity},${p.position}\n`;
        });
        rep.reinforcements.forEach((r) => {
          csvContent += `Reinforcement,"${r.description}",${r.itemCode},${r.dimension},"${r.cutAngle}",${r.quantity},${r.position}\n`;
        });
        rep.hardwares.forEach((h) => {
          csvContent += `Hardware,"${h.description}",${h.itemCode},,,"${h.quantity} ${h.unit || 'Pcs'}",${h.position || ''}\n`;
        });
        rep.screws.forEach((s) => {
          csvContent += `Screws,"${s.description}",${s.itemCode},,,"${s.quantity} Pcs",\n`;
        });
        rep.gaskets.forEach((g) => {
          csvContent += `Gasket & Woolpile,"${g.description}",${g.itemCode},${g.dimension || ''},,"${g.quantity} Pcs",${g.position || ''}\n`;
        });
        rep.glazing.forEach((gl) => {
          csvContent += `Glazing,"${gl.description}",${gl.itemCode || ''},"${gl.width} X ${gl.height}",,"${gl.quantity} Pcs",${gl.position || ''}\n`;
        });
        rep.installation.forEach((ins) => {
          csvContent += `Installation,"${ins.description}",${ins.itemCode},,,"${ins.quantity}",\n`;
        });
        csvContent += '\n';
      }

      if ((reportMode === 'both' || reportMode === 'cost_breakup') && rep.costBreakupRows) {
        csvContent += 'COST BREAKUP SCHEDULE\n';
        csvContent += 'Category,Description,Item Code,Qty,Unit,Rate (INR),Cost (INR)\n';
        rep.costBreakupRows.forEach((cb) => {
          csvContent += `"${cb.category}","${cb.description}",${cb.itemCode},${cb.qty},${cb.unit},${cb.rate},${cb.cost}\n`;
        });
        if (rep.costSummary) {
          csvContent += '\nCOST SUMMARY\n';
          csvContent += `Profile Cost,,,,,${rep.costSummary.profileCost}\n`;
          csvContent += `Profile Wastage (${rep.costSummary.profileWastagePercent}%),,,,,${rep.costSummary.profileWastageCost}\n`;
          csvContent += `RI Cost,,,,,${rep.costSummary.riCost}\n`;
          csvContent += `RI Wastage (${rep.costSummary.riWastagePercent}%),,,,,${rep.costSummary.riWastageCost}\n`;
          csvContent += `Hardware Cost,,,,,${rep.costSummary.hardwareCost}\n`;
          csvContent += `Glass Cost,,,,,${rep.costSummary.glassCost}\n`;
          csvContent += `Glass Wastage (${rep.costSummary.glassWastagePercent}%),,,,,${rep.costSummary.glassWastageCost}\n`;
          csvContent += `Total Raw Material Cost,,,,,${rep.costSummary.totalRawMaterialCost}\n`;
          csvContent += `Fabrication Labour,,,,,${rep.costSummary.fabricationLabourCost}\n`;
          csvContent += `Installation Labour,,,,,${rep.costSummary.installationLabourCost}\n`;
          csvContent += `Sub Total Including Labour,,,,,${rep.costSummary.subTotalIncludingLabour}\n`;
          csvContent += `Profit (${rep.costSummary.profitPercent}%),,,,,${rep.costSummary.profitCost}\n`;
          csvContent += `Sub Total,,,,,${rep.costSummary.subTotal}\n`;
          csvContent += `Transportation Cost,,,,,${rep.costSummary.transportationCost}\n`;
          csvContent += `Total Project Cost,,,,,${rep.costSummary.totalProjectCost}\n`;
          csvContent += `GST (${rep.costSummary.gstPercent}%),,,,,${rep.costSummary.gstAmount}\n`;
          csvContent += `Grand Total,,,,,${rep.costSummary.grandTotal}\n`;
        }
        csvContent += '\n';
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Production_Report_${projectCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-slate-100 min-h-screen text-slate-900 pb-16 font-sans">
      {/* ----------------- TOP ACTION BAR (Hidden in print) ----------------- */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-300 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                Production Report & Cost Breakup
              </h1>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-bold">
                EVAWIN STANDARD
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Project: <span className="font-bold text-slate-800">{projectName}</span> | Code:{' '}
              <span className="font-mono font-bold text-blue-700">{projectCode}</span> | {productionReports.length} Units
            </p>
          </div>
        </div>

        {/* View Mode Tabs (Fabrication vs Cost Breakup vs Both) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold gap-1">
          <button
            onClick={() => { setReportMode('fabrication'); setActivePage('all'); }}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              reportMode === 'fabrication'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Fabrication Only</span>
          </button>
          <button
            onClick={() => { setReportMode('cost_breakup'); setActivePage('all'); }}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              reportMode === 'cost_breakup'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Cost Breakup Only</span>
          </button>
          <button
            onClick={() => { setReportMode('both'); setActivePage('all'); }}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              reportMode === 'both'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Pages (दोनों)</span>
          </button>
        </div>

        {/* Page Switcher & Print / Download Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Page Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold max-w-sm overflow-x-auto">
            <button
              onClick={() => setActivePage('all')}
              className={`px-3 py-1 rounded transition cursor-pointer shrink-0 ${
                activePage === 'all'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalPagesCount})
            </button>
            <button
              onClick={() => setActivePage('cover')}
              className={`px-3 py-1 rounded transition cursor-pointer shrink-0 ${
                activePage === 'cover'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cover
            </button>
            {productionReports.map((r, i) => (
              <button
                key={r.frameId}
                onClick={() => setActivePage(r.frameId)}
                className={`px-2.5 py-1 rounded transition cursor-pointer shrink-0 ${
                  activePage === r.frameId
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.designRef}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-bold text-slate-700 shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-black shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report (प्रिंट)</span>
          </button>
        </div>
      </div>

      {/* ----------------- REPORT CONTAINER (A4 Print layout) ----------------- */}
      <div ref={printRef} className="max-w-[960px] mx-auto p-2 sm:p-6 space-y-8">
        {/* ============================================================== */}
        {/* PAGE 1: PROJECT SUMMARY COVER PAGE                             */}
        {/* ============================================================== */}
        {(activePage === 'all' || activePage === 1 || activePage === 'cover') && (
          <div className="bg-white border border-slate-300 shadow-md p-6 sm:p-10 font-sans print:border-none print:shadow-none print:p-0 print:m-0 print:break-after-page min-h-[1050px] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Production Report
                </h1>
                <div className="text-xs font-semibold text-slate-800">
                  Date : {currentDateStr} {currentTimeStr} +05:30
                </div>
              </div>

              {/* Blue Accent Divider Line */}
              <div className="h-1 bg-[#1e40af] w-full mb-6"></div>

              {/* Summary Table 1: Projects Data */}
              <div className="mb-8">
                <div className="text-xs font-bold text-slate-700 mb-1.5">
                  Report includes the data from projects :
                </div>
                <table className="w-full text-left border-collapse border border-slate-400 text-xs">
                  <thead>
                    <tr className="bg-[#b9d9f9] text-slate-900 font-bold border-b border-slate-400">
                      <th className="p-2 border border-slate-400 w-16 text-center">Serial No.</th>
                      <th className="p-2 border border-slate-400">Project Name</th>
                      <th className="p-2 border border-slate-400">Project Code</th>
                      <th className="p-2 border border-slate-400">Quote External Code</th>
                      <th className="p-2 border border-slate-400 text-center w-16">Qty</th>
                      <th className="p-2 border border-slate-400 text-center w-24">Quote Alias</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-2 border border-slate-400 text-center font-bold">1</td>
                      <td className="p-2 border border-slate-400 font-bold text-slate-900">{projectName}</td>
                      <td className="p-2 border border-slate-400 font-mono">{projectCode}</td>
                      <td className="p-2 border border-slate-400 font-mono text-slate-500">-</td>
                      <td className="p-2 border border-slate-400 text-center font-bold">
                        {productionReports.reduce((sum, r) => sum + (r.quantity || 1), 0)}
                      </td>
                      <td className="p-2 border border-slate-400 text-center font-bold">A</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Table 2: Design Remarks */}
              <div className="mb-8">
                <div className="text-xs font-bold text-slate-700 mb-1.5">
                  Design Remarks :
                </div>
                <table className="w-full text-left border-collapse border border-slate-400 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                      <th className="p-2 border border-slate-400 w-28">Design Ref</th>
                      <th className="p-2 border border-slate-400 w-32">Remark Date</th>
                      <th className="p-2 border border-slate-400">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionReports.map((rep) => (
                      <tr key={rep.frameId} className="border-b border-slate-300">
                        <td className="p-2 border border-slate-400 font-bold text-slate-900">{rep.designRef}</td>
                        <td className="p-2 border border-slate-400">{currentDateStr}</td>
                        <td className="p-2 border border-slate-400 text-slate-700">
                          {rep.typologyType} ({rep.width}mm × {rep.height}mm) — Finish: {rep.profileFinish || 'WHITE'}, Glass: {rep.glassDescription || '5mm'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cover Page Footer */}
            <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600 font-medium">
              <div>{companyName}</div>
              <div>Page 1 of {totalPagesCount}</div>
              <div>{companyWebsite}</div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PAGES 2 to N: SINGLE FRAME PRODUCTION REPORT                   */}
        {/* ============================================================== */}
        {productionReports.map((report, idx) => {
          const isSelected = activePage === 'all' || activePage === report.frameId || activePage === (idx + 2);
          if (!isSelected) {
            return null;
          }

          const showFabrication = reportMode === 'both' || reportMode === 'fabrication';
          const showCostBreakup = reportMode === 'both' || reportMode === 'cost_breakup';

          let fabPageNum = idx + 2;
          let costPageNum = idx + 2;
          if (reportMode === 'both') {
            fabPageNum = 2 + (idx * 2);
            costPageNum = 3 + (idx * 2);
          }

          // Match design from customer project designs
          const matchingDesign = designs?.find(
            (d) => d.id === report.frameId || report.frameId?.startsWith(d.id) || d.tag === report.designRef
          );

          const designFrames = matchingDesign?.projectData?.frames && matchingDesign.projectData.frames.length > 0
            ? matchingDesign.projectData.frames
            : undefined;
          const designCouplings = matchingDesign?.projectData?.couplings && matchingDesign.projectData.couplings.length > 0
            ? matchingDesign.projectData.couplings
            : (couplings || []);

          const matchingFrame = frames.find((f) => f.id === report.frameId) || frames[idx];

          return (
            <React.Fragment key={report.frameId}>
              {/* PAGE A: FABRICATION CUTTING SCHEDULE */}
              {showFabrication && (
                <div
                  key={`${report.frameId}-fab`}
                  className="bg-white border border-slate-300 shadow-md p-6 sm:p-10 font-sans print:border-none print:shadow-none print:p-0 print:m-0 print:break-after-page min-h-[1050px] flex flex-col justify-between text-xs mb-8"
                >
                  <div>
                    {/* 1. Header */}
                    <div className="flex items-center justify-between mb-1">
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Production Report
                      </h1>
                      <div className="text-xs font-semibold text-slate-800">
                        Date : {currentDateStr} {currentTimeStr} +05:30
                      </div>
                    </div>

                    {/* Blue Line */}
                    <div className="h-1 bg-[#1e40af] w-full mb-3"></div>

                    {/* Project Bar */}
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-2">
                      <div>Project : {projectName}</div>
                      <div>Project Code : {projectCode}</div>
                    </div>

                {/* 2. Technicals & CAD Elevation Box */}
                <div className="border border-slate-400 grid grid-cols-1 md:grid-cols-2 mb-4">
                  {/* Left Side: 1. Technicals Specifications Grid */}
                  <div className="border-r border-slate-400 flex flex-row">
                    {/* Vertical "1. Technicals" Header Cell */}
                    <div className="w-8 bg-slate-50 border-r border-slate-400 flex items-center justify-center p-1">
                      <span className="font-bold text-slate-800 text-[11px] transform -rotate-90 whitespace-nowrap">
                        {idx + 1}. Technicals
                      </span>
                    </div>

                    {/* Specs key-value list */}
                    <table className="flex-1 text-[11px] border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 w-32 border-r border-slate-200">Design Ref</td>
                          <td className="p-1.5 font-extrabold text-slate-900">{report.designRef}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Dimension</td>
                          <td className="p-1.5 font-mono font-bold text-slate-900">
                            W = {report.width.toFixed(2)}; H = {report.height.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Quantity</td>
                          <td className="p-1.5 font-bold text-slate-900">{report.quantity || 1}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Typology type</td>
                          <td className="p-1.5 font-bold text-slate-900">{report.typologyType}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Brand</td>
                          <td className="p-1.5 font-semibold text-slate-800">{report.brand || 'DURONPOLYVINYLSPVTLTD'}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Series</td>
                          <td className="p-1.5 font-bold text-blue-900">{report.series || (report.typologyType.includes('SLIDING') ? 'DURON 60MM SLIDING SERIES' : 'DURON 60MM CASEMENT SERIES')}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Profile Finish</td>
                          <td className="p-1.5 font-semibold text-slate-800">{report.profileFinish || 'WHITE (VIRGIN UPVC)'}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Handle</td>
                          <td className="p-1.5 text-[10px] text-slate-800 whitespace-pre-line leading-tight">
                            {report.handleDescription || (report.typologyType.includes('FIXED') ? 'FIXED GLAZING (NO OPERABLE HARDWARE)' : 'NO OPERABLE HARDWARE')}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Shutter Weight (KG)</td>
                          <td className="p-1.5 font-mono text-[11px] text-slate-800">
                            {report.shutterWeightKg
                              ? `${report.shutterWeightKg.toFixed(3)} KG`
                              : 'N/A'}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Glass</td>
                          <td className="p-1.5 text-slate-800 font-semibold">{report.glassDescription || '5 MM CLEAR FLOAT GLASS'}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Mesh</td>
                          <td className="p-1.5 font-semibold text-slate-800">{report.mesh || 'NO MESH'}</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-bold text-slate-700 border-r border-slate-200">Area</td>
                          <td className="p-1.5 font-semibold text-slate-900">
                            {report.areaSqM?.toFixed(3) || '2.250'} Sqmt / {report.areaSqFt?.toFixed(3) || '24.219'} Sqft
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Right Side: CAD Elevation Drawing */}
                  <div className="flex items-center justify-center p-2">
                    <CadElevationView
                      report={report}
                      frame={matchingFrame}
                      frames={designFrames}
                      couplings={designCouplings}
                      designTag={matchingDesign?.tag || report.designRef}
                    />
                  </div>
                </div>

                {/* 3. The Master Fabrication Schedule Table (Exact Light Blue Header) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-400 text-[11px]">
                    <thead>
                      <tr className="bg-[#b9d9f9] text-slate-900 font-bold border-b border-slate-400">
                        <th className="p-1.5 border border-slate-400">Description</th>
                        <th className="p-1.5 border border-slate-400 w-36">Item Code</th>
                        <th className="p-1.5 border border-slate-400 text-center w-28">Dimension (mm)</th>
                        <th className="p-1.5 border border-slate-400 text-center w-24">Cut Angle</th>
                        <th className="p-1.5 border border-slate-400 text-center w-16">Qty</th>
                        <th className="p-1.5 border border-slate-400 text-center w-16">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* ----------------- FABRICATION: PROFILE SECTION ----------------- */}
                      {report.profiles.map((p, pIdx) => {
                        const isFirst = pIdx === 0;
                        const isDoubleRow = pIdx > 0 && p.description === report.profiles[pIdx - 1]?.description;

                        return (
                          <tr key={p.id} className="border-b border-slate-300">
                            {/* Far left vertical span cell: "Fabrication" */}
                            {isFirst && (
                              <td
                                rowSpan={
                                  report.profiles.length +
                                  report.reinforcements.length +
                                  report.hardwares.length +
                                  report.screws.length +
                                  report.gaskets.length +
                                  report.glazing.length
                                }
                                className="w-7 bg-slate-100 font-black text-slate-900 text-center border border-slate-400 p-1 select-none"
                              >
                                <span className="transform -rotate-90 block whitespace-nowrap text-xs">
                                  Fabrication
                                </span>
                              </td>
                            )}

                            {/* Sub-vertical span cell: "Profile" */}
                            {isFirst && (
                              <td
                                rowSpan={report.profiles.length}
                                className="w-6 bg-slate-50 font-bold text-slate-700 text-center border border-slate-400 p-1 select-none"
                              >
                                <span className="transform -rotate-90 block whitespace-nowrap text-[11px]">
                                  Profile
                                </span>
                              </td>
                            )}

                            <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                              {isDoubleRow ? '' : p.description}
                            </td>
                            <td className="p-1.5 border border-slate-300 font-mono text-slate-700">
                              {isDoubleRow ? '' : p.itemCode}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-900">
                              {p.dimension}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono text-slate-700">
                              {p.cutAngle}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-900">
                              {p.quantity} Pcs
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-600">
                              {p.position}
                            </td>
                          </tr>
                        );
                      })}

                      {/* ----------------- REINFORCEMENT SECTION ----------------- */}
                      {report.reinforcements.map((r, rIdx) => {
                        const isFirst = rIdx === 0;
                        const isDoubleRow = rIdx > 0 && r.description === report.reinforcements[rIdx - 1]?.description;

                        return (
                          <tr key={r.id} className="border-b border-slate-300">
                            {isFirst && (
                              <td
                                rowSpan={report.reinforcements.length}
                                className="w-6 bg-slate-50 font-bold text-slate-700 text-center border border-slate-400 p-1 select-none"
                              >
                                <span className="transform -rotate-90 block whitespace-nowrap text-[10px]">
                                  Reinforcement
                                </span>
                              </td>
                            )}
                            <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                              {isDoubleRow ? '' : r.description}
                            </td>
                            <td className="p-1.5 border border-slate-300 font-mono text-slate-700">
                              {isDoubleRow ? '' : r.itemCode}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-900">
                              {r.dimension}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono text-slate-700">
                              {r.cutAngle}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-900">
                              {r.quantity} Pcs
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-600">
                              {r.position}
                            </td>
                          </tr>
                        );
                      })}

                      {/* ----------------- FABRICATION HARDWARE SECTION ----------------- */}
                      {report.hardwares.map((h, hIdx) => {
                        const isFirst = hIdx === 0;
                        return (
                          <tr key={h.id} className="border-b border-slate-300">
                            {isFirst && (
                              <td
                                rowSpan={report.hardwares.length}
                                className="w-6 bg-slate-50 font-bold text-slate-700 text-center border border-slate-400 p-1 select-none"
                              >
                                <span className="transform -rotate-90 block whitespace-nowrap text-[10px]">
                                  Fabrication Hardware
                                </span>
                              </td>
                            )}
                            <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                              {h.description}
                            </td>
                            <td className="p-1.5 border border-slate-300 font-mono text-slate-700">
                              {h.itemCode}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center"></td>
                            <td className="p-1.5 border border-slate-300 text-center"></td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-900">
                              {h.quantity} Pcs
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-600">
                              {h.position || ''}
                            </td>
                          </tr>
                        );
                      })}

                      {/* ----------------- SCREWS SECTION ----------------- */}
                      {report.screws.map((s, sIdx) => {
                        const isFirst = sIdx === 0;
                        return (
                          <tr key={s.id} className="border-b border-slate-300">
                            {isFirst && (
                              <td
                                rowSpan={report.screws.length}
                                className="w-6 bg-slate-50 font-bold text-slate-700 text-center border border-slate-400 p-1 select-none"
                              >
                                <span className="transform -rotate-90 block whitespace-nowrap text-[10px]">
                                  Screws
                                </span>
                              </td>
                            )}
                            <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                              {s.description}
                            </td>
                            <td className="p-1.5 border border-slate-300 font-mono text-slate-700">
                              {s.itemCode}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center"></td>
                            <td className="p-1.5 border border-slate-300 text-center"></td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-900">
                              {s.quantity} Pcs
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center"></td>
                          </tr>
                        );
                      })}

                      {/* ----------------- GASKET AND WOOLPILE SECTION ----------------- */}
                      {report.gaskets.map((g, gIdx) => {
                        const isFirst = gIdx === 0;
                        const isDoubleRow = gIdx > 0 && g.description === report.gaskets[gIdx - 1]?.description;

                        return (
                          <tr key={g.id} className="border-b border-slate-300">
                            {isFirst && (
                              <td
                                rowSpan={report.gaskets.length}
                                className="w-6 bg-slate-50 font-bold text-slate-700 text-center border border-slate-400 p-1 select-none"
                              >
                                <span className="transform -rotate-90 block whitespace-nowrap text-[10px]">
                                  Gasket and Woolpile
                                </span>
                              </td>
                            )}
                            <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                              {isDoubleRow ? '' : g.description}
                            </td>
                            <td className="p-1.5 border border-slate-300 font-mono text-slate-700">
                              {isDoubleRow ? '' : g.itemCode}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-900">
                              {g.dimension ? `${g.dimension}.000` : ''}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center"></td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-900">
                              {g.quantity} Pcs
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-600">
                              {g.position || ''}
                            </td>
                          </tr>
                        );
                      })}

                      {/* ----------------- GLAZING SECTION ----------------- */}
                      {report.glazing.map((gl, glIdx) => {
                        const isFirst = glIdx === 0;
                        return (
                          <tr key={gl.id} className="border-b border-slate-300">
                            {isFirst && (
                              <td
                                rowSpan={report.glazing.length}
                                className="w-6 bg-slate-50 font-bold text-slate-700 text-center border border-slate-400 p-1 select-none"
                              >
                                <span className="transform -rotate-90 block whitespace-nowrap text-[10px]">
                                  Glazing
                                </span>
                              </td>
                            )}
                            <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                              {glIdx === 0 ? gl.description : ''}
                            </td>
                            <td className="p-1.5 border border-slate-300 font-mono text-slate-700">
                              {glIdx === 0 ? (gl.itemCode || gl.description) : ''}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-900">
                              {gl.width} X {gl.height}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center"></td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-900">
                              {gl.quantity} Pcs
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-600">
                              {glIdx + 1}
                            </td>
                          </tr>
                        );
                      })}

                      {/* ----------------- INSTALLATION SECTION ----------------- */}
                      {report.installation.map((ins, insIdx) => {
                        const isFirst = insIdx === 0;
                        return (
                          <tr key={ins.id} className="border-b border-slate-300">
                            {isFirst && (
                              <td
                                rowSpan={report.installation.length}
                                className="w-7 bg-slate-100 font-black text-slate-900 text-center border border-slate-400 p-1 select-none"
                              >
                                <span className="transform -rotate-90 block whitespace-nowrap text-xs">
                                  Installation
                                </span>
                              </td>
                            )}
                            {isFirst && (
                              <td
                                rowSpan={report.installation.length}
                                className="w-6 bg-slate-50 font-bold text-slate-700 text-center border border-slate-400 p-1 select-none"
                              >
                                <span className="transform -rotate-90 block whitespace-nowrap text-[10px]">
                                  Installation Hardware
                                </span>
                              </td>
                            )}
                            <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                              {ins.description}
                            </td>
                            <td className="p-1.5 border border-slate-300 font-mono text-slate-700">
                              {ins.itemCode}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-900">
                              {typeof ins.quantity === 'string' && ins.quantity.includes('CAN')
                                ? ins.quantity.replace(' CAN', '')
                                : ''}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center"></td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-900">
                              {typeof ins.quantity === 'string' && ins.quantity.includes('CAN')
                                ? '1 CAN'
                                : `${ins.quantity} Pcs`}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center"></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Page Footer */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <div>{companyName}</div>
                <div>Page {fabPageNum} of {totalPagesCount}</div>
                <div>{companyWebsite}</div>
              </div>
            </div>
          )}

          {/* PAGE B: COST BREAKUP REPORT */}
          {showCostBreakup && (
            <div
              key={`${report.frameId}-cost`}
              className="bg-white border border-slate-300 shadow-md p-6 sm:p-10 font-sans print:border-none print:shadow-none print:p-0 print:m-0 print:break-after-page min-h-[1050px] flex flex-col justify-between text-xs mb-8"
            >
              <div>
                {/* 1. Header */}
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Cost Breakup Report
                  </h1>
                  <div className="text-xs font-semibold text-slate-800">
                    Date : {currentDateStr} {currentTimeStr} +05:30
                  </div>
                </div>

                {/* Blue Line */}
                <div className="h-1 bg-[#1e40af] w-full mb-3"></div>

                {/* Project Bar */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-2">
                  <div>Project : {projectName}</div>
                  <div>Project Code : {projectCode}</div>
                </div>

                {/* Unit Specs Header Bar */}
                <div className="bg-[#e8f1fa] border border-[#a2c5ea] rounded-xs p-2.5 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Design Ref</span>
                    <span className="font-extrabold text-blue-900 text-sm">{report.designRef}</span>
                    <span className="text-[11px] text-slate-600 block truncate">{report.typologyType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Size & Quantity</span>
                    <span className="font-extrabold text-slate-900">{report.width} X {report.height} mm</span>
                    <span className="text-[11px] text-slate-600 block">Quantity: {report.quantity} Pcs</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Area</span>
                    <span className="font-extrabold text-slate-900">{report.areaSqM?.toFixed(3)} Sqmt</span>
                    <span className="text-[11px] text-slate-600 block">{report.areaSqFt?.toFixed(3)} Sqft</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Series & Finish</span>
                    <span className="font-extrabold text-slate-900 text-[11px] truncate block">{report.series}</span>
                    <span className="text-[10px] text-slate-600 block truncate">{report.profileFinish}</span>
                  </div>
                </div>

                {/* Master Cost Breakup Table */}
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left border-collapse border border-slate-400 text-[11px]">
                    <thead>
                      <tr className="bg-[#b9d9f9] text-slate-900 font-bold border-b border-slate-400">
                        <th className="p-1.5 border border-slate-400 w-28">Category</th>
                        <th className="p-1.5 border border-slate-400">Description</th>
                        <th className="p-1.5 border border-slate-400 w-36 font-mono">Item Code</th>
                        <th className="p-1.5 border border-slate-400 text-right w-20">Qty</th>
                        <th className="p-1.5 border border-slate-400 text-center w-16">Unit</th>
                        <th className="p-1.5 border border-slate-400 text-right w-20">Rate (₹)</th>
                        <th className="p-1.5 border border-slate-400 text-right w-24">Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['Profile', 'Reinforcement', 'Fabrication Hardware', 'Screws', 'Installation Hardware', 'Gasket and Woolpile', 'Glazing'] as const).map((cat) => {
                        const catRows = (report.costBreakupRows || []).filter((r) => r.category === cat);
                        if (catRows.length === 0) return null;
                        const catTotal = catRows.reduce((sum, r) => sum + r.cost, 0);

                        return (
                          <React.Fragment key={cat}>
                            {catRows.map((r, rIdx) => (
                              <tr key={r.id} className="border-b border-slate-300 hover:bg-slate-50/50">
                                {rIdx === 0 && (
                                  <td
                                    rowSpan={catRows.length}
                                    className="p-1.5 border border-slate-400 font-bold bg-slate-50 text-slate-800 align-top"
                                  >
                                    {cat}
                                  </td>
                                )}
                                <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                                  {r.description}
                                </td>
                                <td className="p-1.5 border border-slate-300 font-mono text-slate-700 text-[10px]">
                                  {r.itemCode}
                                </td>
                                <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-900">
                                  {r.qty.toFixed(r.unit === 'Pcs' || r.unit === 'Set' ? 0 : 3)}
                                </td>
                                <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-600">
                                  {r.unit}
                                </td>
                                <td className="p-1.5 border border-slate-300 text-right font-mono text-slate-700">
                                  {r.rate.toFixed(2)}
                                </td>
                                <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-900">
                                  {r.cost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-slate-100 font-bold border-b-2 border-slate-400">
                              <td colSpan={6} className="p-1.5 border border-slate-400 text-right font-bold text-slate-800">
                                {cat} Total:
                              </td>
                              <td className="p-1.5 border border-slate-400 text-right font-mono font-extrabold text-blue-900">
                                ₹{catTotal.toFixed(2)}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Cost Summary Table */}
                {report.costSummary && (
                  <div className="w-full max-w-md ml-auto border border-slate-400 shadow-xs mb-4">
                    <div className="bg-[#b9d9f9] text-slate-900 font-bold p-1.5 border-b border-slate-400 text-xs text-center uppercase tracking-wider">
                      Cost Summary
                    </div>
                    <table className="w-full text-left border-collapse text-[11px]">
                      <tbody>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Profile Cost</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.profileCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Profile Wastage ({report.costSummary.profileWastagePercent.toFixed(2)} %)</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.profileWastageCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">RI Cost</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.riCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">RI Wastage ({report.costSummary.riWastagePercent.toFixed(2)} %)</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.riWastageCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Hardware Cost</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.hardwareCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Glass Cost</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.glassCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Glass Wastage ({report.costSummary.glassWastagePercent.toFixed(2)} %)</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.glassWastageCost.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-slate-100 border-b-2 border-slate-400 font-bold">
                          <td className="p-1.5 text-slate-900">Total Raw Material Cost</td>
                          <td className="p-1.5 text-right font-mono font-extrabold text-slate-900">₹{report.costSummary.totalRawMaterialCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Fabrication Labour ({report.costSummary.fabricationLabourRate.toFixed(4)})</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.fabricationLabourCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Installation Labour ({report.costSummary.installationLabourRate.toFixed(4)})</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.installationLabourCost.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-slate-100 border-b-2 border-slate-400 font-bold">
                          <td className="p-1.5 text-slate-900">Sub Total Including Labour</td>
                          <td className="p-1.5 text-right font-mono font-extrabold text-slate-900">₹{report.costSummary.subTotalIncludingLabour.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Profit ({report.costSummary.profitPercent.toFixed(2)} %)</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.profitCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Extra Cost</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.extraCost.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-slate-100 border-b-2 border-slate-400 font-bold">
                          <td className="p-1.5 text-slate-900">Basic Value</td>
                          <td className="p-1.5 text-right font-mono font-extrabold text-slate-900">₹{report.costSummary.basicValue.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Discount ({report.costSummary.discountPercent.toFixed(2)} %)</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.discountAmount.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-slate-100 border-b-2 border-slate-400 font-bold">
                          <td className="p-1.5 text-slate-900">Sub Total</td>
                          <td className="p-1.5 text-right font-mono font-extrabold text-slate-900">₹{report.costSummary.subTotal.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">Transportation Cost</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.transportationCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <span>Loading And Unloading</span>
                            </div>
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.loadingUnloadingCost.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-blue-50 border-b-2 border-blue-400 font-bold">
                          <td className="p-1.5 text-blue-900">Total Project Cost</td>
                          <td className="p-1.5 text-right font-mono font-extrabold text-blue-900">₹{report.costSummary.totalProjectCost.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-1.5 font-semibold text-slate-700">GST ({report.costSummary.gstPercent.toFixed(2)} %)</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">₹{report.costSummary.gstAmount.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-blue-700 text-white font-extrabold text-xs">
                          <td className="p-2">Grand Total</td>
                          <td className="p-2 text-right font-mono text-sm">₹{report.costSummary.grandTotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Page Footer */}
              <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <div>{companyName}</div>
                <div>Page {costPageNum} of {totalPagesCount}</div>
                <div>{companyWebsite}</div>
              </div>
            </div>
          )}
        </React.Fragment>
      );
    })}
      </div>
    </div>
  );
};
