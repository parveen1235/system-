export type Orientation = 'vertical' | 'horizontal';

export type SashType = 
  | 'fixed'
  | 'casement'
  | 'casement_left'
  | 'casement_right'
  | 'casement_door_4side'
  | 'casement_door_3side'
  | 'top_hung'
  | 'bottom_hung'
  | 'french_open'
  | 'tilt_turn'
  | 'slider_arrow_right'
  | 'slider_arrow_left'
  | 'slider_arrow_both'
  | 'slider_fixed_center'
  | 'slider_2s'
  | 'slider_2s_xo'
  | 'slider_2s_ox'
  | 'slider_2s_xx'
  | 'slider_3t_2p_mesh'
  | 'slider_2s_with_mesh'
  | 'slider_3s_mesh'
  | 'slider_3s'
  | 'slider_3s_xoo'
  | 'slider_3s_oxo'
  | 'slider_3s_xxx'
  | 'slider_4s'
  | 'slider_4s_oxxo'
  | 'slider_4s_xxxx'
  | 'slider_5s_fixed_center'
  | 'slider_5s_multi'
  | 'slider_6s_meeting'
  | 'slider_6s_multi'
  | 'slider_3t_6p_4g2m'
  | 'slider_7s_multi'
  | 'slider_8s_meeting'
  | 'slider_8s_multi'
  | 'slider_10s_meeting'
  | 'slider_12s_meeting'
  | 'louver'
  | 'upvc_panel'
  | 'mesh_sash'
  | 'mesh_slider_right'
  | 'mesh_slider_left'
  | 'open_vent'
  | 'ac_provision'
  | 'fan_provision'
  | 'window_ac'
  | 'exhaust_fan'
  | 'fan_vent'
  | 'bottom_ac_transom'
  | 'ac_unit';

export type GlassType =
  | 'clear_5mm'
  | 'clear_6mm'
  | 'clear_8mm'
  | 'clear_10mm'
  | 'clear_12mm'
  | 'dgu_5_12_5'
  | 'dgu_6_16_6'
  | 'dgu_5_10_5'
  | 'dgu_30mm'
  | 'laminated_11_52'
  | 'laminated_13_52'
  | 'frosted'
  | 'tint_bronze'
  | 'tint_green'
  | 'tint_blue'
  | 'tint_grey'
  | 'low_e'
  | 'reflective_mirror'
  | 'pinhead';

export type GridPattern =
  | 'none'
  | 'georgian_2x2'
  | 'georgian_2x3'
  | 'georgian_3x2'
  | 'georgian_3x3'
  | 'georgian_3x4'
  | 'georgian_4x4'
  | 'georgian_colonial'
  | 'georgian_prairie'
  | 'georgian_diamond'
  | 'custom';

export type GeorgianBarColor = 'gold' | 'white' | 'black' | 'silver' | 'bronze' | 'match_frame';
export type GeorgianBarStyle = 'internal' | 'surface_astragal';

export interface GeorgianBarConfig {
  enabled?: boolean;
  pattern: GridPattern;
  rows?: number; // count of horizontal glass rows (e.g. 2, 3, 4)
  cols?: number; // count of vertical glass columns (e.g. 2, 3, 4)
  barWidth?: number; // in mm: 18, 25, 45 (default 18 or 25)
  color?: GeorgianBarColor;
  customColorHex?: string;
  style?: GeorgianBarStyle; // 'internal' inside DGU unit or 'surface_astragal' stick-on
}

export type CouplerType = 
  | 'flat_2mm' 
  | 'box_profile' 
  | 'h_coupler' 
  | 'corner_90' 
  | 'corner_135' 
  | 'variable_bay_pole';

export interface UPVCColor {
  id: string;
  name: string;
  nameHindi: string;
  hex: string;
  borderHex: string;
  innerShade: string;
  texture?: 'smooth' | 'woodgrain';
}

export interface Mullion {
  id: string;
  orientation: Orientation;
  /**
   * Position in mm.
   * If orientation === 'vertical', offset from Frame's left edge to mullion center.
   * If orientation === 'horizontal', offset from Frame's top edge to mullion center.
   */
  position: number;
  /**
   * If specified, restricts this mullion to a sub-pocket (T-Mullion).
   * If undefined/null, spans the entire frame.
   */
  parentPocketId?: string;
  /**
   * Span boundaries for partial / T-mullions (e.g. Y range for vertical sub-mullion, X range for horizontal).
   */
  spanStart?: number;
  spanEnd?: number;
  /**
   * Custom width if different from frame's default mullion profile width (default ~74mm)
   */
  width?: number;
}

