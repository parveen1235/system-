import React, { useState, useEffect } from 'react';
import { Fan, Check, X, ArrowLeft, ArrowRight, CircleDot } from 'lucide-react';

export interface FanPositionConfig {
  frameId: string;
  pocketId?: string;
  diameter: number;
  fanPanelType: 'glass_hole' | 'pvc_sheet' | 'louver_hole';
  position: 'left' | 'center' | 'right';
}

interface FanPositionModalProps {
  isOpen: boolean;
  initialConfig: FanPositionConfig | null;
  lang?: 'en' | 'hi';
  onConfirm: (config: FanPositionConfig) => void;
  onCancel: () => void;
}

export const FanPositionModal: React.FC<FanPositionModalProps> = ({
  isOpen,
  initialConfig,
  lang = 'hi',
  onConfirm,
  onCancel,
}) => {
  const [position, setPosition] = useState<'left' | 'center' | 'right'>('center');
  const [diameter, setDiameter] = useState<number>(200);
  const [panelType, setPanelType] = useState<'glass_hole' | 'pvc_sheet' | 'louver_hole'>('glass_hole');

  useEffect(() => {
    if (initialConfig) {
      setPosition(initialConfig.position || 'center');
      setDiameter(initialConfig.diameter || 200);
      setPanelType(initialConfig.fanPanelType || 'glass_hole');
    }
  }, [initialConfig, isOpen]);

  // Keyboard accessibility (L = Left, C = Center, R = Right, Enter = Confirm, Esc = Cancel)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        handleApply();
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowLeft') {
        setPosition('left');
      } else if (e.key === 'c' || e.key === 'C') {
        setPosition('center');
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'ArrowRight') {
        setPosition('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initialConfig, position, diameter, panelType]);

  if (!isOpen || !initialConfig) return null;

  const handleApply = (forcedPos?: 'left' | 'center' | 'right') => {
    onConfirm({
      ...initialConfig,
      position: forcedPos || position,
      diameter,
      fanPanelType: panelType,
    });
  };

  const isHindi = lang === 'hi';

  const positionOptions: {
    id: 'left' | 'center' | 'right';
    titleEn: string;
    titleHi: string;
    descEn: string;
    descHi: string;
    icon: typeof ArrowLeft;
    fanXOffset: number; // For mini SVG preview (0 to 100)
  }[] = [
    {
      id: 'left',
      titleEn: 'Left Side',
      titleHi: 'बाएं तरफ (Left Side)',
      descEn: 'Placed towards left with safety clearance',
      descHi: 'बाएं कोने पर (दाईं तरफ खुला ग्लास रहेगा)',
      icon: ArrowLeft,
      fanXOffset: 25,
    },
    {
      id: 'center',
      titleEn: 'Center',
      titleHi: 'बीच में / सेंटर (Center)',
      descEn: 'Centered symmetrically in window section',
      descHi: 'बिल्कुल बीचों-बीच सममित स्थिति में',
      icon: CircleDot,
      fanXOffset: 50,
    },
    {
      id: 'right',
      titleEn: 'Right Side',
      titleHi: 'दाएं तरफ (Right Side)',
      descEn: 'Placed towards right with safety clearance',
      descHi: 'दाएं कोने पर (बाईं तरफ खुला ग्लास रहेगा)',
      icon: ArrowRight,
      fanXOffset: 75,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-linear-to-r from-slate-900 via-cyan-950/60 to-slate-900 border-b border-cyan-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <Fan className="w-5 h-5 animate-spin [animation-duration:6s]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isHindi ? 'फैन की स्थिति चुनें (Fan Position)' : 'Choose Fan Position'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Ø{diameter}mm
                </span>
              </h3>
              <p className="text-xs text-cyan-200/70">
                {isHindi 
                  ? 'खिड़की के इस हिस्से में पंखा कहाँ लगाना है? (Left, Center, ya Right)' 
                  : 'Where should the exhaust fan be positioned in this window section?'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Main 3 Position Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>{isHindi ? '1. स्थिति चुनें (Select Position):' : '1. Select Placement:'}</span>
              <span className="text-[11px] text-cyan-400 font-normal">
                {isHindi ? '(कार्ड पर क्लिक करें या L/C/R दबाएं)' : '(Click card or press L/C/R)'}
              </span>
            </label>

            <div className="grid grid-cols-3 gap-3">
              {positionOptions.map((opt) => {
                const isSelected = position === opt.id;
                const IconComponent = opt.icon;

                return (
                  <div
                    key={opt.id}
                    onClick={() => setPosition(opt.id)}
                    className={`relative rounded-xl border p-3 cursor-pointer transition-all duration-150 flex flex-col items-center text-center group ${
                      isSelected
                        ? 'bg-linear-to-b from-cyan-950/70 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-950/50 scale-[1.02]'
                        : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    {/* Active Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}

                    {/* Visual Window Section with Fan Cutout */}
                    <div className="w-full aspect-16/10 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden mb-2.5 flex items-center justify-center p-1.5 relative">
                      <svg viewBox="0 0 100 60" className="w-full h-full">
                        {/* Outer Pocket Frame Profile */}
                        <rect x="2" y="2" width="96" height="56" fill="#1e293b" stroke="#334155" strokeWidth="2" rx="2" />
                        
                        {/* Glass Area */}
                        <rect 
                          x="8" 
                          y="8" 
                          width="84" 
                          height="44" 
                          fill={panelType === 'pvc_sheet' ? '#f1f5f9' : '#0284c7'} 
                          fillOpacity={panelType === 'pvc_sheet' ? 0.9 : 0.25}
                          stroke="#0284c7" 
                          strokeWidth="1" 
                        />

                        {/* Glass Reflection Streak */}
                        {panelType !== 'pvc_sheet' && (
                          <line x1="15" y1="12" x2="35" y2="50" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
                        )}

                        {/* Fan Cutout Circle at offset position */}
                        <g transform={`translate(${opt.fanXOffset}, 30)`}>
                          {/* Outer Rubber Ring */}
                          <circle r="14" fill="#090d16" stroke="#06b6d4" strokeWidth={isSelected ? "2" : "1.2"} />
                          {/* Inner Circle Hole */}
                          <circle r="11" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />
                          {/* 4 Fan Blades */}
                          <path d="M 0 0 C 2 -6, 7 -8, 8 -7 C 5 -4, 3 -1, 0 0 Z" fill="#38bdf8" />
                          <path d="M 0 0 C 6 2, 8 7, 7 8 C 4 5, 1 3, 0 0 Z" fill="#38bdf8" />
                          <path d="M 0 0 C -2 6, -7 8, -8 7 C -5 4, -3 1, 0 0 Z" fill="#38bdf8" />
                          <path d="M 0 0 C -6 -2, -8 -7, -7 -8 C -4 -5, -1 -3, 0 0 Z" fill="#38bdf8" />
                          {/* Center Hub */}
                          <circle r="3" fill="#06b6d4" />
                        </g>

                        {/* Position Indicator Dot */}
                        <g transform={`translate(${opt.fanXOffset}, 54)`}>
                          <circle r="3.5" fill={isSelected ? '#06b6d4' : '#64748b'} />
                        </g>
                      </svg>
                    </div>

                    {/* Title */}
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span className={isSelected ? 'text-white' : 'text-slate-300'}>
                        {isHindi ? opt.titleHi : opt.titleEn}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {isHindi ? opt.descHi : opt.descEn}
                    </p>

                    {/* Instant 1-Click Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(opt.id);
                      }}
                      className={`mt-2.5 w-full py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-xs'
                          : 'bg-slate-750 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700'
                      }`}
                    >
                      {isHindi ? 'यहाँ लगाएं (Set Here)' : 'Apply Here'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Specifications: Diameter & Base Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            {/* Fan Cutout Diameter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                {isHindi ? 'व्यास (Fan Hole Diameter):' : 'Cutout Diameter:'}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { dia: 150, label: '150mm', sub: '6"' },
                  { dia: 200, label: '200mm', sub: '8" Std' },
                  { dia: 250, label: '250mm', sub: '10"' },
                  { dia: 300, label: '300mm', sub: '12"' },
                ].map((d) => (
                  <button
                    key={d.dia}
                    type="button"
                    onClick={() => setDiameter(d.dia)}
                    className={`py-1.5 px-1 rounded-lg text-center border transition cursor-pointer ${
                      diameter === d.dia
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px] font-mono leading-none">{d.label}</div>
                    <div className="text-[9px] text-cyan-400/80 mt-0.5">{d.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Base Material */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                {isHindi ? 'बेस मटेरियल (Base Type):' : 'Mounting Base:'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'glass_hole', labelEn: 'Glass Hole', labelHi: 'काँच कटआउट' },
                  { id: 'pvc_sheet', labelEn: 'uPVC Sheet', labelHi: 'सॉलिड शीट' },
                  { id: 'louver_hole', labelEn: 'Louver Slat', labelHi: 'हवादार जाली' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPanelType(m.id as any)}
                    className={`py-1.5 px-1 rounded-lg text-center text-[10px] font-medium border transition cursor-pointer ${
                      panelType === m.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isHindi ? m.labelHi : m.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-6 py-3.5 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>
              {isHindi ? 'चुनी गई पोजीशन: ' : 'Selected Position: '}
              <strong className="text-cyan-300 font-bold uppercase">
                {position === 'left' ? (isHindi ? 'बाएं (Left)' : 'Left') : position === 'right' ? (isHindi ? 'दाएं (Right)' : 'Right') : (isHindi ? 'सेंटर (Center)' : 'Center')}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              {isHindi ? 'रद्द करें (Cancel)' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => handleApply()}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-linear-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition transform hover:scale-[1.02] cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isHindi ? 'लागू करें (Apply Fan Cutout)' : 'Apply Fan Cutout'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
