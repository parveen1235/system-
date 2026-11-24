import React from 'react';

export type SupportedHandleType =
  | 'casement_espag'
  | 'cockspur_handle'
  | 'sliding_flush'
  | 'sliding_pop_key'
  | 'sliding_d_pull'
  | 'door_lever'
  | 'modern_square_lever'
  | 'crescent_lock'
  | 'top_bottom_cockspur'
  | 'none';

export function normalizeHandleType(rawType?: string, isSliding?: boolean): SupportedHandleType {
  if (!rawType) return isSliding ? 'sliding_flush' : 'casement_espag';
  const t = rawType.toLowerCase();
  if (t === 'none') return 'none';
  if (t.includes('pop')) return 'sliding_pop_key';
  if (t.includes('d_pull') || t.includes('dpull') || t.includes('pull') || t.includes('c_handle') || t.includes('c-handle')) return 'sliding_d_pull';
  if (t.includes('crescent')) return 'crescent_lock';
  if (t.includes('square') || t.includes('modern')) return 'modern_square_lever';
  if (t.includes('door') || t.includes('mortise') || t.includes('lever_plate')) return 'door_lever';
  if (t.includes('top_bottom') || t.includes('hopper') || t.includes('vent')) return 'top_bottom_cockspur';
  if (t.includes('cockspur')) {
    if (isSliding) return 'sliding_flush';
    return 'cockspur_handle';
  }
  if (t.includes('espag') || t.includes('casement')) {
    return 'casement_espag';
  }
  if (t.includes('sliding') || t.includes('touch') || t.includes('flush') || t.includes('touch_lock') || t.includes('fly_mesh') || t.includes('mesh')) return 'sliding_flush';
  return isSliding ? 'sliding_flush' : 'casement_espag';
}

export interface HardwareHandleProps {
  x: number;
  y: number;
  type?: SupportedHandleType | string;
  orientation?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  color?: 'silver' | 'black' | 'white' | 'gold';
  scale?: number;
  title?: string;
  withDefs?: boolean;
}

