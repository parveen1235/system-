import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  ArrowLeft,
  Search,
  Package,
  Boxes,
  Layers,
  Layers3,
  CheckCircle2,
  Info,
  DollarSign,
  TrendingUp,
  Percent,
  Truck,
  ShieldCheck,
  Building,
  User,
  ExternalLink,
  ChevronRight,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  HelpCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  Tag
} from 'lucide-react';
import { CostHead, DetailedBOMResult, MaterialBOMItem, InventoryItem } from '../types/pricing';
import { CustomerRecord } from '../types/erp';
import { CustomerDesignCardItem, getInitialDesignsForCustomer } from './CustomerProjectView';
import {
  DEFAULT_COST_HEADS,
  DEFAULT_INVENTORY_ITEMS,
  calculateQuotation,
  getDetailedMaterialBOM
} from '../utils/pricing';
import { UPVCProject, UPVCFrame } from '../types/upvc';
import { recalculateFramePockets, DEFAULT_PRICING_CONFIG } from '../utils/upvcCalculations';

interface PricingFormulaViewProps {
  customers?: CustomerRecord[];
  selectedCustomer?: CustomerRecord | null;
  designs?: CustomerDesignCardItem[];
  onBack: () => void;
  onOpenDesigner?: (designId: string) => void;
  onUpdateDesigns?: (updatedDesigns: CustomerDesignCardItem[]) => void;
  lang?: 'hi' | 'en';
}

// Benchmark Standard Window Designs for factory formula testing
export const BENCHMARK_WINDOW_DESIGNS: CustomerDesignCardItem[] = [
  {
    id: 'bench-w1',
    tag: 'W1',
    type: 'Casement',
    location: 'Master Bedroom',
    width: 1000,
    height: 1000,
    seriesName: '60mm Casement Window Series',
    quantity: 1,
    unitPrice: 7200,
    totalPrice: 7200,
    glassType: 'clear_6mm',
    profileColor: 'white',
    projectData: {
      id: 'proj_bench_w1',
      name: 'W1 Benchmark Casement 1000x1000',
      clientName: 'Standard Benchmark',
      referenceNo: 'W1',
      date: new Date().toISOString(),
      frames: [
        {
          id: 'f-bench-1',
          name: 'F1',
          x: 0,
          y: 0,
          width: 1000,
          height: 1000,
          frameProfileWidth: 60,
          mullionProfileWidth: 74,
          sashProfileWidth: 60,
          color: 'white',
          series: 'casement_60',
          mullions: [],
          pockets: [
            {
              id: 'p-bench-1',
              frameId: 'f-bench-1',
              x: 60,
              y: 60,
              width: 880,
              height: 880,
              sashType: 'casement_right',
              glassType: 'clear_6mm',
              gridPattern: 'none'
            }
          ],
          reinforcement: 'steel_1.5mm',
          drainageCaps: true
        }
      ],
      couplings: [],
      pricingConfig: { ...DEFAULT_PRICING_CONFIG }
    }
  },
  {
    id: 'bench-w2',
    tag: 'W2',
    type: 'Sliding',
    location: 'Drawing Hall',
    width: 1500,
    height: 1200,
    seriesName: '62mm 2-Track Sliding Series',
    quantity: 2,
    unitPrice: 10800,
    totalPrice: 21600,
    glassType: 'clear_6mm',
    profileColor: 'white',
    projectData: {
      id: 'proj_bench_w2',
      name: 'W2 Benchmark 2-Track Slider 1500x1200',
      clientName: 'Standard Benchmark',
      referenceNo: 'W2',
      date: new Date().toISOString(),
      frames: [
        {
          id: 'f-bench-2',
          name: 'F2',
          x: 0,
          y: 0,
          width: 1500,
          height: 1200,
          frameProfileWidth: 62,
          mullionProfileWidth: 16,
          sashProfileWidth: 60,
          color: 'white',
          series: 'sliding_62',
          mullions: [{ id: 'mul-w2-center', orientation: 'vertical', position: 750 }],
          pockets: [
            {
              id: 'p-bench-2a',
              frameId: 'f-bench-2',
              x: 62,
              y: 62,
              width: 680,
              height: 1076,
              sashType: 'slider_arrow_right',
              glassType: 'clear_6mm',
              gridPattern: 'none'
            },
            {
              id: 'p-bench-2b',
              frameId: 'f-bench-2',
              x: 758,
              y: 62,
              width: 680,
              height: 1076,
              sashType: 'slider_arrow_left',
              glassType: 'clear_6mm',
              gridPattern: 'none'
            }
          ],
          reinforcement: 'steel_1.5mm',
          drainageCaps: true
        }
      ],
      couplings: [],
      pricingConfig: { ...DEFAULT_PRICING_CONFIG }
    }
  },
  {
    id: 'bench-w3',
    tag: 'W3',
    type: 'Sliding',
    location: 'Balcony Opening',
    width: 1800,
    height: 2100,
    seriesName: '88mm 3-Track Sliding with Mesh',
    quantity: 1,
    unitPrice: 24500,
    totalPrice: 24500,
    glassType: 'clear_6mm',
    profileColor: 'white',
    projectData: {
      id: 'proj_bench_w3',
      name: 'W3 Benchmark 3-Track Slider with Mesh 1800x2100',
      clientName: 'Standard Benchmark',
      referenceNo: 'W3',
      date: new Date().toISOString(),
      frames: [
        {
          id: 'f-bench-3',
          name: 'F3',
          x: 0,
          y: 0,
          width: 1800,
          height: 2100,
          frameProfileWidth: 88,
          mullionProfileWidth: 16,
          sashProfileWidth: 60,
          color: 'white',
          series: 'sliding_88',
          mullions: [
            { id: 'mul-w3-1', orientation: 'vertical', position: 600 },
            { id: 'mul-w3-2', orientation: 'vertical', position: 1200 }
          ],
          pockets: [
            {
              id: 'p-bench-3a',
              frameId: 'f-bench-3',
              x: 88,
              y: 88,
              width: 504,
              height: 1924,
              sashType: 'slider_arrow_right',
              glassType: 'clear_6mm',
              gridPattern: 'none'
            },
            {
              id: 'p-bench-3b',
              frameId: 'f-bench-3',
              x: 608,
              y: 88,
              width: 584,
              height: 1924,
              sashType: 'mesh_slider_right',
              glassType: 'clear_6mm',
              gridPattern: 'none'
            },
            {
              id: 'p-bench-3c',
              frameId: 'f-bench-3',
              x: 1208,
              y: 88,
              width: 504,
              height: 1924,
              sashType: 'slider_arrow_left',
              glassType: 'clear_6mm',
              gridPattern: 'none'
            }
          ],
          reinforcement: 'steel_1.5mm',
          drainageCaps: true
        }
      ],
      couplings: [],
      pricingConfig: { ...DEFAULT_PRICING_CONFIG }
    }
  }
];

