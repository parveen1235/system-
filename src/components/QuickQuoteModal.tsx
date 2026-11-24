import React, { useState } from 'react';
import { X, Calculator, Plus, ArrowRight, CheckCircle2, Layers } from 'lucide-react';
import { evaluateDimensionMath, getLiveMathPreview } from '../utils/dimensionMath';

interface QuickQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInCAD: (width: number, height: number, type: string) => void;
}

export const QuickQuoteModal: React.FC<QuickQuoteModalProps> = ({ isOpen, onClose, onOpenInCAD }) => {
  const [widthInput, setWidthInput] = useState<string>('1200');
  const [heightInput, setHeightInput] = useState<string>('1500');
  const [windowType, setWindowType] = useState<'2track' | '3track' | 'casement' | 'fixed'>('casement');
  const [glassType, setGlassType] = useState<'5mm_toughened' | 'dgu_argon' | '6mm_clear'>('5mm_toughened');
  const [ratePerSqFt, setRatePerSqFt] = useState<number>(550);
  const [qty, setQty] = useState<number>(1);

  if (!isOpen) return null;

  const widthPreview = getLiveMathPreview(widthInput);
  const heightPreview = getLiveMathPreview(heightInput);

  const width = widthPreview.calculated ?? (parseFloat(widthInput) || 1200);
  const height = heightPreview.calculated ?? (parseFloat(heightInput) || 1500);

  const sqMm = width * height;
  const sqM = sqMm / 1_000_000;
  const sqFt = sqM * 10.7639;
  const totalSqFt = sqFt * qty;
  const estimatedCost = totalSqFt * ratePerSqFt;
  const gst = estimatedCost * 0.18;
  const finalTotal = estimatedCost + gst;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Quick Quote (त्वरित कोटेशन)</h2>
              <p className="text-xs text-slate-500 font-medium">Instant Sq.Ft & Rate Estimator</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Dimension Inputs with Math Calculation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Width (mm / Math)</label>
              <input
                type="text"
                value={widthInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9\.\+\-\*\/\(\)\s'"xXftin]/gi, '');
                  setWidthInput(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const evaluated = evaluateDimensionMath(widthInput);
                    if (evaluated !== null && evaluated > 0) setWidthInput(String(evaluated));
                  }
                }}
                onBlur={() => {
                  const evaluated = evaluateDimensionMath(widthInput);
                  if (evaluated !== null && evaluated > 0) setWidthInput(String(evaluated));
                }}
                placeholder="1200 या 1200+50 या 4ft"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {widthPreview.isExpression && widthPreview.calculated !== null && (
                <div className="text-[10px] text-emerald-700 font-bold mt-1">
                  = {widthPreview.calculated} mm
                </div>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Height (mm / Math)</label>
              <input
                type="text"
                value={heightInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9\.\+\-\*\/\(\)\s'"xXftin]/gi, '');
                  setHeightInput(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const evaluated = evaluateDimensionMath(heightInput);
                    if (evaluated !== null && evaluated > 0) setHeightInput(String(evaluated));
                  }
                }}
                onBlur={() => {
                  const evaluated = evaluateDimensionMath(heightInput);
                  if (evaluated !== null && evaluated > 0) setHeightInput(String(evaluated));
                }}
                placeholder="1500 या 1500-100 या 5ft"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {heightPreview.isExpression && heightPreview.calculated !== null && (
                <div className="text-[10px] text-emerald-700 font-bold mt-1">
                  = {heightPreview.calculated} mm
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Window System</label>
              <select
                value={windowType}
                onChange={(e) => setWindowType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="casement">2-Panel Casement Openable</option>
                <option value="2track">2-Track Sliding Window</option>
                <option value="3track">3-Track Slider + Mesh</option>
                <option value="fixed">Fixed Picture Frame</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Glass Spec</label>
              <select
                value={glassType}
                onChange={(e) => setGlassType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="5mm_toughened">5mm Clear Toughened</option>
                <option value="dgu_argon">5+12A+5 Acoustic DGU</option>
                <option value="6mm_clear">6mm Clear Annealed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Rate per Sq.Ft (₹)</label>
              <input
                type="number"
                value={ratePerSqFt}
                onChange={(e) => setRatePerSqFt(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Quantity (Pcs)</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Real-time Calculation Result */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Unit Area:</span>
              <span className="font-mono font-bold text-white">{sqFt.toFixed(2)} Sq.Ft ({sqM.toFixed(2)} m²)</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Area ({qty} Units):</span>
              <span className="font-mono font-bold text-white">{totalSqFt.toFixed(2)} Sq.Ft</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300 border-t border-slate-800 pt-2">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-white">₹{Math.round(estimatedCost).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>GST (18%):</span>
              <span className="font-mono font-bold text-white">₹{Math.round(gst).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-blue-400 border-t border-slate-700 pt-2">
              <span>Grand Total Estimated:</span>
              <span className="font-mono text-base font-black text-blue-300">₹{Math.round(finalTotal).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenInCAD(width, height, windowType);
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>Draw in 2D CAD Canvas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
