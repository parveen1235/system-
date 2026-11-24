import React, { useState } from 'react';
import { UPVCProject } from '../types/upvc';
import { calculateAssemblyBounds, DEFAULT_COLORS, generateProductionReports } from '../utils/upvcCalculations';
import { HardwareHandle } from './HardwareHandle';
import { calculateHandlePlacement, shouldShowSlidingHandle } from '../utils/handlePlacement';
import { CadElevationDrawing } from './CadElevationDrawing';
import {
  Printer,
  Download,
  ArrowLeft,
  Image,
  FileCode,
  Scissors,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  Receipt,
  FileText,
  Layers,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  downloadCadSvg,
  downloadCadPng,
  copyCadPngToClipboard,
  downloadCadDxf,
  downloadCuttingListCsv,
  downloadCostBreakupCsv,
  downloadProjectJson,
} from '../utils/exportUtils';
import { downloadQuotationExcelWithCad } from '../utils/excelExportUtils';

interface ExportDrawingProps {
  project: UPVCProject;
  onBack: () => void;
  lang: 'hi' | 'en';
  initialTab?: 'cad' | 'cost_breakup' | 'both';
}

export const ExportDrawingModal: React.FC<ExportDrawingProps> = ({ project, onBack, lang, initialTab }) => {
  const bounds = calculateAssemblyBounds(project.frames);
  const [exportTab, setExportTab] = useState<'cad' | 'cost_breakup' | 'both'>(initialTab || 'cad');
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [excelLegibilityMode, setExcelLegibilityMode] = useState(true);
  const [selectedFrameId, setSelectedFrameId] = useState<string>('all');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloadingUltraPng, setIsDownloadingUltraPng] = useState(false);

  const activePreviewFrames =
    selectedFrameId === 'all'
      ? project.frames || []
      : (project.frames || []).filter((f) => f.id === selectedFrameId);

  const activePreviewCouplings =
    selectedFrameId === 'all' ? project.couplings || [] : [];

  const handleCopyForExcel = async () => {
    try {
      const success = await copyCadPngToClipboard(project, {
        excelLegibilityMode,
        frameId: selectedFrameId === 'all' ? undefined : selectedFrameId,
      });
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      } else {
        await downloadCadPng(project, undefined, {
          excelLegibilityMode,
          frameId: selectedFrameId === 'all' ? undefined : selectedFrameId,
        });
      }
    } catch {
      await downloadCadPng(project, undefined, {
        excelLegibilityMode,
        frameId: selectedFrameId === 'all' ? undefined : selectedFrameId,
      });
    }
  };

  const handleDownloadUltraHdPng = async () => {
    setIsDownloadingUltraPng(true);
    try {
      await downloadCadPng(project, undefined, {
        excelLegibilityMode,
        frameId: selectedFrameId === 'all' ? undefined : selectedFrameId,
      });
    } finally {
      setIsDownloadingUltraPng(false);
    }
  };

  const productionReports = generateProductionReports(
    project.frames || [],
    project.couplings || [],
    {
      name: project.name,
      referenceNo: project.referenceNo,
      clientName: project.clientName,
      date: project.date,
    }
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      await downloadQuotationExcelWithCad({
        project,
        clientName: project.clientName || 'Client',
        refNo: project.referenceNo || 'UPVC-CAD-01',
      });
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const getColorHex = (colorId: string) => {
    return DEFAULT_COLORS.find((c) => c.id === colorId) || DEFAULT_COLORS[0];
  };

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col overflow-hidden text-slate-200">
      {/* Top Action Bar */}
      <div className="min-h-16 bg-slate-950 border-b border-slate-800 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to CAD (वापस)</span>
          </button>
          <div>
            <span className="text-xs font-bold text-slate-200 block">
              {lang === 'hi' ? 'आर्किटेक्चरल प्रिंट एवं डाउनलोड शीट' : 'Architectural CAD Technical Sheet & Downloads'}
            </span>
            <span className="text-[11px] text-slate-400">
              {project.name} • {bounds.totalWidth} × {bounds.totalHeight} mm
            </span>
          </div>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5 text-xs font-bold">
          <button
            onClick={() => setExportTab('cad')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              exportTab === 'cad'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'सीएडी शीट' : 'CAD Sheet'}</span>
          </button>
          <button
            onClick={() => setExportTab('cost_breakup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              exportTab === 'cost_breakup'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'लागत ब्रेकअप' : 'Cost Breakup'}</span>
          </button>
          <button
            onClick={() => setExportTab('both')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              exportTab === 'both'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'दोनों शीट (All)' : 'Both (All)'}</span>
          </button>
        </div>

        {/* Action Download Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Download SVG */}
          <button
            onClick={() => downloadCadSvg(project)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Download Vector CAD SVG file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download SVG (CAD)</span>
          </button>

          {/* Copy Ultra-HD Image for Excel */}
          <button
            onClick={handleCopyForExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Copy 3600px Ultra-HD CAD Image directly to clipboard. Paste (Ctrl+V) directly into Excel!"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied! (Ctrl+V)</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-300" />
                <span>Copy for Excel</span>
              </>
            )}
          </button>

          {/* Download PNG (Ultra-HD 3600px) */}
          <button
            onClick={handleDownloadUltraHdPng}
            disabled={isDownloadingUltraPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Download Ultra-HD PNG Image (300 DPI / 3600px) for Excel or printing"
          >
            {isDownloadingUltraPng ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Image className="w-3.5 h-3.5" />
            )}
            <span>Ultra-HD PNG (300 DPI)</span>
          </button>

          {/* Download DXF */}
          <button
            onClick={() => downloadCadDxf(project)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Download CNC / AutoCAD DXF Data"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Download DXF (AutoCAD)</span>
          </button>

          {/* Download CAD Excel (.xlsx) with embedded drawings */}
          <button
            onClick={handleDownloadExcel}
            disabled={isGeneratingExcel}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md transition cursor-pointer ${
              isGeneratingExcel
                ? 'bg-teal-800 text-white opacity-80 cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 ring-2 ring-emerald-400/40'
            }`}
            title="Download CAD Elevation Drawings in Excel (.xlsx) with cutting list & BOM"
          >
            {isGeneratingExcel ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            )}
            <span>{isGeneratingExcel ? 'Creating Excel...' : 'CAD Excel (.xlsx)'}</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={() => downloadCuttingListCsv(project)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
            title="Download Profile Cutting Schedule CSV"
          >
            <Scissors className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cutting CSV</span>
          </button>

          {/* Download Cost Breakup CSV */}
          <button
            onClick={() => downloadCostBreakupCsv(project)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Download Detailed Cost Breakup CSV (विस्तृत लागत एवं हार्डवेयर विवरण)"
          >
            <Receipt className="w-3.5 h-3.5 text-teal-200" />
            <span>Cost CSV</span>
          </button>

          {/* Print / Save PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF (Ctrl + P)</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Canvas */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 bg-slate-900">
        {/* CAD Technical Specification Sheet */}
        {(exportTab === 'cad' || exportTab === 'both') && (
          <div
            id="printable-sheet"
            className="w-full max-w-4xl bg-white text-black p-8 rounded-xl shadow-2xl border border-slate-300 flex flex-col justify-between min-h-[950px] space-y-6 print:shadow-none print:border-none print:p-0 print:m-0 print:break-after-page"
          >
          {/* Sheet Header */}
          <div className="border-b-2 border-black pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-black uppercase">
                uPVC Window & Door CAD Specification
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                {project.name} | Ref: {project.referenceNo || 'UPVC-2026'}
              </p>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-black">{project.clientName || 'Standard Client'}</div>
              <div className="text-slate-500">Date: {project.date || new Date().toISOString().split('T')[0]}</div>
            </div>
          </div>

          {/* Excel Legibility & Target Frame Selector Bar (No-Print) */}
          <div className="no-print bg-slate-100 border border-slate-300 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Target Elevation:</span>
              <select
                value={selectedFrameId}
                onChange={(e) => setSelectedFrameId(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-800 font-semibold cursor-pointer shadow-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">
                  Full Assembly ({bounds.totalWidth} × {bounds.totalHeight} mm)
                </option>
                {(project.frames || []).map((f, i) => (
                  <option key={f.id} value={f.id}>
                    Frame {i + 1} ({Math.round(f.width)} × {Math.round(f.height)} mm)
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 cursor-pointer ml-2 select-none bg-white border border-slate-300 px-2.5 py-1 rounded-md shadow-xs">
                <input
                  type="checkbox"
                  checked={excelLegibilityMode}
                  onChange={(e) => setExcelLegibilityMode(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-bold text-slate-800">
                  {lang === 'hi' ? 'एक्सेल साइज टेक्स्ट (Large Bold)' : 'Excel Legibility Mode (Large Bold Text)'}
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyForExcel}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-bold shadow-xs transition cursor-pointer"
                title="Copy Ultra-HD (3600px) CAD Image directly to clipboard. Press Ctrl + V in Excel!"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied! (Ctrl+V)</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-300" />
                    <span>Copy for Excel (Ctrl+C)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadUltraHdPng}
                disabled={isDownloadingUltraPng}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-xs transition cursor-pointer"
                title="Download 3600px Ultra-HD PNG at 300 DPI for Crystal Clear Zoom in Excel"
              >
                {isDownloadingUltraPng ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>Ultra-HD PNG (300 DPI)</span>
              </button>
            </div>
          </div>

          {/* Center CAD Drawing Elevation */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 border border-slate-300 rounded-lg bg-white relative min-h-[460px]">
            <CadElevationDrawing
              frames={activePreviewFrames}
              couplings={activePreviewCouplings}
              showDimensions={true}
              showLabels={false}
              showHandles={true}
              showArrows={true}
              excelLegibilityMode={excelLegibilityMode}
              allowEnlarge={false}
              className="w-full max-h-[520px] border-none shadow-none"
            />
          </div>

          {/* Technical ISO Title Block */}
          <div className="border-2 border-black grid grid-cols-4 divide-x-2 divide-black text-[11px] font-sans">
            <div className="p-2.5">
              <span className="font-bold text-slate-500 block uppercase text-[9px]">Project Name</span>
              <div className="font-bold text-black text-xs">{project.name}</div>
            </div>
            <div className="p-2.5">
              <span className="font-bold text-slate-500 block uppercase text-[9px]">Total Dimensions</span>
              <div className="font-bold font-mono text-black">
                {bounds.totalWidth} mm (W) × {bounds.totalHeight} mm (H)
              </div>
            </div>
            <div className="p-2.5">
              <span className="font-bold text-slate-500 block uppercase text-[9px]">Configuration</span>
              <div className="font-bold text-black">
                {project.frames.length} Frame(s) | {project.couplings.length} Coupler(s)
              </div>
            </div>
            <div className="p-2.5 bg-slate-100">
              <span className="font-bold text-slate-500 block uppercase text-[9px]">Approval / Stamp</span>
              <div className="text-[10px] text-slate-600 mt-2">Fabricator Signature: ____________</div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Breakup Report Sheet(s) */}
      {(exportTab === 'cost_breakup' || exportTab === 'both') && (
        <>
          {productionReports.map((rep, repIdx) => {
            const matchingFrame = (project.frames || []).find((f) => f.id === rep.frameId) || project.frames[repIdx] || project.frames[0];
            const categories = ['Profile', 'Reinforcement', 'Fabrication Hardware', 'Screws', 'Installation Hardware', 'Gasket and Woolpile', 'Glazing'];

            return (
              <div
                key={`cost-report-sheet-${rep.frameId || repIdx}`}
                id={`printable-cost-sheet-${rep.frameId || repIdx}`}
                className="w-full max-w-4xl bg-white text-black p-8 rounded-xl shadow-2xl border border-slate-300 flex flex-col justify-between min-h-[1050px] space-y-6 print:shadow-none print:border-none print:p-0 print:m-0 print:break-after-page"
              >
                {/* Header */}
                <div className="border-b-2 border-black pb-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-emerald-700 no-print" />
                      <h1 className="text-xl font-black tracking-tight text-black uppercase">
                        COST BREAKUP REPORT
                      </h1>
                      <span className="text-xs font-semibold text-slate-500 font-sans">
                        (विस्तृत लागत एवं हार्डवेयर विवरण)
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">
                      Project: <span className="font-bold text-black">{project.name}</span> • Ref No: <span className="font-mono font-bold text-black">{project.referenceNo || 'UPVC-2026'}</span>
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-black">Client: {project.clientName || 'Standard Client'}</div>
                    <div className="text-slate-500 font-mono">Date: {project.date || new Date().toLocaleDateString('en-IN')}</div>
                  </div>
                </div>

                {/* Unit Specifications & CAD Elevation View */}
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <div className="col-span-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-black text-white font-black text-xs rounded">
                        {rep.designRef}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{rep.typologyType}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                      <div>
                        <span className="text-slate-500 font-medium">Dimensions: </span>
                        <span className="font-mono font-bold text-black">{rep.width} × {rep.height} mm</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Quantity: </span>
                        <span className="font-bold text-black">{rep.quantity} Pcs</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Total Area: </span>
                        <span className="font-mono font-bold text-black">{rep.areaSqM?.toFixed(3)} m² ({rep.areaSqFt?.toFixed(3)} ft²)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Series & Finish: </span>
                        <span className="font-semibold text-black">{rep.series} • {rep.profileFinish}</span>
                      </div>
                    </div>
                  </div>
                  {matchingFrame && (
                    <div className="flex justify-center items-center bg-white p-1 rounded border border-slate-200">
                      <CadElevationDrawing
                        frames={[matchingFrame]}
                        couplings={[]}
                        width={180}
                        height={120}
                        showDimensions={true}
                        showLabels={false}
                        showHandles={true}
                        showArrows={true}
                        allowEnlarge={false}
                        className="border-none shadow-none"
                      />
                    </div>
                  )}
                </div>

                {/* Master Cost Breakup Table */}
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-200 text-slate-900 font-bold uppercase text-[10px] tracking-wider border-b border-slate-400">
                        <th className="p-2 border border-slate-300">Category</th>
                        <th className="p-2 border border-slate-300">Description</th>
                        <th className="p-2 border border-slate-300">Item Code</th>
                        <th className="p-2 border border-slate-300 text-right">Qty</th>
                        <th className="p-2 border border-slate-300 text-center">Unit</th>
                        <th className="p-2 border border-slate-300 text-right">Rate (₹)</th>
                        <th className="p-2 border border-slate-300 text-right">Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {categories.map((cat) => {
                        const items = (rep.costBreakupRows || []).filter((r) => r.category === cat);
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
                                <td className="p-1.5 border border-slate-300 font-medium text-slate-900">{row.description}</td>
                                <td className="p-1.5 border border-slate-300 font-mono text-slate-700">{row.itemCode}</td>
                                <td className="p-1.5 border border-slate-300 text-right font-mono">
                                  {row.qty.toFixed(row.unit === 'Pcs' || row.unit === 'Set' ? 0 : 3)}
                                </td>
                                <td className="p-1.5 border border-slate-300 text-center text-slate-600 font-medium">{row.unit}</td>
                                <td className="p-1.5 border border-slate-300 text-right font-mono text-slate-700">₹{row.rate.toFixed(2)}</td>
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
                {rep.costSummary && (
                  <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                    <div className="bg-slate-200 px-3 py-1 font-black text-black uppercase tracking-wider text-[11px] border-b border-slate-300 flex justify-between">
                      <span>COST SUMMARY (लागत सारांश)</span>
                      <span className="font-mono">PROJECT VALUE BREAKUP</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-300">
                      <div className="p-2.5 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Profile Cost (Wastage {rep.costSummary.profileWastagePercent.toFixed(2)}%):</span>
                          <span className="font-mono font-bold">₹{(rep.costSummary.profileCost + rep.costSummary.profileWastageCost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Reinforcement Cost (Wastage {rep.costSummary.riWastagePercent.toFixed(2)}%):</span>
                          <span className="font-mono font-bold">₹{(rep.costSummary.riCost + rep.costSummary.riWastageCost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Hardware & Fittings Cost:</span>
                          <span className="font-mono font-bold">₹{rep.costSummary.hardwareCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Glass Cost (Wastage {rep.costSummary.glassWastagePercent.toFixed(2)}%):</span>
                          <span className="font-mono font-bold">₹{(rep.costSummary.glassCost + rep.costSummary.glassWastageCost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                          <span>Total Raw Material Cost:</span>
                          <span className="font-mono">₹{rep.costSummary.totalRawMaterialCost.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="p-2.5 space-y-1 text-[11px] bg-slate-50/50">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Fabrication Labour:</span>
                          <span className="font-mono font-bold">₹{rep.costSummary.fabricationLabourCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Installation Labour:</span>
                          <span className="font-mono font-bold">₹{rep.costSummary.installationLabourCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Profit ({rep.costSummary.profitPercent.toFixed(2)}%):</span>
                          <span className="font-mono font-bold">₹{rep.costSummary.profitCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-black font-extrabold pt-1 border-t border-slate-300 text-xs bg-emerald-50 p-1 rounded">
                          <span>GRAND TOTAL (Incl. GST {rep.costSummary.gstPercent}%):</span>
                          <span className="font-mono text-emerald-800">₹{rep.costSummary.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Technical Approval Block */}
                <div className="border-2 border-black grid grid-cols-3 divide-x-2 divide-black text-[11px] font-sans">
                  <div className="p-2">
                    <span className="font-bold text-slate-500 uppercase text-[9px] block">Prepared By</span>
                    <div className="text-black font-bold mt-1">uPVC Cost & CAD Engine</div>
                  </div>
                  <div className="p-2">
                    <span className="font-bold text-slate-500 uppercase text-[9px] block">Verified By (Factory Manager)</span>
                    <div className="text-black font-bold mt-1">______________________</div>
                  </div>
                  <div className="p-2 bg-slate-100">
                    <span className="font-bold text-slate-500 uppercase text-[9px] block">Authorized Signature & Stamp</span>
                    <div className="text-black font-bold mt-1">Date: ______________</div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
      </div>
    </div>
  );
};