export const PricingFormulaView: React.FC<PricingFormulaViewProps> = ({
  customers = [],
  selectedCustomer: initialCustomer = null,
  designs: initialDesigns,
  onBack,
  onOpenDesigner,
  onUpdateDesigns,
  lang = 'hi'
}) => {
  // Navigation Tabs: 'formula-heads' | 'step-by-step' | 'item-rates' | 'window-bom' | 'guide'
  const [activeTab, setActiveTab] = useState<'formula-heads' | 'step-by-step' | 'item-rates' | 'window-bom' | 'guide'>('formula-heads');

  // Customer Selection State (allows switching between Benchmark and any ERP Customer)
  const [activeCustomerMode, setActiveCustomerMode] = useState<string>(() => {
    if (initialCustomer) return initialCustomer.id;
    return 'BENCHMARK';
  });

  const activeCustomer = useMemo(() => {
    if (activeCustomerMode === 'BENCHMARK') return null;
    return customers.find(c => c.id === activeCustomerMode) || null;
  }, [activeCustomerMode, customers]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load Active Pricing Template (21 Cost Heads)
  const [localTemplate, setLocalTemplate] = useState<CostHead[]>(() => {
    try {
      const storageKey = activeCustomer ? `upvc_pricing_template_${activeCustomer.id}` : 'upvc_pricing_template_global';
      const saved = localStorage.getItem(storageKey) || localStorage.getItem('upvc_pricing_template_global');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_COST_HEADS;
  });

  // Load Inventory Items (Item Rates)
  const [localInventory, setLocalInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('upvc_inventory_items_master');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_INVENTORY_ITEMS;
  });

  // Designs to calculate against
  const activeDesigns: CustomerDesignCardItem[] = useMemo(() => {
    if (activeCustomer) {
      // Check localStorage for saved designs for this customer
      try {
        const saved = localStorage.getItem(`upvc_cust_designs_${activeCustomer.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
      if (initialCustomer?.id === activeCustomer.id && initialDesigns && initialDesigns.length > 0) {
        return initialDesigns;
      }
      return getInitialDesignsForCustomer(activeCustomer);
    }
    return BENCHMARK_WINDOW_DESIGNS;
  }, [activeCustomer, initialCustomer, initialDesigns]);

  // Selected single design to inspect (or ALL)
  const [selectedDesignId, setSelectedDesignId] = useState<string>('ALL');

  // Item Rates Filters & Search
  const [itemSearch, setItemSearch] = useState<string>('');
  const [itemCategory, setItemCategory] = useState<string>('ALL');

  // BOM View Mode: 'grouped' vs 'detailed'
  const [bomViewMode, setBomViewMode] = useState<'grouped' | 'detailed'>('grouped');
  const [bomCategoryFilter, setBomCategoryFilter] = useState<'ALL' | 'Profile' | 'Reinforcement' | 'Glass' | 'Hardware'>('ALL');

  // Total Units in active project
  const totalProjectUnits = useMemo(() => {
    return activeDesigns.reduce((sum, d) => sum + (d.quantity || 1), 0);
  }, [activeDesigns]);

  // Compute live quote and BOM for each design
  const calculatedDesigns = useMemo(() => {
    return activeDesigns.map(d => {
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
  }, [activeDesigns, localTemplate, localInventory, totalProjectUnits]);

  // Inspected single design
  const inspectedDesign = useMemo(() => {
    if (selectedDesignId === 'ALL') return null;
    return calculatedDesigns.find(d => d.id === selectedDesignId) || null;
  }, [calculatedDesigns, selectedDesignId]);

  // Active design items based on selection
  const activeDesignItems = useMemo(() => {
    if (selectedDesignId === 'ALL') return calculatedDesigns;
    return calculatedDesigns.filter(d => d.id === selectedDesignId);
  }, [calculatedDesigns, selectedDesignId]);

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

    const avgRatePerSqft = activeArea > 0 ? Math.round((grandTotalVal / activeArea) * 100) / 100 : 0;

    return {
      activeArea: Math.round(activeArea * 100) / 100,
      activeUnits,
      transportVal,
      loadingVal,
      logisticsTotal,
      logisticsPerUnit,
      totalProfileWt: Math.round(totalProfileWt * 100) / 100,
      totalProfileCost: Math.round(totalProfileCost),
      profileWastagePct,
      profileWastageVal,
      profileGrand,
      totalSteelMtrs: Math.round(totalSteelMtrs * 100) / 100,
      totalSteelWt: Math.round(totalSteelWt * 100) / 100,
      totalSteelCost: Math.round(totalSteelCost),
      steelWastagePct,
      steelWastageVal,
      steelGrand,
      totalGlassArea: Math.round(totalGlassArea * 100) / 100,
      totalGlassCost: Math.round(totalGlassCost),
      glassWastagePct,
      glassWastageVal,
      glassGrand,
      totalHardwareCost: Math.round(totalHardwareCost),
      totalAccessoryCost: Math.round(totalAccessoryCost),
      rawMaterialGrand: Math.round(rawMaterialGrand),
      fabLabourRate,
      instLabourRate,
      fabLabourVal,
      instLabourVal,
      labourTotalVal,
      subtotalWithLabour: Math.round(subtotalWithLabour),
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
      grandTotalVal: Math.round(grandTotalVal),
      avgRatePerSqft
    };
  }, [activeDesignItems, localTemplate, totalProjectUnits, selectedDesignId]);

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
            existing.usedInWindows = Array.from(new Set([...(existing.usedInWindows || []), ...item.usedInWindows]));
          }
        } else {
          map.set(key, { ...item });
        }
      });
      return Array.from(map.values());
    };

    const profiles = groupItems(rawProfiles);
    const steel = groupItems(rawSteel);
    const glass = groupItems(rawGlass);
    const hardware = groupItems(rawHardware);

    const profileTotalWeight = Math.round(profiles.reduce((sum, p) => sum + (p.totalWeightKg || 0), 0) * 100) / 100;
    const profileTotalCost = Math.round(profiles.reduce((sum, p) => sum + p.totalPrice, 0));
    const steelTotalWeight = Math.round(steel.reduce((sum, s) => sum + (s.totalWeightKg || 0), 0) * 100) / 100;
    const steelTotalCost = Math.round(steel.reduce((sum, s) => sum + s.totalPrice, 0));
    const glassTotalArea = Math.round(glass.reduce((sum, g) => sum + (g.areaSqft || 0), 0) * 100) / 100;
    const glassTotalCost = Math.round(glass.reduce((sum, g) => sum + g.totalPrice, 0));
    const hardwareTotalCost = Math.round(hardware.reduce((sum, h) => sum + h.totalPrice, 0));

    return {
      profiles,
      steel,
      glass,
      hardware,
      profileTotalWeight,
      profileTotalCost,
      steelTotalWeight,
      steelTotalCost,
      glassTotalArea,
      glassTotalCost,
      hardwareTotalCost,
      grandRawMaterialTotal: profileTotalCost + steelTotalCost + glassTotalCost + hardwareTotalCost,
      totalComponentCount: profiles.length + steel.length + glass.length + hardware.length
    };
  }, [activeDesignItems, bomViewMode]);

  // Rate Change Handler for 21 Cost Heads
  const handleRateChange = (id: number, val: number) => {
    const safeVal = isNaN(val) ? 0 : val;
    const updated = localTemplate.map(head => {
      if (head.id === id) {
        return { ...head, rate: safeVal };
      }
      return head;
    });
    setLocalTemplate(updated);
  };

  // Visibility Change Handler for Cost Heads
  const handleVisibilityChange = (id: number, vis: any) => {
    const updated = localTemplate.map(head => {
      if (head.id === id) {
        return { ...head, visibility: vis };
      }
      return head;
    });
    setLocalTemplate(updated);
  };

  // Item Price Change Handler
  const handleInventoryPriceChange = (id: string, price: number) => {
    const safePrice = isNaN(price) ? 0 : price;
    const updated = localInventory.map(item => {
      if (item.id === id) {
        return { ...item, price: safePrice };
      }
      return item;
    });
    setLocalInventory(updated);
  };

  // Quick Preset Handlers
  const applyPreset = (presetName: 'retail' | 'commercial' | 'wholesale' | 'budget') => {
    let updated = [...localTemplate];
    if (presetName === 'retail') {
      updated = updated.map(h => {
        if (h.id === 2) return { ...h, rate: 10 }; // Profile wastage
        if (h.id === 4) return { ...h, rate: 5 };  // Steel wastage
        if (h.id === 7) return { ...h, rate: 5 };  // Glass wastage
        if (h.id === 9) return { ...h, rate: 70 }; // Fab labour
        if (h.id === 10) return { ...h, rate: 50 }; // Install labour
        if (h.id === 12) return { ...h, rate: 60 }; // Profit
        if (h.id === 15) return { ...h, rate: 0 };  // Discount
        if (h.id === 20) return { ...h, rate: 18 }; // GST
        return h;
      });
      showToast('Applied: Retail Premium Preset (60% Profit, ₹70 Fab, ₹50 Install)');
    } else if (presetName === 'commercial') {
      updated = updated.map(h => {
        if (h.id === 2) return { ...h, rate: 8 };
        if (h.id === 4) return { ...h, rate: 4 };
        if (h.id === 7) return { ...h, rate: 4 };
        if (h.id === 9) return { ...h, rate: 55 };
        if (h.id === 10) return { ...h, rate: 40 };
        if (h.id === 12) return { ...h, rate: 35 };
        if (h.id === 15) return { ...h, rate: 0 };
        if (h.id === 20) return { ...h, rate: 18 };
        return h;
      });
      showToast('Applied: Commercial Project Preset (35% Profit, ₹55 Fab, ₹40 Install)');
    } else if (presetName === 'wholesale') {
      updated = updated.map(h => {
        if (h.id === 2) return { ...h, rate: 6 };
        if (h.id === 4) return { ...h, rate: 3 };
        if (h.id === 7) return { ...h, rate: 3 };
        if (h.id === 9) return { ...h, rate: 45 };
        if (h.id === 10) return { ...h, rate: 35 };
        if (h.id === 12) return { ...h, rate: 25 };
        if (h.id === 15) return { ...h, rate: 5 };
        if (h.id === 20) return { ...h, rate: 18 };
        return h;
      });
      showToast('Applied: Contractor Wholesale Preset (25% Profit, ₹45 Fab, 5% Disc)');
    } else if (presetName === 'budget') {
      updated = updated.map(h => {
        if (h.id === 2) return { ...h, rate: 5 };
        if (h.id === 4) return { ...h, rate: 2 };
        if (h.id === 7) return { ...h, rate: 2 };
        if (h.id === 9) return { ...h, rate: 40 };
        if (h.id === 10) return { ...h, rate: 30 };
        if (h.id === 12) return { ...h, rate: 20 };
        if (h.id === 15) return { ...h, rate: 0 };
        if (h.id === 20) return { ...h, rate: 18 };
        return h;
      });
      showToast('Applied: Budget High-Volume Preset (20% Profit, ₹40 Fab, ₹30 Install)');
    }
    setLocalTemplate(updated);
  };

  // Master Save Action
  const handleSave = () => {
    try {
      // Save globally
      localStorage.setItem('upvc_pricing_template_global', JSON.stringify(localTemplate));
      localStorage.setItem('upvc_pricing_template_active', JSON.stringify(localTemplate));
      localStorage.setItem('upvc_inventory_items_master', JSON.stringify(localInventory));

      // If tied to a specific customer, save customer-specific override
      if (activeCustomer) {
        localStorage.setItem(`upvc_pricing_template_${activeCustomer.id}`, JSON.stringify(localTemplate));
        localStorage.setItem(`upvc_inventory_items_${activeCustomer.id}`, JSON.stringify(localInventory));

        // Update recalculated prices on customer designs
        const updatedCustomerDesigns: CustomerDesignCardItem[] = activeDesigns.map(d => {
          const quote = calculateQuotation(d, localTemplate, localInventory, totalProjectUnits);
          const unitTotal = quote.find(q => q.id === 21)?.value || d.unitPrice;
          return {
            ...d,
            unitPrice: Math.round(unitTotal),
            totalPrice: Math.round(unitTotal * (d.quantity || 1))
          };
        });
        localStorage.setItem(`upvc_cust_designs_${activeCustomer.id}`, JSON.stringify(updatedCustomerDesigns));
        if (onUpdateDesigns) {
          onUpdateDesigns(updatedCustomerDesigns);
        }
      }

      window.dispatchEvent(new CustomEvent('upvc_pricing_template_changed'));
      window.dispatchEvent(new CustomEvent('upvc_customer_designs_changed'));
      showToast('Formula & Rates saved successfully! (मूल्य निर्धारण नियम सुरक्षित हो गए)');
    } catch (e) {
      showToast('Error saving pricing data.');
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'Sl No,Cost Head,Calculation Type,Rate / %,Visibility,Computed Amount (INR),Notes\n';
      localTemplate.forEach(h => {
        let computed = 0;
        if (h.id === 1) computed = consolidatedSteps.totalProfileCost;
        else if (h.id === 2) computed = consolidatedSteps.profileWastageVal;
        else if (h.id === 3) computed = consolidatedSteps.totalSteelCost;
        else if (h.id === 4) computed = consolidatedSteps.steelWastageVal;
        else if (h.id === 5) computed = consolidatedSteps.totalHardwareCost;
        else if (h.id === 6) computed = consolidatedSteps.totalGlassCost;
        else if (h.id === 7) computed = consolidatedSteps.glassWastageVal;
        else if (h.id === 8) computed = consolidatedSteps.rawMaterialGrand;
        else if (h.id === 9) computed = consolidatedSteps.fabLabourVal;
        else if (h.id === 10) computed = consolidatedSteps.instLabourVal;
        else if (h.id === 11) computed = consolidatedSteps.subtotalWithLabour;
        else if (h.id === 12) computed = consolidatedSteps.profitVal;
        else if (h.id === 13) computed = consolidatedSteps.extraOverhead;
        else if (h.id === 14) computed = consolidatedSteps.basicVal;
        else if (h.id === 15) computed = consolidatedSteps.discountVal;
        else if (h.id === 16) computed = consolidatedSteps.subTotalVal;
        else if (h.id === 17) computed = consolidatedSteps.transportVal;
        else if (h.id === 18) computed = consolidatedSteps.loadingVal;
        else if (h.id === 19) computed = consolidatedSteps.projectCostVal;
        else if (h.id === 20) computed = consolidatedSteps.gstVal;
        else if (h.id === 21) computed = consolidatedSteps.grandTotalVal;

        const safeNotes = (h.notes || '').replace(/,/g, ' ');
        csvContent += `${h.id},"${h.name}","${h.calcType}",${h.rate},"${h.visibility}",${computed},"${safeNotes}"\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Pricing_Formula_Breakdown_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Exported Pricing Formula CSV!');
    } catch (e) {
      showToast('Export failed.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOP HEADER & NAVIGATION BAR */}
      {/* ========================================================= */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 shadow-xs">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back Button + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back (वापस)</span>
            </button>

            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Pricing Formula & Rate Engine (मूल्य निर्धारण नियम)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                  MASTER 21-HEAD
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                UPVC & Aluminium Window/Door Costing • Profile, Steel, Glass, Hardware, Labour & Profit
              </p>
            </div>
          </div>

          {/* Center: Customer / Benchmark Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider hidden md:inline">
              Test Against:
            </span>
            <select
              value={activeCustomerMode}
              onChange={e => {
                setActiveCustomerMode(e.target.value);
                setSelectedDesignId('ALL');
              }}
              className="bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer max-w-xs"
            >
              <option value="BENCHMARK">⭐ Factory Benchmark Windows (Casement, 2-Track & 3-Track)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  👤 {c.name} {c.city ? `(${c.city})` : ''} - Real Customer Project
                </option>
              ))}
            </select>
          </div>

          {/* Right: Actions (Reset, Export, Save) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLocalTemplate(DEFAULT_COST_HEADS);
                setLocalInventory(DEFAULT_INVENTORY_ITEMS);
                showToast('Reset all rates to factory defaults!');
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Reset to standard defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs shadow-blue-200 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes (सुरक्षित करें)</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SUBNAV TABS & LIVE KPI STRIP */}
      {/* ========================================================= */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 shrink-0">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* 5 Primary Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('formula-heads')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'formula-heads'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>1. 21 Master Cost Heads & Rates (मास्टर 21 दरें)</span>
            </button>

            <button
              onClick={() => setActiveTab('step-by-step')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'step-by-step'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>2. 7-Step Manufacturing Math (लाइव गणित)</span>
            </button>

            <button
              onClick={() => setActiveTab('item-rates')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'item-rates'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-purple-500" />
              <span>3. Item Rates Master (प्रोफ़ाइल, काँच, स्टील)</span>
            </button>

            <button
              onClick={() => setActiveTab('window-bom')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'window-bom'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-500" />
              <span>4. Window BOM & Cut Sizes (कटिंग लिस्ट)</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
              <span>5. Formula Guide (हिसाब कैसे होता है?)</span>
            </button>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Active Area:</span>
              <span className="font-bold text-slate-800">{consolidatedSteps.activeArea} Sq.Ft</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Eff. Rate:</span>
              <span className="font-black text-blue-600">₹{consolidatedSteps.avgRatePerSqft} /sqft</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-700 font-sans">Grand Total:</span>
              <span className="font-black text-emerald-700">₹{consolidatedSteps.grandTotalVal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-[1720px] w-full mx-auto space-y-4">
        {/* ========================================================= */}
        {/* TAB 1: 21 MASTER COST HEADS & RATE SPREADSHEET */}
        {/* ========================================================= */}
        {activeTab === 'formula-heads' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Presets & Info Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Master 21 Cost Heads Configuration (21 फॉर्मूला दरें व गणना नियम)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Adjust wastage factors, profit percentages, labour charges per sqft, and logistics. All prices update live.
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2">Quick Presets:</span>
                <button
                  onClick={() => applyPreset('retail')}
                  className="px-2.5 py-1 rounded-lg bg-white text-slate-800 font-bold hover:bg-blue-50 hover:text-blue-700 transition shadow-2xs cursor-pointer text-[11px]"
                >
                  Retail (60% Profit)
                </button>
                <button
                  onClick={() => applyPreset('commercial')}
                  className="px-2.5 py-1 rounded-lg bg-white text-slate-800 font-bold hover:bg-blue-50 hover:text-blue-700 transition shadow-2xs cursor-pointer text-[11px]"
                >
                  Commercial (35% Profit)
                </button>
                <button
                  onClick={() => applyPreset('wholesale')}
                  className="px-2.5 py-1 rounded-lg bg-white text-slate-800 font-bold hover:bg-blue-50 hover:text-blue-700 transition shadow-2xs cursor-pointer text-[11px]"
                >
                  Wholesale (25% Profit)
                </button>
                <button
                  onClick={() => applyPreset('budget')}
                  className="px-2.5 py-1 rounded-lg bg-white text-slate-800 font-bold hover:bg-blue-50 hover:text-blue-700 transition shadow-2xs cursor-pointer text-[11px]"
                >
                  Budget (20% Profit)
                </button>
              </div>
            </div>

            {/* 21 Cost Heads Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    21 Cost Heads Spreadsheet (दर तालिका)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Rate column is directly editable • Values recalculate immediately
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                      <th className="px-3 py-2.5 text-center w-12">#</th>
                      <th className="px-3 py-2.5">Cost Head Name</th>
                      <th className="px-3 py-2.5">Calculation Type</th>
                      <th className="px-3 py-2.5 text-center w-36">Rate / Multiplier</th>
                      <th className="px-3 py-2.5">Visibility in Quotation</th>
                      <th className="px-3 py-2.5 text-right font-mono">Live Computed Value (₹)</th>
                      <th className="px-3 py-2.5">Formula Description / Logic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {localTemplate.map((head) => {
                      // Get live computed value for this head
                      let computedVal = 0;
                      if (head.id === 1) computedVal = consolidatedSteps.totalProfileCost;
                      else if (head.id === 2) computedVal = consolidatedSteps.profileWastageVal;
                      else if (head.id === 3) computedVal = consolidatedSteps.totalSteelCost;
                      else if (head.id === 4) computedVal = consolidatedSteps.steelWastageVal;
                      else if (head.id === 5) computedVal = consolidatedSteps.totalHardwareCost;
                      else if (head.id === 6) computedVal = consolidatedSteps.totalGlassCost;
                      else if (head.id === 7) computedVal = consolidatedSteps.glassWastageVal;
                      else if (head.id === 8) computedVal = consolidatedSteps.rawMaterialGrand;
                      else if (head.id === 9) computedVal = consolidatedSteps.fabLabourVal;
                      else if (head.id === 10) computedVal = consolidatedSteps.instLabourVal;
                      else if (head.id === 11) computedVal = consolidatedSteps.subtotalWithLabour;
                      else if (head.id === 12) computedVal = consolidatedSteps.profitVal;
                      else if (head.id === 13) computedVal = consolidatedSteps.extraOverhead;
                      else if (head.id === 14) computedVal = consolidatedSteps.basicVal;
                      else if (head.id === 15) computedVal = consolidatedSteps.discountVal;
                      else if (head.id === 16) computedVal = consolidatedSteps.subTotalVal;
                      else if (head.id === 17) computedVal = consolidatedSteps.transportVal;
                      else if (head.id === 18) computedVal = consolidatedSteps.loadingVal;
                      else if (head.id === 19) computedVal = consolidatedSteps.projectCostVal;
                      else if (head.id === 20) computedVal = consolidatedSteps.gstVal;
                      else if (head.id === 21) computedVal = consolidatedSteps.grandTotalVal;

                      const isImportant = [8, 11, 14, 16, 19, 21].includes(head.id);

                      return (
                        <tr
                          key={head.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isImportant ? 'bg-slate-50/50 font-semibold' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-400">
                            {head.id}
                          </td>

                          <td className="px-3 py-2.5">
                            <span className={`font-bold ${isImportant ? 'text-slate-900 font-black' : 'text-slate-800'}`}>
                              {head.name}
                            </span>
                          </td>

                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              {head.calcType}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            {head.calcType === 'Percentage' ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  value={head.rate}
                                  onChange={e => handleRateChange(head.id, parseFloat(e.target.value))}
                                  className="w-16 h-7 text-center bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <span className="font-bold text-slate-500">%</span>
                              </div>
                            ) : head.calcType === 'AreaSqftFg' ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-slate-400">₹</span>
                                <input
                                  type="number"
                                  value={head.rate}
                                  onChange={e => handleRateChange(head.id, parseFloat(e.target.value))}
                                  className="w-16 h-7 text-center bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <span className="text-[10px] text-slate-400">/sqft</span>
                              </div>
                            ) : head.calcType === 'LumpSumDivideByQty' ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-slate-400">₹</span>
                                <input
                                  type="number"
                                  value={head.rate}
                                  onChange={e => handleRateChange(head.id, parseFloat(e.target.value))}
                                  className="w-20 h-7 text-center bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Auto Formula</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5">
                            <select
                              value={head.visibility}
                              onChange={e => handleVisibilityChange(head.id, e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="Show in Quote Window">Show in Quote Window</option>
                              <option value="Show in Quote Summary">Show in Quote Summary</option>
                              <option value="Do not show in Quote">Do not show in Quote</option>
                            </select>
                          </td>

                          <td className="px-3 py-2.5 text-right font-mono font-black">
                            <span className={head.id === 21 ? 'text-emerald-600 text-sm' : isImportant ? 'text-slate-900' : 'text-slate-700'}>
                              ₹{computedVal.toLocaleString('en-IN')}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 text-[11px] text-slate-500">
                            {head.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 7-STEP MANUFACTURING MATH BREAKDOWN */}
        {/* ========================================================= */}
        {activeTab === 'step-by-step' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 7 Step Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Step 1: Logistics */}
              <div className="bg-amber-50/40 border-2 border-amber-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      Logistics & Handling
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Head 17 & 18
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-600 text-[11px]">
                    Lumpsum transport & site handling divided by total customer window units ({totalProjectUnits} Windows):
                  </p>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs font-bold text-slate-800 space-y-1">
                    <div className="flex justify-between">
                      <span>Transport (Total ÷ {totalProjectUnits}):</span>
                      <span className="font-mono">₹{consolidatedSteps.transportVal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loading/Unloading (Total ÷ {totalProjectUnits}):</span>
                      <span className="font-mono">₹{consolidatedSteps.loadingVal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-800 font-medium italic">
                    कुल खिड़कियों ({totalProjectUnits} Windows) में भाग होकर ₹{consolidatedSteps.logisticsPerUnit.toLocaleString('en-IN')} हर विंडो में जोड़ा जाता है।
                  </p>
                </div>

                <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900">Per Window Logistics:</span>
                  <span className="text-xs font-mono font-black text-amber-950">
                    ₹{consolidatedSteps.logisticsPerUnit.toLocaleString('en-IN')} / Window
                  </span>
                </div>
              </div>

              {/* Step 2: UPVC Profile */}
              <div className="bg-blue-50/40 border-2 border-blue-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      UPVC Profile & Wastage
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                    Head 1 & 2
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-600 text-[11px]">
                    Total Profile Weight: <span className="font-bold text-slate-900">{consolidatedSteps.totalProfileWt} Kg</span>
                  </p>
                  <div className="p-2.5 bg-white rounded-xl border border-blue-200 text-xs font-bold text-slate-800">
                    ₹{consolidatedSteps.totalProfileCost.toLocaleString('en-IN')} Profile + {consolidatedSteps.profileWastagePct}% Wastage (₹{consolidatedSteps.profileWastageVal.toLocaleString('en-IN')})
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900">Total Profile Value:</span>
                  <span className="text-xs font-mono font-black text-blue-950">
                    ₹{consolidatedSteps.profileGrand.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Step 3: Steel Reinforcement */}
              <div className="bg-indigo-50/40 border-2 border-indigo-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between border-b border-indigo-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      GI Steel Reinforcement
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    Head 3 & 4
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-600 text-[11px]">
                    Steel Meters: <span className="font-bold text-slate-900">{consolidatedSteps.totalSteelMtrs} Mtr ({consolidatedSteps.totalSteelWt} Kg)</span>
                  </p>
                  <div className="p-2.5 bg-white rounded-xl border border-indigo-200 text-xs font-bold text-slate-800">
                    ₹{consolidatedSteps.totalSteelCost.toLocaleString('en-IN')} Steel + {consolidatedSteps.steelWastagePct}% Wastage (₹{consolidatedSteps.steelWastageVal.toLocaleString('en-IN')})
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-900">Total Steel Value:</span>
                  <span className="text-xs font-mono font-black text-indigo-950">
                    ₹{consolidatedSteps.steelGrand.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Step 4: Glass */}
              <div className="bg-cyan-50/40 border-2 border-cyan-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between border-b border-cyan-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center">
                      4
                    </span>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      Glass Panes & Glazing
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                    Head 6 & 7
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-600 text-[11px]">
                    Glass Area: <span className="font-bold text-slate-900">{consolidatedSteps.totalGlassArea} Sq.Ft</span>
                  </p>
                  <div className="p-2.5 bg-white rounded-xl border border-cyan-200 text-xs font-bold text-slate-800">
                    ₹{consolidatedSteps.totalGlassCost.toLocaleString('en-IN')} Glass + {consolidatedSteps.glassWastagePct}% Wastage (₹{consolidatedSteps.glassWastageVal.toLocaleString('en-IN')})
                  </div>
                </div>

                <div className="pt-2 border-t border-cyan-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-900">Total Glass Value:</span>
                  <span className="text-xs font-mono font-black text-cyan-950">
                    ₹{consolidatedSteps.glassGrand.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Step 5: Hardware & Total Raw Materials */}
              <div className="bg-slate-100/60 border-2 border-slate-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-700 text-white font-black text-xs flex items-center justify-center">
                      5
                    </span>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      Hardware & Raw Material Total
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                    Head 5 & 8
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-600 text-[11px]">
                    Hardware & Accessories Total: <span className="font-bold text-slate-900">₹{(consolidatedSteps.totalHardwareCost + consolidatedSteps.totalAccessoryCost).toLocaleString('en-IN')}</span>
                  </p>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
                    Profile (₹{consolidatedSteps.profileGrand.toLocaleString('en-IN')}) + Steel (₹{consolidatedSteps.steelGrand.toLocaleString('en-IN')}) + Glass (₹{consolidatedSteps.glassGrand.toLocaleString('en-IN')})
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-900">Raw Material Total (Head 8):</span>
                  <span className="text-xs font-mono font-black text-slate-950">
                    ₹{consolidatedSteps.rawMaterialGrand.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Step 6: Labour Charges */}
              <div className="bg-emerald-50/40 border-2 border-emerald-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                      6
                    </span>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      Fabrication & Install Labour
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Head 9, 10, 11
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-600 text-[11px]">
                    Glazing Area: <span className="font-bold text-slate-900">{consolidatedSteps.activeArea} Sq.Ft</span> (₹{consolidatedSteps.fabLabourRate} fab + ₹{consolidatedSteps.instLabourRate} fit)
                  </p>
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs font-bold text-slate-800">
                    Fab (₹{consolidatedSteps.fabLabourVal.toLocaleString('en-IN')}) + Install (₹{consolidatedSteps.instLabourVal.toLocaleString('en-IN')}) = ₹{consolidatedSteps.labourTotalVal.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900">Subtotal With Labour (Head 11):</span>
                  <span className="text-xs font-mono font-black text-emerald-950">
                    ₹{consolidatedSteps.subtotalWithLabour.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Step 7: Profit & 18% GST */}
              <div className="bg-purple-50/40 border-2 border-purple-400 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3 md:col-span-2 xl:col-span-3">
                <div className="flex items-center justify-between border-b border-purple-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                      7
                    </span>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      Profit Margin & 18% GST (Final Grand Total)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                    Head 12, 19, 20, 21
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-purple-200">
                    <span className="text-[10px] font-bold text-purple-700 block">Profit ({consolidatedSteps.profitMarginPct}%)</span>
                    <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                      ₹{consolidatedSteps.profitVal.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-purple-200">
                    <span className="text-[10px] font-bold text-purple-700 block">Project Cost (Excl. GST)</span>
                    <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                      ₹{consolidatedSteps.projectCostVal.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-purple-200">
                    <span className="text-[10px] font-bold text-purple-700 block">GST Tax ({consolidatedSteps.gstPct}%)</span>
                    <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                      ₹{consolidatedSteps.gstVal.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl border border-purple-300">
                    <span className="text-[10px] font-black text-purple-900 block uppercase">
                      Final Grand Total (With 18% GST)
                    </span>
                    <p className="text-lg font-black text-purple-950 font-mono mt-0.5">
                      ₹{consolidatedSteps.grandTotalVal.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ITEM RATES MASTER (PROFILES, GLASS, STEEL, HARDWARE) */}
        {/* ========================================================= */}
        {activeTab === 'item-rates' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Item Rates Master Catalogue (दर सूची - सेश, फ्रेम, काँच, स्टील व हार्डवेयर)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Edit unit procurement & fabrication rates. Automatically linked to live cutting lists and BOM.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setLocalInventory(DEFAULT_INVENTORY_ITEMS);
                  showToast('Reset item rates to standard values.');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Standard Items</span>
              </button>
            </div>

            {/* Search and Category Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search item code or name..."
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {['ALL', 'Profile', 'Glass', 'Reinforcement', 'Hardware'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setItemCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      itemCategory === cat
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Items' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <th className="px-3 py-2.5">Item Code</th>
                    <th className="px-3 py-2.5">Item Name & Specification</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5 text-center">Unit</th>
                    <th className="px-3 py-2.5 text-right">Unit Rate (₹)</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {localInventory
                    .filter(item => {
                      const matchesCat = itemCategory === 'ALL' || item.category === itemCategory;
                      const matchesSearch =
                        itemSearch === '' ||
                        item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                        item.code.toLowerCase().includes(itemSearch.toLowerCase());
                      return matchesCat && matchesSearch;
                    })
                    .map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-mono font-black text-blue-600">{item.code}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          {item.name}
                          {item.weightPerMeter && (
                            <span className="text-[10px] text-slate-400 font-normal block font-mono">
                              Linear Weight: {item.weightPerMeter} kg/meter
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
                            <span className="font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              value={item.price}
                              onChange={e => handleInventoryPriceChange(item.id, parseFloat(e.target.value))}
                              className="w-20 h-7 text-right bg-slate-50 border border-slate-300 rounded px-2 text-xs font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

        {/* ========================================================= */}
        {/* TAB 4: WINDOW BOM & CUT SIZES TESTER */}
        {/* ========================================================= */}
        {activeTab === 'window-bom' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Window Selection Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 uppercase">Select Window:</span>
                <select
                  value={selectedDesignId}
                  onChange={e => setSelectedDesignId(e.target.value)}
                  className="bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="ALL">⭐ Complete Project Overview ({totalProjectUnits} Windows)</option>
                  {calculatedDesigns.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.tag} - {d.seriesName || d.type} ({d.width} × {d.height} mm - {d.areaSqft} Sq.Ft)
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs">
                <button
                  onClick={() => setBomViewMode('grouped')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    bomViewMode === 'grouped' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Grouped Totals
                </button>
                <button
                  onClick={() => setBomViewMode('detailed')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    bomViewMode === 'detailed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Detailed Cut Sizes
                </button>
              </div>
            </div>

            {/* Profiles Section */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                    UPVC Profiles (Outer Frame, Sashes, Mullions, Beading)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-blue-900">
                  Total Weight: {categorizedBOM.profileTotalWeight} kg • ₹{categorizedBOM.profileTotalCost.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                      <th className="px-3 py-2.5">Profile Code</th>
                      <th className="px-3 py-2.5">Description & Specification</th>
                      <th className="px-3 py-2.5 text-right">Cut Length</th>
                      <th className="px-3 py-2.5 text-center">Pcs</th>
                      <th className="px-3 py-2.5 text-right">Total Weight</th>
                      <th className="px-3 py-2.5 text-right">Rate</th>
                      <th className="px-3 py-2.5 text-right font-mono">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categorizedBOM.profiles.map((bom, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-mono font-black text-blue-600">{bom.code}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          {bom.name}
                          {bom.spec && <span className="text-[10px] text-slate-400 font-mono block">{bom.spec}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700">
                          {bom.lengthMm ? `${bom.lengthMm} mm` : bom.totalLengthMtr ? `${bom.totalLengthMtr} M` : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-900">{bom.totalQty} {bom.unit}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700">{bom.totalWeightKg ? `${bom.totalWeightKg} kg` : '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">₹{bom.unitRate}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">₹{bom.totalPrice.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Steel Reinforcement Section */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                    GI Steel Reinforcement (Outer Channels & Sash Boxes)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-900">
                  Total Weight: {categorizedBOM.steelTotalWeight} kg • ₹{categorizedBOM.steelTotalCost.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                      <th className="px-3 py-2.5">Steel Code</th>
                      <th className="px-3 py-2.5">Specification / Deduction</th>
                      <th className="px-3 py-2.5 text-right">Length (Mtr)</th>
                      <th className="px-3 py-2.5 text-center">Pcs</th>
                      <th className="px-3 py-2.5 text-right">Weight</th>
                      <th className="px-3 py-2.5 text-right">Rate</th>
                      <th className="px-3 py-2.5 text-right font-mono">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categorizedBOM.steel.map((bom, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-mono font-black text-indigo-600">{bom.code}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          {bom.name}
                          {bom.spec && <span className="text-[10px] text-slate-400 font-mono block">{bom.spec}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700">{bom.totalLengthMtr ? `${bom.totalLengthMtr} M` : '-'}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-900">{bom.totalQty} {bom.unit}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700">{bom.totalWeightKg ? `${bom.totalWeightKg} kg` : '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">₹{bom.unitRate}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">₹{bom.totalPrice.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: FORMULA GUIDE & HINDI EXPLANATION */}
        {/* ========================================================= */}
        {activeTab === 'guide' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  हिसाब कैसे होता है? (UPVC Window Pricing Calculation Guide)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Complete mathematical explanation of how a window is priced from raw materials to final invoice
                </p>
              </div>
            </div>

            {/* 1000 x 1000 Casement Example Walkthrough */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <span>उदाहरण: 1000 × 1000 mm केसमेंट विंडो (क्षेत्रफल: 10.76 वर्ग फुट)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-blue-700">
                    <span>1. प्रोफ़ाइल व कटिंग वेस्टेज (Profile & Wastage):</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    • 1000 × 1000 mm में 4 मीटर आउटर फ्रेम (1.22 kg/m) = <strong>4.88 kg</strong>.<br />
                    • ₹140/kg की दर से: 4.88 × 140 = <strong>₹683.20</strong>.<br />
                    • 10% कटिंग वेस्टेज (45° miter cuts): ₹68.32.<br />
                    • <strong>कुल प्रोफ़ाइल मूल्य = ₹751.52</strong>.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-indigo-700">
                    <span>2. गैल्वनाइज्ड स्टील (GI Reinforcement):</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    • वेल्डिंग कोनों से 50-50mm कटने के बाद 3.6 मीटर स्टील लगता है.<br />
                    • 3.6m × ₹81/m = <strong>₹291.60</strong>.<br />
                    • 5% स्टील वेस्टेज = ₹14.58.<br />
                    • <strong>कुल स्टील मूल्य = ₹306.18</strong>.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-cyan-700">
                    <span>3. काँच व ग्लाज़िंग (Glass Panes):</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    • 6mm टफन काँच का वास्तविक क्षेत्रफल लगभग <strong>9.3 वर्ग फुट</strong>.<br />
                    • ₹84/sqft की दर से: 9.3 × 84 = <strong>₹781.20</strong>.<br />
                    • 5% ग्लाज़िंग बफ़र व वेस्टेज = ₹39.06.<br />
                    • <strong>कुल काँच मूल्य = ₹820.26</strong>.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-emerald-700">
                    <span>4. लेबर व इंस्टॉलेशन (Labour Charges):</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    • फैक्ट्री फैब्रिकेशन लेबर (₹70/sqft): 10.76 × 70 = <strong>₹753.20</strong>.<br />
                    • साइट इंस्टॉलेशन व सिलिकॉन (₹50/sqft): 10.76 × 50 = <strong>₹538.00</strong>.<br />
                    • <strong>कुल लेबर खर्च = ₹1,291.20</strong>.
                  </p>
                </div>
              </div>

              {/* Profit & Grand Total Summary */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-black text-blue-950 block">5. प्रॉफिट व 18% GST (Final Calculation)</span>
                  <span className="text-blue-800">
                    (कच्चा माल + लेबर) = ₹3,814.16 • 60% प्रॉफिट मार्जिन = ₹2,288.50 • 18% GST = ₹1,098.48
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">विंडो का अंतिम मूल्य:</span>
                  <span className="text-base font-black text-blue-950 font-mono">
                    ₹7,201.14 (₹669 / वर्ग फुट)
                  </span>
                </div>
              </div>

              {/* Dedicated Silicone Sealant Formula Guide Card */}
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-base shadow-xs">
                      🧪
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-amber-950 uppercase tracking-tight">
                        सिलिकॉन सीलेंट (Silicone Sealant) निकालने का सटीक नियम व सूत्र
                      </h4>
                      <p className="text-xs text-amber-800 font-medium">
                        Factory & Site Standard Formula: (Height + Width) × 0.0005263
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-200/80 text-amber-900 text-xs font-black rounded-lg font-mono">
                    Factor: 0.0005263
                  </span>
                </div>

                <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-amber-200 text-xs space-y-3">
                  <div className="p-3 bg-amber-100/60 rounded-lg border border-amber-300 text-amber-950 font-mono font-bold text-center text-sm">
                    सिलिकॉन सीलेंट कैन (CAN / Tube) = (विंडो की Height mm + विंडो की Width mm) × 0.0005263
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800 block text-xs">1000 × 1000 mm विंडो:</span>
                      <span className="text-slate-600 block text-[11px] font-mono mt-1">
                        (1000 + 1000) = 2000 mm<br />
                        2000 × 0.0005263 = <strong className="text-amber-800">1.053 CAN</strong> (~1 Tube)
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800 block text-xs">1200 × 1500 mm विंडो:</span>
                      <span className="text-slate-600 block text-[11px] font-mono mt-1">
                        (1200 + 1500) = 2700 mm<br />
                        2700 × 0.0005263 = <strong className="text-amber-800">1.421 CAN</strong>
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800 block text-xs">2100 × 2400 mm डोर:</span>
                      <span className="text-slate-600 block text-[11px] font-mono mt-1">
                        (2100 + 2400) = 4500 mm<br />
                        4500 × 0.0005263 = <strong className="text-amber-800">2.368 CAN</strong>
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-900/80 leading-relaxed italic">
                    💡 <strong>फ़ैक्टरी नोट:</strong> यह फ़ॉर्मूला विंडो और डोर के चारों तरफ़ पेरीमीटर वेदरप्रूफ सीलिंग के लिए आवश्यक मानक 300ml/280ml सिलिकॉन कार्ट्रिज (ट्यूब) की सही मात्रा की गणना करता है।
                  </p>
                </div>
              </div>

              {/* Dedicated Casement Espag Selection Chart */}
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                      🔒
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-blue-950 uppercase tracking-tight">
                        केसमैंट विंडो एस्पैग रॉड साइज़ चार्ट (Casement Espag Selection Rule)
                      </h4>
                      <p className="text-xs text-blue-800 font-medium">
                        लागू: केवल Casement Espag Handle (With Key / Without Key) में (Cockspur में Espag नहीं लगता)
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-200/80 text-blue-900 text-xs font-black rounded-lg font-mono">
                    20mm BS (Backset)
                  </span>
                </div>

                <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border border-blue-200 text-xs space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-blue-100/70 text-blue-950 font-bold border-b border-blue-300">
                          <th className="py-2 px-3">विंडो / सैश की ऊँचाई (Height)</th>
                          <th className="py-2 px-3">Espag Rod साइज</th>
                          <th className="py-2 px-3">आइटम कोड (Item Code)</th>
                          <th className="py-2 px-3">स्ट्राइकर (Keepers)</th>
                          <th className="py-2 px-3">मान्य हैंडल</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100 font-mono">
                        <tr className="hover:bg-blue-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">400 mm – 800 mm</td>
                          <td className="py-2 px-3 font-black text-blue-700">400 mm</td>
                          <td className="py-2 px-3 text-slate-600">UPVC-HW-20BS400</td>
                          <td className="py-2 px-3 text-slate-700">2 Pcs</td>
                          <td className="py-2 px-3 text-emerald-700 font-sans font-medium text-[11px]">With / Without Key</td>
                        </tr>
                        <tr className="hover:bg-blue-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">900 mm – 1000 mm</td>
                          <td className="py-2 px-3 font-black text-blue-700">600 mm</td>
                          <td className="py-2 px-3 text-slate-600">UPVC-HW-20BS600</td>
                          <td className="py-2 px-3 text-slate-700">2 Pcs</td>
                          <td className="py-2 px-3 text-emerald-700 font-sans font-medium text-[11px]">With / Without Key</td>
                        </tr>
                        <tr className="hover:bg-blue-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">1100 mm – 1200 mm</td>
                          <td className="py-2 px-3 font-black text-blue-700">800 mm</td>
                          <td className="py-2 px-3 text-slate-600">UPVC-HW-20BS800</td>
                          <td className="py-2 px-3 text-slate-700">3 Pcs</td>
                          <td className="py-2 px-3 text-emerald-700 font-sans font-medium text-[11px]">With / Without Key</td>
                        </tr>
                        <tr className="hover:bg-blue-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">1300 mm – 1400 mm</td>
                          <td className="py-2 px-3 font-black text-blue-700">1000 mm</td>
                          <td className="py-2 px-3 text-slate-600">UPVC-HW-20BS1000</td>
                          <td className="py-2 px-3 text-slate-700">3 Pcs</td>
                          <td className="py-2 px-3 text-emerald-700 font-sans font-medium text-[11px]">With / Without Key</td>
                        </tr>
                        <tr className="hover:bg-blue-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">1500 mm – 1600 mm</td>
                          <td className="py-2 px-3 font-black text-blue-700">1200 mm</td>
                          <td className="py-2 px-3 text-slate-600">UPVC-HW-20BS1200</td>
                          <td className="py-2 px-3 text-slate-700">3 Pcs</td>
                          <td className="py-2 px-3 text-emerald-700 font-sans font-medium text-[11px]">With / Without Key</td>
                        </tr>
                        <tr className="hover:bg-blue-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">1700 mm से ऊपर</td>
                          <td className="py-2 px-3 font-black text-blue-700">1400 mm</td>
                          <td className="py-2 px-3 text-slate-600">UPVC-HW-20BS1400</td>
                          <td className="py-2 px-3 text-slate-700">4 Pcs</td>
                          <td className="py-2 px-3 text-emerald-700 font-sans font-medium text-[11px]">With / Without Key</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-blue-900/80 leading-relaxed italic">
                    💡 <strong>फ़ैक्टरी नियम:</strong> यदि हैंडल Cockspur चुना गया है, तो Espag Rod नहीं जुड़ेगी (केवल Cockspur Wedge लगेगी)। एस्पैग केवल तभी जुड़ेगा जब Espag Handle (with key या without key) चुना गया हो।
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PricingFormulaView;
