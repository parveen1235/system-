import { UPVCFrame, FramePocket } from '../types/upvc';

export interface HandlePlacement {
  x: number;
  y: number;
  orientation: 'left' | 'right' | 'top' | 'bottom' | 'center';
  side: 'left' | 'right' | 'center' | 'top' | 'bottom';
  shouldShow: boolean;
}

/**
 * Determines whether a sliding pocket should display a sliding handle,
 * matching CadCanvas.tsx 1:1.
 */
export function shouldShowSlidingHandle(
  frame: UPVCFrame,
  pocket: FramePocket,
  pIdx: number
): boolean {
  const sashType = pocket.sashType || '';
  if (sashType === 'slider_fixed_center' || sashType === 'fixed' || (sashType as string) === 'openable_none') {
    return false;
  }

  const numPockets = frame.pockets ? frame.pockets.length : 1;
  if (numPockets <= 2) return true;
  if (numPockets === 3) {
    return pIdx === 0 || pIdx === 2;
  }
  if (numPockets === 4) {
    // 4-Panel slider: S1 (0) on left jamb, S2 (1) & S3 (2) at center meeting, S4 (3) on right jamb
    return pIdx === 0 || pIdx === 1 || pIdx === 2 || pIdx === 3;
  }
  if (numPockets === 5) {
    // 5-Panel slider: S1 (0) on left jamb, S3 (2) & S4 (3) at center meeting, S5 (4) on right jamb
    return pIdx === 0 || pIdx === 2 || pIdx === 3 || pIdx === 4;
  }
  if (numPockets === 6) {
    // 3-Track 6-Panel slider: S1 (0) on left jamb, S3 (2) & S4 (3) at center meeting (बीच में लॉक), S6 (5) on right jamb
    return pIdx === 0 || pIdx === 2 || pIdx === 3 || pIdx === 5;
  }
  return pIdx === 0 || pIdx === numPockets - 1;
}

/**
 * Calculates the exact stile center X and GHH Y coordinate, side, and orientation
 * for any sash pocket (sliding, casement, hung, etc.), matching CadCanvas.tsx 1:1.
 */