export interface FramePocket {
  id: string;
  frameId: string;
  x: number; // inner mm relative to frame (excluding outer profile)
  y: number; // inner mm relative to frame (excluding outer profile)
  width: number; // inner mm width
  height: number; // inner mm height
  sashType: SashType;
  glassType: GlassType;
  glassName?: string;
  gridPattern: GridPattern;
  georgianBar?: GeorgianBarConfig;
  openDirection?: 'out' | 'in'; // Casement opening direction: 'out' (Outward / बाहर - Dashed Line) or 'in' (Inward / अंदर - Solid Line)
  cornerCode?: string; // Corner indicator code, e.g. 'F1'
  hasCenterLock?: boolean; // Center meeting stile crescent lock (बीच का लॉक)
  handlePosition?: 'left' | 'right' | 'center' | 'bottom' | 'top';
  handleColor?: 'silver' | 'black' | 'white' | 'gold';
  handleType?: 
    | 'cockspur_right'
    | 'cockspur_left'
    | 'cockspur_handle'
    | 'espag_key'
    | 'espag_no_key'
    | 'door_double_side'
    | 'door_double_side_key'
    | 'dummy_handle'
    | 'door_lock_set'
    | 'mortise_lock_set'
    | 'sliding_touch_left'
    | 'sliding_touch_right'
    | 'sliding_pop_key'
    | 'sliding_d_pull'
    | 'sliding_flush'
    | 'crescent_lock'
    | 'espag'
    | 'touch_lock'
    | 'door_lever'
    | 'modern_square_lever'
    | 'pop_up'
    | 'top_bottom_cockspur'
    | 'hopper_catch'
    | 'casement_espag'
    | 'none'
    | string;
  sashProfileCode?: 'CWH 60-03' | 'CWH 60-04' | 'CWH 60-06' | 'CWH 60-07' | 'CWH 60-12' | 'standard' | string;
  beadProfileCode?: string;
  seriesCode?: string;
  frameProfileCode?: string;
  handleCode?: string; // e.g. UPVC-HW-CHR, UPVC-HW-SCEHKEY
  handleHeight?: number; // GHH in mm, e.g. 721mm for window, 1000mm for door
  sashLabel?: string; // e.g. S1, S2, S3, M1
  hasMesh?: boolean;
  hasFanCutout?: boolean; // Exhaust fan cutout plate
  fanCutoutDiameter?: 150 | 200 | 250 | 300 | number; // 150mm (6"), 200mm (8"), 250mm (10"), 300mm (12")
  fanPanelType?: 'glass_hole' | 'pvc_sheet' | 'louver_hole'; // Glass cutout with acrylic ring, PVC sandwich sheet, or louver blades
  fanHorizontalAlign?: 'left' | 'center' | 'right'; // Horizontal position: Left side, Center, or Right side
  hasACLouver?: boolean; // AC Louver blades or AC Unit provision
  acUnitType?: 'box_cutout' | 'louver' | 'insulated_panel'; // Window AC casing box, ventilation louvers, or insulated sandwich panel
  acWidth?: number; // AC box mm width
  acHeight?: number; // AC box mm height
  hasGrill?: boolean; // Internal MS/SS Security Grill
  grillPattern?: string;
  grillMaterial?: string;
  hasKeyLock?: boolean; // Cylinder / Key lock enabled
  applicationType?: 'window' | 'door'; // Window or Door classification
  rollerType?: string; // e.g. single_nylon, double_tandem, heavy_steel, fly_mesh_roller
  hingeType?: string; // e.g. friction_stay_12, 3d_hinge, flag_hinge, butt_hinge
  stayType?: string; // e.g. 10_inch, 12_inch, 16_inch, 24_inch_door, 3d_hinges
  espagType?: '400mm' | '800mm' | '1200mm' | '1600mm' | '1800mm_door_cylinder' | string;
  lockType?: 'touch_lock_left' | 'touch_lock_right' | 'pop_up_key' | 'multi_point_door' | 'mortise_cylinder' | string;
  sashProfileTop?: string;
  sashProfileBottom?: string;
  sashProfileLeft?: string;
  sashProfileRight?: string;
  reinforcementCavity?: string;
  tLockType?: string;
  shutterHingeType?: string;
  isThreeSidedFrame?: boolean; // 3-sided frame (No bottom frame profile / threshold open)
  frameSides?: '4_side' | '3_side';
  notes?: string;
  customLabel?: string;
}

