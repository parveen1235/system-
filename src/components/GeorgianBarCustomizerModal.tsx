import React, { useState } from 'react';
import { Grid, Check, X, Sparkles, Palette, ShieldCheck } from 'lucide-react';
import { GeorgianBarConfig, GeorgianBarColor, GeorgianBarStyle, GridPattern } from '../types/upvc';

export interface GeorgianBarPromptData {
  frameId: string;
  pocketId?: string | null;
  initialPattern?: GridPattern;
  initialColor?: GeorgianBarColor;
  initialCols?: number;
  initialRows?: number;
  initialBarWidth?: number;
  initialStyle?: GeorgianBarStyle;
}

interface GeorgianBarCustomizerModalProps {
  isOpen: boolean;
  data: GeorgianBarPromptData | null;
  lang?: 'en' | 'hi';
  onConfirm: (config: GeorgianBarConfig, scope: 'pocket' | 'frame') => void;
  onClose: () => void;
}

export const GeorgianBarCustomizerModal: React.FC<GeorgianBarCustomizerModalProps> = ({
  isOpen,
  data,
  lang = 'hi',
  onConfirm,
  onClose,
}) => {
  const [pattern, setPattern] = useState<GridPattern>('custom');
  const [cols, setCols] = useState<number>(data?.initialCols || 2);
  const [rows, setRows] = useState<number>(data?.initialRows || 2);
  const [color, setColor] = useState<GeorgianBarColor>(data?.initialColor || 'gold');
  const [barWidth, setBarWidth] = useState<number>(data?.initialBarWidth || 18);
  const [style, setStyle] = useState<GeorgianBarStyle>(data?.initialStyle || 'internal');
  const [scope, setScope] = useState<'pocket' | 'frame'>('pocket');

  // Sync state whenever data opens
  React.useEffect(() => {
    if (data && isOpen) {
      const p = data.initialPattern || 'custom';
      setPattern(p);
      setCols(data.initialCols || (p === 'georgian_3x3' ? 3 : p === 'georgian_3x2' ? 3 : 2));
      setRows(data.initialRows || (p === 'georgian_3x3' ? 3 : p === 'georgian_2x3' ? 3 : 2));
      setColor(data.initialColor || 'gold');
      setBarWidth(data.initialBarWidth || 18);
      setStyle(data.initialStyle || 'internal');
      setScope(data.pocketId ? 'pocket' : 'frame');
    }
  }, [data, isOpen]);

  // Handle ESC / ENTER
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter') handleApply();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pattern, cols, rows, color, barWidth, style, scope]);

  if (!isOpen || !data) return null;

  const handleApply = () => {
    // Resolve final pattern
    let resolvedPattern: GridPattern = pattern;
    if (pattern === 'custom' || !pattern) {
      if (cols === 2 && rows === 2) resolvedPattern = 'georgian_2x2';
      else if (cols === 2 && rows === 3) resolvedPattern = 'georgian_2x3';
      else if (cols === 3 && rows === 2) resolvedPattern = 'georgian_3x2';
      else if (cols === 3 && rows === 3) resolvedPattern = 'georgian_3x3';
      else resolvedPattern = 'custom';
    }

    const finalConfig: GeorgianBarConfig = {
      enabled: true,
      pattern: resolvedPattern,
      cols: Math.max(1, cols),
      rows: Math.max(1, rows),
      color,
      barWidth,
      style,
    };
    onConfirm(finalConfig, scope);
  };

  const COLOR_OPTIONS: { id: GeorgianBarColor; name: string; nameHindi: string; swatch: string; border?: string }[] = [
    {
      id: 'gold',
      name: 'Gold Brass (गोल्डन ब्रास)',
      nameHindi: 'गोल्डन ब्रास (शाही फिनिश)',
      swatch: 'from-amber-400 via-yellow-300 to-amber-600',
    },
    {
      id: 'white',
      name: 'Pure White (सफेद)',
      nameHindi: 'क्लासिक व्हाइट (सफेद ग्रिड)',
      swatch: 'from-white via-slate-100 to-slate-200',
      border: 'border-slate-300',
    },
    {
      id: 'black',
      name: 'Matt Black (ब्लैक)',
      nameHindi: 'मैट जेट ब्लैक (मॉडर्न ब्लैक)',
      swatch: 'from-zinc-950 via-zinc-800 to-zinc-900',
      border: 'border-zinc-700',
    },
    {
      id: 'silver',
      name: 'Silver Aluminium (सिल्वर)',
      nameHindi: 'एल्यूमीनियम सिल्वर',
      swatch: 'from-slate-200 via-slate-100 to-slate-400',
      border: 'border-slate-300',
    },
    {
      id: 'bronze',
      name: 'Architectural Bronze (ब्रॉन्ज)',
      nameHindi: 'रॉयल ब्रॉन्ज / कॉपर',
      swatch: 'from-amber-900 via-amber-800 to-amber-950',
    },
    {
      id: 'match_frame',
      name: 'Match Frame (फ्रेम कलर)',
      nameHindi: 'खिड़की फ्रेम जैसा रंग',
      swatch: 'from-blue-600 via-indigo-600 to-slate-800',
    },
  ];

  return (
    <div
      id="georgian-bar-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="georgian-bar-customizer-dialog"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide flex items-center gap-2 text-white">
                {lang === 'hi'
                  ? 'डोरगन बार ग्रिड डिज़ाइनर (Georgian Bar)'
                  : 'Georgian Bar Grid Customizer'}
                <span className="text-[10px] bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full font-mono border border-amber-300/30">
                  काँच की डिज़ाइन
                </span>
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                {lang === 'hi'
                  ? 'वर्टिकल व हॉरिजॉन्टल बार संख्या और रंग चुनें'
                  : 'Configure vertical & horizontal grid bars and finish'}
              </p>
            </div>
          </div>
          <button
            id="close-georgian-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* 1. Scope: Pocket or Entire Frame */}
          {data.pocketId && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {lang === 'hi' ? 'ग्रिड कहाँ लगाना है (Target Bay):' : 'Application Scope:'}
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setScope('pocket')}
                  className={`py-2 px-3 text-xs font-black rounded-lg transition ${
                    scope === 'pocket'
                      ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'hi' ? '🎯 सिर्फ इस खाने / ग्लास में' : '🎯 This Glass Pane Only'}
                </button>
                <button
                  type="button"
                  onClick={() => setScope('frame')}
                  className={`py-2 px-3 text-xs font-black rounded-lg transition ${
                    scope === 'frame'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'hi' ? '🪟 पूरे फ्रेम के सभी ग्लास में' : '🪟 All Panes in Frame'}
                </button>
              </div>
            </div>
          )}

          {/* 2. Visual Pattern Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {lang === 'hi' ? 'डिज़ाइन मॉडल (Grid Pattern):' : 'Select Pattern:'}
              </label>
              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {pattern.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'georgian_2x2', label: '2 × 2', sub: '1V + 1H', c: 2, r: 2 },
                { id: 'georgian_2x3', label: '2 × 3', sub: '1V + 2H', c: 2, r: 3 },
                { id: 'georgian_3x2', label: '3 × 2', sub: '2V + 1H', c: 3, r: 2 },
                { id: 'georgian_3x3', label: '3 × 3', sub: '2V + 2H', c: 3, r: 3 },
                { id: 'georgian_3x4', label: '3 × 4', sub: '2V + 3H', c: 3, r: 4 },
                { id: 'georgian_prairie', label: 'Colonial', sub: 'Border', c: 2, r: 2 },
                { id: 'georgian_diamond', label: 'Diamond', sub: 'Lattice', c: 2, r: 2 },
                { id: 'custom', label: 'Custom', sub: 'Manual', c: cols, r: rows },
              ].map((patt) => {
                const isSel = pattern === patt.id;
                return (
                  <button
                    key={patt.id}
                    type="button"
                    onClick={() => {
                      setPattern(patt.id as GridPattern);
                      if (patt.id !== 'custom') {
                        setCols(patt.c);
                        setRows(patt.r);
                      }
                    }}
                    className={`py-2.5 px-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      isSel
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm ring-2 ring-amber-500/20 font-black'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-black">{patt.label}</span>
                    <span className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">
                      {patt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Number of Columns (Vertical Bars) & Rows (Horizontal Bars) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                {lang === 'hi' ? 'खाने व सलाखें (Vertical & Horizontal Bars)' : 'Vertical & Horizontal Quantities'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {cols * rows} Total Panes ({cols - 1} V-Bar, {rows - 1} H-Bar)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Vertical Bars / Columns */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  {lang === 'hi' ? 'खड़ा विभाजन (Vertical Columns):' : 'Vertical Columns:'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCols((prev) => Math.max(1, prev - 1));
                      setPattern('custom');
                    }}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-black text-slate-700 text-base"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center py-1.5 bg-white border border-amber-300 rounded-lg shadow-inner">
                    <span className="text-base font-black text-amber-700">{cols}</span>
                    <span className="text-[9px] text-slate-400 block -mt-1 font-semibold">
                      {cols - 1} {cols - 1 === 1 ? 'खड़ा बार' : 'खड़े बार'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCols((prev) => Math.min(8, prev + 1));
                      setPattern('custom');
                    }}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-black text-slate-700 text-base"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Horizontal Bars / Rows */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  {lang === 'hi' ? 'आड़ा विभाजन (Horizontal Rows):' : 'Horizontal Rows:'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRows((prev) => Math.max(1, prev - 1));
                      setPattern('custom');
                    }}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-black text-slate-700 text-base"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center py-1.5 bg-white border border-amber-300 rounded-lg shadow-inner">
                    <span className="text-base font-black text-amber-700">{rows}</span>
                    <span className="text-[9px] text-slate-400 block -mt-1 font-semibold">
                      {rows - 1} {rows - 1 === 1 ? 'आड़ा बार' : 'आड़े बार'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRows((prev) => Math.min(8, prev + 1));
                      setPattern('custom');
                    }}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-black text-slate-700 text-base"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Georgian Bar Color / Finish */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              {lang === 'hi' ? 'ग्रिड बार का रंग (Bar Color / Finish):' : 'Select Bar Finish / Color:'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isSel = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-3 ${
                      isSel
                        ? 'bg-amber-50/80 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-gradient-to-tr shadow-md shrink-0 ${c.swatch} ${
                        c.border || ''
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {lang === 'hi' ? c.nameHindi : c.name}
                      </div>
                      <div className="text-[9.5px] text-slate-400 truncate capitalize">{c.id}</div>
                    </div>
                    {isSel && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Bar Width (mm) & Style (Internal vs Surface) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Bar Width */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {lang === 'hi' ? 'बार की चौड़ाई (Face Width):' : 'Profile Face Width:'}
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[18, 25, 45].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setBarWidth(w)}
                    className={`py-1.5 text-xs font-black rounded-lg border transition ${
                      barWidth === w
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {w} mm
                  </button>
                ))}
              </div>
            </div>

            {/* Mounting Style */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {lang === 'hi' ? 'माउंटिंग प्रकार (Mounting):' : 'Mounting Style:'}
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setStyle('internal')}
                  className={`py-1.5 px-1 text-[10.5px] font-bold rounded-lg border transition text-center truncate ${
                    style === 'internal'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                  title="Internal DGU Grid (धूल रहित)"
                >
                  Internal (DGU)
                </button>
                <button
                  type="button"
                  onClick={() => setStyle('surface_astragal')}
                  className={`py-1.5 px-1 text-[10.5px] font-bold rounded-lg border transition text-center truncate ${
                    style === 'surface_astragal'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                  title="Surface Astragal Bar (काँच पर चिपका हुआ)"
                >
                  Surface Bar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            {lang === 'hi' ? 'रद्द करें (Cancel)' : 'Cancel'}
          </button>
          <button
            id="apply-georgian-bar-btn"
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 px-5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold text-sm rounded-xl shadow-md shadow-amber-600/30 transition flex items-center justify-center gap-2 active:scale-98"
          >
            <Check className="w-4 h-4" />
            {lang === 'hi'
              ? scope === 'frame'
                ? `पूरे फ्रेम पर लागू करें (${cols} × ${rows})`
                : `काँच पर लागू करें (${cols} × ${rows})`
              : scope === 'frame'
              ? `Apply to All Frame Panes (${cols} × ${rows})`
              : `Apply Georgian Bar (${cols} × ${rows})`}
          </button>
        </div>
      </div>
    </div>
  );
};
