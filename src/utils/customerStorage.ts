import { CustomerRecord, CustomerDesignCardItem } from '../types/erp';
import { UPVCFrame, UPVCProject, GlassType } from '../types/upvc';
import { CostHead } from '../types/pricing';
import {
  DEFAULT_PRICING_CONFIG,
  recalculateFramePockets,
  calculateAssemblyBounds,
  normalizeFrameColorId,
} from './upvcCalculations';
import {
  calculateQuotation,
  DEFAULT_COST_HEADS,
  DEFAULT_INVENTORY_ITEMS,
} from './pricing';

export const ERP_CUSTOMERS_STORAGE_KEY = 'upvc_erp_customers';

/**
 * Recalculate quotation and prices for a list of designs using current pricing config and inventory.
 */
export function recalculateCustomerDesigns(
  rawList: CustomerDesignCardItem[],
  customerId?: string
): CustomerDesignCardItem[] {
  let template = DEFAULT_COST_HEADS;
  if (typeof window !== 'undefined' && customerId) {
    try {
      const savedTemplate =
        localStorage.getItem(`upvc_pricing_template_${customerId}`) ||
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
  }

  let inventory = DEFAULT_INVENTORY_ITEMS;
  if (typeof window !== 'undefined' && customerId) {
    try {
      const savedInv = localStorage.getItem(`upvc_inventory_items_${customerId}`);
      if (savedInv) {
        const parsed = JSON.parse(savedInv);
        if (Array.isArray(parsed) && parsed.length > 0) inventory = parsed;
      }
    } catch (e) {}
  }

  const totalUnits = rawList.reduce((sum, d) => sum + (d.quantity || 1), 0);

  return rawList.map((d) => {
    const quote = calculateQuotation(d, template, inventory, totalUnits);
    const calculatedUnitTotal = Math.round(quote.find((q) => q.id === 21)?.value || d.unitPrice || 0);
    const qty = d.quantity || 1;
    return {
      ...d,
      unitPrice: calculatedUnitTotal,
      totalPrice: calculatedUnitTotal * qty,
    };
  });
}

/**
 * Generate initial sample designs for showcase customers (CUST-001, CUST-002)
 */
export const getInitialDesignsForCustomer = (
  customer: CustomerRecord | { id: string; name?: string; brand?: string }
): CustomerDesignCardItem[] => {
  const custName = customer.name || 'Client';

  // Arun Kumar (CUST-002) initial design
  if (customer.id === 'CUST-002') {
    const f: UPVCFrame = {
      id: `f-${customer.id}-W1`,
      name: 'F1',
      x: 0,
      y: 0,
      width: 1200,
      height: 1500,
      frameProfileWidth: 60,
      mullionProfileWidth: 74,
      sashProfileWidth: 60,
      color: 'white',
      series: 'casement_60',
      mullions: [{ id: `mul-W1`, orientation: 'vertical', position: 600 }],
      pockets: [],
      reinforcement: 'steel_1.5mm',
      drainageCaps: true,
    };
    f.pockets = recalculateFramePockets(f).map((pkt, idx) => ({
      ...pkt,
      sashType: idx === 0 ? 'casement_left' : 'casement_right',
      glassType: 'clear_6mm',
    }));

    const projectData: UPVCProject = {
      id: `proj_${customer.id}_W1`,
      name: `W1 2-Sash Casement`,
      clientName: custName,
      referenceNo: 'W1',
      date: new Date().toISOString(),
      frames: [f],
      couplings: [],
      pricingConfig: DEFAULT_PRICING_CONFIG,
    };

    return [
      {
        id: `des-${customer.id}-w1`,
        tag: 'W1',
        type: 'Casement',
        location: 'Hall',
        width: 1200,
        height: 1500,
        seriesName: 'PROMINANCE 60MM CASEMENT',
        quantity: 1,
        unitPrice: 19715,
        totalPrice: 19715,
        projectData,
        glassType: 'clear_6mm',
        profileColor: 'white',
        floorDistance: 900,
      },
    ];
  }

  // Rajmal Yadav (CUST-001) or other showcase customer: W10 down to W1
  const createSlidingCard = (
    tag: string,
    location: string,
    unitPrice: number,
    width = 1200,
    height = 1700
  ): CustomerDesignCardItem => {
    const f: UPVCFrame = {
      id: `f-${customer.id}-${tag}`,
      name: 'F1',
      x: 0,
      y: 0,
      width,
      height,
      frameProfileWidth: 60,
      mullionProfileWidth: 74,
      sashProfileWidth: 60,
      color: 'white',
      series: 'sliding_62',
      mullions: [{ id: `mul-${tag}`, orientation: 'vertical', position: Math.round(width / 2) }],
      pockets: [],
      reinforcement: 'steel_1.5mm',
      drainageCaps: true,
    };

    f.pockets = recalculateFramePockets(f).map((pkt, idx) => ({
      ...pkt,
      sashType: idx === 0 ? 'slider_arrow_right' : 'slider_arrow_left',
      glassType: 'clear_6mm',
    }));

    const projectData: UPVCProject = {
      id: `proj_${customer.id}_${tag}`,
      name: `${tag} 2-Track Slider`,
      clientName: custName,
      referenceNo: tag,
      date: new Date().toISOString(),
      frames: [f],
      couplings: [],
      pricingConfig: DEFAULT_PRICING_CONFIG,
    };

    return {
      id: `des-${customer.id}-${tag.toLowerCase()}`,
      tag,
      type: 'Sliding',
      location,
      width,
      height,
      seriesName: 'DURON 60MM SLIDING SERIES',
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
      projectData,
      glassType: 'clear_6mm',
      profileColor: 'white',
      floorDistance: 900,
    };
  };

  const rawList = [
    createSlidingCard('W10', 'Bed Room', 10745.54),
    createSlidingCard('W9', 'Bed Room', 10745.54),
    createSlidingCard('W8', 'Hall', 10745.54),
    createSlidingCard('W7', 'Dining', 10745.54),
    createSlidingCard('W6', 'Kitchen', 10745.54),
    createSlidingCard('W5', 'Room 1', 11609.06),
    createSlidingCard('W4', 'Room 2', 11609.06),
    createSlidingCard('W3', 'Balcony', 11609.06),
    createSlidingCard('W2', 'Study', 13638.11),
    createSlidingCard('W1', 'Foyer', 13638.11),
  ];

  return recalculateCustomerDesigns(rawList, customer.id);
};

/**
 * Auto-sanitizes customer designs to ensure all sliding windows have mathematically
 * equal bay spacing and aligned pockets, fixing legacy or unscaled mullions.
 */
export function sanitizeCustomerDesigns(list: CustomerDesignCardItem[]): CustomerDesignCardItem[] {
  return list.map((d) => {
    if (!d.projectData || !d.projectData.frames || d.projectData.frames.length === 0) return d;
    let modified = false;
    const frames = d.projectData.frames.map((f) => {
      let currentFrame = f;
      if (typeof currentFrame.color !== 'string' || !currentFrame.color) {
        modified = true;
        currentFrame = {
          ...currentFrame,
          color: normalizeFrameColorId(currentFrame.color, d.profileColor || 'white'),
        };
      }

      const isSliding =
        d.type?.toLowerCase().includes('sliding') ||
        currentFrame.series?.startsWith('sliding') ||
        (currentFrame.pockets || []).some(
          (p) => p.sashType && (p.sashType.startsWith('slider_') || p.sashType === 'mesh_sash')
        );

      if (isSliding && currentFrame.mullions && currentFrame.mullions.length > 0) {
        const vMulls = currentFrame.mullions.filter((m) => m.orientation === 'vertical');
        if (vMulls.length > 0) {
          const numPanels = Math.max(2, vMulls.length + 1);
          let mullChanged = false;
          const newMulls = currentFrame.mullions.map((m) => {
            if (m.orientation === 'vertical') {
              const idx = vMulls.findIndex((vm) => vm.id === m.id);
              if (idx >= 0) {
                const expectedPos = Number(((currentFrame.width / numPanels) * (idx + 1)).toFixed(1));
                if (Math.abs(m.position - expectedPos) > 0.5) {
                  mullChanged = true;
                  return { ...m, position: expectedPos };
                }
              }
            }
            return m;
          });

          if (mullChanged) {
            modified = true;
            const updatedF = { ...currentFrame, mullions: newMulls };
            updatedF.pockets = recalculateFramePockets(updatedF);
            return updatedF;
          }
        }
      }
      return currentFrame;
    });

    if (modified) {
      return {
        ...d,
        projectData: {
          ...d.projectData,
          frames,
        },
      };
    }
    return d;
  });
}

/**
 * Get all designs for a specific customer from localStorage, initializing if needed.
 */
export function getCustomerDesigns(
  customer: CustomerRecord | { id: string; name?: string; brand?: string }
): CustomerDesignCardItem[] {
  if (typeof window === 'undefined') return [];

  const storageKey = `upvc_cust_designs_${customer.id}`;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return sanitizeCustomerDesigns(parsed);
      }
    }
  } catch (e) {}

  // If uninitialized in localStorage:
  if (customer.id === 'CUST-001' || customer.id === 'CUST-002') {
    const initialList = sanitizeCustomerDesigns(getInitialDesignsForCustomer(customer));
    try {
      localStorage.setItem(storageKey, JSON.stringify(initialList));
    } catch (e) {}
    return initialList;
  }

  return [];
}

