import React from 'react';
import {
  UPVCFrame,
  Mullion,
  FramePocket,
  CouplingConnection,
  SashType,
  GlassType,
  GridPattern,
  GeorgianBarConfig,
  GeorgianBarColor,
  GeorgianBarStyle,
  CADProject,
} from '../types/upvc';
import { DEFAULT_COLORS, calculateAssemblyBounds, recalculateFramePockets } from '../utils/upvcCalculations';
import {
  Settings,
  Layers,
  Columns,
  Rows,
  Split,
  Maximize2,
  Trash2,
  Plus,
  Shield,
  Palette,
  Eye,
  Check,
  Equal,
  Sliders,
  Fan,
  Wind,
  Lock,
  Sparkles,
  Edit3,
  Scissors,
  X,
  Calculator,
  Grid,
} from 'lucide-react';
import {
  HANDLE_OPTIONS,
  CASEMENT_WINDOW_HANDLES,
  CASEMENT_DOOR_HANDLES,
  SLIDING_WINDOW_HANDLES,
  SLIDING_DOOR_HANDLES,
  SLIDING_MESH_HANDLES,
} from '../data/handleOptions';
import {
  CASEMENT_SERIES_OPTIONS,
  CASEMENT_FRAME_PROFILES,
  CASEMENT_WINDOW_SASH_PROFILES,
  CASEMENT_DOOR_SASH_PROFILES,
} from '../data/casementSpecifications';
import { HandleThumbnail } from './HandleThumbnail';
import { HandleSelectionModal } from './HandleSelectionModal';
import { PocketCustomizationModal } from './PocketCustomizationModal';
import { evaluateDimensionMath, getLiveMathPreview } from '../utils/dimensionMath';

interface InspectorMathInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
}

const InspectorMathInput: React.FC<InspectorMathInputProps> = ({
  value,
  onChange,
  min = 50,
  max = 10000,
  className = '',
  placeholder = '',
}) => {
  const [text, setText] = React.useState<string>(String(value || ''));
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setText(String(value || ''));
    }
  }, [value, isFocused]);

  const preview = getLiveMathPreview(text);

  const commit = () => {
    const evaluated = evaluateDimensionMath(text);
    if (evaluated !== null && !isNaN(evaluated)) {
      const clamped = Math.max(min, Math.min(max, evaluated));
      onChange(clamped);
      setText(String(clamped));
    } else {
      const cleaned = text.replace(/[^0-9.]/g, '');
      const num = parseInt(cleaned, 10);
      if (!isNaN(num) && num > 0) {
        const clamped = Math.max(min, Math.min(max, num));
        onChange(clamped);
        setText(String(clamped));
      } else {
        setText(String(value || ''));
      }
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={text}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^0-9\.\+\-\*\/\(\)\s'"xXftin]/gi, '');
          setText(cleaned);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        onBlur={() => {
          setIsFocused(false);
          commit();
        }}
        placeholder={placeholder}
        className={className}
      />
      {isFocused && preview && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 px-2 py-0.5 bg-blue-950 border border-blue-500 rounded text-[10px] font-mono font-bold text-blue-300 text-center shadow-lg pointer-events-none">
          = {preview} mm
        </div>
      )}
    </div>
  );
};

interface InspectorProps {
  project?: CADProject;
  frames?: UPVCFrame[];
  couplings?: CouplingConnection[];
  selectedFrameId: string | null;
  selectedMullionId: string | null;
  selectedPocketId: string | null;
  selectedCouplingId: string | null;
  onUpdateFrame: (frame: UPVCFrame) => void;
  onUpdatePocket?: (frameId: string, pocket: FramePocket) => void;
  onUpdateMullion?: (frameId: string, mullion: Mullion) => void;
  onUpdateCoupling?: (coupling: CouplingConnection) => void;
  onDeleteFrame?: (frameId: string) => void;
  onDeleteMullion?: (frameId: string, mullionId: string) => void;
  onDeleteCoupling?: (couplingId: string) => void;
  onAddCoupledFrame?: (sourceFrameId: string, direction: 'right' | 'left' | 'bottom') => void;
  onAddVerticalMullion?: (frameId: string, pocketId?: string) => void;
  onAddHorizontalMullion?: (frameId: string, pocketId?: string) => void;
  onRequestMultipleMullions?: (frameId: string, orientation: 'vertical' | 'horizontal', pocketId?: string) => void;
  onAddMullionAtPosition?: (frameId: string, orientation: 'vertical' | 'horizontal', position?: number, targetPocketId?: string) => void;
  onEqualizeFrameMullions?: (frameId: string) => void;
  onOpenPocketCustomizer?: (frameId: string, pocketId: string) => void;
  onAutoAlignCoupling?: () => void;
  onAddFanVent?: (frameId: string, pocketId?: string) => void;
  onAddACSection?: (frameId: string, pocketId?: string) => void;
  onOpenCuttingList?: (tab?: 'production_report' | 'saw_cutting' | 'live_formula' | 'bar_nesting' | 'cost_breakup') => void;
  onClose?: () => void;
  lang?: 'hi' | 'en';
  selectedPocketTarget?: 'shutter' | 'mesh';
}