export interface UPVCFrame {
  id: string;
  name: string;
  width: number; // outer width in mm (e.g. 1200)
  height: number; // outer height in mm (e.g. 1500)
  x: number; // absolute canvas position in mm
  y: number; // absolute canvas position in mm
  series: 'casement_60' | 'casement_70' | 'sliding_62' | 'sliding_88' | 'sliding_3track' | 'door_premium';
  seriesCode?: string; // e.g. CWH-60, CWH-50, CWH-65, DURON-70
  frameProfileCode?: string; // e.g. CWH 60-01, CWH 60-02, CWH 60-08, SWH 60-01, SWH 60-02
  frameProfileWidth: number; // outer frame face width in mm (e.g. 60mm)
  mullionProfileWidth: number; // mullion face width in mm (e.g. 74mm)
  sashProfileWidth: number; // sash face width in mm (e.g. 60mm)
  sashProfileCode?: string; // e.g. SWH 60-04, SWH 60-03, CWH 60-03, CWH 60-06
  color: string; // color ID
  glassType?: GlassType;
  glassName?: string;
  mullions: Mullion[];
  pockets: FramePocket[];
  reinforcement: 'steel_1.2mm' | 'steel_1.5mm' | 'steel_2.0mm' | 'none';
  drainageCaps: boolean;
  hasCenterLock?: boolean; // Center meeting stile lock (बीच का लॉक) - default false unless explicitly enabled
  isThreeSidedFrame?: boolean; // 3-sided outer frame (no bottom frame piece for doors)
  frameSides?: '4_side' | '3_side';
  georgianBar?: GeorgianBarConfig;
}

export interface CouplingConnection {
  id: string;
  sourceFrameId: string; // Left/Top frame
  targetFrameId: string; // Right/Bottom frame
  direction: 'horizontal' | 'vertical'; // 'horizontal' means side-by-side (left to right), 'vertical' means stacked (top to bottom)
  gap: number; // Distance in mm (Default 2mm as requested)
  couplerType: CouplerType;
  couplerWidth: number; // Profile width if using box/H coupler (e.g. 2mm for expansion gap, 10mm for profile)
  alignment: 'top' | 'center' | 'bottom' | 'custom'; // For horizontal coupling vertical alignment
  yOffset?: number; // Custom mm offset for stepped window/doors
  angle?: number; // Bend / corner angle in degrees (e.g. 90°, 120°, 135°, 150°, 180°)
  bendDirection?: 'inward' | 'outward'; // Which way the frame turns (default: inward)
}

export interface UPVCProject {
  id: string;
  name: string;
  clientName?: string;
  referenceNo?: string;
  date: string;
  frames: UPVCFrame[];
  couplings: CouplingConnection[];
  pricingConfig: PricingConfig;
  notes?: string;
}

export type CADProject = UPVCProject;

export interface PricingConfig {
  currencySymbol: string;
  profileRatePerMeter: number; // in currency
  mullionRatePerMeter: number;
  sashRatePerMeter: number;
  couplerRatePerMeter: number;
  reinforcementRatePerMeter: number;
  glassRatePerSqMeter: Record<GlassType, number>;
  hardwareRates: {
    frictionStay: number;
    casementHandle: number;
    slidingRoller: number;
    slidingLock: number;
    espagMultiPoint: number;
    hinge: number;
    meshPerSqM: number;
    drainageCap: number;
    cornerCleat: number;
  };
  fabricationWastagePercent: number; // e.g. 10%
  laborCostPerSqM: number;
  taxPercent: number; // e.g. 18% GST
}

export interface CuttingItem {
  id: string;
  frameName: string;
  itemType: 'Outer Frame' | 'Mullion' | 'Transom' | 'Sash' | 'Coupler' | 'Reinforcement' | 'Glazing Bead' | 'Glass';
  tag: string; // e.g. F1-Top, M1-V, S1-Left, G1
  profileName: string;
  profileCode?: string; // e.g. CWH 60-01, CWH 60-03, SWH 60-02
  sashType?: string; // e.g. Casement Outward Left, 2-Track Slider, French Open, Fixed
  pocketLabel?: string; // e.g. Bay 1 [S1], Bay 2 [Fixed]
  length: number; // in mm
  width?: number; // for glass in mm
  height?: number; // for glass in mm
  quantity: number;
  cutAngleLeft: '45°' | '90°' | 'V-Notch';
  cutAngleRight: '45°' | '90°' | 'V-Notch';
  color: string;
  notes?: string;
  unitRate?: number;
  totalCost?: number;
  fromInventory?: boolean;
  ratePerKg?: number;
  weightPerMtr?: number;
  totalWeightKg?: number;
  rateFormula?: string;
  unit?: 'KG' | 'Mtr' | 'SQMT' | 'Pcs' | string;
}

export interface BOMItem {
  category: 'Profile' | 'Steel Reinforcement' | 'Glass' | 'Hardware' | 'Accessories' | 'Coupler';
  name: string;
  description: string;
  unit: 'meters' | 'sq.m' | 'sq.ft' | 'pcs' | 'kg' | 'sets';
  quantity: number;
  unitRate: number;
  totalAmount: number;
}