/**
 * Calculate totals across an array of designs.
 */
export function calculateCustomerTotals(designs: CustomerDesignCardItem[]): {
  totalAmount: number;
  designsCount: number;
  qtyCount: number;
} {
  const totalAmount = designs.reduce((sum, d) => {
    const p =
      d.totalPrice !== undefined && d.totalPrice !== null
        ? d.totalPrice
        : (d.unitPrice || 0) * (d.quantity || 1);
    return sum + p;
  }, 0);

  const designsCount = designs.length;
  const qtyCount = designs.reduce((sum, d) => sum + (d.quantity || 1), 0);

  return {
    totalAmount: Math.round(totalAmount),
    designsCount,
    qtyCount,
  };
}

/**
 * Compute the live summary (amount, designs count, quantity) for any customer.
 * This is the single source of truth for both CustomersView and CustomerProjectView.
 */
export function getCustomerSummary(
  customer: CustomerRecord | { id: string; name?: string; projectValue?: number; totalSpent?: number; designsCount?: number; qtyCount?: number }
): {
  totalAmount: number;
  designsCount: number;
  qtyCount: number;
} {
  if (typeof window === 'undefined') {
    return {
      totalAmount: customer.projectValue || customer.totalSpent || 0,
      designsCount: customer.designsCount || 0,
      qtyCount: customer.qtyCount || 0,
    };
  }

  const designs = getCustomerDesigns(customer);
  if (designs && designs.length > 0) {
    return calculateCustomerTotals(designs);
  }

  return {
    totalAmount: 0,
    designsCount: 0,
    qtyCount: 0,
  };
}

