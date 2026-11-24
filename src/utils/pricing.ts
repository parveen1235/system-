import { CostHead, DetailedBOMResult, MaterialBOMItem, InventoryItem } from '../types/pricing';
import { CustomerDesignCardItem } from '../components/CustomerProjectView';
import { UPVCProject, UPVCFrame, FramePocket, Mullion } from '../types/upvc';

export const DEFAULT_COST_HEADS: CostHead[] = [
  { id: 1, name: 'Profile Cost', calcType: 'CustomFormula', rate: 140, visibility: 'Show in Quote Window', notes: 'Auto (From Window Geometry)' },
  { id: 2, name: 'Profile Wastage', calcType: 'Percentage', rate: 10, visibility: 'Show in Quote Window', notes: 'Profile cutting wastage %' },
  { id: 3, name: 'RI Cost', calcType: 'CustomFormula', rate: 81, visibility: 'Show in Quote Window', notes: 'Auto (From Window Geometry)' },
  { id: 4, name: 'RI Wastage', calcType: 'Percentage', rate: 5, visibility: 'Show in Quote Window', notes: 'Steel reinforcement wastage %' },
  { id: 5, name: 'Hardware Cost', calcType: 'CustomFormula', rate: 0, visibility: 'Show in Quote Window', notes: 'Auto (From Window Geometry)' },
  { id: 6, name: 'Glass Cost', calcType: 'CustomFormula', rate: 84, visibility: 'Show in Quote Window', notes: 'Auto (From Window Geometry)' },
  { id: 7, name: 'Glass Wastage', calcType: 'Percentage', rate: 5, visibility: 'Show in Quote Window', notes: 'Glass breakage & edge buffer %' },
  { id: 8, name: 'Total Raw Material Cost', calcType: 'CustomFormula', rate: 0, visibility: 'Do not show in Quote', notes: 'Sum of Heads 1 to 7' },
  { id: 9, name: 'Fabrication Labour', calcType: 'AreaSqftFg', rate: 30, visibility: 'Show in Quote Window', notes: '₹30/sqft factory fabrication charges' },
  { id: 10, name: 'Installation Labour', calcType: 'AreaSqftFg', rate: 50, visibility: 'Show in Quote Window', notes: '₹50/sqft site installation & sealing' },
  { id: 11, name: 'Sub Total Including Labour', calcType: 'CustomFormula', rate: 0, visibility: 'Do not show in Quote', notes: 'Head 8 + Head 9 + Head 10' },
  { id: 12, name: 'Profit', calcType: 'Percentage', rate: 10, visibility: 'Show in Quote Window', notes: 'Company profit margin 10%' },
  { id: 13, name: 'Extra Cost', calcType: 'UserDefinedFGOverhead', rate: 0, visibility: 'Show in Quote Window', notes: 'User defined factory overhead' },
  { id: 14, name: 'Basic Value', calcType: 'CustomFormula', rate: 0, visibility: 'Show in Quote Summary', notes: 'Head 11 + Head 12 + Head 13' },
  { id: 15, name: 'Discount', calcType: 'Percentage', rate: 0, visibility: 'Show in Quote Window', notes: 'Discount percentage %' },
  { id: 16, name: 'Sub Total', calcType: 'CustomFormula', rate: 0, visibility: 'Show in Quote Summary', notes: 'Head 14 - Head 15' },
  { id: 17, name: 'Transportation Cost', calcType: 'LumpSumDivideByQty', rate: 1000, visibility: 'Show in Quote Window', notes: 'Lumpsum transport divided by units' },
  { id: 18, name: 'Loading And Unloading', calcType: 'LumpSumDivideByQty', rate: 2000, visibility: 'Show in Quote Window', notes: 'Loading (₹1,000) + Unloading (₹1,000) = ₹2,000 total lumpsum divided by units' },
  { id: 19, name: 'Total Project Cost', calcType: 'CustomFormula', rate: 0, visibility: 'Show in Quote Summary', notes: 'Head 16 + Head 17 + Head 18' },
  { id: 20, name: 'GST', calcType: 'Percentage', rate: 18, visibility: 'Show in Quote Window', notes: '18% GST' },
  { id: 21, name: 'Grand Total', calcType: 'CustomFormula', rate: 0, visibility: 'Show in Quote Summary', notes: 'Final project grand total' }
];

