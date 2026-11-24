import {
  UPVCFrame,
  Mullion,
  FramePocket,
  SashType,
  CouplingConnection,
  CouplerType,
  CuttingItem,
  BOMItem,
  PricingConfig,
  UPVCColor,
} from '../types/upvc';
import {
  CustomSeries,
  ManufacturingNiyamRules,
  INITIAL_CUSTOM_SERIES,
  INITIAL_MANUFACTURING_NIYAM,
  STORAGE_KEY_CUSTOM_SERIES,
  STORAGE_KEY_FABRICATION_RULES,
} from '../constants/customSeriesMaster';
import {
  InventoryMasterItem,
  getActiveInventoryMaster,
  getInventoryItemPrice,
  lookupProfileWeight,
  USER_PROFILE_WEIGHT_CATALOGUE,
} from '../constants/inventory';
import { getGlassDisplayName } from './glassUtils';

export const DEFAULT_COLORS: UPVCColor[] = [
  {
    id: 'white',
    name: 'Standard White',
    nameHindi: 'सफेद (White)',
    hex: '#F8FAFC',
    borderHex: '#1E293B',
    innerShade: '#F1F5F9',
    texture: 'smooth',
  },
  {
    id: 'anthracite',
    name: 'Anthracite Grey (RAL 7016)',
    nameHindi: 'डार्क ग्रे (Anthracite)',
    hex: '#334155',
    borderHex: '#1E293B',
    innerShade: '#475569',
    texture: 'smooth',
  },
  {
    id: 'golden_oak',
    name: 'Golden Oak (Woodgrain)',
    nameHindi: 'गोल्डन ओक (लकड़ी)',
    hex: '#9A6B38',
    borderHex: '#784E20',
    innerShade: '#B8864E',
    texture: 'woodgrain',
  },
  {
    id: 'walnut',
    name: 'Walnut (Dark Wood)',
    nameHindi: 'अखरोट / वालनट (Walnut)',
    hex: '#533725',
    borderHex: '#382215',
    innerShade: '#6B4731',
    texture: 'woodgrain',
  },
  {
    id: 'matt_black',
    name: 'Jet Matt Black (RAL 9005)',
    nameHindi: 'मैट ब्लैक (Black)',
    hex: '#18181B',
    borderHex: '#09090B',
    innerShade: '#27272A',
    texture: 'smooth',
  },
  {
    id: 'mahogany',
    name: 'Mahogany Red-Brown',
    nameHindi: 'महोगनी (Mahogany)',
    hex: '#6B2B24',
    borderHex: '#4C1B16',
    innerShade: '#85372E',
    texture: 'woodgrain',
  },
];

/**
 * Safely normalizes any frame color value (string ID or legacy color object) into a clean color ID string.
 */
export function normalizeFrameColorId(color: unknown, fallback = 'white'): string {
  if (typeof color === 'string') {
    const trimmed = color.trim();
    return trimmed || fallback;
  }
  if (color && typeof color === 'object') {
    const obj = color as Record<string, unknown>;
    if (typeof obj.id === 'string' && obj.id.trim()) return obj.id.trim();
    if (typeof obj.name === 'string' && obj.name.trim()) return obj.name.trim();
  }
  return fallback;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  currencySymbol: '₹',
  profileRatePerMeter: 480, // Outer frame profile per meter
  mullionRatePerMeter: 540, // Mullion profile per meter
  sashRatePerMeter: 510,    // Sash profile per meter
  couplerRatePerMeter: 350, // Coupler profile per meter
  reinforcementRatePerMeter: 120, // Steel per meter
  glassRatePerSqMeter: {
    clear_5mm: 650,
    clear_6mm: 780,
    clear_8mm: 980,
    clear_10mm: 1250,
    clear_12mm: 1650,
    dgu_5_12_5: 1850,
    dgu_6_16_6: 2200,
    dgu_5_10_5: 1750,
    dgu_30mm: 2750,
    laminated_11_52: 2450,
    laminated_13_52: 2950,
    frosted: 850,
    tint_bronze: 920,
    tint_green: 920,
    tint_blue: 950,
    tint_grey: 920,
    low_e: 1450,
    reflective_mirror: 1280,
    pinhead: 820,
  },
  hardwareRates: {
    frictionStay: 450,
    casementHandle: 320,
    slidingRoller: 240,
    slidingLock: 380,
    espagMultiPoint: 850,
    hinge: 180,
    meshPerSqM: 450,
    drainageCap: 15,
    cornerCleat: 35,
  },
  fabricationWastagePercent: 8,
  laborCostPerSqM: 400,
  taxPercent: 18,
};

/**
 * Recomputes all pocket geometries for a given UPVCFrame based on outer frame dimensions and mullions.
 * Preserves user-assigned properties (sashType, glassType, etc.) by matching quadrant or ID.
 */
export function recalculateFramePockets(frame: UPVCFrame): FramePocket[] {
  // Check if this frame is configured as a 3-sided door frame (no bottom sill)
  const is3SideFrame = Boolean(
    frame.isThreeSidedFrame ||
    frame.frameSides === '3_side' ||
    (frame.pockets || []).some((p) => p.isThreeSidedFrame || p.frameSides === '3_side')
  );

  // Slender, realistic front elevation profile face width (standard UPVC/Aluminium: 45mm)
  const fpw = Math.min(frame.frameProfileWidth || 45, 45);
  const mpw = frame.mullionProfileWidth || 74;

  const bottomFrameMargin = is3SideFrame ? 0 : fpw;
  const innerX = fpw;
  const innerY = fpw;
  const innerWidth = Math.max(50, frame.width - 2 * fpw);
  const innerHeight = Math.max(50, frame.height - fpw - bottomFrameMargin);

  // Global full-span mullions (no parent pocket and no partial span)
  const vMullions = (frame.mullions || [])
    .filter((m) => m.orientation === 'vertical' && !m.parentPocketId && m.spanStart === undefined)
    .sort((a, b) => a.position - b.position);

  const hMullions = (frame.mullions || [])
    .filter((m) => m.orientation === 'horizontal' && !m.parentPocketId && m.spanStart === undefined)
    .sort((a, b) => a.position - b.position);

  const subMullions = (frame.mullions || []).filter(
    (m) => m.parentPocketId !== undefined || m.spanStart !== undefined
  );

  // Calculate vertical column segments [start, width]
  const xSegments: { x: number; width: number }[] = [];
  let currentX = innerX;

  if (vMullions.length === 0) {
    xSegments.push({ x: innerX, width: innerWidth });
  } else {
    for (let i = 0; i < vMullions.length; i++) {
      const m = vMullions[i];
      const mWidth = m.width || mpw;
      // Clamped mullion center relative to frame outer edge
      const mPos = Math.max(innerX + 50, Math.min(frame.width - innerX - 50, m.position));
      const segmentWidth = Math.max(40, mPos - currentX - mWidth / 2);
      xSegments.push({ x: currentX, width: segmentWidth });
      currentX = mPos + mWidth / 2;
    }
    // Final segment
    const finalWidth = Math.max(40, frame.width - innerX - currentX);
    xSegments.push({ x: currentX, width: finalWidth });
  }

  // Calculate horizontal row segments [start, height]
  const ySegments: { y: number; height: number }[] = [];
  let currentY = innerY;

  if (hMullions.length === 0) {
    ySegments.push({ y: innerY, height: innerHeight });
  } else {
    for (let j = 0; j < hMullions.length; j++) {
      const m = hMullions[j];
      const mWidth = m.width || mpw;
      // Clamped mullion center
      const mPos = Math.max(innerY + 50, Math.min(frame.height - innerY - 50, m.position));
      const segmentHeight = Math.max(40, mPos - currentY - mWidth / 2);
      ySegments.push({ y: currentY, height: segmentHeight });
      currentY = mPos + mWidth / 2;
    }
    // Final segment
    const finalHeight = Math.max(40, frame.height - bottomFrameMargin - currentY);
    ySegments.push({ y: currentY, height: finalHeight });
  }

  // Map old pockets to preserve custom settings
  const oldPocketsMap = new Map<string, FramePocket>();
  (frame.pockets || []).forEach((p) => {
    oldPocketsMap.set(p.id, p);
  });

  interface BaseGridPocket {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    row: number;
    col: number;
  }

  const basePockets: BaseGridPocket[] = [];
  for (let row = 0; row < ySegments.length; row++) {
    for (let col = 0; col < xSegments.length; col++) {
      const segX = xSegments[col];
      const segY = ySegments[row];
      basePockets.push({
        id: `${frame.id}-pocket-${row}-${col}`,
        x: Math.round(segX.x),
        y: Math.round(segY.y),
        width: Math.round(segX.width),
        height: Math.round(segY.height),
        row,
        col,
      });
    }
  }

  const newPockets: FramePocket[] = [];
  let pocketIndex = 0;

  const createPocketObj = (
    pocketId: string,
    pX: number,
    pY: number,
    pW: number,
    pH: number,
    label: string
  ): FramePocket => {
    const centerX = pX + pW / 2;
    const centerY = pY + pH / 2;
    const spatialMatch = (frame.pockets || []).find(
      (p) => centerX >= p.x && centerX <= p.x + p.width && centerY >= p.y && centerY <= p.y + p.height
    );
    const existing = oldPocketsMap.get(pocketId) || spatialMatch;

    let resolvedSashType: SashType = 'fixed';
    if (existing) {
      resolvedSashType = existing.sashType;
    }

    const isSliderSash =
      resolvedSashType.startsWith('slider') ||
      resolvedSashType.startsWith('mesh_slider') ||
      resolvedSashType === 'mesh_sash';

    let naturalHandlePos: 'left' | 'right' | 'top' | 'bottom';
    if (resolvedSashType === 'casement_left') {
      naturalHandlePos = 'left';
    } else if (resolvedSashType === 'casement_right') {
      naturalHandlePos = 'right';
    } else if (resolvedSashType === 'top_hung') {
      naturalHandlePos = 'bottom';
    } else if (resolvedSashType === 'bottom_hung') {
      naturalHandlePos = 'top';
    } else if (isSliderSash) {
      // Sliding handle ALWAYS defaults to the vertical stile on the OUTER FRAME side:
      const isLeftOfCenter = (pX + pW / 2) < (frame.width / 2);
      naturalHandlePos = isLeftOfCenter ? 'left' : 'right';
    } else {
      const isLeftOfCenter = (pX + pW / 2) < (frame.width / 2);
      naturalHandlePos = isLeftOfCenter ? 'left' : 'right';
    }

    // Determine initial or preserved handle position
    let resolvedHandlePos: 'left' | 'right' | 'top' | 'bottom' = naturalHandlePos;
    if (resolvedSashType === 'casement_left') {
      resolvedHandlePos = 'left';
    } else if (resolvedSashType === 'casement_right') {
      resolvedHandlePos = 'right';
    } else if (resolvedSashType === 'top_hung') {
      resolvedHandlePos = 'bottom';
    } else if (resolvedSashType === 'bottom_hung') {
      resolvedHandlePos = 'top';
    } else if (existing?.handlePosition && existing.sashType === resolvedSashType) {
      // Auto-correct previously misassigned center handle on left-sliding panels
      if (
        isSliderSash &&
        (resolvedSashType === 'slider_arrow_right' || resolvedSashType === 'slider_2s_xo') &&
        existing.handlePosition === 'right'
      ) {
        resolvedHandlePos = 'left';
      } else {
        resolvedHandlePos = existing.handlePosition as any;
      }
    }

    return {
      ...(existing || {}),
      id: pocketId,
      frameId: frame.id,
      x: Math.round(pX),
      y: Math.round(pY),
      width: Math.round(pW),
      height: Math.round(pH),
      sashType: resolvedSashType,
      glassType: existing ? existing.glassType : 'clear_5mm',
      gridPattern: existing ? existing.gridPattern : (frame.georgianBar?.pattern || 'none'),
      georgianBar: existing?.georgianBar || frame.georgianBar,
      handlePosition: resolvedHandlePos,
      hasMesh: existing ? existing.hasMesh : false,
      hasFanCutout: existing ? existing.hasFanCutout : false,
      fanCutoutDiameter: existing ? existing.fanCutoutDiameter : 200,
      fanPanelType: existing ? existing.fanPanelType : undefined,
      fanHorizontalAlign: existing ? existing.fanHorizontalAlign : 'center',
      hasACLouver: existing ? existing.hasACLouver : false,
      acUnitType: existing ? existing.acUnitType : undefined,
      acWidth: existing ? existing.acWidth : undefined,
      acHeight: existing ? existing.acHeight : undefined,
      sashProfileCode: existing?.sashProfileCode,
      sashProfileTop: existing?.sashProfileTop,
      sashProfileBottom: existing?.sashProfileBottom,
      sashProfileLeft: existing?.sashProfileLeft,
      sashProfileRight: existing?.sashProfileRight,
      applicationType: existing?.applicationType,
      seriesCode: existing?.seriesCode,
      beadProfileCode: existing?.beadProfileCode,
      handleType: existing?.handleType,
      handleCode: existing?.handleCode,
      handleColor: existing?.handleColor,
      handleHeight: existing?.handleHeight,
      rollerType: existing?.rollerType,
      hingeType: existing?.hingeType,
      stayType: existing?.stayType,
      tLockType: existing?.tLockType,
      shutterHingeType: existing?.shutterHingeType,
      hasGrill: existing?.hasGrill,
      grillPattern: existing?.grillPattern,
      grillMaterial: existing?.grillMaterial,
      reinforcementCavity: existing?.reinforcementCavity,
      customLabel: existing?.customLabel || label,
    };
  };

  // Now process base pockets and subdivide if sub-mullions belong to this specific pocket
  for (const base of basePockets) {
    const vSubs = subMullions
      .filter((m) => {
        if (m.orientation !== 'vertical') return false;
        if (m.parentPocketId && m.parentPocketId === base.id) return true;
        if (m.spanStart !== undefined && m.spanEnd !== undefined) {
          const midY = (m.spanStart + m.spanEnd) / 2;
          return (
            midY >= base.y - 10 &&
            midY <= base.y + base.height + 10 &&
            m.position >= base.x + 20 &&
            m.position <= base.x + base.width - 20
          );
        }
        return false;
      })
      .sort((a, b) => a.position - b.position);

    const hSubs = subMullions
      .filter((m) => {
        if (m.orientation !== 'horizontal') return false;
        if (m.parentPocketId && m.parentPocketId === base.id) return true;
        if (m.spanStart !== undefined && m.spanEnd !== undefined) {
          const midX = (m.spanStart + m.spanEnd) / 2;
          return (
            midX >= base.x - 10 &&
            midX <= base.x + base.width + 10 &&
            m.position >= base.y + 20 &&
            m.position <= base.y + base.height - 20
          );
        }
        return false;
      })
      .sort((a, b) => a.position - b.position);

    if (vSubs.length > 0) {
      // Divide this pocket horizontally into vSubs.length + 1 bays
      let currX = base.x;
      for (let k = 0; k < vSubs.length; k++) {
        const sm = vSubs[k];
        const smW = sm.width || mpw;
        const mPos = Math.max(base.x + 40, Math.min(base.x + base.width - 40, sm.position));
        const segW = Math.max(30, mPos - currX - smW / 2);

        sm.spanStart = base.y;
        sm.spanEnd = base.y + base.height;
        sm.parentPocketId = base.id;

        const pId = `${base.id}-sub-v-${k}`;
        
        // Check if there are horizontal transoms inside this vertical sub-pocket
        const nestedH = hSubs.filter(
          (hm) =>
            hm.parentPocketId === pId ||
            (hm.position >= base.y + 20 &&
              hm.position <= base.y + base.height - 20 &&
              hm.spanStart !== undefined &&
              hm.spanEnd !== undefined &&
              (hm.spanStart + hm.spanEnd) / 2 >= currX - 10 &&
              (hm.spanStart + hm.spanEnd) / 2 <= currX + segW + 10)
        ).sort((a, b) => a.position - b.position);

        if (nestedH.length > 0) {
          let subY = base.y;
          for (let nh = 0; nh < nestedH.length; nh++) {
            const nhm = nestedH[nh];
            const nhW = nhm.width || mpw;
            const nhPos = Math.max(base.y + 40, Math.min(base.y + base.height - 40, nhm.position));
            const subH = Math.max(30, nhPos - subY - nhW / 2);
            nhm.spanStart = currX;
            nhm.spanEnd = currX + segW;
            nhm.parentPocketId = pId;
            newPockets.push(
              createPocketObj(`${pId}-h-${nh}`, currX, subY, segW, subH, `Bay ${base.row + 1}.${base.col + 1}.${k + 1}.${nh + 1}`)
            );
            pocketIndex++;
            subY = nhPos + nhW / 2;
          }
          const finalSubH = Math.max(30, base.y + base.height - subY);
          newPockets.push(
            createPocketObj(`${pId}-h-${nestedH.length}`, currX, subY, segW, finalSubH, `Bay ${base.row + 1}.${base.col + 1}.${k + 1}.${nestedH.length + 1}`)
          );
          pocketIndex++;
        } else {
          newPockets.push(createPocketObj(pId, currX, base.y, segW, base.height, `Bay ${base.row + 1}.${base.col + 1}.${k + 1}`));
          pocketIndex++;
        }
        currX = mPos + smW / 2;
      }
      const finalSegW = Math.max(30, base.x + base.width - currX);
      const pId = `${base.id}-sub-v-${vSubs.length}`;

      // Check if there are horizontal transoms inside the final vertical sub-pocket
      const nestedH = hSubs.filter(
        (hm) =>
          hm.parentPocketId === pId ||
          (hm.position >= base.y + 20 &&
            hm.position <= base.y + base.height - 20 &&
            hm.spanStart !== undefined &&
            hm.spanEnd !== undefined &&
            (hm.spanStart + hm.spanEnd) / 2 >= currX - 10 &&
            (hm.spanStart + hm.spanEnd) / 2 <= currX + finalSegW + 10)
      ).sort((a, b) => a.position - b.position);

      if (nestedH.length > 0) {
        let subY = base.y;
        for (let nh = 0; nh < nestedH.length; nh++) {
          const nhm = nestedH[nh];
          const nhW = nhm.width || mpw;
          const nhPos = Math.max(base.y + 40, Math.min(base.y + base.height - 40, nhm.position));
          const subH = Math.max(30, nhPos - subY - nhW / 2);
          nhm.spanStart = currX;
          nhm.spanEnd = currX + finalSegW;
          nhm.parentPocketId = pId;
          newPockets.push(
            createPocketObj(`${pId}-h-${nh}`, currX, subY, finalSegW, subH, `Bay ${base.row + 1}.${base.col + 1}.${vSubs.length + 1}.${nh + 1}`)
          );
          pocketIndex++;
          subY = nhPos + nhW / 2;
        }
        const finalSubH = Math.max(30, base.y + base.height - subY);
        newPockets.push(
          createPocketObj(`${pId}-h-${nestedH.length}`, currX, subY, finalSegW, finalSubH, `Bay ${base.row + 1}.${base.col + 1}.${vSubs.length + 1}.${nestedH.length + 1}`)
        );
        pocketIndex++;
      } else {
        newPockets.push(
          createPocketObj(
            pId,
            currX,
            base.y,
            finalSegW,
            base.height,
            `Bay ${base.row + 1}.${base.col + 1}.${vSubs.length + 1}`
          )
        );
        pocketIndex++;
      }
    } else if (hSubs.length > 0) {
      // Divide this pocket vertically into hSubs.length + 1 bays
      let currY = base.y;
      for (let k = 0; k < hSubs.length; k++) {
        const sm = hSubs[k];
        const smW = sm.width || mpw;
        const mPos = Math.max(base.y + 40, Math.min(base.y + base.height - 40, sm.position));
        const segH = Math.max(30, mPos - currY - smW / 2);

        sm.spanStart = base.x;
        sm.spanEnd = base.x + base.width;
        sm.parentPocketId = base.id;

        const pId = `${base.id}-sub-h-${k}`;
        newPockets.push(createPocketObj(pId, base.x, currY, base.width, segH, `Bay ${base.row + 1}.${base.col + 1}.${k + 1}`));
        pocketIndex++;
        currY = mPos + smW / 2;
      }
      const finalSegH = Math.max(30, base.y + base.height - currY);
      const pId = `${base.id}-sub-h-${hSubs.length}`;
      newPockets.push(
        createPocketObj(
          pId,
          base.x,
          currY,
          base.width,
          finalSegH,
          `Bay ${base.row + 1}.${base.col + 1}.${hSubs.length + 1}`
        )
      );
      pocketIndex++;
    } else {
      // Keep un-split pocket (e.g. top light remains 1 pocket)
      newPockets.push(
        createPocketObj(
          base.id,
          base.x,
          base.y,
          base.width,
          base.height,
          `Bay ${base.row + 1}.${base.col + 1}`
        )
      );
      pocketIndex++;
    }
  }

  return newPockets;
}

/**
 * Equalizes all mullions and transoms inside a frame with profile-compensated equal glass bays.
 * Handles both global full-frame mullions and sectional sub-mullions within their parent pockets.
 */
export function equalizeFrameMullions(frame: UPVCFrame): UPVCFrame {
  if (!frame.mullions || frame.mullions.length === 0) return frame;

  // 1. Equalize global vertical mullions into equal bay segments
  const globalVMullions = frame.mullions
    .filter((m) => m.orientation === 'vertical' && (m.spanStart === undefined || m.spanStart === null))
    .sort((a, b) => a.position - b.position);

  const globalVMullionMap = new Map<string, number>();
  if (globalVMullions.length > 0) {
    const N = globalVMullions.length;
    const segW = frame.width / (N + 1);
    for (let i = 0; i < N; i++) {
      const pos = Math.round((i + 1) * segW);
      globalVMullionMap.set(globalVMullions[i].id, pos);
    }
  }

  // 2. Equalize global horizontal transoms into equal bay segments
  const globalHMullions = frame.mullions
    .filter((m) => m.orientation === 'horizontal' && (m.spanStart === undefined || m.spanStart === null))
    .sort((a, b) => a.position - b.position);

  const globalHMullionMap = new Map<string, number>();
  if (globalHMullions.length > 0) {
    const N = globalHMullions.length;
    const segH = frame.height / (N + 1);
    for (let j = 0; j < N; j++) {
      const pos = Math.round((j + 1) * segH);
      globalHMullionMap.set(globalHMullions[j].id, pos);
    }
  }

  // 3. Equalize sectional mullions within each base pocket
  const sectionalMullionMap = new Map<string, number>();
  const sectionalMullions = frame.mullions.filter(
    (m) => m.spanStart !== undefined || m.parentPocketId !== undefined
  );

  const pocketGroups = new Map<string, Mullion[]>();
  sectionalMullions.forEach((m) => {
    const key = `${m.parentPocketId || `${m.spanStart}-${m.spanEnd}`}_${m.orientation}`;
    if (!pocketGroups.has(key)) pocketGroups.set(key, []);
    pocketGroups.get(key)!.push(m);
  });

  pocketGroups.forEach((mullions) => {
    if (mullions.length === 0) return;
    const first = mullions[0];
    const parentPocket = frame.pockets?.find((p) => p.id === first.parentPocketId);
    const orient = first.orientation;

    mullions.sort((a, b) => a.position - b.position);
    const K = mullions.length;

    if (orient === 'vertical') {
      const startX = parentPocket ? parentPocket.x : (first.spanStart !== undefined ? 0 : 0);
      const spanW = parentPocket ? parentPocket.width : frame.width;
      const segW = spanW / (K + 1);
      for (let i = 0; i < K; i++) {
        const pos = Math.round(startX + (i + 1) * segW);
        sectionalMullionMap.set(mullions[i].id, pos);
      }
    } else {
      const startY = parentPocket ? parentPocket.y : (first.spanStart !== undefined ? 0 : 0);
      const spanH = parentPocket ? parentPocket.height : frame.height;
      const segH = spanH / (K + 1);
      for (let j = 0; j < K; j++) {
        const pos = Math.round(startY + (j + 1) * segH);
        sectionalMullionMap.set(mullions[j].id, pos);
      }
    }
  });

  const updatedMullions = frame.mullions.map((m) => {
    if (globalVMullionMap.has(m.id)) {
      return { ...m, position: globalVMullionMap.get(m.id)! };
    }
    if (globalHMullionMap.has(m.id)) {
      return { ...m, position: globalHMullionMap.get(m.id)! };
    }
    if (sectionalMullionMap.has(m.id)) {
      return { ...m, position: sectionalMullionMap.get(m.id)! };
    }
    return m;
  });

  const modFrame = { ...frame, mullions: updatedMullions };
  modFrame.pockets = recalculateFramePockets(modFrame);
  return modFrame;
}

/**
 * Splits a target frame horizontally into two coupled frames (Top and Bottom)
 * with a horizontal 2mm coupling joint between them.
 */
export function splitFrameHorizontalWithCoupling(
  frames: UPVCFrame[],
  couplings: CouplingConnection[],
  targetFrameId: string,
  splitRatio: number = 0.5,
  gap: number = 2,
  couplerType: CouplerType = 'flat_2mm',
  angle?: number,
  bendDirection?: 'inward' | 'outward'
): { frames: UPVCFrame[]; couplings: CouplingConnection[]; newFrameIds: [string, string] } {
  const targetIndex = frames.findIndex((f) => f.id === targetFrameId);
  if (targetIndex === -1) return { frames, couplings, newFrameIds: ['', ''] };

  const target = frames[targetIndex];
  const topHeight = Math.round((target.height - gap) * splitRatio);
  const bottomHeight = target.height - gap - topHeight;

  const topId = `frame-f${Date.now()}-top`;
  const botId = `frame-f${Date.now()}-bot`;

  // Top frame (F_top)
  const topFrame: UPVCFrame = {
    ...target,
    id: topId,
    name: '',
    height: topHeight,
    y: target.y,
    mullions: [],
    pockets: [],
  };
  topFrame.pockets = recalculateFramePockets(topFrame);

  // Bottom frame (F_bot)
  const botFrame: UPVCFrame = {
    ...target,
    id: botId,
    name: '',
    height: bottomHeight,
    y: target.y + topHeight + gap,
    mullions: [],
    pockets: [],
  };
  botFrame.pockets = recalculateFramePockets(botFrame);

  // New Coupling between top and bottom (vertical coupling direction: top is source, bottom is target)
  const newCoupling: CouplingConnection = {
    id: `cpl-h-${Date.now()}`,
    sourceFrameId: topId,
    targetFrameId: botId,
    direction: 'vertical',
    gap: gap,
    couplerType: couplerType || 'flat_2mm',
    couplerWidth: couplerType === 'box_profile' ? 50 : gap,
    alignment: 'top',
    angle: angle,
    bendDirection: bendDirection,
  };

  // Replace target frame with top & bottom frames
  const updatedFrames = [...frames];
  updatedFrames.splice(targetIndex, 1, topFrame, botFrame);

  // Update existing couplings referencing target cleanly:
  // 1. Perpendicular couplings (horizontal) are attached to BOTH top and bottom halves!
  // 2. Parallel couplings (vertical) are attached to the contacting half (botId for downwards, topId for upwards).
  const updatedCouplings: CouplingConnection[] = [];
  for (const c of couplings) {
    if (c.sourceFrameId === target.id) {
      if (c.direction === 'horizontal') {
        updatedCouplings.push({ ...c, id: `${c.id}-top`, sourceFrameId: topId });
        updatedCouplings.push({ ...c, id: `${c.id}-bot`, sourceFrameId: botId });
      } else {
        updatedCouplings.push({ ...c, sourceFrameId: botId });
      }
    } else if (c.targetFrameId === target.id) {
      if (c.direction === 'horizontal') {
        updatedCouplings.push({ ...c, id: `${c.id}-top`, targetFrameId: topId });
        updatedCouplings.push({ ...c, id: `${c.id}-bot`, targetFrameId: botId });
      } else {
        updatedCouplings.push({ ...c, targetFrameId: topId });
      }
    } else {
      updatedCouplings.push(c);
    }
  }
  updatedCouplings.push(newCoupling);

  // Assign sequential clean names (F1, F2, F3...) and labels (①, ②, ③...)
  return finalizeFramesAndLabels(updatedFrames, updatedCouplings, [topId, botId]);
}

/**
 * Splits a target frame vertically into two coupled frames (Left and Right)
 * with a vertical 2mm coupling joint between them.
 */
export function splitFrameVerticalWithCoupling(
  frames: UPVCFrame[],
  couplings: CouplingConnection[],
  targetFrameId: string,
  splitRatio: number = 0.5,
  gap: number = 2,
  couplerType: CouplerType = 'flat_2mm',
  angle?: number,
  bendDirection?: 'inward' | 'outward'
): { frames: UPVCFrame[]; couplings: CouplingConnection[]; newFrameIds: [string, string] } {
  const targetIndex = frames.findIndex((f) => f.id === targetFrameId);
  if (targetIndex === -1) return { frames, couplings, newFrameIds: ['', ''] };

  const target = frames[targetIndex];
  const actualGap = (gap && gap !== 2)
    ? gap
    : couplerType === 'variable_bay_pole'
      ? 38
      : couplerType === 'corner_90'
        ? 50
        : couplerType === 'corner_135'
          ? 38
          : gap;
  const leftWidth = Math.round((target.width - actualGap) * splitRatio);
  const rightWidth = target.width - actualGap - leftWidth;

  const leftId = `frame-f${Date.now()}-l`;
  const rightId = `frame-f${Date.now()}-r`;

  // Left frame
  const leftFrame: UPVCFrame = {
    ...target,
    id: leftId,
    name: '',
    width: leftWidth,
    x: target.x,
    mullions: [],
    pockets: [],
  };
  leftFrame.pockets = recalculateFramePockets(leftFrame);

  // Right frame
  const rightFrame: UPVCFrame = {
    ...target,
    id: rightId,
    name: '',
    width: rightWidth,
    x: target.x + leftWidth + actualGap,
    mullions: [],
    pockets: [],
  };
  rightFrame.pockets = recalculateFramePockets(rightFrame);

  // New Coupling between left and right (horizontal coupling direction)
  const defaultAngle = angle ?? (couplerType === 'corner_90' ? 90 : couplerType === 'corner_135' ? 135 : couplerType === 'variable_bay_pole' ? 135 : undefined);
  const newCoupling: CouplingConnection = {
    id: `cpl-v-${Date.now()}`,
    sourceFrameId: leftId,
    targetFrameId: rightId,
    direction: 'horizontal',
    gap: actualGap,
    couplerType: couplerType || 'flat_2mm',
    couplerWidth: couplerType === 'box_profile' ? 50 : actualGap,
    alignment: 'top',
    angle: defaultAngle,
    bendDirection: bendDirection || 'inward',
  };

  // Replace target frame with left & right frames
  const updatedFrames = [...frames];
  updatedFrames.splice(targetIndex, 1, leftFrame, rightFrame);

  // Update existing couplings referencing target cleanly:
  // 1. Perpendicular couplings (vertical - e.g. top-light or bottom transom) are attached to BOTH left and right halves!
  // 2. Parallel couplings (horizontal) are attached to the contacting half (rightId for rightward neighbor, leftId for leftward neighbor).
  const updatedCouplings: CouplingConnection[] = [];
  for (const c of couplings) {
    if (c.sourceFrameId === target.id) {
      if (c.direction === 'vertical') {
        updatedCouplings.push({ ...c, id: `${c.id}-l`, sourceFrameId: leftId });
        updatedCouplings.push({ ...c, id: `${c.id}-r`, sourceFrameId: rightId });
      } else {
        updatedCouplings.push({ ...c, sourceFrameId: rightId });
      }
    } else if (c.targetFrameId === target.id) {
      if (c.direction === 'vertical') {
        updatedCouplings.push({ ...c, id: `${c.id}-l`, targetFrameId: leftId });
        updatedCouplings.push({ ...c, id: `${c.id}-r`, targetFrameId: rightId });
      } else {
        updatedCouplings.push({ ...c, targetFrameId: leftId });
      }
    } else {
      updatedCouplings.push(c);
    }
  }
  updatedCouplings.push(newCoupling);

  return finalizeFramesAndLabels(updatedFrames, updatedCouplings, [leftId, rightId]);
}

/**
 * Assigns sequential frame names [F1, F2, F3...] and circled glass badge numbers [①, ②, ③, ④...]
 */
function finalizeFramesAndLabels(
  frames: UPVCFrame[],
  couplings: CouplingConnection[],
  newIds: [string, string]
): { frames: UPVCFrame[]; couplings: CouplingConnection[]; newFrameIds: [string, string] } {
  const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯'];
  let glassIndex = 0;

  const namedFrames = frames.map((f, idx) => {
    const frameName = `F${idx + 1}`;
    const updatedPockets = f.pockets.map((p) => {
      const badge = CIRCLE_NUMS[glassIndex] || `[${glassIndex + 1}]`;
      glassIndex++;
      return {
        ...p,
        customLabel: badge,
      };
    });

    return {
      ...f,
      name: frameName,
      pockets: updatedPockets,
    };
  });

  return {
    frames: namedFrames,
    couplings,
    newFrameIds: newIds,
  };
}

/**
 * Positions all coupled frames automatically while preserving 2mm gaps.
 * Allows each frame to grow or shrink independently in width/height.
 */
export function resolveFramePositions(
  frames: UPVCFrame[],
  couplings: CouplingConnection[]
): UPVCFrame[] {
  if (!frames || frames.length === 0) return [];
  if (!couplings || couplings.length === 0) return frames;

  const frameMap = new Map<string, UPVCFrame>();
  (frames || []).forEach((f) => frameMap.set(f.id, { ...f }));

  // Enforce 2mm coupling gaps across all coupled frames (multi-pass for chained frames)
  const passes = Math.max(3, couplings.length * 2);
  for (let p = 0; p < passes; p++) {
    for (const c of (couplings || [])) {
      const f1 = frameMap.get(c.sourceFrameId);
      const f2 = frameMap.get(c.targetFrameId);
      if (!f1 || !f2) continue;

      const gap = c.gap ?? (c.couplerType === 'variable_bay_pole' ? 38 : c.couplerType === 'corner_90' ? 50 : c.couplerType === 'corner_135' ? 38 : 2);
      const couplerWidth = c.couplerType === 'box_profile' ? (c.couplerWidth || 10) : gap;

      if (c.direction === 'horizontal') {
        const fLeft = f1.x <= f2.x ? f1 : f2;
        const fRight = f1.x <= f2.x ? f2 : f1;
        // Check vertical overlap between left and right frames
        const overlapY = Math.min(fLeft.y + fLeft.height, fRight.y + fRight.height) - Math.max(fLeft.y, fRight.y);
        if (overlapY > 0 || frames.length <= 2) {
          fRight.x = Math.round(fLeft.x + fLeft.width + couplerWidth);
        }
      } else {
        const fTop = f1.y <= f2.y ? f1 : f2;
        const fBot = f1.y <= f2.y ? f2 : f1;
        // Check horizontal overlap between top and bottom frames
        const overlapX = Math.min(fTop.x + fTop.width, fBot.x + fBot.width) - Math.max(fTop.x, fBot.x);
        if (overlapX > 0 || frames.length <= 2) {
          fBot.y = Math.round(fTop.y + fTop.height + couplerWidth);
        }
      }
    }
  }

  return Array.from(frameMap.values());
}

/**
 * Updates a frame dimension in a specific direction (anchored expansion)
 * and safely shifts all connected coupled frames so they never overlap or slide behind.
 */
/**
 * Ensures mullions in a frame are properly scaled or equalized when frame dimensions change.
 * In sliding frames (series starting with 'sliding' or having slider/mesh sashes), all vertical
 * mullions MUST divide the width equally among panels. In casement/fixed frames, mullions scale proportionally.
 */
export function equalizeOrScaleFrameMullions(
  frame: UPVCFrame,
  newW: number,
  newH: number,
  oldW?: number,
  oldH?: number
): UPVCFrame {
  const oW = oldW && oldW > 0 ? oldW : frame.width;
  const oH = oldH && oldH > 0 ? oldH : frame.height;
  const isSliding =
    frame.series?.startsWith('sliding') ||
    (frame.pockets || []).some(
      (p) => p.sashType && (p.sashType.startsWith('slider_') || p.sashType === 'mesh_sash')
    );

  let newMulls = frame.mullions ? frame.mullions.map((m) => ({ ...m })) : [];

  if (newMulls.length > 0) {
    if (isSliding) {
      const vMulls = newMulls.filter((m) => m.orientation === 'vertical');
      const numPanels = Math.max(2, vMulls.length + 1);
      vMulls.forEach((m, idx) => {
        m.position = Number(((newW / numPanels) * (idx + 1)).toFixed(1));
      });
      if (oH > 0 && newH !== oH) {
        newMulls
          .filter((m) => m.orientation === 'horizontal')
          .forEach((m) => {
            m.position = Math.round((m.position / oH) * newH);
          });
      }
    } else {
      if (oW > 0 && newW !== oW) {
        newMulls
          .filter((m) => m.orientation === 'vertical')
          .forEach((m) => {
            m.position = Math.round((m.position / oW) * newW);
          });
      }
      if (oH > 0 && newH !== oH) {
        newMulls
          .filter((m) => m.orientation === 'horizontal')
          .forEach((m) => {
            m.position = Math.round((m.position / oH) * newH);
          });
      }
    }
  }

  const updatedFrame: UPVCFrame = {
    ...frame,
    width: newW,
    height: newH,
    mullions: newMulls,
  };
  updatedFrame.pockets = recalculateFramePockets(updatedFrame);
  return updatedFrame;
}

