import React, { useState } from 'react';
import { UPVCFrame, CouplingConnection, CouplerType } from '../types/upvc';
import { DEFAULT_COLORS, calculateAssemblyBounds } from '../utils/upvcCalculations';
import { RotateCw, Sliders, Box, Layers, Eye, Check, RefreshCw } from 'lucide-react';

interface Canvas3DProps {
  frames: UPVCFrame[];
  couplings: CouplingConnection[];
  lang: 'hi' | 'en';
  onUpdateCoupling?: (coupling: CouplingConnection) => void;
  onUpdateFrameDimension?: (frameId: string, width: number, height: number, direction?: string) => void;
}

export const Canvas3D: React.FC<Canvas3DProps> = ({
  frames,
  couplings,
  lang,
  onUpdateCoupling,
  onUpdateFrameDimension,
}) => {
  const [rotX, setRotX] = useState<number>(10);
  const [rotY, setRotY] = useState<number>(-20);
  const [zoom3D, setZoom3D] = useState<number>(0.85);
  const [openAngle, setOpenAngle] = useState<number>(30); // Openable sashes angle (0° to 90°)
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [themeMode, setThemeMode] = useState<'cad_grid' | 'dark_studio'>('cad_grid');
  const [activeAnglePopupCouplingId, setActiveAnglePopupCouplingId] = useState<string | null>(null);

  const bounds = calculateAssemblyBounds(frames);

  const getColorHex = (colorId: string) => {
    return DEFAULT_COLORS.find((c) => c.id === colorId) || DEFAULT_COLORS[0];
  };

  // Find primary horizontal coupling between frames if any
  const primaryHorizCoupling = (couplings || []).find((c) => c.direction === 'horizontal');
  const activeCoupling = activeAnglePopupCouplingId
    ? couplings.find((c) => c.id === activeAnglePopupCouplingId)
    : primaryHorizCoupling || (couplings && couplings[0]);

  // Calculate bend transformations for horizontal coupled frames
  // If there are 2 frames connected horizontally:
  let fLeft: UPVCFrame | undefined;
  let fRight: UPVCFrame | undefined;
  let bendAngleDeg = 180;
  let isOutward = false;

  if (primaryHorizCoupling) {
    const sFrame = frames.find((f) => f.id === primaryHorizCoupling.sourceFrameId);
    const tFrame = frames.find((f) => f.id === primaryHorizCoupling.targetFrameId);
    if (sFrame && tFrame) {
      fLeft = sFrame.x <= tFrame.x ? sFrame : tFrame;
      fRight = sFrame.x <= tFrame.x ? tFrame : sFrame;
      bendAngleDeg = primaryHorizCoupling.angle ?? (
        primaryHorizCoupling.couplerType === 'corner_90' ? 90 :
        primaryHorizCoupling.couplerType === 'corner_135' ? 135 : 180
      );
      isOutward = primaryHorizCoupling.bendDirection === 'outward';
    }
  }

  // Calculate bend angle delta: for 90° corner, delta = 90°; for 135° bay, delta = 45°
  const delta = Math.max(0, 180 - bendAngleDeg);
  const sign = isOutward ? -1 : 1;
  const leftRotY = sign * (delta / 2);
  const rightRotY = -sign * (delta / 2);

  const handleSetAngle = (c: CouplingConnection, newAngle: number) => {
    if (onUpdateCoupling) {
      const type: CouplerType =
        newAngle === 90 ? 'corner_90' :
        newAngle === 135 ? 'corner_135' :
        newAngle === 180 ? 'flat_2mm' : 'variable_bay_pole';
      onUpdateCoupling({
        ...c,
        couplerType: type,
        angle: newAngle,
      });
    }
  };

  const handleSetDirection = (c: CouplingConnection, dir: 'inward' | 'outward') => {
    if (onUpdateCoupling) {
      onUpdateCoupling({
        ...c,
        bendDirection: dir,
      });
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden select-none ${
      themeMode === 'cad_grid' ? 'bg-[#e2e8f0]' : 'bg-[#050b14]'
    }`}>
      {/* 3D Top Bar Controls */}
      <div className={`h-14 px-6 flex items-center justify-between z-20 shrink-0 border-b ${
        themeMode === 'cad_grid'
          ? 'bg-white/95 border-slate-300 text-slate-800 shadow-xs'
          : 'bg-slate-900/90 border-slate-800 text-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
            <Box className="w-4 h-4" />
            <span>{lang === 'hi' ? '3D आर्किटेक्चरल व्यू (मोड़ व डायमेंशन)' : '3D CAD Architectural View (Bend & Dims)'}</span>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-2" />

          {/* Theme Mode Toggle (Matching User Photo Grid vs Dark Studio) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setThemeMode('cad_grid')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition ${
                themeMode === 'cad_grid'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📐 CAD ग्रिड (Photo Style)
            </button>
            <button
              onClick={() => setThemeMode('dark_studio')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition ${
                themeMode === 'dark_studio'
                  ? 'bg-slate-900 text-cyan-300 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌙 डार्क रियलिस्टिक
            </button>
          </div>

          {/* Dimensions Toggle */}
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
              showDimensions
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-300 text-slate-600'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showDimensions ? '📏 डायमेंशन चालू' : '📏 डायमेंशन बंद'}</span>
          </button>
        </div>

        {/* Rotation & View Presets */}
        <div className="flex items-center gap-3">
          {/* Sash Opening Slider */}
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {lang === 'hi' ? 'पल्ला खोलें:' : 'Open:'}
            </span>
            <input
              type="range"
              min="0"
              max="85"
              value={openAngle}
              onChange={(e) => setOpenAngle(parseInt(e.target.value, 10))}
              className="w-24 accent-blue-600 cursor-pointer"
            />
            <span className="text-xs font-mono text-amber-600 font-bold w-7">{openAngle}°</span>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          {/* View Presets */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setRotX(0);
                setRotY(0);
              }}
              className="px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
            >
              Front
            </button>
            <button
              onClick={() => {
                setRotX(12);
                setRotY(-24);
              }}
              className="px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
            >
              Perspective (फोटो स्टाइल)
            </button>
            <button
              onClick={() => {
                setRotX(25);
                setRotY(-45);
              }}
              className="px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
            >
              Corner 45°
            </button>
          </div>

          <button
            onClick={() => {
              setRotX(10);
              setRotY(-20);
              setZoom3D(0.85);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 3D Viewport with CAD Grid Background */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage:
            themeMode === 'cad_grid'
              ? `linear-gradient(to right, rgba(148, 163, 184, 0.35) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(148, 163, 184, 0.35) 1px, transparent 1px)`
              : `linear-gradient(to right, rgba(51, 65, 85, 0.4) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(51, 65, 85, 0.4) 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startY = e.clientY;
          const initialRotX = rotX;
          const initialRotY = rotY;

          const onMove = (moveEv: MouseEvent) => {
            const dx = moveEv.clientX - startX;
            const dy = moveEv.clientY - startY;
            setRotY(initialRotY + dx * 0.35);
            setRotX(Math.max(-50, Math.min(50, initialRotX - dy * 0.35)));
          };

          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };

          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        {/* CSS 3D Perspective Stage Container */}
        <div
          style={{
            perspective: '1800px',
            transformStyle: 'preserve-3d',
          }}
          className="transition-transform duration-75"
        >
          <div
            style={{
              transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${zoom3D})`,
              transformStyle: 'preserve-3d',
              width: `${Math.max(800, bounds.totalWidth)}px`,
              height: `${Math.max(600, bounds.totalHeight + 180)}px`,
            }}
            className="relative flex items-center justify-center"
          >
            {/* 3D Perspective Back Wall Grid Plane ("GRAF JASE BOX") */}
            <div
              style={{
                position: 'absolute',
                top: '-200px',
                width: `${Math.max(1800, bounds.totalWidth * 2.2)}px`,
                height: `${Math.max(1400, bounds.totalHeight * 2.2)}px`,
                transform: 'translateZ(-160px)',
                transformStyle: 'preserve-3d',
                backgroundImage:
                  themeMode === 'cad_grid'
                    ? `linear-gradient(to right, rgba(203, 213, 225, 0.5) 1px, transparent 1px),
                       linear-gradient(to bottom, rgba(203, 213, 225, 0.5) 1px, transparent 1px)`
                    : `linear-gradient(to right, rgba(30, 41, 59, 0.5) 1px, transparent 1px),
                       linear-gradient(to bottom, rgba(30, 41, 59, 0.5) 1px, transparent 1px)`,
                backgroundSize: '50px 50px',
                pointerEvents: 'none',
                maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0) 80%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0) 80%)',
              }}
            />

            {/* 3D Perspective Ground Grid Plane ("GRAF JASE BOX") */}
            <div
              style={{
                position: 'absolute',
                bottom: '-20px',
                width: `${Math.max(1800, bounds.totalWidth * 2.2)}px`,
                height: `${Math.max(1200, bounds.totalHeight * 2.2)}px`,
                transform: 'rotateX(90deg) translateZ(-80px)',
                transformStyle: 'preserve-3d',
                backgroundImage:
                  themeMode === 'cad_grid'
                    ? `linear-gradient(to right, rgba(148, 163, 184, 0.55) 1.5px, transparent 1.5px),
                       linear-gradient(to bottom, rgba(148, 163, 184, 0.55) 1.5px, transparent 1.5px)`
                    : `linear-gradient(to right, rgba(51, 65, 85, 0.5) 1px, transparent 1px),
                       linear-gradient(to bottom, rgba(51, 65, 85, 0.5) 1px, transparent 1px)`,
                backgroundSize: '50px 50px',
                pointerEvents: 'none',
                maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0) 80%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0) 80%)',
              }}
            />

            {/* 3D Floor Shadow under the bent window */}
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                width: `${bounds.totalWidth * 0.9}px`,
                height: '180px',
                transform: 'rotateX(90deg) translateZ(-60px)',
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(16px)',
                pointerEvents: 'none',
              }}
            />

            {/* If there are 2 horizontally coupled frames, render them with the exact 3D bend! */}
            {fLeft && fRight ? (
              <div
                className="relative"
                style={{
                  width: `${fLeft.width + fRight.width + 4}px`,
                  height: `${Math.max(fLeft.height, fRight.height)}px`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* 1. LEFT FRAME (F1) - Rotated around right edge (joint) */}
                <div
                  style={{
                    position: 'absolute',
                    right: '50%',
                    top: 0,
                    width: `${fLeft.width}px`,
                    height: `${fLeft.height}px`,
                    transformOrigin: 'right center',
                    transform: `rotateY(${leftRotY}deg)`,
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.25s ease-out',
                  }}
                >
                  <SingleFrame3D
                    frame={fLeft}
                    openAngle={openAngle}
                    showDimensions={showDimensions}
                    getColorHex={getColorHex}
                    badgeLabel="F1"
                    showLeftHeightDim={true}
                    showBottomWidthDim={true}
                  />
                </div>

                {/* 2. RIGHT FRAME (F2) - Rotated around left edge (joint) */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    width: `${fRight.width}px`,
                    height: `${fRight.height}px`,
                    transformOrigin: 'left center',
                    transform: `rotateY(${rightRotY}deg)`,
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.25s ease-out',
                  }}
                >
                  <SingleFrame3D
                    frame={fRight}
                    openAngle={openAngle}
                    showDimensions={showDimensions}
                    getColorHex={getColorHex}
                    badgeLabel="F2"
                    showLeftHeightDim={false}
                    showBottomWidthDim={true}
                  />
                </div>

                {/* 3. CORNER POST PROFILE AT THE JOINT */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    width: '32px',
                    height: `${Math.max(fLeft.height, fRight.height)}px`,
                    transform: 'translateX(-50%) translateZ(8px)',
                    transformStyle: 'preserve-3d',
                    backgroundColor: '#ffffff',
                    borderLeft: '2px solid #cbd5e1',
                    borderRight: '2px solid #cbd5e1',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                  }}
                  className="pointer-events-none"
                />

                {/* 4. THE EXPLICIT USER-REQUESTED 'A' CIRCLE ON THE JOINT! */}
                {/* "JAHA YE LAGE WAHA AK A NAME KA CURCEL KAR KE BANA JISPE TIP KE ANGLE CHANGE KAR SAKE" */}
                {primaryHorizCoupling && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '38%',
                      transform: 'translate(-50%, -50%) translateZ(45px)',
                      transformStyle: 'preserve-3d',
                      zIndex: 60,
                    }}
                    className="flex flex-col items-center pointer-events-auto cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAnglePopupCouplingId(primaryHorizCoupling.id);
                    }}
                    title="क्लिक करके मोड़ का एंगल (Angle) बदलें"
                  >
                    {/* Circle marked 'A' */}
                    <div className="w-12 h-12 rounded-full bg-white border-[3.5px] border-amber-500 shadow-2xl flex items-center justify-center font-black text-amber-600 text-xl group-hover:scale-115 group-active:scale-95 transition-all duration-150 animate-pulse">
                      <span>A</span>
                    </div>

                    {/* Angle degree badge */}
                    <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-mono font-black text-xs shadow-md tracking-tight whitespace-nowrap">
                      ∠{bendAngleDeg}°
                    </div>

                    {/* Instruction tooltip */}
                    <div className="mt-1 px-2 py-0.5 bg-slate-900/90 text-amber-300 text-[10px] font-bold rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      टिपें: एंगल बदलें (Click to Bend)
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback for single frame or general frame layout */
              <div
                className="relative"
                style={{
                  width: `${bounds.totalWidth}px`,
                  height: `${bounds.totalHeight}px`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {frames.map((frame, idx) => (
                  <div
                    key={frame.id}
                    style={{
                      position: 'absolute',
                      left: `${frame.x - bounds.minX}px`,
                      top: `${frame.y - bounds.minY}px`,
                      width: `${frame.width}px`,
                      height: `${frame.height}px`,
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <SingleFrame3D
                      frame={frame}
                      openAngle={openAngle}
                      showDimensions={showDimensions}
                      getColorHex={getColorHex}
                      badgeLabel={`F${idx + 1}`}
                      showLeftHeightDim={idx === 0}
                      showBottomWidthDim={true}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE POPUP TO CHANGE ANGLE (When 'A' Circle is clicked) */}
      {/* ------------------------------------------------------------- */}
      {activeCoupling && (
        <div className="absolute top-18 right-6 z-50 w-96 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-amber-500 shadow-2xl p-4.5 animate-in slide-in-from-right-4 pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-black text-base flex items-center justify-center shadow-xs">
                A
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 leading-tight">
                  {lang === 'hi' ? 'कप्लिंग मोड़ कोण (Coupler Angle)' : 'Corner Coupler Angle Controller'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'hi' ? 'कोण बदलें और 3D में लाइव मोड़ देखें' : 'Change angle & view live 3D fold'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveAnglePopupCouplingId(null)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-base"
            >
              ✕
            </button>
          </div>

          {/* Current Angle Display & Direct Input */}
          <div className="mt-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">मोड़ कोण (Angle):</span>
              <span className="text-sm font-mono font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                {activeCoupling.angle ?? 135}°
              </span>
            </div>

            {/* Stepper buttons & Numeric Input */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const curr = activeCoupling.angle ?? 135;
                  handleSetAngle(activeCoupling, Math.max(45, curr - 5));
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl font-mono font-black text-xs border border-slate-300"
              >
                -5°
              </button>

              <input
                type="number"
                min="45"
                max="180"
                value={activeCoupling.angle ?? 135}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    handleSetAngle(activeCoupling, Math.max(45, Math.min(180, val)));
                  }
                }}
                className="flex-1 bg-white border-2 border-slate-300 focus:border-amber-500 rounded-xl py-1.5 text-center font-mono font-black text-slate-900 text-base shadow-inner focus:outline-none"
              />
              <span className="text-xs font-bold text-amber-700 font-mono">° Deg</span>

              <button
                type="button"
                onClick={() => {
                  const curr = activeCoupling.angle ?? 135;
                  handleSetAngle(activeCoupling, Math.min(180, curr + 5));
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl font-mono font-black text-xs border border-slate-300"
              >
                +5°
              </button>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="45"
              max="180"
              step="1"
              value={activeCoupling.angle ?? 135}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                handleSetAngle(activeCoupling, val);
              }}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            {/* Quick Angle Presets */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[
                { deg: 90, label: '90° L' },
                { deg: 120, label: '120°' },
                { deg: 135, label: '135°' },
                { deg: 150, label: '150°' },
                { deg: 180, label: '180°' },
              ].map((p) => {
                const isActive = (activeCoupling.angle ?? 135) === p.deg;
                return (
                  <button
                    key={p.deg}
                    type="button"
                    onClick={() => handleSetAngle(activeCoupling, p.deg)}
                    className={`py-1.5 text-center rounded-xl border text-xs font-mono font-bold transition ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Bend Direction Toggle */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">मोड़ दिशा (Direction):</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleSetDirection(activeCoupling, 'inward')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                    activeCoupling.bendDirection !== 'outward'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  ↩ अंदर (Inward)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDirection(activeCoupling, 'outward')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                    activeCoupling.bendDirection === 'outward'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  ↪ बाहर (Outward)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Instructions & Info Footer */}
      <div className="h-10 bg-white/95 dark:bg-slate-950 border-t border-slate-300 dark:border-slate-800 px-6 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 z-20 shrink-0">
        <span className="flex items-center gap-2">
          <span>🖱️ माउस से घुमाएं (Rotate 3D)</span>
          <span>•</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">
            Ⓐ सर्किल पर क्लिक करके कोण (Angle) बदलें
          </span>
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          Assembly: {bounds.totalWidth} × {bounds.totalHeight} mm
        </span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Helper Sub-Component: 3D Frame with Extrusion, Sashes, Handles & CAD Dims
// -------------------------------------------------------------------------
interface SingleFrame3DProps {
  frame: UPVCFrame;
  openAngle: number;
  showDimensions: boolean;
  getColorHex: (colorId: string) => { hex: string; borderHex: string };
  badgeLabel: string;
  showLeftHeightDim?: boolean;
  showBottomWidthDim?: boolean;
}

const SingleFrame3D: React.FC<SingleFrame3DProps> = ({
  frame,
  openAngle,
  showDimensions,
  getColorHex,
  badgeLabel,
  showLeftHeightDim,
  showBottomWidthDim,
}) => {
  const colorObj = getColorHex(frame.color);
  const fpw = frame.frameProfileWidth || 60;
  const mpw = frame.mullionProfileWidth || 74;

  return (
    <div
      style={{
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        transformStyle: 'preserve-3d',
      }}
      className="relative"
    >
      {/* 1. OUTER FRAME EXTRUDED PROFILE */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: colorObj.hex,
          borderColor: colorObj.borderHex,
          borderWidth: `${Math.round(fpw * 0.45)}px`,
          borderRadius: '4px',
          transform: 'translateZ(12px)',
          boxShadow: '0 25px 40px -10px rgba(0,0,0,0.45), inset 0 0 12px rgba(0,0,0,0.2)',
        }}
        className="relative overflow-visible"
      >
        {/* Frame Name Plate (F1 / F2) matching user photo */}
        <div
          style={{ transform: 'translateZ(20px)' }}
          className="absolute bottom-2 right-2 px-2 py-0.5 bg-white/95 border-2 border-slate-700 text-slate-900 font-black text-xs rounded shadow-md"
        >
          {badgeLabel || frame.name}
        </div>

        {/* Render 3D Mullions */}
        {(frame.mullions || []).map((m) => {
          const isVert = m.orientation === 'vertical';
          const mWidth = m.width || mpw;

          return (
            <div
              key={m.id}
              style={{
                position: 'absolute',
                left: isVert ? `${m.position - mWidth / 2}px` : '0',
                top: isVert ? '0' : `${m.position - mWidth / 2}px`,
                width: isVert ? `${mWidth}px` : '100%',
                height: isVert ? '100%' : `${mWidth}px`,
                backgroundColor: colorObj.hex,
                borderColor: colorObj.borderHex,
                borderWidth: '2px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                transform: 'translateZ(14px)',
              }}
            />
          );
        })}

        {/* Render 3D Glass & Sashes */}
        {(frame.pockets || []).map((pocket, pIdx) => {
          if (pocket.sashType === 'french_open') {
            const leftW = Math.round(pocket.width / 2);
            const rightW = pocket.width - leftW;
            const leftTransform = openAngle > 0 ? `translateZ(18px) rotateY(-${openAngle}deg)` : 'translateZ(15px)';
            const rightTransform = openAngle > 0 ? `translateZ(18px) rotateY(${openAngle}deg)` : 'translateZ(15px)';

            return (
              <React.Fragment key={pocket.id}>
                {/* Left Leaf 3D */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${pocket.x}px`,
                    top: `${pocket.y}px`,
                    width: `${leftW}px`,
                    height: `${pocket.height}px`,
                    transformStyle: 'preserve-3d',
                    transform: leftTransform,
                    transformOrigin: 'left center',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background:
                        pocket.sashType === 'upvc_panel'
                          ? colorObj.hex
                          : 'linear-gradient(135deg, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.15) 50%, rgba(2, 132, 199, 0.4) 100%)',
                      border: `3px solid ${colorObj.hex}`,
                      boxShadow: 'inset 0 0 15px rgba(255,255,255,0.4), 0 8px 20px rgba(0,0,0,0.15)',
                    }}
                    className="relative flex items-center justify-center overflow-visible"
                  >
                    <div
                      style={{ transform: 'translateZ(16px)' }}
                      className="absolute top-2 left-2 px-1.5 py-0.5 bg-white border border-slate-400 text-slate-900 font-bold text-[10px] rounded shadow-xs"
                    >
                      S{pIdx + 1}-L
                    </div>
                    <div
                      style={{ transform: 'translateZ(18px)' }}
                      className="w-6 h-6 rounded-full bg-white/90 border border-slate-500 text-slate-900 font-black text-xs flex items-center justify-center shadow-xs"
                    >
                      ①
                    </div>
                    {/* Handle on right meeting stile */}
                    <div
                      style={{
                        transform: 'translateZ(20px)',
                        right: '4px',
                      }}
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-10 bg-slate-900 rounded-sm shadow-md border border-slate-600"
                    />
                  </div>
                </div>

                {/* Right Leaf 3D */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${pocket.x + leftW}px`,
                    top: `${pocket.y}px`,
                    width: `${rightW}px`,
                    height: `${pocket.height}px`,
                    transformStyle: 'preserve-3d',
                    transform: rightTransform,
                    transformOrigin: 'right center',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background:
                        pocket.sashType === 'upvc_panel'
                          ? colorObj.hex
                          : 'linear-gradient(135deg, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.15) 50%, rgba(2, 132, 199, 0.4) 100%)',
                      border: `3px solid ${colorObj.hex}`,
                      boxShadow: 'inset 0 0 15px rgba(255,255,255,0.4), 0 8px 20px rgba(0,0,0,0.15)',
                    }}
                    className="relative flex items-center justify-center overflow-visible"
                  >
                    <div
                      style={{ transform: 'translateZ(16px)' }}
                      className="absolute top-2 right-2 px-1.5 py-0.5 bg-white border border-slate-400 text-slate-900 font-bold text-[10px] rounded shadow-xs"
                    >
                      S{pIdx + 1}-R
                    </div>
                    <div
                      style={{ transform: 'translateZ(18px)' }}
                      className="w-6 h-6 rounded-full bg-white/90 border border-slate-500 text-slate-900 font-black text-xs flex items-center justify-center shadow-xs"
                    >
                      ②
                    </div>
                    {/* Handle on left meeting stile */}
                    <div
                      style={{
                        transform: 'translateZ(20px)',
                        left: '4px',
                      }}
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-10 bg-slate-900 rounded-sm shadow-md border border-slate-600"
                    />
                  </div>
                </div>

                {/* Center False Mullion (बीच का सैश प्रोफाइल / फ्लाइंग मुल्लियन) */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${pocket.x + leftW - 6}px`,
                    top: `${pocket.y}px`,
                    width: '12px',
                    height: `${pocket.height}px`,
                    background: colorObj.hex,
                    border: '1px solid #1e293b',
                    transform: 'translateZ(16px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                  }}
                  title="False Mullion / Flying Mullion (बीच का सैश प्रोफाइल)"
                />
              </React.Fragment>
            );
          }

          const isCasementLeft = pocket.sashType === 'casement_left';
          const isCasementRight = pocket.sashType === 'casement_right';
          const isTopHung = pocket.sashType === 'top_hung';

          // Openable sash rotation
          let sashTransform = 'translateZ(15px)';
          let transformOrigin = 'center center';

          if (isCasementLeft && openAngle > 0) {
            transformOrigin = 'left center';
            sashTransform = `translateZ(18px) rotateY(-${openAngle}deg)`;
          } else if (isCasementRight && openAngle > 0) {
            transformOrigin = 'right center';
            sashTransform = `translateZ(18px) rotateY(${openAngle}deg)`;
          } else if (isTopHung && openAngle > 0) {
            transformOrigin = 'center top';
            sashTransform = `translateZ(18px) rotateX(${openAngle * 0.7}deg)`;
          }

          const sashLabel = `S${pIdx + 1}`;
          const glassNumber = pIdx + 1;

          return (
            <div
              key={pocket.id}
              style={{
                position: 'absolute',
                left: `${pocket.x}px`,
                top: `${pocket.y}px`,
                width: `${pocket.width}px`,
                height: `${pocket.height}px`,
                transformStyle: 'preserve-3d',
                transform: sashTransform,
                transformOrigin: transformOrigin,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Glass surface with clean reflections */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background:
                    pocket.sashType === 'upvc_panel'
                      ? colorObj.hex
                      : 'linear-gradient(135deg, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.15) 50%, rgba(2, 132, 199, 0.4) 100%)',
                  border: `2px solid ${
                    pocket.sashType.startsWith('casement') || isTopHung
                      ? colorObj.hex
                      : 'rgba(255,255,255,0.4)'
                  }`,
                  boxShadow: 'inset 0 0 15px rgba(255,255,255,0.4), 0 8px 20px rgba(0,0,0,0.15)',
                }}
                className="relative flex items-center justify-center overflow-visible"
              >
                {/* Sash Top Badge: S1, S2, S3... matching user photo */}
                <div
                  style={{ transform: 'translateZ(16px)' }}
                  className="absolute top-2 left-2 px-1.5 py-0.5 bg-white border border-slate-400 text-slate-900 font-bold text-[10px] rounded shadow-xs"
                >
                  {sashLabel}
                </div>

                {/* Glass Circle Number: ①, ②, ③... matching user photo */}
                <div
                  style={{ transform: 'translateZ(18px)' }}
                  className="w-6 h-6 rounded-full bg-white/90 border border-slate-500 text-slate-900 font-black text-xs flex items-center justify-center shadow-xs"
                >
                  {glassNumber}
                </div>

                {/* Sliding Direction Arrow on Glass matching user photo */}
                {pocket.sashType.startsWith('slider') && (
                  <div
                    style={{ transform: 'translateZ(18px)' }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-2 text-slate-800 font-black text-sm"
                  >
                    ➔
                  </div>
                )}

                {/* Glass Height Dimension Tag GHH = 710 matching user photo */}
                {showDimensions && (
                  <div
                    style={{ transform: 'translateZ(16px)' }}
                    className="absolute bottom-1/3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-white/95 border border-slate-400 text-slate-800 font-mono font-bold text-[9px] rounded whitespace-nowrap shadow-xs"
                  >
                    GHH = {Math.round(pocket.height - 40)}
                  </div>
                )}

                {/* Sash Handle Bar matching user photo */}
                <div
                  style={{
                    transform: 'translateZ(20px)',
                    right: pIdx % 2 === 0 ? '6px' : 'auto',
                    left: pIdx % 2 !== 0 ? '6px' : 'auto',
                  }}
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-9 bg-slate-800 rounded-sm shadow-md border border-slate-600"
                />
              </div>

              {/* Sub-Pocket Width Dimension below pocket matching user photo: 363, 387... */}
              {showDimensions && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${pocket.height + 14}px`,
                    left: '50%',
                    transform: 'translateX(-50%) translateZ(15px)',
                  }}
                  className="px-1 py-0.5 bg-white/95 border border-slate-300 text-slate-800 font-mono font-bold text-[11px] rounded shadow-xs whitespace-nowrap"
                >
                  {Math.round(pocket.width)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CAD DIMENSION LINES (MATCHING USER'S REFERENCE PHOTO) */}
      {/* ------------------------------------------------------------- */}
      {showDimensions && (
        <>
          {/* Left Vertical Height Dimension Line: 1500 with arrows */}
          {showLeftHeightDim && (
            <div
              style={{
                position: 'absolute',
                left: '-85px',
                top: 0,
                height: `${frame.height}px`,
                width: '60px',
                transform: 'translateZ(20px)',
              }}
              className="flex items-center justify-center pointer-events-none"
            >
              {/* Vertical line with top and bottom arrows */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400">
                <div className="absolute top-0 -left-1 text-[10px] text-slate-600 leading-none">▲</div>
                <div className="absolute bottom-0 -left-1 text-[10px] text-slate-600 leading-none">▼</div>
              </div>
              {/* Top & Bottom witness ticks */}
              <div className="absolute top-0 right-0 w-8 h-px bg-slate-400" />
              <div className="absolute bottom-0 right-0 w-8 h-px bg-slate-400" />
              {/* Large Height Badge: 1500 */}
              <div className="px-2.5 py-1 bg-white border-2 border-slate-300 text-slate-900 font-mono font-extrabold text-sm rounded-lg shadow-md -rotate-90">
                {frame.height}
              </div>
            </div>
          )}

          {/* Bottom Horizontal Width Dimension Line: 750 with arrows */}
          {showBottomWidthDim && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: '-60px',
                width: `${frame.width}px`,
                height: '35px',
                transform: 'translateZ(20px)',
              }}
              className="flex items-center justify-center pointer-events-none"
            >
              {/* Horizontal line with left and right arrows */}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-400">
                <div className="absolute left-0 -top-2 text-[10px] text-slate-600 leading-none">◀</div>
                <div className="absolute right-0 -top-2 text-[10px] text-slate-600 leading-none">▶</div>
              </div>
              {/* Left & Right witness ticks */}
              <div className="absolute left-0 top-0 h-4 w-px bg-slate-400" />
              <div className="absolute right-0 top-0 h-4 w-px bg-slate-400" />
              {/* Large Width Badge: 750 */}
              <div className="px-2.5 py-0.5 bg-white border-2 border-slate-300 text-slate-900 font-mono font-extrabold text-sm rounded-lg shadow-md">
                {frame.width}
              </div>
            </div>
          )}

          {/* Floor / Transom Tag: TN matching user photo */}
          <div
            style={{
              position: 'absolute',
              bottom: '-28px',
              right: '15px',
              transform: 'translateZ(20px)',
            }}
            className="px-1.5 py-0.5 bg-white border border-slate-400 text-slate-900 font-bold text-[10px] rounded shadow-xs pointer-events-none"
          >
            TN
          </div>
        </>
      )}
    </div>
  );
};