export function calculateHandlePlacement(
  frame: UPVCFrame,
  pocket: FramePocket,
  pIdx: number
): HandlePlacement {
  const pX = (frame.x || 0) + pocket.x;
  const pY = (frame.y || 0) + pocket.y;
  const pW = pocket.width;
  const pH = pocket.height;
  const cX = pX + pW / 2;
  const cY = pY + pH / 2;

  const isMeshSashOnly =
    pocket.sashType === 'mesh_sash' ||
    pocket.sashType === 'mesh_slider_right' ||
    pocket.sashType === 'mesh_slider_left' ||
    pocket.sashType === 'slider_3t_2p_mesh' ||
    pocket.sashType === 'slider_2s_with_mesh' ||
    pocket.sashType === 'slider_3s_mesh';
  const isSlider =
    (frame.series || '').toLowerCase().includes('sliding') ||
    (frame.pockets || []).some((p) => (p.sashType || '').startsWith('slider_')) ||
    (pocket.sashType || '').startsWith('slider');

  const sashLabelText = pocket.customLabel || (isSlider ? `S${pIdx + 1}` : `S${pIdx + 1}`);

  const isBackTrack =
    isSlider &&
    !isMeshSashOnly &&
    (sashLabelText === 'S1' ||
      (frame.pockets?.length === 2 && pIdx === 0) ||
      (frame.pockets?.length === 3 && (pIdx === 0 || pIdx === 1) && !isMeshSashOnly) ||
      (frame.pockets?.length === 4 && (pIdx === 0 || pIdx === 3)) ||
      (frame.pockets?.length === 6 && (pIdx === 0 || pIdx === 5)));

  const isFrontTrack =
    isSlider &&
    !isMeshSashOnly &&
    (sashLabelText === 'S2' ||
      (frame.pockets?.length === 2 && pIdx === 1) ||
      (frame.pockets?.length === 3 && pIdx === 2) ||
      (frame.pockets?.length === 4 && (pIdx === 1 || pIdx === 2)) ||
      (frame.pockets?.length === 6 && (pIdx === 2 || pIdx === 3)));

  const isSlidingAssembly = isSlider && frame.pockets && frame.pockets.length > 1;
  const hasLeftSlider = isSlidingAssembly && pIdx > 0 && !isMeshSashOnly;
  const hasRightSlider = isSlidingAssembly && pIdx < (frame.pockets?.length || 1) - 1 && !isMeshSashOnly;

  const overlapLeft = isFrontTrack && hasLeftSlider ? 14 : 0;
  const overlapRight = isBackTrack && hasRightSlider ? 14 : 0;

  const actualSashX = pX - overlapLeft;
  const actualSashW = pocket.width + overlapLeft + overlapRight;

  const isSash = !['fixed', 'openable_none', 'louvers', 'upvc_panel'].includes(pocket.sashType || '');

  const sashFaceW = isSlider
    ? Math.max(22, Math.min(Math.round(pocket.width * 0.12), Math.round(pocket.height * 0.12), 28))
    : isSash
    ? Math.max(30, Math.min(Math.round(pocket.width * 0.18), Math.round(pocket.height * 0.18), 42))
    : 0;

  const interlockW = isSlider ? 16 : sashFaceW;
  const leftSashOffset = isFrontTrack && hasLeftSlider ? interlockW : sashFaceW;
  const rightSashOffset = isBackTrack && hasRightSlider ? interlockW : sashFaceW;

  const stileOffset = Math.max(14, sashFaceW > 0 ? sashFaceW / 2 : 18);
  const leftStileCenterX = actualSashX + Math.max(14, leftSashOffset / 2);
  const rightStileCenterX = actualSashX + actualSashW - Math.max(14, rightSashOffset / 2);
  const bottomRailCenterY = pY + pH - stileOffset;
  const topRailCenterY = pY + stileOffset;

  // Vertical GHH Calculation
  const fNameLower = (frame.name || '').toLowerCase();
  const isCasementWindow = [
    'casement',
    'casement_left',
    'casement_right',
    'top_hung',
    'bottom_hung',
    'tilt_turn',
    'french_open',
  ].includes(pocket.sashType || '');

  const isExplicitWindow =
    pocket.applicationType === 'window' ||
    fNameLower.startsWith('w') ||
    fNameLower.includes('window') ||
    (frame.series || '').toLowerCase().includes('window');

  const isExplicitDoor =
    pocket.applicationType === 'door' ||
    fNameLower.startsWith('d') ||
    fNameLower.includes('door') ||
    frame.series === 'door_premium' ||
    (frame.series || '').toLowerCase().includes('door') ||
    pocket.sashType === 'casement_door_4side' ||
    pocket.sashType === 'casement_door_3side' ||
    Boolean(pocket.handleType && pocket.handleType.includes('door_lever'));

  // Casement windows are NOT doors even if height >= 2100mm
  const isDoor = !isCasementWindow && (isExplicitDoor || (!isExplicitWindow && pocket.applicationType !== 'window' && (fNameLower.includes('door') || (frame.series || '').toLowerCase().includes('door'))));

  let handleY = cY;
  const ghh = pocket.handleHeight;
  const frameH = frame.height || pH;
  const frameY = frame.y || 0;

  if (ghh && ghh >= 60 && ghh <= frameH - 40) {
    const isPocketOnFloor = (pocket.y + pocket.height) >= frameH - 80;
    const targetY = isPocketOnFloor ? (frameY + frameH - ghh) : (pY + pH - ghh);
    handleY = Math.max(pY + 60, Math.min(pY + pH - 60, targetY));
  } else if (isDoor) {
    const doorGHH = 1000;
    const isPocketOnFloor = (pocket.y + pocket.height) >= frameH - 80;
    const targetY = isPocketOnFloor ? (frameY + frameH - doorGHH) : (pY + pH - doorGHH);
    handleY = Math.max(pY + 60, Math.min(pY + pH - 60, targetY));
  } else {
    // For casement and standard windows without custom GHH, handle is centered on the sash
    handleY = cY;
  }

  // Determine stile side (Left, Right, Bottom, Top)
  let side: 'left' | 'right' | 'center' | 'top' | 'bottom';
  const fProfileW = frame.frameProfileWidth || 60;
  const isAgainstLeftFrame = pocket.x <= fProfileW + 15;
  const isAgainstRightFrame = pocket.x + pocket.width >= (frame.width || 1200) - fProfileW - 15;
  const isLeftHalf = pocket.x + pocket.width / 2 < (frame.width || 1200) / 2;

  const isSlidingSash =
    (pocket.sashType || '').startsWith('slider') ||
    (pocket.sashType || '').startsWith('mesh_slider') ||
    pocket.sashType === 'mesh_sash';

  const numPockets = frame.pockets ? frame.pockets.length : 1;

  if (isSlidingSash) {
    if (numPockets === 4) {
      // 2-Track 4-Panel: S1 on left jamb, S2 & S3 on center meeting (बीच में लॉक), S4 on right jamb
      if (pIdx === 0) side = 'left';
      else if (pIdx === 1) side = 'right';
      else if (pIdx === 2) side = 'left';
      else if (pIdx === 3) side = 'right';
      else side = 'right';
    } else if (numPockets === 5) {
      // 3-Track 5-Panel: S1 on left jamb, S3 & S4 on center meeting, S5 on right jamb
      if (pIdx === 0) side = 'left';
      else if (pIdx === 2) side = 'right';
      else if (pIdx === 3) side = 'left';
      else if (pIdx === 4) side = 'right';
      else side = 'right';
    } else if (numPockets === 6) {
      // 3-Track 6-Panel: S1 on left jamb, S3 & S4 on center meeting (बीच में लॉक), S6 on right jamb
      if (pIdx === 0) side = 'left';
      else if (pIdx === 1) side = 'right';
      else if (pIdx === 2) side = 'right';
      else if (pIdx === 3) side = 'left';
      else if (pIdx === 4) side = 'left';
      else if (pIdx === 5) side = 'right';
      else side = isLeftHalf ? 'left' : 'right';
    } else if (pocket.sashType === 'slider_arrow_right' || pocket.sashType === 'slider_2s_xo') {
      side = 'left';
    } else if (pocket.sashType === 'slider_arrow_left' || pocket.sashType === 'slider_2s_ox') {
      side = 'right';
    } else if (pocket.sashType === 'slider_2s') {
      side = 'left';
    } else if (pocket.handlePosition === 'left' || pocket.handlePosition === 'right') {
      // Prevent misplacement to center interlock
      if (isLeftHalf && pocket.handlePosition === 'right' && !isAgainstRightFrame) {
        side = 'left';
      } else if (!isLeftHalf && pocket.handlePosition === 'left' && !isAgainstLeftFrame) {
        side = 'right';
      } else {
        side = pocket.handlePosition;
      }
    } else {
      side = isLeftHalf ? 'left' : 'right';
    }
  } else if (pocket.sashType === 'casement_left') {
    // "LEFT OPEN" (बायाँ ओपनिंग पल्ला): Always opens on Left stile, handle on Left, apex points Left
    side = 'left';
  } else if (pocket.sashType === 'casement_right') {
    // "RIGHT OPEN" (दायाँ ओपनिंग पल्ला): Always opens on Right stile, handle on Right, apex points Right
    side = 'right';
  } else if (pocket.sashType === 'top_hung') {
    side = 'bottom';
  } else if (pocket.sashType === 'bottom_hung') {
    side = 'top';
  } else if (pocket.handlePosition && (pocket.handlePosition as any) !== 'auto') {
    // Explicit user override from Inspector or Properties: respect directly without inversion
    side = pocket.handlePosition;
  } else {
    // Natural handle side based on handle model, sash direction, and frame geometry:
    const handleType = (pocket.handleType || '').toLowerCase();
    if (handleType.includes('cockspur_left') || handleType.includes('touch_left') || handleType.includes('handle_left')) {
      side = 'left';
    } else if (handleType.includes('cockspur_right') || handleType.includes('touch_right') || handleType.includes('handle_right')) {
      side = 'right';
    } else if (pocket.sashType === 'casement_door_4side' || pocket.sashType === 'casement_door_3side') {
      // Door sash defaults towards the outer frame jamb or center
      side = isAgainstRightFrame ? 'right' : isAgainstLeftFrame ? 'left' : (isLeftHalf ? 'left' : 'right');
    } else if (pocket.sashType === 'tilt_turn') {
      side = isAgainstRightFrame ? 'right' : isAgainstLeftFrame ? 'left' : (isLeftHalf ? 'right' : 'left');
    } else {
      side = isAgainstRightFrame ? 'right' : isAgainstLeftFrame ? 'left' : (isLeftHalf ? 'left' : 'right');
    }
  }

  let orientation: 'left' | 'right' | 'top' | 'bottom' | 'center' = 'center';
  let handleX = cX;
  if (side === 'left') {
    handleX = leftStileCenterX;
    orientation = 'right';
  } else if (side === 'right') {
    handleX = rightStileCenterX;
    orientation = 'left';
  } else if (side === 'bottom') {
    handleX = cX;
    handleY = bottomRailCenterY;
    orientation = 'bottom';
  } else if (side === 'top') {
    handleX = cX;
    handleY = topRailCenterY;
    orientation = 'top';
  }

  const shouldShow = isSlidingSash
    ? shouldShowSlidingHandle(frame, pocket, pIdx)
    : pocket.sashType !== 'fixed' && (pocket.sashType as string) !== 'openable_none' && (pocket.sashType as string) !== 'louver' && (pocket.sashType as string) !== 'louvers';

  return {
    x: handleX,
    y: handleY,
    orientation,
    side,
    shouldShow,
  };
}

