import React, { useState, useEffect } from 'react';
import { GlassType, UPVCFrame, UPVCProject, CustomerDesignCardItem, SashType } from '../types/upvc';
import { CustomerRecord } from '../types/erp';
import { recalculateFramePockets, equalizeOrScaleFrameMullions, DEFAULT_PRICING_CONFIG } from '../utils/upvcCalculations';
import { evaluateDimensionMath, getLiveMathPreview } from '../utils/dimensionMath';
import {
  Pencil,
  ChevronDown,
  Check,
  X,
  RotateCcw,
  Calculator,
  LayoutGrid,
  Sliders,
  Maximize2,
  Columns,
  DoorOpen,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';

export interface GlassOption {
  id: GlassType;
  name: string;
  nameHindi: string;
  thickness: string;
  badge?: string;
  bgColor: string;
}

export const GLASS_OPTIONS: GlassOption[] = [
  {
    id: 'clear_6mm',
    name: '6mm Toughened Clear Glass',
    nameHindi: '6mm टफन साफ़ काँच (Toughened Clear - Azure Blue)',
    thickness: '6mm',
    badge: '★ डिफ़ॉल्ट (Recommended)',
    bgColor: 'rgba(56, 189, 248, 0.22)',
  },
  {
    id: 'clear_5mm',
    name: '5mm Clear Float Glass',
    nameHindi: '5mm सादा काँच (Normal Float Glass)',
    thickness: '5mm',
    bgColor: 'rgba(203, 213, 225, 0.20)',
  },
  {
    id: 'tint_grey',
    name: '5 MM BLACK / TINTED GLASS',
    nameHindi: '5mm ब्लैक / टिंटेड काँच (Sun Control Tint)',
    thickness: '5mm',
    badge: 'Heat Block',
    bgColor: 'rgba(30, 41, 59, 0.35)',
  },
  {
    id: 'frosted',
    name: 'Frosted Privacy Acid-Etched',
    nameHindi: 'फ्रॉस्टेड / प्राइवेसी काँच (Frosted Acid-Etch)',
    thickness: '5mm / 6mm',
    badge: 'Privacy',
    bgColor: 'rgba(241, 245, 249, 0.75)',
  },
  {
    id: 'dgu_5_12_5',
    name: 'DGU 22mm Double Glazed Unit',
    nameHindi: 'DGU 22mm इंसुलेटेड (5+12+5 Double Glazed)',
    thickness: '22mm',
    badge: 'Insulated',
    bgColor: 'rgba(14, 165, 233, 0.35)',
  },
  {
    id: 'dgu_6_16_6',
    name: 'DGU 28mm Soundproof Acoustic',
    nameHindi: 'DGU 28mm साउंडप्रूफ (6+16+6 Acoustic)',
    thickness: '28mm',
    badge: 'Soundproof',
    bgColor: 'rgba(14, 165, 233, 0.45)',
  },
];

export type DesignArchetypeId =
  | 'sliding_2track'
  | 'sliding_3track'
  | 'sliding_2track_mesh'
  | 'sliding_4panel'
  | 'casement_1sash'
  | 'casement_2sash'
  | 'fixed_window'
  | 'casement_door'
  | 'sliding_door'
  | 'custom_blank';

interface DesignArchetypeDef {
  id: DesignArchetypeId;
  label: string;
  hindiLabel: string;
  category: 'Sliding' | 'Casement' | 'Door' | 'Fixed' | 'Custom';
  defaultWidth: number;
  defaultHeight: number;
  seriesKey: string;
  icon: React.ReactNode;
}

const DESIGN_ARCHETYPES: DesignArchetypeDef[] = [
  {
    id: 'sliding_2track',
    label: '2-Track Sliding Window (2 Panel)',
    hindiLabel: '2 ट्रैक 2 पल्ला स्लाइडिंग खिड़की',
    category: 'Sliding',
    defaultWidth: 1500,
    defaultHeight: 1200,
    seriesKey: 'sliding_62',
    icon: <Sliders className="w-4 h-4 text-blue-600" />,
  },
  {
    id: 'sliding_3track',
    label: '3-Track Sliding Window (3 Panel)',
    hindiLabel: '3 ट्रैक 3 पल्ला स्लाइडिंग खिड़की',
    category: 'Sliding',
    defaultWidth: 2100,
    defaultHeight: 1200,
    seriesKey: 'sliding_88',
    icon: <Columns className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'sliding_2track_mesh',
    label: '2-Track Slider + Fly Mesh (2G + 1M)',
    hindiLabel: '2 ग्लास पल्ला + 1 मेश जाली पल्ला',
    category: 'Sliding',
    defaultWidth: 1500,
    defaultHeight: 1200,
    seriesKey: 'sliding_88',
    icon: <Layers className="w-4 h-4 text-emerald-600" />,
  },
  {
    id: 'sliding_4panel',
    label: '4-Panel Center Slider (OXXO)',
    hindiLabel: '4 पल्ला सेंटर स्लाइडिंग खिड़की',
    category: 'Sliding',
    defaultWidth: 2800,
    defaultHeight: 1800,
    seriesKey: 'sliding_62',
    icon: <Sliders className="w-4 h-4 text-teal-600" />,
  },
  {
    id: 'casement_1sash',
    label: 'Casement Window (1 Sash Openable)',
    hindiLabel: 'केसमेंट 1 पल्ला खिड़की',
    category: 'Casement',
    defaultWidth: 600,
    defaultHeight: 1200,
    seriesKey: 'casement_60',
    icon: <LayoutGrid className="w-4 h-4 text-cyan-600" />,
  },
  {
    id: 'casement_2sash',
    label: 'Casement Window (2 Sash + Mullion)',
    hindiLabel: 'केसमेंट 2 पल्ला + सेंटर मुल्लियन',
    category: 'Casement',
    defaultWidth: 1200,
    defaultHeight: 1200,
    seriesKey: 'casement_60',
    icon: <Columns className="w-4 h-4 text-blue-700" />,
  },
  {
    id: 'fixed_window',
    label: 'Fixed Glass Picture Window',
    hindiLabel: 'फ़िक्स ग्लास खिड़की (Picture Glass)',
    category: 'Fixed',
    defaultWidth: 1200,
    defaultHeight: 1200,
    seriesKey: 'casement_60',
    icon: <Maximize2 className="w-4 h-4 text-slate-600" />,
  },
  {
    id: 'casement_door',
    label: 'Single Casement Door (Main / Balcony)',
    hindiLabel: 'केसमेंट दरवाज़ा (Door Lever Lock)',
    category: 'Door',
    defaultWidth: 900,
    defaultHeight: 2100,
    seriesKey: 'door_premium',
    icon: <DoorOpen className="w-4 h-4 text-amber-600" />,
  },
  {
    id: 'sliding_door',
    label: '2-Track Heavy Sliding Door',
    hindiLabel: '2 ट्रैक स्लाइडिंग दरवाज़ा',
    category: 'Door',
    defaultWidth: 1800,
    defaultHeight: 2100,
    seriesKey: 'sliding_62',
    icon: <Sliders className="w-4 h-4 text-violet-600" />,
  },
  {
    id: 'custom_blank',
    label: 'Custom Blank Frame (CAD Designer)',
    hindiLabel: 'खाली फ्रेम - CAD में अपनी मर्जी से बनाएँ',
    category: 'Custom',
    defaultWidth: 1200,
    defaultHeight: 1200,
    seriesKey: 'casement_60',
    icon: <Sparkles className="w-4 h-4 text-purple-600" />,
  },
];

interface CustomerAddDesignModalProps {
  isOpen: boolean;
  customer?: CustomerRecord;
  customerName?: string;
  customerBrand?: string;
  existingDesignsCount?: number;
  initialDesign?: CustomerDesignCardItem | null;
  onClose: () => void;
  onCreateDesign: (newDesign: CustomerDesignCardItem, openInCAD: boolean) => void;
  onUpdateDesign: (updatedDesign: CustomerDesignCardItem, openInCAD?: boolean) => void;
}

export const CustomerAddDesignModal: React.FC<CustomerAddDesignModalProps> = ({
  isOpen,
  customer,
  customerName = 'Customer',
  customerBrand = 'Duron',
  existingDesignsCount = 0,
  initialDesign,
  onClose,
  onCreateDesign,
  onUpdateDesign,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialDesign);

  // Determine initial archetype
  const getInitialArchetype = (): DesignArchetypeId => {
    if (!initialDesign) return 'sliding_2track';
    const name = (initialDesign.designName || initialDesign.type || '').toLowerCase();
    if (name.includes('door')) {
      return name.includes('slide') ? 'sliding_door' : 'casement_door';
    }
    if (name.includes('3 track') || name.includes('3-track')) return 'sliding_3track';
    if (name.includes('mesh')) return 'sliding_2track_mesh';
    if (name.includes('4 panel') || name.includes('oxxo')) return 'sliding_4panel';
    if (name.includes('casement')) return 'casement_2sash';
    if (name.includes('fixed')) return 'fixed_window';
    if (name.includes('sliding') || name.includes('slide')) return 'sliding_2track';
    return 'sliding_2track';
  };

  const [designRef, setDesignRef] = useState<string>(() => {
    if (initialDesign?.tag) return initialDesign.tag;
    const nextNum = existingDesignsCount + 1;
    return `W${nextNum}`;
  });
  const [quantityInput, setQuantityInput] = useState<string>(() => String(initialDesign?.quantity || 1));
  const [designName, setDesignName] = useState<string>(initialDesign?.designName || '');
  const [widthInput, setWidthInput] = useState<string>(() => String(initialDesign?.width || 1200));
  const [heightInput, setHeightInput] = useState<string>(() => String(initialDesign?.height || 1200));
  const [location, setLocation] = useState<string>(initialDesign?.location || 'Bed Room');
  const [floorNumber, setFloorNumber] = useState<string>(initialDesign?.floorNumber || 'Ground Floor');
  const [note, setNote] = useState<string>(initialDesign?.note || '');

  // Glass selection - Default is ALWAYS clear_6mm (Toughened Clear Glass)
  const [selectedGlass, setSelectedGlass] = useState<string>(() => {
    if (initialDesign?.glassType) {
      const match = GLASS_OPTIONS.find((g) => g.id === initialDesign.glassType);
      if (match) return match.name;
    }
    return GLASS_OPTIONS[0].name; // 6mm Toughened Clear Glass
  });
  const [isGlassDropdownOpen, setIsGlassDropdownOpen] = useState(false);

  // Live calculation previews for dimension math
  const widthPreview = getLiveMathPreview(widthInput);
  const heightPreview = getLiveMathPreview(heightInput);
  const quantityPreview = getLiveMathPreview(quantityInput);

  // Live square feet calculation (graceful with math expressions, conversions & empty/cleared input)
  const widthNum = widthPreview.calculated ?? (parseFloat(widthInput) || 0);
  const heightNum = heightPreview.calculated ?? (parseFloat(heightInput) || 0);
  const sqft = widthNum > 0 && heightNum > 0 ? ((widthNum * heightNum) / 1000000) * 10.7639 : 0;

  // Handle submit logic
  const handleSubmit = (openInCAD: boolean) => {
    const tag = designRef.trim() || `W${existingDesignsCount + 1}`;
    const validQty = Math.max(1, quantityPreview.calculated ?? parseInt(quantityInput, 10) ?? 1);
    const validWidth = Math.max(200, widthPreview.calculated ?? parseInt(widthInput, 10) ?? 1200);
    const validHeight = Math.max(200, heightPreview.calculated ?? parseInt(heightInput, 10) ?? 1200);

    const matchedGlass = GLASS_OPTIONS.find((g) => g.name === selectedGlass);
    const chosenGlassType: GlassType = matchedGlass ? matchedGlass.id : 'clear_6mm';

    if (isEditing && initialDesign) {
      const projCopy = initialDesign.projectData
        ? JSON.parse(JSON.stringify(initialDesign.projectData))
        : null;

      if (projCopy && projCopy.frames && projCopy.frames.length > 0) {
        projCopy.referenceNo = tag;
        const oldW = projCopy.frames[0].width;
        const oldH = projCopy.frames[0].height;
        const scaled = equalizeOrScaleFrameMullions(projCopy.frames[0], validWidth, validHeight, oldW, oldH);
        projCopy.frames[0] = {
          ...scaled,
          pockets: scaled.pockets.map((p: any) => ({
            ...p,
            glassType: chosenGlassType,
          })),
        };
      }

      const updatedDesign: CustomerDesignCardItem = {
        ...initialDesign,
        tag,
        quantity: validQty,
        designName: designName.trim() || initialDesign.type,
        width: validWidth,
        height: validHeight,
        location: location.trim() || 'Living Room',
        floorNumber: floorNumber.trim() || 'Ground Floor',
        note: note.trim(),
        glassType: chosenGlassType,
        totalPrice: initialDesign.unitPrice * validQty,
        projectData: projCopy,
      };

      onUpdateDesign(updatedDesign, openInCAD);
      onClose();
      return;
    }

    // Creating a brand new design (Clean CAD Frame with user dimensions and glass)
    const isDoor = (designName.toLowerCase().includes('door') || designName.toLowerCase().includes('दरवा') || validHeight >= 2000);
    const resolvedName = designName.trim() || (isDoor ? `Door ${tag}` : `Window ${tag}`);

    const f1: UPVCFrame = {
      id: `frame-${Date.now()}`,
      name: tag,
      width: validWidth,
      height: validHeight,
      x: 0,
      y: 0,
      series: isDoor ? 'door_premium' : 'casement_60',
      frameProfileWidth: 60,
      mullionProfileWidth: 74,
      sashProfileWidth: 60,
      color: 'white',
      reinforcement: 'steel_1.2mm',
      drainageCaps: true,
      mullions: [],
      pockets: [],
    };

    // Calculate pockets
    f1.pockets = recalculateFramePockets(f1);

    // Single clean pocket ready for user to design in CAD
    f1.pockets = f1.pockets.map((pkt, idx) => ({
      ...pkt,
      glassType: chosenGlassType,
      applicationType: isDoor ? 'door' : 'window',
      sashType: 'fixed',
      customLabel: `P${idx + 1}`,
    }));

    const newProj: UPVCProject = {
      id: `proj_${Date.now()}`,
      name: `${tag} - ${customerName}`,
      clientName: customerName,
      referenceNo: tag,
      date: new Date().toISOString().split('T')[0],
      frames: [f1],
      couplings: [],
      pricingConfig: { ...DEFAULT_PRICING_CONFIG },
    };

    const baseRate = isDoor ? 750 : 650;
    const estUnitPrice = Math.round(sqft * baseRate);

    const newDesign: CustomerDesignCardItem = {
      id: `des-${Date.now()}`,
      tag,
      designName: resolvedName,
      type: isDoor ? 'Door' : 'Window',
      location: location.trim() || 'Living Room',
      floorNumber: floorNumber.trim() || 'Ground Floor',
      note: note.trim(),
      width: f1.width,
      height: f1.height,
      seriesName: `${customerBrand.toUpperCase()} 60MM`,
      quantity: validQty,
      unitPrice: estUnitPrice,
      totalPrice: estUnitPrice * validQty,
      projectData: newProj,
      glassType: chosenGlassType,
      profileColor: 'white',
      floorDistance: isDoor ? 0 : 900,
    };

    onCreateDesign(newDesign, openInCAD);
    onClose();
  };

  return (
    <div
      id="customer-add-design-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-[500px] w-full border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* 1. Header Bar matching Eva UPVC CAD screenshot */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white select-none">
          <div className="flex items-center gap-2.5">
            {/* Logo icon: Orange dot + Blue window frame */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
              <div className="w-3.5 h-5.5 border-2 border-[#0284c7] rounded-[2px] relative flex bg-white">
                <div className="w-1/2 h-full border-r border-[#0284c7]" />
              </div>
            </div>

            {/* Header Text */}
            <div className="text-xs text-slate-700 leading-snug">
              <div className="flex items-center gap-2">
                <span>
                  Design ref. : <span className="font-semibold text-slate-900">{designRef}</span>
                </span>
                <span className="text-slate-300 font-light">|</span>
                <span>
                  Qty: <span className="font-semibold text-slate-900">{quantityInput || '1'}</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Location: <span className="font-medium text-slate-800">{location}</span>
                <span className="mx-1.5 text-slate-300">•</span>
                <span>{sqft.toFixed(1)} Sq.Ft.</span>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Form Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* Subtitle / Mode */}
          <div className="flex items-center justify-between -mt-1">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              {isEditing ? 'डिज़ाइन संपादित करें (Edit Design)' : 'नया डिज़ाइन जोड़ें (Add Design)'}
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {customerBrand} UPVC
            </span>
          </div>

          {/* Dimensions Row: Width (mm) & Height (mm) with Live Sq.Ft and Clear button */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <span>फ़्रेम का नाप (Dimensions)</span>
                {/* Clear Both Dimensions Button */}
                <button
                  type="button"
                  onClick={() => {
                    setWidthInput('');
                    setHeightInput('');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded font-bold transition border border-red-200 cursor-pointer"
                  title="दोनों साइज़ साफ़ करें (Clear Both Dimensions)"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>साफ़ करें (Clear)</span>
                </button>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[11px]">
                {sqft > 0 ? sqft.toFixed(2) : '0.00'} Sq.Ft.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Width Input with math calculations and instant clear (x) button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] text-slate-600 font-semibold">
                    Width (W) चौड़ाई <span className="text-slate-400 font-normal">(mm)</span>
                  </label>
                  {widthInput !== '' && (
                    <button
                      type="button"
                      onClick={() => setWidthInput('')}
                      className="text-[10px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      title="चौड़ाई साफ़ करें"
                    >
                      साफ़ (Clear)
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={widthInput}
                    onChange={(e) => {
                      // Allow numbers, decimals, math symbols (+, -, *, /, x, X, parentheses, quotes, ft, in)
                      const val = e.target.value.replace(/[^0-9\.\+\-\*\/\(\)\s'"xXftin]/gi, '');
                      setWidthInput(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const evaluated = evaluateDimensionMath(widthInput);
                        if (evaluated !== null && evaluated > 0) {
                          setWidthInput(String(evaluated));
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      if (!widthInput.trim()) {
                        setWidthInput('1200');
                        return;
                      }
                      const evaluated = evaluateDimensionMath(widthInput);
                      if (evaluated !== null && evaluated > 0) {
                        setWidthInput(String(evaluated));
                      } else if (!parseFloat(widthInput) || parseFloat(widthInput) <= 0) {
                        setWidthInput('1200');
                      }
                    }}
                    placeholder="उदा. 1200 या 4ft या 1200+50"
                    className="w-full px-2.5 py-1.5 pr-8 border border-slate-300 rounded bg-white text-sm font-bold text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                  {widthInput !== '' && (
                    <button
                      type="button"
                      onClick={() => setWidthInput('')}
                      className="absolute right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition cursor-pointer"
                      title="चौड़ाई साफ़ करें (Clear Width)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* Live math preview badge for width */}
                {widthPreview.isExpression && (
                  <div className="mt-1">
                    {widthPreview.calculated !== null ? (
                      <button
                        type="button"
                        onClick={() => setWidthInput(String(widthPreview.calculated))}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300 cursor-pointer hover:bg-emerald-200 transition"
                        title="कैलकुलेशन लागू करने के लिए क्लिक करें"
                      >
                        <Calculator className="w-3 h-3 text-emerald-700" />
                        <span>= {widthPreview.calculated} mm</span>
                        <span className="text-[10px] text-emerald-600 font-normal">({(widthPreview.calculated / 304.8).toFixed(1)} ft)</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium">कैलकुलेशन टाइप हो रहा है...</span>
                    )}
                  </div>
                )}
              </div>

              {/* Height Input with math calculations and instant clear (x) button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] text-slate-600 font-semibold">
                    Height (H) ऊँचाई <span className="text-slate-400 font-normal">(mm)</span>
                  </label>
                  {heightInput !== '' && (
                    <button
                      type="button"
                      onClick={() => setHeightInput('')}
                      className="text-[10px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      title="ऊँचाई साफ़ करें"
                    >
                      साफ़ (Clear)
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={heightInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9\.\+\-\*\/\(\)\s'"xXftin]/gi, '');
                      setHeightInput(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const evaluated = evaluateDimensionMath(heightInput);
                        if (evaluated !== null && evaluated > 0) {
                          setHeightInput(String(evaluated));
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      if (!heightInput.trim()) {
                        setHeightInput('1200');
                        return;
                      }
                      const evaluated = evaluateDimensionMath(heightInput);
                      if (evaluated !== null && evaluated > 0) {
                        setHeightInput(String(evaluated));
                      } else if (!parseFloat(heightInput) || parseFloat(heightInput) <= 0) {
                        setHeightInput('1200');
                      }
                    }}
                    placeholder="उदा. 1200 या 4ft या 1500-100"
                    className="w-full px-2.5 py-1.5 pr-8 border border-slate-300 rounded bg-white text-sm font-bold text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  />
                  {heightInput !== '' && (
                    <button
                      type="button"
                      onClick={() => setHeightInput('')}
                      className="absolute right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition cursor-pointer"
                      title="ऊँचाई साफ़ करें (Clear Height)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* Live math preview badge for height */}
                {heightPreview.isExpression && (
                  <div className="mt-1">
                    {heightPreview.calculated !== null ? (
                      <button
                        type="button"
                        onClick={() => setHeightInput(String(heightPreview.calculated))}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300 cursor-pointer hover:bg-emerald-200 transition"
                        title="कैलकुलेशन लागू करने के लिए क्लिक करें"
                      >
                        <Calculator className="w-3 h-3 text-emerald-700" />
                        <span>= {heightPreview.calculated} mm</span>
                        <span className="text-[10px] text-emerald-600 font-normal">({(heightPreview.calculated / 304.8).toFixed(1)} ft)</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium">कैलकुलेशन टाइप हो रहा है...</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hint for Calculation / Math Input */}
            <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded border border-blue-200">
              <Calculator className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                <strong>कैलकुलेशन सपोर्ट:</strong> आप सीधे गणित लिख सकते हैं, जैसे <code className="bg-blue-100 px-1 rounded font-bold">1200+50</code>, <code className="bg-blue-100 px-1 rounded font-bold">1500/2</code>, <code className="bg-blue-100 px-1 rounded font-bold">4ft</code>, <code className="bg-blue-100 px-1 rounded font-bold">4'6"</code>, या <code className="bg-blue-100 px-1 rounded font-bold">48in</code>
              </span>
            </div>

            {/* Quick Size Preset Badges (त्वरित साइज़) */}
            <div className="pt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">त्वरित साइज़:</span>
              {[
                { label: '4×4 ft (1200×1200)', w: '1200', h: '1200' },
                { label: '5×4 ft (1500×1200)', w: '1500', h: '1200' },
                { label: '6×4 ft (1800×1200)', w: '1800', h: '1200' },
                { label: '7×3 ft Door (900×2100)', w: '900', h: '2100' },
                { label: '8×7 ft Slider (2400×2100)', w: '2400', h: '2100' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setWidthInput(preset.w);
                    setHeightInput(preset.h);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer font-medium ${
                    widthInput === preset.w && heightInput === preset.h
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 1: Design ref. * & Quantity * */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs text-slate-500 font-medium">
                Design ref. (रेफ़रेंस) <span className="text-blue-600">*</span>
              </label>
              <input
                type="text"
                value={designRef}
                onChange={(e) => setDesignRef(e.target.value)}
                placeholder="W1, W2, D1..."
                className="w-full border-b border-slate-300 focus:border-blue-600 outline-none pb-1 text-sm font-bold text-slate-800 bg-transparent transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-slate-500 font-medium">
                Quantity (मात्रा) <span className="text-blue-600">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={quantityInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '');
                    setQuantityInput(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const evaluated = evaluateDimensionMath(quantityInput);
                      if (evaluated !== null && evaluated > 0) {
                        setQuantityInput(String(evaluated));
                      }
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    const evaluated = evaluateDimensionMath(quantityInput);
                    if (evaluated !== null && evaluated > 0) {
                      setQuantityInput(String(evaluated));
                    } else if (!quantityInput || Number(quantityInput) <= 0) {
                      setQuantityInput('1');
                    }
                  }}
                  placeholder="1"
                  className="w-full border-b border-slate-300 focus:border-blue-600 outline-none pb-1 text-sm font-bold text-slate-800 bg-transparent transition pr-6"
                />
                {quantityInput !== '' && (
                  <button
                    type="button"
                    onClick={() => setQuantityInput('')}
                    className="absolute right-0 bottom-1 p-0.5 text-slate-400 hover:text-red-500 transition cursor-pointer"
                    title="मात्रा साफ़ करें (Clear Quantity)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {quantityPreview.isExpression && quantityPreview.calculated !== null && (
                <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5 inline-block">
                  = {quantityPreview.calculated} Units
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Design name */}
          <div className="space-y-1">
            <label className="block text-xs text-slate-500 font-medium">Design Name / विवरण</label>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="e.g. Master Bedroom Sliding Window"
              className="w-full border-b border-slate-300 focus:border-blue-600 outline-none pb-1 text-sm font-medium text-slate-800 bg-transparent transition"
            />
          </div>

          {/* Row 3: Location & Floor number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs text-slate-500 font-medium">Location (कमरा / स्थान)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Living Room, Bedroom..."
                className="w-full border-b border-slate-300 focus:border-blue-600 outline-none pb-1 text-sm font-medium text-slate-800 bg-transparent transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-slate-500 font-medium">Floor (मंज़िल)</label>
              <input
                type="text"
                value={floorNumber}
                onChange={(e) => setFloorNumber(e.target.value)}
                placeholder="Ground Floor, 1st Floor..."
                className="w-full border-b border-slate-300 focus:border-blue-600 outline-none pb-1 text-sm font-medium text-slate-800 bg-transparent transition"
              />
            </div>
          </div>

          {/* Row 4: Note */}
          <div className="space-y-1">
            <label className="block text-xs text-slate-500 font-medium">Note (विशेष निर्देश)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Touch lock on left, handle height 1000mm"
              className="w-full border-b border-slate-300 focus:border-blue-600 outline-none pb-1 text-xs text-slate-800 bg-transparent transition"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-2" />

          {/* Row 5: Selected glass (Default: 6mm Toughened Clear Glass) */}
          <div className="space-y-1 relative">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-600">
                काँच का प्रकार (Selected Glass)
              </label>
              <span className="text-[10px] text-emerald-600 font-bold">
                ✓ नो ब्लैक एंड व्हाइट (Vibrant Glass)
              </span>
            </div>
            <div
              onClick={() => setIsGlassDropdownOpen(!isGlassDropdownOpen)}
              className="w-full border-b border-slate-300 focus:border-blue-600 pb-1.5 flex items-center justify-between cursor-pointer text-sm font-medium text-slate-800 select-none hover:border-slate-400 transition"
            >
              <span className="tracking-wide font-semibold text-blue-900">{selectedGlass}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform ${
                  isGlassDropdownOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </div>

            {/* Glass Dropdown Menu */}
            {isGlassDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                {GLASS_OPTIONS.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => {
                      setSelectedGlass(g.name);
                      setIsGlassDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-blue-50 transition cursor-pointer ${
                      selectedGlass === g.name
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 font-medium'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{g.nameHindi}</div>
                    </div>
                    {selectedGlass === g.name && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Bottom Action Buttons */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 select-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition shadow-2xs"
          >
            रद्द करें (Cancel)
          </button>

          <div className="flex items-center gap-2">
            {/* Secondary Option: Save to list only */}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs cursor-pointer transition flex items-center gap-1.5"
              title="Save directly into customer list without opening CAD"
            >
              केवल लिस्ट में जोड़ें
            </button>

            {/* Primary Action: Open in CAD Designer */}
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm cursor-pointer transition flex items-center gap-1.5 active:scale-98"
              title="Save and immediately open this design inside the CAD editor"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>CAD में खोलें (Open in CAD)</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
