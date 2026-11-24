import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UPVCFrame, CouplingConnection, FramePocket } from '../types/upvc';
import {
  DEFAULT_COLORS,
  recalculateFramePockets,
  calculateAssemblyBounds,
  resolveFramePositions,
} from '../utils/upvcCalculations';
import { HardwareHandle } from './HardwareHandle';
import {
  calculateHandlePlacement,
  shouldShowSlidingHandle,
  getSlidingArrowDirection,
} from '../utils/handlePlacement';
import { Maximize2, X, Download, Printer, Layers, Info } from 'lucide-react';
import { getGlassDisplayName } from '../utils/glassUtils';

export interface CadElevationSvgProps {
  frame?: UPVCFrame;
  frames?: UPVCFrame[];
  couplings?: CouplingConnection[];
  showDimensions?: boolean;
  showLabels?: boolean;
  showHandles?: boolean;
  showArrows?: boolean;
  badgeTag?: string;
  isExport?: boolean;
  exportTitle?: string;
  excelLegibilityMode?: boolean;
  className?: string;
  onPocketClick?: (frameIndex: number, pocketIndex: number) => void;
}

export interface CadElevationDrawingProps {
  frame?: UPVCFrame;
  frames?: UPVCFrame[];
  couplings?: CouplingConnection[];
  width?: number | string;
  height?: number | string;
  showDimensions?: boolean;
  showLabels?: boolean;
  showHandles?: boolean;
  showArrows?: boolean;
  allowEnlarge?: boolean;
  title?: string;
  className?: string;
  badgeTag?: string;
  excelLegibilityMode?: boolean;
  onPocketClick?: (frameIndex: number, pocketIndex: number) => void;
}

