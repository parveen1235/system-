import React, { useState } from 'react';
import { SashType, GlassType, GridPattern, CouplerType, GeorgianBarConfig } from '../types/upvc';
import {
  X,
  Info,
  Layers,
  Columns,
  Rows,
  Split,
  Shield,
  Square,
  Sliders,
  Check,
  Move,
  Grid,
  Plus,
  HelpCircle,
  Fan,
  Wind,
} from 'lucide-react';

export type PaletteCategory = 'casement' | 'sliding' | 'fan_ac' | 'panels' | 'coupling' | 'mullions';

export interface DragItemDef {
  id: string;
  category: PaletteCategory;
  label: string;
  labelHindi: string;
  description: string;
  badge?: string;
  dragData: {
    type: 'sash_type' | 'panel_type' | 'coupling' | 'mullion' | 'fan_ac';
    sashType?: SashType;
    glassType?: GlassType;
    gridPattern?: GridPattern;
    georgianBar?: GeorgianBarConfig;
    couplerType?: CouplerType;
    direction?: 'horizontal' | 'vertical' | 'right' | 'left' | 'top' | 'bottom';
    orientation?: 'vertical' | 'horizontal' | 'cross';
    angle?: number;
    isSectional?: boolean;
    hasMesh?: boolean;
    hasFanCutout?: boolean;
    fanCutoutDiameter?: number;
    fanPanelType?: 'glass_hole' | 'pvc_sheet' | 'louver_hole';
    hasACLouver?: boolean;
    acUnitType?: 'box_cutout' | 'louver' | 'insulated_panel';
    action?: 'top_fan_transom' | 'bottom_ac_transom' | 'apply_pocket';
    openDirection?: 'out' | 'in';
    rawText: string;
  };
  renderIcon: () => React.ReactNode;
}

