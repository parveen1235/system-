import React from 'react';
import { UPVCFrame, CouplingConnection } from '../types/upvc';
import { DEFAULT_COLORS } from '../utils/upvcCalculations';

interface AngledBayCadAssemblyProps {
  frames: UPVCFrame[];
  couplings: CouplingConnection[];
  selectedFrameId: string | null;
  selectedCouplingId: string | null;
  onSelectFrame: (id: string | null) => void;
  onSelectCoupling: (id: string | null) => void;
  onUpdateCoupling?: (coupling: CouplingConnection) => void;
  onUpdateFrameDimension: (frameId: string, w: number, h: number, anchor?: 'left' | 'right' | 'top' | 'bottom') => void;
  setInlineEditing: (state: any) => void;
  floorDistance?: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number; totalWidth: number; totalHeight: number };
}

export const AngledBayCadAssembly: React.FC<AngledBayCadAssemblyProps> = ({
  frames,
  couplings,
  selectedFrameId,
  selectedCouplingId,
  onSelectFrame,
  onSelectCoupling,
  setInlineEditing,
  floorDistance = 900,
  bounds,
}) => {
  // Find active angled coupling
  const activeCoupling =
    (couplings || []).find(
      (c) =>
        c.direction === 'horizontal' &&
        ((c.angle !== undefined && c.angle !== 180) ||
          c.couplerType === 'variable_bay_pole' ||
          c.couplerType === 'corner_90' ||
          c.couplerType === 'corner_135')
    ) || (couplings || []).find((c) => c.direction === 'horizontal');

  // Identify left and right frames connected by coupling
  let frame1 = (frames || []).find((f) => f.id === activeCoupling?.sourceFrameId);
  let frame2 = (frames || []).find((f) => f.id === activeCoupling?.targetFrameId);

  if (frame1 && frame2 && frame1.x > frame2.x) {
    const tmp = frame1;
    frame1 = frame2;
    frame2 = tmp;
  }
  if (!frame1 && (frames || []).length > 0) frame1 = frames[0];
  if (!frame2 && (frames || []).length > 1) frame2 = frames[1];

  const w1 = frame1?.width || 750;
  const h1 = frame1?.height || 1500;
  const w2 = frame2?.width || 750;
  const h2 = frame2?.height || 1500;

  const bendAngle = activeCoupling?.angle ?? (activeCoupling?.couplerType === 'corner_90' ? 90 : 135);
  const bendDirection = activeCoupling?.bendDirection || 'inward';

  // Perspective 2D Facet Projection Math
  const deltaAngleRad = ((180 - bendAngle) / 2) * (Math.PI / 180);
  const visualScaleX = Math.cos(deltaAngleRad * 0.7);
  const slopeFactor = Math.sin(deltaAngleRad) * 0.16 * (bendDirection === 'inward' ? 1 : -1);

  const pw1 = w1 * visualScaleX;
  const ph1 = h1;
  const pw2 = w2 * visualScaleX;
  const ph2 = h2;
  const couplerW = 38; // CAD extruded width for 60mm Variable Bay Pole

  const tilt1 = pw1 * slopeFactor;
  const tilt2 = pw2 * slopeFactor;

  // Place post in CAD coordinate space aligned with existing frame bounds
  const postX = (frame1?.x !== undefined ? frame1.x : bounds.minX) + pw1;
  const postY = Math.min(frame1?.y ?? bounds.minY, frame2?.y ?? bounds.minY);
  const maxPh = Math.max(ph1, ph2);

  // 4 Outer Corner Vertices of Left Frame (F1)
  const f1_TL = { x: postX - pw1, y: postY + tilt1 };
  const f1_TR = { x: postX, y: postY };
  const f1_BR = { x: postX, y: postY + ph1 };
  const f1_BL = { x: postX - pw1, y: postY + ph1 - tilt1 };

  // 4 Outer Corner Vertices of Right Frame (F2)
  const f2_TL = { x: postX + couplerW, y: postY };
  const f2_TR = { x: postX + couplerW + pw2, y: postY + tilt2 };
  const f2_BR = { x: postX + couplerW + pw2, y: postY + ph2 - tilt2 };
  const f2_BL = { x: postX + couplerW, y: postY + ph2 };

  // Inner Glazing Rebates
  const fpw1 = Math.min(frame1?.frameProfileWidth || 60, 60);
  const fpw2 = Math.min(frame2?.frameProfileWidth || 60, 60);

  const f1_pTL = { x: f1_TL.x + fpw1, y: f1_TL.y + fpw1 * 0.75 + tilt1 * 0.06 };
  const f1_pTR = { x: f1_TR.x - fpw1, y: f1_TR.y + fpw1 * 0.75 };
  const f1_pBR = { x: f1_BR.x - fpw1, y: f1_BR.y - fpw1 * 0.75 };
  const f1_pBL = { x: f1_BL.x + fpw1, y: f1_BL.y - fpw1 * 0.75 - tilt1 * 0.06 };

  const f2_pTL = { x: f2_TL.x + fpw2, y: f2_TL.y + fpw2 * 0.75 };
  const f2_pTR = { x: f2_TR.x - fpw2, y: f2_TR.y + fpw2 * 0.75 + tilt2 * 0.06 };
  const f2_pBR = { x: f2_BR.x - fpw2, y: f2_BR.y - fpw2 * 0.75 - tilt2 * 0.06 };
  const f2_pBL = { x: f2_BL.x + fpw2, y: f2_BL.y - fpw2 * 0.75 };

  // Pocket Centers for Crosshairs
  const f1_center = {
    x: (f1_pTL.x + f1_pTR.x + f1_pBR.x + f1_pBL.x) / 4,
    y: (f1_pTL.y + f1_pTR.y + f1_pBR.y + f1_pBL.y) / 4,
  };
  const f2_center = {
    x: (f2_pTL.x + f2_pTR.x + f2_pBR.x + f2_pBL.x) / 4,
    y: (f2_pTL.y + f2_pTR.y + f2_pBR.y + f2_pBL.y) / 4,
  };

  const isF1Selected = selectedFrameId === frame1?.id;
  const isF2Selected = selectedFrameId === frame2?.id;
  const isCouplingSelected = selectedCouplingId === activeCoupling?.id;

  const f1Color = DEFAULT_COLORS.find((c) => c.id === frame1?.color) || DEFAULT_COLORS[0];
  const f2Color = DEFAULT_COLORS.find((c) => c.id === frame2?.color) || DEFAULT_COLORS[0];

  // Dimension Offsets
  const dimLeftX = f1_TL.x - 90;
  const dimY = Math.max(f1_BL.y, f2_BR.y) + 70;
  const datumY = dimY + 95;

  return (
    <g id="angled-bay-cad-assembly" className="select-none">
      {/* ------------------------------------------------------------- */}
      {/* ASSEMBLY HEADER / TITLE BLOCK */}
      {/* ------------------------------------------------------------- */}
      <g transform={`translate(${postX + couplerW / 2}, ${postY - 70})`} className="select-none pointer-events-none">
        <text textAnchor="middle" fill="#0f172a" fontSize="16" fontWeight="900" fontFamily="sans-serif">
          Bay Window Assembly (2D Angled CAD Elevation) | ∠{bendAngle}° LC Coupler | W = {w1 + w2 + couplerW}mm ; H = {maxPh}mm
        </text>
        <text y="18" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="700" fontFamily="sans-serif">
          (2D मुड़ा हुआ एलिवेशन दृश्य • View From Inside • Click Dimensions or Profiles to Edit)
        </text>
      </g>

      {/* ------------------------------------------------------------- */}
      {/* FRAME 1 (LEFT FACET) */}
      {/* ------------------------------------------------------------- */}
      <g
        id="bay-cad-frame-1"
        onClick={(e) => {
          e.stopPropagation();
          if (frame1) onSelectFrame(frame1.id);
          onSelectCoupling(null);
        }}
        className="cursor-pointer group"
      >
        {/* Selection Highlight Ring */}
        {isF1Selected && (
          <polygon
            points={`${f1_TL.x - 4},${f1_TL.y - 4} ${f1_TR.x + 4},${f1_TR.y - 4} ${f1_BR.x + 4},${f1_BR.y + 4} ${f1_BL.x - 4},${f1_BL.y + 4}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth="5"
            strokeDasharray="10 5"
            className="filter drop-shadow-md"
          />
        )}

        {/* Outer Frame Extrusion */}
        <polygon
          points={`${f1_TL.x},${f1_TL.y} ${f1_TR.x},${f1_TR.y} ${f1_BR.x},${f1_BR.y} ${f1_BL.x},${f1_BL.y}`}
          fill={f1Color.hex || '#ffffff'}
          stroke={isF1Selected ? '#2563eb' : '#0f172a'}
          strokeWidth={isF1Selected ? 4 : 2.5}
          className="filter drop-shadow-sm group-hover:stroke-blue-500 transition-colors"
        />

        {/* Inner Glazing Rebate */}
        <polygon
          points={`${f1_pTL.x},${f1_pTL.y} ${f1_pTR.x},${f1_pTR.y} ${f1_pBR.x},${f1_pBR.y} ${f1_pBL.x},${f1_pBL.y}`}
          fill="url(#bayGlassTint)"
          stroke="#334155"
          strokeWidth="1.8"
        />
        {/* Subtle Architectural Grid */}
        <polygon
          points={`${f1_pTL.x},${f1_pTL.y} ${f1_pTR.x},${f1_pTR.y} ${f1_pBR.x},${f1_pBR.y} ${f1_pBL.x},${f1_pBL.y}`}
          fill="url(#glassGridPattern)"
        />

        {/* 4 Miter Joint Corner Lines */}
        <line x1={f1_TL.x} y1={f1_TL.y} x2={f1_pTL.x} y2={f1_pTL.y} stroke="#475569" strokeWidth="1.5" />
        <line x1={f1_TR.x} y1={f1_TR.y} x2={f1_pTR.x} y2={f1_pTR.y} stroke="#475569" strokeWidth="1.5" />
        <line x1={f1_BR.x} y1={f1_BR.y} x2={f1_pBR.x} y2={f1_pBR.y} stroke="#475569" strokeWidth="1.5" />
        <line x1={f1_BL.x} y1={f1_BL.y} x2={f1_pBL.x} y2={f1_pBL.y} stroke="#475569" strokeWidth="1.5" />

        {/* Center Crosshairs & Pocket Marker ① */}
        <g transform={`translate(${f1_center.x}, ${f1_center.y})`}>
          <line x1="-34" y1="0" x2="34" y2="0" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="0" y1="-34" x2="0" y2="34" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#0f172a" strokeWidth="2.4" className="filter drop-shadow-xs" />
          <text x="0" y="6.5" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="sans-serif" fill="#0f172a">
            1
          </text>
        </g>

        {/* Frame Tag Badge [F1] */}
        <g transform={`translate(${f1_pBR.x - 48}, ${f1_pBR.y - 34})`}>
          <rect width="44" height="28" rx="4" fill="#ffffff" stroke="#0f172a" strokeWidth="2" className="filter drop-shadow-xs" />
          <text x="22" y="19.5" textAnchor="middle" fontSize="15" fontWeight="900" fontFamily="sans-serif" fill="#0f172a">
            F1
          </text>
        </g>

        {/* Red Outer Corner Markers (matching CAD standard) */}
        <rect x={f1_TL.x - 6} y={f1_TL.y - 6} width="12" height="12" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" rx="1.5" />
        <rect x={f1_BL.x - 6} y={f1_BL.y - 6} width="12" height="12" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" rx="1.5" />
      </g>

      {/* ------------------------------------------------------------- */}
      {/* VARIABLE BAY POLE CENTER POST (LC) */}
      {/* ------------------------------------------------------------- */}
      <g
        id="bay-cad-coupler-post"
        onClick={(e) => {
          e.stopPropagation();
          if (activeCoupling) onSelectCoupling(activeCoupling.id);
          onSelectFrame(null);
        }}
        className="cursor-pointer group"
      >
        {/* Selection Highlight */}
        {isCouplingSelected && (
          <rect
            x={postX - 4}
            y={postY - 4}
            width={couplerW + 8}
            height={maxPh + 8}
            rx="6"
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.5"
            strokeDasharray="6 3"
          />
        )}

        {/* Extruded Vertical Post Column */}
        <rect
          x={postX}
          y={postY}
          width={couplerW}
          height={maxPh}
          rx="3"
          fill="url(#post3DShade)"
          stroke={isCouplingSelected ? '#2563eb' : '#334155'}
          strokeWidth={isCouplingSelected ? 3 : 2}
          className="filter drop-shadow-md group-hover:stroke-amber-600 transition"
        />

        {/* Top and Bottom Dark Aluminum Caps */}
        <rect x={postX - 2} y={postY - 6} width={couplerW + 4} height="10" rx="3" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
        <rect x={postX - 2} y={postY + maxPh - 4} width={couplerW + 4} height="10" rx="3" fill="#64748b" stroke="#334155" strokeWidth="1.5" />

        {/* Circled LC Marker Badge */}
        <g transform={`translate(${postX + couplerW / 2}, ${postY + maxPh / 2})`}>
          <circle
            r="22"
            fill={isCouplingSelected ? '#2563eb' : '#ffffff'}
            stroke={isCouplingSelected ? '#1d4ed8' : '#b45309'}
            strokeWidth="3.5"
            className="filter drop-shadow-md group-hover:scale-110 transition-transform"
          />
          <text
            x="0"
            y="6"
            fill={isCouplingSelected ? '#ffffff' : '#b45309'}
            fontSize="15"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            textAnchor="middle"
          >
            LC
          </text>

          {/* Angle Pill Badge under LC */}
          <g transform="translate(0, 32)">
            <rect x="-30" y="-12" width="60" height="24" rx="12" fill={isCouplingSelected ? '#1d4ed8' : '#b45309'} stroke="#ffffff" strokeWidth="2" className="filter drop-shadow-xs" />
            <text x="0" y="4.5" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="monospace" textAnchor="middle">
              ∠{bendAngle}°
            </text>
          </g>
        </g>

        {/* Top Angle Arc Indicator */}
        <g transform={`translate(${postX + couplerW / 2}, ${postY - 26})`}>
          <path d="M -40 16 A 45 45 0 0 1 40 16" fill="none" stroke="#b45309" strokeWidth="2.5" strokeDasharray="4 3" />
          <circle cx="-40" cy="16" r="3.5" fill="#b45309" />
          <circle cx="40" cy="16" r="3.5" fill="#b45309" />
          <rect x="-42" y="-14" width="84" height="22" rx="11" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" className="filter drop-shadow-xs" />
          <text x="0" y="0.5" fill="#92400e" fontSize="11" fontWeight="900" textAnchor="middle">
            📐 मोड़ {bendAngle}°
          </text>
        </g>
      </g>

      {/* ------------------------------------------------------------- */}
      {/* FRAME 2 (RIGHT FACET) */}
      {/* ------------------------------------------------------------- */}
      <g
        id="bay-cad-frame-2"
        onClick={(e) => {
          e.stopPropagation();
          if (frame2) onSelectFrame(frame2.id);
          onSelectCoupling(null);
        }}
        className="cursor-pointer group"
      >
        {/* Selection Highlight */}
        {isF2Selected && (
          <polygon
            points={`${f2_TL.x - 4},${f2_TL.y - 4} ${f2_TR.x + 4},${f2_TR.y - 4} ${f2_BR.x + 4},${f2_BR.y + 4} ${f2_BL.x - 4},${f2_BL.y + 4}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth="5"
            strokeDasharray="10 5"
            className="filter drop-shadow-md"
          />
        )}

        {/* Outer Frame Extrusion */}
        <polygon
          points={`${f2_TL.x},${f2_TL.y} ${f2_TR.x},${f2_TR.y} ${f2_BR.x},${f2_BR.y} ${f2_BL.x},${f2_BL.y}`}
          fill={f2Color.hex || '#ffffff'}
          stroke={isF2Selected ? '#2563eb' : '#0f172a'}
          strokeWidth={isF2Selected ? 4 : 2.5}
          className="filter drop-shadow-sm group-hover:stroke-blue-500 transition-colors"
        />

        {/* Inner Glazing Rebate */}
        <polygon
          points={`${f2_pTL.x},${f2_pTL.y} ${f2_pTR.x},${f2_pTR.y} ${f2_pBR.x},${f2_pBR.y} ${f2_pBL.x},${f2_pBL.y}`}
          fill="url(#bayGlassTint)"
          stroke="#334155"
          strokeWidth="1.8"
        />
        <polygon
          points={`${f2_pTL.x},${f2_pTL.y} ${f2_pTR.x},${f2_pTR.y} ${f2_pBR.x},${f2_pBR.y} ${f2_pBL.x},${f2_pBL.y}`}
          fill="url(#glassGridPattern)"
        />

        {/* 4 Miter Joint Corner Lines */}
        <line x1={f2_TL.x} y1={f2_TL.y} x2={f2_pTL.x} y2={f2_pTL.y} stroke="#475569" strokeWidth="1.5" />
        <line x1={f2_TR.x} y1={f2_TR.y} x2={f2_pTR.x} y2={f2_pTR.y} stroke="#475569" strokeWidth="1.5" />
        <line x1={f2_BR.x} y1={f2_BR.y} x2={f2_pBR.x} y2={f2_pBR.y} stroke="#475569" strokeWidth="1.5" />
        <line x1={f2_BL.x} y1={f2_BL.y} x2={f2_pBL.x} y2={f2_pBL.y} stroke="#475569" strokeWidth="1.5" />

        {/* Center Crosshairs & Pocket Marker ② */}
        <g transform={`translate(${f2_center.x}, ${f2_center.y})`}>
          <line x1="-34" y1="0" x2="34" y2="0" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="0" y1="-34" x2="0" y2="34" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#0f172a" strokeWidth="2.4" className="filter drop-shadow-xs" />
          <text x="0" y="6.5" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="sans-serif" fill="#0f172a">
            2
          </text>
        </g>

        {/* Frame Tag Badge [F2] */}
        <g transform={`translate(${f2_pBR.x - 48}, ${f2_pBR.y - 34})`}>
          <rect width="44" height="28" rx="4" fill="#ffffff" stroke="#0f172a" strokeWidth="2" className="filter drop-shadow-xs" />
          <text x="22" y="19.5" textAnchor="middle" fontSize="15" fontWeight="900" fontFamily="sans-serif" fill="#0f172a">
            F2
          </text>
        </g>

        {/* Red Outer Corner Markers */}
        <rect x={f2_TR.x - 6} y={f2_TR.y - 6} width="12" height="12" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" rx="1.5" />
        <rect x={f2_BR.x - 6} y={f2_BR.y - 6} width="12" height="12" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" rx="1.5" />
      </g>

      {/* ------------------------------------------------------------- */}
      {/* DEDICATED ARCHITECTURAL DIMENSIONS & WITNESS LINES */}
      {/* ------------------------------------------------------------- */}
      {/* 1. LEFT TOTAL HEIGHT (h1) */}
      <g id="bay-dim-height-left" className="group cursor-pointer">
        <line x1={f1_TL.x} y1={f1_TL.y} x2={dimLeftX - 25} y2={f1_TL.y} stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />
        <line x1={f1_BL.x} y1={f1_BL.y} x2={dimLeftX - 25} y2={f1_BL.y} stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />

        <line
          x1={dimLeftX}
          y1={f1_TL.y}
          x2={dimLeftX}
          y2={f1_BL.y}
          stroke="#0f172a"
          strokeWidth="3.2"
          markerStart="url(#cadArrowStart)"
          markerEnd="url(#cadArrowEnd)"
        />

        <g
          transform={`translate(${dimLeftX}, ${(f1_TL.y + f1_BL.y) / 2})`}
          onClick={(e) => {
            e.stopPropagation();
            if (frame1) {
              setInlineEditing({
                id: `bay-h-${frame1.id}`,
                type: 'frame_h',
                frameId: frame1.id,
                screenX: dimLeftX,
                screenY: (f1_TL.y + f1_BL.y) / 2,
                value: h1.toString(),
                title: 'Frame Height (ऊँचाई)',
              });
            }
          }}
        >
          <rect
            x="-42"
            y="-22"
            width="84"
            height="44"
            rx="8"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="2.5"
            className="filter drop-shadow-md group-hover:stroke-blue-600 group-hover:scale-105 transition"
          />
          <text x="0" y="8" fill="#0f172a" fontSize="24" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" className="group-hover:fill-blue-600">
            {h1}
          </text>
        </g>
      </g>

      {/* 2. CENTER POST HEIGHT (maxPh) */}
      <g id="bay-dim-height-post">
        <line x1={postX + couplerW} y1={postY} x2={postX + couplerW + 55} y2={postY} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 3" />
        <line x1={postX + couplerW} y1={postY + maxPh} x2={postX + couplerW + 55} y2={postY + maxPh} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 3" />
        <line
          x1={postX + couplerW + 42}
          y1={postY}
          x2={postX + couplerW + 42}
          y2={postY + maxPh}
          stroke="#475569"
          strokeWidth="2.5"
          markerStart="url(#cadArrowStart)"
          markerEnd="url(#cadArrowEnd)"
        />
        <g transform={`translate(${postX + couplerW + 42}, ${postY + maxPh / 2})`}>
          <rect x="-34" y="-18" width="68" height="36" rx="6" fill="#f8fafc" stroke="#475569" strokeWidth="2" className="filter drop-shadow-xs" />
          <text x="0" y="7" fill="#1e293b" fontSize="19" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
            {maxPh}
          </text>
        </g>
      </g>

      {/* 3. FRAME 1 WIDTH (w1) */}
      <g id="bay-dim-width-1" className="group cursor-pointer">
        <line x1={f1_BL.x} y1={f1_BL.y} x2={f1_BL.x} y2={dimY + 20} stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />
        <line x1={postX} y1={f1_BR.y} x2={postX} y2={dimY + 20} stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />

        <line
          x1={f1_BL.x}
          y1={dimY}
          x2={postX}
          y2={dimY}
          stroke="#0f172a"
          strokeWidth="3.2"
          markerStart="url(#cadArrowStart)"
          markerEnd="url(#cadArrowEnd)"
        />

        <g
          transform={`translate(${(f1_BL.x + postX) / 2}, ${dimY})`}
          onClick={(e) => {
            e.stopPropagation();
            if (frame1) {
              setInlineEditing({
                id: `bay-w-${frame1.id}`,
                type: 'frame_w',
                frameId: frame1.id,
                screenX: (f1_BL.x + postX) / 2,
                screenY: dimY,
                value: w1.toString(),
                title: 'F1 Width (चौड़ाई)',
              });
            }
          }}
        >
          <rect
            x="-42"
            y="-22"
            width="84"
            height="44"
            rx="8"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="2.5"
            className="filter drop-shadow-md group-hover:stroke-blue-600 group-hover:scale-105 transition"
          />
          <text x="0" y="8" fill="#0f172a" fontSize="24" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" className="group-hover:fill-blue-600">
            {w1}
          </text>
        </g>
      </g>

      {/* 4. FRAME 2 WIDTH (w2) */}
      <g id="bay-dim-width-2" className="group cursor-pointer">
        <line x1={postX + couplerW} y1={f2_BL.y} x2={postX + couplerW} y2={dimY + 20} stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />
        <line x1={f2_BR.x} y1={f2_BR.y} x2={f2_BR.x} y2={dimY + 20} stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />

        <line
          x1={postX + couplerW}
          y1={dimY}
          x2={f2_BR.x}
          y2={dimY}
          stroke="#0f172a"
          strokeWidth="3.2"
          markerStart="url(#cadArrowStart)"
          markerEnd="url(#cadArrowEnd)"
        />

        <g
          transform={`translate(${(postX + couplerW + f2_BR.x) / 2}, ${dimY})`}
          onClick={(e) => {
            e.stopPropagation();
            if (frame2) {
              setInlineEditing({
                id: `bay-w-${frame2.id}`,
                type: 'frame_w',
                frameId: frame2.id,
                screenX: (postX + couplerW + f2_BR.x) / 2,
                screenY: dimY,
                value: w2.toString(),
                title: 'F2 Width (चौड़ाई)',
              });
            }
          }}
        >
          <rect
            x="-42"
            y="-22"
            width="84"
            height="44"
            rx="8"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="2.5"
            className="filter drop-shadow-md group-hover:stroke-blue-600 group-hover:scale-105 transition"
          />
          <text x="0" y="8" fill="#0f172a" fontSize="24" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" className="group-hover:fill-blue-600">
            {w2}
          </text>
        </g>
      </g>

      {/* 5. ARCHITECTURAL FLOOR APERTURE DATUM */}
      <g transform={`translate(${f2_BR.x}, ${datumY})`} className="select-none pointer-events-none">
        <line x1="-200" y1="0" x2="0" y2="0" stroke="#64748b" strokeWidth="2" />
        <line x1="-200" y1="0" x2="-190" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="-175" y1="0" x2="-165" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="-150" y1="0" x2="-140" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="-125" y1="0" x2="-115" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="-100" y1="0" x2="-90" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="-75" y1="0" x2="-65" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="-50" y1="0" x2="-40" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="-25" y1="0" x2="-15" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
        <text x="-8" y="-8" fill="#475569" fontSize="13" fontWeight="800" fontFamily="sans-serif" textAnchor="end">
          ▼ Floor Aperture Distance = {floorDistance || 900}
        </text>
      </g>
    </g>
  );
};