/**
 * Returns the correct slide arrow direction for technical drawings, matching factory presets.
 */
export function getSlidingArrowDirection(
  frame: UPVCFrame,
  pocket: FramePocket,
  pIdx: number
): 'left' | 'right' | 'both' | 'none' {
  const sashType = pocket.sashType || '';
  if (sashType === 'slider_fixed_center' || sashType === 'fixed' || (sashType as string) === 'openable_none') {
    return 'none';
  }

  const numPockets = frame.pockets ? frame.pockets.length : 1;
  const vMullCount = frame.mullions ? frame.mullions.filter((m) => m.orientation === 'vertical').length : 0;
  const is6Panel =
    numPockets === 6 ||
    vMullCount === 5 ||
    (numPockets !== 4 &&
      (frame.name?.toLowerCase().includes('6-panel') ||
        frame.name?.toLowerCase().includes('6 panel') ||
        frame.name?.toLowerCase().includes('6s')));

  if (is6Panel) {
    // 6-Panel Slider: S2 (2nd panel / 2 sare, pIdx === 1) and S5 (5th panel / 5 wave, pIdx === 4) MUST HAVE ARROW ON BOTH SIDES (<-> / दोनों तरफ)
    if (pIdx === 1 || pIdx === 4) return 'both';
    if (sashType === 'slider_arrow_left') return 'left';
    if (sashType === 'slider_arrow_right') return 'right';
    if (sashType === 'slider_arrow_both') return 'both';
    return pIdx === 0 || pIdx === 3 ? 'right' : 'left';
  }

  if (sashType === 'slider_arrow_left') return 'left';
  if (sashType === 'slider_arrow_right') return 'right';
  if (sashType === 'slider_arrow_both') return 'both';
  if (sashType === 'slider_2s_xo') {
    return pIdx === 0 ? 'right' : 'none';
  }
  if (sashType === 'slider_2s_ox') {
    return pIdx === 1 ? 'left' : 'none';
  }
  if (sashType === 'slider_2s' || sashType === 'slider_2s_xx') {
    return pIdx === 0 ? 'right' : 'left';
  }
  if (sashType === 'slider_3s_oxo') {
    return pIdx === 0 ? 'right' : pIdx === 1 ? 'none' : 'left';
  }
  if (sashType === 'slider_3s' || sashType === 'slider_3s_xxx') {
    return 'both';
  }
  const is3Track =
    frame.series?.includes('88') ||
    frame.series?.includes('3track') ||
    (frame.name || '').toLowerCase().includes('3-track') ||
    (frame.name || '').toLowerCase().includes('3 track');
  if (is3Track && numPockets === 3) {
    // 3-Track 3-Panel standard: all 3 panels are on independent rails and slide both directions
    return 'both';
  }
  return (pocket.x + pocket.width / 2) < (frame.width || 1200) / 2 ? 'right' : 'left';
}