/**
 * Synchronize a single CustomerRecord with their actual designs in localStorage.
 */
export function syncCustomerRecord(customer: CustomerRecord): CustomerRecord {
  const summary = getCustomerSummary(customer);
  return {
    ...customer,
    projectValue: summary.totalAmount,
    totalSpent: summary.totalAmount,
    designsCount: summary.designsCount,
    qtyCount: summary.qtyCount,
    totalProjects: summary.designsCount > 0 ? summary.designsCount : customer.totalProjects || 0,
  };
}

/**
 * Synchronize all customers in the list with their designs in localStorage,
 * and persist back to localStorage.
 */
export function syncAllCustomers(customers: CustomerRecord[]): CustomerRecord[] {
  const synced = customers.map((c) => syncCustomerRecord(c));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ERP_CUSTOMERS_STORAGE_KEY, JSON.stringify(synced));
    } catch (e) {}
  }
  return synced;
}

/**
 * Save updated designs for a customer and immediately synchronize their CustomerRecord
 * in localStorage and notify all listeners.
 */
export function saveCustomerDesignsAndSync(
  customerId: string,
  designs: CustomerDesignCardItem[],
  onCustomerUpdated?: (updated: CustomerRecord) => void
): {
  totalAmount: number;
  designsCount: number;
  qtyCount: number;
} {
  const totals = calculateCustomerTotals(designs);

  if (typeof window !== 'undefined') {
    try {
      // 1. Save designs
      localStorage.setItem(`upvc_cust_designs_${customerId}`, JSON.stringify(designs));

      // 2. Update customer record in customers storage
      const rawCustomers = localStorage.getItem(ERP_CUSTOMERS_STORAGE_KEY);
      if (rawCustomers) {
        const parsed: CustomerRecord[] = JSON.parse(rawCustomers);
        if (Array.isArray(parsed)) {
          let updatedCust: CustomerRecord | null = null;
          const updatedList = parsed.map((c) => {
            if (c.id === customerId) {
              updatedCust = {
                ...c,
                projectValue: totals.totalAmount,
                totalSpent: totals.totalAmount,
                designsCount: totals.designsCount,
                qtyCount: totals.qtyCount,
                totalProjects: totals.designsCount > 0 ? totals.designsCount : c.totalProjects || 0,
              };
              return updatedCust;
            }
            return c;
          });

          localStorage.setItem(ERP_CUSTOMERS_STORAGE_KEY, JSON.stringify(updatedList));

          if (updatedCust && onCustomerUpdated) {
            onCustomerUpdated(updatedCust);
          }
        }
      }

      // 3. Dispatch global event so CustomersView and Dashboard immediately re-render
      window.dispatchEvent(
        new CustomEvent('upvc_customer_designs_changed', {
          detail: {
            customerId,
            totalAmount: totals.totalAmount,
            designsCount: totals.designsCount,
            qtyCount: totals.qtyCount,
          },
        })
      );
    } catch (e) {
      console.error('Error in saveCustomerDesignsAndSync:', e);
    }
  }

  return totals;
}
