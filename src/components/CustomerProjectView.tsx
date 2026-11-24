import React, { useState, useMemo } from 'react';
import { HardwareHandle } from './HardwareHandle';
import {
  ArrowLeft,
  LayoutGrid,
  FileText,
  Box,
  Calculator,
  BarChart3,
  CheckSquare,
  CreditCard,
  ShoppingCart,
  ChevronDown,
  HelpCircle,
  Play,
  PlayCircle,
  Grid as GridIcon,
  Plus,
  Pencil,
  Copy,
  Trash2,
  AlertTriangle,
  Settings2,
  Sliders,
  ExternalLink,
  Download,
  Share2,
  Sparkles,
  Layers,
  Eye,
  Check,
  X,
  Phone,
  MapPin,
  Building,
  Printer,
  Receipt,
  FileSpreadsheet,
  Scissors,
  MoreVertical,
  Search,
  RefreshCw,
  ArrowLeftRight,
  Filter,
  List,
  Star,
  Package,
  Shield,
  Clock,
  CircleDot,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  Tag,
  ShieldCheck,
  Palette,
  Grid3X3,
  Boxes,
  Maximize2,
} from 'lucide-react';
import { EvaConfiguratorModal } from './EvaConfiguratorModal';
import { GlobalEditsModal, GlobalEditCategory } from './GlobalEditsModal';
import { CustomerRecord, ERPProjectRecord } from '../types/erp';
import { UPVCProject, UPVCFrame, GlassType, SashType, Mullion, CuttingItem } from '../types/upvc';
import { CostHead } from '../types/pricing';
import { TEMPLATES } from '../utils/presets';
import {
  calculateAssemblyBounds,
  recalculateFramePockets,
  resolveFramePositions,
  DEFAULT_PRICING_CONFIG,
  DEFAULT_COLORS,
  generateCuttingSchedule,
  generateProductionReports,
  normalizeFrameColorId,
} from '../utils/upvcCalculations';
import { SLIDING_DESIGNS_18, SlidingDesignDef } from './SlidingGalleryModal';
import { PricingSettings } from './PricingSettings';
import { DEFAULT_COST_HEADS, DEFAULT_INVENTORY_ITEMS, calculateQuotation } from '../utils/pricing';
import {
  downloadCadSvg,
  downloadCadPng,
  downloadSiteMeasurementDoc,
  downloadWarrantyDoc,
  downloadFactoryJobCardDoc,
  downloadQuotationCsv,
  downloadCuttingListCsv,
  exportElevationReportToExcel,
} from '../utils/exportUtils';
import { CustomerAddDesignModal, GLASS_OPTIONS } from './CustomerAddDesignModal';
import { CadElevationDrawing } from './CadElevationDrawing';
import { OfficialProductionReportView } from './OfficialProductionReportView';
import { getGlassDisplayName } from '../utils/glassUtils';
import { ProjectReportModal } from './ProjectReportModal';
import { PricingFormulaView } from './PricingFormulaView';
import { ProfileRequirementView } from './ProfileRequirementView';
import { PWAInstallButton } from './PWAInstallButton';
import {
  getCustomerDesigns,
  saveCustomerDesignsAndSync,
  getInitialDesignsForCustomer,
  calculateCustomerTotals,
} from '../utils/customerStorage';

export { getInitialDesignsForCustomer };

// Dynamic Mini-CAD Preview Renderer for Customer Project Design Cards (Full High-Fidelity Rendering)
export const DesignCardCadPreview: React.FC<{
  design: CustomerDesignCardItem;
  onPocketClick?: (frameIndex: number, pocketIndex: number) => void;
}> = ({ design, onPocketClick }) => {
  const project = design.projectData;
  const rawFrames = project?.frames && project.frames.length > 0 ? project.frames : null;
  const couplings = project?.couplings || [];

  const frames: UPVCFrame[] = useMemo(() => {
    if (rawFrames && rawFrames.length > 0) {
      return rawFrames.map((f) => {
        let p = f.pockets;
        if (!p || p.length === 0) {
          p = recalculateFramePockets(f);
        }
        // Ensure glassType matches design-level if missing on pocket
        const updatedPockets = (p || []).map((pkt) => ({
          ...pkt,
          glassType: pkt.glassType || design.glassType || 'clear_6mm',
        }));
        return {
          ...f,
          color: normalizeFrameColorId(f.color, design.profileColor || 'white'),
          pockets: updatedPockets,
        };
      });
    }

    // High-accuracy fallback if projectData is not yet populated
    const isSlider = design.type === 'Sliding' || design.seriesName?.toLowerCase().includes('sliding');
    const fW = design.width || 1200;
    const fH = design.height || 1200;

    const fallbackFrame: UPVCFrame = {
      id: `f-${design.id}`,
      name: design.tag,
      x: 0,
      y: 0,
      width: fW,
      height: fH,
      frameProfileWidth: 60,
      mullionProfileWidth: 74,
      sashProfileWidth: 60,
      color: design.profileColor || 'white',
      series: design.seriesName || (isSlider ? 'sliding_62' : 'casement_60'),
      mullions: isSlider ? [{ id: 'mul-center', orientation: 'vertical', position: Math.round(fW / 2) }] : [],
      pockets: [],
      reinforcement: 'steel_1.5mm',
      drainageCaps: true,
    };

    fallbackFrame.pockets = recalculateFramePockets(fallbackFrame).map((pkt, idx) => ({
      ...pkt,
      sashType: isSlider
        ? (idx === 0 ? 'slider_arrow_right' : 'slider_arrow_left')
        : (design.type === 'Fixed' ? 'fixed' : (idx % 2 === 0 ? 'casement_left' : 'casement_right')),
      glassType: design.glassType || 'clear_6mm',
    }));

    return [fallbackFrame];
  }, [design, rawFrames]);

  return (
    <div className="w-full h-full flex items-center justify-center relative select-none">
      <CadElevationDrawing
        frames={frames}
        couplings={couplings}
        width="100%"
        height="100%"
        showDimensions={true}
        showLabels={false}
        showHandles={true}
        showArrows={true}
        allowEnlarge={true}
        badgeTag={design.tag}
        title={`${design.tag} • ${design.type} (${design.width}×${design.height}mm)`}
        onPocketClick={onPocketClick}
      />
    </div>
  );
};

export interface CustomerDesignCardItem {
  id: string;
  tag: string; // 'W1', 'W2', 'WD-003', etc.
  designName?: string;
  floorNumber?: string;
  note?: string;
  type: string; // 'Sliding' | 'Casement' | 'Fixed' | 'French Door' | 'Combination'
  location: string; // 'Main Hall', 'Master Bedroom', 'No location', 'Kitchen', etc.
  width: number; // e.g. 1800
  height: number; // e.g. 1200
  seriesName: string; // 'SLIDING SWH 60-03 (SLD 57MM)' | 'CASEMENT 60 SERIES'
  quantity: number; // e.g. 1 or 2
  unitPrice: number; // e.g. 38500
  totalPrice: number; // quantity * unitPrice
  projectData?: UPVCProject;
  glassType?: GlassType | string;
  profileColor?: string;
  floorDistance?: number;
}

