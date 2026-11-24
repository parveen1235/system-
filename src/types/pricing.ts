export type CalcType = 
  | 'CustomFormula' 
  | 'Percentage' 
  | 'AreaSqftFg' 
  | 'LumpSumDivideByArea' 
  | 'LumpSumDivideByQty' 
  | 'UserDefinedFGOverhead';

export type VisibilityType = 
  | 'Show in Quote Window' 
  | 'Do not show in Quote' 
  | 'Show in Quote Summary';

export interface CostHead {
  id: number;
  name: string;
  calcType: CalcType;
  rate: number;
  visibility: VisibilityType;
  value?: number; // Calculated live value
  notes?: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  price: number;
  category: 'Hardware' | 'Profile' | 'Glass' | 'Reinforcement' | 'Other';
  status: 'Active' | 'Inactive';
  weightPerMeter?: number; // kg/m
  weightPerSqMtr?: number;
  thickness?: number;
  color?: string;
  stock?: number;
}

export interface MaterialBOMItem {
  category: 'Profile' | 'Glass' | 'Reinforcement' | 'Hardware' | 'Accessories';
  subCategory?: string; // e.g. 'FRAME', 'SASH', 'MULLION', 'BEAD', 'GLASS', 'STEEL', 'HARDWARE'
  usedInWindows?: string[]; // e.g. ['W1', 'W2']
  type: string;
  code: string;
  name: string;
  spec?: string;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  parentProfileCutSize?: number;
  parentProfileName?: string;
  qtyPerSet: number;
  totalQty: number;
  panesCount?: number;
  areaSqft?: number;
  totalLengthMtr?: number;
  unit: string;
  weightPerMeter?: number; // kg/m
  weightPerPiece?: number; // kg
  totalWeightKg?: number; // kg
  ratePerKg?: number; // ₹/kg
  unitRate: number; // ₹/unit
  ratePerPiece: number;
  totalPrice: number;
}

export interface DetailedBOMResult {
  items: MaterialBOMItem[];
  profileItems: MaterialBOMItem[];
  glassItems: MaterialBOMItem[];
  steelItems: MaterialBOMItem[];
  hardwareItems: MaterialBOMItem[];
  accessoryItems: MaterialBOMItem[];
  totals: {
    unitProfileCost?: number;
    unitSteelCost?: number;
    unitGlassCost?: number;
    unitHardwareCost?: number;
    unitAccessoryCost?: number;
    unitRawMaterialCost?: number;
    totalProfileWeightKg: number;
    totalSteelWeightKg: number;
    totalSteelMeters: number;
    profileCost: number;
    glassCost: number;
    steelCost: number;
    hardwareCost: number;
    accessoryCost: number;
    grandMaterialCost: number;
  };
}