export interface ProductionReportProfileItem {
  id: string;
  description: string;
  itemCode: string;
  dimension: number;
  cutAngle: string;
  quantity: number;
  position?: 'W' | 'H' | 'V' | 'H-Mid' | string;
}

export interface ProductionReportReinforcementItem {
  id: string;
  description: string;
  itemCode: string;
  dimension: number;
  cutAngle: string;
  quantity: number;
  position?: 'W' | 'H' | 'V' | string;
}

export interface ProductionReportHardwareItem {
  id: string;
  description: string;
  itemCode: string;
  quantity: number;
  unit?: string;
  position?: string;
}

export interface ProductionReportScrewItem {
  id: string;
  description: string;
  itemCode: string;
  quantity: number;
}

export interface ProductionReportGasketItem {
  id: string;
  description: string;
  itemCode: string;
  dimension: number;
  quantity: number;
  position?: string;
}

export interface ProductionReportGlazingItem {
  id: string;
  description: string;
  width: number;
  height: number;
  quantity: number;
  position?: string;
  itemCode?: string;
}

export interface ProductionReportInstallationItem {
  id: string;
  description: string;
  itemCode: string;
  quantity: string | number;
}

export interface CostBreakupRow {
  id: string;
  category: 'Profile' | 'Reinforcement' | 'Fabrication Hardware' | 'Screws' | 'Installation Hardware' | 'Gasket and Woolpile' | 'Glazing';
  description: string;
  itemCode: string;
  qty: number;
  unit: 'KG' | 'Mtr' | 'Pcs' | 'CAN' | 'SQMT' | 'Set' | 'Pair' | string;
  rate: number;
  cost: number;
  fromInventory?: boolean;
  inventoryItemName?: string;
  inventoryStockQty?: number;
  rateFormula?: string;
  weightPerMtr?: number;
  totalWeightKg?: number;
}

export interface CostBreakupSummary {
  profileCost: number;
  profileWastagePercent: number; // e.g. 10%
  profileWastageCost: number;
  riCost: number;
  riWastagePercent: number; // e.g. 5%
  riWastageCost: number;
  hardwareCost: number;
  glassCost: number;
  glassWastagePercent: number; // e.g. 5%
  glassWastageCost: number;
  totalRawMaterialCost: number;
  fabricationLabourRate: number; // e.g. 20.00
  fabricationLabourCost: number;
  installationLabourRate: number; // e.g. 20.00
  installationLabourCost: number;
  subTotalIncludingLabour: number;
  profitPercent: number; // e.g. 10%
  profitCost: number;
  extraCost: number; // 0
  basicValue: number;
  discountPercent: number; // 0%
  discountAmount: number;
  subTotal: number;
  transportationCost: number; // e.g. 62.50
  loadingUnloadingCost: number; // e.g. 62.50
  totalAssemblyUnits?: number; // Total customer window count used for division
  transportTotalLump?: number; // Total lumpsum transport cost before division
  loadingTotalLump?: number; // Total lumpsum loading & unloading cost before division
  totalProjectCost: number;
  gstPercent: number; // e.g. 18%
  gstAmount: number;
  grandTotal: number;
}

export interface SingleFrameProductionReport {
  frameId: string;
  frame?: UPVCFrame;
  frames?: UPVCFrame[];
  couplings?: CouplingConnection[];
  designRef: string;
  projectName: string;
  projectCode: string;
  date: string;
  width: number;
  height: number;
  quantity: number;
  typologyType: string;
  location?: string;
  brand: string;
  series: string;
  profileFinish: string;
  handleDescription: string;
  shutterWeightKg: number;
  glassDescription: string;
  mesh: string;
  areaSqM: number;
  areaSqFt: number;
  profiles: ProductionReportProfileItem[];
  reinforcements: ProductionReportReinforcementItem[];
  hardwares: ProductionReportHardwareItem[];
  screws: ProductionReportScrewItem[];
  gaskets: ProductionReportGasketItem[];
  glazing: ProductionReportGlazingItem[];
  installation: ProductionReportInstallationItem[];
  costBreakupRows?: CostBreakupRow[];
  costSummary?: CostBreakupSummary;
}

export interface CustomerDesignCardItem {
  id: string;
  tag: string;
  designName?: string;
  floorNumber?: string;
  note?: string;
  type: string;
  location: string;
  width: number;
  height: number;
  seriesName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  projectData: UPVCProject;
  glassType?: GlassType;
  glassName?: string;
  profileColor?: string;
  floorDistance?: number;
}

