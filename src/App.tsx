import React, { useState, useEffect, useCallback } from 'react';
import {
  UPVCProject,
  UPVCFrame,
  Mullion,
  FramePocket,
  CouplingConnection,
  PricingConfig,
  SashType,
  GlassType,
  GridPattern,
  GeorgianBarConfig,
  CouplerType,
} from './types/upvc';
import { ERPProjectRecord, InventoryItem, CustomerRecord } from './types/erp';
import { INITIAL_ERP_PROJECTS, INITIAL_INVENTORY, INITIAL_CUSTOMERS } from './data/erpData';
import { TEMPLATES } from './utils/presets';
import {
  recalculateFramePockets,
  equalizeFrameMullions,
  equalizeOrScaleFrameMullions,
  resolveFramePositions,
  updateFrameDimensionDirectional,
  updateAssemblyTotalDimension,
  splitFrameHorizontalWithCoupling,
  splitFrameVerticalWithCoupling,
  autoAlignCoupledAssembly,
  calculateAssemblyBounds,
  DEFAULT_PRICING_CONFIG,
  DEFAULT_COLORS,
} from './utils/upvcCalculations';
import { DashboardHome } from './components/DashboardHome';
import { CustomersView } from './components/CustomersView';
import { CustomersModal } from './components/CustomersModal';
import { InventoryModal } from './components/InventoryModal';
import { WorkshopScanModal } from './components/WorkshopScanModal';
import { CompanyGstModal } from './components/CompanyGstModal';
import { PaymentLedgerModal } from './components/PaymentLedgerModal';
import { QuickQuoteModal } from './components/QuickQuoteModal';
import { PricingFormulaModal } from './components/PricingFormulaModal';
import { SeriesSettingsModal } from './components/SeriesSettingsModal';
import { InventoryManager } from './components/InventoryManager';
import { Navbar } from './components/Navbar';
import { Toolbar } from './components/Toolbar';
import { CadCanvas } from './components/CadCanvas';
import { SashTypesPalette, PaletteCategory } from './components/SashTypesPalette';
import { Canvas3D } from './components/Canvas3D';
import { CuttingListModal } from './components/CuttingListModal';
import { QuotationView } from './components/QuotationView';
import { ExportDrawingModal } from './components/ExportDrawingModal';
import { CouplingGuideModal } from './components/CouplingGuideModal';
import { SavedProjectsModal } from './components/SavedProjectsModal';
import { CustomerProjectView, getInitialDesignsForCustomer } from './components/CustomerProjectView';
import { syncCustomerRecord, syncAllCustomers, saveCustomerDesignsAndSync } from './utils/customerStorage';
import { SlidingGalleryModal, SlidingDesignDef } from './components/SlidingGalleryModal';
import { PocketCustomizationModal } from './components/PocketCustomizationModal';
import { SaveConfirmationModal } from './components/SaveConfirmationModal';
import { PricingFormulaView } from './components/PricingFormulaView';
import { MultipleMullionsModal } from './components/MultipleMullionsModal';
import { PaperScanCadModal } from './components/PaperScanCadModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FanPositionModal, FanPositionConfig } from './components/FanPositionModal';
import { GeorgianBarCustomizerModal, GeorgianBarPromptData } from './components/GeorgianBarCustomizerModal';
import { Check, Info, Sparkles, X, Bot } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'upvc_cad_designer_project_v2';
const SAVED_DESIGNS_KEY = 'upvc_cad_saved_projects_library_v1';
const ERP_PROJECTS_KEY = 'upvc_erp_projects_v1';
const ERP_INVENTORY_KEY = 'upvc_erp_inventory_v1';
const ERP_CUSTOMERS_KEY = 'upvc_erp_customers_v1';