export const CAD_PALETTE_ITEMS: DragItemDef[] = [
  // =========================================================================
  // 1. CASEMENT WINDOW & DOOR TYPES
  // =========================================================================
  {
    id: 'fixed',
    category: 'casement',
    label: 'FIXED GLASS',
    labelHindi: 'फिक्स्ड ग्लास (बंद)',
    description: 'Fixed Non-Opening Glass Bay',
    dragData: {
      type: 'sash_type',
      sashType: 'fixed',
      rawText: 'sash:fixed',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="3" rx="2" />
        <line x1="12" y1="35" x2="88" y2="35" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="50" y1="10" x2="50" y2="60" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
    ),
  },
  {
    id: 'casement_left',
    category: 'casement',
    label: 'LEFT OPEN (OUT)',
    labelHindi: 'बायाँ बाहर खुलने वाला (OUT)',
    description: 'Left Outward Opening Sash (Dashed Swing Line ┄)',
    badge: 'OUT',
    dragData: {
      type: 'sash_type',
      sashType: 'casement_left',
      openDirection: 'out',
      rawText: 'sash:casement_left:out',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" rx="2" />
        <polygon points="86,12 14,35 86,58" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="18" cy="35" r="2.5" fill="#2563eb" />
        <rect x="42" y="44" width="18" height="11" fill="#ffffff" stroke="#38bdf8" strokeWidth="1" rx="1.5" />
        <text x="51" y="52.5" fill="#0284c7" fontSize="7" fontWeight="900" textAnchor="middle">OUT</text>
      </svg>
    ),
  },
  {
    id: 'casement_right',
    category: 'casement',
    label: 'RIGHT OPEN (OUT)',
    labelHindi: 'दायाँ बाहर खुलने वाला (OUT)',
    description: 'Right Outward Opening Sash (Dashed Swing Line ┄)',
    badge: 'OUT',
    dragData: {
      type: 'sash_type',
      sashType: 'casement_right',
      openDirection: 'out',
      rawText: 'sash:casement_right:out',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" rx="2" />
        <polygon points="14,12 86,35 14,58" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="82" cy="35" r="2.5" fill="#2563eb" />
        <rect x="42" y="44" width="18" height="11" fill="#ffffff" stroke="#38bdf8" strokeWidth="1" rx="1.5" />
        <text x="51" y="52.5" fill="#0284c7" fontSize="7" fontWeight="900" textAnchor="middle">OUT</text>
      </svg>
    ),
  },
  {
    id: 'casement_left_in',
    category: 'casement',
    label: 'LEFT OPEN (IN)',
    labelHindi: 'बायाँ अंदर खुलने वाला (IN)',
    description: 'Left Inward Opening Sash (Solid Swing Line ──)',
    badge: 'IN',
    dragData: {
      type: 'sash_type',
      sashType: 'casement_left',
      openDirection: 'in',
      rawText: 'sash:casement_left:in',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" rx="2" />
        <polygon points="86,12 14,35 86,58" fill="none" stroke="#2563eb" strokeWidth="2.5" />
        <circle cx="18" cy="35" r="2.5" fill="#2563eb" />
        <rect x="42" y="44" width="18" height="11" fill="#ffffff" stroke="#38bdf8" strokeWidth="1" rx="1.5" />
        <text x="51" y="52.5" fill="#0284c7" fontSize="7" fontWeight="900" textAnchor="middle">IN</text>
      </svg>
    ),
  },
  {
    id: 'casement_right_in',
    category: 'casement',
    label: 'RIGHT OPEN (IN)',
    labelHindi: 'दायाँ अंदर खुलने वाला (IN)',
    description: 'Right Inward Opening Sash (Solid Swing Line ──)',
    badge: 'IN',
    dragData: {
      type: 'sash_type',
      sashType: 'casement_right',
      openDirection: 'in',
      rawText: 'sash:casement_right:in',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" rx="2" />
        <polygon points="14,12 86,35 14,58" fill="none" stroke="#2563eb" strokeWidth="2.5" />
        <circle cx="82" cy="35" r="2.5" fill="#2563eb" />
        <rect x="42" y="44" width="18" height="11" fill="#ffffff" stroke="#38bdf8" strokeWidth="1" rx="1.5" />
        <text x="51" y="52.5" fill="#0284c7" fontSize="7" fontWeight="900" textAnchor="middle">IN</text>
      </svg>
    ),
  },
  {
    id: 'top_hung',
    category: 'casement',
    label: 'TOP HUNG',
    labelHindi: 'टॉप हंग (वेंटिलेटर)',
    description: 'Top Hinged Awning/Ventilator',
    dragData: {
      type: 'sash_type',
      sashType: 'top_hung',
      rawText: 'sash:top_hung',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" rx="2" />
        <polygon points="14,12 50,58 86,12" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="50" cy="54" r="2.5" fill="#2563eb" />
      </svg>
    ),
  },
  {
    id: 'bottom_hung',
    category: 'casement',
    label: 'BOTTOM HUNG',
    labelHindi: 'बॉटम हंग हॉपर',
    description: 'Bottom Hinged Hopper Sash',
    dragData: {
      type: 'sash_type',
      sashType: 'bottom_hung',
      rawText: 'sash:bottom_hung',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" rx="2" />
        <polygon points="14,58 50,12 86,58" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="50" cy="16" r="2.5" fill="#2563eb" />
      </svg>
    ),
  },
  {
    id: 'tilt_turn',
    category: 'casement',
    label: 'TILT & TURN',
    labelHindi: 'टिल्ट एंड टर्न सैश',
    description: 'Dual Open / Tilt & Turn Sash',
    dragData: {
      type: 'sash_type',
      sashType: 'tilt_turn',
      rawText: 'sash:tilt_turn',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" rx="2" />
        <polygon points="14,12 86,35 14,58" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 3" />
        <polygon points="14,58 50,12 86,58" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="82" cy="35" r="2.5" fill="#2563eb" />
      </svg>
    ),
  },
  {
    id: 'french_open',
    category: 'casement',
    label: 'FRENCH DOOR',
    labelHindi: 'फ्रेंच डबल ओपन डोर',
    description: 'Double Master/Slave Opening Sashes',
    dragData: {
      type: 'sash_type',
      sashType: 'french_open',
      rawText: 'sash:french_open',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" rx="2" />
        <line x1="50" y1="10" x2="50" y2="60" stroke="#475569" strokeWidth="1.5" />
        <polygon points="14,12 48,35 14,58" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points="86,12 52,35 86,58" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    id: 'casement_door_4side',
    category: 'casement',
    label: 'CASEMENT DOOR',
    labelHindi: 'डोर सैश (4 साइड चौखट)',
    description: 'Single Casement Door (4-Side Frame: W:2, H:2)',
    badge: 'Door 4-Side',
    dragData: {
      type: 'sash_type',
      sashType: 'casement_left',
      rawText: 'sash:casement_door_4side',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="22" y="6" width="56" height="58" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" rx="1" />
        <polygon points="24,8 76,35 24,62" fill="none" stroke="#2563eb" strokeWidth="1.6" strokeDasharray="3 2" />
        <rect x="70" y="32" width="4" height="8" rx="1" fill="#d97706" />
        <text x="50" y="61" fontSize="6.5" fontWeight="900" fill="#0f172a" textAnchor="middle">4-SIDE</text>
      </svg>
    ),
  },
  {
    id: 'casement_door_3side',
    category: 'casement',
    label: 'FRAME 3 SIDE DOOR ⭐',
    labelHindi: 'डोर सैश (फ्रेम 3 साइड - नीचे चौखट नहीं)',
    description: '3-Sided Door (No bottom sill, W: 1pc Top, H: 2pcs Legs)',
    badge: '3-Side Sill-Less',
    dragData: {
      type: 'sash_type',
      sashType: 'casement_left',
      rawText: 'sash:casement_door_3side',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        {/* 3 sides frame: top, left, right */}
        <line x1="22" y1="6" x2="78" y2="6" stroke="#d97706" strokeWidth="3" />
        <line x1="22" y1="6" x2="22" y2="64" stroke="#d97706" strokeWidth="3" />
        <line x1="78" y1="6" x2="78" y2="64" stroke="#d97706" strokeWidth="3" />
        {/* Open bottom floor line */}
        <line x1="16" y1="64" x2="84" y2="64" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points="24,8 76,35 24,62" fill="none" stroke="#2563eb" strokeWidth="1.6" strokeDasharray="3 2" />
        <rect x="72" y="32" width="4" height="8" rx="1" fill="#d97706" />
        <text x="50" y="52" fontSize="6.5" fontWeight="900" fill="#d97706" textAnchor="middle">3-SIDE</text>
      </svg>
    ),
  },
  {
    id: 'louver',
    category: 'casement',
    label: 'LOUVER VENT',
    labelHindi: 'लूवर वेंटिलेटर',
    description: 'Fresh Air Slatted Louver Panel',
    dragData: {
      type: 'sash_type',
      sashType: 'louver',
      rawText: 'sash:louver',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="2" rx="2" />
        <line x1="16" y1="20" x2="84" y2="20" stroke="#64748b" strokeWidth="2" />
        <line x1="16" y1="30" x2="84" y2="30" stroke="#64748b" strokeWidth="2" />
        <line x1="16" y1="40" x2="84" y2="40" stroke="#64748b" strokeWidth="2" />
        <line x1="16" y1="50" x2="84" y2="50" stroke="#64748b" strokeWidth="2" />
      </svg>
    ),
  },

  // =========================================================================
  // 2. SLIDING SASH & PANEL MASTER MODELS (#1, #5, #8, #9, SS304 MESH & NEW DESIGNS)
  // =========================================================================
  {
    id: 'slider_model_1',
    category: 'sliding',
    label: '#1: 2-TRACK 2-PANEL [ S1 → | S2 ← ]',
    labelHindi: '#1: 2-ट्रैक 2-पैनल स्लाइडर [ S1 → | S2 ← ]',
    description: '2-Track 2-Sash Classic Slider (S1 Right + S2 Left with Touch Lock & GHH=710)',
    badge: 'Model #1',
    dragData: {
      type: 'sash_type',
      sashType: 'slider_2s',
      rawText: 'sash:slider_2s',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="8" y="10" width="84" height="50" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" rx="2" />
        <line x1="50" y1="10" x2="50" y2="60" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 2" />
        {/* Left Sash S1 (->) */}
        <line x1="18" y1="35" x2="42" y2="35" stroke="#0284c7" strokeWidth="2.4" />
        <polygon points="44,35 36,30 36,40" fill="#0284c7" />
        <rect x="12" y="26" width="3" height="18" rx="1" fill="#0f172a" />
        <text x="28" y="24" fontSize="7" fontWeight="900" fill="#0f172a">S1</text>
        {/* Right Sash S2 (<-) */}
        <line x1="82" y1="35" x2="58" y2="35" stroke="#0284c7" strokeWidth="2.4" />
        <polygon points="56,35 64,30 64,40" fill="#0284c7" />
        <rect x="85" y="26" width="3" height="18" rx="1" fill="#0f172a" />
        <text x="70" y="24" fontSize="7" fontWeight="900" fill="#0f172a">S2</text>
        <text x="86" y="56" fontSize="6" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },
  {
    id: 'slider_model_5',
    category: 'sliding',
    label: '#5: 3-TRACK [ 2 GLASS + MESH ON S2 ]',
    labelHindi: '#5: 3-ट्रैक (2-पैनल सेम 2-ट्रैक + S2 पर जाली MS1)',
    description: '3-Track Outer Frame with 2 Panels (same as 2-track) + 1 Fly Mesh Panel (MS1) on S2',
    badge: 'Model #5',
    dragData: {
      type: 'sash_type',
      sashType: 'slider_3t_2p_mesh',
      hasMesh: true,
      rawText: 'sash:slider_3t_2p_mesh',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        {/* Frame Outer */}
        <rect x="6" y="10" width="88" height="50" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.2" rx="2" />
        {/* Center Interlock Meeting Stile (50/50 split) */}
        <line x1="50" y1="10" x2="50" y2="60" stroke="#0284c7" strokeWidth="1.8" />
        {/* Left Sash S1 (->) with Left Touch Lock */}
        <line x1="18" y1="35" x2="42" y2="35" stroke="#0284c7" strokeWidth="2.2" />
        <polygon points="42,35 34,31 34,39" fill="#0284c7" />
        <rect x="10" y="27" width="2.5" height="16" rx="1" fill="#0f172a" />
        <text x="25" y="24" fontSize="7" fontWeight="900" fill="#0f172a">S1</text>
        {/* Right Sash S2 (<-) with Mesh Overlay & Right Touch Lock */}
        <rect x="52" y="12" width="40" height="46" fill="#10b981" fillOpacity="0.18" />
        <line x1="82" y1="35" x2="58" y2="35" stroke="#0284c7" strokeWidth="2.2" />
        <polygon points="58,35 66,31 66,39" fill="#0284c7" />
        <rect x="87.5" y="27" width="2.5" height="16" rx="1" fill="#0f172a" />
        <text x="56" y="24" fontSize="7" fontWeight="900" fill="#0f172a">S2</text>
        {/* MS1 Fly Mesh Badge */}
        <rect x="68" y="16" width="22" height="9" rx="1.5" fill="#ecfdf5" stroke="#059669" strokeWidth="0.9" />
        <text x="79" y="23" fontSize="5.5" fontWeight="900" fill="#065f46" textAnchor="middle">MS1</text>
        <text x="86" y="56" fontSize="6" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },
  {
    id: 'slider_model_8',
    category: 'sliding',
    label: '#8: 3-TRACK 3-PANEL [ ALL SLIDE ↔ ]',
    labelHindi: '#8: 3-ट्रैक 3-पैनल [ तीनों स्लाइड ↔ ]',
    description: '3-Track 3-Panel All-Glass Slider with independent sliding (S1 ↔ | S2 ↔ | S3 ↔)',
    badge: 'Model #8',
    dragData: {
      type: 'sash_type',
      sashType: 'slider_3s',
      rawText: 'sash:slider_3s_all',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="6" y="10" width="88" height="50" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" rx="2" />
        <line x1="34" y1="10" x2="34" y2="60" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 2" />
        <line x1="62" y1="10" x2="62" y2="60" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 2" />
        {/* S1 <-> */}
        <polygon points="12,35 18,31 18,39" fill="#0284c7" />
        <polygon points="28,35 22,31 22,39" fill="#0284c7" />
        {/* S2 <-> */}
        <polygon points="40,35 46,31 46,39" fill="#0284c7" />
        <polygon points="56,35 50,31 50,39" fill="#0284c7" />
        {/* S3 <-> */}
        <polygon points="68,35 74,31 74,39" fill="#0284c7" />
        <polygon points="84,35 78,31 78,39" fill="#0284c7" />
        <text x="86" y="56" fontSize="6" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },
  {
    id: 'slider_model_9',
    category: 'sliding',
    label: '#9: 2 TRACK 4 PANEL [ CENTER MEETING ]',
    labelHindi: '#9: 2-ट्रैक 4-पैनल सेंटर मीटिंग [ S1 → | S2 ← | S3 → | S4 ← ]',
    description: '2-Track 4-Panel Center Meeting Sliding Window/Door with Meeting Lock & GHH=710',
    badge: '2-Track 4-Panel',
    dragData: {
      type: 'sash_type',
      sashType: 'slider_4s',
      rawText: 'sash:slider_4s_center',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="4" y="10" width="92" height="50" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" rx="2" />
        <line x1="26" y1="10" x2="26" y2="60" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 2" />
        <line x1="50" y1="10" x2="50" y2="60" stroke="#0f172a" strokeWidth="2" />
        <line x1="74" y1="10" x2="74" y2="60" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 2" />
        {/* S1 -> */}
        <line x1="8" y1="35" x2="22" y2="35" stroke="#0284c7" strokeWidth="1.6" />
        <polygon points="22,35 17,32 17,38" fill="#0284c7" />
        {/* S2 <- */}
        <line x1="46" y1="35" x2="32" y2="35" stroke="#0284c7" strokeWidth="1.6" />
        <polygon points="32,35 37,32 37,38" fill="#0284c7" />
        {/* Center meeting lock */}
        <rect x="49" y="30" width="2" height="10" fill="#0f172a" />
        {/* S3 -> */}
        <line x1="54" y1="35" x2="68" y2="35" stroke="#0284c7" strokeWidth="1.6" />
        <polygon points="68,35 63,32 63,38" fill="#0284c7" />
        {/* S4 <- */}
        <line x1="92" y1="35" x2="78" y2="35" stroke="#0284c7" strokeWidth="1.6" />
        <polygon points="78,35 83,32 83,38" fill="#0284c7" />
        <text x="90" y="56" fontSize="5.5" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },
  {
    id: 'mesh_slider_right',
    category: 'sliding',
    label: 'SS304 MESH SLIDER (MS1)',
    labelHindi: 'SS304 मच्छर जाली स्लाइडर (MS1)',
    description: 'Stainless Steel SS304 Mosquito Fly Mesh Sliding Sash (MS1)',
    badge: 'SS304 Mesh',
    dragData: {
      type: 'sash_type',
      sashType: 'mesh_sash',
      hasMesh: true,
      rawText: 'sash:mesh_sash_right',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#1e293b" stroke="#0284c7" strokeWidth="2" rx="2" />
        <pattern id="meshPattSl" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 4 4 M 4 0 L 0 4" stroke="#60a5fa" strokeWidth="0.75" />
        </pattern>
        <rect x="16" y="14" width="68" height="42" fill="url(#meshPattSl)" />
        <line x1="28" y1="35" x2="68" y2="35" stroke="#ffffff" strokeWidth="2.5" />
        <polygon points="74,35 62,29 62,41" fill="#ffffff" />
        <text x="50" y="24" fontSize="7" fontWeight="bold" fill="#34d399" textAnchor="middle">SS304 MESH</text>
      </svg>
    ),
  },
  {
    id: 'slider_2track_3panel_fix_center',
    category: 'sliding',
    label: '2 TRACK (2 SLIDE PANEL CENTER 1 FIX PANEL)',
    labelHindi: '2-ट्रैक (2 स्लाइड पैनल + सेंटर 1 फिक्स पैनल)',
    description: '2-Track 3-Panel: S1 (→) & S3 (←) Slide with Center Fixed Glass S2 (//) & GHH=710',
    badge: '2-Track 3-Panel',
    dragData: {
      type: 'sash_type',
      sashType: 'slider_3s_oxo',
      rawText: 'sash:slider_2track_fix_center',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="4" y="10" width="92" height="50" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" rx="2" />
        <line x1="34" y1="10" x2="34" y2="60" stroke="#0284c7" strokeWidth="1.5" />
        <line x1="64" y1="10" x2="64" y2="60" stroke="#0284c7" strokeWidth="1.5" />
        {/* S1: Slide Right (->) */}
        <line x1="10" y1="35" x2="28" y2="35" stroke="#0284c7" strokeWidth="2" />
        <polygon points="28,35 22,31 22,39" fill="#0284c7" />
        <rect x="6" y="28" width="2.5" height="14" fill="#0f172a" rx="0.5" />
        <circle cx="20" cy="24" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="20" y="26.5" fontSize="6" fontWeight="bold" fill="#0f172a" textAnchor="middle">1</text>
        {/* S2: Center Fixed Glass (//) */}
        <circle cx="49" cy="24" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="49" y="26.5" fontSize="6" fontWeight="bold" fill="#0f172a" textAnchor="middle">2</text>
        <line x1="45" y1="32" x2="49" y2="44" stroke="#0f172a" strokeWidth="1.8" />
        <line x1="49" y1="32" x2="53" y2="44" stroke="#0f172a" strokeWidth="1.8" />
        {/* S3: Slide Left (<-) */}
        <line x1="88" y1="35" x2="70" y2="35" stroke="#0284c7" strokeWidth="2" />
        <polygon points="70,35 76,31 76,39" fill="#0284c7" />
        <rect x="91" y="28" width="2.5" height="14" fill="#0f172a" rx="0.5" />
        <circle cx="78" cy="24" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="78" y="26.5" fontSize="6" fontWeight="bold" fill="#0f172a" textAnchor="middle">3</text>
        <text x="90" y="56" fontSize="5.5" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },
  {
    id: 'slider_3track_5panel',
    category: 'sliding',
    label: '3 TRACK 5 PANEL',
    labelHindi: '3-ट्रैक 5-पैनल स्लाइडर [ 5 ग्लास सैश ]',
    description: '3-Track 5-Panel: S1 (→), S2 (↔), S3 (←), S4 (→), S5 (←) with GHH=710',
    badge: '3-Track 5-Panel',
    dragData: {
      type: 'sash_type',
      sashType: 'slider_5s_multi',
      rawText: 'sash:slider_3track_5panel',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="2" y="10" width="96" height="50" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" rx="2" />
        <line x1="21" y1="10" x2="21" y2="60" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1" />
        <line x1="40" y1="10" x2="40" y2="60" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1" />
        <line x1="59" y1="10" x2="59" y2="60" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="78" y1="10" x2="78" y2="60" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1" />
        {/* S1 -> */}
        <polygon points="17,35 12,32 12,38" fill="#0284c7" />
        {/* S2 <-> */}
        <polygon points="26,35 30,32 30,38" fill="#0284c7" />
        <polygon points="35,35 31,32 31,38" fill="#0284c7" />
        {/* S3 <- */}
        <polygon points="44,35 49,32 49,38" fill="#0284c7" />
        {/* Center meeting stile */}
        <rect x="58" y="30" width="2" height="10" fill="#0f172a" />
        {/* S4 -> */}
        <polygon points="73,35 68,32 68,38" fill="#0284c7" />
        {/* S5 <- */}
        <polygon points="83,35 88,32 88,38" fill="#0284c7" />
        <text x="92" y="56" fontSize="5" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },
  {
    id: 'slider_3track_6panel',
    category: 'sliding',
    label: '3 TRACK 6 PANEL',
    labelHindi: '3-ट्रैक 6-पैनल स्लाइडर [ 6 ग्लास सैश • सेंटर मीटिंग ]',
    description: '3-Track 6-Panel: S1 (→), S2 (↔), S3 (←) || S4 (→), S5 (↔), S6 (←) Center Meeting',
    badge: '3-Track 6-Panel',
    dragData: {
      type: 'sash_type',
      sashType: 'slider_6s_meeting',
      rawText: 'sash:slider_3track_6panel',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="2" y="10" width="96" height="50" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" rx="2" />
        <line x1="18" y1="10" x2="18" y2="60" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1" />
        <line x1="34" y1="10" x2="34" y2="60" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1" />
        <line x1="50" y1="10" x2="50" y2="60" stroke="#0f172a" strokeWidth="1.8" />
        <line x1="66" y1="10" x2="66" y2="60" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1" />
        <line x1="82" y1="10" x2="82" y2="60" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1" />
        {/* S1 -> */}
        <line x1="9" y1="35" x2="15" y2="35" stroke="#0284c7" strokeWidth="1.2" />
        <polygon points="13,32 17,35 13,38" fill="#0284c7" />
        {/* S2 <-> (दोनों तरफ एरो) */}
        <line x1="21" y1="35" x2="31" y2="35" stroke="#0284c7" strokeWidth="1.4" />
        <polygon points="23,32 19,35 23,38" fill="#0284c7" />
        <polygon points="29,32 33,35 29,38" fill="#0284c7" />
        {/* S3 <- */}
        <line x1="37" y1="35" x2="43" y2="35" stroke="#0284c7" strokeWidth="1.2" />
        <polygon points="39,32 35,35 39,38" fill="#0284c7" />
        {/* Center meeting stile with lock (बीच में भी लॉक) */}
        <rect x="49" y="20" width="2" height="30" fill="#0284c7" />
        <rect x="47" y="31" width="6" height="8" rx="1.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
        <path d="M48.5,31 V29 A1.5,1.5 0 0,1 51.5,29 V31" fill="none" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="50" cy="34" r="0.8" fill="#78350f" />
        {/* S4 -> */}
        <line x1="57" y1="35" x2="63" y2="35" stroke="#0284c7" strokeWidth="1.2" />
        <polygon points="61,32 65,35 61,38" fill="#0284c7" />
        {/* S5 <-> (दोनों तरफ एरो) */}
        <line x1="69" y1="35" x2="79" y2="35" stroke="#0284c7" strokeWidth="1.4" />
        <polygon points="71,32 67,35 71,38" fill="#0284c7" />
        <polygon points="77,32 81,35 77,38" fill="#0284c7" />
        {/* S6 <- */}
        <line x1="85" y1="35" x2="91" y2="35" stroke="#0284c7" strokeWidth="1.2" />
        <polygon points="87,32 83,35 87,38" fill="#0284c7" />
        <text x="92" y="56" fontSize="5" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },
  {
    id: 'slider_6panel_3track',
    category: 'sliding',
    label: '6 PANEL 3 TRACK',
    labelHindi: '6 पैनल 3 ट्रैक [ 4 ग्लास + 2 जाली MS1/MS2 • सेंटर लॉक ]',
    description: '6 Panel 3 Track: 4 Glass Sashes (S1 → | S2 ← | S3 → | S4 ←) + 2 Center Fly Mesh Sashes (MS1 ← [5], MS2 → [6]) with Center Meeting Lock',
    badge: '6 Panel 3 Track',
    dragData: {
      type: 'sash_type',
      sashType: 'slider_3t_6p_4g2m',
      hasMesh: true,
      rawText: 'sash:slider_3t_6p_4g2m',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="3" y="8" width="94" height="54" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.2" rx="2" />
        {/* 4 Bays dividers */}
        <line x1="26.5" y1="8" x2="26.5" y2="62" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1" />
        <line x1="50" y1="8" x2="50" y2="62" stroke="#0284c7" strokeWidth="1.6" strokeDasharray="3 1.5" />
        <line x1="73.5" y1="8" x2="73.5" y2="62" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 1" />

        {/* S1: Left Glass (->) */}
        <rect x="6" y="12" width="18" height="46" fill="#bae6fd" stroke="#334155" strokeWidth="0.9" />
        <text x="15" y="19" fontSize="5.5" fontWeight="900" fill="#0f172a" textAnchor="middle">S1</text>
        <line x1="9" y1="35" x2="20" y2="35" stroke="#0f172a" strokeWidth="1.5" />
        <polygon points="18,32.5 22,35 18,37.5" fill="#0f172a" />
        <rect x="4.5" y="29" width="2" height="12" rx="0.5" fill="#0f172a" />

        {/* S2 + MS1: Center-Left Glass + Fly Mesh (<- + green <-) */}
        <rect x="28.5" y="12" width="19.5" height="46" fill="#bae6fd" stroke="#0f172a" strokeWidth="1" />
        <rect x="28.5" y="12" width="19.5" height="46" fill="#10b981" fillOpacity="0.16" />
        <line x1="29" y1="18" x2="47" y2="36" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="47" y1="18" x2="29" y2="36" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="29" y1="36" x2="47" y2="54" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="47" y1="36" x2="29" y2="54" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.6" />
        <text x="38" y="19" fontSize="5.5" fontWeight="900" fill="#0f172a" textAnchor="middle">S2</text>
        <line x1="44" y1="33" x2="33" y2="33" stroke="#0f172a" strokeWidth="1.5" />
        <polygon points="35,30.5 31,33 35,35.5" fill="#0f172a" />
        <line x1="43" y1="40" x2="34" y2="40" stroke="#059669" strokeWidth="1.3" />
        <polygon points="36,38 32,40 36,42" fill="#059669" />
        <rect x="30" y="51" width="16" height="6.5" rx="1" fill="#ecfdf5" stroke="#059669" strokeWidth="0.7" />
        <text x="38" y="56" fontSize="4.5" fontWeight="900" fill="#065f46" textAnchor="middle">MS1</text>

        {/* S3 + MS2: Center-Right Glass + Fly Mesh (-> + green ->) */}
        <rect x="52" y="12" width="19.5" height="46" fill="#bae6fd" stroke="#0f172a" strokeWidth="1" />
        <rect x="52" y="12" width="19.5" height="46" fill="#10b981" fillOpacity="0.16" />
        <line x1="52.5" y1="18" x2="70.5" y2="36" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="70.5" y1="18" x2="52.5" y2="36" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="52.5" y1="36" x2="70.5" y2="54" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1="70.5" y1="36" x2="52.5" y2="54" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.6" />
        <text x="62" y="19" fontSize="5.5" fontWeight="900" fill="#0f172a" textAnchor="middle">S3</text>
        <line x1="56" y1="33" x2="67" y2="33" stroke="#0f172a" strokeWidth="1.5" />
        <polygon points="65,30.5 69,33 65,35.5" fill="#0f172a" />
        <line x1="57" y1="40" x2="66" y2="40" stroke="#059669" strokeWidth="1.3" />
        <polygon points="64,38 68,40 64,42" fill="#059669" />
        <rect x="54" y="51" width="16" height="6.5" rx="1" fill="#ecfdf5" stroke="#059669" strokeWidth="0.7" />
        <text x="62" y="56" fontSize="4.5" fontWeight="900" fill="#065f46" textAnchor="middle">MS2</text>

        {/* Center Meeting Lock */}
        <rect x="47.5" y="30" width="5" height="9" rx="1.2" fill="#f59e0b" stroke="#78350f" strokeWidth="0.7" />

        {/* S4: Right Glass (<-) */}
        <rect x="76" y="12" width="18" height="46" fill="#bae6fd" stroke="#334155" strokeWidth="0.9" />
        <text x="85" y="19" fontSize="5.5" fontWeight="900" fill="#0f172a" textAnchor="middle">S4</text>
        <line x1="91" y1="35" x2="80" y2="35" stroke="#0f172a" strokeWidth="1.5" />
        <polygon points="82,32.5 78,35 82,37.5" fill="#0f172a" />
        <rect x="93.5" y="29" width="2" height="12" rx="0.5" fill="#0f172a" />
      </svg>
    ),
  },
  // =========================================================================
  // 3. PANELS, MESH, GLASS & INFILL
  // =========================================================================
  {
    id: 'clear_glass',
    category: 'panels',
    label: 'CLEAR GLASS',
    labelHindi: 'प्लेन पारदर्शी ग्लास (5/6mm)',
    description: '5mm / 6mm Clear Float Glass',
    dragData: {
      type: 'panel_type',
      glassType: 'clear_5mm',
      sashType: 'fixed',
      rawText: 'panel:clear_glass',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f0f9ff" stroke="#0284c7" strokeWidth="2" rx="2" />
        <line x1="20" y1="20" x2="45" y2="45" stroke="#bae6fd" strokeWidth="2" />
        <line x1="50" y1="20" x2="75" y2="45" stroke="#bae6fd" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'frosted_glass',
    category: 'panels',
    label: 'FROSTED GLASS',
    labelHindi: 'धुंधला फ्रॉस्टेड ग्लास (Privacy)',
    description: 'Acid Etched / Privacy Glass',
    dragData: {
      type: 'panel_type',
      glassType: 'frosted',
      rawText: 'panel:frosted_glass',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" rx="2" />
        <pattern id="frostPatt" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.8" fill="#94a3b8" />
        </pattern>
        <rect x="14" y="12" width="72" height="46" fill="url(#frostPatt)" />
      </svg>
    ),
  },
  {
    id: 'tinted_glass',
    category: 'panels',
    label: 'TINTED GLASS',
    labelHindi: 'टिन्टेड रिफ्लेक्टिव ग्लास',
    description: 'Solar Control Reflective Glass',
    dragData: {
      type: 'panel_type',
      glassType: 'tint_grey',
      rawText: 'panel:tinted_glass',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#334155" stroke="#0f172a" strokeWidth="2" rx="2" />
        <line x1="20" y1="20" x2="45" y2="45" stroke="#64748b" strokeWidth="2" strokeOpacity="0.7" />
        <line x1="50" y1="20" x2="75" y2="45" stroke="#64748b" strokeWidth="2" strokeOpacity="0.7" />
        <text x="50" y="40" fontSize="8" fontWeight="bold" fill="#94a3b8" textAnchor="middle">Tinted</text>
      </svg>
    ),
  },
  {
    id: 'dgu_glass',
    category: 'panels',
    label: 'DGU DOUBLE GLASS',
    labelHindi: 'डबल ग्लास (5+12A+5mm DGU)',
    description: 'Double Glazed Unit for Sound & Heat Proofing',
    badge: 'DGU 24mm',
    dragData: {
      type: 'panel_type',
      glassType: 'dgu_5_12_5',
      rawText: 'panel:dgu_glass',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#e0f2fe" stroke="#0369a1" strokeWidth="2" rx="2" />
        <rect x="18" y="14" width="64" height="42" fill="#bae6fd" fillOpacity="0.5" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 3" />
        <text x="50" y="38" fontSize="8" fontWeight="900" fill="#0369a1" textAnchor="middle">5+12+5 DGU</text>
      </svg>
    ),
  },
  {
    id: 'mesh_sash',
    category: 'panels',
    label: 'FLY MESH SCREEN',
    labelHindi: 'SS 304 मच्छर जाली',
    description: 'Stainless Steel Mosquito Mesh',
    dragData: {
      type: 'panel_type',
      sashType: 'mesh_sash',
      hasMesh: true,
      rawText: 'panel:mesh_sash',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f1f5f9" stroke="#0284c7" strokeWidth="2" rx="2" />
        <pattern id="meshPattGrid" width="6" height="6" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="6" y2="6" stroke="#94a3b8" strokeWidth="0.8" />
          <line x1="6" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="0.8" />
        </pattern>
        <rect x="14" y="12" width="72" height="46" fill="url(#meshPattGrid)" />
      </svg>
    ),
  },
  {
    id: 'upvc_panel',
    category: 'panels',
    label: 'SOLID UPVC PANEL',
    labelHindi: 'सॉलिड uPVC पैनल बोर्ड',
    description: 'Tongue & Groove Insulated Panel',
    dragData: {
      type: 'panel_type',
      sashType: 'upvc_panel',
      rawText: 'panel:upvc_panel',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#e2e8f0" stroke="#475569" strokeWidth="2" rx="2" />
        {[26, 40, 54, 68, 82].map((x) => (
          <line key={x} x1={x} y1="12" x2={x} y2="58" stroke="#94a3b8" strokeWidth="1.5" />
        ))}
      </svg>
    ),
  },
  {
    id: 'louver',
    category: 'panels',
    label: 'VENTILATION LOUVER',
    labelHindi: 'लूवर (हवादार जाली/पत्ती)',
    description: 'Ventilation Louver Blades',
    dragData: {
      type: 'panel_type',
      sashType: 'louver',
      rawText: 'panel:louver',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="2" rx="2" />
        {[18, 26, 34, 42, 50].map((y) => (
          <line key={y} x1={16} y1={y} x2={84} y2={y + 4} stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        ))}
      </svg>
    ),
  },
  {
    id: 'georgian_bar',
    category: 'panels',
    label: 'DORGEN BAR 2×2 (GOLD)',
    labelHindi: 'डोरगन बार 2×2 (गोल्डन ब्रास)',
    description: '18mm Golden Brass Georgian Internal Grid (4 Panes)',
    badge: 'Gold 2×2',
    dragData: {
      type: 'panel_type',
      gridPattern: 'georgian_2x2',
      georgianBar: {
        enabled: true,
        pattern: 'georgian_2x2',
        color: 'gold',
        barWidth: 18,
        style: 'internal',
      },
      rawText: 'panel:georgian_grid_2x2_gold',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="2" rx="2" />
        <line x1="50" y1="10" x2="50" y2="60" stroke="#d97706" strokeWidth="3" />
        <line x1="12" y1="35" x2="88" y2="35" stroke="#d97706" strokeWidth="3" />
        <line x1="50" y1="10" x2="50" y2="60" stroke="#fef08a" strokeWidth="1" />
        <line x1="12" y1="35" x2="88" y2="35" stroke="#fef08a" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: 'georgian_bar_white_3x3',
    category: 'panels',
    label: 'DORGEN BAR 3×3 (WHITE)',
    labelHindi: 'डोरगन बार 3×3 (सफेद ग्रिड)',
    description: '18mm Classic White Georgian Bar (9 Panes)',
    badge: 'White 3×3',
    dragData: {
      type: 'panel_type',
      gridPattern: 'georgian_3x3',
      georgianBar: {
        enabled: true,
        pattern: 'georgian_3x3',
        color: 'white',
        barWidth: 18,
        style: 'internal',
      },
      rawText: 'panel:georgian_grid_3x3_white',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#e0f2fe" stroke="#475569" strokeWidth="2" rx="2" />
        <line x1="37" y1="10" x2="37" y2="60" stroke="#ffffff" strokeWidth="2.5" />
        <line x1="63" y1="10" x2="63" y2="60" stroke="#ffffff" strokeWidth="2.5" />
        <line x1="12" y1="26" x2="88" y2="26" stroke="#ffffff" strokeWidth="2.5" />
        <line x1="12" y1="44" x2="88" y2="44" stroke="#ffffff" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: 'georgian_bar_prairie',
    category: 'panels',
    label: 'COLONIAL / PRAIRIE BAR',
    labelHindi: 'कोलोनियल / प्रेयरी बॉर्डर बार',
    description: 'Perimeter Border Muntin Grid (Colonial Prairie Architecture)',
    badge: 'Colonial',
    dragData: {
      type: 'panel_type',
      gridPattern: 'georgian_prairie',
      georgianBar: {
        enabled: true,
        pattern: 'georgian_prairie',
        color: 'gold',
        barWidth: 18,
        style: 'internal',
      },
      rawText: 'panel:georgian_grid_prairie',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="2" rx="2" />
        <rect x="24" y="18" width="52" height="34" fill="none" stroke="#d97706" strokeWidth="2.5" />
        <line x1="24" y1="10" x2="24" y2="60" stroke="#d97706" strokeWidth="2" />
        <line x1="76" y1="10" x2="76" y2="60" stroke="#d97706" strokeWidth="2" />
        <line x1="12" y1="18" x2="88" y2="18" stroke="#d97706" strokeWidth="2" />
        <line x1="12" y1="52" x2="88" y2="52" stroke="#d97706" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'georgian_bar_diamond',
    category: 'panels',
    label: 'DIAMOND LATTICE BAR',
    labelHindi: 'डायमंड लैटिस ग्रिड बार',
    description: '45° Diagonal Argyle Diamond Grid',
    badge: 'Diamond',
    dragData: {
      type: 'panel_type',
      gridPattern: 'georgian_diamond',
      georgianBar: {
        enabled: true,
        pattern: 'georgian_diamond',
        color: 'gold',
        barWidth: 18,
        style: 'internal',
      },
      rawText: 'panel:georgian_grid_diamond',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="2" rx="2" />
        <path d="M 50 10 L 88 35 L 50 60 L 12 35 Z" fill="none" stroke="#d97706" strokeWidth="2" />
        <line x1="25" y1="10" x2="75" y2="60" stroke="#d97706" strokeWidth="1.5" />
        <line x1="75" y1="10" x2="25" y2="60" stroke="#d97706" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'georgian_clear_plain',
    category: 'panels',
    label: 'PLAIN GLASS (NO BARS)',
    labelHindi: 'सादा ग्लास (बार हटाएं)',
    description: 'Clear plain glass without any decorative bars',
    badge: 'No Bars',
    dragData: {
      type: 'panel_type',
      gridPattern: 'none',
      georgianBar: {
        enabled: false,
        pattern: 'none',
      },
      rawText: 'panel:clear_glass_plain',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#e0f2fe" stroke="#475569" strokeWidth="2" rx="2" />
        <line x1="25" y1="20" x2="45" y2="40" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },

  // =========================================================================
  // 3.5 TOOL SYSTEM (Pure 1 Fan & 1 AC Option - ड्रैग करके जिस हिस्से में लगाना हो डालें)
  // =========================================================================
  {
    id: 'tool_exhaust_fan',
    category: 'fan_ac',
    label: 'EXHAUST FAN (GLASS CUTOUT)',
    labelHindi: 'एग्जॉस्ट फैन (ग्लास में सर्कुलर कटआउट)',
    description: 'Real glass pane with circular hole cutout, rubber gasket, bolts & aerodynamic blades',
    badge: 'Glass Hole',
    dragData: {
      type: 'fan_ac',
      sashType: 'fan_provision',
      hasFanCutout: true,
      fanCutoutDiameter: 200,
      fanPanelType: 'glass_hole',
      rawText: 'fan_ac:fan',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        {/* Outer Frame Sash Profile */}
        <rect x="8" y="6" width="84" height="58" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" rx="2" />
        {/* Beading Frame */}
        <rect x="15" y="12" width="70" height="46" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
        {/* Real Blue Tint Glass Area Around Fan */}
        <rect x="18" y="15" width="64" height="40" fill="#c3ebfa" stroke="#0f172a" strokeWidth="1" />
        {/* Glass Reflection Highlight Streaks */}
        <line x1="28" y1="16" x2="20" y2="28" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.8" />
        <line x1="80" y1="42" x2="72" y2="52" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />

        {/* Circular Cut Hole in Glass (Through hole opening) */}
        <circle cx="50" cy="35" r="16" fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.5" />
        {/* Cut Glass Edge Highlight & Gasket Ring */}
        <circle cx="50" cy="35" r="17.5" fill="none" stroke="#1e293b" strokeWidth="1.2" />
        <circle cx="50" cy="35" r="16.5" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.9" />

        {/* 4 Chrome Mounting Bolts Clamping onto Glass */}
        <circle cx="38" cy="23" r="1.5" fill="#cbd5e1" stroke="#334155" strokeWidth="0.5" />
        <circle cx="62" cy="23" r="1.5" fill="#cbd5e1" stroke="#334155" strokeWidth="0.5" />
        <circle cx="38" cy="47" r="1.5" fill="#cbd5e1" stroke="#334155" strokeWidth="0.5" />
        <circle cx="62" cy="47" r="1.5" fill="#cbd5e1" stroke="#334155" strokeWidth="0.5" />

        {/* Concentric Wire Safety Guard Rings */}
        <circle cx="50" cy="35" r="13" fill="none" stroke="#64748b" strokeWidth="0.6" />
        <circle cx="50" cy="35" r="9" fill="none" stroke="#64748b" strokeWidth="0.6" />

        {/* 4 Aerodynamic Curved Fan Blades */}
        <path d="M 50 35 C 53 27, 58 24, 60 22 C 57 26, 54 31, 50 35 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
        <path d="M 50 35 C 58 38, 61 43, 63 45 C 59 42, 54 39, 50 35 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
        <path d="M 50 35 C 47 43, 42 46, 40 48 C 43 44, 46 39, 50 35 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />
        <path d="M 50 35 C 42 32, 39 27, 37 25 C 41 28, 46 31, 50 35 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" />

        {/* Center Motor Hub Dome */}
        <circle cx="50" cy="35" r="4.5" fill="#0284c7" stroke="#0c4a6e" strokeWidth="0.8" />
        <circle cx="50" cy="35" r="2" fill="#ffffff" fillOpacity="0.8" />

        {/* Cutout Label Badge */}
        <rect x="22" y="58" width="56" height="8" rx="2" fill="#0284c7" />
        <text x="50" y="64" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle">Ø200mm GLASS HOLE</text>
      </svg>
    ),
  },
  {
    id: 'tool_window_ac',
    category: 'fan_ac',
    label: 'WINDOW AC UNIT (FULL FIT)',
    labelHindi: 'विंडो AC यूनिट (पूरी जगह में 100% फिट)',
    description: '100% Pocket-fitting Window AC with swing louvers, intake grille & 24°C LED display',
    badge: '100% Full Fit',
    dragData: {
      type: 'fan_ac',
      sashType: 'ac_provision',
      hasACLouver: true,
      acUnitType: 'box_cutout',
      rawText: 'ac:window_ac',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        {/* Full Pocket AC Housing Casing (100% Edge-to-Edge) */}
        <rect x="8" y="6" width="84" height="58" fill="#f8fafc" stroke="#1e293b" strokeWidth="2.2" rx="2" />
        
        {/* Upper Cool Breeze Discharge Chamber */}
        <rect x="12" y="10" width="76" height="20" fill="#1e293b" rx="1.5" />
        {/* 3 Horizontal Aerodynamic Swing Louvers */}
        <rect x="14" y="13" width="72" height="3" fill="#94a3b8" rx="0.5" />
        <rect x="14" y="18" width="72" height="3" fill="#cbd5e1" rx="0.5" />
        <rect x="14" y="23" width="72" height="3" fill="#94a3b8" rx="0.5" />
        {/* Vertical Guide Vanes */}
        {[24, 34, 44, 54, 64, 74].map((vx) => (
          <line key={vx} x1={vx} y1="12" x2={vx} y2="28" stroke="#0f172a" strokeWidth="0.8" />
        ))}

        {/* Lower Left Air Intake Filter Grille (70% width) */}
        <rect x="12" y="33" width="52" height="27" fill="#f1f5f9" stroke="#475569" strokeWidth="1" rx="1" />
        {[36, 40, 44, 48, 52, 56].map((gy) => (
          <line key={gy} x1="15" y1={gy} x2="61" y2={gy} stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        ))}
        {/* Filter Pull Tab */}
        <rect x="15" y="58" width="12" height="1.5" fill="#94a3b8" rx="0.5" />

        {/* Lower Right Piano-Black Digital Control Panel */}
        <rect x="67" y="33" width="21" height="27" fill="#090d16" stroke="#334155" strokeWidth="1" rx="2" />
        {/* 24°C Neon Ice-Blue Digital Readout */}
        <text x="77.5" y="42" fill="#38bdf8" fontSize="7" fontWeight="900" fontFamily="monospace" textAnchor="middle">24°C</text>
        {/* Status Indicators: Green Power, Blue Cool */}
        <circle cx="73" cy="48" r="1.5" fill="#22c55e" />
        <circle cx="82" cy="48" r="1.5" fill="#38bdf8" />
        {/* Capacitive Buttons */}
        <rect x="71" y="52" width="13" height="5" rx="1" fill="#1e293b" />
        <text x="77.5" y="55.8" fill="#e2e8f0" fontSize="3.5" fontWeight="bold" textAnchor="middle">POWER</text>

        {/* Bottom Sleeve Fitting Badge */}
        <rect x="20" y="60" width="36" height="3" fill="#0284c7" rx="0.5" />
        <text x="38" y="62.5" fill="#ffffff" fontSize="2.5" fontWeight="bold" textAnchor="middle">FULL POCKET FIT</text>
      </svg>
    ),
  },

  // =========================================================================
  // 4. COUPLING TOOLS (2mm Flat, Box, Stacked, Corner)
  // =========================================================================
  {
    id: 'coupling_horizontal',
    category: 'coupling',
    label: 'SIDE-BY-SIDE 2MM',
    labelHindi: 'साइड कप्लिंग (बायाँ/दायाँ जोड़)',
    description: 'Side-by-Side 2mm Vertical Coupler (Left & Right Frames)',
    badge: '2mm Gap',
    dragData: {
      type: 'coupling',
      direction: 'horizontal',
      couplerType: 'flat_2mm',
      rawText: 'v_split',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="35" height="50" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" rx="1" />
        <rect x="53" y="10" width="35" height="50" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" rx="1" />
        <line x1="50" y1="6" x2="50" y2="64" stroke="#f59e0b" strokeWidth="3" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    id: 'coupling_vertical',
    category: 'coupling',
    label: 'TOP-LIGHT / STACKED 2MM',
    labelHindi: 'ऊपर/नीचे कप्लिंग (टॉप-लाइट जोड़)',
    description: 'Stacked 2mm Horizontal Coupler (Top & Bottom Frames)',
    badge: '2mm Gap',
    dragData: {
      type: 'coupling',
      direction: 'vertical',
      couplerType: 'flat_2mm',
      rawText: 'h_split',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="22" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" rx="1" />
        <rect x="12" y="38" width="76" height="22" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" rx="1" />
        <line x1="8" y1="35" x2="92" y2="35" stroke="#f59e0b" strokeWidth="3" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    id: 'coupling_box_heavy',
    category: 'coupling',
    label: 'HEAVY BOX COUPLER',
    labelHindi: 'हैवी बॉक्स कप्लिंग (50mm)',
    description: 'Heavy Structural Box Coupler',
    badge: '50mm Box',
    dragData: {
      type: 'coupling',
      direction: 'horizontal',
      couplerType: 'box_profile',
      rawText: 'h_split',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="30" height="50" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" rx="1" />
        <rect x="44" y="10" width="12" height="50" fill="#cbd5e1" stroke="#475569" strokeWidth="1.8" />
        <rect x="58" y="10" width="30" height="50" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.8" rx="1" />
      </svg>
    ),
  },
  {
    id: 'coupling_corner_90',
    category: 'coupling',
    label: '90° CORNER COUPLER',
    labelHindi: '90° एल-कॉर्नर कप्लिंग',
    description: '90 Degree Heavy Corner Box Post',
    badge: 'Corner 90°',
    dragData: {
      type: 'coupling',
      couplerType: 'corner_90',
      direction: 'right',
      rawText: 'coupling:corner_90',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="14" y="24" width="40" height="36" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
        <rect x="54" y="24" width="22" height="22" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
        <path d="M 54,46 L 54,60 L 68,60" fill="none" stroke="#2563eb" strokeWidth="2" />
        <text x="65" y="38" fontSize="8" fontWeight="bold" fill="#1e40af" textAnchor="middle">90°</text>
      </svg>
    ),
  },
  {
    id: 'coupling_bay_135',
    category: 'coupling',
    label: '135° BAY POLE COUPLER',
    labelHindi: '135° बे-विंडो पोल कप्लिंग',
    description: '135 Degree Bay Window Variable Coupler',
    badge: 'Bay 135°',
    dragData: {
      type: 'coupling',
      couplerType: 'corner_135',
      direction: 'right',
      angle: 135,
      rawText: 'coupling:corner_135',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="24" width="34" height="36" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
        <circle cx="56" cy="35" r="9" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
        <line x1="56" y1="26" x2="84" y2="44" stroke="#2563eb" strokeWidth="3" />
        <text x="56" y="38" fontSize="7" fontWeight="bold" fill="#92400e" textAnchor="middle">135°</text>
      </svg>
    ),
  },
  {
    id: 'coupling_variable_angle',
    category: 'coupling',
    label: 'VARIABLE ANGLE COUPLER (LC)',
    labelHindi: '📐 वेरिएबल एंगल कप्लिंग (LC मोड़ कोण)',
    description: 'Adjustable Angle Coupler (LC) (कप्लिंग डाल के उसका एंगल डालें कि वो कितना मुड़ेगा)',
    badge: 'LC • Angle °',
    dragData: {
      type: 'coupling',
      couplerType: 'variable_bay_pole',
      direction: 'right',
      angle: 135,
      rawText: 'coupling:variable_bay_pole',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="10" y="24" width="32" height="36" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
        <circle cx="48" cy="36" r="10" fill="#fef3c7" stroke="#ea580c" strokeWidth="2" strokeDasharray="3 2" />
        <line x1="48" y1="24" x2="78" y2="42" stroke="#2563eb" strokeWidth="3" />
        <path d="M 38,36 A 10,10 0 0,0 58,40" fill="none" stroke="#ea580c" strokeWidth="1.5" />
        <text x="48" y="39" fontSize="7.5" fontWeight="bold" fill="#c2410c" textAnchor="middle">∠°</text>
      </svg>
    ),
  },

  // =========================================================================
  // 5. MULLIONS & TRANSOMS (Horizontal, Vertical, Multi-Horizontal, Multi-Vertical)
  // =========================================================================
  {
    id: 'mullion_vertical',
    category: 'mullions',
    label: 'VERTICAL MULLION (SINGLE)',
    labelHindi: 'खड़ा मुलियन (1 Vertical)',
    description: 'Single full vertical mullion dividing frame or section',
    badge: '1 Mullion',
    dragData: {
      type: 'mullion',
      orientation: 'vertical',
      rawText: 'mullion:vertical',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="2" rx="2" />
        <rect x="46" y="10" width="8" height="50" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1" />
        <text x="50" y="38" fontSize="8" fontWeight="bold" fill="#ffffff" textAnchor="middle">1</text>
      </svg>
    ),
  },
  {
    id: 'mullion_horizontal',
    category: 'mullions',
    label: 'HORIZONTAL TRANSOM (SINGLE)',
    labelHindi: 'आड़ा ट्रांसॉम (1 Transom)',
    description: 'Single full horizontal transom dividing frame or section',
    badge: '1 Transom',
    dragData: {
      type: 'mullion',
      orientation: 'horizontal',
      rawText: 'mullion:horizontal',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="2" rx="2" />
        <rect x="12" y="31" width="76" height="8" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1" />
        <text x="50" y="38" fontSize="8" fontWeight="bold" fill="#ffffff" textAnchor="middle">1</text>
      </svg>
    ),
  },
  {
    id: 'mullion_multi_vertical',
    category: 'mullions',
    label: 'MULTIPLE VERTICAL MULLIONS',
    labelHindi: 'मल्टीपल खड़ा मुलियन (2, 3, 4...)',
    description: 'Popup asks quantity (e.g. 2, 3, 4...) and inserts equally',
    badge: 'Ask Count 💬',
    dragData: {
      type: 'mullion',
      orientation: 'multi_vertical' as any,
      rawText: 'mullion:multi_vertical',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f0f9ff" stroke="#0284c7" strokeWidth="2" rx="2" />
        {/* 2 or 3 vertical bars */}
        <rect x="33" y="10" width="6" height="50" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        <rect x="52" y="10" width="6" height="50" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        <rect x="71" y="10" width="6" height="50" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        {/* Count badge pill */}
        <rect x="58" y="12" width="26" height="14" rx="7" fill="#2563eb" />
        <text x="71" y="22" fontSize="9" fontWeight="bold" fill="#ffffff" textAnchor="middle">+N</text>
      </svg>
    ),
  },
  {
    id: 'mullion_multi_horizontal',
    category: 'mullions',
    label: 'MULTIPLE HORIZONTAL TRANSOMS',
    labelHindi: 'मल्टीपल आड़ा ट्रांसॉम (2, 3, 4...)',
    description: 'Popup asks quantity (e.g. 2, 3, 4...) and inserts equally',
    badge: 'Ask Count 💬',
    dragData: {
      type: 'mullion',
      orientation: 'multi_horizontal' as any,
      rawText: 'mullion:multi_horizontal',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f0f9ff" stroke="#0284c7" strokeWidth="2" rx="2" />
        {/* Multiple horizontal bars */}
        <rect x="12" y="22" width="76" height="6" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        <rect x="12" y="37" width="76" height="6" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        <rect x="12" y="52" width="76" height="6" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        {/* Count badge pill */}
        <rect x="58" y="12" width="26" height="14" rx="7" fill="#2563eb" />
        <text x="71" y="22" fontSize="9" fontWeight="bold" fill="#ffffff" textAnchor="middle">+N</text>
      </svg>
    ),
  },
  {
    id: 'mullion_equalize',
    category: 'mullions',
    label: 'EQUALIZE ALL BAYS',
    labelHindi: 'सभी खानों को बराबर करें',
    description: 'Equalize Distance Between All Mullions',
    badge: 'Equal Space',
    dragData: {
      type: 'mullion',
      rawText: 'mullion:equalize',
    },
    renderIcon: () => (
      <svg viewBox="0 0 100 70" className="w-16 h-12">
        <rect x="12" y="10" width="76" height="50" fill="#f8fafc" stroke="#475569" strokeWidth="2" rx="2" />
        <line x1="37" y1="10" x2="37" y2="60" stroke="#3b82f6" strokeWidth="2" />
        <line x1="63" y1="10" x2="63" y2="60" stroke="#3b82f6" strokeWidth="2" />
        <text x="24" y="38" fontSize="8" fontWeight="bold" fill="#0284c7" textAnchor="middle">=</text>
        <text x="50" y="38" fontSize="8" fontWeight="bold" fill="#0284c7" textAnchor="middle">=</text>
        <text x="76" y="38" fontSize="8" fontWeight="bold" fill="#0284c7" textAnchor="middle">=</text>
      </svg>
    ),
  },
];

interface SashTypesPaletteProps {
  onSelectSashType: (type: SashType) => void;
  onSelectCouplingAction?: (action: 'h_split' | 'v_split' | CouplerType) => void;
  onSelectMullionAction?: (
    orientation:
      | 'vertical'
      | 'horizontal'
      | 'cross'
      | 'equalize'
      | 'left_third'
      | 'right_third'
      | 'top_third'
      | 'multi_vertical'
      | 'multi_horizontal'
  ) => void;
  onSelectPanelAction?: (config: {
    glassType?: GlassType;
    sashType?: SashType;
    gridPattern?: GridPattern;
    georgianBar?: GeorgianBarConfig;
    hasMesh?: boolean;
  }) => void;
  onRequestGeorgianBarPrompt?: (initial?: { pattern?: GridPattern; color?: any; cols?: number; rows?: number }) => void;
  onSelectFanAcAction?: (action: {
    type: 'fan' | 'ac' | 'top_fan_transom' | 'bottom_ac_transom';
    diameter?: number;
    fanPanelType?: string;
    fanHorizontalAlign?: 'left' | 'center' | 'right';
    acUnitType?: string;
  }) => void;
  onOpenSlidingGallery?: () => void;
  onClose?: () => void;
  selectedSashType?: SashType | null;
  hasSelectedPocket?: boolean;
  activeCategoryTab?: PaletteCategory;
  activeCategory?: PaletteCategory;
  onCategoryChange?: (category: PaletteCategory) => void;
}

export const SashTypesPalette: React.FC<SashTypesPaletteProps> = ({
  onSelectSashType,
  onSelectCouplingAction,
  onSelectMullionAction,
  onSelectPanelAction,
  onRequestGeorgianBarPrompt,
  onSelectFanAcAction,
  onOpenSlidingGallery,
  onClose,
  selectedSashType,
  hasSelectedPocket = false,
  activeCategoryTab,
  activeCategory,
  onCategoryChange,
}) => {
  const [internalTab, setInternalTab] = useState<PaletteCategory>('casement');
  const activeTab = activeCategoryTab || activeCategory || internalTab;

  const handleTabClick = (cat: PaletteCategory) => {
    setInternalTab(cat);
    if (onCategoryChange) {
      onCategoryChange(cat);
    }
  };

  const filteredItems = CAD_PALETTE_ITEMS.filter((item) => item.category === activeTab);

  const handleDragStart = (e: React.DragEvent, item: DragItemDef) => {
    e.dataTransfer.setData('text/plain', item.dragData.rawText);
    e.dataTransfer.setData('application/json', JSON.stringify(item.dragData));
    e.dataTransfer.effectAllowed = 'copyMove';

    // Auto-close palette drawer immediately on drag start:
    // "SIDE SE DEGIN SALECT KAR DRAG KAR DETE H TO POP KHULA RAHTA H WO BAND HO JAYE DRAG KARNE PER"
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 50);
  };

  const handleDragEnd = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleClickItem = (item: DragItemDef) => {
    if (item.dragData.type === 'sash_type' && item.dragData.sashType) {
      onSelectSashType(item.dragData.sashType);
    } else if (item.dragData.type === 'coupling') {
      if (onSelectCouplingAction) {
        onSelectCouplingAction(
          item.dragData.direction === 'vertical' ? 'v_split' : item.dragData.couplerType || 'h_split'
        );
      }
    } else if (item.dragData.type === 'mullion') {
      if (onSelectMullionAction) {
        onSelectMullionAction(
          item.dragData.orientation || (item.id === 'mullion_equalize' ? 'equalize' : 'vertical')
        );
      }
    } else if (item.dragData.type === 'fan_ac') {
      if (onSelectFanAcAction) {
        onSelectFanAcAction({
          type:
            item.dragData.action === 'top_fan_transom'
              ? 'top_fan_transom'
              : item.dragData.action === 'bottom_ac_transom'
              ? 'bottom_ac_transom'
              : item.dragData.hasFanCutout
              ? 'fan'
              : 'ac',
          diameter: item.dragData.fanCutoutDiameter,
          fanPanelType: item.dragData.fanPanelType,
          acUnitType: item.dragData.acUnitType,
        });
      } else if (item.dragData.sashType) {
        onSelectSashType(item.dragData.sashType);
      }
    } else if (item.dragData.type === 'panel_type') {
      const isGeorgianItem =
        item.id.startsWith('georgian') ||
        item.dragData.gridPattern?.startsWith('georgian') ||
        item.dragData.georgianBar?.enabled;

      if (isGeorgianItem && onRequestGeorgianBarPrompt) {
        onRequestGeorgianBarPrompt({
          pattern: item.dragData.gridPattern,
          color: item.dragData.georgianBar?.color,
          cols: item.dragData.georgianBar?.cols,
          rows: item.dragData.georgianBar?.rows,
        });
      } else if (onSelectPanelAction) {
        onSelectPanelAction({
          glassType: item.dragData.glassType,
          sashType: item.dragData.sashType,
          gridPattern: item.dragData.gridPattern,
          georgianBar: item.dragData.georgianBar,
          hasMesh: item.dragData.hasMesh,
        });
      } else if (item.dragData.sashType) {
        onSelectSashType(item.dragData.sashType);
      }
    }

    // Auto-close palette drawer upon selecting an item so the canvas is visible
    if (onClose) {
      onClose();
    }
  };

  const getCategoryTitle = () => {
    switch (activeTab) {
      case 'casement':
        return { en: 'Casement Options', hi: 'केसमेंट खिड़की/दरवाजा' };
      case 'sliding':
        return { en: 'Sliding Options', hi: 'स्लाइडिंग विंडो सैश' };
      case 'fan_ac':
        return { en: 'Tool (Fan & AC)', hi: 'टूल: पंखा व एसी (ड्रैग करके लगाएं)' };
      case 'panels':
        return { en: 'Panels & Mesh', hi: 'ग्लास, जाली व सॉलिड पैनल' };
      case 'coupling':
        return { en: 'Coupling Options', hi: '2mm कप्लिंग जोड़' };
      case 'mullions':
        return { en: 'Mullions & Transoms', hi: 'खड़ा मुलियन व आड़ा ट्रांसोम' };
      default:
        return { en: 'Casement Options', hi: 'केसमेंट खिड़की/दरवाजा' };
    }
  };

  const catTitle = getCategoryTitle();

  return (
    <div
      id="cad-elements-palette"
      className="w-84 bg-white border-r border-slate-200 shadow-xl flex flex-col h-full z-30 animate-in slide-in-from-left duration-200"
    >
      {/* ------------------------------------------------------------- */}
      {/* HEADER WITH CATEGORY TITLE AND CLOSE BUTTON                   */}
      {/* ------------------------------------------------------------- */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            {catTitle.en}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {filteredItems.length} Options
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">{catTitle.hi}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-xs p-1.5 rounded-lg hover:bg-slate-100 transition"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6 CATEGORY TABS (Casement / Sliding / Fan/AC / Panels / Coupling / Mullion) */}
      {/* ------------------------------------------------------------- */}
      <div className="p-2 border-b border-slate-100 bg-slate-50/80 shrink-0">
        <div className="grid grid-cols-6 bg-slate-200/80 p-0.5 rounded-xl gap-0.5 text-center">
          <button
            onClick={() => handleTabClick('casement')}
            className={`py-1.5 text-[9px] font-bold rounded-lg transition text-center truncate ${
              activeTab === 'casement'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Casement Options (केसमेंट)"
          >
            Case
          </button>
          <button
            onClick={() => handleTabClick('sliding')}
            className={`py-1.5 text-[9px] font-bold rounded-lg transition text-center truncate ${
              activeTab === 'sliding'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Sliding Options (स्लाइडिंग)"
          >
            Slide
          </button>
          <button
            onClick={() => handleTabClick('fan_ac')}
            className={`py-1.5 text-[9px] font-extrabold rounded-lg transition text-center truncate ${
              activeTab === 'fan_ac'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-cyan-700 bg-cyan-50/60 hover:bg-cyan-100'
            }`}
            title="Tool (Fan & AC) / टूल: पंखा व एसी (Drag to any section)"
          >
            Tool
          </button>
          <button
            onClick={() => handleTabClick('panels')}
            className={`py-1.5 text-[9px] font-bold rounded-lg transition text-center truncate ${
              activeTab === 'panels'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Panels & Mesh (पैनल व मेश)"
          >
            Panels
          </button>
          <button
            onClick={() => handleTabClick('coupling')}
            className={`py-1.5 text-[9px] font-bold rounded-lg transition text-center truncate ${
              activeTab === 'coupling'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Coupling Options (2mm कप्लिंग जोड़)"
          >
            Couple
          </button>
          <button
            onClick={() => handleTabClick('mullions')}
            className={`py-1.5 text-[9px] font-bold rounded-lg transition text-center truncate ${
              activeTab === 'mullions'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Mullions & Transoms (मुलियन)"
          >
            Mullion
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2-COLUMN GRID OF DRAGGABLE / CLICKABLE CARDS                  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* Quick hint for Tool (Fan / AC) */}
        {activeTab === 'fan_ac' && (
          <div className="w-full mb-1 py-2.5 px-3 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl text-xs text-cyan-950 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 font-black text-cyan-900 text-[11px] uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />
              <span>TOOL (FAN & AC) — ड्रैग करके जिस हिस्से में लगाना हो डालें:</span>
            </div>
            <div className="text-[10px] text-cyan-800 leading-tight space-y-0.5 pl-3.5">
              <p>• <b>Exhaust Fan:</b> पूरे हिस्से में ग्लास रहेगा, सिर्फ सर्कल में ग्लास हटकर रियल फैन लगेगा।</p>
              <p>• <b>Window AC:</b> उस पूरे हिस्से में 100% फिट हो जाएगा।</p>
            </div>
          </div>
        )}

        {/* Quick link for Sliding Gallery */}
        {activeTab === 'sliding' && onOpenSlidingGallery && (
          <button
            onClick={onOpenSlidingGallery}
            className="w-full mb-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-200" />
              <span>18 Sliding Models Catalog</span>
            </div>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono group-hover:bg-white/30 transition">
              W1..W18 →
            </span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const isSelected = selectedSashType === item.dragData.sashType;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                onClick={() => handleClickItem(item)}
                className={`group relative bg-white border rounded-2xl p-3 flex flex-col items-center justify-between text-center cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-150 ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                    : 'border-slate-200 hover:border-blue-400 shadow-xs'
                }`}
                title={`${item.label} (${item.labelHindi})\n👉 Drag onto CAD canvas or click to apply`}
              >
                {/* Badge if any */}
                {item.badge && (
                  <span className="absolute top-2 left-2 text-[9px] font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                )}

                {/* SVG Icon Graphic */}
                <div className="py-2 transition group-hover:scale-105">
                  {item.renderIcon()}
                </div>

                {/* Text Label */}
                <div className="w-full mt-1">
                  <div className="text-[11px] font-black text-slate-800 tracking-wider">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    {item.labelHindi}
                  </div>
                </div>

                {/* Quick Action Button */}
                <div className="w-full mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-blue-600 group-hover:text-white group-hover:bg-blue-600 px-2 py-0.5 rounded-md transition border border-blue-200 group-hover:border-blue-600">
                    Apply (लागू करें)
                  </span>
                </div>

                {/* Drag Hint on hover */}
                <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-[0.5px] rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                  <span className="bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-md">
                    Drag to Canvas
                  </span>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasSelectedPocket && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center text-xs text-blue-900 font-medium">
            💡 किसी भी कार्ड पर टैप करके चयनित खाने (Pocket) में तुरंत लागू करें।
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER INSTRUCTION (Drag & Drop Hint)                          */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center gap-2 text-slate-500 text-xs font-semibold shrink-0">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="text-slate-700">
          <b>Drag to window:</b> खींचकर सीधे CAD कैनवास में डालें
        </span>
      </div>
    </div>
  );
};
