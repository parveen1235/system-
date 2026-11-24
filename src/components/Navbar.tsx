import React from 'react';
import {
  Save,
  RotateCcw,
  RotateCw,
  Pencil,
  Box,
  Scissors,
  FileSpreadsheet,
  Sparkles,
  ChevronDown,
  FolderOpen,
  LayoutDashboard,
  Download,
  Printer,
  Image,
  FileCode,
  FileJson,
  Sliders,
  Receipt,
  Bot,
} from 'lucide-react';
import { UPVCProject } from '../types/upvc';
import {
  downloadCadSvg,
  downloadCadPng,
  downloadCadDxf,
  downloadCuttingListCsv,
  downloadCostBreakupCsv,
  downloadQuotationCsv,
  downloadProjectJson,
} from '../utils/exportUtils';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  project: UPVCProject;
  onUpdateProjectName: (name: string) => void;
  onUpdateRefNo: (ref: string) => void;
  onUpdateLocation: (loc: string) => void;
  onLoadTemplate: (templateId: string) => void;
  onNewDesign1000: () => void;
  onOpenSavedProjects: () => void;
  onResetProject: () => void;
  onOpenGuide: () => void;
  onOpen3D: () => void;
  onOpenCuttingList: () => void;
  onOpenQuotation: () => void;
  onOpenExportDrawing?: (initialMode?: 'cad' | 'cost_breakup' | 'both') => void;
  onOpenSlidingGallery?: () => void;
  lang: 'hi' | 'en';
  setLang: (lang: 'hi' | 'en') => void;
  onSaveProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAutoAlignCoupledAssembly?: () => void;
  onBackToHome?: () => void;
  onBackToCustomerProject?: () => void;
  customerName?: string;
  onOpenPaperScanBot?: () => void;
  onLoad4PanelFSSF?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  onUpdateProjectName,
  onUpdateRefNo,
  onUpdateLocation,
  onLoadTemplate,
  onNewDesign1000,
  onOpenSavedProjects,
  onResetProject,
  onOpenGuide,
  onOpen3D,
  onOpenCuttingList,
  onOpenQuotation,
  onOpenExportDrawing,
  onOpenSlidingGallery,
  lang,
  setLang,
  onSaveProject,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAutoAlignCoupledAssembly,
  onBackToHome,
  onBackToCustomerProject,
  customerName,
  onOpenPaperScanBot,
  onLoad4PanelFSSF,
}) => {
  const [showDownloadMenu, setShowDownloadMenu] = React.useState(false);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30 shadow-xs">
      {/* ------------------------------------------------------------- */}
      {/* LEFT HEADER: Dashboard Back button, Customer Project button, Design ref, Qty, Location */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2.5 text-xs">
        {/* Back to Customer Project Hub */}
        {onBackToCustomerProject ? (
          <button
            onClick={onBackToCustomerProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
            title="Return to Customer Designs Hub (ग्राहक के प्रोजेक्ट पर वापस जाएँ)"
          >
            <span>← {customerName ? `${customerName} Project` : 'Customer Hub'}</span>
          </button>
        ) : onBackToHome ? (
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition"
            title="Return to ERP Dashboard (डैशबोर्ड पर जाएँ)"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
            <span>ERP Home</span>
          </button>
        ) : null}

        {/* Dedicated 4-Panel Fix-Slide-Slide-Fix with Center Lock Button */}
        {onLoad4PanelFSSF && (
          <div className="border-l border-slate-200 pl-3">
            <button
              onClick={onLoad4PanelFSSF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold transition text-xs shadow-xs cursor-pointer"
              title="4-पैनल विंडो तुरंत खोलें: साइड वाले फिक्स + बीच वाले 2 स्लाइड + बीच में लॉक"
            >
              <span className="text-[13px]">🔒</span>
              <span>4-पैनल [ FIX | S1→ 🔒 ←S2 | FIX ]</span>
            </button>
          </div>
        )}

        {/* Design ref */}
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold border-l border-slate-200 pl-3">
          <Pencil className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-500">Ref:</span>
          <input
            type="text"
            value={project.referenceNo || 'UPVC-2026-001'}
            onChange={(e) => onUpdateRefNo(e.target.value)}
            className="w-24 px-1.5 py-0.5 border border-slate-300 rounded font-medium text-slate-900 focus:outline-none focus:border-blue-500 bg-slate-50 hover:bg-white"
            placeholder="Ref No..."
          />
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold border-l border-slate-200 pl-3 hidden md:flex">
          <span className="text-slate-500">Location:</span>
          <input
            type="text"
            value={project.clientName || 'Balcony / Bedroom'}
            onChange={(e) => onUpdateLocation(e.target.value)}
            className="w-32 px-1.5 py-0.5 border border-slate-300 rounded font-medium text-slate-900 focus:outline-none focus:border-blue-500 bg-slate-50 hover:bg-white"
            placeholder="Location..."
          />
        </div>

        {/* Sliding Models Catalog Quick Button */}
        {onOpenSlidingGallery && (
          <div className="border-l border-slate-200 pl-3 hidden lg:block">
            <button
              onClick={onOpenSlidingGallery}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold transition text-xs shadow-2xs"
              title="18 Sliding Models Catalog (स्लाइडिंग मॉडल्स W1..W18)"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Sliding Models</span>
              <span className="text-[9px] bg-blue-600 text-white px-1 rounded-full font-mono">18</span>
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT ACTIONS: Save Button, Undo, Redo, 3D/Cutting, Reset */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition ${
              canUndo ? 'text-slate-700 hover:bg-white' : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Undo (पूर्ववत करें)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition ${
              canRedo ? 'text-slate-700 hover:bg-white' : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Auto-Align Multi-Frame Assembly Button */}
        {project.frames.length > 1 && onAutoAlignCoupledAssembly && (
          <button
            onClick={onAutoAlignCoupledAssembly}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Auto-Align Multi-Frame Assembly & Fix 2mm Gaps (सभी फ्रेम और 2mm कप्लिंग जोड़ ठीक करें)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Align 2mm</span>
          </button>
        )}

        {/* AI Paper-to-CAD Scanner Bot Button */}
        {onOpenPaperScanBot && (
          <button
            onClick={onOpenPaperScanBot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer relative"
            title="कागज़ का पर्चा या स्केच स्कैन कर CAD बनाएं (Zero-Token AI Paper Scanner Bot)"
          >
            <Bot className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">कागज़ स्कैन (AI Bot)</span>
            <span className="sm:hidden">Scan</span>
            <span className="px-1 py-0.2 rounded bg-emerald-400 text-slate-950 text-[9px] font-black leading-none">
              0 Token
            </span>
          </button>
        )}

        {/* Cutting List & Factory BOM Button */}
        <button
          onClick={onOpenCuttingList}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          title="Open Factory Cutting List & Material BOM (कटिंग लिस्ट व निर्माण सूची खोलें)"
        >
          <Scissors className="w-3.5 h-3.5 text-white" />
          <span>{lang === 'hi' ? 'कटिंग लिस्ट (Cutting List)' : 'Cutting List (कटिंग)'}</span>
        </button>

        {/* Quotation Table Modal Button */}
        <button
          onClick={onOpenQuotation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          title="Open Quotation Table & Estimate (कोटेशन टेबल खोलें)"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Quotation (कोटेशन)</span>
        </button>

        {/* Blue SAVE Button */}
        <button
          onClick={onSaveProject}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          title="Save Design to Project (प्रोजेक्ट सेव करें)"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        {/* Android Mobile App (PWA) Button */}
        <PWAInstallButton variant="navbar" />

        {/* Export & Download Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Download & Export CAD, Images, PDF, Cutting Sheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
            <ChevronDown className="w-3 h-3 text-emerald-200" />
          </button>

          {showDownloadMenu && (
            <div className="absolute top-full right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 text-slate-800">
              <div className="text-[10px] font-black text-slate-400 px-2.5 py-1 uppercase tracking-wider">
                Download & Export Options
              </div>

              {onOpenExportDrawing && (
                <>
                  <button
                    onClick={() => {
                      onOpenExportDrawing('cad');
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-blue-700 transition text-xs font-bold flex items-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    <div>
                      <div>Architectural Print Sheet (PDF)</div>
                      <div className="text-[10px] text-slate-400 font-normal">A4/A3 drawing with ISO title block</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenExportDrawing('cost_breakup');
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-800 transition text-xs font-bold flex items-center gap-2"
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                    <div>
                      <div className="flex items-center gap-1">
                        <span>Cost Breakup Report (PDF / Print)</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-extrabold">NEW</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">विस्तृत लागत विवरण, हार्डवेयर व सारांश शीट</div>
                    </div>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  downloadCadSvg(project);
                  setShowDownloadMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-800 transition text-xs font-semibold flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <div>
                  <div className="font-bold">CAD Vector SVG (.svg)</div>
                  <div className="text-[10px] text-slate-400">Scale drawing with dimension callouts</div>
                </div>
              </button>

              <button
                onClick={() => {
                  downloadCadPng(project);
                  setShowDownloadMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 text-slate-800 transition text-xs font-semibold flex items-center gap-2"
              >
                <Image className="w-3.5 h-3.5 text-indigo-600" />
                <div>
                  <div className="font-bold">High-Res PNG Image (.png)</div>
                  <div className="text-[10px] text-slate-400">Crisp image for client sharing</div>
                </div>
              </button>

              <button
                onClick={() => {
                  downloadCadDxf(project);
                  setShowDownloadMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-slate-800 transition text-xs font-semibold flex items-center gap-2"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-600" />
                <div>
                  <div className="font-bold">AutoCAD / CNC DXF (.dxf)</div>
                  <div className="text-[10px] text-slate-400">Machine cutting & CAD import format</div>
                </div>
              </button>

              <button
                onClick={() => {
                  downloadCuttingListCsv(project);
                  setShowDownloadMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 transition text-xs font-semibold flex items-center gap-2"
              >
                <Scissors className="w-3.5 h-3.5 text-slate-600" />
                <div>
                  <div className="font-bold">Cutting List CSV (.csv)</div>
                  <div className="text-[10px] text-slate-400">Excel profile saw lengths & angles</div>
                </div>
              </button>

              <button
                onClick={() => {
                  downloadCostBreakupCsv(project);
                  setShowDownloadMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-teal-50 text-slate-800 transition text-xs font-semibold flex items-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                <div>
                  <div className="font-bold text-teal-900">Cost Breakup CSV (.csv)</div>
                  <div className="text-[10px] text-slate-400">आइटम कोड, दर व कुल लागत एक्सेल शीट</div>
                </div>
              </button>

              <button
                onClick={() => {
                  downloadQuotationCsv(project);
                  setShowDownloadMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-slate-800 transition text-xs font-semibold flex items-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <div>
                  <div className="font-bold">Quotation BOM CSV (.csv)</div>
                  <div className="text-[10px] text-slate-400">Commercial costing with GST</div>
                </div>
              </button>

              <button
                onClick={() => {
                  downloadProjectJson(project);
                  setShowDownloadMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 transition text-xs font-semibold flex items-center gap-2 border-t border-slate-100 mt-1"
              >
                <FileJson className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <div className="font-bold">Project Backup JSON (.json)</div>
                  <div className="text-[10px] text-slate-400">Complete raw project definition</div>
                </div>
              </button>

            </div>
          )}
        </div>
      </div>
    </header>
  );
};