export const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'inv-1', code: 'CWH60-02', name: 'Casement Outer Frame 60mm', unit: 'Mtr', price: 140, category: 'Profile', status: 'Active', weightPerMeter: 1.22 },
  { id: 'inv-2', code: 'CWH60-03', name: 'Casement Window Sash 60mm', unit: 'Mtr', price: 140, category: 'Profile', status: 'Active', weightPerMeter: 1.32 },
  { id: 'inv-3', code: 'CWH60-05', name: 'Casement Mullion Profile 74mm', unit: 'Mtr', price: 140, category: 'Profile', status: 'Active', weightPerMeter: 1.20 },
  { id: 'inv-4', code: 'CWH60-08', name: 'Casement Glazing Beading', unit: 'Mtr', price: 140, category: 'Profile', status: 'Active', weightPerMeter: 0.32 },
  { id: 'inv-5', code: 'SWH60-01', name: 'Sliding 2-Track Frame 62mm', unit: 'Mtr', price: 140, category: 'Profile', status: 'Active', weightPerMeter: 1.08 },
  { id: 'inv-6', code: 'SWH60-02', name: 'Sliding 3-Track Frame 88mm', unit: 'Mtr', price: 140, category: 'Profile', status: 'Active', weightPerMeter: 1.52 },
  { id: 'inv-7', code: 'SWH60-04', name: 'Sliding Shutter Sash 66mm', unit: 'Mtr', price: 140, category: 'Profile', status: 'Active', weightPerMeter: 1.24 },
  { id: 'inv-8', code: 'RI-CWH60', name: 'GI Steel Reinforcement 1.2mm', unit: 'Mtr', price: 81, category: 'Reinforcement', status: 'Active', weightPerMeter: 0.85 },
  { id: 'inv-9', code: 'GL-6MM-TG', name: '6mm Clear Toughened Glass', unit: 'Sq.Ft', price: 84, category: 'Glass', status: 'Active' },
  { id: 'inv-10', code: 'HW-POP-HNDL', name: 'Pop-Up Key Handle', unit: 'Pcs', price: 180, category: 'Hardware', status: 'Active' },
  { id: 'inv-11', code: 'HW-ESP-800', name: 'Casement Espag Multi-Point 800mm', unit: 'Pcs', price: 240, category: 'Hardware', status: 'Active' },
  { id: 'inv-12', code: 'HW-FST-12', name: 'Friction Stay 12 Inch SS 304', unit: 'Pair', price: 160, category: 'Hardware', status: 'Active' },
  { id: 'inv-13', code: 'HW-SLD-RLR', name: 'Sliding Heavy Double Roller', unit: 'Pcs', price: 95, category: 'Hardware', status: 'Active' },
  { id: 'inv-14', code: 'HW-TCH-LCK', name: 'Touch Lock Automatic', unit: 'Pcs', price: 120, category: 'Hardware', status: 'Active' },
  { id: 'inv-15', code: 'HW-GKT-EPDM', name: 'EPDM Rubber Gasket & Woolpile', unit: 'Mtr', price: 0, category: 'Hardware', status: 'Active' },
  { id: 'inv-16', code: 'HW-FST-SCW', name: 'Frame Anchor Fasteners & Screws', unit: 'Set', price: 65, category: 'Hardware', status: 'Active' },
  { id: 'inv-17', code: 'UPVC-HW-SI', name: 'Neutral Weatherproof Silicone Sealant', unit: 'CAN', price: 250, category: 'Hardware', status: 'Active' },
];

/**
 * Extracts comprehensive Bill of Materials (BOM) for any CustomerDesignCardItem or UPVCProject
 */
