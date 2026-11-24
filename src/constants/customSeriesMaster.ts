export interface SeriesFrameProfile {
  id: string;
  code: string;
  height: number;
  beadingSideHeight?: number;
  name?: string;
  weightKgPerM?: number;
}

export interface SeriesSashProfile {
  id: string;
  code: string;
  name: string;
  sashType: 'window' | 'door';
  realHeight: number; // e.g. 78, 71, 104, 70, 75, 80, 85
  beadingSideHeight: number; // e.g. 60, 53, 86, 52, 56
  weightKgPerM?: number;
}

export interface SeriesBeadingProfile {
  id: string;
  code: string;
  maxGlass: number; // e.g. 6, 8, 12, 24, 32
  name?: string;
}

export interface SeriesInterlock {
  id: string;
  code: string;
  name: string;
  heightOffset: number; // 0
  targetSash?: string;
}

export interface CustomSeries {
  id: string;
  name: string;
  brand: string;
  type: 'casement' | 'sliding';
  seriesHeight: number;
  frames: SeriesFrameProfile[];
  sashes: SeriesSashProfile[];
  mullions: string[];
  beading: SeriesBeadingProfile[];
  meshBeading?: SeriesBeadingProfile[];
  glassOffset1: number; // 6mm
  glassOffset2: number; // 4mm
  interlocks?: SeriesInterlock[];
}

export const STORAGE_KEY_CUSTOM_SERIES = 'upvc_custom_series_master_v1';
export const STORAGE_KEY_FABRICATION_RULES = 'upvc_fabrication_niyam_rules_v1';
export const STORAGE_KEY_PRICING_PIPELINE = 'upvc_pricing_pipeline_config_v1';