// Quick Modal to change glass across the design or for individual pockets/hisse
const QuickChangeDesignGlassModal: React.FC<{
  design: CustomerDesignCardItem;
  initialPocketIndex?: number | null;
  onClose: () => void;
  onSave: (glassType: GlassType, pocketOverrides: Record<number, GlassType>) => void;
}> = ({ design, initialPocketIndex, onClose, onSave }) => {
  const [masterGlass, setMasterGlass] = useState<GlassType>(() => design.glassType || 'clear_6mm');
  const [pocketOverrides, setPocketOverrides] = useState<Record<number, GlassType>>(() => {
    const map: Record<number, GlassType> = {};
    const f1 = design.projectData?.frames?.[0];
    if (f1?.pockets) {
      f1.pockets.forEach((p, idx) => {
        if (p.glassType) map[idx] = p.glassType;
      });
    }
    return map;
  });
  const [activePocketIndex, setActivePocketIndex] = useState<number | null>(initialPocketIndex ?? null);

  const pockets = design.projectData?.frames?.[0]?.pockets || [];

  const handleApplyMasterToAll = (newGlass: GlassType) => {
    setMasterGlass(newGlass);
    const updatedMap: Record<number, GlassType> = {};
    pockets.forEach((_, idx) => {
      updatedMap[idx] = newGlass;
    });
    setPocketOverrides(updatedMap);
  };

  const handleSetSinglePocketGlass = (idx: number, glass: GlassType) => {
    setPocketOverrides((prev) => ({
      ...prev,
      [idx]: glass,
    }));
    setActivePocketIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-blue-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              💎
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                काँच बदलें: {design.tag} ({design.width}×{design.height}mm)
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                काँच पर टैप कर उसका काँच बदलें • डिफ़ॉल्ट: 6mm टफन काँच
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Master Glass Selection */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                डिफ़ॉल्ट / मुख्य काँच (Master Glass Type):
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                6mm टफन
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={masterGlass}
                  onChange={(e) => handleApplyMasterToAll(e.target.value as GlassType)}
                  className="w-full bg-white border-2 border-blue-500 focus:border-blue-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden appearance-none cursor-pointer"
                >
                  {GLASS_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nameHindi} {g.badge ? `[${g.badge}]` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => handleApplyMasterToAll(masterGlass)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] transition shrink-0 cursor-pointer shadow-xs"
              >
                सभी में लगाएं
              </button>
            </div>
            <span className="text-[10px] text-slate-400 block">
              नीचे किसी भी हिस्से (पैनल) पर टैप कर उसका काँच अलग से भी बदल सकते हैं।
            </span>
          </div>

          {/* Interactive Pockets / Hisse Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>👉</span>
                <span>खिड़की के हिस्से (Tap on any Section to Change Glass):</span>
              </label>
              <span className="text-[10px] font-semibold text-slate-500">
                कुल {pockets.length > 0 ? pockets.length : 1} हिस्से
              </span>
            </div>

            {/* Visual Glass Panels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(pockets.length > 0 ? pockets : [{ id: 'p0', customLabel: '1', sashType: 'fixed' }]).map((pkt: any, idx: number) => {
                const currentPktGlassId = pocketOverrides[idx] || masterGlass;
                const glassDef = GLASS_OPTIONS.find((g) => g.id === currentPktGlassId) || GLASS_OPTIONS[0];
                const isSelected = activePocketIndex === idx;

                return (
                  <div
                    key={pkt.id || idx}
                    onClick={() => setActivePocketIndex(isSelected ? null : idx)}
                    style={{ backgroundColor: glassDef.bgColor }}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'border-blue-600 ring-3 ring-blue-300 shadow-md scale-101'
                        : 'border-slate-300 hover:border-blue-400 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/90 border border-blue-200 text-blue-700 font-black text-[10px] shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition">
                        काँच बदलें ▾
                      </span>
                    </div>

                    <div className="my-1">
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        हिस्सा {idx + 1} {pkt.customLabel ? `(${pkt.customLabel})` : ''}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                        💎 {glassDef.nameHindi.split('(')[0]}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500">{glassDef.thickness}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Popover / Dropdown when a pocket is tapped */}
            {activePocketIndex !== null && (
              <div className="p-3 bg-white border-2 border-blue-500 rounded-xl shadow-lg space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-extrabold text-xs text-blue-900">
                    हिस्सा {activePocketIndex + 1} का काँच चुनें:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivePocketIndex(null)}
                    className="text-slate-400 hover:text-slate-700 font-bold text-xs"
                  >
                    ✕ बंद करें
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                  {GLASS_OPTIONS.map((g) => {
                    const isCurrent = (pocketOverrides[activePocketIndex] || masterGlass) === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSetSinglePocketGlass(activePocketIndex, g.id)}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                          isCurrent
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-black'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span className="text-[11px] font-bold leading-tight">{g.nameHindi.split('(')[0]}</span>
                        <span className="text-[9px] font-mono text-slate-400 mt-1">{g.thickness}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            रद्द करें (Cancel)
          </button>

          <button
            type="button"
            onClick={() => onSave(masterGlass, pocketOverrides)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer hover:scale-102"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>✓ काँच सेव करें (Apply Glass)</span>
          </button>
        </div>
      </div>
    </div>
  );
};


interface CustomerProjectViewProps {
  customer: CustomerRecord;
  onBack: () => void;
  onOpenDesignInCAD: (design: CustomerDesignCardItem) => void;
  onOpenCuttingListModal?: (project: UPVCProject) => void;
  onOpenQuotationModal?: (project: UPVCProject, customerDesigns?: CustomerDesignCardItem[]) => void;
  onOpen3DModal?: (project: UPVCProject) => void;
  onOpenPaymentLedger?: () => void;
  onOpenPricingFormula?: () => void;
  onOpenQuickQuote?: () => void;
  onUpdateCustomer?: (customer: CustomerRecord) => void;
  lang?: 'hi' | 'en';
}

export const CustomerProjectView: React.FC<CustomerProjectViewProps> = ({
  customer,
  onBack,
  onOpenDesignInCAD,
  onOpenCuttingListModal,
  onOpenQuotationModal,
  onOpen3DModal,
  onOpenPaymentLedger,
  onOpenPricingFormula,
  onOpenQuickQuote,
  onUpdateCustomer,
  lang = 'hi',
}) => {
  // Storage key for this customer's designs
  const storageKey = `upvc_cust_designs_${customer.id}`;

  const recalculateDesignsList = (rawList: CustomerDesignCardItem[]): CustomerDesignCardItem[] => {
    let template = DEFAULT_COST_HEADS;
    try {
      const savedTemplate = localStorage.getItem(`upvc_pricing_template_${customer.id}`) ||
                            localStorage.getItem('upvc_pricing_template_active') ||
                            localStorage.getItem('upvc_pricing_template_global');
      if (savedTemplate) {
        const parsed = JSON.parse(savedTemplate);
        if (Array.isArray(parsed) && parsed.length > 0) {
          template = parsed.map((h: CostHead) => {
            if (h.id === 20 && (!h.rate || h.rate === 0)) {
              return { ...h, rate: 18, name: 'GST', visibility: 'Show in Quote Window' };
            }
            if (h.id === 18 && (h.rate === undefined || h.rate === null || isNaN(h.rate))) {
              return { ...h, rate: 2000, name: 'Loading And Unloading' };
            }
            return h;
          });
        }
      }
    } catch (e) {}

    let inventory = DEFAULT_INVENTORY_ITEMS;
    try {
      const savedInv = localStorage.getItem(`upvc_inventory_items_${customer.id}`);
      if (savedInv) {
        const parsed = JSON.parse(savedInv);
        if (Array.isArray(parsed) && parsed.length > 0) inventory = parsed;
      }
    } catch (e) {}

    const totalUnits = rawList.reduce((sum, d) => sum + (d.quantity || 1), 0);

    return rawList.map(d => {
      let calculatedUnitTotal = 0;
      if (d.projectData?.frames && d.projectData.frames.length > 0) {
        try {
          const reps = generateProductionReports(
            d.projectData.frames,
            d.projectData.couplings || [],
            {
              name: customer?.name || 'Project',
              referenceNo: customer?.referenceNo || customer?.id || 'PRJ-01',
              clientName: customer?.name || 'Customer',
              totalCustomerUnits: totalUnits,
              pricingTemplate: template,
            }
          );
          const repSum = reps.reduce((sum, r) => sum + (r.costSummary?.grandTotal || 0), 0);
          if (repSum > 0) {
            calculatedUnitTotal = Math.round(repSum);
          }
        } catch (err) {
          console.warn('Error generating production report for design pricing:', err);
        }
      }

      if (!calculatedUnitTotal) {
        const quote = calculateQuotation(d, template, inventory, totalUnits);
        calculatedUnitTotal = Math.round(quote.find(q => q.id === 21)?.value || d.unitPrice || 0);
      }

      const qty = d.quantity || 1;
      return {
        ...d,
        unitPrice: calculatedUnitTotal,
        totalPrice: calculatedUnitTotal * qty
      };
    });
  };

  const loadDesigns = (): CustomerDesignCardItem[] => {
    let list: CustomerDesignCardItem[] = getCustomerDesigns(customer);

    // Auto-heal frames, pockets, and dimensions if stale in storage
    const healedList: CustomerDesignCardItem[] = list.map((item) => {
      if (item.projectData?.frames && item.projectData.frames.length > 0) {
        const bounds = calculateAssemblyBounds(item.projectData.frames);
        const totalW = bounds.totalWidth || item.width || 1200;
        const totalH = bounds.totalHeight || item.height || 1200;
        const healedFrames = item.projectData.frames.map((f) => {
          let pockets = f.pockets;
          if (!pockets || pockets.length === 0) {
            pockets = recalculateFramePockets(f);
          }
          return {
            ...f,
            pockets: pockets.map((p) => {
              const effectiveGlass = (p.glassType === 'tint_grey' ? 'clear_6mm' : (p.glassType || item.glassType || 'clear_6mm')) as GlassType;
              return {
                ...p,
                glassType: effectiveGlass,
              };
            }),
          };
        });
        const healedGlassType = (item.glassType === 'tint_grey' ? 'clear_6mm' : (item.glassType || 'clear_6mm')) as GlassType;
        return {
          ...item,
          glassType: healedGlassType,
          width: totalW,
          height: totalH,
          projectData: {
            ...item.projectData,
            frames: healedFrames,
          },
        };
      }
      return item;
    });

    const calculatedList = recalculateDesignsList(healedList);

    // Persist healed/recalculated list locally without triggering parent setState during render
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(calculatedList));
      } catch (e) {}
    }

    return calculatedList;
  };

  const [designs, setDesigns] = useState<CustomerDesignCardItem[]>(loadDesigns);

  // Synchronize customer summary totals to parent App safely inside an effect after render
  React.useEffect(() => {
    const totals = calculateCustomerTotals(designs);
    if (
      customer.projectValue !== totals.totalAmount ||
      customer.designsCount !== totals.designsCount ||
      customer.qtyCount !== totals.qtyCount
    ) {
      if (onUpdateCustomer) {
        onUpdateCustomer({
          ...customer,
          projectValue: totals.totalAmount,
          totalSpent: totals.totalAmount,
          designsCount: totals.designsCount,
          qtyCount: totals.qtyCount,
          totalProjects: totals.designsCount > 0 ? totals.designsCount : customer.totalProjects || 0,
        });
      }
    }
  }, [customer.id, designs, customer.projectValue, customer.designsCount, customer.qtyCount, onUpdateCustomer]);

  // Reload designs whenever customer changes, storage updates, window focuses, or custom event fires
  React.useEffect(() => {
    const handleReload = (e?: Event) => {
      if (e && (e as CustomEvent).detail && (e as CustomEvent).detail.customerId && (e as CustomEvent).detail.customerId !== customer.id) {
        return;
      }
      setDesigns(loadDesigns());
    };

    window.addEventListener('storage', handleReload);
    window.addEventListener('upvc_customer_designs_changed', handleReload);
    window.addEventListener('focus', handleReload);

    return () => {
      window.removeEventListener('storage', handleReload);
      window.removeEventListener('upvc_customer_designs_changed', handleReload);
      window.removeEventListener('focus', handleReload);
    };
  }, [customer.id, storageKey]);

  // Save designs when changed
  const updateDesigns = (newDesigns: CustomerDesignCardItem[]) => {
    const calculated = recalculateDesignsList(newDesigns);
    setDesigns(calculated);
    saveCustomerDesignsAndSync(customer.id, calculated, onUpdateCustomer);
  };

  // Instantly Add 1000x1000 Design and Open directly in CAD (No extra option popups)
  const handleAddNew1000InCAD = () => {
    const currentList = loadDesigns();
    const tpl = TEMPLATES.find((t) => t.id === 'starter_1000x1000') || TEMPLATES[0];
    const newProj = tpl.getProject();
    const nextIndex = currentList.length + 1;
    const tag = `W${nextIndex}`;
    newProj.id = `proj_cust_${Date.now()}`;
    newProj.name = `Window ${tag} (${customer.name})`;
    newProj.clientName = customer.name;
    newProj.referenceNo = tag;
    if (newProj.frames[0]) {
      newProj.frames[0].width = 1000;
      newProj.frames[0].height = 1000;
    }

    const newDesign: CustomerDesignCardItem = {
      id: `des-${Date.now()}`,
      tag,
      type: 'Casement',
      location: 'No location',
      width: 1000,
      height: 1000,
      seriesName: `${(customer.brand || 'Duron').toUpperCase()} CASEMENT 60`,
      quantity: 1,
      unitPrice: 19000,
      totalPrice: 19000,
      projectData: newProj,
      glassType: 'clear_5mm',
      profileColor: 'white',
      floorDistance: 900,
    };

    const updated = [...currentList, newDesign];
    updateDesigns(updated);
    showToast(`1000×1000mm फ्रेम तैयार! CAD खुल रहा है...`);
    onOpenDesignInCAD(newDesign);
  };

  // Top Nav Tabs: 'documents' | 'design' | 'cutting' | 'pricing' | 'report' | 'quotation' | 'payments'
  const [activeMainTab, setActiveMainTab] = useState<'documents' | 'design' | 'cutting' | 'pricing' | 'report' | 'quotation' | 'payments'>(() => {
    try {
      const saved = localStorage.getItem(`upvc_last_active_tab_${customer.id}`);
      if (saved && ['documents', 'design', 'cutting', 'pricing', 'report', 'quotation', 'payments'].includes(saved)) {
        localStorage.removeItem(`upvc_last_active_tab_${customer.id}`);
        return saved as 'documents' | 'design' | 'cutting' | 'pricing' | 'report' | 'quotation' | 'payments';
      }
    } catch (e) {}
    return 'design';
  });

  // Dedicated Cutting List Tab View States
  const [cuttingViewMode, setCuttingViewMode] = useState<'official_report' | 'interactive_tables'>('official_report');
  const [cuttingSelectedDesignId, setCuttingSelectedDesignId] = useState<string>('all');
  const [cuttingActiveSection, setCuttingActiveSection] = useState<'profiles' | 'glass' | 'steel' | 'hardware'>('profiles');

  // Sub-header Tabs: 'project' | 'catalog'
  const [subTab, setSubTab] = useState<'project' | 'catalog'>('project');
  const [catalogFilter, setCatalogFilter] = useState<'sliding' | 'casement' | 'all'>('sliding');

  // Modals & Popovers
  const [showGlobalEditsDropdown, setShowGlobalEditsDropdown] = useState(false);
  const [activeGlobalCategory, setActiveGlobalCategory] = useState<GlobalEditCategory>('glass');
  const [showGlobalEditsModal, setShowGlobalEditsModal] = useState(false);
  const [showProjectDefaultsModal, setShowProjectDefaultsModal] = useState(false);
  const [showQuickQuoteMenu, setShowQuickQuoteMenu] = useState(false);
  const [showAddDesignModal, setShowAddDesignModal] = useState(false);
  const [showCustomerAddDesignModal, setShowCustomerAddDesignModal] = useState(false);
  const [editingDesignForModal, setEditingDesignForModal] = useState<CustomerDesignCardItem | null>(null);
  const [designForGlassChange, setDesignForGlassChange] = useState<CustomerDesignCardItem | null>(null);
  const [focusedPocketIndexForGlass, setFocusedPocketIndexForGlass] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Software update banner (Screenshot 1)
  const [showUpdateNotice, setShowUpdateNotice] = useState(true);

  // Configurator Modal (Screenshot 4)
  const [showEvaConfigurator, setShowEvaConfigurator] = useState(false);
  const [configuratorDesign, setConfiguratorDesign] = useState<CustomerDesignCardItem | null>(null);

  // Search, Selection & View Modes
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDesignIds, setSelectedDesignIds] = useState<string[]>([]);

  const toggleSelectDesign = (id: string) => {
    setSelectedDesignIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredDesigns = useMemo(() => {
    if (!searchQuery.trim()) return designs;
    const q = searchQuery.toLowerCase();
    return designs.filter(
      (d) =>
        d.tag.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.seriesName.toLowerCase().includes(q)
    );
  }, [designs, searchQuery]);

  const isAllSelected = useMemo(() => {
    return filteredDesigns.length > 0 && filteredDesigns.every((d) => selectedDesignIds.includes(d.id));
  }, [filteredDesigns, selectedDesignIds]);

  const isSomeSelected = useMemo(() => {
    return selectedDesignIds.length > 0 && !isAllSelected;
  }, [selectedDesignIds.length, isAllSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDesignIds([]);
    } else {
      setSelectedDesignIds(filteredDesigns.map((d) => d.id));
    }
  };

  const [cardMenuOpenId, setCardMenuOpenId] = useState<string | null>(null);

  // Pricing View Sidebar Tab (Screenshot 2)
  const [pricingSidebarTab, setPricingSidebarTab] = useState<
    'structure' | 'profile' | 'reinforcement' | 'hardware' | 'glass' | 'mesh' | 'addon'
  >('structure');

  // Editable cost heads for Pricing structure (Screenshot 2)
  const [pricingRates, setPricingRates] = useState<Record<string, number>>({
    'Profile Cost': 1,
    'Profile Wastage': 10,
    'RI Cost': 1,
    'RI Wastage': 5,
    'Hardware Cost': 1,
    'Glass Cost': 1,
    'Glass Wastage': 5,
    'Total Raw Material Cost': 1,
    'Fabrication Labour': 0,
    'Installation Labour': 0,
    'Sub Total Including Labour': 1,
    'Profit': 0,
    'Basic Value': 1,
    'Discount': 0,
  });

  // Report View Sidebar Tab (Matching User Screenshots)
  const [reportSidebarTab, setReportSidebarTab] = useState<
    'favourite' | 'details' | 'costing' | 'production' | 'dispatch'
  >('details');
  const [favouriteReports, setFavouriteReports] = useState<string[]>([
    'basic-dim',
    'elevation',
    'quotation',
    'cutting-schedule',
  ]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [activeReportModalId, setActiveReportModalId] = useState<string | null>(null);
  const [detailsSubView, setDetailsSubView] = useState<'all' | 'basic-dim' | 'elevation'>('all');
  const [productionSubView, setProductionSubView] = useState<'all' | 'requirement' | 'gi_requirement'>('all');
  const [isExportingElevation, setIsExportingElevation] = useState(false);
  const [elevationExportStatus, setElevationExportStatus] = useState('');
  const [elevationCardSize, setElevationCardSize] = useState<'large' | 'standard'>('large');

  // Direct Excel Export with CAD drawings for Elevation Schedule
  const handleDirectElevationExcelExport = async () => {
    setIsExportingElevation(true);
    setElevationExportStatus('Rendering CAD vector drawings for Excel...');
    try {
      await exportElevationReportToExcel(customer, designs, (cur, tot) => {
        setElevationExportStatus(`Embedding CAD Drawings (${cur} of ${tot})...`);
      });
      showToast('CAD Elevation Schedule (.xlsx) downloaded successfully!');
    } catch (err) {
      console.error('Direct elevation export failed:', err);
      // Fallback to opening the report modal
      setActiveReportModalId('elevation');
    } finally {
      setIsExportingElevation(false);
      setElevationExportStatus('');
    }
  };

  // Callback from CustomerAddDesignModal
  const handleCreateCustomerDesign = (newDesign: CustomerDesignCardItem, openInCAD: boolean) => {
    const currentList = loadDesigns();
    const updated = [...currentList, newDesign];
    updateDesigns(updated);
    showToast(`डिज़ाइन ${newDesign.tag} सफलतापूर्वक जोड़ा गया!`);
    if (openInCAD) {
      onOpenDesignInCAD(newDesign);
    }
  };

  const handleUpdateCustomerDesign = (updatedDesign: CustomerDesignCardItem, openInCAD: boolean = false) => {
    const currentList = loadDesigns();
    const updated = currentList.map((d) => (d.id === updatedDesign.id ? updatedDesign : d));
    updateDesigns(updated);
    showToast(`डिज़ाइन ${updatedDesign.tag} सफलतापूर्वक अपडेट हुआ!`);
    if (openInCAD) {
      onOpenDesignInCAD(updatedDesign);
    }
  };

  // Save glass changes on a design card
  const handleSaveDesignGlass = (
    designId: string,
    updatedGlassType: GlassType,
    pocketOverrides?: Record<number, GlassType>
  ) => {
    const currentList = loadDesigns();
    const updated = currentList.map((d) => {
      if (d.id !== designId) return d;
      const projCopy: UPVCProject = JSON.parse(JSON.stringify(d.projectData));
      if (projCopy.frames) {
        projCopy.frames.forEach((f: UPVCFrame) => {
          if (f.pockets) {
            f.pockets.forEach((p, pIdx) => {
              if (pocketOverrides && pocketOverrides[pIdx]) {
                p.glassType = pocketOverrides[pIdx];
              } else {
                p.glassType = updatedGlassType;
              }
            });
          }
        });
      }
      return {
        ...d,
        glassType: updatedGlassType,
        projectData: projCopy,
      };
    });
    updateDesigns(updated);
    showToast(`काँच अपडेट हुआ (${GLASS_OPTIONS.find((g) => g.id === updatedGlassType)?.nameHindi.split('(')[0] || '6mm Toughened'})`);
    setDesignForGlassChange(null);
    setFocusedPocketIndexForGlass(null);
  };

  // Global Edits Form State
  const [bulkSeries, setBulkSeries] = useState(customer.brand || 'Duron Casement 60');
  const [bulkColor, setBulkColor] = useState('White');
  const [bulkGlass, setBulkGlass] = useState<GlassType>('clear_6mm');
  const [bulkDiscount, setBulkDiscount] = useState<number>(0);

  // Project Defaults State
  const [defaultBrand, setDefaultBrand] = useState(customer.brand || 'Duron');
  const [defaultFloorClearance, setDefaultFloorClearance] = useState<number>(900);
  const [defaultCouplerGap, setDefaultCouplerGap] = useState<number>(2);

  // Totals calculations
  const totalAmount = useMemo(() => {
    return designs.reduce((sum, d) => sum + (d.totalPrice || d.unitPrice * d.quantity), 0);
  }, [designs]);

  const totalQuantity = useMemo(() => {
    return designs.reduce((sum, d) => sum + (d.quantity || 1), 0);
  }, [designs]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Duplicate a design
  const handleDuplicateDesign = (design: CustomerDesignCardItem) => {
    const existingTags = new Set(designs.map((d) => d.tag?.toUpperCase()));
    let nextIndex = designs.length + 1;
    while (existingTags.has(`W${nextIndex}`) || existingTags.has(`D${nextIndex}`)) {
      nextIndex++;
    }
    const newTag = `W${nextIndex}`;
    const newProjData = JSON.parse(JSON.stringify(design.projectData));
    newProjData.id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    newProjData.referenceNo = newTag;

    const duplicated: CustomerDesignCardItem = {
      ...design,
      id: `des_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tag: newTag,
      location: `${design.location} (Copy)`,
      totalPrice: design.unitPrice * (design.quantity || 1),
      projectData: newProjData,
    };
    updateDesigns([...designs, duplicated]);
    showToast(`Design ${design.tag} duplicated as ${newTag}`);
  };

  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk' | 'all';
    targetId?: string;
    targetTag?: string;
    targetDesign?: CustomerDesignCardItem;
    count?: number;
    tagsList?: string[];
  } | null>(null);

  // Trigger single design delete confirmation
  const handleRequestDeleteSingle = (id: string, tag: string) => {
    const target = designs.find((d) => d.id === id);
    setDeleteConfirmModal({
      isOpen: true,
      type: 'single',
      targetId: id,
      targetTag: tag,
      targetDesign: target,
    });
  };

  // Trigger bulk delete confirmation
  const handleRequestDeleteBulk = () => {
    if (selectedDesignIds.length === 0) return;
    const selectedDesigns = designs.filter((d) => selectedDesignIds.includes(d.id));
    const tags = selectedDesigns.map((d) => d.tag);
    setDeleteConfirmModal({
      isOpen: true,
      type: 'bulk',
      count: selectedDesignIds.length,
      tagsList: tags,
    });
  };

  // Trigger delete all designs confirmation
  const handleRequestDeleteAll = () => {
    if (designs.length === 0) return;
    const tags = designs.map((d) => d.tag);
    setDeleteConfirmModal({
      isOpen: true,
      type: 'all',
      count: designs.length,
      tagsList: tags,
    });
  };

  // Execute confirmed deletion
  const handleConfirmDelete = () => {
    if (!deleteConfirmModal) return;

    if (deleteConfirmModal.type === 'single' && deleteConfirmModal.targetId) {
      const idToDelete = deleteConfirmModal.targetId;
      const tagToDelete = deleteConfirmModal.targetTag || 'Design';
      const filtered = designs.filter((d) => d.id !== idToDelete);
      updateDesigns(filtered);
      setSelectedDesignIds((prev) => prev.filter((id) => id !== idToDelete));
      showToast(`डिज़ाइन ${tagToDelete} हटा दिया गया!`);
    } else if (deleteConfirmModal.type === 'bulk') {
      const toDeleteSet = new Set(selectedDesignIds);
      const filtered = designs.filter((d) => !toDeleteSet.has(d.id));
      const deletedCount = toDeleteSet.size;
      updateDesigns(filtered);
      setSelectedDesignIds([]);
      showToast(`${deletedCount} डिज़ाइन एक साथ सफलतापूर्वक डिलीट कर दिए गए!`);
    } else if (deleteConfirmModal.type === 'all') {
      const deletedCount = designs.length;
      updateDesigns([]);
      setSelectedDesignIds([]);
      showToast(`कस्टमर के सभी ${deletedCount} डिज़ाइन सफलतापूर्वक हटा दिए गए!`);
    }

    setDeleteConfirmModal(null);
  };

  // Duplicate multiple selected designs
  const handleDuplicateSelected = () => {
    if (selectedDesignIds.length === 0) return;
    const toDuplicate = designs.filter((d) => selectedDesignIds.includes(d.id));
    const newItems: CustomerDesignCardItem[] = [];
    const existingTags = new Set(designs.map((d) => d.tag?.toUpperCase()));
    let nextIndex = designs.length + 1;

    toDuplicate.forEach((item) => {
      while (existingTags.has(`W${nextIndex}`) || existingTags.has(`D${nextIndex}`)) {
        nextIndex++;
      }
      const newTag = `W${nextIndex}`;
      existingTags.add(newTag);
      const newProjData = JSON.parse(JSON.stringify(item.projectData));
      newProjData.id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      newProjData.referenceNo = newTag;

      newItems.push({
        ...item,
        id: `des_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        tag: newTag,
        location: `${item.location} (Copy)`,
        totalPrice: item.unitPrice * (item.quantity || 1),
        projectData: newProjData,
      });
      nextIndex++;
    });

    updateDesigns([...designs, ...newItems]);
    showToast(`${newItems.length} डिज़ाइन सफलतापूर्वक डुप्लीकेट किए गए!`);
    setSelectedDesignIds([]);
  };

  // Delete a design (backwards compatibility)
  const handleDeleteDesign = (id: string) => {
    const target = designs.find((d) => d.id === id);
    handleRequestDeleteSingle(id, target?.tag || 'Design');
  };

  // Add new design from template
  const handleAddNewFromTemplate = (templateId: string, customTag?: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
    const newProj = JSON.parse(JSON.stringify(tpl.getProject()));
    newProj.id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const existingTags = new Set(designs.map((d) => d.tag?.toUpperCase()));
    let nextIndex = designs.length + 1;
    while (existingTags.has(`W${nextIndex}`) || existingTags.has(`D${nextIndex}`)) {
      nextIndex++;
    }
    const tag = customTag || `W${nextIndex}`;
    newProj.referenceNo = tag;
    newProj.clientName = customer.name;

    const bounds = calculateAssemblyBounds(newProj.frames);
    const newDesign: CustomerDesignCardItem = {
      id: `des_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tag,
      type: 'Casement',
      location: 'No location',
      width: bounds.totalWidth || 1000,
      height: bounds.totalHeight || 1000,
      seriesName: 'CASEMENT 60 SERIES',
      quantity: 1,
      unitPrice: 19500,
      totalPrice: 19500,
      projectData: newProj,
      glassType: 'clear_5mm',
      profileColor: 'white',
      floorDistance: 900,
    };

    updateDesigns([...designs, newDesign]);
    setShowAddDesignModal(false);
    showToast(`Added new design ${tag}`);
  };

  // Add new design from 18 Sliding Designs Catalog
  const handleAddNewFromSlidingDesign = (slidingDef: SlidingDesignDef, customTag?: string) => {
    const existingTags = new Set(designs.map((d) => d.tag?.toUpperCase()));
    let nextIndex = designs.length + 1;
    while (existingTags.has(`W${nextIndex}`) || existingTags.has(`D${nextIndex}`)) {
      nextIndex++;
    }
    const tag = customTag || `W${nextIndex}`;
    const panelCount = slidingDef.panelOperations.length;
    const width = slidingDef.defaultWidth || (panelCount === 2 ? 1800 : panelCount === 3 ? 2400 : panelCount === 4 ? 3200 : panelCount === 6 ? 4800 : 2000);
    const height = slidingDef.defaultHeight || 1500;
    const segmentW = width / panelCount;
    const hasMesh = slidingDef.badge.includes('Mesh') || slidingDef.description.toLowerCase().includes('mesh');

    const newMullions: Mullion[] = [];
    for (let i = 1; i < panelCount; i++) {
      newMullions.push({
        id: `mul-sl-${Date.now()}-${i}`,
        orientation: 'vertical',
        position: Math.round(segmentW * i),
        width: 16,
      });
    }

    const frame: UPVCFrame = {
      id: `frame-${Date.now()}`,
      name: `F1 (${slidingDef.name})`,
      x: 0,
      y: 0,
      width,
      height,
      series: slidingDef.series,
      frameProfileWidth: slidingDef.trackType === '3-Track' ? 88 : 62,
      mullionProfileWidth: 16,
      sashProfileWidth: 62,
      color: 'white',
      reinforcement: 'steel_1.5mm',
      drainageCaps: true,
      hasCenterLock: slidingDef.hasCenterLock ?? false,
      mullions: newMullions,
      pockets: [],
    };

    if (slidingDef.customSetup) {
      slidingDef.customSetup(frame);
    } else {
      frame.pockets = recalculateFramePockets(frame);
      slidingDef.panelOperations.forEach((op, idx) => {
        if (frame.pockets[idx]) {
          frame.pockets[idx].sashType = op;
          frame.pockets[idx].glassType = 'clear_6mm';
          frame.pockets[idx].customLabel = slidingDef.sashLabels?.[idx] || `S${idx + 1}`;
        }
      });
    }

    const newProj: UPVCProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: `${slidingDef.name} (${tag})`,
      clientName: customer.name,
      referenceNo: tag,
      date: new Date().toISOString(),
      frames: [frame],
      couplings: [],
      pricingConfig: DEFAULT_PRICING_CONFIG,
    };

    const estRate = Math.round(35000 + (panelCount - 2) * 12000 + (hasMesh ? 4500 : 0));

    const newDesign: CustomerDesignCardItem = {
      id: `des_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tag,
      type: 'Sliding',
      location: 'No location',
      width,
      height,
      seriesName: slidingDef.trackType === '3-Track' ? 'SLIDING 3-TRACK (88MM)' : 'SLIDING 2.5-TRACK (62MM)',
      quantity: 1,
      unitPrice: estRate,
      totalPrice: estRate,
      projectData: newProj,
      glassType: 'clear_6mm',
      profileColor: 'white',
      floorDistance: 900,
    };

    updateDesigns([...designs, newDesign]);
    setShowAddDesignModal(false);
    showToast(`Added sliding design ${slidingDef.name} (${tag})`);
  };

  // Apply Global Edits (from GlobalEditsModal)
  const handleApplyGlobalEdit = (
    cat: GlobalEditCategory,
    selectedDesignIds: string[],
    targetValue: string | number
  ) => {
    const updated = designs.map((d) => {
      if (!selectedDesignIds.includes(d.id)) return d;

      const updatedDesign = { ...d };

      switch (cat) {
        case 'glass': {
          let glassCode: GlassType = 'clear_6mm';
          const valStr = String(targetValue).toLowerCase();
          if (valStr.includes('black')) glassCode = 'tint_grey';
          else if (valStr.includes('frosted')) glassCode = 'frosted';
          else if (valStr.includes('reflective')) glassCode = 'reflective_mirror';
          else if (valStr.includes('dgu_28')) glassCode = 'dgu_6_16_6';
          else if (valStr.includes('dgu')) glassCode = 'dgu_5_12_5';
          else if (valStr.includes('pinhead')) glassCode = 'pinhead';
          else if (valStr.includes('5mm') || valStr.includes('5 mm')) glassCode = 'clear_5mm';
          else if (valStr.includes('8mm') || valStr.includes('8 mm')) glassCode = 'clear_8mm';
          else if (valStr.includes('10mm') || valStr.includes('10 mm')) glassCode = 'clear_10mm';
          else if (valStr.includes('12mm') || valStr.includes('12 mm')) glassCode = 'clear_12mm';

          updatedDesign.glassType = glassCode;
          if (updatedDesign.projectData?.frames) {
            updatedDesign.projectData = {
              ...updatedDesign.projectData,
              frames: updatedDesign.projectData.frames.map((f) => ({
                ...f,
                glassType: glassCode,
                pockets: f.pockets.map((p) => ({
                  ...p,
                  glassType: glassCode,
                  customGlassName: String(targetValue),
                })),
              })),
            };
          }
          break;
        }
        case 'mesh': {
          const hasMesh = targetValue !== 'NO MESH';
          const meshStr = String(targetValue);
          if (updatedDesign.projectData?.frames) {
            updatedDesign.projectData = {
              ...updatedDesign.projectData,
              frames: updatedDesign.projectData.frames.map((f) => ({
                ...f,
                pockets: f.pockets.map((p) => {
                  if (
                    p.sashType?.startsWith('slider') ||
                    p.sashType?.startsWith('casement') ||
                    p.hasMesh
                  ) {
                    return {
                      ...p,
                      hasMesh,
                      meshType: hasMesh ? meshStr : undefined,
                    };
                  }
                  return p;
                }),
              })),
            };
          }
          break;
        }
        case 'color': {
          const colStr = String(targetValue);
          let colorKey = 'white';
          const lower = colStr.toLowerCase();
          if (lower.includes('golden')) colorKey = 'golden_oak';
          else if (lower.includes('walnut')) colorKey = 'walnut';
          else if (lower.includes('dark') || lower.includes('ash')) colorKey = 'dark_ash';
          else if (lower.includes('grey') || lower.includes('gray') || lower.includes('anthracite')) colorKey = 'anthracite';
          else if (lower.includes('black')) colorKey = 'matt_black';
          else if (lower.includes('mahogany')) colorKey = 'mahogany';
          else if (lower.includes('cream')) colorKey = 'off_white';

          updatedDesign.profileColor = colorKey;
          if (updatedDesign.projectData?.frames) {
            updatedDesign.projectData = {
              ...updatedDesign.projectData,
              frames: updatedDesign.projectData.frames.map((f) => ({
                ...f,
                color: colorKey,
              })),
            };
          }
          break;
        }
        case 'standard_bar': {
          const barStr = String(targetValue);
          if (updatedDesign.projectData?.frames) {
            updatedDesign.projectData = {
              ...updatedDesign.projectData,
              frames: updatedDesign.projectData.frames.map((f) => ({
                ...f,
                standardBar: barStr,
              })),
            };
          }
          break;
        }
        case 'design_quantity': {
          const qty =
            typeof targetValue === 'number'
              ? targetValue
              : parseInt(String(targetValue), 10) || 1;
          updatedDesign.quantity = Math.max(1, qty);
          updatedDesign.totalPrice = updatedDesign.unitPrice * updatedDesign.quantity;
          break;
        }
        case 'ri_thickness': {
          const riStr = String(targetValue);
          let thickness = 1.5;
          if (riStr.includes('0.8')) thickness = 0.8;
          else if (riStr.includes('1.0')) thickness = 1.0;
          else if (riStr.includes('1.2')) thickness = 1.2;
          else if (riStr.includes('1.8')) thickness = 1.8;
          else if (riStr.includes('2.0')) thickness = 2.0;
          else if (riStr.includes('2.5')) thickness = 2.5;

          if (updatedDesign.projectData?.frames) {
            updatedDesign.projectData = {
              ...updatedDesign.projectData,
              frames: updatedDesign.projectData.frames.map((f) => ({
                ...f,
                reinforcementThickness: thickness,
                reinforcementCavity: riStr,
                pockets: f.pockets.map((p) => ({
                  ...p,
                  reinforcementCavity: riStr,
                })),
              })),
            };
          }
          break;
        }
      }

      return updatedDesign;
    });

    updateDesigns(updated);
    showToast(
      `Global edit applied: ${selectedDesignIds.length} design(s) updated with ${targetValue}!`
    );
  };

  // Active Project for Cutting List (Combined or Individual)
  const activeCuttingProject: UPVCProject = useMemo(() => {
    if (cuttingSelectedDesignId === 'all') {
      const allFrames: UPVCFrame[] = [];
      designs.forEach((d) => {
        if (d.projectData?.frames) {
          d.projectData.frames.forEach((f, fIdx) => {
            allFrames.push({
              ...f,
              id: `${d.id}_${f.id || fIdx}`,
              name: `${d.tag} - ${f.name || `Frame ${fIdx + 1}`}`,
              color: normalizeFrameColorId(f.color, d.profileColor || 'white'),
            });
          });
        }
      });
      return {
        id: `combined_${customer.id}`,
        name: `${customer.name} - Complete Project Assembly`,
        clientName: customer.name,
        referenceNo: customer.id,
        date: new Date().toISOString(),
        frames: allFrames,
        couplings: [],
        pricingConfig: DEFAULT_PRICING_CONFIG,
      };
    } else {
      const d = designs.find((item) => item.id === cuttingSelectedDesignId);
      return d?.projectData || {
        id: 'empty',
        name: 'Empty',
        clientName: customer.name,
        referenceNo: '',
        date: new Date().toISOString(),
        frames: [],
        couplings: [],
        pricingConfig: DEFAULT_PRICING_CONFIG,
      };
    }
  }, [designs, customer, cuttingSelectedDesignId]);

  // Generate Cutting Items Schedule
  const cuttingScheduleItems: CuttingItem[] = useMemo(() => {
    return generateCuttingSchedule(activeCuttingProject.frames || [], activeCuttingProject.couplings || []);
  }, [activeCuttingProject]);

  // Generate Single Frame Production Reports
  const productionReports = useMemo(() => {
    const totalCustomerUnits = designs.reduce((sum, d) => sum + (d.quantity || 1), 0);
    return generateProductionReports(
      activeCuttingProject.frames || [],
      activeCuttingProject.couplings || [],
      {
        name: activeCuttingProject.name,
        referenceNo: activeCuttingProject.referenceNo,
        date: activeCuttingProject.date,
        clientName: activeCuttingProject.clientName,
        totalCustomerUnits: Math.max(1, totalCustomerUnits),
      }
    );
  }, [activeCuttingProject, designs]);

  // Aggregate Metrics for Cutting List
  const cuttingMetrics = useMemo(() => {
    const profilePieces = cuttingScheduleItems.filter(
      (i) => i.itemType !== 'Glass' && i.itemType !== 'Reinforcement'
    ).reduce((acc, i) => acc + i.quantity, 0);

    let totalGlassPanes = 0;
    let totalGlassSqM = 0;
    productionReports.forEach((rep) => {
      rep.glazing.forEach((g) => {
        totalGlassPanes += g.quantity;
        totalGlassSqM += (g.width * g.height * g.quantity) / 1000000;
      });
    });

    let totalSteelPieces = 0;
    let totalSteelMeters = 0;
    productionReports.forEach((rep) => {
      rep.reinforcements.forEach((r) => {
        totalSteelPieces += r.quantity;
        totalSteelMeters += (r.dimension * r.quantity) / 1000;
      });
    });

    let totalHardwarePcs = 0;
    productionReports.forEach((rep) => {
      ((rep.hardwares || (rep as any).hardware || []) as any[]).forEach((h) => {
        totalHardwarePcs += h.quantity || 0;
      });
    });

    return {
      profilePieces,
      totalGlassPanes,
      glassSqM: totalGlassSqM.toFixed(2),
      glassSqFt: (totalGlassSqM * 10.7639).toFixed(1),
      totalSteelPieces,
      steelMeters: totalSteelMeters.toFixed(1),
      steelKg: (totalSteelMeters * 0.95).toFixed(1),
      totalHardwarePcs,
    };
  }, [cuttingScheduleItems, productionReports]);

  // Reference Code
  const referenceCode = customer.gstNumber ? 'SHR-QT-V-SAMPLE' : customer.id;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 0. SOFTWARE UPDATE BANNER (Screenshot 1) */}
      {showUpdateNotice && (
        <div className="bg-[#1e293b] text-white text-xs px-4 py-2 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-200">
              A new software update is available, You can reload now to get the updates.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
            >
              Reload Now
            </button>
            <button
              onClick={() => setShowUpdateNotice(false)}
              className="px-3 py-1 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER NAVBAR (Exact Match to Screenshot 1, 2, 3) */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left: Back button & Site Name / Customer */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Back to Customers"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-slate-300" />

          <div className="flex flex-col">
            <h1 className="text-xs font-black text-slate-900 leading-tight">
              {customer.siteAddress || customer.name || 'SEC-5 P-14 F-A19'}
            </h1>
            <span className="text-[10px] font-semibold text-slate-400">
              {referenceCode || 'SHR-QT-0000062'}
            </span>
          </div>
        </div>

        {/* Center: 4 Nav Tabs (Documents, Design, Pricing, Report) */}
        <nav className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab('documents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeMainTab === 'documents'
                ? 'border border-blue-500 bg-blue-50/80 text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documents</span>
          </button>

          <button
            onClick={() => setActiveMainTab('design')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeMainTab === 'design'
                ? 'border border-blue-500 bg-blue-50/80 text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Design</span>
          </button>

          <button
            onClick={() => setActiveMainTab('pricing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeMainTab === 'pricing'
                ? 'border border-blue-500 bg-blue-50/80 text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Pricing</span>
          </button>

          <button
            onClick={() => setActiveMainTab('report')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeMainTab === 'report'
                ? 'border border-blue-500 bg-blue-50/80 text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Report</span>
          </button>
        </nav>

        {/* Right Side: Cart Amount, Quick Quote, Icons, Avatar */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveMainTab('pricing')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
          >
            <ShoppingCart className="w-4 h-4 text-slate-700" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-slate-900 leading-tight">
                ₹{Math.round(totalAmount).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5">
                Qty : {totalQuantity} <span className="text-[9px] text-slate-400">ⓘ</span>
              </span>
            </div>
          </div>

          {/* Android Mobile App Install Button */}
          <PWAInstallButton variant="compact" />

          {/* Green Quick quote dropdown button */}
          <div className="relative">
            <button
              onClick={() => setShowQuickQuoteMenu(!showQuickQuoteMenu)}
              className="bg-[#15803d] hover:bg-[#166534] text-white rounded-md font-semibold px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <span>Quick quote</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showQuickQuoteMenu && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setShowQuickQuoteMenu(false);
                    setActiveMainTab('quotation');
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Formal Quotation (PDF)</span>
                </button>
                <button
                  onClick={() => {
                    setShowQuickQuoteMenu(false);
                    const msg = `Namaste ${customer.name}, your UPVC Quotation for ${designs.length} designs totaling ₹${totalAmount.toLocaleString('en-IN')} is ready.`;
                    window.open(`https://wa.me/${customer.phone ? customer.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            )}
          </div>

          <HelpCircle className="w-4 h-4 text-slate-500 hover:text-slate-800 cursor-pointer transition" />
          <PlayCircle className="w-4 h-4 text-slate-500 hover:text-slate-800 cursor-pointer transition" />
          <GridIcon className="w-4 h-4 text-slate-500 hover:text-slate-800 cursor-pointer transition" />

          {/* User Avatar */}
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer">
            S
          </div>
        </div>
      </header>

      {/* 2. SUB-HEADER ROW 1 (Project / Library Designs + Configurator 2.0 Button) */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs">
        {/* Left: Project / Library designs */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setSubTab('project')}
            className={`font-bold transition pb-1 cursor-pointer ${
              subTab === 'project'
                ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Project
          </button>
          <button
            onClick={() => setSubTab('catalog')}
            className={`font-bold transition pb-1 cursor-pointer ${
              subTab === 'catalog'
                ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Library designs
          </button>
        </div>

        {/* Right: Try new configurator 2.0, Global edits, Project defaults */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (designs.length > 0) {
                setConfiguratorDesign(designs[0]);
              }
              setShowEvaConfigurator(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-300 hover:border-purple-500 text-slate-700 hover:text-purple-700 font-semibold text-xs transition cursor-pointer"
          >
            <span>Try new configurator</span>
            <span className="bg-[#7c3aed] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              2.0
            </span>
          </button>

          {/* Global edits dropdown menu matching Image 1 */}
          <div className="relative">
            <button
              onClick={() => setShowGlobalEditsDropdown(!showGlobalEditsDropdown)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-semibold text-xs transition cursor-pointer ${
                showGlobalEditsDropdown
                  ? 'border-[#0066cc] bg-[#f0f7ff] text-[#0066cc] ring-2 ring-blue-100 shadow-2xs'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Global edits</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGlobalEditsDropdown ? 'rotate-180 text-[#0066cc]' : 'text-slate-500'}`} />
            </button>

            {showGlobalEditsDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowGlobalEditsDropdown(false)}
                />
                <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 font-sans">
                  {/* 1. Glass */}
                  <button
                    onClick={() => {
                      setActiveGlobalCategory('glass');
                      setShowGlobalEditsDropdown(false);
                      setShowGlobalEditsModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-blue-50/70 hover:text-blue-700 transition text-left cursor-pointer group"
                  >
                    <div className="w-5 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <rect x="3" y="3" width="18" height="18" rx="1.5" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                        <line x1="6" y1="6" x2="9" y2="10" strokeWidth="1.25" />
                        <line x1="15" y1="6" x2="18" y2="10" strokeWidth="1.25" />
                      </svg>
                    </div>
                    <span>Glass</span>
                  </button>

                  {/* 2. Mesh */}
                  <button
                    onClick={() => {
                      setActiveGlobalCategory('mesh');
                      setShowGlobalEditsDropdown(false);
                      setShowGlobalEditsModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-blue-50/70 hover:text-blue-700 transition text-left cursor-pointer group"
                  >
                    <div className="w-5 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <rect x="3" y="3" width="18" height="18" rx="1.5" />
                        <line x1="8" y1="3" x2="8" y2="21" strokeWidth="1.25" />
                        <line x1="13" y1="3" x2="13" y2="21" strokeWidth="1.25" />
                        <line x1="18" y1="3" x2="18" y2="21" strokeWidth="1.25" />
                        <line x1="3" y1="8" x2="21" y2="8" strokeWidth="1.25" />
                        <line x1="3" y1="13" x2="21" y2="13" strokeWidth="1.25" />
                        <line x1="3" y1="18" x2="21" y2="18" strokeWidth="1.25" />
                      </svg>
                    </div>
                    <span>Mesh</span>
                  </button>

                  {/* 3. Color */}
                  <button
                    onClick={() => {
                      setActiveGlobalCategory('color');
                      setShowGlobalEditsDropdown(false);
                      setShowGlobalEditsModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-blue-50/70 hover:text-blue-700 transition text-left cursor-pointer group"
                  >
                    <div className="w-5 flex items-center justify-center shrink-0">
                      <Palette className="w-4 h-4 text-slate-600 group-hover:text-blue-600 stroke-[1.75]" />
                    </div>
                    <span>Color</span>
                  </button>

                  {/* 4. Standard bar */}
                  <button
                    onClick={() => {
                      setActiveGlobalCategory('standard_bar');
                      setShowGlobalEditsDropdown(false);
                      setShowGlobalEditsModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-blue-50/70 hover:text-blue-700 transition text-left cursor-pointer group"
                  >
                    <div className="w-5 flex items-center justify-center shrink-0">
                      <Grid3X3 className="w-4 h-4 text-slate-600 group-hover:text-blue-600 stroke-[1.75]" />
                    </div>
                    <span>Standard bar</span>
                  </button>

                  {/* 5. Design quantity */}
                  <button
                    onClick={() => {
                      setActiveGlobalCategory('design_quantity');
                      setShowGlobalEditsDropdown(false);
                      setShowGlobalEditsModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-blue-50/70 hover:text-blue-700 transition text-left cursor-pointer group"
                  >
                    <div className="w-5 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <rect x="7" y="3" width="10" height="7" rx="1" />
                        <rect x="3" y="14" width="8" height="7" rx="1" />
                        <rect x="13" y="14" width="8" height="7" rx="1" />
                      </svg>
                    </div>
                    <span>Design quantity</span>
                  </button>

                  {/* 6. RI thickness */}
                  <button
                    onClick={() => {
                      setActiveGlobalCategory('ri_thickness');
                      setShowGlobalEditsDropdown(false);
                      setShowGlobalEditsModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-blue-50/70 hover:text-blue-700 transition text-left cursor-pointer group"
                  >
                    <div className="w-5 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M7 19L17 5M7 19H13M7 19V13M17 5H11M17 5V11" />
                      </svg>
                    </div>
                    <span>RI thickness</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowProjectDefaultsModal(true)}
            className="px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
          >
            Project defaults
          </button>
        </div>
      </div>

      {/* 3. SUB-HEADER ROW 2 (Create design, Search, Refresh, Design orders, Filter, View toggles) */}
      {activeMainTab === 'design' && (
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs gap-3 flex-wrap">
          {/* Left: Create design, Search input & Bulk Select */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowCustomerAddDesignModal(true)}
              className="bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <span>Create design</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search designs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-md border border-slate-300 text-xs w-40 focus:outline-none focus:border-blue-500 text-slate-800"
              />
            </div>

            {/* Master Select All Checkbox Button */}
            {designs.length > 0 && (
              <button
                onClick={handleToggleSelectAll}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer ${
                  isAllSelected
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                    : isSomeSelected
                    ? 'bg-slate-100 border-slate-300 text-slate-800 font-bold'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                title={isAllSelected ? 'चयन हटाएं (Deselect All)' : 'सभी डिज़ाइन चुनें (Select All)'}
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={handleToggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                />
                <span>{isAllSelected ? 'सभी चुने गए' : isSomeSelected ? `${selectedDesignIds.length} चुने गए` : 'सभी चुनें'}</span>
              </button>
            )}

            {/* Bulk Delete Button in Toolbar when items selected */}
            {selectedDesignIds.length > 0 && (
              <button
                onClick={handleRequestDeleteBulk}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-black transition shadow-xs cursor-pointer animate-in fade-in"
                title="चुने हुए सभी डिज़ाइन एक साथ डिलीट करें"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>एक साथ हटाएं ({selectedDesignIds.length})</span>
              </button>
            )}
          </div>

          {/* Right: Refresh designs, Delete All, Design orders, Filter, List/Grid icons */}
          <div className="flex items-center gap-2">
            {designs.length > 0 && (
              <button
                onClick={handleRequestDeleteAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs transition cursor-pointer"
                title="कस्टमर के सभी डिज़ाइन हटाएं (Delete All Designs)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden md:inline">सभी हटाएं</span>
              </button>
            )}

            <button
              onClick={() => {
                const refreshed = getInitialDesignsForCustomer(customer);
                updateDesigns(refreshed);
                showToast('Designs refreshed!');
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => showToast('Design orders order mode')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Orders</span>
            </button>

            <button
              onClick={() => showToast('Filter dialog')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Filter</span>
            </button>

            <div className="flex items-center border border-slate-300 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 transition ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 transition ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                title="Grid View"
              >
                <GridIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto overflow-y-auto">
        {/* TAB 1: DESIGN GRID (MATCHING SCREENSHOT) */}
        {activeMainTab === 'design' && (
          <div>
            {subTab === 'project' ? (
              designs.length === 0 ? (
                /* EMPTY STATE: "+ Add Design" card for new customer */
                <div className="bg-white rounded-2xl border-2 border-dashed border-blue-300 p-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto my-12 shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
                    <Plus className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    + Add Design (नया डिज़ाइन जोड़ें)
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-2 max-w-sm leading-relaxed">
                    {customer.name} के लिए नया विंडो या डोर डिज़ाइन जोड़ें। डिफ़ॉल्ट रूप से 6mm टफन काँच सेट रहेगा।
                  </p>
                  <button
                    onClick={() => setShowCustomerAddDesignModal(true)}
                    className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition hover:scale-102 cursor-pointer active:scale-98"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Design (नया डिज़ाइन जोड़ें)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Floating/Sticky Bulk Selection Actions Bar */}
                  {selectedDesignIds.length > 0 && (
                    <div className="sticky top-2 z-20 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomeSelected;
                            }}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded border-slate-400 text-blue-500 focus:ring-blue-400 cursor-pointer"
                          />
                          <span className="font-bold text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                            {selectedDesignIds.length} डिज़ाइन चुने गए ({selectedDesignIds.length} of {designs.length} Selected)
                          </span>
                        </div>
                        <span className="text-xs text-slate-300 hidden md:inline">
                          चुने गए डिज़ाइनों पर एक साथ कार्य करें:
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={handleRequestDeleteBulk}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold transition shadow-md cursor-pointer"
                          title="चुने हुए सभी डिज़ाइन एक साथ डिलीट करें"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>एक साथ हटाएं ({selectedDesignIds.length} Delete)</span>
                        </button>

                        <button
                          onClick={handleDuplicateSelected}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-600 cursor-pointer"
                          title="चुने हुए सभी डिज़ाइन डुप्लीकेट करें"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">डुप्लीकेट</span>
                        </button>

                        <button
                          onClick={() => setSelectedDesignIds([])}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                          title="चयन रद्द करें (Clear Selection)"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                    {/* 1. Design Cards List */}
                  {filteredDesigns.map((design) => (
                  <div
                    key={design.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col overflow-hidden group"
                  >
                    {/* Top Bar of Card: Checkbox, Tag, Open Icon, 3-dots Menu */}
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedDesignIds.includes(design.id)}
                          onChange={() => toggleSelectDesign(design.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="font-extrabold text-sm text-slate-800 tracking-tight">
                          {design.tag}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 relative">
                        {/* Direct Delete Icon Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestDeleteSingle(design.id, design.tag);
                          }}
                          className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title={`डिज़ाइन ${design.tag} हटाएं (Delete ${design.tag})`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onOpenDesignInCAD(design)}
                          className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          title="Open in CAD Designer (CAD में खोलें)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setCardMenuOpenId(cardMenuOpenId === design.id ? null : design.id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          title="More options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {cardMenuOpenId === design.id && (
                          <div className="absolute right-0 top-7 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 text-xs">
                            <button
                              onClick={() => {
                                setCardMenuOpenId(null);
                                onOpenDesignInCAD(design);
                              }}
                              className="w-full px-3 py-2 text-left text-blue-700 bg-blue-50/70 hover:bg-blue-100 flex items-center gap-2 font-bold cursor-pointer transition"
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit in CAD (CAD में खोलें)</span>
                            </button>
                            <button
                              onClick={() => {
                                setCardMenuOpenId(null);
                                setEditingDesignForModal(design);
                                setShowCustomerAddDesignModal(true);
                              }}
                              className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer transition"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit Details (Ref, Qty, Glass...)</span>
                            </button>
                            <button
                              onClick={() => {
                                setCardMenuOpenId(null);
                                handleDuplicateDesign(design);
                              }}
                              className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Duplicate</span>
                            </button>
                            <button
                              onClick={() => {
                                setCardMenuOpenId(null);
                                downloadCadSvg(design.projectData);
                              }}
                              className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download SVG</span>
                            </button>
                            <button
                              onClick={() => {
                                setCardMenuOpenId(null);
                                if (onOpen3DModal) onOpen3DModal(design.projectData);
                              }}
                              className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 font-medium"
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>3D Realistic View</span>
                            </button>
                            <div className="h-px bg-slate-100 my-1" />
                            <button
                              onClick={() => {
                                setCardMenuOpenId(null);
                                handleRequestDeleteSingle(design.id, design.tag);
                              }}
                              className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete (डिज़ाइन हटाएं)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visual Blueprint CAD Canvas Preview */}
                    <div
                      onClick={() => onOpenDesignInCAD(design)}
                      className="relative h-48 bg-[#fafafa] hover:bg-blue-50/25 p-2 flex items-center justify-center border-b border-slate-100 overflow-hidden cursor-pointer group transition"
                      title="CAD एडिटर में संपादित करने के लिए क्लिक करें (Click to Edit in CAD)"
                    >
                      {/* Hover Overlay Badge */}
                      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                        <Pencil className="w-2.5 h-2.5" />
                        <span>Edit in CAD</span>
                      </div>

                      {/* Dynamic SVG CAD Elevation Preview */}
                      <div className="relative z-0 w-full h-full flex items-center justify-center pointer-events-none">
                        <DesignCardCadPreview
                          design={design}
                          onPocketClick={(fIdx, pIdx) => {
                            setDesignForGlassChange(design);
                            setFocusedPocketIndexForGlass(pIdx);
                          }}
                        />
                      </div>

                      {/* Floor Aperture Distance Note (Screenshot 1) */}
                      <div className="absolute bottom-1 right-2 text-[9px] font-medium text-slate-400">
                        Floor Aperture Distance = {design.floorDistance || 900}
                      </div>
                    </div>

                    {/* Card Body Details */}
                    <div className="p-3 flex-1 flex flex-col justify-between text-xs">
                      <div className="space-y-1">
                        {/* Title & Qty */}
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900">{design.tag}</span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Qty. : {design.quantity || 1}
                          </span>
                        </div>

                        {/* Location */}
                        <p className="text-[11px] text-slate-500">
                          Location : {design.location || 'Bed Room'}
                        </p>

                        {/* Series Name */}
                        <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">
                          {design.seriesName || 'DURON 60MM SLIDING SERIES'}
                        </p>

                        {/* Glass & Color */}
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-600 truncate max-w-[150px]" title={getGlassDisplayName(design.glassType, design.glassName)}>
                            Glass : {getGlassDisplayName(design.glassType, design.glassName)}
                          </span>
                          <span className="px-2 py-0.5 rounded border border-slate-300 text-slate-700 text-[10px] font-bold uppercase shrink-0">
                            WHITE
                          </span>
                        </div>

                        {/* Price */}
                        <div className="pt-1.5">
                          <span className="text-xs font-black text-slate-900">
                            Price: ₹{design.totalPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || (design.unitPrice * (design.quantity || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions: [View details] [Edit Design (CAD)] */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setEditingDesignForModal(design);
                            setShowCustomerAddDesignModal(true);
                          }}
                          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                          title="View / edit reference, quantity, location"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>View details</span>
                        </button>

                        <button
                          onClick={() => onOpenDesignInCAD(design)}
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-xs transition active:scale-98 cursor-pointer"
                          title="इस डिज़ाइन को CAD एडिटर में खोलें (Click to Edit in CAD)"
                        >
                          <Pencil className="w-3.5 h-3.5 text-white" />
                          <span>Edit Design</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 2. "+ Add Design" Dashed Card */}
                <div
                  onClick={() => setShowCustomerAddDesignModal(true)}
                  className="bg-white/60 hover:bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:shadow-md min-h-[380px] group"
                  title="नया डिज़ाइन जोड़ें (Add Window/Door with 6mm Toughened Glass)"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center transition-all shadow-xs mb-4">
                    <Plus className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800 group-hover:text-blue-600 transition">
                    + Add Design (नया डिज़ाइन)
                  </h3>
                  <p className="text-xs font-medium text-slate-400 mt-1 max-w-[200px]">
                    विंडो/डोर मॉडल, साइज़ एवं 6mm टफन काँच के साथ तुरंत जोड़ें
                  </p>
                </div>
              </div>
            </div>
          )
            ) : (
              /* CATALOG TAB VIEW */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 gap-3">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Standard UPVC Design Catalog</h2>
                    <p className="text-xs text-slate-500">Pick any of the 18 Sliding Models or Casement templates to immediately add to {customer.name}&apos;s project</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Filter:</span>
                    <button
                      onClick={() => setCatalogFilter('sliding')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        catalogFilter === 'sliding'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      18 Sliding Models
                    </button>
                    <button
                      onClick={() => setCatalogFilter('casement')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        catalogFilter === 'casement'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Casement & Fixed
                    </button>
                    <button
                      onClick={() => setCatalogFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        catalogFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>

                {/* 18 Sliding Models Section */}
                {(catalogFilter === 'sliding' || catalogFilter === 'all') && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold uppercase">
                        18 Sliding Windows & Doors Designs
                      </span>
                      <span className="text-xs text-slate-500 font-medium">18 स्लाइडिंग मॉडल</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {SLIDING_DESIGNS_18.map((s) => (
                        <div
                          key={s.id}
                          className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs hover:shadow-md hover:border-blue-400 transition flex flex-col justify-between group"
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                                {s.number}
                              </span>
                              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {s.badge}
                              </span>
                            </div>

                            {/* SVG Blueprint Diagram */}
                            <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center p-2 mb-2 group-hover:bg-blue-50/40 transition">
                              {s.renderDiagram ? s.renderDiagram() : (
                                <svg viewBox="0 0 100 70" className="w-full h-full drop-shadow-xs">
                                  <rect x="5" y="5" width="90" height="60" fill="#f8fafc" stroke="#1e293b" strokeWidth="2.5" rx="3" />
                                </svg>
                              )}
                            </div>

                            <h4 className="text-[11px] font-bold text-slate-900 line-clamp-1">{s.name}</h4>
                            <p className="text-[10px] text-blue-600 font-semibold">{s.nameHindi}</p>
                            <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-500">
                              <span className="bg-slate-100 px-1 rounded">{s.trackType}</span>
                              <span className="bg-slate-100 px-1 rounded">{s.panelOperations.length} Panel</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleAddNewFromSlidingDesign(s)}
                            className="mt-3 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-98"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Add to Project</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Standard Casement Templates Section */}
                {(catalogFilter === 'casement' || catalogFilter === 'all') && (
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-extrabold uppercase">
                        Casement, French Door & Fixed Templates
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {TEMPLATES.map((tpl) => (
                        <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between">
                          <div>
                            <div className="h-28 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center mb-3">
                              <Box className="w-10 h-10 text-blue-500 opacity-60" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{tpl.name}</h4>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
                          </div>
                          <button
                            onClick={() => handleAddNewFromTemplate(tpl.id)}
                            className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add to Project</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: CUTTING LIST & FACTORY BOM */}
        {activeMainTab === 'cutting' && (
          <div className="space-y-6">
            <OfficialProductionReportView
              project={activeCuttingProject}
              productionReports={productionReports}
              frames={activeCuttingProject.frames || []}
              couplings={activeCuttingProject.couplings || []}
              designs={designs}
              companyName="Shri Balaji Traders"
              companyWebsite="www.evawinoptimize.com"
              selectedFrameId={cuttingSelectedDesignId}
              onSelectFrameId={(id) => setCuttingSelectedDesignId(id)}
            />
          </div>
        )}

        {/* TAB 2: PRICING TAB (Full 21 Heads & 7-Step Math Engine) */}
        {activeMainTab === 'pricing' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[750px]">
            <PricingFormulaView
              customers={[customer]}
              selectedCustomer={customer}
              designs={designs}
              onBack={() => setActiveMainTab('design')}
              onOpenDesigner={(designId) => {
                const targetDesign = designs.find((d) => d.id === designId);
                if (targetDesign) {
                  onOpenDesignInCAD(targetDesign);
                }
              }}
              onUpdateDesigns={(updated) => {
                setDesigns(updated);
                try {
                  localStorage.setItem(`upvc_cust_designs_${customer.id}`, JSON.stringify(updated));
                } catch (e) {}
              }}
              lang={lang}
            />
          </div>
        )}

        {/* TAB 3: QUOTATION TAB */}
        {activeMainTab === 'quotation' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6 max-w-4xl mx-auto">
            {/* Top Banner to Open Advanced Itemized Table Quotation */}
            {onOpenQuotationModal && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Open Custom Itemized Quotation Table (कोटेशन टेबल)</h4>
                    <p className="text-xs text-blue-100">CAD Drawings, Qty, Glass, Dynamic Columns, Bank Details & Warranty Terms</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (designs.length > 0 && designs[0].projectData) {
                      onOpenQuotationModal(designs[0].projectData, designs);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Open Table Sheet →
                </button>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-200 pb-6">
              <div>
                <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                  Official Quotation
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">DURON UPVC & ALUMINIUM SYSTEMS</h2>
                <p className="text-xs text-slate-500">ISO 9001:2015 Certified Manufacturing Facility • GSTIN: 07AAAAA0000A1Z5</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400">Quote Ref:</p>
                <p className="text-sm font-black text-slate-900">{referenceCode}</p>
                <p className="text-xs text-slate-500 mt-1">Date: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Billed To:</span>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">{customer.name}</h3>
                <p className="text-slate-600">{customer.companyName || 'Residential Project'}</p>
                <p className="text-slate-600 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {customer.phone}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Site Location:</span>
                <p className="text-slate-800 font-medium flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> {customer.city}, India
                </p>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mt-2">Brand Series:</span>
                <p className="text-slate-800 font-bold">{customer.brand || 'Duron Lead-Free UPVC'}</p>
              </div>
            </div>

            {/* Itemized Table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5">Sr.</th>
                  <th className="py-2.5">Tag</th>
                  <th className="py-2.5">Window Type & Specification</th>
                  <th className="py-2.5">Dimensions (W×H)</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {designs.map((d, idx) => (
                  <tr key={d.id}>
                    <td className="py-3 font-semibold">{idx + 1}</td>
                    <td className="py-3 font-bold text-blue-600">{d.tag}</td>
                    <td className="py-3">
                      <p className="font-bold text-slate-900">{d.type} Window ({d.location})</p>
                      <p className="text-[11px] text-slate-500">{d.seriesName} • 5mm/6mm Toughened Glass</p>
                    </td>
                    <td className="py-3 font-mono">{d.width} × {d.height} mm</td>
                    <td className="py-3 text-center font-bold">{d.quantity}</td>
                    <td className="py-3 text-right font-black text-slate-900">₹{d.totalPrice.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total Summary */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <div className="w-72 space-y-2 text-xs">
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Sub Total:</span>
                  <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-600">
                  <span>GST (18% Included):</span>
                  <span>₹{Math.round(totalAmount * 0.18 / 1.18).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-black text-base text-blue-700 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                onClick={() => {
                  const activeProj = designs[0]?.projectData;
                  if (activeProj) downloadQuotationCsv(activeProj);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                title="Download Quotation spreadsheet (.csv)"
              >
                <Download className="w-4 h-4" />
                <span>Download Quotation CSV (कोटेशन डाउनलोड)</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Quotation</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: REPORT TAB (Screenshots 1, 2, 3 - Material Purchase Orders removed) */}
        {activeMainTab === 'report' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[600px]">
            <div className="flex flex-1 flex-col lg:flex-row">
              {/* Left Sidebar (Screenshots 1, 2, 3 - Without Material Purchase Orders) */}
              <div className="w-full lg:w-60 border-b lg:border-b-0 lg:border-r border-slate-200 p-3 space-y-1 text-xs shrink-0 bg-white">
                <button
                  onClick={() => setReportSidebarTab('favourite')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition text-left cursor-pointer ${
                    reportSidebarTab === 'favourite'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 shrink-0 ${reportSidebarTab === 'favourite' ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                  <span>Favourite Reports</span>
                </button>

                <button
                  onClick={() => setReportSidebarTab('details')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition text-left cursor-pointer ${
                    reportSidebarTab === 'details'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${reportSidebarTab === 'details' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Project Basic Details</span>
                </button>

                <button
                  onClick={() => setReportSidebarTab('costing')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition text-left cursor-pointer ${
                    reportSidebarTab === 'costing'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Calculator className={`w-3.5 h-3.5 shrink-0 ${reportSidebarTab === 'costing' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Quotation & Costing</span>
                </button>

                <button
                  onClick={() => setReportSidebarTab('production')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition text-left cursor-pointer ${
                    reportSidebarTab === 'production'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Scissors className={`w-3.5 h-3.5 shrink-0 ${reportSidebarTab === 'production' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Production Reports</span>
                </button>

                <button
                  onClick={() => setReportSidebarTab('dispatch')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition text-left cursor-pointer ${
                    reportSidebarTab === 'dispatch'
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${reportSidebarTab === 'dispatch' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>Dispatch & Installation</span>
                </button>
              </div>

              {/* Center Area: Reports Content (Dynamic based on selected sidebar tab) */}
              <div className="flex-1 p-6 space-y-4">
                {/* Search & Filter Header (Matches Screenshot 1, 2, 3) */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>

                  <select className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-800">
                    <option>Filter design</option>
                    <option>All 10 Windows (W1-W10)</option>
                    <option>Only Sliding Series</option>
                  </select>
                </div>

                {/* Section Title & Sub-view Switcher for Project Basic Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {reportSidebarTab === 'details' && 'Project Basic Details'}
                      {reportSidebarTab === 'costing' && 'Quotation & Costing'}
                      {reportSidebarTab === 'production' && 'Production Reports'}
                      {reportSidebarTab === 'dispatch' && 'Dispatch & Installation'}
                      {reportSidebarTab === 'favourite' && 'Favourite Reports'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {reportSidebarTab === 'details' && 'Comprehensive dimensional sizing schedule and architectural elevation views.'}
                      {reportSidebarTab === 'costing' && 'Commercial quotation, profile, steel reinforcement, glass, and accessory costs.'}
                      {reportSidebarTab === 'production' && 'Factory profile cutting schedule and workshop assembly instructions.'}
                      {reportSidebarTab === 'dispatch' && 'Packaging, transport checklist, and site installation handover.'}
                      {reportSidebarTab === 'favourite' && 'Your bookmarked quick-access reports.'}
                    </p>
                  </div>

                  {/* Sub-view toggle for Project Basic Details */}
                  {reportSidebarTab === 'details' && (
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setDetailsSubView('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          detailsSubView === 'all'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailsSubView('basic-dim')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          detailsSubView === 'basic-dim'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Basic Dimensions Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailsSubView('elevation')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          detailsSubView === 'elevation'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Elevation Drawings</span>
                      </button>
                    </div>
                  )}

                  {/* Sub-view toggle for Production Reports */}
                  {reportSidebarTab === 'production' && (
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto flex-wrap">
                      <button
                        type="button"
                        onClick={() => setProductionSubView('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          productionSubView === 'all'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductionSubView('requirement')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          productionSubView === 'requirement'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Boxes className="w-3.5 h-3.5 text-blue-600" />
                        <span>Profile Requirement (Duron 5800mm)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductionSubView('gi_requirement')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          productionSubView === 'gi_requirement'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                            : 'text-amber-700 hover:text-amber-900 hover:bg-amber-50'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        <span>GI Steel Requisition (जी.आई. अलग - 6000mm)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* VIEW 1: INLINE BASIC DIMENSIONS TABLE (When selected in Details) */}
                {reportSidebarTab === 'details' && detailsSubView === 'basic-dim' && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Table Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                      <div>
                        <h4 className="text-xs font-black text-blue-900">
                          Basic Dimensions & Area Schedule
                        </h4>
                        <p className="text-[11px] text-blue-700">
                          Table showing Quantity, Size, Unit Sq.Ft, Total Sq.Ft, and Unit Rates for all designs.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveReportModalId('basic-dim')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Export to Excel / Full View</span>
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white font-bold">
                            <th className="py-2.5 px-3 w-12 text-center">Sr.</th>
                            <th className="py-2.5 px-3">Design Tag</th>
                            <th className="py-2.5 px-3">Location</th>
                            <th className="py-2.5 px-3">Typology / Series</th>
                            <th className="py-2.5 px-3 text-center">Dimensions W × H (mm)</th>
                            <th className="py-2.5 px-3 text-center">Size (Ft & In)</th>
                            <th className="py-2.5 px-3 text-center">Qty</th>
                            <th className="py-2.5 px-3 text-right">Unit Sq.Ft</th>
                            <th className="py-2.5 px-3 text-right font-black text-blue-300">Total Sq.Ft</th>
                            <th className="py-2.5 px-3 text-right">Rate (₹/Sq.Ft)</th>
                            <th className="py-2.5 px-3 text-right">Total Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {designs.map((d, index) => {
                            const w = d.width || 1200;
                            const h = d.height || 1200;
                            const qty = d.quantity || 1;
                            const areaSqM = (w * h) / 1000000;
                            const unitSqFt = Number((areaSqM * 10.7639).toFixed(2));
                            const totalSqFt = Number((unitSqFt * qty).toFixed(2));
                            const unitPrice = d.unitPrice || 0;
                            const totalPrice = d.totalPrice || unitPrice * qty;
                            const ratePerSqFt = unitSqFt > 0 ? Math.round(unitPrice / unitSqFt) : 0;
                            const inchesW = w / 25.4;
                            const dimFtIn = `${Math.floor(inchesW / 12)}' ${Math.round(inchesW % 12)}" × ${Math.floor((h / 25.4) / 12)}' ${Math.round((h / 25.4) % 12)}"`;

                            return (
                              <tr key={d.id || index} className="hover:bg-blue-50/40 transition">
                                <td className="py-2 px-3 text-center text-slate-400 font-mono">{index + 1}</td>
                                <td className="py-2 px-3 font-bold text-blue-700 flex items-center gap-1.5">
                                  <span>{d.tag}</span>
                                  {onOpenDesignInCAD && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenDesignInCAD(d)}
                                      className="text-slate-400 hover:text-blue-600 transition"
                                      title="Open in CAD"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-slate-700 font-medium">{d.location}</td>
                                <td className="py-2 px-3 text-slate-600">
                                  <span className="font-semibold text-slate-900">{d.type}</span>
                                  <span className="text-[10px] text-slate-400 block font-mono">{d.seriesName}</span>
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                                  {w} × {h} mm
                                </td>
                                <td className="py-2 px-3 text-center text-slate-600 font-mono text-[11px] bg-slate-50/70">
                                  {dimFtIn}
                                </td>
                                <td className="py-2 px-3 text-center font-black text-slate-900">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                                    {qty}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-600">{unitSqFt}</td>
                                <td className="py-2 px-3 text-right font-mono font-black text-blue-700 bg-blue-50/30">
                                  {totalSqFt}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-600">₹{ratePerSqFt}</td>
                                <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900">
                                  ₹{totalPrice.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Summary Row */}
                          {(() => {
                            let totalQty = 0;
                            let totalSqFt = 0;
                            let totalVal = 0;
                            designs.forEach((d) => {
                              const qty = d.quantity || 1;
                              const unitSqFt = ((d.width || 1200) * (d.height || 1200) * 10.7639) / 1000000;
                              totalQty += qty;
                              totalSqFt += unitSqFt * qty;
                              totalVal += d.totalPrice || (d.unitPrice || 0) * qty;
                            });
                            return (
                              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                                <td colSpan={7} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs">
                                  Grand Totals:
                                </td>
                                <td className="py-2.5 px-3 text-center text-xs text-blue-900 bg-blue-100 font-mono">
                                  {totalQty} Pcs
                                </td>
                                <td className="py-2.5 px-3 text-right text-xs"></td>
                                <td className="py-2.5 px-3 text-right text-xs text-blue-900 bg-blue-100 font-mono">
                                  {totalSqFt.toFixed(2)} Sq.Ft
                                </td>
                                <td className="py-2.5 px-3 text-right text-xs text-slate-600">
                                  Avg ₹{totalSqFt > 0 ? Math.round(totalVal / totalSqFt) : 0}
                                </td>
                                <td className="py-2.5 px-3 text-right text-xs text-emerald-800 bg-emerald-50 font-mono">
                                  ₹{totalVal.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* VIEW 2: INLINE ELEVATION DRAWINGS (When selected in Details) */}
                {reportSidebarTab === 'details' && detailsSubView === 'elevation' && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Header with Export to Excel button & Size Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-200">
                      <div>
                        <h4 className="text-xs font-black text-blue-900">
                          Architectural Elevation Drawings & Specifications
                        </h4>
                        <p className="text-[11px] text-blue-700">
                          उच्च-स्पष्टता CAD एलिवेशन आरेख (बड़ी साइज़ व 3-लाइन विवरण)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Size Selector */}
                        <div className="flex items-center bg-white rounded-lg p-0.5 border border-blue-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setElevationCardSize('large')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              elevationCardSize === 'large'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="बड़ी साइज़ (Large)"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>बड़ी साइज़</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setElevationCardSize('standard')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              elevationCardSize === 'standard'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="स्टैंडर्ड (Standard)"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>स्टैंडर्ड</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleDirectElevationExcelExport}
                          disabled={isExportingElevation}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Download Microsoft Excel (.xlsx) file with CAD vector drawings embedded in Column B"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>{isExportingElevation ? (elevationExportStatus || 'Exporting...') : 'Export Excel (.xlsx)'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveReportModalId('elevation')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Open Full Elevation Report Modal"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Full Report</span>
                        </button>
                      </div>
                    </div>

                    {/* Active Drawing Export Status Banner */}
                    {isExportingElevation && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 animate-pulse">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
                        <span><b>Generating Excel file:</b> {elevationExportStatus}</span>
                      </div>
                    )}

                    {/* Elevation Grid */}
                    <div
                      className={`grid ${
                        elevationCardSize === 'large'
                          ? 'grid-cols-1 md:grid-cols-2 gap-5'
                          : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                      }`}
                    >
                      {designs.map((d, index) => {
                        const w = d.width || 1200;
                        const h = d.height || 1200;
                        const qty = d.quantity || 1;
                        const areaSqM = ((w * h) / 1000000).toFixed(3);
                        const totalSqFt = Number((((w * h) / 1000000) * 10.7639 * qty).toFixed(2));
                        const frames = d.projectData?.frames || [];
                        const totalPockets = frames.reduce((acc, f) => acc + (f.pockets?.length || 0), 0);
                        const pocketIndices = totalPockets > 0 ? Array.from({ length: totalPockets }, (_, i) => i + 1).join(',') : '1,2';
                        const glassName = getGlassDisplayName(d.glassType, d.glassName);

                        return (
                          <div
                            key={d.id || index}
                            className="border border-slate-300 rounded-sm overflow-hidden bg-white shadow-2xs hover:border-blue-500 transition flex flex-col justify-between"
                          >
                            {/* EvaWin Top Inside View Bar */}
                            <div className="px-3 py-1 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                              <span className="flex-1 text-center">View From Inside</span>
                              {onOpenDesignInCAD && (
                                <button
                                  type="button"
                                  onClick={() => onOpenDesignInCAD(d)}
                                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer normal-case text-[10px] shrink-0"
                                  title="Open in Interactive CAD Editor"
                                >
                                  <span>CAD</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Large Image Canvas */}
                            <div
                              className={`p-2 flex items-center justify-center bg-white ${
                                elevationCardSize === 'large'
                                  ? 'min-h-[380px] md:min-h-[440px] h-[400px]'
                                  : 'min-h-[290px] md:min-h-[330px] h-[310px]'
                              }`}
                            >
                              {frames.length > 0 ? (
                                <CadElevationDrawing
                                  frames={frames}
                                  couplings={d.projectData?.couplings || []}
                                  width="100%"
                                  height="100%"
                                  showDimensions={true}
                                  showLabels={true}
                                  showHandles={true}
                                  showArrows={true}
                                  allowEnlarge={true}
                                  title={`${d.tag} • ${w}×${h}mm`}
                                />
                              ) : (
                                <div className="text-slate-400 text-xs py-10 font-mono">
                                  [ {d.tag} Elevation Graphic ]
                                </div>
                              )}
                            </div>

                            {/* Sill OUT Indicator */}
                            <div className="flex flex-col items-center justify-center py-1 bg-white shrink-0">
                              <svg width="44" height="14" viewBox="0 0 44 14" className="overflow-visible">
                                <line x1="2" y1="4" x2="42" y2="4" stroke="#94a3b8" strokeWidth="1.2" />
                                <line x1="14" y1="4" x2="30" y2="4" stroke="#334155" strokeWidth="2.4" />
                                <path d="M22 5 L22 11 M19 8 L22 11 L25 8" stroke="#334155" strokeWidth="1.2" fill="none" />
                              </svg>
                              <span className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-widest leading-none">
                                OUT
                              </span>
                            </div>

                            {/* 3-Line Specifications Box */}
                            <div className="border-t border-slate-300 p-2.5 bg-white text-[11px] leading-snug font-sans space-y-1">
                              <div className="flex items-center justify-between font-medium text-slate-800">
                                <span>
                                  Design Ref : <b className="font-bold text-slate-900">{d.tag}</b>
                                </span>
                                <span>
                                  Qty : <b className="font-bold text-slate-900">{qty}</b>
                                </span>
                                <span>
                                  Location : <span className="text-slate-700">{d.location || ''}</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between font-mono text-slate-800 text-[11px]">
                                <span>
                                  W = {Number(w).toFixed(2)}; H = {Number(h).toFixed(2)}
                                </span>
                                <span className="font-sans font-medium text-slate-700">
                                  Area : <b className="font-mono text-slate-900">{areaSqM}</b> SqMt ({totalSqFt} Sq.Ft)
                                </span>
                              </div>
                              <div className="text-slate-700 font-medium truncate" title={`(${pocketIndices}) ${glassName}`}>
                                Glass : <span className="font-mono">({pocketIndices})</span> {glassName.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VIEW 2: INLINE PROFILE REQUIREMENT (When selected in Production) */}
                {reportSidebarTab === 'production' && productionSubView === 'requirement' && (
                  <div className="space-y-4 animate-in fade-in">
                    <ProfileRequirementView
                      designs={designs}
                      customer={customer}
                      onOpenDesignInCAD={onOpenDesignInCAD}
                      initialCategory="upvc"
                    />
                  </div>
                )}

                {/* VIEW 2B: INLINE GI STEEL REQUISITION (जी.आई. अलग - 6000mm / 20 Ft) */}
                {reportSidebarTab === 'production' && productionSubView === 'gi_requirement' && (
                  <div className="space-y-4 animate-in fade-in">
                    <ProfileRequirementView
                      designs={designs}
                      customer={customer}
                      onOpenDesignInCAD={onOpenDesignInCAD}
                      initialCategory="gi"
                    />
                  </div>
                )}

                {/* VIEW 3: REPORT CARDS GRID (Default for Costing, Production, Dispatch, or when All Cards selected) */}
                {((reportSidebarTab === 'details' && detailsSubView === 'all') ||
                  (reportSidebarTab === 'production' && productionSubView === 'all') ||
                  (reportSidebarTab !== 'details' && reportSidebarTab !== 'production')) && (() => {
                  const allReports = [
                    // Details (Screenshot 1)
                    {
                      id: 'basic-dim',
                      tab: 'details',
                      title: 'Basic Dimensions Report',
                      description: 'Tabular overview with design tags, quantities, sizes (mm & ft-in), unit sq.ft, total sq.ft, and unit rates.',
                      onDownload: () => setActiveReportModalId('basic-dim'),
                      onPreview: () => setActiveReportModalId('basic-dim'),
                    },
                    {
                      id: 'elevation',
                      tab: 'details',
                      title: 'Elevation Report',
                      description: 'Architectural CAD elevations with visual sash opening arrows, dimensions, sill heights, and Excel export.',
                      onDownload: () => setActiveReportModalId('elevation'),
                      onPreview: () => setActiveReportModalId('elevation'),
                    },

                    // Costing (Screenshot 2)
                    {
                      id: 'quotation',
                      tab: 'costing',
                      title: 'Quotation',
                      description: 'A formal document providing the estimated cost for goods and services with taxes and commercial terms.',
                      onDownload: () => setActiveReportModalId('quotation'),
                      onPreview: () => setActiveReportModalId('quotation'),
                    },
                    {
                      id: 'project-cost-summary',
                      tab: 'costing',
                      title: 'Project Cost Summary',
                      description: 'Summarizes the overall cost breakdown of profiles, steel, glass, hardware, labor, and profit margins.',
                      onDownload: () => setActiveReportModalId('project-cost-summary'),
                      onPreview: () => setActiveReportModalId('project-cost-summary'),
                    },
                    {
                      id: 'profile-cost',
                      tab: 'costing',
                      title: 'Profile Cost Report',
                      description: 'Breaks down the cost analysis of outer frame, sash, mullions, and bead profiles with weights.',
                      onDownload: () => setActiveReportModalId('profile-cost'),
                      onPreview: () => setActiveReportModalId('profile-cost'),
                    },
                    {
                      id: 'ri-cost',
                      tab: 'costing',
                      title: 'RI Cost Report',
                      description: 'Steel reinforcement tubes (GI 1.2mm / 1.5mm) cut lengths, weights in kg, and steel expenditure.',
                      onDownload: () => setActiveReportModalId('ri-cost'),
                      onPreview: () => setActiveReportModalId('ri-cost'),
                    },
                    {
                      id: 'accessories-cost',
                      tab: 'costing',
                      title: 'Accessories Cost Report',
                      description: 'Hardware items (multi-point locks, rollers, handles, wool pile, gaskets, and fasteners).',
                      onDownload: () => setActiveReportModalId('accessories-cost'),
                      onPreview: () => setActiveReportModalId('accessories-cost'),
                    },
                    {
                      id: 'glass-cost',
                      tab: 'costing',
                      title: 'Glass Cost Report',
                      description: 'Glass cutting pane counts, square footage, wastage allowance, and toughened glass costs.',
                      onDownload: () => setActiveReportModalId('glass-cost'),
                      onPreview: () => setActiveReportModalId('glass-cost'),
                    },
                    {
                      id: 'typology-cost',
                      tab: 'costing',
                      title: 'Typology Cost Breakup report',
                      description: 'Analyzes all the cost distribution based on different typologies (Sliding, Casement, Fixed, French Doors).',
                      onDownload: () => setActiveReportModalId('typology-cost'),
                      onPreview: () => setActiveReportModalId('typology-cost'),
                    },
                    {
                      id: 'project-cost-breakup',
                      tab: 'costing',
                      title: 'Project Cost Breakup',
                      description: 'Breaks down the raw material cost into categories (Extrusion, Steel, Glass, Hardware, Labor, Margin).',
                      onDownload: () => setActiveReportModalId('project-cost-breakup'),
                      onPreview: () => setActiveReportModalId('project-cost-breakup'),
                    },

                    // Production (Screenshot 3)
                    {
                      id: 'profile-requirement',
                      tab: 'production',
                      title: 'Profile Requirement Report (Duron 5800mm / Custom)',
                      description: 'Stock bar requisition (Duron standard 5800mm or custom), 1D linear cutting optimization, required bars count, net meters, and offcut analysis.',
                      onDownload: () => setActiveReportModalId('profile-requirement'),
                      onPreview: () => setActiveReportModalId('profile-requirement'),
                    },
                    {
                      id: 'gi-steel-requirement',
                      tab: 'production',
                      title: 'GI Steel Reinforcement Requisition (जी.आई. पाइप अलग 6000mm)',
                      description: 'Exclusive Galvanized Iron (GI) 6M steel pipe procurement requisition, 90° straight cuts, -100mm corner weld deductions, pipe counts, linear meters, and kg weights.',
                      onDownload: () => setActiveReportModalId('gi-steel-requirement'),
                      onPreview: () => setActiveReportModalId('gi-steel-requirement'),
                    },
                    {
                      id: 'cutting-schedule',
                      tab: 'production',
                      title: 'Cutting Schedule Report',
                      description: 'Details the factory cutting schedule for profile extrusions with 45°/90° cut angles and welding allowances.',
                      onDownload: () => setActiveReportModalId('cutting-schedule'),
                      onPreview: () => setActiveReportModalId('cutting-schedule'),
                    },
                    {
                      id: 'design-assembly',
                      tab: 'production',
                      title: 'Design Assembly Report',
                      description: 'Step-by-step fabrication sequence, hardware fitting SOP, and quality inspection sign-off.',
                      onDownload: () => setActiveReportModalId('design-assembly'),
                      onPreview: () => setActiveReportModalId('design-assembly'),
                    },

                    // Dispatch
                    {
                      id: 'dispatch-checklist',
                      tab: 'dispatch',
                      title: 'Dispatch Checklist Report',
                      description: 'Details the packaging, corner protectors, and logistics checklist for transport verification.',
                      onDownload: () => setActiveReportModalId('dispatch-checklist'),
                      onPreview: () => setActiveReportModalId('dispatch-checklist'),
                    },
                    {
                      id: 'installation-handover',
                      tab: 'dispatch',
                      title: 'Installation Handover Report',
                      description: 'Verification report, aperture check, silicone sealing, and customer sign-off certificate.',
                      onDownload: () => setActiveReportModalId('installation-handover'),
                      onPreview: () => setActiveReportModalId('installation-handover'),
                    },
                    {
                      id: 'site-inspection-questionnaire',
                      tab: 'dispatch',
                      title: 'Site Inspection & Quality Questionnaire (प्रश्नावली रिपोर्ट)',
                      description: '100% editable site survey and QA inspection checklist questions, custom PDF file naming, and direct PDF download.',
                      onDownload: () => setActiveReportModalId('site-inspection-questionnaire'),
                      onPreview: () => setActiveReportModalId('site-inspection-questionnaire'),
                    },
                  ];

                  // Filter by tab
                  let displayed = allReports.filter((r) =>
                    reportSidebarTab === 'favourite'
                      ? favouriteReports.includes(r.id)
                      : r.tab === reportSidebarTab
                  );

                  // Filter by search query
                  if (reportSearchQuery.trim()) {
                    const q = reportSearchQuery.toLowerCase();
                    displayed = displayed.filter(
                      (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
                    );
                  }

                  const toggleFav = (id: string) => {
                    setFavouriteReports((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    );
                    showToast('Favourite updated');
                  };

                  const toggleSelect = (id: string) => {
                    setSelectedReports((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    );
                  };

                  if (displayed.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No reports found in this category.
                      </div>
                    );
                  }

                  // Responsive grid: 2 cols for details/production, 3 cols for costing
                  const gridColsClass =
                    reportSidebarTab === 'costing'
                      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5'
                      : 'grid grid-cols-1 md:grid-cols-2 gap-3.5';

                  return (
                    <div className={gridColsClass}>
                      {displayed.map((item) => {
                        const isFav = favouriteReports.includes(item.id);
                        const isSelected = selectedReports.includes(item.id);

                        return (
                          <div
                            key={item.id}
                            onClick={() => setActiveReportModalId(item.id)}
                            className="p-4 rounded-xl border border-slate-200 bg-[#f8fafc] hover:bg-white hover:border-blue-400 hover:shadow-xs transition shadow-2xs flex flex-col justify-between min-h-[115px] cursor-pointer group"
                          >
                            {/* Top Bar: Checkbox on Left, Action Icons on Right */}
                            <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(item.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                {item.id === 'basic-dim' && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">
                                    Table Schedule
                                  </span>
                                )}
                                {item.id === 'elevation' && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                    CAD Drawings
                                  </span>
                                )}
                                {item.id === 'profile-requirement' && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold">
                                    ★ Duron 5800mm Requisition
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleFav(item.id)}
                                  className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                                  title="Add to favourites"
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${isFav ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`}
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setActiveReportModalId(item.id)}
                                  className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                  title="Export Excel / Download"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setActiveReportModalId(item.id)}
                                  className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                  title="Open Full Report"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setActiveReportModalId(item.id)}
                                  className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                  title="More actions"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Content: Title & Description */}
                            <div className="mt-2.5">
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition flex items-center justify-between">
                                <span>{item.title}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition opacity-0 group-hover:opacity-100" />
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PAYMENTS TAB (LEDGER) */}
        {activeMainTab === 'payments' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Customer Payment Ledger</h2>
                <p className="text-xs text-slate-500">Track advance payments, receipts, and balance dues</p>
              </div>
              <button
                onClick={() => {
                  if (onOpenPaymentLedger) onOpenPaymentLedger();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>+ Record Payment</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold text-blue-600 uppercase">Total Quotation Value:</span>
                <p className="text-2xl font-black text-blue-950 mt-1">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Advance Paid:</span>
                <p className="text-2xl font-black text-emerald-950 mt-1">₹100,000</p>
                <span className="text-[10px] font-bold text-emerald-700">UPI / Bank Transfer Received</span>
              </div>
              <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-600 uppercase">Pending Balance Due:</span>
                <p className="text-2xl font-black text-rose-950 mt-1">₹{(totalAmount - 100000).toLocaleString('en-IN')}</p>
                <span className="text-[10px] font-bold text-rose-700">Due before delivery</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DOCUMENTS TAB */}
        {activeMainTab === 'documents' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900">Project Documents & Drawings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: 'Window Elevation Drawings (CAD SVG)',
                  size: '2.4 MB',
                  date: '30 Aug 2026',
                  onClick: () => {
                    const firstProj = designs[0]?.projectData;
                    if (firstProj) downloadCadSvg(firstProj);
                  },
                },
                {
                  title: 'Site Measurement Confirmation Sheet',
                  size: '850 KB',
                  date: '29 Aug 2026',
                  onClick: () => downloadSiteMeasurementDoc(customer, designs),
                },
                {
                  title: 'Material Specification & Warranty Bond',
                  size: '1.2 MB',
                  date: '30 Aug 2026',
                  onClick: () => downloadWarrantyDoc(customer, designs),
                },
                {
                  title: 'Factory Production Job Card',
                  size: '420 KB',
                  date: '31 Aug 2026',
                  onClick: () => downloadFactoryJobCardDoc(customer, designs),
                },
              ].map((doc, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{doc.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{doc.size} • {doc.date}</p>
                    </div>
                  </div>
                  <button
                    onClick={doc.onClick}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 transition cursor-pointer"
                    title={`Download ${doc.title}`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* EVA CONFIGURATOR 2.0 MODAL (Screenshot 4) */}
      {showEvaConfigurator && configuratorDesign && (
        <EvaConfiguratorModal
          isOpen={true}
          design={configuratorDesign}
          onClose={() => {
            setShowEvaConfigurator(false);
            setConfiguratorDesign(null);
          }}
          onSaveDesign={(updatedDesign) => {
            const currentList = loadDesigns();
            const updated = currentList.map((d) => (d.id === updatedDesign.id ? updatedDesign : d));
            updateDesigns(updated);
            setShowEvaConfigurator(false);
            setConfiguratorDesign(null);
            showToast(`डिज़ाइन ${updatedDesign.tag} सफलतापूर्वक अपडेट हुआ!`);
          }}
        />
      )}

      {/* CUSTOMER ADD / EDIT DESIGN MODAL (Exact Eva UPVC Form from user screenshot) */}
      {showCustomerAddDesignModal && (
        <CustomerAddDesignModal
          isOpen={true}
          customer={customer}
          customerName={customer.name}
          customerBrand={customer.brand}
          existingDesignsCount={designs.length}
          initialDesign={editingDesignForModal}
          onClose={() => {
            setShowCustomerAddDesignModal(false);
            setEditingDesignForModal(null);
          }}
          onCreateDesign={(newDesign, openInCAD) => {
            setShowCustomerAddDesignModal(false);
            setEditingDesignForModal(null);
            handleCreateCustomerDesign(newDesign, openInCAD);
          }}
          onUpdateDesign={(updatedDesign, openInCAD) => {
            setShowCustomerAddDesignModal(false);
            setEditingDesignForModal(null);
            handleUpdateCustomerDesign(updatedDesign, openInCAD);
          }}
        />
      )}

      {/* QUICK CHANGE DESIGN GLASS MODAL (Change glass for entire design or click-to-change any pocket / hissa) */}
      {designForGlassChange && (
        <QuickChangeDesignGlassModal
          design={designForGlassChange}
          initialPocketIndex={focusedPocketIndexForGlass}
          onClose={() => {
            setDesignForGlassChange(null);
            setFocusedPocketIndexForGlass(null);
          }}
          onSave={(updatedGlass, pocketOverrides) => {
            handleSaveDesignGlass(designForGlassChange.id, updatedGlass, pocketOverrides);
          }}
        />
      )}

      {/* MODAL: GLOBAL EDITS (Glass, Mesh, Color, Standard bar, Design quantity, RI thickness) */}
      {showGlobalEditsModal && (
        <GlobalEditsModal
          isOpen={showGlobalEditsModal}
          onClose={() => setShowGlobalEditsModal(false)}
          category={activeGlobalCategory}
          designs={designs}
          onApplyGlobalEdit={handleApplyGlobalEdit}
        />
      )}

      {/* MODAL: PROJECT DEFAULTS */}
      {showProjectDefaultsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-900">Project Default Settings</h3>
              <button onClick={() => setShowProjectDefaultsModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Company / Material Brand:</label>
                <input
                  type="text"
                  value={defaultBrand}
                  onChange={(e) => setDefaultBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Default Floor Aperture Clearance (mm):</label>
                <input
                  type="number"
                  value={defaultFloorClearance}
                  onChange={(e) => setDefaultFloorClearance(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Coupling Gap (2mm Guaranteed):</label>
                <input
                  type="number"
                  value={defaultCouplerGap}
                  onChange={(e) => setDefaultCouplerGap(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold bg-slate-50"
                  readOnly
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowProjectDefaultsModal(false);
                    showToast('Project defaults saved!');
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: ADD DESIGN SELECTOR MODAL (18 Sliding Designs + Presets) */}
      {showAddDesignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  + Add Window or Door Design to {customer.name}&apos;s Project
                </h3>
                <p className="text-xs text-slate-500">
                  18 स्लाइडिंग मॉडल (18 Sliding Models) या Casement डिज़ाइन चुनें
                </p>
              </div>
              <button
                onClick={() => setShowAddDesignModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Tabbed Selection */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Category 1: 18 Sliding Windows & Doors Catalog */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-black uppercase tracking-wide">
                      18 Sliding Models
                    </span>
                    <span className="text-xs font-bold text-slate-700">18 स्लाइडिंग मॉडल कैटलॉग</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Click any design to add instantly</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {SLIDING_DESIGNS_18.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleAddNewFromSlidingDesign(s)}
                      className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-500 p-2.5 cursor-pointer hover:shadow-md transition flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                          {s.number}
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                          {s.badge}
                        </span>
                      </div>

                      <div className="h-16 bg-slate-50 group-hover:bg-blue-50/50 rounded-lg border border-slate-100 flex items-center justify-center p-1.5 mb-1.5 transition">
                        {s.renderDiagram ? s.renderDiagram() : (
                          <svg viewBox="0 0 100 70" className="w-full h-full">
                            <rect x="5" y="5" width="90" height="60" fill="#f8fafc" stroke="#1e293b" strokeWidth="2.5" rx="3" />
                          </svg>
                        )}
                      </div>

                      <h5 className="text-[11px] font-bold text-slate-900 group-hover:text-blue-600 line-clamp-1 leading-tight">
                        {s.name}
                      </h5>
                      <p className="text-[10px] text-blue-600 font-semibold truncate">{s.nameHindi}</p>
                      <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                        <span>{s.trackType} • {s.panelOperations.length}P</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category 2: Casement & Other Templates */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-black uppercase">
                    Casement & Combination Templates
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => handleAddNewFromTemplate(tpl.id)}
                      className="bg-white rounded-xl border border-slate-200 hover:border-blue-500 p-3 cursor-pointer hover:shadow-md transition flex flex-col justify-between group"
                    >
                      <div>
                        <div className="h-16 bg-slate-50 group-hover:bg-blue-50/50 rounded-lg border border-slate-100 flex items-center justify-center mb-2 transition">
                          <Box className="w-8 h-8 text-blue-500 opacity-60" />
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-600">{tpl.name}</h5>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tpl.description}</p>
                      </div>
                      <span className="mt-2 text-[11px] font-bold text-blue-600 flex items-center gap-1">
                        + Select Template
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setShowAddDesignModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE PROJECT REPORT MODAL */}
      {activeReportModalId && (
        <ProjectReportModal
          isOpen={true}
          onClose={() => setActiveReportModalId(null)}
          reportId={activeReportModalId}
          customer={customer}
          designs={designs}
          onOpenDesignInCAD={onOpenDesignInCAD}
          onSelectReport={(newId) => setActiveReportModalId(newId)}
        />
      )}

      {/* CONFIRMATION MODAL: DELETE DESIGN(S) */}
      {deleteConfirmModal && deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-rose-100 flex items-center gap-3 bg-rose-50/80">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-rose-950 leading-tight">
                  {deleteConfirmModal.type === 'single'
                    ? `डिज़ाइन "${deleteConfirmModal.targetTag}" हटाएं?`
                    : deleteConfirmModal.type === 'bulk'
                    ? `${deleteConfirmModal.count} डिज़ाइन एक साथ हटाएं?`
                    : `सभी ${deleteConfirmModal.count} डिज़ाइन हटाएं?`}
                </h3>
                <p className="text-[11px] font-semibold text-rose-700">
                  {deleteConfirmModal.type === 'single'
                    ? 'Delete this window/door design'
                    : deleteConfirmModal.type === 'bulk'
                    ? `Delete ${deleteConfirmModal.count} selected designs at once`
                    : 'Delete all designs for this customer'}
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-rose-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {deleteConfirmModal.type === 'single' && deleteConfirmModal.targetDesign && (
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center gap-3.5">
                  <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                    <DesignCardCadPreview design={deleteConfirmModal.targetDesign} />
                  </div>
                  <div className="flex-1 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">
                        {deleteConfirmModal.targetTag}
                      </span>
                      <span className="font-bold text-slate-700">
                        {deleteConfirmModal.targetDesign.width} × {deleteConfirmModal.targetDesign.height} mm
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium">
                      {deleteConfirmModal.targetDesign.type} • {deleteConfirmModal.targetDesign.location || 'No location'}
                    </p>
                    <p className="text-slate-600 font-bold">
                      ₹{deleteConfirmModal.targetDesign.totalPrice?.toLocaleString('en-IN') || deleteConfirmModal.targetDesign.unitPrice?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}

              {deleteConfirmModal.type === 'bulk' && deleteConfirmModal.tagsList && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">
                    हटाए जाने वाले डिज़ाइन ({deleteConfirmModal.tagsList.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {deleteConfirmModal.tagsList.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 font-extrabold text-xs text-slate-800 shadow-2xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {deleteConfirmModal.type === 'all' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                  <p className="font-extrabold">⚠️ चेतावनी (Warning):</p>
                  <p>
                    {customer.name} के सभी <strong>{deleteConfirmModal.count} डिज़ाइन</strong> पूरी तरह हट जाएंगे। आप बाद में नया डिज़ाइन दोबारा जोड़ सकते हैं।
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                क्या आप वाकई पुष्टि करते हैं? हटाने के बाद यह डिज़ाइन प्रोजेक्ट, कटिंग लिस्ट और कोटेशन से पूरी तरह हटा दिया जाएगा।
              </p>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {deleteConfirmModal.type === 'single'
                    ? 'हाँ, डिज़ाइन हटाएं (Yes, Delete)'
                    : deleteConfirmModal.type === 'bulk'
                    ? `हाँ, सभी ${deleteConfirmModal.count} डिज़ाइन हटाएं`
                    : 'हाँ, सब डिलीट करें (Delete All)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
