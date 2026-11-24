import { UPVCProject } from './upvc';

export interface ERPProjectRecord {
  id: string;
  projectName: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  siteLocation: string;
  date: string;
  windowCount: number;
  totalSqFt: number;
  totalSqM: number;
  status: 'draft' | 'quoted' | 'approved' | 'in_production' | 'completed';
  totalAmount: number;
  paidAmount?: number;
  profileSystem: 'upvc_60mm' | 'upvc_system_80' | 'upvc_slider_2.5track' | 'aluminium_thermal_break';
  brand: 'Prominance' | 'Deceuninck' | 'Duron' | 'Kommerling' | 'Alupure';
  notes?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'Outer Frame' | 'Mullion' | 'Sash' | 'Glass' | 'Hardware' | 'Steel Reinforcement' | 'Gasket & Consumables';
  brand: string;
  stockQty: number;
  unit: 'meters' | 'bars (6m)' | 'sq.m' | 'pcs' | 'kg' | 'rolls' | 'sets';
  reorderLevel: number;
  unitRate: number;
  totalValue: number;
  isLowStock: boolean;
}

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
  glassType?: string; // 'clear_6mm' | 'frosted_5mm' | 'tinted_bronze_6mm' | etc.
  glassName?: string; // e.g. '5mm Clear Float Glass', custom user glass name
  profileColor?: string; // 'white' | 'anthracite' | 'golden_oak' | etc.
  floorDistance?: number; // sill height from floor, e.g. 900
  projectData?: UPVCProject; // complete vector CAD frames and couplings data
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  city: string;
  address?: string;
  siteAddress?: string;
  gstNumber?: string;
  totalProjects: number;
  totalSpent: number;
  status: 'active' | 'lead' | 'vip';
  createdDate: string;
  designsCount?: number;
  qtyCount?: number;
  projectValue?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  brand?: string;
}