export function getDetailedMaterialBOM(
  design: CustomerDesignCardItem | { width: number; height: number; type?: string; projectData?: UPVCProject; quantity?: number },
  template: CostHead[] = DEFAULT_COST_HEADS,
  inventory: InventoryItem[] = DEFAULT_INVENTORY_ITEMS
): DetailedBOMResult {
  const profileRatePerKg = template.find(h => h.id === 1)?.rate || 140;
  const steelRatePerMtr = template.find(h => h.id === 3)?.rate || 81;
  const glassRatePerSqFt = template.find(h => h.id === 6)?.rate || 84;

  const widthMm = design.width || 1000;
  const heightMm = design.height || 1000;
  const qty = design.quantity || 1;
  const isSliding = (design.type || '').toLowerCase().includes('sliding') ||
    design.projectData?.frames?.some(f => f.series.includes('sliding') || f.pockets.some(p => p.sashType.includes('slider')));
  const isFrench = (design.type || '').toLowerCase().includes('french') || (design.type || '').toLowerCase().includes('door') || heightMm >= 2000;

  const profileItems: MaterialBOMItem[] = [];
  const steelItems: MaterialBOMItem[] = [];
  const glassItems: MaterialBOMItem[] = [];
  const hardwareItems: MaterialBOMItem[] = [];
  const accessoryItems: MaterialBOMItem[] = [];

  const windowTag = (design as any).tag || 'W1';

  // 1. OUTER FRAME PROFILES (4 pieces with 45 miter cuts)
  const frameCode = isSliding ? (widthMm > 2000 ? 'SWH60-02' : 'SWH60-01') : 'CWH60-02';
  const frameName = isSliding ? (widthMm > 2000 ? 'Sliding 3-Track Frame (88mm)' : 'Sliding 2-Track Frame (62mm)') : 'Casement Outer Frame (60mm)';
  const frameWtPerM = isSliding ? (widthMm > 2000 ? 1.52 : 1.08) : 1.22;

  // Width pieces (Top & Bottom)
  const outerWLen = widthMm;
  const outerWWt = (outerWLen / 1000) * frameWtPerM * 2;
  const outerWCost = outerWWt * profileRatePerKg;
  profileItems.push({
    category: 'Profile',
    subCategory: 'FRAME',
    usedInWindows: [windowTag],
    type: 'Outer Frame (Top/Bottom)',
    code: frameCode,
    name: `${frameName} - Horizontals`,
    spec: `${outerWLen} mm (45° miter)`,
    lengthMm: outerWLen,
    qtyPerSet: 2,
    totalQty: 2 * qty,
    unit: 'Pcs',
    weightPerMeter: frameWtPerM,
    totalWeightKg: Math.round(outerWWt * qty * 100) / 100,
    ratePerKg: profileRatePerKg,
    unitRate: profileRatePerKg,
    ratePerPiece: Math.round((outerWCost / 2) * 100) / 100,
    totalPrice: Math.round(outerWCost * qty * 100) / 100
  });

  // Height pieces (Left & Right)
  const outerHLen = heightMm;
  const outerHWt = (outerHLen / 1000) * frameWtPerM * 2;
  const outerHCost = outerHWt * profileRatePerKg;
  profileItems.push({
    category: 'Profile',
    subCategory: 'FRAME',
    usedInWindows: [windowTag],
    type: 'Outer Frame (Left/Right)',
    code: frameCode,
    name: `${frameName} - Verticals`,
    spec: `${outerHLen} mm (45° miter)`,
    lengthMm: outerHLen,
    qtyPerSet: 2,
    totalQty: 2 * qty,
    unit: 'Pcs',
    weightPerMeter: frameWtPerM,
    totalWeightKg: Math.round(outerHWt * qty * 100) / 100,
    ratePerKg: profileRatePerKg,
    unitRate: profileRatePerKg,
    ratePerPiece: Math.round((outerHCost / 2) * 100) / 100,
    totalPrice: Math.round(outerHCost * qty * 100) / 100
  });

  // 2. STEEL GI REINFORCEMENT FOR OUTER FRAME (Cut size: Parent - 100mm)
  const steelOuterWLen = Math.max(0, outerWLen - 100);
  const steelOuterHLen = Math.max(0, outerHLen - 100);
  const steelOuterMeters = ((steelOuterWLen * 2 + steelOuterHLen * 2) / 1000);
  const steelOuterCost = steelOuterMeters * steelRatePerMtr;
  steelItems.push({
    category: 'Reinforcement',
    subCategory: 'STEEL',
    usedInWindows: [windowTag],
    type: 'Outer Frame GI Reinforcement',
    code: 'RI-CWH60',
    name: 'GI Steel Channel 1.2mm (Outer)',
    spec: `W: ${steelOuterWLen}mm, H: ${steelOuterHLen}mm (Parent-100mm)`,
    parentProfileCutSize: widthMm,
    parentProfileName: frameName,
    qtyPerSet: 4,
    totalQty: 4 * qty,
    totalLengthMtr: Math.round(steelOuterMeters * qty * 100) / 100,
    unit: 'Mtr',
    unitRate: steelRatePerMtr,
    ratePerPiece: Math.round((steelOuterCost / 4) * 100) / 100,
    totalPrice: Math.round(steelOuterCost * qty * 100) / 100
  });

  // 3. SASH PROFILES & SASH STEEL (Casement vs Sliding)
  if (isSliding) {
    const panels = widthMm > 2200 ? 3 : 2;
    const sashCutW = Math.round((widthMm - 50) / panels + 25);
    const sashCutH = Math.round(heightMm - 70);
    const sashWtPerM = 1.24;

    const totalSashM = ((sashCutW * 2 + sashCutH * 2) * panels) / 1000;
    const totalSashWt = totalSashM * sashWtPerM;
    const sashCost = totalSashWt * profileRatePerKg;

    profileItems.push({
      category: 'Profile',
      subCategory: 'SASH',
      usedInWindows: [windowTag],
      type: 'Sliding Sash Shutter',
      code: 'SWH60-04',
      name: 'Sliding Sash 66mm Profile',
      spec: `${sashCutW} × ${sashCutH} mm (${panels} Sashes)`,
      lengthMm: sashCutW,
      qtyPerSet: panels * 4,
      totalQty: panels * 4 * qty,
      unit: 'Pcs',
      weightPerMeter: sashWtPerM,
      totalWeightKg: Math.round(totalSashWt * qty * 100) / 100,
      ratePerKg: profileRatePerKg,
      unitRate: profileRatePerKg,
      ratePerPiece: Math.round((sashCost / (panels * 4)) * 100) / 100,
      totalPrice: Math.round(sashCost * qty * 100) / 100
    });

    // Sliding Sash Steel GI (Parent - 110mm / 128mm)
    const steelSashM = (((sashCutW - 110) * 2 + (sashCutH - 110) * 2) * panels) / 1000;
    const steelSashCost = steelSashM * steelRatePerMtr;
    steelItems.push({
      category: 'Reinforcement',
      subCategory: 'STEEL',
      usedInWindows: [windowTag],
      type: 'Sliding Sash GI Steel',
      code: 'RI-SLD66',
      name: 'GI Steel Box (Sliding Sash)',
      spec: `Cut: ${sashCutW - 110}mm / ${sashCutH - 110}mm (Parent-110mm)`,
      qtyPerSet: panels * 4,
      totalQty: panels * 4 * qty,
      totalLengthMtr: Math.round(steelSashM * qty * 100) / 100,
      unit: 'Mtr',
      unitRate: steelRatePerMtr,
      ratePerPiece: Math.round((steelSashCost / (panels * 4)) * 100) / 100,
      totalPrice: Math.round(steelSashCost * qty * 100) / 100
    });

    // Sliding Glass Panes
    const glassW = Math.max(100, sashCutW - 100);
    const glassH = Math.max(100, sashCutH - 100);
    const singlePaneSqFt = (glassW * glassH) / 92903.04;
    const totalGlassSqFt = singlePaneSqFt * panels;
    const totalGlassCost = totalGlassSqFt * glassRatePerSqFt;

    glassItems.push({
      category: 'Glass',
      subCategory: 'GLASS',
      usedInWindows: [windowTag],
      type: 'Toughened Glass Pane',
      code: 'GL-6MM-TG',
      name: '6mm Clear Toughened Glass',
      spec: `${glassW} × ${glassH} mm`,
      widthMm: glassW,
      heightMm: glassH,
      panesCount: panels,
      qtyPerSet: panels,
      totalQty: panels * qty,
      areaSqft: Math.round(totalGlassSqFt * qty * 100) / 100,
      unit: 'Sq.Ft',
      unitRate: glassRatePerSqFt,
      ratePerPiece: Math.round((totalGlassCost / panels) * 100) / 100,
      totalPrice: Math.round(totalGlassCost * qty * 100) / 100
    });

    // Sliding Hardware
    hardwareItems.push({
      category: 'Hardware',
      subCategory: 'HARDWARE',
      usedInWindows: [windowTag],
      type: 'Sliding Rollers',
      code: 'HW-SLD-RLR',
      name: 'Heavy Duty Double Wheel Rollers',
      spec: 'Nylon / SS Ball Bearing',
      qtyPerSet: panels * 2,
      totalQty: panels * 2 * qty,
      unit: 'Pcs',
      unitRate: 95,
      ratePerPiece: 95,
      totalPrice: panels * 2 * 95 * qty
    });

    hardwareItems.push({
      category: 'Hardware',
      subCategory: 'HARDWARE',
      usedInWindows: [windowTag],
      type: 'Sliding Lock',
      code: 'HW-TCH-LCK',
      name: 'Touch Lock Automatic / Pop-up',
      spec: 'Concealed Interlock fixing',
      qtyPerSet: panels,
      totalQty: panels * qty,
      unit: 'Pcs',
      unitRate: 140,
      ratePerPiece: 140,
      totalPrice: panels * 140 * qty
    });
  } else {
    // CASEMENT / OPEN WINDOW & DOOR SASH
    const sashPanels = widthMm > 2000 ? 2 : (widthMm >= 1000 ? 1 : 1);
    const sashCutW = Math.round(sashPanels > 1 ? (widthMm - 74) / 2 + 10 : widthMm - 60);
    const sashCutH = Math.round(heightMm - 60);
    const sashWtPerM = isFrench ? 1.68 : 1.32;
    const sashCode = isFrench ? 'CWH60-06' : 'CWH60-03';
    const sashName = isFrench ? 'Casement Door Sash (Z-Shutter)' : 'Casement Window Sash (Z-Shutter)';

    const totalSashM = ((sashCutW * 2 + sashCutH * 2) * sashPanels) / 1000;
    const totalSashWt = totalSashM * sashWtPerM;
    const sashCost = totalSashWt * profileRatePerKg;

    profileItems.push({
      category: 'Profile',
      subCategory: 'SASH',
      usedInWindows: [windowTag],
      type: 'Casement Window/Door Sash',
      code: sashCode,
      name: sashName,
      spec: `${sashCutW} × ${sashCutH} mm (${sashPanels} Sash)`,
      lengthMm: sashCutW,
      qtyPerSet: sashPanels * 4,
      totalQty: sashPanels * 4 * qty,
      unit: 'Pcs',
      weightPerMeter: sashWtPerM,
      totalWeightKg: Math.round(totalSashWt * qty * 100) / 100,
      ratePerKg: profileRatePerKg,
      unitRate: profileRatePerKg,
      ratePerPiece: Math.round((sashCost / (sashPanels * 4)) * 100) / 100,
      totalPrice: Math.round(sashCost * qty * 100) / 100
    });

    // Mullions if width > 1500
    if (widthMm > 1500) {
      const mulLen = heightMm - 120;
      const mulWt = (mulLen / 1000) * 1.20;
      const mulCost = mulWt * profileRatePerKg;
      profileItems.push({
        category: 'Profile',
        subCategory: 'MULLION',
        usedInWindows: [windowTag],
        type: 'Vertical Mullion (T-Bar)',
        code: 'CWH60-05',
        name: 'Casement Mullion Profile 74mm',
        spec: `${mulLen} mm (90° V-Notch)`,
        lengthMm: mulLen,
        qtyPerSet: 1,
        totalQty: 1 * qty,
        unit: 'Pcs',
        weightPerMeter: 1.20,
        totalWeightKg: Math.round(mulWt * qty * 100) / 100,
        ratePerKg: profileRatePerKg,
        unitRate: profileRatePerKg,
        ratePerPiece: Math.round(mulCost * 100) / 100,
        totalPrice: Math.round(mulCost * qty * 100) / 100
      });
    }

    // Casement Sash Steel GI (Parent - 110mm)
    const steelSashM = (((sashCutW - 110) * 2 + (sashCutH - 110) * 2) * sashPanels) / 1000;
    const steelSashCost = steelSashM * steelRatePerMtr;
    steelItems.push({
      category: 'Reinforcement',
      subCategory: 'STEEL',
      usedInWindows: [windowTag],
      type: 'Casement Sash GI Steel',
      code: 'RI-CWH60-S',
      name: 'GI Steel Channel (Sash)',
      spec: `Cut: ${sashCutW - 110}mm / ${sashCutH - 110}mm (Parent-110mm)`,
      qtyPerSet: sashPanels * 4,
      totalQty: sashPanels * 4 * qty,
      totalLengthMtr: Math.round(steelSashM * qty * 100) / 100,
      unit: 'Mtr',
      unitRate: steelRatePerMtr,
      ratePerPiece: Math.round((steelSashCost / (sashPanels * 4)) * 100) / 100,
      totalPrice: Math.round(steelSashCost * qty * 100) / 100
    });

    // Casement Glass
    const glassW = Math.max(100, sashCutW - 120);
    const glassH = Math.max(100, sashCutH - 120);
    const singlePaneSqFt = (glassW * glassH) / 92903.04;
    const totalGlassSqFt = singlePaneSqFt * sashPanels;
    const totalGlassCost = totalGlassSqFt * glassRatePerSqFt;

    glassItems.push({
      category: 'Glass',
      subCategory: 'GLASS',
      usedInWindows: [windowTag],
      type: 'Toughened Glass Pane',
      code: 'GL-6MM-TG',
      name: '6mm Clear Toughened Glass',
      spec: `${glassW} × ${glassH} mm`,
      widthMm: glassW,
      heightMm: glassH,
      panesCount: sashPanels,
      qtyPerSet: sashPanels,
      totalQty: sashPanels * qty,
      areaSqft: Math.round(totalGlassSqFt * qty * 100) / 100,
      unit: 'Sq.Ft',
      unitRate: glassRatePerSqFt,
      ratePerPiece: Math.round((totalGlassCost / sashPanels) * 100) / 100,
      totalPrice: Math.round(totalGlassCost * qty * 100) / 100
    });

    // Casement Hardware
    hardwareItems.push({
      category: 'Hardware',
      subCategory: 'HARDWARE',
      usedInWindows: [windowTag],
      type: 'Handles',
      code: 'HW-POP-HNDL',
      name: 'Pop-up / Cockspur Key Handle',
      spec: 'White / Silver Coated Zinc Alloy',
      qtyPerSet: sashPanels,
      totalQty: sashPanels * qty,
      unit: 'Pcs',
      unitRate: 180,
      ratePerPiece: 180,
      totalPrice: sashPanels * 180 * qty
    });

    hardwareItems.push({
      category: 'Hardware',
      subCategory: 'HARDWARE',
      usedInWindows: [windowTag],
      type: 'Friction Stays / Hinges',
      code: 'HW-FST-12',
      name: 'SS 304 Friction Stay (12/16 Inch)',
      spec: 'Heavy Duty 4-Bar Mechanism',
      qtyPerSet: sashPanels * 2,
      totalQty: sashPanels * 2 * qty,
      unit: 'Pair',
      unitRate: 160,
      ratePerPiece: 160,
      totalPrice: sashPanels * 160 * qty
    });

    hardwareItems.push({
      category: 'Hardware',
      subCategory: 'HARDWARE',
      usedInWindows: [windowTag],
      type: 'Espag Rods',
      code: 'HW-ESP-800',
      name: 'Multi-Point Locking Espag 800mm',
      spec: 'Zinc Passivated Steel with Keepers',
      qtyPerSet: sashPanels,
      totalQty: sashPanels * qty,
      unit: 'Pcs',
      unitRate: 240,
      ratePerPiece: 240,
      totalPrice: sashPanels * 240 * qty
    });
  }

  // 4. ACCESSORIES (Gaskets, Woolpile, Fasteners)
  const perimeterM = ((widthMm + heightMm) * 2) / 1000;
  const matchedGasket = inventory.find(i => 
    i.code === 'HW-GKT-EPDM' || 
    i.code === 'UPVC-HW-STARG' || 
    i.code === 'UPVC-HW-OUTERGKT' ||
    (i.name && i.name.toLowerCase().includes('gasket'))
  );
  const gasketRate = (matchedGasket && typeof matchedGasket.price === 'number' && matchedGasket.price >= 0)
    ? matchedGasket.price
    : 0;
  const gasketCost = Math.round(perimeterM * 3 * gasketRate * 100) / 100;
  accessoryItems.push({
    category: 'Accessories',
    subCategory: 'ACCESSORIES',
    usedInWindows: [windowTag],
    type: 'EPDM Rubber Gaskets',
    code: matchedGasket?.code || 'HW-GKT-EPDM',
    name: matchedGasket?.name || 'EPDM Frame & Sash Glazing Gaskets',
    spec: `${Math.round(perimeterM * 3 * 10) / 10} Meters`,
    qtyPerSet: Math.round(perimeterM * 3),
    totalQty: Math.round(perimeterM * 3 * qty),
    unit: 'Mtr',
    unitRate: gasketRate,
    ratePerPiece: gasketRate,
    totalPrice: Math.round(gasketCost * qty * 100) / 100
  });

  accessoryItems.push({
    category: 'Accessories',
    subCategory: 'ACCESSORIES',
    usedInWindows: [windowTag],
    type: 'Installation Fasteners',
    code: 'HW-FST-SCW',
    name: 'Anchor Fasteners & SS Screws Pack',
    spec: '8x80mm Frame Anchors + 4.2x25mm Screws',
    qtyPerSet: 1,
    totalQty: 1 * qty,
    unit: 'Set',
    unitRate: 65,
    ratePerPiece: 65,
    totalPrice: 65 * qty
  });

  // Silicone Sealant (Perimeter Weatherproof Joint Sealing)
  // Formula: (Height mm + Width mm) * 0.0005263
  const siliconeQtyPerWindow = Math.round((widthMm + heightMm) * 0.0005263 * 1000) / 1000;
  const totalSiliconeCans = Math.round(siliconeQtyPerWindow * qty * 100) / 100;
  const matchedSilicone = inventory.find(i =>
    i.code === 'UPVC-HW-SI' ||
    (i.name && i.name.toLowerCase().includes('silicone')) ||
    (i.category && i.category.toLowerCase().includes('silicon'))
  );
  const siliconeRate = matchedSilicone?.price || 250;
  const siliconeCost = Math.round(totalSiliconeCans * siliconeRate * 100) / 100;

  accessoryItems.push({
    category: 'Accessories',
    subCategory: 'ACCESSORIES',
    usedInWindows: [windowTag],
    type: 'Silicone Sealant',
    code: 'UPVC-HW-SI',
    name: 'Neutral Weatherproof Silicone Sealant',
    spec: `(H:${heightMm} + W:${widthMm}) × 0.0005263 = ${siliconeQtyPerWindow} CAN`,
    qtyPerSet: siliconeQtyPerWindow,
    totalQty: totalSiliconeCans,
    unit: 'CAN',
    unitRate: siliconeRate,
    ratePerPiece: Math.round(siliconeQtyPerWindow * siliconeRate * 100) / 100,
    totalPrice: siliconeCost
  });

  const allItems = [...profileItems, ...steelItems, ...glassItems, ...hardwareItems, ...accessoryItems];

  const totalProfileWeightKg = profileItems.reduce((sum, item) => sum + (item.totalWeightKg || 0), 0);
  const totalSteelWeightKg = steelItems.reduce((sum, item) => sum + ((item.totalLengthMtr || 0) * 0.85), 0);
  const totalSteelMeters = steelItems.reduce((sum, item) => sum + (item.totalLengthMtr || 0), 0);

  const profileCost = profileItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const steelCost = steelItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const glassCost = glassItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const hardwareCost = hardwareItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const accessoryCost = accessoryItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const grandMaterialCost = profileCost + steelCost + glassCost + hardwareCost + accessoryCost;

  // Single unit base costs (divided by qty)
  const unitProfileCost = profileCost / qty;
  const unitSteelCost = steelCost / qty;
  const unitGlassCost = glassCost / qty;
  const unitHardwareCost = hardwareCost / qty;
  const unitAccessoryCost = accessoryCost / qty;
  const unitRawMaterialCost = grandMaterialCost / qty;

  return {
    items: allItems,
    profileItems,
    glassItems,
    steelItems,
    hardwareItems,
    accessoryItems,
    totals: {
      unitProfileCost: Math.round(unitProfileCost * 100) / 100,
      unitSteelCost: Math.round(unitSteelCost * 100) / 100,
      unitGlassCost: Math.round(unitGlassCost * 100) / 100,
      unitHardwareCost: Math.round(unitHardwareCost * 100) / 100,
      unitAccessoryCost: Math.round(unitAccessoryCost * 100) / 100,
      unitRawMaterialCost: Math.round(unitRawMaterialCost * 100) / 100,

      totalProfileWeightKg: Math.round(totalProfileWeightKg * 100) / 100,
      totalSteelWeightKg: Math.round(totalSteelWeightKg * 100) / 100,
      totalSteelMeters: Math.round(totalSteelMeters * 100) / 100,
      profileCost: Math.round(profileCost * 100) / 100,
      glassCost: Math.round(glassCost * 100) / 100,
      steelCost: Math.round(steelCost * 100) / 100,
      hardwareCost: Math.round((hardwareCost + accessoryCost) * 100) / 100,
      accessoryCost: Math.round(accessoryCost * 100) / 100,
      grandMaterialCost: Math.round(grandMaterialCost * 100) / 100
    }
  };
}