export const Inspector: React.FC<InspectorProps> = ({
  project,
  frames,
  couplings,
  selectedFrameId,
  selectedMullionId,
  selectedPocketId,
  selectedCouplingId,
  onUpdateFrame,
  onUpdatePocket = (_frameId: string, _pocket: FramePocket) => {},
  onUpdateMullion = (_frameId: string, _mullion: Mullion) => {},
  onUpdateCoupling = (_coupling: CouplingConnection) => {},
  onDeleteFrame = (_frameId: string) => {},
  onDeleteMullion = (_frameId: string, _mullionId: string) => {},
  onDeleteCoupling = (_couplingId: string) => {},
  onAddCoupledFrame = (_sourceFrameId: string, _direction: 'right' | 'left' | 'bottom') => {},
  onAddVerticalMullion = (_frameId: string, _pocketId?: string) => {},
  onAddHorizontalMullion = (_frameId: string, _pocketId?: string) => {},
  onRequestMultipleMullions,
  onAddMullionAtPosition,
  onEqualizeFrameMullions = (_frameId: string) => {},
  onOpenPocketCustomizer,
  onAutoAlignCoupling,
  onAddFanVent,
  onAddACSection,
  onOpenCuttingList,
  onClose,
  lang = 'en',
  selectedPocketTarget,
}) => {
  const actualFrames = frames || project?.frames || [];
  const actualCouplings = couplings || project?.couplings || [];

  const currentFrame = actualFrames.find((f) => f.id === selectedFrameId);
  const currentMullion = (currentFrame?.mullions || []).find((m) => m.id === selectedMullionId);
  const currentPocket = (currentFrame?.pockets || []).find((p) => p.id === selectedPocketId);
  const currentCoupling = actualCouplings.find((c) => c.id === selectedCouplingId);

  // Context-aware selection state: JO JISKA H TIPNE PER SIRF USKE OPTION DIKHE
  const isMullionSelected = Boolean(selectedMullionId && currentMullion);
  const isPocketSelected = Boolean(selectedPocketId && currentPocket && !isMullionSelected);
  const isCouplingSelected = Boolean(selectedCouplingId && currentCoupling && !isMullionSelected && !isPocketSelected);
  const isFrameOnlySelected = Boolean(currentFrame && !isMullionSelected && !isPocketSelected && !isCouplingSelected);

  const [isHandleModalOpen, setIsHandleModalOpen] = React.useState(false);
  const [handleFilterTab, setHandleFilterTab] = React.useState<'all' | 'casement' | 'sliding' | 'door'>('all');
  const [showOtherSashTypes, setShowOtherSashTypes] = React.useState(false);

  const isCasement = Boolean(
    currentPocket && (
      currentPocket.sashType === 'casement_left' ||
      currentPocket.sashType === 'casement_right' ||
      currentPocket.sashType === 'top_hung' ||
      currentPocket.sashType === 'bottom_hung' ||
      currentPocket.sashType === 'french_open' ||
      currentPocket.sashType === 'tilt_turn' ||
      currentPocket.sashType.startsWith('casement')
    )
  );

  const frameNameLower = (currentFrame?.name || '').toLowerCase();
  const isCasementWin = Boolean(
    currentPocket && [
      'casement',
      'casement_left',
      'casement_right',
      'top_hung',
      'bottom_hung',
      'tilt_turn',
      'french_open',
    ].includes(currentPocket.sashType || '')
  );
  const isExplicitWindowName = isCasementWin || frameNameLower.startsWith('w') || frameNameLower.includes('window');
  const isCurrentDoor = Boolean(
    currentPocket && (
      currentPocket.applicationType === 'door' ||
      (!isCasementWin && currentPocket.applicationType !== 'window' && !isExplicitWindowName && (
        frameNameLower.includes('door') ||
        frameNameLower.startsWith('d') ||
        (currentFrame && currentFrame.series === 'door_premium')
      ))
    )
  );

  const isSlider = Boolean(
    currentPocket && (
      currentPocket.sashType?.startsWith('slider') ||
      currentPocket.sashType?.startsWith('mesh_slider') ||
      currentPocket.sashType === 'sliding' ||
      (currentFrame && currentFrame.series?.startsWith('sliding'))
    )
  );

  const isMeshSash = Boolean(
    currentPocket && (
      currentPocket.sashType?.startsWith('mesh_') ||
      currentPocket.sashType?.includes('mesh') ||
      currentPocket.hasMesh
    )
  );

  const bounds = calculateAssemblyBounds(actualFrames);

  // Sash types list with Hindi translations and icons
  const SASH_TYPES: { id: SashType; name: string; nameHindi: string }[] = [
    { id: 'fixed', name: 'Fixed Glass (No Sash)', nameHindi: 'फिक्स ग्लास (Fixed Glass)' },
    { id: 'casement_left', name: 'Casement Left (Hinged Left)', nameHindi: 'बायां पल्ला (Casement Left)' },
    { id: 'casement_right', name: 'Casement Right (Hinged Right)', nameHindi: 'दायां पल्ला (Casement Right)' },
    { id: 'top_hung', name: 'Top Hung / Awning', nameHindi: 'टॉप वेंटिलेटर (Top Hung)' },
    { id: 'bottom_hung', name: 'Bottom Hung / Hopper', nameHindi: 'बॉटम वेंटिलेटर (Bottom Hung)' },
    { id: 'french_open', name: 'French Open (Double Casement)', nameHindi: 'फ्रेंच ओपन (Double Casement)' },
    { id: 'tilt_turn', name: 'Tilt & Turn Sash', nameHindi: 'टिल्ट एंड टर्न (Tilt & Turn)' },
    { id: 'slider_arrow_both', name: 'Sliding Sash (↔ Both Directions / All Slide)', nameHindi: 'स्लाइडर (↔ दोनों तरफ स्लाइड)' },
    { id: 'slider_arrow_right', name: 'Sliding Sash (→ Slide Right)', nameHindi: 'स्लाइडर (→ दायाँ स्लाइड)' },
    { id: 'slider_arrow_left', name: 'Sliding Sash (← Slide Left)', nameHindi: 'स्लाइडर (← बायाँ स्लाइड)' },
    { id: 'slider_fixed_center', name: 'Slider Fixed Panel (+)', nameHindi: 'स्लाइडर फिक्स पैनल (+)' },
    { id: 'slider_3s', name: '3-Track 3-Panel [ S1 ↔ | S2 ↔ | S3 ↔ ] All Slide', nameHindi: '3-ट्रैक तीनों पल्ले स्लाइड [ ↔ | ↔ | ↔ ]' },
    { id: 'slider_2s_xo', name: '2-Track Slider XO (Left Slide)', nameHindi: '2-ट्रैक XO (बायाँ स्लाइड)' },
    { id: 'slider_2s_ox', name: '2-Track Slider OX (Right Slide)', nameHindi: '2-ट्रैक OX (दायाँ स्लाइड)' },
    { id: 'slider_2s_xx', name: '2-Track Slider XX (Both Slide)', nameHindi: '2-ट्रैक XX (दोनों स्लाइड)' },
    { id: 'slider_3s_oxo', name: '3-Track Slider OXO (Center Fix)', nameHindi: '3-ट्रैक OXO (मध्य फिक्स)' },
    { id: 'slider_3s_xxx', name: '3-Track Slider XXX (All Slide)', nameHindi: '3-ट्रैक XXX (सभी स्लाइड)' },
    { id: 'slider_4s_oxxo', name: '4-Track Slider OXXO (Center French)', nameHindi: '4-ट्रैक OXXO (सेंटर ओपन)' },
    { id: 'slider_4s_xxxx', name: '4-Track Slider XXXX (All 4 Slide)', nameHindi: '4-ट्रैक XXXX (सभी 4 स्लाइड)' },
    { id: 'louver', name: 'Louver Blades / Vent', nameHindi: 'हवादार जाली (Louver)' },
    { id: 'upvc_panel', name: 'Solid uPVC Panel', nameHindi: 'सॉलिड uPVC पैनल' },
    { id: 'mesh_sash', name: 'Fly Mesh SS 304 Screen', nameHindi: 'मच्छर जाली (Fly Mesh)' },
  ];


  // Glass types list
  const GLASS_TYPES: { id: GlassType; name: string; nameHindi: string }[] = [
    { id: 'clear_5mm', name: '5mm Clear Glass', nameHindi: '5mm सादा काँच (Clear)' },
    { id: 'clear_6mm', name: '6mm Toughened Clear', nameHindi: '6mm टफन काँच (Toughened)' },
    { id: 'clear_8mm', name: '8mm Toughened Clear', nameHindi: '8mm टफन काँच (8mm Tough)' },
    { id: 'clear_10mm', name: '10mm Clear Toughened', nameHindi: '10mm टफन काँच (10mm Heavy)' },
    { id: 'clear_12mm', name: '12mm Heavy Toughened', nameHindi: '12mm हैवी टफन (12mm Glass)' },
    { id: 'dgu_5_12_5', name: 'DGU 22mm (5+12A+5 Double Glass)', nameHindi: 'DGU डबल ग्लास (5+12+5)' },
    { id: 'dgu_6_16_6', name: 'DGU 28mm (6+16A+6 Soundproof)', nameHindi: 'साउंडप्रूफ DGU (6+16+6)' },
    { id: 'dgu_5_10_5', name: 'DGU 20mm (5+10A+5 Acoustic)', nameHindi: 'DGU 20mm (5+10+5 इंसुलेटेड)' },
    { id: 'dgu_30mm', name: 'DGU 30mm (10+12A+8 Commercial)', nameHindi: '30mm हैवी DGU कॉमर्शियल' },
    { id: 'laminated_11_52', name: '11.52mm Laminated Safety (5+1.52+5)', nameHindi: '11.52mm लेमिनेटेड सेफ्टी ग्लास' },
    { id: 'laminated_13_52', name: '13.52mm Laminated Acoustic (6+1.52+6)', nameHindi: '13.52mm लेमिनेटेड साउंडप्रूफ' },
    { id: 'frosted', name: 'Frosted / Privacy Glass', nameHindi: 'धुंधला काँच (Frosted)' },
    { id: 'tint_bronze', name: 'Tinted Bronze Glass', nameHindi: 'ब्राउज टिंटेड काँच (Bronze)' },
    { id: 'tint_green', name: 'Tinted Green Glass', nameHindi: 'हरा टिंटेड काँच (Green)' },
    { id: 'tint_blue', name: 'Tinted Blue Glass', nameHindi: 'नीला टिंटेड काँच (Blue)' },
    { id: 'tint_grey', name: 'Tinted Grey Glass', nameHindi: 'ग्रे टिंटेड काँच (Grey)' },
    { id: 'low_e', name: 'Low-E Solar Heat Reflector', nameHindi: 'Low-E सोलर प्रोटेक्टेड' },
    { id: 'reflective_mirror', name: '6mm One-Way Reflective Mirror', nameHindi: 'वन-वे रिफ्लेक्टिव मिरर (6mm)' },
    { id: 'pinhead', name: 'Pinhead / Fluted Texture Glass', nameHindi: 'पिनहेड / फ्लूटेड डिज़ाइन काँच' },
  ];

  // If a pocket / bay is selected, directly render the clean docked Properties panel matching the user's reference UI
  if (isPocketSelected && currentPocket && currentFrame && onUpdatePocket) {
    return (
      <PocketCustomizationModal
        isOpen={true}
        isDocked={true}
        frame={currentFrame}
        pocket={currentPocket}
        initialTarget={selectedPocketTarget}
        onSavePocket={(fId, updatedPocket) => onUpdatePocket(fId, updatedPocket)}
        onClose={onClose || (() => {})}
        lang={lang}
      />
    );
  }

  return (
    <aside className="w-80 lg:w-96 bg-slate-950/90 border-l border-slate-800/80 flex flex-col shrink-0 overflow-hidden h-full z-20">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
            {selectedMullionId && currentMullion
              ? lang === 'hi' ? 'मुलियन सेटिंग्स (Mullion)' : 'Mullion Properties'
              : selectedPocketId && currentPocket
              ? lang === 'hi' ? 'खाना / पल्ला सेटिंग्स (Bay)' : 'Bay & Sash Properties'
              : selectedCouplingId
              ? lang === 'hi' ? 'कप्लिंग सेटिंग्स (2mm Coupler)' : 'Coupling Properties'
              : selectedFrameId
              ? lang === 'hi' ? 'फ्रेम सेटिंग्स (Frame)' : 'Frame Properties'
              : lang === 'hi' ? 'प्रोजेक्ट जानकारी (Project)' : 'Project Summary'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onOpenCuttingList && (
            <button
              onClick={onOpenCuttingList}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer"
              title="Open Factory Cutting List & Material BOM (कटिंग लिस्ट खोलें)"
            >
              <Scissors className="w-3.5 h-3.5 text-white" />
              <span>{lang === 'hi' ? 'कटिंग लिस्ट' : 'Cutting List'}</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={lang === 'hi' ? 'बंद करें (Close)' : 'Close Properties'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sidebar Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs text-slate-300">
        {/* FRAME OUTER DIMENSIONS: ONLY SHOWN WHEN THE FRAME ITSELF IS SELECTED (NO SUB-ELEMENT) */}
        {isFrameOnlySelected && (
          <div className="p-3.5 bg-slate-900/95 border-2 border-blue-500/70 rounded-2xl space-y-3 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-black text-xs">
                  {currentFrame.name || 'Frame'}
                </span>
                <span className="text-xs font-black text-white tracking-wide">
                  {lang === 'hi' ? 'फ्रेम कुल माप (Frame Outer)' : 'Frame Outer Size'}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400">
                {currentFrame.width} × {currentFrame.height} mm
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Width Input Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wide">
                    {lang === 'hi' ? 'चौड़ाई (Width)' : 'Width (mm)'}
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">mm</span>
                </div>
                <div className="relative">
                  <InspectorMathInput
                    value={currentFrame.width}
                    onChange={(newW) =>
                      onUpdateFrame({
                        ...currentFrame,
                        width: newW,
                      })
                    }
                    min={200}
                    placeholder="1200 / 4ft / 1200+50"
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-blue-500 rounded-xl py-2 px-2 text-sm font-black font-mono text-white text-center focus:outline-none transition shadow-inner"
                  />
                </div>
                {/* Quick Adjust +/- Buttons */}
                <div className="grid grid-cols-2 gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFrame({
                        ...currentFrame,
                        width: Math.max(200, currentFrame.width - 50),
                      })
                    }
                    className="py-1 px-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition active:scale-95"
                    title="-50mm"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFrame({
                        ...currentFrame,
                        width: currentFrame.width + 50,
                      })
                    }
                    className="py-1 px-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 text-[11px] font-bold rounded-lg transition active:scale-95"
                    title="+50mm"
                  >
                    +50
                  </button>
                </div>
              </div>

              {/* Height Input Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-black text-blue-400 uppercase tracking-wide">
                    {lang === 'hi' ? 'ऊंचाई (Frame Height)' : 'Frame Height'}
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">mm</span>
                </div>
                <div className="relative">
                  <InspectorMathInput
                    value={currentFrame.height}
                    onChange={(newH) =>
                      onUpdateFrame({
                        ...currentFrame,
                        height: newH,
                      })
                    }
                    min={200}
                    placeholder="1500 / 5ft / 1500-100"
                    className="w-full bg-slate-950 border-2 border-blue-500 focus:border-blue-400 rounded-xl py-2 px-2 text-sm font-black font-mono text-white text-center focus:outline-none transition shadow-inner"
                  />
                </div>
                {/* Quick Adjust +/- Buttons */}
                <div className="grid grid-cols-2 gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFrame({
                        ...currentFrame,
                        height: Math.max(200, currentFrame.height - 50),
                      })
                    }
                    className="py-1 px-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition active:scale-95"
                    title="-50mm"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFrame({
                        ...currentFrame,
                        height: currentFrame.height + 50,
                      })
                    }
                    className="py-1 px-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 text-[11px] font-bold rounded-lg transition active:scale-95"
                    title="+50mm"
                  >
                    +50
                  </button>
                </div>
              </div>
            </div>

            {onOpenCuttingList && (
              <div className="space-y-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => onOpenCuttingList('production_report')}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'कटिंग लिस्ट व निर्माण सूची (Cutting List)' : 'Open Cutting List & BOM'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCuttingList('live_formula')}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  title="Live Cutting Formula Step-by-Step Breakdown"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'hi' ? 'लाइव कटिंग फॉर्मूला देखें (Formula Math)' : 'Inspect Live Formulas'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </button>
              </div>
            )}

            {/* Quick Frame-Level Georgian / Dorgen Bar (पूरे फ्रेम के लिए डोरगन बार) */}
            <div className="p-3 bg-slate-950/90 border border-amber-500/50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-black text-amber-300">
                    {lang === 'hi' ? 'डोरगन बार (Georgian Grid)' : 'Frame Georgian Grid'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">
                  {(currentFrame.pockets || []).filter((p) => p.gridPattern && p.gridPattern !== 'none').length} / {(currentFrame.pockets || []).length} {lang === 'hi' ? 'ग्लास' : 'Panes'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'none', label: 'सादा (None)', color: 'none' },
                  { id: 'georgian_2x2', label: '2×2 Gold', color: 'gold' },
                  { id: 'georgian_3x3', label: '3×3 White', color: 'white' },
                  { id: 'georgian_prairie', label: 'Prairie', color: 'gold' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      const cfg: GeorgianBarConfig = {
                        enabled: preset.id !== 'none',
                        pattern: preset.id as GridPattern,
                        color: preset.color as any,
                        barWidth: 18,
                        style: 'internal',
                      };
                      const updatedPockets = (currentFrame.pockets || []).map((p) => ({
                        ...p,
                        gridPattern: preset.id as GridPattern,
                        georgianBar: { ...cfg },
                      }));
                      onUpdateFrame({
                        ...currentFrame,
                        pockets: updatedPockets,
                        georgianBar: { ...cfg },
                      });
                    }}
                    className="py-1.5 px-1 bg-slate-900 hover:bg-amber-600/20 border border-slate-700 hover:border-amber-500 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition cursor-pointer text-center"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 1. POCKET / BAY SELECTED (ONLY WHEN POCKET IS SELECTED) */}
        {isPocketSelected && currentPocket && currentFrame && (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 text-sm">
                  {currentPocket.customLabel || 'Selected Bay'}
                </span>
                <span className="text-[11px] font-mono text-cyan-300 bg-cyan-900/50 px-2 py-0.5 rounded">
                  {lang === 'hi' ? 'आंतरिक पॉकेट: ' : 'Pocket: '}{currentPocket.width} × {currentPocket.height} mm
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'hi'
                  ? 'फ्रेम की कुल ऊंचाई ऊपर (Frame Height) से बदलेगी। नीचे केवल इस खाने की सेटिंग (काँच/सैश/हैंडल) चुनें।'
                  : 'Total Frame Height is adjusted above. Configure opening sash or glass below.'}
              </p>
              {onOpenPocketCustomizer && (
                <button
                  onClick={() => onOpenPocketCustomizer(currentFrame.id, currentPocket.id)}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Sliders className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'सैश एवं हार्डवेयर साइड पैनल खोलें' : 'Open Sash & Hardware Drawer'}</span>
                </button>
              )}
            </div>

            {/* Split this Bay with Sectional Mullions (Does not cross intersecting mullions) */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
              <label className="text-[11px] font-bold text-emerald-400 block uppercase tracking-wide flex items-center gap-1.5">
                <span>✂️</span>
                <span>{lang === 'hi' ? 'इस हिस्से को बांटें (T-जॉइंट मुलियन):' : 'Subdivide Bay (T-Joint Mullion):'}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onAddMullionAtPosition) {
                      onAddMullionAtPosition(currentFrame.id, 'vertical', undefined, currentPocket.id);
                    } else if (onAddVerticalMullion) {
                      onAddVerticalMullion(currentFrame.id, currentPocket.id);
                    }
                  }}
                  className="p-2.5 rounded-lg bg-slate-950 hover:bg-emerald-950/60 hover:border-emerald-500 border border-slate-700 text-slate-200 text-xs font-bold flex flex-col items-center gap-1 transition shadow-sm group"
                  title={lang === 'hi' ? 'इस हिस्से में खड़ा मुलियन (T-जॉइंट, बिना ट्रांसोम को काटे)' : 'Vertical T-Mullion in this bay'}
                >
                  <span className="text-emerald-400 font-extrabold text-sm group-hover:scale-110 transition">⫿</span>
                  <span className="text-center text-[11px] leading-tight">
                    {lang === 'hi' ? 'खड़ा मुलियन (T-जॉइंट)' : 'Vertical T-Mullion'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onAddMullionAtPosition) {
                      onAddMullionAtPosition(currentFrame.id, 'horizontal', undefined, currentPocket.id);
                    } else if (onAddHorizontalMullion) {
                      onAddHorizontalMullion(currentFrame.id, currentPocket.id);
                    }
                  }}
                  className="p-2.5 rounded-lg bg-slate-950 hover:bg-emerald-950/60 hover:border-emerald-500 border border-slate-700 text-slate-200 text-xs font-bold flex flex-col items-center gap-1 transition shadow-sm group"
                  title={lang === 'hi' ? 'इस हिस्से में आड़ा ट्रांसोम (T-जॉइंट, बिना मुलियन को काटे)' : 'Horizontal T-Transom in this bay'}
                >
                  <span className="text-emerald-400 font-extrabold text-sm group-hover:scale-110 transition">⊝</span>
                  <span className="text-center text-[11px] leading-tight">
                    {lang === 'hi' ? 'आड़ा ट्रांसोम (T-जॉइंट)' : 'Horizontal T-Transom'}
                  </span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {lang === 'hi'
                  ? '✓ यह मुलियन सिर्फ इसी खाने में सीमित रहेगा और हॉरिजॉन्टल/वर्टिकल डिवाइडर को पार (cross) नहीं करेगा।'
                  : '✓ Constrained inside this bay only. Does not cross existing mullions.'}
              </p>
            </div>

            {/* Quick Casement Conversion when Bay is Fixed or Non-Casement */}
            {!isCasement && (
              <div className="p-3 bg-blue-950/40 border border-blue-600/40 rounded-xl space-y-2">
                <span className="text-xs font-bold text-blue-300 block">
                  {lang === 'hi' ? '⚡ त्वरित कैसमेंट पल्ला बनाएं:' : '⚡ Convert Bay to Casement Sash:'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePocket(currentFrame.id, {
                        ...currentPocket,
                        sashType: 'casement_left',
                        handlePosition: 'left',
                        applicationType: 'window',
                        handleType: 'cockspur_left',
                        handleCode: 'UPVC-HW-CHL',
                        sashProfileCode: 'CWH 60-03',
                        seriesCode: currentPocket.seriesCode || 'CWH-60',
                        frameProfileCode: currentPocket.frameProfileCode || currentFrame.frameProfileCode || 'CWH 60-01',
                        handleHeight: Math.round(currentPocket.height / 2),
                      });
                    }}
                    className="py-2 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <span>🪟</span>
                    <span>{lang === 'hi' ? 'कैसमेंट विंडो पल्ला' : 'Casement Window'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePocket(currentFrame.id, {
                        ...currentPocket,
                        sashType: 'casement_left',
                        handlePosition: 'left',
                        applicationType: 'door',
                        handleType: 'door_double_side',
                        handleCode: 'UPVC-HW-CMTDSDH',
                        sashProfileCode: 'CWH 60-06',
                        seriesCode: currentPocket.seriesCode || 'CWH-60',
                        frameProfileCode: currentPocket.frameProfileCode || currentFrame.frameProfileCode || 'CWH 60-01',
                        handleHeight: 1000,
                      });
                    }}
                    className="py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <span>🚪</span>
                    <span>{lang === 'hi' ? 'कैसमेंट डोर पल्ला' : 'Casement Door'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASEMENT SYSTEM SPECIFICATION PANEL (WHEN SASH IS CASEMENT) */}
            {isCasement && (
              <div className="space-y-4 animate-in fade-in">
                {/* 0. Classification Toggle: Window vs Door */}
                <div className="p-3 bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <span>🛠️</span>
                      <span>{lang === 'hi' ? 'कैसमेंट प्रकार (WINDOW / DOOR)' : 'CASEMENT APPLICATION TYPE'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {isCurrentDoor ? (lang === 'hi' ? '🚪 डोर मोड' : '🚪 Door Mode') : (lang === 'hi' ? '🪟 विंडो मोड' : '🪟 Window Mode')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          applicationType: 'window',
                          handleHeight: Math.round(currentPocket.height / 2),
                          handleType: currentPocket.handleType?.includes('door') ? 'cockspur_left' : currentPocket.handleType || 'cockspur_left',
                          handleCode: currentPocket.handleType?.includes('door') ? 'UPVC-HW-CHL' : currentPocket.handleCode || 'UPVC-HW-CHL',
                          sashProfileCode: currentPocket.sashProfileCode?.includes('06') || currentPocket.sashProfileCode?.includes('07') ? 'CWH 60-03' : currentPocket.sashProfileCode || 'CWH 60-03',
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition border ${
                        !isCurrentDoor
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-1 ring-blue-400'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>🪟</span>
                      <span>{lang === 'hi' ? 'विंडो सैश (Window)' : 'Window Sash'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          applicationType: 'door',
                          handleHeight: 1000,
                          handleType: !currentPocket.handleType?.includes('door') && !currentPocket.handleType?.includes('lock') ? 'door_double_side' : currentPocket.handleType || 'door_double_side',
                          handleCode: !currentPocket.handleType?.includes('door') && !currentPocket.handleType?.includes('lock') ? 'UPVC-HW-CMTDSDH' : currentPocket.handleCode || 'UPVC-HW-CMTDSDH',
                          sashProfileCode: 'CWH 60-06',
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition border ${
                        isCurrentDoor
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-1 ring-emerald-400'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>🚪</span>
                      <span>{lang === 'hi' ? 'डोर सैश (Door)' : 'Door Sash'}</span>
                    </button>
                  </div>
                </div>

                {/* 0b. 3-Sided Frame Option (FRAME 3 SIDE / नीचे वाला फ्रेम का हिस्सा नहीं) */}
                {isCurrentDoor && (
                  <div className="p-3 bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-900 border-2 border-amber-500/70 rounded-xl space-y-2.5 shadow-lg animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-extrabold text-sm">🚪</span>
                        <div>
                          <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                            {lang === 'hi' ? 'फ्रेम 3 साइड विकल्प (3-SIDED FRAME)' : 'FRAME 3 SIDE OPTION'}
                          </h4>
                          <p className="text-[10px] text-slate-300">
                            {lang === 'hi' ? 'डोर के लिए नीचे की चौखट हटाएँ' : 'Eliminate bottom frame sill for open floor'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        currentFrame.isThreeSidedFrame || currentPocket.isThreeSidedFrame || currentFrame.frameSides === '3_side' || currentPocket.frameSides === '3_side'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {currentFrame.isThreeSidedFrame || currentPocket.isThreeSidedFrame || currentFrame.frameSides === '3_side' || currentPocket.frameSides === '3_side'
                          ? '3 SIDES'
                          : '4 SIDES'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const modFrame: UPVCFrame = {
                            ...currentFrame,
                            isThreeSidedFrame: false,
                            frameSides: '4_side',
                          };
                          modFrame.pockets = recalculateFramePockets(modFrame);
                          onUpdateFrame(modFrame);
                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            isThreeSidedFrame: false,
                            frameSides: '4_side',
                          });
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-black flex flex-col items-center justify-center gap-0.5 transition border cursor-pointer ${
                          !(currentFrame.isThreeSidedFrame || currentPocket.isThreeSidedFrame || currentFrame.frameSides === '3_side' || currentPocket.frameSides === '3_side')
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-1 ring-blue-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-bold">4 SIDE FRAME</span>
                        <span className="text-[9px] font-normal opacity-80">{lang === 'hi' ? 'चारों तरफ चौखट' : 'W: 2 Pcs, H: 2 Pcs'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const modFrame: UPVCFrame = {
                            ...currentFrame,
                            isThreeSidedFrame: true,
                            frameSides: '3_side',
                          };
                          modFrame.pockets = recalculateFramePockets(modFrame);
                          onUpdateFrame(modFrame);
                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            isThreeSidedFrame: true,
                            frameSides: '3_side',
                          });
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-black flex flex-col items-center justify-center gap-0.5 transition border cursor-pointer ${
                          currentFrame.isThreeSidedFrame || currentPocket.isThreeSidedFrame || currentFrame.frameSides === '3_side' || currentPocket.frameSides === '3_side'
                            ? 'bg-amber-600 text-white border-amber-400 shadow-md ring-1 ring-amber-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-bold">FRAME 3 SIDE ⭐</span>
                        <span className="text-[9px] font-normal opacity-90">{lang === 'hi' ? 'नीचे चौखट नहीं' : 'W: 1 Pc, H: 2 Pcs'}</span>
                      </button>
                    </div>

                    {(currentFrame.isThreeSidedFrame || currentPocket.isThreeSidedFrame || currentFrame.frameSides === '3_side' || currentPocket.frameSides === '3_side') ? (
                      <div className="p-2.5 bg-amber-950/60 border border-amber-500/50 rounded-lg text-[10px] text-amber-200 space-y-1 font-mono">
                        <div className="font-bold text-amber-300 flex items-center gap-1">
                          <span>✓</span>
                          <span>{lang === 'hi' ? '3-साइड डोर फ्रेम कटिंग नियम लागू:' : '3-Sided Door Cutting Rules Applied:'}</span>
                        </div>
                        <div className="text-white">• Width Frame: FW + 6mm ➔ <span className="text-amber-300 font-bold underline">1 PC ONLY</span> (Top)</div>
                        <div className="text-white">• Height Frame: FH + 3mm ➔ <span className="text-amber-300 font-bold underline">2 PCS</span> (Left/Right)</div>
                        <div className="text-emerald-300">• Bottom Frame: <span className="font-bold">हटा दिया गया (0 PCS)</span></div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">
                        {lang === 'hi'
                          ? 'नोट: 4-साइड में 2 पीस चौड़ाई (W+6) और 2 पीस ऊँचाई (H+6) कटते हैं।'
                          : 'Note: Standard 4-side cuts 2 pcs width (W+6) and 2 pcs height (H+6).'}
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================================= */}
                {/* STEP 1: HANDLE KA OPTION ("USKE PAHLE HANDLE KA OPTION")                   */}
                {/* ========================================================================= */}
                <div className="p-3 bg-slate-900/90 border-2 border-amber-500/60 rounded-xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-extrabold text-sm">🔑</span>
                      <div>
                        <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                          {lang === 'hi' ? '1. हैंडल का विकल्प (HANDLE HARDWARE)' : '1. HANDLE OPTION (हैंडल विकल्प)'}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          {!isCurrentDoor
                            ? (lang === 'hi' ? 'विंडो सैश के 4 आधिकारिक विकल्प' : 'Window Sash: 4 Official Models')
                            : (lang === 'hi' ? 'डोर सैश के 8 आधिकारिक विकल्प' : 'Door Sash: 8 Official Lock Sets')}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                      {!isCurrentDoor ? '4 WINDOW' : '8 DOOR'}
                    </span>
                  </div>

                  {/* Handle Selection Cards */}
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {(!isCurrentDoor ? CASEMENT_WINDOW_HANDLES : CASEMENT_DOOR_HANDLES).map((handleItem, idx) => {
                      const isSelected =
                        currentPocket.handleType === handleItem.id ||
                        currentPocket.handleCode === handleItem.itemCode ||
                        (!currentPocket.handleType && idx === 0);

                      return (
                        <button
                          key={handleItem.id + handleItem.itemCode}
                          type="button"
                          onClick={() => {
                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              handleType: handleItem.id as any,
                              handleCode: handleItem.itemCode,
                              handleHeight: currentPocket.handleHeight ?? (!isCurrentDoor ? Math.round(currentPocket.height / 2) : 1000),
                            });
                          }}
                          className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between gap-2.5 group cursor-pointer ${
                            isSelected
                              ? 'bg-amber-950/50 border-amber-500 shadow-md ring-1 ring-amber-500/80'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1 rounded bg-slate-900 border border-slate-800 shrink-0">
                              <HandleThumbnail
                                type={handleItem.id}
                                color={currentPocket.handleColor || 'silver'}
                                size={38}
                                orientation="right"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-black tracking-tight leading-snug truncate ${
                                isSelected ? 'text-amber-200' : 'text-slate-200 group-hover:text-white'
                              }`}>
                                {handleItem.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono font-extrabold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.2 rounded">
                                  {handleItem.itemCode}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">
                                  {lang === 'hi' ? handleItem.nameHi : handleItem.description}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-700 group-hover:border-slate-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Handle Color & Height Tweaks */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {lang === 'hi' ? 'हैंडल रंग (Finish):' : 'Handle Finish:'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[
                          { id: 'silver', label: 'Silver Chrome', bg: 'bg-slate-300' },
                          { id: 'black', label: 'Matte Black', bg: 'bg-slate-900 border border-slate-700' },
                          { id: 'white', label: 'Pure White', bg: 'bg-white border border-slate-300' },
                          { id: 'gold', label: 'Royal Gold', bg: 'bg-amber-400' },
                        ].map((col) => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() =>
                              onUpdatePocket(currentFrame.id, {
                                ...currentPocket,
                                handleColor: col.id as any,
                              })
                            }
                            className={`w-5 h-5 rounded-full ${col.bg} transition ${
                              (currentPocket.handleColor || 'silver') === col.id
                                ? 'ring-2 ring-blue-400 scale-110'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            title={col.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Handle Height GHH */}
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {lang === 'hi' ? 'हैंडल ऊंचाई GHH (mm):' : 'Handle Height (GHH mm):'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="w-24">
                          <InspectorMathInput
                            value={currentPocket.handleHeight ?? (!isCurrentDoor ? Math.round(currentPocket.height / 2) : 1000)}
                            onChange={(val) => {
                              onUpdatePocket(currentFrame.id, {
                                ...currentPocket,
                                handleHeight: Math.max(80, Math.min(val, currentPocket.height - 80)),
                              });
                            }}
                            min={80}
                            max={currentPocket.height - 80}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-right font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              handleHeight: !isCurrentDoor ? Math.round(currentPocket.height / 2) : 1000,
                            });
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold"
                          title="Reset to default height"
                        >
                          {!isCurrentDoor ? 'Center' : '1000mm'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* STEP 2: SRIES KON SI ("JASE SRIES KON SI")                                 */}
                {/* ========================================================================= */}
                <div className="p-3 bg-slate-900/90 border border-blue-500/40 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-blue-400 font-extrabold text-sm">📐</span>
                      <h3 className="text-xs font-black text-blue-300 uppercase tracking-wider">
                        {lang === 'hi' ? '2. सीरीज़ कौन सी (SERIES SYSTEM)' : '2. SERIES SPECIFICATION (सीरीज़ कौन सी)'}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                      {currentPocket.seriesCode || 'CWH-60'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {CASEMENT_SERIES_OPTIONS.map((series) => {
                      const isSelected =
                        currentPocket.seriesCode === series.code ||
                        (!currentPocket.seriesCode && (currentFrame.series === series.id || series.code === 'CWH-60'));

                      return (
                        <button
                          key={series.id}
                          type="button"
                          onClick={() => {
                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              seriesCode: series.code,
                            });
                            onUpdateFrame({
                              ...currentFrame,
                              series: series.id as any,
                              seriesCode: series.code,
                            });
                          }}
                          className={`p-2 rounded-lg border text-left transition flex items-center justify-between gap-2 group cursor-pointer ${
                            isSelected
                              ? 'bg-blue-950/50 border-blue-500 shadow-xs ring-1 ring-blue-500'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div>
                            <div className={`text-xs font-black truncate ${isSelected ? 'text-blue-200' : 'text-slate-200 group-hover:text-white'}`}>
                              {series.name}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight">
                              {lang === 'hi' ? series.nameHi : series.description}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded">
                              {series.depth}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* STEP 3: USK BAD FRAME ("USK BAD FRAME")                                    */}
                {/* ========================================================================= */}
                <div className="p-3 bg-slate-900/90 border border-emerald-500/40 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-extrabold text-sm">🖼️</span>
                      <h3 className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                        {lang === 'hi' ? '3. फ्रेम प्रोफाइल (FRAME PROFILE)' : '3. FRAME PROFILE (फ्रेम प्रोफाइल)'}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      {currentPocket.frameProfileCode || currentFrame.frameProfileCode || 'CWH 60-01'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {CASEMENT_FRAME_PROFILES.filter((fp) => {
                      if (!fp.application || fp.application === 'both') return true;
                      return isCurrentDoor ? fp.application === 'door' : fp.application === 'window';
                    }).map((frameItem) => {
                      const isSelected =
                        (currentPocket.frameProfileCode || currentFrame.frameProfileCode || 'CWH 60-01') === frameItem.code;

                      return (
                        <button
                          key={frameItem.id}
                          type="button"
                          onClick={() => {
                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              frameProfileCode: frameItem.code,
                            });
                            onUpdateFrame({
                              ...currentFrame,
                              frameProfileCode: frameItem.code,
                            });
                          }}
                          className={`p-2 rounded-lg border text-left transition flex items-center justify-between gap-2 group cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-950/50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div>
                            <div className={`text-xs font-black truncate ${isSelected ? 'text-emerald-200' : 'text-slate-200 group-hover:text-white'}`}>
                              {frameItem.name}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight">
                              {lang === 'hi' ? frameItem.nameHi : frameItem.description}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">
                              {frameItem.code}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* STEP 4: USKE BAD SASH KON SA ("USKE BAD SASH KON SA")                     */}
                {/* ========================================================================= */}
                <div className="p-3 bg-slate-900/90 border border-purple-500/40 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-purple-400 font-extrabold text-sm">🚪</span>
                      <h3 className="text-xs font-black text-purple-300 uppercase tracking-wider">
                        {lang === 'hi' ? '4. सैश कौन सा (SASH PROFILE)' : '4. SASH PROFILE (सैश प्रोफाइल)'}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                      {currentPocket.sashProfileCode || (!isCurrentDoor ? 'CWH 60-03' : 'CWH 60-06')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {(!isCurrentDoor ? CASEMENT_WINDOW_SASH_PROFILES : CASEMENT_DOOR_SASH_PROFILES).map((sashItem) => {
                      const isSelected =
                        (currentPocket.sashProfileCode || (!isCurrentDoor ? 'CWH 60-03' : 'CWH 60-06')) === sashItem.code;

                      return (
                        <button
                          key={sashItem.id}
                          type="button"
                          onClick={() => {
                            const currentType = currentPocket.sashType;
                            const isFixedOrEmpty = !currentType || currentType === 'fixed';
                            const newType = isFixedOrEmpty ? 'casement_left' : currentType;

                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              sashProfileCode: sashItem.code as any,
                              sashType: newType,
                            });
                          }}
                          className={`p-2 rounded-lg border text-left transition flex items-center justify-between gap-2 group cursor-pointer ${
                            isSelected
                              ? 'bg-purple-950/50 border-purple-500 shadow-xs ring-1 ring-purple-500'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div>
                            <div className={`text-xs font-black truncate ${isSelected ? 'text-purple-200' : 'text-slate-200 group-hover:text-white'}`}>
                              {sashItem.name}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight">
                              {lang === 'hi' ? sashItem.nameHi : sashItem.description}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded">
                              {sashItem.code}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* STEP 5: SASH OPENING DIRECTION & SWING                                    */}
                {/* ========================================================================= */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wide">
                    {lang === 'hi' ? 'पल्ला खुलने की दिशा (Opening Direction):' : 'Opening Direction / Swing:'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'casement_left', label: lang === 'hi' ? 'बायां पल्ला (Left)' : 'Casement Left', icon: '◧' },
                      { id: 'casement_right', label: lang === 'hi' ? 'दायां पल्ला (Right)' : 'Casement Right', icon: '◨' },
                      { id: 'top_hung', label: lang === 'hi' ? 'टॉप वेंटिलेटर (Top)' : 'Top Hung / Awning', icon: '⬒' },
                      { id: 'bottom_hung', label: lang === 'hi' ? 'बॉटम वेंटिलेटर (Bottom)' : 'Bottom Hung / Hopper', icon: '⬓' },
                      { id: 'french_open', label: lang === 'hi' ? 'फ्रेंच डबल पल्ला' : 'French Open (Double)', icon: '⧉' },
                      { id: 'tilt_turn', label: lang === 'hi' ? 'टिल्ट एंड टर्न' : 'Tilt & Turn', icon: '↻' },
                    ].map((dir) => (
                      <button
                        key={dir.id}
                        type="button"
                        onClick={() => {
                          let targetHandlePos = currentPocket.handlePosition;
                          if (dir.id === 'casement_left') targetHandlePos = 'left';
                          else if (dir.id === 'casement_right') targetHandlePos = 'right';
                          else if (dir.id === 'top_hung') targetHandlePos = 'bottom';
                          else if (dir.id === 'bottom_hung') targetHandlePos = 'top';

                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            sashType: dir.id as any,
                            handlePosition: targetHandlePos,
                            seriesCode: 'CWH-60',
                            sashProfileCode: currentPocket.sashProfileCode || (currentPocket.applicationType === 'door' ? 'CWH 60-06' : 'CWH 60-03'),
                          });
                        }}
                        className={`p-2 rounded-lg border text-left text-xs font-bold flex items-center gap-2 transition ${
                          currentPocket.sashType === dir.id
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-sm font-black">{dir.icon}</span>
                        <span className="truncate">{dir.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* STEP 5B: IN / OUT OPENING DIRECTION (अंदर / बाहर खुलने का विकल्प)           */}
                {/* ========================================================================= */}
                <div className="p-3 bg-gradient-to-r from-sky-950/60 to-slate-900 border-2 border-sky-500/70 rounded-xl space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sky-400 font-extrabold text-sm">🔄</span>
                      <h3 className="text-xs font-black text-sky-300 uppercase tracking-wider">
                        {lang === 'hi' ? 'खुलने की दिशा (OUT / IN OPENING)' : 'OPENING DIRECTION (OUT / IN)'}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${
                      (currentPocket.openDirection || 'out') === 'in'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                    }`}>
                      {(currentPocket.openDirection || 'out') === 'in' ? 'IN (ठोस लाइन ──)' : 'OUT (डैश लाइन ┄)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* OUT Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          openDirection: 'out',
                        });
                      }}
                      className={`p-2.5 rounded-lg border text-left transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        (currentPocket.openDirection || 'out') === 'out'
                          ? 'bg-sky-600 text-white border-sky-400 shadow-md ring-1 ring-sky-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black">🚪↗</span>
                        <span className="text-xs font-black">OUT (बाहर)</span>
                      </div>
                      <span className="text-[9.5px] opacity-80 leading-none">
                        {lang === 'hi' ? 'डैश लाइन (Dashed ┄)' : 'Dashed Line ┄'}
                      </span>
                    </button>

                    {/* IN Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          openDirection: 'in',
                        });
                      }}
                      className={`p-2.5 rounded-lg border text-left transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        currentPocket.openDirection === 'in'
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-1 ring-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black">🚪↙</span>
                        <span className="text-xs font-black">IN (अंदर)</span>
                      </div>
                      <span className="text-[9.5px] opacity-80 leading-none">
                        {lang === 'hi' ? 'ठोस लाइन (Solid ──)' : 'Solid Line ──'}
                      </span>
                    </button>
                  </div>

                  <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[10px] text-slate-300 space-y-0.5">
                    <div>• <strong className="text-sky-300">OUT (बाहर):</strong> {lang === 'hi' ? 'ड्राइंग में डैश लाइन (---) और ग्लास में [OUT] बैज दिखेगा।' : 'Dashed swing line (---) and [OUT] badge in glass.'}</div>
                    <div>• <strong className="text-blue-300">IN (अंदर):</strong> {lang === 'hi' ? 'ड्राइंग में ठोस लाइन (───) और ग्लास में [IN] बैज दिखेगा।' : 'Solid swing line (───) and [IN] badge in glass.'}</div>
                  </div>
                </div>

                {/* Option to Switch Back to Fixed or Sliding */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowOtherSashTypes(!showOtherSashTypes)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                  >
                    <span>{showOtherSashTypes ? '▼' : '▶'}</span>
                    <span>{lang === 'hi' ? 'अन्य प्रकार (स्लाइडर / फिक्स / जाली में बदलें)' : 'Switch to Other Types (Fixed / Slider / Louver)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sliding Sash Direction & 3-Track Arrows */}
            {(currentFrame?.series?.startsWith('sliding') ||
              currentPocket.sashType?.startsWith('slider') ||
              currentPocket.sashType?.startsWith('mesh') ||
              currentPocket.hasMesh) && (
              <div className="p-3 bg-sky-950/40 border border-sky-500/40 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-sky-300 block uppercase tracking-wide flex items-center gap-1.5">
                    <span>🛤️</span>
                    <span>{lang === 'hi' ? 'स्लाइडिंग पल्ले की दिशा / एरो:' : 'Sliding Arrow Direction:'}</span>
                  </label>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-200 border border-sky-700">
                    {currentPocket.sashType === 'slider_arrow_both'
                      ? '↔ Both Slide'
                      : currentPocket.sashType === 'slider_arrow_right'
                      ? '→ Slide Right'
                      : currentPocket.sashType === 'slider_arrow_left'
                      ? '← Slide Left'
                      : currentPocket.sashType === 'slider_fixed_center'
                      ? '(+) Fixed'
                      : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'slider_arrow_both', label: lang === 'hi' ? '↔ दोनों तरफ (Both)' : '↔ Both Directions', desc: 'दोनों तरफ स्लाइड (All Slide)' },
                    { id: 'slider_arrow_right', label: lang === 'hi' ? '→ दायाँ (Right)' : '→ Slide Right', desc: 'दाईं तरफ स्लाइड' },
                    { id: 'slider_arrow_left', label: lang === 'hi' ? '← बायाँ (Left)' : '← Slide Left', desc: 'बाईं तरफ स्लाइड' },
                    { id: 'slider_fixed_center', label: lang === 'hi' ? '(+) फिक्स (Fixed)' : '(+) Fixed Panel', desc: 'फिक्स काँच (No Slide)' },
                  ].map((arr) => {
                    const isSelected = currentPocket.sashType === arr.id;
                    return (
                      <button
                        key={arr.id}
                        type="button"
                        onClick={() => {
                          const sashCode = currentPocket.sashProfileCode || (isCurrentDoor ? 'SWH 60-05' : 'SWH 60-03');
                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            sashType: arr.id as any,
                            sashProfileCode: sashCode,
                          });
                        }}
                        className={`p-2 rounded-lg border text-left transition flex flex-col gap-0.5 ${
                          isSelected
                            ? 'bg-sky-600/30 border-sky-400 text-sky-200 font-bold ring-1 ring-sky-500'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-black">{arr.label}</span>
                        <span className="text-[9.5px] text-slate-400 leading-tight">{arr.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Center Meeting Lock Toggle ("center lock sabme nahi lagana h") */}
                <div className="pt-2 border-t border-sky-800/40 flex items-center justify-between p-2 bg-slate-900/90 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔒</span>
                    <div>
                      <div className="text-[11px] font-bold text-sky-200">
                        {lang === 'hi' ? 'सेंटर लॉक (बीच का लॉक)' : 'Center Meeting Lock'}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {lang === 'hi' ? 'सबमें नहीं, केवल ज़रूरत पर चालू करें' : 'Optional: enable only when center lock needed'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newLockVal = currentFrame.hasCenterLock === true ? false : true;
                      onUpdateFrame({
                        ...currentFrame,
                        hasCenterLock: newLockVal,
                      });
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      currentFrame.hasCenterLock === true
                        ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <span>{currentFrame.hasCenterLock === true ? '✓ लगा है (ON)' : '✗ नहीं (OFF)'}</span>
                  </button>
                </div>

                {/* 3-Track Frame Quick Multi-Panel Setup */}
                {(currentFrame.pockets.length === 3 || currentFrame.series?.includes('88') || (currentFrame.name || '').toLowerCase().includes('3-track') || (currentFrame.name || '').toLowerCase().includes('3 track')) && (
                  <div className="pt-2 border-t border-sky-800/40 space-y-1.5">
                    <span className="text-[10.5px] font-bold text-sky-300 block">
                      {lang === 'hi' ? '⚡ 3-ट्रैक एरो प्रीसेट (3-Track Presets):' : '⚡ 3-Track Arrow Presets:'}
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentFrame.pockets || currentFrame.pockets.length < 3) return;
                          const p0 = { ...currentFrame.pockets[0], sashType: 'slider_arrow_both' as any, customLabel: 'S1' };
                          const p1 = { ...currentFrame.pockets[1], sashType: 'slider_arrow_both' as any, customLabel: 'S2' };
                          const p2 = { ...currentFrame.pockets[2], sashType: 'slider_arrow_both' as any, customLabel: 'S3' };
                          onUpdateFrame({
                            ...currentFrame,
                            series: 'sliding_88',
                            frameProfileWidth: 88,
                            pockets: [p0, p1, p2, ...currentFrame.pockets.slice(3)],
                          });
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-sky-950/60 border border-slate-700 hover:border-sky-500 rounded-lg text-left text-[11px] text-sky-200 font-semibold flex items-center justify-between transition"
                      >
                        <span>[ S1 ↔ | S2 ↔ | S3 ↔ ] {lang === 'hi' ? 'तीनों स्लाइड (All Slide)' : 'All 3 Slide'}</span>
                        <span className="text-[9px] text-emerald-400 font-black">66% OPEN</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!currentFrame.pockets || currentFrame.pockets.length < 3) return;
                          const p0 = { ...currentFrame.pockets[0], sashType: 'slider_arrow_right' as any, customLabel: 'S1' };
                          const p1 = { ...currentFrame.pockets[1], sashType: 'slider_arrow_both' as any, customLabel: 'S2' };
                          const p2 = { ...currentFrame.pockets[2], sashType: 'slider_arrow_left' as any, customLabel: 'S3' };
                          onUpdateFrame({
                            ...currentFrame,
                            series: 'sliding_88',
                            frameProfileWidth: 88,
                            pockets: [p0, p1, p2, ...currentFrame.pockets.slice(3)],
                          });
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-sky-950/60 border border-slate-700 hover:border-sky-500 rounded-lg text-left text-[11px] text-slate-200 font-semibold flex items-center justify-between transition"
                      >
                        <span>[ S1 → | S2 ↔ | S3 ← ] {lang === 'hi' ? 'स्टैकिंग / मीटिंग' : 'Stacking / Meeting'}</span>
                        <span className="text-[9px] text-sky-400 font-black">STANDARD</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!currentFrame.pockets || currentFrame.pockets.length < 3) return;
                          const p0 = { ...currentFrame.pockets[0], sashType: 'slider_arrow_right' as any, customLabel: 'S1' };
                          const p1 = { ...currentFrame.pockets[1], sashType: 'slider_fixed_center' as any, customLabel: 'S2' };
                          const p2 = { ...currentFrame.pockets[2], sashType: 'slider_arrow_left' as any, customLabel: 'S3' };
                          onUpdateFrame({
                            ...currentFrame,
                            pockets: [p0, p1, p2, ...currentFrame.pockets.slice(3)],
                          });
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-sky-950/60 border border-slate-700 hover:border-sky-500 rounded-lg text-left text-[11px] text-slate-300 font-semibold flex items-center justify-between transition"
                      >
                        <span>[ S1 → | S2 (+) | S3 ← ] {lang === 'hi' ? '2-ट्रैक सेंटर फिक्स (OXO)' : 'Center Fix (OXO)'}</span>
                        <span className="text-[9px] text-amber-400 font-black">OXO</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4-Panel Frame Quick Setup: Side FIX + Center Slide + Center LOCK */}
                {(currentFrame.pockets.length === 4 || (currentFrame.name || '').toLowerCase().includes('4-panel') || (currentFrame.name || '').toLowerCase().includes('4 panel')) && (
                  <div className="pt-2 border-t border-sky-800/40 space-y-1.5">
                    <span className="text-[10.5px] font-bold text-sky-300 block">
                      {lang === 'hi' ? '⚡ 4-पैनल सेटअप (साइड FIX + बीच SLIDE + बीच में LOCK):' : '⚡ 4-Panel Setup (Side FIX + Center SLIDE + Center LOCK):'}
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentFrame.pockets || currentFrame.pockets.length < 4) return;
                          const p0 = { ...currentFrame.pockets[0], sashType: 'slider_fixed_center' as any, customLabel: 'FIX' };
                          const p1 = { ...currentFrame.pockets[1], sashType: 'slider_arrow_right' as any, customLabel: 'S1' };
                          const p2 = { ...currentFrame.pockets[2], sashType: 'slider_arrow_left' as any, customLabel: 'S2' };
                          const p3 = { ...currentFrame.pockets[3], sashType: 'slider_fixed_center' as any, customLabel: 'FIX' };
                          onUpdateFrame({
                            ...currentFrame,
                            hasCenterLock: true,
                            pockets: [p0, p1, p2, p3, ...currentFrame.pockets.slice(4)],
                          });
                        }}
                        className="px-2.5 py-1.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-600 rounded-lg text-left text-[11px] text-sky-200 font-bold flex items-center justify-between transition shadow-sm"
                      >
                        <span>[ FIX | S1 → 🔒 ← S2 | FIX ]</span>
                        <span className="text-[9px] text-emerald-400 font-black">F-S-S-F + 🔒</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!currentFrame.pockets || currentFrame.pockets.length < 4) return;
                          const p0 = { ...currentFrame.pockets[0], sashType: 'slider_arrow_right' as any, customLabel: 'S1' };
                          const p1 = { ...currentFrame.pockets[1], sashType: 'slider_arrow_left' as any, customLabel: 'S2' };
                          const p2 = { ...currentFrame.pockets[2], sashType: 'slider_arrow_right' as any, customLabel: 'S3' };
                          const p3 = { ...currentFrame.pockets[3], sashType: 'slider_arrow_left' as any, customLabel: 'S4' };
                          onUpdateFrame({
                            ...currentFrame,
                            hasCenterLock: false,
                            pockets: [p0, p1, p2, p3, ...currentFrame.pockets.slice(4)],
                          });
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-left text-[11px] text-slate-300 font-semibold flex items-center justify-between transition"
                      >
                        <span>[ S1 → | S2 ← | S3 → | S4 ← ] {lang === 'hi' ? 'चारों स्लाइड' : 'All 4 Slide'}</span>
                        <span className="text-[9px] text-slate-400 font-black">XXXX</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!currentFrame.pockets || currentFrame.pockets.length < 4) return;
                          const p0 = { ...currentFrame.pockets[0], sashType: 'slider_arrow_right' as any, customLabel: 'S1', hasMesh: false };
                          const p1 = { ...currentFrame.pockets[1], sashType: 'slider_arrow_left' as any, customLabel: 'S2', hasMesh: true };
                          const p2 = { ...currentFrame.pockets[2], sashType: 'slider_arrow_right' as any, customLabel: 'S3', hasMesh: true };
                          const p3 = { ...currentFrame.pockets[3], sashType: 'slider_arrow_left' as any, customLabel: 'S4', hasMesh: false };
                          onUpdateFrame({
                            ...currentFrame,
                            name: '6 PANEL 3 TRACK',
                            series: 'sliding_88',
                            frameProfileWidth: 88,
                            hasCenterLock: true,
                            pockets: [p0, p1, p2, p3, ...currentFrame.pockets.slice(4)],
                          });
                        }}
                        className="px-2.5 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/80 rounded-lg text-left text-[11px] text-emerald-200 font-bold flex items-center justify-between transition shadow-sm"
                      >
                        <span>[ S1 → | S2+MS1 ← 🔒 → S3+MS2 | ← S4 ]</span>
                        <span className="text-[9px] text-emerald-400 font-black">6 PANEL 3 TRACK</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 6-Panel Frame Quick Multi-Panel Setup with S2 and S5 Bi-directional and Center Meeting Lock */}
                {(currentFrame.pockets.length === 6 || (currentFrame.pockets.length !== 4 && ((currentFrame.name || '').toLowerCase().includes('6-panel') || (currentFrame.name || '').toLowerCase().includes('6 panel')))) && (
                  <div className="pt-2 border-t border-sky-800/40 space-y-1.5">
                    <span className="text-[10.5px] font-bold text-sky-300 block">
                      {lang === 'hi' ? '⚡ 6-पैनल एरो व सेंटर लॉक (6-Panel S2 & S5 ↔):' : '⚡ 6-Panel Arrow & Center Lock Setup:'}
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentFrame.pockets || currentFrame.pockets.length < 6) return;
                          const p0 = { ...currentFrame.pockets[0], sashType: 'slider_arrow_right' as any, customLabel: 'S1' };
                          const p1 = { ...currentFrame.pockets[1], sashType: 'slider_arrow_both' as any, customLabel: 'S2' };
                          const p2 = { ...currentFrame.pockets[2], sashType: 'slider_arrow_left' as any, customLabel: 'S3' };
                          const p3 = { ...currentFrame.pockets[3], sashType: 'slider_arrow_right' as any, customLabel: 'S4' };
                          const p4 = { ...currentFrame.pockets[4], sashType: 'slider_arrow_both' as any, customLabel: 'S5' };
                          const p5 = { ...currentFrame.pockets[5], sashType: 'slider_arrow_left' as any, customLabel: 'S6' };
                          onUpdateFrame({
                            ...currentFrame,
                            hasCenterLock: true,
                            series: 'sliding_88',
                            frameProfileWidth: 88,
                            pockets: [p0, p1, p2, p3, p4, p5, ...currentFrame.pockets.slice(6)],
                          });
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-sky-950/60 border border-slate-700 hover:border-sky-500 rounded-lg text-left text-[11px] text-sky-200 font-semibold flex items-center justify-between transition"
                      >
                        <span>[ S1 → | S2 ↔ | S3 ← 🔒 S4 → | S5 ↔ | S6 ← ]</span>
                        <span className="text-[9px] text-sky-400 font-black">2 & 5 ↔ + 🔒</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!currentFrame.pockets || currentFrame.pockets.length < 6) return;
                          const p0 = { ...currentFrame.pockets[0], sashType: 'slider_arrow_right' as any, customLabel: 'S1' };
                          const p1 = { ...currentFrame.pockets[1], sashType: 'slider_arrow_both' as any, customLabel: 'S2' };
                          const p2 = { ...currentFrame.pockets[2], sashType: 'slider_arrow_left' as any, customLabel: 'S3' };
                          const p3 = { ...currentFrame.pockets[3], sashType: 'slider_arrow_right' as any, customLabel: 'S4' };
                          const p4 = { ...currentFrame.pockets[4], sashType: 'slider_arrow_both' as any, customLabel: 'S5' };
                          const p5 = { ...currentFrame.pockets[5], sashType: 'slider_arrow_left' as any, customLabel: 'S6' };
                          onUpdateFrame({
                            ...currentFrame,
                            hasCenterLock: false,
                            series: 'sliding_88',
                            frameProfileWidth: 88,
                            pockets: [p0, p1, p2, p3, p4, p5, ...currentFrame.pockets.slice(6)],
                          });
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-sky-950/60 border border-slate-700 hover:border-sky-500 rounded-lg text-left text-[11px] text-slate-200 font-semibold flex items-center justify-between transition"
                      >
                        <span>[ S1 → | S2 ↔ | S3 ← | S4 → | S5 ↔ | S6 ← ]</span>
                        <span className="text-[9px] text-slate-400 font-black">बिना सेंटर लॉक (NO LOCK)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!currentFrame.pockets || currentFrame.pockets.length < 6) return;
                          const newPockets = currentFrame.pockets.map((p, idx) => ({
                            ...p,
                            sashType: 'slider_arrow_both' as any,
                            customLabel: `S${idx + 1}`,
                          }));
                          onUpdateFrame({
                            ...currentFrame,
                            series: 'sliding_88',
                            frameProfileWidth: 88,
                            pockets: newPockets,
                          });
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-sky-950/60 border border-slate-700 hover:border-sky-500 rounded-lg text-left text-[11px] text-slate-300 font-semibold flex items-center justify-between transition"
                      >
                        <span>[ S1 ↔ | S2 ↔ | S3 ↔ | S4 ↔ | S5 ↔ | S6 ↔ ] {lang === 'hi' ? 'सभी 6 स्लाइड' : 'All 6 Slide'}</span>
                        <span className="text-[9px] text-emerald-400 font-black">ALL ↔</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Standard Sash Type Selector (Visible when NOT casement or when user expands other types) */}
            {(!isCasement || showOtherSashTypes) && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-wide">
                  {lang === 'hi' ? 'पल्ला / डिज़ाइन प्रकार (Sash Type):' : 'Sash / Opening Type:'}
                </label>

                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {SASH_TYPES.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        let sashCode = currentPocket.sashProfileCode;
                        const isSlidingType = st.id.startsWith('slider') || st.id.startsWith('mesh_slider') || st.id === 'mesh_sash';
                        const isCasementType = st.id.startsWith('casement') || st.id === 'top_hung' || st.id === 'bottom_hung' || st.id === 'french_open' || st.id === 'tilt_turn' || st.id === 'open_vent';
                        
                        if (isSlidingType && (!sashCode || sashCode.startsWith('CWH'))) {
                          sashCode = isCurrentDoor ? 'SWH 60-05' : (st.id === 'mesh_sash' ? 'SWH 60-14' : 'SWH 60-03');
                        } else if (isCasementType && (!sashCode || sashCode.startsWith('SWH'))) {
                          sashCode = isCurrentDoor ? 'CWH 60-06' : 'CWH 60-03';
                        }

                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          sashType: st.id,
                          sashProfileCode: sashCode,
                        });
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                        currentPocket.sashType === st.id
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <span>{lang === 'hi' ? st.nameHindi : st.name}</span>
                      {currentPocket.sashType === st.id && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Glass Type Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-wide">
                {lang === 'hi' ? 'काँच का प्रकार (Glass Specification):' : 'Glass Type:'}
              </label>
              <select
                value={currentPocket.glassType}
                onChange={(e) =>
                  onUpdatePocket(currentFrame.id, {
                    ...currentPocket,
                    glassType: e.target.value as GlassType,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {GLASS_TYPES.map((gt) => (
                  <option key={gt.id} value={gt.id}>
                    {lang === 'hi' ? gt.nameHindi : gt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ========================================================================= */}
            {/* GEORGIAN / DORGEN BAR DESIGNER (डोरगन बार / जॉर्जियन ग्रिड बार)          */}
            {/* ========================================================================= */}
            <div className="p-3.5 bg-slate-900/95 border-2 border-amber-500/70 rounded-2xl space-y-3.5 shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                    <Grid className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      {lang === 'hi' ? 'डोरगन बार / जॉर्जियन ग्रिड' : 'Georgian / Dorgen Bar'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {lang === 'hi' ? 'काँच के अंदर या ऊपर सजावटी ग्रिड बार' : 'Decorative internal/surface glass grid bars'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border ${
                    currentPocket.gridPattern && currentPocket.gridPattern !== 'none'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {currentPocket.gridPattern && currentPocket.gridPattern !== 'none'
                    ? (lang === 'hi' ? 'सक्रिय (ON)' : 'ACTIVE')
                    : (lang === 'hi' ? 'सादा (OFF)' : 'NONE')}
                </span>
              </div>

              {/* Grid Patterns - 9 Visual Presets */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                  {lang === 'hi' ? 'पैटर्न मॉडल चुनें (Grid Pattern):' : 'Select Grid Pattern:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'None (सादा)', desc: 'No Grid Bar', icon: '🪟' },
                    { id: 'georgian_2x2', label: '2 × 2 Grid', desc: '1 Vert + 1 Horiz (4 Panes)', icon: '✛' },
                    { id: 'georgian_2x3', label: '2 × 3 Grid', desc: '1 Vert + 2 Horiz (6 Panes)', icon: '☷' },
                    { id: 'georgian_3x2', label: '3 × 2 Grid', desc: '2 Vert + 1 Horiz (6 Panes)', icon: '▥' },
                    { id: 'georgian_3x3', label: '3 × 3 Grid', desc: '2 Vert + 2 Horiz (9 Panes)', icon: '▦' },
                    { id: 'georgian_3x4', label: '3 × 4 Grid', desc: '2 Vert + 3 Horiz (12 Panes)', icon: '🪟' },
                    { id: 'georgian_prairie', label: 'Colonial / Prairie', desc: 'Perimeter Border (बॉर्डर)', icon: '▣' },
                    { id: 'georgian_diamond', label: 'Diamond Lattice', desc: '45° Argyle (डायमंड लैटिस)', icon: '❖' },
                    { id: 'custom', label: 'Custom (कस्टम)', desc: 'User Rows × Columns', icon: '⚙️' },
                  ].map((patt) => {
                    const isSel = currentPocket.gridPattern === patt.id;
                    return (
                      <button
                        key={patt.id}
                        type="button"
                        onClick={() => {
                          const newConfig: GeorgianBarConfig = {
                            enabled: patt.id !== 'none',
                            pattern: patt.id as GridPattern,
                            color: currentPocket.georgianBar?.color || 'gold',
                            barWidth: currentPocket.georgianBar?.barWidth || 18,
                            style: currentPocket.georgianBar?.style || 'internal',
                            cols: currentPocket.georgianBar?.cols || (patt.id === 'georgian_3x3' ? 3 : 2),
                            rows: currentPocket.georgianBar?.rows || (patt.id === 'georgian_3x3' ? 3 : 2),
                          };
                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            gridPattern: patt.id as GridPattern,
                            georgianBar: newConfig,
                          });
                        }}
                        className={`p-2 rounded-xl border text-left transition flex items-start gap-2 cursor-pointer ${
                          isSel
                            ? 'bg-amber-600/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/40'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <span className="text-base leading-none select-none">{patt.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[11px] font-black truncate ${isSel ? 'text-amber-300' : 'text-slate-200'}`}>
                            {patt.label}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate leading-tight">
                            {patt.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail settings if pattern !== 'none' */}
              {currentPocket.gridPattern && currentPocket.gridPattern !== 'none' && (
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  {/* Custom Rows & Cols if custom */}
                  {currentPocket.gridPattern === 'custom' && (
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-[10px] font-black text-amber-300 uppercase">
                        {lang === 'hi' ? 'कस्टम खाने / विभाजन (Columns & Rows):' : 'Custom Columns & Rows:'}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9.5px] text-slate-400 block mb-1">
                            {lang === 'hi' ? 'खड़े कॉलम (Vertical Cols):' : 'Vertical Cols:'}
                          </label>
                          <select
                            value={currentPocket.georgianBar?.cols || 2}
                            onChange={(e) => {
                              const cols = Number(e.target.value);
                              const cur = currentPocket.georgianBar || { enabled: true, pattern: 'custom' };
                              onUpdatePocket(currentFrame.id, {
                                ...currentPocket,
                                georgianBar: { ...cur, cols },
                              });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                          >
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n}>{n} {n === 1 ? 'Col' : 'Cols'}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9.5px] text-slate-400 block mb-1">
                            {lang === 'hi' ? 'आड़ी पंक्तियाँ (Horizontal Rows):' : 'Horizontal Rows:'}
                          </label>
                          <select
                            value={currentPocket.georgianBar?.rows || 2}
                            onChange={(e) => {
                              const rows = Number(e.target.value);
                              const cur = currentPocket.georgianBar || { enabled: true, pattern: 'custom' };
                              onUpdatePocket(currentFrame.id, {
                                ...currentPocket,
                                georgianBar: { ...cur, rows },
                              });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                          >
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n}>{n} {n === 1 ? 'Row' : 'Rows'}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bar Color / Finish Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                      {lang === 'hi' ? 'ग्रिड बार का रंग / फिनिश (Bar Finish):' : 'Bar Finish / Color:'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'gold', name: 'गोल्डन (Gold Brass)', swatch: 'bg-linear-to-r from-amber-400 to-yellow-500' },
                        { id: 'white', name: 'सफेद (Pure White)', swatch: 'bg-white' },
                        { id: 'black', name: 'ब्लैक (Matt Black)', swatch: 'bg-zinc-900 border border-zinc-600' },
                        { id: 'silver', name: 'सिल्वर (Alu Silver)', swatch: 'bg-slate-300' },
                        { id: 'bronze', name: 'ब्रॉन्ज (Bronze)', swatch: 'bg-amber-900' },
                        { id: 'match_frame', name: 'फ्रेम मैच (Frame Color)', swatch: 'bg-slate-600' },
                      ].map((c) => {
                        const isColorSel = (currentPocket.georgianBar?.color || 'gold') === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const cur = currentPocket.georgianBar || { enabled: true, pattern: currentPocket.gridPattern || 'georgian_2x2' };
                              onUpdatePocket(currentFrame.id, {
                                ...currentPocket,
                                georgianBar: { ...cur, color: c.id as GeorgianBarColor },
                              });
                            }}
                            className={`p-1.5 rounded-lg border text-left transition flex items-center gap-1.5 cursor-pointer ${
                              isColorSel
                                ? 'bg-amber-600/20 border-amber-500 text-white font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className={`w-3 h-3 rounded-full shrink-0 shadow-xs ${c.swatch}`} />
                            <span className="text-[9.5px] truncate">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bar Width (Thickness in mm) */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                      {lang === 'hi' ? 'बार की चौड़ाई (Profile Face Width):' : 'Bar Face Width:'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { width: 18, label: '18 mm (Slim)', desc: 'स्लिम बार' },
                        { width: 25, label: '25 mm (Std)', desc: 'मानक बार' },
                        { width: 45, label: '45 mm (Heavy)', desc: 'चौड़ा बार' },
                      ].map((w) => {
                        const isWidthSel = (currentPocket.georgianBar?.barWidth || 18) === w.width;
                        return (
                          <button
                            key={w.width}
                            type="button"
                            onClick={() => {
                              const cur = currentPocket.georgianBar || { enabled: true, pattern: currentPocket.gridPattern || 'georgian_2x2' };
                              onUpdatePocket(currentFrame.id, {
                                ...currentPocket,
                                georgianBar: { ...cur, barWidth: w.width },
                              });
                            }}
                            className={`p-1.5 text-center rounded-lg border transition cursor-pointer ${
                              isWidthSel
                                ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="text-[10.5px] font-black">{w.label}</div>
                            <div className="text-[8.5px] text-slate-500">{w.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mounting Style */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                      {lang === 'hi' ? 'माउंटिंग प्रकार (Mounting Style):' : 'Mounting Style:'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'internal', label: '🛡️ Internal (DGU के अंदर)', desc: 'धूल-रहित सीलबंद (Zero Dust)' },
                        { id: 'surface_astragal', label: '🪟 Surface (बाहरी एस्ट्रगल)', desc: 'ग्लास पर चिपका हुआ' },
                      ].map((st) => {
                        const isStyleSel = (currentPocket.georgianBar?.style || 'internal') === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              const cur = currentPocket.georgianBar || { enabled: true, pattern: currentPocket.gridPattern || 'georgian_2x2' };
                              onUpdatePocket(currentFrame.id, {
                                ...currentPocket,
                                georgianBar: { ...cur, style: st.id as GeorgianBarStyle },
                              });
                            }}
                            className={`p-1.5 text-left rounded-lg border transition cursor-pointer ${
                              isStyleSel
                                ? 'bg-amber-600/20 border-amber-500 text-white font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="text-[10px] font-bold">{st.label}</div>
                            <div className="text-[8.5px] text-slate-500">{st.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons: Apply to All in Frame / Clear */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = currentPocket.georgianBar || {
                          enabled: true,
                          pattern: currentPocket.gridPattern || 'georgian_2x2',
                          color: 'gold',
                          barWidth: 18,
                        };
                        const updatedPockets = (currentFrame.pockets || []).map((p) => ({
                          ...p,
                          gridPattern: cur.pattern,
                          georgianBar: { ...cur },
                        }));
                        onUpdateFrame({
                          ...currentFrame,
                          pockets: updatedPockets,
                          georgianBar: { ...cur },
                        });
                      }}
                      className="flex-1 py-1.5 px-2 bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-[10.5px] font-black transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>{lang === 'hi' ? 'पूरे फ्रेम के सभी ग्लास में लगाएं' : 'Apply to All Panes in Frame'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          gridPattern: 'none',
                          georgianBar: { enabled: false, pattern: 'none' },
                        });
                      }}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[10.5px] font-bold transition active:scale-95 cursor-pointer"
                      title={lang === 'hi' ? 'डोरगन बार हटाएं' : 'Remove Bar'}
                    >
                      {lang === 'hi' ? 'हटाएं' : 'Clear'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mosquito Mesh Option */}
            <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <div>
                <div className="font-semibold text-slate-200 text-xs">
                  {lang === 'hi' ? 'मच्छर जाली (SS Mesh)' : 'Mosquito SS Flyscreen'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {lang === 'hi' ? 'स्टेनलेस स्टील 304 जाली जोड़ें' : 'Add insect screen mesh to bay'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={!!currentPocket.hasMesh}
                onChange={(e) =>
                  onUpdatePocket(currentFrame.id, { ...currentPocket, hasMesh: e.target.checked })
                }
                className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
              />
            </div>

            {/* Special Section Accessories (Fan, AC Louver, Security Grill, Key Lock) */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5">
              <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                <span>{lang === 'hi' ? 'विशेष एक्सेसरीज़ एवं प्रावधान' : 'Special Provisions & Accessories'}</span>
              </div>

              {/* Exhaust Fan Cutout System */}
              <div className="pt-1.5 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fan className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold text-cyan-200 block">
                        {lang === 'hi' ? 'एग्जॉस्ट फैन प्रोविज़न (Fan Cutout)' : 'Exhaust Fan Provision'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {lang === 'hi' ? 'रिंग, ब्लेड्स व वाशर के साथ' : 'Circular hole with mounting ring'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!currentPocket.hasFanCutout || currentPocket.sashType === 'fan_provision'}
                    onChange={(e) =>
                      onUpdatePocket(currentFrame.id, {
                        ...currentPocket,
                        hasFanCutout: e.target.checked,
                        fanCutoutDiameter: currentPocket.fanCutoutDiameter || 200,
                        fanPanelType: currentPocket.fanPanelType || 'glass_hole',
                        sashType: e.target.checked && currentPocket.sashType === 'fixed' ? 'fan_provision' : currentPocket.sashType,
                      })
                    }
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700"
                  />
                </div>

                {(currentPocket.hasFanCutout || currentPocket.sashType === 'fan_provision') && (
                  <div className="mt-2.5 p-2 bg-slate-950/80 rounded-lg border border-cyan-900/50 space-y-2">
                    {/* Diameter Selection */}
                    <div>
                      <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide block mb-1">
                        {lang === 'hi' ? 'फैन कटआउट व्यास (Diameter):' : 'Fan Cutout Diameter:'}
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { dia: 150, label: '150mm', sub: '6"' },
                          { dia: 200, label: '200mm', sub: '8" Std' },
                          { dia: 250, label: '250mm', sub: '10"' },
                          { dia: 300, label: '300mm', sub: '12"' },
                        ].map(({ dia, label, sub }) => {
                          const isSel = (currentPocket.fanCutoutDiameter || 200) === dia;
                          return (
                            <button
                              key={dia}
                              type="button"
                              onClick={() =>
                                onUpdatePocket(currentFrame.id, {
                                  ...currentPocket,
                                  hasFanCutout: true,
                                  fanCutoutDiameter: dia as any,
                                })
                              }
                              className={`py-1 px-1 rounded text-center transition border ${
                                isSel
                                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <div className="text-[10px] leading-tight font-mono">{label}</div>
                              <div className="text-[8px] text-cyan-400/80">{sub}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Panel Base Type */}
                    <div>
                      <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide block mb-1">
                        {lang === 'hi' ? 'फैन बेस टाइप (Panel Type):' : 'Fan Mounting Base:'}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'glass_hole', label: 'Glass Hole', labelHi: 'काँच में होल' },
                          { id: 'pvc_sheet', label: 'uPVC Sheet', labelHi: 'सॉलिड शीट' },
                          { id: 'louver_hole', label: 'Louver Slat', labelHi: 'हवादार जाली' },
                        ].map((opt) => {
                          const curType = currentPocket.fanPanelType || 'glass_hole';
                          const isSel = curType === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                onUpdatePocket(currentFrame.id, {
                                  ...currentPocket,
                                  hasFanCutout: true,
                                  fanPanelType: opt.id as any,
                                })
                              }
                              className={`py-1 px-1 rounded text-center text-[9px] font-medium transition border ${
                                isSel
                                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {lang === 'hi' ? opt.labelHi : opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fan Horizontal Position (Left, Center, Right) */}
                    <div>
                      <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide block mb-1">
                        {lang === 'hi' ? 'फैन की स्थिति (Position / जगह):' : 'Fan Position (Left / Center / Right):'}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'left', label: 'Left', labelHi: 'बाएं (Left)', icon: '⬅️' },
                          { id: 'center', label: 'Center', labelHi: 'बीच में (Center)', icon: '⏺️' },
                          { id: 'right', label: 'Right', labelHi: 'दाएं (Right)', icon: '➡️' },
                        ].map((pos) => {
                          const curPos = currentPocket.fanHorizontalAlign || 'center';
                          const isSel = curPos === pos.id;
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() =>
                                onUpdatePocket(currentFrame.id, {
                                  ...currentPocket,
                                  hasFanCutout: true,
                                  fanHorizontalAlign: pos.id as any,
                                })
                              }
                              className={`py-1.5 px-1 rounded text-center text-[10px] font-semibold transition border flex flex-col items-center justify-center gap-0.5 ${
                                isSel
                                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100 font-bold shadow-xs'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span className="text-xs">{pos.icon}</span>
                              <span className="text-[9px]">{lang === 'hi' ? pos.labelHi : pos.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {onAddFanVent && (
                      <button
                        type="button"
                        onClick={() => onAddFanVent(currentFrame.id, currentPocket.id)}
                        className="w-full mt-1 py-1.5 px-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <Fan className="w-3.5 h-3.5" />
                        <span>{lang === 'hi' ? '+ ऊपर 350mm अलग ट्रांसॉम बनाएं' : '+ Split Top 350mm Fan Bay'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Window AC / Louver Provision System */}
              <div className="pt-1.5 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-emerald-200 block">
                        {lang === 'hi' ? 'विंडो AC व लूवर प्रोविज़न' : 'Window AC / Louver Provision'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {lang === 'hi' ? 'केसिंग बॉक्स, लूवर ग्रिल या इंसुलेटेड शीट' : 'Box casing, ventilation slats, or ACP'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!currentPocket.hasACLouver || currentPocket.sashType === 'ac_provision' || currentPocket.sashType === 'louver'}
                    onChange={(e) =>
                      onUpdatePocket(currentFrame.id, {
                        ...currentPocket,
                        hasACLouver: e.target.checked,
                        acUnitType: currentPocket.acUnitType || 'box_cutout',
                        sashType: e.target.checked && currentPocket.sashType === 'fixed' ? 'ac_provision' : currentPocket.sashType,
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
                  />
                </div>

                {(currentPocket.hasACLouver || currentPocket.sashType === 'ac_provision' || currentPocket.sashType === 'louver') && (
                  <div className="mt-2.5 p-2 bg-slate-950/80 rounded-lg border border-emerald-900/50 space-y-2">
                    {/* AC Style Selection */}
                    <div>
                      <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide block mb-1">
                        {lang === 'hi' ? 'AC स्टाइल / प्रकार:' : 'AC Unit Casing Style:'}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'box_cutout', label: 'AC Casing', labelHi: 'विंडो AC बॉक्स' },
                          { id: 'louver', label: 'Louver Grill', labelHi: 'लूवर ग्रिल' },
                          { id: 'insulated_panel', label: 'ACP Panel', labelHi: 'इंसुलेटेड शीट' },
                        ].map((opt) => {
                          const curType = currentPocket.acUnitType || 'box_cutout';
                          const isSel = curType === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                onUpdatePocket(currentFrame.id, {
                                  ...currentPocket,
                                  hasACLouver: true,
                                  acUnitType: opt.id as any,
                                })
                              }
                              className={`py-1 px-1 rounded text-center text-[9px] font-medium transition border ${
                                isSel
                                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {lang === 'hi' ? opt.labelHi : opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {onAddACSection && (
                      <button
                        type="button"
                        onClick={() => onAddACSection(currentFrame.id, currentPocket.id)}
                        className="w-full mt-1 py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <Wind className="w-3.5 h-3.5" />
                        <span>{lang === 'hi' ? '+ नीचे 450mm अलग AC सेक्शन बनाएं' : '+ Split Bottom 450mm AC Bay'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* FAN / AC NAME CHANGE TOOL (नाम बदलें टूल) */}
              {(currentPocket.hasFanCutout ||
                currentPocket.sashType === 'fan_provision' ||
                currentPocket.hasACLouver ||
                currentPocket.sashType === 'ac_provision' ||
                currentPocket.sashType === 'louver') && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lang === 'hi' ? 'FAN / AC नाम बदलें (Name Tool)' : 'Fan / AC Name Change Tool'}</span>
                    </label>
                    {currentPocket.customLabel && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            customLabel: undefined,
                          })
                        }
                        className="text-[9px] text-amber-400/80 hover:text-red-400 transition underline font-medium"
                      >
                        {lang === 'hi' ? 'रीसेट' : 'Reset'}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={currentPocket.customLabel || ''}
                      placeholder={
                        currentPocket.hasFanCutout || currentPocket.sashType === 'fan_provision'
                          ? lang === 'hi' ? 'उदा. EXHAUST FAN, KITCHEN...' : 'e.g. EXHAUST FAN, KITCHEN...'
                          : lang === 'hi' ? 'उदा. WINDOW AC, 1.5 TON AC...' : 'e.g. WINDOW AC, 1.5 TON AC...'
                      }
                      onChange={(e) =>
                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          customLabel: e.target.value,
                        })
                      }
                      className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-amber-500/50 rounded-lg text-xs text-amber-200 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-medium"
                    />
                  </div>
                  {/* Quick Preset Name Chips */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {(currentPocket.hasFanCutout || currentPocket.sashType === 'fan_provision'
                      ? ['EXHAUST FAN', 'KITCHEN FAN', 'BATH VENT', '8" FAN', 'LOUVER FAN']
                      : ['WINDOW AC', '1.5 TON AC', 'VOLTAS AC', 'BEDROOM AC', 'AC SLEEVE']
                    ).map((presetName) => (
                      <button
                        key={presetName}
                        type="button"
                        onClick={() =>
                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            customLabel: presetName,
                          })
                        }
                        className={`px-1.5 py-0.5 text-[9px] rounded font-mono transition border ${
                          currentPocket.customLabel === presetName
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-500/30'
                        }`}
                      >
                        {presetName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Key Lock */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs text-slate-300">
                    {lang === 'hi' ? 'सिक्योरिटी की लॉक (Key)' : 'Security Key Lock'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={!!currentPocket.hasKeyLock}
                  onChange={(e) =>
                    onUpdatePocket(currentFrame.id, {
                      ...currentPocket,
                      hasKeyLock: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-purple-500 bg-slate-800 border-slate-700"
                />
              </div>

              {/* Security Grill */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs text-slate-300">
                    {lang === 'hi' ? 'आंतरिक सुरक्षा ग्रिल' : 'Security Grill'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={!!currentPocket.hasGrill}
                  onChange={(e) =>
                    onUpdatePocket(currentFrame.id, {
                      ...currentPocket,
                      hasGrill: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            {/* SLIDING SYSTEM HARDWARE & FABRICATION SPECIFICATION PANEL */}
            {isSlider && (
              <div className="space-y-3.5 animate-in fade-in">
                {/* 0. Classification Toggle: Window vs Door */}
                <div className="p-3 bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span>🛠️</span>
                      <span>{lang === 'hi' ? 'स्लाइडिंग प्रकार (WINDOW / DOOR)' : 'SLIDING APPLICATION TYPE'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {isCurrentDoor ? (lang === 'hi' ? '🚪 स्लाइडिंग डोर मोड' : '🚪 Sliding Door Mode') : (lang === 'hi' ? '🪟 स्लाइडिंग विंडो मोड' : '🪟 Sliding Window Mode')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          applicationType: 'window',
                          hasMesh: false,
                          handleHeight: Math.round(currentPocket.height / 2),
                          handleType: 'espag_key',
                          handleCode: 'UPVC-HW-SCEHKEY',
                          sashProfileCode: 'SWH 60-04',
                        });
                      }}
                      className={`py-2 px-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition border ${
                        !isCurrentDoor && !isMeshSash
                          ? 'bg-amber-600 text-white border-amber-400 shadow-md ring-1 ring-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>🪟</span>
                      <span className="truncate">{lang === 'hi' ? 'विंडो सैश' : 'Window'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          applicationType: 'door',
                          hasMesh: false,
                          handleHeight: 1000,
                          handleType: 'espag_no_key',
                          handleCode: 'UPVC-HW-SCEHWK',
                          sashProfileCode: 'SWH 60-06',
                        });
                      }}
                      className={`py-2 px-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition border ${
                        isCurrentDoor && !isMeshSash
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-1 ring-emerald-400'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>🚪</span>
                      <span className="truncate">{lang === 'hi' ? 'डोर सैश' : 'Door'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePocket(currentFrame.id, {
                          ...currentPocket,
                          hasMesh: true,
                          sashType: currentPocket.sashType === 'fixed' ? 'mesh_slider_right' : currentPocket.sashType,
                          handleHeight: Math.round(currentPocket.height / 2),
                          handleType: 'c_handle',
                          handleCode: 'UPVC-HW-SCH',
                          sashProfileCode: 'SWH 60-03',
                        });
                      }}
                      className={`py-2 px-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition border ${
                        isMeshSash
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-md ring-1 ring-cyan-400'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span>🦟</span>
                      <span className="truncate">{lang === 'hi' ? 'फ्लाई मेश' : 'Fly Mesh'}</span>
                    </button>
                  </div>
                </div>

                {/* 1. HANDLE HARDWARE SELECTION */}
                <div className="p-3 bg-slate-900/90 border-2 border-amber-500/60 rounded-xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-extrabold text-sm">🔑</span>
                      <div>
                        <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                          {lang === 'hi' ? '1. हैंडल का विकल्प (HANDLE HARDWARE)' : '1. HANDLE OPTION (हैंडल विकल्प)'}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          {isMeshSash
                            ? (lang === 'hi' ? 'फ्लाई मेश पल्ला (जाली) — 7 आधिकारिक विकल्प' : 'Fly Mesh Insect Screen Sash — 7 Official Hardware Options')
                            : !isCurrentDoor
                            ? (lang === 'hi' ? 'विंडो सैश के 5 आधिकारिक विकल्प' : 'Window Sash: 5 Official Hardware Options')
                            : (lang === 'hi' ? 'डोर सैश के 9 आधिकारिक विकल्प' : 'Door Sash: 9 Official Lock & Pull Sets')}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                      {isMeshSash ? 'FLY MESH' : (!isCurrentDoor ? 'WINDOW' : 'DOOR')}
                    </span>
                  </div>

                  {/* Handle Cards */}
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {(isMeshSash
                      ? SLIDING_MESH_HANDLES
                      : !isCurrentDoor
                      ? SLIDING_WINDOW_HANDLES
                      : SLIDING_DOOR_HANDLES
                    ).map((handleItem, idx) => {
                      const isSelected =
                        currentPocket.handleType === handleItem.id ||
                        currentPocket.handleCode === handleItem.itemCode ||
                        (!currentPocket.handleType && idx === 0);

                      return (
                        <button
                          key={handleItem.id + handleItem.itemCode}
                          type="button"
                          onClick={() => {
                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              handleType: handleItem.id as any,
                              handleCode: handleItem.itemCode,
                              handleHeight: currentPocket.handleHeight ?? (!isCurrentDoor ? Math.round(currentPocket.height / 2) : 1000),
                            });
                          }}
                          className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between gap-2.5 group cursor-pointer ${
                            isSelected
                              ? 'bg-amber-950/50 border-amber-500 shadow-md ring-1 ring-amber-500/80'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1 rounded bg-slate-900 border border-slate-800 shrink-0">
                              <HandleThumbnail
                                type={handleItem.thumbnailType || handleItem.id}
                                color={currentPocket.handleColor || 'silver'}
                                size={38}
                                orientation="right"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-black tracking-tight leading-snug truncate ${
                                isSelected ? 'text-amber-200' : 'text-slate-200 group-hover:text-white'
                              }`}>
                                {handleItem.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono font-extrabold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.2 rounded">
                                  {handleItem.itemCode}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">
                                  {lang === 'hi' ? handleItem.nameHi : handleItem.description}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-700 group-hover:border-slate-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Handle Finish & Height GHH */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {lang === 'hi' ? 'हैंडल रंग (Finish):' : 'Handle Finish:'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[
                          { id: 'silver', label: 'Silver Chrome', bg: 'bg-slate-300' },
                          { id: 'black', label: 'Matte Black', bg: 'bg-slate-900 border border-slate-700' },
                          { id: 'white', label: 'Pure White', bg: 'bg-white border border-slate-300' },
                          { id: 'gold', label: 'Royal Gold', bg: 'bg-amber-400' },
                        ].map((col) => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() =>
                              onUpdatePocket(currentFrame.id, {
                                ...currentPocket,
                                handleColor: col.id as any,
                              })
                            }
                            className={`w-5 h-5 rounded-full ${col.bg} transition ${
                              (currentPocket.handleColor || 'silver') === col.id
                                ? 'ring-2 ring-amber-400 scale-110'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            title={col.label}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {lang === 'hi' ? 'हैंडल ऊंचाई GHH (mm):' : 'Handle Height (GHH mm):'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="w-24">
                          <InspectorMathInput
                            value={currentPocket.handleHeight ?? (!isCurrentDoor ? Math.round(currentPocket.height / 2) : 1000)}
                            onChange={(val) => {
                              onUpdatePocket(currentFrame.id, {
                                ...currentPocket,
                                handleHeight: Math.max(80, Math.min(val, currentPocket.height - 80)),
                              });
                            }}
                            min={80}
                            max={currentPocket.height - 80}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-right font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              handleHeight: !isCurrentDoor ? Math.round(currentPocket.height / 2) : 1000,
                            });
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold"
                        >
                          {!isCurrentDoor ? 'Center' : '1000mm'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SASH PROFILE CODE & SPECIFICATIONS */}
                <div className="p-3 bg-slate-900/90 border border-amber-500/40 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-extrabold text-sm">🪟</span>
                      <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                        {lang === 'hi' ? '2. सैश प्रोफाइल (SASH PROFILE)' : '2. SASH PROFILE SPECIFICATION'}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                      {currentPocket.sashProfileCode || (isMeshSash ? 'SWH 60-03' : (!isCurrentDoor ? 'SWH 60-04' : 'SWH 60-06'))}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { code: 'SWH 60-04', name: 'SLD SASH 42MM X 66MM', steel: 'SRI 60-04-1.5MM (-128mm)', desc: 'Standard / Heavy Window', door: false },
                      { code: 'SWH 60-03', name: 'SLD SASH 42MM X 57MM', steel: 'SRI 60-03-1.5MM (-110mm)', desc: 'Slim Window / Mesh Sash', door: false },
                      { code: 'SWH 60-05', name: 'SLD DOOR SASH 42MM X 75MM', steel: 'SRI 85-02-1.5MM (-150mm)', desc: 'Balcony Sliding Door', door: true },
                      { code: 'SWH 60-06', name: 'SLD DOOR SASH 42MM X 88MM', steel: 'SRI 60-06-2.0MM (-172mm)', desc: 'Super Heavy Door Sash', door: true },
                    ].map((sashProf) => {
                      const isSel = (currentPocket.sashProfileCode || (isCurrentDoor ? 'SWH 60-06' : (isMeshSash ? 'SWH 60-03' : 'SWH 60-04'))) === sashProf.code;

                      return (
                        <button
                          key={sashProf.code}
                          type="button"
                          onClick={() => {
                            const currentType = currentPocket.sashType;
                            const isFixedOrEmpty = !currentType || currentType === 'fixed';
                            const newType = isFixedOrEmpty
                              ? (isMeshSash ? 'mesh_slider_right' : 'slider_arrow_right')
                              : currentType;

                            let sW = 66;
                            if (sashProf.code === 'SWH 60-03') sW = 57;
                            else if (sashProf.code === 'SWH 60-05') sW = 75;
                            else if (sashProf.code === 'SWH 60-06') sW = 88;

                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              sashProfileCode: sashProf.code,
                              sashType: newType,
                              applicationType: sashProf.door ? 'door' : 'window',
                              handleType: sashProf.door ? 'sliding_d_pull' : (isMeshSash ? 'c_handle' : 'espag_key'),
                              handleCode: sashProf.door ? 'UPVC-HW-SDH' : (isMeshSash ? 'UPVC-HW-SCH' : 'UPVC-HW-SCEHKEY'),
                            });

                            if (onUpdateFrame) {
                              onUpdateFrame({
                                ...currentFrame,
                                sashProfileCode: sashProf.code,
                                sashProfileWidth: sW,
                              });
                            }
                          }}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition ${
                            isSel
                              ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/80 text-amber-200'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              <span className="font-mono text-amber-400 bg-amber-950/80 px-1 rounded">{sashProf.code}</span>
                              <span>{sashProf.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {lang === 'hi' ? 'स्टील RI:' : 'Steel RI:'} <span className="font-mono text-amber-300">{sashProf.steel}</span> • {sashProf.desc}
                            </div>
                          </div>
                          {isSel && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. AUTOMATIC HARDWARE & REINFORCEMENT LIVE SUMMARY CARD */}
                <div className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl space-y-2 text-[11px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <span>⚙️</span>
                      <span>{lang === 'hi' ? 'ऑटोमैटिक हार्डवेयर व RI सूची' : 'PAIRED HARDWARE & RI (लाइव)'}</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">100% FACTORY READY</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-400">
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">रोलर्स (ROLLERS):</span>
                      <div className="font-mono text-slate-200 font-bold">
                        {isMeshSash
                          ? 'UPVC-HW-SW (Single Wheel Flat)'
                          : isCurrentDoor
                          ? 'UPVC-HW-DWAG (Double Wheel Adjustable)'
                          : 'UPVC-HW-SWG (Single Wheel Grooved)'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">एस्पैग / लॉक (LOCKING):</span>
                      <div className="font-mono text-slate-200 font-bold">
                        {isCurrentDoor
                          ? '1800mm Door Espag + Cylinder'
                          : currentPocket.height <= 1500
                          ? '1200mm 7.5BS Espag (6 Strikers)'
                          : '1400mm 7.5BS Espag (8 Strikers)'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">स्टील RI (STEEL DEDUCTION):</span>
                      <div className="font-mono text-amber-300 font-bold">
                        {currentPocket.sashProfileCode === 'SWH 60-06' || isCurrentDoor
                          ? 'Sash Cut - 172mm'
                          : currentPocket.sashProfileCode === 'SWH 60-03'
                          ? 'Sash Cut - 110mm'
                          : 'Sash Cut - 128mm'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">गाइड रेल व एक्सेसरीज़:</span>
                      <div className="font-mono text-slate-200 font-bold">
                        DURON-GR + Bump Stopper + Sealing Bridge
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hardware Handle Configuration (For Other Non-Casement Non-Sliding Types) */}
            {currentPocket.sashType !== 'fixed' && currentPocket.sashType !== 'louver' && !isCasement && !isSlider && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3.5">
                {/* Header with Live Status & Gallery Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-bold text-slate-200 text-xs">
                      {lang === 'hi' ? 'हैंडल प्रकार व डिज़ाइन' : 'Handle Hardware & Design'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsHandleModalOpen(true)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold bg-blue-950/60 hover:bg-blue-900/60 px-2 py-0.5 rounded-md border border-blue-800/60 transition flex items-center gap-1"
                  >
                    <span>{lang === 'hi' ? '🔍 सभी मॉडल' : '🔍 All Models'}</span>
                  </button>
                </div>

                {/* Filter Tabs for Handle Types */}
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  {[
                    { id: 'all', label: lang === 'hi' ? 'सभी' : 'All' },
                    { id: 'casement', label: lang === 'hi' ? 'कैसमेंट' : 'Casement' },
                    { id: 'sliding', label: lang === 'hi' ? 'स्लाइडर' : 'Sliding' },
                    { id: 'door', label: lang === 'hi' ? 'दरवाजा' : 'Door' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setHandleFilterTab(tab.id as any)}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${
                        handleFilterTab === tab.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Visual Handle Image Grid */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                    {lang === 'hi' ? 'हैंडल चुनें (क्लिक करें):' : 'Select Handle Model (Click):'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {HANDLE_OPTIONS.filter((h) => {
                      if (handleFilterTab === 'all') return true;
                      return h.category === handleFilterTab;
                    }).map((handle) => {
                      const isSel = (currentPocket.handleType || 'casement_espag') === handle.id;
                      const isDoor =
                        currentPocket.height >= 1600 ||
                        currentPocket.applicationType === 'door' ||
                        currentFrame.series === 'door_premium' ||
                        currentFrame.name.toLowerCase().includes('door') ||
                        handle.id.includes('door_lever');
                      const defaultGHH = isDoor ? 1000 : Math.round(currentPocket.height / 2);

                      return (
                        <button
                          key={handle.id}
                          type="button"
                          onClick={() => {
                            const matchedSpec =
                              CASEMENT_WINDOW_HANDLES.find((s) => s.id === handle.id) ||
                              CASEMENT_DOOR_HANDLES.find((s) => s.id === handle.id) ||
                              SLIDING_WINDOW_HANDLES.find((s) => s.id === handle.id) ||
                              SLIDING_DOOR_HANDLES.find((s) => s.id === handle.id) ||
                              SLIDING_MESH_HANDLES.find((s) => s.id === handle.id);
                            const itemCode = handle.itemCode || matchedSpec?.itemCode || '';
                            const handleName = handle.name || matchedSpec?.name || '';
                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              handleType: handle.id as any,
                              handleCode: itemCode,
                              handleName: handleName,
                              handleHeight: currentPocket.handleHeight ?? defaultGHH,
                            });
                          }}
                          className={`relative p-1.5 rounded-lg border text-left transition-all flex flex-col items-center gap-1 group ${
                            isSel
                              ? 'border-blue-500 bg-blue-950/50 shadow-xs ring-1 ring-blue-500'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          {isSel && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                          <div className="p-0.5 rounded bg-slate-900/80 border border-slate-800/80 group-hover:border-slate-700">
                            <HandleThumbnail
                              type={handle.id}
                              color={currentPocket.handleColor || 'silver'}
                              size={52}
                              orientation="right"
                            />
                          </div>
                          <span className={`text-[10px] font-bold text-center leading-tight line-clamp-1 w-full ${
                            isSel ? 'text-blue-300' : 'text-slate-300 group-hover:text-white'
                          }`}>
                            {lang === 'hi' ? handle.nameHi.split('(')[0].trim() : handle.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Handle Stile Position (Auto / Left / Right) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                    {lang === 'hi' ? 'हैंडल की स्थिति (Handle Stile):' : 'Handle Stile / Side:'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      {
                        id: 'auto',
                        label:
                          currentPocket.sashType.startsWith('slider') || currentPocket.sashType.startsWith('mesh_slider')
                            ? lang === 'hi'
                              ? 'ऑटो (फ्रेम साइड)'
                              : 'Auto (Frame)'
                            : lang === 'hi'
                            ? 'स्वचालित (Auto)'
                            : 'Auto',
                      },
                      { id: 'left', label: lang === 'hi' ? 'बायां (Left)' : 'Left Stile' },
                      { id: 'right', label: lang === 'hi' ? 'दायां (Right)' : 'Right Stile' },
                    ].map((pos) => {
                      const currentPos = currentPocket.handlePosition || 'auto';
                      const isSel = currentPos === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => {
                            let newSashType = currentPocket.sashType;
                            if (pos.id === 'left' && currentPocket.sashType === 'casement_right') {
                              newSashType = 'casement_left';
                            } else if (pos.id === 'right' && currentPocket.sashType === 'casement_left') {
                              newSashType = 'casement_right';
                            }
                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              sashType: newSashType,
                              handlePosition: pos.id as any,
                            });
                          }}
                          className={`py-1.5 px-2 rounded-lg text-center text-[10px] font-bold transition border ${
                            isSel
                              ? 'border-blue-500 bg-blue-950/50 text-blue-300 shadow-xs ring-1 ring-blue-500/50'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {pos.label}
                        </button>
                      );
                    })}
                  </div>
                  {(currentPocket.sashType.startsWith('slider') || currentPocket.sashType.startsWith('mesh_slider')) && (
                    <p className="mt-1 text-[9px] text-cyan-400/90 leading-tight">
                      {lang === 'hi'
                        ? 'स्लाइडिंग हैंडल स्वचालित रूप से बाहरी फ्रेम (जैम) की तरफ माउंट होता है।'
                        : 'Sliding handle automatically mounts towards the outer frame jamb.'}
                    </p>
                  )}
                </div>

                {/* Handle Finish / Color */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                    {lang === 'hi' ? 'हैंडल का रंग (Handle Finish):' : 'Handle Finish:'}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'silver', label: 'Silver', bg: 'bg-slate-300', text: 'text-slate-900' },
                      { id: 'black', label: 'Black', bg: 'bg-slate-900 border border-slate-600', text: 'text-white' },
                      { id: 'white', label: 'White', bg: 'bg-white', text: 'text-slate-900' },
                      { id: 'gold', label: 'Gold', bg: 'bg-amber-400', text: 'text-slate-950' },
                    ].map((col) => {
                      const isSel = (currentPocket.handleColor || 'silver') === col.id;
                      return (
                        <button
                          key={col.id}
                          onClick={() =>
                            onUpdatePocket(currentFrame.id, {
                              ...currentPocket,
                              handleColor: col.id as any,
                            })
                          }
                          className={`py-1.5 px-1 rounded-lg text-center text-[10px] font-bold transition flex flex-col items-center gap-1 border ${
                            isSel
                              ? 'border-blue-500 bg-blue-950/40 text-blue-300'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${col.bg} shadow-xs`} />
                          <span>{col.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* GHH Handle Height in mm with Quick Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      {lang === 'hi' ? 'हैंडल ऊँचाई GHH (mm):' : 'Handle Height GHH (mm):'}
                    </label>
                    <div className="flex items-center gap-1 text-[9px]">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            handleHeight: Math.round(currentPocket.height / 2),
                          })
                        }
                        title={lang === 'hi' ? 'खिड़की के बीचो-बीच रखें' : 'Center in window'}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        {lang === 'hi' ? 'मध्य (Center)' : 'Center'} ({Math.round(currentPocket.height / 2)})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            handleHeight: 1000,
                          })
                        }
                        title={lang === 'hi' ? 'मानक दरवाजा ऊँचाई 1000mm' : 'Standard door 1000mm'}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        1000 {lang === 'hi' ? '(दरवाजा)' : '(Door)'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <InspectorMathInput
                        value={
                          currentPocket.handleHeight ??
                          (currentPocket.sashType.startsWith('slider') || currentPocket.sashType.startsWith('mesh_slider') || currentPocket.sashType === 'mesh_sash'
                            ? Math.round(currentPocket.height / 2)
                            : (isCurrentDoor ? 1000 : Math.round(currentPocket.height / 2)))
                        }
                        onChange={(val) =>
                          onUpdatePocket(currentFrame.id, {
                            ...currentPocket,
                            handleHeight: Math.max(80, Math.min(val, currentPocket.height - 80)),
                          })
                        }
                        min={80}
                        max={currentPocket.height - 80}
                        placeholder="GHH (mm)"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">mm</span>
                  </div>
                </div>

                {/* Sash Tag / Label (S1, S2, etc.) */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wide">
                    {lang === 'hi' ? 'पल्ला टैग (Sash Code):' : 'Sash Code / Tag:'}
                  </label>
                  <input
                    type="text"
                    value={currentPocket.sashLabel || currentPocket.customLabel || ''}
                    placeholder="e.g. S1, S2, M1"
                    onChange={(e) =>
                      onUpdatePocket(currentFrame.id, {
                        ...currentPocket,
                        sashLabel: e.target.value,
                        customLabel: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. MULLION SELECTED */}
        {isMullionSelected && currentMullion && currentFrame && (() => {
          const isVert = currentMullion.orientation === 'vertical';
          const fpw = currentFrame.frameProfileWidth || 60;
          const curWidth = currentMullion.width || currentFrame.mullionProfileWidth || 74;
          const isPartial = currentMullion.spanStart !== undefined && currentMullion.spanEnd !== undefined;

          // Mullion ordering and identification
          const sameOrientMullions = (currentFrame.mullions || [])
            .filter((m) => m.orientation === currentMullion.orientation)
            .sort((a, b) => a.position - b.position);
          const mullionIndex = sameOrientMullions.findIndex((m) => m.id === currentMullion.id) + 1;
          const totalSameOrient = sameOrientMullions.length;
          const tag = isVert ? `M${mullionIndex}` : `T${mullionIndex}`;

          // Factory Fabrication Cut Size
          const cutLength = isPartial
            ? Math.round(currentMullion.spanEnd! - currentMullion.spanStart! + 4)
            : isVert
            ? Math.round(currentFrame.height - 2 * fpw + 4)
            : Math.round(currentFrame.width - 2 * fpw + 4);

          // Steel Reinforcement Size (-100mm)
          const steelLength = Math.max(50, cutLength - 100);

          return (
            <div className="space-y-4 animate-in fade-in">
              {/* Identification Header */}
              <div className="p-3.5 bg-gradient-to-r from-blue-950/60 to-slate-900 border-2 border-blue-500/50 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-blue-400 font-bold text-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center font-mono font-black text-white text-xs">
                      {tag}
                    </div>
                    <div>
                      <div className="text-white font-extrabold text-sm flex items-center gap-2">
                        <span>
                          {isVert
                            ? lang === 'hi' ? `खड़ा मुलियन [${tag}]` : `Vertical Mullion [${tag}]`
                            : lang === 'hi' ? `आड़ा ट्रांसॉम [${tag}]` : `Horizontal Transom [${tag}]`}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-600 text-[10px] font-mono text-white font-bold">
                          {totalSameOrient > 1 ? `${tag} (${mullionIndex}/${totalSameOrient})` : tag}
                        </span>
                      </div>
                      <div className="text-[11px] text-blue-300 font-medium">
                        {isPartial
                          ? lang === 'hi' ? 'सब-मुलियन (T-जॉइंट इन पॉकेट)' : 'Sub-Mullion (T-Joint in Pocket)'
                          : lang === 'hi' ? 'फुल फ्रेम मुलियन' : 'Full Frame Mullion'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-blue-500/20 flex items-center justify-between text-[11px] text-slate-300">
                  <span>{lang === 'hi' ? 'फ्रेम साइज:' : 'Frame Size:'}</span>
                  <span className="font-mono font-bold text-white">
                    {currentFrame.width} × {currentFrame.height} mm
                  </span>
                </div>
              </div>

              {/* Profile Specifications & Profile Width Selector */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>{lang === 'hi' ? 'मुलियन प्रोफाइल विवरण (Profile Specs):' : 'Profile Specification:'}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-mono font-bold text-[11px]">
                    {curWidth} mm
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>{lang === 'hi' ? 'प्रोफाइल सीरीज:' : 'Series:'}</span>
                    <span className="text-white font-medium capitalize">{currentFrame.series} Series (60mm Depth)</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{lang === 'hi' ? 'प्रोफाइल प्रकार:' : 'Profile Type:'}</span>
                    <span className="text-blue-300 font-semibold">
                      {curWidth <= 20
                        ? 'Sliding Interlock Profile'
                        : `${curWidth}mm Standard T-Mullion`}
                    </span>
                  </div>
                </div>

                {/* Profile Width Switcher */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wide">
                    {lang === 'hi' ? 'प्रोफाइल चौड़ाई बदलें (Profile Width):' : 'Change Profile Width:'}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[60, 74, 82, 92].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          onUpdateMullion(currentFrame.id, {
                            ...currentMullion,
                            width: w,
                          });
                        }}
                        className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold border transition text-center ${
                          curWidth === w
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {w}mm
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Manufacturing Cutting Size & Steel Reinforcement Details */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span>📐</span>
                    <span>{lang === 'hi' ? 'फैक्ट्री कटिंग व सरिया विवरण' : 'Cutting & Reinforcement'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">90° Square Cut</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium mb-0.5">
                      {lang === 'hi' ? 'मुलियन कट साइज:' : 'Mullion Cut Length:'}
                    </div>
                    <div className="text-base font-extrabold text-blue-400 font-mono">
                      {cutLength} mm
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1">
                      {isVert
                        ? `H(${currentFrame.height}) - 2×${fpw} + 4mm cleat`
                        : `W(${currentFrame.width}) - 2×${fpw} + 4mm cleat`}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium mb-0.5">
                      {lang === 'hi' ? 'GI सरिया कट साइज:' : 'Steel Reinforcement:'}
                    </div>
                    <div className="text-base font-extrabold text-emerald-400 font-mono">
                      {steelLength} mm
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1">
                      कट साइज - 100mm (90° Cut)
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span className="text-blue-400 font-bold">✓</span>
                  <span>
                    {lang === 'hi'
                      ? 'क्लैट जोड़: UPVC-HW-MC मैकेनिकल क्लैट + 4 एसएस स्क्रू'
                      : 'Joint: Mechanical Cleat Joint (UPVC-HW-MC) with SS Screws'}
                  </span>
                </div>
              </div>

              {/* Mullion Position Dual-Side Inputs (Total Dimension Conserved) */}
              <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] font-bold">
                  <span className="text-slate-400">
                    {isVert
                      ? lang === 'hi' ? '🔒 कुल चौड़ाई (Total Width)' : '🔒 Total Frame Width'
                      : lang === 'hi' ? '🔒 कुल ऊँचाई (Total Height)' : '🔒 Total Frame Height'}
                  </span>
                  <span className="font-mono text-blue-400 font-bold">
                    {isVert ? currentFrame.width : currentFrame.height} mm (फिक्स)
                  </span>
                </div>

                {!isVert ? (
                  <>
                    {/* Top Portion Input */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                        <span className="flex items-center gap-1 text-blue-400">
                          <span>⬆</span>
                          <span>{lang === 'hi' ? 'ऊपरी हिस्सा (Top Height):' : 'Top Portion Height:'}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {[-50, -10, 10, 50].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => {
                                const newPos = Math.max(60, Math.min(currentFrame.height - 60, currentMullion.position + delta));
                                onUpdateMullion(currentFrame.id, { ...currentMullion, position: newPos });
                              }}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-blue-600/30 hover:text-blue-300 text-slate-400 rounded text-[10px] font-mono"
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <InspectorMathInput
                            value={currentMullion.position}
                            onChange={(val) => {
                              const newPos = Math.max(60, Math.min(currentFrame.height - 60, val));
                              onUpdateMullion(currentFrame.id, { ...currentMullion, position: newPos });
                            }}
                            min={60}
                            max={currentFrame.height - 60}
                            placeholder="उपर से दूरी (mm)"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <span className="text-slate-400 font-mono text-xs">mm</span>
                      </div>
                    </div>

                    {/* Bottom Portion Input */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span>⬇</span>
                          <span>{lang === 'hi' ? 'निचला हिस्सा (Bottom Height):' : 'Bottom Portion Height:'}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {[-50, -10, 10, 50].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => {
                                const curBot = currentFrame.height - currentMullion.position;
                                const newBot = Math.max(60, Math.min(currentFrame.height - 60, curBot + delta));
                                onUpdateMullion(currentFrame.id, { ...currentMullion, position: currentFrame.height - newBot });
                              }}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-400 rounded text-[10px] font-mono"
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <InspectorMathInput
                            value={currentFrame.height - currentMullion.position}
                            onChange={(val) => {
                              const clampedBot = Math.max(60, Math.min(currentFrame.height - 60, val));
                              onUpdateMullion(currentFrame.id, { ...currentMullion, position: currentFrame.height - clampedBot });
                            }}
                            min={60}
                            max={currentFrame.height - 60}
                            placeholder="नीचे से दूरी (mm)"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <span className="text-slate-400 font-mono text-xs">mm</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Left Portion Input */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                        <span className="flex items-center gap-1 text-blue-400">
                          <span>⬅</span>
                          <span>{lang === 'hi' ? 'बायाँ हिस्सा (Left Width):' : 'Left Portion Width:'}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {[-50, -10, 10, 50].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => {
                                const newPos = Math.max(60, Math.min(currentFrame.width - 60, currentMullion.position + delta));
                                onUpdateMullion(currentFrame.id, { ...currentMullion, position: newPos });
                              }}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-blue-600/30 hover:text-blue-300 text-slate-400 rounded text-[10px] font-mono"
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <InspectorMathInput
                            value={currentMullion.position}
                            onChange={(val) => {
                              const newPos = Math.max(60, Math.min(currentFrame.width - 60, val));
                              onUpdateMullion(currentFrame.id, { ...currentMullion, position: newPos });
                            }}
                            min={60}
                            max={currentFrame.width - 60}
                            placeholder="बाएँ से दूरी (mm)"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <span className="text-slate-400 font-mono text-xs">mm</span>
                      </div>
                    </div>

                    {/* Right Portion Input */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span>➔</span>
                          <span>{lang === 'hi' ? 'दायाँ हिस्सा (Right Width):' : 'Right Portion Width:'}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {[-50, -10, 10, 50].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => {
                                const curRight = currentFrame.width - currentMullion.position;
                                const newRight = Math.max(60, Math.min(currentFrame.width - 60, curRight + delta));
                                onUpdateMullion(currentFrame.id, { ...currentMullion, position: currentFrame.width - newRight });
                              }}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-400 rounded text-[10px] font-mono"
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <InspectorMathInput
                            value={currentFrame.width - currentMullion.position}
                            onChange={(val) => {
                              const clampedRight = Math.max(60, Math.min(currentFrame.width - 60, val));
                              onUpdateMullion(currentFrame.id, { ...currentMullion, position: currentFrame.width - clampedRight });
                            }}
                            min={60}
                            max={currentFrame.width - 60}
                            placeholder="दाएँ से दूरी (mm)"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <span className="text-slate-400 font-mono text-xs">mm</span>
                      </div>
                    </div>
                  </>
                )}

                <p className="text-[10px] text-slate-400 leading-tight pt-1">
                  {lang === 'hi'
                    ? '💡 कुल साइज उतना ही रहेगा — जिस हिस्से का माप कम करेंगे, दूसरी साइड का खुद बढ़ जाएगा।'
                    : 'Total frame size is conserved. Decreasing one side automatically increases the other.'}
                </p>
              </div>

              {/* Quick Actions & Equalize Bays */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wide">
                  {lang === 'hi' ? 'त्वरित एक्शन (Quick Actions):' : 'Quick Actions:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateMullion(currentFrame.id, {
                        ...currentMullion,
                        position: Math.round(
                          (isVert ? currentFrame.width : currentFrame.height) / 2
                        ),
                      })
                    }
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center font-bold text-xs text-blue-400 transition"
                  >
                    Center (50:50)
                  </button>

                  <button
                    type="button"
                    onClick={() => onEqualizeFrameMullions(currentFrame.id)}
                    className="p-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-xl text-center font-bold text-xs text-blue-300 transition"
                  >
                    {lang === 'hi' ? 'सभी खाने बराबर करें' : 'Equalize All Bays'}
                  </button>
                </div>
              </div>

              {/* Delete Mullion Action */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onDeleteMullion(currentFrame.id, currentMullion.id)}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold transition text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'यह मुलियन हटाएं (Delete)' : 'Delete This Mullion'}</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* 3. COUPLING SELECTED */}
        {isCouplingSelected && currentCoupling && (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Split className="w-4 h-4" />
                <span>
                  {lang === 'hi' ? 'कप्लिंग जोड़ (2mm Coupling Joint)' : 'Coupler Connection (2mm)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {lang === 'hi'
                  ? 'दोनों फ्रेम पूरी तरह स्वतंत्र हैं और 2mm के गैप से जुड़े हैं। किसी भी फ्रेम का साइज अपनी मर्जी से घटाएं/बढ़ाएं।'
                  : 'Frames are completely independent with a standard 2mm expansion gap. Each frame can be resized in any direction.'}
              </p>
            </div>

            {/* 1. Coupler Type Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                {lang === 'hi' ? 'कप्लिंग का प्रकार (Coupler Type):' : 'Coupler Profile Type:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'flat_2mm', label: '2mm Flat (सीधा)', sub: '180° Flat Coupler' },
                  { id: 'variable_bay_pole', label: '📐 Variable Angle (मोड़)', sub: 'कस्टम डिग्री मोड़' },
                  { id: 'corner_90', label: '90° Corner (कॉर्नर)', sub: 'एल-कॉर्नर 90°' },
                  { id: 'corner_135', label: '135° Bay (बे-विंडो)', sub: 'फिक्स्ड 135°' },
                  { id: 'box_profile', label: '50mm Heavy Box', sub: 'हैवी बॉक्स प्रोफाइल' },
                ].map((ct) => {
                  const isActive = (currentCoupling.couplerType || 'flat_2mm') === ct.id;
                  return (
                    <button
                      key={ct.id}
                      onClick={() => {
                        let newAngle = currentCoupling.angle;
                        if (ct.id === 'corner_90') newAngle = 90;
                        else if (ct.id === 'corner_135') newAngle = 135;
                        else if (ct.id === 'variable_bay_pole') newAngle = currentCoupling.angle || 135;
                        else if (ct.id === 'flat_2mm') newAngle = 180;

                        onUpdateCoupling({
                          ...currentCoupling,
                          couplerType: ct.id as any,
                          angle: newAngle,
                          couplerWidth: ct.id === 'box_profile' ? 50 : 2,
                        });
                      }}
                      className={`p-2 rounded-xl border text-left transition flex flex-col ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs">{ct.label}</span>
                      <span className="text-[10px] text-slate-500">{ct.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Coupling Bend Angle Input (एंगल डाल सके कि वो कितना मुड़ेगा) */}
            {(() => {
              const effectiveAngle = currentCoupling.angle ?? (
                currentCoupling.couplerType === 'corner_90'
                  ? 90
                  : currentCoupling.couplerType === 'corner_135'
                  ? 135
                  : currentCoupling.couplerType === 'variable_bay_pole'
                  ? 135
                  : 180
              );
              const bendDir = currentCoupling.bendDirection || 'inward';

              return (
                <div className="p-3 bg-slate-900/90 border border-amber-500/40 rounded-xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                      <span>📐</span>
                      <span>{lang === 'hi' ? 'कप्लिंग का मोड़ एंगल (Bend Angle):' : 'Coupling Bend Angle:'}</span>
                    </label>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs">
                      {effectiveAngle}°
                    </span>
                  </div>

                  {/* Degree Input + Quick +/- buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCoupling({
                          ...currentCoupling,
                          couplerType: currentCoupling.couplerType === 'flat_2mm' ? 'variable_bay_pole' : currentCoupling.couplerType,
                          angle: Math.max(30, effectiveAngle - 5),
                        })
                      }
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono font-bold text-xs border border-slate-700 active:scale-95 transition"
                    >
                      -5°
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="30"
                        max="180"
                        step="1"
                        value={effectiveAngle}
                        onChange={(e) => {
                          const val = Math.min(180, Math.max(30, parseInt(e.target.value, 10) || 135));
                          onUpdateCoupling({
                            ...currentCoupling,
                            couplerType: currentCoupling.couplerType === 'flat_2mm' ? 'variable_bay_pole' : currentCoupling.couplerType,
                            angle: val,
                          });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-3 top-2 text-slate-400 font-mono font-bold text-xs pointer-events-none">
                        ° Degree
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCoupling({
                          ...currentCoupling,
                          couplerType: currentCoupling.couplerType === 'flat_2mm' ? 'variable_bay_pole' : currentCoupling.couplerType,
                          angle: Math.min(180, effectiveAngle + 5),
                        })
                      }
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono font-bold text-xs border border-slate-700 active:scale-95 transition"
                    >
                      +5°
                    </button>
                  </div>

                  {/* Range Slider */}
                  <div>
                    <input
                      type="range"
                      min="45"
                      max="180"
                      step="1"
                      value={effectiveAngle}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        onUpdateCoupling({
                          ...currentCoupling,
                          couplerType: currentCoupling.couplerType === 'flat_2mm' ? 'variable_bay_pole' : currentCoupling.couplerType,
                          angle: val,
                        });
                      }}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>45° (तीखा मोड़)</span>
                      <span>90° (L)</span>
                      <span>135° (बे-विंडो)</span>
                      <span>180° (सीधा)</span>
                    </div>
                  </div>

                  {/* Quick Degree Preset Buttons */}
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {[
                      { deg: 90, label: '90° L' },
                      { deg: 120, label: '120°' },
                      { deg: 135, label: '135° Bay' },
                      { deg: 150, label: '150°' },
                      { deg: 180, label: '180° Flat' },
                    ].map((p) => (
                      <button
                        key={p.deg}
                        type="button"
                        onClick={() =>
                          onUpdateCoupling({
                            ...currentCoupling,
                            couplerType: p.deg === 180 ? 'flat_2mm' : p.deg === 90 ? 'corner_90' : p.deg === 135 ? 'corner_135' : 'variable_bay_pole',
                            angle: p.deg,
                          })
                        }
                        className={`py-1.5 px-1 text-center rounded-lg border text-[10px] font-mono font-bold transition ${
                          effectiveAngle === p.deg
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Bend Direction (अंदर या बाहर मोड़) */}
                  <div className="pt-2 border-t border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase">
                      {lang === 'hi' ? 'मोड़ की दिशा (Bend Direction):' : 'Bend Direction:'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCoupling({
                            ...currentCoupling,
                            bendDirection: 'inward',
                          })
                        }
                        className={`py-1.5 px-2 text-center rounded-lg border text-[11px] font-medium transition flex items-center justify-center gap-1.5 ${
                          bendDir === 'inward'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        <span>↩</span>
                        <span>{lang === 'hi' ? 'अंदर की ओर (Inward)' : 'Inward Bend'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCoupling({
                            ...currentCoupling,
                            bendDirection: 'outward',
                          })
                        }
                        className={`py-1.5 px-2 text-center rounded-lg border text-[11px] font-medium transition flex items-center justify-center gap-1.5 ${
                          bendDir === 'outward'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        <span>↪</span>
                        <span>{lang === 'hi' ? 'बाहर की ओर (Outward)' : 'Outward Bend'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Visual Angle Arc Schematic */}
                  <div className="bg-slate-950 rounded-lg p-2 flex items-center justify-center border border-slate-800">
                    <svg viewBox="0 0 160 80" className="w-40 h-20">
                      {(() => {
                        const rad = ((180 - effectiveAngle) * Math.PI) / 180;
                        const armLen = 50;
                        const cx = 80;
                        const cy = 60;
                        // Arm 1 (left)
                        const x1 = cx - armLen;
                        const y1 = cy;
                        // Arm 2 (right turned by angle)
                        const x2 = cx + armLen * Math.cos(rad);
                        const y2 = cy - armLen * Math.sin(rad);

                        return (
                          <>
                            {/* Grid / baseline */}
                            <line x1="20" y1={cy} x2="140" y2={cy} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                            {/* Arm 1 (Left Frame) */}
                            <line x1={x1} y1={y1} x2={cx} y2={cy} stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
                            {/* Arm 2 (Right Frame at angle) */}
                            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
                            {/* Bay Pole Joint Pin */}
                            <circle cx={cx} cy={cy} r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                            {/* Angle Arc */}
                            <path
                              d={`M ${cx - 16} ${cy} A 16 16 0 0 ${bendDir === 'outward' ? '0' : '1'} ${cx + 16 * Math.cos(rad)} ${cy - 16 * Math.sin(rad)}`}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="1.5"
                              strokeDasharray="2 1"
                            />
                            {/* Angle Text */}
                            <text x={cx} y={cy - 20} fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                              {effectiveAngle}°
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {lang === 'hi'
                      ? '💡 यह एंगल तय करता है कि दोनों फ्रेम कितने डिग्री पर मुड़ेंगे (जैसे 90° कॉर्नर या 135° बे-विंडो)। 2D CAD कैनवास में भी यह रियल-टाइम मुड़ा हुआ दिखेगा।'
                      : '💡 This angle sets how much the coupled frames turn relative to each other (e.g. 90° corner or 135° bay window). Bends in 2D CAD automatically.'}
                  </p>
                </div>
              );
            })()}

            {/* Coupling Gap input */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                {lang === 'hi' ? 'कप्लिंग गैप (Coupling Gap in mm):' : 'Coupler Expansion Gap (mm):'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={currentCoupling.gap}
                  onChange={(e) =>
                    onUpdateCoupling({
                      ...currentCoupling,
                      gap: Math.max(1, parseInt(e.target.value, 10) || 2),
                    })
                  }
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-mono font-bold text-emerald-400">mm (Std: 2mm)</span>
              </div>
            </div>

            {/* Vertical Alignment */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                {lang === 'hi' ? 'फ्रेम अलाइनमेंट (Vertical Alignment):' : 'Alignment:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bottom', label: 'Bottom (फर्श से)' },
                  { id: 'center', label: 'Center (बीच में)' },
                  { id: 'top', label: 'Top (ऊपर से)' },
                ].map((al) => (
                  <button
                    key={al.id}
                    onClick={() =>
                      onUpdateCoupling({
                        ...currentCoupling,
                        alignment: al.id as any,
                      })
                    }
                    className={`py-2 px-1 text-center rounded-lg border text-[11px] font-medium transition ${
                      currentCoupling.alignment === al.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {al.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-Align All Coupled Frames */}
            {onAutoAlignCoupling && (
              <div className="pt-2">
                <button
                  onClick={onAutoAlignCoupling}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold transition text-xs"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'hi' ? 'कप्लिंग व साइज सही करें (Auto-Align)' : 'Auto-Align All Frames (2mm Gap)'}</span>
                </button>
              </div>
            )}

            {/* Delete Coupling */}
            <div className="pt-2">
              <button
                onClick={() => onDeleteCoupling(currentCoupling.id)}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>{lang === 'hi' ? 'कप्लिंग हटाएं (Detach Coupling)' : 'Detach Coupling'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. FRAME SELECTED (AND NO SUB-ELEMENT) */}
        {isFrameOnlySelected && currentFrame && (
          <div className="space-y-5 animate-in fade-in">
            {/* Frame Name */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                {lang === 'hi' ? 'चौखट का नाम (Frame Tag):' : 'Frame Name / Label:'}
              </label>
              <input
                type="text"
                value={currentFrame.name}
                onChange={(e) => onUpdateFrame({ ...currentFrame, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Profile Series */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                {lang === 'hi' ? 'प्रोफाइल सीरीज (Profile Series):' : 'Profile Series:'}
              </label>
              <select
                value={currentFrame.series}
                onChange={(e) =>
                  onUpdateFrame({ ...currentFrame, series: e.target.value as any })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="casement_60">60mm Casement Series (विंडो/डोर)</option>
                <option value="casement_70">70mm Heavy Duty Series</option>
                <option value="sliding_62">62mm 2-Track Sliding (2 Rails • S1 पीछे | S2 आगे)</option>
                <option value="sliding_88">88mm 3-Track Sliding (3 Rails • 2 ग्लास + 1 मच्छर जाली)</option>
                <option value="door_premium">Heavy Balcony Door Series</option>
              </select>
            </div>

            {/* Sliding Sash Profile Selector (Only for Sliding Frames) */}
            {(currentFrame.series.startsWith('sliding') ||
              currentFrame.pockets.some((p) => p.sashType?.startsWith('slider') || p.sashType?.startsWith('mesh'))) && (
              <div className="p-3 bg-blue-950/30 border border-blue-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                    <span>🪟</span>
                    <span>{lang === 'hi' ? 'स्लाइडिंग सैश प्रोफाइल:' : 'Sliding Sash Profile:'}</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                    {currentFrame.sashProfileWidth === 66 ||
                    currentFrame.sashProfileCode === 'SWH 60-04' ||
                    currentFrame.pockets.some((p) => p.sashProfileCode === 'SWH 60-04' || p.sashProfileTop?.includes('60-04'))
                      ? '66mm (SWH 60-04)'
                      : currentFrame.sashProfileWidth === 75 ||
                        currentFrame.sashProfileCode === 'SWH 60-05' ||
                        currentFrame.pockets.some((p) => p.sashProfileCode === 'SWH 60-05' || p.sashProfileTop?.includes('60-05'))
                      ? '75mm (SWH 60-05)'
                      : currentFrame.sashProfileWidth === 88 ||
                        currentFrame.sashProfileCode === 'SWH 60-06' ||
                        currentFrame.pockets.some((p) => p.sashProfileCode === 'SWH 60-06' || p.sashProfileTop?.includes('60-06'))
                      ? '88mm (SWH 60-06)'
                      : '57mm (SWH 60-03)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      code: 'SWH 60-03',
                      width: 57,
                      title: '57mm (Standard)',
                      str: 'SLD SASH 42MM X 57MM (SWH 60-03) (Thickness : 1.9mm)',
                    },
                    {
                      code: 'SWH 60-04',
                      width: 66,
                      title: '66mm (Heavy) ★',
                      str: 'SLD SASH 42MM X 66MM (SWH 60-04) (Thickness : 2.2mm)',
                    },
                    {
                      code: 'SWH 60-05',
                      width: 75,
                      title: '75mm (Door)',
                      str: 'SLD SASH 42MM X 75MM (SWH 60-05) (Thickness : 2.1mm)',
                    },
                    {
                      code: 'SWH 60-06',
                      width: 88,
                      title: '88mm (Super Heavy)',
                      str: 'SLD SASH 42MM X 88MM (SWH 60-06) (Thickness : 1.9mm)',
                    },
                  ].map((sashOpt) => {
                    const isSelected =
                      (currentFrame.sashProfileWidth === sashOpt.width ||
                        currentFrame.sashProfileCode === sashOpt.code ||
                        (sashOpt.width === 66 &&
                          currentFrame.pockets.some(
                            (p) => p.sashProfileCode === 'SWH 60-04' || p.sashProfileTop?.includes('60-04')
                          )) ||
                        (sashOpt.width === 57 &&
                          !currentFrame.sashProfileWidth &&
                          !currentFrame.pockets.some(
                            (p) => p.sashProfileCode === 'SWH 60-04' || p.sashProfileTop?.includes('60-04')
                          )));

                    return (
                      <button
                        key={sashOpt.code}
                        type="button"
                        onClick={() => {
                          const updatedPockets = currentFrame.pockets.map((pkt) => {
                            if (pkt.sashType?.startsWith('slider') || pkt.sashType?.startsWith('mesh')) {
                              return {
                                ...pkt,
                                sashProfileCode: sashOpt.code,
                                sashProfileTop: sashOpt.str,
                                sashProfileBottom: sashOpt.str,
                                sashProfileLeft: sashOpt.str,
                                sashProfileRight: sashOpt.str,
                              };
                            }
                            return pkt;
                          });

                          onUpdateFrame({
                            ...currentFrame,
                            sashProfileWidth: sashOpt.width,
                            sashProfileCode: sashOpt.code,
                            pockets: updatedPockets,
                          });
                        }}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-1 ring-blue-300'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-xs font-black">{sashOpt.title}</span>
                        <span className="text-[10px] font-mono opacity-80">{sashOpt.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Steel Reinforcement */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                {lang === 'hi' ? 'GI स्टील रिइन्फोर्समेंट (Steel Chamber):' : 'GI Steel Reinforcement:'}
              </label>
              <select
                value={currentFrame.reinforcement}
                onChange={(e) =>
                  onUpdateFrame({ ...currentFrame, reinforcement: e.target.value as any })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="steel_1.2mm">1.2mm GI Galvanized Steel (Standard)</option>
                <option value="steel_1.5mm">1.5mm Heavy Duty GI Steel</option>
                <option value="steel_2.0mm">2.0mm High Wind Pressure Steel</option>
                <option value="none">No Steel Reinforcement</option>
              </select>
            </div>

            {/* Mullion Controls for this Frame */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-blue-400 block uppercase tracking-wide">
                {lang === 'hi' ? 'इस फ्रेम में मुलियन डालें (Mullions):' : 'Internal Mullions:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAddVerticalMullion(currentFrame.id)}
                  className="flex items-center justify-center gap-1.5 p-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold"
                >
                  <Columns className="w-3.5 h-3.5 text-blue-400" />
                  <span>+ 1 Vertical</span>
                </button>
                <button
                  onClick={() => onAddHorizontalMullion(currentFrame.id)}
                  className="flex items-center justify-center gap-1.5 p-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold"
                >
                  <Rows className="w-3.5 h-3.5 text-blue-400" />
                  <span>+ 1 Transom</span>
                </button>
                <button
                  onClick={() => onRequestMultipleMullions?.(currentFrame.id, 'vertical')}
                  className="flex items-center justify-center gap-1.5 p-2 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold"
                  title="Prompt quantity to divide into equal vertical bays"
                >
                  <Columns className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ Multi V 💬</span>
                </button>
                <button
                  onClick={() => onRequestMultipleMullions?.(currentFrame.id, 'horizontal')}
                  className="flex items-center justify-center gap-1.5 p-2 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold"
                  title="Prompt quantity to divide into equal horizontal bays"
                >
                  <Rows className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ Multi H 💬</span>
                </button>
              </div>

              {(currentFrame.mullions || []).length > 0 && (
                <button
                  onClick={() => onEqualizeFrameMullions(currentFrame.id)}
                  className="w-full flex items-center justify-center gap-1.5 p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-300"
                >
                  <Equal className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'hi' ? 'सभी खानों को बराबर बांटें' : 'Equalize Bay Spacing'}</span>
                </button>
              )}
            </div>

            {/* Fan & AC Provisions Quick Action */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Fan className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'फैन व एसी प्रोविज़न (1-Click Auto):' : 'Fan & AC Quick Provisions:'}</span>
                </label>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  Auto Transom
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onAddFanVent?.(currentFrame.id)}
                  className="flex items-center justify-center gap-1.5 p-2 bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold transition"
                  title="Splits 350mm Top Transom & sets up Exhaust Fan"
                >
                  <Fan className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'hi' ? '+ ऊपर फैन (350mm)' : '+ Top Fan (350mm)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddACSection?.(currentFrame.id)}
                  className="flex items-center justify-center gap-1.5 p-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                  title="Splits 450mm Bottom Transom & sets up Window AC Unit"
                >
                  <Wind className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'hi' ? '+ नीचे AC (450mm)' : '+ Bottom AC (450mm)'}</span>
                </button>
              </div>
            </div>

            {/* Add Coupled Frame Actions (2mm Gap) */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-emerald-400 block uppercase tracking-wide">
                {lang === 'hi' ? 'नया कप्लिंग फ्रेम जोड़ें (2mm Gap):' : 'Add Coupled Frame (2mm Gap):'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAddCoupledFrame(currentFrame.id, 'right')}
                  className="flex items-center justify-center gap-1.5 p-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold"
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'दाएं जोड़ें ➔' : 'Right ➔ 2mm'}</span>
                </button>
                <button
                  onClick={() => onAddCoupledFrame(currentFrame.id, 'bottom')}
                  className="flex items-center justify-center gap-1.5 p-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold"
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'नीचे जोड़ें 🠓' : 'Bottom 🠓 2mm'}</span>
                </button>
              </div>
              {actualCouplings.length > 0 && onAutoAlignCoupling && (
                <button
                  onClick={onAutoAlignCoupling}
                  className="w-full mt-2 flex items-center justify-center gap-2 p-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                  title="Align all connected frames and verify 2mm gaps"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'hi' ? 'कप्लिंग अलाइनमेंट सही करें (Auto-Align)' : 'Auto-Align Coupled Assembly'}</span>
                </button>
              )}
            </div>

            {/* Delete Frame */}
            {actualFrames.length > 1 && (
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => onDeleteFrame(currentFrame.id)}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'यह फ्रेम हटाएं (Delete)' : 'Delete Frame'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 5. NO ELEMENT SELECTED -> OVERALL SUMMARY */}
        {!currentFrame && !currentCoupling && (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span>{lang === 'hi' ? 'कुल असेंबली साइज:' : 'Total Assembly Bounds:'}</span>
                <span className="font-mono text-blue-400">
                  {bounds.totalWidth} × {bounds.totalHeight} mm
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{lang === 'hi' ? 'कुल क्षेत्रफल (Area):' : 'Total Area:'}</span>
                <span className="font-mono text-slate-300">
                  {((bounds.totalWidth / 1000) * (bounds.totalHeight / 1000)).toFixed(2)} m² (
                  {(((bounds.totalWidth / 1000) * (bounds.totalHeight / 1000)) * 10.7639).toFixed(1)} sq.ft)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{lang === 'hi' ? 'कुल चौखट संख्या:' : 'Total Frames:'}</span>
                <span className="font-mono text-slate-300">{actualFrames.length} Units</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{lang === 'hi' ? 'कप्लिंग जोड़ (2mm):' : 'Coupler Joints:'}</span>
                <span className="font-mono text-emerald-400">{actualCouplings.length} Joints</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-slate-300">
                {lang === 'hi' ? '💡 त्वरित निर्देश:' : '💡 Quick Instructions:'}
              </h4>
              <ul className="space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                <li>• किसी भी चौखट या काँच के खाने पर क्लिक करके उसकी प्रॉपर्टीज बदलें।</li>
                <li>• मुलियन से 1 ही फ्रेम के अंदर कई पल्ले/ग्लास डिजाइन बनाएं।</li>
                <li>• 2mm कप्लिंग से अलग-अलग चौखट जोड़ें और स्वतंत्र रूप से बड़ा/छोटा करें।</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      {/* Full Handle Gallery Modal */}
      {isHandleModalOpen && currentPocket && currentFrame && (
        <HandleSelectionModal
          isOpen={isHandleModalOpen}
          onClose={() => setIsHandleModalOpen(false)}
          currentPocket={currentPocket}
          frameId={currentFrame.id}
          onUpdatePocket={onUpdatePocket}
          lang={lang}
        />
      )}
    </aside>
  );
};