export function updateFrameDimensionDirectional(
  frames: UPVCFrame[],
  couplings: CouplingConnection[],
  frameId: string,
  newWidth: number,
  newHeight: number,
  anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'left' | 'right' | 'top' | 'bottom' = 'top-left'
): UPVCFrame[] {
  const targetFrame = frames.find((f) => f.id === frameId);
  if (!targetFrame) return frames;

  const validW = Math.max(150, Math.round(newWidth));
  const validH = Math.max(150, Math.round(newHeight));
  const oldW = targetFrame.width;
  const oldH = targetFrame.height;
  const oldX = targetFrame.x;
  const oldY = targetFrame.y;
  const deltaW = validW - oldW;
  const deltaH = validH - oldH;

  // Clone frames
  const updatedFrames = frames.map((f) => ({ ...f }));
  const modTarget = updatedFrames.find((f) => f.id === frameId)!;

  // Apply new dimensions & equalize/rescale mullions proportionally
  const scaledTarget = equalizeOrScaleFrameMullions(modTarget, validW, validH, oldW, oldH);
  modTarget.width = scaledTarget.width;
  modTarget.height = scaledTarget.height;
  modTarget.mullions = scaledTarget.mullions;

  // Check neighbor connectivity for smart default expansion direction
  // If anchor is default 'top-left' or 'center', choose the open side to avoid unnecessary shifting!
  let resolvedAnchor = anchor;
  if (anchor === 'top-left' || anchor === 'center') {
    const hasRightNeighbor = couplings.some(
      (c) =>
        c.direction === 'horizontal' &&
        ((c.sourceFrameId === frameId && (frames.find((f) => f.id === c.targetFrameId)?.x || 0) > oldX) ||
          (c.targetFrameId === frameId && (frames.find((f) => f.id === c.sourceFrameId)?.x || 0) > oldX))
    );
    const hasLeftNeighbor = couplings.some(
      (c) =>
        c.direction === 'horizontal' &&
        ((c.sourceFrameId === frameId && (frames.find((f) => f.id === c.targetFrameId)?.x || 0) < oldX) ||
          (c.targetFrameId === frameId && (frames.find((f) => f.id === c.sourceFrameId)?.x || 0) < oldX))
    );
    const hasBottomNeighbor = couplings.some(
      (c) =>
        c.direction === 'vertical' &&
        ((c.sourceFrameId === frameId && (frames.find((f) => f.id === c.targetFrameId)?.y || 0) > oldY) ||
          (c.targetFrameId === frameId && (frames.find((f) => f.id === c.sourceFrameId)?.y || 0) > oldY))
    );
    const hasTopNeighbor = couplings.some(
      (c) =>
        c.direction === 'vertical' &&
        ((c.sourceFrameId === frameId && (frames.find((f) => f.id === c.targetFrameId)?.y || 0) < oldY) ||
          (c.targetFrameId === frameId && (frames.find((f) => f.id === c.sourceFrameId)?.y || 0) < oldY))
    );

    if (hasRightNeighbor && !hasLeftNeighbor) {
      resolvedAnchor = hasBottomNeighbor ? 'top-right' : 'right';
    } else if (hasBottomNeighbor && !hasTopNeighbor) {
      resolvedAnchor = hasLeftNeighbor ? 'bottom-left' : 'bottom';
    }
  }

  // Determine directional growth intent
  const isGrowUp = resolvedAnchor === 'top' || resolvedAnchor === 'bottom-left' || resolvedAnchor === 'bottom-right';
  const isGrowDown = resolvedAnchor === 'bottom' || resolvedAnchor === 'top-left' || resolvedAnchor === 'top-right';
  const isGrowLeft = resolvedAnchor === 'left' || resolvedAnchor === 'top-right' || resolvedAnchor === 'bottom-right';
  const isGrowRight = resolvedAnchor === 'right' || resolvedAnchor === 'top-left' || resolvedAnchor === 'bottom-left';

  // 1. DIRECTIONAL PROPAGATION:
  // UPWARDS GROWTH: Target top moves up by deltaH. Target bottom stays fixed.
  // All frames ABOVE target (y + height <= oldY + 15) must shift UP by deltaH!
  if (isGrowUp) {
    modTarget.y = oldY - deltaH;
    for (const f of updatedFrames) {
      if (f.id !== frameId && f.y + f.height <= oldY + 15) {
        f.y -= deltaH;
      }
    }
  }

  // DOWNWARDS GROWTH: Target top stays fixed. Target bottom moves down.
  // All frames BELOW target (y >= oldY + oldH - 15) must shift DOWN by deltaH!
  if (isGrowDown) {
    for (const f of updatedFrames) {
      if (f.id !== frameId && f.y >= oldY + oldH - 15) {
        f.y += deltaH;
      }
    }
  }

  // LEFTWARDS GROWTH: Target left moves left by deltaW. Target right stays fixed.
  // All frames to the LEFT of target (x + width <= oldX + 15) must shift LEFT by deltaW!
  if (isGrowLeft) {
    modTarget.x = oldX - deltaW;
    for (const f of updatedFrames) {
      if (f.id !== frameId && f.x + f.width <= oldX + 15) {
        f.x -= deltaW;
      }
    }
  }

  // RIGHTWARDS GROWTH: Target left stays fixed. Target right moves right.
  // All frames to the RIGHT of target (x >= oldX + oldW - 15) must shift RIGHT by deltaW!
  if (isGrowRight) {
    for (const f of updatedFrames) {
      if (f.id !== frameId && f.x >= oldX + oldW - 15) {
        f.x += deltaW;
      }
    }
  }

  // 2. PAIRWISE EXACT 2MM COUPLING GAP RECTIFICATION (Multi-pass for chained frames)
  const passes = Math.max(3, (couplings.length || 0) * 2);
  for (let p = 0; p < passes; p++) {
    for (const c of couplings) {
      const f1 = updatedFrames.find((f) => f.id === c.sourceFrameId);
      const f2 = updatedFrames.find((f) => f.id === c.targetFrameId);
      if (!f1 || !f2) continue;

      const gap = c.gap ?? 2;
      const couplerWidth = c.couplerType === 'box_profile' ? (c.couplerWidth || 10) : gap;

      if (c.direction === 'horizontal') {
        const fLeft = f1.x <= f2.x ? f1 : f2;
        const fRight = f1.x <= f2.x ? f2 : f1;
        if (isGrowLeft) {
          // Propagate leftwards from right anchor
          fLeft.x = Math.round(fRight.x - couplerWidth - fLeft.width);
        } else {
          // Propagate rightwards from left anchor
          fRight.x = Math.round(fLeft.x + fLeft.width + couplerWidth);
        }
      } else {
        const fTop = f1.y <= f2.y ? f1 : f2;
        const fBot = f1.y <= f2.y ? f2 : f1;
        if (isGrowUp) {
          // Propagate upwards from bottom anchor (top frames move up)
          fTop.y = Math.round(fBot.y - couplerWidth - fTop.height);
        } else {
          // Propagate downwards from top anchor (bottom frames move down)
          fBot.y = Math.round(fTop.y + fTop.height + couplerWidth);
        }
      }
    }
  }

  // 3. Prevent assembly drift into negative coordinates ONLY when not growing upwards or leftwards
  // Shifting down when growing upwards would negate the user's explicit upwards growth!
  if (!isGrowUp && !isGrowLeft) {
    const minX = Math.min(...updatedFrames.map((f) => f.x));
    const minY = Math.min(...updatedFrames.map((f) => f.y));
    if (minX < 0 || minY < 0) {
      const shiftX = minX < 0 ? -minX : 0;
      const shiftY = minY < 0 ? -minY : 0;
      for (const f of updatedFrames) {
        f.x += shiftX;
        f.y += shiftY;
      }
    }
  }

  // 4. Recalculate pockets for all frames
  for (const f of updatedFrames) {
    f.pockets = recalculateFramePockets(f);
  }

  return updatedFrames;
}

/**
 * Auto-Aligns all frames and couplings in the assembly:
 * 1. Synchronizes column widths for all vertically stacked frames in each column.
 * 2. Enforces exact 2mm coupling gaps between all horizontally and vertically coupled frames.
 * 3. Removes any phantom or disconnected couplings.
 * 4. Eliminates gaps/voids and aligns coordinates starting from (0, 0).
 * 5. Recomputes all pockets.
 */
export function autoAlignCoupledAssembly(
  frames: UPVCFrame[],
  couplings: CouplingConnection[]
): { frames: UPVCFrame[]; couplings: CouplingConnection[] } {
  if (!frames || frames.length <= 1) return { frames, couplings };

  const updatedFrames = frames.map((f) => ({ ...f }));

  // 1. Group frames into vertical columns by X proximity and overlap
  const sortedByX = [...updatedFrames].sort((a, b) => a.x - b.x);
  const columns: UPVCFrame[][] = [];
  for (const f of sortedByX) {
    let placed = false;
    for (const col of columns) {
      const colXMin = Math.min(...col.map((item) => item.x));
      const colXMax = Math.max(...col.map((item) => item.x + item.width));
      const overlapX = Math.min(f.x + f.width, colXMax) - Math.max(f.x, colXMin);
      if (overlapX > 30 || Math.abs(f.x - colXMin) < 50) {
        col.push(f);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([f]);
    }
  }

  // 2. In each column, sort vertically (preserving individual frame widths!)
  for (const col of columns) {
    col.sort((a, b) => a.y - b.y);
  }

  // 3. Align column X positions sequentially with exact 2mm gaps between adjacent columns
  let currentX = 0;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const colWidth = Math.max(...col.map((f) => f.width));
    for (const f of col) {
      f.x = currentX;
    }
    currentX += colWidth + 2; // Exact 2mm coupler gap
  }

  // 4. Align row Y positions within columns with exact 2mm gaps (preserving individual frame heights!)
  for (const col of columns) {
    let currentY = 0;
    for (let j = 0; j < col.length; j++) {
      col[j].y = currentY;
      currentY += col[j].height + 2; // Exact 2mm coupler gap
    }
  }

  // 7. Sanitize couplings: ensure valid connections between adjacent frames
  const validCouplings: CouplingConnection[] = [];
  for (const c of couplings) {
    const f1 = updatedFrames.find((f) => f.id === c.sourceFrameId);
    const f2 = updatedFrames.find((f) => f.id === c.targetFrameId);
    if (!f1 || !f2) continue;

    const overlapX = Math.min(f1.x + f1.width, f2.x + f2.width) - Math.max(f1.x, f2.x);
    const overlapY = Math.min(f1.y + f1.height, f2.y + f2.height) - Math.max(f1.y, f2.y);

    if (overlapY > 5) {
      validCouplings.push({ ...c, direction: 'horizontal', gap: c.gap ?? 2 });
    } else if (overlapX > 5) {
      validCouplings.push({ ...c, direction: 'vertical', gap: c.gap ?? 2 });
    }
  }

  // 8. Recalculate pockets
  for (const f of updatedFrames) {
    f.pockets = recalculateFramePockets(f);
  }

  return { frames: updatedFrames, couplings: validCouplings };
}

/**
 * Update Total Assembly Height or Width with smart redistribution:
 * 1. Total Height: Scales vertically stacked frames proportionally (larger frames get larger increase, smaller frames get smaller increase)
 * 2. Total Width: Divides width increase equally across horizontal columns (sab me barabar badhega)
 */
export function updateAssemblyTotalDimension(
  frames: UPVCFrame[],
  couplings: CouplingConnection[],
  type: 'total_w' | 'total_h',
  newTotalValue: number
): UPVCFrame[] {
  if (frames.length === 0) return frames;
  const validTotal = Math.max(150, Math.round(newTotalValue));
  const currentBounds = calculateAssemblyBounds(frames);

  // If only 1 frame, directly update it
  if (frames.length === 1) {
    const single = { ...frames[0] };
    const targetW = type === 'total_w' ? validTotal : single.width;
    const targetH = type === 'total_h' ? validTotal : single.height;
    return [equalizeOrScaleFrameMullions(single, targetW, targetH, single.width, single.height)];
  }

  if (type === 'total_h') {
    const currentTotalH = currentBounds.totalHeight;
    if (currentTotalH <= 0 || validTotal === currentTotalH) return frames;

    // Identify vertical levels (rows)
    const rowClusters: { y: number; height: number; frameIds: string[] }[] = [];
    const sortedByY = [...frames].sort((a, b) => a.y - b.y);

    for (const f of sortedByY) {
      const cluster = rowClusters.find((c) => Math.abs(c.y - f.y) <= 15);
      if (cluster) {
        cluster.frameIds.push(f.id);
        cluster.height = Math.max(cluster.height, f.height);
      } else {
        rowClusters.push({ y: f.y, height: f.height, frameIds: [f.id] });
      }
    }

    const numRows = rowClusters.length;
    if (numRows === 0) return frames;

    const totalClusterH = rowClusters.reduce((sum, c) => sum + c.height, 0);
    const gapsH = Math.max(0, currentTotalH - totalClusterH);
    const targetClusterHSum = Math.max(150 * numRows, validTotal - gapsH);

    // Proportional scaling: large frame gets large growth, small frame gets small growth
    const ratio = totalClusterH > 0 ? targetClusterHSum / totalClusterH : 1;
    let distributedH = 0;

    const newRowHeights: number[] = rowClusters.map((cluster, idx) => {
      if (idx === numRows - 1) {
        return 0; // will assign remainder below
      }
      const newH = Math.max(150, Math.round(cluster.height * ratio));
      distributedH += newH;
      return newH;
    });

    // Remainder to the last or largest row
    const lastH = Math.max(150, targetClusterHSum - distributedH);
    newRowHeights[numRows - 1] = lastH;

    // Correct any rounding difference to the largest row
    const finalSum = newRowHeights.reduce((a, b) => a + b, 0);
    const diff = targetClusterHSum - finalSum;
    if (diff !== 0) {
      let maxIdx = 0;
      let maxVal = -1;
      rowClusters.forEach((c, idx) => {
        if (c.height > maxVal) {
          maxVal = c.height;
          maxIdx = idx;
        }
      });
      newRowHeights[maxIdx] = Math.max(150, newRowHeights[maxIdx] + diff);
    }

    // Apply new heights
    const updatedFrames = frames.map((f) => {
      const clusterIdx = rowClusters.findIndex((c) => c.frameIds.includes(f.id));
      if (clusterIdx >= 0) {
        const newH = newRowHeights[clusterIdx];
        return equalizeOrScaleFrameMullions(f, f.width, newH, f.width, f.height);
      }
      return { ...f };
    });

    // Set Y positions top to bottom
    let currentY = currentBounds.minY;
    rowClusters.forEach((cluster, idx) => {
      const newH = newRowHeights[idx];
      cluster.frameIds.forEach((fId) => {
        const found = updatedFrames.find((uf) => uf.id === fId);
        if (found) {
          found.y = currentY;
        }
      });
      // Gap to next row
      const nextCluster = rowClusters[idx + 1];
      const gap = nextCluster ? 2 : 0;
      currentY += newH + gap;
    });

    // Resolve coupling positions and recalculate pockets
    const resolved = resolveFramePositions(updatedFrames, couplings);
    for (const f of resolved) {
      f.pockets = recalculateFramePockets(f);
    }
    return resolved;
  } else {
    // TOTAL WIDTH ('total_w')
    // Equal distribution across all columns: "jitne hoge sabme barabar badhega"
    const currentTotalW = currentBounds.totalWidth;
    if (currentTotalW <= 0 || validTotal === currentTotalW) return frames;

    // Identify horizontal columns
    const colClusters: { x: number; width: number; frameIds: string[] }[] = [];
    const sortedByX = [...frames].sort((a, b) => a.x - b.x);

    for (const f of sortedByX) {
      const cluster = colClusters.find((c) => Math.abs(c.x - f.x) <= 15);
      if (cluster) {
        cluster.frameIds.push(f.id);
        cluster.width = Math.max(cluster.width, f.width);
      } else {
        colClusters.push({ x: f.x, width: f.width, frameIds: [f.id] });
      }
    }

    const numCols = colClusters.length;
    if (numCols === 0) return frames;

    const totalClusterW = colClusters.reduce((sum, c) => sum + c.width, 0);
    const gapsW = Math.max(0, currentTotalW - totalClusterW);
    const targetClusterWSum = Math.max(150 * numCols, validTotal - gapsW);
    const deltaW = targetClusterWSum - totalClusterW;

    // Equal division among all columns: "jitne hoge sabme barabar badhega"
    const equalDelta = Math.floor(deltaW / numCols);
    let remainder = deltaW - equalDelta * numCols;

    const newColWidths: number[] = colClusters.map((cluster) => {
      let add = equalDelta;
      if (remainder > 0) {
        add += 1;
        remainder--;
      } else if (remainder < 0) {
        add -= 1;
        remainder++;
      }
      return Math.max(150, cluster.width + add);
    });

    // Apply new widths
    const updatedFrames = frames.map((f) => {
      const colIdx = colClusters.findIndex((c) => c.frameIds.includes(f.id));
      if (colIdx >= 0) {
        const newW = newColWidths[colIdx];
        return equalizeOrScaleFrameMullions(f, newW, f.height, f.width, f.height);
      }
      return { ...f };
    });

    // Set X positions left to right
    let currentX = currentBounds.minX;
    colClusters.forEach((cluster, idx) => {
      const newW = newColWidths[idx];
      cluster.frameIds.forEach((fId) => {
        const found = updatedFrames.find((uf) => uf.id === fId);
        if (found) {
          found.x = currentX;
        }
      });
      const nextCluster = colClusters[idx + 1];
      const gap = nextCluster ? 2 : 0;
      currentX += newW + gap;
    });

    // Resolve coupling positions and recalculate pockets
    const resolved = resolveFramePositions(updatedFrames, couplings);
    for (const f of resolved) {
      f.pockets = recalculateFramePockets(f);
    }
    return resolved;
  }
}

/**
 * Calculates overall bounding box (Total Width & Height) of all coupled frames.
 */
export function calculateAssemblyBounds(frames: UPVCFrame[]) {
  if (frames.length === 0) {
    return { minX: 0, minY: 0, maxX: 1200, maxY: 1500, totalWidth: 1200, totalHeight: 1500 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const f of frames) {
    if (f.x < minX) minX = f.x;
    if (f.y < minY) minY = f.y;
    if (f.x + f.width > maxX) maxX = f.x + f.width;
    if (f.y + f.height > maxY) maxY = f.y + f.height;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    totalWidth: Math.round(maxX - minX),
    totalHeight: Math.round(maxY - minY),
  };
}

export interface CADResolvedFrameProfile {
  code: string;
  name: string;
  category: 'casement' | 'sliding';
  depth: number;
  height: number;
  beadingSideHeight?: number;
  steelCode?: string;
  steelName?: string;
}

export interface CADResolvedSashProfile {
  code: string;
  name: string;
  sashTypeDisplay: string;
  isDoor: boolean;
  category: 'casement' | 'sliding' | 'fixed' | 'panel' | 'louver';
  realHeight: number;
  beadingSideHeight: number;
  beadCode: string;
  beadName: string;
  steelCode?: string;
  steelName?: string;
  interlockCode?: string;
  interlockName?: string;
}

/**
 * Returns currently configured custom series from localStorage or built-in defaults.
 */
export function getCustomSeriesList(): CustomSeries[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_SERIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_CUSTOM_SERIES;
}

/**
 * Returns currently configured manufacturing deduction rules from localStorage or defaults.
 */
export function getFabricationRules(): ManufacturingNiyamRules {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_FABRICATION_RULES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...INITIAL_MANUFACTURING_NIYAM, ...parsed };
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_MANUFACTURING_NIYAM;
}

/**
 * Identifies the matching series for a frame from custom series master.
 */
export function findMatchingSeries(frame: UPVCFrame, customSeriesList = getCustomSeriesList()): CustomSeries {
  const isSlider =
    frame.series?.startsWith('sliding') ||
    frame.name?.toLowerCase().includes('slider') ||
    frame.name?.toLowerCase().includes('sld') ||
    (frame.pockets || []).some(
      (p) => p.sashType?.startsWith('slider') || p.sashType?.startsWith('mesh_slider')
    );

  if (frame.seriesCode) {
    const byCode = customSeriesList.find(
      (s) =>
        s.id.toLowerCase() === frame.seriesCode?.toLowerCase() ||
        s.name.toLowerCase().includes(frame.seriesCode?.toLowerCase() || '')
    );
    if (byCode) return byCode;
  }

  if (frame.series) {
    const bySeriesType = customSeriesList.find(
      (s) =>
        s.id.toLowerCase().includes(frame.series.toLowerCase()) ||
        (isSlider ? s.type === 'sliding' : s.type === 'casement')
    );
    if (bySeriesType) return bySeriesType;
  }

  const byType = customSeriesList.find((s) => (isSlider ? s.type === 'sliding' : s.type === 'casement'));
  return byType || customSeriesList[0] || INITIAL_CUSTOM_SERIES[0];
}

/**
 * Resolves the exact industrial profile code and full description for a frame from CAD properties.
 */
export function resolveCADFrameProfile(frame: UPVCFrame): CADResolvedFrameProfile {
  const isSlider =
    frame.series?.startsWith('sliding') ||
    frame.name?.toLowerCase().includes('slider') ||
    frame.name?.toLowerCase().includes('sld') ||
    (frame.pockets || []).some(
      (p) => p.sashType?.startsWith('slider') || p.sashType?.startsWith('mesh_slider')
    );

  const is3Track =
    frame.series === 'sliding_3track' ||
    frame.frameProfileCode === 'SWH 60-02' ||
    frame.frameProfileCode === 'P-SWH60-02' ||
    (frame.pockets || []).some(
      (p) => p.sashType === 'slider_3t_2p_mesh' || p.sashType === 'slider_3s_mesh' || p.sashType === 'slider_3s'
    );

  const customSeriesList = getCustomSeriesList();
  const matchedSeries = findMatchingSeries(frame, customSeriesList);

  const explicitCode =
    frame.frameProfileCode ||
    frame.pockets?.[0]?.frameProfileCode;

  // Search in matched series or all series for this explicitCode
  if (explicitCode) {
    const cleanExp = explicitCode.replace(/\s+/g, '').toUpperCase();
    for (const s of customSeriesList) {
      const foundFrame = (s.frames || []).find(
        (f) => f.code.replace(/\s+/g, '').toUpperCase() === cleanExp || f.id.toUpperCase() === cleanExp
      );
      if (foundFrame) {
        return {
          code: foundFrame.code,
          name: foundFrame.name,
          category: s.type,
          depth: (s.type === 'sliding' ? (is3Track ? 112 : 52) : 60),
          height: foundFrame.height || (s.type === 'sliding' ? 44 : 60),
          beadingSideHeight: foundFrame.beadingSideHeight,
          steelCode: s.type === 'sliding' ? 'SRI 60-01-1.5MM' : 'CRI 60-02-1.5MM',
          steelName: s.type === 'sliding' ? 'GI Steel Sliding Outer (SRI 60-01)' : 'GI Steel Casement Outer (CRI 60-02)',
        };
      }
    }
  }

  if (isSlider) {
    if (is3Track) {
      const frameItem = matchedSeries.frames?.find((f) => f.code.includes('02')) || matchedSeries.frames?.[1];
      return {
        code: explicitCode || frameItem?.code || 'SWH 60-02',
        name: frameItem?.name || 'SLD 3 TRACK 60MM X 112MM (SWH 60-02)',
        category: 'sliding',
        depth: 112,
        height: frameItem?.height || 44,
        steelCode: 'SRI 60-01-1.5MM',
        steelName: 'GI Steel Sliding Outer (SRI 60-01)',
      };
    }
    const frameItem = matchedSeries.frames?.find((f) => f.code.includes('01')) || matchedSeries.frames?.[0];
    return {
      code: explicitCode || frameItem?.code || 'SWH 60-01',
      name: frameItem?.name || 'SLD 2 TRACK 60MM X 52MM (SWH 60-01)',
      category: 'sliding',
      depth: 52,
      height: frameItem?.height || 44,
      steelCode: 'SRI 60-01-1.5MM',
      steelName: 'GI Steel Sliding Outer (SRI 60-01)',
    };
  }

  // Casement / Door frames
  const code =
    explicitCode ||
    (frame.seriesCode === 'CWH-50'
      ? 'CWH 50-01'
      : frame.seriesCode === 'CWH-65'
      ? 'CWH 65-01'
      : frame.seriesCode === 'DURON-70'
      ? 'DURON 70-01'
      : 'CWH 60-01');

  if (code === 'CWH 60-01') {
    return {
      code: 'CWH 60-01',
      name: 'CMT OUTER 60MM X 58MM (CWH 60-01)',
      category: 'casement',
      depth: 60,
      height: 60,
      beadingSideHeight: 40,
      steelCode: 'CRI 60-02-1.5MM',
      steelName: 'GI Steel Casement Outer (CRI 60-02)',
    };
  }
  if (code === 'CWH 60-02') {
    return {
      code: 'CWH 60-02',
      name: 'CMT LARGE OUTER WITH FIN 60MM (CWH 60-02)',
      category: 'casement',
      depth: 60,
      height: 60,
      beadingSideHeight: 40,
      steelCode: 'CRI 60-02-1.5MM',
      steelName: 'GI Steel Casement Outer (CRI 60-02)',
    };
  }
  if (code === 'CWH 60-08') {
    return {
      code: 'CWH 60-08',
      name: 'CMT DOOR LOW SILL THRESHOLD (CWH 60-08)',
      category: 'casement',
      depth: 60,
      height: 20,
      steelCode: 'CRI 60-02-1.5MM',
      steelName: 'GI Steel Casement Outer (CRI 60-02)',
    };
  }
  if (code === 'CWH 50-01') {
    return {
      code: 'CWH 50-01',
      name: 'SLIMLINE CASEMENT FRAME 50MM (CWH 50-01)',
      category: 'casement',
      depth: 50,
      height: 50,
      steelCode: 'CRI 60-02-1.5MM',
      steelName: 'GI Steel Casement Outer (CRI 60-02)',
    };
  }
  if (code === 'CWH 65-01') {
    return {
      code: 'CWH 65-01',
      name: 'HEAVY COMMERCIAL FRAME 65MM (CWH 65-01)',
      category: 'casement',
      depth: 65,
      height: 65,
      steelCode: 'CRI 60-02-1.5MM',
      steelName: 'GI Steel Casement Outer (CRI 60-02)',
    };
  }
  if (code === 'DURON 70-01' || frame.seriesCode === 'DURON-70') {
    return {
      code: 'DURON 70-01',
      name: 'DURON 70MM THERMAL OUTER FRAME (DURON 70-01)',
      category: 'casement',
      depth: 70,
      height: 70,
      steelCode: 'CRI 60-02-1.5MM',
      steelName: 'GI Steel Casement Outer (CRI 60-02)',
    };
  }

  return {
    code: code || 'CWH 60-01',
    name: `CMT OUTER 60MM (${code || 'CWH 60-01'})`,
    category: 'casement',
    depth: 60,
    height: frame.frameProfileWidth || 60,
    beadingSideHeight: 40,
    steelCode: 'CRI 60-02-1.5MM',
    steelName: 'GI Steel Casement Outer (CRI 60-02)',
  };
}

/**
 * Resolves the exact industrial sash profile code and full description for a pocket from CAD properties.
 * Checks pocket-level properties, frame-level properties, and Series & Profile Master Settings.
 */
export function resolveCADSashProfile(
  pocket: FramePocket,
  frame: UPVCFrame
): CADResolvedSashProfile {
  const isDoor =
    pocket.applicationType === 'door' ||
    (pocket.applicationType !== 'window' &&
      (pocket.height >= 1600 ||
        frame.height >= 1800 ||
        frame.name?.toLowerCase().includes('door') ||
        frame.name?.toLowerCase().startsWith('d-') ||
        frame.name?.toLowerCase().startsWith('d1') ||
        frame.series === 'door_premium'));

  const sType = pocket.sashType || 'fixed';

  // Detect if pocket or frame has a specific sash profile code assigned in properties
  const rawCode = (pocket.sashProfileCode || pocket.sashProfileTop || frame.sashProfileCode || '').toUpperCase();
  const hasCasementCode =
    rawCode.includes('CWH 60-03') ||
    rawCode.includes('CWH 60-04') ||
    rawCode.includes('CWH 60-06') ||
    rawCode.includes('CWH 60-07') ||
    rawCode.includes('CWH 60-12') ||
    rawCode.includes('CWH 65-06') ||
    rawCode.includes('CWH 50-03') ||
    (rawCode.startsWith('CWH') && !rawCode.includes('60-01') && !rawCode.includes('60-02') && !rawCode.includes('60-05') && !rawCode.includes('60-08')) ||
    (rawCode.startsWith('PCWH') && !rawCode.includes('60-01') && !rawCode.includes('60-02') && !rawCode.includes('60-05') && !rawCode.includes('60-08'));

  const hasSlidingCode =
    rawCode.includes('SWH 60-03') ||
    rawCode.includes('SWH 60-04') ||
    rawCode.includes('SWH 60-05') ||
    rawCode.includes('SWH 60-06') ||
    rawCode.includes('SWH 60-14') ||
    rawCode.includes('SWH 60-17') ||
    rawCode.includes('SWH 50-03') ||
    rawCode.includes('SWH 50-04') ||
    (rawCode.startsWith('SWH') && !rawCode.includes('60-01') && !rawCode.includes('60-02') && !rawCode.includes('60-12')) ||
    (rawCode.startsWith('PSWH') && !rawCode.includes('60-01') && !rawCode.includes('60-02') && !rawCode.includes('60-12'));

  const isExplicitCasement =
    sType.startsWith('casement') ||
    sType === 'top_hung' ||
    sType === 'bottom_hung' ||
    sType === 'french_open' ||
    sType === 'tilt_turn' ||
    sType === 'open_vent';

  const isExplicitSlider =
    sType.startsWith('slider') ||
    sType.startsWith('mesh_slider') ||
    sType === 'mesh_sash';

  const isFrameSlider =
    frame.series?.startsWith('sliding') ||
    frame.name?.toLowerCase().includes('sliding') ||
    frame.name?.toLowerCase().includes('slider');

  const isSlider =
    isExplicitSlider ||
    hasSlidingCode ||
    (isFrameSlider && sType !== 'fixed' && sType !== 'upvc_panel' && sType !== 'louver' && sType !== 'fan_provision' && sType !== 'ac_provision') ||
    (isFrameSlider && hasSlidingCode);

  const isCasement =
    !isSlider &&
    (isExplicitCasement ||
     hasCasementCode ||
     (frame.series?.startsWith('casement') && hasCasementCode) ||
     (frame.series?.startsWith('door') && hasCasementCode));

  let sashTypeDisplay = 'Fixed Glazing (स्थिर काँच)';
  if (sType === 'casement_left') sashTypeDisplay = 'Casement Outward Left (बायां पल्ला)';
  else if (sType === 'casement_right') sashTypeDisplay = 'Casement Outward Right (दायां पल्ला)';
  else if (sType === 'top_hung') sashTypeDisplay = 'Top Hung / Awning Vent (टॉप वेंटिलेटर)';
  else if (sType === 'bottom_hung') sashTypeDisplay = 'Bottom Hung Hopper (बॉटम वेंटिलेटर)';
  else if (sType === 'french_open') sashTypeDisplay = 'Double Leaf French Open (डबल फ्रेंच पल्ला)';
  else if (sType === 'tilt_turn') sashTypeDisplay = 'Tilt & Turn Sash (टिल्ट एंड टर्न)';
  else if (sType === 'open_vent') sashTypeDisplay = 'Openable Vent Sash (ओपनेबल वेंट)';
  else if (sType === 'slider_2s') sashTypeDisplay = '2-Track Sliding Sash (2-ट्रैक स्लाइडिंग)';
  else if (sType === 'slider_2s_xo') sashTypeDisplay = 'Sliding Sash XO (लेफ्ट स्लाइड / राइट फिक्स)';
  else if (sType === 'slider_2s_ox') sashTypeDisplay = 'Sliding Sash OX (लेफ्ट फिक्स / राइट स्लाइड)';
  else if (sType === 'slider_2s_xx') sashTypeDisplay = 'Sliding Sash XX (दोनों पल्ले स्लाइडिंग)';
  else if (sType === 'slider_3t_2p_mesh' || sType === 'slider_3s_mesh') sashTypeDisplay = '3-Track Sliding with Mesh (3-ट्रैक जाली सहित)';
  else if (sType === 'slider_3t_6p_4g2m') sashTypeDisplay = '6 Panel 3 Track (4 Glass + 2 Fly Mesh)';
  else if (sType === 'slider_3s' || sType === 'slider_3s_oxo' || sType === 'slider_3s_xxx') sashTypeDisplay = '3-Track 3-Sash Slider (3-पल्ला स्लाइडिंग)';
  else if (sType === 'slider_4s' || sType === 'slider_4s_oxxo' || sType === 'slider_4s_xxxx') sashTypeDisplay = '4-Sash Center Open Slider (4-पल्ला स्लाइडिंग)';
  else if (sType === 'mesh_slider_right' || sType === 'mesh_slider_left' || sType === 'mesh_sash') sashTypeDisplay = 'Fly Mesh Screen Sash (मच्छर जाली पल्ला)';
  else if (sType === 'upvc_panel') sashTypeDisplay = 'Solid uPVC Sandwich Panel (पीवीसी शीट पैनल)';
  else if (sType === 'fan_provision' || pocket.hasFanCutout) sashTypeDisplay = 'Exhaust Fan Provision (एग्जॉस्ट फैन प्रोविज़न)';
  else if (sType === 'ac_provision' || sType === 'louver' || pocket.hasACLouver) sashTypeDisplay = 'AC / Air Louver Blades (एसी लूवर)';
  else if (isCasement) sashTypeDisplay = isDoor ? 'Casement Door Sash (कैसमेंट डोर पल्ला)' : 'Casement Window Sash (कैसमेंट विंडो पल्ला)';
  else if (isSlider) sashTypeDisplay = isDoor ? 'Sliding Door Sash (स्लाइडिंग डोर पल्ला)' : 'Sliding Window Sash (स्लाइडिंग विंडो पल्ला)';

  const customSeriesList = getCustomSeriesList();

  if (isSlider) {
    // 1. Resolve exact code from design properties (pocket or frame)
    let sldCode =
      pocket.sashProfileCode ||
      pocket.sashProfileTop ||
      frame.sashProfileCode ||
      (frame.sashProfileWidth === 66
        ? 'SWH 60-04'
        : frame.sashProfileWidth === 75
        ? 'SWH 60-05'
        : frame.sashProfileWidth === 88
        ? 'SWH 60-06'
        : frame.sashProfileWidth === 57
        ? 'SWH 60-03'
        : undefined);

    if (sldCode?.includes('60-04') || sldCode?.includes('66')) sldCode = 'SWH 60-04';
    else if (sldCode?.includes('60-05') || sldCode?.includes('75')) sldCode = 'SWH 60-05';
    else if (sldCode?.includes('60-06') || sldCode?.includes('88')) sldCode = 'SWH 60-06';
    else if (sldCode?.includes('60-14') || sldCode?.includes('60-17') || sType === 'mesh_sash') sldCode = 'SWH 60-14';
    else if (sldCode?.includes('60-03') || sldCode?.includes('57')) sldCode = 'SWH 60-03';

    if (!sldCode || sldCode === 'standard') {
      sldCode = isDoor ? 'SWH 60-05' : 'SWH 60-03';
    }

    // Check custom series for this sash code
    const cleanCode = sldCode.replace(/\s+/g, '').toUpperCase();
    for (const s of customSeriesList) {
      const foundSash = (s.sashes || []).find(
        (sh) => sh.code.replace(/\s+/g, '').toUpperCase() === cleanCode || sh.id.toUpperCase() === cleanCode
      );
      if (foundSash) {
        return {
          code: foundSash.code,
          name: foundSash.name,
          sashTypeDisplay,
          isDoor,
          category: 'sliding',
          realHeight: foundSash.realHeight || 70,
          beadingSideHeight: foundSash.beadingSideHeight || 52,
          beadCode: 'SWH 60-12',
          beadName: 'SASH BEADING 25.2MM (SWH 60-12)',
          steelCode: 'SRI 60-03-1.5MM',
          steelName: `GI Steel Chamber ${frame.reinforcement || '1.5mm'} (SRI 60-03)`,
          interlockCode: foundSash.code.includes('04') ? 'SWH 60-09' : foundSash.code.includes('05') ? 'SWH 60-10' : foundSash.code.includes('06') ? 'SWH 60-11' : 'SWH 60-08',
          interlockName: `Sliding Interlock Profile (${foundSash.code.includes('04') ? 'SWH 60-09' : 'SWH 60-08'})`,
        };
      }
    }

    // Standard built-in sliding sashes
    if (sldCode === 'SWH 60-04') {
      return {
        code: 'SWH 60-04',
        name: 'SLD HEAVY SASH 42MM X 66MM (SWH 60-04)',
        sashTypeDisplay,
        isDoor,
        category: 'sliding',
        realHeight: 75,
        beadingSideHeight: 56,
        beadCode: 'SWH 60-12',
        beadName: 'SASH BEADING 25.2MM (SWH 60-12)',
        steelCode: 'SRI 60-04-1.5MM',
        steelName: `GI Steel Chamber ${frame.reinforcement || '1.5mm'} (SRI 60-04)`,
        interlockCode: 'SWH 60-09',
        interlockName: 'Sliding Interlock Profile (इण्टरलॉक SWH 60-09)',
      };
    }
    if (sldCode === 'SWH 60-05') {
      return {
        code: 'SWH 60-05',
        name: 'SLD DOOR SASH 42MM X 75MM (SWH 60-05)',
        sashTypeDisplay,
        isDoor,
        category: 'sliding',
        realHeight: 80,
        beadingSideHeight: 60,
        beadCode: 'SWH 60-12',
        beadName: 'SASH BEADING 25.2MM (SWH 60-12)',
        steelCode: 'SRI 85-02-1.5MM',
        steelName: `GI Steel Chamber ${frame.reinforcement || '1.5mm'} (SRI 85-02)`,
        interlockCode: 'SWH 60-10',
        interlockName: 'Sliding Interlock Profile (इण्टरलॉक SWH 60-10)',
      };
    }
    if (sldCode === 'SWH 60-06') {
      return {
        code: 'SWH 60-06',
        name: 'SLD SUPER HEAVY SASH 42MM X 88MM (SWH 60-06)',
        sashTypeDisplay,
        isDoor,
        category: 'sliding',
        realHeight: 85,
        beadingSideHeight: 65,
        beadCode: 'SWH 60-12',
        beadName: 'SASH BEADING 25.2MM (SWH 60-12)',
        steelCode: 'SRI 60-06-2.0MM',
        steelName: `GI Steel Box Chamber ${frame.reinforcement || '2.0mm'} (SRI 60-06)`,
        interlockCode: 'SWH 60-11',
        interlockName: 'Sliding Interlock Profile (इण्टरलॉक SWH 60-11)',
      };
    }
    if (sldCode === 'SWH 60-14' || sldCode === 'SWH 60-17' || sType === 'mesh_sash') {
      return {
        code: 'SWH 60-14',
        name: 'FLY MESH SASH PROFILE 42MM (SWH 60-14)',
        sashTypeDisplay: 'Fly Mesh Screen Sash (मच्छर जाली पल्ला)',
        isDoor,
        category: 'sliding',
        realHeight: 60,
        beadingSideHeight: 40,
        beadCode: 'SWH 60-15',
        beadName: 'MESH BEADING 31.5MM (SWH 60-15)',
        steelCode: 'SRI 60-03-1.5MM',
        steelName: `GI Steel Chamber ${frame.reinforcement || '1.5mm'} (SRI 60-03)`,
        interlockCode: 'SWH 60-08',
        interlockName: 'Sliding Interlock Profile (इण्टरलॉक SWH 60-08)',
      };
    }

    // SWH 60-03 (Standard 57mm)
    return {
      code: 'SWH 60-03',
      name: 'SLD SASH 42MM X 57MM (SWH 60-03)',
      sashTypeDisplay,
      isDoor,
      category: 'sliding',
      realHeight: 70,
      beadingSideHeight: 52,
      beadCode: 'SWH 60-12',
      beadName: 'SASH BEADING 25.2MM (SWH 60-12)',
      steelCode: 'SRI 60-03-1.5MM',
      steelName: `GI Steel Chamber ${frame.reinforcement || '1.5mm'} (SRI 60-03)`,
      interlockCode: 'SWH 60-08',
      interlockName: 'Sliding Interlock Profile (इण्टरलॉक SWH 60-08)',
    };
  }

  if (isCasement) {
    let cmtCode =
      pocket.sashProfileCode ||
      pocket.sashProfileTop ||
      frame.sashProfileCode ||
      (frame.sashProfileWidth === 104
        ? 'CWH 60-06'
        : frame.sashProfileWidth === 71
        ? 'CWH 60-04'
        : frame.sashProfileWidth === 60
        ? 'CWH 60-12'
        : undefined);

    if (cmtCode?.includes('60-04') || cmtCode?.includes('71')) cmtCode = 'CWH 60-04';
    else if (cmtCode?.includes('60-06') || cmtCode?.includes('104')) cmtCode = 'CWH 60-06';
    else if (cmtCode?.includes('60-07')) cmtCode = 'CWH 60-07';
    else if (cmtCode?.includes('60-12')) cmtCode = 'CWH 60-12';
    else if (cmtCode?.includes('65-06') || cmtCode?.includes('115')) cmtCode = 'CWH 65-06';
    else if (cmtCode?.includes('60-03') || cmtCode?.includes('78')) cmtCode = 'CWH 60-03';

    if (!cmtCode || cmtCode === 'standard') {
      cmtCode = isDoor ? 'CWH 60-06' : 'CWH 60-03';
    }

    // Check custom series
    const cleanCode = cmtCode.replace(/\s+/g, '').toUpperCase();
    for (const s of customSeriesList) {
      const foundSash = (s.sashes || []).find(
        (sh) => sh.code.replace(/\s+/g, '').toUpperCase() === cleanCode || sh.id.toUpperCase() === cleanCode
      );
      if (foundSash) {
        return {
          code: foundSash.code,
          name: foundSash.name,
          sashTypeDisplay,
          isDoor,
          category: 'casement',
          realHeight: foundSash.realHeight || (isDoor ? 104 : 78),
          beadingSideHeight: foundSash.beadingSideHeight || (isDoor ? 86 : 60),
          beadCode: 'CWH 60-08',
          beadName: 'SASH BEADING 35.5MM (CWH 60-08)',
          steelCode: isDoor ? 'CRI 60-06-1.5MM' : 'SRI 60-03-1.5MM',
          steelName: isDoor ? 'GI Steel Door Sash Chamber (CRI 60-06)' : 'GI Steel Window Sash Chamber (SRI 60-03)',
        };
      }
    }

    if (cmtCode === 'CWH 60-04') {
      return {
        code: 'CWH 60-04',
        name: 'CMT INWARD SASH 60MM X 71MM (CWH 60-04)',
        sashTypeDisplay,
        isDoor,
        category: 'casement',
        realHeight: 71,
        beadingSideHeight: 53,
        beadCode: 'CWH 60-08',
        beadName: 'SASH BEADING 35.5MM (CWH 60-08)',
        steelCode: 'SRI 60-03-1.5MM',
        steelName: 'GI Steel Window Sash Chamber (SRI 60-03)',
      };
    }
    if (cmtCode === 'CWH 60-06') {
      return {
        code: 'CWH 60-06',
        name: 'CMT OUTWARD DOOR SASH 60MM X 104MM (CWH 60-06)',
        sashTypeDisplay,
        isDoor,
        category: 'casement',
        realHeight: 104,
        beadingSideHeight: 86,
        beadCode: 'CWH 60-08',
        beadName: 'SASH BEADING 35.5MM (CWH 60-08)',
        steelCode: 'CRI 60-06-1.5MM',
        steelName: 'GI Steel Door Sash Chamber (CRI 60-06)',
      };
    }
    if (cmtCode === 'CWH 60-07') {
      return {
        code: 'CWH 60-07',
        name: 'CMT INWARD DOOR SASH 60MM X 104MM (CWH 60-07)',
        sashTypeDisplay,
        isDoor,
        category: 'casement',
        realHeight: 104,
        beadingSideHeight: 86,
        beadCode: 'CWH 60-08',
        beadName: 'SASH BEADING 35.5MM (CWH 60-08)',
        steelCode: 'CRI 60-06-1.5MM',
        steelName: 'GI Steel Door Sash Chamber (CRI 60-06)',
      };
    }
    if (cmtCode === 'CWH 60-12') {
      return {
        code: 'CWH 60-12',
        name: 'SLIM CASEMENT SASH 58MM X 60MM (CWH 60-12)',
        sashTypeDisplay,
        isDoor,
        category: 'casement',
        realHeight: 60,
        beadingSideHeight: 48,
        beadCode: 'CWH 60-08',
        beadName: 'SASH BEADING 35.5MM (CWH 60-08)',
        steelCode: 'SRI 60-03-1.5MM',
        steelName: 'GI Steel Window Sash Chamber (SRI 60-03)',
      };
    }
    if (cmtCode === 'CWH 65-06') {
      return {
        code: 'CWH 65-06',
        name: 'COMMERCIAL ENTRANCE SASH 115MM (CWH 65-06)',
        sashTypeDisplay,
        isDoor,
        category: 'casement',
        realHeight: 115,
        beadingSideHeight: 90,
        beadCode: 'CWH 60-08',
        beadName: 'SASH BEADING 35.5MM (CWH 60-08)',
        steelCode: 'CRI 60-06-1.5MM',
        steelName: 'GI Steel Door Sash Chamber (CRI 60-06)',
      };
    }

    // Default CWH 60-03
    return {
      code: 'CWH 60-03',
      name: 'CMT OUTWARD SASH 60MM X 78MM (CWH 60-03)',
      sashTypeDisplay,
      isDoor,
      category: 'casement',
      realHeight: 78,
      beadingSideHeight: 60,
      beadCode: 'CWH 60-08',
      beadName: 'SASH BEADING 35.5MM (CWH 60-08)',
      steelCode: 'SRI 60-03-1.5MM',
      steelName: 'GI Steel Window Sash Chamber (SRI 60-03)',
    };
  }

  // Fixed or Infill
  return {
    code: 'FIXED-BEAD',
    name: 'FIXED GLAZING (CWH 60-08)',
    sashTypeDisplay,
    isDoor,
    category: sType === 'upvc_panel' ? 'panel' : sType === 'louver' ? 'louver' : 'fixed',
    realHeight: 0,
    beadingSideHeight: 40,
    beadCode: 'CWH 60-08',
    beadName: 'FIXED GLAZING BEADING 35.5MM (CWH 60-08)',
  };
}

