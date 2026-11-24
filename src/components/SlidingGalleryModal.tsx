import React, { useState } from 'react';
import { UPVCFrame, UPVCProject, SashType, Mullion } from '../types/upvc';
import { recalculateFramePockets, DEFAULT_PRICING_CONFIG } from '../utils/upvcCalculations';
import { X, Sliders, Check, ArrowRight, Sparkles, Layers, Search, ShieldCheck } from 'lucide-react';

export interface SlidingDesignDef {
  id: string;
  number: number;
  catalogKey: string;
  name: string;
  nameHindi: string;
  badge: string;
  trackType: '2-Track' | '3-Track' | '4-Track' | 'Multi-Track' | 'Combo';
  panelCount: number;
  defaultWidth: number;
  defaultHeight: number;
  series: 'sliding_62' | 'sliding_88' | 'sliding_3track' | 'door_premium';
  panelOperations: SashType[];
  sashLabels?: string[];
  isMeshCombo?: boolean;
  hasSubMullions?: boolean;
  hasCenterLock?: boolean;
  customSetup?: (frame: UPVCFrame) => void;
  description: string;
  descriptionHindi: string;
  renderDiagram: () => React.ReactNode;
}

/**
 * MASTER SELECTED SLIDING DESIGNS (#1, #5, #8, #9)
 * Clean, industrial-grade sliding window designs including 2-Track and 3-Track with Fly Mesh
 */
