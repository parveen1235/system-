import { CustomerDesignCardItem } from '../components/CustomerProjectView';
import { UPVCFrame, CuttingItem } from '../types/upvc';
import { generateCuttingSchedule } from './upvcCalculations';

export interface RequiredCutPiece {
  id: string;
  tag: string;
  windowTag: string;
  location: string;
  length: number; // in mm
  cutAngleLeft: string;
  cutAngleRight: string;
  profileCategory: 'Outer Frame' | 'Sash' | 'Mullion/Transom' | 'Glazing Bead' | 'Interlock & Addon' | 'GI Reinforcement';
  profileName: string;
  profileCode: string;
  notes?: string;
  qty: number;
}

export interface BarPieceAllocation {
  id: string;
  pieceTag: string;
  windowTag: string;
  length: number; // in mm
  startMm: number;
  endMm: number;
  percentage: number;
}

export interface OptimizedStockBar {
  barNumber: number;
  barLength: number; // in mm (e.g. 5800)
  usedLength: number; // in mm
  remainingLength: number; // in mm
  wastePercent: number;
  efficiencyPercent: number;
  cuts: BarPieceAllocation[];
}

export interface ProfileSectionRequirement {
  id: string;
  category: 'Outer Frame' | 'Sash' | 'Mullion/Transom' | 'Glazing Bead' | 'Interlock & Addon' | 'GI Reinforcement';
  profileName: string;
  profileCode: string;
  standardBarLength: number; // e.g. 5800
  totalPieces: number;
  totalNetMm: number;
  totalNetMeters: number;
  requiredBarsCount: number; // How many standard 5800mm bars are needed
  totalProcuredMeters: number;
  totalOffcutMm: number;
  totalOffcutMeters: number;
  offcutPercent: number;
  efficiencyPercent: number;
  reusableOffcutsCount: number; // pieces >= 500mm that can be used later
  scrapMm: number; // pieces < 500mm
  approxWeightKg: number;
  approxRatePerBar: number;
  approxTotalCost: number;
  pieces: RequiredCutPiece[];
  optimizedBars: OptimizedStockBar[];
}

export interface WindowConsumptionSummary {
  windowId: string;
  tag: string;
  location: string;
  type: string;
  width: number;
  height: number;
  quantity: number;
  totalPieces: number;
  totalFrameMeters: number;
  totalSashMeters: number;
  totalMullionMeters: number;
  totalBeadMeters: number;
  totalSteelMeters: number;
  totalLinearMeters: number;
}

export interface RequisitionSubSummary {
  totalBarsOrPipes: number;
  totalNetMeters: number;
  totalProcuredMeters: number;
  totalPiecesCount: number;
  totalWeightKg: number;
  totalEstimatedCost: number;
  overallEfficiencyPercent: number;
  overallWastagePercent: number;
}

export interface ProjectProfileRequisition {
  standardBarLength: number; // e.g. 5800 (Duron standard uPVC)
  sawKerf: number; // e.g. 4mm
  giStandardPipeLength: number; // e.g. 6000 (standard 6M steel pipe)
  giSawKerf: number; // e.g. 3mm
  totalStandardBars: number;
  totalNetMeters: number;
  totalProcuredMeters: number;
  totalPiecesCount: number;
  overallEfficiencyPercent: number;
  overallWastagePercent: number;
  totalWeightKg: number;
  totalEstimatedCost: number;
  sections: ProfileSectionRequirement[];
  upvcSections: ProfileSectionRequirement[]; // Exclusive uPVC profiles
  giSections: ProfileSectionRequirement[]; // Exclusive GI steel reinforcement
  upvcSummary: RequisitionSubSummary;
  giSummary: RequisitionSubSummary & { totalPipesCount: number; standardPipeLength: number };
  windowSummaries: WindowConsumptionSummary[];
}