/**
 * Calculates industrial cutting dimensions for sliding windows & doors based on
 * Frame properties, Pocket properties, and Series & Profile Settings (Niyam Rules).
 */
export function calculateSlidingCuttingSizes(
  frame: UPVCFrame,
  pocket?: FramePocket,
  rules = getFabricationRules()
) {
  const frameProf = resolveCADFrameProfile(frame);
  const mainPkt = pocket || frame.pockets?.[0] || ({} as FramePocket);
  const sashProf = resolveCADSashProfile(mainPkt, frame);

  // 1. Outer Frame Size: Outer Size = Design Size + 6mm (+3mm each weld corner)
  const weld = rules.casementWeldAllowance || 6;
  const outerCutW = Math.round(frame.width + weld);
  const outerCutH = Math.round(frame.height + weld);

  // 2. Sliding Panels Count:
  const sliderPockets = (frame.pockets || []).filter(
    (p) => p.sashType?.startsWith('slider') || p.sashType?.startsWith('mesh')
  );
  let panels = sliderPockets.length >= 2 ? sliderPockets.length : 2;
  if (frame.series === 'sliding_3track' || frameProf.code.includes('02')) {
    panels = Math.max(panels, 3);
  }

  // 3. Sash Height: Sash_H = Outer Size - ((Frame_Height * 2) - 16)
  const frameHeight = frameProf.height || 44;
  const frameDeduction = (frameHeight * 2) - 16;
  const sashH = Math.round(outerCutH - frameDeduction);

  // 4. Sash Width: Sash_W = (Outer Size - (Frame_Height * 2 - 16)) / panels + ((SASH REAL_H / 2) + 4)
  const sashRealH = sashProf.realHeight || 70;
  const overlap = (sashRealH / 2) + 4;
  const sashW = Math.round((outerCutW - frameDeduction) / panels + overlap);

  // 5. Glass Size: Glass = Sash - (Bead_Side_H * 2 + 6 + 4)
  const beadSideH = sashProf.beadingSideHeight || 52;
  const glassDeduction = (beadSideH * 2) + 10;
  const glassH = Math.max(50, sashH - glassDeduction);
  const glassW = Math.max(50, sashW - glassDeduction);

  // 6. Beading Size: Beading = Glass Size + 4mm
  const beadAllowance = rules.casementBeadingAllowance || 4;
  const beadH = glassH + beadAllowance;
  const beadW = glassW + beadAllowance;

  // 7. Interlock Height: Interlock_H = Sash_H - 16mm
  const interlockH = Math.max(50, sashH - 16);

  // 8. Steel Reinforcement:
  const outerSteelDeduction = rules.giSteelSlidingOuterDeduction || 100;
  const outerSteelW = Math.max(50, outerCutW - outerSteelDeduction);
  const outerSteelH = Math.max(50, outerCutH - outerSteelDeduction);

  const is66 = sashProf.code === 'SWH 60-04' || sashProf.realHeight === 75;
  const is75 = sashProf.code === 'SWH 60-05' || sashProf.realHeight === 80;
  const is88 = sashProf.code === 'SWH 60-06' || sashProf.realHeight === 85;
  const sashSteelDeduction = is88
    ? 172
    : is75
    ? 150
    : is66
    ? (rules.giSteelSlidingSash66Deduction || 128)
    : (rules.giSteelSlidingSash57Deduction || 110);
  const sashSteelW = Math.max(50, sashW - sashSteelDeduction);
  const sashSteelH = Math.max(50, sashH - sashSteelDeduction);

  return {
    outerCutW,
    outerCutH,
    weld,
    frameHeight,
    frameDeduction,
    sashRealH,
    overlap,
    sashW,
    sashH,
    beadSideH,
    glassDeduction,
    glassW,
    glassH,
    beadAllowance,
    beadW,
    beadH,
    interlockH,
    outerSteelDeduction,
    outerSteelW,
    outerSteelH,
    sashSteelDeduction,
    sashSteelW,
    sashSteelH,
    panels,
    frameProf,
    sashProf,
  };
}

/**
 * Calculates exact GI steel reinforcement deduction for Duron Casement Outer Frame:
 * - CWH60-01: Profile Cut Size - 52mm (26mm weld/corner clearance each side)
 * - CWH60-02: Profile Cut Size - 76mm (38mm weld/corner clearance each side)
 * - Fallback / Standard: Profile Cut Size - 100mm
 */
export function getCasementFrameReinforcementDeduction(
  frameProfileCode?: string,
  rules?: ManufacturingNiyamRules
): { deduction: number; profileCode: string; ruleNote: string } {
  const activeRules = rules || getFabricationRules();
  const raw = frameProfileCode || '';
  const norm = raw.replace(/[\s\-_]/g, '').toUpperCase();

  if (norm.includes('CWH6001') || norm.includes('PCWH6001')) {
    const deduction = activeRules.giSteelCWH60_01Deduction ?? 52;
    return {
      deduction,
      profileCode: 'CWH 60-01',
      ruleNote: `CWH 60-01 Frame Cut - ${deduction}mm`,
    };
  }
  if (norm.includes('CWH6002') || norm.includes('PCWH6002')) {
    const deduction = activeRules.giSteelCWH60_02Deduction ?? 76;
    return {
      deduction,
      profileCode: 'CWH 60-02',
      ruleNote: `CWH 60-02 Frame Cut - ${deduction}mm`,
    };
  }
  const fallback = activeRules.giSteelCasementOuterDeduction || 100;
  return {
    deduction: fallback,
    profileCode: raw || 'Casement Frame',
    ruleNote: `Casement Frame Cut - ${fallback}mm`,
  };
}

/**
 * Calculates exact GI steel reinforcement deduction for Duron Casement Sash:
 * - CWH60-03 (Outward Window Sash 78mm): Sash Cut Size - 152mm (76mm deduction each side)
 * - CWH60-04 (Inward Window Sash 71mm): Sash Cut Size - 138mm (69mm deduction each side)
 * - CWH60-06 (Outward Door Sash 104mm): Door Sash Cut Size - 204mm (102mm deduction each side)
 * - CWH60-07 (Inward Door Sash 104mm): Door Sash Cut Size - 204mm (102mm deduction each side)
 * - Default Window Sash: -110mm (or rules setting)
 * - Default Door Sash: -204mm
 */
export function getCasementSashReinforcementDeduction(
  sashProfileCode?: string,
  isDoor?: boolean,
  rules?: ManufacturingNiyamRules
): { deduction: number; profileCode: string; ruleNote: string } {
  const activeRules = rules || getFabricationRules();
  const raw = sashProfileCode || '';
  const norm = raw.replace(/[\s\-_]/g, '').toUpperCase();

  if (norm.includes('CWH6003') || norm.includes('PCWH6003')) {
    const deduction = activeRules.giSteelCWH60_03Deduction ?? 152;
    return {
      deduction,
      profileCode: 'CWH 60-03',
      ruleNote: `CWH 60-03 Window Sash Cut - ${deduction}mm`,
    };
  }
  if (norm.includes('CWH6004') || norm.includes('PCWH6004')) {
    const deduction = activeRules.giSteelCWH60_04Deduction ?? 138;
    return {
      deduction,
      profileCode: 'CWH 60-04',
      ruleNote: `CWH 60-04 Window Sash Cut - ${deduction}mm`,
    };
  }
  if (norm.includes('CWH6006') || norm.includes('PCWH6006')) {
    const deduction = activeRules.giSteelCWH60_06Deduction ?? 204;
    return {
      deduction,
      profileCode: 'CWH 60-06',
      ruleNote: `CWH 60-06 Door Sash Cut - ${deduction}mm`,
    };
  }
  if (norm.includes('CWH6007') || norm.includes('PCWH6007')) {
    const deduction = activeRules.giSteelCWH60_07Deduction ?? 204;
    return {
      deduction,
      profileCode: 'CWH 60-07',
      ruleNote: `CWH 60-07 Door Sash Cut - ${deduction}mm`,
    };
  }
  if (norm.includes('CWH6012') || norm.includes('PCWH6012')) {
    const deduction = 120;
    return {
      deduction,
      profileCode: 'CWH 60-12',
      ruleNote: `CWH 60-12 Slim Sash Cut - ${deduction}mm`,
    };
  }
  if (norm.includes('CWH6506') || norm.includes('PCWH6506')) {
    const deduction = 226;
    return {
      deduction,
      profileCode: 'CWH 65-06',
      ruleNote: `CWH 65-06 Entrance Sash Cut - ${deduction}mm`,
    };
  }

  if (isDoor) {
    const deduction = activeRules.giSteelCWH60_06Deduction ?? 204;
    return {
      deduction,
      profileCode: raw || 'CWH 60-06 (Door)',
      ruleNote: `Casement Door Sash Cut - ${deduction}mm`,
    };
  }

  const fallback = activeRules.giSteelCasementSashDeduction || 110;
  return {
    deduction: fallback,
    profileCode: raw || 'Casement Sash',
    ruleNote: `Casement Sash Cut - ${fallback}mm`,
  };
}

/**
 * Calculates industrial cutting dimensions for casement windows & doors based on
 * Frame properties, Pocket properties, and Series & Profile Settings (Niyam Rules).
 *
 * CASEMENT FORMULAS FROM SERIES & PROFILE SETTINGS:
 * 1. Outer Frame Size: Outer Size = Design Size + 6mm (45° Miter)
 * 2. Sash / Palla Size: Sash = Outer Size - ((Beding_Side * 2) - 16)
 * 3. Glass Size: Glass = Sash - (Sash_Beading_Side_Height * 2) - 8
 * 4. Beading Size: Beading = Glass Size + 4mm
 * 5. GI Steel Reinforcements (Duron CWH60 Specifications):
 *    - CWH 60-01 Outer Frame: Outer Cut - 52mm
 *    - CWH 60-02 Heavy Frame: Outer Cut - 76mm
 *    - CWH 60-03 Outward Window Sash: Sash Cut - 152mm
 *    - CWH 60-04 Inward Window Sash: Sash Cut - 138mm
 *    - CWH 60-06 Outward Door Sash: Sash Cut - 204mm
 *    - CWH 60-07 Inward Door Sash: Sash Cut - 204mm
 */
export function calculateCasementCuttingSizes(
  frame: UPVCFrame,
  pocket?: FramePocket,
  rules = getFabricationRules()
) {
  const frameProf = resolveCADFrameProfile(frame);
  const mainPkt = pocket || frame.pockets?.[0] || ({} as FramePocket);
  const sashProf = resolveCADSashProfile(mainPkt, frame);

  // Check if frame is 3-sided (door with no bottom sill)
  const is3SideFrame = Boolean(
    frame.isThreeSidedFrame ||
    frame.frameSides === '3_side' ||
    mainPkt.isThreeSidedFrame ||
    mainPkt.frameSides === '3_side' ||
    (frame.pockets || []).some((p) => p.isThreeSidedFrame || p.frameSides === '3_side')
  );

  // 1. Outer Frame Size:
  // 4-side: Outer Size = Design Size + 6mm (+3mm each weld corner)
  // 3-side: Width = FW + 6mm (Top piece only, 1 pc), Height = FH + 3mm (Left & Right legs, 2 pcs)
  const weld = rules.casementWeldAllowance || 6;
  const outerCutW = Math.round(frame.width + weld);
  const outerCutH = is3SideFrame ? Math.round(frame.height + 3) : Math.round(frame.height + weld);

  // 2. Sash / Palla Size (Casement Rule Detail):
  // Sash = Outer Size - ((Beding_Side * 2) - 16)
  const frameBeadSide = frameProf.beadingSideHeight || 40;
  const frameBeadDouble = frameBeadSide * 2;
  const sashConstant = rules.casementSashConstant || 16;
  const sashDeduction = frameBeadDouble - sashConstant;

  const verticalMullionsCount = (frame.mullions || []).filter((m) => m.orientation === 'vertical').length;
  const horizontalMullionsCount = (frame.mullions || []).filter((m) => m.orientation === 'horizontal').length;

  let sashW: number;
  let sashH: number;

  if (verticalMullionsCount === 0) {
    // Single leaf / whole frame width
    sashW = Math.max(50, Math.round(outerCutW - sashDeduction));
  } else {
    // Pocket in a mullioned window
    const fpw = frameProf.height || 60;
    const stepDiff = Math.max(0, fpw - frameBeadSide);
    const pW = pocket?.width || Math.max(100, frame.width - 2 * fpw);
    sashW = Math.max(50, Math.round(pW + 2 * stepDiff + sashConstant + weld));
  }

  if (horizontalMullionsCount === 0) {
    // Single leaf / whole frame height
    sashH = Math.max(50, Math.round(outerCutH - sashDeduction));
  } else {
    const fpw = frameProf.height || 60;
    const stepDiff = Math.max(0, fpw - frameBeadSide);
    const pH = pocket?.height || Math.max(100, frame.height - 2 * fpw);
    sashH = Math.max(50, Math.round(pH + 2 * stepDiff + sashConstant + weld));
  }

  // 3. Casement Glass Size: Glass = Sash - (Sash_Beading_Side_Height * 2) - 8
  const beadSideH = sashProf.beadingSideHeight || (sashProf.isDoor ? 86 : 60);
  const glassConstant = rules.casementGlassConstant || 8;
  const cmtGlassDeduction = (beadSideH * 2) + glassConstant;
  const glassW = Math.max(50, Math.round(sashW - cmtGlassDeduction));
  const glassH = Math.max(50, Math.round(sashH - cmtGlassDeduction));

  // 4. Casement Beading Size: Beading = Glass Size + 4mm
  const beadAllowance = rules.casementBeadingAllowance || 4;
  const beadW = glassW + beadAllowance;
  const beadH = glassH + beadAllowance;

  // 5. GI Steel Reinforcement (Profile Specific Duron Formulas)
  const isPocketDoor = mainPkt.applicationType === 'door' || sashProf.isDoor || (frame.series as string) === 'door_premium' || (frame.series as string)?.includes('door');
  const frameSteelInfo = getCasementFrameReinforcementDeduction(frameProf.code, rules);
  const outerSteelDeduction = frameSteelInfo.deduction;
  const outerSteelW = Math.max(50, outerCutW - outerSteelDeduction);
  const outerSteelH = Math.max(50, outerCutH - (is3SideFrame ? 50 : outerSteelDeduction));

  const sashSteelInfo = getCasementSashReinforcementDeduction(sashProf.code, isPocketDoor, rules);
  const sashSteelDeduction = sashSteelInfo.deduction;
  const sashSteelW = Math.max(50, sashW - sashSteelDeduction);
  const sashSteelH = Math.max(50, sashH - sashSteelDeduction);

  return {
    is3SideFrame,
    outerQtyW: is3SideFrame ? 1 : 2,
    outerQtyH: 2,
    outerCutW,
    outerCutH,
    weld,
    frameBeadSide,
    frameBeadDouble,
    sashConstant,
    sashDeduction,
    sashW,
    sashH,
    beadSideH,
    glassConstant,
    cmtGlassDeduction,
    glassW,
    glassH,
    beadAllowance,
    beadW,
    beadH,
    outerSteelDeduction,
    outerSteelW,
    outerSteelH,
    sashSteelDeduction,
    sashSteelW,
    sashSteelH,
    frameProf,
    sashProf,
    frameSteelInfo,
    sashSteelInfo,
  };
}

/**
 * Generates an exact saw cutting schedule / fabrication list with industrial formulas and direct CAD binding.
 */