export const HardwareHandle: React.FC<HardwareHandleProps> = ({
  x,
  y,
  type = 'casement_espag',
  orientation = 'right',
  color = 'silver',
  scale = 1,
  title = 'Hardware Handle',
  withDefs = false,
}) => {
  const normType = normalizeHandleType(type);

  if (normType === 'none') {
    return null;
  }

  // Color palette for handle finishes
  const fills = {
    silver: {
      body: 'url(#cadHandleSilver)',
      accent: '#64748b',
      highlight: '#ffffff',
      border: '#0f172a',
      inner: '#1e293b',
      dot: '#cbd5e1',
      fallback: '#cbd5e1',
      goldKey: '#fde047',
    },
    black: {
      body: 'url(#cadHandleDark)',
      accent: '#0f172a',
      highlight: '#475569',
      border: '#000000',
      inner: '#020617',
      dot: '#64748b',
      fallback: '#1e293b',
      goldKey: '#ca8a04',
    },
    white: {
      body: 'url(#cadHandleWhite)',
      accent: '#cbd5e1',
      highlight: '#ffffff',
      border: '#1e293b',
      inner: '#94a3b8',
      dot: '#e2e8f0',
      fallback: '#f8fafc',
      goldKey: '#eab308',
    },
    gold: {
      body: 'url(#cadHandleGold)',
      accent: '#854d0e',
      highlight: '#fef08a',
      border: '#0f172a',
      inner: '#713f12',
      dot: '#fde047',
      fallback: '#eab308',
      goldKey: '#fef08a',
    },
  };

  const c = fills[color] || fills.silver;

  // Rotation transform for rail-mounted orientations
  const getTransform = () => {
    let rot = '';
    if (orientation === 'bottom') {
      if (
        normType === 'casement_espag' ||
        normType === 'door_lever' ||
        normType === 'modern_square_lever'
      ) {
        rot = 'rotate(-90)';
      }
    } else if (orientation === 'top') {
      if (
        normType === 'casement_espag' ||
        normType === 'door_lever' ||
        normType === 'modern_square_lever'
      ) {
        rot = 'rotate(90)';
      }
    }
    return `translate(${x}, ${y}) scale(${scale}) ${rot}`.trim();
  };

  return (
    <g
      id={`cad-handle-${Math.round(x)}-${Math.round(y)}`}
      transform={getTransform()}
      className="hardware-handle cursor-pointer filter drop-shadow-sm select-none"
    >
      <title>{title}</title>

      {/* Optional Standalone Defs when rendered outside CadCanvas */}
      {withDefs && (
        <defs>
          <linearGradient id="cadHandleSilver" x1="0%" y1="0%" x2="100%" y2="100%">
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
          <linearGradient id="cadHandleGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
          <linearGradient id="cadHandleWhite" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. CASEMENT ESPAG WINDOW LEVER HANDLE */}
      {/* ------------------------------------------------------------- */}
      {normType === 'casement_espag' && (
        <g>
          {/* Base Escutcheon Mounting Plate (Rosette) */}
          <rect
            x={-7}
            y={-18}
            width={14}
            height={36}
            rx={4}
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.4}
          />
          {/* Upper Fixing Screw */}
          <circle cx={0} cy={-11} r={1.6} fill={c.inner} stroke={c.border} strokeWidth={0.8} />
          <line x1={-1.2} y1={-11} x2={1.2} y2={-11} stroke={c.dot} strokeWidth={0.7} />
          {/* Lower Fixing Screw */}
          <circle cx={0} cy={11} r={1.6} fill={c.inner} stroke={c.border} strokeWidth={0.8} />
          <line x1={-1.2} y1={11} x2={1.2} y2={11} stroke={c.dot} strokeWidth={0.7} />

          {/* Spindle Collar Boss */}
          <circle cx={0} cy={0} r={5} fill={c.accent} stroke={c.border} strokeWidth={1.3} />
          <circle cx={0} cy={0} r={2.5} fill={c.body} stroke={c.border} strokeWidth={0.8} />

          {/* Key Cylinder Barrel on Collar */}
          <circle cx={0} cy={4.5} r={1.3} fill={c.inner} />
          <line x1={0} y1={4} x2={0} y2={5.2} stroke={c.goldKey} strokeWidth={0.6} />

          {/* Contoured Ergonomic Downward Lever Arm */}
          {orientation === 'left' ? (
            <g>
              <path
                d="M -3,0 C -3,8 -4,14 -4,34 C -4,40 4,40 4,34 C 4,14 3,8 3,0 Z"
                fill={c.body}
                stroke={c.border}
                strokeWidth={1.4}
              />
              <line x1={-1} y1={4} x2={-1} y2={30} stroke={c.highlight} strokeWidth={1} strokeOpacity={0.85} />
              <circle cx={0} cy={34} r={3} fill={c.accent} stroke={c.border} strokeWidth={0.9} />
            </g>
          ) : orientation === 'right' ? (
            <g>
              <path
                d="M -3,0 C -3,8 -4,14 -4,34 C -4,40 4,40 4,34 C 4,14 3,8 3,0 Z"
                fill={c.body}
                stroke={c.border}
                strokeWidth={1.4}
              />
              <line x1={1} y1={4} x2={1} y2={30} stroke={c.highlight} strokeWidth={1} strokeOpacity={0.85} />
              <circle cx={0} cy={34} r={3} fill={c.accent} stroke={c.border} strokeWidth={0.9} />
            </g>
          ) : (
            <g>
              <path
                d="M -3,0 C -3,8 -4,14 -4,34 C -4,40 4,40 4,34 C 4,14 3,8 3,0 Z"
                fill={c.body}
                stroke={c.border}
                strokeWidth={1.4}
              />
              <line x1={0} y1={4} x2={0} y2={30} stroke={c.highlight} strokeWidth={1} strokeOpacity={0.85} />
              <circle cx={0} cy={34} r={3} fill={c.accent} stroke={c.border} strokeWidth={0.9} />
            </g>
          )}
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. COCKSPUR WEDGE WINDOW HANDLE */}
      {/* ------------------------------------------------------------- */}
      {normType === 'cockspur_handle' && (
        <g>
          {/* Base plate with 4 fixing screw holes */}
          <rect
            x={-8}
            y={-16}
            width={16}
            height={32}
            rx={3}
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.4}
          />
          {/* 4 Screws */}
          <circle cx={-4.5} cy={-10} r={1.2} fill={c.inner} stroke={c.border} strokeWidth={0.5} />
          <circle cx={4.5} cy={-10} r={1.2} fill={c.inner} stroke={c.border} strokeWidth={0.5} />
          <circle cx={-4.5} cy={10} r={1.2} fill={c.inner} stroke={c.border} strokeWidth={0.5} />
          <circle cx={4.5} cy={10} r={1.2} fill={c.inner} stroke={c.border} strokeWidth={0.5} />

          {/* Center Locking Push-Button */}
          <circle cx={0} cy={-2} r={3.2} fill="#ef4444" stroke={c.border} strokeWidth={0.9} />
          <circle cx={0} cy={-2} r={1.5} fill="#ffffff" />

          {/* Characteristic Cockspur Nose / Hook extending towards frame */}
          {orientation === 'left' ? (
            /* Mounted on right stile: frame is on the right (+X) */
            <path
              d="M 8,-6 C 18,-6 22,-3 22,2 C 22,6 18,7 12,5 L 8,3 Z"
              fill={c.accent}
              stroke={c.border}
              strokeWidth={1.3}
            />
          ) : (
            /* Mounted on left stile: frame is on the left (-X) */
            <path
              d="M -8,-6 C -18,-6 -22,-3 -22,2 C -22,6 -18,7 -12,5 L -8,3 Z"
              fill={c.accent}
              stroke={c.border}
              strokeWidth={1.3}
            />
          )}

          {/* Downward Curved Operating Handle */}
          <path
            d="M -3.5,2 C -3.5,12 -5,22 -5,34 C -5,38 3,38 3,34 C 3,22 2.5,12 2.5,2 Z"
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.4}
          />
          <line x1={-0.5} y1={6} x2={-0.5} y2={30} stroke={c.highlight} strokeWidth={1} strokeOpacity={0.9} />
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SLIDING TOUCH LOCK / FLUSH LATCH */}
      {/* ------------------------------------------------------------- */}
      {normType === 'sliding_flush' && (
        <g>
          {/* Latch Hook / Keeper Tongue extending toward outer frame jamb */}
          {orientation === 'left' ? (
            /* Handle on right stile -> engages into right frame jamb (+X) */
            <g>
              <rect x={7} y={-5} width={6} height={10} rx={1} fill="#64748b" stroke="#0f172a" strokeWidth={0.9} />
              <polygon points="13,-5 16,-2 16,2 13,5" fill="#475569" stroke="#0f172a" strokeWidth={0.8} />
            </g>
          ) : orientation === 'right' ? (
            /* Handle on left stile -> engages into left frame jamb (-X) */
            <g>
              <rect x={-13} y={-5} width={6} height={10} rx={1} fill="#64748b" stroke="#0f172a" strokeWidth={0.9} />
              <polygon points="-13,-5 -16,-2 -16,2 -13,5" fill="#475569" stroke="#0f172a" strokeWidth={0.8} />
            </g>
          ) : null}

          {/* Flush Outer Bezel Plate */}
          <rect
            x={-7}
            y={-28}
            width={14}
            height={56}
            rx={5}
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.4}
          />

          {/* Top & Bottom Countersunk Screws */}
          <circle cx={0} cy={-23} r={1.2} fill={c.dot} stroke={c.border} strokeWidth={0.6} />
          <line x1={-0.8} y1={-23} x2={0.8} y2={-23} stroke="#334155" strokeWidth={0.6} />
          <circle cx={0} cy={23} r={1.2} fill={c.dot} stroke={c.border} strokeWidth={0.6} />
          <line x1={-0.8} y1={23} x2={0.8} y2={23} stroke="#334155" strokeWidth={0.6} />

          {/* Recessed Finger Cavity */}
          <rect
            x={-4}
            y={-18}
            width={8}
            height={36}
            rx={3}
            fill={c.inner}
            stroke={c.border}
            strokeWidth={0.9}
          />

          {/* Finger Grip Ridge / Texture */}
          <line x1={-2.5} y1={-12} x2={2.5} y2={-12} stroke="#475569" strokeWidth={1} />
          <line x1={-2.5} y1={-7} x2={2.5} y2={-7} stroke="#475569" strokeWidth={1} />
          <line x1={-2.5} y1={7} x2={2.5} y2={7} stroke="#475569" strokeWidth={1} />
          <line x1={-2.5} y1={12} x2={2.5} y2={12} stroke="#475569" strokeWidth={1} />

          {/* Central Touch Lock Slide Snib (Red/Green Security Latch Indicator) */}
          <rect
            x={-3}
            y={-4}
            width={6}
            height={8}
            rx={1.5}
            fill="#ef4444"
            stroke={c.border}
            strokeWidth={0.8}
          />
          <circle cx={0} cy={0} r={1.2} fill="#ffffff" />
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. POP-UP FLUSH HANDLE WITH KEY CYLINDER */}
      {/* ------------------------------------------------------------- */}
      {normType === 'sliding_pop_key' && (
        <g>
          {/* Outer Heavy Flush Escutcheon */}
          <rect
            x={-9}
            y={-34}
            width={18}
            height={68}
            rx={5}
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.5}
          />
          {/* Top & Bottom Mounting Screw Caps */}
          <circle cx={0} cy={-28} r={1.5} fill={c.inner} stroke={c.border} strokeWidth={0.7} />
          <circle cx={0} cy={28} r={1.5} fill={c.inner} stroke={c.border} strokeWidth={0.7} />

          {/* Pop-Out D-Lever (Recessed into body) */}
          <rect
            x={-6}
            y={-22}
            width={12}
            height={32}
            rx={3}
            fill={c.accent}
            stroke={c.border}
            strokeWidth={1.2}
          />
          {/* Inner Finger Pull Loop */}
          <rect
            x={-3}
            y={-17}
            width={6}
            height={22}
            rx={2}
            fill={c.inner}
            stroke={c.border}
            strokeWidth={0.8}
          />
          <line x1={0} y1={-20} x2={0} y2={8} stroke={c.highlight} strokeWidth={0.8} />

          {/* Integrated Brass Key Cylinder below Pop-up Lever */}
          <g transform="translate(0, 18)">
            <circle cx={0} cy={0} r={4} fill={c.inner} stroke={c.border} strokeWidth={1} />
            <circle cx={0} cy={0} r={2.5} fill={c.goldKey} stroke={c.border} strokeWidth={0.6} />
            <line x1={0} y1={-1.5} x2={0} y2={1.5} stroke="#0f172a" strokeWidth={1} strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. SLIDING D-PULL / HEAVY TUBULAR GRAB HANDLE */}
      {/* ------------------------------------------------------------- */}
      {normType === 'sliding_d_pull' && (
        <g>
          {/* Upper Standoff Mounting Post */}
          <rect x={-5} y={-30} width={10} height={8} rx={2} fill={c.accent} stroke={c.border} strokeWidth={1.2} />
          <circle cx={0} cy={-26} r={2} fill={c.inner} stroke={c.border} strokeWidth={0.8} />

          {/* Lower Standoff Mounting Post */}
          <rect x={-5} y={22} width={10} height={8} rx={2} fill={c.accent} stroke={c.border} strokeWidth={1.2} />
          <circle cx={0} cy={26} r={2} fill={c.inner} stroke={c.border} strokeWidth={0.8} />

          {/* Main Tubular D-Bar */}
          {orientation === 'left' ? (
            <g>
              <path
                d="M -3,-32 C -16,-32 -20,-24 -20,-16 L -20,16 C -20,24 -16,32 -3,32 L 2,32 C -11,32 -14,24 -14,16 L -14,-16 C -14,-24 -11,-32 2,-32 Z"
                fill={c.body}
                stroke={c.border}
                strokeWidth={1.6}
              />
              <line x1={-17} y1={-16} x2={-17} y2={16} stroke={c.highlight} strokeWidth={1.2} strokeOpacity={0.9} />
            </g>
          ) : (
            <g>
              <path
                d="M 3,-32 C 16,-32 20,-24 20,-16 L 20,16 C 20,24 16,32 3,32 L -2,32 C 11,32 14,24 14,16 L 14,-16 C 14,-24 11,-32 -2,-32 Z"
                fill={c.body}
                stroke={c.border}
                strokeWidth={1.6}
              />
              <line x1={17} y1={-16} x2={17} y2={16} stroke={c.highlight} strokeWidth={1.2} strokeOpacity={0.9} />
            </g>
          )}
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. HEAVY ARCHITECTURAL DOOR LEVER BACKPLATE SET */}
      {/* ------------------------------------------------------------- */}
      {normType === 'door_lever' && (
        <g>
          {/* Tall Architectural Door Backplate */}
          <rect
            x={-9}
            y={-42}
            width={18}
            height={84}
            rx={5}
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.6}
          />

          {/* Upper Fixing Bolt */}
          <circle cx={0} cy={-34} r={2} fill={c.inner} stroke={c.border} strokeWidth={0.8} />
          {/* Lower Fixing Bolt */}
          <circle cx={0} cy={34} r={2} fill={c.inner} stroke={c.border} strokeWidth={0.8} />

          {/* Lever Spindle Collar */}
          <circle cx={0} cy={-14} r={6} fill={c.accent} stroke={c.border} strokeWidth={1.4} />

          {/* Horizontal Ergonomic Lever Arm */}
          {orientation === 'left' ? (
            <g>
              <path
                d="M 0,-18 L -32,-18 C -36,-18 -38,-14 -38,-10 C -38,-6 -36,-2 -32,-2 L 0,-2 Z"
                fill={c.body}
                stroke={c.border}
                strokeWidth={1.5}
              />
              <line x1={-4} y1={-10} x2={-30} y2={-10} stroke={c.highlight} strokeWidth={1.2} strokeOpacity={0.9} />
            </g>
          ) : (
            <g>
              <path
                d="M 0,-18 L 32,-18 C 36,-18 38,-14 38,-10 C 38,-6 36,-2 32,-2 L 0,-2 Z"
                fill={c.body}
                stroke={c.border}
                strokeWidth={1.5}
              />
              <line x1={4} y1={-10} x2={30} y2={-10} stroke={c.highlight} strokeWidth={1.2} strokeOpacity={0.9} />
            </g>
          )}

          {/* Euro Profile Cylinder Keyway Cutout */}
          <g transform="translate(0, 12)">
            <circle cx={0} cy={0} r={4.5} fill={c.inner} stroke={c.border} strokeWidth={1} />
            <path
              d="M -2.5,2 L -1.5,9 L 1.5,9 L 2.5,2 Z"
              fill={c.inner}
              stroke={c.border}
              strokeWidth={1}
            />
            {/* Brass Keyway Slot */}
            <line x1={0} y1={-1.5} x2={0} y2={6} stroke={c.goldKey} strokeWidth={1.2} strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODERN SQUARE ROSETTE LEVER HANDLE */}
      {/* ------------------------------------------------------------- */}
      {normType === 'modern_square_lever' && (
        <g>
          {/* Clean Modern Square Rosette */}
          <rect
            x={-9}
            y={-24}
            width={18}
            height={18}
            rx={2}
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.4}
          />
          {/* Inner Square Boss */}
          <rect
            x={-4}
            y={-19}
            width={8}
            height={8}
            rx={1}
            fill={c.accent}
            stroke={c.border}
            strokeWidth={0.8}
          />

          {/* Sleek Chamfered Horizontal Rectangular Lever Arm */}
          {orientation === 'left' ? (
            <g>
              <path
                d="M -2,-18 L -34,-18 C -36,-18 -38,-16 -38,-14 L -38,-12 C -38,-10 -36,-8 -34,-8 L -2,-8 Z"
                fill={c.body}
                stroke={c.border}
                strokeWidth={1.5}
              />
              <line x1={-6} y1={-13} x2={-32} y2={-13} stroke={c.highlight} strokeWidth={1.2} strokeOpacity={0.9} />
            </g>
          ) : (
            <g>
              <path
                d="M 2,-18 L 34,-18 C 36,-18 38,-16 38,-14 L 38,-12 C 38,-10 36,-8 34,-8 L 2,-8 Z"
                fill={c.body}
                stroke={c.border}
                strokeWidth={1.5}
              />
              <line x1={6} y1={-13} x2={32} y2={-13} stroke={c.highlight} strokeWidth={1.2} strokeOpacity={0.9} />
            </g>
          )}

          {/* Separate Square Key Escutcheon below */}
          <rect
            x={-7}
            y={8}
            width={14}
            height={14}
            rx={2}
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.2}
          />
          {/* Euro Profile Hole */}
          <circle cx={0} cy={13} r={2.8} fill={c.inner} stroke={c.border} strokeWidth={0.7} />
          <path d="M -1.5,14 L -1,19 L 1,19 L 1.5,14 Z" fill={c.inner} stroke={c.border} strokeWidth={0.7} />
          <line x1={0} y1={12} x2={0} y2={18} stroke={c.goldKey} strokeWidth={0.8} strokeLinecap="round" />
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. CRESCENT ROTARY CAM LOCK */}
      {/* ------------------------------------------------------------- */}
      {normType === 'crescent_lock' && (
        <g>
          {/* Base Pad */}
          <rect
            x={-8}
            y={-14}
            width={16}
            height={28}
            rx={4}
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.3}
          />
          {/* Top & Bottom Fixing Screws */}
          <circle cx={0} cy={-9} r={1.3} fill={c.inner} stroke={c.border} strokeWidth={0.6} />
          <circle cx={0} cy={9} r={1.3} fill={c.inner} stroke={c.border} strokeWidth={0.6} />

          {/* Crescent Rotary Cam */}
          <circle cx={0} cy={0} r={7} fill={c.accent} stroke={c.border} strokeWidth={1.2} />
          <path
            d="M -5,-5 C 5,-8 10,2 6,7 C 2,6 3,-2 -5,-5 Z"
            fill={c.highlight}
            stroke={c.border}
            strokeWidth={0.9}
          />
          {/* Thumb Lever Tab */}
          <rect x={-2} y={-10} width={4} height={6} rx={1} fill={c.body} stroke={c.border} strokeWidth={0.8} />
        </g>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. TOP-HUNG / BOTTOM-HUNG HORIZONTAL COCKSPUR / VENT CATCH */}
      {/* ------------------------------------------------------------- */}
      {normType === 'top_bottom_cockspur' && (
        <g>
          {/* Horizontal Base Plate */}
          <rect
            x={-18}
            y={-7}
            width={36}
            height={14}
            rx={4}
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.4}
          />

          {/* Left / Right Screws */}
          <circle cx={-11} cy={0} r={1.5} fill={c.inner} stroke={c.border} strokeWidth={0.7} />
          <circle cx={11} cy={0} r={1.5} fill={c.inner} stroke={c.border} strokeWidth={0.7} />

          {/* Spindle Collar */}
          <circle cx={0} cy={0} r={5} fill={c.accent} stroke={c.border} strokeWidth={1.2} />

          {/* Locking Tongue Catch Hooking into Frame Keeper */}
          {orientation === 'top' ? (
            /* On top rail: hooks UP (-Y) into head keeper */
            <path d="M -4,-7 C -4,-15 -2,-18 2,-18 C 5,-18 6,-15 4,-10 L 2,-7 Z" fill={c.accent} stroke={c.border} strokeWidth={1.2} />
          ) : (
            /* On bottom rail: hooks DOWN (+Y) into sill keeper */
            <path d="M -4,7 C -4,15 -2,18 2,18 C 5,18 6,15 4,10 L 2,7 Z" fill={c.accent} stroke={c.border} strokeWidth={1.2} />
          )}

          {/* Horizontal Grip Arm */}
          <path
            d="M 0,-3 C 8,-3 14,-4 32,-4 C 36,-4 36,4 32,4 C 14,4 8,3 0,3 Z"
            fill={c.body}
            stroke={c.border}
            strokeWidth={1.3}
          />
          <line x1={4} y1={-1} x2={26} y2={-1} stroke={c.highlight} strokeWidth={1} strokeOpacity={0.9} />
          <circle cx={32} cy={0} r={3} fill={c.accent} stroke={c.border} strokeWidth={0.8} />
        </g>
      )}
    </g>
  );
};