// Helper to categorize profile types cleanly for factory procurement
function categorizeCuttingItem(item: CuttingItem): 'Outer Frame' | 'Sash' | 'Mullion/Transom' | 'Glazing Bead' | 'Interlock & Addon' | 'GI Reinforcement' {
  if (item.itemType === 'Reinforcement') return 'GI Reinforcement';
  if (item.itemType === 'Glazing Bead') return 'Glazing Bead';
  if (item.itemType === 'Mullion' || item.itemType === 'Transom') return 'Mullion/Transom';
  if (item.itemType === 'Sash') return 'Sash';
  if (item.itemType === 'Coupler' || item.tag?.includes('INT') || item.profileName?.toLowerCase().includes('interlock')) return 'Interlock & Addon';
  return 'Outer Frame';
}

/**
 * 1D Best-Fit Decreasing Cutting Stock Optimizer
 * Distributes required cut pieces into minimum number of standard stock bars (e.g. Duron 5800mm)
 * accounting for saw blade kerf deduction.
 */
export function optimizePiecesIntoBars(
  pieces: RequiredCutPiece[],
  barLength: number,
  sawKerf: number
): OptimizedStockBar[] {
  if (barLength <= 0 || pieces.length === 0) return [];

  // 1. Flatten all cuts into individual units
  const units: {
    id: string;
    pieceTag: string;
    windowTag: string;
    length: number;
  }[] = [];

  pieces.forEach((p) => {
    for (let i = 0; i < p.qty; i++) {
      units.push({
        id: `${p.id}-q${i + 1}`,
        pieceTag: p.tag,
        windowTag: p.windowTag,
        length: p.length,
      });
    }
  });

  // 2. Sort descending (longest cuts first - First/Best Fit Decreasing)
  units.sort((a, b) => b.length - a.length);

  const bars: OptimizedStockBar[] = [];

  units.forEach((unit) => {
    // If a cut is longer than the standard bar length, warn/split into individual bar
    const pieceLen = unit.length;

    // Find the best existing bar that can fit this piece with least leftover waste
    let bestBarIndex = -1;
    let minRemainingAfter = Infinity;

    for (let bIdx = 0; bIdx < bars.length; bIdx++) {
      const bar = bars[bIdx];
      const neededSpace = bar.cuts.length > 0 ? pieceLen + sawKerf : pieceLen;

      if (bar.remainingLength >= neededSpace) {
        const remainingAfter = bar.remainingLength - neededSpace;
        if (remainingAfter < minRemainingAfter) {
          minRemainingAfter = remainingAfter;
          bestBarIndex = bIdx;
        }
      }
    }

    if (bestBarIndex !== -1) {
      // Place into best bar
      const bar = bars[bestBarIndex];
      const startMm = bar.usedLength + (bar.cuts.length > 0 ? sawKerf : 0);
      const endMm = startMm + pieceLen;
      const neededSpace = bar.cuts.length > 0 ? pieceLen + sawKerf : pieceLen;

      bar.cuts.push({
        id: unit.id,
        pieceTag: unit.pieceTag,
        windowTag: unit.windowTag,
        length: pieceLen,
        startMm,
        endMm,
        percentage: Number(((pieceLen / barLength) * 100).toFixed(1)),
      });

      bar.usedLength += neededSpace;
      bar.remainingLength = Math.max(0, barLength - bar.usedLength);
      bar.wastePercent = Number(((bar.remainingLength / barLength) * 100).toFixed(1));
      bar.efficiencyPercent = Number((100 - bar.wastePercent).toFixed(1));
    } else {
      // Create a brand new standard bar
      const effectiveBarLength = Math.max(barLength, pieceLen);
      const newBar: OptimizedStockBar = {
        barNumber: bars.length + 1,
        barLength: effectiveBarLength,
        usedLength: pieceLen,
        remainingLength: Math.max(0, effectiveBarLength - pieceLen),
        wastePercent: Number((((effectiveBarLength - pieceLen) / effectiveBarLength) * 100).toFixed(1)),
        efficiencyPercent: Number(((pieceLen / effectiveBarLength) * 100).toFixed(1)),
        cuts: [
          {
            id: unit.id,
            pieceTag: unit.pieceTag,
            windowTag: unit.windowTag,
            length: pieceLen,
            startMm: 0,
            endMm: pieceLen,
            percentage: Number(((pieceLen / effectiveBarLength) * 100).toFixed(1)),
          },
        ],
      };
      bars.push(newBar);
    }
  });

  return bars;
}

