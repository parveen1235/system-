import React from 'react';
import {
  CheckCircle2,
  X,
  ArrowLeft,
  Scissors,
  Calculator,
  Box,
  Layers,
  Sparkles,
  Check,
  FolderOpen,
} from 'lucide-react';
import { UPVCProject } from '../types/upvc';
import { calculateAssemblyBounds } from '../utils/upvcCalculations';

interface SaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: UPVCProject;
  customerName?: string;
  customerPhone?: string;
  onBackToCustomer?: () => void;
  onOpenCuttingList?: () => void;
  onOpenQuotation?: () => void;
  lang?: 'hi' | 'en';
}

export const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({
  isOpen,
  onClose,
  project,
  customerName,
  customerPhone,
  onBackToCustomer,
  onOpenCuttingList,
  onOpenQuotation,
  lang = 'hi',
}) => {
  if (!isOpen) return null;

  const bounds = calculateAssemblyBounds(project.frames || []);
  const totalW = bounds.totalWidth || project.frames[0]?.width || 1000;
  const totalH = bounds.totalHeight || project.frames[0]?.height || 1000;
  const frameCount = project.frames?.length || 1;
  const totalAreaSqM = ((totalW * totalH) / 1000000).toFixed(2);
  const totalAreaSqFt = (((totalW * totalH) / 1000000) * 10.7639).toFixed(2);

  // Approximate cost
  const ratePerSqFt = 450;
  const estCost = Math.round(Number(totalAreaSqFt) * ratePerSqFt + (frameCount > 1 ? 2500 : 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with Green Accent */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {lang === 'hi' ? 'डिज़ाइन सफलतापूर्वक सुरक्षित हो गया!' : 'Design Saved Successfully!'}
              </h3>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                {customerName ? `${customerName} • ${project.referenceNo || project.name}` : project.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Card specs summary */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {lang === 'hi' ? 'डिज़ाइन विवरण (Specs)' : 'Design Specifications'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase">
                {project.referenceNo || 'W1'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] font-bold block uppercase">
                  {lang === 'hi' ? 'कुल साइज (Dimensions):' : 'Total Dimensions:'}
                </span>
                <span className="text-sm font-black text-slate-900 font-mono">
                  {totalW} × {totalH} mm
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] font-bold block uppercase">
                  {lang === 'hi' ? 'क्षेत्रफल (Total Area):' : 'Total Area:'}
                </span>
                <span className="text-sm font-black text-slate-900">
                  {totalAreaSqFt} sq.ft <span className="text-[11px] font-normal text-slate-500">({totalAreaSqM} m²)</span>
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] font-bold block uppercase">
                  {lang === 'hi' ? 'फ्रेम एवं प्रोफ़ाइल:' : 'Frames & Series:'}
                </span>
                <span className="font-bold text-slate-800">
                  {frameCount} Frame ({project.frames[0]?.series || 'Casement 60'})
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] font-bold block uppercase">
                  {lang === 'hi' ? 'अनुमानित मूल्य:' : 'Estimated Cost:'}
                </span>
                <span className="text-sm font-black text-emerald-600">
                  ₹{estCost.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-blue-50/70 border border-blue-200/60 p-3 rounded-xl">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {lang === 'hi'
                ? 'यह डिज़ाइन आपके ग्राहक प्रोजेक्ट व लाइब्रेरी में सुरक्षित हो चुका है।'
                : 'This design has been permanently saved to the customer project & library.'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {onBackToCustomer && (
              <button
                onClick={() => {
                  onClose();
                  onBackToCustomer();
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>
                  {lang === 'hi'
                    ? `← ${customerName ? `${customerName} के` : ''} प्रोजेक्ट में वापस जाएँ (View Saved Cards)`
                    : '← Back to Customer Project Hub'}
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {onOpenCuttingList && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCuttingList();
                  }}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'hi' ? 'कटिंग लिस्ट' : 'Cutting List'}</span>
                </button>
              )}

              {onOpenQuotation && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenQuotation();
                  }}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'hi' ? 'कोटेशन / BOM' : 'Quotation'}</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === 'hi' ? 'CAD में काम जारी रखें (Stay in CAD)' : 'Continue Editing in CAD'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