export default function App() {
  // Screen View: 'dashboard' | 'customers' | 'customer_project' | 'inventory' | 'cad' | 'pricing_formula'
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'customers' | 'customer_project' | 'inventory' | 'cad' | 'pricing_formula'>('dashboard');

  // Currently inspected customer for customer design hub
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  // ERP State with Local Storage persistence
  const [erpProjects, setErpProjects] = useState<ERPProjectRecord[]>(() => {
    const saved = localStorage.getItem(ERP_PROJECTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_ERP_PROJECTS;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem(ERP_INVENTORY_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_INVENTORY;
  });

  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    const saved = localStorage.getItem(ERP_CUSTOMERS_KEY);
    let list = INITIAL_CUSTOMERS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } catch (e) {}
    }
    return syncAllCustomers(list);
  });

  // Sync customers state when designs change across components
  useEffect(() => {
    const handleCustomerDesignsChanged = () => {
      setCustomers((prev) => syncAllCustomers(prev));
    };
    window.addEventListener('upvc_customer_designs_changed', handleCustomerDesignsChanged);
    window.addEventListener('storage', handleCustomerDesignsChanged);
    return () => {
      window.removeEventListener('upvc_customer_designs_changed', handleCustomerDesignsChanged);
      window.removeEventListener('storage', handleCustomerDesignsChanged);
    };
  }, []);

  // Save ERP collections to local storage
  useEffect(() => {
    try {
      localStorage.setItem(ERP_PROJECTS_KEY, JSON.stringify(erpProjects));
      localStorage.setItem(ERP_INVENTORY_KEY, JSON.stringify(inventory));
      localStorage.setItem(ERP_CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (e) {}
  }, [erpProjects, inventory, customers]);

  // ERP Modals
  const [showCustomersModal, setShowCustomersModal] = useState<boolean>(false);
  const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
  const [showWorkshopScanModal, setShowWorkshopScanModal] = useState<boolean>(false);
  const [showCompanyGstModal, setShowCompanyGstModal] = useState<boolean>(false);
  const [showPaymentLedgerModal, setShowPaymentLedgerModal] = useState<boolean>(false);
  const [showQuickQuoteModal, setShowQuickQuoteModal] = useState<boolean>(false);
  const [showPricingFormulaModal, setShowPricingFormulaModal] = useState<boolean>(false);
  const [showSeriesSettingsModal, setShowSeriesSettingsModal] = useState<boolean>(false);
  const [showPaperScanModal, setShowPaperScanModal] = useState<boolean>(false);
  const [appFanPrompt, setAppFanPrompt] = useState<FanPositionConfig | null>(null);
  const [georgianBarPrompt, setGeorgianBarPrompt] = useState<GeorgianBarPromptData | null>(null);

  // Initialize project state from localStorage or default template
  const [project, setProject] = useState<UPVCProject>(() => {
    const fssfTpl = TEMPLATES.find((t) => t.id === 'sliding_w_2track_4panel_fix_slide_slide_fix');
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isBasic1000 = parsed.frames && parsed.frames.length === 1 && 
          parsed.frames[0].width === 1000 && parsed.frames[0].height === 1000 && 
          (!parsed.frames[0].mullions || parsed.frames[0].mullions.length === 0);
        if (!isBasic1000) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved project', e);
      }
    }
    // Default: 4-Panel [ FIX - SLIDE → | 🔒 | ← SLIDE - FIX ] with Center Lock
    if (fssfTpl) {
      return fssfTpl.getProject();
    }
    const starterTpl = TEMPLATES.find((t) => t.id === 'starter_1000x1000') || TEMPLATES[0];
    return starterTpl.getProject();
  });

  // Undo / Redo History
  const [history, setHistory] = useState<UPVCProject[]>([project]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active Tool
  const [activeTool, setActiveTool] = useState<
    'select' | 'v_mullion' | 'h_mullion' | 'coupling' | 'h_coupling_split' | 'v_coupling_split'
  >('select');

  // Selection states
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(project.frames[0]?.id || null);
  const [selectedMullionId, setSelectedMullionId] = useState<string | null>(null);
  const [selectedPocketId, setSelectedPocketId] = useState<string | null>(null);
  const [selectedCouplingId, setSelectedCouplingId] = useState<string | null>(null);

  // Canvas View Mode & Parameters (from video)
  const [viewMode, setViewMode] = useState<'inside' | 'outside'>('inside');
  const [floorDistance, setFloorDistance] = useState<number>(900);
  const [couplerGap, setCouplerGap] = useState<number>(2);

  // Zoom & UI state
  const [zoom, setZoom] = useState<number>(0.65);
  const [lang, setLang] = useState<'hi' | 'en'>('hi');
  const [showSashPalette, setShowSashPalette] = useState<boolean>(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState<PaletteCategory>('casement');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Modals
  const [show3DModal, setShow3DModal] = useState<boolean>(false);
  const [showCuttingModal, setShowCuttingModal] = useState<boolean>(false);
  const [cuttingModalTab, setCuttingModalTab] = useState<
    'production_report' | 'saw_cutting' | 'live_formula' | 'bar_nesting' | 'cost_breakup'
  >('production_report');

  const handleOpenCuttingModal = (
    tab?: 'production_report' | 'saw_cutting' | 'live_formula' | 'bar_nesting' | 'cost_breakup'
  ) => {
    setCuttingModalTab(tab || 'production_report');
    setShowCuttingModal(true);
  };
  const [showQuotationModal, setShowQuotationModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportInitialTab, setExportInitialTab] = useState<'cad' | 'cost_breakup' | 'both'>('cad');
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);
  const [showSlidingGallery, setShowSlidingGallery] = useState<boolean>(false);
  const [showPocketModal, setShowPocketModal] = useState<boolean>(false);
  const [pocketModalData, setPocketModalData] = useState<{ frame: UPVCFrame; pocket: FramePocket } | null>(null);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState<boolean>(false);
  const [multiMullionModal, setMultiMullionModal] = useState<{
    isOpen: boolean;
    orientation: 'vertical' | 'horizontal';
    frameId: string;
    pocketId?: string | null;
  }>({
    isOpen: false,
    orientation: 'vertical',
    frameId: '',
    pocketId: null,
  });
  const [activeCustomerDesignId, setActiveCustomerDesignId] = useState<string | null>(null);
  const [quotationCustomerDesigns, setQuotationCustomerDesigns] = useState<any[]>([]);
  const [selectedPocketTarget, setSelectedPocketTarget] = useState<'shutter' | 'mesh'>('shutter');

  const handleOpenQuotation = (customDesigns?: any[]) => {
    if (customDesigns && customDesigns.length > 0) {
      setQuotationCustomerDesigns(customDesigns);
    } else {
      const effectiveCust = selectedCustomer || (customers.length > 0 ? customers[0] : null);
      if (effectiveCust) {
        try {
          const raw = localStorage.getItem(`upvc_cust_designs_${effectiveCust.id}`);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              setQuotationCustomerDesigns(list);
            } else {
              setQuotationCustomerDesigns([]);
            }
          } else {
            setQuotationCustomerDesigns([]);
          }
        } catch (e) {
          setQuotationCustomerDesigns([]);
        }
      }
    }
    setShowQuotationModal(true);
  };

  const handleOpenPocketCustomizer = (frameId: string, pocketId: string, targetMode?: 'shutter' | 'mesh') => {
    const frame = project.frames.find((f) => f.id === frameId);
    if (!frame) return;
    const pocket = frame.pockets.find((p) => p.id === pocketId);
    if (!pocket) return;
    setSelectedFrameId(frameId);
    setSelectedPocketId(pocketId);
    setSelectedPocketTarget(targetMode || 'shutter');
    setSelectedMullionId(null);
    setSelectedCouplingId(null);
    setShowPocketModal(false);
    setPocketModalData(null);
  };

  const handleSavePocketFromModal = (frameId: string, updatedPocket: FramePocket) => {
    const updatedFrames = project.frames.map((f) => {
      if (f.id === frameId) {
        const isSlider =
          f.series?.toLowerCase().includes('sliding') ||
          f.seriesCode?.toLowerCase().includes('sld') ||
          f.name?.toLowerCase().includes('sliding') ||
          f.name?.toLowerCase().includes('slider');

        const updatedSashCode = updatedPocket.sashProfileCode;
        let sashW = f.sashProfileWidth;
        if (updatedSashCode === 'SWH 60-04') sashW = 66;
        else if (updatedSashCode === 'SWH 60-05') sashW = 75;
        else if (updatedSashCode === 'SWH 60-06') sashW = 88;
        else if (updatedSashCode === 'SWH 60-03') sashW = 57;
        else if (updatedSashCode === 'CWH 60-03') sashW = 78;
        else if (updatedSashCode === 'CWH 60-04') sashW = 71;
        else if (updatedSashCode === 'CWH 60-06') sashW = 104;
        else if (updatedSashCode === 'CWH 60-07') sashW = 104;
        else if (updatedSashCode === 'CWH 60-12') sashW = 60;

        const modPockets = f.pockets.map((p) => {
          if (p.id === updatedPocket.id) return updatedPocket;
          // For sliding windows/doors, all sliding sashes share the same sash profile
          if (isSlider && updatedSashCode && (p.sashType?.startsWith('slider') || p.sashType?.startsWith('mesh'))) {
            return {
              ...p,
              sashProfileCode: updatedSashCode,
              sashProfileTop: updatedPocket.sashProfileTop || p.sashProfileTop,
              sashProfileBottom: updatedPocket.sashProfileBottom || p.sashProfileBottom,
              sashProfileLeft: updatedPocket.sashProfileLeft || p.sashProfileLeft,
              sashProfileRight: updatedPocket.sashProfileRight || p.sashProfileRight,
              reinforcementCavity: updatedPocket.reinforcementCavity || p.reinforcementCavity,
            };
          }
          return p;
        });

        return {
          ...f,
          pockets: modPockets,
          sashProfileCode: updatedSashCode || f.sashProfileCode,
          sashProfileWidth: sashW || f.sashProfileWidth,
          frameProfileCode: updatedPocket.frameProfileCode || f.frameProfileCode,
          seriesCode: updatedPocket.seriesCode || f.seriesCode,
          glassName: updatedPocket.glassName || f.glassName,
          glassType: updatedPocket.glassType || f.glassType,
        };
      }
      return f;
    });
    updateProjectFrames(updatedFrames);
    setSaveToast(`Section properties updated (${Math.round(updatedPocket.width)} × ${Math.round(updatedPocket.height)} mm)`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Push new state to history
  const pushState = (newProject: UPVCProject) => {
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, newProject];
    });
    setHistoryIndex((prev) => prev + 1);
    setProject(newProject);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setProject(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setProject(history[newIndex]);
    }
  };

  // Save to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(project));
    } catch (e) {
      console.error('Failed to save project', e);
    }
  }, [project]);

  // ERP stock adjustment
  const handleUpdateStock = (itemId: string, newQty: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            stockQty: newQty,
            totalValue: newQty * item.unitRate,
            isLowStock: newQty <= item.reorderLevel,
          };
        }
        return item;
      })
    );
    setSaveToast('Inventory Stock Updated');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Switch to CAD with optional project or customer selection
  const handleNavigateToCAD = (erpProjectId?: string, customer?: CustomerRecord) => {
    if (customer) {
      setProject((prev) => ({
        ...prev,
        name: `${customer.name} Window Plan`,
        clientName: customer.name,
        referenceNo: customer.id,
        profileSeries: customer.brand || prev.profileSeries,
      }));
      setSaveToast(`Opened CAD for ${customer.name}`);
      setTimeout(() => setSaveToast(null), 2500);
      setCurrentScreen('cad');
      return;
    }
    if (erpProjectId) {
      const found = erpProjects.find((p) => p.id === erpProjectId);
      if (found) {
        setProject((prev) => ({
          ...prev,
          name: found.projectName,
          clientName: found.clientName,
          referenceNo: found.id,
        }));
      }
    }
    setCurrentScreen('cad');
  };

  // Project updater helper
  const updateProjectFrames = (newFrames: UPVCFrame[], newCouplings?: CouplingConnection[]) => {
    const couplingsToUse = newCouplings !== undefined ? newCouplings : project.couplings;
    const newProj = {
      ...project,
      frames: newFrames,
      couplings: couplingsToUse,
    };
    pushState(newProj);
  };

  // 1. SPLIT FRAME HORIZONTALLY (Horizontal Coupling)
  const handleSplitFrameHorizontal = (
    targetFrameId?: string,
    couplerType: CouplerType = 'flat_2mm',
    angle?: number,
    bendDirection?: 'inward' | 'outward'
  ) => {
    const fId = targetFrameId || selectedFrameId || project.frames[0]?.id;
    if (!fId) return;

    const result = splitFrameHorizontalWithCoupling(
      project.frames,
      project.couplings,
      fId,
      0.5,
      couplerGap,
      couplerType,
      angle,
      bendDirection
    );

    const newProj: UPVCProject = {
      ...project,
      frames: result.frames,
      couplings: result.couplings,
    };
    pushState(newProj);
    setSelectedFrameId(result.newFrameIds[0]);
    setSelectedCouplingId(result.couplings[result.couplings.length - 1]?.id || null);
    setActiveTool('select');
  };

  // 2. SPLIT FRAME VERTICALLY (Vertical Coupling)
  const handleSplitFrameVertical = (
    targetFrameId?: string,
    couplerType: CouplerType = 'flat_2mm',
    angle?: number,
    bendDirection?: 'inward' | 'outward'
  ) => {
    const fId = targetFrameId || selectedFrameId || project.frames[0]?.id;
    if (!fId) return;

    const result = splitFrameVerticalWithCoupling(
      project.frames,
      project.couplings,
      fId,
      0.5,
      couplerGap,
      couplerType,
      angle,
      bendDirection
    );

    const newProj: UPVCProject = {
      ...project,
      frames: result.frames,
      couplings: result.couplings,
    };
    pushState(newProj);
    setSelectedFrameId(result.newFrameIds[0]);
    setSelectedCouplingId(result.couplings[result.couplings.length - 1]?.id || null);
    setActiveTool('select');
  };

  // 2a. UPDATE COUPLING (Angle, Coupler Type, Gap, Alignment)
  const handleUpdateCoupling = (updatedCoupling: CouplingConnection) => {
    const updatedCouplings = (project.couplings || []).map((c) =>
      c.id === updatedCoupling.id ? updatedCoupling : c
    );
    updateProjectFrames(project.frames, updatedCouplings);
  };

  // 2b. AUTO-ALIGN ALL COUPLED FRAMES (Fix 2mm gaps and dimensions)
  const handleAutoAlignCoupledAssembly = () => {
    if (!project.frames || project.frames.length <= 1) return;
    const result = autoAlignCoupledAssembly(project.frames, project.couplings || []);
    const newProj: UPVCProject = {
      ...project,
      frames: result.frames,
      couplings: result.couplings,
    };
    pushState(newProj);
    setSaveToast(lang === 'hi' ? 'कप्लिंग व अलाइनमेंट सही कर दी गई है (2mm गैप)' : 'Coupled assembly auto-aligned with 2mm gaps');
    setTimeout(() => setSaveToast(null), 2500);
  };

  // 3. ADD VERTICAL MULLION (Inside single frame or selected pocket)
  const handleAddVerticalMullion = (targetFrameId?: string, targetPocketId?: string) => {
    const frameId = targetFrameId || selectedFrameId || project.frames[0]?.id;
    if (!frameId) return;
    handleAddMullionAtPosition(frameId, 'vertical', undefined, targetPocketId || selectedPocketId || undefined);
  };

  // 4. ADD HORIZONTAL MULLION (TRANSOM)
  const handleAddHorizontalMullion = (targetFrameId?: string, targetPocketId?: string) => {
    const frameId = targetFrameId || selectedFrameId || project.frames[0]?.id;
    if (!frameId) return;
    handleAddMullionAtPosition(frameId, 'horizontal', undefined, targetPocketId || selectedPocketId || undefined);
  };

  // 5. UPDATE FRAME DIMENSIONS (Width/Height with directional growth)
  const handleUpdateFrameDimension = (
    frameId: string,
    width: number,
    height: number,
    anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'left' | 'right' | 'top' | 'bottom' = 'top-left'
  ) => {
    const updatedFrames = updateFrameDimensionDirectional(
      project.frames,
      project.couplings,
      frameId,
      width,
      height,
      anchor
    );
    updateProjectFrames(updatedFrames);
  };

  // 5b. UPDATE TOTAL ASSEMBLY DIMENSION (Smart Height proportional & Width equal distribution)
  const handleUpdateTotalDimension = (
    type: 'total_w' | 'total_h',
    newTotalValue: number
  ) => {
    const updatedFrames = updateAssemblyTotalDimension(
      project.frames,
      project.couplings,
      type,
      newTotalValue
    );
    updateProjectFrames(updatedFrames);
  };

  // 6. UPDATE MULLION POSITION
  const handleUpdateMullionPosition = (frameId: string, mullionId: string, newPosition: number) => {
    const updatedFrames = project.frames.map((frame) => {
      if (frame.id === frameId) {
        const modMullions = frame.mullions.map((m) =>
          m.id === mullionId ? { ...m, position: newPosition } : m
        );
        const modFrame: UPVCFrame = {
          ...frame,
          mullions: modMullions,
        };
        modFrame.pockets = recalculateFramePockets(modFrame);
        return modFrame;
      }
      return frame;
    });

    updateProjectFrames(updatedFrames);
  };

  // 7. EQUALIZE MULLIONS (खानों को बराबर करें)
  const handleEqualizeMullions = () => {
    if (!selectedFrameId) return;
    const frame = project.frames.find((f) => f.id === selectedFrameId);
    if (!frame || frame.mullions.length === 0) return;

    const updatedFrame = equalizeFrameMullions(frame);
    const updatedFrames = project.frames.map((f) => (f.id === frame.id ? updatedFrame : f));
    updateProjectFrames(updatedFrames);
    setSaveToast(lang === 'hi' ? 'सभी खानों (Bays) को बराबर कर दिया गया' : 'Equalized all bays with profile compensation');
    setTimeout(() => setSaveToast(null), 2500);
  };

  // 8. UPDATE POCKET SASH (Drag & Drop or Click from Sash Types Palette)
  const handleUpdatePocketSash = (frameId: string, pocketId: string, sashType: SashType) => {
    const updatedFrames = project.frames.map((f) => {
      if (f.id === frameId) {
        // A. Multi-panel slider dropped on frame: REPLACES entire frame sliding design cleanly!
        if (
          sashType === 'slider_2s' ||
          sashType === 'slider_2s_xo' ||
          sashType === 'slider_2s_ox' ||
          sashType === 'slider_2s_xx'
        ) {
          const mul: Mullion = {
            id: `mul-v-${Date.now()}`,
            orientation: 'vertical',
            position: Math.round(f.width / 2),
            width: 16,
          };
          const updatedF: UPVCFrame = {
            ...f,
            series: 'sliding_62',
            frameProfileWidth: 62,
            mullionProfileWidth: 16,
            mullions: [mul],
          };
          updatedF.pockets = recalculateFramePockets(updatedF);
          if (updatedF.pockets[0]) {
            updatedF.pockets[0].sashType = sashType === 'slider_2s_ox' ? 'slider_fixed_center' : 'slider_arrow_right';
            updatedF.pockets[0].customLabel = 'S1';
            updatedF.pockets[0].hasMesh = false;
          }
          if (updatedF.pockets[1]) {
            updatedF.pockets[1].sashType = sashType === 'slider_2s_xo' ? 'slider_fixed_center' : 'slider_arrow_left';
            updatedF.pockets[1].customLabel = 'S2';
            updatedF.pockets[1].hasMesh = false;
          }
          return updatedF;
        }

        if (
          sashType === 'slider_3t_2p_mesh' ||
          sashType === 'slider_2s_with_mesh' ||
          sashType === 'slider_3s_mesh'
        ) {
          // Model #5: 3-Track with 2 Panels (same as 2-track) + 1 Fly Mesh Panel on S2
          const mul: Mullion = {
            id: `mul-v-${Date.now()}`,
            orientation: 'vertical',
            position: Math.round(f.width / 2),
            width: 16,
          };
          const updatedF: UPVCFrame = {
            ...f,
            series: 'sliding_88',
            frameProfileWidth: 88,
            mullionProfileWidth: 16,
            mullions: [mul],
          };
          updatedF.pockets = recalculateFramePockets(updatedF);
          if (updatedF.pockets[0]) {
            updatedF.pockets[0].sashType = 'slider_arrow_right';
            updatedF.pockets[0].customLabel = 'S1';
            updatedF.pockets[0].hasMesh = false;
          }
          if (updatedF.pockets[1]) {
            updatedF.pockets[1].sashType = 'slider_arrow_left';
            updatedF.pockets[1].customLabel = 'S2';
            updatedF.pockets[1].hasMesh = true; // S2 ke upar fly mesh panel
          }
          return updatedF;
        }

        if (sashType === 'slider_3s_oxo') {
          // 2-Track 3-Panel with Center Fixed Glass (Image 1)
          const mul1: Mullion = {
            id: `mul-v-${Date.now()}-1`,
            orientation: 'vertical',
            position: Math.round(f.width / 3),
            width: 16,
          };
          const mul2: Mullion = {
            id: `mul-v-${Date.now()}-2`,
            orientation: 'vertical',
            position: Math.round((f.width * 2) / 3),
            width: 16,
          };
          const updatedF: UPVCFrame = {
            ...f,
            series: 'sliding_62',
            frameProfileWidth: 62,
            mullionProfileWidth: 16,
            mullions: [mul1, mul2],
          };
          updatedF.pockets = recalculateFramePockets(updatedF);
          if (updatedF.pockets[0]) {
            updatedF.pockets[0].sashType = 'slider_arrow_right';
            updatedF.pockets[0].customLabel = 'S1';
          }
          if (updatedF.pockets[1]) {
            updatedF.pockets[1].sashType = 'slider_fixed_center';
            updatedF.pockets[1].customLabel = 'S2';
          }
          if (updatedF.pockets[2]) {
            updatedF.pockets[2].sashType = 'slider_arrow_left';
            updatedF.pockets[2].customLabel = 'S3';
          }
          return updatedF;
        }

        if (
          sashType === 'slider_3s' ||
          sashType === 'slider_3s_xxx' ||
          sashType === 'slider_3s_xoo'
        ) {
          const mul1: Mullion = {
            id: `mul-v-${Date.now()}-1`,
            orientation: 'vertical',
            position: Math.round(f.width / 3),
            width: 16,
          };
          const mul2: Mullion = {
            id: `mul-v-${Date.now()}-2`,
            orientation: 'vertical',
            position: Math.round((f.width * 2) / 3),
            width: 16,
          };
          const updatedF: UPVCFrame = {
            ...f,
            series: 'sliding_88',
            frameProfileWidth: 88,
            mullionProfileWidth: 16,
            mullions: [mul1, mul2],
          };
          updatedF.pockets = recalculateFramePockets(updatedF);
          if (updatedF.pockets[0]) {
            updatedF.pockets[0].sashType = 'slider_arrow_both';
            updatedF.pockets[0].customLabel = 'S1';
          }
          if (updatedF.pockets[1]) {
            updatedF.pockets[1].sashType = 'slider_arrow_both';
            updatedF.pockets[1].customLabel = 'S2';
          }
          if (updatedF.pockets[2]) {
            updatedF.pockets[2].sashType = 'slider_arrow_both';
            updatedF.pockets[2].customLabel = 'S3';
          }
          return updatedF;
        }

        if (
          sashType === 'slider_4s' ||
          sashType === 'slider_4s_oxxo' ||
          sashType === 'slider_4s_xxxx'
        ) {
          const mul1: Mullion = { id: `mul-v-${Date.now()}-1`, orientation: 'vertical', position: Math.round(f.width / 4), width: 16 };
          const mul2: Mullion = { id: `mul-v-${Date.now()}-2`, orientation: 'vertical', position: Math.round(f.width / 2), width: 16 };
          const mul3: Mullion = { id: `mul-v-${Date.now()}-3`, orientation: 'vertical', position: Math.round((f.width * 3) / 4), width: 16 };
          const updatedF: UPVCFrame = {
            ...f,
            series: 'sliding_62',
            frameProfileWidth: 62,
            mullionProfileWidth: 16,
            mullions: [mul1, mul2, mul3],
          };
          updatedF.pockets = recalculateFramePockets(updatedF);
          if (updatedF.pockets[0]) { updatedF.pockets[0].sashType = 'slider_arrow_right'; updatedF.pockets[0].customLabel = 'S1'; }
          if (updatedF.pockets[1]) { updatedF.pockets[1].sashType = 'slider_arrow_left'; updatedF.pockets[1].customLabel = 'S2'; }
          if (updatedF.pockets[2]) { updatedF.pockets[2].sashType = 'slider_arrow_right'; updatedF.pockets[2].customLabel = 'S3'; }
          if (updatedF.pockets[3]) { updatedF.pockets[3].sashType = 'slider_arrow_left'; updatedF.pockets[3].customLabel = 'S4'; }
          return updatedF;
        }

        if (sashType === 'slider_5s_multi') {
          // 3-Track 5-Panel Slider (Image 2)
          const mul1: Mullion = { id: `mul-v-${Date.now()}-1`, orientation: 'vertical', position: Math.round(f.width / 5), width: 16 };
          const mul2: Mullion = { id: `mul-v-${Date.now()}-2`, orientation: 'vertical', position: Math.round((f.width * 2) / 5), width: 16 };
          const mul3: Mullion = { id: `mul-v-${Date.now()}-3`, orientation: 'vertical', position: Math.round((f.width * 3) / 5), width: 16 };
          const mul4: Mullion = { id: `mul-v-${Date.now()}-4`, orientation: 'vertical', position: Math.round((f.width * 4) / 5), width: 16 };
          const updatedF: UPVCFrame = {
            ...f,
            series: 'sliding_88',
            frameProfileWidth: 88,
            mullionProfileWidth: 16,
            mullions: [mul1, mul2, mul3, mul4],
          };
          updatedF.pockets = recalculateFramePockets(updatedF);
          if (updatedF.pockets[0]) { updatedF.pockets[0].sashType = 'slider_arrow_right'; updatedF.pockets[0].customLabel = 'S1'; }
          if (updatedF.pockets[1]) { updatedF.pockets[1].sashType = 'slider_arrow_both'; updatedF.pockets[1].customLabel = 'S2'; }
          if (updatedF.pockets[2]) { updatedF.pockets[2].sashType = 'slider_arrow_left'; updatedF.pockets[2].customLabel = 'S3'; }
          if (updatedF.pockets[3]) { updatedF.pockets[3].sashType = 'slider_arrow_right'; updatedF.pockets[3].customLabel = 'S4'; }
          if (updatedF.pockets[4]) { updatedF.pockets[4].sashType = 'slider_arrow_left'; updatedF.pockets[4].customLabel = 'S5'; }
          return updatedF;
        }

        if (sashType === 'slider_6s_meeting' || sashType === 'slider_6s_multi') {
          // 3-Track 6-Panel Slider (Center Split 3T 6S)
          const mul1: Mullion = { id: `mul-v-${Date.now()}-1`, orientation: 'vertical', position: Math.round(f.width / 6), width: 16 };
          const mul2: Mullion = { id: `mul-v-${Date.now()}-2`, orientation: 'vertical', position: Math.round((f.width * 2) / 6), width: 16 };
          const mul3: Mullion = { id: `mul-v-${Date.now()}-3`, orientation: 'vertical', position: Math.round((f.width * 3) / 6), width: 16 };
          const mul4: Mullion = { id: `mul-v-${Date.now()}-4`, orientation: 'vertical', position: Math.round((f.width * 4) / 6), width: 16 };
          const mul5: Mullion = { id: `mul-v-${Date.now()}-5`, orientation: 'vertical', position: Math.round((f.width * 5) / 6), width: 16 };
          const updatedF: UPVCFrame = {
            ...f,
            series: 'sliding_88',
            frameProfileWidth: 88,
            mullionProfileWidth: 16,
            mullions: [mul1, mul2, mul3, mul4, mul5],
          };
          updatedF.pockets = recalculateFramePockets(updatedF);
          if (updatedF.pockets[0]) { updatedF.pockets[0].sashType = 'slider_arrow_right'; updatedF.pockets[0].customLabel = 'S1'; }
          if (updatedF.pockets[1]) { updatedF.pockets[1].sashType = 'slider_arrow_both'; updatedF.pockets[1].customLabel = 'S2'; }
          if (updatedF.pockets[2]) { updatedF.pockets[2].sashType = 'slider_arrow_left'; updatedF.pockets[2].customLabel = 'S3'; }
          if (updatedF.pockets[3]) { updatedF.pockets[3].sashType = 'slider_arrow_right'; updatedF.pockets[3].customLabel = 'S4'; }
          if (updatedF.pockets[4]) { updatedF.pockets[4].sashType = 'slider_arrow_both'; updatedF.pockets[4].customLabel = 'S5'; }
          if (updatedF.pockets[5]) { updatedF.pockets[5].sashType = 'slider_arrow_left'; updatedF.pockets[5].customLabel = 'S6'; }
          return updatedF;
        }

        if (sashType === 'slider_3t_6p_4g2m') {
          // 6 PANEL 3 TRACK: 4 Glass Sashes (S1 → | S2 ← | S3 → | S4 ←) + 2 Center Fly Mesh Sashes (MS1 on S2, MS2 on S3) + Center Meeting Lock
          const mul1: Mullion = { id: `mul-v-${Date.now()}-1`, orientation: 'vertical', position: Math.round(f.width / 4), width: 16 };
          const mul2: Mullion = { id: `mul-v-${Date.now()}-2`, orientation: 'vertical', position: Math.round(f.width / 2), width: 16 };
          const mul3: Mullion = { id: `mul-v-${Date.now()}-3`, orientation: 'vertical', position: Math.round((f.width * 3) / 4), width: 16 };
          const updatedF: UPVCFrame = {
            ...f,
            series: 'sliding_88',
            frameProfileWidth: 88,
            mullionProfileWidth: 16,
            hasCenterLock: true,
            mullions: [mul1, mul2, mul3],
          };
          updatedF.pockets = recalculateFramePockets(updatedF);
          if (updatedF.pockets[0]) {
            updatedF.pockets[0].sashType = 'slider_arrow_right';
            updatedF.pockets[0].customLabel = 'S1';
            updatedF.pockets[0].hasMesh = false;
          }
          if (updatedF.pockets[1]) {
            updatedF.pockets[1].sashType = 'slider_arrow_left';
            updatedF.pockets[1].customLabel = 'S2';
            updatedF.pockets[1].hasMesh = true; // MS1 (FLY MESH) - Panel 5
          }
          if (updatedF.pockets[2]) {
            updatedF.pockets[2].sashType = 'slider_arrow_right';
            updatedF.pockets[2].customLabel = 'S3';
            updatedF.pockets[2].hasMesh = true; // MS2 (FLY MESH) - Panel 6
          }
          if (updatedF.pockets[3]) {
            updatedF.pockets[3].sashType = 'slider_arrow_left';
            updatedF.pockets[3].customLabel = 'S4';
            updatedF.pockets[3].hasMesh = false;
          }
          return updatedF;
        }

        // B. Adding Fly Mesh to a Sliding Window:
        // Automatically upgrades 2-track to 3-track, retains 2 glass sashes, and adds mesh on the selected pocket
        const isSlidingFrame = f.series.startsWith('sliding') || f.pockets.some((p) => p.sashType.startsWith('slider_'));
        const isMeshSash = sashType === 'mesh_sash' || sashType === 'mesh_slider_right' || sashType === 'mesh_slider_left';

        let newSeries = f.series;
        let newFPW = f.frameProfileWidth;
        if (isSlidingFrame && isMeshSash) {
          newSeries = 'sliding_88';
          newFPW = 88;
        }

        const updatedPockets = f.pockets.map((p) => {
          if (p.id === pocketId) {
            if (isSlidingFrame && isMeshSash) {
              return {
                ...p,
                hasMesh: true,
                // Keep the sliding arrow functionality active on this bay
                sashType: p.sashType.startsWith('slider_') ? p.sashType : 'slider_arrow_right',
              };
            }
            let updatedHandlePos = p.handlePosition;
            if (sashType === 'casement_left') {
              updatedHandlePos = 'left';
            } else if (sashType === 'casement_right') {
              updatedHandlePos = 'right';
            } else if (sashType === 'top_hung') {
              updatedHandlePos = 'bottom';
            } else if (sashType === 'bottom_hung') {
              updatedHandlePos = 'top';
            }

            return {
              ...p,
              sashType,
              handlePosition: updatedHandlePos,
              hasMesh: isMeshSash ? true : p.hasMesh,
            };
          }
          return p;
        });
        return { ...f, series: newSeries, frameProfileWidth: newFPW, pockets: updatedPockets };
      }
      return f;
    });
    updateProjectFrames(updatedFrames);
    setSelectedFrameId(frameId);
    setSelectedPocketId(pocketId);
    setSaveToast(`Applied: ${sashType.toUpperCase().replace(/_/g, ' ')}`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleUpdatePocketPanel = (
    frameId: string,
    pocketId: string,
    config: {
      glassType?: GlassType;
      sashType?: SashType;
      gridPattern?: GridPattern;
      georgianBar?: GeorgianBarConfig;
      hasMesh?: boolean;
    }
  ) => {
    const updatedFrames = project.frames.map((f) => {
      if (f.id === frameId) {
        const isSlidingFrame = f.series.startsWith('sliding') || f.pockets.some((p) => p.sashType.startsWith('slider_'));
        const willHaveMesh = config.hasMesh !== undefined ? config.hasMesh : (config.sashType === 'mesh_sash');
        let newSeries = f.series;
        let newFPW = f.frameProfileWidth;
        if (isSlidingFrame && willHaveMesh) {
          newSeries = 'sliding_88';
          newFPW = 88;
        }

        const updatedPockets = f.pockets.map((p) => {
          if (p.id === pocketId) {
            const resolvedPattern = config.georgianBar?.pattern || config.gridPattern || p.gridPattern;
            const resolvedGeorgianBar = config.georgianBar !== undefined
              ? config.georgianBar
              : config.gridPattern
              ? { enabled: config.gridPattern !== 'none', pattern: config.gridPattern, ...p.georgianBar }
              : p.georgianBar;

            return {
              ...p,
              ...(config.glassType ? { glassType: config.glassType } : {}),
              ...(config.sashType ? { sashType: config.sashType } : {}),
              gridPattern: resolvedPattern,
              georgianBar: resolvedGeorgianBar,
              ...(config.hasMesh !== undefined ? { hasMesh: config.hasMesh } : (config.sashType === 'mesh_sash' ? { hasMesh: true } : {})),
            };
          }
          return p;
        });
        return { ...f, series: newSeries, frameProfileWidth: newFPW, pockets: updatedPockets };
      }
      return f;
    });
    updateProjectFrames(updatedFrames);
    setSelectedFrameId(frameId);
    setSelectedPocketId(pocketId);
    setSaveToast(`Applied Panel Config`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleAddMullionAtPosition = (
    frameId: string,
    orientation: 'vertical' | 'horizontal',
    position?: number,
    targetPocketId?: string,
    forceSectional?: boolean
  ) => {
    const frame = project.frames.find((f) => f.id === frameId);
    if (!frame) return;

    const pocketId = targetPocketId || selectedPocketId;
    let targetPocket = pocketId ? frame.pockets?.find((p) => p.id === pocketId) : null;

    // Check existing perpendicular mullions
    const hasHorizontalMullions = frame.mullions.some((m) => m.orientation === 'horizontal');
    const hasVerticalMullions = frame.mullions.some((m) => m.orientation === 'vertical');

    // If targetPocket is not explicitly set by ID but position is provided, find which pocket it falls inside
    if (!targetPocket && position !== undefined && frame.pockets && frame.pockets.length > 0) {
      if (orientation === 'vertical' && hasHorizontalMullions) {
        // Look for pocket matching X position or take selected/first pocket in that row
        targetPocket = frame.pockets.find((p) => position >= p.x - 20 && position <= p.x + p.width + 20) || frame.pockets[0];
      } else if (orientation === 'horizontal' && hasVerticalMullions) {
        targetPocket = frame.pockets.find((p) => position >= p.y - 20 && position <= p.y + p.height + 20) || frame.pockets[0];
      }
    }

    // Determine if this mullion should be sectional (T-mullion) bounded inside targetPocket
    // USER REQUIREMENT: When a horizontal mullion exists and a vertical mullion is added to one of the parts,
    // it MUST NOT cross the horizontal mullion!
    const isSectionalVertical =
      orientation === 'vertical' &&
      hasHorizontalMullions &&
      (forceSectional || !!targetPocket || !!targetPocketId || !!selectedPocketId);

    const isSectionalHorizontal =
      orientation === 'horizontal' &&
      hasVerticalMullions &&
      (forceSectional || !!targetPocket || !!targetPocketId || !!selectedPocketId);

    const mpw = frame.mullionProfileWidth || 74;
    const fpw = frame.frameProfileWidth || 60;

    let calcPos = position;
    let spanStart: number | undefined = undefined;
    let spanEnd: number | undefined = undefined;
    let parentPocketId: string | undefined = undefined;
    let updatedExistingMullions = [...frame.mullions];

    if (isSectionalVertical && targetPocket) {
      spanStart = targetPocket.y;
      spanEnd = targetPocket.y + targetPocket.height;
      parentPocketId = targetPocket.id;

      // Existing vertical mullions inside this target pocket
      const existingSubs = frame.mullions
        .filter(
          (m) =>
            m.orientation === 'vertical' &&
            (m.parentPocketId === targetPocket!.id ||
              (m.spanStart !== undefined &&
                Math.abs(m.spanStart - targetPocket!.y) < 20 &&
                m.spanEnd !== undefined &&
                Math.abs(m.spanEnd - (targetPocket!.y + targetPocket!.height)) < 20 &&
                m.position >= targetPocket!.x - 10 &&
                m.position <= targetPocket!.x + targetPocket!.width + 10))
        )
        .sort((a, b) => a.position - b.position);

      const totalK = existingSubs.length + 1;
      const netW = Math.max(40, targetPocket.width - totalK * mpw);
      const equalBayW = netW / (totalK + 1);

      if (calcPos === undefined) {
        if (totalK === 1) {
          // Exactly divide target pocket into 2 equal parts
          calcPos = Math.round(targetPocket.x + targetPocket.width / 2);
        } else {
          // Redistribute all mullions in this pocket equally
          for (let i = 0; i < existingSubs.length; i++) {
            const newP = Math.round(targetPocket.x + (i + 1) * equalBayW + (i + 0.5) * mpw);
            updatedExistingMullions = updatedExistingMullions.map((m) =>
              m.id === existingSubs[i].id ? { ...m, position: newP } : m
            );
          }
          calcPos = Math.round(targetPocket.x + totalK * equalBayW + (totalK - 0.5) * mpw);
        }
      } else {
        calcPos = Math.max(targetPocket.x + 30, Math.min(targetPocket.x + targetPocket.width - 30, calcPos));
      }
    } else if (isSectionalHorizontal && targetPocket) {
      spanStart = targetPocket.x;
      spanEnd = targetPocket.x + targetPocket.width;
      parentPocketId = targetPocket.id;

      // Existing horizontal transoms inside this target pocket
      const existingSubs = frame.mullions
        .filter(
          (m) =>
            m.orientation === 'horizontal' &&
            (m.parentPocketId === targetPocket!.id ||
              (m.spanStart !== undefined &&
                Math.abs(m.spanStart - targetPocket!.x) < 20 &&
                m.spanEnd !== undefined &&
                Math.abs(m.spanEnd - (targetPocket!.x + targetPocket!.width)) < 20 &&
                m.position >= targetPocket!.y - 10 &&
                m.position <= targetPocket!.y + targetPocket!.height + 10))
        )
        .sort((a, b) => a.position - b.position);

      const totalK = existingSubs.length + 1;
      const netH = Math.max(40, targetPocket.height - totalK * mpw);
      const equalBayH = netH / (totalK + 1);

      if (calcPos === undefined) {
        if (totalK === 1) {
          calcPos = Math.round(targetPocket.y + targetPocket.height / 2);
        } else {
          for (let j = 0; j < existingSubs.length; j++) {
            const newP = Math.round(targetPocket.y + (j + 1) * equalBayH + (j + 0.5) * mpw);
            updatedExistingMullions = updatedExistingMullions.map((m) =>
              m.id === existingSubs[j].id ? { ...m, position: newP } : m
            );
          }
          calcPos = Math.round(targetPocket.y + totalK * equalBayH + (totalK - 0.5) * mpw);
        }
      } else {
        calcPos = Math.max(targetPocket.y + 30, Math.min(targetPocket.y + targetPocket.height - 30, calcPos));
      }
    } else {
      // Global full-frame mullion
      if (orientation === 'vertical') {
        const existingGlobalV = frame.mullions
          .filter((m) => m.orientation === 'vertical' && m.spanStart === undefined && !m.parentPocketId)
          .sort((a, b) => a.position - b.position);

        const totalV = existingGlobalV.length + 1;
        const innerW = Math.max(50, frame.width - 2 * fpw);
        const netGlassW = Math.max(50, innerW - totalV * mpw);
        const equalBayW = netGlassW / (totalV + 1);

        if (calcPos === undefined) {
          if (totalV === 1) {
            // Exactly divide into 2 equal parts
            calcPos = Math.round(frame.width / 2);
          } else {
            // Reposition all existing global vertical mullions to equal positions
            for (let i = 0; i < existingGlobalV.length; i++) {
              const newP = Math.round(fpw + (i + 1) * equalBayW + (i + 0.5) * mpw);
              updatedExistingMullions = updatedExistingMullions.map((m) =>
                m.id === existingGlobalV[i].id ? { ...m, position: newP } : m
              );
            }
            calcPos = Math.round(fpw + totalV * equalBayW + (totalV - 0.5) * mpw);
          }
        } else {
          calcPos = Math.max(fpw + 50, Math.min(frame.width - fpw - 50, calcPos));
        }
      } else {
        // orientation === 'horizontal'
        const existingGlobalH = frame.mullions
          .filter((m) => m.orientation === 'horizontal' && m.spanStart === undefined && !m.parentPocketId)
          .sort((a, b) => a.position - b.position);

        const totalH = existingGlobalH.length + 1;
        const innerH = Math.max(50, frame.height - 2 * fpw);
        const netGlassH = Math.max(50, innerH - totalH * mpw);
        const equalBayH = netGlassH / (totalH + 1);

        if (calcPos === undefined) {
          if (totalH === 1) {
            // Exactly divide into 2 equal parts
            calcPos = Math.round(frame.height / 2);
          } else {
            // Reposition all existing global horizontal transoms to equal positions
            for (let j = 0; j < existingGlobalH.length; j++) {
              const newP = Math.round(fpw + (j + 1) * equalBayH + (j + 0.5) * mpw);
              updatedExistingMullions = updatedExistingMullions.map((m) =>
                m.id === existingGlobalH[j].id ? { ...m, position: newP } : m
              );
            }
            calcPos = Math.round(fpw + totalH * equalBayH + (totalH - 0.5) * mpw);
          }
        } else {
          calcPos = Math.max(fpw + 50, Math.min(frame.height - fpw - 50, calcPos));
        }
      }
    }

    const newMullion: Mullion = {
      id: `mul-${orientation[0]}-${Date.now()}`,
      orientation,
      position: calcPos,
      spanStart,
      spanEnd,
      parentPocketId,
    };

    const updatedFrame: UPVCFrame = {
      ...frame,
      mullions: [...updatedExistingMullions, newMullion],
    };
    updatedFrame.pockets = recalculateFramePockets(updatedFrame);

    const updatedFrames = project.frames.map((f) => (f.id === frame.id ? updatedFrame : f));
    updateProjectFrames(updatedFrames);
    setSelectedMullionId(newMullion.id);
    setSelectedFrameId(frame.id);
    setSelectedPocketId(null);
    const toastMsg =
      spanStart !== undefined
        ? lang === 'hi'
          ? `हिस्से को 2 बराबर भागों में बांटा गया (${orientation === 'vertical' ? 'खड़ा मुलियन' : 'आड़ा ट्रांसोम'})`
          : `Divided bay equally (${orientation === 'vertical' ? 'Vertical Mullion' : 'Horizontal Transom'})`
        : lang === 'hi'
        ? `फ्रेम को बराबर भागों में बांटा गया (${calcPos}mm पर ${orientation === 'vertical' ? 'खड़ा मुलियन' : 'आड़ा ट्रांसोम'})`
        : `Divided frame equally (${orientation === 'vertical' ? 'Vertical Mullion' : 'Horizontal Transom'} at ${calcPos}mm)`;
    setSaveToast(toastMsg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleAddCrossMullion = (frameId: string) => {
    const frame = project.frames.find((f) => f.id === frameId);
    if (!frame) return;

    const vPos = Math.round(frame.width / 2);
    const hPos = Math.round(frame.height / 2);

    const newVMul: Mullion = {
      id: `mul-v-${Date.now()}`,
      orientation: 'vertical',
      position: vPos,
    };
    const newHMul: Mullion = {
      id: `mul-h-${Date.now() + 1}`,
      orientation: 'horizontal',
      position: hPos,
    };

    const updatedFrame: UPVCFrame = {
      ...frame,
      mullions: [...frame.mullions, newVMul, newHMul],
    };
    updatedFrame.pockets = recalculateFramePockets(updatedFrame);

    const updatedFrames = project.frames.map((f) => (f.id === frame.id ? updatedFrame : f));
    updateProjectFrames(updatedFrames);
    setSelectedFrameId(frame.id);
    setSaveToast('Added 4-Bay Cross Mullion');
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handlePaletteSelectSash = (sashType: SashType) => {
    const activeFrameId = selectedFrameId || project.frames[0]?.id;
    if (!activeFrameId) return;

    const frame = project.frames.find((f) => f.id === activeFrameId);
    if (!frame) return;

    const targetPocketId = selectedPocketId || frame.pockets[0]?.id;
    if (targetPocketId) {
      handleUpdatePocketSash(activeFrameId, targetPocketId, sashType);
    }
  };

  const handleCouplingAction = (action: string) => {
    const targetFId = selectedFrameId || project.frames[0]?.id;
    if (!targetFId) return;
    if (action === 'v_split' || action === 'vertical') {
      handleSplitFrameVertical(targetFId);
    } else {
      handleSplitFrameHorizontal(targetFId);
    }
  };

  const handleRequestMultipleMullions = (
    frameId: string,
    orientation: 'vertical' | 'horizontal',
    pocketId?: string | null
  ) => {
    const fId = frameId || selectedFrameId || project.frames[0]?.id;
    if (!fId) return;
    const pId = pocketId !== undefined ? pocketId : selectedPocketId;
    setMultiMullionModal({
      isOpen: true,
      orientation,
      frameId: fId,
      pocketId: pId || null,
    });
  };

  const handleConfirmMultipleMullions = (
    count: number,
    orientation: 'vertical' | 'horizontal',
    frameId: string,
    pocketId?: string | null
  ) => {
    const frame = project.frames.find((f) => f.id === frameId);
    if (!frame) return;

    const targetPocket = pocketId ? frame.pockets?.find((p) => p.id === pocketId) : null;
    const fpw = frame.frameProfileWidth || 60;
    const mpw = frame.mullionProfileWidth || 74;

    let updatedMullions = [...frame.mullions];

    if (targetPocket) {
      // Remove all existing sectional mullions inside or intersecting this target pocket with same orientation
      updatedMullions = updatedMullions.filter(
        (m) =>
          !(
            m.orientation === orientation &&
            (m.parentPocketId === targetPocket.id ||
              (orientation === 'vertical' &&
                m.spanStart !== undefined &&
                Math.abs(m.spanStart - targetPocket.y) < 20 &&
                m.spanEnd !== undefined &&
                Math.abs(m.spanEnd - (targetPocket.y + targetPocket.height)) < 20 &&
                m.position >= targetPocket.x - 10 &&
                m.position <= targetPocket.x + targetPocket.width + 10) ||
              (orientation === 'horizontal' &&
                m.spanStart !== undefined &&
                Math.abs(m.spanStart - targetPocket.x) < 20 &&
                m.spanEnd !== undefined &&
                Math.abs(m.spanEnd - (targetPocket.x + targetPocket.width)) < 20 &&
                m.position >= targetPocket.y - 10 &&
                m.position <= targetPocket.y + targetPocket.height + 10))
          )
      );

      const fpw = frame.frameProfileWidth || 60;
      if (orientation === 'vertical') {
        // If pocket spans practically the full width, align with whole frame equal divisions
        const isFullWidthPocket = targetPocket.width >= frame.width - 2 * fpw - 20;
        const segW = isFullWidthPocket ? frame.width / (count + 1) : targetPocket.width / (count + 1);
        for (let i = 0; i < count; i++) {
          const pos = isFullWidthPocket
            ? Math.round((i + 1) * segW)
            : Math.round(targetPocket.x + (i + 1) * segW);
          const newM: Mullion = {
            id: `mul-v-${Date.now()}-${i}`,
            orientation: 'vertical',
            position: pos,
            spanStart: targetPocket.y,
            spanEnd: targetPocket.y + targetPocket.height,
            parentPocketId: targetPocket.id,
          };
          updatedMullions.push(newM);
        }
      } else {
        // If pocket spans practically the full height, align with whole frame equal divisions
        const isFullHeightPocket = targetPocket.height >= frame.height - 2 * fpw - 20;
        const segH = isFullHeightPocket ? frame.height / (count + 1) : targetPocket.height / (count + 1);
        for (let j = 0; j < count; j++) {
          const pos = isFullHeightPocket
            ? Math.round((j + 1) * segH)
            : Math.round(targetPocket.y + (j + 1) * segH);
          const newM: Mullion = {
            id: `mul-h-${Date.now()}-${j}`,
            orientation: 'horizontal',
            position: pos,
            spanStart: targetPocket.x,
            spanEnd: targetPocket.x + targetPocket.width,
            parentPocketId: targetPocket.id,
          };
          updatedMullions.push(newM);
        }
      }
    } else {
      // Global full-frame mullions:
      // Completely remove ALL existing mullions of this orientation from the frame
      // so the entire window is divided cleanly into exact equal bays
      updatedMullions = updatedMullions.filter((m) => m.orientation !== orientation);

      if (orientation === 'vertical') {
        const segW = frame.width / (count + 1);
        for (let i = 0; i < count; i++) {
          const pos = Math.round((i + 1) * segW);
          const newM: Mullion = {
            id: `mul-v-${Date.now()}-${i}`,
            orientation: 'vertical',
            position: pos,
          };
          updatedMullions.push(newM);
        }
      } else {
        const segH = frame.height / (count + 1);
        for (let j = 0; j < count; j++) {
          const pos = Math.round((j + 1) * segH);
          const newM: Mullion = {
            id: `mul-h-${Date.now()}-${j}`,
            orientation: 'horizontal',
            position: pos,
          };
          updatedMullions.push(newM);
        }
      }
    }

    const updatedFrame: UPVCFrame = {
      ...frame,
      mullions: updatedMullions,
    };
    updatedFrame.pockets = recalculateFramePockets(updatedFrame);

    const updatedFrames = project.frames.map((f) => (f.id === frame.id ? updatedFrame : f));
    updateProjectFrames(updatedFrames);
    setSelectedFrameId(frame.id);
    setSelectedPocketId(null);

    const toastMsg =
      lang === 'hi'
        ? `${count} ${orientation === 'vertical' ? 'खड़ा मुलियन' : 'आड़ा ट्रांसॉम'} सफलतापूर्बक जोड़े गए (${count + 1} बराबर खाने)`
        : `Added ${count} ${orientation === 'vertical' ? 'Vertical' : 'Horizontal'} Mullions (${count + 1} equal bays)`;
    setSaveToast(toastMsg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleMullionAction = (
    orientation:
      | 'vertical'
      | 'horizontal'
      | 'cross'
      | 'equalize'
      | 'left_third'
      | 'right_third'
      | 'top_third'
      | 'multi_vertical'
      | 'multi_horizontal'
  ) => {
    const targetFId = selectedFrameId || project.frames[0]?.id;
    if (!targetFId) return;
    const frame = project.frames.find((f) => f.id === targetFId);
    if (!frame) return;

    if (orientation === 'multi_vertical') {
      handleRequestMultipleMullions(targetFId, 'vertical', selectedPocketId);
    } else if (orientation === 'multi_horizontal') {
      handleRequestMultipleMullions(targetFId, 'horizontal', selectedPocketId);
    } else if (orientation === 'equalize') {
      handleEqualizeMullions();
    } else if (orientation === 'cross') {
      handleAddCrossMullion(targetFId);
    } else if (orientation === 'left_third') {
      handleAddMullionAtPosition(targetFId, 'vertical', Math.round(frame.width / 3));
    } else if (orientation === 'right_third') {
      handleAddMullionAtPosition(targetFId, 'vertical', Math.round((2 * frame.width) / 3));
    } else if (orientation === 'top_third') {
      handleAddMullionAtPosition(targetFId, 'horizontal', Math.round(frame.height / 3));
    } else {
      handleAddMullionAtPosition(targetFId, orientation);
    }
  };

  const handlePanelAction = (config: {
    glassType?: GlassType;
    sashType?: SashType;
    gridPattern?: GridPattern;
    georgianBar?: GeorgianBarConfig;
    hasMesh?: boolean;
  }) => {
    const targetFId = selectedFrameId || project.frames[0]?.id;
    if (!targetFId) return;
    const frame = project.frames.find((f) => f.id === targetFId);
    if (!frame) return;
    const targetPocketId = selectedPocketId || frame.pockets[0]?.id;
    if (targetPocketId) {
      handleUpdatePocketPanel(targetFId, targetPocketId, config);
    }
  };

  // 15.4 DORGEN / GEORGIAN BAR PROMPT HANDLERS
  const handleRequestGeorgianBarPrompt = (initialData?: {
    frameId?: string;
    pocketId?: string | null;
    pattern?: GridPattern;
    initialPattern?: GridPattern;
    color?: any;
    initialColor?: any;
    cols?: number;
    initialCols?: number;
    rows?: number;
    initialRows?: number;
  }) => {
    const targetFId = initialData?.frameId || selectedFrameId || project.frames[0]?.id;
    if (!targetFId) return;
    const frame = project.frames.find((f) => f.id === targetFId);
    if (!frame) return;
    const targetPId =
      initialData?.pocketId !== undefined
        ? initialData.pocketId
        : selectedPocketId || frame.pockets[0]?.id || null;

    const existingPkt = targetPId ? frame.pockets.find((p) => p.id === targetPId) : null;

    setGeorgianBarPrompt({
      frameId: targetFId,
      pocketId: targetPId,
      initialPattern:
        initialData?.pattern ||
        initialData?.initialPattern ||
        existingPkt?.gridPattern ||
        (frame as any)?.georgianBar?.pattern ||
        'georgian_2x2',
      initialColor:
        initialData?.color ||
        initialData?.initialColor ||
        existingPkt?.georgianBar?.color ||
        (frame as any)?.georgianBar?.color ||
        'gold',
      initialCols:
        initialData?.cols ||
        initialData?.initialCols ||
        existingPkt?.georgianBar?.cols ||
        2,
      initialRows:
        initialData?.rows ||
        initialData?.initialRows ||
        existingPkt?.georgianBar?.rows ||
        2,
    });
  };

  const handleConfirmGeorgianBar = (config: GeorgianBarConfig, scope: 'pocket' | 'frame') => {
    if (!georgianBarPrompt) return;
    const { frameId, pocketId } = georgianBarPrompt;
    const frame = project.frames.find((f) => f.id === frameId);
    if (!frame) return;

    if (scope === 'frame' || !pocketId) {
      // Apply to all pockets in frame
      const updatedPockets = (frame.pockets || []).map((pkt) => ({
        ...pkt,
        gridPattern: config.pattern || 'georgian_2x2',
        georgianBar: { ...config },
      }));
      const updatedFrame: UPVCFrame = {
        ...frame,
        pockets: updatedPockets,
        georgianBar: { ...config },
      };
      const updatedFrames = project.frames.map((f) => (f.id === frame.id ? updatedFrame : f));
      updateProjectFrames(updatedFrames);
    } else {
      // Apply to specific pocket
      handleUpdatePocketPanel(frameId, pocketId, {
        gridPattern: config.pattern || 'georgian_2x2',
        georgianBar: config,
      });
    }

    setGeorgianBarPrompt(null);
    const toastMsg =
      lang === 'hi'
        ? `डोरगन बार (${config.cols || 2}×${config.rows || 2} ${config.color || 'गोल्डन'}) सफलतापूर्वक लागू किया गया`
        : `Georgian Bar (${config.cols || 2}×${config.rows || 2} ${config.color || 'gold'}) applied successfully`;
    setSaveToast(toastMsg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // 15.5 FAN & AC SYSTEM ACTION HANDLER (Exhaust Fan, Window AC, Louvers, Transoms)
  const handleFanAcAction = (action: {
    type: 'fan' | 'ac' | 'top_fan_transom' | 'bottom_ac_transom';
    diameter?: number;
    fanPanelType?: string;
    fanHorizontalAlign?: 'left' | 'center' | 'right';
    acUnitType?: string;
    frameId?: string;
    pocketId?: string;
  }) => {
    const targetFId = action.frameId || selectedFrameId || project.frames[0]?.id;
    if (!targetFId) return;
    const frame = project.frames.find((f) => f.id === targetFId);
    if (!frame) return;

    const mpw = frame.mullionProfileWidth || 74;

    if (action.type === 'fan' && !action.fanHorizontalAlign) {
      setAppFanPrompt({
        frameId: targetFId,
        pocketId: action.pocketId || selectedPocketId || frame.pockets[0]?.id || '',
        diameter: action.diameter || 200,
        fanPanelType: (action.fanPanelType as any) || 'glass_hole',
        position: 'center',
      });
      return;
    }

    if (action.type === 'top_fan_transom') {
      // Create a top transom for exhaust fan / ventilation (350mm from top outer frame)
      const transomDist = Math.min(Math.round(frame.height * 0.4), Math.max(250, 350));
      const transomPos = Math.round(transomDist);

      const existingNear = frame.mullions.find(
        (m) => m.orientation === 'horizontal' && Math.abs(m.position - transomPos) < 100
      );

      let workingFrame = { ...frame };
      if (!existingNear) {
        const newMullion: Mullion = {
          id: `mul-h-fan-${Date.now()}`,
          orientation: 'horizontal',
          position: transomPos,
          width: mpw,
        };
        workingFrame.mullions = [...workingFrame.mullions, newMullion];
        workingFrame.pockets = recalculateFramePockets(workingFrame);
      }

      // Identify the top pocket (smallest Y)
      const targetPId = action.pocketId || selectedPocketId;
      const targetP = targetPId ? workingFrame.pockets.find((p) => p.id === targetPId) : null;

      let topPocket = workingFrame.pockets.find((p) => {
        if (targetP) {
          return p.y <= transomPos && Math.abs(p.x + p.width / 2 - (targetP.x + targetP.width / 2)) < 60;
        }
        return p.y <= transomPos;
      });

      if (!topPocket) {
        topPocket = workingFrame.pockets.reduce(
          (prev, curr) => (curr.y < prev.y ? curr : prev),
          workingFrame.pockets[0]
        );
      }

      if (topPocket) {
        const dia = action.diameter || 200;
        const pType = action.fanPanelType || 'glass_hole';
        const align = action.fanHorizontalAlign || 'center';
        workingFrame.pockets = workingFrame.pockets.map((p) => {
          if (p.id === topPocket!.id) {
            return {
              ...p,
              sashType: 'fan_provision' as SashType,
              hasFanCutout: true,
              fanCutoutDiameter: dia,
              fanPanelType: pType as any,
              fanHorizontalAlign: align,
              customLabel: `FAN Ø${dia} (${align.toUpperCase()})`,
            };
          }
          return p;
        });
        setSelectedPocketId(topPocket.id);
      }

      const updatedFrames = project.frames.map((f) => (f.id === frame.id ? workingFrame : f));
      updateProjectFrames(updatedFrames);
      setSelectedFrameId(workingFrame.id);
      setSaveToast(`Top Fan Transom (${transomPos}mm) & Exhaust Cutout applied`);
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    if (action.type === 'bottom_ac_transom') {
      // Create a bottom section for Window AC (450mm from bottom outer frame)
      const transomDistFromBottom = Math.min(Math.round(frame.height * 0.45), Math.max(350, 480));
      const transomPos = Math.round(frame.height - transomDistFromBottom);

      const existingNear = frame.mullions.find(
        (m) => m.orientation === 'horizontal' && Math.abs(m.position - transomPos) < 100
      );

      let workingFrame = { ...frame };
      if (!existingNear) {
        const newMullion: Mullion = {
          id: `mul-h-ac-${Date.now()}`,
          orientation: 'horizontal',
          position: transomPos,
          width: mpw,
        };
        workingFrame.mullions = [...workingFrame.mullions, newMullion];
        workingFrame.pockets = recalculateFramePockets(workingFrame);
      }

      // Identify the bottom pocket (largest Y)
      const targetPId = action.pocketId || selectedPocketId;
      const targetP = targetPId ? workingFrame.pockets.find((p) => p.id === targetPId) : null;

      let botPocket = workingFrame.pockets.find((p) => {
        if (targetP) {
          return p.y >= transomPos - 20 && Math.abs(p.x + p.width / 2 - (targetP.x + targetP.width / 2)) < 60;
        }
        return p.y >= transomPos - 20;
      });

      if (!botPocket) {
        botPocket = workingFrame.pockets.reduce(
          (prev, curr) => (curr.y > prev.y ? curr : prev),
          workingFrame.pockets[0]
        );
      }

      if (botPocket) {
        const acType = action.acUnitType || 'box_cutout';
        const sType: SashType =
          acType === 'louver' ? 'louver' : acType === 'insulated_panel' ? 'upvc_panel' : 'ac_provision';
        workingFrame.pockets = workingFrame.pockets.map((p) => {
          if (p.id === botPocket!.id) {
            return {
              ...p,
              sashType: sType,
              hasACLouver: true,
              acUnitType: acType as any,
              customLabel:
                acType === 'louver' ? 'LOUVER' : acType === 'insulated_panel' ? 'ACP AC' : 'AC UNIT',
            };
          }
          return p;
        });
        setSelectedPocketId(botPocket.id);
      }

      const updatedFrames = project.frames.map((f) => (f.id === frame.id ? workingFrame : f));
      updateProjectFrames(updatedFrames);
      setSelectedFrameId(workingFrame.id);
      setSaveToast(`Bottom AC Transom (${frame.height - transomPos}mm) & AC Casing applied`);
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    // Direct update on selected or target pocket for 'fan' or 'ac'
    const targetPocketId = action.pocketId || selectedPocketId || frame.pockets[0]?.id;
    if (!targetPocketId) return;

    const updatedPockets = frame.pockets.map((p) => {
      if (p.id === targetPocketId) {
        if (action.type === 'fan') {
          const dia = action.diameter || 200;
          const pType = action.fanPanelType || 'glass_hole';
          const align = action.fanHorizontalAlign || 'center';
          return {
            ...p,
            sashType: 'fan_provision' as SashType,
            hasFanCutout: true,
            fanCutoutDiameter: dia,
            fanPanelType: pType as any,
            fanHorizontalAlign: align,
            customLabel: `FAN Ø${dia} (${align.toUpperCase()})`,
          };
        } else {
          // AC
          const acType = action.acUnitType || 'box_cutout';
          const sType: SashType =
            acType === 'louver' ? 'louver' : acType === 'insulated_panel' ? 'upvc_panel' : 'ac_provision';
          return {
            ...p,
            sashType: sType,
            hasACLouver: true,
            acUnitType: acType as any,
            customLabel:
              acType === 'louver' ? 'LOUVER' : acType === 'insulated_panel' ? 'ACP AC' : 'AC UNIT',
          };
        }
      }
      return p;
    });

    const updatedFrame: UPVCFrame = {
      ...frame,
      pockets: updatedPockets,
    };

    const updatedFrames = project.frames.map((f) => (f.id === frame.id ? updatedFrame : f));
    updateProjectFrames(updatedFrames);
    setSelectedFrameId(frame.id);
    setSelectedPocketId(targetPocketId);
    const alignLabel = action.fanHorizontalAlign === 'left' ? ' (Left Side / बायां)' : action.fanHorizontalAlign === 'right' ? ' (Right Side / दायां)' : ' (Center / बीच में)';
    setSaveToast(
      action.type === 'fan'
        ? `Exhaust Fan Cutout (Ø${action.diameter || 200}mm)${alignLabel} Applied`
        : `Window AC / Ventilation Provision Applied`
    );
    setTimeout(() => setSaveToast(null), 2500);
  };

  // 15 MASTER SLIDING & COMBO DESIGNS APPLIER
  const handleSelectSlidingDesign = (
    design: SlidingDesignDef,
    customW?: number,
    customH?: number,
    mode: 'new_frame' | 'apply_to_selected' = 'apply_to_selected'
  ) => {
    const panelCount = design.panelOperations.length;
    const targetFrameId = mode === 'apply_to_selected' ? (selectedFrameId || project.frames[0]?.id) : null;
    const existingFrame = targetFrameId ? project.frames.find((f) => f.id === targetFrameId) : null;

    const frameWidth = customW || (existingFrame ? existingFrame.width : design.defaultWidth);
    const frameHeight = customH || (existingFrame ? existingFrame.height : design.defaultHeight);

    let newMullions: Mullion[] = [];
    if (!design.hasSubMullions) {
      const segmentW = frameWidth / panelCount;
      for (let i = 1; i < panelCount; i++) {
        newMullions.push({
          id: `mul-sl-${Date.now()}-${i}`,
          orientation: 'vertical',
          position: Math.round(segmentW * i),
          width: design.trackType === 'Combo' ? 50 : 16,
        });
      }
    }

    const frameId = existingFrame ? existingFrame.id : `frame-${Date.now()}`;
    const frameX = existingFrame ? existingFrame.x : 0;
    const frameY = existingFrame ? existingFrame.y : 0;

    const updatedFrame: UPVCFrame = {
      ...(existingFrame || {
        id: frameId,
        x: frameX,
        y: frameY,
        color: 'white',
        reinforcement: 'steel_1.5mm',
        drainageCaps: true,
        mullionProfileWidth: 16,
        sashProfileWidth: 62,
      }),
      id: frameId,
      name: `F${project.frames.length || 1} (${design.name})`,
      width: frameWidth,
      height: frameHeight,
      series: design.series,
      frameProfileWidth: design.trackType === '3-Track' ? 88 : 62,
      mullionProfileWidth: 16,
      hasCenterLock: design.hasCenterLock ?? false,
      mullions: newMullions,
      pockets: [],
    };

    if (design.customSetup) {
      design.customSetup(updatedFrame);
    } else {
      updatedFrame.pockets = recalculateFramePockets(updatedFrame);
      design.panelOperations.forEach((op, idx) => {
        if (updatedFrame.pockets[idx]) {
          updatedFrame.pockets[idx].sashType = op;
          updatedFrame.pockets[idx].glassType = 'clear_6mm';
          updatedFrame.pockets[idx].customLabel = design.sashLabels?.[idx] || `S${idx + 1}`;
          if (op === 'open_vent') {
            updatedFrame.pockets[idx].customLabel = 'OPEN';
          }
        }
      });
    }

    const updatedFrames = project.frames.some((f) => f.id === updatedFrame.id)
      ? project.frames.map((f) => (f.id === updatedFrame.id ? updatedFrame : f))
      : [...project.frames, updatedFrame];

    updateProjectFrames(updatedFrames);
    setSelectedFrameId(updatedFrame.id);
    setSelectedMullionId(null);
    setSelectedPocketId(null);
    setShowSlidingGallery(false);
    setSaveToast(`Applied #${design.number} (${design.catalogKey}): ${design.name}`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // 9. DELETE SELECTED
  const handleDeleteSelected = () => {
    if (selectedCouplingId) {
      const updatedCouplings = project.couplings.filter((c) => c.id !== selectedCouplingId);
      updateProjectFrames(project.frames, updatedCouplings);
      setSelectedCouplingId(null);
      setSaveToast('Coupling removed (कप्लिंग हटा दी गई)');
      return;
    }

    if (selectedMullionId && selectedFrameId) {
      const updatedFrames = project.frames.map((f) => {
        if (f.id === selectedFrameId) {
          const modMullions = f.mullions.filter((m) => m.id !== selectedMullionId);
          const modFrame = { ...f, mullions: modMullions };
          modFrame.pockets = recalculateFramePockets(modFrame);
          return modFrame;
        }
        return f;
      });
      updateProjectFrames(updatedFrames);
      setSelectedMullionId(null);
      setSaveToast('Mullion deleted (मुलियन हटाया गया)');
      return;
    }

    if (selectedPocketId && selectedFrameId) {
      // Reset pocket sash to fixed glass / clear mesh
      const updatedFrames = project.frames.map((f) => {
        if (f.id === selectedFrameId) {
          const modPockets = f.pockets.map((p) =>
            p.id === selectedPocketId
              ? { ...p, sashType: 'fixed' as const, hasMesh: false, gridPattern: 'none' as const }
              : p
          );
          return { ...f, pockets: modPockets };
        }
        return f;
      });
      updateProjectFrames(updatedFrames);
      setSelectedPocketId(null);
      setSaveToast('Bay reset to Fixed Glass (पल्ला रीसेट किया गया)');
      return;
    }

    if (selectedFrameId) {
      if (project.frames.length > 1) {
        const deletedFrame = project.frames.find((f) => f.id === selectedFrameId);
        const remainingFrames = project.frames.filter((f) => f.id !== selectedFrameId);
        const updatedCouplings = project.couplings.filter(
          (c) => c.sourceFrameId !== selectedFrameId && c.targetFrameId !== selectedFrameId
        );
        const finalFrames = remainingFrames.map((f, idx) => ({
          ...f,
          name: `F${idx + 1}`,
        }));
        updateProjectFrames(finalFrames, updatedCouplings);
        setSelectedFrameId(finalFrames[0]?.id || null);
        setSelectedPocketId(null);
        setSelectedMullionId(null);
        setSaveToast(`Frame ${deletedFrame?.name || ''} deleted (फ्रेम हटाया गया)`);
      } else {
        // Only 1 frame left: reset to clear clean frame
        const single = project.frames[0];
        const resetFrame: UPVCFrame = {
          ...single,
          mullions: [],
          pockets: [],
        };
        resetFrame.pockets = recalculateFramePockets(resetFrame);
        updateProjectFrames([resetFrame], []);
        setSelectedMullionId(null);
        setSelectedPocketId(null);
        setSaveToast('Frame reset to clean state (फ्रेम रीसेट किया गया)');
      }
    }
  };

  // 9. SAVE PROJECT TO LIBRARY, LOCALSTORAGE & CUSTOMER HUB
  const handleSaveProject = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(project));

      // Also update saved projects library
      const rawLib = localStorage.getItem(SAVED_DESIGNS_KEY);
      let list: UPVCProject[] = rawLib ? JSON.parse(rawLib) : [];
      const existingIdx = list.findIndex((p) => p.id === project.id);
      const projectToSave = {
        ...project,
        updatedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        list[existingIdx] = projectToSave;
      } else {
        list.unshift(projectToSave);
      }
      localStorage.setItem(SAVED_DESIGNS_KEY, JSON.stringify(list));

      // CRITICAL: If customer is active, save directly to this customer's design cards in localStorage!
      const effectiveCustomer = selectedCustomer || (customers.length > 0 ? customers[0] : null);
      if (effectiveCustomer) {
        const custStorageKey = `upvc_cust_designs_${effectiveCustomer.id}`;
        let custDesigns: any[] = [];
        try {
          const rawCust = localStorage.getItem(custStorageKey);
          if (rawCust) custDesigns = JSON.parse(rawCust);
        } catch (e) {}

        if (!Array.isArray(custDesigns)) {
          custDesigns = [];
        }

        const bounds = calculateAssemblyBounds(project.frames || []);
        const totalW = bounds.totalWidth || project.frames[0]?.width || 1000;
        const totalH = bounds.totalHeight || project.frames[0]?.height || 1000;
        const totalAreaSqM = (totalW * totalH) / 1000000;
        const totalAreaSqFt = totalAreaSqM * 10.7639;
        const estRate = Math.round(totalAreaSqFt * 450 + (project.frames.length > 1 ? 2500 : 0));

        // Ensure all frames in project have valid pockets
        const framesWithPockets = (project.frames || []).map((f) => {
          const p = (!f.pockets || f.pockets.length === 0) ? recalculateFramePockets(f) : f.pockets;
          return {
            ...f,
            pockets: p,
          };
        });

        // Detect design type accurately
        const isSlider = framesWithPockets.some(
          (f) =>
            f.series?.toLowerCase().includes('sliding') ||
            f.pockets?.some((p) => p.sashType?.toLowerCase().includes('sliding') || p.sashType?.toLowerCase().includes('slider'))
        );
        const isDoor = framesWithPockets.some(
          (f) =>
            f.height >= 1900 ||
            f.series?.toLowerCase().includes('door') ||
            f.name.toLowerCase().includes('door')
        );
        const isCombination = framesWithPockets.length > 1;

        let detectedType = 'Casement';
        if (isCombination) {
          detectedType = isSlider ? 'Combination Slider' : 'Combination';
        } else if (isSlider) {
          detectedType = 'Sliding';
        } else if (isDoor) {
          detectedType = 'French Door';
        } else if (framesWithPockets.every((f) => f.pockets.every((p) => p.sashType === 'fixed'))) {
          detectedType = 'Fixed';
        }

        let targetIdx = -1;
        if (activeCustomerDesignId) {
          targetIdx = custDesigns.findIndex((d) => d.id === activeCustomerDesignId);
        }
        if (targetIdx === -1 && project.id) {
          targetIdx = custDesigns.findIndex((d) => d.projectData?.id === project.id);
        }
        if (targetIdx === -1 && project.referenceNo) {
          targetIdx = custDesigns.findIndex((d) => (d.tag || '').trim().toUpperCase() === (project.referenceNo || '').trim().toUpperCase());
        }

        if (targetIdx >= 0) {
          const currentItem = custDesigns[targetIdx];
          const updatedTag = project.referenceNo || currentItem.tag || `W${targetIdx + 1}`;
          const projectToSave = {
            ...project,
            referenceNo: updatedTag,
            frames: framesWithPockets,
          };

          custDesigns[targetIdx] = {
            ...currentItem,
            tag: updatedTag,
            type: detectedType,
            seriesName: project.frames[0]?.series || currentItem.seriesName,
            width: totalW,
            height: totalH,
            unitPrice: estRate,
            totalPrice: estRate * (currentItem.quantity || 1),
            projectData: JSON.parse(JSON.stringify(projectToSave)),
            glassType: project.frames[0]?.pockets[0]?.glassType || currentItem.glassType || 'clear_6mm',
            profileColor: project.frames[0]?.color || currentItem.profileColor || 'white',
            floorDistance: floorDistance || currentItem.floorDistance || 900,
          };
          setActiveCustomerDesignId(currentItem.id);
        } else {
          const existingTags = new Set(custDesigns.map((d) => (d.tag || '').toUpperCase()));
          let nextIdx = custDesigns.length + 1;
          while (existingTags.has(`W${nextIdx}`) || existingTags.has(`D${nextIdx}`)) {
            nextIdx++;
          }
          const chosenTag = project.referenceNo && !existingTags.has(project.referenceNo.toUpperCase())
            ? project.referenceNo
            : `W${nextIdx}`;
          const newDesignId = `des_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

          const projectToSave = {
            ...project,
            referenceNo: chosenTag,
            frames: framesWithPockets,
          };

          const newDesignItem = {
            id: newDesignId,
            tag: chosenTag,
            type: detectedType,
            location: project.clientName || 'General',
            width: totalW,
            height: totalH,
            seriesName: project.frames[0]?.series || 'CASEMENT 60 SERIES',
            quantity: 1,
            unitPrice: estRate,
            totalPrice: estRate,
            projectData: JSON.parse(JSON.stringify(projectToSave)),
            glassType: project.frames[0]?.pockets[0]?.glassType || 'clear_6mm',
            profileColor: project.frames[0]?.color || 'white',
            floorDistance: floorDistance || 900,
          };
          custDesigns.push(newDesignItem);
          setActiveCustomerDesignId(newDesignId);
        }

        saveCustomerDesignsAndSync(effectiveCustomer.id, custDesigns, (updated) => {
          setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          if (selectedCustomer?.id === updated.id) {
            setSelectedCustomer(updated);
          }
        });

        if (!selectedCustomer) {
          setSelectedCustomer(effectiveCustomer);
        }
      }

      setSaveToast('Design saved successfully! (डिज़ाइन सुरक्षित हो गया)');
      // No intrusive popup needed per user requirement (POP KI JARURAT NHI H JAB SAVE PAR TIPU TO SAVE HO JAYE OR BACK AKE DEKHU TO DIKHE)
      setShowSaveConfirmModal(false);
      setTimeout(() => setSaveToast(null), 3000);
    } catch (e) {
      console.error('Error saving project:', e);
    }
  };

  // Dedicated 4-Panel Fix-Slide-Slide-Fix with Center Lock Loader (साइड FIX + बीच SLIDE + बीच में LOCK)
  const handleLoad4PanelFSSF = () => {
    const fssfTpl = TEMPLATES.find((t) => t.id === 'sliding_w_2track_4panel_fix_slide_slide_fix');
    if (fssfTpl) {
      const newProj = fssfTpl.getProject();
      newProj.id = `proj_${Date.now()}`;
      const effectiveCust = selectedCustomer || (customers.length > 0 ? customers[0] : null);
      newProj.clientName = effectiveCust ? effectiveCust.name : 'Main Hall / Balcony';
      pushState(newProj);
      setSelectedFrameId(newProj.frames[0]?.id || null);
      setSelectedMullionId(null);
      setSelectedPocketId(null);
      setSelectedCouplingId(null);
      setSaveToast('✓ 4-पैनल विंडो लोड हो गई (साइड FIX + बीच 2 SLIDE + बीच में LOCK)');
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // 10. NEW 1000x1000 DESIGN
  const handleNew1000Design = () => {
    const starterTpl = TEMPLATES.find((t) => t.id === 'starter_1000x1000') || TEMPLATES[0];
    const newProj = starterTpl.getProject();
    newProj.id = `proj_${Date.now()}`;
    const effectiveCust = selectedCustomer || (customers.length > 0 ? customers[0] : null);

    let nextNum = 1;
    if (effectiveCust) {
      const custStorageKey = `upvc_cust_designs_${effectiveCust.id}`;
      try {
        const rawCust = localStorage.getItem(custStorageKey);
        if (rawCust) {
          const list = JSON.parse(rawCust);
          if (Array.isArray(list)) nextNum = list.length + 1;
        }
      } catch (e) {}
    }

    const tag = `W${nextNum}`;
    newProj.name = `Window ${tag} (${effectiveCust ? effectiveCust.name : 'Standard'})`;
    newProj.referenceNo = tag;
    newProj.clientName = effectiveCust ? effectiveCust.name : 'Main Room';
    if (newProj.frames[0]) {
      newProj.frames[0].width = 1000;
      newProj.frames[0].height = 1000;
    }
    pushState(newProj);
    setSelectedFrameId(newProj.frames[0]?.id || null);
    setSelectedCouplingId(null);
    setSelectedMullionId(null);
    setSelectedPocketId(null);
    
    const newDesignId = `des-${Date.now()}`;
    setActiveCustomerDesignId(newDesignId);

    // Save directly into customer's design cards in localStorage so it's already recorded
    if (effectiveCust) {
      const custStorageKey = `upvc_cust_designs_${effectiveCust.id}`;
      let custDesigns: any[] = [];
      try {
        const rawCust = localStorage.getItem(custStorageKey);
        if (rawCust) custDesigns = JSON.parse(rawCust);
      } catch (e) {}
      if (!Array.isArray(custDesigns)) {
        custDesigns = [];
      }

      const newDesignItem = {
        id: newDesignId,
        tag,
        type: 'Casement',
        location: effectiveCust.name || 'No location',
        width: 1000,
        height: 1000,
        seriesName: `${(effectiveCust.brand || 'Duron').toUpperCase()} CASEMENT 60`,
        quantity: 1,
        unitPrice: 19000,
        totalPrice: 19000,
        projectData: JSON.parse(JSON.stringify(newProj)),
        glassType: 'clear_5mm',
        profileColor: 'white',
        floorDistance: 900,
      };

      custDesigns.push(newDesignItem);
      localStorage.setItem(custStorageKey, JSON.stringify(custDesigns));
      window.dispatchEvent(new CustomEvent('upvc_customer_designs_changed'));

      if (!selectedCustomer) {
        setSelectedCustomer(effectiveCust);
      }
    }

    setSaveToast('New 1000×1000mm Design created! (नया 1000×1000 फ्रेम तैयार)');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // 11. LOAD TEMPLATE OR SAVED PROJECT
  const handleLoadTemplate = (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const newProj = template.getProject();
      pushState(newProj);
      setSelectedFrameId(newProj.frames[0]?.id || null);
    }
  };

  const handleLoadSavedProject = (loadedProj: UPVCProject) => {
    pushState(loadedProj);
    setSelectedFrameId(loadedProj.frames[0]?.id || null);
    setSelectedCouplingId(null);
    setSelectedMullionId(null);
    setSelectedPocketId(null);
    setSaveToast(`Loaded: ${loadedProj.name || loadedProj.referenceNo}`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // 12. RESET / CLEAR PROJECT (1000x1000)
  const handleResetProject = () => {
    const starterTpl = TEMPLATES.find((t) => t.id === 'starter_1000x1000') || TEMPLATES[0];
    const clearedProj = starterTpl.getProject();
    clearedProj.id = `proj_${Date.now()}`;
    clearedProj.name = 'Window 1000×1000';
    clearedProj.referenceNo = 'W1';
    clearedProj.clientName = selectedCustomer ? selectedCustomer.name : 'Standard';
    if (clearedProj.frames[0]) {
      clearedProj.frames[0].width = 1000;
      clearedProj.frames[0].height = 1000;
    }
    pushState(clearedProj);
    setSelectedFrameId(clearedProj.frames[0]?.id || null);
    setSelectedCouplingId(null);
    setSelectedMullionId(null);
    setSelectedPocketId(null);

    // If currently editing an existing customer design in CAD, update that design
    if (activeCustomerDesignId && selectedCustomer) {
      const custStorageKey = `upvc_cust_designs_${selectedCustomer.id}`;
      try {
        const raw = localStorage.getItem(custStorageKey);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const updated = list.map((d: any) =>
              d.id === activeCustomerDesignId
                ? {
                    ...d,
                    width: 1000,
                    height: 1000,
                    projectData: JSON.parse(JSON.stringify(clearedProj)),
                  }
                : d
            );
            localStorage.setItem(custStorageKey, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('upvc_customer_designs_changed'));
          }
        }
      } catch (e) {}
    }

    setSaveToast('CAD Canvas Cleared to 1000×1000mm! (डिज़ाइन साफ़ हुआ)');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Customer Management Handlers
  const handleAddCustomer = (customerData: {
    name: string;
    phone: string;
    city: string;
    brand?: string;
    companyName?: string;
  }) => {
    const newCustId = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
    const newCustomer: CustomerRecord = {
      id: newCustId,
      name: customerData.name,
      phone: customerData.phone || '+91 98765 43210',
      city: customerData.city || 'Delhi',
      brand: customerData.brand || 'Duron',
      companyName: customerData.companyName || customerData.brand || 'Standard',
      status: 'active',
      approvalStatus: 'pending',
      designsCount: 0,
      qtyCount: 0,
      projectValue: 0,
      totalSpent: 0,
      totalProjects: 0,
      createdDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    // Initialize designs list as empty for new customer so no pre-made designs appear
    try {
      localStorage.setItem(`upvc_cust_designs_${newCustId}`, JSON.stringify([]));
    } catch (e) {}

    setCustomers((prev) => [newCustomer, ...prev]);

    // Automatically open this customer's design hub with empty designs & "+ Add Design" prompt
    setSelectedCustomer(newCustomer);
    setActiveCustomerDesignId(null);
    setSaveToast(`Customer "${newCustomer.name}" created! Opening design hub...`);
    setTimeout(() => setSaveToast(null), 3000);
    setCurrentScreen('customer_project');
  };

  const handleSelectCustomer = (customer: CustomerRecord) => {
    const synced = syncCustomerRecord(customer);
    setSelectedCustomer(synced);
    setSaveToast(`Opening ${customer.name}'s project designs`);
    setTimeout(() => setSaveToast(null), 2500);
    setCurrentScreen('customer_project');
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(null);
    }
    setSaveToast(`Customer removed`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleUpdateCustomerStatus = (customerId: string, status: 'pending' | 'approved' | 'rejected') => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, approvalStatus: status } : c))
    );
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer((prev) => (prev ? { ...prev, approvalStatus: status } : null));
    }
    setSaveToast(`Status updated to ${status}`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleApplyPaperScanProject = (newProject: UPVCProject) => {
    pushState(newProject);
    setSelectedFrameId(newProject.frames[0]?.id || null);
    setSelectedPocketId(null);
    setSelectedMullionId(null);
    setSelectedCouplingId(null);
    setShowPaperScanModal(false);
    setCurrentScreen('cad');
    setSaveToast(
      lang === 'hi'
        ? 'कागज़ के स्केच से CAD ड्रॉइंग सफलतापूर्वक लोड हो गई!'
        : 'Paper sketch CAD drawing loaded successfully!'
    );
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleQuickQuoteOpenInCAD = (width: number, height: number, type: string) => {
    const starterTpl = TEMPLATES.find((t) => t.id === 'starter_1000x1000') || TEMPLATES[0];
    const newProj = starterTpl.getProject();
    newProj.id = `proj_${Date.now()}`;
    newProj.name = `Quick Quote ${width}x${height}`;
    if (newProj.frames[0]) {
      newProj.frames[0].width = width;
      newProj.frames[0].height = height;
    }
    pushState(newProj);
    setSelectedFrameId(newProj.frames[0]?.id || null);
    setCurrentScreen('cad');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      {currentScreen === 'dashboard' ? (
        <DashboardHome
          onNavigateToCAD={handleNavigateToCAD}
          onOpenCustomers={() => setCurrentScreen('customers')}
          onOpenCustomerProject={handleSelectCustomer}
          onOpenInventory={() => setCurrentScreen('inventory')}
          onOpenCuttingList={handleOpenCuttingModal}
          onOpenQuotation={() => setShowQuotationModal(true)}
          onOpenWorkshopScan={() => setShowWorkshopScanModal(true)}
          onOpenPaymentLedger={() => setShowPaymentLedgerModal(true)}
          onOpenQuickQuote={() => setShowQuickQuoteModal(true)}
          onOpenPricingFormula={() => setCurrentScreen('pricing_formula')}
          onOpenSeriesSettings={() => setShowSeriesSettingsModal(true)}
          onOpenCompanyGst={() => setShowCompanyGstModal(true)}
          onOpenGuide={() => setShowGuideModal(true)}
          onOpenPaperScanBot={() => setShowPaperScanModal(true)}
          onNewDesign1000={() => {
            handleNew1000Design();
            setCurrentScreen('cad');
          }}
          projects={erpProjects}
          inventory={inventory}
          customers={customers}
          currentCADProject={project}
          lang={lang}
        />
      ) : currentScreen === 'customers' ? (
        <CustomersView
          customers={customers}
          onBack={() => setCurrentScreen('dashboard')}
          onAddCustomer={handleAddCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onUpdateCustomerStatus={handleUpdateCustomerStatus}
          onSelectCustomer={handleSelectCustomer}
          onEditCustomer={handleSelectCustomer}
        />
      ) : currentScreen === 'customer_project' && selectedCustomer ? (
        <CustomerProjectView
          customer={selectedCustomer}
          onBack={() => setCurrentScreen('customers')}
          onUpdateCustomer={(updated) => {
            setSelectedCustomer(updated);
            setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          }}
          onOpenDesignInCAD={(design) => {
            setActiveCustomerDesignId(design.id);
            const projCopy = JSON.parse(JSON.stringify(design.projectData));
            if (projCopy && projCopy.frames) {
              projCopy.frames = projCopy.frames.map((f: UPVCFrame) => {
                const isSliding =
                  f.series?.startsWith('sliding') ||
                  (f.pockets || []).some(
                    (p) => p.sashType && (p.sashType.startsWith('slider_') || p.sashType === 'mesh_sash')
                  );
                if (isSliding) {
                  return equalizeOrScaleFrameMullions(f, f.width, f.height);
                }
                return f;
              });
            }
            pushState(projCopy);
            setSelectedFrameId(projCopy.frames[0]?.id || null);
            setSelectedMullionId(null);
            setSelectedPocketId(null);
            setSelectedCouplingId(null);
            setSaveToast(`Loaded "${design.tag} - ${design.type}" into CAD`);
            setTimeout(() => setSaveToast(null), 2500);
            setCurrentScreen('cad');
          }}
          onOpenCuttingListModal={(proj) => {
            setProject(proj);
            setShowCuttingModal(true);
          }}
          onOpenQuotationModal={(proj, custDesigns) => {
            if (proj) setProject(proj);
            handleOpenQuotation(custDesigns);
          }}
          onOpen3DModal={(proj) => {
            setProject(proj);
            setShow3DModal(true);
          }}
          onOpenPaymentLedger={() => setShowPaymentLedgerModal(true)}
          onOpenPricingFormula={() => setCurrentScreen('pricing_formula')}
          onOpenQuickQuote={() => setShowQuickQuoteModal(true)}
          lang={lang}
        />
      ) : currentScreen === 'pricing_formula' ? (
        <PricingFormulaView
          customers={customers}
          selectedCustomer={selectedCustomer}
          onBack={() => {
            if (selectedCustomer) {
              setCurrentScreen('customer_project');
            } else {
              setCurrentScreen('dashboard');
            }
          }}
          onOpenDesigner={(designId) => {
            setCurrentScreen('cad');
          }}
          onUpdateDesigns={(updated) => {
            if (selectedCustomer) {
              try {
                localStorage.setItem(`upvc_cust_designs_${selectedCustomer.id}`, JSON.stringify(updated));
              } catch (e) {}
            }
          }}
          lang={lang}
        />
      ) : currentScreen === 'inventory' ? (
        <InventoryManager
          onBack={() => setCurrentScreen('dashboard')}
          lang={lang}
        />
      ) : (
        <>
          {/* ------------------------------------------------------------- */}
          {/* TOP HEADER BAR (Exact Design from Video) */}
          {/* ------------------------------------------------------------- */}
          <Navbar
            project={project}
            onUpdateProjectName={(name) => setProject((p) => ({ ...p, name }))}
            onUpdateRefNo={(referenceNo) => setProject((p) => ({ ...p, referenceNo }))}
            onUpdateLocation={(clientName) => setProject((p) => ({ ...p, clientName }))}
            onLoadTemplate={handleLoadTemplate}
            onNewDesign1000={handleNew1000Design}
            onLoad4PanelFSSF={handleLoad4PanelFSSF}
            onOpenSavedProjects={() => setShowSavedModal(true)}
            onResetProject={handleResetProject}
            onOpenGuide={() => setShowGuideModal(true)}
            onOpen3D={() => setShow3DModal(true)}
            onOpenCuttingList={handleOpenCuttingModal}
            onOpenQuotation={() => handleOpenQuotation()}
            onOpenExportDrawing={(mode) => {
              setExportInitialTab(mode || 'cad');
              setShowExportModal(true);
            }}
            onOpenSlidingGallery={() => setShowSlidingGallery(true)}
            lang={lang}
            setLang={setLang}
            onSaveProject={handleSaveProject}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onAutoAlignCoupledAssembly={handleAutoAlignCoupledAssembly}
            onOpenPaperScanBot={() => setShowPaperScanModal(true)}
            onBackToHome={() => setCurrentScreen('dashboard')}
            onBackToCustomerProject={() => {
              const targetCust = selectedCustomer || (customers.length > 0 ? customers[0] : null);
              if (targetCust) {
                setSelectedCustomer(targetCust);
              }
              handleSaveProject();
              setCurrentScreen('customer_project');
            }}
            customerName={(selectedCustomer || (customers.length > 0 ? customers[0] : undefined))?.name}
          />

          {/* ------------------------------------------------------------- */}
          {/* MAIN CAD WORKSPACE (Canvas + Left Toolbar + Sash Palette + Inspector) */}
          {/* ------------------------------------------------------------- */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Vertical CAD Tools Bar */}
            <Toolbar
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              onAddVerticalMullion={handleAddVerticalMullion}
              onAddHorizontalMullion={handleAddHorizontalMullion}
              onAddCoupledFrame={() => handleSplitFrameVertical()}
              onAddNewFrame={() => handleSplitFrameHorizontal()}
              onNewDesign1000={handleNew1000Design}
              onLoad4PanelFSSF={handleLoad4PanelFSSF}
              onEqualizeMullions={handleEqualizeMullions}
              onDeleteSelected={handleDeleteSelected}
              hasSelection={!!(selectedFrameId || selectedMullionId || selectedPocketId || selectedCouplingId)}
              selectedType={
                selectedCouplingId
                  ? 'coupling'
                  : selectedPocketId
                  ? 'pocket'
                  : selectedMullionId
                  ? 'mullion'
                  : selectedFrameId
                  ? 'frame'
                  : null
              }
              currentColor={project.frames[0]?.color || 'white'}
              onSelectColor={(colorId) => {
                const updatedFrames = project.frames.map((f) => ({ ...f, color: colorId }));
                updateProjectFrames(updatedFrames);
              }}
              showSashPalette={showSashPalette}
              onToggleSashPalette={() => setShowSashPalette(!showSashPalette)}
              activeCategoryTab={activeCategoryTab}
              onSelectCategoryTab={(cat) => {
                setActiveCategoryTab(cat);
                setShowSashPalette(true);
              }}
              onOpenCuttingList={handleOpenCuttingModal}
              onCloseSashPalette={() => setShowSashPalette(false)}
              onOpenPaperScanBot={() => setShowPaperScanModal(true)}
              lang={lang}
            />

            {/* Categorized 5-Tab Palette (Casement, Sliding, Panels, Coupling, Mullions) */}
            {showSashPalette && (
              <SashTypesPalette
                onSelectSashType={handlePaletteSelectSash}
                onSelectCouplingAction={handleCouplingAction}
                onSelectMullionAction={handleMullionAction}
                onSelectPanelAction={handlePanelAction}
                onSelectFanAcAction={handleFanAcAction}
                onOpenSlidingGallery={() => setShowSlidingGallery(true)}
                onClose={() => setShowSashPalette(false)}
                activeCategoryTab={activeCategoryTab}
                activeCategory={activeCategoryTab}
                onCategoryChange={setActiveCategoryTab}
                hasSelectedPocket={!!selectedPocketId}
                selectedSashType={
                  selectedPocketId
                    ? project.frames
                        .find((f) => f.id === selectedFrameId)
                        ?.pockets.find((p) => p.id === selectedPocketId)?.sashType
                    : null
                }
                onRequestGeorgianBarPrompt={handleRequestGeorgianBarPrompt}
              />
            )}

            {/* CAD Canvas Engine */}
            <div className="flex-1 h-full relative">
              <CadCanvas
                frames={project.frames}
                couplings={project.couplings}
                selectedFrameId={selectedFrameId}
                selectedMullionId={selectedMullionId}
                selectedPocketId={selectedPocketId}
                selectedCouplingId={selectedCouplingId}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                onSelectFrame={(fId) => {
                  setSelectedFrameId(fId);
                }}
                onSelectMullion={(mId) => {
                  setSelectedMullionId(mId);
                }}
                onSelectPocket={(pId, targetMode) => {
                  setSelectedPocketId(pId);
                  setSelectedPocketTarget(targetMode || 'shutter');
                }}
                onSelectCoupling={(cId) => {
                  setSelectedCouplingId(cId);
                }}
                onUpdateCoupling={handleUpdateCoupling}
                onUpdateFrameDimension={handleUpdateFrameDimension}
                onUpdateTotalDimension={handleUpdateTotalDimension}
                onUpdateMullionPosition={handleUpdateMullionPosition}
                onSplitFrameHorizontal={handleSplitFrameHorizontal}
                onSplitFrameVertical={handleSplitFrameVertical}
                onUpdatePocketSash={handleUpdatePocketSash}
                onAddMullionAtPosition={handleAddMullionAtPosition}
                onAddCrossMullion={handleAddCrossMullion}
                onEqualizeMullions={handleEqualizeMullions}
                onRequestMultipleMullions={handleRequestMultipleMullions}
                onRequestGeorgianBarPrompt={handleRequestGeorgianBarPrompt}
                onUpdatePocketPanel={handleUpdatePocketPanel}
                onOpenPocketCustomizer={handleOpenPocketCustomizer}
                onUpdateFanAc={handleFanAcAction}
                zoom={zoom}
                setZoom={setZoom}
                lang={lang}
                viewMode={viewMode}
                setViewMode={setViewMode}
                floorDistance={floorDistance}
                setFloorDistance={setFloorDistance}
                couplerGap={couplerGap}
                setCouplerGap={setCouplerGap}
                onDeleteSelected={handleDeleteSelected}
                onOpenCuttingList={handleOpenCuttingModal}
                onClosePalette={() => setShowSashPalette(false)}
                onOpen3D={() => setShow3DModal(true)}
              />

              {/* Floating Quick Paper Scanner Bot Launch Button on Canvas */}
              <button
                onClick={() => setShowPaperScanModal(true)}
                className="absolute bottom-4 right-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-linear-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 border border-white/20 transition hover:scale-105 cursor-pointer group"
                title="Scan Paper / Hand Sketch into CAD without Tokens (कागज़ स्कैन कर CAD बनाएं)"
              >
                <div className="w-6 h-6 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition" />
                </div>
                <div className="text-left leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span>{lang === 'hi' ? 'कागज़ स्कैन AI' : 'Paper Scan AI'}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 text-[8px] font-black">
                      0 Token
                    </span>
                  </div>
                  <div className="text-[9px] text-indigo-100 font-normal">
                    {lang === 'hi' ? 'हाथ के स्केच से CAD' : 'Hand sketch to CAD'}
                  </div>
                </div>
              </button>
            </div>

            {/* Docked Properties Panel for selected Sash/Pocket or Frame */}
            {(() => {
              if (!selectedPocketId && !selectedFrameId) return null;
              const parentFrame =
                project.frames.find((f) =>
                  f.pockets.some((p) => p.id === selectedPocketId)
                ) ||
                (selectedFrameId ? project.frames.find((f) => f.id === selectedFrameId) : null) ||
                project.frames[0];
              if (!parentFrame) return null;
              const targetPocket =
                parentFrame.pockets.find((p) => p.id === selectedPocketId) ||
                parentFrame.pockets[0];
              if (!targetPocket) return null;

              return (
                <PocketCustomizationModal
                  isOpen={true}
                  isDocked={true}
                  frames={project.frames}
                  frame={parentFrame}
                  pocket={targetPocket}
                  selectedFrameId={parentFrame.id}
                  selectedPocketId={targetPocket.id}
                  onSelectFrame={(newFrameId) => {
                    setSelectedFrameId(newFrameId);
                    const targetF = project.frames.find((f) => f.id === newFrameId);
                    if (targetF && targetF.pockets.length > 0) {
                      setSelectedPocketId(targetF.pockets[0].id);
                    }
                  }}
                  onSelectPocket={(newPocketId) => {
                    setSelectedPocketId(newPocketId);
                  }}
                  initialTarget={selectedPocketTarget}
                  onSavePocket={(fId, updatedPocket) => {
                    handleSavePocketFromModal(fId, updatedPocket);
                  }}
                  onUpdateFrame={(updatedF) => {
                    const oldF = project.frames.find((f) => f.id === updatedF.id);
                    let finalF = updatedF;
                    if (oldF && (oldF.width !== updatedF.width || oldF.height !== updatedF.height)) {
                      finalF = equalizeOrScaleFrameMullions(
                        updatedF,
                        updatedF.width,
                        updatedF.height,
                        oldF.width,
                        oldF.height
                      );
                    }
                    const updatedFrames = project.frames.map((f) =>
                      f.id === finalF.id ? finalF : f
                    );
                    updateProjectFrames(updatedFrames);
                  }}
                  onClose={() => {
                    setSelectedPocketId(null);
                  }}
                  lang={lang}
                />
              );
            })()}
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}

      {/* Customers CRM Modal */}
      {showCustomersModal && (
        <CustomersModal
          isOpen={showCustomersModal}
          onClose={() => setShowCustomersModal(false)}
          customers={customers}
          onAddCustomer={handleAddCustomer}
          onSelectCustomerForProject={(c) => {
            setProject((p) => ({ ...p, clientName: c.name }));
            setCurrentScreen('cad');
          }}
          lang={lang}
        />
      )}

      {/* Raw Material Inventory Modal */}
      {showInventoryModal && (
        <InventoryModal
          isOpen={showInventoryModal}
          onClose={() => setShowInventoryModal(false)}
          inventory={inventory}
          onUpdateStock={handleUpdateStock}
          onOpenFullManager={() => setCurrentScreen('inventory')}
          lang={lang}
        />
      )}

      {/* Workshop Technical Scan Modal */}
      {showWorkshopScanModal && (
        <WorkshopScanModal
          isOpen={showWorkshopScanModal}
          onClose={() => setShowWorkshopScanModal(false)}
          project={project}
          lang={lang}
        />
      )}

      {/* Company GST & Logo Modal */}
      {showCompanyGstModal && (
        <CompanyGstModal
          isOpen={showCompanyGstModal}
          onClose={() => setShowCompanyGstModal(false)}
        />
      )}

      {/* Payment Ledger Modal */}
      {showPaymentLedgerModal && (
        <PaymentLedgerModal
          isOpen={showPaymentLedgerModal}
          onClose={() => setShowPaymentLedgerModal(false)}
          customers={customers}
        />
      )}

      {/* Quick Quote Modal */}
      {showQuickQuoteModal && (
        <QuickQuoteModal
          isOpen={showQuickQuoteModal}
          onClose={() => setShowQuickQuoteModal(false)}
          onOpenInCAD={handleQuickQuoteOpenInCAD}
        />
      )}

      {/* Pricing Formula Modal */}
      {showPricingFormulaModal && (
        <PricingFormulaModal
          isOpen={showPricingFormulaModal}
          onClose={() => setShowPricingFormulaModal(false)}
          pricingConfig={project.pricingConfig}
          onUpdateConfig={(pricing) => setProject((p) => ({ ...p, pricingConfig: pricing }))}
        />
      )}

      {/* Series Settings Modal */}
      {showSeriesSettingsModal && (
        <SeriesSettingsModal
          isOpen={showSeriesSettingsModal}
          onClose={() => setShowSeriesSettingsModal(false)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}

      {/* 3D Visualizer Modal */}
      {show3DModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>3D Architectural Visualizer</span>
              </h2>
              <button
                onClick={() => setShow3DModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 relative">
              <Canvas3D
                frames={project.frames}
                couplings={project.couplings}
                lang={lang}
                onUpdateCoupling={handleUpdateCoupling}
                onUpdateFrameDimension={handleUpdateFrameDimension}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cutting List Modal */}
      {showCuttingModal && (
        <CuttingListModal
          project={project}
          initialTab={cuttingModalTab}
          onClose={() => setShowCuttingModal(false)}
          lang={lang}
          onOpenInventory={() => setShowInventoryModal(true)}
        />
      )}

      {/* Quotation Modal */}
      {showQuotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
            <QuotationView
              project={project}
              customerDesigns={quotationCustomerDesigns}
              onUpdatePricing={(pricing) => setProject((p) => ({ ...p, pricingConfig: pricing }))}
              onUpdateProjectInfo={(clientName, refNo) => setProject((p) => ({ ...p, clientName, referenceNo: refNo }))}
              onClose={() => setShowQuotationModal(false)}
              lang={lang}
            />
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {showGuideModal && (
        <CouplingGuideModal
          onClose={() => setShowGuideModal(false)}
          lang={lang}
        />
      )}

      {/* Export & Technical CAD Drawing Modal */}
      {showExportModal && (
        <ExportDrawingModal
          project={project}
          initialTab={exportInitialTab}
          onBack={() => setShowExportModal(false)}
          lang={lang}
        />
      )}

      {/* Saved Projects Library Modal */}
      {showSavedModal && (
        <SavedProjectsModal
          currentProject={project}
          onLoadProject={(proj) => {
            handleLoadSavedProject(proj);
            setShowSavedModal(false);
          }}
          onNewDesign={() => {
            handleNew1000Design();
            setShowSavedModal(false);
          }}
          onClose={() => setShowSavedModal(false)}
          lang={lang}
        />
      )}

      {/* Master 15 Sliding Windows/Doors Visual Gallery Catalog Modal */}
      {showSlidingGallery && (
        <SlidingGalleryModal
          isOpen={showSlidingGallery}
          onClose={() => setShowSlidingGallery(false)}
          onSelectDesign={handleSelectSlidingDesign}
          selectedFrame={project.frames.find((f) => f.id === selectedFrameId) || project.frames[0]}
        />
      )}

      {/* Multiple Mullions Quantity Popup Modal */}
      {multiMullionModal.isOpen && (
        <MultipleMullionsModal
          isOpen={multiMullionModal.isOpen}
          onClose={() => setMultiMullionModal((prev) => ({ ...prev, isOpen: false }))}
          orientation={multiMullionModal.orientation}
          frameId={multiMullionModal.frameId}
          pocketId={multiMullionModal.pocketId}
          frameWidth={
            project.frames.find((f) => f.id === multiMullionModal.frameId)?.width || 1200
          }
          frameHeight={
            project.frames.find((f) => f.id === multiMullionModal.frameId)?.height || 1200
          }
          pocketWidth={
            project.frames
              .find((f) => f.id === multiMullionModal.frameId)
              ?.pockets?.find((p) => p.id === multiMullionModal.pocketId)?.width
          }
          pocketHeight={
            project.frames
              .find((f) => f.id === multiMullionModal.frameId)
              ?.pockets?.find((p) => p.id === multiMullionModal.pocketId)?.height
          }
          frameProfileWidth={
            project.frames.find((f) => f.id === multiMullionModal.frameId)?.frameProfileWidth || 60
          }
          mullionProfileWidth={
            project.frames.find((f) => f.id === multiMullionModal.frameId)?.mullionProfileWidth || 74
          }
          onConfirm={handleConfirmMultipleMullions}
          lang={lang}
        />
      )}

      {/* Save Confirmation Modal Popup */}
      <SaveConfirmationModal
        isOpen={showSaveConfirmModal}
        onClose={() => setShowSaveConfirmModal(false)}
        project={project}
        customerName={(selectedCustomer || (customers.length > 0 ? customers[0] : undefined))?.name}
        customerPhone={(selectedCustomer || (customers.length > 0 ? customers[0] : undefined))?.phone}
        onBackToCustomer={() => {
          const targetCust = selectedCustomer || (customers.length > 0 ? customers[0] : null);
          if (targetCust) {
            setSelectedCustomer(targetCust);
          }
          setShowSaveConfirmModal(false);
          setCurrentScreen('customer_project');
        }}
        onOpenCuttingList={handleOpenCuttingModal}
        onOpenQuotation={() => setShowQuotationModal(true)}
        lang={lang}
      />

      {/* Paper-to-CAD Scanner Bot Modal (100% Client-side, Token-Free) */}
      {showPaperScanModal && (
        <PaperScanCadModal
          isOpen={showPaperScanModal}
          onClose={() => setShowPaperScanModal(false)}
          onApplyProject={handleApplyPaperScanProject}
          onOpen3D={() => {
            setShowPaperScanModal(false);
            setShow3DModal(true);
          }}
          onOpenCuttingList={() => {
            setShowPaperScanModal(false);
            handleOpenCuttingModal();
          }}
          onOpenQuotation={() => {
            setShowPaperScanModal(false);
            handleOpenQuotation();
          }}
          lang={lang}
        />
      )}

      {/* Save Toast */}
      {saveToast && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-4">
          <Check className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Exhaust Fan Cutout Position (Left, Center, Right) Selection Prompt Modal */}
      <FanPositionModal
        isOpen={!!appFanPrompt}
        initialConfig={appFanPrompt}
        lang={lang}
        onConfirm={(cfg) => {
          handleFanAcAction({
            type: 'fan',
            diameter: cfg.diameter,
            fanPanelType: cfg.fanPanelType,
            fanHorizontalAlign: cfg.position,
            frameId: cfg.frameId,
            pocketId: cfg.pocketId,
          });
          setAppFanPrompt(null);
        }}
        onCancel={() => setAppFanPrompt(null)}
      />

      {/* Georgian / Dorgen Bar Grid Customizer Modal (Vertical, Horizontal & Color) */}
      <GeorgianBarCustomizerModal
        isOpen={!!georgianBarPrompt}
        data={georgianBarPrompt}
        lang={lang}
        onConfirm={handleConfirmGeorgianBar}
        onClose={() => setGeorgianBarPrompt(null)}
      />

      {/* Offline Connectivity Toast Indicator */}
      <OfflineIndicator />
    </div>
  );
}
