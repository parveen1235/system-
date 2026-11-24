import React, { useState, useEffect } from 'react';
import { Columns, Rows, X, Check, Calculator, Sparkles } from 'lucide-react';

interface MultipleMullionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orientation: 'vertical' | 'horizontal';
  frameId: string;
  pocketId?: string | null;
  frameWidth: number;
  frameHeight: number;
  pocketWidth?: number;
  pocketHeight?: number;
  frameProfileWidth?: number;
  mullionProfileWidth?: number;
  onConfirm: (count: number, orientation: 'vertical' | 'horizontal', frameId: string, pocketId?: string | null) => void;
  lang?: 'en' | 'hi';
}

export const MultipleMullionsModal: React.FC<MultipleMullionsModalProps> = ({
  isOpen,
  onClose,
  orientation,
  frameId,
  pocketId,
  frameWidth,
  frameHeight,
  pocketWidth,
  pocketHeight,
  frameProfileWidth = 60,
  mullionProfileWidth = 74,
  onConfirm,
  lang = 'hi',
}) => {
  const [count, setCount] = useState<number>(2);
  const [scope, setScope] = useState<'frame' | 'pocket'>('frame');

  // Reset count and scope whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCount(2);
      setScope('frame');
    }
  }, [isOpen, orientation, pocketId]);

  // Handle keyboard shortcuts (Enter to submit, Esc to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, count, orientation, frameId, pocketId, scope]);

  if (!isOpen) return null;

  const isVertical = orientation === 'vertical';
  const totalBays = count + 1;
  const isPocketScope = scope === 'pocket' && !!pocketId;
  const outerSpan = isPocketScope && pocketWidth && pocketHeight
    ? (isVertical ? pocketWidth : pocketHeight)
    : (isVertical ? frameWidth : frameHeight);

  // Exact CAD dimension per bay (center-to-center / boundary)
  const cadBayDimension = Math.round(outerSpan / totalBays);

  // Clear daylight glass opening
  const innerOpening = isPocketScope && pocketWidth && pocketHeight
    ? Math.max(20, outerSpan - count * mullionProfileWidth)
    : Math.max(20, outerSpan - 2 * frameProfileWidth - count * mullionProfileWidth);
  const daylightOpening = Math.round(innerOpening / totalBays);

  const handleSubmit = () => {
    const validCount = Math.max(1, Math.min(12, count || 2));
    const targetPocketId = isPocketScope ? pocketId : null;
    onConfirm(validCount, orientation, frameId, targetPocketId);
    onClose();
  };

  return (
    <div
      id="multiple-mullions-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="multiple-mullions-modal-dialog"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              {isVertical ? <Columns className="w-5 h-5" /> : <Rows className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                {isVertical
                  ? lang === 'hi'
                    ? 'मल्टीपल खड़ा मुलियन (Vertical Mullions)'
                    : 'Add Multiple Vertical Mullions'
                  : lang === 'hi'
                  ? 'मल्टीपल आड़ा ट्रांसॉम (Horizontal Transoms)'
                  : 'Add Multiple Horizontal Transoms'}
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                {isPocketScope
                  ? lang === 'hi'
                    ? `चुने हुए हिस्से में (${pocketWidth} × ${pocketHeight} mm)`
                    : `Inside selected section (${pocketWidth} × ${pocketHeight} mm)`
                  : lang === 'hi'
                  ? `पूरे फ्रेम में (${frameWidth} × ${frameHeight} mm)`
                  : `Across entire frame (${frameWidth} × ${frameHeight} mm)`}
              </p>
            </div>
          </div>
          <button
            id="close-multi-mullion-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Selector if pocket is present */}
        {pocketId && (
          <div className="px-6 pt-4 pb-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {lang === 'hi' ? 'कहाँ लगाना है (Mullion Scope):' : 'Application Scope:'}
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setScope('frame')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition text-center ${
                  scope === 'frame'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {lang === 'hi' ? `पूरे फ्रेम में (${frameWidth}×${frameHeight})` : `Entire Window (${frameWidth}×${frameHeight})`}
              </button>
              <button
                type="button"
                onClick={() => setScope('pocket')}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition text-center ${
                  scope === 'pocket'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {lang === 'hi' ? `केवल इस हिस्से में (${pocketWidth}×${pocketHeight})` : `Selected Bay Only`}
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Question Prompt */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              {isVertical
                ? lang === 'hi'
                  ? 'कितने खड़ा मुलियन (Vertical Mullions) डालने हैं?'
                  : 'How many vertical mullions do you want to add?'
                : lang === 'hi'
                ? 'कितने आड़ा ट्रांसॉम (Horizontal Transoms) डालने हैं?'
                : 'How many horizontal transoms do you want to add?'}
            </label>
            <p className="text-xs text-slate-500">
              {lang === 'hi'
                ? 'संख्या चुनें — सभी खाने (Bays) अपने आप एक समान चौड़ाई/ऊंचाई में बंट जाएंगे।'
                : 'Choose quantity — all bays will automatically be divided into equal glass sizes.'}
            </p>
          </div>

          {/* Stepper + Input */}
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              id="multi-mullion-minus-btn"
              type="button"
              onClick={() => setCount((prev) => Math.max(1, prev - 1))}
              disabled={count <= 1}
              className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold text-slate-700 transition"
            >
              −
            </button>

            <div className="relative">
              <input
                id="multi-mullion-count-input"
                type="number"
                min={1}
                max={12}
                value={count}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setCount(Math.max(1, Math.min(12, val)));
                }}
                className="w-24 h-14 text-center text-3xl font-extrabold text-blue-600 bg-blue-50/50 border-2 border-blue-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-400 font-mono shadow-inner"
                autoFocus
              />
              <span className="block text-[10px] text-center font-bold text-slate-500 mt-1 uppercase tracking-wider">
                {isVertical ? (lang === 'hi' ? 'खड़ा मुलियन' : 'Mullions') : (lang === 'hi' ? 'आड़ा ट्रांसॉम' : 'Transoms')}
              </span>
            </div>

            <button
              id="multi-mullion-plus-btn"
              type="button"
              onClick={() => setCount((prev) => Math.min(12, prev + 1))}
              disabled={count >= 12}
              className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold text-slate-700 transition"
            >
              +
            </button>
          </div>

          {/* Quick preset selector buttons */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              {lang === 'hi' ? 'त्वरित संख्या चुनें (Quick Select):' : 'Quick Presets:'}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  id={`multi-mullion-preset-${num}`}
                  type="button"
                  onClick={() => setCount(num)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition text-center ${
                    count === num
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30 ring-2 ring-blue-400/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {num} {isVertical ? 'V' : 'H'}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Bay Calculation Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700 font-bold">
              <span className="flex items-center gap-1.5 text-blue-600">
                <Calculator className="w-4 h-4" />
                <span>{lang === 'hi' ? 'सटीक गणना (Live Calculation):' : 'Live CAD Calculation:'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px]">
                {count} {isVertical ? (lang === 'hi' ? 'खड़ा मुलियन' : 'Mullions') : (lang === 'hi' ? 'आड़ा ट्रांसॉम' : 'Transoms')} = {totalBays} {lang === 'hi' ? 'बराबर हिस्से' : 'Equal Bays'}
              </span>
            </div>

            <div className="text-slate-700 pt-1 flex justify-between items-center border-t border-slate-200">
              <span className="font-semibold">
                {isVertical
                  ? lang === 'hi' ? 'CAD खाना चौड़ाई (Center Dimension):' : 'CAD Bay Width (Centerline):'
                  : lang === 'hi' ? 'CAD खाना ऊँचाई (Center Dimension):' : 'CAD Bay Height (Centerline):'}
              </span>
              <span className="font-mono font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-sm">
                {cadBayDimension} mm
              </span>
            </div>

            <div className="text-slate-500 flex justify-between items-center">
              <span>{lang === 'hi' ? 'अंदरूनी क्लियर ग्लास माप:' : 'Clear Glass Daylight Opening:'}</span>
              <span className="font-mono font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                ~{daylightOpening} mm
              </span>
            </div>

            <div className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              {lang === 'hi'
                ? `✓ सभी ${totalBays} खाने बिल्कुल बराबर-बराबर (${cadBayDimension} mm) में बंटेंगे।`
                : `✓ All ${totalBays} bays will be divided into exact equal segments of ${cadBayDimension} mm.`}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            id="multi-mullion-cancel-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
          >
            {lang === 'hi' ? 'रद्द करें (Cancel)' : 'Cancel'}
          </button>
          <button
            id="multi-mullion-confirm-btn"
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>
              {lang === 'hi'
                ? `${count} ${isVertical ? 'खड़ा मुलियन' : 'आड़ा ट्रांसॉम'} जोड़ें`
                : `Insert ${count} ${isVertical ? 'Vertical' : 'Horizontal'} Mullions`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