export const CadElevationSvg: React.FC<CadElevationSvgProps> = ({
  frame,
  frames: propFrames,
  couplings = [],
  showDimensions = true,
  showLabels = true,
  showHandles = true,
  showArrows = true,
  badgeTag,
  isExport = false,
  excelLegibilityMode = false,
  exportTitle,
  className = 'w-full h-full select-none',
  onPocketClick,
}) => {
  // 1. Prepare and resolve frames
  const rawFrames: UPVCFrame[] = propFrames && propFrames.length > 0
    ? propFrames
    : frame
    ? [frame]
    : [];

  if (rawFrames.length === 0) {
    return (
      <svg
        viewBox="0 0 400 300"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="400" height="300" fill="#f8fafc" stroke="#cbd5e1" strokeDasharray="4 4" />
        <text x="200" y="155" textAnchor="middle" fill="#94a3b8" fontSize="13" fontFamily="sans-serif">
          No Frame Geometry
        </text>
      </svg>
    );
  }

  // Resolve multi-frame positions with 2mm couplers
  const positionedFrames = resolveFramePositions(rawFrames, couplings);
  const activeFrames: UPVCFrame[] = positionedFrames.map((f) => {
    const pockets = f.pockets && f.pockets.length > 0 ? f.pockets : recalculateFramePockets(f);
    return { ...f, pockets };
  });

  const bounds = calculateAssemblyBounds(activeFrames);
  const totalW = bounds.totalWidth || 1000;
  const totalH = bounds.totalHeight || 1000;

  // Dynamic scale factor for text, witness arrows, and handles
  const maxSpan = Math.max(totalW, totalH, 500);
  const scale = Math.max(0.9, maxSpan / 850);
  const handleScale = Math.max(0.85, Math.min(2.2, scale * 0.9));

  // Collect all multi-bay segments across frames for Tier 1 Bay Dimensioning
  // Synchronized with CadCanvas.tsx: only take base frames (bottom-most in each column) to prevent vertically stacked frames from colliding at bottom
  const baseFramesForBays: UPVCFrame[] = [];
  const sortedFrames = [...activeFrames].sort((a, b) => a.x - b.x);
  for (const f of sortedFrames) {
    const existing = baseFramesForBays.find((bf) => Math.abs(bf.x - f.x) <= 20 && Math.abs(bf.width - f.width) <= 20);
    if (!existing) {
      baseFramesForBays.push(f);
    } else if ((f.y + f.height) > (existing.y + existing.height)) {
      const idx = baseFramesForBays.indexOf(existing);
      baseFramesForBays[idx] = f;
    }
  }

  const baySegments: { x1: number; x2: number; width: number; label: string; frame: UPVCFrame }[] = [];
  baseFramesForBays.forEach((frame) => {
    // 1. Sliding window check: Panels ALWAYS divide the frame width equally!
    const isSlider = frame.series?.startsWith('sliding') ||
      (frame.pockets || []).some((p) => p.sashType && (p.sashType.startsWith('slider_') || p.sashType === 'mesh_sash'));

    if (isSlider) {
      const vMulls = (frame.mullions || []).filter((m) => m.orientation === 'vertical');
      const bottomPockets = (frame.pockets || []).filter((p) => {
        const maxPktY = Math.max(...(frame.pockets || []).map((pk) => pk.y));
        return Math.abs(p.y - maxPktY) < 15;
      });
      const numPanels = Math.max(2, vMulls.length > 0 ? vMulls.length + 1 : (bottomPockets.length > 0 ? bottomPockets.length : 2));
      const exactPanelW = frame.width / numPanels;
      const displayW = exactPanelW % 1 === 0 ? exactPanelW : Number(exactPanelW.toFixed(1));

      for (let pIdx = 0; pIdx < numPanels; pIdx++) {
        const startX = frame.x + pIdx * exactPanelW;
        const endX = pIdx === numPanels - 1 ? frame.x + frame.width : frame.x + (pIdx + 1) * exactPanelW;
        baySegments.push({
          x1: startX,
          x2: endX,
          width: displayW,
          frame,
          label: `S${pIdx + 1}`,
        });
      }
    } else {
      // 2. Regular Casement / Fixed / Partitioned Frames with vertical mullions
      const vMulls = (frame.mullions || [])
        .filter((m) => m.orientation === 'vertical')
        .sort((a, b) => a.position - b.position);

      // Filter unique vertical partition lines across frame
      const uniqueVPositions: number[] = [];
      vMulls.forEach((m) => {
        if (!uniqueVPositions.some((p) => Math.abs(p - m.position) < 5)) {
          uniqueVPositions.push(m.position);
        }
      });

      if (uniqueVPositions.length > 0) {
        let prevX = frame.x;
        uniqueVPositions.forEach((pos, idx) => {
          const mX = frame.x + pos;
          const w = Math.round(mX - prevX);
          baySegments.push({
            x1: prevX,
            x2: mX,
            width: w,
            label: `Bay ${idx + 1}`,
            frame,
          });
          prevX = mX;
        });
        const lastW = Math.round(frame.x + frame.width - prevX);
        baySegments.push({
          x1: prevX,
          x2: frame.x + frame.width,
          width: lastW,
          label: `Bay ${uniqueVPositions.length + 1}`,
          frame,
        });
      } else {
        const pCount = (frame.pockets || []).length;
        let numPanels = 1;
        if (pCount > 1) {
          // Only split if pockets are in a single horizontal row
          const firstPktY = frame.pockets?.[0]?.y || 0;
          const isSingleRow = frame.pockets?.every((p) => Math.abs(p.y - firstPktY) < 10);
          if (isSingleRow) {
            numPanels = pCount;
          }
        }

        if (numPanels > 1) {
          const exactPanelW = frame.width / numPanels;
          const displayW = exactPanelW % 1 === 0 ? exactPanelW : Number(exactPanelW.toFixed(1));
          for (let pIdx = 0; pIdx < numPanels; pIdx++) {
            const startX = frame.x + pIdx * exactPanelW;
            const endX = pIdx === numPanels - 1 ? frame.x + frame.width : frame.x + (pIdx + 1) * exactPanelW;
            baySegments.push({
              x1: startX,
              x2: endX,
              width: displayW,
              frame,
              label: `S${pIdx + 1}`,
            });
          }
        } else {
          // Single panel / fixed / single pocket frame - ALWAYS PRESERVE FRAME WIDTH IN BAY TIER!
          baySegments.push({
            x1: frame.x,
            x2: frame.x + frame.width,
            width: Math.round(frame.width),
            frame,
            label: frame.name || 'Frame',
          });
        }
      }
    }
  });

  // Sort bay segments strictly from left to right across the assembly
  baySegments.sort((a, b) => a.x1 - b.x1);
  const hasBays = baySegments.length > 1;

  const hasSlidingFrame = activeFrames.some(
    (f) =>
      f.series?.startsWith('sliding') ||
      (f.pockets || []).some((p) => p.sashType?.startsWith('slider_') || p.sashType === 'mesh_sash')
  );

  // Big, bold architectural CAD dimension typography (matching EvaWin reference: 1759 on left, 1149/1150/2299/4597 at bottom)
  // Scaled proportionally so numbers are always large, crisp and readable even in small Excel columns (107px x 299px)
  const dimFontSize = Math.max(
    excelLegibilityMode ? 54 : 44,
    Math.min(excelLegibilityMode ? 150 : 115, Math.round(maxSpan * 0.058))
  );
  const segFontSize = Math.max(
    excelLegibilityMode ? 46 : 36,
    Math.min(excelLegibilityMode ? 130 : 95, Math.round(dimFontSize * 0.86))
  );
  const frameFontSize = Math.max(
    excelLegibilityMode ? 50 : 40,
    Math.min(excelLegibilityMode ? 140 : 105, Math.round(dimFontSize * 0.92))
  );

  // Layout Tiers below frame exactly matching industrial CAD benchmark:
  // 1. Tier 1 Bay / Sash Width Dimensions (e.g. 1149, 1150)
  // 2. Tier 2 Individual Frame Width Dimensions (e.g. 2299, 2299 for multi-frame)
  // 3. Tier 3 Total Assembly Outer Width Dimension (e.g. 4597)
  // 4. Track Cross-Section Plan (OUT / IN, Rails R1/R2/R3, S1/S2/Mesh blocks)
  // 5. Manufacturing Title Block (suppressed in excelLegibilityMode to maximize cell drawing area!)
  const trackPlanTierH = (hasSlidingFrame && showLabels) ? Math.max(76, Math.round(82 * Math.min(1.2, scale))) : 0;
  const showTitleBlock = showLabels && !excelLegibilityMode;
  const titleBlockTierH = showTitleBlock ? Math.max(54, Math.round(60 * Math.min(1.2, scale))) : 0;
  const titleBoxH = Math.max(40, titleBlockTierH - 10);

  // Dynamic vertical progression coordinates with clear gaps:
  let curY = bounds.maxY;

  // 1. Tier 1 Bay / Sash Dimensions (if multi-bay or multi-sash)
  let bayDimY = 0;
  if (showDimensions && hasBays) {
    const tier1Gap = Math.max(44, Math.round(segFontSize * 0.95));
    bayDimY = curY + tier1Gap;
    curY = bayDimY + Math.round(segFontSize * 0.5);
  }

  // Tier 2 Individual Frame Dimensions (only for frames that are side-by-side to prevent vertically stacked frames from colliding)
  const horizFrames: UPVCFrame[] = [];
  const sortedFramesByX = [...activeFrames].sort((a, b) => a.x - b.x);
  for (const f of sortedFramesByX) {
    if (!horizFrames.some((hf) => Math.abs(hf.x - f.x) <= 20)) {
      horizFrames.push(f);
    }
  }
  const hasMultiFrame = showDimensions && horizFrames.length > 1;
  let frameDimY = 0;
  if (hasMultiFrame) {
    const tier2Gap = Math.max(46, Math.round(frameFontSize * 0.95));
    frameDimY = curY + tier2Gap;
    curY = frameDimY + Math.round(frameFontSize * 0.5);
  }

  // Collect vertical height segments across frames and horizontal mullions for Left Height Chain
  const heightSegments: { y1: number; y2: number; height: number }[] = [];
  activeFrames.forEach((frame) => {
    const hMulls = (frame.mullions || [])
      .filter((m) => m.orientation === 'horizontal')
      .sort((a, b) => a.position - b.position);

    if (hMulls.length > 0) {
      const cutPoints = [0, ...hMulls.map((m) => m.position), frame.height];
      for (let i = 0; i < cutPoints.length - 1; i++) {
        const y1 = frame.y + cutPoints[i];
        const y2 = frame.y + cutPoints[i + 1];
        const segH = Math.round(cutPoints[i + 1] - cutPoints[i]);
        if (!heightSegments.some((s) => Math.abs(s.y1 - y1) <= 15 && Math.abs(s.y2 - y2) <= 15)) {
          heightSegments.push({ y1, y2, height: segH });
        }
      }
    } else {
      const y1 = frame.y;
      const y2 = frame.y + frame.height;
      const segH = Math.round(frame.height);
      if (!heightSegments.some((s) => Math.abs(s.y1 - y1) <= 15 && Math.abs(s.y2 - y2) <= 15)) {
        heightSegments.push({ y1, y2, height: segH });
      }
    }
  });
  heightSegments.sort((a, b) => a.y1 - b.y1);
  const hasHeightTiers = showDimensions && heightSegments.length > 1;

  // 3. Tier 3 Total Outer Assembly Width Dimension
  let totalDimY = 0;
  if (showDimensions) {
    const tier3Gap = Math.max(50, Math.round(dimFontSize * 0.95));
    totalDimY = curY + tier3Gap;
    curY = totalDimY + Math.round(dimFontSize * 0.7) + Math.max(20, Math.round(18 * scale));
  }

  // 4. Track Cross-Section Plan (OUT / IN)
  let trackPlanY = 0;
  const trackPlanBadgeH = Math.max(18, Math.round(20 * scale));
  if (hasSlidingFrame && showLabels) {
    curY += Math.max(34, Math.round(28 * scale)) + trackPlanBadgeH;
    trackPlanY = curY;
    curY += trackPlanTierH + Math.max(22, Math.round(18 * scale));
  }

  // 5. Manufacturing Title Block (placed cleanly at the bottom, never at y=0!)
  let titleBlockY = 0;
  if (showTitleBlock) {
    curY += Math.max(26, Math.round(22 * scale));
    titleBlockY = curY;
    curY += titleBoxH;
  }

  // Dedicated left dimension spacing:
  // Offset of vertical dimension line from frame:
  const leftDimOffset = showDimensions ? Math.max(52, Math.round(dimFontSize * 0.95)) : 0;
  const heightTierOffset = hasHeightTiers ? Math.max(48, Math.round(dimFontSize * 0.95)) : 0;
  // Rotated height number extends textH / 2 in SVG X direction (~0.65 * dimFontSize) + witness line extension + safety margin
  const textHalfH = Math.round(dimFontSize * 0.75);
  const leftSafetyBuffer = Math.max(45, Math.round(dimFontSize * 0.7));
  const dimMarginLeft = showDimensions ? (leftDimOffset + heightTierOffset + textHalfH + leftSafetyBuffer) : (isExport ? 30 : 25);
  const dimMarginTop = Math.max(55, Math.round(26 * scale) + 25); // Clean top with ample clearance for couplers & badges!
  const dimMarginRight = (hasSlidingFrame && showLabels) 
    ? Math.max(150, Math.round(130 * scale)) 
    : Math.max(70, Math.round(55 * scale)); // Generous room for right frame border, witness lines, arrowheads & sash handles!
  const dimMarginBottom = Math.max(isExport ? 35 : 26, (curY - bounds.maxY) + (isExport ? 30 : 24));

  const viewBoxMinX = bounds.minX - dimMarginLeft;
  const viewBoxMinY = bounds.minY - dimMarginTop;
  const viewBoxW = totalW + dimMarginLeft + dimMarginRight;
  const viewBoxH = totalH + dimMarginTop + dimMarginBottom;

  // Color lookup helper
  const getHexColor = (colorId?: string) => {
    if (!colorId) return '#ffffff';
    const found = DEFAULT_COLORS.find((c) => c.id === colorId);
    return found ? found.hex : '#ffffff';
  };

  const primaryFrame = activeFrames[0];
  const frameColorHex = getHexColor(primaryFrame?.color);

  return (
    <svg
      viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewBoxW} ${viewBoxH}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      {/* If export, provide crisp white CAD background and subtle technical border */}
      {isExport && (
        <>
          <rect
            x={viewBoxMinX}
            y={viewBoxMinY}
            width={viewBoxW}
            height={viewBoxH}
            fill="#ffffff"
          />
          <rect
            x={viewBoxMinX + 2}
            y={viewBoxMinY + 2}
            width={viewBoxW - 4}
            height={viewBoxH - 4}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={Math.max(1.5, 2 * scale)}
            rx="6"
          />
        </>
      )}
        <defs>
          {/* Vibrant Architectural Glass Gradients (Permanently Anti-Monochrome) */}
          <linearGradient id="cadCardGlassShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.98" />
            <stop offset="45%" stopColor="#bae6fd" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.98" />
          </linearGradient>

          <linearGradient id="sashFrontGlassShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.98" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.98" />
          </linearGradient>

          <linearGradient id="sashBackGlassShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c7e9fb" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#a5d8f7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7ec4f0" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="cadCardTintShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" stopOpacity="0.92" />
            <stop offset="50%" stopColor="#1e293b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="cadCardFrostedShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="cadCardDguShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="cadCardBrownShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b45309" stopOpacity="0.92" />
            <stop offset="60%" stopColor="#78350f" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#451a03" stopOpacity="0.95" />
          </linearGradient>

          {/* Hardware Handle Metallic Gradients */}
          <linearGradient id="cadHandleSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#e2e8f0" />
            <stop offset="60%" stopColor="#94a3b8" />
            <stop offset="85%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="cadCardHandleSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#e2e8f0" />
            <stop offset="60%" stopColor="#94a3b8" />
            <stop offset="85%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id="cadHandleDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="cadCardHandleDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="cadHandleGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
          <linearGradient id="cadCardHandleGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>

          <linearGradient id="cadHandleWhite" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="cadCardHandleWhite" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Fly Mesh Diamond Wire Pattern - Scaled with Frame Dimensions for Ultra-Crisp High-Contrast Visibility */}
          {(() => {
            const meshTileSize = Math.max(22, Math.round(26 * scale));
            const meshWireStroke = Math.max(1.1, Number((1.2 * scale).toFixed(2)));
            const meshBorderStroke = Math.max(0.65, Number((0.65 * scale).toFixed(2)));
            return (
              <>
                <pattern id="flyMeshDiamondPattern" width={meshTileSize} height={meshTileSize} patternUnits="userSpaceOnUse">
                  <rect width={meshTileSize} height={meshTileSize} fill="#0f172a" fillOpacity="0.08" />
                  <rect width={meshTileSize} height={meshTileSize} fill="#0284c7" fillOpacity="0.04" />
                  <path
                    d={`M 0 0 L ${meshTileSize} ${meshTileSize} M ${meshTileSize} 0 L 0 ${meshTileSize}`}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={meshWireStroke}
                    strokeOpacity="0.85"
                  />
                  <path
                    d={`M 0 ${meshTileSize / 2} L ${meshTileSize} ${meshTileSize / 2} M ${meshTileSize / 2} 0 L ${meshTileSize / 2} ${meshTileSize}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={meshBorderStroke}
                    strokeOpacity="0.65"
                  />
                  <rect
                    x="0"
                    y="0"
                    width={meshTileSize}
                    height={meshTileSize}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={meshBorderStroke}
                    strokeOpacity="0.5"
                  />
                </pattern>

                <pattern id="flyMeshDiamond" width={meshTileSize} height={meshTileSize} patternUnits="userSpaceOnUse">
                  <rect width={meshTileSize} height={meshTileSize} fill="#0f172a" fillOpacity="0.08" />
                  <rect width={meshTileSize} height={meshTileSize} fill="#0284c7" fillOpacity="0.04" />
                  <path
                    d={`M 0 0 L ${meshTileSize} ${meshTileSize} M ${meshTileSize} 0 L 0 ${meshTileSize}`}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={meshWireStroke}
                    strokeOpacity="0.85"
                  />
                  <path
                    d={`M 0 ${meshTileSize / 2} L ${meshTileSize} ${meshTileSize / 2} M ${meshTileSize / 2} 0 L ${meshTileSize / 2} ${meshTileSize}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={meshBorderStroke}
                    strokeOpacity="0.65"
                  />
                  <rect
                    x="0"
                    y="0"
                    width={meshTileSize}
                    height={meshTileSize}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={meshBorderStroke}
                    strokeOpacity="0.5"
                  />
                </pattern>
              </>
            );
          })()}

          {/* Overlap Shadow for 2.5D Sliding Sashes (Matching CadCanvas 1:1) */}
          <linearGradient id="sashOverlapShadowGrad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#0f172a" stopOpacity="0.32" />
            <stop offset="70%" stopColor="#0f172a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>

          <filter id="sashFrontShadow" x="-30%" y="-10%" width="160%" height="120%">
            <feDropShadow dx="-5" dy="0" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.45" />
          </filter>

          <pattern id="slidingGlassGrid" width="22" height="22" patternUnits="userSpaceOnUse">
            <rect width="22" height="22" fill="#c3ebfa" />
            <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#a2daf5" strokeWidth="0.8" />
          </pattern>

          {/* Realistic Exhaust Fan & Window AC Gradients */}
          <radialGradient id="fanHoleDepth" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="1" />
          </radialGradient>

          <linearGradient id="fanBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="40%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          <radialGradient id="fanMotorHubGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="45%" stopColor="#0284c7" />
            <stop offset="90%" stopColor="#075985" />
            <stop offset="100%" stopColor="#0c4a6e" />
          </radialGradient>

          <linearGradient id="acCasingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#f8fafc" />
            <stop offset="85%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          <linearGradient id="acLouverBladeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          <linearGradient id="acDisplayGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#090d16" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <pattern id="acFilterMesh" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#0f172a" fillOpacity="0.25" />
            <path d="M 0 0 L 4 4 M 4 0 L 0 4" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.6" />
          </pattern>

          {/* Authentic cyan diamond lattice pattern for mesh sashes (matching EvaWin benchmark) */}
          <pattern id="cadEvaMeshDiamond" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#d9f2fd" />
            <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="#38bdf8" strokeWidth="0.75" strokeOpacity="0.9" />
          </pattern>

          <linearGradient id="cadEvaGlassCyan" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#cbeffd" />
          </linearGradient>

          {/* Authentic Georgian Bar / Dorgen Bar Gradients for Image & Drawing Export */}
          {/* 1. Golden Brass Bar */}
          <linearGradient id="georgianGoldGradH" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="75%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          <linearGradient id="georgianGoldGradV" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="75%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* 2. Pure White Bar */}
          <linearGradient id="georgianWhiteGradH" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="25%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="georgianWhiteGradV" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="25%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* 3. Matt Black Bar */}
          <linearGradient id="georgianBlackGradH" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#09090b" />
            <stop offset="35%" stopColor="#27272a" />
            <stop offset="65%" stopColor="#3f3f46" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>
          <linearGradient id="georgianBlackGradV" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#09090b" />
            <stop offset="35%" stopColor="#27272a" />
            <stop offset="65%" stopColor="#3f3f46" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>

          {/* 4. Silver Aluminium Bar */}
          <linearGradient id="georgianSilverGradH" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="30%" stopColor="#f8fafc" />
            <stop offset="70%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="georgianSilverGradV" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="30%" stopColor="#f8fafc" />
            <stop offset="70%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* 5. Architectural Bronze Bar */}
          <linearGradient id="georgianBronzeGradH" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="30%" stopColor="#92400e" />
            <stop offset="70%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#290e03" />
          </linearGradient>
          <linearGradient id="georgianBronzeGradV" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="30%" stopColor="#92400e" />
            <stop offset="70%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#290e03" />
          </linearGradient>
        </defs>

        {/* ------------------------------------------------------------- */}
        {/* 1. ARCHITECTURAL EXTERNAL DIMENSION WITNESS LINES & NUMBERS */}
        {/* ------------------------------------------------------------- */}
        {showDimensions && (
          <g id="cad-outer-dimension-lines" pointerEvents="none">
            {/* 1. Left Height Dimensions: Upper & Lower Parts have SEPARATE arrows, Outer arrow has Total Height */}
            {(() => {
              const arrowH = Math.max(16, Math.round(dimFontSize * 0.65));
              const arrowW = Math.max(5, Math.round(dimFontSize * 0.18));
              const segArrowH = Math.max(14, Math.round(segFontSize * 0.65));
              const segArrowW = Math.max(4.5, Math.round(segFontSize * 0.18));

              if (hasHeightTiers) {
                // Dual-tier height chain:
                // Inner Tier 1: Separate arrows for Upper Part (Uper wala) and Lower Part (Niche wala)
                // Outer Tier 2: Total Assembly Height arrow
                const innerDimX = bounds.minX - leftDimOffset;
                const outerDimX = innerDimX - heightTierOffset;
                const totalValStr = `${Math.round(totalH)}`;
                const totalTextW = totalValStr.length * dimFontSize * 0.62 + 10;
                const totalTextH = dimFontSize * 1.15;

                return (
                  <g id="dimension-left-height-multi-tier">
                    {/* Inner Tier: Distinct arrow for EACH vertical segment (Upper / Lower / Transom) */}
                    {heightSegments.map((seg, sIdx) => {
                      const actualSegArrowH = Math.min(segArrowH, Math.max(6, (seg.y2 - seg.y1) * 0.22));
                      const segValStr = `${seg.height}`;
                      const segTextW = segValStr.length * segFontSize * 0.62 + 8;
                      const segTextH = segFontSize * 1.15;
                      const segMidY = (seg.y1 + seg.y2) / 2;

                      return (
                        <g key={`height-seg-${sIdx}`}>
                          {/* Horizontal witness lines out to inner dimension line */}
                          <line
                            x1={bounds.minX}
                            y1={seg.y1}
                            x2={innerDimX - 8}
                            y2={seg.y1}
                            stroke="#000000"
                            strokeWidth={Math.max(0.8, 1 * scale)}
                          />
                          <line
                            x1={bounds.minX}
                            y1={seg.y2}
                            x2={innerDimX - 8}
                            y2={seg.y2}
                            stroke="#000000"
                            strokeWidth={Math.max(0.8, 1 * scale)}
                          />
                          {/* Segment vertical arrow line */}
                          <line
                            x1={innerDimX}
                            y1={seg.y1}
                            x2={innerDimX}
                            y2={seg.y2}
                            stroke="#000000"
                            strokeWidth={Math.max(1, 1.2 * scale)}
                          />
                          {/* Top arrowhead */}
                          <polygon
                            points={`${innerDimX},${seg.y1} ${innerDimX - segArrowW},${seg.y1 + actualSegArrowH} ${innerDimX + segArrowW},${seg.y1 + actualSegArrowH}`}
                            fill="#000000"
                          />
                          {/* Bottom arrowhead */}
                          <polygon
                            points={`${innerDimX},${seg.y2} ${innerDimX - segArrowW},${seg.y2 - actualSegArrowH} ${innerDimX + segArrowW},${seg.y2 - actualSegArrowH}`}
                            fill="#000000"
                          />
                          {/* Rotated dimension number with clean background mask */}
                          <g transform={`translate(${innerDimX}, ${segMidY}) rotate(-90)`}>
                            <rect
                              x={-segTextW / 2}
                              y={-segTextH / 2}
                              width={segTextW}
                              height={segTextH}
                              fill="#ffffff"
                            />
                            <text
                              x="0"
                              y={segFontSize * 0.35}
                              textAnchor="middle"
                              fill="#000000"
                              fontSize={segFontSize}
                              fontWeight="700"
                              fontFamily="Arial, Helvetica, -apple-system, sans-serif"
                            >
                              {segValStr}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* Outer Tier: Total Assembly Height arrow */}
                    {/* Top & Bottom Horizontal Extension Witness Lines */}
                    <line
                      x1={innerDimX - 8}
                      y1={bounds.minY}
                      x2={outerDimX - 8}
                      y2={bounds.minY}
                      stroke="#000000"
                      strokeWidth={Math.max(0.8, 1 * scale)}
                    />
                    <line
                      x1={innerDimX - 8}
                      y1={bounds.maxY}
                      x2={outerDimX - 8}
                      y2={bounds.maxY}
                      stroke="#000000"
                      strokeWidth={Math.max(0.8, 1 * scale)}
                    />
                    {/* Total vertical dimension arrow line */}
                    <line
                      x1={outerDimX}
                      y1={bounds.minY}
                      x2={outerDimX}
                      y2={bounds.maxY}
                      stroke="#000000"
                      strokeWidth={Math.max(1, 1.2 * scale)}
                    />
                    {/* Top Arrowhead */}
                    <polygon
                      points={`${outerDimX},${bounds.minY} ${outerDimX - arrowW},${bounds.minY + arrowH} ${outerDimX + arrowW},${bounds.minY + arrowH}`}
                      fill="#000000"
                    />
                    {/* Bottom Arrowhead */}
                    <polygon
                      points={`${outerDimX},${bounds.maxY} ${outerDimX - arrowW},${bounds.maxY - arrowH} ${outerDimX + arrowW},${bounds.maxY - arrowH}`}
                      fill="#000000"
                    />
                    {/* Total Height Number */}
                    <g transform={`translate(${outerDimX}, ${(bounds.minY + bounds.maxY) / 2}) rotate(-90)`}>
                      <rect
                        x={-totalTextW / 2}
                        y={-totalTextH / 2}
                        width={totalTextW}
                        height={totalTextH}
                        fill="#ffffff"
                      />
                      <text
                        x="0"
                        y={dimFontSize * 0.35}
                        textAnchor="middle"
                        fill="#000000"
                        fontSize={dimFontSize}
                        fontWeight="700"
                        fontFamily="Arial, Helvetica, -apple-system, sans-serif"
                      >
                        {totalValStr}
                      </text>
                    </g>
                  </g>
                );
              }

              // Single vertical tier (no horizontal mullions, single row)
              const dimX = bounds.minX - leftDimOffset;
              const valStr = `${Math.round(totalH)}`;
              const textW = valStr.length * dimFontSize * 0.62 + 10;
              const textH = dimFontSize * 1.15;

              return (
                <g id="dimension-left-height">
                  {/* Top & Bottom Horizontal Extension Witness Lines */}
                  <line
                    x1={bounds.minX}
                    y1={bounds.minY}
                    x2={dimX - 8}
                    y2={bounds.minY}
                    stroke="#000000"
                    strokeWidth={Math.max(0.8, 1 * scale)}
                  />
                  <line
                    x1={bounds.minX}
                    y1={bounds.maxY}
                    x2={dimX - 8}
                    y2={bounds.maxY}
                    stroke="#000000"
                    strokeWidth={Math.max(0.8, 1 * scale)}
                  />
                  {/* Vertical Dimension Arrow Line */}
                  <line
                    x1={dimX}
                    y1={bounds.minY}
                    x2={dimX}
                    y2={bounds.maxY}
                    stroke="#000000"
                    strokeWidth={Math.max(1, 1.2 * scale)}
                  />
                  {/* Top Arrowhead */}
                  <polygon
                    points={`${dimX},${bounds.minY} ${dimX - arrowW},${bounds.minY + arrowH} ${dimX + arrowW},${bounds.minY + arrowH}`}
                    fill="#000000"
                  />
                  {/* Bottom Arrowhead */}
                  <polygon
                    points={`${dimX},${bounds.maxY} ${dimX - arrowW},${bounds.maxY - arrowH} ${dimX + arrowW},${bounds.maxY - arrowH}`}
                    fill="#000000"
                  />
                  {/* Center Dimension Number (Rotated -90 degrees, pure high contrast) */}
                  <g transform={`translate(${dimX}, ${(bounds.minY + bounds.maxY) / 2}) rotate(-90)`}>
                    <rect
                      x={-textW / 2}
                      y={-textH / 2}
                      width={textW}
                      height={textH}
                      fill="#ffffff"
                    />
                    <text
                      x="0"
                      y={dimFontSize * 0.35}
                      textAnchor="middle"
                      fill="#000000"
                      fontSize={dimFontSize}
                      fontWeight="700"
                      fontFamily="Arial, Helvetica, -apple-system, sans-serif"
                    >
                      {valStr}
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* Tier 1. Individual Bay / Sash Dimensions (e.g. 1149, 1150) */}
            {hasBays && (
              <g id="dimension-tier1-bays">
                {baySegments.map((seg, sIdx) => {
                  const segW = seg.width;
                  const midX = (seg.x1 + seg.x2) / 2;
                  const arrowH = Math.max(14, Math.round(segFontSize * 0.65));
                  const arrowW = Math.max(4.5, Math.round(segFontSize * 0.18));
                  const actualArrowH = Math.min(arrowH, Math.max(6, (seg.x2 - seg.x1) * 0.22));
                  const valStr = `${segW}`;
                  const textW = valStr.length * segFontSize * 0.62 + 8;
                  const textH = segFontSize * 1.15;
                  const witnessStartY = seg.frame ? seg.frame.y + seg.frame.height + 2 : bounds.maxY + 2;

                  return (
                    <g key={`bay-seg-${sIdx}`}>
                      {/* Extension Witness Lines down from Frame Bottom */}
                      <line
                        x1={seg.x1}
                        y1={witnessStartY}
                        x2={seg.x1}
                        y2={bayDimY + 8}
                        stroke="#000000"
                        strokeWidth={Math.max(0.8, 1 * scale)}
                      />
                      <line
                        x1={seg.x2}
                        y1={witnessStartY}
                        x2={seg.x2}
                        y2={bayDimY + 8}
                        stroke="#000000"
                        strokeWidth={Math.max(0.8, 1 * scale)}
                      />
                      {/* Horizontal Dimension Arrow Line */}
                      <line
                        x1={seg.x1}
                        y1={bayDimY}
                        x2={seg.x2}
                        y2={bayDimY}
                        stroke="#000000"
                        strokeWidth={Math.max(1, 1.2 * scale)}
                      />
                      {/* Left Arrowhead */}
                      <polygon
                        points={`${seg.x1},${bayDimY} ${seg.x1 + actualArrowH},${bayDimY - arrowW} ${seg.x1 + actualArrowH},${bayDimY + arrowW}`}
                        fill="#000000"
                      />
                      {/* Right Arrowhead */}
                      <polygon
                        points={`${seg.x2},${bayDimY} ${seg.x2 - actualArrowH},${bayDimY - arrowW} ${seg.x2 - actualArrowH},${bayDimY + arrowW}`}
                        fill="#000000"
                      />
                      {/* Bay Dimension Number (Clean white mask, no border, matching reference image) */}
                      <g transform={`translate(${midX}, ${bayDimY})`}>
                        <rect
                          x={-textW / 2}
                          y={-textH / 2}
                          width={textW}
                          height={textH}
                          fill="#ffffff"
                        />
                        <text
                          x="0"
                          y={segFontSize * 0.35}
                          textAnchor="middle"
                          fill="#000000"
                          fontSize={segFontSize}
                          fontWeight="700"
                          fontFamily="Arial, Helvetica, -apple-system, sans-serif"
                        >
                          {valStr}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Tier 2. Individual Frame Widths for Multi-Frame Assemblies (only for side-by-side frames!) */}
            {hasMultiFrame && (
              <g id="dimension-tier2-frames">
                {horizFrames.map((f, fIdx) => {
                  const arrowH = Math.max(16, Math.round(frameFontSize * 0.65));
                  const arrowW = Math.max(5, Math.round(frameFontSize * 0.18));
                  const actualArrowH = Math.min(arrowH, Math.max(8, f.width * 0.22));
                  const valStr = `${Math.round(f.width)}`;
                  const textW = valStr.length * frameFontSize * 0.62 + 10;
                  const textH = frameFontSize * 1.15;
                  const witnessStartY = hasBays ? bayDimY + 8 : bounds.maxY + 2;

                  return (
                    <g key={`frame-dim-${f.id}`}>
                      {/* Witness lines at left & right of frame */}
                      <line
                        x1={f.x}
                        y1={witnessStartY}
                        x2={f.x}
                        y2={frameDimY + 8}
                        stroke="#000000"
                        strokeWidth={Math.max(0.8, 1 * scale)}
                      />
                      <line
                        x1={f.x + f.width}
                        y1={witnessStartY}
                        x2={f.x + f.width}
                        y2={frameDimY + 8}
                        stroke="#000000"
                        strokeWidth={Math.max(0.8, 1 * scale)}
                      />
                      {/* Dimension arrow line */}
                      <line
                        x1={f.x}
                        y1={frameDimY}
                        x2={f.x + f.width}
                        y2={frameDimY}
                        stroke="#000000"
                        strokeWidth={Math.max(1, 1.2 * scale)}
                      />
                      <polygon
                        points={`${f.x},${frameDimY} ${f.x + actualArrowH},${frameDimY - arrowW} ${f.x + actualArrowH},${frameDimY + arrowW}`}
                        fill="#000000"
                      />
                      <polygon
                        points={`${f.x + f.width},${frameDimY} ${f.x + f.width - actualArrowH},${frameDimY - arrowW} ${f.x + f.width - actualArrowH},${frameDimY + arrowW}`}
                        fill="#000000"
                      />
                      {/* Frame Width Number */}
                      <g transform={`translate(${f.x + f.width / 2}, ${frameDimY})`}>
                        <rect
                          x={-textW / 2}
                          y={-textH / 2}
                          width={textW}
                          height={textH}
                          fill="#ffffff"
                        />
                        <text
                          x="0"
                          y={frameFontSize * 0.35}
                          textAnchor="middle"
                          fill="#000000"
                          fontSize={frameFontSize}
                          fontWeight="700"
                          fontFamily="Arial, Helvetica, -apple-system, sans-serif"
                        >
                          {valStr}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Tier 3. Total Overall Assembly Width (e.g. 4597) */}
            {(() => {
              const arrowH = Math.max(18, Math.round(dimFontSize * 0.65));
              const arrowW = Math.max(5.5, Math.round(dimFontSize * 0.18));
              const valStr = `${Math.round(totalW)}`;
              const textW = valStr.length * dimFontSize * 0.62 + 12;
              const textH = dimFontSize * 1.15;
              const witnessStartY = hasMultiFrame
                ? frameDimY + 8
                : hasBays
                ? bayDimY + 8
                : bounds.maxY + 2;

              return (
                <g id="dimension-tier3-total-width">
                  {/* Left & Right Vertical Extension Witness Lines */}
                  <line
                    x1={bounds.minX}
                    y1={witnessStartY}
                    x2={bounds.minX}
                    y2={totalDimY + 10}
                    stroke="#000000"
                    strokeWidth={Math.max(0.8, 1 * scale)}
                  />
                  <line
                    x1={bounds.maxX}
                    y1={witnessStartY}
                    x2={bounds.maxX}
                    y2={totalDimY + 10}
                    stroke="#000000"
                    strokeWidth={Math.max(0.8, 1 * scale)}
                  />
                  {/* Horizontal Dimension Arrow Line */}
                  <line
                    x1={bounds.minX}
                    y1={totalDimY}
                    x2={bounds.maxX}
                    y2={totalDimY}
                    stroke="#000000"
                    strokeWidth={Math.max(1, 1.2 * scale)}
                  />
                  {/* Left Arrowhead */}
                  <polygon
                    points={`${bounds.minX},${totalDimY} ${bounds.minX + arrowH},${totalDimY - arrowW} ${bounds.minX + arrowH},${totalDimY + arrowW}`}
                    fill="#000000"
                  />
                  {/* Right Arrowhead */}
                  <polygon
                    points={`${bounds.maxX},${totalDimY} ${bounds.maxX - arrowH},${totalDimY - arrowW} ${bounds.maxX - arrowH},${totalDimY + arrowW}`}
                    fill="#000000"
                  />
                  {/* Center Dimension Number */}
                  <g transform={`translate(${(bounds.minX + bounds.maxX) / 2}, ${totalDimY})`}>
                    <rect
                      x={-textW / 2}
                      y={-textH / 2}
                      width={textW}
                      height={textH}
                      fill="#ffffff"
                    />
                    <text
                      x="0"
                      y={dimFontSize * 0.35}
                      textAnchor="middle"
                      fill="#000000"
                      fontSize={dimFontSize}
                      fontWeight="700"
                      fontFamily="Arial, Helvetica, -apple-system, sans-serif"
                    >
                      {valStr}
                    </text>
                  </g>
                </g>
              );
            })()}
          </g>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. 2mm COUPLING EXPANSION JOINTS (IF MULTI-FRAME COUPLING) */}
        {/* ------------------------------------------------------------- */}
        {couplings.map((c) => {
          const src = activeFrames.find((f) => f.id === c.sourceFrameId);
          const tgt = activeFrames.find((f) => f.id === c.targetFrameId);
          if (!src || !tgt) return null;

          const isHorizontal = c.type === 'horizontal' || src.x !== tgt.x;
          const gap = c.gap || 2;
          const cX = isHorizontal ? src.x + src.width : Math.min(src.x, tgt.x);
          const cY = isHorizontal ? Math.min(src.y, tgt.y) : src.y + src.height;
          const cW = isHorizontal ? gap : Math.max(src.width, tgt.width);
          const cH = isHorizontal ? Math.max(src.height, tgt.height) : gap;

          return (
            <g key={c.id} id={`coupling-${c.id}`}>
              <rect
                x={cX}
                y={cY}
                width={cW}
                height={cH}
                fill="#f59e0b"
                stroke="#b45309"
                strokeWidth={Math.max(1, 1.5 * scale)}
              />
              <text
                x={cX + cW / 2}
                y={cY - Math.max(8, 12 * scale)}
                fontSize={Math.max(11, Math.min(22, 13 * scale))}
                fontWeight="900"
                fill="#b45309"
                textAnchor="middle"
              >
                {gap}mm Coupler
              </text>
            </g>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* 3. FRAMES RENDERING (WITH EXACT 45° MITRE JOINTS & PROFILES) */}
        {/* ------------------------------------------------------------- */}
        {activeFrames.map((f, fIdx) => {
          const fpw = f.frameProfileWidth || 60;
          const mpw = f.mullionProfileWidth || 74;
          const colorHex = getHexColor(f.color);
          const isDarkProfile =
            f.color === 'anthracite' ||
            f.color === 'black' ||
            f.color === 'dark_oak' ||
            f.color === 'walnut';

          const strokeColor = isDarkProfile ? '#ffffff' : '#0f172a';
          const mitreStroke = isDarkProfile ? '#94a3b8' : '#334155';
          const is3Side = Boolean(
            f.isThreeSidedFrame ||
            f.frameSides === '3_side' ||
            (f.pockets || []).some((p) => p.isThreeSidedFrame || p.frameSides === '3_side')
          );
          const trackCount = f.series === 'sliding_88' || (f.pockets && f.pockets.length > 2) || (f.pockets || []).some(p => p.hasMesh) ? 3 : 2;

          return (
            <g key={f.id} id={`frame-${f.id}`}>
              {/* Outer Frame Extrusion Profile (4-side vs 3-side) */}
              {is3Side ? (
                <>
                  {/* Top Frame Profile (FW x fpw) */}
                  <rect
                    x={f.x}
                    y={f.y}
                    width={f.width}
                    height={fpw}
                    fill={colorHex}
                    stroke="#0f172a"
                    strokeWidth={Math.max(2.4, 3.2 * scale)}
                  />
                  {/* Left Frame Leg Profile (fpw x FH) */}
                  <rect
                    x={f.x}
                    y={f.y}
                    width={fpw}
                    height={f.height}
                    fill={colorHex}
                    stroke="#0f172a"
                    strokeWidth={Math.max(2.4, 3.2 * scale)}
                  />
                  {/* Right Frame Leg Profile (fpw x FH) */}
                  <rect
                    x={f.x + f.width - fpw}
                    y={f.y}
                    width={fpw}
                    height={f.height}
                    fill={colorHex}
                    stroke="#0f172a"
                    strokeWidth={Math.max(2.4, 3.2 * scale)}
                  />
                  {/* Inner Glazing Rebates (Top, Left, Right) */}
                  <line
                    x1={f.x + fpw}
                    y1={f.y + fpw}
                    x2={f.x + f.width - fpw}
                    y2={f.y + fpw}
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />
                  <line
                    x1={f.x + fpw}
                    y1={f.y + fpw}
                    x2={f.x + fpw}
                    y2={f.y + f.height}
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />
                  <line
                    x1={f.x + f.width - fpw}
                    y1={f.y + fpw}
                    x2={f.x + f.width - fpw}
                    y2={f.y + f.height}
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />
                  {/* Top 45° Mitre Welds */}
                  <line
                    x1={f.x}
                    y1={f.y}
                    x2={f.x + fpw}
                    y2={f.y + fpw}
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />
                  <line
                    x1={f.x + f.width}
                    y1={f.y}
                    x2={f.x + f.width - fpw}
                    y2={f.y + fpw}
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />
                  {/* Open Bottom Threshold / Floor Baseline */}
                  <line
                    x1={f.x}
                    y1={f.y + f.height}
                    x2={f.x + f.width}
                    y2={f.y + f.height}
                    stroke="#d97706"
                    strokeWidth={Math.max(1.8, 2.5 * scale)}
                    strokeDasharray="5 3"
                  />
                  <text
                    x={f.x + f.width / 2}
                    y={f.y + f.height - 4}
                    fill="#b45309"
                    fontSize={Math.max(8, 10 * scale)}
                    fontWeight="900"
                    textAnchor="middle"
                    className="select-none"
                  >
                    [FRAME 3 SIDE - OPEN SILL]
                  </text>
                </>
              ) : (
                <>
                  <rect
                    x={f.x}
                    y={f.y}
                    width={f.width}
                    height={f.height}
                    fill={colorHex}
                    stroke="#0f172a"
                    strokeWidth={Math.max(2.4, 3.2 * scale)}
                  />

                  {/* Inner Glazing Rebate Perimeter Line */}
                  <rect
                    x={f.x + fpw}
                    y={f.y + fpw}
                    width={Math.max(0, f.width - 2 * fpw)}
                    height={Math.max(0, f.height - 2 * fpw)}
                    fill="none"
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />

                  {/* 45° Corner Mitre Joint Lines on 4 Corners */}
                  <line
                    x1={f.x}
                    y1={f.y}
                    x2={f.x + fpw}
                    y2={f.y + fpw}
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />
                  <line
                    x1={f.x + f.width}
                    y1={f.y}
                    x2={f.x + f.width - fpw}
                    y2={f.y + fpw}
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />
                  <line
                    x1={f.x}
                    y1={f.y + f.height}
                    x2={f.x + fpw}
                    y2={f.y + f.height - fpw}
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />
                  <line
                    x1={f.x + f.width}
                    y1={f.y + f.height}
                    x2={f.x + f.width - fpw}
                    y2={f.y + f.height - fpw}
                    stroke={mitreStroke}
                    strokeWidth={Math.max(1.2, 1.8 * scale)}
                  />
                </>
              )}

              {/* --------------------------------------------------------- */}
              {/* 4. MULLIONS & TRANSOMS (EXACT CAD POSITIONING) */}
              {/* --------------------------------------------------------- */}
              {(f.mullions || []).map((m) => {
                const isVert = m.orientation === 'vertical';
                // Sliding interlocks between sliding sashes are suppressed so sashes overlap seamlessly matching CadCanvas
                const isSlidingInterlock =
                  isVert &&
                  (f.series?.startsWith('sliding') ||
                    (m.width !== undefined && m.width <= 24) ||
                    (f.pockets || []).some((p) => p.sashType?.startsWith('slider_') || p.sashType === 'mesh_sash') ||
                    (m as any).isInterlock === true);

                if (isSlidingInterlock) {
                  const vertMullions = (f.mullions || []).filter((mul) => mul.orientation === 'vertical').sort((a, b) => a.position - b.position);
                  // Center lock should NOT be put on all windows ("center lock sabme nahi lagana h")
                  // Only show when f.hasCenterLock === true
                  const isCenterMullionOf6 = vertMullions.length === 5 && vertMullions[2]?.id === m.id;
                  const isCenterMullionOf4 = vertMullions.length === 3 && vertMullions[1]?.id === m.id;

                  const allowCenterLock = f.hasCenterLock === true;

                  const isCenterMeeting = isVert && allowCenterLock && (
                    isCenterMullionOf6 || isCenterMullionOf4
                  );
                  if (isCenterMeeting) {
                    const firstPocket = f.pockets?.[0];
                    const ghh = firstPocket?.handleHeight;
                    const centerLockY = (ghh && ghh >= 60 && ghh <= f.height - 40)
                      ? f.y + f.height - ghh
                      : f.y + f.height / 2;
                    const mX = f.x + m.position;
                    return (
                      <g key={m.id} id={`elevation-center-lock-${m.id}`}>
                        <line
                          x1={mX}
                          y1={f.y + fpw}
                          x2={mX}
                          y2={f.y + f.height - fpw}
                          stroke="#0284c7"
                          strokeWidth={Math.max(1.4, 1.8 * scale)}
                          strokeDasharray="5 3"
                          strokeOpacity="0.85"
                        />
                        {showHandles && (
                          <g>
                            <HardwareHandle
                              x={mX}
                              y={centerLockY}
                              type="crescent_lock"
                              orientation="center"
                              color="silver"
                              scale={Math.min(1.2, handleScale)}
                              title="सेंटर लॉक (Center Meeting Lock)"
                            />
                            <g transform={`translate(${mX}, ${centerLockY + 22})`}>
                              <rect
                                x={-Math.max(26, 32 * scale)}
                                y={-Math.max(7, 8 * scale)}
                                width={Math.max(52, 64 * scale)}
                                height={Math.max(14, 16 * scale)}
                                rx="2"
                                fill="#ffffff"
                                stroke="#0284c7"
                                strokeWidth={Math.max(1, 1.2 * scale)}
                              />
                              <text
                                x="0"
                                y={Math.max(2.5, 3 * scale)}
                                fill="#0284c7"
                                fontSize={Math.max(7, 8 * scale)}
                                fontWeight="900"
                                textAnchor="middle"
                              >
                                🔒 सेंटर लॉक
                              </text>
                            </g>
                          </g>
                        )}
                      </g>
                    );
                  }
                  return null;
                }

                const isPartial = m.spanStart !== undefined && m.spanEnd !== undefined;
                const mW = isVert
                  ? m.width || mpw
                  : isPartial
                  ? m.spanEnd! - m.spanStart!
                  : f.width - 2 * fpw;
                const mH = isVert
                  ? isPartial
                    ? m.spanEnd! - m.spanStart!
                    : f.height - 2 * fpw
                  : m.width || mpw;
                const mX = isVert
                  ? f.x + m.position - (m.width || mpw) / 2
                  : isPartial
                  ? f.x + m.spanStart!
                  : f.x + fpw;
                const mY = isVert
                  ? isPartial
                    ? f.y + m.spanStart!
                    : f.y + fpw
                  : f.y + m.position - (m.width || mpw) / 2;

                return (
                  <g key={m.id} id={`mullion-${m.id}`}>
                    <rect
                      x={mX}
                      y={mY}
                      width={mW}
                      height={mH}
                      fill={colorHex}
                      stroke="#0f172a"
                      strokeWidth={Math.max(1.8, 2.4 * scale)}
                    />
                    {/* Mullion Centerline Accent / V-notch */}
                    <line
                      x1={isVert ? mX + mW / 2 : mX}
                      y1={isVert ? mY : mY + mH / 2}
                      x2={isVert ? mX + mW / 2 : mX + mW}
                      y2={isVert ? mY + mH : mY + mH / 2}
                      stroke="#64748b"
                      strokeWidth={Math.max(1, 1.2 * scale)}
                      strokeDasharray="6 3"
                    />
                  </g>
                );
              })}

              {/* --------------------------------------------------------- */}
              {/* 5. POCKETS, SASHES, GLASS, BEADING, GEORGIAN BARS & HARDWARE */}
              {/* --------------------------------------------------------- */}
              {(() => {
                // Shared Georgian Bar SVG Renderer for CadElevationDrawing
                const renderGeorgianBarGrid = (
                  gX: number,
                  gY: number,
                  gW: number,
                  gH: number,
                  pkt: FramePocket,
                  fColorHex?: string
                ) => {
                  const pattern = pkt.georgianBar?.pattern || pkt.gridPattern || (f as any)?.georgianBar?.pattern;
                  if (!pattern || pattern === 'none') return null;

                  const cfg = pkt.georgianBar || (f as any)?.georgianBar;
                  const barColor = cfg?.color || 'gold';
                  const configuredWidth = cfg?.barWidth || 18;
                  const barThickness = Math.max(8, Math.min(22, Math.round(configuredWidth * 0.75 * scale)));
                  const halfBar = barThickness / 2;

                  let fillH = 'url(#georgianGoldGradH)';
                  let fillV = 'url(#georgianGoldGradV)';
                  let strokeBorder = '#92400e';
                  let highlightStroke = '#fef08a';
                  let cruciformFill = '#f59e0b';

                  if (barColor === 'white') {
                    fillH = 'url(#georgianWhiteGradH)';
                    fillV = 'url(#georgianWhiteGradV)';
                    strokeBorder = '#475569';
                    highlightStroke = '#ffffff';
                    cruciformFill = '#ffffff';
                  } else if (barColor === 'black') {
                    fillH = 'url(#georgianBlackGradH)';
                    fillV = 'url(#georgianBlackGradV)';
                    strokeBorder = '#09090b';
                    highlightStroke = '#3f3f46';
                    cruciformFill = '#18181b';
                  } else if (barColor === 'silver') {
                    fillH = 'url(#georgianSilverGradH)';
                    fillV = 'url(#georgianSilverGradV)';
                    strokeBorder = '#475569';
                    highlightStroke = '#f8fafc';
                    cruciformFill = '#cbd5e1';
                  } else if (barColor === 'bronze') {
                    fillH = 'url(#georgianBronzeGradH)';
                    fillV = 'url(#georgianBronzeGradV)';
                    strokeBorder = '#451a03';
                    highlightStroke = '#b45309';
                    cruciformFill = '#78350f';
                  } else if (barColor === 'match_frame' && fColorHex) {
                    fillH = fColorHex;
                    fillV = fColorHex;
                    strokeBorder = '#0f172a';
                    highlightStroke = '#ffffff';
                    cruciformFill = fColorHex;
                  }

                  const vPositions: number[] = [];
                  const hPositions: number[] = [];
                  const isColonial = pattern === 'georgian_colonial' || pattern === 'georgian_prairie';
                  const isDiamond = pattern === 'georgian_diamond';

                  if (pattern === 'georgian_2x2') {
                    vPositions.push(gX + gW / 2);
                    hPositions.push(gY + gH / 2);
                  } else if (pattern === 'georgian_2x3') {
                    vPositions.push(gX + gW / 2);
                    hPositions.push(gY + gH / 3, gY + (2 * gH) / 3);
                  } else if (pattern === 'georgian_3x2') {
                    vPositions.push(gX + gW / 3, gX + (2 * gW) / 3);
                    hPositions.push(gY + gH / 2);
                  } else if (pattern === 'georgian_3x3') {
                    vPositions.push(gX + gW / 3, gX + (2 * gW) / 3);
                    hPositions.push(gY + gH / 3, gY + (2 * gH) / 3);
                  } else if (pattern === 'georgian_3x4') {
                    vPositions.push(gX + gW / 3, gX + (2 * gW) / 3);
                    hPositions.push(gY + gH / 4, gY + (2 * gH) / 4, gY + (3 * gH) / 4);
                  } else if (pattern === 'georgian_4x4') {
                    vPositions.push(gX + gW / 4, gX + (2 * gW) / 4, gX + (3 * gW) / 4);
                    hPositions.push(gY + gH / 4, gY + (2 * gH) / 4, gY + (3 * gH) / 4);
                  } else if (pattern === 'custom') {
                    const cols = Math.max(1, Math.min(8, cfg?.cols || 2));
                    const rows = Math.max(1, Math.min(8, cfg?.rows || 2));
                    for (let c = 1; c < cols; c++) {
                      vPositions.push(gX + (c * gW) / cols);
                    }
                    for (let r = 1; r < rows; r++) {
                      hPositions.push(gY + (r * gH) / rows);
                    }
                  }

                  const clipId = `cad-elev-georgian-clip-${pkt.id}-${Math.round(gX)}-${Math.round(gY)}`;

                  return (
                    <g id={`cad-elev-georgian-${pkt.id}`} pointerEvents="none">
                      <defs>
                        <clipPath id={clipId}>
                          <rect x={gX} y={gY} width={gW} height={gH} rx="1" />
                        </clipPath>
                      </defs>

                      <g clipPath={`url(#${clipId})`}>
                        {/* Prairie / Colonial Margin Grid */}
                        {isColonial && (() => {
                          const marginX = Math.min(90, Math.max(28, Math.round(gW * 0.16)));
                          const marginY = Math.min(90, Math.max(28, Math.round(gH * 0.16)));
                          const leftX = gX + marginX;
                          const rightX = gX + gW - marginX;
                          const topY = gY + marginY;
                          const bottomY = gY + gH - marginY;

                          return (
                            <g id={`cad-elev-prairie-${pkt.id}`}>
                              <rect x={leftX - halfBar} y={gY} width={barThickness} height={gH} fill={fillV} stroke={strokeBorder} strokeWidth="0.8" />
                              <rect x={rightX - halfBar} y={gY} width={barThickness} height={gH} fill={fillV} stroke={strokeBorder} strokeWidth="0.8" />
                              <rect x={gX} y={topY - halfBar} width={gW} height={barThickness} fill={fillH} stroke={strokeBorder} strokeWidth="0.8" />
                              <rect x={gX} y={bottomY - halfBar} width={gW} height={barThickness} fill={fillH} stroke={strokeBorder} strokeWidth="0.8" />
                              {[
                                [leftX, topY],
                                [rightX, topY],
                                [leftX, bottomY],
                                [rightX, bottomY],
                              ].map(([cx, cy], i) => (
                                <rect
                                  key={i}
                                  x={cx - halfBar - 1}
                                  y={cy - halfBar - 1}
                                  width={barThickness + 2}
                                  height={barThickness + 2}
                                  fill={cruciformFill}
                                  stroke={strokeBorder}
                                  strokeWidth="1"
                                  rx="1"
                                />
                              ))}
                            </g>
                          );
                        })()}

                        {/* Diamond / Argyle Lattice Pattern */}
                        {isDiamond && (() => {
                          const step = Math.min(110, Math.max(50, Math.round(Math.min(gW, gH) * 0.35)));
                          const diagonalLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
                          for (let offset = -gH; offset < gW + gH; offset += step) {
                            diagonalLines.push({ x1: gX + offset, y1: gY, x2: gX + offset + gH, y2: gY + gH });
                            diagonalLines.push({ x1: gX + offset + gH, y1: gY, x2: gX + offset, y2: gY + gH });
                          }

                          return (
                            <g id={`cad-elev-diamond-${pkt.id}`}>
                              {diagonalLines.map((l, idx) => (
                                <g key={idx}>
                                  <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={strokeBorder} strokeWidth={barThickness + 1} />
                                  <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={cruciformFill} strokeWidth={barThickness} />
                                  <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={highlightStroke} strokeWidth="1.2" strokeOpacity="0.8" />
                                </g>
                              ))}
                            </g>
                          );
                        })()}

                        {/* Standard Rectangular Grids (2x2, 2x3, 3x3, custom, etc.) */}
                        {!isColonial && !isDiamond && (
                          <g id={`cad-elev-grid-bars-${pkt.id}`}>
                            {/* Vertical Georgian Bars */}
                            {vPositions.map((vX, idx) => (
                              <g key={`v-bar-${idx}`}>
                                <rect x={vX - halfBar} y={gY} width={barThickness} height={gH} fill={fillV} stroke={strokeBorder} strokeWidth="0.8" />
                                <line x1={vX} y1={gY} x2={vX} y2={gY + gH} stroke={highlightStroke} strokeWidth="1" strokeOpacity="0.75" />
                              </g>
                            ))}

                            {/* Horizontal Georgian Bars */}
                            {hPositions.map((hY, idx) => (
                              <g key={`h-bar-${idx}`}>
                                <rect x={gX} y={hY - halfBar} width={gW} height={barThickness} fill={fillH} stroke={strokeBorder} strokeWidth="0.8" />
                                <line x1={gX} y1={hY} x2={gX + gW} y2={hY} stroke={highlightStroke} strokeWidth="1" strokeOpacity="0.75" />
                              </g>
                            ))}

                            {/* Cruciform Cross Clips at Every Intersection */}
                            {vPositions.map((vX, vi) =>
                              hPositions.map((hY, hi) => (
                                <g key={`cross-${vi}-${hi}`}>
                                  <rect
                                    x={vX - halfBar - 1}
                                    y={hY - halfBar - 1}
                                    width={barThickness + 2}
                                    height={barThickness + 2}
                                    fill={cruciformFill}
                                    stroke={strokeBorder}
                                    strokeWidth="1"
                                    rx="1"
                                  />
                                  <line x1={vX - halfBar} y1={hY} x2={vX + halfBar} y2={hY} stroke={highlightStroke} strokeWidth="0.8" />
                                  <line x1={vX} y1={hY - halfBar} x2={vX} y2={hY + halfBar} stroke={highlightStroke} strokeWidth="0.8" />
                                </g>
                              ))
                            )}
                          </g>
                        )}
                      </g>
                    </g>
                  );
                };

                return (f.pockets || []).map((p, pIdx) => {
                const pX = f.x + p.x;
                const pY = f.y + p.y;
                const pW = p.width;
                const pH = p.height;
                const cX = pX + pW / 2;
                const cY = pY + pH / 2;

                const sashType = p.sashType || 'fixed';
                const isCasement = sashType.startsWith('casement');
                const isTopHung = sashType === 'top_hung';
                const isBottomHung = sashType === 'bottom_hung';
                const isTiltTurn = sashType === 'tilt_turn';
                const isFrench = sashType === 'french_open';
                const isLouver = sashType === 'louver';
                const isUpvcPanel = sashType === 'upvc_panel';
                const isMeshSash =
                  sashType === 'mesh_sash' ||
                  sashType === 'mesh_slider_right' ||
                  sashType === 'mesh_slider_left' ||
                  sashType === 'slider_3t_2p_mesh' ||
                  sashType === 'slider_2s_with_mesh' ||
                  sashType === 'slider_3s_mesh' ||
                  Boolean(p.hasMesh);
                const fNameLower = (f.name || '').toLowerCase();
                const isCasementWin = isCasement || isTopHung || isBottomHung || isTiltTurn || isFrench;
                const isExplicitWindowName = isCasementWin || fNameLower.startsWith('w') || fNameLower.includes('window');
                const isExplicitDoor =
                  p.applicationType === 'door' ||
                  f.series?.toLowerCase().includes('door') ||
                  fNameLower.includes('door') ||
                  fNameLower.startsWith('d');
                const isDoor = !isCasementWin && (isExplicitDoor || (!isExplicitWindowName && p.applicationType !== 'window' && (fNameLower.includes('door') || f.series?.toLowerCase().includes('door'))));

                // Sliding types
                const isSliderOx = sashType === 'slider_2s_ox';
                const isSliderXo = sashType === 'slider_2s_xo';
                const isSliderXx = sashType === 'slider_2s_xx';
                const isSlider3s = sashType.startsWith('slider_3s') || sashType.startsWith('slider_arrow_');
                const isAnySlider =
                  isSliderOx ||
                  isSliderXo ||
                  isSliderXx ||
                  isSlider3s ||
                  sashType.includes('slider') ||
                  sashType === 'mesh_sash' ||
                  f.series?.startsWith('sliding');

                // Exhaust Fan and Window AC checks
                const hasFan =
                  Boolean(p.hasFanCutout) ||
                  sashType === 'fan_provision' ||
                  sashType === 'fan_vent' ||
                  sashType === 'exhaust_fan' ||
                  (p.customLabel || '').toLowerCase().includes('fan');

                const hasAC =
                  Boolean(p.hasACLouver) ||
                  sashType === 'ac_provision' ||
                  sashType === 'window_ac' ||
                  sashType === 'bottom_ac_transom' ||
                  sashType === 'ac_unit' ||
                  sashType === 'louver' ||
                  (p.customLabel || '').toLowerCase().includes('ac');

                // Colors for sash and beading profiles (distinct from glass)
                const frameColor = getHexColor(f.color || primaryFrame?.color);
                const isWhiteProfile = !f.color || f.color === 'white' || frameColor.toLowerCase() === '#ffffff';
                const sashFill = frameColor;
                const beadFill = isWhiteProfile ? '#f1f5f9' : '#e2e8f0';

                // Profile deductions for sash and beading
                const sashW = isCasementWin ? Math.max(26, Math.min(Math.round(pW * 0.16), Math.round(pH * 0.16), 46)) : 0;
                const beadW = isCasementWin
                  ? Math.max(8, Math.min(Math.round((pW - 2 * sashW) * 0.06), Math.round((pH - 2 * sashW) * 0.06), 16))
                  : Math.max(12, Math.min(Math.round(pW * 0.08), Math.round(pH * 0.08), 20));

                const glassX = pX + sashW + beadW;
                const glassY = pY + sashW + beadW;
                const glassW = Math.max(10, pW - 2 * (sashW + beadW));
                const glassH = Math.max(10, pH - 2 * (sashW + beadW));

                // Glass fill based on pocket glass type - ALWAYS vibrant architectural gradients, never black & white
                let glassFill = 'url(#cadCardGlassShade)';
                const gTypeStr = (p.glassType || '') as string;
                if (gTypeStr === 'frosted') {
                  glassFill = 'url(#cadCardFrostedShade)';
                } else if (gTypeStr === 'tint_grey' || gTypeStr.includes('tint') || gTypeStr.includes('black')) {
                  glassFill = 'url(#cadCardTintShade)';
                } else if (gTypeStr.includes('brown')) {
                  glassFill = 'url(#cadCardBrownShade)';
                } else if (gTypeStr.includes('dgu')) {
                  glassFill = 'url(#cadCardDguShade)';
                } else {
                  glassFill = 'url(#cadCardGlassShade)';
                }

                return (
                  <g
                    key={p.id || pIdx}
                    id={`pocket-${p.id || pIdx}`}
                    onClick={
                      onPocketClick
                        ? (e) => {
                            e.stopPropagation();
                            onPocketClick(fIdx, pIdx);
                          }
                        : undefined
                    }
                    className={onPocketClick ? 'cursor-pointer' : ''}
                  >
                    {/* Pocket Base Profile, Beading & Glass Infill - Only for non-sliding pockets */}
                    {!isAnySlider && (
                      <>
                        {isCasementWin ? (
                          isFrench ? (
                            /* Double Leaf French Casement: Two sashes meeting at center with False Mullion (बीच में सैश प्रोफाइल) */
                            (() => {
                              const leftW = Math.round(pW / 2);
                              const rightW = pW - leftW;
                              const fSashW = Math.max(20, Math.min(Math.round(leftW * 0.16), Math.round(pH * 0.16), 36));
                              const fBeadW = Math.max(6, Math.min(Math.round(leftW * 0.08), Math.round(pH * 0.08), 12));
                              const fmW = Math.max(16, Math.min(24, Math.round(fSashW * 0.75)));
                              const midX = pX + leftW;

                              // Left Leaf Glass
                              const lGlassX = pX + fSashW + fBeadW;
                              const lGlassY = pY + fSashW + fBeadW;
                              const lGlassW = Math.max(8, leftW - 2 * (fSashW + fBeadW));
                              const lGlassH = Math.max(8, pH - 2 * (fSashW + fBeadW));

                              // Right Leaf Glass
                              const rGlassX = midX + fSashW + fBeadW;
                              const rGlassY = pY + fSashW + fBeadW;
                              const rGlassW = Math.max(8, rightW - 2 * (fSashW + fBeadW));
                              const rGlassH = Math.max(8, pH - 2 * (fSashW + fBeadW));

                              return (
                                <g id={`sash-french-profile-bead-${p.id}`} pointerEvents="none">
                                  {/* --- LEFT SASH LEAF --- */}
                                  {/* Outer Sash Profile Body */}
                                  <rect
                                    x={pX}
                                    y={pY}
                                    width={leftW}
                                    height={pH}
                                    fill={sashFill}
                                    stroke="#0f172a"
                                    strokeWidth={Math.max(1.6, 2 * scale)}
                                  />
                                  {/* Left Leaf 4-corner 45° miter lines */}
                                  <line x1={pX} y1={pY} x2={pX + fSashW} y2={pY + fSashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                                  <line x1={midX} y1={pY} x2={midX - fSashW} y2={pY + fSashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                                  <line x1={pX} y1={pY + pH} x2={pX + fSashW} y2={pY + pH - fSashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                                  <line x1={midX} y1={pY + pH} x2={midX - fSashW} y2={pY + pH - fSashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                                  {/* Left Glazing Beading Base */}
                                  <rect
                                    x={pX + fSashW}
                                    y={pY + fSashW}
                                    width={Math.max(0, leftW - 2 * fSashW)}
                                    height={Math.max(0, pH - 2 * fSashW)}
                                    fill={beadFill}
                                    stroke="#334155"
                                    strokeWidth={Math.max(1.2, 1.4 * scale)}
                                  />
                                  {/* Left Beading 45° miters */}
                                  <line x1={pX + fSashW} y1={pY + fSashW} x2={lGlassX} y2={lGlassY} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />
                                  <line x1={midX - fSashW} y1={pY + fSashW} x2={lGlassX + lGlassW} y2={lGlassY} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />
                                  <line x1={pX + fSashW} y1={pY + pH - fSashW} x2={lGlassX} y2={lGlassY + lGlassH} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />
                                  <line x1={midX - fSashW} y1={pY + pH - fSashW} x2={lGlassX + lGlassW} y2={lGlassY + lGlassH} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />

                                  {/* Left Glass Pane */}
                                  <rect
                                    x={lGlassX}
                                    y={lGlassY}
                                    width={lGlassW}
                                    height={lGlassH}
                                    fill={glassFill}
                                    fillOpacity={0.96}
                                    stroke="#0f172a"
                                    strokeWidth={Math.max(1.2, 1.4 * scale)}
                                  />
                                  {/* Left Leaf Georgian / Dorgen Bar */}
                                  {renderGeorgianBarGrid(lGlassX, lGlassY, lGlassW, lGlassH, p, frameColor)}

                                  {/* --- RIGHT SASH LEAF --- */}
                                  {/* Outer Sash Profile Body */}
                                  <rect
                                    x={midX}
                                    y={pY}
                                    width={rightW}
                                    height={pH}
                                    fill={sashFill}
                                    stroke="#0f172a"
                                    strokeWidth={Math.max(1.6, 2 * scale)}
                                  />
                                  {/* Right Leaf 4-corner 45° miter lines */}
                                  <line x1={midX} y1={pY} x2={midX + fSashW} y2={pY + fSashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                                  <line x1={pX + pW} y1={pY} x2={pX + pW - fSashW} y2={pY + fSashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                                  <line x1={midX} y1={pY + pH} x2={midX + fSashW} y2={pY + pH - fSashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                                  <line x1={pX + pW} y1={pY + pH} x2={pX + pW - fSashW} y2={pY + pH - fSashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                                  {/* Right Glazing Beading Base */}
                                  <rect
                                    x={midX + fSashW}
                                    y={pY + fSashW}
                                    width={Math.max(0, rightW - 2 * fSashW)}
                                    height={Math.max(0, pH - 2 * fSashW)}
                                    fill={beadFill}
                                    stroke="#334155"
                                    strokeWidth={Math.max(1.2, 1.4 * scale)}
                                  />
                                  {/* Right Beading 45° miters */}
                                  <line x1={midX + fSashW} y1={pY + fSashW} x2={rGlassX} y2={rGlassY} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />
                                  <line x1={pX + pW - fSashW} y1={pY + fSashW} x2={rGlassX + rGlassW} y2={rGlassY} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />
                                  <line x1={midX + fSashW} y1={pY + pH - fSashW} x2={rGlassX} y2={rGlassY + rGlassH} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />
                                  <line x1={pX + pW - fSashW} y1={pY + pH - fSashW} x2={rGlassX + rGlassW} y2={rGlassY + rGlassH} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />

                                  {/* Right Glass Pane */}
                                  <rect
                                    x={rGlassX}
                                    y={rGlassY}
                                    width={rGlassW}
                                    height={rGlassH}
                                    fill={glassFill}
                                    fillOpacity={0.96}
                                    stroke="#0f172a"
                                    strokeWidth={Math.max(1.2, 1.4 * scale)}
                                  />
                                  {/* Right Leaf Georgian / Dorgen Bar */}
                                  {renderGeorgianBarGrid(rGlassX, rGlassY, rGlassW, rGlassH, p, frameColor)}

                                  {/* --- CENTER MEETING ZONE & FALSE MULLION (बीच का सैश प्रोफाइल / फॉल्स मुल्लियन) --- */}
                                  {/* False Mullion Profile Extrusion Body */}
                                  <rect
                                    x={midX - fmW / 2}
                                    y={pY}
                                    width={fmW}
                                    height={pH}
                                    fill={sashFill}
                                    stroke="#0f172a"
                                    strokeWidth={Math.max(1.4, 1.8 * scale)}
                                  />
                                  {/* False Mullion architectural chamfer lines */}
                                  <line
                                    x1={midX - fmW / 2 + 2}
                                    y1={pY}
                                    x2={midX - fmW / 2 + 2}
                                    y2={pY + pH}
                                    stroke="#94a3b8"
                                    strokeWidth={Math.max(0.7, 0.9 * scale)}
                                  />
                                  <line
                                    x1={midX + fmW / 2 - 2}
                                    y1={pY}
                                    x2={midX + fmW / 2 - 2}
                                    y2={pY + pH}
                                    stroke="#94a3b8"
                                    strokeWidth={Math.max(0.7, 0.9 * scale)}
                                  />
                                  {/* Top & Bottom End Caps for False Mullion */}
                                  <rect
                                    x={midX - fmW / 2 - 1}
                                    y={pY}
                                    width={fmW + 2}
                                    height={Math.max(6, 8 * scale)}
                                    fill="#334155"
                                    stroke="#0f172a"
                                    strokeWidth={Math.max(0.8, 1 * scale)}
                                    rx="1"
                                  />
                                  <rect
                                    x={midX - fmW / 2 - 1}
                                    y={pY + pH - Math.max(6, 8 * scale)}
                                    width={fmW + 2}
                                    height={Math.max(6, 8 * scale)}
                                    fill="#334155"
                                    stroke="#0f172a"
                                    strokeWidth={Math.max(0.8, 1 * scale)}
                                    rx="1"
                                  />
                                  {/* Center Meeting Seam */}
                                  <line
                                    x1={midX}
                                    y1={pY + Math.max(6, 8 * scale)}
                                    x2={midX}
                                    y2={pY + pH - Math.max(6, 8 * scale)}
                                    stroke="#0f172a"
                                    strokeWidth={Math.max(1.5, 2 * scale)}
                                  />
                                </g>
                              );
                            })()
                          ) : (
                            /* Openable Casement / Tilt-Turn / Top-Hung / Bottom-Hung Single Sash */
                            <g id={`sash-profile-bead-${p.id}`} pointerEvents="none">
                              {/* 1. Outer Sash Profile Frame (Authentic uPVC / Profile Color) */}
                              <rect
                                x={pX}
                                y={pY}
                                width={pW}
                                height={pH}
                                fill={sashFill}
                                stroke="#0f172a"
                                strokeWidth={Math.max(1.6, 2 * scale)}
                              />
                              {/* 4-corner 45° miter lines for sash */}
                              <line x1={pX} y1={pY} x2={pX + sashW} y2={pY + sashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                              <line x1={pX + pW} y1={pY} x2={pX + pW - sashW} y2={pY + sashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                              <line x1={pX} y1={pY + pH} x2={pX + sashW} y2={pY + pH - sashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                              <line x1={pX + pW} y1={pY + pH} x2={pX + pW - sashW} y2={pY + pH - sashW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                              {/* 2. Glazing Beading Base (Inside the Sash Profile) */}
                              <rect
                                x={pX + sashW}
                                y={pY + sashW}
                                width={Math.max(0, pW - 2 * sashW)}
                                height={Math.max(0, pH - 2 * sashW)}
                                fill={beadFill}
                                stroke="#334155"
                                strokeWidth={Math.max(1.2, 1.4 * scale)}
                              />
                              {/* 4-corner 45° miter lines for beading */}
                              <line x1={pX + sashW} y1={pY + sashW} x2={glassX} y2={glassY} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />
                              <line x1={pX + pW - sashW} y1={pY + sashW} x2={glassX + glassW} y2={glassY} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />
                              <line x1={pX + sashW} y1={pY + pH - sashW} x2={glassX} y2={glassY + glassH} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />
                              <line x1={pX + pW - sashW} y1={pY + pH - sashW} x2={glassX + glassW} y2={glassY + glassH} stroke="#64748b" strokeWidth={Math.max(0.8, 1 * scale)} />

                              {/* 3. Glass Pane - ONLY inside the Beading */}
                              <rect
                                x={glassX}
                                y={glassY}
                                width={glassW}
                                height={glassH}
                                fill={glassFill}
                                fillOpacity={0.96}
                                stroke="#0f172a"
                                strokeWidth={Math.max(1.2, 1.4 * scale)}
                              />
                            </g>
                          )
                        ) : (
                          /* Fixed Pocket (Direct Glazing with Beading) */
                          <g id={`fixed-bead-${p.id}`} pointerEvents="none">
                            {/* 1. Glazing Beading Base (Authentic Beading Shade, NOT Glass Color) */}
                            <rect
                              x={pX}
                              y={pY}
                              width={pW}
                              height={pH}
                              fill={beadFill}
                              stroke="#0f172a"
                              strokeWidth={Math.max(1.4, 1.8 * scale)}
                            />
                            {/* 4-corner 45° miter lines for beading */}
                            <line x1={pX} y1={pY} x2={glassX} y2={glassY} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                            <line x1={pX + pW} y1={pY} x2={glassX + glassW} y2={glassY} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                            <line x1={pX} y1={pY + pH} x2={glassX} y2={glassY + glassH} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                            <line x1={pX + pW} y1={pY + pH} x2={glassX + glassW} y2={glassY + glassH} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                            {/* 2. Glass Pane - ONLY inside the Beading */}
                            <rect
                              x={glassX}
                              y={glassY}
                              width={glassW}
                              height={glassH}
                              fill={glassFill}
                              fillOpacity={0.96}
                              stroke="#0f172a"
                              strokeWidth={Math.max(1.2, 1.4 * scale)}
                            />
                          </g>
                        )}

                        {/* Glass Reflection Highlight Streak Line - Inside Glass Pane Only */}
                        <line
                          x1={glassX + glassW * 0.25}
                          y1={glassY + glassH * 0.15}
                          x2={glassX + glassW * 0.75}
                          y2={glassY + glassH * 0.85}
                          stroke="#ffffff"
                          strokeWidth={Math.max(1.8, 2.5 * scale)}
                          strokeOpacity="0.75"
                          pointerEvents="none"
                        />

                        {/* Georgian / Dorgen Bar on Glass Infill Pane */}
                        {renderGeorgianBarGrid(glassX, glassY, glassW, glassH, p, frameColor)}
                      </>
                    )}

                    {/* Wire Mesh Pattern (if fly mesh) */}
                    {isMeshSash && (
                      <rect
                        x={glassX ?? (pX + 8)}
                        y={glassY ?? (pY + 8)}
                        width={glassW ?? Math.max(0, pW - 16)}
                        height={glassH ?? Math.max(0, pH - 16)}
                        fill="url(#flyMeshDiamondPattern)"
                        stroke="#059669"
                        strokeWidth={Math.max(1.2, 1.4 * scale)}
                      />
                    )}

                    {/* Louver Slats */}
                    {isLouver && (
                      <g id={`louver-slats-${p.id}`}>
                        {Array.from({ length: Math.max(3, Math.floor(pH / 35)) }).map((_, lIdx) => {
                          const sY = pY + (lIdx + 1) * (pH / (Math.floor(pH / 35) + 1));
                          return (
                            <line
                              key={lIdx}
                              x1={pX + 8}
                              y1={sY}
                              x2={pX + pW - 8}
                              y2={sY}
                              stroke="#0f172a"
                              strokeWidth={Math.max(2, 2.6 * scale)}
                            />
                          );
                        })}
                      </g>
                    )}

                    {/* uPVC Infill Panel */}
                    {isUpvcPanel && (
                      <g id={`upvc-panel-${p.id}`}>
                        <rect
                          x={pX + 6}
                          y={pY + 6}
                          width={pW - 12}
                          height={pH - 12}
                          fill="#cbd5e1"
                          stroke="#475569"
                          strokeWidth={Math.max(1.5, 2 * scale)}
                        />
                        <text
                          x={cX}
                          y={cY + 5}
                          textAnchor="middle"
                          fontSize={Math.max(12, Math.min(24, 15 * scale))}
                          fontWeight="900"
                          fill="#334155"
                        >
                          uPVC PANEL
                        </text>
                      </g>
                    )}

                    {/* Exhaust Fan Cutout Provision (Glass remains fully visible everywhere except the circular hole) */}
                    {hasFan && (
                      <g id={`fan-cutout-${p.id}`}>
                        {/* Infill sheet ONLY if explicitly set to solid PVC sheet or Louvers in inspector */}
                        {p.fanPanelType === 'pvc_sheet' && (
                          <rect
                            x={glassX}
                            y={glassY}
                            width={glassW}
                            height={glassH}
                            fill="#f1f5f9"
                            stroke="#0284c7"
                            strokeWidth="1.5"
                          />
                        )}
                        {p.fanPanelType === 'louver_hole' && (
                          <g>
                            <rect
                              x={glassX}
                              y={glassY}
                              width={glassW}
                              height={glassH}
                              fill="#e2e8f0"
                              stroke="#0284c7"
                              strokeWidth="1.5"
                            />
                            {Array.from({ length: Math.max(3, Math.floor(glassH / 30)) }).map((_, li, larr) => {
                              const ly = glassY + ((li + 1) * glassH) / (larr.length + 1);
                              return (
                                <line
                                  key={li}
                                  x1={glassX + 4}
                                  y1={ly}
                                  x2={glassX + glassW - 4}
                                  y2={ly + 4}
                                  stroke="#94a3b8"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              );
                            })}
                          </g>
                        )}

                        {/* ULTRA-REALISTIC CIRCULAR FAN CUTOUT (Glass cut out ONLY inside this circle) */}
                        {(() => {
                          const fanDia = p.fanCutoutDiameter || 200;
                          const maxR = Math.min(glassW * 0.44, glassH * 0.44);
                          const fanR = Math.min(maxR, Math.max(40, (fanDia / 2) * 0.88));
                          const boltAngles = [0, 45, 90, 135, 180, 225, 270, 315];
                          const bladeAngles = [0, 72, 144, 216, 288];

                          return (
                            <g transform={`translate(${cX}, ${cY})`}>
                              {/* 1. Through-hole in Glass (Clear Cut Hole through which outside is seen) */}
                              <circle r={fanR} fill="url(#fanHoleDepth)" stroke="#0f172a" strokeWidth="2.5" />

                              {/* 2. Glass Cut Edge 3D Bevel & Highlight */}
                              <circle r={fanR - 1.5} fill="none" stroke="#0f172a" strokeWidth="1.5" strokeOpacity="0.4" />
                              <circle r={fanR + 1.5} fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.9" />

                              {/* 3. Weatherproof EPDM Rubber Clamp Gasket Ring */}
                              <circle r={fanR + 4.5} fill="none" stroke="#1e293b" strokeWidth="4" />
                              <circle r={fanR + 6.8} fill="none" stroke="#0f172a" strokeWidth="0.8" strokeOpacity="0.5" />

                              {/* 4. Aluminum Flange Collar Clamping Ring */}
                              <circle r={fanR + 3} fill="none" stroke="#94a3b8" strokeWidth="2" />

                              {/* 5. 8 Symmetrical Chrome Mounting Bolts with Washers clamped on glass */}
                              {boltAngles.map((ang) => {
                                const rad = (ang * Math.PI) / 180;
                                const bx = (fanR + 4.5) * Math.cos(rad);
                                const by = (fanR + 4.5) * Math.sin(rad);
                                return (
                                  <g key={ang} transform={`translate(${bx}, ${by})`}>
                                    <circle r="3.2" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
                                    <circle r="2" fill="#f8fafc" stroke="#1e293b" strokeWidth="0.6" />
                                    <circle r="0.8" fill="#0f172a" />
                                  </g>
                                );
                              })}

                              {/* 6. Background Gravity Backdraft Shutter Louvers in Duct */}
                              <g stroke="#64748b" strokeWidth="1.8" strokeLinecap="round">
                                <line x1={-fanR * 0.7} y1={-fanR * 0.38} x2={fanR * 0.7} y2={-fanR * 0.38 + 3} />
                                <line x1={-fanR * 0.86} y1={0} x2={fanR * 0.86} y2={3} />
                                <line x1={-fanR * 0.7} y1={fanR * 0.38} x2={fanR * 0.7} y2={fanR * 0.38 + 3} />
                              </g>

                              {/* 7. Concentric Stainless Steel Safety Wire Guard Rings */}
                              <circle r={fanR * 0.82} fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeOpacity="0.9" />
                              <circle r={fanR * 0.58} fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeOpacity="0.9" />
                              <circle r={fanR * 0.38} fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeOpacity="0.9" />

                              {/* 8. 4 Radial Support Struts */}
                              <line x1={-fanR * 0.9} y1="0" x2={fanR * 0.9} y2="0" stroke="#64748b" strokeWidth="1.2" />
                              <line x1="0" y1={-fanR * 0.9} x2="0" y2={fanR * 0.9} stroke="#64748b" strokeWidth="1.2" />

                              {/* 9. 5 Aerodynamic Curved Fan Propeller Blades */}
                              {bladeAngles.map((ang, bIdx) => (
                                <g key={bIdx} transform={`rotate(${ang})`}>
                                  <path
                                    d={`M 0 0 C ${fanR * 0.2} ${-fanR * 0.15}, ${fanR * 0.55} ${-fanR * 0.32}, ${fanR * 0.8} ${-fanR * 0.18} C ${fanR * 0.75} ${fanR * 0.05}, ${fanR * 0.45} ${fanR * 0.08}, 0 0 Z`}
                                    fill="url(#fanBladeGrad)"
                                    stroke="#0369a1"
                                    strokeWidth="0.8"
                                  />
                                  <path
                                    d={`M 0 0 C ${fanR * 0.25} ${-fanR * 0.08}, ${fanR * 0.5} ${-fanR * 0.16}, ${fanR * 0.78} ${-fanR * 0.15}`}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth="1"
                                    strokeOpacity="0.75"
                                  />
                                </g>
                              ))}

                              {/* 10. Center 3D Hemispherical Motor Hub Dome */}
                              <circle r={fanR * 0.24} fill="url(#fanMotorHubGrad)" stroke="#0c4a6e" strokeWidth="1.6" />
                              <circle cx={-fanR * 0.06} cy={-fanR * 0.06} r={fanR * 0.1} fill="#ffffff" fillOpacity="0.75" />
                              <circle r={fanR * 0.06} fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />

                              {/* 11. Electric Pull Cord with Teardrop Pendant */}
                              <path
                                d={`M 0 ${fanR * 0.24} Q ${fanR * 0.1} ${fanR * 0.65}, 0 ${fanR * 0.95}`}
                                fill="none"
                                stroke="#64748b"
                                strokeWidth="1.2"
                                strokeDasharray="2 1.5"
                              />
                              <circle cx="0" cy={fanR * 0.98} r="3" fill="#cbd5e1" stroke="#334155" strokeWidth="0.8" />

                              {/* 12. Technical Dimension / Custom Name Tag Badge */}
                              <g transform={`translate(0, ${fanR + 18})`}>
                                <rect
                                  x={-Math.max(65, ((p.customLabel || `Ø${fanDia}mm GLASS FAN`).length * 4.5))}
                                  y="-10"
                                  width={Math.max(130, ((p.customLabel || `Ø${fanDia}mm GLASS FAN`).length * 9))}
                                  height="18"
                                  rx="3"
                                  fill="#0284c7"
                                  stroke="#ffffff"
                                  strokeWidth="1"
                                />
                                <text
                                  x="0"
                                  y="3"
                                  fill="#ffffff"
                                  fontSize="9.5"
                                  fontWeight="900"
                                  letterSpacing="0.5"
                                  textAnchor="middle"
                                >
                                  {p.customLabel ? p.customLabel : `Ø${fanDia}mm GLASS CUTOUT FAN`}
                                </text>
                              </g>
                            </g>
                          );
                        })()}
                      </g>
                    )}

                    {/* AC Provision / Window AC Unit (100% FULL POCKET FIT) / Louver Blades / ACP Insulated Sheet */}
                    {hasAC && (
                      <g id={`ac-provision-${p.id}`}>
                        {p.acUnitType === 'insulated_panel' ? (
                          // Solid ACP Insulated Panel with AC cutout outline
                          <g>
                            <rect
                              x={glassX}
                              y={glassY}
                              width={glassW}
                              height={glassH}
                              fill="#cbd5e1"
                              stroke="#475569"
                              strokeWidth="1.5"
                            />
                            <rect
                              x={glassX + 12}
                              y={glassY + 12}
                              width={glassW - 24}
                              height={glassH - 24}
                              fill="#f8fafc"
                              stroke="#0284c7"
                              strokeWidth="2"
                              strokeDasharray="4 3"
                              rx="3"
                            />
                            <text x={cX} y={cY + 4} fill="#0284c7" fontSize="11" fontWeight="bold" textAnchor="middle">
                              {p.customLabel || 'ACP INSULATED AC OPENING'}
                            </text>
                          </g>
                        ) : p.acUnitType === 'louver' || sashType === 'louver' ? (
                          // Louver Blades (35mm pitch)
                          <g>
                            {Array.from({ length: Math.max(3, Math.floor(pH / 35)) }).map((_, i, arr) => {
                              const ly = pY + ((i + 1) * pH) / (arr.length + 1);
                              return (
                                <line
                                  key={i}
                                  x1={pX + 4}
                                  y1={ly}
                                  x2={pX + pW - 4}
                                  y2={ly + 5}
                                  stroke="#334155"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                              );
                            })}
                            <rect
                              x={pX + 6}
                              y={pY + 6}
                              width={pW - 12}
                              height={pH - 12}
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="1"
                              strokeDasharray="2 2"
                            />
                          </g>
                        ) : (
                          // Window AC Unit Casing Box — 100% FULL POCKET FIT (Zero margin/gap)
                          (() => {
                            const boxX = glassX;
                            const boxY = glassY;
                            const boxW = glassW;
                            const boxH = glassH;

                            // Upper cool breeze discharge plenum (~36% of height)
                            const louvH = Math.max(26, Math.min(Math.round(boxH * 0.35), 180));
                            // Lower intake & control panel section
                            const lowerY = boxY + louvH + 8;
                            const lowerH = Math.max(30, boxH - louvH - 14);

                            // Control panel width (~28% of width, min 55, max 160)
                            const panelW = Math.max(55, Math.min(Math.round(boxW * 0.28), 160));
                            const grillW = Math.max(40, boxW - panelW - 18);
                            const panelX = boxX + 6 + grillW + 6;

                            const numLouvers = Math.max(2, Math.min(4, Math.floor(louvH / 22)));
                            const numGrillLines = Math.max(3, Math.min(14, Math.floor(lowerH / 16)));

                            return (
                              <g>
                                {/* 1. Full-Coverage Outer Powder-Coated Chassis (100% Edge-to-Edge Fit) */}
                                <rect
                                  x={boxX}
                                  y={boxY}
                                  width={boxW}
                                  height={boxH}
                                  fill="url(#acCasingGrad)"
                                  stroke="#1e293b"
                                  strokeWidth="2.5"
                                  rx="2"
                                />
                                {/* Inner 3D Highlight Bevel */}
                                <rect
                                  x={boxX + 2}
                                  y={boxY + 2}
                                  width={boxW - 4}
                                  height={boxH - 4}
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                  strokeOpacity="0.85"
                                />

                                {/* 2. Upper Cool Breeze Air Discharge Chamber */}
                                <rect
                                  x={boxX + 6}
                                  y={boxY + 6}
                                  width={boxW - 12}
                                  height={louvH}
                                  fill="#0f172a"
                                  rx="3"
                                />
                                {/* Vertical Directional Airflow Guide Vanes behind louvers */}
                                {Array.from({ length: Math.max(3, Math.floor((boxW - 24) / 28)) }).map((_, vi, varr) => {
                                  const vx = boxX + 12 + ((vi + 1) * (boxW - 24)) / (varr.length + 1);
                                  return (
                                    <line
                                      key={`vx-${vi}`}
                                      x1={vx}
                                      y1={boxY + 8}
                                      x2={vx}
                                      y2={boxY + 4 + louvH}
                                      stroke="#1e293b"
                                      strokeWidth="1.2"
                                    />
                                  );
                                })}
                                {/* Horizontal Aerodynamic Motorized Swing Louvers */}
                                {Array.from({ length: numLouvers }).map((_, li) => {
                                  const ly = boxY + 10 + (li * (louvH - 16)) / Math.max(1, numLouvers - 1);
                                  const lh = Math.max(3.5, Math.min(7, (louvH - 16) / (numLouvers * 1.5)));
                                  return (
                                    <g key={`louver-${li}`}>
                                      {/* Drop shadow */}
                                      <rect
                                        x={boxX + 10}
                                        y={ly + 2}
                                        width={boxW - 20}
                                        height={lh}
                                        fill="#000000"
                                        fillOpacity="0.4"
                                        rx="1"
                                      />
                                      {/* Louver Blade */}
                                      <rect
                                        x={boxX + 10}
                                        y={ly}
                                        width={boxW - 20}
                                        height={lh}
                                        fill="url(#acLouverBladeGrad)"
                                        stroke="#475569"
                                        strokeWidth="0.8"
                                        rx="1"
                                      />
                                      {/* Pivot Pins */}
                                      <circle cx={boxX + 12} cy={ly + lh / 2} r="1.5" fill="#334155" />
                                      <circle cx={boxX + boxW - 12} cy={ly + lh / 2} r="1.5" fill="#334155" />
                                    </g>
                                  );
                                })}
                                {/* Cool Breeze Indicator Sparkles / Flow lines */}
                                <line x1={boxX + 16} y1={boxY + 10} x2={boxX + 32} y2={boxY + 10} stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.7" />
                                <line x1={boxX + boxW - 32} y1={boxY + 10} x2={boxX + boxW - 16} y2={boxY + 10} stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.7" />

                                {/* 3. Lower Section — Air Intake Grille (Left/Center) */}
                                <rect
                                  x={boxX + 6}
                                  y={lowerY}
                                  width={grillW}
                                  height={lowerH}
                                  fill="#f1f5f9"
                                  stroke="#94a3b8"
                                  strokeWidth="1"
                                  rx="2"
                                />
                                {/* Nylon Mesh Intake Filter Pattern */}
                                <rect
                                  x={boxX + 8}
                                  y={lowerY + 2}
                                  width={grillW - 4}
                                  height={lowerH - 4}
                                  fill="url(#acFilterMesh)"
                                  rx="1"
                                />
                                {/* Intake Grille Horizontal Slats */}
                                {Array.from({ length: numGrillLines }).map((_, gi) => {
                                  const gy = lowerY + 6 + (gi * (lowerH - 16)) / Math.max(1, numGrillLines - 1);
                                  return (
                                    <line
                                      key={`grill-${gi}`}
                                      x1={boxX + 10}
                                      y1={gy}
                                      x2={boxX + 6 + grillW - 6}
                                      y2={gy}
                                      stroke="#334155"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                    />
                                  );
                                })}
                                {/* Washable Filter Pull Tab */}
                                {grillW > 80 && lowerH > 60 && (
                                  <g transform={`translate(${boxX + 12}, ${lowerY + lowerH - 12})`}>
                                    <rect width={Math.min(65, grillW - 20)} height="8" rx="2" fill="#64748b" />
                                    <text x={Math.min(65, grillW - 20) / 2} y="6" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle">
                                      PULL FILTER
                                    </text>
                                  </g>
                                )}

                                {/* 4. Lower Section — Piano-Black Digital Control & LED Display (Right) */}
                                <rect
                                  x={panelX}
                                  y={lowerY}
                                  width={panelW}
                                  height={lowerH}
                                  fill="url(#acDisplayGlass)"
                                  stroke="#334155"
                                  strokeWidth="1.2"
                                  rx="3"
                                />
                                {/* Glass Glare Highlight */}
                                <line
                                  x1={panelX + 4}
                                  y1={lowerY + 3}
                                  x2={panelX + panelW - 4}
                                  y2={lowerY + 3}
                                  stroke="#ffffff"
                                  strokeWidth="1"
                                  strokeOpacity="0.4"
                                />

                                {/* Glowing Neon Ice-Blue Digital 24°C LED Display */}
                                <text
                                  x={panelX + panelW / 2}
                                  y={lowerY + Math.min(32, lowerH * 0.32)}
                                  fill="#38bdf8"
                                  fontSize={Math.min(18, Math.max(11, lowerH * 0.22))}
                                  fontWeight="900"
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                >
                                  24°C
                                </text>

                                {/* Status Indicators: Green Power, Blue Cool Mode, Amber Eco */}
                                <g transform={`translate(${panelX + panelW / 2}, ${lowerY + Math.min(48, lowerH * 0.48)})`}>
                                  <circle cx="-12" cy="0" r="3" fill="#22c55e" />
                                  <circle cx="-12" cy="0" r="4.5" fill="none" stroke="#22c55e" strokeWidth="0.8" strokeOpacity="0.6" />
                                  <circle cx="0" cy="0" r="2.5" fill="#38bdf8" />
                                  <circle cx="12" cy="0" r="2.5" fill="#f59e0b" />
                                </g>

                                {/* Capacitive Buttons */}
                                {lowerH > 90 && (
                                  <g transform={`translate(${panelX + panelW / 2}, ${lowerY + Math.min(72, lowerH * 0.68)})`}>
                                    <rect x="-18" y="-6" width="36" height="12" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                                    <text x="0" y="2.5" fill="#e2e8f0" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                                      POWER
                                    </text>
                                  </g>
                                )}

                                {/* 5. Center Bottom Technical Identification & Custom Name Plate */}
                                <g transform={`translate(${boxX + boxW / 2}, ${boxY + boxH - 12})`}>
                                  <rect
                                    x={-Math.max(65, ((p.customLabel || 'WINDOW AC UNIT').length * 4.5))}
                                    y="-9"
                                    width={Math.max(130, ((p.customLabel || 'WINDOW AC UNIT').length * 9))}
                                    height="16"
                                    rx="2"
                                    fill="#0284c7"
                                    stroke="#ffffff"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x="0"
                                    y="3"
                                    fill="#ffffff"
                                    fontSize="9"
                                    fontWeight="bold"
                                    letterSpacing="0.4"
                                    textAnchor="middle"
                                  >
                                    {p.customLabel
                                      ? `${p.customLabel} (${Math.round(p.width)}×${Math.round(p.height)})`
                                      : `WINDOW AC (${Math.round(p.width)}×${Math.round(p.height)} mm)`}
                                  </text>
                                </g>
                              </g>
                            );
                          })()
                        )}
                      </g>
                    )}

                    {/* ----------------------------------------------------- */}
                    {/* CASEMENT OPENING SWING TRIANGLES & HARDWARE HANDLES */}
                    {/* ----------------------------------------------------- */}
                    {(sashType === 'casement_left' ||
                      sashType === 'casement_right' ||
                      sashType === 'casement_door_4side' ||
                      sashType === 'casement_door_3side' ||
                      sashType === 'casement') && (() => {
                      const hp = calculateHandlePlacement(f, p, pIdx);
                      const isApexLeft = hp.side === 'left';
                      const apexY = hp.y;
                      const trianglePoints = isApexLeft
                        ? `${pX + pW - 6},${pY + 6} ${pX + 6},${apexY} ${pX + pW - 6},${pY + pH - 6}`
                        : `${pX + 6},${pY + 6} ${pX + pW - 6},${apexY} ${pX + 6},${pY + pH - 6}`;
                      const ghh = Math.round(f.y + f.height - hp.y);

                      const openDir = p.openDirection || 'out';
                      const isOpeningIn = openDir === 'in';

                      return (
                        <g id={`sash-casement-${p.id}`}>
                          <polygon
                            points={trianglePoints}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth={Math.max(2, 2.6 * scale)}
                            strokeDasharray={isOpeningIn ? undefined : "6 4"}
                          />

                          {/* S1 Tag at top edge of Sash (EvaWin standard) */}
                          {showLabels && (
                            <g transform={`translate(${cX}, ${pY + 12})`}>
                              <rect x="-16" y="-9" width="32" height="18" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                              <text x="0" y="3.5" textAnchor="middle" fill="#0f172a" fontSize="10.5" fontWeight="900" fontFamily="monospace">
                                {`S ${pIdx + 1}`}
                              </text>
                            </g>
                          )}

                          {/* Pocket Index Circle ( 1 ) */}
                          {showLabels && (
                            <g transform={`translate(${cX}, ${cY - 16})`}>
                              <ellipse cx="0" cy="0" rx="14" ry="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                              <text x="0" y="3.5" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">
                                {pIdx + 1}
                              </text>
                            </g>
                          )}

                          {/* OUT / IN Indicator in Glass Panel */}
                          {showLabels && (
                            <g transform={`translate(${cX}, ${cY + 16})`}>
                              <rect x="-26" y="-9" width="52" height="18" rx="2" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.2" />
                              <text x="0" y="3.5" textAnchor="middle" fill="#0284c7" fontSize="10.5" fontWeight="900" fontFamily="sans-serif">
                                {isOpeningIn ? 'IN' : 'OUT'}
                              </text>
                            </g>
                          )}

                          {/* F1 Corner Hardware Marker (as in reference drawing) */}
                          <g transform={`translate(${pX + pW - 14}, ${pY + pH - 10})`}>
                            <rect x="-10" y="-8" width="20" height="15" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
                            <text x="0" y="3" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold" fontFamily="monospace">
                              {p.cornerCode || 'F1'}
                            </text>
                          </g>

                          {/* Hardware Handle & GHH Height Badge */}
                          {showHandles && hp.shouldShow && (
                            <g>
                              <HardwareHandle
                                x={hp.x}
                                y={hp.y}
                                type={
                                  p.handleType ||
                                  (isDoor || sashType.includes('door')
                                    ? 'door_lever'
                                    : 'casement_espag')
                                }
                                orientation={hp.orientation}
                                color={p.handleColor || 'silver'}
                                scale={handleScale}
                              />
                              <g transform={`translate(${isApexLeft ? hp.x + 8 : hp.x - 76}, ${hp.y - 7})`}>
                                <rect x="0" y="0" width="68" height="15" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
                                <text x="34" y="11" textAnchor="middle" fill="#0f172a" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                                  GHH = {ghh}
                                </text>
                              </g>
                            </g>
                          )}
                        </g>
                      );
                    })()}

                    {/* Top Hung (Hinged Top, Handle Bottom) */}
                    {isTopHung && (() => {
                      const hp = calculateHandlePlacement(f, p, pIdx);
                      return (
                        <g id={`sash-top-hung-${p.id}`}>
                          <polygon
                            points={`${pX + 6},${pY + 6} ${cX},${pY + pH - 6} ${pX + pW - 6},${pY + 6}`}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth={Math.max(2, 2.6 * scale)}
                            strokeDasharray="6 4"
                          />
                          {showHandles && hp.shouldShow && (
                            <HardwareHandle
                              x={hp.x}
                              y={hp.y}
                              type={p.handleType || 'cockspur_handle'}
                              orientation={hp.orientation}
                              color={p.handleColor || 'silver'}
                              scale={handleScale}
                            />
                          )}
                        </g>
                      );
                    })()}

                    {/* Bottom Hung (Hinged Bottom, Handle Top) */}
                    {isBottomHung && (() => {
                      const hp = calculateHandlePlacement(f, p, pIdx);
                      return (
                        <g id={`sash-bottom-hung-${p.id}`}>
                          <polygon
                            points={`${pX + 6},${pY + pH - 6} ${cX},${pY + 6} ${pX + pW - 6},${pY + pH - 6}`}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth={Math.max(2, 2.6 * scale)}
                            strokeDasharray="6 4"
                          />
                          {showHandles && hp.shouldShow && (
                            <HardwareHandle
                              x={hp.x}
                              y={hp.y}
                              type={p.handleType || 'cockspur_handle'}
                              orientation={hp.orientation}
                              color={p.handleColor || 'silver'}
                              scale={handleScale}
                            />
                          )}
                        </g>
                      );
                    })()}

                    {/* Tilt & Turn (Dual Swing Lines) */}
                    {isTiltTurn && (() => {
                      const hp = calculateHandlePlacement(f, p, pIdx);
                      const isApexLeft = hp.side === 'left';
                      const sideSwingPoints = isApexLeft
                        ? `${pX + pW - 6},${pY + 6} ${pX + 6},${cY} ${pX + pW - 6},${pY + pH - 6}`
                        : `${pX + 6},${pY + 6} ${pX + pW - 6},${cY} ${pX + 6},${pY + pH - 6}`;

                      return (
                        <g id={`sash-tilt-turn-${p.id}`}>
                          <polygon
                            points={sideSwingPoints}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth={Math.max(1.8, 2.2 * scale)}
                            strokeDasharray="6 4"
                          />
                          <polygon
                            points={`${pX + 6},${pY + pH - 6} ${cX},${pY + 6} ${pX + pW - 6},${pY + pH - 6}`}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth={Math.max(1.8, 2.2 * scale)}
                            strokeDasharray="4 4"
                          />
                          {showHandles && hp.shouldShow && (
                            <HardwareHandle
                              x={hp.x}
                              y={hp.y}
                              type={p.handleType || 'casement_espag'}
                              orientation={hp.orientation}
                              color={p.handleColor || 'silver'}
                              scale={handleScale}
                            />
                          )}
                        </g>
                      );
                    })()}

                    {/* French Open (Meeting Dual Sashes) */}
                    {isFrench && (
                      <g id={`sash-french-${p.id}`}>
                        <line
                          x1={cX}
                          y1={pY}
                          x2={cX}
                          y2={pY + pH}
                          stroke="#0f172a"
                          strokeWidth={Math.max(2, 2.6 * scale)}
                        />
                        <polygon
                          points={`${pX + 6},${pY + 6} ${cX - 4},${cY} ${pX + 6},${pY + pH - 6}`}
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth={Math.max(1.8, 2.2 * scale)}
                          strokeDasharray="6 4"
                        />
                        <polygon
                          points={`${pX + pW - 6},${pY + 6} ${cX + 4},${cY} ${pX + pW - 6},${pY + pH - 6}`}
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth={Math.max(1.8, 2.2 * scale)}
                          strokeDasharray="6 4"
                        />
                        {showHandles && (
                          <>
                            <HardwareHandle
                              x={cX - Math.max(12, 16 * scale)}
                              y={cY}
                              type={isDoor ? 'door_lever' : 'casement_espag'}
                              orientation="left"
                              color={p.handleColor || 'silver'}
                              scale={handleScale}
                            />
                            <HardwareHandle
                              x={cX + Math.max(12, 16 * scale)}
                              y={cY}
                              type={isDoor ? 'door_lever' : 'casement_espag'}
                              orientation="right"
                              color={p.handleColor || 'silver'}
                              scale={handleScale}
                            />
                          </>
                        )}
                      </g>
                    )}

                    {/* ----------------------------------------------------- */}
                    {/* SLIDING SASHES (2.5D ARCHITECTURAL RENDERING 1:1 CAD CANVAS) */}
                    {/* ----------------------------------------------------- */}
                    {/* 1. Single Pocket Frame: splits into S1 and S2 (2-track template) */}
                    {isAnySlider && f.pockets.length === 1 && (() => {
                      const ghhValue = p.handleHeight
                        ? Math.round(p.handleHeight)
                        : isDoor
                        ? 1000
                        : Math.round(pH / 2);
                      const handleY =
                        p.handleHeight && p.handleHeight >= 60 && p.handleHeight <= pH - 60
                          ? pY + pH - p.handleHeight
                          : isDoor
                          ? pY + pH - 1000
                          : cY;

                      if (isSliderOx) {
                        // OX: Left Fixed (S1 Back), Right Sliding (S2 Front)
                        return (
                          <g id={`slider-ox-${p.id}`}>
                            {/* S1 Left Track (Back) Outer Frame Box */}
                            <rect
                              x={pX}
                              y={pY}
                              width={pW * 0.5 + 10}
                              height={pH}
                              fill="#f8fafc"
                              stroke="#0f172a"
                              strokeWidth={Math.max(1.6, 2 * scale)}
                            />
                            {/* S1 Inner Step & Beading */}
                            <rect
                              x={pX + 20}
                              y={pY + 20}
                              width={Math.max(10, pW * 0.5 + 10 - 30)}
                              height={Math.max(10, pH - 40)}
                              fill="#f1f5f9"
                              stroke="#334155"
                              strokeWidth={Math.max(1, 1.2 * scale)}
                            />
                            {/* S1 Glass Pane */}
                            <rect
                              x={pX + 26}
                              y={pY + 26}
                              width={Math.max(10, pW * 0.5 + 10 - 42)}
                              height={Math.max(10, pH - 52)}
                              fill="url(#sashBackGlassShade)"
                              stroke="#0f172a"
                              strokeWidth={Math.max(1.2, 1.4 * scale)}
                            />
                            {/* S1 Georgian / Dorgen Bar */}
                            {renderGeorgianBarGrid(pX + 26, pY + 26, Math.max(10, pW * 0.5 + 10 - 42), Math.max(10, pH - 52), p, frameColor)}
                            {/* S1 Left 45° Corner Miters */}
                            <line x1={pX} y1={pY} x2={pX + 20} y2={pY + 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                            <line x1={pX} y1={pY + pH} x2={pX + 20} y2={pY + pH - 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                            {/* S1 (Back) Badge */}
                            {showLabels && (
                              <g transform={`translate(${pX + pW * 0.25 - 2}, ${pY + Math.max(14, 18 * scale)})`}>
                                <rect x="-24" y="-10" width="48" height="20" rx="3" fill="#ffffff" stroke="#64748b" strokeWidth="1.6" />
                                <text x="0" y="4.5" fill="#475569" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">S1 (Back)</text>
                              </g>
                            )}

                            {/* S1 Circled Bay Number 1 & Fixed Mark */}
                            <g transform={`translate(${pX + pW * 0.25 - 2}, ${cY})`}>
                              <circle r={Math.max(11, 14 * scale)} fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
                              <line x1="-6" y1="0" x2="6" y2="0" stroke="#0f172a" strokeWidth="2" />
                              <line x1="0" y1="-6" x2="0" y2="6" stroke="#0f172a" strokeWidth="2" />
                            </g>

                            {/* S2 Right Elevation Drop Shadow cast onto S1 */}
                            <rect
                              x={cX - 12}
                              y={pY}
                              width={12}
                              height={pH}
                              fill="url(#sashOverlapShadowGrad)"
                              pointerEvents="none"
                            />

                            {/* S2 Right Track (Front Elevated) Outer Frame Box */}
                            <rect
                              x={cX - 2}
                              y={pY}
                              width={pW * 0.5 + 2}
                              height={pH}
                              fill="#ffffff"
                              stroke="#0f172a"
                              strokeWidth={Math.max(2, 2.4 * scale)}
                            />
                            {/* 2.5D Elevation Highlights on Left Edge of S2 */}
                            <line x1={cX - 2} y1={pY} x2={cX - 2} y2={pY + pH} stroke="#0284c7" strokeWidth="2.5" strokeOpacity="0.8" />
                            <line x1={cX - 0.8} y1={pY} x2={cX - 0.8} y2={pY + pH} stroke="#ffffff" strokeWidth="1.2" />

                            {/* S2 Inner Step & Beading */}
                            <rect
                              x={cX + 12}
                              y={pY + 20}
                              width={Math.max(10, pW * 0.5 + 2 - 32)}
                              height={Math.max(10, pH - 40)}
                              fill="#ffffff"
                              stroke="#334155"
                              strokeWidth={Math.max(1, 1.2 * scale)}
                            />
                            {/* S2 Glass Pane */}
                            <rect
                              x={cX + 18}
                              y={pY + 26}
                              width={Math.max(10, pW * 0.5 + 2 - 44)}
                              height={Math.max(10, pH - 52)}
                              fill="url(#sashFrontGlassShade)"
                              stroke="#0f172a"
                              strokeWidth={Math.max(1.2, 1.4 * scale)}
                            />
                            {/* S2 Georgian / Dorgen Bar */}
                            {renderGeorgianBarGrid(cX + 18, pY + 26, Math.max(10, pW * 0.5 + 2 - 44), Math.max(10, pH - 52), p, frameColor)}
                            {/* S2 Right 45° Corner Miters */}
                            <line x1={pX + pW} y1={pY} x2={pX + pW - 20} y2={pY + 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                            <line x1={pX + pW} y1={pY + pH} x2={pX + pW - 20} y2={pY + pH - 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                            {/* Glass Reflection Streak Line */}
                            <line
                              x1={cX + 24}
                              y1={pY + 30}
                              x2={cX + Math.min(60, pW * 0.2)}
                              y2={pY + Math.min(70, pH * 0.3)}
                              stroke="#ffffff"
                              strokeWidth={Math.max(2, 2.6 * scale)}
                              strokeLinecap="round"
                              strokeOpacity={0.9}
                              pointerEvents="none"
                            />

                            {/* S2 (Front) Badge */}
                            {showLabels && (
                              <g transform={`translate(${pX + pW * 0.75 + 4}, ${pY + Math.max(14, 18 * scale)})`}>
                                <rect x="-24" y="-10" width="48" height="20" rx="3" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                                <text x="0" y="4.5" fill="#0284c7" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">S2 (Front)</text>
                              </g>
                            )}

                            {/* S2 Circled Bay Number 2 */}
                            <g transform={`translate(${pX + pW * 0.75 + 4}, ${cY - (showArrows ? Math.max(14, 18 * scale) : 0)})`}>
                              <circle r={Math.max(11, 14 * scale)} fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                              <text x="0" y={Math.max(4, 5 * scale)} fill="#0284c7" fontSize={Math.max(11, 14 * scale)} fontWeight="900" fontFamily="sans-serif" textAnchor="middle">2</text>
                            </g>

                            {/* S2 Slide Right Arrow */}
                            {showArrows && (
                              <g transform={`translate(${pX + pW * 0.75 + 4}, ${cY + Math.max(16, 20 * scale)})`}>
                                <line x1={-Math.max(18, 24 * scale)} y1="0" x2={Math.max(18, 24 * scale)} y2="0" stroke="#0f172a" strokeWidth={Math.max(2.2, 3 * scale)} />
                                <polygon
                                  points={`${Math.max(14, 18 * scale)},-5.5 ${Math.max(22, 28 * scale)},0 ${Math.max(14, 18 * scale)},5.5`}
                                  fill="#0f172a"
                                />
                              </g>
                            )}

                            {/* Sliding Handle on Right Frame Stile (Facing Frame) */}
                            {showHandles && (
                              <>
                                <HardwareHandle
                                  x={pX + pW - 14}
                                  y={handleY}
                                  type={p.handleType || 'sliding_flush'}
                                  orientation="left"
                                  color={p.handleColor || 'silver'}
                                  scale={Math.min(1.2, handleScale)}
                                />
                                {p.handleHeight && (
                                  <g transform={`translate(${pX + pW - 90}, ${handleY + 24})`}>
                                    <rect x="0" y="-10" width="76" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
                                    <text x="38" y="4.5" fill="#0f172a" fontSize="10.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">GHH = {ghhValue}</text>
                                  </g>
                                )}
                              </>
                            )}
                          </g>
                        );
                      }

                      if (isSliderXo) {
                        // XO: Left Sliding (S1 Front), Right Fixed (S2 Back)
                        return (
                          <g id={`slider-xo-${p.id}`}>
                            {/* S2 Right Track (Back) Outer Frame Box */}
                            <rect
                              x={cX - 8}
                              y={pY}
                              width={pW * 0.5 + 8}
                              height={pH}
                              fill="#f8fafc"
                              stroke="#0f172a"
                              strokeWidth={Math.max(1.6, 2 * scale)}
                            />
                            {/* S2 Inner Step & Beading */}
                            <rect
                              x={cX + 12}
                              y={pY + 20}
                              width={Math.max(10, pW * 0.5 + 8 - 32)}
                              height={Math.max(10, pH - 40)}
                              fill="#f1f5f9"
                              stroke="#334155"
                              strokeWidth={Math.max(1, 1.2 * scale)}
                            />
                            {/* S2 Glass Pane */}
                            <rect
                              x={cX + 18}
                              y={pY + 26}
                              width={Math.max(10, pW * 0.5 + 8 - 44)}
                              height={Math.max(10, pH - 52)}
                              fill="url(#sashBackGlassShade)"
                              stroke="#0f172a"
                              strokeWidth={Math.max(1.2, 1.4 * scale)}
                            />
                            {/* S2 Georgian / Dorgen Bar */}
                            {renderGeorgianBarGrid(cX + 18, pY + 26, Math.max(10, pW * 0.5 + 8 - 44), Math.max(10, pH - 52), p, frameColor)}
                            {/* S2 Right 45° Corner Miters */}
                            <line x1={pX + pW} y1={pY} x2={pX + pW - 20} y2={pY + 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                            <line x1={pX + pW} y1={pY + pH} x2={pX + pW - 20} y2={pY + pH - 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                            {/* S2 (Back) Badge */}
                            {showLabels && (
                              <g transform={`translate(${pX + pW * 0.75 + 2}, ${pY + Math.max(14, 18 * scale)})`}>
                                <rect x="-24" y="-10" width="48" height="20" rx="3" fill="#ffffff" stroke="#64748b" strokeWidth="1.6" />
                                <text x="0" y="4.5" fill="#475569" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">S2 (Back)</text>
                              </g>
                            )}

                            {/* S2 Circled Bay Number 2 & Fixed Mark */}
                            <g transform={`translate(${pX + pW * 0.75 + 2}, ${cY})`}>
                              <circle r={Math.max(11, 14 * scale)} fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
                              <line x1="-6" y1="0" x2="6" y2="0" stroke="#0f172a" strokeWidth="2" />
                              <line x1="0" y1="-6" x2="0" y2="6" stroke="#0f172a" strokeWidth="2" />
                            </g>

                            {/* S1 Left Track (Front Elevated) Outer Frame Box */}
                            <rect
                              x={pX}
                              y={pY}
                              width={pW * 0.5 + 4}
                              height={pH}
                              fill="#ffffff"
                              stroke="#0f172a"
                              strokeWidth={Math.max(2, 2.4 * scale)}
                            />
                            {/* S1 Elevation Drop Shadow onto S2 */}
                            <rect
                              x={cX + 4}
                              y={pY}
                              width={12}
                              height={pH}
                              fill="url(#sashOverlapShadowGrad)"
                              pointerEvents="none"
                            />
                            {/* 2.5D Elevation Highlights on Right Edge of S1 */}
                            <line x1={cX + 4} y1={pY} x2={cX + 4} y2={pY + pH} stroke="#0284c7" strokeWidth="2.5" strokeOpacity="0.8" />
                            <line x1={cX + 2.8} y1={pY} x2={cX + 2.8} y2={pY + pH} stroke="#ffffff" strokeWidth="1.2" />

                            {/* S1 Inner Step & Beading */}
                            <rect
                              x={pX + 20}
                              y={pY + 20}
                              width={Math.max(10, pW * 0.5 + 4 - 32)}
                              height={Math.max(10, pH - 40)}
                              fill="#ffffff"
                              stroke="#334155"
                              strokeWidth={Math.max(1, 1.2 * scale)}
                            />
                            {/* S1 Glass Pane */}
                            <rect
                              x={pX + 26}
                              y={pY + 26}
                              width={Math.max(10, pW * 0.5 + 4 - 44)}
                              height={Math.max(10, pH - 52)}
                              fill="url(#sashFrontGlassShade)"
                              stroke="#0f172a"
                              strokeWidth={Math.max(1.2, 1.4 * scale)}
                            />
                            {/* S1 Georgian / Dorgen Bar */}
                            {renderGeorgianBarGrid(pX + 26, pY + 26, Math.max(10, pW * 0.5 + 4 - 44), Math.max(10, pH - 52), p, frameColor)}
                            {/* S1 Left 45° Corner Miters */}
                            <line x1={pX} y1={pY} x2={pX + 20} y2={pY + 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                            <line x1={pX} y1={pY + pH} x2={pX + 20} y2={pY + pH - 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                            {/* Glass Reflection Streak Line */}
                            <line
                              x1={pX + 26}
                              y1={pY + 30}
                              x2={pX + Math.min(60, pW * 0.2)}
                              y2={pY + Math.min(70, pH * 0.3)}
                              stroke="#ffffff"
                              strokeWidth={Math.max(2, 2.6 * scale)}
                              strokeLinecap="round"
                              strokeOpacity={0.9}
                              pointerEvents="none"
                            />

                            {/* S1 (Front) Badge */}
                            {showLabels && (
                              <g transform={`translate(${pX + pW * 0.25 - 2}, ${pY + Math.max(14, 18 * scale)})`}>
                                <rect x="-24" y="-10" width="48" height="20" rx="3" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                                <text x="0" y="4.5" fill="#0284c7" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">S1 (Front)</text>
                              </g>
                            )}

                            {/* S1 Circled Bay Number 1 */}
                            <g transform={`translate(${pX + pW * 0.25 - 2}, ${cY - (showArrows ? Math.max(14, 18 * scale) : 0)})`}>
                              <circle r={Math.max(11, 14 * scale)} fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                              <text x="0" y={Math.max(4, 5 * scale)} fill="#0284c7" fontSize={Math.max(11, 14 * scale)} fontWeight="900" fontFamily="sans-serif" textAnchor="middle">1</text>
                            </g>

                            {/* S1 Slide Left Arrow */}
                            {showArrows && (
                              <g transform={`translate(${pX + pW * 0.25 - 2}, ${cY + Math.max(16, 20 * scale)})`}>
                                <line x1={Math.max(18, 24 * scale)} y1="0" x2={-Math.max(18, 24 * scale)} y2="0" stroke="#0f172a" strokeWidth={Math.max(2.2, 3 * scale)} />
                                <polygon
                                  points={`${-Math.max(14, 18 * scale)},-5.5 ${-Math.max(22, 28 * scale)},0 ${-Math.max(14, 18 * scale)},5.5`}
                                  fill="#0f172a"
                                />
                              </g>
                            )}

                            {/* Sliding Handle on Left Frame Stile (Facing Frame) */}
                            {showHandles && (
                              <>
                                <HardwareHandle
                                  x={pX + 14}
                                  y={handleY}
                                  type={p.handleType || 'sliding_flush'}
                                  orientation="right"
                                  color={p.handleColor || 'silver'}
                                  scale={Math.min(1.2, handleScale)}
                                />
                                {p.handleHeight && (
                                  <g transform={`translate(${pX + 14}, ${handleY + 24})`}>
                                    <rect x="0" y="-10" width="76" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
                                    <text x="38" y="4.5" fill="#0f172a" fontSize="10.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">GHH = {ghhValue}</text>
                                  </g>
                                )}
                              </>
                            )}
                          </g>
                        );
                      }

                      // Default 2-Track Slider: XX / Generic (Both Sashes Slide)
                      return (
                        <g id={`slider-xx-${p.id}`}>
                          {/* S1 Left Track (Back) */}
                          <rect
                            x={pX}
                            y={pY}
                            width={pW * 0.5 + 10}
                            height={pH}
                            fill="#f8fafc"
                            stroke="#0f172a"
                            strokeWidth={Math.max(1.6, 2 * scale)}
                          />
                          {/* S1 Inner Step & Beading */}
                          <rect
                            x={pX + 20}
                            y={pY + 20}
                            width={Math.max(10, pW * 0.5 + 10 - 30)}
                            height={Math.max(10, pH - 40)}
                            fill="#f1f5f9"
                            stroke="#334155"
                            strokeWidth={Math.max(1, 1.2 * scale)}
                          />
                          {/* S1 Glass Pane */}
                          <rect
                            x={pX + 26}
                            y={pY + 26}
                            width={Math.max(10, pW * 0.5 + 10 - 42)}
                            height={Math.max(10, pH - 52)}
                            fill="url(#sashBackGlassShade)"
                            stroke="#0f172a"
                            strokeWidth={Math.max(1.2, 1.4 * scale)}
                          />
                          {/* S1 Georgian / Dorgen Bar */}
                          {renderGeorgianBarGrid(pX + 26, pY + 26, Math.max(10, pW * 0.5 + 10 - 42), Math.max(10, pH - 52), p, frameColor)}
                          {/* S1 Miters */}
                          <line x1={pX} y1={pY} x2={pX + 20} y2={pY + 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                          <line x1={pX} y1={pY + pH} x2={pX + 20} y2={pY + pH - 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                          {/* S1 (Back) Badge */}
                          {showLabels && (
                            <g transform={`translate(${pX + pW * 0.25 - 2}, ${pY + Math.max(14, 18 * scale)})`}>
                              <rect x="-24" y="-10" width="48" height="20" rx="3" fill="#ffffff" stroke="#64748b" strokeWidth="1.6" />
                              <text x="0" y="4.5" fill="#475569" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">S1 (Back)</text>
                            </g>
                          )}
                          {/* S1 Circled Bay Number 1 */}
                          <g transform={`translate(${pX + pW * 0.25 - 2}, ${cY - (showArrows ? Math.max(14, 18 * scale) : 0)})`}>
                            <circle r={Math.max(11, 14 * scale)} fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
                            <text x="0" y={Math.max(4, 5 * scale)} fill="#0f172a" fontSize={Math.max(11, 14 * scale)} fontWeight="900" fontFamily="sans-serif" textAnchor="middle">1</text>
                          </g>
                          {/* S1 Slide Right Arrow */}
                          {showArrows && (
                            <g transform={`translate(${pX + pW * 0.25 - 2}, ${cY + Math.max(16, 20 * scale)})`}>
                              <line x1={-Math.max(16, 22 * scale)} y1="0" x2={Math.max(16, 22 * scale)} y2="0" stroke="#0f172a" strokeWidth={Math.max(2.2, 3 * scale)} />
                              <polygon
                                points={`${Math.max(12, 16 * scale)},-5.5 ${Math.max(20, 26 * scale)},0 ${Math.max(12, 16 * scale)},5.5`}
                                fill="#0f172a"
                              />
                            </g>
                          )}

                          {/* S2 Right Elevation Drop Shadow cast onto S1 */}
                          <rect
                            x={cX - 12}
                            y={pY}
                            width={12}
                            height={pH}
                            fill="url(#sashOverlapShadowGrad)"
                            pointerEvents="none"
                          />

                          {/* S2 Right Track (Front Elevated) Outer Frame Box */}
                          <rect
                            x={cX - 2}
                            y={pY}
                            width={pW * 0.5 + 2}
                            height={pH}
                            fill="#ffffff"
                            stroke="#0f172a"
                            strokeWidth={Math.max(2, 2.4 * scale)}
                          />
                          {/* 2.5D Elevation Highlights on S2 */}
                          <line x1={cX - 2} y1={pY} x2={cX - 2} y2={pY + pH} stroke="#0284c7" strokeWidth="2.5" strokeOpacity="0.8" />
                          <line x1={cX - 0.8} y1={pY} x2={cX - 0.8} y2={pY + pH} stroke="#ffffff" strokeWidth="1.2" />

                          {/* S2 Inner Step & Beading */}
                          <rect
                            x={cX + 12}
                            y={pY + 20}
                            width={Math.max(10, pW * 0.5 + 2 - 32)}
                            height={Math.max(10, pH - 40)}
                            fill="#ffffff"
                            stroke="#334155"
                            strokeWidth={Math.max(1, 1.2 * scale)}
                          />
                          {/* S2 Glass Pane */}
                          <rect
                            x={cX + 18}
                            y={pY + 26}
                            width={Math.max(10, pW * 0.5 + 2 - 44)}
                            height={Math.max(10, pH - 52)}
                            fill="url(#sashFrontGlassShade)"
                            stroke="#0f172a"
                            strokeWidth={Math.max(1.2, 1.4 * scale)}
                          />
                          {/* S2 Georgian / Dorgen Bar */}
                          {renderGeorgianBarGrid(cX + 18, pY + 26, Math.max(10, pW * 0.5 + 2 - 44), Math.max(10, pH - 52), p, frameColor)}
                          {/* S2 Miters */}
                          <line x1={pX + pW} y1={pY} x2={pX + pW - 20} y2={pY + 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                          <line x1={pX + pW} y1={pY + pH} x2={pX + pW - 20} y2={pY + pH - 20} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                          {/* S2 (Front) Badge */}
                          {showLabels && (
                            <g transform={`translate(${pX + pW * 0.75 + 4}, ${pY + Math.max(14, 18 * scale)})`}>
                              <rect x="-24" y="-10" width="48" height="20" rx="3" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                              <text x="0" y="4.5" fill="#0284c7" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">S2 (Front)</text>
                            </g>
                          )}
                          {/* S2 Circled Bay Number 2 */}
                          <g transform={`translate(${pX + pW * 0.75 + 4}, ${cY - (showArrows ? Math.max(14, 18 * scale) : 0)})`}>
                            <circle r={Math.max(11, 14 * scale)} fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                            <text x="0" y={Math.max(4, 5 * scale)} fill="#0284c7" fontSize={Math.max(11, 14 * scale)} fontWeight="900" fontFamily="sans-serif" textAnchor="middle">2</text>
                          </g>
                          {/* S2 Slide Left Arrow */}
                          {showArrows && (
                            <g transform={`translate(${pX + pW * 0.75 + 4}, ${cY + (p.hasMesh || (f as any).hasMesh || p.sashType === 'slider_3t_2p_mesh' ? Math.max(6, 8 * scale) : Math.max(16, 20 * scale))})`}>
                              <line x1={Math.max(16, 22 * scale)} y1="0" x2={-Math.max(16, 22 * scale)} y2="0" stroke="#0f172a" strokeWidth={Math.max(2.2, 3 * scale)} />
                              <polygon
                                points={`${-Math.max(12, 16 * scale)},-5.5 ${-Math.max(20, 26 * scale)},0 ${-Math.max(12, 16 * scale)},5.5`}
                                fill="#0f172a"
                              />
                            </g>
                          )}

                          {/* S2 Fly Mesh Slide Arrow in Green (if fly mesh present) */}
                          {showArrows && (p.hasMesh || (f as any).hasMesh || p.sashType === 'slider_3t_2p_mesh') && (
                            <g transform={`translate(${pX + pW * 0.75 + 4}, ${cY + Math.max(26, 32 * scale)})`}>
                              <line x1={Math.max(14, 18 * scale)} y1="0" x2={-Math.max(14, 18 * scale)} y2="0" stroke="#059669" strokeWidth={Math.max(2, 2.6 * scale)} strokeLinecap="round" />
                              <polygon
                                points={`${-Math.max(10, 14 * scale)},-4.5 ${-Math.max(18, 22 * scale)},0 ${-Math.max(10, 14 * scale)},4.5`}
                                fill="#059669"
                              />
                            </g>
                          )}

                          {/* Both Handles */}
                          {showHandles && (
                            <>
                              <HardwareHandle
                                x={pX + 14}
                                y={handleY}
                                type={p.handleType || 'sliding_flush'}
                                orientation="right"
                                color={p.handleColor || 'silver'}
                                scale={Math.min(1.2, handleScale)}
                              />
                              <HardwareHandle
                                x={pX + pW - 14}
                                y={handleY}
                                type={p.handleType || 'sliding_flush'}
                                orientation="left"
                                color={p.handleColor || 'silver'}
                                scale={Math.min(1.2, handleScale)}
                              />
                              {p.handleHeight && (
                                <g transform={`translate(${pX + pW - 90}, ${handleY + 24})`}>
                                  <rect x="0" y="-10" width="76" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
                                  <text x="38" y="4.5" fill="#0f172a" fontSize="10.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">GHH = {ghhValue}</text>
                                </g>
                              )}
                            </>
                          )}
                        </g>
                      );
                    })()}

                    {/* 2. Multi-Pocket Frame: Each pocket is an individual sliding sash / panel matching CAD Canvas 1:1 */}
                    {isAnySlider && f.pockets.length > 1 && (() => {
                      const hp = calculateHandlePlacement(f, p, pIdx);
                      const showSlidingHandle = hp.shouldShow;
                      const arrowDir = getSlidingArrowDirection(f, p, pIdx);
                      const isFixedPanel = sashType === 'slider_fixed_center' || sashType === 'fixed';
                      const isMeshSashOnly =
                        p.sashType === 'mesh_sash' ||
                        p.sashType === 'mesh_slider_right' ||
                        p.sashType === 'mesh_slider_left' ||
                        p.sashType === 'slider_3t_2p_mesh' ||
                        p.sashType === 'slider_2s_with_mesh' ||
                        p.sashType === 'slider_3s_mesh';
                      const hasMeshLayer = Boolean(p.hasMesh) || Boolean((f as any).hasMesh) || isMeshSashOnly;
                      const meshOrder = (f.pockets || [])
                        .slice(0, pIdx)
                        .filter((pk) => Boolean(pk.hasMesh) || pk.sashType === 'mesh_sash' || pk.sashType === 'mesh_slider_right' || pk.sashType === 'mesh_slider_left').length;
                      const meshPanelNumber = (f.pockets?.length || 2) + meshOrder + 1;
                      const meshTagLabelText = `MS${meshOrder + 1} (FLY MESH)`;

                      const sashLabelText =
                        p.sashLabel ||
                        (isMeshSashOnly
                          ? `MS${meshOrder + 1}`
                          : p.customLabel?.startsWith('S') || p.customLabel?.startsWith('M')
                          ? p.customLabel
                          : `S${pIdx + 1}`);

                      const isBackTrack =
                        !isMeshSashOnly &&
                        (sashLabelText === 'S1' ||
                          (f.pockets.length === 2 && pIdx === 0) ||
                          (f.pockets.length === 3 && (pIdx === 0 || pIdx === 1) && !isMeshSashOnly) ||
                          (f.pockets.length === 4 && (pIdx === 0 || pIdx === 3)) ||
                          (f.pockets.length === 6 && (pIdx === 0 || pIdx === 5)));

                      const isFrontTrack =
                        !isMeshSashOnly &&
                        (sashLabelText === 'S2' ||
                          (f.pockets.length === 2 && pIdx === 1) ||
                          (f.pockets.length === 3 && pIdx === 2) ||
                          (f.pockets.length === 4 && (pIdx === 1 || pIdx === 2)) ||
                          (f.pockets.length === 6 && (pIdx === 2 || pIdx === 3)));

                      const isSlidingAssembly = f.pockets && f.pockets.length > 1;
                      const hasLeftSlider = isSlidingAssembly && pIdx > 0 && !isMeshSashOnly;
                      const hasRightSlider = isSlidingAssembly && pIdx < f.pockets.length - 1 && !isMeshSashOnly;

                      const overlapLeft = isFrontTrack && hasLeftSlider ? 14 : 0;
                      const overlapRight = isBackTrack && hasRightSlider ? 14 : 0;

                      const actualSashX = pX - overlapLeft;
                      const actualSashW = pW + overlapLeft + overlapRight;

                      const sashFaceW = Math.max(16, Math.min(Math.round(pW * 0.11), Math.round(pH * 0.11), 24));
                      const interlockW = 16;
                      const beadFaceW = 6;
                      const leftSashOffset = isFrontTrack && hasLeftSlider ? interlockW : sashFaceW;
                      const rightSashOffset = isBackTrack && hasRightSlider ? interlockW : sashFaceW;

                      const sGlassX = actualSashX + leftSashOffset + beadFaceW;
                      const sGlassY = pY + sashFaceW + beadFaceW;
                      const sGlassW = Math.max(10, actualSashW - (leftSashOffset + rightSashOffset + 2 * beadFaceW));
                      const sGlassH = Math.max(10, pH - 2 * (sashFaceW + beadFaceW));

                      const ghhValue = p.handleHeight
                        ? Math.round(p.handleHeight)
                        : isDoor
                        ? 1000
                        : Math.round(pH / 2);

                      return (
                        <g id={`slider-individual-${p.id}`}>
                          {/* S2 Drop shadow cast onto neighboring S1 on the left */}
                          {isFrontTrack && hasLeftSlider && (
                            <rect
                              x={actualSashX - 14}
                              y={pY}
                              width={14}
                              height={pH}
                              fill="url(#sashOverlapShadowGrad)"
                              pointerEvents="none"
                            />
                          )}

                          {/* Outer Sash Profile Box */}
                          <rect
                            x={actualSashX}
                            y={pY}
                            width={actualSashW}
                            height={pH}
                            fill={isFrontTrack ? '#ffffff' : isBackTrack ? '#f8fafc' : frameColorHex}
                            stroke="#0f172a"
                            strokeWidth={isFrontTrack ? Math.max(2, 2.4 * scale) : Math.max(1.6, 1.8 * scale)}
                          />

                          {/* 4-Corner 45° Miter Lines */}
                          <line x1={actualSashX} y1={pY} x2={actualSashX + leftSashOffset} y2={pY + sashFaceW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                          <line x1={actualSashX + actualSashW} y1={pY} x2={actualSashX + actualSashW - rightSashOffset} y2={pY + sashFaceW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                          <line x1={actualSashX} y1={pY + pH} x2={actualSashX + leftSashOffset} y2={pY + pH - sashFaceW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                          <line x1={actualSashX + actualSashW} y1={pY + pH} x2={actualSashX + actualSashW - rightSashOffset} y2={pY + pH - sashFaceW} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                          {/* Sash Inner Step Outline */}
                          <rect
                            x={actualSashX + leftSashOffset}
                            y={pY + sashFaceW}
                            width={Math.max(10, actualSashW - (leftSashOffset + rightSashOffset))}
                            height={Math.max(10, pH - 2 * sashFaceW)}
                            fill={isBackTrack ? '#f1f5f9' : '#ffffff'}
                            stroke="#334155"
                            strokeWidth={Math.max(1, 1.2 * scale)}
                          />

                          {/* S2 Front 2.5D Elevation Highlights */}
                          {isFrontTrack && (
                            <g id={`sash-front-elevation-${p.id}`} pointerEvents="none">
                              <line x1={actualSashX} y1={pY} x2={actualSashX} y2={pY + pH} stroke="#0284c7" strokeWidth="2.2" strokeOpacity="0.8" />
                              <line x1={actualSashX + 1.2} y1={pY} x2={actualSashX + 1.2} y2={pY + pH} stroke="#ffffff" strokeWidth="1.2" />
                              <line x1={actualSashX} y1={pY + 1} x2={actualSashX + actualSashW} y2={pY + 1} stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.9" />
                            </g>
                          )}

                          {/* S1 Recess Shadow on Meeting Edge */}
                          {isBackTrack && hasRightSlider && (
                            <rect
                              x={actualSashX + actualSashW - 14}
                              y={pY}
                              width={14}
                              height={pH}
                              fill="#0f172a"
                              fillOpacity="0.18"
                              pointerEvents="none"
                            />
                          )}

                          {/* Glazing Beading Profile with 45° Miters */}
                          <rect
                            x={actualSashX + leftSashOffset}
                            y={pY + sashFaceW}
                            width={Math.max(10, actualSashW - (leftSashOffset + rightSashOffset))}
                            height={Math.max(10, pH - 2 * sashFaceW)}
                            fill={isBackTrack ? '#e2e8f0' : '#f8fafc'}
                            stroke="#1e293b"
                            strokeWidth={Math.max(1, 1.2 * scale)}
                          />
                          <line x1={actualSashX + leftSashOffset} y1={pY + sashFaceW} x2={sGlassX} y2={sGlassY} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                          <line x1={actualSashX + actualSashW - rightSashOffset} y1={pY + sashFaceW} x2={sGlassX + sGlassW} y2={sGlassY} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                          <line x1={actualSashX + leftSashOffset} y1={pY + pH - sashFaceW} x2={sGlassX} y2={sGlassY + sGlassH} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />
                          <line x1={actualSashX + actualSashW - rightSashOffset} y1={pY + pH - sashFaceW} x2={sGlassX + sGlassW} y2={sGlassY + sGlassH} stroke="#475569" strokeWidth={Math.max(1, 1.2 * scale)} />

                          {/* Glass / Mesh Pane */}
                          <rect
                            x={sGlassX}
                            y={sGlassY}
                            width={sGlassW}
                            height={sGlassH}
                            fill={
                              isMeshSashOnly
                                ? 'url(#flyMeshDiamond)'
                                : isBackTrack
                                ? 'url(#sashBackGlassShade)'
                                : isFrontTrack
                                ? 'url(#sashFrontGlassShade)'
                                : 'url(#slidingGlassGrid)'
                            }
                            stroke="#0f172a"
                            strokeWidth={Math.max(1.4, 1.8 * scale)}
                          />

                          {/* Fly Mesh Wire Layer if present */}
                          {hasMeshLayer && !isMeshSashOnly && (
                            <rect
                              x={sGlassX}
                              y={sGlassY}
                              width={sGlassW}
                              height={sGlassH}
                              fill="url(#flyMeshDiamond)"
                              pointerEvents="none"
                            />
                          )}

                          {/* Glass Reflection Highlight Streak */}
                          {!isMeshSashOnly && (
                            <line
                              x1={sGlassX + Math.min(36, sGlassW * 0.25)}
                              y1={sGlassY + 5}
                              x2={sGlassX + 5}
                              y2={sGlassY + Math.min(36, sGlassH * 0.25)}
                              stroke="#ffffff"
                              strokeWidth={isFrontTrack ? Math.max(2.4, 2.8 * scale) : Math.max(1.6, 2 * scale)}
                              strokeLinecap="round"
                              strokeOpacity={isFrontTrack ? 0.95 : 0.65}
                              pointerEvents="none"
                            />
                          )}

                          {/* Georgian / Dorgen Bar on Sliding Glass Pane */}
                          {renderGeorgianBarGrid(sGlassX, sGlassY, sGlassW, sGlassH, p, frameColor)}

                          {/* Top Sash Badge: [ S1 (Back) ] / [ S2 (Front) • MS3 (Mesh) ] */}
                          {showLabels && (() => {
                            const hasFlyMesh = p.hasMesh || hasMeshLayer || p.sashType === 'slider_3t_2p_mesh';
                            const meshCode = trackCount === 3 ? 'MS3' : 'MS1';
                            const badgeLabel = isMeshSashOnly
                              ? meshCode
                              : isBackTrack
                              ? `${sashLabelText} (Back)`
                              : isFrontTrack
                              ? (hasFlyMesh ? `${sashLabelText} + ${meshCode}` : `${sashLabelText} (Front)`)
                              : sashLabelText;
                            const badgeW = Math.max(52, badgeLabel.length * 8.5 + 16);

                            return (
                              <g transform={`translate(${actualSashX + actualSashW / 2}, ${pY + Math.max(14, 18 * scale)})`}>
                                <rect
                                  x={-badgeW / 2}
                                  y="-10"
                                  width={badgeW}
                                  height="20"
                                  rx="3"
                                  fill="#ffffff"
                                  stroke={isFrontTrack ? '#0284c7' : '#64748b'}
                                  strokeWidth="1.6"
                                />
                                <text
                                  x="0"
                                  y="4.5"
                                  fill={isFrontTrack ? '#0284c7' : '#475569'}
                                  fontSize="11"
                                  fontWeight="900"
                                  fontFamily="sans-serif"
                                  textAnchor="middle"
                                >
                                  {badgeLabel}
                                </text>
                              </g>
                            );
                          })()}

                          {/* Center Circled Bay Number Badge & Directional Arrows */}
                          {(() => {
                            const hasMesh = p.hasMesh || hasMeshLayer || p.sashType === 'slider_3t_2p_mesh';
                            const circleR = Math.max(12, Math.round(14 * scale));
                            const circleFont = Math.max(12, Math.round(14 * scale));

                            // Vertical placement logic:
                            // When panel has BOTH glass sash and fly mesh (e.g. S2 + MS3):
                            // 1. Circle 2 badge: above Arrow 1 ("AK AROW KE SE THODA UPER")
                            // 2. Arrow 1 (Glass slide arrow in dark/black)
                            // 3. Arrow 2 (Mesh slide arrow in green)
                            // 4. Circle 3 badge: below both arrows ("AK DONO AROW KE THODA NICHE AYE")
                            // When panel only has glass sash (e.g. S1):
                            // Circle 1 is above Arrow 1, Arrow 1 is below center.
                            const arrow1Y = hasMesh
                              ? cY - Math.max(12, Math.round(14 * scale))
                              : cY + Math.max(16, Math.round(20 * scale));

                            const glassBadgeY = hasMesh
                              ? arrow1Y - circleR - Math.max(16, Math.round(18 * scale))
                              : (showArrows && arrowDir !== 'none' && !isFixedPanel
                                  ? cY - Math.max(24, Math.round(28 * scale))
                                  : cY);

                            const meshArrowY = cY + Math.max(18, Math.round(20 * scale));
                            const meshBadgeY = meshArrowY + circleR + Math.max(16, Math.round(18 * scale));

                            return (
                              <>
                                {/* 1. Center Circled Bay Number Badge (Glass Sash: 1 or 2) */}
                                <g transform={`translate(${actualSashX + actualSashW / 2}, ${glassBadgeY})`}>
                                  <circle
                                    r={circleR}
                                    fill="#ffffff"
                                    stroke={isFrontTrack ? '#0284c7' : '#0f172a'}
                                    strokeWidth={isFrontTrack ? '2' : '1.8'}
                                  />
                                  {isFixedPanel ? (
                                    <>
                                      <line x1="-6" y1="0" x2="6" y2="0" stroke="#0f172a" strokeWidth="2" />
                                      <line x1="0" y1="-6" x2="0" y2="6" stroke="#0f172a" strokeWidth="2" />
                                    </>
                                  ) : (
                                    <text
                                      x="0"
                                      y={Math.max(4, 5 * scale)}
                                      fill={isFrontTrack ? '#0284c7' : '#0f172a'}
                                      fontSize={circleFont}
                                      fontWeight="900"
                                      fontFamily="sans-serif"
                                      textAnchor="middle"
                                    >
                                      {pIdx + 1}
                                    </text>
                                  )}
                                </g>

                                {/* 2. Directional Slide Arrow (Glass Sash) */}
                                {showArrows && arrowDir !== 'none' && !isFixedPanel && (() => {
                                  const arrowHalfL = Math.max(42, Math.min(actualSashW * 0.20, 110));
                                  const arrowHeadL = Math.max(22, Math.min(42, Math.round(arrowHalfL * 0.38)));
                                  const arrowHeadH = Math.max(11, Math.min(20, Math.round(arrowHeadL * 0.45)));
                                  const arrowStroke = Math.max(3.2, Math.min(5.5, Math.round(arrowHeadH * 0.32)));

                                  return (
                                    <g transform={`translate(${actualSashX + actualSashW / 2}, ${arrow1Y})`}>
                                      {arrowDir === 'left' ? (
                                        <>
                                          <line x1={arrowHalfL} y1="0" x2={-arrowHalfL + arrowHeadL * 0.5} y2="0" stroke="#0f172a" strokeWidth={arrowStroke} strokeLinecap="round" />
                                          <polygon
                                            points={`${-arrowHalfL + arrowHeadL},${-arrowHeadH} ${-arrowHalfL},0 ${-arrowHalfL + arrowHeadL},${arrowHeadH}`}
                                            fill="#0f172a"
                                          />
                                        </>
                                      ) : arrowDir === 'both' ? (
                                        <>
                                          <line x1={-arrowHalfL + arrowHeadL * 0.5} y1="0" x2={arrowHalfL - arrowHeadL * 0.5} y2="0" stroke="#0f172a" strokeWidth={arrowStroke} strokeLinecap="round" />
                                          <polygon
                                            points={`${arrowHalfL - arrowHeadL},${-arrowHeadH} ${arrowHalfL},0 ${arrowHalfL - arrowHeadL},${arrowHeadH}`}
                                            fill="#0f172a"
                                          />
                                          <polygon
                                            points={`${-arrowHalfL + arrowHeadL},${-arrowHeadH} ${-arrowHalfL},0 ${-arrowHalfL + arrowHeadL},${arrowHeadH}`}
                                            fill="#0f172a"
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <line x1={-arrowHalfL} y1="0" x2={arrowHalfL - arrowHeadL * 0.5} y2="0" stroke="#0f172a" strokeWidth={arrowStroke} strokeLinecap="round" />
                                          <polygon
                                            points={`${arrowHalfL - arrowHeadL},${-arrowHeadH} ${arrowHalfL},0 ${arrowHalfL - arrowHeadL},${arrowHeadH}`}
                                            fill="#0f172a"
                                          />
                                        </>
                                      )}
                                    </g>
                                  );
                                })()}

                                {/* 3. Fly Mesh Slide Arrow in Green */}
                                {showArrows && arrowDir !== 'none' && !isFixedPanel && hasMesh && (() => {
                                  const meshHalfL = Math.max(38, Math.min(actualSashW * 0.18, 95));
                                  const meshHeadL = Math.max(20, Math.min(36, Math.round(meshHalfL * 0.38)));
                                  const meshHeadH = Math.max(10, Math.min(18, Math.round(meshHeadL * 0.45)));
                                  const meshStroke = Math.max(2.8, Math.min(4.8, Math.round(meshHeadH * 0.32)));

                                  return (
                                    <g transform={`translate(${actualSashX + actualSashW / 2}, ${meshArrowY})`}>
                                      {arrowDir === 'left' ? (
                                        <>
                                          <line x1={meshHalfL} y1="0" x2={-meshHalfL + meshHeadL * 0.5} y2="0" stroke="#059669" strokeWidth={meshStroke} strokeLinecap="round" />
                                          <polygon
                                            points={`${-meshHalfL + meshHeadL},${-meshHeadH} ${-meshHalfL},0 ${-meshHalfL + meshHeadL},${meshHeadH}`}
                                            fill="#059669"
                                          />
                                        </>
                                      ) : arrowDir === 'both' ? (
                                        <>
                                          <line x1={-meshHalfL + meshHeadL * 0.5} y1="0" x2={meshHalfL - meshHeadL * 0.5} y2="0" stroke="#059669" strokeWidth={meshStroke} strokeLinecap="round" />
                                          <polygon
                                            points={`${meshHalfL - meshHeadL},${-meshHeadH} ${meshHalfL},0 ${meshHalfL - meshHeadL},${meshHeadH}`}
                                            fill="#059669"
                                          />
                                          <polygon
                                            points={`${-meshHalfL + meshHeadL},${-meshHeadH} ${-meshHalfL},0 ${-meshHalfL + meshHeadL},${meshHeadH}`}
                                            fill="#059669"
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <line x1={-meshHalfL} y1="0" x2={meshHalfL - meshHeadL * 0.5} y2="0" stroke="#059669" strokeWidth={meshStroke} strokeLinecap="round" />
                                          <polygon
                                            points={`${meshHalfL - meshHeadL},${-meshHeadH} ${meshHalfL},0 ${meshHalfL - meshHeadL},${meshHeadH}`}
                                            fill="#059669"
                                          />
                                        </>
                                      )}
                                    </g>
                                  );
                                })()}

                                {/* 4. Mesh Circled Number 3 Badge in Green (Placed below both arrows: "AK DONO AROW KE THODA NICHE AYE") */}
                                {hasMesh && !isFixedPanel && (
                                  <g transform={`translate(${actualSashX + actualSashW / 2}, ${meshBadgeY})`}>
                                    <circle r={circleR} fill="#ffffff" stroke="#059669" strokeWidth="2" />
                                    <text
                                      x="0"
                                      y={Math.max(4, 5 * scale)}
                                      fill="#059669"
                                      fontSize={circleFont}
                                      fontWeight="900"
                                      fontFamily="sans-serif"
                                      textAnchor="middle"
                                    >
                                      {meshPanelNumber}
                                    </text>
                                  </g>
                                )}
                              </>
                            );
                          })()}

                          {/* Bottom Centered Mesh Identification Tag [MS1 / MS2 (FLY MESH)] */}
                          {(p.hasMesh || hasMeshLayer || p.sashType === 'slider_3t_2p_mesh') && (() => {
                            const meshTagLabel = p.customLabel?.includes('MS')
                              ? p.customLabel
                              : (f.pockets.length === 4 ? meshTagLabelText : (trackCount === 3 ? 'MS3 (जाली)' : meshTagLabelText));
                            const tagW = Math.max(76, meshTagLabel.length * 8 + 14);
                            const tagH = Math.max(18, Math.min(22, Math.round(18 * scale)));
                            const tagFont = Math.max(8.5, Math.min(12, Math.round(tagH * 0.52)));

                            return (
                              <g transform={`translate(${actualSashX + actualSashW / 2}, ${pY + pH - Math.max(16, 20 * scale)})`}>
                                <rect
                                  x={-tagW / 2}
                                  y={-tagH / 2}
                                  width={tagW}
                                  height={tagH}
                                  rx="3"
                                  fill="#ecfdf5"
                                  stroke="#059669"
                                  strokeWidth={Math.max(1.2, 1.4 * scale)}
                                />
                                <text
                                  x="0"
                                  y={tagFont * 0.35}
                                  fill="#065f46"
                                  fontSize={tagFont}
                                  fontWeight="900"
                                  fontFamily="sans-serif"
                                  textAnchor="middle"
                                >
                                  {meshTagLabel}
                                </text>
                              </g>
                            );
                          })()}

                          {/* Hardware Handle - Synchronized with CAD canvas 1:1 */}
                          {showHandles && showSlidingHandle && (
                            <>
                              <HardwareHandle
                                x={hp.x}
                                y={hp.y}
                                type={p.handleType || 'sliding_flush'}
                                orientation={hp.orientation}
                                color={p.handleColor || 'silver'}
                                scale={Math.min(1.2, handleScale)}
                              />
                              {p.handleHeight && (
                                <g transform={`translate(${hp.x > (actualSashX + actualSashW / 2) ? actualSashX + actualSashW - 88 : actualSashX + 12}, ${hp.y + 24})`}>
                                  <rect x="0" y="-10" width="76" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
                                  <text x="38" y="4.5" fill="#0f172a" fontSize="10.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">GHH = {ghhValue}</text>
                                </g>
                              )}
                            </>
                          )}
                        </g>
                      );
                    })()}
                  </g>
                );
              });
            })()}

              {/* Frame Label Badge in Bottom-Right Corner */}
              {showLabels && (
                <g transform={`translate(${f.x + f.width - Math.max(28, 38 * scale)}, ${f.y + f.height - Math.max(14, 18 * scale)})`}>
                  <rect
                    x={-Math.max(18, 24 * scale)}
                    y={-Math.max(8, 11 * scale)}
                    width={Math.max(36, 48 * scale)}
                    height={Math.max(16, 22 * scale)}
                    rx={Math.max(2, 3 * scale)}
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth={Math.max(1.2, 1.6 * scale)}
                  />
                  <text
                    x="0"
                    y={Math.max(3.5, 4.5 * scale)}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize={Math.max(9, Math.min(18, 11 * scale))}
                    fontWeight="900"
                    fontFamily="monospace"
                  >
                    {badgeTag || `F${fIdx + 1}`}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* 6. ARCHITECTURAL TRACK CROSS-SECTION PLAN (MATCHING CAD 1:1) */}
        {/* ------------------------------------------------------------- */}
        {hasSlidingFrame && showLabels && activeFrames.map((f) => {
          const isSliding = f.series?.startsWith('sliding') || (f.pockets || []).some((p) => p.sashType?.startsWith('slider_') || p.sashType === 'mesh_sash');
          if (!isSliding) return null;
          const trackCount = f.series === 'sliding_88' || (f.pockets && f.pockets.length > 2) || (f.pockets || []).some(p => p.hasMesh) ? 3 : 2;
          const planH = Math.max(56, trackPlanTierH - 16);

          return (
            <g key={`track-plan-${f.id}`} id={`track-section-${f.id}`} className="select-none">
              {/* Outer plan container */}
              <rect
                x={f.x}
                y={trackPlanY}
                width={f.width}
                height={planH}
                fill="#f8fafc"
                stroke="#334155"
                strokeWidth={Math.max(1.8, 2.2 * scale)}
                rx={Math.max(3, 4 * scale)}
              />

              {/* Top Badge: Track Identification */}
              <rect
                x={f.x}
                y={trackPlanY - Math.max(15, 18 * scale)}
                width={Math.min(f.width, trackCount === 3 ? Math.max(250, 290 * scale) : Math.max(210, 245 * scale))}
                height={Math.max(15, 17 * scale)}
                rx="3"
                fill="#0f172a"
              />
              <text
                x={f.x + 8}
                y={trackPlanY - Math.max(3.5, 6 * scale)}
                fill={trackCount === 3 ? '#34d399' : '#38bdf8'}
                fontSize={Math.max(8.5, Math.min(16, 9.5 * scale))}
                fontWeight="900"
                fontFamily="sans-serif"
              >
                {trackCount === 3
                  ? '🛤️ 3 TRACK (3 RAILS) • 2 GLASS + 1 MESH'
                  : '🛤️ 2 TRACK (2 RAILS) • 2 PANELS (S1 & S2)'}
              </text>

              {/* Left OUT / IN markers */}
              <text
                x={f.x - Math.max(24, 30 * scale)}
                y={trackPlanY + Math.max(12, 15 * scale)}
                fill="#475569"
                fontSize={Math.max(8, Math.min(14, 9 * scale))}
                fontWeight="900"
                fontFamily="sans-serif"
              >
                OUT (बाहर)
              </text>
              <text
                x={f.x - Math.max(18, 24 * scale)}
                y={trackPlanY + planH - Math.max(6, 8 * scale)}
                fill="#475569"
                fontSize={Math.max(8, Math.min(14, 9 * scale))}
                fontWeight="900"
                fontFamily="sans-serif"
              >
                IN (अंदर)
              </text>

              {/* Guide Rails */}
              {Array.from({ length: trackCount }).map((_, tIdx) => {
                const railY = trackPlanY + Math.max(11, 13 * scale) + (tIdx * (planH - Math.max(22, 26 * scale))) / Math.max(1, trackCount - 1);
                const isMeshRail = trackCount === 3 && tIdx === 0;
                return (
                  <g key={`rail-${tIdx}`}>
                    <line
                      x1={f.x + 8}
                      y1={railY}
                      x2={f.x + f.width - 8}
                      y2={railY}
                      stroke={isMeshRail ? '#10b981' : '#94a3b8'}
                      strokeWidth={isMeshRail ? 2 : 1.5}
                      strokeDasharray={isMeshRail ? '5 3' : 'none'}
                    />
                    <text
                      x={f.x + f.width + 6}
                      y={railY + Math.max(3, 3.5 * scale)}
                      fill="#64748b"
                      fontSize={Math.max(7.5, Math.min(13, 8 * scale))}
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {trackCount === 3
                        ? tIdx === 0
                          ? 'R1: जाली (MS3 Mesh)'
                          : tIdx === 1
                          ? 'R2: S1 (पीछे)'
                          : 'R3: S2 (आगे)'
                        : tIdx === 0
                        ? 'R1: S1 (पीछे)'
                        : 'R2: S2 (आगे)'}
                    </text>
                  </g>
                );
              })}

              {/* Sashes on Tracks */}
              {(f.pockets || []).map((p, pIdx) => {
                const sashW = p.width;
                const sashX = f.x + p.x;
                const isMesh =
                  p.sashType === 'mesh_sash' ||
                  p.hasMesh ||
                  p.customLabel?.includes('Mesh') ||
                  p.customLabel?.startsWith('M') ||
                  (trackCount === 3 && pIdx === 0);

                let trackIdx = 0;
                if (trackCount === 3) {
                  if (f.pockets.length === 2) {
                    // For 3-track 2-panel window:
                    // Rail 0 (R1) is Mesh (MS3)
                    // Rail 1 (R2) is Glass Sash 1 (S1)
                    // Rail 2 (R3) is Glass Sash 2 (S2)
                    trackIdx = pIdx === 0 ? 1 : 2;
                  } else if (f.pockets.length === 4) {
                    // For 3-track 4-bay (6 PANEL 3 TRACK):
                    // Rail 0 (R1) is Center Fly Mesh (MS1, MS2)
                    // Rail 1 (R2) is Outer Glass Sashes (S1, S4)
                    // Rail 2 (R3) is Center Meeting Glass Sashes (S2, S3)
                    trackIdx = pIdx === 0 || pIdx === 3 ? 1 : 2;
                  } else if (f.pockets.length === 6) {
                    // 3-Track 6-Panel:
                    // S1 (0), S6 (5) on Rail 1 (Track 0)
                    // S2 (1), S5 (4) on Rail 2 (Track 1)
                    // S3 (2), S4 (3) on Rail 3 (Track 2 - meeting at center)
                    if (pIdx === 0 || pIdx === 5) trackIdx = 0;
                    else if (pIdx === 1 || pIdx === 4) trackIdx = 1;
                    else trackIdx = 2;
                  } else {
                    if (isMesh) trackIdx = 0;
                    else if (pIdx === 1 || p.customLabel === 'S1') trackIdx = 1;
                    else trackIdx = 2;
                  }
                } else {
                  if (pIdx === 0 || p.customLabel === 'S1') trackIdx = 0;
                  else trackIdx = 1;
                }

                const railY = trackPlanY + Math.max(11, 13 * scale) + (trackIdx * (planH - Math.max(22, 26 * scale))) / Math.max(1, trackCount - 1);
                const overlapLeft = trackIdx > 0 ? 8 : 0;
                const overlapRight = trackIdx < (trackCount - 1) ? 8 : 0;
                const sashPlanX = sashX - overlapLeft + 3;
                const sashPlanW = sashW + overlapLeft + overlapRight - 6;
                const isFixed = p.sashType === 'slider_fixed_center' || p.sashType === 'fixed';

                return (
                  <g key={`track-sash-${p.id}`}>
                    {trackIdx > 0 && (
                      <rect
                        x={sashPlanX - 2}
                        y={railY - Math.max(4.5, 5.5 * scale)}
                        width="4"
                        height={Math.max(9, 11 * scale)}
                        fill="#0f172a"
                        fillOpacity="0.3"
                      />
                    )}
                    <rect
                      x={sashPlanX}
                      y={railY - Math.max(4.5, 5.5 * scale)}
                      width={sashPlanW}
                      height={Math.max(9, 11 * scale)}
                      rx="2"
                      fill={isMesh && f.pockets.length !== 2 && f.pockets.length !== 4 ? 'url(#flyMeshDiamond)' : trackIdx === 1 && trackCount === 3 ? '#dbe4ed' : trackIdx === 0 ? '#dbe4ed' : '#ffffff'}
                      stroke={isMesh && f.pockets.length !== 2 && f.pockets.length !== 4 ? '#059669' : '#0f172a'}
                      strokeWidth={trackIdx === (trackCount - 1) ? 2 : 1.5}
                    />
                    <text
                      x={sashPlanX + sashPlanW / 2}
                      y={railY + Math.max(2.5, 3.2 * scale)}
                      fill={isMesh && f.pockets.length !== 2 && f.pockets.length !== 4 ? '#065f46' : '#0f172a'}
                      fontSize={Math.max(8, Math.min(14, 9 * scale))}
                      fontWeight="900"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {p.customLabel || `S${pIdx + 1}`} {p.sashType === 'slider_arrow_right' ? '→' : p.sashType === 'slider_arrow_left' ? '←' : p.sashType === 'slider_arrow_both' ? '↔' : isFixed ? '(+)' : ''}
                    </text>

                    {/* If 3-Track (2-Panel or 4-Bay 6-Panel) and this panel has overlaid Fly Mesh, render MS1/MS2/MS3 Mesh Sash on Rail 0 */}
                    {trackCount === 3 && ((f.pockets.length === 2 && (p.hasMesh || (f as any).hasMesh || p.sashType === 'slider_3t_2p_mesh')) || (f.pockets.length === 4 && (p.hasMesh || p.sashType === 'mesh_sash'))) && (() => {
                      const planMeshIdx = f.pockets.slice(0, pIdx).filter((pk) => pk.hasMesh || pk.sashType === 'mesh_sash').length + 1;
                      const meshRailText = f.pockets.length === 4 ? `MS${planMeshIdx} (जाली)` : 'MS3 (जाली)';
                      return (
                        <g id={`mesh-sash-rail0-${p.id}`}>
                          <rect
                            x={sashPlanX}
                            y={trackPlanY + Math.max(11, 13 * scale) - Math.max(4.5, 5.5 * scale)}
                            width={sashPlanW}
                            height={Math.max(9, 11 * scale)}
                            rx="2"
                            fill="url(#flyMeshDiamond)"
                            stroke="#059669"
                            strokeWidth={1.8}
                          />
                          <text
                            x={sashPlanX + sashPlanW / 2}
                            y={trackPlanY + Math.max(11, 13 * scale) + Math.max(2.5, 3.2 * scale)}
                            fill="#065f46"
                            fontSize={Math.max(8, Math.min(14, 9 * scale))}
                            fontWeight="900"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                          >
                            {meshRailText} {p.sashType === 'slider_arrow_right' ? '→' : '←'}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* 7. MANUFACTURING TITLE BLOCK (MATCHING CAD CANVAS 1:1) */}
        {/* ------------------------------------------------------------- */}
        {showTitleBlock && titleBlockY > 0 && activeFrames.map((f, fIdx) => {
          const titleBoxH = Math.max(44, titleBlockTierH - 10);
          return (
            <g key={`title-block-${f.id}`} id={`title-block-${f.id}`} transform={`translate(${f.x}, ${titleBlockY})`}>
              <rect
                x="0"
                y="0"
                width={f.width}
                height={titleBoxH}
                fill="#f8fafc"
                stroke="#0f172a"
                strokeWidth={Math.max(1.8, 2.2 * scale)}
                rx={Math.max(3, 4 * scale)}
              />
              <line
                x1="0"
                y1={titleBoxH * 0.5}
                x2={f.width}
                y2={titleBoxH * 0.5}
                stroke="#cbd5e1"
                strokeWidth={Math.max(1, 1.2 * scale)}
              />
              {/* Top row */}
              <text
                x={Math.max(10, 14 * scale)}
                y={titleBoxH * 0.35}
                fill="#0f172a"
                fontSize={Math.max(9.5, Math.min(18, 11 * scale))}
                fontWeight="900"
                fontFamily="sans-serif"
              >
                Design Ref: {f.name || badgeTag || `W${fIdx + 1}`}
              </text>
              <text
                x={f.width - Math.max(10, 14 * scale)}
                y={titleBoxH * 0.35}
                fill="#0f172a"
                fontSize={Math.max(9.5, Math.min(18, 11 * scale))}
                fontWeight="900"
                fontFamily="sans-serif"
                textAnchor="end"
              >
                Qty: {(f as any).quantity || 1}
              </text>

              {/* Details row */}
              <text
                x={Math.max(10, 14 * scale)}
                y={titleBoxH * 0.82}
                fill="#334155"
                fontSize={Math.max(8.5, Math.min(15, 10 * scale))}
                fontWeight="800"
                fontFamily="sans-serif"
              >
                W = {Math.round(f.width)}.00 ; H = {Math.round(f.height)}.00 | Area: {((f.width * f.height) / 1000000).toFixed(3)} SqMt
              </text>
              <text
                x={f.width - Math.max(10, 14 * scale)}
                y={titleBoxH * 0.82}
                fill="#475569"
                fontSize={Math.max(8, Math.min(14, 9.5 * scale))}
                fontWeight="800"
                fontFamily="sans-serif"
                textAnchor="end"
              >
                View From Inside
              </text>
            </g>
          );
        })}
      </svg>
    );
};

export const CadElevationDrawing: React.FC<CadElevationDrawingProps> = ({
  frame,
  frames: propFrames,
  couplings = [],
  width = 190,
  height = 130,
  showDimensions = true,
  showLabels = true,
  showHandles = true,
  showArrows = true,
  allowEnlarge = true,
  title,
  className = '',
  badgeTag,
  excelLegibilityMode = false,
  onPocketClick,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Prepare and resolve frames
  const rawFrames: UPVCFrame[] = propFrames && propFrames.length > 0
    ? propFrames
    : frame
    ? [frame]
    : [];

  if (rawFrames.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-400 p-2 text-center select-none ${className}`}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
        }}
      >
        <Layers className="w-5 h-5 mb-1 text-slate-300" />
        <span className="text-[11px] font-medium text-slate-400">No Frame Selected</span>
      </div>
    );
  }

  const bounds = calculateAssemblyBounds(rawFrames);
  const totalW = bounds.totalWidth || 1000;
  const totalH = bounds.totalHeight || 1000;
  const primaryFrame = rawFrames[0];

  return (
    <>
      {/* Thumbnail Container */}
      <div
        onClick={() => {
          if (allowEnlarge) setIsModalOpen(true);
        }}
        className={`relative flex items-center justify-center bg-white border border-slate-200 rounded-lg p-1.5 shadow-2xs group hover:border-blue-500 hover:shadow-md transition cursor-pointer ${className}`}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
        }}
        title="Click to Enlarge Architectural CAD Drawing (बड़ा करके देखें)"
      >
        <CadElevationSvg
          frames={rawFrames}
          couplings={couplings}
          showDimensions={showDimensions}
          showLabels={showLabels}
          showHandles={showHandles}
          showArrows={showArrows}
          badgeTag={badgeTag}
          excelLegibilityMode={excelLegibilityMode}
          onPocketClick={onPocketClick}
          className="w-full h-full select-none"
        />

        {/* Hover Enlarge Icon Pill */}
        {allowEnlarge && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 hover:bg-blue-600 text-white p-1 rounded-md shadow-xs pointer-events-none">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* High-Definition CAD Drawing Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                  CAD
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {title || 'Architectural CAD Technical Elevation'}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Total Outer Dimensions: {Math.round(totalW)} mm (W) × {Math.round(totalH)} mm (H)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                  title="Print Drawing"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Large High-Res CAD SVG Drawing */}
            <div className="flex-1 bg-slate-50/80 p-6 flex items-center justify-center overflow-auto min-h-[420px] max-h-[580px]">
              <div className="w-full max-w-2xl bg-white p-4 rounded-xl border border-slate-200 shadow-lg flex items-center justify-center">
                <div className="w-full h-[420px] flex items-center justify-center">
                  <CadElevationSvg
                    frames={rawFrames}
                    couplings={couplings}
                    showDimensions={showDimensions}
                    showLabels={showLabels}
                    showHandles={showHandles}
                    showArrows={showArrows}
                    badgeTag={badgeTag}
                    excelLegibilityMode={excelLegibilityMode}
                    className="w-full h-full select-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer - Technical Specs Breakdown */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center flex-wrap gap-4 text-slate-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-slate-400">Total Area:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {((totalW * totalH) / 1000000 * 10.7639).toFixed(1)} Sq.Ft (
                    {((totalW * totalH) / 1000000).toFixed(2)} m²)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-slate-400">Series:</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {primaryFrame?.series?.replace(/_/g, ' ') || 'uPVC Profile'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-slate-400">Color:</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {primaryFrame?.color?.replace(/_/g, ' ') || 'White'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-slate-400">Glass:</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {getGlassDisplayName(
                      primaryFrame?.pockets?.[0]?.glassType,
                      primaryFrame?.pockets?.[0]?.glassName || primaryFrame?.glassName
                    )}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Close (बंद करें)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export function renderCadElevationSvgString(props: CadElevationSvgProps): string {
  const markup = renderToStaticMarkup(<CadElevationSvg {...props} isExport={true} />);
  if (!markup.includes('xmlns=')) {
    return markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ');
  }
  return markup;
}