/**
 * Executes the strict 21-Step Cost Head pricing calculation for a SINGLE UNIT of a window design
 */
export function calculateQuotation(
  design: CustomerDesignCardItem | { width: number; height: number; type?: string; projectData?: UPVCProject; quantity?: number },
  template: CostHead[] = DEFAULT_COST_HEADS,
  inventory: InventoryItem[] = DEFAULT_INVENTORY_ITEMS,
  totalProjectUnits: number = 1
): CostHead[] {
  const bom = getDetailedMaterialBOM(design, template, inventory);
  const areaSqFt = Math.max(0.1, Math.round(((design.width * design.height) / (304.8 * 304.8)) * 100) / 100);
  const projectUnits = Math.max(1, totalProjectUnits);

  const updatedHeads = template.map(head => ({ ...head, value: 0 }));

  // Head 1: Profile Cost (Single Unit)
  const h1 = updatedHeads.find(h => h.id === 1);
  const profileCost = bom.totals.unitProfileCost ?? bom.totals.profileCost;
  if (h1) h1.value = profileCost;

  // Head 2: Profile Wastage (e.g. 10%)
  const h2 = updatedHeads.find(h => h.id === 2);
  const profileWastage = profileCost * ((h2?.rate ?? 10) / 100);
  if (h2) h2.value = Math.round(profileWastage * 100) / 100;

  // Head 3: Steel RI Cost (Single Unit)
  const h3 = updatedHeads.find(h => h.id === 3);
  const steelCost = bom.totals.unitSteelCost ?? bom.totals.steelCost;
  if (h3) h3.value = steelCost;

  // Head 4: Steel Wastage (e.g. 5%)
  const h4 = updatedHeads.find(h => h.id === 4);
  const steelWastage = steelCost * ((h4?.rate ?? 5) / 100);
  if (h4) h4.value = Math.round(steelWastage * 100) / 100;

  // Head 5: Hardware & Accessories Cost (Single Unit)
  const h5 = updatedHeads.find(h => h.id === 5);
  const hardwareCost = (bom.totals.unitHardwareCost ?? 0) + (bom.totals.unitAccessoryCost ?? 0) || bom.totals.hardwareCost;
  if (h5) h5.value = hardwareCost;

  // Head 6: Glass Cost (Single Unit)
  const h6 = updatedHeads.find(h => h.id === 6);
  const glassCost = bom.totals.unitGlassCost ?? bom.totals.glassCost;
  if (h6) h6.value = glassCost;

  // Head 7: Glass Wastage (e.g. 5%)
  const h7 = updatedHeads.find(h => h.id === 7);
  const glassWastage = glassCost * ((h7?.rate ?? 5) / 100);
  if (h7) h7.value = Math.round(glassWastage * 100) / 100;

  // Head 8: Total Raw Material Cost (Sum of 1 to 7)
  const totalRawMaterial = profileCost + profileWastage + steelCost + steelWastage + hardwareCost + glassCost + glassWastage;
  const h8 = updatedHeads.find(h => h.id === 8);
  if (h8) h8.value = Math.round(totalRawMaterial * 100) / 100;

  // Head 9: Fabrication Labour (₹30/sqft default)
  const h9 = updatedHeads.find(h => h.id === 9);
  const fabLabour = areaSqFt * (h9?.rate ?? 30);
  if (h9) h9.value = Math.round(fabLabour * 100) / 100;

  // Head 10: Installation Labour (₹50/sqft default)
  const h10 = updatedHeads.find(h => h.id === 10);
  const instLabour = areaSqFt * (h10?.rate ?? 50);
  if (h10) h10.value = Math.round(instLabour * 100) / 100;

  // Head 11: Subtotal Incl. Labour (Head 8 + 9 + 10)
  const subtotalLabour = totalRawMaterial + fabLabour + instLabour;
  const h11 = updatedHeads.find(h => h.id === 11);
  if (h11) h11.value = Math.round(subtotalLabour * 100) / 100;

  // Head 12: Profit Margin (10% default)
  const h12 = updatedHeads.find(h => h.id === 12);
  const profit = subtotalLabour * ((h12?.rate ?? 10) / 100);
  if (h12) h12.value = Math.round(profit * 100) / 100;

  // Head 13: Extra Cost / Overheads (LumpSum / Qty)
  const h13 = updatedHeads.find(h => h.id === 13);
  const extraCost = (h13?.rate ?? 0) / projectUnits;
  if (h13) h13.value = Math.round(extraCost * 100) / 100;

  // Head 14: Basic Value (Head 11 + 12 + 13)
  const basicValue = subtotalLabour + profit + extraCost;
  const h14 = updatedHeads.find(h => h.id === 14);
  if (h14) h14.value = Math.round(basicValue * 100) / 100;

  // Head 15: Discount (0%)
  const h15 = updatedHeads.find(h => h.id === 15);
  const discount = basicValue * ((h15?.rate ?? 0) / 100);
  if (h15) h15.value = Math.round(discount * 100) / 100;

  // Head 16: Sub Total (Head 14 - 15)
  const subTotal = basicValue - discount;
  const h16 = updatedHeads.find(h => h.id === 16);
  if (h16) h16.value = Math.round(subTotal * 100) / 100;

  // Head 17: Transportation Cost (LumpSum / Qty)
  const h17 = updatedHeads.find(h => h.id === 17);
  const transport = (h17?.rate ?? 1000) / projectUnits;
  if (h17) h17.value = Math.round(transport * 100) / 100;

  // Head 18: Loading And Unloading (LumpSum / Qty)
  const h18 = updatedHeads.find(h => h.id === 18);
  const loading = (h18?.rate ?? 2000) / projectUnits;
  if (h18) h18.value = Math.round(loading * 100) / 100;

  // Head 19: Total Project Cost Before GST (Head 16 + 17 + 18)
  const totalProjectCost = subTotal + transport + loading;
  const h19 = updatedHeads.find(h => h.id === 19);
  if (h19) h19.value = Math.round(totalProjectCost * 100) / 100;

  // Head 20: GST (18%)
  const h20 = updatedHeads.find(h => h.id === 20);
  const gstRate = (h20 && h20.rate !== undefined && h20.rate > 0) ? h20.rate : 18;
  const gst = totalProjectCost * (gstRate / 100);
  if (h20) {
    h20.rate = gstRate;
    h20.value = Math.round(gst * 100) / 100;
  }

  // Head 21: FINAL GRAND TOTAL Including 18% GST (Head 19 + 20)
  const grandTotal = totalProjectCost + gst;
  const h21 = updatedHeads.find(h => h.id === 21);
  if (h21) h21.value = Math.round(grandTotal * 100) / 100;

  return updatedHeads;
}