export const INITIAL_CUSTOM_SERIES: CustomSeries[] = [
  {
    id: 'casement-60',
    name: 'Casement 60 Series',
    brand: 'Duron',
    type: 'casement',
    seriesHeight: 60,
    frames: [
      { id: 'f1', code: 'CWH60-02', height: 60, beadingSideHeight: 60, name: 'Casement Outer Frame Heavy 60mm' },
      { id: 'f2', code: 'CWH60-01', height: 48, beadingSideHeight: 48, name: 'Casement Outer Frame 48mm' }
    ],
    sashes: [
      { id: 's1', code: 'CWH60-03', name: 'Casement Window Sash (Outward)', sashType: 'window', realHeight: 78, beadingSideHeight: 60 },
      { id: 's2', code: 'CWH60-04', name: 'Casement Window Sash (Inward)', sashType: 'window', realHeight: 71, beadingSideHeight: 53 },
      { id: 's3', code: 'CWH60-06', name: 'Casement Door Sash (Outward Heavy)', sashType: 'door', realHeight: 104, beadingSideHeight: 86 },
      { id: 's4', code: 'CWH60-07', name: 'Casement Door Sash (Inward Heavy)', sashType: 'door', realHeight: 104, beadingSideHeight: 86 }
    ],
    mullions: ['CWH60-05', 'CWH60-11'],
    beading: [
      { id: 'b1', code: 'CWH60-08', maxGlass: 8, name: 'Single Glass Bead 35.5mm (5-8mm)' },
      { id: 'b2', code: 'CWH60-09', maxGlass: 12, name: 'DGU Bead 28mm (10-12mm)' },
      { id: 'b3', code: 'CWH60-10', maxGlass: 24, name: 'Heavy DGU Bead 16mm (24mm)' }
    ],
    glassOffset1: 6,
    glassOffset2: 4
  },
  {
    id: 'sliding-60',
    name: 'Sliding 60 Series',
    brand: 'Duron',
    type: 'sliding',
    seriesHeight: 60,
    frames: [
      { id: 'sf1', code: 'SWH60-01', height: 44, name: 'Sliding Outer Frame 2-Track 60x52mm' },
      { id: 'sf2', code: 'SWH60-02', height: 44, name: 'Sliding Outer Frame 3-Track 60x112mm' }
    ],
    sashes: [
      { id: 'ss1', code: 'SWH60-03', name: 'Sliding Window Sash (Standard)', sashType: 'window', realHeight: 70, beadingSideHeight: 52 },
      { id: 'ss2', code: 'SWH60-04', name: 'Sliding Window Sash (Heavy)', sashType: 'window', realHeight: 75, beadingSideHeight: 56 },
      { id: 'ss3', code: 'SWH60-05', name: 'Sliding Door Sash (Standard)', sashType: 'door', realHeight: 80, beadingSideHeight: 60 },
      { id: 'ss4', code: 'SWH60-06', name: 'Sliding Door Sash (Heavy)', sashType: 'door', realHeight: 85, beadingSideHeight: 65 }
    ],
    mullions: ['FLY-MULLION', 'SWH60-17'],
    beading: [
      { id: 'sb1', code: 'SWH60-12', maxGlass: 6, name: 'Glazing Bead (5-6mm Single)' },
      { id: 'sb2', code: 'SWH60-18', maxGlass: 8, name: 'Glazing Bead (8mm Single)' },
      { id: 'sb3', code: 'SWH60-14', maxGlass: 12, name: 'Glazing Bead (10-12mm DGU)' },
      { id: 'sb4', code: 'SWH60-13', maxGlass: 32, name: 'Glazing Bead (24-32mm Heavy DGU)' }
    ],
    meshBeading: [
      { id: 'smb1', code: 'SWH60-12-MESH', maxGlass: 2, name: 'SS 304 Mesh Clamp Bead' },
      { id: 'smb2', code: 'SWH60-MBEAD', maxGlass: 2, name: 'Fiberglass Spline Bead' }
    ],
    glassOffset1: 6,
    glassOffset2: 4,
    interlocks: [
      { id: 'int1', code: 'SWH 60-08', name: 'Interlock Profile (Standard 45x31.5mm)', heightOffset: 0, targetSash: 'SWH60-03' },
      { id: 'int2', code: 'SWH 60-09', name: 'Interlock Profile (Heavy 45x47.5mm)', heightOffset: 0, targetSash: 'SWH60-04' },
      { id: 'int3', code: 'SWH 60-10', name: 'Interlock Profile (Extra Heavy)', heightOffset: 0, targetSash: 'SWH60-05' },
      { id: 'int4', code: 'SWH 60-11', name: 'Interlock Profile (Premium Architectural)', heightOffset: 0, targetSash: 'SWH60-06' }
    ]
  },
  {
    id: 'prominance-casement-60',
    name: 'Prominance Optima Casement 60',
    brand: 'Prominance',
    type: 'casement',
    seriesHeight: 60,
    frames: [
      { id: 'pf1', code: 'P-CWH60-02', height: 60, beadingSideHeight: 42, name: 'Prominance Casement Frame Heavy' },
      { id: 'pf2', code: 'P-CWH60-01', height: 48, beadingSideHeight: 30, name: 'Prominance Casement Frame Slim' }
    ],
    sashes: [
      { id: 'ps1', code: 'P-CWH60-03', name: 'Prominance Window Sash', sashType: 'window', realHeight: 80, beadingSideHeight: 62 },
      { id: 'ps2', code: 'P-CWH60-04', name: 'Prominance Door Sash', sashType: 'door', realHeight: 73, beadingSideHeight: 55 }
    ],
    mullions: ['P-CWH60-05'],
    beading: [
      { id: 'pb1', code: 'P-CWH60-08', maxGlass: 8, name: 'Prominance Single Bead' },
      { id: 'pb2', code: 'P-CWH60-09', maxGlass: 24, name: 'Prominance DGU Bead' }
    ],
    glassOffset1: 6,
    glassOffset2: 4
  },
  {
    id: 'prominance-sliding-60',
    name: 'Prominance Optima Sliding 60',
    brand: 'Prominance',
    type: 'sliding',
    seriesHeight: 60,
    frames: [
      { id: 'psf1', code: 'P-SWH60-01', height: 44, name: 'Prominance 2-Track Slider Frame' },
      { id: 'psf2', code: 'P-SWH60-02', height: 44, name: 'Prominance 3-Track Slider Frame' }
    ],
    sashes: [
      { id: 'pss1', code: 'P-SWH60-03', name: 'Prominance Sliding Window Sash', sashType: 'window', realHeight: 72, beadingSideHeight: 54 },
      { id: 'pss2', code: 'P-SWH60-04', name: 'Prominance Sliding Door Sash', sashType: 'door', realHeight: 78, beadingSideHeight: 60 }
    ],
    mullions: ['P-FLY-MULLION'],
    beading: [
      { id: 'psb1', code: 'P-SWH60-12', maxGlass: 6, name: 'Prominance Single Glass Bead' },
      { id: 'psb2', code: 'P-SWH60-13', maxGlass: 12, name: 'Prominance DGU Glass Bead' }
    ],
    meshBeading: [
      { id: 'psmb1', code: 'P-SWH60-12-FLY', maxGlass: 2, name: 'Prominance Mesh Clamp' },
      { id: 'psmb2', code: 'P-MBEAD-01', maxGlass: 2, name: 'Prominance Spline Bead' }
    ],
    glassOffset1: 6,
    glassOffset2: 4,
    interlocks: [
      { id: 'pint1', code: 'P-SWH 60-08', name: 'Prominance Interlock Profile', heightOffset: 0 }
    ]
  }
];