export function generateCuttingSchedule(
  frames: UPVCFrame[],
  couplings: CouplingConnection[],
  inventoryList?: InventoryMasterItem[]
): CuttingItem[] {
  const items: CuttingItem[] = [];
  let itemCounter = 1;
  const fabricationRules = getFabricationRules();

  (frames || []).forEach((frame, fIdx) => {
    const fName = frame.name || `Frame ${fIdx + 1}`;
    const fpw = frame.frameProfileWidth || 60;
    const mpw = frame.mullionProfileWidth || 74;
    const spw = frame.sashProfileWidth || 60;

    // Resolve exact CAD Outer Frame profile
    const frameProf = resolveCADFrameProfile(frame);
    const outerProfileName = frameProf.name;
    const outerProfileCode = frameProf.code;

    // Check if 3-sided frame is selected (Door with open sill / no bottom frame)
    const is3SideFrame = Boolean(
      frame.isThreeSidedFrame ||
      frame.frameSides === '3_side' ||
      (frame.pockets || []).some((p) => p.isThreeSidedFrame || p.frameSides === '3_side')
    );

    // 1. Outer Frame Widths (Top only for 3-sided, Top & Bottom for 4-sided) - 45° Miter Cuts
    // Cut Width = FW + 6mm (+6mm welding allowance for 3mm per weld corner)
    // For 3-side frame: Width is 1 pc (Top only), Height is 2 pcs (Left/Right)
    const frameCutWidth = Math.round(frame.width + 6);
    items.push({
      id: `cut-${itemCounter++}`,
      frameName: fName,
      itemType: 'Outer Frame',
      tag: is3SideFrame ? `F${fIdx + 1}-W (Top Only - 3 Sides Frame)` : `F${fIdx + 1}-W (Top/Bot)`,
      profileName: is3SideFrame ? `${outerProfileName} (3 SIDES FRAME - TOP)` : outerProfileName,
      profileCode: outerProfileCode,
      sashType: is3SideFrame ? 'Outer Frame (टॉप फ्रेम - 3 साइड चौखट)' : 'Outer Frame (टॉप/बॉटम फ्रेम)',
      pocketLabel: `Frame ${fIdx + 1} Outer`,
      length: frameCutWidth,
      quantity: is3SideFrame ? 1 : 2,
      cutAngleLeft: '45°',
      cutAngleRight: '45°',
      color: frame.color,
      notes: is3SideFrame
        ? `CAD Profile: ${outerProfileCode} | 3-Sided Door Frame: Width = FW + 6mm (Qty: 1 pc TOP ONLY, no bottom sill)`
        : `CAD Profile: ${outerProfileCode} | Top & Bottom Frame: FW + 6mm (+3mm/side weld allowance)`,
    });

    // 2. Outer Frame Heights (Left & Right)
    // Cut Height: For 3-side frame = FH + 3mm (only top weld allowance of 3mm, bottom has no weld); 4-side = FH + 6mm
    const frameCutHeight = is3SideFrame ? Math.round(frame.height + 3) : Math.round(frame.height + 6);
    items.push({
      id: `cut-${itemCounter++}`,
      frameName: fName,
      itemType: 'Outer Frame',
      tag: is3SideFrame ? `F${fIdx + 1}-H (Left/Right - 3 Sides Frame)` : `F${fIdx + 1}-H (Left/Right)`,
      profileName: is3SideFrame ? `${outerProfileName} (3 SIDES FRAME - LEGS)` : outerProfileName,
      profileCode: outerProfileCode,
      sashType: is3SideFrame ? 'Outer Frame (लेफ्ट/राइट - 3 साइड चौखट)' : 'Outer Frame (लेफ्ट/राइट फ्रेम)',
      pocketLabel: `Frame ${fIdx + 1} Outer`,
      length: frameCutHeight,
      quantity: 2,
      cutAngleLeft: is3SideFrame ? '45°' : '45°',
      cutAngleRight: is3SideFrame ? '90°' : '45°',
      color: frame.color,
      notes: is3SideFrame
        ? `CAD Profile: ${outerProfileCode} | 3-Sided Door Frame: Height = FH + 3mm (Qty: 2 pcs, Top 45°, Bottom 90° straight)`
        : `CAD Profile: ${outerProfileCode} | Left & Right Frame: FH + 6mm (+3mm/side weld allowance)`,
    });

    // 3. GI Steel Reinforcement for Outer Frame
    // Sliding: -100mm. Duron Casement: CWH 60-01 (-52mm), CWH 60-02 (-76mm), Standard Casement (-100mm)
    if (frame.reinforcement && frame.reinforcement !== 'none') {
      const isCasementFrame = frameProf.category === 'casement' || (frame.series as string) === 'casement_60' || (frame.series as string) === 'casement_70' || (frame.series as string)?.includes('casement');
      const frameSteelInfo = isCasementFrame
        ? getCasementFrameReinforcementDeduction(outerProfileCode, fabricationRules)
        : { deduction: fabricationRules.giSteelSlidingOuterDeduction || 100, profileCode: outerProfileCode, ruleNote: 'Outer Frame Cut - 100mm' };
      const outerSteelDeduction = frameSteelInfo.deduction;
      const steelWidth = Math.max(50, frameCutWidth - outerSteelDeduction);
      const steelHeightDeduction = is3SideFrame ? 50 : outerSteelDeduction;
      const steelHeight = Math.max(50, frameCutHeight - steelHeightDeduction);
      const is3Track = frame.series === 'sliding_3track' || outerProfileCode === 'SWH 60-02';
      const outerSteelQtyW = is3SideFrame ? 1 : (is3Track ? 4 : 2);
      const outerSteelQtyH = is3Track ? 4 : 2;
      const outerSteelCode = frameProf.category === 'sliding' ? 'SRI 60-01-1.5MM' : 'CRI 60-02-1.5MM';

      items.push({
        id: `cut-${itemCounter++}`,
        frameName: fName,
        itemType: 'Reinforcement',
        tag: `ST-F${fIdx + 1}-W`,
        profileName: `GI Steel Chamber ${frame.reinforcement} (${outerSteelCode})`,
        profileCode: outerSteelCode,
        sashType: is3SideFrame ? 'Outer Reinforcement (टॉप फ्रेम स्टील - 1 पीस)' : 'Outer Reinforcement (फ्रेम स्टील चौड़ाई)',
        pocketLabel: `Frame ${fIdx + 1} Outer Steel`,
        length: steelWidth,
        quantity: outerSteelQtyW,
        cutAngleLeft: '90°',
        cutAngleRight: '90°',
        color: 'Steel Galvanized',
        notes: is3SideFrame
          ? `Outer Frame Steel (Top Only): Frame Cut - ${outerSteelDeduction}mm (Qty: 1 pc)`
          : `Outer Frame Steel (Top/Bot): Frame Cut - ${outerSteelDeduction}mm (${frameSteelInfo.ruleNote})${is3Track ? ' (Double Chamber: 4 pcs)' : ''}`,
      });

      items.push({
        id: `cut-${itemCounter++}`,
        frameName: fName,
        itemType: 'Reinforcement',
        tag: `ST-F${fIdx + 1}-H`,
        profileName: `GI Steel Chamber ${frame.reinforcement} (${outerSteelCode})`,
        profileCode: outerSteelCode,
        sashType: is3SideFrame ? 'Outer Reinforcement (लेग स्टील - 2 पीस)' : 'Outer Reinforcement (फ्रेम स्टील ऊँचाई)',
        pocketLabel: `Frame ${fIdx + 1} Outer Steel`,
        length: steelHeight,
        quantity: outerSteelQtyH,
        cutAngleLeft: '90°',
        cutAngleRight: '90°',
        color: 'Steel Galvanized',
        notes: is3SideFrame
          ? `Outer Frame Steel (Left/Right Legs): Frame Cut - ${steelHeightDeduction}mm (Qty: 2 pcs)`
          : `Outer Frame Steel (Left/Right): Frame Cut - ${outerSteelDeduction}mm (${frameSteelInfo.ruleNote})${is3Track ? ' (Double Chamber: 4 pcs)' : ''}`,
      });
    }

    // 3b. Aluminium Guide Rail for Sliding Systems (DURON-GR)
    if (frameProf.category === 'sliding') {
      const is3Track = frame.series === 'sliding_3track' || outerProfileCode === 'SWH 60-02';
      const guideRailLen = Math.max(50, frame.width - 104);
      items.push({
        id: `cut-${itemCounter++}`,
        frameName: fName,
        itemType: 'Hardware' as any,
        tag: `GR-F${fIdx + 1}`,
        profileName: 'Aluminium Guide Rail (DURON-GR)',
        profileCode: 'DURON-GR',
        sashType: 'Guide Rail (एल्युमिनियम गाइड रेल)',
        pocketLabel: `Frame ${fIdx + 1} Bottom Track`,
        length: guideRailLen,
        quantity: is3Track ? 3 : 2,
        cutAngleLeft: '90°',
        cutAngleRight: '90°',
        color: 'Silver Aluminium',
        notes: `Sliding Track Rail: Frame Width - 104mm (90°/90° cut)`,
      });
    }

    // 4. Mullions & Transoms (90° Square Cuts)
    (frame.mullions || []).forEach((m, mIdx) => {
      const isVert = m.orientation === 'vertical';
      const isPartial = m.spanStart !== undefined && m.spanEnd !== undefined;
      const mLength = isPartial
        ? Math.round(m.spanEnd! - m.spanStart! + 4)
        : isVert
        ? Math.round(frame.height - 2 * fpw + 4)
        : Math.round(frame.width - 2 * fpw + 4);

      const mCode =
        frameProf.category === 'casement'
          ? (frame.seriesCode === 'CWH-50' ? 'CWH 50-05' : frame.seriesCode === 'CWH-65' ? 'CWH 65-05' : 'CWH 60-05')
          : 'SWH 60-17';
      const mName =
        frameProf.category === 'casement'
          ? `CMT MULLION / TRANSOM 60MM X 74MM (${mCode})`
          : `SLD FLY MULLION 60MM (${mCode})`;

      items.push({
        id: `cut-${itemCounter++}`,
        frameName: fName,
        itemType: isVert ? 'Mullion' : 'Transom',
        tag: `M${fIdx + 1}-${isVert ? 'V' : 'H'}${mIdx + 1}`,
        profileName: mName,
        profileCode: mCode,
        sashType: isVert ? 'Vertical Mullion (खड़ी मुल्लियन)' : 'Horizontal Transom (आड़ी मुल्लियन)',
        pocketLabel: `Frame ${fIdx + 1} ${isVert ? 'Mullion' : 'Transom'}`,
        length: mLength,
        quantity: 1,
        cutAngleLeft: '90°',
        cutAngleRight: '90°',
        color: frame.color,
        notes: isPartial
          ? `Sub-${isVert ? 'Mullion' : 'Transom'}: Bay Span (${m.spanEnd! - m.spanStart!}mm) + 4mm joint`
          : isVert 
          ? `Vertical Mullion: H - 2*(FPW) + 4mm cleat allowance (Part: UPVC-HW-MC)`
          : `Horizontal Transom: W - 2*(FPW) + 4mm joint`,
      });

      // Mullion Steel Reinforcement: Mullion Cut Size - 100mm
      if (frame.reinforcement && frame.reinforcement !== 'none') {
        const mSteelCode = 'CRI 60-05-1.5MM';
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Reinforcement',
          tag: `ST-M${fIdx + 1}-${isVert ? 'V' : 'H'}${mIdx + 1}`,
          profileName: `GI Steel Chamber ${frame.reinforcement} (${mSteelCode})`,
          profileCode: mSteelCode,
          sashType: 'Mullion Steel (मुल्लियन स्टील)',
          pocketLabel: `Frame ${fIdx + 1} Mullion Steel`,
          length: Math.max(50, mLength - 100),
          quantity: 1,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          color: 'Steel Galvanized',
          notes: 'Mullion GI Steel: Mullion Cut - 100mm (90°/90°)',
        });
      }
    });

    // 5. Pockets: Sashes, Glazing Beads, Glass, Louvers, Panels, and Interlocks
    (frame.pockets || []).forEach((pocket, pIdx) => {
      const sashInfo = resolveCADSashProfile(pocket, frame);
      const pocketNum = pIdx + 1;
      const bayLabel = pocket.customLabel || pocket.sashLabel || `Bay ${pocketNum}`;
      const isCasement = sashInfo.category === 'casement';
      const isFrench = pocket.sashType === 'french_open';
      const isSlider = sashInfo.category === 'sliding';
      const isPocketDoor = pocket.applicationType === 'door' || sashInfo.isDoor || (frame.series as string) === 'door_premium' || (frame.series as string)?.includes('door');

      if (isFrench) {
        // Double Leaf French Openable Sash
        const leafWidth = Math.round(pocket.width / 2 + 8 + 6);
        const leafHeight = Math.round(pocket.height + 16 + 6);

        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Sash',
          tag: `S-FR-F${fIdx + 1}-P${pIdx + 1}-W`,
          profileName: sashInfo.name,
          profileCode: sashInfo.code,
          sashType: sashInfo.sashTypeDisplay,
          pocketLabel: `${bayLabel} [French Double Leaf]`,
          length: leafWidth,
          quantity: 4, // 2 leaves * 2 (Top/Bottom)
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Profile: ${sashInfo.code} | French Sash Width: (PW/2) + 8mm overlap + 6mm weld`,
        });

        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Sash',
          tag: `S-FR-F${fIdx + 1}-P${pIdx + 1}-H`,
          profileName: sashInfo.name,
          profileCode: sashInfo.code,
          sashType: sashInfo.sashTypeDisplay,
          pocketLabel: `${bayLabel} [French Double Leaf]`,
          length: leafHeight,
          quantity: 4, // 2 leaves * 2 (Left/Right)
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Profile: ${sashInfo.code} | French Sash Height: PH + 16mm overlap + 6mm weld`,
        });

        // GI Steel for French Casement (Profile Specific Duron formulas)
        if (frame.reinforcement && frame.reinforcement !== 'none') {
          const sashSteelInfo = getCasementSashReinforcementDeduction(sashInfo.code, isPocketDoor, fabricationRules);
          const frenchSteelDed = sashSteelInfo.deduction;
          const sashSteelCode = isPocketDoor ? 'CRI 60-06-1.5MM' : (sashInfo.steelCode || 'SRI 60-03-1.5MM');
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Reinforcement',
            tag: `ST-S-FR-F${fIdx + 1}-W`,
            profileName: `GI Steel Chamber ${frame.reinforcement} (${sashSteelCode})`,
            profileCode: sashSteelCode,
            sashType: 'Sash Steel (सैश स्टील चौड़ाई)',
            pocketLabel: `${bayLabel} [Steel]`,
            length: Math.max(50, leafWidth - frenchSteelDed),
            quantity: 4,
            cutAngleLeft: '90°',
            cutAngleRight: '90°',
            color: 'Steel Galvanized',
            notes: `French Sash GI Steel (Width): Sash Cut - ${frenchSteelDed}mm (${sashSteelInfo.ruleNote})`,
          });
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Reinforcement',
            tag: `ST-S-FR-F${fIdx + 1}-H`,
            profileName: `GI Steel Chamber ${frame.reinforcement} (${sashSteelCode})`,
            profileCode: sashSteelCode,
            sashType: 'Sash Steel (सैश स्टील ऊँचाई)',
            pocketLabel: `${bayLabel} [Steel]`,
            length: Math.max(50, leafHeight - frenchSteelDed),
            quantity: 4,
            cutAngleLeft: '90°',
            cutAngleRight: '90°',
            color: 'Steel Galvanized',
            notes: `French Sash GI Steel (Height): Sash Cut - ${frenchSteelDed}mm (${sashSteelInfo.ruleNote})`,
          });
        }

        // Glass for 2 French Leaves
        const glassW = Math.round(leafWidth - 2 * spw - 8);
        const glassH = Math.round(leafHeight - 2 * spw - 8);
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glass',
          tag: `GL-FR-F${fIdx + 1}-P${pIdx + 1}`,
          profileName: getGlassDisplayName(pocket.glassType, pocket.glassName || frame.glassName).toUpperCase(),
          profileCode: 'FLOAT-GLASS',
          sashType: 'French Sash Glass (काँच)',
          pocketLabel: `${bayLabel} [Glass]`,
          length: glassW,
          width: glassW,
          height: glassH,
          quantity: 2,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          color: 'Glass Pane',
          notes: `French Sash Glass: ${glassW} x ${glassH} mm (2 Panes)`,
        });

        // Glazing Beads
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glazing Bead',
          tag: `GB-FR-F${fIdx + 1}-W`,
          profileName: sashInfo.beadName,
          profileCode: sashInfo.beadCode,
          sashType: 'Sash Glazing Bead (ग्लेज़िंग बीड चौड़ाई)',
          pocketLabel: `${bayLabel} [Bead]`,
          length: Math.max(10, glassW + 4),
          quantity: 4,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Bead: ${sashInfo.beadCode} | French Sash Bead (Width): Glass Width + 4mm`,
        });
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glazing Bead',
          tag: `GB-FR-F${fIdx + 1}-H`,
          profileName: sashInfo.beadName,
          profileCode: sashInfo.beadCode,
          sashType: 'Sash Glazing Bead (ग्लेज़िंग बीड ऊँचाई)',
          pocketLabel: `${bayLabel} [Bead]`,
          length: Math.max(10, glassH + 4),
          quantity: 4,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Bead: ${sashInfo.beadCode} | French Sash Bead (Height): Glass Height + 4mm`,
        });

        // Central False Mullion / Flying Mullion (बीच की फॉल्स मुल्लियन / फ्लाइंग मुल्लियन - French Meeting Stile Sash Adapter)
        const falseMullionLength = Math.max(100, Math.round(pocket.height + 16));
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Mullion',
          tag: `FM-FR-F${fIdx + 1}-P${pIdx + 1}`,
          profileName: 'False Mullion / Flying Mullion (बीच की फॉल्स मुल्लियन)',
          profileCode: 'FM-60',
          sashType: 'French Meeting Stile / False Mullion (डबल पल्ला बीच का सैश अडॉप्टर)',
          pocketLabel: `${bayLabel} [False Mullion]`,
          length: falseMullionLength,
          quantity: 1,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          color: frame.color,
          notes: `CAD Profile: FM-60 | French Center False Mullion (बीच का सैश प्रोफाइल): ${falseMullionLength}mm (90° Straight Cut)`,
        });

        // GI Steel for False Mullion
        if (frame.reinforcement && frame.reinforcement !== 'none') {
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Reinforcement',
            tag: `ST-FM-F${fIdx + 1}-P${pIdx + 1}`,
            profileName: `GI Steel Chamber ${frame.reinforcement} (FM-STEEL-1.5MM)`,
            profileCode: 'FM-STEEL-1.5MM',
            sashType: 'False Mullion Steel (फॉल्स मुल्लियन स्टील)',
            pocketLabel: `${bayLabel} [FM Steel]`,
            length: Math.max(50, falseMullionLength - 60),
            quantity: 1,
            cutAngleLeft: '90°',
            cutAngleRight: '90°',
            color: 'Steel Galvanized',
            notes: `French False Mullion GI Steel: FM Length - 60mm`,
          });
        }
      } else if (isCasement) {
        // Single Leaf Casement Openable Sash
        const cmtSizes = calculateCasementCuttingSizes(frame, pocket, fabricationRules);
        const sashWidth = cmtSizes.sashW;
        const sashHeight = cmtSizes.sashH;

        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Sash',
          tag: `S${fIdx + 1}-P${pIdx + 1}-W`,
          profileName: sashInfo.name,
          profileCode: sashInfo.code,
          sashType: sashInfo.sashTypeDisplay,
          pocketLabel: `${bayLabel} [${pocket.sashLabel || 'S' + pocketNum}]`,
          length: sashWidth,
          quantity: 2,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Profile: ${sashInfo.code} | Casement Sash Width: OuterCut(${cmtSizes.outerCutW}) - ((${cmtSizes.frameBeadSide}*2)-16) = ${sashWidth}mm`,
        });

        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Sash',
          tag: `S${fIdx + 1}-P${pIdx + 1}-H`,
          profileName: sashInfo.name,
          profileCode: sashInfo.code,
          sashType: sashInfo.sashTypeDisplay,
          pocketLabel: `${bayLabel} [${pocket.sashLabel || 'S' + pocketNum}]`,
          length: sashHeight,
          quantity: 2,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Profile: ${sashInfo.code} | Casement Sash Height: OuterCut(${cmtSizes.outerCutH}) - ((${cmtSizes.frameBeadSide}*2)-16) = ${sashHeight}mm`,
        });

        // GI Steel for Casement Sash
        if (frame.reinforcement && frame.reinforcement !== 'none') {
          const cmtSteelCode = sashInfo.steelCode || 'SRI 60-03-1.5MM';
          const cmtSteelName = sashInfo.steelName || `GI Steel Chamber ${frame.reinforcement} (${cmtSteelCode})`;
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Reinforcement',
            tag: `ST-S${fIdx + 1}-P${pIdx + 1}-W`,
            profileName: cmtSteelName,
            profileCode: cmtSteelCode,
            sashType: 'Sash Steel (सैश स्टील चौड़ाई)',
            pocketLabel: `${bayLabel} [Steel]`,
            length: cmtSizes.sashSteelW,
            quantity: 2,
            cutAngleLeft: '90°',
            cutAngleRight: '90°',
            color: 'Steel Galvanized',
            notes: `Casement Sash GI Steel (Width): Sash Cut - ${cmtSizes.sashSteelDeduction}mm (${cmtSizes.sashSteelInfo.ruleNote})`,
          });
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Reinforcement',
            tag: `ST-S${fIdx + 1}-P${pIdx + 1}-H`,
            profileName: cmtSteelName,
            profileCode: cmtSteelCode,
            sashType: 'Sash Steel (सैश स्टील ऊँचाई)',
            pocketLabel: `${bayLabel} [Steel]`,
            length: cmtSizes.sashSteelH,
            quantity: 2,
            cutAngleLeft: '90°',
            cutAngleRight: '90°',
            color: 'Steel Galvanized',
            notes: `Casement Sash GI Steel (Height): Sash Cut - ${cmtSizes.sashSteelDeduction}mm (${cmtSizes.sashSteelInfo.ruleNote})`,
          });
        }

        // Casement Glass: Glass = Sash - (BeadSideH * 2) - 8mm
        const glassW = cmtSizes.glassW;
        const glassH = cmtSizes.glassH;
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glass',
          tag: `GL-S${fIdx + 1}-P${pIdx + 1}`,
          profileName: getGlassDisplayName(pocket.glassType, pocket.glassName || frame.glassName).toUpperCase(),
          profileCode: 'FLOAT-GLASS',
          sashType: 'Casement Glass (काँच)',
          pocketLabel: `${bayLabel} [Glass]`,
          length: glassW,
          width: glassW,
          height: glassH,
          quantity: 1,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          color: 'Glass Pane',
          notes: `Casement Glass: ${glassW} x ${glassH} mm (-${(sashInfo.beadingSideHeight * 2) + (fabricationRules.casementGlassConstant || 8)}mm clearance)`,
        });

        // Glazing Beads for Sash
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glazing Bead',
          tag: `GB-S${fIdx + 1}-P${pIdx + 1}-W`,
          profileName: sashInfo.beadName,
          profileCode: sashInfo.beadCode,
          sashType: 'Sash Glazing Bead (ग्लेज़िंग बीड चौड़ाई)',
          pocketLabel: `${bayLabel} [Bead]`,
          length: cmtSizes.beadW,
          quantity: 2,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Bead: ${sashInfo.beadCode} | Sash Bead (Width): Glass Width + ${fabricationRules.casementBeadingAllowance || 4}mm`,
        });
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glazing Bead',
          tag: `GB-S${fIdx + 1}-P${pIdx + 1}-H`,
          profileName: sashInfo.beadName,
          profileCode: sashInfo.beadCode,
          sashType: 'Sash Glazing Bead (ग्लेज़िंग बीड ऊँचाई)',
          pocketLabel: `${bayLabel} [Bead]`,
          length: cmtSizes.beadH,
          quantity: 2,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Bead: ${sashInfo.beadCode} | Sash Bead (Height): Glass Height + ${fabricationRules.casementBeadingAllowance || 4}mm`,
        });
      } else if (isSlider) {
        // Sliding Sash Cuts - Dynamically calculated from Series & Profile Settings
        const sldSizes = calculateSlidingCuttingSizes(frame, pocket, fabricationRules);
        const sliderSashWidth = sldSizes.sashW;
        const sliderSashHeight = sldSizes.sashH;

        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Sash',
          tag: `SL-S${fIdx + 1}-P${pIdx + 1}-W`,
          profileName: sashInfo.name,
          profileCode: sashInfo.code,
          sashType: sashInfo.sashTypeDisplay,
          pocketLabel: `${bayLabel} [${pocket.sashLabel || 'S' + pocketNum}]`,
          length: sliderSashWidth,
          quantity: 2,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Profile: ${sashInfo.code} (${sashInfo.name}) | Sliding Sash Width with 45° Miter Cut`,
        });

        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Sash',
          tag: `SL-S${fIdx + 1}-P${pIdx + 1}-H`,
          profileName: sashInfo.name,
          profileCode: sashInfo.code,
          sashType: sashInfo.sashTypeDisplay,
          pocketLabel: `${bayLabel} [${pocket.sashLabel || 'S' + pocketNum}]`,
          length: sliderSashHeight,
          quantity: 2,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Profile: ${sashInfo.code} (${sashInfo.name}) | Sliding Sash Height: OuterCut - ((FrameH * 2) - 16)`,
        });

        // Sliding GI Steel (-110mm for 57 series / -128mm for 66 series from settings)
        if (frame.reinforcement && frame.reinforcement !== 'none') {
          const sldSteelCode = sashInfo.steelCode || 'SRI 60-03-1.5MM';
          const sldSteelName = sashInfo.steelName || `GI Steel Chamber ${frame.reinforcement} (${sldSteelCode})`;
          const is66 = sashInfo.code === 'SWH 60-04' || sashInfo.realHeight === 75;
          const is75 = sashInfo.code === 'SWH 60-05' || sashInfo.realHeight === 80;
          const is88 = sashInfo.code === 'SWH 60-06' || sashInfo.realHeight === 85;
          const steelDed = is88
            ? 172
            : is75
            ? 150
            : is66
            ? (fabricationRules.giSteelSlidingSash66Deduction || 128)
            : (fabricationRules.giSteelSlidingSash57Deduction || 110);

          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Reinforcement',
            tag: `ST-SL-F${fIdx + 1}-W`,
            profileName: sldSteelName,
            profileCode: sldSteelCode,
            sashType: 'Sliding Sash Steel (स्लाइडिंग स्टील चौड़ाई)',
            pocketLabel: `${bayLabel} [Steel]`,
            length: sldSizes.sashSteelW,
            quantity: 2,
            cutAngleLeft: '90°',
            cutAngleRight: '90°',
            color: 'Steel Galvanized',
            notes: `Sliding Sash Steel (Width): Sash Cut - ${steelDed}mm (${sashInfo.code})`,
          });
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Reinforcement',
            tag: `ST-SL-F${fIdx + 1}-H`,
            profileName: sldSteelName,
            profileCode: sldSteelCode,
            sashType: 'Sliding Sash Steel (स्लाइडिंग स्टील ऊँचाई)',
            pocketLabel: `${bayLabel} [Steel]`,
            length: sldSizes.sashSteelH,
            quantity: 2,
            cutAngleLeft: '90°',
            cutAngleRight: '90°',
            color: 'Steel Galvanized',
            notes: `Sliding Sash Steel (Height): Sash Cut - ${steelDed}mm (${sashInfo.code})`,
          });
        }

        // Interlock Profile: Interlock Cut Length = Sash Height - 16mm (90°/90° cut)
        const interlockLength = sldSizes.interlockH;
        const intCode = sashInfo.interlockCode || 'SWH 60-08';
        const intName = sashInfo.interlockName || `Sliding Interlock Profile (${intCode})`;
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Sash',
          tag: `INT-F${fIdx + 1}-P${pIdx + 1}`,
          profileName: intName,
          profileCode: intCode,
          sashType: 'Sliding Interlock (इण्टरलॉक)',
          pocketLabel: `${bayLabel} [Interlock]`,
          length: interlockLength,
          quantity: 2,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          color: frame.color,
          notes: `Interlock Profile (${intCode}): Sash H - 16mm (No GI Steel needed)`,
        });

        // Glass or Fly Mesh for Sliding Sash
        const isMeshOnly = pocket.sashType?.startsWith('mesh_slider') || pocket.sashType === 'mesh_sash';
        if (isMeshOnly) {
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Glass',
            tag: `MS-SS304-F${fIdx + 1}-P${pIdx + 1}`,
            profileName: 'SS 304 Stainless Steel Mosquito Mesh (जाली)',
            profileCode: 'MESH-SS304',
            sashType: 'Fly Mesh Screen (मच्छर जाली)',
            pocketLabel: `${bayLabel} [Mesh]`,
            length: Math.round(sliderSashWidth - 2 * spw + 20),
            width: Math.round(sliderSashWidth - 2 * spw + 20),
            height: Math.round(sliderSashHeight - 2 * spw + 20),
            quantity: 1,
            cutAngleLeft: '90°',
            cutAngleRight: '90°',
            color: 'Stainless Steel Mesh',
            notes: 'SS304 Fly Mesh Screen with rubber spline',
          });
        } else {
          const glassW = sldSizes.glassW;
          const glassH = sldSizes.glassH;
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Glass',
            tag: `GL-SL-F${fIdx + 1}-P${pIdx + 1}`,
            profileName: getGlassDisplayName(pocket.glassType, pocket.glassName || frame.glassName).toUpperCase(),
            profileCode: 'FLOAT-GLASS',
            sashType: 'Sliding Glass (काँच)',
            pocketLabel: `${bayLabel} [Glass]`,
            length: glassW,
            width: glassW,
            height: glassH,
            quantity: 1,
            cutAngleLeft: '90°',
            cutAngleRight: '90°',
            color: 'Glass Pane',
            notes: `Sliding Glass: ${glassW} x ${glassH} mm (Deduction: -${(sashInfo.beadingSideHeight * 2) + 10}mm)`,
          });

          // Sliding Glazing Beads
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Glazing Bead',
            tag: `GB-SL-F${fIdx + 1}-P${pIdx + 1}-W`,
            profileName: sashInfo.beadName,
            profileCode: sashInfo.beadCode,
            sashType: 'Sliding Glazing Bead (ग्लेज़िंग बीड चौड़ाई)',
            pocketLabel: `${bayLabel} [Bead]`,
            length: sldSizes.beadW,
            quantity: 2,
            cutAngleLeft: '45°',
            cutAngleRight: '45°',
            color: frame.color,
            notes: `CAD Bead: ${sashInfo.beadCode} | Sliding Bead (Width): Glass Width + ${fabricationRules.casementBeadingAllowance || 4}mm`,
          });
          items.push({
            id: `cut-${itemCounter++}`,
            frameName: fName,
            itemType: 'Glazing Bead',
            tag: `GB-SL-F${fIdx + 1}-P${pIdx + 1}-H`,
            profileName: sashInfo.beadName,
            profileCode: sashInfo.beadCode,
            sashType: 'Sliding Glazing Bead (ग्लेज़िंग बीड ऊँचाई)',
            pocketLabel: `${bayLabel} [Bead]`,
            length: sldSizes.beadH,
            quantity: 2,
            cutAngleLeft: '45°',
            cutAngleRight: '45°',
            color: frame.color,
            notes: `CAD Bead: ${sashInfo.beadCode} | Sliding Bead (Height): Glass Height + ${fabricationRules.casementBeadingAllowance || 4}mm`,
          });

          if (pocket.hasMesh && !isMeshOnly) {
            // Fly Mesh Sash Profiles & SS304 Wire Mesh Screen on Track 3
            items.push({
              id: `cut-${itemCounter++}`,
              frameName: fName,
              itemType: 'Sash',
              tag: `MS-SASH-W-F${fIdx + 1}-P${pIdx + 1}`,
              profileName: 'Fly Mesh Sash Profile (जाली पल्ला SWH 60-14)',
              profileCode: 'SWH 60-14',
              sashType: 'Mosquito Mesh Sash (जाली पल्ला चौड़ाई)',
              pocketLabel: `${bayLabel} [Mesh Sash]`,
              length: sliderSashWidth,
              quantity: 2,
              cutAngleLeft: '45°',
              cutAngleRight: '45°',
              color: frame.color,
              notes: 'Fly Mesh Sash Top/Bottom (Sash Width + 6mm weld)',
            });
            items.push({
              id: `cut-${itemCounter++}`,
              frameName: fName,
              itemType: 'Sash',
              tag: `MS-SASH-H-F${fIdx + 1}-P${pIdx + 1}`,
              profileName: 'Fly Mesh Sash Profile (जाली पल्ला SWH 60-14)',
              profileCode: 'SWH 60-14',
              sashType: 'Mosquito Mesh Sash (जाली पल्ला ऊँचाई)',
              pocketLabel: `${bayLabel} [Mesh Sash]`,
              length: sliderSashHeight,
              quantity: 2,
              cutAngleLeft: '45°',
              cutAngleRight: '45°',
              color: frame.color,
              notes: 'Fly Mesh Sash Left/Right (Sash Height + 6mm weld)',
            });
            items.push({
              id: `cut-${itemCounter++}`,
              frameName: fName,
              itemType: 'Glass',
              tag: `MS-SS304-F${fIdx + 1}-P${pIdx + 1}`,
              profileName: 'SS 304 Stainless Steel Mosquito Mesh (जाली)',
              profileCode: 'MESH-SS304',
              sashType: 'Fly Mesh Screen (मच्छर जाली)',
              pocketLabel: `${bayLabel} [Mesh]`,
              length: Math.round(sliderSashWidth - 2 * spw + 20),
              width: Math.round(sliderSashWidth - 2 * spw + 20),
              height: Math.round(sliderSashHeight - 2 * spw + 20),
              quantity: 1,
              cutAngleLeft: '90°',
              cutAngleRight: '90°',
              color: 'Stainless Steel Mesh',
              notes: 'SS304 Fly Mesh Screen on Track 3 with rubber spline',
            });
          }
        }
      } else if (pocket.sashType === 'fan_provision' || pocket.hasFanCutout) {
        // Exhaust Fan Provision: PVC Infill Sheet (PVCS) + circular cutout
        const dia = pocket.fanCutoutDiameter || 200;
        const sheetW = Math.round(pocket.width - 12);
        const sheetH = Math.round(pocket.height - 12);
        const posLabel = pocket.fanHorizontalAlign === 'left' ? 'Left Side' : pocket.fanHorizontalAlign === 'right' ? 'Right Side' : 'Center';
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glass',
          tag: `PVCS-FAN-F${fIdx + 1}-P${pIdx + 1}`,
          profileName: `Exhaust Fan Cutout Ø${dia}mm (${posLabel})`,
          profileCode: 'PVCS-FAN',
          sashType: 'Exhaust Fan Provision (एग्जॉस्ट फैन)',
          pocketLabel: `${bayLabel} [Fan ${pocket.fanHorizontalAlign?.toUpperCase() || 'CTR'}]`,
          length: sheetW,
          width: sheetW,
          height: sheetH,
          quantity: 1,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          color: frame.color,
          notes: `Ø${dia}mm Exhaust Fan Circular Opening (${posLabel})`,
        });
      } else if (pocket.sashType === 'ac_provision' || pocket.sashType === 'louver' || pocket.hasACLouver) {
        // AC Provision / Louver Blades: Spaced at 35mm pitch
        const louverCount = Math.max(3, Math.round(pocket.height / 35));
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Sash',
          tag: `AWH60-LV-F${fIdx + 1}-P${pIdx + 1}`,
          profileName: 'AC Louver Profile Blades (AWH60-LV)',
          profileCode: 'AWH60-LV',
          sashType: 'Ventilation Louvers (लूवर ब्लेड्स)',
          pocketLabel: `${bayLabel} [Louver]`,
          length: Math.round(pocket.width - 4),
          quantity: louverCount,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          color: frame.color,
          notes: `Louver Blades @ 35mm pitch (${louverCount} Blades for AC / Air Vent)`,
        });
      } else if (pocket.sashType === 'upvc_panel') {
        // Solid uPVC Infill Sheet (PVCS)
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glass',
          tag: `PVCS-F${fIdx + 1}-P${pIdx + 1}`,
          profileName: 'Solid uPVC Sandwich Infill Panel (PVCS)',
          profileCode: 'PVCS-PANEL',
          sashType: 'Solid uPVC Panel (पीवीसी पैनल)',
          pocketLabel: `${bayLabel} [Panel]`,
          length: Math.round(pocket.width - 12),
          width: Math.round(pocket.width - 12),
          height: Math.round(pocket.height - 12),
          quantity: 1,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          color: frame.color,
          notes: `Solid PVC Panel (${Math.round(pocket.width - 12)} x ${Math.round(pocket.height - 12)} mm)`,
        });
      } else if (pocket.sashType === 'fixed' || (!isCasement && !isSlider && !isFrench)) {
        // Fixed Glass: Glass Height = Pocket Height - 12mm, Glass Width = Pocket Width - 12mm
        const glassW = Math.max(50, Math.round(pocket.width - 12));
        const glassH = Math.max(50, Math.round(pocket.height - 12));

        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glass',
          tag: `GL-FIX-F${fIdx + 1}-P${pIdx + 1}`,
          profileName: getGlassDisplayName(pocket.glassType, pocket.glassName || frame.glassName).toUpperCase(),
          profileCode: 'FLOAT-GLASS',
          sashType: 'Fixed Glazing (स्थिर काँच)',
          pocketLabel: `${bayLabel} [Fixed]`,
          length: glassW,
          width: glassW,
          height: glassH,
          quantity: 1,
          cutAngleLeft: '90°',
          cutAngleRight: '90°',
          color: 'Glass Pane',
          notes: `Fixed Glass: ${glassW} x ${glassH} mm (Pocket - 12mm clearance)`,
        });

        // Fixed Glazing Beads: Bead Width = Glass Width + 4mm, Bead Height = Glass Height + 4mm
        const fixBeadCode = sashInfo.beadCode || 'CWH 60-08';
        const fixBeadName = sashInfo.beadName || 'Glazing Bead 35.5mm (CWH 60-08)';
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glazing Bead',
          tag: `GB-F${fIdx + 1}-P${pIdx + 1}-W`,
          profileName: fixBeadName,
          profileCode: fixBeadCode,
          sashType: 'Fixed Glazing Bead (ग्लेज़िंग बीड चौड़ाई)',
          pocketLabel: `${bayLabel} [Fixed Bead]`,
          length: Math.max(10, glassW + 4),
          quantity: 2,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Bead: ${fixBeadCode} | Fixed Glazing Bead (Width): Glass Width + 4mm`,
        });
        items.push({
          id: `cut-${itemCounter++}`,
          frameName: fName,
          itemType: 'Glazing Bead',
          tag: `GB-F${fIdx + 1}-P${pIdx + 1}-H`,
          profileName: fixBeadName,
          profileCode: fixBeadCode,
          sashType: 'Fixed Glazing Bead (ग्लेज़िंग बीड ऊँचाई)',
          pocketLabel: `${bayLabel} [Fixed Bead]`,
          length: Math.max(10, glassH + 4),
          quantity: 2,
          cutAngleLeft: '45°',
          cutAngleRight: '45°',
          color: frame.color,
          notes: `CAD Bead: ${fixBeadCode} | Fixed Glazing Bead (Height): Glass Height + 4mm`,
        });
      }
    });
  });

  // 6. Couplers (2mm Flat Coupler / Box Coupler)
  (couplings || []).forEach((c, cIdx) => {
    const source = (frames || []).find((f) => f.id === c.sourceFrameId);
    const target = (frames || []).find((f) => f.id === c.targetFrameId);
    if (!source || !target) return;

    const couplerLength =
      c.direction === 'horizontal'
        ? Math.max(source.height, target.height)
        : Math.max(source.width, target.width);

    const isBox = c.couplerType === 'box_profile';
    const isVariableBay = c.couplerType === 'variable_bay_pole' || (c.angle !== undefined && c.angle !== 180 && c.couplerType !== 'corner_90' && c.couplerType !== 'corner_135');
    const isCorner90 = c.couplerType === 'corner_90' || c.angle === 90;
    const isCorner135 = c.couplerType === 'corner_135';

    let cCode = 'AWH 60-01';
    let profileName = '2mm Flat Coupler Joint (AWH60-01)';
    let sashType = 'Flat Expansion Coupler (2mm फ्लैट कपलर)';
    let notes = `Joins ${source.name} & ${target.name} with ${c.gap || 2}mm expansion seal`;

    if (isVariableBay) {
      const ang = c.angle || 135;
      cCode = 'AWH 60-05';
      profileName = `Variable Angle Bay Pole Post (AWH60-05 - ${ang}° मोड़)`;
      sashType = `Variable Bay Pole Post (${ang}° एंगल मोड़)`;
      notes = `Joins ${source.name} & ${target.name} at ${ang}° bend angle (${c.bendDirection === 'outward' ? 'Outward' : 'Inward'} bend)`;
    } else if (isCorner90) {
      cCode = 'AWH 60-03';
      profileName = '90° Heavy Corner Box Post (AWH60-03)';
      sashType = '90° Corner Post (एल-कॉर्नर)';
      notes = `Joins ${source.name} & ${target.name} at 90° right angle (एल-कॉर्नर 90°)`;
    } else if (isCorner135) {
      cCode = 'AWH 60-04';
      profileName = '135° Fixed Bay Window Coupler (AWH60-04)';
      sashType = '135° Bay Window Coupler (135° बे-विंडो)';
      notes = `Joins ${source.name} & ${target.name} at 135° standard bay angle`;
    } else if (isBox) {
      cCode = 'AWH 60-02';
      profileName = 'Square Corner Box Coupler (AWH60-02)';
      sashType = 'Corner Box Coupler (कॉर्नर बॉक्स)';
      notes = `Joins ${source.name} & ${target.name} with 50mm structural box`;
    }

    items.push({
      id: `cut-${itemCounter++}`,
      frameName: `${source.name} ⮀ ${target.name}`,
      itemType: 'Coupler',
      tag: `${cCode}-${cIdx + 1}`,
      profileName: profileName,
      profileCode: cCode,
      sashType: sashType,
      pocketLabel: isVariableBay ? `Bay Pole (${c.angle || 135}°)` : isCorner90 ? '90° Corner' : 'Coupler Joint',
      length: Math.round(couplerLength),
      quantity: 1,
      cutAngleLeft: '90°',
      cutAngleRight: '90°',
      color: source.color,
      notes: notes,
    });

    // If it's a bay pole or heavy corner post, also add the internal steel/aluminium reinforcement pipe!
    if (isVariableBay || isCorner90) {
      items.push({
        id: `cut-${itemCounter++}`,
        frameName: `${source.name} ⮀ ${target.name}`,
        itemType: 'Reinforcement',
        tag: `ST-BAY-${cIdx + 1}`,
        profileName: isVariableBay ? 'Circular GI/Alu Bay Pole Pipe (60mm Dia)' : 'Square GI Corner Box Pipe (50x50mm)',
        profileCode: isVariableBay ? 'R-BAY-60' : 'R-CNR-50',
        sashType: 'GI Steel Reinforcement Pipe',
        pocketLabel: isVariableBay ? `Bay Pole Steel (${c.angle || 135}°)` : 'Corner Steel',
        length: Math.max(100, Math.round(couplerLength - 20)),
        quantity: 1,
        cutAngleLeft: '90°',
        cutAngleRight: '90°',
        color: 'galvanized',
        notes: `Structural core pipe inside coupler joint (${c.angle || 135}°)`,
      });
    }
  });

  // Calculate live item rate and cost dynamically from Inventory Master
  const activeInventory = inventoryList && inventoryList.length > 0 ? inventoryList : getActiveInventoryMaster();
  items.forEach((item) => {
    const isGlass = item.itemType === 'Glass';
    const isSteel = item.itemType === 'Reinforcement';
    const isCoupler = item.itemType === 'Coupler';
    const isBead = item.itemType === 'Glazing Bead';
    const isSash = item.itemType === 'Sash';
    const isMullion = item.itemType === 'Mullion' || item.itemType === 'Transom';
    const isGuideRail = item.profileCode === 'DURON-GR' || (item.profileName || '').toLowerCase().includes('guide rail');
    const isUPVCProfile = !isGlass && !isSteel && !isGuideRail;

    const fallbackRate = isGlass
      ? 650
      : isSteel
      ? 75
      : isGuideRail
      ? 30
      : isBead
      ? 65
      : isSash
      ? 210
      : isMullion
      ? 220
      : isCoupler
      ? 180
      : 185;

    const inv = getInventoryItemPrice(item.profileCode || '', {
      name: item.profileName,
      category: isGlass ? 'Glass' : isSteel ? 'Reinforcement' : 'Profile',
      isProfile: !isGlass && !isSteel,
      profileType: isBead ? 'bead' : isMullion ? 'mullion' : isSash ? 'sash' : 'outer',
      fallbackRate,
      inventoryList: activeInventory,
      targetUnit: isGlass ? 'SQMT' : isUPVCProfile ? 'KG' : 'Mtr',
    });

    item.fromInventory = inv.fromInventory;
    item.rateFormula = inv.rateFormula;
    const catWeight = lookupProfileWeight(
      item.profileCode || '',
      item.profileName,
      isBead ? 'bead' : isMullion ? 'mullion' : isSash ? 'sash' : 'outer'
    );
    const effWeight = inv.weightPerMtr || catWeight;
    item.weightPerMtr = effWeight;
    if (effWeight && item.length) {
      item.totalWeightKg = Math.round(((item.length * item.quantity) / 1000) * effWeight * 100) / 100;
    }

    if (isGlass) {
      item.unit = 'SQMT';
      item.unitRate = inv.rate;
      const w = item.width || item.length;
      const h = item.height || item.length;
      item.totalCost = Math.round(((w * h * item.quantity) / 1000000) * inv.rate * 100) / 100;
    } else if (isGuideRail) {
      // Aluminium Guide Rail inside sliding systems in METERS
      item.unit = 'Mtr';
      item.unitRate = inv.rate;
      item.totalCost = Math.round(((item.length * item.quantity) / 1000) * inv.rate * 100) / 100;
      item.rateFormula = `₹${inv.rate}/Mtr (एल्युमिनियम गाइड रेल)`;
    } else if (isUPVCProfile) {
      // uPVC Profiles calculated and billed in KG
      item.unit = 'KG';
      const ratePerKg =
        inv.originalUnit === 'Kilogram' && inv.originalPrice
          ? inv.originalPrice
          : inv.matchedItem?.unit === 'Kilogram' && inv.matchedItem.price
          ? inv.matchedItem.price
          : 140;
      item.ratePerKg = ratePerKg;
      item.unitRate = ratePerKg;
      const wt = item.totalWeightKg || Math.round(((item.length * item.quantity) / 1000) * effWeight * 100) / 100;
      item.totalWeightKg = wt;
      item.totalCost = Math.round(wt * ratePerKg * 100) / 100;
      const mtrRate = Math.round(ratePerKg * effWeight * 10) / 10;
      item.rateFormula = `₹${ratePerKg}/KG (वज़न दर @ ${effWeight} kg/m = ₹${mtrRate}/m)`;
    } else {
      // Steel Reinforcement in Meters
      item.unit = 'Mtr';
      item.unitRate = inv.rate;
      item.totalCost = Math.round(((item.length * item.quantity) / 1000) * inv.rate * 100) / 100;
    }
  });

  return items;
}

/**
 * Universal Hardware Handle Resolver
 * Maps any handleCode, handleType, or alias into an industrial specification object.
 * Prioritizes the user-selected handleType from the Inspector UI over legacy/preset handleCode.
 */
export function resolveHardwareHandle(
  pkt: Partial<FramePocket> | undefined,
  context: { isDoor?: boolean; isSlider?: boolean; isMesh?: boolean; defaultColor?: string } = {}
) {
  const hColor = normalizeFrameColorId(pkt?.handleColor || context.defaultColor, 'WHITE').toUpperCase();
  const rawCode = (pkt?.handleCode || '').trim();
  const rawType = (pkt?.handleType || '').trim().toLowerCase();
  const isDoor = context.isDoor ?? false;
  const isSlider = context.isSlider ?? false;
  const isMesh = context.isMesh ?? false;

  // 0. Explicit No Hardware / Dummy Pane
  if (rawType === 'none' || rawCode === 'NONE') {
    return {
      description: 'NO OPERABLE HARDWARE',
      name: 'NO OPERABLE HARDWARE',
      code: 'NONE',
      itemCode: 'NONE',
      hType: 'none',
      hColor,
      unit: 'PCS' as const,
      category: 'none',
      price: 0,
    };
  }

  // 1. Prioritized resolution via handleType (User UI selection)
  if (rawType) {
    if (rawType === 'modern_square_lever') {
      return {
        description: 'MODERN SQUARE ROSETTE LEVER',
        name: `MODERN SQUARE ROSETTE LEVER,${hColor}`,
        code: 'UPVC-HW-MSL',
        itemCode: 'UPVC-HW-MSL',
        hType: 'modern_square_lever',
        hColor,
        unit: 'SET' as const,
        category: 'door',
        price: 980,
      };
    }

    if (rawType === 'crescent_lock') {
      return {
        description: 'CRESCENT ROTARY CAM LOCK',
        name: `CRESCENT ROTARY CAM LOCK,${hColor}`,
        code: 'UPVC-HW-CRL',
        itemCode: 'UPVC-HW-CRL',
        hType: 'crescent_lock',
        hColor,
        unit: 'PCS' as const,
        category: 'sliding',
        price: 150,
      };
    }

    if (rawType === 'top_bottom_cockspur' || rawType === 'hopper_catch') {
      return {
        description: 'HOPPER / TOP-HUNG VENT CATCH',
        name: `HOPPER / TOP-HUNG VENT CATCH,${hColor}`,
        code: 'UPVC-HW-TBCH',
        itemCode: 'UPVC-HW-TBCH',
        hType: 'top_bottom_cockspur',
        hColor,
        unit: 'PCS' as const,
        category: 'vent',
        price: 160,
      };
    }

    if (rawType === 'cockspur_left') {
      return {
        description: 'COCKSPUR HANDLE LEFT',
        name: `COCKSPUR HANDLE LEFT,${hColor}`,
        code: 'UPVC-HW-CHL',
        itemCode: 'UPVC-HW-CHL',
        hType: 'cockspur_left',
        hColor,
        unit: 'PCS' as const,
        category: 'casement',
        price: 180,
      };
    }

    if (rawType === 'cockspur_right' || rawType === 'cockspur_handle' || rawType === 'cockspur') {
      return {
        description: 'COCKSPUR HANDLE RIGHT',
        name: `COCKSPUR HANDLE RIGHT,${hColor}`,
        code: 'UPVC-HW-CHR',
        itemCode: 'UPVC-HW-CHR',
        hType: 'cockspur_right',
        hColor,
        unit: 'PCS' as const,
        category: 'casement',
        price: 180,
      };
    }

    if (rawType === 'espag_key') {
      return {
        description: 'ESPAG HANDLE WITH KEY',
        name: `ESPAG HANDLE WITH KEY,${hColor}`,
        code: 'UPVC-HW-SCEHKEY',
        itemCode: 'UPVC-HW-SCEHKEY',
        hType: 'espag_key',
        hColor,
        unit: 'PCS' as const,
        category: 'universal',
        price: 420,
      };
    }

    if (rawType === 'espag_no_key' || rawType === 'espag' || rawType === 'casement_espag') {
      return {
        description: 'ESPAG HANDLE WITHOUT KEY',
        name: `ESPAG HANDLE WITHOUT KEY,${hColor}`,
        code: 'UPVC-HW-SCEHWK',
        itemCode: 'UPVC-HW-SCEHWK',
        hType: 'espag_no_key',
        hColor,
        unit: 'PCS' as const,
        category: 'universal',
        price: 280,
      };
    }

    if (rawType === 'door_double_side_key') {
      if (isSlider) {
        return {
          description: 'SLD DOUBLE SIDE DOOR HANDLE WITH KEY',
          name: `SLD DOUBLE SIDE DOOR HANDLE WITH KEY,${hColor}`,
          code: 'UPVC-HW-DSDHK',
          itemCode: 'UPVC-HW-DSDHK',
          hType: 'door_double_side_key',
          hColor,
          unit: 'SET' as const,
          category: 'sliding',
          price: 950,
        };
      }
      return {
        description: 'CASEMENT DOUBLE SIDE DOOR HANDLE WITH KEY',
        name: `CASEMENT DOUBLE SIDE DOOR HANDLE WITH KEY,${hColor}`,
        code: 'UPVC-HW-CMTDSDHKEY',
        itemCode: 'UPVC-HW-CMTDSDHKEY',
        hType: 'door_double_side_key',
        hColor,
        unit: 'SET' as const,
        category: 'casement',
        price: 950,
      };
    }

    if (rawType === 'door_double_side' || rawType === 'door_lever') {
      if (isSlider) {
        return {
          description: 'SLD DOUBLE SIDE DOOR HANDLE WITHOUT KEY',
          name: `SLD DOUBLE SIDE DOOR HANDLE WITHOUT KEY,${hColor}`,
          code: 'UPVC-HW-SDSDHWK',
          itemCode: 'UPVC-HW-SDSDHWK',
          hType: 'door_double_side',
          hColor,
          unit: 'SET' as const,
          category: 'sliding',
          price: 780,
        };
      }
      return {
        description: 'CASEMENT DOUBLE SIDE DOOR HANDLE',
        name: `CASEMENT DOUBLE SIDE DOOR HANDLE,${hColor}`,
        code: 'UPVC-HW-CMTDSDH',
        itemCode: 'UPVC-HW-CMTDSDH',
        hType: 'door_double_side',
        hColor,
        unit: 'SET' as const,
        category: 'casement',
        price: 780,
      };
    }

    if (rawType === 'door_lock_set') {
      if (isSlider) {
        return {
          description: 'SLD DOOR LOCKING SET',
          name: `SLD DOOR LOCKING SET,${hColor}`,
          code: 'UPVC-HW-LCKSET',
          itemCode: 'UPVC-HW-LCKSET',
          hType: 'door_lock_set',
          hColor,
          unit: 'SET' as const,
          category: 'sliding',
          price: 1250,
        };
      }
      return {
        description: 'CMT DOOR LOCKING SET',
        name: `CMT DOOR LOCKING SET,${hColor}`,
        code: 'UPVC HW-CDLS',
        itemCode: 'UPVC HW-CDLS',
        hType: 'door_lock_set',
        hColor,
        unit: 'SET' as const,
        category: 'casement',
        price: 1500,
      };
    }

    if (rawType === 'mortise_lock_set') {
      return {
        description: 'MORTIES DOOR LOCK SET',
        name: `MORTIES DOOR LOCK SET,${hColor}`,
        code: 'UPVC-HW-MLS',
        itemCode: 'UPVC-HW-MLS',
        hType: 'mortise_lock_set',
        hColor,
        unit: 'SET' as const,
        category: 'casement',
        price: 1000,
      };
    }

    if (rawType === 'sliding_d_pull' || rawType === 'd_pull') {
      return {
        description: 'SLD D HANDLE',
        name: `SLD D HANDLE,${hColor}`,
        code: 'UPVC-HW-SDH',
        itemCode: 'UPVC-HW-SDH',
        hType: 'sliding_d_pull',
        hColor,
        unit: 'PCS' as const,
        category: 'sliding',
        price: 350,
      };
    }

    if (rawType === 'sliding_pop_key') {
      return {
        description: 'SLD POP UP HANDLE WITH KEY',
        name: `SLD POP UP HANDLE WITH KEY,${hColor}`,
        code: 'UPVC-HW-POP-KEY',
        itemCode: 'UPVC-HW-POP-KEY',
        hType: 'sliding_pop_key',
        hColor,
        unit: 'PCS' as const,
        category: 'sliding',
        price: 520,
      };
    }

    if (rawType === 'pop_up') {
      return {
        description: 'SLD POP UP HANDLE',
        name: `SLD POP UP HANDLE,${hColor}`,
        code: 'UPVC-HW-POPUPH',
        itemCode: 'UPVC-HW-POPUPH',
        hType: 'pop_up',
        hColor,
        unit: 'PCS' as const,
        category: 'sliding',
        price: 380,
      };
    }

    if (rawType === 'sliding_touch_left' || rawType === 'touch_lock_left') {
      return {
        description: 'SLD TOUCH LOCK LEFT',
        name: `SLD TOUCH LOCK LEFT,${hColor}`,
        code: 'UPVC-HW-STLL',
        itemCode: 'UPVC-HW-STLL',
        hType: 'touch_lock',
        hColor,
        unit: 'PCS' as const,
        category: 'sliding',
        price: 80,
      };
    }

    if (rawType === 'sliding_touch_right' || rawType === 'touch_lock_right') {
      return {
        description: 'SLD TOUCH LOCK RIGHT',
        name: `SLD TOUCH LOCK RIGHT,${hColor}`,
        code: 'UPVC-HW-STLR',
        itemCode: 'UPVC-HW-STLR',
        hType: 'touch_lock',
        hColor,
        unit: 'PCS' as const,
        category: 'sliding',
        price: 80,
      };
    }

    if (
      rawType === 'touch_lock' ||
      rawType === 'sliding_flush' ||
      rawType === 'touch'
    ) {
      return {
        description: 'SLD TOUCH LOCK (LEFT / RIGHT)',
        name: `SLD TOUCH LOCK,${hColor}`,
        code: 'UPVC-HW-STLL / STLR',
        itemCode: 'UPVC-HW-STLL / STLR',
        hType: 'touch_lock',
        hColor,
        unit: 'PCS' as const,
        category: 'sliding',
        price: 80,
      };
    }

    if (rawType === 'fly_mesh_handle') {
      return {
        description: 'FLY MESH HANDLE',
        name: `FLY MESH HANDLE,${hColor}`,
        code: 'UPVC-HW-FMH',
        itemCode: 'UPVC-HW-FMH',
        hType: 'fly_mesh_handle',
        hColor,
        unit: 'PCS' as const,
        category: 'mesh',
        price: 120,
      };
    }

    if (rawType === 'c_handle') {
      return {
        description: 'SLD C HANDLE',
        name: `SLD C HANDLE,${hColor}`,
        code: 'UPVC-HW-SCH',
        itemCode: 'UPVC-HW-SCH',
        hType: 'c_handle',
        hColor,
        unit: 'PCS' as const,
        category: 'mesh',
        price: 150,
      };
    }
  }

  // 2. Secondary resolution via rawCode (if handleType was absent or unrecognized)
  if (rawCode === 'UPVC-HW-MSL') {
    return {
      description: 'MODERN SQUARE ROSETTE LEVER',
      name: `MODERN SQUARE ROSETTE LEVER,${hColor}`,
      code: 'UPVC-HW-MSL',
      itemCode: 'UPVC-HW-MSL',
      hType: 'modern_square_lever',
      hColor,
      unit: 'SET' as const,
      category: 'door',
      price: 980,
    };
  }

  if (rawCode === 'UPVC-HW-CRL') {
    return {
      description: 'CRESCENT ROTARY CAM LOCK',
      name: `CRESCENT ROTARY CAM LOCK,${hColor}`,
      code: 'UPVC-HW-CRL',
      itemCode: 'UPVC-HW-CRL',
      hType: 'crescent_lock',
      hColor,
      unit: 'PCS' as const,
      category: 'sliding',
      price: 150,
    };
  }

  if (rawCode === 'UPVC-HW-TBCH') {
    return {
      description: 'HOPPER / TOP-HUNG VENT CATCH',
      name: `HOPPER / TOP-HUNG VENT CATCH,${hColor}`,
      code: 'UPVC-HW-TBCH',
      itemCode: 'UPVC-HW-TBCH',
      hType: 'top_bottom_cockspur',
      hColor,
      unit: 'PCS' as const,
      category: 'vent',
      price: 160,
    };
  }

  if (rawCode === 'UPVC-HW-CHL') {
    return {
      description: 'COCKSPUR HANDLE LEFT',
      name: `COCKSPUR HANDLE LEFT,${hColor}`,
      code: 'UPVC-HW-CHL',
      itemCode: 'UPVC-HW-CHL',
      hType: 'cockspur_left',
      hColor,
      unit: 'PCS' as const,
      category: 'casement',
      price: 180,
    };
  }

  if (rawCode === 'UPVC-HW-CHR') {
    return {
      description: 'COCKSPUR HANDLE RIGHT',
      name: `COCKSPUR HANDLE RIGHT,${hColor}`,
      code: 'UPVC-HW-CHR',
      itemCode: 'UPVC-HW-CHR',
      hType: 'cockspur_right',
      hColor,
      unit: 'PCS' as const,
      category: 'casement',
      price: 180,
    };
  }

  if (rawCode === 'UPVC-HW-SCEHKEY') {
    return {
      description: 'ESPAG HANDLE WITH KEY',
      name: `ESPAG HANDLE WITH KEY,${hColor}`,
      code: 'UPVC-HW-SCEHKEY',
      itemCode: 'UPVC-HW-SCEHKEY',
      hType: 'espag_key',
      hColor,
      unit: 'PCS' as const,
      category: 'universal',
      price: 420,
    };
  }

  if (rawCode === 'UPVC-HW-SCEHWK') {
    return {
      description: 'ESPAG HANDLE WITHOUT KEY',
      name: `ESPAG HANDLE WITHOUT KEY,${hColor}`,
      code: 'UPVC-HW-SCEHWK',
      itemCode: 'UPVC-HW-SCEHWK',
      hType: 'espag_no_key',
      hColor,
      unit: 'PCS' as const,
      category: 'universal',
      price: 280,
    };
  }

  if (rawCode === 'UPVC-HW-CMTDSDHKEY') {
    return {
      description: 'CASEMENT DOUBLE SIDE DOOR HANDLE WITH KEY',
      name: `CASEMENT DOUBLE SIDE DOOR HANDLE WITH KEY,${hColor}`,
      code: 'UPVC-HW-CMTDSDHKEY',
      itemCode: 'UPVC-HW-CMTDSDHKEY',
      hType: 'door_double_side_key',
      hColor,
      unit: 'SET' as const,
      category: 'casement',
      price: 950,
    };
  }

  if (rawCode === 'UPVC-HW-CMTDSDH') {
    return {
      description: 'CASEMENT DOUBLE SIDE DOOR HANDLE',
      name: `CASEMENT DOUBLE SIDE DOOR HANDLE,${hColor}`,
      code: 'UPVC-HW-CMTDSDH',
      itemCode: 'UPVC-HW-CMTDSDH',
      hType: 'door_double_side',
      hColor,
      unit: 'SET' as const,
      category: 'casement',
      price: 780,
    };
  }

  if (rawCode === 'UPVC HW-CDLS' || rawCode === 'UPVC-HW-CDLS') {
    return {
      description: 'CMT DOOR LOCKING SET',
      name: `CMT DOOR LOCKING SET,${hColor}`,
      code: 'UPVC HW-CDLS',
      itemCode: 'UPVC HW-CDLS',
      hType: 'door_lock_set',
      hColor,
      unit: 'SET' as const,
      category: 'casement',
      price: 1500,
    };
  }

  if (rawCode === 'UPVC-HW-MLS') {
    return {
      description: 'MORTIES DOOR LOCK SET',
      name: `MORTIES DOOR LOCK SET,${hColor}`,
      code: 'UPVC-HW-MLS',
      itemCode: 'UPVC-HW-MLS',
      hType: 'mortise_lock_set',
      hColor,
      unit: 'SET' as const,
      category: 'casement',
      price: 1000,
    };
  }

  if (rawCode === 'UPVC-HW-SDH' || rawCode.includes('SDH')) {
    return {
      description: 'SLD D HANDLE',
      name: `SLD D HANDLE,${hColor}`,
      code: 'UPVC-HW-SDH',
      itemCode: 'UPVC-HW-SDH',
      hType: 'sliding_d_pull',
      hColor,
      unit: 'PCS' as const,
      category: 'sliding',
      price: 350,
    };
  }

  if (rawCode === 'UPVC-HW-POP-KEY' || (rawCode.includes('POP') && rawCode.includes('KEY'))) {
    return {
      description: 'SLD POP UP HANDLE WITH KEY',
      name: `SLD POP UP HANDLE WITH KEY,${hColor}`,
      code: 'UPVC-HW-POP-KEY',
      itemCode: 'UPVC-HW-POP-KEY',
      hType: 'sliding_pop_key',
      hColor,
      unit: 'PCS' as const,
      category: 'sliding',
      price: 520,
    };
  }

  if (rawCode === 'UPVC-HW-POPUPH' || rawCode.includes('POPUPH')) {
    return {
      description: 'SLD POP UP HANDLE',
      name: `SLD POP UP HANDLE,${hColor}`,
      code: 'UPVC-HW-POPUPH',
      itemCode: 'UPVC-HW-POPUPH',
      hType: 'pop_up',
      hColor,
      unit: 'PCS' as const,
      category: 'sliding',
      price: 380,
    };
  }

  if (rawCode === 'UPVC-HW-DSDHK') {
    return {
      description: 'SLD DOUBLE SIDE DOOR HANDLE WITH KEY',
      name: `SLD DOUBLE SIDE DOOR HANDLE WITH KEY,${hColor}`,
      code: 'UPVC-HW-DSDHK',
      itemCode: 'UPVC-HW-DSDHK',
      hType: 'door_double_side_key',
      hColor,
      unit: 'SET' as const,
      category: 'sliding',
      price: 950,
    };
  }

  if (rawCode === 'UPVC-HW-SDSDHWK') {
    return {
      description: 'SLD DOUBLE SIDE DOOR HANDLE WITHOUT KEY',
      name: `SLD DOUBLE SIDE DOOR HANDLE WITHOUT KEY,${hColor}`,
      code: 'UPVC-HW-SDSDHWK',
      itemCode: 'UPVC-HW-SDSDHWK',
      hType: 'door_double_side',
      hColor,
      unit: 'SET' as const,
      category: 'sliding',
      price: 780,
    };
  }

  if (rawCode === 'UPVC-HW-LCKSET') {
    return {
      description: 'SLD DOOR LOCKING SET',
      name: `SLD DOOR LOCKING SET,${hColor}`,
      code: 'UPVC-HW-LCKSET',
      itemCode: 'UPVC-HW-LCKSET',
      hType: 'door_lock_set',
      hColor,
      unit: 'SET' as const,
      category: 'sliding',
      price: 1250,
    };
  }

  if (rawCode === 'UPVC-HW-STLL') {
    return {
      description: 'SLD TOUCH LOCK LEFT',
      name: `SLD TOUCH LOCK LEFT,${hColor}`,
      code: 'UPVC-HW-STLL',
      itemCode: 'UPVC-HW-STLL',
      hType: 'touch_lock',
      hColor,
      unit: 'PCS' as const,
      category: 'sliding',
      price: 80,
    };
  }

  if (rawCode === 'UPVC-HW-STLR') {
    return {
      description: 'SLD TOUCH LOCK RIGHT',
      name: `SLD TOUCH LOCK RIGHT,${hColor}`,
      code: 'UPVC-HW-STLR',
      itemCode: 'UPVC-HW-STLR',
      hType: 'touch_lock',
      hColor,
      unit: 'PCS' as const,
      category: 'sliding',
      price: 80,
    };
  }

  if (rawCode.includes('STLL') || rawCode.includes('STLR')) {
    return {
      description: 'SLD TOUCH LOCK (LEFT / RIGHT)',
      name: `SLD TOUCH LOCK,${hColor}`,
      code: 'UPVC-HW-STLL / STLR',
      itemCode: 'UPVC-HW-STLL / STLR',
      hType: 'touch_lock',
      hColor,
      unit: 'PCS' as const,
      category: 'sliding',
      price: 80,
    };
  }

  if (rawCode === 'UPVC-HW-FMH' || (isMesh && rawCode.includes('FMH'))) {
    return {
      description: 'FLY MESH HANDLE',
      name: `FLY MESH HANDLE,${hColor}`,
      code: 'UPVC-HW-FMH',
      itemCode: 'UPVC-HW-FMH',
      hType: 'fly_mesh_handle',
      hColor,
      unit: 'PCS' as const,
      category: 'mesh',
      price: 120,
    };
  }

  if (rawCode === 'UPVC-HW-SCH' || (isMesh && rawCode.includes('SCH'))) {
    return {
      description: 'SLD C HANDLE',
      name: `SLD C HANDLE,${hColor}`,
      code: 'UPVC-HW-SCH',
      itemCode: 'UPVC-HW-SCH',
      hType: 'c_handle',
      hColor,
      unit: 'PCS' as const,
      category: 'mesh',
      price: 150,
    };
  }

  // 3. Fallback defaults based on type and application
  if (isSlider) {
    if (isMesh) {
      return {
        description: 'SLD C HANDLE',
        name: `SLD C HANDLE,${hColor}`,
        code: 'UPVC-HW-SCH',
        itemCode: 'UPVC-HW-SCH',
        hType: 'c_handle',
        hColor,
        unit: 'PCS' as const,
        category: 'mesh',
        price: 150,
      };
    }
    if (isDoor) {
      return {
        description: 'SLD D HANDLE',
        name: `SLD D HANDLE,${hColor}`,
        code: 'UPVC-HW-SDH',
        itemCode: 'UPVC-HW-SDH',
        hType: 'sliding_d_pull',
        hColor,
        unit: 'PCS' as const,
        category: 'sliding',
        price: 350,
      };
    }
    return {
      description: 'SLD TOUCH LOCK (LEFT / RIGHT)',
      name: `SLD TOUCH LOCK,${hColor}`,
      code: 'UPVC-HW-STLL / STLR',
      itemCode: 'UPVC-HW-STLL / STLR',
      hType: 'touch_lock',
      hColor,
      unit: 'PCS' as const,
      category: 'sliding',
      price: 80,
    };
  }

  if (isDoor) {
    return {
      description: 'CASEMENT DOUBLE SIDE DOOR HANDLE',
      name: `CASEMENT DOUBLE SIDE DOOR HANDLE,${hColor}`,
      code: 'UPVC-HW-CMTDSDH',
      itemCode: 'UPVC-HW-CMTDSDH',
      hType: 'door_double_side',
      hColor,
      unit: 'SET' as const,
      category: 'casement',
      price: 780,
    };
  }

  return {
    description: 'COCKSPUR HANDLE RIGHT',
    name: `COCKSPUR HANDLE RIGHT,${hColor}`,
    code: 'UPVC-HW-CHR',
    itemCode: 'UPVC-HW-CHR',
    hType: 'cockspur_right',
    hColor,
    unit: 'PCS' as const,
    category: 'casement',
    price: 180,
  };
}

/**
 * Computes Bill of Materials (BOM) and cost breakdown using Dynamic Hardware Selection Rules Engine.
 */
export function calculateBOM(
  frames: UPVCFrame[],
  couplings: CouplingConnection[],
  pricing: PricingConfig,
  inventoryList?: InventoryMasterItem[]
): { items: BOMItem[]; subtotal: number; taxAmount: number; grandTotal: number; totalAreaSqM: number; totalAreaSqFt: number } {
  const activeInventory = inventoryList && inventoryList.length > 0 ? inventoryList : getActiveInventoryMaster();
  const cuttingItems = generateCuttingSchedule(frames || [], couplings || [], activeInventory);
  const bomMap = new Map<string, BOMItem>();

  function addOrUpdate(
    category: BOMItem['category'],
    name: string,
    description: string,
    unit: BOMItem['unit'],
    qty: number,
    rate: number
  ) {
    const key = `${category}-${name}`;
    if (bomMap.has(key)) {
      const existing = bomMap.get(key)!;
      existing.quantity += qty;
      existing.totalAmount = Math.round(existing.quantity * existing.unitRate);
    } else {
      bomMap.set(key, {
        category,
        name,
        description,
        unit,
        quantity: Math.round(qty * 100) / 100,
        unitRate: rate,
        totalAmount: Math.round(qty * rate),
      });
    }
  }

  // Profile & Guide Rail meters calculation
  let totalFrameMeters = 0;
  let totalFrameKg = 0;
  let totalMullionMeters = 0;
  let totalMullionKg = 0;
  let totalSashMeters = 0;
  let totalSashKg = 0;
  let totalCouplerMeters = 0;
  let totalCouplerKg = 0;
  let totalSteelMeters = 0;
  let totalGuideRailMeters = 0;

  (cuttingItems || []).forEach((ci) => {
    const meters = (ci.length / 1000) * ci.quantity;
    const isGuideRail = ci.profileCode === 'DURON-GR' || (ci.profileName || '').toLowerCase().includes('guide rail');
    const effWtPerMtr = ci.weightPerMtr || lookupProfileWeight(ci.profileCode || '', ci.profileName, ci.itemType === 'Glazing Bead' ? 'bead' : ci.itemType === 'Mullion' || ci.itemType === 'Transom' ? 'mullion' : ci.itemType === 'Sash' ? 'sash' : ci.itemType === 'Coupler' ? 'coupler' : 'outer');
    const kg = ci.totalWeightKg || Math.round(meters * effWtPerMtr * 100) / 100;

    if (isGuideRail) {
      totalGuideRailMeters += meters;
    } else if (ci.itemType === 'Outer Frame') {
      totalFrameMeters += meters;
      totalFrameKg += kg;
    } else if (ci.itemType === 'Mullion' || ci.itemType === 'Transom') {
      totalMullionMeters += meters;
      totalMullionKg += kg;
    } else if (ci.itemType === 'Sash' || ci.itemType === 'Glazing Bead') {
      totalSashMeters += meters;
      totalSashKg += kg;
    } else if (ci.itemType === 'Coupler') {
      totalCouplerMeters += meters;
      totalCouplerKg += kg;
    } else if (ci.itemType === 'Reinforcement') {
      totalSteelMeters += meters;
    }
  });

  // Apply fabrication wastage percentage
  const wastageFactor = 1 + ((pricing?.fabricationWastagePercent ?? 8)) / 100;
  totalFrameMeters *= wastageFactor;
  totalFrameKg *= wastageFactor;
  totalMullionMeters *= wastageFactor;
  totalMullionKg *= wastageFactor;
  totalSashMeters *= wastageFactor;
  totalSashKg *= wastageFactor;
  totalSteelMeters *= wastageFactor;

  const defaultProfRateKg = 140;
  const defaultMulRateKg = 140;
  const defaultSashRateKg = 140;
  const defaultCplRateKg = 140;
  const defaultSteelRate = pricing?.reinforcementRatePerMeter ?? 120;

  const profRateKg = getInventoryItemPrice('CWH 60-01', { category: 'Profile', isProfile: true, profileType: 'outer', fallbackRate: defaultProfRateKg, inventoryList: activeInventory, targetUnit: 'KG' }).rate;
  const mulRateKg = getInventoryItemPrice('CWH 60-05', { category: 'Profile', isProfile: true, profileType: 'mullion', fallbackRate: defaultMulRateKg, inventoryList: activeInventory, targetUnit: 'KG' }).rate;
  const sashRateKg = getInventoryItemPrice('CWH 60-03', { category: 'Profile', isProfile: true, profileType: 'sash', fallbackRate: defaultSashRateKg, inventoryList: activeInventory, targetUnit: 'KG' }).rate;
  const cplRateKg = getInventoryItemPrice('AWH 60-01', { category: 'Profile', isProfile: true, profileType: 'outer', fallbackRate: defaultCplRateKg, inventoryList: activeInventory, targetUnit: 'KG' }).rate;
  const steelRate = getInventoryItemPrice('SRI 60-01-1.5MM', { category: 'Reinforcement', fallbackRate: defaultSteelRate, inventoryList: activeInventory, targetUnit: 'Mtr' }).rate;
  const guideRailRate = getInventoryItemPrice('DURON-GR', { category: 'Profile', isProfile: true, fallbackRate: 30, inventoryList: activeInventory, targetUnit: 'Mtr' }).rate;

  if (totalFrameKg > 0) {
    const frameKg = Math.round(totalFrameKg * 100) / 100;
    const avgRate = totalFrameMeters > 0 ? (frameKg / totalFrameMeters).toFixed(2) : '1.02';
    addOrUpdate('Profile', 'Outer Frame Profile (uPVC)', `Multi-chamber outer frame extrusion (${totalFrameMeters.toFixed(2)} Mtr @ ~${avgRate} kg/m +8% wastage)`, 'kg', frameKg, profRateKg);
  }
  if (totalMullionKg > 0) {
    const mulKg = Math.round(totalMullionKg * 100) / 100;
    const avgRate = totalMullionMeters > 0 ? (mulKg / totalMullionMeters).toFixed(2) : '1.15';
    addOrUpdate('Profile', 'Mullion / Transom Profile (uPVC)', `Heavy load-bearing divider (${totalMullionMeters.toFixed(2)} Mtr @ ~${avgRate} kg/m +8% wastage)`, 'kg', mulKg, mulRateKg);
  }
  if (totalSashKg > 0) {
    const sashKg = Math.round(totalSashKg * 100) / 100;
    const avgRate = totalSashMeters > 0 ? (sashKg / totalSashMeters).toFixed(2) : '1.21';
    addOrUpdate('Profile', 'Casement & Sliding Sash Profile', `Sash & beading profiles (${totalSashMeters.toFixed(2)} Mtr @ ~${avgRate} kg/m)`, 'kg', sashKg, sashRateKg);
  }
  if (totalCouplerKg > 0) {
    const cplKg = Math.round(totalCouplerKg * 100) / 100;
    const avgRate = totalCouplerMeters > 0 ? (cplKg / totalCouplerMeters).toFixed(2) : '0.20';
    addOrUpdate('Coupler', 'Coupling Profile (AWH60-01 / 2mm Gaskets)', `Frame expansion jointer profile (${totalCouplerMeters.toFixed(2)} Mtr @ ~${avgRate} kg/m)`, 'kg', cplKg, cplRateKg);
  }
  if (totalGuideRailMeters > 0) {
    // Aluminium Guide Rail in METERS
    addOrUpdate('Hardware', 'Aluminium Guide Rail (DURON-GR)', 'Sliding bottom track aluminium rail (मीटर में)', 'meters', totalGuideRailMeters, guideRailRate);
  }
  if (totalSteelMeters > 0) {
    addOrUpdate('Steel Reinforcement', 'GI Galvanized Steel Reinforcement (-100mm)', 'Anti-windload internal steel chambers', 'meters', totalSteelMeters, steelRate);
  }

  // Glass Area calculation
  let totalGlassAreaSqM = 0;
  (frames || []).forEach((f) => {
    (f.pockets || []).forEach((p) => {
      const isLouver = p.sashType === 'louver' || p.sashType === 'ac_provision' || p.hasACLouver;
      const isFan = p.sashType === 'fan_provision' || p.hasFanCutout;
      const isPanel = p.sashType === 'upvc_panel';

      if (isLouver) {
        const bladeCount = Math.max(3, Math.round(p.height / 35));
        addOrUpdate('Accessories', 'AC Louver Blades (AWH60-LV)', `Ventilation louvers @ 35mm pitch (${bladeCount} Blades)`, 'pcs', bladeCount, 120);
      } else if (isFan) {
        const dia = p.fanCutoutDiameter || 200;
        addOrUpdate('Accessories', `PVC Fan Cutout Plate (PVCS Ø${dia}mm)`, 'Bathroom/Kitchen ventilator circular plate', 'pcs', 1, 450);
      } else if (isPanel) {
        const areaSqM = (p.width / 1000) * (p.height / 1000);
        addOrUpdate('Glass', 'Solid uPVC Sandwich Infill Panel (PVCS)', 'Double-sided solid PVC insulated plate', 'sq.m', areaSqM, 1100);
      } else {
        const areaSqM = (p.width / 1000) * (p.height / 1000);
        totalGlassAreaSqM += areaSqM;
        const rate = (pricing?.glassRatePerSqMeter && pricing.glassRatePerSqMeter[p.glassType]) || 780;
        addOrUpdate('Glass', `${(p.glassType || 'clear_6mm').replace(/_/g, ' ').toUpperCase()} Glass`, 'Glazing panel with silicone & spacer', 'sq.m', areaSqM, rate);
      }
    });
  });

  // ==========================================
  // DYNAMIC HARDWARE & ACCESSORIES RULES ENGINE
  // ==========================================
  let totalDrainageCaps = 0;
  let totalMullionConnectors = 0;
  let totalGasketMeters = 0;
  let totalWoolPileMeters = 0;
  let totalInterlockCaps = 0;

  (frames || []).forEach((f) => {
    // 2 Units Drainage Caps per bottom outer frame
    if (f.drainageCaps !== false) {
      totalDrainageCaps += Math.max(2, Math.round(f.width / 600));
    }

    // 2 Units Mullion Metal Connectors (UPVC-HW-MC) per mullion/transom joint
    totalMullionConnectors += (f.mullions || []).length * 2;

    (f.pockets || []).forEach((p) => {
      const isCasement =
        p.sashType?.startsWith('casement') ||
        p.sashType === 'top_hung' ||
        p.sashType === 'bottom_hung' ||
        p.sashType === 'tilt_turn';
      const isFrench = p.sashType === 'french_open';
      const isSlider = p.sashType?.startsWith('slider') || p.sashType?.startsWith('mesh_slider');
      const isDoor = p.height >= 1800 || f.height >= 1800;

      // 1. CASEMENT HARDWARE
      if (isCasement || isFrench) {
        const sashQty = isFrench ? 2 : 1;
        const sashHeight = p.height + 22;
        const sashWidth = isFrench ? (p.width / 2 + 14) : (p.width + 22);
        const resolvedCasementH = resolveHardwareHandle(p, { isDoor, isSlider: false, defaultColor: f.color });

        if (isDoor) {
          // --- CASEMENT DOOR HARDWARE SPECIFICATIONS ---
          const doorHw = getCasementDoorHardwareConfiguration(p.height, resolvedCasementH.code || resolvedCasementH.hType);

          // 3D Hinges (4 pcs per sash) & Screws (32 pcs per sash)
          addOrUpdate('Hardware', `${doorHw.hingesName} (${doorHw.hingesCode})`, '3D Heavy Duty Adjustable Door Hinge', 'pcs', doorHw.hingesQty * sashQty, doorHw.hingesRate);
          addOrUpdate('Hardware', `${doorHw.hingesScrewName} (${doorHw.hingesScrewCode})`, '3D Hinge Fixing Screws (8 per hinge)', 'pcs', doorHw.hingesScrewQty * sashQty, doorHw.hingesScrewRate);

          // Glass Packers (8 pcs per sash) & Inertia Block (1 pc per sash)
          addOrUpdate('Hardware', 'Glass Packer 2mm (UPVC-HW-GP2MM)', '2mm Glass Packer for Door Shutter', 'pcs', doorHw.glassPackerQty * sashQty, doorHw.glassPackerRate);
          addOrUpdate('Hardware', 'Inertia Block (UPVC-HW-IB)', 'Door Sash Inertia Block', 'pcs', doorHw.inertiaBlockQty * sashQty, doorHw.inertiaBlockRate);
          addOrUpdate('Hardware', 'Inertia Block Screw (UPVC-HW-IBSC)', 'Inertia Block Fixing Screw', 'pcs', doorHw.inertiaBlockScrewQty * sashQty, doorHw.inertiaBlockScrewRate);

          // Handle / Lock Set
          addOrUpdate(
            'Hardware',
            `${doorHw.handleName} (${doorHw.handleCode})`,
            `${doorHw.handleName} (${resolvedCasementH.hColor})`,
            doorHw.handleUnit === 'SET' ? 'sets' : 'pcs',
            sashQty,
            doorHw.handleRate
          );

          // Espag Transmission Rod (if applicable for the handle)
          if (doorHw.hasEspag && doorHw.espagName && doorHw.espagCode) {
            addOrUpdate('Hardware', `${doorHw.espagName} (${doorHw.espagCode})`, `${doorHw.espagLength}mm Multi-point Door Gear Rod`, 'pcs', sashQty, doorHw.espagRate || 385);
            addOrUpdate('Hardware', `${doorHw.strikerName} (${doorHw.strikerCode})`, 'Casement espag keeper plate', 'pcs', doorHw.strikerQty * sashQty, doorHw.strikerRate);
            addOrUpdate('Hardware', 'CMT Espag Striker Screw (UPVC-HW-CMTESS)', 'Striker fixing screw (2 per striker)', 'pcs', doorHw.strikerScrewQty * sashQty, doorHw.strikerScrewRate);
            addOrUpdate('Hardware', 'Espag Bar Screw (UPVC-HW-EBS)', 'Espag transmission bar screw', 'pcs', doorHw.espagBarScrewQty * sashQty, doorHw.espagBarScrewRate);
            addOrUpdate('Hardware', 'Espag Handle Screw (UPVC-HW-EHS)', 'Door handle fixing screw', 'pcs', doorHw.espagHandleScrewQty * sashQty, doorHw.espagHandleScrewRate);
          }

          // Keyed Cylinder (if applicable)
          if (doorHw.hasCylinder && doorHw.cylinderName && doorHw.cylinderCode) {
            addOrUpdate('Hardware', `${doorHw.cylinderName} (${doorHw.cylinderCode})`, 'Computer Keyed Brass Cylinder', 'pcs', sashQty, doorHw.cylinderRate || 350);
          }

          // Door Gaskets: Shutter Beating, Glazing Inner & Outer
          const gasketPerSash = ((2 * (sashWidth + sashHeight)) / 1000) * 2;
          totalGasketMeters += gasketPerSash * sashQty;
        } else {
          // --- WINDOW CASEMENT HARDWARE ---
          // A. Friction Stays (1 Pair per opening leaf)
          if (sashHeight <= 900) {
            addOrUpdate('Hardware', '10" SS Friction Stay (UPVC-HW-FS10)', '10 Inch Stainless Steel Stay (1 Pair/Sash)', 'sets', sashQty, 380);
          } else if (sashHeight <= 1200) {
            addOrUpdate('Hardware', '12" SS Friction Stay (UPVC-HW-FS12)', '12 Inch Stainless Steel Stay (1 Pair/Sash)', 'sets', sashQty, 450);
          } else if (sashHeight <= 1500) {
            addOrUpdate('Hardware', '16" Heavy Duty Stay (UPVC-HW-FS16)', '16 Inch Heavy Duty Stay (1 Pair/Sash)', 'sets', sashQty, 580);
          } else {
            addOrUpdate('Hardware', '24" Heavy Duty Stay (UPVC-HW-FS24)', '24 Inch Heavy Sash Stay', 'sets', sashQty, 950);
          }

          // B. Espag Transmission Locks or Cockspur
          const isCockspur = resolvedCasementH.hType.includes('cockspur') || resolvedCasementH.code.includes('UPVC-HW-CH');

          if (!isCockspur) {
            const esp = getCasementEspagSelection(sashHeight);
            const espInv = getInventoryItemPrice(esp.code, {
              name: esp.name,
              category: 'Hardware',
              fallbackRate: esp.defaultRate,
              inventoryList: activeInventory,
              targetUnit: 'Pieces'
            });
            addOrUpdate('Hardware', esp.name, `${esp.length}mm Multi-point Gear Rod (20mm BS)`, 'pcs', sashQty, espInv.rate);
            addOrUpdate('Hardware', 'Casement Espag Striker (UPVC-HW-CES)', 'Casement espag keeper plate', 'pcs', esp.strikers * sashQty, 35);
          } else {
            addOrUpdate('Hardware', 'Cockspur Wedge (UPVC-HW-CHW)', 'Nylon strike wedge for cockspur', 'pcs', sashQty, 25);
          }

          // C. Handles
          const casementUnit = resolvedCasementH.unit === 'SET' ? 'sets' : 'pcs';
          addOrUpdate(
            'Hardware',
            `${resolvedCasementH.description} (${resolvedCasementH.code})`,
            `${resolvedCasementH.description} (${resolvedCasementH.hColor})`,
            casementUnit,
            sashQty,
            resolvedCasementH.price
          );

          // D. EPDM Rubber Star Gasket: [2 * (W + H) / 1000] * 2 meters
          const gasketPerSash = ((2 * (sashWidth + sashHeight)) / 1000) * 2;
          totalGasketMeters += gasketPerSash * sashQty;
        }

        // French Casement Central Meeting Stile Hardware
        if (isFrench) {
          addOrUpdate('Hardware', 'False Mullion End Cap (UPVC-HW-FMEC)', 'End caps for Casement French center false mullion (Pair)', 'sets', 1, 120);
          addOrUpdate('Hardware', 'French Slave Flush Bolt Set (UPVC-HW-FBOLT)', 'Top & Bottom Shootbolts for French Casement Slave Sash', 'sets', 1, 350);
        }
      }

      // 2. SLIDING HARDWARE
      if (isSlider) {
        const isMesh = p.sashType?.startsWith('mesh_slider') || p.hasMesh;
        const isLeft = p.sashType === 'slider_arrow_left' || p.sashType === 'slider_2s_xo' || p.sashType === 'mesh_slider_left';

        // A. Sliding Rollers (2 units per sliding sash)
        if (isMesh) {
          addOrUpdate('Hardware', 'Single Wheel without Groove (UPVC-HW-SW)', 'Sliding fly mesh sash roller (2 pcs)', 'pcs', 2, 20);
        } else if (isDoor) {
          addOrUpdate('Hardware', 'Double Wheel Adjustable Heavy Roller (UPVC-HW-DWAG)', 'Heavy duty bearing brass roller >50kg (2 pcs)', 'sets', 1, 480);
        } else {
          addOrUpdate('Hardware', 'Single Wheel with Groove (UPVC-HW-SWG)', 'Sliding glass sash grooved guide rail roller (2 pcs)', 'pcs', 2, 30);
        }

        // B. Sliding Locks & Latches (1 unit per sash)
        const resolvedSldH = resolveHardwareHandle(p, { isDoor, isSlider: true, isMesh, defaultColor: f.color });
        const sldUnit = resolvedSldH.unit === 'SET' ? 'sets' : 'pcs';

        if (isMesh) {
          addOrUpdate(
            'Hardware',
            `${resolvedSldH.description} (${resolvedSldH.code})`,
            `${resolvedSldH.description} for fly mesh sash`,
            sldUnit,
            1,
            resolvedSldH.price
          );
        } else if (resolvedSldH.hType === 'touch_lock') {
          if (isLeft) {
            addOrUpdate('Hardware', 'Sliding Touch Lock Left (UPVC-HW-STLL)', 'Automatic spring latch (Left hand)', 'pcs', 1, 80);
          } else {
            addOrUpdate('Hardware', 'Sliding Touch Lock Right (UPVC-HW-STLR)', 'Automatic spring latch (Right hand)', 'pcs', 1, 80);
          }
          addOrUpdate('Hardware', 'Sliding Touch Lock Striker (UPVC-HW-SLDTLS)', 'Touch lock striker plate', 'pcs', 1, 10);
        } else {
          addOrUpdate(
            'Hardware',
            `${resolvedSldH.description} (${resolvedSldH.code})`,
            `${resolvedSldH.description} (${resolvedSldH.hColor})`,
            sldUnit,
            1,
            resolvedSldH.price
          );
          if (
            resolvedSldH.code === 'UPVC-HW-SDH' ||
            resolvedSldH.code.includes('DSDH') ||
            resolvedSldH.code === 'UPVC-HW-LCKSET'
          ) {
            addOrUpdate('Hardware', 'Sliding Door Espag with Cylinder 1800 (UPVC-HW-SDEWC1800)', 'Concealed sliding gear rod with master key cylinder', 'pcs', 1, 950);
            addOrUpdate('Hardware', 'Sliding Espag Striker (UPVC-HW-SES)', 'Sliding multi-point keeper', 'pcs', 4, 35);
          } else {
            const espDesc = p.height >= 1800 ? 'Sliding Door Espag with Cylinder 1800 (UPVC-HW-SDEWC1800)' : 'Sliding Espag Gear Rod (UPVC-HW-SWE1400)';
            addOrUpdate('Hardware', espDesc, 'Multi-point sliding gear transmission rod', 'pcs', 1, p.height >= 1800 ? 950 : 380);
            addOrUpdate('Hardware', 'Sliding Espag Striker (UPVC-HW-SES)', 'Sliding espag keeper plate', 'pcs', 4, 35);
          }
        }

        // C. Weather Stripping & Wool Pile
        const sashW = p.width + 22;
        const sashH = p.height + 22;
        const sashWoolPile = ((2 * (sashW + sashH) * 2) / 1000);
        totalWoolPileMeters += sashWoolPile;

        // Interlock Wool Pile: Sash Height * 2
        totalWoolPileMeters += (sashH * 2) / 1000;
        totalInterlockCaps += 2;
      }

      // 3. SPECIAL ACCESSORIES
      if (p.hasMesh || p.sashType?.startsWith('mesh_slider') || p.sashType === 'mesh_sash') {
        const meshAreaSqM = (p.width / 1000) * (p.height / 1000);
        addOrUpdate('Accessories', 'SS 304 Mosquito Fly Mesh Screen (MS-SS304)', 'Stainless Steel 304 insect barrier screen', 'sq.m', meshAreaSqM, 480);
      }

      if (p.hasGrill) {
        const grillAreaSqM = (p.width / 1000) * (p.height / 1000);
        addOrUpdate('Accessories', 'Internal Security Grill (SEC-GRILL)', 'Mild steel / SS powder coated decorative safety grill', 'sq.m', grillAreaSqM, 850);
      }

      // 4. GEORGIAN / DORGEN BAR CALCULATION (डोरगन बार व क्रॉस क्लिप्स)
      const gPattern = p.georgianBar?.pattern || p.gridPattern;
      if (gPattern && gPattern !== 'none') {
        const barCfg = p.georgianBar;
        const colorName = barCfg?.color === 'white' ? 'White' : barCfg?.color === 'black' ? 'Black' : barCfg?.color === 'silver' ? 'Silver' : 'Gold Brass';
        const widthMm = barCfg?.barWidth || 18;
        
        let vertBars = 0;
        let horizBars = 0;
        if (gPattern === 'georgian_2x2') { vertBars = 1; horizBars = 1; }
        else if (gPattern === 'georgian_2x3') { vertBars = 1; horizBars = 2; }
        else if (gPattern === 'georgian_3x2') { vertBars = 2; horizBars = 1; }
        else if (gPattern === 'georgian_3x3') { vertBars = 2; horizBars = 2; }
        else if (gPattern === 'georgian_3x4') { vertBars = 2; horizBars = 3; }
        else if (gPattern === 'georgian_4x4') { vertBars = 3; horizBars = 3; }
        else if (gPattern === 'georgian_prairie' || gPattern === 'georgian_colonial') { vertBars = 2; horizBars = 2; }
        else if (gPattern === 'georgian_diamond') { vertBars = 2; horizBars = 2; }
        else if (gPattern === 'custom') {
          vertBars = Math.max(0, (barCfg?.cols || 2) - 1);
          horizBars = Math.max(0, (barCfg?.rows || 2) - 1);
        }

        const barMeters = ((vertBars * p.height + horizBars * p.width) / 1000) * 1.1; // +10% cutting wastage
        const crossConnectors = Math.max(1, vertBars * horizBars);

        addOrUpdate(
          'Accessories',
          `Georgian Bar ${widthMm}mm (${colorName})`,
          `Decorative internal glass grid bar (${colorName} finish) - डोरगन बार`,
          'meters',
          barMeters,
          barCfg?.color === 'gold' ? 180 : 140
        );

        if (crossConnectors > 0) {
          addOrUpdate(
            'Hardware',
            `Georgian Bar Cruciform Connector Clip`,
            `4-Way internal grid cross intersection joint clips - क्रॉस क्लिप`,
            'pcs',
            crossConnectors,
            25
          );
        }
      }
    });

    // Add per-sliding-frame accessories if frame has sliding pockets
    const hasSlider = f.pockets.some((p) => p.sashType?.startsWith('slider') || p.sashType?.startsWith('mesh_slider'));
    if (hasSlider) {
      addOrUpdate('Hardware', 'Bump Stopper (UPVC-HW-BS)', 'Sliding sash impact & buffer stopper (2 pcs)', 'pcs', 2, 10);
      addOrUpdate('Hardware', 'Sealing Bridge (UPVC-HW-SB)', 'Sliding track bottom/corner sealing bridge (2 pcs)', 'pcs', 2, 4);
      addOrUpdate('Hardware', 'Glass Packer 2mm (UPVC-HW-GP2MM)', 'Glazing support leveling packer 2mm (16 pcs)', 'pcs', 16, 0.60);
      addOrUpdate('Hardware', 'Pressure Block (UPVC-HW-PB)', 'Sliding interlock top/bottom acoustic pressure block (4 pcs)', 'pcs', 4, 1.15);
      addOrUpdate('Hardware', 'Bump Stopper Screw (UPVC-HW-BSSCREW)', 'Fastener screw for bump stopper (2 pcs)', 'pcs', 2, 2.20);
      addOrUpdate('Hardware', 'Pressure Block Screw (UPVC-HW-PBSC)', 'Fastener screw for pressure block (4 pcs)', 'pcs', 4, 1.15);
      addOrUpdate('Hardware', 'Sealing Bridge Screw (UPVC-HW-SBSC)', 'Fastener screw for sealing bridge (4 pcs)', 'pcs', 4, 1.15);

      const isMeetingSlider = f.pockets.length === 4 || f.pockets.length === 6 || f.pockets.some((p) => (p.sashType || '').includes('meeting') || (p.sashType || '').includes('4s') || (p.sashType || '').includes('6s'));
      if (isMeetingSlider) {
        addOrUpdate('Hardware', 'Crescent Rotary Cam Lock (UPVC-HW-CRL)', 'Central meeting stile interlock lock / बीच का लॉक (1 pcs)', 'pcs', 1, 150);
      }
    }
  });

  // Add aggregated seals and accessories
  if (totalGasketMeters > 0) {
    const gasketInv = getInventoryItemPrice('UPVC-HW-STARG', {
      name: 'EPDM Rubber Star Gasket',
      category: 'Hardware',
      fallbackRate: 0,
      targetUnit: 'Mtr',
    });
    addOrUpdate('Accessories', 'EPDM Rubber Star Gasket (Frame + Sash)', 'UV resistant weather & acoustic seal', 'meters', Math.round(totalGasketMeters), gasketInv.rate);
  }
  if (totalWoolPileMeters > 0) {
    addOrUpdate('Accessories', 'Sliding Sash & Interlock Wool Pile (UPVC-HW-SSWP)', 'High density siliconized weather strip', 'meters', Math.round(totalWoolPileMeters), 25);
  }
  if (totalDrainageCaps > 0) {
    addOrUpdate('Accessories', 'Water Weep Hole Drainage Caps (UPVC-HW-DC)', 'Bottom frame water outlet anti-insect caps', 'pcs', totalDrainageCaps, 15);
  }
  if (totalMullionConnectors > 0) {
    addOrUpdate('Accessories', 'Mullion Metal Connectors (UPVC-HW-MC)', 'Internal zinc mechanical T-Cleat connectors', 'pcs', totalMullionConnectors, 45);
  }
  if (totalInterlockCaps > 0) {
    addOrUpdate('Accessories', 'Sliding Interlock End Caps', 'Molded nylon top/bottom interlock covers', 'pcs', totalInterlockCaps, 20);
  }

  // Silicone Sealant (Neutral Weatherproof Cartridge / Can)
  // Formula provided by manufacturing standards: (Height mm + Width mm) * 0.0005263
  let totalSiliconeCans = 0;
  (frames || []).forEach((f) => {
    totalSiliconeCans += (f.height + f.width) * 0.0005263;
  });
  if (totalSiliconeCans > 0) {
    const roundedCans = Math.round(totalSiliconeCans * 1000) / 1000;
    const siliconeInv = getInventoryItemPrice('UPVC-HW-SI', {
      name: 'Neutral Silicone Sealant',
      category: 'Hardware',
      fallbackRate: 250,
      inventoryList: activeInventory,
      targetUnit: 'CAN'
    });
    addOrUpdate(
      'Accessories',
      'Neutral Weatherproof Silicone Sealant (UPVC-HW-SI)',
      `Perimeter installation & joint sealant [(H+W)×0.0005263 = ${roundedCans} CAN]`,
      'pcs',
      roundedCans,
      siliconeInv.rate
    );
  }

  // Total Assembly Area & Fabrication Labor
  const bounds = calculateAssemblyBounds(frames || []);
  const totalAssemblyAreaSqM = (bounds.totalWidth / 1000) * (bounds.totalHeight / 1000);
  const totalAssemblyAreaSqFt = totalAssemblyAreaSqM * 10.7639;

  // Fabrication Labor
  addOrUpdate('Accessories', 'Fabrication, Welding & Quality Testing Labor', 'CNC double miter cutting, 4-point welding & glazing', 'sq.m', totalAssemblyAreaSqM, pricing?.laborCostPerSqM || 400);

  const items = Array.from(bomMap.values());
  const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const taxAmount = Math.round((subtotal * ((pricing?.taxPercent ?? 18))) / 100);
  const grandTotal = subtotal + taxAmount;

  return {
    items,
    subtotal,
    taxAmount,
    grandTotal,
    totalAreaSqM: Math.round(totalAssemblyAreaSqM * 100) / 100,
    totalAreaSqFt: Math.round(totalAssemblyAreaSqFt * 100) / 100,
  };
}

/**
 * Generates official, industrial-grade multi-page Production Reports for each window/door frame
 * strictly matching the 55-page Shri Balaji Traders / DURON 60mm Casement standard.
 */
export function generateProductionReports(
  frames: UPVCFrame[],
  couplings?: CouplingConnection[],
  projectInfo?: {
    name?: string;
    referenceNo?: string;
    date?: string;
    clientName?: string;
    totalCustomerUnits?: number;
    totalProjectUnits?: number;
    pricingTemplate?: any[];
  },
  inventoryList?: InventoryMasterItem[]
): import('../types/upvc').SingleFrameProductionReport[] {
  const activeInventory = inventoryList && inventoryList.length > 0 ? inventoryList : getActiveInventoryMaster();
  const fabricationRules = getFabricationRules();
  return (frames || []).map((frame, idx) => {
    const fWidth = Math.round(frame.width);
    const fHeight = Math.round(frame.height);
    const fName = frame.name || `W${idx + 1}`;
    const isDoor = (fHeight >= 1800 && fWidth <= 1200) || frame.series === 'door_premium' || frame.name?.toLowerCase().includes('door') || frame.name?.toLowerCase().startsWith('d-') || frame.name?.toLowerCase().startsWith('d1') || (frame.pockets || []).some((p) => p.applicationType === 'door');
    
    // Outer Frame cut dimensions (Width + 6mm, Height + 6mm, 45° 135°)
    const outerCutW = fWidth + 6;
    const outerCutH = fHeight + 6;

    // Check sash types in pockets
    const pockets = frame.pockets || [];
    const hasCasementSash = pockets.some(
      (p) =>
        p.sashType?.startsWith('casement') ||
        p.sashType === 'top_hung' ||
        p.sashType === 'bottom_hung' ||
        p.sashType === 'tilt_turn' ||
        p.sashType === 'open_vent' ||
        p.sashType === 'french_open' ||
        (p.sashProfileCode && p.sashProfileCode.startsWith('CWH') && p.sashProfileCode !== 'CWH 60-01' && p.sashProfileCode !== 'CWH 60-02' && p.sashProfileCode !== 'CWH 60-05' && p.sashProfileCode !== 'CWH 60-08')
    );
    const isFrench = pockets.some((p) => p.sashType === 'french_open');
    const isExplicitCasement =
      frame.series?.startsWith('casement') ||
      frame.name?.toLowerCase().includes('casement') ||
      frame.name?.toLowerCase().includes('cmt') ||
      frame.name?.toLowerCase().startsWith('w-') ||
      frame.name?.toLowerCase().startsWith('w1');
    const isExplicitSlider =
      frame.series?.startsWith('sliding') ||
      frame.name?.toLowerCase().includes('sliding') ||
      frame.name?.toLowerCase().includes('slider') ||
      frame.name?.toLowerCase().startsWith('sl');
    const hasSliderSash = pockets.some(
      (p) =>
        p.sashType?.startsWith('slider') ||
        p.sashType?.startsWith('mesh_slider') ||
        p.sashType === 'mesh_sash' ||
        (p.sashProfileCode && p.sashProfileCode.startsWith('SWH') && p.sashProfileCode !== 'SWH 60-01' && p.sashProfileCode !== 'SWH 60-02' && p.sashProfileCode !== 'SWH 60-12')
    );

    const isCasement = hasCasementSash || isFrench || (isExplicitCasement && !hasSliderSash) || (!isExplicitSlider && !hasSliderSash);
    const isSlider = !isCasement && (isExplicitSlider || hasSliderSash);
    const is3Track = isSlider && (frame.series === 'sliding_3track' || pockets.some((p) => p.sashType?.startsWith('mesh_slider')) || pockets.length >= 3);
    const isFixedOnly = !isCasement && !isSlider && pockets.every((p) => p.sashType === 'fixed');

    const mainPocket: Partial<FramePocket> = {
      ...(pockets[0] || {}),
      width: pockets[0]?.width || fWidth - 120,
      height: pockets[0]?.height || fHeight - 120,
      sashType: (isCasement && (!pockets[0]?.sashType || pockets[0]?.sashType?.startsWith('slider')))
        ? (isDoor ? 'casement_left' : 'casement_right')
        : (pockets[0]?.sashType || (isSlider ? 'slider_arrow_right' : 'casement_right')),
      glassType: pockets[0]?.glassType || 'clear_5mm',
      handleType: pockets[0]?.handleType || (isDoor ? 'door_double_side' : (isSlider ? 'touch_lock' : 'cockspur_right')),
      handleColor: pockets[0]?.handleColor || 'white',
      hasMesh: pockets[0]?.hasMesh || false,
    };

    const sldPocket = pockets.find((p) => p.sashProfileCode) || pockets[0];
    const sldSizes = calculateSlidingCuttingSizes(frame, sldPocket);
    const sldSashCode = sldSizes.sashProf.code;
    const sldSashDesc = sldSizes.sashProf.name;

    const casementPocketsCount = pockets.filter(
      (p) =>
        p.sashType?.startsWith('casement') ||
        p.sashType === 'top_hung' ||
        p.sashType === 'bottom_hung' ||
        p.sashType === 'tilt_turn'
    ).length;
    const frenchPocketsCount = pockets.filter((p) => p.sashType === 'french_open').length;
    const fixedPocketsCount = pockets.filter((p) => p.sashType === 'fixed' || !p.sashType).length;

    const is4Sash = isSlider && (sldSizes.panels === 4 || (frame.pockets && frame.pockets.length === 4) || (frame.name && (frame.name.toLowerCase().includes('4-sash') || frame.name.toLowerCase().includes('4 track') || frame.name.toLowerCase().includes('oxxo'))));

    let typologyType = isCasement
      ? (isDoor ? 'CASEMENT DOOR SINGLE SASH' : 'CASEMENT WINDOW 1 SASH')
      : 'CASEMENT WINDOW 1 SASH';
    if (isFrench || frenchPocketsCount > 0) {
      typologyType = isDoor ? 'CASEMENT FRENCH DOOR 2 SASH' : 'CASEMENT WINDOW 2 SASH (FRENCH OPEN)';
    } else if (isSlider) {
      typologyType = is4Sash
        ? `${fName} (2 TRACK 4 SASH SLIDING)`
        : is3Track
        ? `${fName} (3 TRACK SLIDING WITH FLYMESH)`
        : `${fName} (2 TRACK SLIDING)`;
    } else if (isDoor) {
      typologyType = 'CASEMENT DOOR SINGLE SASH';
    } else if (pockets.length > 1) {
      if (casementPocketsCount > 0 && fixedPocketsCount > 0) {
        typologyType = `${pockets.length}-BAY WINDOW (${fixedPocketsCount} FIXED + ${casementPocketsCount} SASH)`;
      } else if (casementPocketsCount > 0) {
        typologyType = `${pockets.length}-BAY CASEMENT WINDOW (${casementPocketsCount} SASH)`;
      } else {
        typologyType = `${pockets.length}-BAY FIXED GLASS WINDOW`;
      }
    } else if (isFixedOnly) {
      typologyType = 'FIXED GLASS WINDOW';
    }

    // Outer & Sliding derived dimensions
    const steelOuterW = sldSizes.outerSteelW;
    const steelOuterH = sldSizes.outerSteelH;

    const sldSashW = sldSizes.sashW;
    const sldSashH = sldSizes.sashH;
    const sldBeadW = sldSizes.beadW;
    const sldBeadH = sldSizes.beadH;
    const sldInterlockH = sldSizes.interlockH;
    const sldGuideRailW = Math.max(50, fWidth - 104);
    const sldGlassW = sldSizes.glassW;
    const sldGlassH = sldSizes.glassH;

    const areaSqM = Math.round(((fWidth * fHeight) / 1000000) * 100) / 100;
    const areaSqFt = Math.round(areaSqM * 10.7639 * 100) / 100;

    // Helper to get Casement Sash Code & Description for any pocket
    const getCasementSashInfo = (pkt: Partial<FramePocket>, defaultDoor: boolean) => {
      const isPocketDoor =
        pkt.applicationType === 'door' || (pkt.applicationType !== 'window' && defaultDoor);
      const chosenCode =
        pkt.sashProfileCode ||
        (pkt.sashProfileTop?.includes('60-04')
          ? 'CWH 60-04'
          : pkt.sashProfileTop?.includes('60-07')
          ? 'CWH 60-07'
          : undefined);
      const code = chosenCode || (isPocketDoor ? 'CWH 60-06' : 'CWH 60-03');
      let desc = 'CMT OUTWARD SASH 60MM X 78MM';
      if (code === 'CWH 60-04') desc = 'CMT INWARD SASH 60MM X 71MM';
      else if (code === 'CWH 60-07') desc = 'CMT INWARD SASH 60MM X 104MM';
      else if (code === 'CWH 60-06') desc = 'CMT OUTWARD SASH 60MM X 104MM';
      else if (code === 'CWH 60-12') desc = 'SLIM CASEMENT SASH 58MM X 60MM';
      else if (code === 'CWH 65-06') desc = 'CASEMENT COMMERCIAL ENTRANCE SASH 115MM';
      else if (code === 'CWH 60-03') desc = 'CMT OUTWARD SASH 60MM X 78MM';
      return { isPocketDoor, code, desc };
    };

    // Helper to get Pocket Handle Description & Code
    const getPocketHandleInfo = (pkt: Partial<FramePocket>, isPocketDoor: boolean) => {
      const isMeshSash = isSlider && (pkt.sashType === 'slider_3s_mesh' || (pkt.sashLabel || '').toLowerCase().includes('mesh'));
      const hInfo = resolveHardwareHandle(pkt, {
        isDoor: isPocketDoor,
        isSlider,
        isMesh: isMeshSash,
        defaultColor: frame.color,
      });
      return {
        name: hInfo.name,
        code: hInfo.code,
        hType: hInfo.hType,
        hColor: hInfo.hColor,
      };
    };

    // Resolve dynamic series title based on properties
    let resolvedSeriesName = 'DURON 60MM CASEMENT SERIES';
    if (isSlider) {
      if (frame.seriesCode === 'SWH-50') {
        resolvedSeriesName = 'DURON 50MM SLIDING SERIES';
      } else if (is3Track || frame.series === 'sliding_3track') {
        resolvedSeriesName = 'DURON 60MM 3-TRACK SLIDING SERIES WITH MESH';
      } else {
        resolvedSeriesName = 'DURON 60MM 2-TRACK SLIDING SERIES';
      }
    } else {
      if (frame.seriesCode === 'CWH-50') {
        resolvedSeriesName = 'DURON 50MM SLIM CASEMENT SERIES (50mm Depth)';
      } else if (frame.seriesCode === 'CWH-65') {
        resolvedSeriesName = 'DURON 65MM HEAVY CASEMENT SERIES (65mm Depth)';
      } else if (frame.seriesCode === 'DURON-70' || frame.series === 'casement_70') {
        resolvedSeriesName = 'DURON 70MM THERMAL BREAK CASEMENT SERIES';
      } else if (isDoor || frame.series === 'door_premium') {
        resolvedSeriesName = 'DURON PREMIUM ENTRANCE DOOR SERIES (60mm Depth)';
      } else {
        resolvedSeriesName = 'DURON 60MM CASEMENT SERIES (60mm Depth)';
      }
    }

    // Resolve dynamic finish based on frame color
    const normalizedColorId = normalizeFrameColorId(frame.color, 'white');
    let profileFinish = 'WHITE (VIRGIN UPVC - UV STABILIZED)';
    if (normalizedColorId && normalizedColorId.toLowerCase() !== 'white') {
      profileFinish = `LAMINATION - ${normalizedColorId.replace(/_/g, ' ').toUpperCase()}`;
    }

    // Resolve dynamic glass description based on all pockets
    const pocketGlassesList = (pockets.length > 0 ? pockets : [mainPocket]).map((pkt, pIdx) => {
      const bayName = pkt.sashLabel || `Bay ${pIdx + 1}`;
      const gName = getGlassDisplayName(pkt.glassType, pkt.glassName || frame.glassName).toUpperCase();
      return { bay: bayName, name: gName };
    });
    const uniqueGlasses = Array.from(new Set(pocketGlassesList.map((g) => g.name)));
    let glassDescription = '';
    if (uniqueGlasses.length === 1) {
      glassDescription = uniqueGlasses[0];
    } else if (uniqueGlasses.length > 1) {
      glassDescription = pocketGlassesList.map((g) => `${g.bay}: ${g.name}`).join(' | ');
    } else {
      glassDescription = getGlassDisplayName(frame.glassType, frame.glassName).toUpperCase();
    }

    // Resolve mesh description
    const meshPocket = pockets.find((p) => p.sashType?.startsWith('mesh') || p.hasMesh);
    const glassPockets = pockets.filter((p) => !p.sashType?.startsWith('mesh') && !p.hasMesh);
    const primarySashPocket = glassPockets[0] || pockets[0] || mainPocket;

    const meshPockets = pockets.filter((p) => p.hasMesh || p.sashType?.startsWith('mesh'));
    let meshDescription = 'NO MESH';
    if (is3Track) {
      meshDescription = 'SS FLYMESH (TRACK 3)';
    } else if (meshPockets.length > 0) {
      meshDescription = meshPockets.map((p, i) => `${p.sashLabel || `Bay ${i + 1}`}: SS 304 INSECT MESH`).join(' | ');
    }

    // Resolve dynamic handle list for technical specs header:
    const handleEntries: string[] = [];
    if (isSlider) {
      const overlaidMeshPockets = is4Sash ? pockets.filter((p) => p.hasMesh && !p.sashType?.startsWith('mesh')) : [];
      if (is4Sash && overlaidMeshPockets.length > 0) {
        // 6 Panel 3 Track (4 Glass Sashes + Overlaid Fly Mesh Sashes MS1, MS2)
        pockets.forEach((pkt, pIdx) => {
          const isPktDoor = pkt.applicationType === 'door' || isDoor;
          const hInfo = resolveHardwareHandle(pkt, { isDoor: isPktDoor, isSlider: true, isMesh: false, defaultColor: frame.color });
          const posTag = pkt.sashLabel || pkt.customLabel || `S${pIdx + 1}`;
          const ghhStr = pkt.handleHeight ? ` [GHH: ${pkt.handleHeight}mm]` : '';
          handleEntries.push(`${posTag}-${hInfo.name || hInfo.description}${ghhStr}`);
        });
        overlaidMeshPockets.forEach((pkt, mIdx) => {
          const isPktDoor = pkt.applicationType === 'door' || isDoor;
          const hInfo = resolveHardwareHandle(pkt, { isDoor: isPktDoor, isSlider: true, isMesh: true, defaultColor: frame.color });
          handleEntries.push(`MS${mIdx + 1}-${hInfo.name || hInfo.description}`);
        });
      } else {
        const panelCount = is4Sash ? 4 : (is3Track ? 3 : 2);
        for (let pIdx = 0; pIdx < panelCount; pIdx++) {
          const basePkt = pockets[pIdx] || pockets[0] || (mainPocket as FramePocket);
          let pkt: FramePocket;
          if (is3Track && pIdx === 2) {
            pkt = (meshPocket as FramePocket) || { ...basePkt, sashType: 'mesh_sash' as SashType, hasMesh: true };
          } else {
            pkt = basePkt;
          }
          const isMesh = is3Track ? (pIdx === 2 || pkt.sashType?.startsWith('mesh') || pkt.hasMesh) : (pkt.sashType?.startsWith('mesh') || pkt.hasMesh);
          const isPktDoor = pkt.applicationType === 'door' || isDoor;
          const hInfo = resolveHardwareHandle(pkt, { isDoor: isPktDoor, isSlider: true, isMesh, defaultColor: frame.color });
          const posTag = pkt.sashLabel || (isMesh ? `MS${pIdx + 1}` : `S${pIdx + 1}`);
          const ghhStr = pkt.handleHeight ? ` [GHH: ${pkt.handleHeight}mm]` : '';
          handleEntries.push(`${posTag}-${hInfo.name || hInfo.description}${ghhStr}`);
        }
      }
    } else {
      pockets.forEach((pkt, pIdx) => {
        const isFrench = pkt.sashType === 'french_open';
        const isCasementSash =
          pkt.sashType?.startsWith('casement') ||
          pkt.sashType === 'top_hung' ||
          pkt.sashType === 'bottom_hung' ||
          pkt.sashType === 'tilt_turn' ||
          pkt.sashType === 'open_vent' ||
          (pkt.sashProfileCode && pkt.sashProfileCode.startsWith('CWH') && pkt.sashProfileCode !== 'CWH 60-01' && pkt.sashProfileCode !== 'CWH 60-02' && pkt.sashProfileCode !== 'CWH 60-05' && pkt.sashProfileCode !== 'CWH 60-08');

        if (isFrench) {
          const isPktDoor = pkt.applicationType === 'door' || isDoor;
          const hInfo = resolveHardwareHandle(pkt, { isDoor: isPktDoor, isSlider: false, defaultColor: frame.color });
          const ghhStr = pkt.handleHeight ? ` [GHH: ${pkt.handleHeight}mm]` : '';
          handleEntries.push(`S${pIdx + 1}A-${hInfo.name || hInfo.description} (Master Leaf)${ghhStr}`);
          handleEntries.push(`S${pIdx + 1}B-${hInfo.name || hInfo.description} (Slave Leaf)`);
        } else if (isCasementSash) {
          const isPktDoor = pkt.applicationType === 'door' || (pkt.applicationType !== 'window' && isDoor);
          const hInfo = resolveHardwareHandle(pkt, { isDoor: isPktDoor, isSlider: false, defaultColor: frame.color });
          const posTag = pkt.sashLabel || `S${pIdx + 1}`;
          const ghhStr = pkt.handleHeight ? ` [GHH: ${pkt.handleHeight}mm]` : '';
          handleEntries.push(`${posTag}-${hInfo.name || hInfo.description}${ghhStr}`);
        }
      });
    }

    let handleName = '';
    if (handleEntries.length > 0) {
      handleName = handleEntries.join('\n');
    } else if (isFixedOnly) {
      handleName = 'FIXED GLAZING (NO OPERABLE HARDWARE)';
    } else {
      handleName = 'NO OPERABLE HARDWARE';
    }

    // 1. PROFILES TABLE
    const profiles: import('../types/upvc').ProductionReportProfileItem[] = [];

    // 2. REINFORCEMENTS TABLE
    const reinforcements: import('../types/upvc').ProductionReportReinforcementItem[] = [];

    // 3. HARDWARE TABLE
    const hardwares: import('../types/upvc').ProductionReportHardwareItem[] = [];

    // 4. SCREWS TABLE
    const screws: import('../types/upvc').ProductionReportScrewItem[] = [];

    // 5. GASKETS TABLE
    const gaskets: import('../types/upvc').ProductionReportGasketItem[] = [];

    // 6. GLAZING TABLE
    const glazing: import('../types/upvc').ProductionReportGlazingItem[] = [];

    if (isSlider) {
      const isDoorSash = sldSizes.sashProf.code === 'SWH 60-06' || fHeight >= 1800 || (primarySashPocket && primarySashPocket.applicationType === 'door');

      // Outer frame profile:
      const cadFrameProf = resolveCADFrameProfile(frame);
      const outerFrameCode = is3Track
        ? (cadFrameProf.code.includes('02') ? cadFrameProf.code : 'SWH 60-02')
        : (cadFrameProf.code.includes('01') ? cadFrameProf.code : 'SWH 60-01');
      const outerFrameDesc = is3Track ? 'SLD 3 TRACK 60MM X 112MM' : 'SLD 2 TRACK 60MM X 52MM';

      profiles.push(
        { id: `p-${idx}-outer-w`, description: outerFrameDesc, itemCode: outerFrameCode, dimension: outerCutW, cutAngle: '45° 135°', quantity: 2, position: 'W' },
        { id: `p-${idx}-outer-h`, description: outerFrameDesc, itemCode: outerFrameCode, dimension: outerCutH, cutAngle: '45° 135°', quantity: 2, position: 'H' }
      );

      // Outer Frame Reinforcement (duron sliding outer steel)
      if (frame.reinforcement && frame.reinforcement !== 'none') {
        const steelThk = frame.reinforcement === 'steel_1.2mm' ? '1.2MM' : (frame.reinforcement === 'steel_2.0mm' ? '2.0MM' : '1.5MM');
        const steelOuterCode = is3Track ? `SRI 60-02-${steelThk}` : `SRI 60-01-${steelThk}`;
        const steelOuterDesc = is3Track ? `RI-16MM X 30MM X 16MM (${outerFrameCode})` : `RI-16MM X 30MM X 16MM (${outerFrameCode})`;
        const outerSteelQty = is3Track ? 4 : (is4Sash ? 4 : 2);
        reinforcements.push(
          { id: `r-${idx}-outer-w`, description: steelOuterDesc, itemCode: steelOuterCode, dimension: sldSizes.outerSteelW, cutAngle: '90° 90°', quantity: outerSteelQty, position: 'W' },
          { id: `r-${idx}-outer-h`, description: steelOuterDesc, itemCode: steelOuterCode, dimension: sldSizes.outerSteelH, cutAngle: '90° 90°', quantity: outerSteelQty, position: 'H' }
        );
      }

      // Aluminium Guide Rails
      const guideRailQty = is3Track ? 3 : (is4Sash ? 4 : 2);
      profiles.push({
        id: `p-${idx}-gr`,
        description: 'ALUMINIUM GUIDE RAIL',
        itemCode: 'DURON-GR',
        dimension: sldGuideRailW,
        cutAngle: '90° 90°',
        quantity: guideRailQty,
        position: 'W',
      });

      // Panels iteration: Process EACH sliding panel / pocket individually
      const overlaidMeshPockets = is4Sash ? pockets.filter((p) => p.hasMesh && !p.sashType?.startsWith('mesh')) : [];
      const slidingPanels: { pkt: FramePocket; pIdx: number; forceMesh?: boolean; forceTag?: string }[] = [];
      if (is4Sash && overlaidMeshPockets.length > 0) {
        // 6 Panel 3 Track: 4 Glass Sashes (S1-S4) + Overlaid Fly Mesh Sashes (MS1, MS2)
        pockets.forEach((pkt, pIdx) => {
          slidingPanels.push({ pkt, pIdx, forceMesh: false, forceTag: pkt.sashLabel || pkt.customLabel || `S${pIdx + 1}` });
        });
        overlaidMeshPockets.forEach((pkt, mIdx) => {
          slidingPanels.push({ pkt, pIdx: pockets.length + mIdx, forceMesh: true, forceTag: `MS${mIdx + 1}` });
        });
      } else {
        const basePanelCount = is4Sash ? 4 : (is3Track ? 3 : 2);
        for (let pIdx = 0; pIdx < basePanelCount; pIdx++) {
          const basePkt = pockets[pIdx] || pockets[0] || (mainPocket as FramePocket);
          let pkt: FramePocket;
          if (is3Track && pIdx === 2) {
            pkt = (meshPocket as FramePocket) || { ...basePkt, sashType: 'mesh_sash' as SashType, hasMesh: true };
          } else {
            pkt = basePkt;
          }
          slidingPanels.push({ pkt, pIdx });
        }
      }
      const panelCount = slidingPanels.length;

      slidingPanels.forEach(({ pkt, pIdx, forceMesh, forceTag }) => {
        const isMesh = forceMesh !== undefined
          ? forceMesh
          : (is3Track ? (pIdx === 2 || pkt.sashType?.startsWith('mesh') || pkt.hasMesh) : (pkt.sashType?.startsWith('mesh') || pkt.hasMesh));
        const isPktDoor = pkt.applicationType === 'door' || isDoorSash;
        const posTag = forceTag || pkt.sashLabel || (isMesh ? `MS${pIdx + 1}` : `S${pIdx + 1}`);

        // Sash profile & beading
        const pktSashProf = resolveCADSashProfile(pkt as FramePocket, frame);
        const sashCode = isMesh ? 'SWH 60-14' : pktSashProf.code;
        const sashDesc = isMesh ? 'MESH SASH 60MM X 70MM' : pktSashProf.name;
        const beadCode = isMesh ? 'SWH 60-15' : (pktSashProf.beadCode || 'SWH 60-12');
        const beadDesc = isMesh ? 'MESH BEADING 31.5MM' : (pktSashProf.beadName || 'SASH BEADING 25.2MM');
        const intCode = pktSashProf.interlockCode || 'SWH 60-08';
        const intDesc = pktSashProf.interlockName || `SLD IL CLIP (${intCode})`;

        profiles.push(
          { id: `p-${idx}-p${pIdx}-sw`, description: sashDesc, itemCode: sashCode, dimension: sldSashW, cutAngle: '45° 135°', quantity: 2, position: `${posTag}-W` },
          { id: `p-${idx}-p${pIdx}-sh`, description: sashDesc, itemCode: sashCode, dimension: sldSashH, cutAngle: '45° 135°', quantity: 2, position: `${posTag}-H` },
          { id: `p-${idx}-p${pIdx}-bw`, description: beadDesc, itemCode: beadCode, dimension: sldBeadW, cutAngle: '45° 135°', quantity: 2, position: `${posTag}-W` },
          { id: `p-${idx}-p${pIdx}-bh`, description: beadDesc, itemCode: beadCode, dimension: sldBeadH, cutAngle: '45° 135°', quantity: 2, position: `${posTag}-H` },
          { id: `p-${idx}-p${pIdx}-il`, description: intDesc, itemCode: intCode, dimension: sldInterlockH, cutAngle: '90° 90°', quantity: 1, position: `${posTag}-H` }
        );

        // Steel Reinforcement for this sash
        if (frame.reinforcement && frame.reinforcement !== 'none') {
          const steelThk = frame.reinforcement === 'steel_1.2mm' ? '1.2MM' : (frame.reinforcement === 'steel_2.0mm' ? '2.0MM' : '1.5MM');
          const sashSteelCode = isMesh ? `SRI 60-14-${steelThk}` : (pktSashProf.steelCode || (isPktDoor ? `SRI 60-06-${steelThk}` : `SRI 60-03-${steelThk}`));
          const sashSteelDesc = isMesh ? 'RI-TP2-MESH SASH' : `RI-TP2 (${sashCode})`;
          reinforcements.push(
            { id: `r-${idx}-p${pIdx}-sw`, description: sashSteelDesc, itemCode: sashSteelCode, dimension: sldSizes.sashSteelW, cutAngle: '90° 90°', quantity: 2, position: `${posTag}-W` },
            { id: `r-${idx}-p${pIdx}-sh`, description: sashSteelDesc, itemCode: sashSteelCode, dimension: sldSizes.sashSteelH, cutAngle: '90° 90°', quantity: 2, position: `${posTag}-H` }
          );
        }

        // Hardware for this panel:
        const hInfo = resolveHardwareHandle(pkt, { isDoor: isPktDoor, isSlider: true, isMesh, defaultColor: frame.color });
        hardwares.push({
          id: `h-${idx}-p${pIdx}-hnd`,
          description: hInfo.description,
          itemCode: hInfo.code,
          quantity: 1,
          unit: hInfo.unit,
          position: posTag,
        });

        // Rollers for this panel:
        if (isMesh) {
          hardwares.push({ id: `h-${idx}-p${pIdx}-rol`, description: 'SINGLE WHEEL WITHOUT GROOVE', itemCode: 'UPVC-HW-SW', quantity: 2, unit: 'PCS', position: posTag });
        } else if (isPktDoor) {
          hardwares.push({ id: `h-${idx}-p${pIdx}-rol`, description: 'DOUBLE WHEEL ADJUSTABLE WITH GROOVE', itemCode: 'UPVC-HW-DWAG', quantity: 2, unit: 'PCS', position: posTag });
        } else {
          hardwares.push({ id: `h-${idx}-p${pIdx}-rol`, description: 'SINGLE WHEEL WITH GROOVE', itemCode: 'UPVC-HW-SWG', quantity: 2, unit: 'PCS', position: posTag });
        }

        // Lock Striker / Espags for this panel:
        if (hInfo.hType === 'touch_lock') {
          hardwares.push({ id: `h-${idx}-p${pIdx}-stk`, description: 'SLD TOUCH LOCK STRIKER', itemCode: 'UPVC-HW-SLDTLS', quantity: 1, unit: 'PCS', position: posTag });
        } else if (
          hInfo.code === 'UPVC-HW-SDH' ||
          hInfo.code === 'UPVC-HW-DSDHK' ||
          hInfo.code === 'UPVC-HW-SDSDHWK' ||
          hInfo.code === 'UPVC-HW-LCKSET' ||
          hInfo.hType === 'sliding_d_pull' ||
          hInfo.hType === 'door_double_side_key' ||
          hInfo.hType === 'door_double_side' ||
          hInfo.hType === 'door_lock_set'
        ) {
          hardwares.push(
            { id: `h-${idx}-p${pIdx}-esp`, description: 'SLD DOOR ESPAG WITH CYLINDER 1800', itemCode: 'UPVC-HW-SDEWC1800', quantity: 1, unit: 'PCS', position: posTag },
            { id: `h-${idx}-p${pIdx}-cyl`, description: 'CYLINDER', itemCode: 'UPVC-HW-CYL', quantity: 1, unit: 'PCS', position: posTag },
            { id: `h-${idx}-p${pIdx}-stk`, description: 'SLD ESPAG STRIKER', itemCode: 'UPVC-HW-SES', quantity: 4, unit: 'PCS', position: posTag }
          );
        } else if (!isMesh) {
          const espCode = fHeight >= 1800 ? 'UPVC-HW-SDEWC1800' : (fHeight <= 1500 ? 'UPVC-HW-SWE1200' : 'UPVC-HW-SWE1400');
          const espDesc = fHeight >= 1800 ? 'SLD DOOR ESPAG WITH CYLINDER 1800' : (fHeight <= 1500 ? 'SLD 7.5MM BS ESPAG 1200' : 'SLD 7.5MM BS ESPAG 1400');
          const strikerQty = fHeight >= 1800 ? 4 : (fHeight <= 1500 ? 3 : 4);
          hardwares.push(
            { id: `h-${idx}-p${pIdx}-esp`, description: espDesc, itemCode: espCode, quantity: 1, unit: 'PCS', position: posTag },
            { id: `h-${idx}-p${pIdx}-stk`, description: 'SLD ESPAG STRIKER', itemCode: 'UPVC-HW-SES', quantity: strikerQty, unit: 'PCS', position: posTag }
          );
        }

        // Glazing for this panel:
        if (isMesh) {
          glazing.push({
            id: `gl-${idx}-p${pIdx}`,
            description: 'SS FLYMESH (INSECT SCREEN)',
            width: sldGlassW,
            height: sldGlassH,
            quantity: 1,
            position: posTag,
            itemCode: 'MESH-FI',
          });
        } else {
          const gName = getGlassDisplayName(pkt.glassType, pkt.glassName || frame.glassName).toUpperCase();
          glazing.push({
            id: `gl-${idx}-p${pIdx}`,
            description: `${gName} FLOAT GLASS`,
            width: sldGlassW,
            height: sldGlassH,
            quantity: 1,
            position: posTag,
          });
        }
      });

      // Universal sliding accessories
      hardwares.push(
        { id: `h-${idx}-bs`, description: 'BUMP STOPPER', itemCode: 'UPVC-HW-BS', quantity: panelCount, unit: 'PCS' },
        { id: `h-${idx}-sb`, description: 'SEALING BRIDGE', itemCode: 'UPVC-HW-SB', quantity: panelCount, unit: 'PCS' },
        { id: `h-${idx}-gp`, description: 'GLASS PACKER 2MM', itemCode: 'UPVC-HW-GP2MM', quantity: panelCount * 8, unit: 'PCS' },
        { id: `h-${idx}-pb`, description: 'PRESSURE BLOCK', itemCode: 'UPVC-HW-PB', quantity: panelCount * 2, unit: 'PCS' }
      );

      const totalFramePanels = (frame.pockets && frame.pockets.length > 0) ? frame.pockets.length : panelCount;
      const isMeetingSlidingFrame = totalFramePanels === 4 || totalFramePanels === 6 || is4Sash || slidingPanels.some((p) => (p.pkt.sashType || '').includes('meeting') || (p.pkt.sashType || '').includes('6s'));
      if (isMeetingSlidingFrame) {
        hardwares.push({
          id: `h-${idx}-crl`,
          description: 'CRESCENT ROTARY CAM LOCK (CENTER LOCK / बीच का लॉक)',
          itemCode: 'UPVC-HW-CRL',
          quantity: 1,
          unit: 'PCS',
        });
      }

      // Dynamic Screws for sliding
      const isTouchLock = slidingPanels.some((p) => {
        const h = resolveHardwareHandle(p.pkt, { isDoor: false, isSlider: true, defaultColor: frame.color });
        return h.hType === 'touch_lock';
      });

      const sldFrameRiQty = is4Sash
        ? 32
        : is3Track
        ? (fHeight >= 1400 ? 40 : fHeight >= 1000 ? 36 : fWidth >= 1000 ? 32 : fHeight >= 900 ? 28 : 24)
        : (fHeight >= 1400 ? 20 : fHeight >= 1000 ? 18 : fWidth >= 1000 ? 16 : fHeight >= 900 ? 14 : 12);
      const sldInterlockQty = is4Sash ? 16 : (is3Track ? (fHeight >= 1400 ? 12 : 9) : (fHeight >= 1400 ? 8 : 6));
      const sldSashRiQty = is4Sash
        ? 48
        : is3Track
        ? (fHeight >= 1400 ? 42 : fHeight >= 1000 ? 36 : 30)
        : (fHeight >= 1400 ? 28 : fHeight >= 1000 ? 24 : 20);

      screws.push(
        { id: `s-${idx}-1`, description: 'BUMP STOPPER SCREW', itemCode: 'UPVC-HW-BSSCREW', quantity: panelCount },
        { id: `s-${idx}-2`, description: 'PRESSURE BLOCK SCREW', itemCode: 'UPVC-HW-PBSC', quantity: panelCount * 2 },
        { id: `s-${idx}-3`, description: 'ROLLER SCREW', itemCode: 'UPVC-HW-RS', quantity: panelCount * 4 },
        { id: `s-${idx}-4`, description: 'SEALING BRIDGE SCREW', itemCode: 'UPVC-HW-SBSC', quantity: panelCount },
        { id: `s-${idx}-5`, description: 'SLD FRAME RI SCREW', itemCode: 'UPVC-HW-SFRIS', quantity: sldFrameRiQty },
        { id: `s-${idx}-6`, description: 'SLD INTERLOCK SCREW', itemCode: 'UPVC-HW-SISCREW', quantity: sldInterlockQty },
        { id: `s-${idx}-7`, description: 'SLD SASH RI SCREW', itemCode: 'UPVC-HW-SSRIS', quantity: sldSashRiQty }
      );

      if (isTouchLock) {
        screws.push(
          { id: `s-${idx}-8`, description: 'SLD TOUCH LOCK SCREW', itemCode: 'UPVC-HW-TLSC', quantity: panelCount * 2 },
          { id: `s-${idx}-9`, description: 'SLD TOUCH LOCK STRIKER SCREW', itemCode: 'UPVC-HW-SLDTLSS', quantity: panelCount * 2 }
        );
      } else {
        const strikerCount = isDoorSash ? 8 : (fHeight <= 1500 ? 6 : 8);
        screws.push(
          { id: `s-${idx}-8`, description: 'ESPAG BAR SCREW', itemCode: 'UPVC-HW-EBS', quantity: panelCount * 6 },
          { id: `s-${idx}-9`, description: 'ESPAG HANDLE SCREW', itemCode: 'UPVC-HW-EHS', quantity: panelCount * 2 },
          { id: `s-${idx}-10`, description: 'SLD ESPAG STRIKER SCREW', itemCode: 'UPVC-HW-SLDESS', quantity: strikerCount * 2 }
        );
      }

      // Gaskets for sliding
      if (is4Sash) {
        gaskets.push(
          { id: `g-${idx}-1`, description: 'GLAZING GASKET INNER', itemCode: 'UPVC-HW-INNERGKT', dimension: (sldGlassW + sldGlassH) * 8, quantity: 1 },
          { id: `g-${idx}-2`, description: 'GLAZING GASKET OUTER', itemCode: 'UPVC-HW-OUTERGKT', dimension: (sldGlassW + sldGlassH) * 8, quantity: 1 },
          { id: `g-${idx}-3`, description: 'SLD INTERLOCK WOOL PILE', itemCode: 'UPVC-HW-SIWP', dimension: sldInterlockH * 4, quantity: 1 },
          { id: `g-${idx}-4`, description: 'SLD SASH WOOL PILE', itemCode: 'UPVC-HW-SSWP', dimension: Math.round(sldSashW * 16 + sldInterlockH * 8), quantity: 1 }
        );
      } else {
        const woolpileDim = is3Track
          ? ((fWidth + fHeight) * 4 + sldInterlockH * 6)
          : ((fWidth + fHeight) * 2 + sldInterlockH * 4);
        gaskets.push(
          { id: `g-${idx}-1`, description: 'BRUSH WOOLPILE 3P 6 X 6.5', itemCode: 'UPVC-HW-WP3P', dimension: Math.round(woolpileDim), quantity: 1 },
          { id: `g-${idx}-2`, description: 'GLAZING GASKET OUTER', itemCode: 'UPVC-HW-OUTERGKT', dimension: (sldGlassW + sldGlassH) * (is3Track ? 6 : 4), quantity: 1 },
          { id: `g-${idx}-3`, description: 'GLAZING GASKET INNER', itemCode: 'UPVC-HW-INNERGKT', dimension: (sldGlassW + sldGlassH) * (is3Track ? 6 : 4), quantity: 1 },
          { id: `g-${idx}-4`, description: 'SLD INTERLOCK GASKET', itemCode: 'UPVC-HW-INTERLOCKGKT', dimension: sldInterlockH * (is3Track ? 3 : 2), quantity: 1 }
        );
      }
    } else {
      // NON-SLIDING (CASEMENT, FIXED, DOORS, COMBINATIONS)
      // 1. Frame Outer Profiles
      const frameProf = resolveCADFrameProfile(frame);
      const outerFrameCode = frameProf.code;
      profiles.push(
        { id: `p-${idx}-outer-w`, description: frameProf.name, itemCode: outerFrameCode, dimension: outerCutW, cutAngle: '45° 135°', quantity: 2, position: 'W' },
        { id: `p-${idx}-outer-h`, description: frameProf.name, itemCode: outerFrameCode, dimension: outerCutH, cutAngle: '45° 135°', quantity: 2, position: 'H' }
      );

      // 2. Outer Frame Reinforcements (Duron Casement Profile Specific)
      if (frame.reinforcement && frame.reinforcement !== 'none') {
        const cmtSteelThk = frame.reinforcement === 'steel_1.2mm' ? '1.2MM' : (frame.reinforcement === 'steel_2.0mm' ? '2.0MM' : '1.5MM');
        const cmtOuterSteelInfo = getCasementFrameReinforcementDeduction(outerFrameCode, fabricationRules);
        const cmtSteelOuterW = Math.max(50, outerCutW - cmtOuterSteelInfo.deduction);
        const cmtSteelOuterH = Math.max(50, outerCutH - cmtOuterSteelInfo.deduction);
        reinforcements.push(
          { id: `r-${idx}-outer-w`, description: `RI FRAME (${cmtOuterSteelInfo.profileCode})`, itemCode: `CRI 60-02-${cmtSteelThk}`, dimension: cmtSteelOuterW, cutAngle: '90° 90°', quantity: 2, position: 'W' },
          { id: `r-${idx}-outer-h`, description: `RI FRAME (${cmtOuterSteelInfo.profileCode})`, itemCode: `CRI 60-02-${cmtSteelThk}`, dimension: cmtSteelOuterH, cutAngle: '90° 90°', quantity: 2, position: 'H' }
        );
      }

      const isDoorOuter = isDoor || fHeight >= 1800;
      const outerRiScrewQty = isDoorOuter ? (fWidth >= 1000 ? 8 : 6) + (fHeight >= 2000 ? 14 : 12) : 20;
      screws.push({ id: `s-${idx}-outer-ri`, description: 'CMT OUTER RI SCREW', itemCode: 'UPVC-HW-ORISC', quantity: outerRiScrewQty });
      gaskets.push({ id: `g-${idx}-outer-o`, description: 'O TYPE GASKET', itemCode: 'UPVC-HW-OG', dimension: (fWidth + fHeight) * 2, quantity: 1 });

      // Mullions / Transoms if present
      (frame.mullions || []).forEach((m, mIdx) => {
        const isVert = m.orientation === 'vertical';
        const mLength = isVert ? Math.round(fHeight - 120 + 4) : Math.round(fWidth - 120 + 4);
        const mCode =
          frame.seriesCode === 'CWH-50'
            ? 'CWH 50-05'
            : frame.seriesCode === 'CWH-65'
            ? 'CWH 65-05'
            : 'CWH 60-05';
        const mDesc = isVert ? 'CMT MULLION 60MM X 74MM' : 'CMT TRANSOM 60MM X 74MM';
        profiles.push({
          id: `p-${idx}-m-${mIdx}`,
          description: mDesc,
          itemCode: mCode,
          dimension: mLength,
          cutAngle: '90° 90°',
          quantity: 1,
          position: isVert ? 'V' : 'H-Mid',
        });
        if (frame.reinforcement && frame.reinforcement !== 'none') {
          const cmtSteelThk = frame.reinforcement === 'steel_1.2mm' ? '1.2MM' : (frame.reinforcement === 'steel_2.0mm' ? '2.0MM' : '1.5MM');
          reinforcements.push({
            id: `r-${idx}-m-${mIdx}`,
            description: 'MULLION GI STEEL (32X20X32)',
            itemCode: `CRI 60-05-${cmtSteelThk}`,
            dimension: Math.max(50, mLength - 20),
            cutAngle: '90° 90°',
            quantity: 1,
            position: isVert ? 'V' : 'H',
          });
        }
      });

      // Pockets processing: Each pocket calculates its exact sash, beading, steel, glass & hardware
      pockets.forEach((pkt, pIdx) => {
        const hasPocketCasementSashCode = Boolean(
          pkt.sashProfileCode &&
          (pkt.sashProfileCode.startsWith('CWH') || pkt.sashProfileCode.startsWith('PCWH')) &&
          pkt.sashProfileCode !== 'CWH 60-01' &&
          pkt.sashProfileCode !== 'CWH 60-02' &&
          pkt.sashProfileCode !== 'CWH 60-05' &&
          pkt.sashProfileCode !== 'CWH 60-08'
        );
        const isCasementPocket =
          pkt.sashType?.startsWith('casement') ||
          pkt.sashType === 'top_hung' ||
          pkt.sashType === 'bottom_hung' ||
          pkt.sashType === 'tilt_turn' ||
          pkt.sashType === 'open_vent' ||
          hasPocketCasementSashCode;
        const isFrenchPocket = pkt.sashType === 'french_open';
        const isFixedPocket = !isCasementPocket && !isFrenchPocket && (pkt.sashType === 'fixed' || (!pkt.sashType && !isCasement));

        if (isFrenchPocket) {
          const { isPocketDoor, code, desc } = getCasementSashInfo(pkt, isDoor);
          const leafW = Math.round(pkt.width / 2 + 8 + 6);
          const leafH = Math.round(pkt.height + 16 + 6);
          const glW = isPocketDoor ? Math.max(50, leafW - 182) : Math.max(50, leafW - 130);
          const glH = isPocketDoor ? Math.max(50, leafH - 182) : Math.max(50, leafH - 130);
          const sashSteelInfo = getCasementSashReinforcementDeduction(code, isPocketDoor, fabricationRules);
          const stW = Math.max(50, leafW - sashSteelInfo.deduction);
          const stH = Math.max(50, leafH - sashSteelInfo.deduction);

          profiles.push(
            { id: `p-${idx}-p${pIdx}-sw`, description: desc, itemCode: code, dimension: leafW, cutAngle: '45° 135°', quantity: 4, position: 'W' },
            { id: `p-${idx}-p${pIdx}-sh`, description: desc, itemCode: code, dimension: leafH, cutAngle: '45° 135°', quantity: 4, position: 'H' },
            { id: `p-${idx}-p${pIdx}-fly`, description: 'CMT FLY MULLION', itemCode: 'CWH 60-12', dimension: Math.max(50, leafH - 64), cutAngle: '90° 90°', quantity: 1, position: 'V' },
            { id: `p-${idx}-p${pIdx}-bw`, description: 'SASH BEADING 35.5MM', itemCode: 'CWH 60-08', dimension: glW + 4, cutAngle: '45° 135°', quantity: 4, position: 'W' },
            { id: `p-${idx}-p${pIdx}-bh`, description: 'SASH BEADING 35.5MM', itemCode: 'CWH 60-08', dimension: glH + 4, cutAngle: '45° 135°', quantity: 4, position: 'H' }
          );

          reinforcements.push(
            { id: `r-${idx}-p${pIdx}-sw`, description: isPocketDoor ? 'RI-54MM X 35MM X 54MM' : 'RI-28MM X 35MM X 16MM', itemCode: isPocketDoor ? 'CRI 60-06-1.5MM' : 'CRI 60-03-1.5MM', dimension: stW, cutAngle: '90° 90°', quantity: 4, position: 'W' },
            { id: `r-${idx}-p${pIdx}-sh`, description: isPocketDoor ? 'RI-54MM X 35MM X 54MM' : 'RI-28MM X 35MM X 16MM', itemCode: isPocketDoor ? 'CRI 60-06-1.5MM' : 'CRI 60-03-1.5MM', dimension: stH, cutAngle: '90° 90°', quantity: 4, position: 'H' },
            { id: `r-${idx}-p${pIdx}-flyri`, description: 'FLY MULLION GI STEEL (32X20X32)', itemCode: 'CRI 60-12-1.5MM', dimension: Math.max(50, leafH - 64 - 110), cutAngle: '90° 90°', quantity: 1, position: 'V' }
          );

          const hInfo = resolveHardwareHandle(pkt, { isDoor: isPocketDoor, isSlider: false, defaultColor: frame.color });
          if (isPocketDoor) {
            const doorHw = getCasementDoorHardwareConfiguration(pkt.height, hInfo.code || hInfo.hType);
            hardwares.push({ id: `h-${idx}-p${pIdx}-3dh`, description: `${doorHw.hingesName} (HEAVY DOOR)`, itemCode: doorHw.hingesCode, quantity: doorHw.hingesQty * 2, unit: 'PCS' });
            hardwares.push({ id: `h-${idx}-p${pIdx}-hnd`, description: doorHw.handleName, itemCode: doorHw.handleCode, quantity: 2, unit: doorHw.handleUnit });
            if (doorHw.hasEspag && doorHw.espagName && doorHw.espagCode) {
              hardwares.push(
                { id: `h-${idx}-p${pIdx}-esp`, description: doorHw.espagName, itemCode: doorHw.espagCode, quantity: 2, unit: 'PCS' },
                { id: `h-${idx}-p${pIdx}-esstk`, description: doorHw.strikerName, itemCode: doorHw.strikerCode, quantity: doorHw.strikerQty * 2, unit: 'PCS' }
              );
            }
            if (doorHw.hasCylinder && doorHw.cylinderName && doorHw.cylinderCode) {
              hardwares.push({ id: `h-${idx}-p${pIdx}-cyl`, description: doorHw.cylinderName, itemCode: doorHw.cylinderCode, quantity: 1, unit: 'PCS' });
            }
            hardwares.push(
              { id: `h-${idx}-p${pIdx}-shb`, description: 'SHOOT BOLT (TOP & BOTTOM)', itemCode: 'UPVC-HW-SHB', quantity: 2, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-shbstk`, description: 'SHOOT BOLT STRIKER', itemCode: 'UPVC-HW-SHBSTK', quantity: 2, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-fmc`, description: 'FLY MULLION CAP', itemCode: 'UPVC-HW-FMC', quantity: 2, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-cb`, description: 'CAVITY BLOCK', itemCode: 'UPVC-HW-CB', quantity: 8, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-gp`, description: 'GLASS PACKER 2MM', itemCode: 'UPVC-HW-GP2MM', quantity: doorHw.glassPackerQty * 2, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-ib`, description: 'INERTIA BLOCK', itemCode: 'UPVC-HW-IB', quantity: doorHw.inertiaBlockQty * 2, unit: 'PCS' }
            );

            screws.push(
              { id: `s-${idx}-p${pIdx}-srs`, description: 'CMT SHUTTER RI SCREW', itemCode: 'UPVC-HW-SRS', quantity: 48 },
              { id: `s-${idx}-p${pIdx}-cbs`, description: 'CAVITY BLOCK SCREW', itemCode: 'UPVC-HW-CBSC', quantity: 8 },
              { id: `s-${idx}-p${pIdx}-shsc`, description: doorHw.hingesScrewName, itemCode: doorHw.hingesScrewCode, quantity: doorHw.hingesScrewQty * 2 },
              { id: `s-${idx}-p${pIdx}-ibsc`, description: 'INERTIA BLOCK SCREW', itemCode: 'UPVC-HW-IBSC', quantity: doorHw.inertiaBlockScrewQty * 2 },
              { id: `s-${idx}-p${pIdx}-fms`, description: 'FLY MULLION FIXING SCREW', itemCode: 'UPVC-HW-FMFSC', quantity: 5 },
              { id: `s-${idx}-p${pIdx}-flyri`, description: 'FLY MULLION RI SCREW', itemCode: 'UPVC-HW-FLYRISC', quantity: 5 },
              { id: `s-${idx}-p${pIdx}-shbs`, description: 'SHOOT BOLT SCREW', itemCode: 'UPVC-HW-SHBSC', quantity: 8 },
              { id: `s-${idx}-p${pIdx}-shbstks`, description: 'SHOOT BOLT STRIKER SCREW', itemCode: 'UPVC-HW-SHBSTK-SC', quantity: 4 }
            );
            if (doorHw.hasEspag) {
              screws.push(
                { id: `s-${idx}-p${pIdx}-ehs`, description: 'ESPAG HANDLE SCREW', itemCode: 'UPVC-HW-EHS', quantity: doorHw.espagHandleScrewQty * 2 },
                { id: `s-${idx}-p${pIdx}-ebs`, description: 'ESPAG BAR SCREW', itemCode: 'UPVC-HW-EBS', quantity: doorHw.espagBarScrewQty * 2 },
                { id: `s-${idx}-p${pIdx}-cmtes`, description: 'CMT ESPAG STRIKER SCREW', itemCode: 'UPVC-HW-CMTESS', quantity: doorHw.strikerScrewQty * 2 }
              );
            }
          } else {
            const staySize = pkt.height <= 1000 ? '12"' : pkt.height <= 1400 ? '16"' : '24"';
            const stayCode = pkt.height <= 1000 ? 'UPVC-HW-FS12' : pkt.height <= 1400 ? 'UPVC-HW-FS16' : 'UPVC-HW-FS24';
            hardwares.push({ id: `h-${idx}-p${pIdx}-fs`, description: `FRICTION STAY ${staySize} (PAIR)`, itemCode: stayCode, quantity: 2, unit: 'PAIR' });
            hardwares.push(
              { id: `h-${idx}-p${pIdx}-hnd`, description: hInfo.description, itemCode: hInfo.code, quantity: 2, unit: hInfo.unit },
              { id: `h-${idx}-p${pIdx}-shb`, description: 'SHOOT BOLT (TOP & BOTTOM)', itemCode: 'UPVC-HW-SHB', quantity: 2, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-shbstk`, description: 'SHOOT BOLT STRIKER', itemCode: 'UPVC-HW-SHBSTK', quantity: 2, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-fmc`, description: 'FLY MULLION CAP', itemCode: 'UPVC-HW-FMC', quantity: 2, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-cb`, description: 'CAVITY BLOCK', itemCode: 'UPVC-HW-CB', quantity: 8, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-gp`, description: 'GLASS PACKER 2MM', itemCode: 'UPVC-HW-GP2MM', quantity: 16, unit: 'PCS' }
            );

            screws.push(
              { id: `s-${idx}-p${pIdx}-srs`, description: 'CMT SHUTTER RI SCREW', itemCode: 'UPVC-HW-SRS', quantity: 32 },
              { id: `s-${idx}-p${pIdx}-fssc`, description: 'FRICTION STAY SCREW', itemCode: 'UPVC-HW-FSSC', quantity: 32 },
              { id: `s-${idx}-p${pIdx}-cbs`, description: 'CAVITY BLOCK SCREW', itemCode: 'UPVC-HW-CBSC', quantity: 8 },
              { id: `s-${idx}-p${pIdx}-fms`, description: 'FLY MULLION FIXING SCREW', itemCode: 'UPVC-HW-FMFSC', quantity: 5 },
              { id: `s-${idx}-p${pIdx}-flyri`, description: 'FLY MULLION RI SCREW', itemCode: 'UPVC-HW-FLYRISC', quantity: 5 },
              { id: `s-${idx}-p${pIdx}-shbs`, description: 'SHOOT BOLT SCREW', itemCode: 'UPVC-HW-SHBSC', quantity: 8 },
              { id: `s-${idx}-p${pIdx}-shbstks`, description: 'SHOOT BOLT STRIKER SCREW', itemCode: 'UPVC-HW-SHBSTK-SC', quantity: 4 }
            );
          }

          glazing.push({
            id: `gl-${idx}-p${pIdx}`,
            description: `${getGlassDisplayName(pkt.glassType, pkt.glassName || frame.glassName).toUpperCase()} FLOAT GLASS`,
            width: glW,
            height: glH,
            quantity: 2,
          });

          gaskets.push(
            { id: `g-${idx}-p${pIdx}-sbg`, description: 'CMT SHUTTER BEATING GASKET', itemCode: 'UPVC-HW-SHUTTERGKT', dimension: (leafW + leafH) * 4, quantity: 1 },
            { id: `g-${idx}-p${pIdx}-inng`, description: 'GLAZING GASKET INNER', itemCode: 'UPVC-HW-INNERGKT', dimension: (glW + glH) * 4, quantity: 1 },
            { id: `g-${idx}-p${pIdx}-outg`, description: 'GLAZING GASKET OUTER', itemCode: 'UPVC-HW-OUTERGKT', dimension: (glW + glH) * 4, quantity: 1 }
          );
          if (isPocketDoor) {
            gaskets.push({ id: `g-${idx}-p${pIdx}-ogkt`, description: 'O TYPE GASKET', itemCode: 'UPVC-HW-OTYPEGKT', dimension: (frame.width + frame.height) * 2, quantity: 1 });
          }
        } else if (isCasementPocket || (isCasement && !isFixedPocket)) {
          const cmtSizes = calculateCasementCuttingSizes(frame, pkt as FramePocket, fabricationRules);
          const isPocketDoor = pkt.applicationType === 'door' || (pkt.applicationType !== 'window' && isDoor);
          const sashW = cmtSizes.sashW;
          const sashH = cmtSizes.sashH;
          const glW = cmtSizes.glassW;
          const glH = cmtSizes.glassH;
          const stW = cmtSizes.sashSteelW;
          const stH = cmtSizes.sashSteelH;
          const code = cmtSizes.sashProf.code;
          const desc = cmtSizes.sashProf.name;
          const beadCode = cmtSizes.sashProf.beadCode || 'CWH 60-08';
          const beadDesc = cmtSizes.sashProf.beadName || 'SASH BEADING 35.5MM';
          const steelCode = cmtSizes.sashProf.steelCode || (isPocketDoor ? 'CRI 60-06-1.5MM' : 'CRI 60-03-1.5MM');
          const steelDesc = cmtSizes.sashProf.steelName || (isPocketDoor ? 'RI-54MM X 35MM X 54MM' : 'RI-28MM X 35MM X 16MM');

          profiles.push(
            { id: `p-${idx}-p${pIdx}-sw`, description: desc, itemCode: code, dimension: sashW, cutAngle: '45° 135°', quantity: 2, position: 'W' },
            { id: `p-${idx}-p${pIdx}-sh`, description: desc, itemCode: code, dimension: sashH, cutAngle: '45° 135°', quantity: 2, position: 'H' },
            { id: `p-${idx}-p${pIdx}-bw`, description: beadDesc, itemCode: beadCode, dimension: cmtSizes.beadW, cutAngle: '45° 135°', quantity: 2, position: 'W' },
            { id: `p-${idx}-p${pIdx}-bh`, description: beadDesc, itemCode: beadCode, dimension: cmtSizes.beadH, cutAngle: '45° 135°', quantity: 2, position: 'H' }
          );

          if (frame.reinforcement && frame.reinforcement !== 'none') {
            reinforcements.push(
              { id: `r-${idx}-p${pIdx}-sw`, description: steelDesc, itemCode: steelCode, dimension: stW, cutAngle: '90° 90°', quantity: 2, position: 'W' },
              { id: `r-${idx}-p${pIdx}-sh`, description: steelDesc, itemCode: steelCode, dimension: stH, cutAngle: '90° 90°', quantity: 2, position: 'H' }
            );
          }

          const hInfo = resolveHardwareHandle(pkt, { isDoor: isPocketDoor, isSlider: false, defaultColor: frame.color });

          if (isPocketDoor) {
            const doorHw = getCasementDoorHardwareConfiguration(pkt.height, hInfo.code || hInfo.hType);

            // 1. 3D Hinges & Handle
            hardwares.push({ id: `h-${idx}-p${pIdx}-3dh`, description: `${doorHw.hingesName} (HEAVY DOOR)`, itemCode: doorHw.hingesCode, quantity: doorHw.hingesQty, unit: 'PCS' });
            hardwares.push({ id: `h-${idx}-p${pIdx}-hnd`, description: doorHw.handleName, itemCode: doorHw.handleCode, quantity: 1, unit: doorHw.handleUnit });

            // 2. Door Espag & Striker (if applicable)
            if (doorHw.hasEspag && doorHw.espagName && doorHw.espagCode) {
              hardwares.push(
                { id: `h-${idx}-p${pIdx}-esp`, description: doorHw.espagName, itemCode: doorHw.espagCode, quantity: 1, unit: 'PCS' },
                { id: `h-${idx}-p${pIdx}-esstk`, description: doorHw.strikerName, itemCode: doorHw.strikerCode, quantity: doorHw.strikerQty, unit: 'PCS' }
              );
            }

            // 3. Cylinder (if applicable)
            if (doorHw.hasCylinder && doorHw.cylinderName && doorHw.cylinderCode) {
              hardwares.push({ id: `h-${idx}-p${pIdx}-cyl`, description: doorHw.cylinderName, itemCode: doorHw.cylinderCode, quantity: 1, unit: 'PCS' });
            }

            // 4. Door Accessories
            if (!doorHw.isSelfContainedLock) {
              hardwares.push(
                { id: `h-${idx}-p${pIdx}-cb`, description: 'CAVITY BLOCK', itemCode: 'UPVC-HW-CB', quantity: 4, unit: 'PCS' }
              );
            }
            hardwares.push(
              { id: `h-${idx}-p${pIdx}-gp`, description: 'GLASS PACKER 2MM', itemCode: 'UPVC-HW-GP2MM', quantity: doorHw.glassPackerQty, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-ib`, description: 'INERTIA BLOCK', itemCode: 'UPVC-HW-IB', quantity: doorHw.inertiaBlockQty, unit: 'PCS' }
            );

            // 5. Door Screws
            const shutterRiQty = doorHw.isSelfContainedLock
              ? (fWidth >= 1000 ? 6 : 4) + (fHeight > 2200 ? 14 : (fHeight > 2050 ? 12 : 10))
              : 24;

            screws.push(
              { id: `s-${idx}-p${pIdx}-srs`, description: 'CMT SHUTTER RI SCREW', itemCode: 'UPVC-HW-SRS', quantity: shutterRiQty },
              ...(doorHw.isSelfContainedLock ? [] : [{ id: `s-${idx}-p${pIdx}-cbs`, description: 'CAVITY BLOCK SCREW', itemCode: 'UPVC-HW-CBSC', quantity: 4 }]),
              { id: `s-${idx}-p${pIdx}-shsc`, description: doorHw.hingesScrewName, itemCode: doorHw.hingesScrewCode, quantity: doorHw.hingesScrewQty },
              { id: `s-${idx}-p${pIdx}-ibsc`, description: 'INERTIA BLOCK SCREW', itemCode: 'UPVC-HW-IBSC', quantity: doorHw.inertiaBlockScrewQty }
            );

            if (doorHw.hasEspag) {
              screws.push(
                { id: `s-${idx}-p${pIdx}-ehs`, description: 'ESPAG HANDLE SCREW', itemCode: 'UPVC-HW-EHS', quantity: doorHw.espagHandleScrewQty },
                { id: `s-${idx}-p${pIdx}-ebs`, description: 'ESPAG BAR SCREW', itemCode: 'UPVC-HW-EBS', quantity: doorHw.espagBarScrewQty },
                { id: `s-${idx}-p${pIdx}-cmtes`, description: 'CMT ESPAG STRIKER SCREW', itemCode: 'UPVC-HW-CMTESS', quantity: doorHw.strikerScrewQty }
              );
            }

            // 6. Door Gaskets
            gaskets.push(
              { id: `g-${idx}-p${pIdx}-sbg`, description: 'CMT SHUTTER BEATING GASKET', itemCode: 'UPVC-HW-SHUTTERGKT', dimension: (sashW + sashH) * 2, quantity: 1 },
              { id: `g-${idx}-p${pIdx}-inng`, description: 'GLAZING GASKET INNER', itemCode: 'UPVC-HW-INNERGKT', dimension: (glW + glH) * 2, quantity: 1 },
              { id: `g-${idx}-p${pIdx}-outg`, description: 'GLAZING GASKET OUTER', itemCode: 'UPVC-HW-OUTERGKT', dimension: (glW + glH) * 2, quantity: 1 },
              { id: `g-${idx}-p${pIdx}-ogkt`, description: 'O TYPE GASKET', itemCode: 'UPVC-HW-OTYPEGKT', dimension: (frame.width + frame.height) * 2, quantity: 1 }
            );
          } else {
            // Window Casement
            const staySize = pkt.height <= 1000 ? '12"' : pkt.height <= 1400 ? '16"' : '24"';
            const stayCode = pkt.height <= 1000 ? 'UPVC-HW-FS12' : pkt.height <= 1400 ? 'UPVC-HW-FS16' : 'UPVC-HW-FS24';
            hardwares.push({ id: `h-${idx}-p${pIdx}-fs`, description: `FRICTION STAY ${staySize} (PAIR)`, itemCode: stayCode, quantity: 1, unit: 'PAIR' });
            hardwares.push({ id: `h-${idx}-p${pIdx}-hnd`, description: hInfo.description, itemCode: hInfo.code, quantity: 1, unit: hInfo.unit });

            if (hInfo.hType.includes('cockspur')) {
              hardwares.push({ id: `h-${idx}-p${pIdx}-wedge`, description: 'COCKSPUR HANDLE WEDGE', itemCode: 'UPVC-HW-CHW', quantity: 1, unit: 'PCS' });
            } else {
              const esp = getCasementEspagSelection(pkt.height);
              hardwares.push(
                { id: `h-${idx}-p${pIdx}-esp`, description: `CASEMENT 20MM BS ESPAG ${esp.length}`, itemCode: esp.code, quantity: 1, unit: 'PCS' },
                { id: `h-${idx}-p${pIdx}-esstk`, description: 'CMT ESPAG STRIKER', itemCode: 'UPVC-HW-CES', quantity: esp.strikers, unit: 'PCS' }
              );
            }
            hardwares.push(
              { id: `h-${idx}-p${pIdx}-cb`, description: 'CAVITY BLOCK', itemCode: 'UPVC-HW-CB', quantity: 4, unit: 'PCS' },
              { id: `h-${idx}-p${pIdx}-gp`, description: 'GLASS PACKER 2MM', itemCode: 'UPVC-HW-GP2MM', quantity: 8, unit: 'PCS' }
            );

            screws.push(
              { id: `s-${idx}-p${pIdx}-srs`, description: 'CMT SHUTTER RI SCREW', itemCode: 'UPVC-HW-SRS', quantity: 16 },
              { id: `s-${idx}-p${pIdx}-cbs`, description: 'CAVITY BLOCK SCREW', itemCode: 'UPVC-HW-CBSC', quantity: 4 },
              { id: `s-${idx}-p${pIdx}-fssc`, description: 'FRICTION STAY SCREW', itemCode: 'UPVC-HW-FSSC', quantity: 16 }
            );
            if (hInfo.hType.includes('cockspur')) {
              screws.push(
                { id: `s-${idx}-p${pIdx}-sc`, description: 'CMT SINGLE POINT LOCK SCREW', itemCode: 'UPVC-HW-SC', quantity: 2 },
                { id: `s-${idx}-p${pIdx}-ssc`, description: 'CMT SINGLE POINT STRIKER SCREW', itemCode: 'UPVC-HW-SSC', quantity: 2 }
              );
            } else {
              screws.push(
                { id: `s-${idx}-p${pIdx}-ehs`, description: 'ESPAG HANDLE SCREW', itemCode: 'UPVC-HW-EHS', quantity: 2 },
                { id: `s-${idx}-p${pIdx}-ebs`, description: 'ESPAG BAR SCREW', itemCode: 'UPVC-HW-EBS', quantity: 6 },
                { id: `s-${idx}-p${pIdx}-cmtes`, description: 'CMT ESPAG STRIKER SCREW', itemCode: 'UPVC-HW-CMTESS', quantity: 6 }
              );
            }

            gaskets.push(
              { id: `g-${idx}-p${pIdx}-sbg`, description: 'CMT SHUTTER BEATING GASKET', itemCode: 'UPVC-HW-SHUTTERGKT', dimension: (sashW + sashH) * 2, quantity: 1 },
              { id: `g-${idx}-p${pIdx}-inng`, description: 'GLAZING GASKET INNER', itemCode: 'UPVC-HW-INNERGKT', dimension: (glW + glH) * 2, quantity: 1 },
              { id: `g-${idx}-p${pIdx}-outg`, description: 'GLAZING GASKET OUTER', itemCode: 'UPVC-HW-OUTERGKT', dimension: (glW + glH) * 2, quantity: 1 }
            );
          }

          glazing.push({
            id: `gl-${idx}-p${pIdx}`,
            description: `${getGlassDisplayName(pkt.glassType, pkt.glassName || frame.glassName).toUpperCase()} FLOAT GLASS`,
            width: glW,
            height: glH,
            quantity: 1,
          });
        } else if (isFixedPocket) {
          const glW = Math.max(50, Math.round(pkt.width - 12));
          const glH = Math.max(50, Math.round(pkt.height - 12));

          profiles.push(
            { id: `p-${idx}-p${pIdx}-fbw`, description: 'FIXED GLAZING BEADING 35.5MM', itemCode: 'CWH 60-08', dimension: glW + 4, cutAngle: '45° 135°', quantity: 2, position: 'W' },
            { id: `p-${idx}-p${pIdx}-fbh`, description: 'FIXED GLAZING BEADING 35.5MM', itemCode: 'CWH 60-08', dimension: glH + 4, cutAngle: '45° 135°', quantity: 2, position: 'H' }
          );

          hardwares.push({ id: `h-${idx}-p${pIdx}-gp`, description: 'GLASS PACKER 2MM', itemCode: 'UPVC-HW-GP2MM', quantity: 4, unit: 'PCS' });

          gaskets.push(
            { id: `g-${idx}-p${pIdx}-inng`, description: 'GLAZING GASKET INNER', itemCode: 'UPVC-HW-INNERGKT', dimension: (glW + glH) * 2, quantity: 1 },
            { id: `g-${idx}-p${pIdx}-outg`, description: 'GLAZING GASKET OUTER', itemCode: 'UPVC-HW-OUTERGKT', dimension: (glW + glH) * 2, quantity: 1 }
          );

          glazing.push({
            id: `gl-${idx}-p${pIdx}`,
            description: `${getGlassDisplayName(pkt.glassType, pkt.glassName || frame.glassName).toUpperCase()} FLOAT GLASS (FIXED)`,
            width: glW,
            height: glH,
            quantity: 1,
          });
        } else if (pkt.sashType === 'louver') {
          const louverCount = Math.max(3, Math.round(pkt.height / 35));
          glazing.push({
            id: `gl-${idx}-p${pIdx}`,
            description: `LOUVER GLASS BLADES (${louverCount} BLADES)`,
            width: Math.max(50, Math.round(pkt.width - 4)),
            height: 100,
            quantity: louverCount,
          });
        } else if (pkt.sashType === 'upvc_panel') {
          glazing.push({
            id: `gl-${idx}-p${pIdx}`,
            description: 'UPVC SOLID PANEL SHEET (WHITE)',
            width: Math.max(50, Math.round(pkt.width - 12)),
            height: Math.max(50, Math.round(pkt.height - 12)),
            quantity: 1,
          });
        } else if (pkt.sashType === 'fan_provision') {
          glazing.push({
            id: `gl-${idx}-p${pIdx}`,
            description: 'PVC SHEET WITH EXHAUST FAN CUTOUT',
            width: Math.max(50, Math.round(pkt.width - 12)),
            height: Math.max(50, Math.round(pkt.height - 12)),
            quantity: 1,
          });
        }
      });
    }

    // 7. INSTALLATION HARDWARE TABLE
    const isDoorFrame = isDoor || pockets.some(p => p.applicationType === 'door') || fHeight >= 1800;

    const fastnerQty = isDoorFrame
      ? (fWidth >= 800 ? 6 : 4) + (fHeight > 2200 ? 12 : 10)
      : (is4Sash ? 24 : (fHeight >= 1400 ? 16 : (fHeight >= 1000 ? (is3Track ? 14 : 12) : 10)));

    const packer1mmQty = isDoorFrame
      ? (fWidth >= 1000 ? 10 : 8)
      : (is4Sash ? 12 : (fHeight >= 1000 ? 8 : (fHeight >= 900 ? 4 : 6)));

    const packer3mmQty = isDoorFrame
      ? (fWidth < 700 ? 4 : 6)
      : (is4Sash ? 8 : 4);

    const packer5mmQty = isDoorFrame
      ? (fWidth < 700 ? 4 : 6)
      : (is4Sash ? 8 : 4);

    const drainageCapQty = isDoorFrame
      ? (fWidth >= 800 ? 3 : 2)
      : (is4Sash ? 4 : (fWidth >= 1200 ? 4 : 3));

    // Silicone Sealant Cartridges: Formula = (Height mm + Width mm) * 0.0005263
    const siliconeCans = ((fHeight + fWidth) * 0.0005263).toFixed(3);

    const installation: import('../types/upvc').ProductionReportInstallationItem[] = [
      { id: `i-${idx}-1`, description: 'FASTNER CAPS', itemCode: 'UPVC-HW-FC', quantity: fastnerQty },
      { id: `i-${idx}-2`, description: 'FASTNER SCREWS', itemCode: 'UPVC-HW-N8 X 80', quantity: fastnerQty },
      { id: `i-${idx}-3`, description: 'DRAINAGE CAP', itemCode: 'UPVC-HW-DC', quantity: drainageCapQty },
      { id: `i-${idx}-4`, description: 'PROFILE PACKER 1MM', itemCode: 'UPVC-HW-PP1MM', quantity: packer1mmQty },
      { id: `i-${idx}-5`, description: 'PROFILE PACKER 3MM', itemCode: 'UPVC-HW-PP3MM', quantity: packer3mmQty },
      { id: `i-${idx}-6`, description: 'PROFILE PACKER 5MM', itemCode: 'UPVC-HW-PP5MM', quantity: packer5mmQty },
      { id: `i-${idx}-7`, description: 'SILICONE', itemCode: 'UPVC-HW-SI', quantity: `${siliconeCans} CAN` },
    ];

    const cmtPocketW = mainPocket.width || Math.max(100, fWidth - 120);
    const cmtPocketH = mainPocket.height || Math.max(100, fHeight - 120);
    const cmtSashW = cmtPocketW + 16;
    const cmtSashH = cmtPocketH + 16;
    const cmtGlassW = Math.max(50, cmtSashW - 130);
    const cmtGlassH = Math.max(50, cmtSashH - 130);

    const shutterWeightKg = isSlider
      ? Math.round(((sldGlassW * sldGlassH * 0.000001 * 12.5) + (sldSashW + sldSashH) * 0.002 * 1.8) * 10) / 10
      : Math.round(((cmtGlassW * cmtGlassH * 0.000001 * 12.5) + (cmtSashW + cmtSashH) * 0.002 * 1.8) * 10) / 10;

    // 8. COST BREAKUP REPORT TABLE & SUMMARY CALCULATION
    const costBreakupRows: import('../types/upvc').CostBreakupRow[] = [];
    let cbCounter = 1;

    // A. Profile Rows (uPVC in KG, Aluminium Guide Rail in Meter)
    profiles.forEach((p) => {
      const isGuideRail =
        p.itemCode === 'DURON-GR' ||
        p.description.toLowerCase().includes('guide rail') ||
        p.description.toLowerCase().includes('aluminium');
      const isBead = p.description.toLowerCase().includes('bead');
      const isMullion = p.description.toLowerCase().includes('mullion');
      const isSash = p.description.toLowerCase().includes('sash');
      const lengthMtr = Math.round(((p.dimension * p.quantity) / 1000) * 1000) / 1000;

      if (isGuideRail) {
        // Aluminium Guide Rail inside sliding systems is in METERS
        const inv = getInventoryItemPrice(p.itemCode, {
          name: p.description,
          category: 'Profile',
          isProfile: true,
          fallbackRate: 30,
          inventoryList: activeInventory,
          targetUnit: 'Mtr',
        });
        const rate = inv.rate;
        const cost = Math.round(lengthMtr * rate * 100) / 100;
        costBreakupRows.push({
          id: `cb-${cbCounter++}`,
          category: 'Profile',
          description: p.description,
          itemCode: p.itemCode,
          qty: lengthMtr,
          unit: 'Mtr',
          rate,
          cost,
          fromInventory: inv.fromInventory,
          inventoryItemName: inv.matchedItem?.name,
          inventoryStockQty: inv.matchedItem?.stockQty,
          rateFormula: `₹${rate}/Mtr (एल्युमिनियम गाइड रेल)`,
        });
      } else {
        // uPVC Profiles calculated and billed in KG
        const defaultRate = isBead ? 65 : (isSash ? (isDoor ? 265 : 210) : (isMullion ? 220 : (isSlider ? (is3Track ? 330 : 240) : 185)));
        const inv = getInventoryItemPrice(p.itemCode, {
          name: p.description,
          category: 'Profile',
          isProfile: true,
          profileType: isBead ? 'bead' : (isMullion ? 'mullion' : (isSash ? 'sash' : 'outer')),
          fallbackRate: defaultRate,
          inventoryList: activeInventory,
          targetUnit: 'KG',
        });
        const catWeight = lookupProfileWeight(p.itemCode, p.description, isBead ? 'bead' : (isMullion ? 'mullion' : (isSash ? 'sash' : 'outer')));
        const weightPerMtr = inv.weightPerMtr || catWeight;
        const weightKg = Math.round(lengthMtr * weightPerMtr * 100) / 100;
        const ratePerKg =
          inv.originalUnit === 'Kilogram' && inv.originalPrice
            ? inv.originalPrice
            : inv.matchedItem?.unit === 'Kilogram' && inv.matchedItem.price
            ? inv.matchedItem.price
            : 140;
        const cost = Math.round(weightKg * ratePerKg * 100) / 100;

        costBreakupRows.push({
          id: `cb-${cbCounter++}`,
          category: 'Profile',
          description: `${p.description} (${lengthMtr.toFixed(2)} Mtr)`,
          itemCode: p.itemCode,
          qty: weightKg,
          unit: 'KG',
          rate: ratePerKg,
          cost,
          fromInventory: inv.fromInventory,
          inventoryItemName: inv.matchedItem?.name,
          inventoryStockQty: inv.matchedItem?.stockQty,
          rateFormula: `₹${ratePerKg}/KG (@ ${weightPerMtr} kg/m = ₹${Math.round(ratePerKg * weightPerMtr * 10) / 10}/m)`,
          weightPerMtr,
          totalWeightKg: weightKg,
        });
      }
    });

    // B. Reinforcement Rows
    reinforcements.forEach((r) => {
      const isSashRi = r.itemCode.includes('60-03') || r.itemCode.includes('60-06');
      const defaultRate = isSashRi ? (isDoor ? 110 : 80) : 75;
      const inv = getInventoryItemPrice(r.itemCode, {
        name: r.description,
        category: 'Reinforcement',
        fallbackRate: defaultRate,
        inventoryList: activeInventory,
        targetUnit: 'Mtr',
      });
      const rate = inv.rate;
      const lengthMtr = Math.round(((r.dimension * r.quantity) / 1000) * 1000) / 1000;
      const cost = Math.round(lengthMtr * rate * 100) / 100;
      costBreakupRows.push({
        id: `cb-${cbCounter++}`,
        category: 'Reinforcement',
        description: r.description,
        itemCode: r.itemCode,
        qty: lengthMtr,
        unit: 'Mtr',
        rate,
        cost,
        fromInventory: inv.fromInventory,
        inventoryItemName: inv.matchedItem?.name,
        inventoryStockQty: inv.matchedItem?.stockQty,
      });
    });

    // C. Fabrication Hardware Rows
    hardwares.forEach((h) => {
      let defaultRate = 35;
      if (h.itemCode === 'UPVC HW-CDLS' || h.itemCode === 'UPVC-HW-CDLS' || h.description.includes('CMT DOOR LOCKING SET')) defaultRate = 1500.0;
      else if (h.itemCode === 'UPVC-HW-MLS' || h.description.includes('MORTIES DOOR LOCK SET') || h.description.includes('MORTISE')) defaultRate = 1000.0;
      else if (h.itemCode === 'UPVC-HW-3DH' || h.description.includes('3D HINGES')) defaultRate = 300.0;
      else if (h.itemCode === 'UPVC-HW-IB' || h.description.includes('INERTIA BLOCK')) defaultRate = 5.0;
      else if (h.itemCode === 'UPVC-HW-GP2MM' || (h.description.includes('GLASS PACKER') && h.description.includes('2MM'))) defaultRate = 0.60;
      else if (h.description.includes('FRICTION STAY')) defaultRate = fHeight <= 1000 ? 180 : (fHeight <= 1400 ? 230 : 280);
      else if (h.description.includes('HANDLE')) defaultRate = h.description.includes('ESPAG') ? 195 : 120;
      else if (h.description.includes('ESPAG')) defaultRate = 220;
      else if (h.description.includes('TOUCH LOCK')) defaultRate = 135;
      else if (h.description.includes('WHEEL') || h.description.includes('ROLLER')) defaultRate = 65;
      else if (h.description.includes('SHOOT BOLT')) defaultRate = 85;
      else if (h.description.includes('STRIKER')) defaultRate = 25;
      else if (h.description.includes('CAVITY BLOCK')) defaultRate = 8;
      else if (h.description.includes('PACKER')) defaultRate = 0.60;

      const unit = (h.unit as any) || 'Pcs';
      const inv = getInventoryItemPrice(h.itemCode, {
        name: h.description,
        category: 'Hardware',
        fallbackRate: defaultRate,
        inventoryList: activeInventory,
        targetUnit: unit,
      });
      const rate = inv.rate;
      const cost = Math.round(h.quantity * rate * 100) / 100;
      costBreakupRows.push({
        id: `cb-${cbCounter++}`,
        category: 'Fabrication Hardware',
        description: h.description,
        itemCode: h.itemCode,
        qty: h.quantity,
        unit,
        rate,
        cost,
        fromInventory: inv.fromInventory,
        inventoryItemName: inv.matchedItem?.name,
        inventoryStockQty: inv.matchedItem?.stockQty,
      });
    });

    // D. Screws Rows
    screws.forEach((s) => {
      let defaultRate = 1.25;
      if (s.itemCode === 'UPVC-HW-SHSC' || s.description.includes('SHUTTER HINGES SCREW')) {
        defaultRate = 2.50;
      } else if (s.itemCode === 'UPVC-HW-EBS' || s.description.includes('ESPAG BAR SCREW')) {
        defaultRate = 2.00;
      } else if (s.itemCode === 'UPVC-HW-CMTESS' || s.itemCode === 'UPVC-HW-EHS' || s.description.includes('STRIKER SCREW') || s.description.includes('HANDLE SCREW')) {
        defaultRate = 1.15;
      } else if (s.itemCode === 'UPVC-HW-ORISC' || s.itemCode === 'UPVC-HW-SRS' || s.itemCode === 'UPVC-HW-IBSC' || s.description.includes('RI SCREW') || s.description.includes('INERTIA BLOCK')) {
        defaultRate = 1.25;
      }

      const inv = getInventoryItemPrice(s.itemCode, {
        name: s.description,
        category: 'Hardware',
        fallbackRate: defaultRate,
        inventoryList: activeInventory,
        targetUnit: 'Pcs',
      });
      const rate = inv.rate;
      const cost = Math.round(s.quantity * rate * 100) / 100;
      costBreakupRows.push({
        id: `cb-${cbCounter++}`,
        category: 'Screws',
        description: s.description,
        itemCode: s.itemCode,
        qty: s.quantity,
        unit: 'Pcs',
        rate,
        cost,
        fromInventory: inv.fromInventory,
        inventoryItemName: inv.matchedItem?.name,
        inventoryStockQty: inv.matchedItem?.stockQty,
      });
    });

    // E. Installation Hardware Rows
    installation.forEach((i) => {
      const isSilicone = typeof i.quantity === 'string' && i.quantity.includes('CAN');
      const numQty = isSilicone ? parseFloat((i.quantity as string).split(' ')[0] || '1') : Number(i.quantity);
      let defaultRate = 0.60;
      if (isSilicone || i.itemCode === 'UPVC-HW-SI') defaultRate = 100.00;
      else if (i.description.includes('FASTNER SCREW') || i.description.includes('FASTENER SCREW') || i.itemCode.includes('N8 X 80') || i.itemCode === 'UPVC-HW-N8X80') defaultRate = 3.50;
      else if (i.description.includes('FASTNER CAP') || i.description.includes('FASTENER CAP') || i.itemCode === 'UPVC-HW-FC') defaultRate = 0.50;
      else if (i.description.includes('DRAINAGE') || i.itemCode === 'UPVC-HW-DC') defaultRate = 1.50;
      else if (i.description.includes('PACKER') || i.itemCode.startsWith('UPVC-HW-PP')) defaultRate = 0.60;

      const inv = getInventoryItemPrice(i.itemCode, {
        name: i.description,
        category: 'Other',
        fallbackRate: defaultRate,
        inventoryList: activeInventory,
        targetUnit: isSilicone ? 'CAN' : 'Pcs',
      });
      const rate = inv.rate;
      const cost = Math.round(numQty * rate * 100) / 100;
      costBreakupRows.push({
        id: `cb-${cbCounter++}`,
        category: 'Installation Hardware',
        description: i.description,
        itemCode: i.itemCode,
        qty: numQty,
        unit: isSilicone ? 'CAN' : 'Pcs',
        rate,
        cost,
        fromInventory: inv.fromInventory,
        inventoryItemName: inv.matchedItem?.name,
        inventoryStockQty: inv.matchedItem?.stockQty,
      });
    });

    // F. Gasket and Woolpile Rows
    // Check if any gasket in activeInventory has an explicitly configured price
    const masterGasketItem = activeInventory.find(i => 
      i.code === 'UPVC-HW-STARG' || 
      i.code === 'HW-GKT-EPDM' || 
      i.code === 'UPVC-HW-OUTERGKT' || 
      (i.name && i.name.toLowerCase().includes('gasket'))
    );
    const defaultGasketRate = (masterGasketItem && typeof masterGasketItem.price === 'number' && masterGasketItem.price >= 0) 
      ? masterGasketItem.price 
      : 0;

    gaskets.forEach((g) => {
      const isWoolpile = g.description.toLowerCase().includes('woolpile');
      const defaultRate = isWoolpile ? 6 : defaultGasketRate;
      const inv = getInventoryItemPrice(g.itemCode, {
        name: g.description,
        category: 'Hardware',
        fallbackRate: defaultRate,
        inventoryList: activeInventory,
        targetUnit: 'Mtr',
      });
      const rate = inv.rate;
      const lengthMtr = Math.round(((g.dimension * g.quantity) / 1000) * 1000) / 1000;
      const cost = Math.round(lengthMtr * rate * 100) / 100;
      costBreakupRows.push({
        id: `cb-${cbCounter++}`,
        category: 'Gasket and Woolpile',
        description: g.description,
        itemCode: g.itemCode,
        qty: lengthMtr,
        unit: 'Mtr',
        rate,
        cost,
        fromInventory: inv.fromInventory,
        inventoryItemName: inv.matchedItem?.name,
        inventoryStockQty: inv.matchedItem?.stockQty,
      });
    });

    // Resolve active pricing template if passed or in localStorage
    let activePricingTemplate: any[] | null = projectInfo?.pricingTemplate || null;
    if (!activePricingTemplate && typeof window !== 'undefined' && window.localStorage) {
      try {
        const custId = projectInfo?.referenceNo;
        const savedTplStr =
          (custId ? localStorage.getItem(`upvc_pricing_template_${custId}`) : null) ||
          localStorage.getItem('upvc_pricing_template_active') ||
          localStorage.getItem('upvc_pricing_template_global');
        if (savedTplStr) {
          activePricingTemplate = JSON.parse(savedTplStr);
        }
      } catch (e) {}
    }

    const getTplHeadRate = (id: number, fallback: number): number => {
      if (!activePricingTemplate || !Array.isArray(activePricingTemplate)) return fallback;
      const h = activePricingTemplate.find((x: any) => x && x.id === id);
      if (h && typeof h.rate === 'number' && !isNaN(h.rate)) return h.rate;
      return fallback;
    };

    // G. Glazing Rows (Calculated in Sq.Ft because user sets glass rates in Sq.Ft)
    const templateGlassRate = getTplHeadRate(6, 84);
    glazing.forEach((gl) => {
      // Area in Sq.Ft: (width * height * quantity) / 92903.04 sq.mm per sq.ft
      const glassAreaSqFt = Math.round(((gl.width * gl.height * gl.quantity) / 92903.04) * 1000) / 1000;
      const isMesh = gl.description.includes('FLYMESH') || gl.itemCode === 'MESH-FI';
      const defaultRate = isMesh ? 35 : (templateGlassRate || 84);
      const inv = getInventoryItemPrice(gl.itemCode || 'GL-FLOAT', {
        name: gl.description,
        category: 'Glass',
        fallbackRate: defaultRate,
        inventoryList: activeInventory,
        targetUnit: 'Sq.Ft',
      });
      const rate = inv.rate;
      const cost = Math.round(glassAreaSqFt * rate * 100) / 100;
      costBreakupRows.push({
        id: `cb-${cbCounter++}`,
        category: 'Glazing',
        description: gl.description,
        itemCode: gl.itemCode || 'GL-FLOAT',
        qty: glassAreaSqFt,
        unit: 'Sq.Ft',
        rate,
        cost,
        fromInventory: inv.fromInventory,
        inventoryItemName: inv.matchedItem?.name,
        inventoryStockQty: inv.matchedItem?.stockQty,
        rateFormula: `₹${rate}/Sq.Ft (${gl.description})`,
      });
    });

    // Compute Cost Breakup Summary
    const profileCost = Math.round(costBreakupRows.filter((r) => r.category === 'Profile').reduce((s, r) => s + r.cost, 0));
    const profileWastagePercent = getTplHeadRate(2, 10);
    const profileWastageCost = Math.round(profileCost * (profileWastagePercent / 100) * 100) / 100;

    const riCost = Math.round(costBreakupRows.filter((r) => r.category === 'Reinforcement').reduce((s, r) => s + r.cost, 0));
    const riWastagePercent = getTplHeadRate(4, 5);
    const riWastageCost = Math.round(riCost * (riWastagePercent / 100) * 100) / 100;

    const fabHwCost = costBreakupRows.filter((r) => r.category === 'Fabrication Hardware').reduce((s, r) => s + r.cost, 0);
    const screwCost = costBreakupRows.filter((r) => r.category === 'Screws').reduce((s, r) => s + r.cost, 0);
    const instHwCost = costBreakupRows.filter((r) => r.category === 'Installation Hardware').reduce((s, r) => s + r.cost, 0);
    const gasketCost = costBreakupRows.filter((r) => r.category === 'Gasket and Woolpile').reduce((s, r) => s + r.cost, 0);
    const hardwareCost = Math.round(fabHwCost + screwCost + instHwCost + gasketCost);

    const glassCost = Math.round(costBreakupRows.filter((r) => r.category === 'Glazing').reduce((s, r) => s + r.cost, 0) * 100) / 100;
    const glassWastagePercent = getTplHeadRate(7, 5);
    const glassWastageCost = Math.round(glassCost * (glassWastagePercent / 100) * 100) / 100;

    const totalRawMaterialCost = Math.round((profileCost + profileWastageCost + riCost + riWastageCost + hardwareCost + glassCost + glassWastageCost) * 100) / 100;

    const fabricationLabourRate = getTplHeadRate(9, 30);
    const fabricationLabourCost = Math.round(areaSqFt * fabricationLabourRate * 100) / 100;

    const installationLabourRate = getTplHeadRate(10, 50);
    const installationLabourCost = Math.round(areaSqFt * installationLabourRate * 100) / 100;

    const subTotalIncludingLabour = Math.round((totalRawMaterialCost + fabricationLabourCost + installationLabourCost) * 100) / 100;
    const profitPercent = getTplHeadRate(12, 10);
    const profitCost = Math.round(subTotalIncludingLabour * (profitPercent / 100) * 100) / 100;
    const extraCost = getTplHeadRate(13, 0);
    const basicValue = Math.round((subTotalIncludingLabour + profitCost + extraCost) * 100) / 100;
    const discountPercent = getTplHeadRate(15, 0);
    const discountAmount = Math.round(basicValue * (discountPercent / 100) * 100) / 100;
    const subTotal = Math.round((basicValue - discountAmount) * 100) / 100;
    // Calculate total customer window units for dividing lumpsum transport and loading/unloading
    let totalAssemblyUnits = Math.max(
      1,
      projectInfo?.totalCustomerUnits ||
      projectInfo?.totalProjectUnits ||
      (frames || []).reduce((sum, f) => sum + ((f as unknown as { quantity?: number }).quantity || 1), 0)
    );

    // If only 1 unit was derived but we are in the browser context with a customer project,
    // look up the total designs/windows for this customer so the lumpsum transport and loading
    // are divided fairly by the total number of customer windows as required by the factory workflow.
    if (totalAssemblyUnits <= 1 && typeof window !== 'undefined' && window.localStorage) {
      try {
        const custRef = projectInfo?.referenceNo || localStorage.getItem('upvc_active_customer_id');
        if (custRef) {
          const custDesignsStr =
            localStorage.getItem(`upvc_cust_designs_${custRef}`) ||
            (projectInfo?.referenceNo ? localStorage.getItem(`upvc_cust_designs_${projectInfo.referenceNo}`) : null);
          if (custDesignsStr) {
            const parsedDesigns = JSON.parse(custDesignsStr);
            if (Array.isArray(parsedDesigns) && parsedDesigns.length > 0) {
              const totalCustQty = parsedDesigns.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0);
              if (totalCustQty > 1) {
                totalAssemblyUnits = totalCustQty;
              }
            }
          }
        }
      } catch (e) {}
    }

    const transportTotalLump = getTplHeadRate(17, 1000);
    const loadingTotalLump = getTplHeadRate(18, 2000);
    // Per-window logistics share = Total Lumpsum divided by Total Customer Windows
    const transportationCost = Math.round((transportTotalLump / totalAssemblyUnits) * 100) / 100;
    const loadingUnloadingCost = Math.round((loadingTotalLump / totalAssemblyUnits) * 100) / 100;
    const totalProjectCost = Math.round((subTotal + transportationCost + loadingUnloadingCost) * 100) / 100;
    const gstPercent = getTplHeadRate(20, 18);
    const gstAmount = Math.round(totalProjectCost * (gstPercent / 100) * 100) / 100;
    const grandTotal = Math.round((totalProjectCost + gstAmount) * 100) / 100;

    const costSummary: import('../types/upvc').CostBreakupSummary = {
      profileCost,
      profileWastagePercent,
      profileWastageCost,
      riCost,
      riWastagePercent,
      riWastageCost,
      hardwareCost,
      glassCost,
      glassWastagePercent,
      glassWastageCost,
      totalRawMaterialCost,
      fabricationLabourRate,
      fabricationLabourCost,
      installationLabourRate,
      installationLabourCost,
      subTotalIncludingLabour,
      profitPercent,
      profitCost,
      extraCost,
      basicValue,
      discountPercent,
      discountAmount,
      subTotal,
      transportationCost,
      loadingUnloadingCost,
      totalAssemblyUnits,
      transportTotalLump,
      loadingTotalLump,
      totalProjectCost,
      gstPercent,
      gstAmount,
      grandTotal,
    };

    return {
      frameId: frame.id,
      frame: frame,
      frames: [frame],
      couplings: couplings || [],
      designRef: fName,
      projectName: projectInfo?.name || 'BALAJI TRADERS PROJECT',
      projectCode: projectInfo?.referenceNo || 'PRJ-2026-01',
      date: projectInfo?.date || new Date().toISOString().split('T')[0],
      width: fWidth,
      height: fHeight,
      quantity: 1,
      typologyType,
      brand: 'DURONPOLYVINYLSPVTLTD',
      series: resolvedSeriesName,
      profileFinish: profileFinish,
      handleDescription: handleName,
      shutterWeightKg: Math.max(5, shutterWeightKg),
      glassDescription: glassDescription,
      mesh: meshDescription,
      areaSqM,
      areaSqFt,
      profiles,
      reinforcements,
      hardwares,
      screws,
      gaskets,
      glazing,
      installation,
      costBreakupRows,
      costSummary,
    };
  });
}

/**
 * Factory Standard Silicone Sealant Calculation Formula:
 * Formula: (Height mm + Width mm) * 0.0005263
 * Output: Quantity of silicone sealant tubes / cartridges (CAN)
 *
 * Example:
 * Window 1000mm x 1000mm: (1000 + 1000) * 0.0005263 = 1.053 CAN (~1 tube)
 * Window 1200mm x 1500mm: (1500 + 1200) * 0.0005263 = 1.421 CAN
 * Door 2400mm x 2100mm:   (2100 + 2400) * 0.0005263 = 2.368 CAN
 */
export function calculateSiliconeSealantCans(widthMm: number, heightMm: number): number {
  return Number(((heightMm + widthMm) * 0.0005263).toFixed(3));
}

/**
 * Casement Window Espag Size Selection Rule (Fabricator Standard):
 * Applicable ONLY when using Casement Espag Handle (with key or without key):
 * - 400 - 800 mm height:  400 mm Espag  (UPVC-HW-20BS400)
 * - 801 - 1000 mm height: 600 mm Espag  (UPVC-HW-20BS600)   [900-1000]
 * - 1001 - 1200 mm height: 800 mm Espag (UPVC-HW-20BS800)  [1100-1200]
 * - 1201 - 1400 mm height: 1000 mm Espag (UPVC-HW-20BS1000) [1300-1400]
 * - 1401 - 1600 mm height: 1200 mm Espag (UPVC-HW-20BS1200) [1500-1600]
 * - 1601 mm+ height (1700+): 1400 mm Espag (UPVC-HW-20BS1400)
 */
export function getCasementEspagSelection(sashHeight: number): {
  length: number;
  code: string;
  name: string;
  strikers: number;
  defaultRate: number;
} {
  if (sashHeight <= 800) {
    return { length: 400, code: 'UPVC-HW-20BS400', name: '400mm Espag Gear Lock (UPVC-HW-20BS400)', strikers: 2, defaultRate: 102 };
  } else if (sashHeight <= 1000) {
    return { length: 600, code: 'UPVC-HW-20BS600', name: '600mm Espag Gear Lock (UPVC-HW-20BS600)', strikers: 2, defaultRate: 112 };
  } else if (sashHeight <= 1200) {
    return { length: 800, code: 'UPVC-HW-20BS800', name: '800mm Espag Gear Lock (UPVC-HW-20BS800)', strikers: 3, defaultRate: 121 };
  } else if (sashHeight <= 1400) {
    return { length: 1000, code: 'UPVC-HW-20BS1000', name: '1000mm Espag Gear Lock (UPVC-HW-20BS1000)', strikers: 3, defaultRate: 138 };
  } else if (sashHeight <= 1600) {
    return { length: 1200, code: 'UPVC-HW-20BS1200', name: '1200mm Espag Gear Lock (UPVC-HW-20BS1200)', strikers: 3, defaultRate: 153 };
  } else {
    return { length: 1400, code: 'UPVC-HW-20BS1400', name: '1400mm Espag Gear Lock (UPVC-HW-20BS1400)', strikers: 4, defaultRate: 175 };
  }
}

/**
 * Casement Door Hardware Configuration Interface
 * Maps exact handle, lock, espag, cylinder, 3D hinges, packers, inertia block, and screws.
 */
export interface CasementDoorHardwareConfig {
  hingesQty: number; // 4 Pcs
  hingesCode: string; // UPVC-HW-3DH
  hingesName: string; // 3D HINGES
  hingesRate: number; // 300.00 (Total ₹1200.00)
  hingesScrewQty: number; // 32 Pcs
  hingesScrewCode: string; // UPVC-HW-SHSC
  hingesScrewName: string; // SHUTTER HINGES SCREW
  hingesScrewRate: number; // 2.50 (Total ₹80.00)

  glassPackerQty: number; // 8 Pcs
  glassPackerRate: number; // 0.60
  inertiaBlockQty: number; // 1 Pcs
  inertiaBlockRate: number; // 5.00
  inertiaBlockScrewQty: number; // 1 Pcs
  inertiaBlockScrewRate: number; // 1.25

  isSelfContainedLock?: boolean; // true for CMT DOOR LOCKING SET & MORTIES DOOR LOCK SET

  handleName: string;
  handleCode: string;
  handleRate: number;
  handleUnit: 'PCS' | 'SET';

  hasEspag: boolean;
  espagLength?: number;
  espagCode?: string;
  espagName?: string;
  espagRate?: number;

  hasCylinder: boolean;
  cylinderCode?: string;
  cylinderName?: string;
  cylinderRate?: number;

  hasStrikers: boolean;
  strikerQty: number;
  strikerCode: string;
  strikerName: string;
  strikerRate: number;

  strikerScrewQty: number;
  strikerScrewRate: number;
  espagBarScrewQty: number;
  espagBarScrewRate: number;
  espagHandleScrewQty: number;
  espagHandleScrewRate: number;
}

/**
 * Determines exact Door hardware set based on Door Height and selected Handle / Lock:
 * 1. CMT DOOR LOCKING SET (UPVC HW-CDLS) - ₹1500 (Self-contained lock set, no separate espag/cylinder/strikers)
 * 2. MORTIES DOOR LOCK SET (UPVC-HW-MLS) - ₹1000 (Self-contained mortise set, no separate espag/cylinder/strikers)
 * 3. CASEMENT DOUBLE SIDE DOOR HANDLE WITH KEY (UPVC-HW-CMTDSDHKEY) - ₹520 + Cylinder ₹350 + Casement Door Espag with Cylinder (1600/1800/2000)
 * 4. CASEMENT DOUBLE SIDE DOOR HANDLE (UPVC-HW-CMTDSDH) - ₹520 + Casement 32mm BS Espag (1600/1800/2000)
 * 5. ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY) - ₹120 + Casement 30mm BS Espag (1600/1800/2000)
 * 6. ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK) - ₹110 + Casement 30mm BS Espag (1600/1800/2000)
 */
export function getCasementDoorHardwareConfiguration(
  doorHeight: number,
  hTypeOrCode: string = ''
): CasementDoorHardwareConfig {
  const norm = (hTypeOrCode || '').toLowerCase().trim();

  // Door Espag Length Sizing:
  // <= 2050mm: 1600mm
  // 2051 - 2200mm: 1800mm
  // > 2200mm: 2000mm
  const espagLen = doorHeight <= 2050 ? 1600 : doorHeight <= 2200 ? 1800 : 2000;

  const base = {
    hingesQty: 4,
    hingesCode: 'UPVC-HW-3DH',
    hingesName: '3D HINGES',
    hingesRate: 300.0,
    hingesScrewQty: 32,
    hingesScrewCode: 'UPVC-HW-SHSC',
    hingesScrewName: 'SHUTTER HINGES SCREW',
    hingesScrewRate: 2.5,

    glassPackerQty: 8,
    glassPackerRate: 0.6,
    inertiaBlockQty: 1,
    inertiaBlockRate: 5.0,
    inertiaBlockScrewQty: 1,
    inertiaBlockScrewRate: 1.25,

    strikerCode: 'UPVC-HW-CES',
    strikerName: 'CMT ESPAG STRIKER',
    strikerRate: 11.0,
    strikerScrewRate: 1.15,
    espagBarScrewRate: 2.0,
    espagHandleScrewRate: 1.15,
  };

  // 0. Explicit None / Dummy Pane
  if (norm === 'none' || norm === 'dummy') {
    return {
      ...base,
      handleName: 'NO OPERABLE HARDWARE',
      handleCode: 'NONE',
      handleRate: 0,
      handleUnit: 'PCS',
      hasEspag: false,
      hasCylinder: false,
      hasStrikers: false,
      strikerQty: 0,
      strikerScrewQty: 0,
      espagBarScrewQty: 0,
      espagHandleScrewQty: 0,
    };
  }

  // 1. CMT DOOR LOCKING SET
  if (norm.includes('cdls') || norm.includes('door_lock_set') || norm.includes('door locking set')) {
    return {
      ...base,
      isSelfContainedLock: true,
      handleName: 'CMT DOOR LOCKING SET',
      handleCode: 'UPVC HW-CDLS',
      handleRate: 1500.0,
      handleUnit: 'PCS',
      hasEspag: false,
      hasCylinder: false,
      hasStrikers: false,
      strikerQty: 0,
      strikerScrewQty: 0,
      espagBarScrewQty: 0,
      espagHandleScrewQty: 0,
    };
  }

  // 2. MORTIES DOOR LOCK SET
  if (norm.includes('mls') || norm.includes('mortise') || norm.includes('morties')) {
    return {
      ...base,
      isSelfContainedLock: true,
      handleName: 'MORTIES DOOR LOCK SET',
      handleCode: 'UPVC-HW-MLS',
      handleRate: 1000.0,
      handleUnit: 'SET',
      hasEspag: false,
      hasCylinder: false,
      hasStrikers: false,
      strikerQty: 0,
      strikerScrewQty: 0,
      espagBarScrewQty: 0,
      espagHandleScrewQty: 0,
    };
  }

  // 3. MODERN SQUARE ROSETTE LEVER
  if (norm.includes('msl') || norm.includes('modern_square_lever') || norm.includes('modern square') || norm.includes('rosette')) {
    const espRate = espagLen === 2000 ? 405.0 : 385.0;
    return {
      ...base,
      handleName: 'MODERN SQUARE ROSETTE LEVER',
      handleCode: 'UPVC-HW-MSL',
      handleRate: 980.0,
      handleUnit: 'SET',
      hasEspag: true,
      espagLength: espagLen,
      espagCode: `UPVC-HW-CDECYL${espagLen}`,
      espagName: `CASEMENT DOOR ESPAG WITH CYLINDER ${espagLen}`,
      espagRate: espRate,
      hasCylinder: true,
      cylinderCode: 'UPVC-HW-CYL',
      cylinderName: 'CYLINDER',
      cylinderRate: 350.0,
      hasStrikers: true,
      strikerQty: 4,
      strikerScrewQty: 8,
      espagBarScrewQty: 6,
      espagHandleScrewQty: 2,
    };
  }

  // 4. CASEMENT DOUBLE SIDE DOOR HANDLE WITH KEY
  if (
    norm.includes('cmtdsdhkey') ||
    norm.includes('door_double_side_key') ||
    (norm.includes('double') && norm.includes('key'))
  ) {
    const espRate = espagLen === 2000 ? 405.0 : 385.0;
    return {
      ...base,
      handleName: 'CASEMENT DOUBLE SIDE DOOR HANDLE WITH KEY',
      handleCode: 'UPVC-HW-CMTDSDHKEY',
      handleRate: 520.0,
      handleUnit: 'PCS',
      hasEspag: true,
      espagLength: espagLen,
      espagCode: `UPVC-HW-CDECYL${espagLen}`,
      espagName: `CASEMENT DOOR ESPAG WITH CYLINDER ${espagLen}`,
      espagRate: espRate,
      hasCylinder: true,
      cylinderCode: 'UPVC-HW-CYL',
      cylinderName: 'CYLINDER',
      cylinderRate: 350.0,
      hasStrikers: true,
      strikerQty: 4,
      strikerScrewQty: 8,
      espagBarScrewQty: 6,
      espagHandleScrewQty: 2,
    };
  }

  // 5. CASEMENT DOUBLE SIDE DOOR HANDLE (WITHOUT KEY) / DOOR LEVER
  if (
    norm.includes('cmtdsdh') ||
    norm.includes('door_double_side') ||
    norm.includes('door_lever') ||
    norm.includes('double side') ||
    norm.includes('lever')
  ) {
    const espRate = espagLen === 2000 ? 405.0 : 385.0;
    return {
      ...base,
      handleName: 'CASEMENT DOUBLE SIDE DOOR HANDLE',
      handleCode: 'UPVC-HW-CMTDSDH',
      handleRate: 520.0,
      handleUnit: 'PCS',
      hasEspag: true,
      espagLength: espagLen,
      espagCode: `UPVC-HW-32BS${espagLen}`,
      espagName: `CASEMENT 32MM BS ESPAG ${espagLen}`,
      espagRate: espRate,
      hasCylinder: false,
      hasStrikers: true,
      strikerQty: 4,
      strikerScrewQty: 8,
      espagBarScrewQty: 6,
      espagHandleScrewQty: 2,
    };
  }

  // 6. ESPAG HANDLE WITH KEY
  if (norm.includes('scehkey') || norm.includes('espag_key') || (norm.includes('espag') && norm.includes('key'))) {
    const espRate = espagLen === 2000 ? 300.0 : espagLen === 1800 ? 265.0 : 250.0;
    return {
      ...base,
      handleName: 'ESPAG HANDLE WITH KEY',
      handleCode: 'UPVC-HW-SCEHKEY',
      handleRate: 120.0,
      handleUnit: 'PCS',
      hasEspag: true,
      espagLength: espagLen,
      espagCode: `UPVC-HW-30BS${espagLen}`,
      espagName: `CASEMENT 30MM BS ESPAG ${espagLen}`,
      espagRate: espRate,
      hasCylinder: false,
      hasStrikers: true,
      strikerQty: 4,
      strikerScrewQty: 8,
      espagBarScrewQty: 6,
      espagHandleScrewQty: 2,
    };
  }

  // 7. COCKSPUR HANDLES
  if (norm.includes('chl') || norm.includes('cockspur_left')) {
    return {
      ...base,
      handleName: 'COCKSPUR HANDLE LEFT',
      handleCode: 'UPVC-HW-CHL',
      handleRate: 180.0,
      handleUnit: 'PCS',
      hasEspag: false,
      hasCylinder: false,
      hasStrikers: false,
      strikerQty: 0,
      strikerScrewQty: 0,
      espagBarScrewQty: 0,
      espagHandleScrewQty: 0,
    };
  }

  if (norm.includes('chr') || norm.includes('cockspur')) {
    return {
      ...base,
      handleName: 'COCKSPUR HANDLE RIGHT',
      handleCode: 'UPVC-HW-CHR',
      handleRate: 180.0,
      handleUnit: 'PCS',
      hasEspag: false,
      hasCylinder: false,
      hasStrikers: false,
      strikerQty: 0,
      strikerScrewQty: 0,
      espagBarScrewQty: 0,
      espagHandleScrewQty: 0,
    };
  }

  // 8. DEFAULT: ESPAG HANDLE WITHOUT KEY
  const espRate = espagLen === 2000 ? 300.0 : espagLen === 1800 ? 265.0 : 250.0;
  return {
    ...base,
    handleName: 'ESPAG HANDLE WITHOUT KEY',
    handleCode: 'UPVC-HW-SCEHWK',
    handleRate: 110.0,
    handleUnit: 'PCS',
    hasEspag: true,
    espagLength: espagLen,
    espagCode: `UPVC-HW-30BS${espagLen}`,
    espagName: `CASEMENT 30MM BS ESPAG ${espagLen}`,
    espagRate: espRate,
    hasCylinder: false,
    hasStrikers: true,
    strikerQty: 4,
    strikerScrewQty: 8,
    espagBarScrewQty: 6,
    espagHandleScrewQty: 2,
  };
}