export const MASTER_15_SLIDING_DESIGNS: SlidingDesignDef[] = [
  // -------------------------------------------------------------------------
  // 1. Model #1: 2-Track 2-Panel Slider [ S1 (→) | S2 (←) ]
  // -------------------------------------------------------------------------
  {
    id: 'slide_2_both',
    number: 1,
    catalogKey: 'slide_2_both',
    name: '2-Track Slider [ → | ← ]',
    nameHindi: '1. 2-ट्रैक 2-पैनल दोनों तरफ स्लाइड [ S1 → | S2 ← ]',
    badge: '2-Track • 2 Glass',
    trackType: '2-Track',
    panelCount: 2,
    defaultWidth: 1500,
    defaultHeight: 1200,
    series: 'sliding_62',
    panelOperations: ['slider_arrow_right', 'slider_arrow_left'],
    sashLabels: ['S1', 'S2'],
    description: '2 Tracks with 2 Glass Sashes. Left panel S1 slides right (→), Right panel S2 slides left (←). 4-sided mitered sashes with center interlock meeting stile and GHH=576mm touch-lock handles.',
    descriptionHindi: '2-ट्रैक 2-पल्ला: बायाँ पल्ला दाएँ स्लाइड (→), दायाँ पल्ला बाएँ स्लाइड (←)। दोनों 4-साइड सैश फ्रेम और सेंटर इंटरलॉक ओवरलैप।',
    renderDiagram: () => (
      <svg viewBox="0 0 160 100" className="w-full h-24">
        {/* Frame Outer */}
        <rect x="8" y="10" width="144" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" rx="2" />
        
        {/* Left Panel S1 (Back Track - Recessed) */}
        <g id="gallery-s1-back">
          <rect x="12" y="14" width="72" height="72" fill="#e6edf5" stroke="#0f172a" strokeWidth="1.6" rx="1" />
          <line x1="12" y1="14" x2="18" y2="20" stroke="#334155" strokeWidth="1" />
          <line x1="84" y1="14" x2="78" y2="20" stroke="#334155" strokeWidth="1" />
          <line x1="12" y1="86" x2="18" y2="80" stroke="#334155" strokeWidth="1" />
          <line x1="84" y1="86" x2="78" y2="80" stroke="#334155" strokeWidth="1" />
          <rect x="18" y="20" width="60" height="60" fill="#b9dff2" stroke="#1e293b" strokeWidth="1.2" />

          {/* S1 Badge & Details */}
          <rect x="34" y="22" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
          <text x="45" y="30.5" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">S1</text>
          <circle cx="45" cy="50" r="7.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
          <text x="45" y="53" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">1</text>
          {/* Touch Lock Left */}
          <rect x="14" y="43" width="3.5" height="14" rx="1" fill="#0f172a" />
          <rect x="19" y="45" width="23" height="9" rx="1" fill="#ffffff" stroke="#0f172a" strokeWidth="0.8" />
          <text x="30.5" y="52" fill="#0f172a" fontSize="5" fontWeight="800" textAnchor="middle">GHH=576</text>
          {/* Arrow Right */}
          <line x1="30" y1="70" x2="58" y2="70" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
          <polygon points="54,67 62,70 54,73" fill="#0f172a" />
        </g>

        {/* S2 Drop Shadow onto S1 */}
        <rect x="73" y="14" width="7" height="72" fill="#0f172a" fillOpacity="0.35" />

        {/* Right Panel S2 (Front Track - Elevated, Overlapping in front of S1) */}
        <g id="gallery-s2-front">
          <rect x="76" y="14" width="72" height="72" fill="#ffffff" stroke="#0f172a" strokeWidth="2.2" rx="1" />
          {/* S2 2.5D elevated highlight on left edge */}
          <line x1="76" y1="14" x2="76" y2="86" stroke="#38bdf8" strokeWidth="1.8" />
          <line x1="76" y1="14" x2="82" y2="20" stroke="#334155" strokeWidth="1" />
          <line x1="148" y1="14" x2="142" y2="20" stroke="#334155" strokeWidth="1" />
          <line x1="76" y1="86" x2="82" y2="80" stroke="#334155" strokeWidth="1" />
          <line x1="148" y1="86" x2="142" y2="80" stroke="#334155" strokeWidth="1" />
          <rect x="82" y="20" width="60" height="60" fill="#eaf7ff" stroke="#0f172a" strokeWidth="1.2" />

          {/* S2 Badge & Details */}
          <rect x="104" y="22" width="22" height="11" rx="2" fill="#ffffff" stroke="#0284c7" strokeWidth="1.4" />
          <text x="115" y="30.5" fill="#0284c7" fontSize="7.5" fontWeight="900" textAnchor="middle">S2</text>
          <circle cx="115" cy="50" r="7.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
          <text x="115" y="53" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">2</text>
          {/* Touch Lock Right */}
          <rect x="142.5" y="43" width="3.5" height="14" rx="1" fill="#0f172a" />
          <rect x="117" y="45" width="23" height="9" rx="1" fill="#ffffff" stroke="#0f172a" strokeWidth="0.8" />
          <text x="128.5" y="52" fill="#0f172a" fontSize="5" fontWeight="800" textAnchor="middle">GHH=576</text>
          {/* Arrow Left */}
          <line x1="128" y1="70" x2="100" y2="70" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
          <polygon points="104,67 96,70 104,73" fill="#0f172a" />
        </g>

        {/* Frame F1 Tag */}
        <rect x="138" y="76" width="11" height="9" fill="#ffffff" stroke="#0f172a" strokeWidth="1" rx="1" />
        <text x="143.5" y="83" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">F1</text>
      </svg>
    ),
  },

  // -------------------------------------------------------------------------
  // 5. Model #5: 3-Track 2-Panel [ 2 Glass Panels + 1 Fly Mesh on S2 ]
  // -------------------------------------------------------------------------
  {
    id: 'slide_3track_2glass_1mesh',
    number: 5,
    catalogKey: 'slide_3track_mesh',
    name: '3-Track 2-Panel [ Same 2-Track + Fly Mesh on S2 ]',
    nameHindi: '5. 3-ट्रैक (2-पैनल सेम 2-ट्रैक + S2 के ऊपर 1 मच्छर जाली MS1)',
    badge: '3-Track • 2 Glass + Mesh on S2',
    trackType: '3-Track',
    panelCount: 2,
    defaultWidth: 2100,
    defaultHeight: 1500,
    series: 'sliding_88',
    panelOperations: ['slider_arrow_right', 'slider_arrow_left'],
    sashLabels: ['S1 (Glass)', 'S2 (Glass) + MS1 (Mesh)'],
    isMeshCombo: true,
    description: '3-Track Heavy Outer Frame with 2 Sliding Glass Panels (same as 2-track: S1 & S2) + 1 Full SS304 Mosquito Fly Mesh Sash (MS1) sitting directly over S2 on Track 3. S1 (→) & S2 (←) with GHH=710 touch locks.',
    descriptionHindi: '3-ट्रैक आउटर फ्रेम जिसमें 2 ग्लास पल्ले (सेम 2-ट्रैक की तरह S1 और S2) हैं, और S2 के ऊपर ट्रैक 3 पर 1 एसएस304 मच्छर जाली पल्ला (MS1) बैठा हुआ है। दोनों में GHH=710 टच-लॉक हैं।',
    customSetup: (frame: UPVCFrame) => {
      frame.series = 'sliding_88';
      frame.frameProfileWidth = 88;
      frame.mullionProfileWidth = 4;
      frame.mullions = [
        {
          id: `mul-sl-m5-center-${Date.now()}`,
          orientation: 'vertical',
          position: Math.round(frame.width / 2),
          width: 4,
        },
      ];
      frame.pockets = recalculateFramePockets(frame);
      if (frame.pockets[0]) {
        frame.pockets[0].sashType = 'slider_arrow_right';
        frame.pockets[0].customLabel = 'S1';
        frame.pockets[0].hasMesh = false;
      }
      if (frame.pockets[1]) {
        frame.pockets[1].sashType = 'slider_arrow_left';
        frame.pockets[1].customLabel = 'S2';
        frame.pockets[1].hasMesh = true; // S2 ke upar fly mesh panel!
      }
    },
    renderDiagram: () => (
      <svg viewBox="0 0 160 100" className="w-full h-24">
        {/* Frame Outer (3-Track Heavy 88mm Outer Extrusion) */}
        <rect x="6" y="8" width="148" height="84" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" rx="2" />
        <rect x="9" y="11" width="142" height="78" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />

        {/* Panel 1: S1 Left Glass Sash (Track 1 - Recessed Back Glass) */}
        <g id="gallery-m5-s1">
          <rect x="11" y="13" width="72" height="74" fill="#e6edf5" stroke="#0f172a" strokeWidth="1.8" rx="1" />
          <rect x="16" y="18" width="62" height="64" fill="#b9dff2" stroke="#1e293b" strokeWidth="1" />
          {/* S1 Badge */}
          <rect x="20" y="22" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
          <text x="31" y="30.5" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">S1</text>
          {/* Circled 1 */}
          <circle cx="47" cy="46" r="8" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
          <text x="47" y="49" fill="#0f172a" fontSize="8" fontWeight="900" textAnchor="middle">1</text>
          {/* Touch Lock Left Frame Jamb */}
          <rect x="13" y="42" width="3" height="14" rx="1" fill="#0f172a" />
          {/* Arrow Right */}
          <line x1="33" y1="68" x2="61" y2="68" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <polygon points="58,65 65,68 58,71" fill="#0f172a" />
        </g>

        {/* Panel 2: S2 Right Glass Sash with FLY MESH PANEL OVERLAID (Track 2 & Track 3) */}
        <g id="gallery-m5-s2">
          {/* S2 Glass Frame Underneath */}
          <rect x="77" y="13" width="72" height="74" fill="#ffffff" stroke="#0f172a" strokeWidth="2.2" rx="1" />
          <rect x="82" y="18" width="62" height="64" fill="#d0ebff" stroke="#0f172a" strokeWidth="1" />

          {/* S2 Circled 2 */}
          <circle cx="113" cy="38" r="8" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
          <text x="113" y="41" fill="#0f172a" fontSize="8" fontWeight="900" textAnchor="middle">2</text>

          {/* OVERLAID SS304 FLY MESH SASH (Track 3 on S2) */}
          <rect x="82" y="18" width="62" height="64" fill="#10b981" fillOpacity="0.12" />
          {[89, 97, 105, 113, 121, 129, 137].map((x) => (
            <line key={`mesh-v-${x}`} x1={x} y1="18" x2={x} y2="82" stroke="#047857" strokeWidth="0.7" strokeOpacity="0.65" strokeDasharray="1.5 1.5" />
          ))}
          {[26, 36, 46, 56, 66, 76].map((y) => (
            <line key={`mesh-h-${y}`} x1="82" y1={y} x2="144" y2={y} stroke="#047857" strokeWidth="0.7" strokeOpacity="0.65" strokeDasharray="1.5 1.5" />
          ))}

          {/* S2 Badge + MS1 Fly Mesh Badge */}
          <rect x="84" y="22" width="18" height="10" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.1" />
          <text x="93" y="29.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">S2</text>

          <rect x="104" y="21" width="38" height="11" rx="2" fill="#ecfdf5" stroke="#059669" strokeWidth="1.2" />
          <text x="123" y="29.5" fill="#065f46" fontSize="6.5" fontWeight="900" textAnchor="middle">MS1 (MESH)</text>

          {/* Touch Lock Right Frame Jamb (S2) */}
          <rect x="144" y="42" width="3" height="14" rx="1" fill="#0f172a" />

          {/* Arrow Left (Glass & Mesh) */}
          <line x1="127" y1="68" x2="99" y2="68" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <polygon points="102,65 95,68 102,71" fill="#0f172a" />
          <line x1="123" y1="74" x2="103" y2="74" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" />
          <polygon points="105,71.5 99,74 105,76.5" fill="#059669" />
        </g>

        {/* 3-Track Footnote */}
        <text x="80" y="97" fill="#475569" fontSize="6" fontWeight="900" textAnchor="middle">
          3-TRACK: S1 (Track 1) | S2 (Track 2) | MS1 FLY MESH (Track 3 on S2)
        </text>
      </svg>
    ),
  },

  // -------------------------------------------------------------------------
  // 8. Model #8: 3-Track 3-Panel All-Glass Slider [ S1 (↔) | S2 (↔) | S3 (↔) ]
  // -------------------------------------------------------------------------
  {
    id: 'slide_3_all',
    number: 8,
    catalogKey: 'slide_3_all',
    name: '3-Track All Slide [ 3x ↔ तीनों पल्ले स्लाइड ]',
    nameHindi: '8. 3-ट्रैक तीनों पल्ले स्लाइड [ S1 ↔ | S2 ↔ | S3 ↔ ]',
    badge: '3-Track • 3 Glass',
    trackType: '3-Track',
    panelCount: 3,
    defaultWidth: 2400,
    defaultHeight: 1500,
    series: 'sliding_88',
    panelOperations: ['slider_arrow_both', 'slider_arrow_both', 'slider_arrow_both'],
    sashLabels: ['S1', 'S2', 'S3'],
    description: '3 Tracks, 3 Independent Glass Sashes S1, S2, S3. All 3 panels slide freely across the complete window span for maximum 66% openable ventilation.',
    descriptionHindi: '3 ट्रैक, 3 ग्लास पल्ले: तीनों पल्ले स्वतंत्र रूप से दोनों तरफ स्लाइड होते हैं, जिससे 66% खुली वेंटिलेशन मिलती है।',
    renderDiagram: () => (
      <svg viewBox="0 0 160 100" className="w-full h-24">
        <rect x="6" y="10" width="148" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" rx="2" />
        
        {/* S1 */}
        <rect x="10" y="14" width="46" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.5" rx="1" />
        <rect x="15" y="19" width="36" height="62" fill="#c3ebfa" stroke="#1e293b" strokeWidth="1" />
        <rect x="22" y="22" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="33" y="30.5" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">S1</text>
        <circle cx="33" cy="50" r="7" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="33" y="53" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">1</text>
        <line x1="20" y1="69" x2="46" y2="69" stroke="#0f172a" strokeWidth="1.6" />
        <polygon points="22,66 16,69 22,72" fill="#0f172a" />
        <polygon points="44,66 50,69 44,72" fill="#0f172a" />

        {/* S2 */}
        <rect x="58" y="14" width="46" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.5" rx="1" />
        <rect x="63" y="19" width="36" height="62" fill="#c3ebfa" stroke="#1e293b" strokeWidth="1" />
        <rect x="70" y="22" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="81" y="30.5" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">S2</text>
        <circle cx="81" cy="50" r="7" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="81" y="53" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">2</text>
        <line x1="68" y1="69" x2="94" y2="69" stroke="#0f172a" strokeWidth="1.6" />
        <polygon points="70,66 64,69 70,72" fill="#0f172a" />
        <polygon points="92,66 98,69 92,72" fill="#0f172a" />

        {/* S3 */}
        <rect x="106" y="14" width="46" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.5" rx="1" />
        <rect x="111" y="19" width="36" height="62" fill="#c3ebfa" stroke="#1e293b" strokeWidth="1" />
        <rect x="118" y="22" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="129" y="30.5" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">S3</text>
        <circle cx="129" cy="50" r="7" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="129" y="53" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">3</text>
        <line x1="116" y1="69" x2="142" y2="69" stroke="#0f172a" strokeWidth="1.6" />
        <polygon points="118,66 112,69 118,72" fill="#0f172a" />
        <polygon points="140,66 146,69 140,72" fill="#0f172a" />
      </svg>
    ),
  },

  // -------------------------------------------------------------------------
  // 9. Model #9: 2-Track 4-Panel Center Meeting Slider [ S1 (→) | S2 (←) | S3 (→) | S4 (←) ]
  // -------------------------------------------------------------------------
  {
    id: 'slide_4_center',
    number: 9,
    catalogKey: 'slide_4_center',
    name: '2-Track 4-Panel [ 2 TRACK 4 PANEL ]',
    nameHindi: '9. 2-ट्रैक 4-पैनल सेंटर मीटिंग [ S1 → | S2 ← | S3 → | S4 ← ]',
    badge: '2-Track • 4 Panels (Center Split)',
    trackType: '2-Track',
    panelCount: 4,
    defaultWidth: 3200,
    defaultHeight: 2100,
    series: 'sliding_62',
    panelOperations: ['slider_arrow_right', 'slider_arrow_left', 'slider_arrow_right', 'slider_arrow_left'],
    sashLabels: ['S1', 'S2', 'S3', 'S4'],
    description: '4 Sashes on 2 Tracks. 2 Center sashes slide outward towards left and right to provide an unobstructed wide center passage with GHH=710 locks.',
    descriptionHindi: '2-ट्रैक 4-पल्ले: दोनों बीच वाले पल्ले बाहर की तरफ खुलते हैं जिससे बड़ा सेंटर रास्ता (French Door) मिलता है। GHH=710 लॉक के साथ।',
    renderDiagram: () => (
      <svg viewBox="0 0 160 100" className="w-full h-24">
        <rect x="4" y="10" width="152" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" rx="2" />
        {/* Center Meeting Double Line */}
        <line x1="80" y1="10" x2="80" y2="90" stroke="#0f172a" strokeWidth="2" />

        {/* S1 */}
        <rect x="7" y="14" width="34" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.4" rx="1" />
        <rect x="11" y="19" width="26" height="62" fill="#c3ebfa" stroke="#1e293b" strokeWidth="1" />
        <rect x="14" y="22" width="20" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="24" y="30.5" fill="#0f172a" fontSize="7" fontWeight="900" textAnchor="middle">S1</text>
        <circle cx="24" cy="50" r="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="24" y="53" fill="#0f172a" fontSize="7" fontWeight="900" textAnchor="middle">1</text>
        <line x1="14" y1="69" x2="34" y2="69" stroke="#0f172a" strokeWidth="1.5" />
        <polygon points="31,66 37,69 31,72" fill="#0f172a" />

        {/* S2 */}
        <rect x="43" y="14" width="34" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.4" rx="1" />
        <rect x="47" y="19" width="26" height="62" fill="#c3ebfa" stroke="#1e293b" strokeWidth="1" />
        <rect x="50" y="22" width="20" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="60" y="30.5" fill="#0f172a" fontSize="7" fontWeight="900" textAnchor="middle">S2</text>
        <circle cx="60" cy="50" r="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="60" y="53" fill="#0f172a" fontSize="7" fontWeight="900" textAnchor="middle">2</text>
        <line x1="70" y1="69" x2="50" y2="69" stroke="#0f172a" strokeWidth="1.5" />
        <polygon points="53,66 47,69 53,72" fill="#0f172a" />

        {/* S3 */}
        <rect x="83" y="14" width="34" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.4" rx="1" />
        <rect x="87" y="19" width="26" height="62" fill="#c3ebfa" stroke="#1e293b" strokeWidth="1" />
        <rect x="90" y="22" width="20" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="100" y="30.5" fill="#0f172a" fontSize="7" fontWeight="900" textAnchor="middle">S3</text>
        <circle cx="100" cy="50" r="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="100" y="53" fill="#0f172a" fontSize="7" fontWeight="900" textAnchor="middle">3</text>
        <line x1="90" y1="69" x2="110" y2="69" stroke="#0f172a" strokeWidth="1.5" />
        <polygon points="107,66 113,69 107,72" fill="#0f172a" />

        {/* S4 */}
        <rect x="119" y="14" width="34" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.4" rx="1" />
        <rect x="123" y="19" width="26" height="62" fill="#c3ebfa" stroke="#1e293b" strokeWidth="1" />
        <rect x="126" y="22" width="20" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="136" y="30.5" fill="#0f172a" fontSize="7" fontWeight="900" textAnchor="middle">S4</text>
        <circle cx="136" cy="50" r="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="136" y="53" fill="#0f172a" fontSize="7" fontWeight="900" textAnchor="middle">4</text>
        <line x1="146" y1="69" x2="126" y2="69" stroke="#0f172a" strokeWidth="1.5" />
        <polygon points="129,66 123,69 129,72" fill="#0f172a" />
        <text x="146" y="85" fontSize="6" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },

  // -------------------------------------------------------------------------
  // 10. 2-Track (2 Slide Panel Center 1 Fix Panel)
  // -------------------------------------------------------------------------
  {
    id: 'slide_2track_3panel_fix_center',
    number: 10,
    catalogKey: 'slide_2track_3panel_fix_center',
    name: '2-Track (2 Slide Panel Center 1 Fix Panel)',
    nameHindi: '2-ट्रैक 3-पैनल (2 स्लाइड पैनल + सेंटर 1 फिक्स पैनल)',
    badge: '2-Track • 2 Slide + 1 Fix',
    trackType: '2-Track',
    panelCount: 3,
    defaultWidth: 2100,
    defaultHeight: 1200,
    series: 'sliding_62',
    panelOperations: ['slider_arrow_right', 'slider_fixed_center', 'slider_arrow_left'],
    sashLabels: ['S1', 'S2', 'S3'],
    description: '2-Track 3-Panel: S1 slides right (→) and S3 slides left (←) over the center stationary fixed panel S2 (//) with GHH=710 touch-lock handles.',
    descriptionHindi: '2-ट्रैक 3-पैनल: S1 दाएँ (→) और S3 बाएँ (←) स्लाइड होते हैं, जबकि बीच का पल्ला S2 फिक्स ग्लास (//) रहता है। GHH=710 टच-लॉक के साथ।',
    renderDiagram: () => (
      <svg viewBox="0 0 160 100" className="w-full h-24">
        <rect x="4" y="10" width="152" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" rx="2" />
        {/* S1 */}
        <rect x="8" y="14" width="46" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.5" rx="1" />
        <rect x="13" y="19" width="36" height="62" fill="#c3ebfa" stroke="#1e293b" strokeWidth="1" />
        <rect x="20" y="22" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="31" y="30.5" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">S1</text>
        <circle cx="31" cy="46" r="6.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="31" y="49" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">1</text>
        <line x1="20" y1="66" x2="42" y2="66" stroke="#0f172a" strokeWidth="1.8" />
        <polygon points="40,63 46,66 40,69" fill="#0f172a" />
        <rect x="9.5" y="40" width="2.5" height="12" fill="#0f172a" rx="0.5" />
        <rect x="14" y="42" width="18" height="8" rx="1" fill="#ffffff" stroke="#0f172a" strokeWidth="0.8" />
        <text x="23" y="48" fill="#0f172a" fontSize="4.5" fontWeight="900" textAnchor="middle">GHH=710</text>

        {/* S2 (Center Fixed Glass) */}
        <rect x="57" y="14" width="46" height="72" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" rx="1" />
        <rect x="62" y="19" width="36" height="62" fill="#f1f5f9" stroke="#1e293b" strokeWidth="1" />
        <rect x="69" y="22" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="80" y="30.5" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">S2</text>
        <circle cx="80" cy="46" r="6.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="80" y="49" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">2</text>
        <line x1="75" y1="58" x2="80" y2="70" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="80" y1="58" x2="85" y2="70" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />

        {/* S3 */}
        <rect x="106" y="14" width="46" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.5" rx="1" />
        <rect x="111" y="19" width="36" height="62" fill="#c3ebfa" stroke="#1e293b" strokeWidth="1" />
        <rect x="118" y="22" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="129" y="30.5" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">S3</text>
        <circle cx="129" cy="46" r="6.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
        <text x="129" y="49" fill="#0f172a" fontSize="7.5" fontWeight="900" textAnchor="middle">3</text>
        <line x1="140" y1="66" x2="118" y2="66" stroke="#0f172a" strokeWidth="1.8" />
        <polygon points="120,63 114,66 120,69" fill="#0f172a" />
        <rect x="148" y="40" width="2.5" height="12" fill="#0f172a" rx="0.5" />
        <rect x="128" y="42" width="18" height="8" rx="1" fill="#ffffff" stroke="#0f172a" strokeWidth="0.8" />
        <text x="137" y="48" fill="#0f172a" fontSize="4.5" fontWeight="900" textAnchor="middle">GHH=710</text>
        <text x="146" y="85" fontSize="6" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },

  // -------------------------------------------------------------------------
  // 11. 3-Track 5-Panel Slider
  // -------------------------------------------------------------------------
  {
    id: 'slide_3track_5panel',
    number: 11,
    catalogKey: 'slide_3track_5panel',
    name: '3-Track 5-Panel Slider',
    nameHindi: '3-ट्रैक 5-पैनल स्लाइडर [ 5 ग्लास सैश ]',
    badge: '3-Track • 5 Panels',
    trackType: '3-Track',
    panelCount: 5,
    defaultWidth: 3500,
    defaultHeight: 1500,
    series: 'sliding_88',
    panelOperations: ['slider_arrow_right', 'slider_arrow_both', 'slider_arrow_left', 'slider_arrow_right', 'slider_arrow_left'],
    sashLabels: ['S1', 'S2', 'S3', 'S4', 'S5'],
    description: '3-Track 5-Panel: S1 (→), S2 (↔), S3 (←), S4 (→), S5 (←) with Center Meeting Stile Lock and GHH=710 touch-lock handles.',
    descriptionHindi: '3-ट्रैक 5-पैनल: 5 ग्लास पल्ले विस्तृत स्पैन के लिए, सेंटर मीटिंग लॉक और GHH=710 टच-लॉक हैंडल के साथ।',
    renderDiagram: () => (
      <svg viewBox="0 0 160 100" className="w-full h-24">
        <rect x="3" y="10" width="154" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" rx="2" />
        <line x1="93" y1="10" x2="93" y2="90" stroke="#0f172a" strokeWidth="2" />

        {/* S1 */}
        <rect x="6" y="14" width="27" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="19.5" cy="46" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="19.5" y="48.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">1</text>
        <line x1="12" y1="66" x2="27" y2="66" stroke="#0f172a" strokeWidth="1.4" />
        <polygon points="25,64 29,66 25,68" fill="#0f172a" />
        <text x="19.5" y="27" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">S1</text>

        {/* S2 */}
        <rect x="35" y="14" width="27" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="48.5" cy="46" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="48.5" y="48.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">2</text>
        <line x1="41" y1="66" x2="56" y2="66" stroke="#0f172a" strokeWidth="1.4" />
        <polygon points="43,64 39,66 43,68" fill="#0f172a" />
        <polygon points="54,64 58,66 54,68" fill="#0f172a" />
        <text x="48.5" y="27" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">S2</text>

        {/* S3 */}
        <rect x="64" y="14" width="27" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="77.5" cy="46" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="77.5" y="48.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">3</text>
        <line x1="85" y1="66" x2="70" y2="66" stroke="#0f172a" strokeWidth="1.4" />
        <polygon points="72,64 68,66 72,68" fill="#0f172a" />
        <text x="77.5" y="27" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">S3</text>

        {/* S4 */}
        <rect x="95" y="14" width="27" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="108.5" cy="46" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="108.5" y="48.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">4</text>
        <line x1="101" y1="66" x2="116" y2="66" stroke="#0f172a" strokeWidth="1.4" />
        <polygon points="114,64 118,66 114,68" fill="#0f172a" />
        <text x="108.5" y="27" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">S4</text>

        {/* S5 */}
        <rect x="124" y="14" width="27" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="137.5" cy="46" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="137.5" y="48.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">5</text>
        <line x1="145" y1="66" x2="130" y2="66" stroke="#0f172a" strokeWidth="1.4" />
        <polygon points="132,64 128,66 132,68" fill="#0f172a" />
        <text x="137.5" y="27" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">S5</text>
        <text x="148" y="85" fontSize="6" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },

  // -------------------------------------------------------------------------
  // 12. Model #12: 3-Track 6-Panel Slider (Center Split 3600 x 2100 mm)
  // -------------------------------------------------------------------------
  {
    id: 'slide_3track_6panel',
    number: 12,
    catalogKey: 'slide_3track_6panel',
    name: '3-Track 6-Panel Slider [ 3T 6S ]',
    nameHindi: '12. 3-ट्रैक 6-पैनल स्लाइडर [ 6 ग्लास सैश • सेंटर मीटिंग ]',
    badge: '3-Track • 6 Panels (Center Split)',
    trackType: '3-Track',
    panelCount: 6,
    defaultWidth: 3600,
    defaultHeight: 2100,
    series: 'sliding_88',
    panelOperations: [
      'slider_arrow_right',
      'slider_arrow_both',
      'slider_arrow_left',
      'slider_arrow_right',
      'slider_arrow_both',
      'slider_arrow_left',
    ],
    sashLabels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    description: '3 Tracks, 6 Sliding Panels: 3 panels on left (S1, S2, S3) and 3 panels on right (S4, S5, S6) with central meeting lock. Panels S2 and S5 have bi-directional slide arrows (↔). Opens from center to provide 66% massive unobstructed patio/balcony opening.',
    descriptionHindi: '3-ट्रैक 6-पल्ला: बाएँ 3 पल्ले (S1, S2, S3) और दाएँ 3 पल्ले (S4, S5, S6) बीच से दोनों तरफ खुलते हैं। दूसरे (S2) और 5वें (S5) पल्ले में दोनों तरफ का एरो (↔) रहता है। 66% खुला रास्ता (Patio Opening) मिलता है।',
    renderDiagram: () => (
      <svg viewBox="0 0 160 100" className="w-full h-24">
        <rect x="2" y="10" width="156" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" rx="2" />
        {/* Center Meeting Double Line */}
        <line x1="80" y1="10" x2="80" y2="90" stroke="#0f172a" strokeWidth="2.2" />

        {/* S1 (Track 1) */}
        <rect x="5" y="14" width="23" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="16.5" cy="46" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="16.5" y="48.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">1</text>
        <line x1="10" y1="66" x2="23" y2="66" stroke="#0f172a" strokeWidth="1.3" />
        <polygon points="21,64 25,66 21,68" fill="#0f172a" />
        <text x="16.5" y="27" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S1</text>
        <rect x="6.5" y="41" width="2" height="10" fill="#0f172a" rx="0.5" />

        {/* S2 (Track 2) - Both Directions <-> */}
        <rect x="30" y="14" width="23" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="41.5" cy="46" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="41.5" y="48.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">2</text>
        <line x1="34" y1="66" x2="49" y2="66" stroke="#0f172a" strokeWidth="1.3" />
        <polygon points="36,64 32,66 36,68" fill="#0f172a" />
        <polygon points="47,64 51,66 47,68" fill="#0f172a" />
        <text x="41.5" y="27" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S2</text>

        {/* S3 (Track 3) */}
        <rect x="55" y="14" width="23" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="66.5" cy="46" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="66.5" y="48.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">3</text>
        <line x1="73" y1="66" x2="60" y2="66" stroke="#0f172a" strokeWidth="1.3" />
        <polygon points="62,64 58,66 62,68" fill="#0f172a" />
        <text x="66.5" y="27" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S3</text>
        {/* Center Meeting Stile Lock S3 */}
        <rect x="76" y="41" width="2" height="10" fill="#0284c7" rx="0.5" />

        {/* Dedicated Central Meeting Stile Lock / बीच में भी लॉक */}
        <g transform="translate(80, 46)">
          <rect x="-4.5" y="-5" width="9" height="10" rx="1.8" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
          <path d="M-2.5,-5 V-7.5 A2.5,2.5 0 0,1 2.5,-7.5 V-5" fill="none" stroke="#78350f" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="1" fill="#78350f" />
        </g>

        {/* S4 (Track 3) */}
        <rect x="82" y="14" width="23" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="93.5" cy="46" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="93.5" y="48.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">4</text>
        <line x1="87" y1="66" x2="100" y2="66" stroke="#0f172a" strokeWidth="1.3" />
        <polygon points="98,64 102,66 98,68" fill="#0f172a" />
        <text x="93.5" y="27" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S4</text>
        {/* Center Meeting Stile Lock S4 */}
        <rect x="82.5" y="41" width="2" height="10" fill="#0284c7" rx="0.5" />

        {/* S5 (Track 2) - Both Directions <-> */}
        <rect x="107" y="14" width="23" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="118.5" cy="46" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="118.5" y="48.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">5</text>
        <line x1="111" y1="66" x2="126" y2="66" stroke="#0f172a" strokeWidth="1.3" />
        <polygon points="113,64 109,66 113,68" fill="#0f172a" />
        <polygon points="124,64 128,66 124,68" fill="#0f172a" />
        <text x="118.5" y="27" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S5</text>

        {/* S6 (Track 1) */}
        <rect x="132" y="14" width="23" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <circle cx="143.5" cy="46" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="143.5" y="48.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">6</text>
        <line x1="150" y1="66" x2="137" y2="66" stroke="#0f172a" strokeWidth="1.3" />
        <polygon points="139,64 135,66 139,68" fill="#0f172a" />
        <text x="143.5" y="27" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S6</text>
        <rect x="151.5" y="41" width="2" height="10" fill="#0f172a" rx="0.5" />

        <text x="149" y="85" fontSize="5.5" fontWeight="900" fill="#475569">F1</text>
      </svg>
    ),
  },

  // -------------------------------------------------------------------------
  // 13. Model #13: 4-Panel [ Side FIX + Center 2 SLIDE + Center LOCK ] (3200 x 2100 mm)
  // -------------------------------------------------------------------------
  {
    id: 'slide_2track_4panel_fix_slide_slide_fix',
    number: 13,
    catalogKey: 'slide_2track_4panel_fix_slide_slide_fix',
    name: '2-Track 4-Panel [ FIX | SLIDE → | ← SLIDE | FIX ]',
    nameHindi: '13. 4-पैनल [ साइड फिक्स + बीच में 2 स्लाइड + बीच में लॉक ]',
    badge: '2-Track • 2 Fix + 2 Slide (Center Lock)',
    trackType: '2-Track',
    panelCount: 4,
    defaultWidth: 3200,
    defaultHeight: 2100,
    series: 'sliding_62',
    hasCenterLock: true,
    panelOperations: [
      'slider_fixed_center',
      'slider_arrow_right',
      'slider_arrow_left',
      'slider_fixed_center',
    ],
    sashLabels: ['FIX', 'S1', 'S2', 'FIX'],
    description: '4-Panel 2-Track window/door: Outer side panels are Stationary Fixed [FIX], center two panels are Sliding [S1 → | ← S2], meeting in the center with a dedicated Center Meeting Crescent Lock (बीच का लॉक).',
    descriptionHindi: '4-पैनल 2-ट्रैक: दोनों साइड वाले पल्ले फिक्स (FIX) रहते हैं और बीच वाले 2 पल्ले (S1 → | ← S2) सेंटर की तरफ स्लाइड होते हैं। बीच में सेंटर लॉक (🔒 Crescent Lock) लगा होता है।',
    renderDiagram: () => (
      <svg viewBox="0 0 160 100" className="w-full h-24">
        <rect x="2" y="10" width="156" height="80" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" rx="2" />
        {/* Center Meeting Stile Double Line */}
        <line x1="80" y1="10" x2="80" y2="90" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 2" />

        {/* Panel 1: Left Stationary Fixed Glass (FIX) */}
        <rect x="5" y="14" width="35" height="72" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <rect x="8" y="18" width="29" height="64" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" />
        <rect x="10" y="21" width="25" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="22.5" y="29" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">FIX</text>
        <circle cx="22.5" cy="46" r="6" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
        <line x1="19.5" y1="46" x2="25.5" y2="46" stroke="#475569" strokeWidth="1.4" />
        <line x1="22.5" y1="43" x2="22.5" y2="49" stroke="#475569" strokeWidth="1.4" />
        <text x="22.5" y="66" fill="#64748b" fontSize="5.5" fontWeight="900" textAnchor="middle">फिक्स (//)</text>

        {/* Panel 2: S1 Slide Right (→) */}
        <rect x="42" y="14" width="36" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.4" rx="1" />
        <rect x="45" y="18" width="30" height="64" fill="#c3ebfa" stroke="#1e293b" strokeWidth="0.8" />
        <rect x="47" y="21" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="58" y="29" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">S1</text>
        <circle cx="58" cy="46" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.1" />
        <text x="58" y="48.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">1</text>
        {/* Slide Right Arrow */}
        <line x1="48" y1="65" x2="68" y2="65" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" />
        <polygon points="66,62 72,65 66,68" fill="#0284c7" />

        {/* Center Meeting Crescent Lock (🔒 बीच का लॉक) */}
        <g transform="translate(80, 46)">
          <rect x="-5" y="-6" width="10" height="12" rx="2" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
          <path d="M-3,-6 V-9 A3,3 0 0,1 3,-9 V-6" fill="none" stroke="#78350f" strokeWidth="1" />
          <circle cx="0" cy="0" r="1.2" fill="#78350f" />
        </g>
        <rect x="68" y="60" width="24" height="9" rx="1.5" fill="#ffffff" stroke="#0284c7" strokeWidth="0.8" />
        <text x="80" y="66.5" fill="#0284c7" fontSize="5" fontWeight="900" textAnchor="middle">🔒 लॉक</text>

        {/* Panel 3: S2 Slide Left (←) */}
        <rect x="82" y="14" width="36" height="72" fill="#d7effc" stroke="#0f172a" strokeWidth="1.4" rx="1" />
        <rect x="85" y="18" width="30" height="64" fill="#c3ebfa" stroke="#1e293b" strokeWidth="0.8" />
        <rect x="91" y="21" width="22" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="102" y="29" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">S2</text>
        <circle cx="102" cy="46" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.1" />
        <text x="102" y="48.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">2</text>
        {/* Slide Left Arrow */}
        <line x1="112" y1="65" x2="92" y2="65" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" />
        <polygon points="94,62 88,65 94,68" fill="#0284c7" />

        {/* Panel 4: Right Stationary Fixed Glass (FIX) */}
        <rect x="120" y="14" width="35" height="72" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" rx="1" />
        <rect x="123" y="18" width="29" height="64" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" />
        <rect x="125" y="21" width="25" height="11" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        <text x="137.5" y="29" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">FIX</text>
        <circle cx="137.5" cy="46" r="6" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
        <line x1="134.5" y1="46" x2="140.5" y2="46" stroke="#475569" strokeWidth="1.4" />
        <line x1="137.5" y1="43" x2="137.5" y2="49" stroke="#475569" strokeWidth="1.4" />
        <text x="137.5" y="66" fill="#64748b" fontSize="5.5" fontWeight="900" textAnchor="middle">फिक्स (//)</text>
      </svg>
    ),
  },

  // -------------------------------------------------------------------------
  // 14. 6 PANEL 3 TRACK [ S1 (→) | S2+MS1 (←) || S3+MS2 (→) | S4 (←) ]
  // -------------------------------------------------------------------------
  {
    id: 'slide_6panel_3track',
    number: 14,
    catalogKey: '6_panel_3_track',
    name: '6 PANEL 3 TRACK',
    nameHindi: '14. 6 पैनल 3 ट्रैक [ 4 ग्लास + 2 जाली MS1 & MS2 • सेंटर लॉक ]',
    badge: '6 Panel • 3 Track',
    trackType: '3-Track',
    panelCount: 6,
    defaultWidth: 3200,
    defaultHeight: 2100,
    series: 'sliding_88',
    isMeshCombo: true,
    hasCenterLock: true,
    panelOperations: [
      'slider_arrow_right',
      'slider_arrow_left',
      'slider_arrow_right',
      'slider_arrow_left',
    ],
    sashLabels: ['S1', 'S2', 'S3', 'S4'],
    description: '6 Panel 3 Track (4 Glass + 2 Center Fly Mesh): Outer bays S1 (→) & S4 (←) are sliding glass sashes; Center bays S2 (←) & S3 (→) include overlaid SS304 Fly Mesh panels MS1 (5 ←) and MS2 (6 →) on Track 3 with Center Meeting Lock.',
    descriptionHindi: '6 पैनल 3 ट्रैक (4 ग्लास + 2 मच्छर जाली): बाहरी पल्ले S1 (→) और S4 (←) ग्लास स्लाइडर हैं; बीच के दोनों पल्लों S2 (←) और S3 (→) के ऊपर ट्रैक 3 पर 2 जाली पल्ले MS1 (5 ←) और MS2 (6 →) और सेंटर लॉक लगे हैं।',
    customSetup: (frame: UPVCFrame) => {
      frame.series = 'sliding_88';
      frame.frameProfileWidth = 88;
      frame.mullionProfileWidth = 16;
      frame.hasCenterLock = true;
      frame.mullions = [
        {
          id: `mul-sl-6p3t-1-${Date.now()}`,
          orientation: 'vertical',
          position: Math.round(frame.width / 4),
          width: 16,
        },
        {
          id: `mul-sl-6p3t-2-${Date.now()}`,
          orientation: 'vertical',
          position: Math.round(frame.width / 2),
          width: 16,
        },
        {
          id: `mul-sl-6p3t-3-${Date.now()}`,
          orientation: 'vertical',
          position: Math.round((frame.width * 3) / 4),
          width: 16,
        },
      ];
      frame.pockets = recalculateFramePockets(frame);
      if (frame.pockets[0]) {
        frame.pockets[0].sashType = 'slider_arrow_right';
        frame.pockets[0].glassType = 'clear_6mm';
        frame.pockets[0].customLabel = 'S1';
        frame.pockets[0].hasMesh = false;
      }
      if (frame.pockets[1]) {
        frame.pockets[1].sashType = 'slider_arrow_left';
        frame.pockets[1].glassType = 'clear_6mm';
        frame.pockets[1].customLabel = 'S2';
        frame.pockets[1].hasMesh = true; // MS1 (FLY MESH) - Panel 5
      }
      if (frame.pockets[2]) {
        frame.pockets[2].sashType = 'slider_arrow_right';
        frame.pockets[2].glassType = 'clear_6mm';
        frame.pockets[2].customLabel = 'S3';
        frame.pockets[2].hasMesh = true; // MS2 (FLY MESH) - Panel 6
      }
      if (frame.pockets[3]) {
        frame.pockets[3].sashType = 'slider_arrow_left';
        frame.pockets[3].glassType = 'clear_6mm';
        frame.pockets[3].customLabel = 'S4';
        frame.pockets[3].hasMesh = false;
      }
    },
    renderDiagram: () => (
      <svg viewBox="0 0 160 100" className="w-full h-24">
        <defs>
          <pattern id="meshDiag6p3t" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 6 6 M 6 0 L 0 6" stroke="#334155" strokeWidth="0.65" strokeOpacity="0.65" />
          </pattern>
        </defs>
        {/* 3-Track Outer Frame */}
        <rect x="4" y="8" width="152" height="84" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" rx="2" />
        {/* Center Meeting Stile Dashed Line */}
        <line x1="80" y1="8" x2="80" y2="92" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 2" />

        {/* S1: Left Glass (->) */}
        <rect x="7" y="12" width="34" height="76" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" rx="1" />
        <rect x="11" y="17" width="26" height="66" fill="#b9dff2" stroke="#1e293b" strokeWidth="0.9" />
        <rect x="17" y="12.5" width="14" height="8" rx="1.2" fill="#ffffff" stroke="#0f172a" strokeWidth="0.9" />
        <text x="24" y="18.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S1</text>
        <circle cx="24" cy="45" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.1" />
        <text x="24" y="47.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">1</text>
        <line x1="14" y1="56" x2="34" y2="56" stroke="#0f172a" strokeWidth="1.6" />
        <polygon points="31,53.5 36,56 31,58.5" fill="#0f172a" />
        <rect x="8.5" y="44" width="2.2" height="12" rx="0.6" fill="#0f172a" />

        {/* S2 + MS1: Center-Left Glass + Fly Mesh (2 <- & 5 <-) */}
        <rect x="43" y="12" width="35" height="76" fill="#ffffff" stroke="#0f172a" strokeWidth="1.6" rx="1" />
        <rect x="47" y="17" width="27" height="66" fill="#b9dff2" stroke="#1e293b" strokeWidth="0.9" />
        <rect x="47" y="17" width="27" height="66" fill="url(#meshDiag6p3t)" />
        <rect x="53.5" y="12.5" width="14" height="8" rx="1.2" fill="#ffffff" stroke="#0f172a" strokeWidth="0.9" />
        <text x="60.5" y="18.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S2</text>
        <circle cx="60.5" cy="40" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.1" />
        <text x="60.5" y="42.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">2</text>
        <line x1="70" y1="49" x2="51" y2="49" stroke="#0f172a" strokeWidth="1.6" />
        <polygon points="54,46.5 49,49 54,51.5" fill="#0f172a" />
        <line x1="69" y1="56" x2="52" y2="56" stroke="#059669" strokeWidth="1.4" />
        <polygon points="55,54 50,56 55,58" fill="#059669" />
        <circle cx="60.5" cy="65" r="5" fill="#ffffff" stroke="#059669" strokeWidth="1.1" />
        <text x="60.5" y="67.5" fill="#059669" fontSize="6" fontWeight="900" textAnchor="middle">5</text>
        <rect x="48" y="81" width="25" height="7" rx="1.2" fill="#ecfdf5" stroke="#059669" strokeWidth="0.8" />
        <text x="60.5" y="86.2" fill="#065f46" fontSize="4.6" fontWeight="900" textAnchor="middle">MS1 MESH</text>

        {/* S3 + MS2: Center-Right Glass + Fly Mesh (3 -> & 6 ->) */}
        <rect x="82" y="12" width="35" height="76" fill="#ffffff" stroke="#0f172a" strokeWidth="1.6" rx="1" />
        <rect x="86" y="17" width="27" height="66" fill="#b9dff2" stroke="#1e293b" strokeWidth="0.9" />
        <rect x="86" y="17" width="27" height="66" fill="url(#meshDiag6p3t)" />
        <rect x="92.5" y="12.5" width="14" height="8" rx="1.2" fill="#ffffff" stroke="#0f172a" strokeWidth="0.9" />
        <text x="99.5" y="18.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S3</text>
        <circle cx="99.5" cy="40" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.1" />
        <text x="99.5" y="42.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">3</text>
        <line x1="90" y1="49" x2="109" y2="49" stroke="#0f172a" strokeWidth="1.6" />
        <polygon points="106,46.5 111,49 106,51.5" fill="#0f172a" />
        <line x1="91" y1="56" x2="108" y2="56" stroke="#059669" strokeWidth="1.4" />
        <polygon points="105,54 110,56 105,58" fill="#059669" />
        <circle cx="99.5" cy="65" r="5" fill="#ffffff" stroke="#059669" strokeWidth="1.1" />
        <text x="99.5" y="67.5" fill="#059669" fontSize="6" fontWeight="900" textAnchor="middle">6</text>
        <rect x="87" y="81" width="25" height="7" rx="1.2" fill="#ecfdf5" stroke="#059669" strokeWidth="0.8" />
        <text x="99.5" y="86.2" fill="#065f46" fontSize="4.6" fontWeight="900" textAnchor="middle">MS2 MESH</text>

        {/* Center Lock Icon */}
        <g transform="translate(80, 50)">
          <rect x="-4" y="-5" width="8" height="10" rx="1.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
          <circle cx="0" cy="0" r="1.4" fill="#0284c7" />
        </g>

        {/* S4: Right Glass (<-) */}
        <rect x="119" y="12" width="34" height="76" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" rx="1" />
        <rect x="123" y="17" width="26" height="66" fill="#b9dff2" stroke="#1e293b" strokeWidth="0.9" />
        <rect x="129" y="12.5" width="14" height="8" rx="1.2" fill="#ffffff" stroke="#0f172a" strokeWidth="0.9" />
        <text x="136" y="18.5" fill="#0f172a" fontSize="6" fontWeight="900" textAnchor="middle">S4</text>
        <circle cx="136" cy="45" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.1" />
        <text x="136" y="47.5" fill="#0f172a" fontSize="6.5" fontWeight="900" textAnchor="middle">4</text>
        <line x1="146" y1="56" x2="126" y2="56" stroke="#0f172a" strokeWidth="1.6" />
        <polygon points="129,53.5 124,56 129,58.5" fill="#0f172a" />
        <rect x="149.3" y="44" width="2.2" height="12" rx="0.6" fill="#0f172a" />
      </svg>
    ),
  },
];

interface SlidingGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDesign: (
    design: SlidingDesignDef,
    customW?: number,
    customH?: number,
    mode?: 'new_frame' | 'apply_to_selected'
  ) => void;
  selectedFrame?: UPVCFrame | null;
  lang: 'hi' | 'en';
}

export const SlidingGalleryModal: React.FC<SlidingGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectDesign,
  selectedFrame,
  lang,
}) => {
  const [selectedDesignId, setSelectedDesignId] = useState<string>(
    MASTER_15_SLIDING_DESIGNS[0].id
  );
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<
    'ALL' | '2-Track' | '3-Track' | 'Mesh'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeDesign =
    MASTER_15_SLIDING_DESIGNS.find((d) => d.id === selectedDesignId) ||
    MASTER_15_SLIDING_DESIGNS[0];

  const [customWidth, setCustomWidth] = useState<number>(
    selectedFrame ? selectedFrame.width : activeDesign.defaultWidth
  );
  const [customHeight, setCustomHeight] = useState<number>(
    selectedFrame ? selectedFrame.height : activeDesign.defaultHeight
  );

  if (!isOpen) return null;

  const filteredDesigns = MASTER_15_SLIDING_DESIGNS.filter((design) => {
    if (selectedTrackFilter === '2-Track' && design.trackType !== '2-Track') return false;
    if (selectedTrackFilter === '3-Track' && design.trackType !== '3-Track') return false;
    if (selectedTrackFilter === 'Mesh' && !design.isMeshCombo) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        design.name.toLowerCase().includes(q) ||
        design.nameHindi.toLowerCase().includes(q) ||
        design.catalogKey.toLowerCase().includes(q) ||
        design.description.toLowerCase().includes(q) ||
        design.badge.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleSelectCard = (design: SlidingDesignDef) => {
    setSelectedDesignId(design.id);
    if (!selectedFrame) {
      setCustomWidth(design.defaultWidth);
      setCustomHeight(design.defaultHeight);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl h-[88vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  UPVC Sliding & Mesh Master Catalog
                </h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  4 Core Models (#1, #5, #8, #9)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                2-Track, 3-Track, SS304 Fly Mesh जाली और 4-पैनल सेंटर मीटिंग खिड़की व दरवाजे
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Track Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(
              [
                { key: 'ALL', label: 'All Models (सभी)' },
                { key: '2-Track', label: '2-Track (#1, #9)' },
                { key: '3-Track', label: '3-Track (#5, #8)' },
                { key: 'Mesh', label: 'Fly Mesh जाली (#5)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTrackFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedTrackFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sliding / mesh design..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Main Body: 2 Columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Cards Grid */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredDesigns.map((design) => {
              const isSelected = selectedDesignId === design.id;
              return (
                <div
                  key={design.id}
                  onClick={() => handleSelectCard(design)}
                  className={`group relative bg-white rounded-2xl border p-4 flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                      : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  {/* Top Badge and Number */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                      Model #{design.number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        design.isMeshCombo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {design.badge}
                    </span>
                  </div>

                  {/* SVG Diagram Preview */}
                  <div className="py-2 px-1 flex items-center justify-center bg-slate-50/80 rounded-xl border border-slate-100 group-hover:bg-blue-50/30 transition">
                    {design.renderDiagram()}
                  </div>

                  {/* Title & Hindi Translation */}
                  <div className="mt-3">
                    <h3 className="text-xs font-black text-slate-900 tracking-tight line-clamp-1">
                      {design.name}
                    </h3>
                    <p className="text-[11px] text-blue-700 font-semibold mt-0.5 truncate">
                      {design.nameHindi}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {design.description}
                    </p>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">
                      {design.defaultWidth} × {design.defaultHeight} mm
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCard(design);
                      }}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white'
                      }`}
                    >
                      <span>Select</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Selected Checkmark */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Inspector & Action Panel */}
          <div className="w-88 border-l border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between overflow-y-auto shrink-0">
            <div className="space-y-5">
              {/* Selected Design Title Header */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Model #{activeDesign.number} • {activeDesign.catalogKey}</span>
                </div>
                <h2 className="text-base font-black text-slate-900 mt-1">
                  {activeDesign.name}
                </h2>
                <p className="text-xs font-bold text-blue-700 mt-0.5">
                  {activeDesign.nameHindi}
                </p>
              </div>

              {/* Large SVG Preview Box */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center">
                {activeDesign.renderDiagram()}
                <div className="mt-3 text-center">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {activeDesign.panelCount} Panels • {activeDesign.trackType}
                  </span>
                </div>
              </div>

              {/* Dimension Sizing Inputs */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                  Outer Dimensions (mm):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Width (W mm):</span>
                    <input
                      type="number"
                      step={50}
                      min={600}
                      max={15000}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value) || 1000)}
                      className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Height (H mm):</span>
                    <input
                      type="number"
                      step={50}
                      min={400}
                      max={4000}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value) || 1000)}
                      className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Description */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl text-[11px] text-blue-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Manufacturing Blueprint:</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {activeDesign.description}
                </p>
                <p className="text-blue-800 font-semibold leading-relaxed">
                  {activeDesign.descriptionHindi}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
              {selectedFrame && (
                <button
                  onClick={() =>
                    onSelectDesign(activeDesign, customWidth, customHeight, 'apply_to_selected')
                  }
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply to Selected Frame ({selectedFrame.name})</span>
                </button>
              )}

              <button
                onClick={() => onSelectDesign(activeDesign, customWidth, customHeight, 'new_frame')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Sliders className="w-4 h-4" />
                <span>Add as New Sliding Frame (नया फ्रेम बनाएँ)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ALL_18_SLIDING_DESIGNS = MASTER_15_SLIDING_DESIGNS;
export const SLIDING_DESIGNS_18 = MASTER_15_SLIDING_DESIGNS;