/**
 * Main Profile Requirement Calculation Engine
 * Analyzes all windows in the project, generates exact factory cuts with welding allowances,
 * and calculates standard bar requirements (Duron 5800mm or customizable).
 */
export function calculateProjectProfileRequirement(
  designs: CustomerDesignCardItem[],
  options?: {
    standardBarLength?: number; // default 5800 for uPVC extrusions
    sawKerf?: number; // default 4
    ratePerKg?: number; // default 310
    brand?: string; // default Duron
    sectionBarLengths?: Record<string, number>; // custom bar length per section ID (groupKey) or category
    giStandardPipeLength?: number; // default 6000 for GI steel pipes
    giSawKerf?: number; // default 3
  }
): ProjectProfileRequisition {
  const barLength = options?.standardBarLength && options.standardBarLength > 0 ? options.standardBarLength : 5800;
  const sawKerf = options?.sawKerf !== undefined ? options.sawKerf : 4;
  const giPipeLength = options?.giStandardPipeLength && options.giStandardPipeLength > 0 ? options.giStandardPipeLength : 6000;
  const giKerf = options?.giSawKerf !== undefined ? options.giSawKerf : 3;
  const brand = options?.brand || 'Duron';

  const allPieces: RequiredCutPiece[] = [];
  const windowSummaries: WindowConsumptionSummary[] = [];

  let pieceCounter = 1;

  designs.forEach((design, dIdx) => {
    const qty = design.quantity && design.quantity > 0 ? design.quantity : 1;
    const w = design.width || 1200;
    const h = design.height || 1200;
    const winTag = design.tag || `W${dIdx + 1}`;
    const winLoc = design.location || 'Site Opening';
    const winType = design.type || 'Sliding Window';

    let winFrameM = 0;
    let winSashM = 0;
    let winMullionM = 0;
    let winBeadM = 0;
    let winSteelM = 0;
    let winPieceCount = 0;

    const frames = design.projectData?.frames || [];
    const couplings = design.projectData?.couplings || [];

    if (frames.length > 0) {
      // Use exact CAD calculations from cutting schedule
      const cuts = generateCuttingSchedule(frames, couplings);

      cuts.forEach((cut) => {
        // Skip pure glass panels as they are square meters, not linear extrusion bars
        if (cut.itemType === 'Glass') return;

        const totalQty = cut.quantity * qty;
        const category = categorizeCuttingItem(cut);
        const cutLen = cut.length || 100;
        const meters = (cutLen * totalQty) / 1000;

        winPieceCount += totalQty;
        if (category === 'Outer Frame') winFrameM += meters;
        else if (category === 'Sash') winSashM += meters;
        else if (category === 'Mullion/Transom') winMullionM += meters;
        else if (category === 'Glazing Bead') winBeadM += meters;
        else if (category === 'GI Reinforcement') winSteelM += meters;

        allPieces.push({
          id: `req-${pieceCounter++}`,
          tag: cut.tag || `${winTag}-P`,
          windowTag: winTag,
          location: winLoc,
          length: cutLen,
          cutAngleLeft: cut.cutAngleLeft || '45°',
          cutAngleRight: cut.cutAngleRight || '45°',
          profileCategory: category,
          profileName: cut.profileName || `${brand} Profile`,
          profileCode: cut.profileCode || 'DUR-STD',
          notes: cut.notes,
          qty: totalQty,
        });
      });
    } else {
      // Fallback: standard parametric deduction based on window type and dimensions
      // 1. Outer Frame (Top, Bottom, Left, Right) - 45° miter cuts (+6mm weld allowance)
      const fwCut = w + 6;
      const fhCut = h + 6;
      const frameTopBotQty = 2 * qty;
      const frameLeftRightQty = 2 * qty;

      allPieces.push({
        id: `req-${pieceCounter++}`,
        tag: `${winTag}-FW (Top/Bot)`,
        windowTag: winTag,
        location: winLoc,
        length: fwCut,
        cutAngleLeft: '45°',
        cutAngleRight: '45°',
        profileCategory: 'Outer Frame',
        profileName: `${brand} 60mm Outer Frame`,
        profileCode: 'DUR-OF-60',
        qty: frameTopBotQty,
      });

      allPieces.push({
        id: `req-${pieceCounter++}`,
        tag: `${winTag}-FH (Left/Right)`,
        windowTag: winTag,
        location: winLoc,
        length: fhCut,
        cutAngleLeft: '45°',
        cutAngleRight: '45°',
        profileCategory: 'Outer Frame',
        profileName: `${brand} 60mm Outer Frame`,
        profileCode: 'DUR-OF-60',
        qty: frameLeftRightQty,
      });

      winFrameM += ((fwCut * frameTopBotQty) + (fhCut * frameLeftRightQty)) / 1000;
      winPieceCount += frameTopBotQty + frameLeftRightQty;

      // 2. Sash Profiles
      const isSliding = winType.toLowerCase().includes('sliding') || winType.toLowerCase().includes('track');
      if (isSliding) {
        // 2-Track Sliding Window (2 sashes)
        const sashW = Math.round((w / 2) + 25);
        const sashH = Math.round(h - 70);
        const sashHorzQty = 4 * qty;
        const sashVertQty = 4 * qty;

        allPieces.push({
          id: `req-${pieceCounter++}`,
          tag: `${winTag}-SW (Sash Top/Bot)`,
          windowTag: winTag,
          location: winLoc,
          length: sashW,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          profileCategory: 'Sash',
          profileName: `${brand} 60mm Sliding Sash`,
          profileCode: 'DUR-SS-60',
          qty: sashHorzQty,
        });

        allPieces.push({
          id: `req-${pieceCounter++}`,
          tag: `${winTag}-SH (Sash Vert)`,
          windowTag: winTag,
          location: winLoc,
          length: sashH,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          profileCategory: 'Sash',
          profileName: `${brand} 60mm Sliding Sash`,
          profileCode: 'DUR-SS-60',
          qty: sashVertQty,
        });

        // Interlock
        allPieces.push({
          id: `req-${pieceCounter++}`,
          tag: `${winTag}-INT (Interlock)`,
          windowTag: winTag,
          location: winLoc,
          length: sashH,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          profileCategory: 'Interlock & Addon',
          profileName: `${brand} Heavy Duty Interlock`,
          profileCode: 'DUR-INT-01',
          qty: 2 * qty,
        });

        winSashM += ((sashW * sashHorzQty) + (sashH * sashVertQty)) / 1000;
        winPieceCount += sashHorzQty + sashVertQty + (2 * qty);
      } else {
        // Casement Window
        const sashW = Math.round(w - 84);
        const sashH = Math.round(h - 84);
        const sashQty = 2 * qty;

        allPieces.push({
          id: `req-${pieceCounter++}`,
          tag: `${winTag}-CS-W`,
          windowTag: winTag,
          location: winLoc,
          length: sashW,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          profileCategory: 'Sash',
          profileName: `${brand} Casement Sash`,
          profileCode: 'DUR-CS-60',
          qty: sashQty,
        });

        allPieces.push({
          id: `req-${pieceCounter++}`,
          tag: `${winTag}-CS-H`,
          windowTag: winTag,
          location: winLoc,
          length: sashH,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          profileCategory: 'Sash',
          profileName: `${brand} Casement Sash`,
          profileCode: 'DUR-CS-60',
          qty: sashQty,
        });

        winSashM += ((sashW * sashQty) + (sashH * sashQty)) / 1000;
        winPieceCount += sashQty * 2;
      }

      // 3. Glazing Beads
      const beadW = Math.round(w / 2 - 80);
      const beadH = Math.round(h - 140);
      const beadQty = 4 * qty;

      allPieces.push({
        id: `req-${pieceCounter++}`,
        tag: `${winTag}-GB-W`,
        windowTag: winTag,
        location: winLoc,
        length: Math.max(100, beadW),
        cutAngleLeft: '45°',
        cutAngleRight: '45°',
        profileCategory: 'Glazing Bead',
        profileName: `${brand} 24mm Glazing Bead`,
        profileCode: 'DUR-GB-24',
        qty: beadQty,
      });

      allPieces.push({
        id: `req-${pieceCounter++}`,
        tag: `${winTag}-GB-H`,
        windowTag: winTag,
        location: winLoc,
        length: Math.max(100, beadH),
        cutAngleLeft: '45°',
        cutAngleRight: '45°',
        profileCategory: 'Glazing Bead',
        profileName: `${brand} 24mm Glazing Bead`,
        profileCode: 'DUR-GB-24',
        qty: beadQty,
      });

      winBeadM += ((beadW * beadQty) + (beadH * beadQty)) / 1000;
      winPieceCount += beadQty * 2;

      // 4. GI Steel Reinforcement (Outer frame & Sash) - 100mm deduction
      const steelFW = Math.max(100, fwCut - 100);
      const steelFH = Math.max(100, fhCut - 100);
      const steelQty = 2 * qty;

      allPieces.push({
        id: `req-${pieceCounter++}`,
        tag: `${winTag}-ST-FW`,
        windowTag: winTag,
        location: winLoc,
        length: steelFW,
        cutAngleLeft: '90°',
        cutAngleRight: '90°',
        profileCategory: 'GI Reinforcement',
        profileName: 'GI Steel 1.5mm Chamber Tube',
        profileCode: 'GI-1.5MM-F',
        qty: steelQty,
      });

      allPieces.push({
        id: `req-${pieceCounter++}`,
        tag: `${winTag}-ST-FH`,
        windowTag: winTag,
        location: winLoc,
        length: steelFH,
        cutAngleLeft: '90°',
        cutAngleRight: '90°',
        profileCategory: 'GI Reinforcement',
        profileName: 'GI Steel 1.5mm Chamber Tube',
        profileCode: 'GI-1.5MM-F',
        qty: steelQty,
      });

      winSteelM += ((steelFW * steelQty) + (steelFH * steelQty)) / 1000;
      winPieceCount += steelQty * 2;
    }

    windowSummaries.push({
      windowId: design.id,
      tag: winTag,
      location: winLoc,
      type: winType,
      width: w,
      height: h,
      quantity: qty,
      totalPieces: winPieceCount,
      totalFrameMeters: Number(winFrameM.toFixed(2)),
      totalSashMeters: Number(winSashM.toFixed(2)),
      totalMullionMeters: Number(winMullionM.toFixed(2)),
      totalBeadMeters: Number(winBeadM.toFixed(2)),
      totalSteelMeters: Number(winSteelM.toFixed(2)),
      totalLinearMeters: Number((winFrameM + winSashM + winMullionM + winBeadM + winSteelM).toFixed(2)),
    });
  });

  // 3. Group pieces by Profile Category & Profile Code
  const groupsMap = new Map<string, RequiredCutPiece[]>();

  allPieces.forEach((piece) => {
    const key = `${piece.profileCategory}__${piece.profileName}`;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(piece);
  });

  // Weights and rates per meter/kg
  const defaultWeightsKgPerM: Record<string, number> = {
    'Outer Frame': 1.25,
    Sash: 1.15,
    'Mullion/Transom': 1.35,
    'Glazing Bead': 0.28,
    'Interlock & Addon': 0.65,
    'GI Reinforcement': 1.10,
  };

  const defaultRatesPerMeter: Record<string, number> = {
    'Outer Frame': 380,
    Sash: 360,
    'Mullion/Transom': 420,
    'Glazing Bead': 85,
    'Interlock & Addon': 210,
    'GI Reinforcement': 160,
  };

  const sections: ProfileSectionRequirement[] = [];
  const upvcSections: ProfileSectionRequirement[] = [];
  const giSections: ProfileSectionRequirement[] = [];

  let totalStandardBars = 0;
  let totalNetMeters = 0;
  let totalProcuredMeters = 0;
  let totalPiecesCount = 0;
  let totalWeightKg = 0;
  let totalEstimatedCost = 0;

  // uPVC Sub-totals (Plastics only)
  let upvcBarsCount = 0;
  let upvcNetM = 0;
  let upvcProcuredM = 0;
  let upvcPiecesCount = 0;
  let upvcWeightKg = 0;
  let upvcCost = 0;

  // GI Reinforcement Sub-totals (Steel only)
  let giPipesCount = 0;
  let giNetM = 0;
  let giProcuredM = 0;
  let giPiecesCount = 0;
  let giWeightKg = 0;
  let giCost = 0;

  groupsMap.forEach((pieces, groupKey) => {
    const [category, profileName] = groupKey.split('__') as [RequiredCutPiece['profileCategory'], string];
    const profileCode = pieces[0]?.profileCode || 'DUR-STD';
    const isGI = category === 'GI Reinforcement';

    // Base default stock length: uPVC defaults to barLength (5800mm), GI defaults to giPipeLength (6000mm or custom)
    const effectiveBaseLength = isGI ? giPipeLength : barLength;
    const effectiveKerf = isGI ? giKerf : sawKerf;

    // Check if custom bar length is assigned for this specific section or category
    const customLen =
      options?.sectionBarLengths?.[groupKey] ??
      options?.sectionBarLengths?.[category] ??
      options?.sectionBarLengths?.[profileCode];
    const secBarLength = customLen && customLen > 0 ? customLen : effectiveBaseLength;

    // Optimize pieces into stock bars of secBarLength mm
    const optimizedBars = optimizePiecesIntoBars(pieces, secBarLength, effectiveKerf);

    let secTotalPieces = 0;
    let secNetMm = 0;

    pieces.forEach((p) => {
      secTotalPieces += p.qty;
      secNetMm += p.length * p.qty;
    });

    const secNetMeters = Number((secNetMm / 1000).toFixed(2));
    const secBarsCount = optimizedBars.length;
    const secProcuredMm = secBarsCount * secBarLength;
    const secProcuredMeters = Number((secProcuredMm / 1000).toFixed(2));
    const secOffcutMm = Math.max(0, secProcuredMm - secNetMm);
    const secOffcutMeters = Number((secOffcutMm / 1000).toFixed(2));
    const secOffcutPercent = secProcuredMm > 0 ? Number(((secOffcutMm / secProcuredMm) * 100).toFixed(1)) : 0;
    const secEfficiencyPercent = Number((100 - secOffcutPercent).toFixed(1));

    // Reusable offcut count (leftover >= 500mm)
    let reusableOffcutsCount = 0;
    let scrapMm = 0;

    optimizedBars.forEach((bar) => {
      if (bar.remainingLength >= 500) {
        reusableOffcutsCount++;
      } else {
        scrapMm += bar.remainingLength;
      }
    });

    const weightPerM = defaultWeightsKgPerM[category] || 1.1;
    const ratePerM = defaultRatesPerMeter[category] || (isGI ? 160 : 320);

    const approxWeightKg = Number((secProcuredMeters * weightPerM).toFixed(1));
    const approxTotalCost = Math.round(secProcuredMeters * ratePerM);
    const approxRatePerBar = secBarsCount > 0 ? Math.round(approxTotalCost / secBarsCount) : 0;

    // Combined totals
    totalStandardBars += secBarsCount;
    totalNetMeters += secNetMeters;
    totalProcuredMeters += secProcuredMeters;
    totalPiecesCount += secTotalPieces;
    totalWeightKg += approxWeightKg;
    totalEstimatedCost += approxTotalCost;

    const sectionItem: ProfileSectionRequirement = {
      id: groupKey,
      category,
      profileName,
      profileCode,
      standardBarLength: secBarLength,
      totalPieces: secTotalPieces,
      totalNetMm: secNetMm,
      totalNetMeters: secNetMeters,
      requiredBarsCount: secBarsCount,
      totalProcuredMeters: secProcuredMeters,
      totalOffcutMm: secOffcutMm,
      totalOffcutMeters: secOffcutMeters,
      offcutPercent: secOffcutPercent,
      efficiencyPercent: secEfficiencyPercent,
      reusableOffcutsCount,
      scrapMm,
      approxWeightKg,
      approxRatePerBar,
      approxTotalCost,
      pieces,
      optimizedBars,
    };

    sections.push(sectionItem);

    if (isGI) {
      giSections.push(sectionItem);
      giPipesCount += secBarsCount;
      giNetM += secNetMeters;
      giProcuredM += secProcuredMeters;
      giPiecesCount += secTotalPieces;
      giWeightKg += approxWeightKg;
      giCost += approxTotalCost;
    } else {
      upvcSections.push(sectionItem);
      upvcBarsCount += secBarsCount;
      upvcNetM += secNetMeters;
      upvcProcuredM += secProcuredMeters;
      upvcPiecesCount += secTotalPieces;
      upvcWeightKg += approxWeightKg;
      upvcCost += approxTotalCost;
    }
  });

  // Sort sections in logical order: Outer Frame -> Sash -> Mullion -> Bead -> Interlock -> Steel
  const categoryOrder: Record<string, number> = {
    'Outer Frame': 1,
    Sash: 2,
    'Mullion/Transom': 3,
    'Glazing Bead': 4,
    'Interlock & Addon': 5,
    'GI Reinforcement': 6,
  };

  sections.sort((a, b) => (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99));
  upvcSections.sort((a, b) => (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99));
  giSections.sort((a, b) => (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99));

  const overallEfficiencyPercent =
    totalProcuredMeters > 0
      ? Number(((totalNetMeters / totalProcuredMeters) * 100).toFixed(1))
      : 0;
  const overallWastagePercent = Number((100 - overallEfficiencyPercent).toFixed(1));

  // uPVC Sub-summary
  const upvcEffPercent = upvcProcuredM > 0 ? Number(((upvcNetM / upvcProcuredM) * 100).toFixed(1)) : 0;
  const upvcSummary: RequisitionSubSummary = {
    totalBarsOrPipes: upvcBarsCount,
    totalNetMeters: Number(upvcNetM.toFixed(2)),
    totalProcuredMeters: Number(upvcProcuredM.toFixed(2)),
    totalPiecesCount: upvcPiecesCount,
    totalWeightKg: Number(upvcWeightKg.toFixed(1)),
    totalEstimatedCost: upvcCost,
    overallEfficiencyPercent: upvcEffPercent,
    overallWastagePercent: Number((100 - upvcEffPercent).toFixed(1)),
  };

  // GI Sub-summary
  const giEffPercent = giProcuredM > 0 ? Number(((giNetM / giProcuredM) * 100).toFixed(1)) : 0;
  const giSummary = {
    totalBarsOrPipes: giPipesCount,
    totalPipesCount: giPipesCount,
    standardPipeLength: giPipeLength,
    totalNetMeters: Number(giNetM.toFixed(2)),
    totalProcuredMeters: Number(giProcuredM.toFixed(2)),
    totalPiecesCount: giPiecesCount,
    totalWeightKg: Number(giWeightKg.toFixed(1)),
    totalEstimatedCost: giCost,
    overallEfficiencyPercent: giEffPercent,
    overallWastagePercent: Number((100 - giEffPercent).toFixed(1)),
  };

  return {
    standardBarLength: barLength,
    sawKerf,
    giStandardPipeLength: giPipeLength,
    giSawKerf: giKerf,
    totalStandardBars,
    totalNetMeters: Number(totalNetMeters.toFixed(2)),
    totalProcuredMeters: Number(totalProcuredMeters.toFixed(2)),
    totalPiecesCount,
    overallEfficiencyPercent,
    overallWastagePercent,
    totalWeightKg: Number(totalWeightKg.toFixed(1)),
    totalEstimatedCost,
    sections,
    upvcSections,
    giSections,
    upvcSummary,
    giSummary,
    windowSummaries,
  };
}