export interface ManufacturingNiyamRules {
  // 1. Casement Formulas
  casementWeldAllowance: number; // 6mm (3mm each side)
  casementSashConstant: number; // 16mm (Formula: Outer - [(Beading_Side*2) - 16])
  casementGlassConstant: number; // 8mm (Formula: Sash - (Sash_Beading_Side*2) - 8)
  casementBeadingAllowance: number; // 4mm (Formula: Glass + 4mm)
  
  // 2. Sliding Formulas
  slidingHeightDeduction: number; // 84mm (Standard: FH - 84mm)
  slidingOverlapWidth: number; // 34mm to 40mm
  slidingGlassClearance: number; // 6mm
  
  // 3. GI Steel Reinforcement Deductions
  giSteelSlidingOuterDeduction: number; // 100mm
  giSteelSlidingSash57Deduction: number; // 110mm
  giSteelSlidingSash66Deduction: number; // 128mm
  giSteelCasementOuterDeduction: number; // 100mm
  giSteelCasementSashDeduction: number; // 110mm
  giSteelCasementMullionDeduction: number; // 100mm

  // Duron Casement Series Specific Profile Reinforcement Deductions
  giSteelCWH60_01Deduction: number; // 52mm (CWH60-01 Frame Cut: -52mm)
  giSteelCWH60_02Deduction: number; // 76mm (CWH60-02 Frame Cut: -76mm)
  giSteelCWH60_03Deduction: number; // 152mm (CWH60-03 Outward Window Sash Cut: -152mm)
  giSteelCWH60_04Deduction: number; // 138mm (CWH60-04 Inward Window Sash Cut: -138mm)
  giSteelCWH60_06Deduction: number; // 204mm (CWH60-06 Outward Door Sash Cut: -204mm)
  giSteelCWH60_07Deduction: number; // 204mm (CWH60-07 Inward Door Sash Cut: -204mm)

  giSteelRatePerMeter: number; // ₹81/Mtr
  
  // 4. Multi-Frame Coupler Rules
  couplerGap2mm: number; // 2mm
}

export const INITIAL_MANUFACTURING_NIYAM: ManufacturingNiyamRules = {
  casementWeldAllowance: 6,
  casementSashConstant: 16,
  casementGlassConstant: 8,
  casementBeadingAllowance: 4,
  
  slidingHeightDeduction: 84,
  slidingOverlapWidth: 36,
  slidingGlassClearance: 6,
  
  giSteelSlidingOuterDeduction: 100,
  giSteelSlidingSash57Deduction: 110,
  giSteelSlidingSash66Deduction: 128,
  giSteelCasementOuterDeduction: 100,
  giSteelCasementSashDeduction: 110,
  giSteelCasementMullionDeduction: 100,

  // Duron Casement Profile Deductions:
  // CWH60-01: -52mm, CWH60-02: -76mm
  // CWH60-03: -152mm, CWH60-04: -138mm
  // CWH60-06: -204mm, CWH60-07: -204mm
  giSteelCWH60_01Deduction: 52,
  giSteelCWH60_02Deduction: 76,
  giSteelCWH60_03Deduction: 152,
  giSteelCWH60_04Deduction: 138,
  giSteelCWH60_06Deduction: 204,
  giSteelCWH60_07Deduction: 204,

  giSteelRatePerMeter: 81.0,
  
  couplerGap2mm: 2,
};

export interface PricingPipelineConfig {
  profileWastagePercent: number; // 10%
  giSteelWastagePercent: number; // 5%
  glassWastagePercent: number; // 5%
  fabricationLabourPerSqFt: number; // ₹70/sqft
  installationLabourPerSqFt: number; // ₹50/sqft
  profitMarginPercent: number; // 60%
  defaultDiscountPercent: number; // 0%
  transportationLumpSum: number; // ₹1500
  loadingUnloadingLumpSum: number; // ₹800
  gstPercent: number; // 18%
}

export const INITIAL_PRICING_PIPELINE: PricingPipelineConfig = {
  profileWastagePercent: 10,
  giSteelWastagePercent: 5,
  glassWastagePercent: 5,
  fabricationLabourPerSqFt: 70,
  installationLabourPerSqFt: 50,
  profitMarginPercent: 60,
  defaultDiscountPercent: 0,
  transportationLumpSum: 1500,
  loadingUnloadingLumpSum: 800,
  gstPercent: 18,
};
