import React from 'react';
import { HardwareHandle, SupportedHandleType } from './HardwareHandle';

interface HandleThumbnailProps {
  type: SupportedHandleType | string;
  color?: 'silver' | 'black' | 'white' | 'gold';
  size?: number;
  orientation?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  className?: string;
}

export const HandleThumbnail: React.FC<HandleThumbnailProps> = ({
  type,
  color = 'silver',
  size = 64,
  orientation = 'right',
  className = '',
}) => {
  if (type === 'none') {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-slate-900/60 border border-slate-800 text-slate-500 font-mono text-[10px] ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-center px-1">NO HANDLE</span>
      </div>
    );
  }

  // Adjust handle position and scale based on type to fit nicely inside the square thumbnail
  const baseFactor = size / 64;
  let hScale = 0.7 * baseFactor;
  let offsetY = size / 2;
  let offsetX = size / 2;

  if (type.includes('door_lever')) {
    hScale = 0.44 * baseFactor;
    offsetX = orientation === 'right' ? size / 2 - 6 * baseFactor : size / 2 + 6 * baseFactor;
    offsetY = size / 2;
  } else if (type.includes('modern_square')) {
    hScale = 0.52 * baseFactor;
    offsetX = orientation === 'right' ? size / 2 - 6 * baseFactor : size / 2 + 6 * baseFactor;
    offsetY = size / 2 - 3 * baseFactor;
  } else if (type.includes('sliding_pop')) {
    hScale = 0.58 * baseFactor;
    offsetY = size / 2;
  } else if (type.includes('sliding_flush')) {
    hScale = 0.62 * baseFactor;
    offsetY = size / 2;
  } else if (type.includes('sliding_d_pull')) {
    hScale = 0.52 * baseFactor;
    offsetY = size / 2;
  } else if (type.includes('top_bottom')) {
    hScale = 0.62 * baseFactor;
    offsetY = size / 2;
  } else if (type.includes('crescent')) {
    hScale = 0.75 * baseFactor;
    offsetY = size / 2;
  } else if (type.includes('cockspur')) {
    hScale = 0.62 * baseFactor;
    offsetY = size / 2 - 4 * baseFactor;
  } else {
    // Casement espag
    hScale = 0.62 * baseFactor;
    offsetY = size / 2 - 4 * baseFactor;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`rounded-lg overflow-hidden select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={`thumbBg-${type}-${color}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#090d16" stopOpacity="1" />
        </radialGradient>
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

      {/* Subtle CAD Grid / Dark Blueprint Background */}
      <rect width={size} height={size} fill={`url(#thumbBg-${type}-${color})`} />
      <circle cx={size / 2} cy={size / 2} r={size * 0.42} fill="none" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
      <line x1={size / 2} y1={4} x2={size / 2} y2={size - 4} stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
      <line x1={4} y1={size / 2} x2={size - 4} y2={size / 2} stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />

      {/* Hardware Handle Rendering */}
      <HardwareHandle
        x={offsetX}
        y={offsetY}
        type={type}
        orientation={orientation}
        color={color}
        scale={hScale}
        title={type}
      />
    </svg>
  );
};
