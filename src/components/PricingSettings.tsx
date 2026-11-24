import React, { useState, useMemo } from 'react';
import { CostHead, InventoryItem, MaterialBOMItem } from '../types/pricing';
import { CustomerDesignCardItem } from './CustomerProjectView';
import { CustomerRecord } from '../types/erp';
import { 
  Calculator, 
  Package, 
  RotateCcw, 
  Save, 
  Sparkles, 
  Sliders, 
  ArrowLeft, 
  CheckCircle2, 
  Info, 
  ExternalLink, 
  Search, 
  Box, 
  Layers3, 
  Layers, 
  Wrench, 
  Percent, 
  Truck, 
  Building, 
  ShieldCheck, 
  Check, 
  ChevronRight,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { 
  DEFAULT_COST_HEADS, 
  DEFAULT_INVENTORY_ITEMS, 
  getDetailedMaterialBOM, 
  calculateQuotation 
} from '../utils/pricing';

export interface PricingSettingsProps {
  customer: CustomerRecord;
  designs: CustomerDesignCardItem[];
  template?: CostHead[];
  inventory?: InventoryItem[];
  onBack?: () => void;
  onOpenDesigner?: (designId: string) => void;
  onUpdateDesigns?: (updatedDesigns: CustomerDesignCardItem[]) => void;
  onUpdateTemplate?: (template: CostHead[]) => void;
}

export const PricingSettings: React.FC<PricingSettingsProps> = ({
  customer,
  designs,
  template = DEFAULT_COST_HEADS,
  inventory = DEFAULT_INVENTORY_ITEMS,
  onBack,
  onOpenDesigner,
  onUpdateDesigns,
  onUpdateTemplate
}) => {
  // Top Level Primary Tab: 'pricing-formula' vs 'item-rates'
  const [primaryTab, setPrimaryTab] = useState<'pricing-formula' | 'item-rates'>('pricing-formula');

  // Pricing Subtab: 'step-by-step' vs 'formula-rates'
  const [activeSubTab, setActiveSubTab] = useState<'step-by-step' | 'formula-rates'>('step-by-step');

  // Selected Design to Inspect: 'ALL' vs design ID (e.g. 'WD-001', 'WD-002')
  const [selectedDesignId, setSelectedDesignId] = useState<string>('ALL');

  // BOM Section Filter Tab: 'ALL' | '1_PROFILE' | '2_STEEL' | '3_GLASS' | '4_HARDWARE'
  const [bomSectionTab, setBomSectionTab] = useState<'ALL' | '1_PROFILE' | '2_STEEL' | '3_GLASS' | '4_HARDWARE'>('ALL');

  // BOM View Mode: 'grouped' | 'detailed'
  const [bomViewMode, setBomViewMode] = useState<'grouped' | 'detailed'>('grouped');

  // Search filter for Item Rates tab
  const [itemRateSearch, setItemRateSearch] = useState<string>('');
  const [itemRateCategoryFilter, setItemRateCategoryFilter] = useState<string>('ALL');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Template State (21 Cost Heads)
  const [localTemplate, setLocalTemplate] = useState<CostHead[]>(() => {
    try {
      const saved = localStorage.getItem(`upvc_pricing_template_${customer.id}`) ||
                    localStorage.getItem('upvc_pricing_template_active') ||
                    localStorage.getItem('upvc_pricing_template_global');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((h: CostHead) => {
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
    return template;
  });

  // Local Inventory Items State (for Item Rates tab)
  const [localInventory, setLocalInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`upvc_inventory_items_${customer.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return inventory;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Compute total units in project
  const totalProjectUnits = useMemo(() => {
    return designs.reduce((sum, d) => sum + (d.quantity || 1), 0);
  }, [designs]);

  // Compute live quote and BOM for each design
  const calculatedDesigns = useMemo(() => {
    return designs.map(d => {
      const areaSqft = Math.round(((d.width * d.height) / (304.8 * 304.8)) * 100) / 100;
      const quote = calculateQuotation(d, localTemplate, localInventory, totalProjectUnits);
      const unitTotal = quote.find(q => q.id === 21)?.value || d.unitPrice || 0;
      const qty = d.quantity || 1;
      const totalAmount = Math.round(unitTotal * qty);
      const ratePerSqft = areaSqft > 0 ? Math.round((unitTotal / areaSqft) * 100) / 100 : 0;
      const bom = getDetailedMaterialBOM(d, localTemplate, localInventory);

      return {
        ...d,
        areaSqft,
        unitTotal: Math.round(unitTotal),
        totalAmount,
        ratePerSqft,
        quote,
        bom,
        qty
      };
    });
  }, [designs, localTemplate, localInventory, totalProjectUnits]);

  // Currently inspected single design
  const inspectedDesign = useMemo(() => {
    if (selectedDesignId === 'ALL') return null;
    return calculatedDesigns.find(d => d.id === selectedDesignId) || null;
  }, [calculatedDesigns, selectedDesignId]);

  // Combined project summary metrics (or single design metrics when selected)
  const projectSummary = useMemo(() => {
    if (inspectedDesign) {
      const qty = inspectedDesign.qty;
      const totalArea = inspectedDesign.areaSqft * qty;
      const grandTotal = inspectedDesign.totalAmount;
      const avgRate = totalArea > 0 ? Math.round((grandTotal / totalArea) * 100) / 100 : 0;
      const totalAreaM2 = Math.round(totalArea * 0.092903 * 100) / 100;

      return {
        isSingle: true,
        titleLabel: 'SELECTED WINDOW',
        summarySubtitle: '1 Type • 1 Unit',
        areaLabel: 'WINDOW AREA',
        totalDesigns: 1,
        totalUnits: qty,
        totalArea: Math.round(totalArea * 100) / 100,
        totalAreaM2,
        grandTotal: Math.round(grandTotal),
        avgRate,
        unitsSubtitle: inspectedDesign.seriesName || `${inspectedDesign.type} Series`,
        customerName: customer.name || 'Customer',
        siteName: customer.city ? `${customer.city} Site` : 'Site Location'
      };
    }

    let totalUnits = 0;
    let totalArea = 0;
    let grandTotal = 0;

    calculatedDesigns.forEach(item => {
      totalUnits += item.qty;
      totalArea += item.areaSqft * item.qty;
      grandTotal += item.totalAmount;
    });

    const avgRate = totalArea > 0 ? Math.round((grandTotal / totalArea) * 100) / 100 : 0;
    const totalAreaM2 = Math.round(totalArea * 0.092903 * 100) / 100;

    return {
      isSingle: false,
      titleLabel: 'PROJECT SUMMARY',
      summarySubtitle: `${calculatedDesigns.length} Types • ${totalUnits} Total Units`,
      areaLabel: 'TOTAL PROJECT AREA',
      totalDesigns: calculatedDesigns.length,
      totalUnits,
      totalArea: Math.round(totalArea * 100) / 100,
      totalAreaM2,
      grandTotal: Math.round(grandTotal),
      avgRate,
      unitsSubtitle: `${calculatedDesigns.length} Unique Designs`,
      customerName: customer.name || 'Customer',
      siteName: customer.city ? `${customer.city} Site` : 'Site Location'
    };
  }, [calculatedDesigns, inspectedDesign, customer]);

  // Filtered designs based on active selection (ALL vs single item)
  const activeDesignItems = useMemo(() => {
    if (selectedDesignId === 'ALL') {
      return calculatedDesigns;
    }
    return calculatedDesigns.filter(d => d.id === selectedDesignId);
  }, [calculatedDesigns, selectedDesignId]);

  // Section-categorized BOM Items
  const categorizedBOM = useMemo(() => {
    const rawProfiles: MaterialBOMItem[] = [];
    const rawSteel: MaterialBOMItem[] = [];
    const rawGlass: MaterialBOMItem[] = [];
    const rawHardware: MaterialBOMItem[] = [];

    activeDesignItems.forEach(d => {
      rawProfiles.push(...d.bom.profileItems);
      rawSteel.push(...d.bom.steelItems);
      rawGlass.push(...d.bom.glassItems);
      rawHardware.push(...d.bom.hardwareItems, ...d.bom.accessoryItems);
    });

    const groupItems = (items: MaterialBOMItem[]) => {
      if (bomViewMode === 'detailed') return items;
      const map = new Map<string, MaterialBOMItem>();
      items.forEach(item => {
        const key = item.code + '_' + (item.spec || '');
        const existing = map.get(key);
        if (existing) {
          existing.totalQty += item.totalQty;
          if (existing.totalWeightKg && item.totalWeightKg) {
            existing.totalWeightKg = Math.round((existing.totalWeightKg + item.totalWeightKg) * 100) / 100;
          }
          if (existing.totalLengthMtr && item.totalLengthMtr) {
            existing.totalLengthMtr = Math.round((existing.totalLengthMtr + item.totalLengthMtr) * 100) / 100;
          }
          if (existing.areaSqft && item.areaSqft) {
            existing.areaSqft = Math.round((existing.areaSqft + item.areaSqft) * 100) / 100;
          }
          existing.totalPrice = Math.round((existing.totalPrice + item.totalPrice) * 100) / 100;
          if (item.usedInWindows) {
            const set = new Set(existing.usedInWindows || []);
            item.usedInWindows.forEach(tag => set.add(tag));
            existing.usedInWindows = Array.from(set);
          }
        } else {
          map.set(key, { ...item, usedInWindows: [...(item.usedInWindows || [])] });
        }
      });
      return Array.from(map.values());
    };

    const profiles = groupItems(rawProfiles);
    const steel = groupItems(rawSteel);
    const glass = groupItems(rawGlass);
    const hardware = groupItems(rawHardware);

    const profileTotalCost = profiles.reduce((s, i) => s + i.totalPrice, 0);
    const profileTotalWeight = profiles.reduce((s, i) => s + (i.totalWeightKg || 0), 0);

    const steelTotalCost = steel.reduce((s, i) => s + i.totalPrice, 0);
    const steelTotalLength = steel.reduce((s, i) => s + (i.totalLengthMtr || 0), 0);
    const steelTotalWeight = steel.reduce((s, i) => s + (i.totalWeightKg || ((i.totalLengthMtr || 0) * 0.85)), 0);

    const glassTotalCost = glass.reduce((s, i) => s + i.totalPrice, 0);
    const glassTotalArea = glass.reduce((s, i) => s + (i.areaSqft || 0), 0);

    const hardwareTotalCost = hardware.reduce((s, i) => s + i.totalPrice, 0);
    const hardwareTotalCount = hardware.reduce((s, i) => s + i.totalQty, 0);

    const grandRawMaterialTotal = profileTotalCost + steelTotalCost + glassTotalCost + hardwareTotalCost;

    return {
      profiles,
      profileTotalCost: Math.round(profileTotalCost),
      profileTotalWeight: Math.round(profileTotalWeight * 100) / 100,

      steel,
      steelTotalCost: Math.round(steelTotalCost),
      steelTotalLength: Math.round(steelTotalLength * 100) / 100,
      steelTotalWeight: Math.round(steelTotalWeight * 100) / 100,

      glass,
      glassTotalCost: Math.round(glassTotalCost),
      glassTotalArea: Math.round(glassTotalArea * 100) / 100,

      hardware,
      hardwareTotalCost: Math.round(hardwareTotalCost),
      hardwareTotalCount,

      grandRawMaterialTotal: Math.round(grandRawMaterialTotal),
      totalComponentCount: profiles.length + steel.length + glass.length + hardware.length
    };
  }, [activeDesignItems, bomViewMode]);

  // Consolidated Project Totals for 7 Steps
  const consolidatedSteps = useMemo(() => {
    let totalProfileWt = 0;
    let totalProfileCost = 0;
    let totalSteelMtrs = 0;
    let totalSteelWt = 0;
    let totalSteelCost = 0;
    let totalGlassArea = 0;
    let totalGlassCost = 0;
    let totalHardwareCost = 0;
    let totalAccessoryCost = 0;

    activeDesignItems.forEach(d => {
      totalProfileWt += d.bom.totals.totalProfileWeightKg;
      totalProfileCost += d.bom.totals.profileCost;
      totalSteelMtrs += d.bom.totals.totalSteelMeters;
      totalSteelWt += d.bom.totals.totalSteelWeightKg;
      totalSteelCost += d.bom.totals.steelCost;
      totalGlassArea += d.bom.glassItems.reduce((sum, g) => sum + (g.areaSqft || 0), 0);
      totalGlassCost += d.bom.totals.glassCost;
      totalHardwareCost += d.bom.totals.hardwareCost;
      totalAccessoryCost += d.bom.totals.accessoryCost;
    });

    const activeArea = activeDesignItems.reduce((sum, d) => sum + d.areaSqft * d.qty, 0);
    const activeUnits = activeDesignItems.reduce((sum, d) => sum + d.qty, 0);

    // Head Rates
    const profileWastagePct = localTemplate.find(h => h.id === 2)?.rate ?? 10;
    const steelWastagePct = localTemplate.find(h => h.id === 4)?.rate ?? 5;
    const glassWastagePct = localTemplate.find(h => h.id === 7)?.rate ?? 5;
    const fabLabourRate = localTemplate.find(h => h.id === 9)?.rate ?? 70;
    const instLabourRate = localTemplate.find(h => h.id === 10)?.rate ?? 50;
    const profitMarginPct = localTemplate.find(h => h.id === 12)?.rate ?? 60;
    const extraOverhead = localTemplate.find(h => h.id === 13)?.rate ?? 1;
    const discountPct = localTemplate.find(h => h.id === 15)?.rate ?? 0;
    const transportTotal = localTemplate.find(h => h.id === 17)?.rate ?? 1000;
    const loadingTotal = localTemplate.find(h => h.id === 18)?.rate ?? 2000;
    const gstHead = localTemplate.find(h => h.id === 20);
    const gstPct = (gstHead && gstHead.rate !== undefined && gstHead.rate > 0) ? gstHead.rate : 18;

    // Step 1: Logistics
    const transportVal = selectedDesignId === 'ALL' ? transportTotal : Math.round((transportTotal / Math.max(1, totalProjectUnits)) * activeUnits);
    const loadingVal = selectedDesignId === 'ALL' ? loadingTotal : Math.round((loadingTotal / Math.max(1, totalProjectUnits)) * activeUnits);
    const logisticsTotal = transportVal + loadingVal;
    const logisticsPerUnit = activeUnits > 0 ? Math.round(logisticsTotal / activeUnits) : 0;

    // Step 2: Profile
    const profileWastageVal = Math.round(totalProfileCost * (profileWastagePct / 100));
    const profileGrand = totalProfileCost + profileWastageVal;

    // Step 3: Steel
    const steelWastageVal = Math.round(totalSteelCost * (steelWastagePct / 100));
    const steelGrand = totalSteelCost + steelWastageVal;

    // Step 4: Glass
    const glassWastageVal = Math.round(totalGlassCost * (glassWastagePct / 100));
    const glassGrand = totalGlassCost + glassWastageVal;

    // Step 5: Hardware & Raw Material
    const rawMaterialGrand = profileGrand + steelGrand + glassGrand + totalHardwareCost + totalAccessoryCost;

    // Step 6: Labour
    const fabLabourVal = Math.round(activeArea * fabLabourRate);
    const instLabourVal = Math.round(activeArea * instLabourRate);
    const labourTotalVal = fabLabourVal + instLabourVal;
    const subtotalWithLabour = rawMaterialGrand + labourTotalVal;

    // Step 7: Profit & GST
    const profitVal = Math.round(subtotalWithLabour * (profitMarginPct / 100));
    const basicVal = subtotalWithLabour + profitVal + extraOverhead;
    const discountVal = Math.round(basicVal * (discountPct / 100));
    const subTotalVal = basicVal - discountVal;
    const projectCostVal = subTotalVal + logisticsTotal;
    const gstVal = Math.round(projectCostVal * (gstPct / 100));
    const grandTotalVal = projectCostVal + gstVal;

    return {
      activeArea: Math.round(activeArea * 100) / 100,
      activeUnits,
      // 1. Logistics
      transportVal,
      loadingVal,
      logisticsTotal,
      logisticsPerUnit,
      // 2. Profile
      totalProfileWt: Math.round(totalProfileWt * 100) / 100,
      totalProfileCost: Math.round(totalProfileCost),
      profileWastagePct,
      profileWastageVal,
      profileGrand,
      // 3. Steel
      totalSteelMtrs: Math.round(totalSteelMtrs * 100) / 100,
      totalSteelWt: Math.round(totalSteelWt * 100) / 100,
      totalSteelCost: Math.round(totalSteelCost),
      steelWastagePct,
      steelWastageVal,
      steelGrand,
      // 4. Glass
      totalGlassArea: Math.round(totalGlassArea * 100) / 100,
      totalGlassCost: Math.round(totalGlassCost),
      glassWastagePct,
      glassWastageVal,
      glassGrand,
      // 5. Hardware
      totalHardwareCost: Math.round(totalHardwareCost),
      totalAccessoryCost: Math.round(totalAccessoryCost),
      rawMaterialGrand: Math.round(rawMaterialGrand),
      // 6. Labour
      fabLabourRate,
      instLabourRate,
      fabLabourVal,
      instLabourVal,
      labourTotalVal,
      subtotalWithLabour: Math.round(subtotalWithLabour),
      // 7. Profit & GST
      profitMarginPct,
      profitVal,
      extraOverhead,
      basicVal: Math.round(basicVal),
      discountPct,
      discountVal,
      subTotalVal: Math.round(subTotalVal),
      projectCostVal: Math.round(projectCostVal),
      gstPct,
      gstVal,
      grandTotalVal: Math.round(grandTotalVal)
    };
  }, [activeDesignItems, localTemplate, totalProjectUnits, selectedDesignId]);

  // Update Rate Helper for 21 Cost Heads
  const handleRateChange = (id: number, val: number) => {
    const safeVal = isNaN(val) ? 0 : val;
    const updated = localTemplate.map(head => {
      if (head.id === id) {
        return { ...head, rate: safeVal };
      }
      return head;
    });
    setLocalTemplate(updated);

    // Auto-save instantly to localStorage so rates are preserved even if user navigates back
    try {
      localStorage.setItem(`upvc_pricing_template_${customer.id}`, JSON.stringify(updated));
      localStorage.setItem('upvc_pricing_template_active', JSON.stringify(updated));
      localStorage.setItem('upvc_pricing_template_global', JSON.stringify(updated));
    } catch (e) {}
  };

  // Update Visibility Helper
  const handleVisibilityChange = (id: number, vis: any) => {
    const updated = localTemplate.map(head => {
      if (head.id === id) {
        return { ...head, visibility: vis };
      }
      return head;
    });
    setLocalTemplate(updated);

    try {
      localStorage.setItem(`upvc_pricing_template_${customer.id}`, JSON.stringify(updated));
      localStorage.setItem('upvc_pricing_template_active', JSON.stringify(updated));
      localStorage.setItem('upvc_pricing_template_global', JSON.stringify(updated));
    } catch (e) {}
  };

  // Update Item Rate Helper (Inventory Item)
  const handleInventoryPriceChange = (id: string, newPrice: number) => {
    const safePrice = isNaN(newPrice) ? 0 : newPrice;
    const updated = localInventory.map(item => {
      if (item.id === id) {
        return { ...item, price: safePrice };
      }
      return item;
    });
    setLocalInventory(updated);

    try {
      localStorage.setItem(`upvc_inventory_items_${customer.id}`, JSON.stringify(updated));
      localStorage.setItem('upvc_inventory_items_active', JSON.stringify(updated));
    } catch (e) {}
  };

  // Save changes
  const handleSave = () => {
    try {
      localStorage.setItem(`upvc_pricing_template_${customer.id}`, JSON.stringify(localTemplate));
      localStorage.setItem('upvc_pricing_template_active', JSON.stringify(localTemplate));
      localStorage.setItem('upvc_pricing_template_global', JSON.stringify(localTemplate));
      localStorage.setItem(`upvc_inventory_items_${customer.id}`, JSON.stringify(localInventory));
      localStorage.setItem('upvc_inventory_items_active', JSON.stringify(localInventory));
    } catch (e) {}

    // Update customer designs with recalculated prices
    const updatedDesigns: CustomerDesignCardItem[] = designs.map(d => {
      const quote = calculateQuotation(d, localTemplate, localInventory, totalProjectUnits);
      const unitTotal = quote.find(q => q.id === 21)?.value || d.unitPrice;
      return {
        ...d,
        unitPrice: Math.round(unitTotal),
        totalPrice: Math.round(unitTotal * (d.quantity || 1))
      };
    });

    if (onUpdateDesigns) {
      onUpdateDesigns(updatedDesigns);
    }
    if (onUpdateTemplate) {
      onUpdateTemplate(localTemplate);
    }

    try {
      localStorage.setItem(`upvc_cust_designs_${customer.id}`, JSON.stringify(updatedDesigns));
      window.dispatchEvent(new CustomEvent('upvc_customer_designs_changed'));
    } catch (e) {}

    showToast('Pricing & quotation settings saved successfully! (मूल्य सूची सुरक्षित हो गई)');
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-slate-50/60 p-2 sm:p-4 gap-4 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ── TOP PRIMARY TABS (PRICING FORMULA vs ITEM RATES) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} />
              <span>Back (वापस)</span>
            </button>
          )}

          <button
            onClick={() => setPrimaryTab('pricing-formula')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              primaryTab === 'pricing-formula'
                ? 'bg-blue-600 text-white shadow-blue-200'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calculator size={15} />
            <span>Pricing Formula & Rates</span>
          </button>

          <button
            onClick={() => setPrimaryTab('item-rates')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              primaryTab === 'item-rates'
                ? 'bg-blue-600 text-white shadow-blue-200'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Package size={15} />
            <span>Item Rates (Sesh, Frame, etc.)</span>
          </button>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs shadow-blue-200 transition cursor-pointer"
        >
          <Save size={14} />
          <span>Save Changes (सुरक्षित करें)</span>
        </button>
      </div>

      {/* ── PRIMARY TAB 1: PRICING FORMULA & RATES ── */}
      {primaryTab === 'pricing-formula' && (
        <div className="flex flex-col gap-4">
          {/* ── MAIN HEADER CARD ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Calculator size={22} />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Pricing Calculation & Cost Breakdown
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Live mathematical breakdown of Material BOM, Labour, Wastage, and Profit margins.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLocalTemplate(DEFAULT_COST_HEADS);
                    showToast('Reset to default standard rates (डिफ़ॉल्ट रेट्स लोड हो गए)');
                  }}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset Defaults</span>
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs shadow-blue-200 transition cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Pricing Settings</span>
                </button>
              </div>
            </div>

            {/* Subtabs Bar inside Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setActiveSubTab('step-by-step')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeSubTab === 'step-by-step'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>1. Step-by-Step Live Calculation (लाइव कैलकुलेशन समझें)</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('formula-rates')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeSubTab === 'formula-rates'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sliders size={13} />
                  <span>2. Formula Rates & Cost Heads (फॉर्मूला दर व सेटिंग्स)</span>
                </button>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 size={13} />
                <span>Real-time BOM Matrix</span>
              </span>
            </div>
          </div>

          {/* ── DESIGN SELECTOR & 5 KPI METRICS ROW ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  SELECT DESIGN TO INSPECT:
                </span>
                <select
                  value={selectedDesignId}
                  onChange={e => setSelectedDesignId(e.target.value)}
                  className="bg-blue-50/60 border border-blue-200 text-blue-900 font-bold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="ALL">⭐ Complete Project Overview ({totalProjectUnits} Windows / Doors)</option>
                  {calculatedDesigns.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.tag} - {d.seriesName || d.type} ({d.width} × {d.height} mm - {d.areaSqft} Sq.Ft)
                    </option>
                  ))}
                </select>
              </div>

              {onOpenDesigner && (
                <button
                  onClick={() => {
                    const targetId = selectedDesignId === 'ALL' ? calculatedDesigns[0]?.id : selectedDesignId;
                    if (targetId) onOpenDesigner(targetId);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Open in Vector Designer</span>
                </button>
              )}
            </div>

            {/* 5 KPI Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Card 1: Project Summary / Selected Window */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Box size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    {projectSummary.titleLabel}
                  </span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">
                    {projectSummary.summarySubtitle}
                  </p>
                </div>
              </div>

              {/* Card 2: Total Project Area / Window Area */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {projectSummary.areaLabel}
                </span>
                <div>
                  <p className="text-lg font-black text-slate-900 font-mono">
                    {projectSummary.totalArea} <span className="text-xs font-normal font-sans text-slate-500">Sq.Ft</span>
                  </p>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {projectSummary.totalAreaM2} m² Glazing Area
                  </span>
                </div>
              </div>

              {/* Card 3: Project Units */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  PROJECT UNITS
                </span>
                <div>
                  <p className="text-lg font-black text-slate-900 font-mono">
                    {projectSummary.totalUnits} <span className="text-xs font-normal font-sans text-slate-500">{projectSummary.isSingle ? 'Unit' : 'Total Units'}</span>
                  </p>
                  <span className="text-[11px] text-slate-400 font-medium truncate block">
                    {projectSummary.unitsSubtitle}
                  </span>
                </div>
              </div>

              {/* Card 4: Party / Site */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  PARTY / SITE
                </span>
                <div>
                  <p className="text-sm font-black text-slate-900 truncate">
                    {projectSummary.customerName}
                  </p>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {projectSummary.siteName}
                  </span>
                </div>
              </div>

              {/* Card 5: Effective Avg Rate */}
              <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                  EFFECTIVE AVG RATE
                </span>
                <div>
                  <p className="text-lg font-black text-blue-700 font-mono">
                    ₹{projectSummary.avgRate} <span className="text-xs font-normal font-sans text-blue-500">/ Sq.Ft</span>
                  </p>
                  <span className="text-[11px] text-blue-600 font-medium">
                    Grand Total: ₹{projectSummary.grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── SINGLE WINDOW INSPECTION BANNER (When inspecting a single window) ── */}
          {inspectedDesign && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 border border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedDesignId('ALL')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Back to All Windows Overview"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono font-black text-xs">
                      {inspectedDesign.tag}
                    </span>
                    <h2 className="text-sm font-black text-white">
                      {inspectedDesign.seriesName || `${inspectedDesign.type} Series`} ({inspectedDesign.width} × {inspectedDesign.height} mm)
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Area: {inspectedDesign.areaSqft} Sq.Ft • Location: {inspectedDesign.location || 'Window Unit'} • Qty: {inspectedDesign.qty}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDesignId('ALL')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Layers size={13} />
                  <span>All Windows Overview</span>
                </button>
                {onOpenDesigner && (
                  <button
                    onClick={() => onOpenDesigner(inspectedDesign.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    <span>Edit in Designer</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── ALL PROJECT WINDOWS & DOORS SUMMARY TABLE (Shown in Complete Overview Mode) ── */}
          {selectedDesignId === 'ALL' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Box size={16} className="text-blue-600" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    All Project Windows & Doors Summary ({calculatedDesigns.length} Types • {totalProjectUnits} Total Units)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Click "Inspect" on any row to view its individual window cut sizes & breakdown
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                      <th className="px-3 py-2.5 text-center">#</th>
                      <th className="px-3 py-2.5">Ref / Mark</th>
                      <th className="px-3 py-2.5">Location / Description</th>
                      <th className="px-3 py-2.5">Size (W × H mm)</th>
                      <th className="px-3 py-2.5">Series / Type</th>
                      <th className="px-3 py-2.5 text-center">Qty</th>
                      <th className="px-3 py-2.5 text-right">Area (Sq.Ft)</th>
                      <th className="px-3 py-2.5 text-right">Est. Unit Price</th>
                      <th className="px-3 py-2.5 text-right">Total Price</th>
                      <th className="px-3 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {calculatedDesigns.map((d, idx) => (
                      <tr 
                        key={d.id} 
                        className="hover:bg-slate-50/70 transition"
                      >
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-black text-blue-600 font-mono text-xs">{d.tag}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">{d.location || 'Window Unit'}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{d.width} × {d.height} mm</td>
                        <td className="px-3 py-2.5 text-slate-700 font-semibold">{d.seriesName || `${d.type} Series`}</td>
                        <td className="px-3 py-2.5 text-center font-black text-slate-900">{d.qty}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700">{d.areaSqft}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">₹{d.unitTotal.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">₹{d.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => setSelectedDesignId(d.id)}
                            className="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200"
                          >
                            <span>Inspect →</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/90 font-black text-xs border-t-2 border-slate-200">
                      <td colSpan={5} className="px-3 py-3 text-slate-900 uppercase">
                        Total Project Master ({calculatedDesigns.length} Types • {totalProjectUnits} Windows)
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-blue-600 text-sm">{totalProjectUnits}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-900">{projectSummary.totalArea}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600 text-xs">Avg ₹{projectSummary.avgRate}/sqft</td>
                      <td className="px-3 py-3 text-right font-mono text-blue-700 text-sm">
                        ₹{projectSummary.grandTotal.toLocaleString('en-IN')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── SUBTAB CONTENT 1: STEP-BY-STEP CONSOLIDATED 7 STEPS ── */}
          {activeSubTab === 'step-by-step' && (
            <div className="flex flex-col gap-4">
              {/* 7 Steps Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-blue-600" />
                  <h2 className="text-xs sm:text-sm font-black text-slate-900">
                    {inspectedDesign 
                      ? `${inspectedDesign.tag} Step-by-Step Cost Breakdown (7 Steps Live)`
                      : 'Sabhi Windows Ka Ikhata Step-by-Step Breakdown (Consolidated 7 Steps)'}
                  </h2>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  Total Area: {consolidatedSteps.activeArea} Sq.Ft • {consolidatedSteps.activeUnits} Units
                </span>
              </div>

              {/* 7 Steps Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {/* STEP 1: LOADING, UNLOADING & TRANSPORT */}
                <div className="bg-amber-50/20 border-2 border-amber-400 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        1
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                        LOADING, UNLOADING & TRANSPORT
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                      Head 17 & 18
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-500 text-[11px]">
                      {inspectedDesign ? `Window Share (Divided across ${totalProjectUnits} Windows):` : `Total Logistics Cost (Divided across ${totalProjectUnits} Windows):`}
                    </p>
                    <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs font-bold text-slate-800">
                      Transport (₹{consolidatedSteps.transportVal.toLocaleString('en-IN')}) + Loading & Unloading (₹{consolidatedSteps.loadingVal.toLocaleString('en-IN')}) = ₹{consolidatedSteps.logisticsTotal.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[10px] text-amber-800 font-medium italic">
                      कुल खिड़कियों ({totalProjectUnits} Windows) में भाग होकर ₹{consolidatedSteps.logisticsPerUnit.toLocaleString('en-IN')} हर विंडो में जोड़ा जाता है।
                    </p>
                  </div>

                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800">Per Window Logistics:</span>
                    <span className="text-xs font-mono font-black text-amber-900">
                      = ₹{consolidatedSteps.logisticsPerUnit.toLocaleString('en-IN')} / Window
                    </span>
                  </div>
                </div>

                {/* STEP 2: PROFILE COST & WASTAGE */}
                <div className="bg-blue-50/20 border-2 border-blue-400 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        2
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                        PROFILE COST & WASTAGE
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Head 1 & 2
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-500 text-[11px]">
                      {inspectedDesign ? 'Profile Weight:' : 'Total Project Profile Weight:'} <span className="font-bold text-slate-800">{consolidatedSteps.totalProfileWt} Kg</span>
                    </p>
                    <div className="p-2.5 bg-white rounded-xl border border-blue-200 text-xs font-bold text-slate-800">
                      Profile (₹{consolidatedSteps.totalProfileCost.toLocaleString('en-IN')}) + {consolidatedSteps.profileWastagePct}% Wastage (₹{consolidatedSteps.profileWastageVal.toLocaleString('en-IN')}) = ₹{consolidatedSteps.profileGrand.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-800">Total Profile Value:</span>
                    <span className="text-xs font-mono font-black text-blue-900">
                      ₹{consolidatedSteps.profileGrand.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* STEP 3: GI REINFORCEMENT STEEL */}
                <div className="bg-indigo-50/20 border-2 border-indigo-400 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        3
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                        GI REINFORCEMENT STEEL
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                      Head 3 & 4
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-500 text-[11px]">
                      {inspectedDesign ? 'Steel Length:' : 'Total Project Steel:'} <span className="font-bold text-slate-800">{consolidatedSteps.totalSteelMtrs} Mtr ({consolidatedSteps.totalSteelWt} Kg)</span>
                    </p>
                    <div className="p-2.5 bg-white rounded-xl border border-indigo-200 text-xs font-bold text-slate-800">
                      Steel (₹{consolidatedSteps.totalSteelCost.toLocaleString('en-IN')}) + {consolidatedSteps.steelWastagePct}% Wastage (₹{consolidatedSteps.steelWastageVal.toLocaleString('en-IN')}) = ₹{consolidatedSteps.steelGrand.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-800">Total Steel Value:</span>
                    <span className="text-xs font-mono font-black text-indigo-900">
                      ₹{consolidatedSteps.steelGrand.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* STEP 4: GLASS PANES & GLAZING */}
                <div className="bg-cyan-50/20 border-2 border-cyan-400 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between border-b border-cyan-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        4
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                        GLASS PANES & GLAZING
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                      Head 6 & 7
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-500 text-[11px]">
                      {inspectedDesign ? 'Glass Area:' : 'Total Project Glass Area:'} <span className="font-bold text-slate-800">{consolidatedSteps.totalGlassArea} Sq.Ft</span>
                    </p>
                    <div className="p-2.5 bg-white rounded-xl border border-cyan-200 text-xs font-bold text-slate-800">
                      Glass (₹{consolidatedSteps.totalGlassCost.toLocaleString('en-IN')}) + {consolidatedSteps.glassWastagePct}% Wastage (₹{consolidatedSteps.glassWastageVal.toLocaleString('en-IN')}) = ₹{consolidatedSteps.glassGrand.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-cyan-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-800">Total Glass Value:</span>
                    <span className="text-xs font-mono font-black text-cyan-900">
                      ₹{consolidatedSteps.glassGrand.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* STEP 5: HARDWARE & CONSUMABLES */}
                <div className="bg-slate-50/40 border-2 border-slate-400 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        5
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                        HARDWARE & CONSUMABLES
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                      Head 5 & 8
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-500 text-[11px]">
                      Total Raw Material BOM Cost: <span className="font-bold text-slate-800">₹{consolidatedSteps.rawMaterialGrand.toLocaleString('en-IN')}</span>
                    </p>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
                      Hardware (₹{consolidatedSteps.totalHardwareCost.toLocaleString('en-IN')}) + Accessories (₹{consolidatedSteps.totalAccessoryCost.toLocaleString('en-IN')}) = ₹{(consolidatedSteps.totalHardwareCost + consolidatedSteps.totalAccessoryCost).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Raw Materials Total (Head 8):</span>
                    <span className="text-xs font-mono font-black text-slate-900">
                      ₹{consolidatedSteps.rawMaterialGrand.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* STEP 6: LABOUR (FAB + INSTALL) */}
                <div className="bg-emerald-50/20 border-2 border-emerald-400 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        6
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                        LABOUR (FAB + INSTALL)
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Head 9, 10, 11
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-500 text-[11px]">
                      Area: <span className="font-bold text-slate-800">{consolidatedSteps.activeArea} Sq.Ft</span> • Fab: ₹{consolidatedSteps.fabLabourRate}/sqft + Fit: ₹{consolidatedSteps.instLabourRate}/sqft
                    </p>
                    <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs font-bold text-slate-800">
                      Fab (₹{consolidatedSteps.fabLabourVal.toLocaleString('en-IN')}) + Install (₹{consolidatedSteps.instLabourVal.toLocaleString('en-IN')}) = ₹{consolidatedSteps.labourTotalVal.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800">Subtotal with Labour (Head 11):</span>
                    <span className="text-xs font-mono font-black text-emerald-900">
                      ₹{consolidatedSteps.subtotalWithLabour.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* STEP 7: PROFIT & 18% GST */}
                <div className="bg-purple-50/20 border-2 border-purple-400 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3 md:col-span-2 xl:col-span-3">
                  <div className="flex items-center justify-between border-b border-purple-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        7
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                        PROFIT & 18% GST (FINAL GRAND TOTAL)
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                      Head 12, 19, 20, 21
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-purple-200">
                      <span className="text-[10px] font-bold text-purple-700 block">Profit ({consolidatedSteps.profitMarginPct}%)</span>
                      <p className="text-sm font-black text-slate-900 font-mono mt-0.5">
                        ₹{consolidatedSteps.profitVal.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-purple-200">
                      <span className="text-[10px] font-bold text-purple-700 block">GST Tax ({consolidatedSteps.gstPct}%)</span>
                      <p className="text-sm font-black text-slate-900 font-mono mt-0.5">
                        ₹{consolidatedSteps.gstVal.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="p-2.5 bg-purple-100/70 rounded-xl border border-purple-300">
                      <span className="text-[10px] font-black text-purple-900 block uppercase">
                        {inspectedDesign ? 'Window Grand Total Amount' : 'Grand Total Project Amount'}
                      </span>
                      <p className="text-base font-black text-purple-950 font-mono mt-0.5">
                        ₹{consolidatedSteps.grandTotalVal.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── COMPLETE PROJECT MATERIAL BOM BREAKDOWN (CATEGORIZED SECTIONS) ── */}
              <div className="flex flex-col gap-3">
                {/* Dark Navy Header Bar */}
                <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Layers3 size={18} />
                    </div>
                    <div>
                      <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                        {inspectedDesign 
                          ? `DETAILED BILL OF MATERIALS (BOM) — ${inspectedDesign.tag}`
                          : 'SABHI WINDOWS KA IKHATA MATERIAL BOM BREAKDOWN (COMPLETE PROJECT BOM)'}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {inspectedDesign
                          ? 'Categorized sequentially by manufacturing cost heads (1. Profiles → 2. GI Steel → 3. Glass → 4. Hardware & Consumables)'
                          : `Total ${categorizedBOM.totalComponentCount} Components across ${consolidatedSteps.activeUnits} Windows (${consolidatedSteps.activeArea} Sq.Ft)`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs">
                      <button
                        onClick={() => setBomViewMode('grouped')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          bomViewMode === 'grouped' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Grouped Item Totals
                      </button>
                      <button
                        onClick={() => setBomViewMode('detailed')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          bomViewMode === 'detailed' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Window-Wise Detailed
                      </button>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs overflow-x-auto">
                      {(['ALL', '1_PROFILE', '2_STEEL', '3_GLASS', '4_HARDWARE'] as const).map(tab => {
                        const count = tab === 'ALL' ? categorizedBOM.totalComponentCount :
                          tab === '1_PROFILE' ? categorizedBOM.profiles.length :
                          tab === '2_STEEL' ? categorizedBOM.steel.length :
                          tab === '3_GLASS' ? categorizedBOM.glass.length :
                          categorizedBOM.hardware.length;
                        return (
                          <button
                            key={tab}
                            onClick={() => setBomSectionTab(tab)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                              bomSectionTab === tab ? 'bg-white text-slate-950 font-black shadow-xs' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {tab === 'ALL' ? `All (${count})` : 
                             tab === '1_PROFILE' ? `1. Profiles (${count})` :
                             tab === '2_STEEL' ? `2. GI Steel (${count})` :
                             tab === '3_GLASS' ? `3. Glass (${count})` :
                             `4. Hardware (${count})`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── SECTION 1: UPVC PROFILES ── */}
                {(bomSectionTab === 'ALL' || bomSectionTab === '1_PROFILE') && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    {/* Section Header */}
                    <div className="px-4 py-3 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                          1
                        </span>
                        <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                          1. UPVC PROFILES (OUTER FRAME, SASHES, MULLIONS, BEADINGS, INTERLOCKS)
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono font-bold text-blue-900">
                        <span>Total Weight: {categorizedBOM.profileTotalWeight} Kg</span>
                        <span className="w-1 h-3 bg-blue-300 rounded-full" />
                        <span className="text-blue-700 font-black">Total Cost: ₹{categorizedBOM.profileTotalCost.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                            <th className="px-3 py-2.5">Profile Code & Description</th>
                            <th className="px-3 py-2.5">Category / Type</th>
                            <th className="px-3 py-2.5">Used In Windows</th>
                            <th className="px-3 py-2.5 text-right">Cut Length (mm)</th>
                            <th className="px-3 py-2.5 text-center">Total Pcs</th>
                            <th className="px-3 py-2.5 text-right">Total Weight (Kg)</th>
                            <th className="px-3 py-2.5 text-right">Unit Rate (₹/M or ₹/Kg)</th>
                            <th className="px-3 py-2.5 text-right">Total Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {categorizedBOM.profiles.map((bom, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                              <td className="px-3 py-2.5 font-bold text-slate-900">
                                <span className="font-mono font-black text-slate-900 block">{bom.code}</span>
                                <span className="text-[11px] text-slate-500 font-medium">{bom.name}</span>
                                {bom.spec && <span className="text-[10px] text-slate-400 font-mono block">{bom.spec}</span>}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                  {bom.subCategory || bom.category}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {(bom.usedInWindows || ['W1']).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-700">
                                {bom.lengthMm ? `${bom.lengthMm} mm` : bom.totalLengthMtr ? `${bom.totalLengthMtr} Mtr` : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                {bom.totalQty} {bom.unit}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                                {bom.totalWeightKg ? `${bom.totalWeightKg} kg` : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-600">
                                ₹{bom.unitRate} /kg
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">
                                ₹{bom.totalPrice.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-blue-50/40 font-black text-xs border-t-2 border-blue-200">
                            <td colSpan={5} className="px-3 py-2.5 text-blue-900 uppercase">
                              Section 1 Subtotal (Profiles):
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-blue-900">
                              {categorizedBOM.profileTotalWeight} kg
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-500 text-[11px]">
                              + {consolidatedSteps.profileWastagePct}% Wastage in Quote
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-blue-700 text-sm font-black">
                              ₹{categorizedBOM.profileTotalCost.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── SECTION 2: GI STEEL REINFORCEMENT ── */}
                {(bomSectionTab === 'ALL' || bomSectionTab === '2_STEEL') && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    {/* Section Header */}
                    <div className="px-4 py-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                          2
                        </span>
                        <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                          2. GI STEEL REINFORCEMENT (GALVANIZED STEEL INSERTS FOR FRAME, SASH, MULLION)
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono font-bold text-indigo-900">
                        <span>Total Length: {categorizedBOM.steelTotalLength} Mtr ({categorizedBOM.steelTotalWeight} Kg)</span>
                        <span className="w-1 h-3 bg-indigo-300 rounded-full" />
                        <span className="text-indigo-700 font-black">Total Cost: ₹{categorizedBOM.steelTotalCost.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                            <th className="px-3 py-2.5">Steel Section & Code</th>
                            <th className="px-3 py-2.5">Category</th>
                            <th className="px-3 py-2.5">Used In Windows</th>
                            <th className="px-3 py-2.5 text-right">Cut Length / Spec</th>
                            <th className="px-3 py-2.5 text-center">Total Pcs</th>
                            <th className="px-3 py-2.5 text-right">Total Length (Mtr)</th>
                            <th className="px-3 py-2.5 text-right">Unit Rate (₹/Mtr)</th>
                            <th className="px-3 py-2.5 text-right">Total Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {categorizedBOM.steel.map((bom, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                              <td className="px-3 py-2.5 font-bold text-slate-900">
                                <span className="font-mono font-black text-slate-900 block">{bom.code}</span>
                                <span className="text-[11px] text-slate-500 font-medium">{bom.name}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {bom.subCategory || bom.category}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {(bom.usedInWindows || ['W1']).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                                {bom.spec || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                {bom.totalQty} Pcs
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                                {bom.totalLengthMtr} Mtr
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-600">
                                ₹{bom.unitRate} /m
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">
                                ₹{bom.totalPrice.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-indigo-50/40 font-black text-xs border-t-2 border-indigo-200">
                            <td colSpan={5} className="px-3 py-2.5 text-indigo-900 uppercase">
                              Section 2 Subtotal (GI Steel):
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-indigo-900">
                              {categorizedBOM.steelTotalLength} Mtr
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-500 text-[11px]">
                              + {consolidatedSteps.steelWastagePct}% Wastage in Quote
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-indigo-700 text-sm font-black">
                              ₹{categorizedBOM.steelTotalCost.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── SECTION 3: GLASS & MOSQUITO MESH PANES ── */}
                {(bomSectionTab === 'ALL' || bomSectionTab === '3_GLASS') && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    {/* Section Header */}
                    <div className="px-4 py-3 bg-cyan-50/70 border-b border-cyan-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-cyan-600 text-white text-[11px] font-black flex items-center justify-center">
                          3
                        </span>
                        <h3 className="text-xs font-black text-cyan-950 uppercase tracking-wider">
                          3. GLASS & MOSQUITO MESH PANES (ग्लास एवं जाली साइज व दर / CLEAR, TOUGHENED, DGU & TINTED GLASS)
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono font-bold text-cyan-900">
                        <span>Total Area: {categorizedBOM.glassTotalArea} Sq.Ft</span>
                        <span className="w-1 h-3 bg-cyan-300 rounded-full" />
                        <span className="text-cyan-700 font-black">Total Cost: ₹{categorizedBOM.glassTotalCost.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                            <th className="px-3 py-2.5">Glass Specification & Code</th>
                            <th className="px-3 py-2.5">Used In Windows</th>
                            <th className="px-3 py-2.5 text-right">Pane Dimensions (W × H mm)</th>
                            <th className="px-3 py-2.5 text-center">Total Glass Panes</th>
                            <th className="px-3 py-2.5 text-right">Total Glazing Area (Sq.Ft)</th>
                            <th className="px-3 py-2.5 text-right">Glass Rate (₹/Sq.Ft)</th>
                            <th className="px-3 py-2.5 text-right">Total Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {categorizedBOM.glass.map((bom, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                              <td className="px-3 py-2.5 font-bold text-slate-900">
                                <span className="font-mono font-black text-slate-900 block">{bom.code}</span>
                                <span className="text-[11px] text-slate-500 font-medium">{bom.name}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {(bom.usedInWindows || ['W1']).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                                {bom.widthMm && bom.heightMm ? `${bom.widthMm} × ${bom.heightMm} mm` : bom.spec || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                {bom.totalQty} Panes
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                                {bom.areaSqft} Sq.Ft
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-600">
                                ₹{bom.unitRate} /sqft
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">
                                ₹{bom.totalPrice.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-cyan-50/40 font-black text-xs border-t-2 border-cyan-200">
                            <td colSpan={4} className="px-3 py-2.5 text-cyan-900 uppercase">
                              Section 3 Subtotal (Glass Panes):
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-cyan-900">
                              {categorizedBOM.glassTotalArea} Sq.Ft
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-500 text-[11px]">
                              + {consolidatedSteps.glassWastagePct}% Wastage in Quote
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-cyan-700 text-sm font-black">
                              ₹{categorizedBOM.glassTotalCost.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── SECTION 4: HARDWARE, GASKETS & CONSUMABLES ── */}
                {(bomSectionTab === 'ALL' || bomSectionTab === '4_HARDWARE') && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    {/* Section Header */}
                    <div className="px-4 py-3 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-800 text-white text-[11px] font-black flex items-center justify-center">
                          4
                        </span>
                        <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                          4. HARDWARE, GASKETS & CONSUMABLES (SABHI WINDOWS KE ROLLERS, LOCKS, GASKETS, FASTENERS)
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono font-bold text-slate-800">
                        <span>{categorizedBOM.hardwareTotalCount} Total Items</span>
                        <span className="w-1 h-3 bg-slate-300 rounded-full" />
                        <span className="text-slate-900 font-black">Total Cost: ₹{categorizedBOM.hardwareTotalCost.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                            <th className="px-3 py-2.5">Hardware / Accessory Name & Code</th>
                            <th className="px-3 py-2.5">Category</th>
                            <th className="px-3 py-2.5">Used In Windows</th>
                            <th className="px-3 py-2.5">Specification</th>
                            <th className="px-3 py-2.5 text-center">Total Quantity</th>
                            <th className="px-3 py-2.5 text-right">Unit Rate</th>
                            <th className="px-3 py-2.5 text-right">Total Price (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {categorizedBOM.hardware.map((bom, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                              <td className="px-3 py-2.5 font-bold text-slate-900">
                                <span className="font-mono font-black text-slate-900 block">{bom.code}</span>
                                <span className="text-[11px] text-slate-500 font-medium">{bom.name}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                  {bom.subCategory || bom.category}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {(bom.usedInWindows || ['W1']).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">
                                {bom.spec || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                                {bom.totalQty} {bom.unit}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-600">
                                ₹{bom.unitRate} /{bom.unit}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">
                                ₹{bom.totalPrice.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100/70 font-black text-xs border-t-2 border-slate-200">
                            <td colSpan={5} className="px-3 py-2.5 text-slate-900 uppercase">
                              Section 4 Subtotal (Hardware & Gaskets):
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-500 text-[11px]">
                              Lumpsum / Direct Spec
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-900 text-sm font-black">
                              ₹{categorizedBOM.hardwareTotalCost.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── BOTTOM MASTER SUMMARY BAR ── */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block">
                      Head 8: Total Raw Material Cost (Sabhi Windows Ka Master BOM Total)
                    </span>
                    <p className="text-xs text-slate-300 font-medium">
                      1. Profile: ₹{categorizedBOM.profileTotalCost.toLocaleString('en-IN')} • 2. Steel: ₹{categorizedBOM.steelTotalCost.toLocaleString('en-IN')} • 3. Glass: ₹{categorizedBOM.glassTotalCost.toLocaleString('en-IN')} • 4. Hardware & Acc: ₹{categorizedBOM.hardwareTotalCost.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Raw Material Total</span>
                      <p className="text-xl font-black text-emerald-400 font-mono">
                        ₹{categorizedBOM.grandRawMaterialTotal.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SUBTAB CONTENT 2: MASTER 21 HEADS SPREADSHEET ── */}
          {activeSubTab === 'formula-rates' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs overflow-x-auto flex flex-col gap-4">
              {/* Info Alert Banner matching Screenshot 2 */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Info size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                    20 Cost Heads Parameters & Rates
                  </h3>
                  <p className="text-xs text-blue-800 mt-0.5">
                    यहाँ आप प्रोफ़ाइल वेस्टेज, लेबर दर, ट्रांसपोर्ट और प्रॉफिट मार्जिन को अपनी सुविधानुसार बदल सकते हैं। बदलने के बाद ऊपर दिए गए "Save Pricing Settings" बटन पर क्लिक करें।
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-900">
                    Master 21-Head Formula & Rate Settings (21 फॉर्मूला दर व सेटिंग्स)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Configure calculation modes, percentages, labor charges, and quotation visibility options
                  </p>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <th className="px-3 py-2.5 text-center">SL. NO</th>
                    <th className="px-3 py-2.5">COST HEAD NAME</th>
                    <th className="px-3 py-2.5">CALCULATION TYPE</th>
                    <th className="px-3 py-2.5">RATE / %</th>
                    <th className="px-3 py-2.5">VISIBILITY IN QUOTATION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {localTemplate.map((head) => (
                    <tr key={head.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-3 py-3 font-mono font-black text-slate-500 text-center">{head.id}</td>
                      <td className="px-3 py-3 font-extrabold text-slate-900">
                        {head.name}
                        {head.notes && <span className="text-[10px] text-slate-400 font-normal block">{head.notes}</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${
                          head.calcType === 'CustomFormula' ? 'bg-purple-100 text-purple-800' :
                          head.calcType === 'Percentage' ? 'bg-blue-100 text-blue-800' :
                          head.calcType === 'AreaSqftFg' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {head.calcType === 'AreaSqftFg' ? 'AREASQFTFG' :
                           head.calcType === 'CustomFormula' ? 'CUSTOMFORMULA' :
                           head.calcType === 'Percentage' ? 'PERCENTAGE' :
                           head.calcType === 'UserDefinedFGOverhead' ? 'USERDEFINEDFOVERHEAD' :
                           'LUMPSUM (+ WINDOW QTY)'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {head.calcType === 'CustomFormula' ? (
                          <span className="text-xs text-slate-400 font-medium italic">
                            Auto (From Window Geometry)
                          </span>
                        ) : head.calcType === 'Percentage' ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={head.rate}
                              onChange={e => handleRateChange(head.id, parseFloat(e.target.value))}
                              className="w-20 h-8 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <span className="font-bold text-slate-600">%</span>
                          </div>
                        ) : head.calcType === 'AreaSqftFg' ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={head.rate}
                              onChange={e => handleRateChange(head.id, parseFloat(e.target.value))}
                              className="w-20 h-8 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <span className="font-bold text-slate-600">/sqft</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={head.rate}
                              onChange={e => handleRateChange(head.id, parseFloat(e.target.value))}
                              className="w-24 h-8 text-center bg-slate-50 border border-slate-300 rounded-lg text-xs font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                            <span className="text-[11px] font-bold text-slate-500">Total (+ Qty)</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={head.visibility}
                          onChange={e => handleVisibilityChange(head.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="Show in Quote Window">Show in Quote Window</option>
                          <option value="Show in Quote Summary">Show in Quote Summary</option>
                          <option value="Do not show in Quote">Do not show in Quote</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bottom Action Footer for Cost Heads */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {onBack && (
                    <button
                      onClick={onBack}
                      className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Windows & Doors (वापस जाएं)</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setLocalTemplate(DEFAULT_COST_HEADS);
                      showToast('Reset to default standard rates (डिफ़ॉल्ट दरें लोड हो गईं)');
                    }}
                    className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Reset Defaults (डिफ़ॉल्ट सेटिंग्स)</span>
                  </button>
                </div>

                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs shadow-blue-200 transition cursor-pointer"
                >
                  <Save size={15} />
                  <span>Save Formula Rates & Cost Heads (दरें सुरक्षित करें)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRIMARY TAB 2: ITEM RATES (SASH, FRAME, MULLION, GLASS, STEEL, HARDWARE) ── */}
      {primaryTab === 'item-rates' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Package size={22} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  Item Rates & Inventory Master (Sash, Frame, Glass, Steel & Hardware)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Adjust unit purchase & fabrication rates. All pricing calculations update automatically in real-time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setLocalInventory(DEFAULT_INVENTORY_ITEMS);
                  showToast('Inventory rates reset to default values.');
                }}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset Items</span>
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs shadow-blue-200 transition cursor-pointer"
              >
                <Save size={14} />
                <span>Save All Item Rates</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search profiles, sash, glass, hardware..."
                value={itemRateSearch}
                onChange={e => setItemRateSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              {['ALL', 'Profile', 'Glass', 'Reinforcement', 'Hardware'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setItemRateCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    itemRateCategoryFilter === cat
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'ALL' ? 'All Items' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                  <th className="px-3 py-2.5">Item Code</th>
                  <th className="px-3 py-2.5">Item Name & Description</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5 text-center">Unit</th>
                  <th className="px-3 py-2.5 text-right">Unit Rate / Price (₹)</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {localInventory
                  .filter(item => {
                    const matchesCat = itemRateCategoryFilter === 'ALL' || item.category === itemRateCategoryFilter;
                    const matchesSearch = itemRateSearch === '' || 
                      item.name.toLowerCase().includes(itemRateSearch.toLowerCase()) || 
                      item.code.toLowerCase().includes(itemRateSearch.toLowerCase());
                    return matchesCat && matchesSearch;
                  })
                  .map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-3 py-2.5 font-mono font-black text-blue-600">{item.code}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-800">
                        {item.name}
                        {item.weightPerMeter && (
                          <span className="text-[10px] text-slate-400 font-normal block font-mono">
                            Weight: {item.weightPerMeter} kg/meter
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.category === 'Profile' ? 'bg-blue-50 text-blue-700' :
                          item.category === 'Reinforcement' ? 'bg-indigo-50 text-indigo-700' :
                          item.category === 'Glass' ? 'bg-cyan-50 text-cyan-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-600">{item.unit}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-bold text-slate-500">₹</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={e => handleInventoryPriceChange(item.id, parseFloat(e.target.value))}
                            className="w-24 h-7 text-right bg-slate-50 border border-slate-300 rounded px-2 text-xs font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          ● {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingSettings;
