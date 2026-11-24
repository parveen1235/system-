import React, { useState, useMemo, useEffect } from 'react';
import {
  Ruler,
  CheckCircle2,
  Copy,
  Layers,
  Maximize2,
  Shield,
  Sliders,
  Sparkles,
  RefreshCw,
  Calculator,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Activity,
  Flame,
  Eye,
  Info,
  CornerDownRight,
} from 'lucide-react';
import {
  CustomSeries,
  ManufacturingNiyamRules,
} from '../constants/customSeriesMaster';
import {
  getCasementFrameReinforcementDeduction,
  getCasementSashReinforcementDeduction,
} from '../utils/upvcCalculations';

interface SeriesCuttingCheckerProps {
  currentSeries: CustomSeries;
  rules: ManufacturingNiyamRules;
}

export const SeriesCuttingChecker: React.FC<SeriesCuttingCheckerProps> = ({
  currentSeries,
  rules,
}) => {
  // System mode: 'sliding' | 'casement'
  const [activeSystem, setActiveSystem] = useState<'sliding' | 'casement'>(
    currentSeries.type === 'casement' ? 'casement' : 'sliding'
  );

  // Sync activeSystem when currentSeries type changes
  useEffect(() => {
    setActiveSystem(currentSeries.type === 'casement' ? 'casement' : 'sliding');
  }, [currentSeries.type]);

  // Dimension inputs
  const [testWidth, setTestWidth] = useState<number>(1500);
  const [testHeight, setTestHeight] = useState<number>(1500);
  const [widthInput, setWidthInput] = useState<string>('1500');
  const [heightInput, setHeightInput] = useState<string>('1500');

  const handleWidthChange = (val: string) => {
    setWidthInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setTestWidth(num);
    }
  };

  const handleWidthBlur = () => {
    const num = parseFloat(widthInput);
    if (isNaN(num) || num <= 0) {
      setWidthInput(testWidth.toString());
    } else {
      setWidthInput(num.toString());
      setTestWidth(num);
    }
  };

  const handleHeightChange = (val: string) => {
    setHeightInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setTestHeight(num);
    }
  };

  const handleHeightBlur = () => {
    const num = parseFloat(heightInput);
    if (isNaN(num) || num <= 0) {
      setHeightInput(testHeight.toString());
    } else {
      setHeightInput(num.toString());
      setTestHeight(num);
    }
  };

  const [trackType, setTrackType] = useState<'2track' | '3track'>('2track');
  const [panelCount, setPanelCount] = useState<number>(2);
  const [appType, setAppType] = useState<'window' | 'door'>('window');

  // Sub-view mode: 'formulaFlow' (Live Working Math) | 'cards' (Profile Cards) | 'cadDiagram' (2D Schematic) | 'all' (Show All)
  const [viewMode, setViewMode] = useState<'formulaFlow' | 'cards' | 'cadDiagram' | 'all'>('formulaFlow');

  // Accordion state for card inline formula expansions
  const [expandedCard, setExpandedCard] = useState<{ [key: string]: boolean }>({
    frame: true,
    sash: true,
    glass: true,
    bead: false,
    interlock: false,
    steel: false,
  });

  const toggleCardExpand = (cardKey: string) => {
    setExpandedCard((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  // Selected profile overrides from current series
  const defaultFrame = currentSeries.frames[0] || {
    id: 'f-def',
    code: activeSystem === 'sliding' ? 'SWH 60-01' : 'CWH 60-01',
    name: activeSystem === 'sliding' ? 'SLD 2 TRACK 60MM X 52MM' : 'CSMT FRAME 60MM X 60MM',
    height: activeSystem === 'sliding' ? 44 : 60,
    beadingSideHeight: activeSystem === 'sliding' ? 40 : 60,
    depth: activeSystem === 'sliding' ? 52 : 60,
  };

  const defaultSash = currentSeries.sashes.find((s) => s.category === appType) ||
    currentSeries.sashes[0] || {
      id: 's-def',
      code: activeSystem === 'sliding' ? 'SWH 60-03' : 'CWH 60-03',
      name: activeSystem === 'sliding' ? 'SLD SASH 42MM X 57MM (SWH 60-03)' : 'CSMT SASH 60MM X 78MM',
      category: appType,
      realHeight: activeSystem === 'sliding' ? 70 : 78,
      beadingSideHeight: activeSystem === 'sliding' ? 52 : 60,
      steelCode: activeSystem === 'sliding' ? 'SRI 60-03-1.5MM' : 'CRI 60-03-1.5MM',
    };

  const [selectedFrameId, setSelectedFrameId] = useState<string>(defaultFrame.id);
  const [selectedSashId, setSelectedSashId] = useState<string>(defaultSash.id);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [copiedSteps, setCopiedSteps] = useState<boolean>(false);

  // Per Sash Configuration State
  // Mode: 'all_same' (सभी पल्ले समान) or 'per_sash' (प्रत्येक पल्ला अलग चुनें)
  const [sashMode, setSashMode] = useState<'all_same' | 'per_sash'>('per_sash');
  const [activeSashIndex, setActiveSashIndex] = useState<number>(0);
  const [selectedFormulaSashIndex, setSelectedFormulaSashIndex] = useState<number>(-1); // -1 = All Sashes, 0..N = specific sash

  // Per Sash Items Configuration
  const [perSashConfigs, setPerSashConfigs] = useState<Array<{
    sashNumber: number;
    name: string;
    sashProfileId: string;
    panelType: 'glass' | 'mesh' | 'solid_panel';
    glassType: string;
    lockType: string;
    rollerType: string;
  }>>([
    {
      sashNumber: 1,
      name: 'पल्ला 1 (Sash 1)',
      sashProfileId: defaultSash.id,
      panelType: 'glass',
      glassType: '5mm Clear Glass',
      lockType: 'touch_lock_left',
      rollerType: 'double_tandem',
    },
    {
      sashNumber: 2,
      name: 'पल्ला 2 (Sash 2)',
      sashProfileId: defaultSash.id,
      panelType: 'glass',
      glassType: '5mm Clear Glass',
      lockType: 'touch_lock_right',
      rollerType: 'double_tandem',
    },
    {
      sashNumber: 3,
      name: 'पल्ला 3 (Sash 3)',
      sashProfileId: defaultSash.id,
      panelType: 'mesh',
      glassType: 'SS-304 Wire Mesh',
      lockType: 'flush_pull',
      rollerType: 'mesh_roller',
    },
    {
      sashNumber: 4,
      name: 'पल्ला 4 (Sash 4)',
      sashProfileId: defaultSash.id,
      panelType: 'glass',
      glassType: '5mm Clear Glass',
      lockType: 'touch_lock_right',
      rollerType: 'double_tandem',
    },
  ]);

  // Update specific sash configuration
  const updatePerSash = (index: number, updates: Partial<{
    sashProfileId: string;
    panelType: 'glass' | 'mesh' | 'solid_panel';
    glassType: string;
    lockType: string;
    rollerType: string;
  }>) => {
    setPerSashConfigs((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...updates };
      }
      return next;
    });
  };

  // Quick preset handlers for common fabrication layouts
  const applyPreset3TrackGlassMesh = () => {
    setSashMode('per_sash');
    setPanelCount(3);
    setTrackType('3track');
    setPerSashConfigs((prev) => [
      { ...prev[0], panelType: 'glass', glassType: '5mm Clear Glass' },
      { ...prev[1], panelType: 'glass', glassType: '5mm Clear Glass' },
      { ...prev[2], panelType: 'mesh', glassType: 'SS-304 Wire Mesh (मच्छरदानी)' },
      { ...prev[3] },
    ]);
  };

  const applyPreset2TrackGlassMesh = () => {
    setSashMode('per_sash');
    setPanelCount(2);
    setTrackType('2track');
    setPerSashConfigs((prev) => [
      { ...prev[0], panelType: 'glass', glassType: '5mm Clear Glass' },
      { ...prev[1], panelType: 'mesh', glassType: 'SS-304 Wire Mesh (मच्छरदानी)' },
      { ...prev[2] },
      { ...prev[3] },
    ]);
  };

  const applyPresetAllGlass = () => {
    setPerSashConfigs((prev) => prev.map((s) => ({ ...s, panelType: 'glass', glassType: '5mm Clear Glass' })));
  };

  // When currentSeries changes, reset selected profile IDs if not present
  useEffect(() => {
    if (!currentSeries.frames.some((f) => f.id === selectedFrameId)) {
      setSelectedFrameId(currentSeries.frames[0]?.id || 'f-def');
    }
    if (!currentSeries.sashes.some((s) => s.id === selectedSashId)) {
      setSelectedSashId(currentSeries.sashes[0]?.id || 's-def');
    }
  }, [currentSeries, selectedFrameId, selectedSashId]);

  // Active Frame & Sash
  const activeFrame = useMemo(() => {
    return currentSeries.frames.find((f) => f.id === selectedFrameId) || defaultFrame;
  }, [currentSeries.frames, selectedFrameId, defaultFrame]);

  const activeSash = useMemo(() => {
    return currentSeries.sashes.find((s) => s.id === selectedSashId) || defaultSash;
  }, [currentSeries.sashes, selectedSashId, defaultSash]);

  // Mathematical Calculations & Step-by-Step Live Proof
  const calculations = useMemo(() => {
    const weld = rules.casementWeldAllowance || 6;
    const outerCutW = Math.round(testWidth + weld);
    const outerCutH = Math.round(testHeight + weld);

    if (activeSystem === 'sliding') {
      // 1. Sliding Frame Deduction: (FrameHeight * 2) - 16mm
      const fHeight = activeFrame.height || 44;
      const fHeightDouble = fHeight * 2;
      const trackRebate = 16;
      const frameDeduction = fHeightDouble - trackRebate;

      // 2. Sash Height: OuterCut_H - FrameDeduction
      const sashH = Math.round(outerCutH - frameDeduction);

      // 3. Overlap calculation: (SashRealH / 2) + 4
      const sashRealH = activeSash.realHeight || 70;
      const halfSash = sashRealH / 2;
      const sealAllowance = 4;
      const overlap = halfSash + sealAllowance;

      // 4. Sash Width: [(OuterCut_W - FrameDeduction) / panels] + overlap
      const innerClearanceW = outerCutW - frameDeduction;
      const perPanelBase = innerClearanceW / panelCount;
      const sashW = Math.round(perPanelBase + overlap);

      // 5. Glass Deduction: (BeadSideH * 2) + 10mm
      const beadSideH = activeSash.beadingSideHeight || 52;
      const beadSideDouble = beadSideH * 2;
      const gasketOffset = 10;
      const glassDeduction = beadSideDouble + gasketOffset;
      const glassH = Math.max(50, Math.round(sashH - glassDeduction));
      const glassW = Math.max(50, Math.round(sashW - glassDeduction));

      // 6. Beading Size: Glass + 4mm
      const beadAllowance = rules.casementBeadingAllowance || 4;
      const beadH = glassH + beadAllowance;
      const beadW = glassW + beadAllowance;

      // 7. Interlock Height: SashH - 16mm
      const interlockClearance = 16;
      const interlockH = Math.max(50, sashH - interlockClearance);
      const interlockQty = Math.max(0, (panelCount - 1) * 2);

      // 8. GI Steel Reinforcements:
      const outerSteelDeduction = rules.giSteelSlidingOuterDeduction || 100;
      const outerSteelW = Math.max(50, outerCutW - outerSteelDeduction);
      const outerSteelH = Math.max(50, outerCutH - outerSteelDeduction);

      const is66 = activeSash.code === 'SWH 60-04' || activeSash.realHeight === 75 || activeSash.name.includes('66');
      const sashSteelDeduction = is66
        ? (rules.giSteelSlidingSash66Deduction || 128)
        : (rules.giSteelSlidingSash57Deduction || 110);

      const sashSteelW = Math.max(50, sashW - sashSteelDeduction);
      const sashSteelH = Math.max(50, sashH - sashSteelDeduction);

      const glassAreaSqFt = ((glassW * glassH * panelCount) / (304.8 * 304.8)).toFixed(2);
      const windowAreaSqFt = ((testWidth * testHeight) / (304.8 * 304.8)).toFixed(2);

      // 9. Per-Sash Detailed Breakdown (फैक्ट्री में प्रत्येक पल्ला कटिंग साइज़)
      const perSashList = Array.from({ length: panelCount }).map((_, i) => {
        const cfg = perSashConfigs[i] || {
          sashNumber: i + 1,
          name: `पल्ला ${i + 1}`,
          sashProfileId: defaultSash.id,
          panelType: i === 2 && trackType === '3track' ? 'mesh' : 'glass',
          glassType: i === 2 && trackType === '3track' ? 'SS-304 Wire Mesh' : '5mm Clear Glass',
          lockType: 'touch_lock_left',
          rollerType: 'double_tandem',
        };

        const profId = sashMode === 'per_sash' && cfg.sashProfileId ? cfg.sashProfileId : selectedSashId;
        const sProf = currentSeries.sashes.find((s) => s.id === profId) || activeSash;

        const sRealH = sProf.realHeight || 70;
        const sBeadH = sProf.beadingSideHeight || 52;
        const sOverlap = (sRealH / 2) + 4;
        const sWidth = Math.round(perPanelBase + sOverlap);
        const sHeight = sashH;

        const isMesh = cfg.panelType === 'mesh';
        const isSolid = cfg.panelType === 'solid_panel';
        
        // Infill deduction
        const infillDeduction = (sBeadH * 2) + 10;
        const infillW = Math.max(50, sWidth - infillDeduction);
        const infillH = Math.max(50, sHeight - infillDeduction);

        const is66Profile = sProf.code === 'SWH 60-04' || sProf.realHeight >= 75 || sProf.name.includes('66');
        const sSteelDeduction = is66Profile
          ? (rules.giSteelSlidingSash66Deduction || 128)
          : (rules.giSteelSlidingSash57Deduction || 110);
        const sSteelW = Math.max(50, sWidth - sSteelDeduction);
        const sSteelH = Math.max(50, sHeight - sSteelDeduction);

        const beadAllowance = rules.casementBeadingAllowance || 4;
        const beadW = infillW + beadAllowance;
        const beadH = infillH + beadAllowance;

        const infillAreaSqFt = ((infillW * infillH) / (304.8 * 304.8)).toFixed(2);

        return {
          index: i,
          sashNumber: i + 1,
          name: cfg.name || `पल्ला ${i + 1}`,
          profile: sProf,
          panelType: cfg.panelType,
          glassType: cfg.glassType,
          lockType: cfg.lockType,
          rollerType: cfg.rollerType,
          sRealH,
          sBeadH,
          sOverlap,
          sWidth,
          sHeight,
          infillDeduction,
          infillW,
          infillH,
          infillAreaSqFt,
          beadW,
          beadH,
          steelW: sSteelW,
          steelH: sSteelH,
          steelDeduction: sSteelDeduction,
          isMesh,
          isSolid,
        };
      });

      return {
        weld,
        outerCutW,
        outerCutH,
        fHeight,
        fHeightDouble,
        trackRebate,
        frameDeduction,
        sashH,
        sashRealH,
        halfSash,
        sealAllowance,
        overlap,
        innerClearanceW,
        perPanelBase,
        sashW,
        beadSideH,
        beadSideDouble,
        gasketOffset,
        glassDeduction,
        glassH,
        glassW,
        beadAllowance,
        beadH,
        beadW,
        interlockClearance,
        interlockH,
        interlockQty,
        outerSteelDeduction,
        outerSteelW,
        outerSteelH,
        sashSteelW,
        sashSteelH,
        sashSteelDeduction,
        is66,
        glassAreaSqFt,
        windowAreaSqFt,
        perSashList,
      };
    } else {
      // CASEMENT SYSTEM - EXACT CASEMENT RULE DETAIL (CASEMENT NIYAM) PROCESS:
      // 1. Outer Frame Size: Outer Size = Design Size + 6mm
      const outerCutW = Math.round(testWidth + weld);
      const outerCutH = Math.round(testHeight + weld);

      // 2. Sash / Palla Size: Sash = Outer Size - ((Beding_Side * 2) - 16)
      // Sash H aur W dono ke liye is niyam ka upyog hoga (Outer Size = Design Size + 6mm).
      const frameBeadSide = activeFrame.beadingSideHeight || activeFrame.height || 60;
      const frameBeadDouble = frameBeadSide * 2;
      const sashDeduction = frameBeadDouble - 16;
      const sashW = Math.max(50, Math.round(outerCutW - sashDeduction));
      const sashH = Math.max(50, Math.round(outerCutH - sashDeduction));

      // 3. Glass Size: Glass = Sash - (Sash_Beading_Side_Height * 2) - 8
      // Sash size se beading side height x 2 aur -8mm clearance ghataya jata hai.
      const beadSideH = activeSash.beadingSideHeight || (appType === 'door' ? 86 : 60);
      const beadSideDouble = beadSideH * 2;
      const glassConstant = rules.casementGlassConstant || 8;
      const glassDeduction = beadSideDouble + glassConstant;
      const glassW = Math.max(50, Math.round(sashW - glassDeduction));
      const glassH = Math.max(50, Math.round(sashH - glassDeduction));

      // 4. Beading Size: Beading = Glass Size + 4mm
      const beadAllowance = rules.casementBeadingAllowance || 4;
      const beadH = glassH + beadAllowance;
      const beadW = glassW + beadAllowance;

      // 5. GI Steel Reinforcements (Duron Casement Profile Formulas):
      // Outer: CWH60-01 (-52mm), CWH60-02 (-76mm), Default (-100mm)
      // Sash: CWH60-03 (-152mm), CWH60-04 (-138mm), CWH60-06/07 (-204mm), Default (-110mm)
      const frameSteelInfo = getCasementFrameReinforcementDeduction(activeFrame.code, rules);
      const outerSteelDeduction = frameSteelInfo.deduction;
      const outerSteelW = Math.max(50, outerCutW - outerSteelDeduction);
      const outerSteelH = Math.max(50, outerCutH - outerSteelDeduction);

      const sashSteelInfo = getCasementSashReinforcementDeduction(
        activeSash.code,
        activeSash.sashType === 'door',
        rules
      );
      const sashSteelDeduction = sashSteelInfo.deduction;
      const sashSteelW = Math.max(50, sashW - sashSteelDeduction);
      const sashSteelH = Math.max(50, sashH - sashSteelDeduction);

      const fpw = activeFrame.height || 60;
      const fpwDouble = fpw * 2;
      const pocketW = Math.max(100, testWidth - fpwDouble);
      const pocketH = Math.max(100, testHeight - fpwDouble);
      const mullionL = Math.max(50, testHeight - fpwDouble);

      const glassAreaSqFt = ((glassW * glassH) / (304.8 * 304.8)).toFixed(2);
      const windowAreaSqFt = ((testWidth * testHeight) / (304.8 * 304.8)).toFixed(2);

      const perSashList = [
        {
          index: 0,
          sashNumber: 1,
          name: 'केसमेंट पल्ला (Casement Sash)',
          profile: activeSash,
          panelType: 'glass' as const,
          glassType: '5mm / 6mm Clear Float Glass',
          lockType: 'Single/Multi-Point Espag',
          rollerType: 'SS 304 Friction Stay (12" / 16")',
          sRealH: activeSash.realHeight || 78,
          sBeadH: beadSideH,
          sOverlap: 0,
          sWidth: sashW,
          sHeight: sashH,
          infillDeduction: glassDeduction,
          infillW: glassW,
          infillH: glassH,
          infillAreaSqFt: glassAreaSqFt,
          beadW,
          beadH,
          steelW: sashSteelW,
          steelH: sashSteelH,
          steelDeduction: sashSteelDeduction,
          isMesh: false,
          isSolid: false,
        },
      ];

      return {
        weld,
        outerCutW,
        outerCutH,
        fHeight: frameBeadSide,
        fHeightDouble: frameBeadDouble,
        trackRebate: 16,
        frameDeduction: sashDeduction,
        frameBeadSide,
        sashDeduction,
        pocketW,
        pocketH,
        sashH,
        sashW,
        sashRealH: activeSash.realHeight || 78,
        halfSash: (activeSash.realHeight || 78) / 2,
        sealAllowance: 0,
        overlap: 0,
        innerClearanceW: outerCutW - sashDeduction,
        perPanelBase: outerCutW - sashDeduction,
        beadSideH,
        beadSideDouble,
        gasketOffset: glassConstant,
        glassDeduction,
        glassH,
        glassW,
        beadAllowance,
        beadH,
        beadW,
        interlockClearance: 0,
        interlockH: 0,
        interlockQty: 0,
        mullionL,
        outerSteelDeduction,
        outerSteelW,
        outerSteelH,
        sashSteelW,
        sashSteelH,
        sashSteelDeduction,
        is66: false,
        glassAreaSqFt,
        windowAreaSqFt,
        perSashList,
      };
    }
  }, [
    testWidth,
    testHeight,
    panelCount,
    activeFrame,
    activeSash,
    rules,
    activeSystem,
    appType,
    sashMode,
    perSashConfigs,
    selectedSashId,
    trackType,
    currentSeries,
    defaultSash,
  ]);

  // Copy Full Step-by-Step Formula Math
  const handleCopyFormulaSteps = () => {
    const isSld = activeSystem === 'sliding';
    let text = `=== UPVC ${isSld ? 'SLIDING' : 'CASEMENT'} FORMULA STEP-BY-STEP MATHEMATICAL WORKING ===\n`;
    text += `Tested Dimensions: ${testWidth}mm Width x ${testHeight}mm Height\n`;
    text += `Active Series: ${currentSeries.name} (${currentSeries.brand})\n`;
    text += `Frame Profile: ${activeFrame.code} (Height: ${calculations.fHeight}mm)\n`;
    text += `Sash Profile:  ${activeSash.code} (Real Height: ${calculations.sashRealH}mm, Beading Side: ${calculations.beadSideH}mm)\n\n`;

    if (isSld) {
      text += `STEP 1: OUTER FRAME CUTTING SIZE (आउटर कटिंग)\n`;
      text += `  Formula: Outer Cut = Window Dimension + Weld Allowance (6mm)\n`;
      text += `  Width Cut:  ${testWidth} + 6 = ${calculations.outerCutW} mm (Qty: 2 Pcs, 45°)\n`;
      text += `  Height Cut: ${testHeight} + 6 = ${calculations.outerCutH} mm (Qty: 2 Pcs, 45°)\n`;
      text += `  Reason: Both corners weld burn-off is 3mm + 3mm = 6mm.\n\n`;

      text += `STEP 2: FRAME DEDUCTION (फ्रेम डिडक्शन)\n`;
      text += `  Formula: Frame Deduction = (Frame Height * 2) - 16mm Track Rebate\n`;
      text += `  Calculation: (${calculations.fHeight} * 2) - 16 = ${calculations.fHeightDouble} - 16 = ${calculations.frameDeduction} mm\n`;
      text += `  Reason: Frame profile height on top and bottom minus track channel rebate depth.\n\n`;

      text += `STEP 3: SLIDING SASH HEIGHT (सैश की ऊँचाई)\n`;
      text += `  Formula: Sash Height = Outer Cut Height - Frame Deduction\n`;
      text += `  Calculation: ${calculations.outerCutH} - ${calculations.frameDeduction} = ${calculations.sashH} mm (Qty: ${panelCount * 2} Pcs, 45°)\n\n`;

      text += `STEP 4: INTER-PANEL OVERLAP (पल्ला ओवरलैप)\n`;
      text += `  Formula: Overlap = (Sash Real Height / 2) + 4mm Seal Allowance\n`;
      text += `  Calculation: (${calculations.sashRealH} / 2) + 4 = ${calculations.halfSash} + 4 = ${calculations.overlap} mm\n\n`;

      text += `STEP 5: SLIDING SASH WIDTH (सैश की चौड़ाई)\n`;
      text += `  Formula: Sash Width = [(Outer Cut Width - Frame Deduction) / Panels] + Overlap\n`;
      text += `  Calculation: [(${calculations.outerCutW} - ${calculations.frameDeduction}) / ${panelCount}] + ${calculations.overlap}\n`;
      text += `             = [${calculations.innerClearanceW} / ${panelCount}] + ${calculations.overlap}\n`;
      text += `             = ${calculations.perPanelBase} + ${calculations.overlap} = ${calculations.sashW} mm (Qty: ${panelCount * 2} Pcs, 45°)\n\n`;

      text += `STEP 6: GLASS DEDUCTION (काँच डिडक्शन)\n`;
      text += `  Formula: Glass Deduction = (Sash Beading Side Height * 2) + 10mm Gasket Clearance\n`;
      text += `  Calculation: (${calculations.beadSideH} * 2) + 10 = ${calculations.beadSideDouble} + 10 = ${calculations.glassDeduction} mm\n\n`;

      text += `STEP 7: GLASS CUT SIZES (काँच की कटिंग)\n`;
      text += `  Glass Width:  ${calculations.sashW} - ${calculations.glassDeduction} = ${calculations.glassW} mm\n`;
      text += `  Glass Height: ${calculations.sashH} - ${calculations.glassDeduction} = ${calculations.glassH} mm\n`;
      text += `  Quantity:     ${panelCount} Panes (90° Square Cut) [Total Area: ${calculations.glassAreaSqFt} Sq.Ft]\n\n`;

      text += `STEP 8: GLAZING BEADING (ग्लेज़िंग बीडिंग)\n`;
      text += `  Formula: Beading = Glass Size + 4mm\n`;
      text += `  Width:  ${calculations.glassW} + 4 = ${calculations.beadW} mm (Qty: ${panelCount * 2} Pcs, 45°)\n`;
      text += `  Height: ${calculations.glassH} + 4 = ${calculations.beadH} mm (Qty: ${panelCount * 2} Pcs, 45°)\n\n`;

      text += `STEP 9: INTERLOCK PROFILE (इण्टरलॉक प्रोफाइल)\n`;
      text += `  Formula: Interlock Length = Sash Height - 16mm\n`;
      text += `  Calculation: ${calculations.sashH} - 16 = ${calculations.interlockH} mm (Qty: ${calculations.interlockQty} Pcs)\n\n`;

      text += `STEP 10: GI STEEL REINFORCEMENTS (स्टील)\n`;
      text += `  Outer Steel: Outer Cut - 100mm = W: ${calculations.outerSteelW}mm / H: ${calculations.outerSteelH}mm\n`;
      text += `  Sash Steel:  Sash Size - ${calculations.sashSteelDeduction}mm = W: ${calculations.sashSteelW}mm / H: ${calculations.sashSteelH}mm\n`;
    } else {
      text += `STEP 1: OUTER FRAME SIZE (Outer Size = Design Size + 6mm)\n`;
      text += `  Formula: Outer Cut = Window Dimension + Weld Allowance (6mm)\n`;
      text += `  Width Cut:  ${testWidth} + 6 = ${calculations.outerCutW} mm (Qty: 2 Pcs, 45° Miter)\n`;
      text += `  Height Cut: ${testHeight} + 6 = ${calculations.outerCutH} mm (Qty: 2 Pcs, 45° Miter)\n`;
      text += `  Reason: Both corners weld burn-off is 3mm + 3mm = 6mm.\n\n`;

      text += `STEP 2: SASH / PALLA SIZE (Casement Formula)\n`;
      text += `  Formula: Sash = Outer Size - ((Beding_Side * 2) - 16)\n`;
      text += `  Frame Beading Side: ${calculations.frameBeadSide} mm (${activeFrame.code})\n`;
      text += `  Deduction: (${calculations.frameBeadSide} * 2) - 16 = ${calculations.fHeightDouble} - 16 = ${calculations.sashDeduction} mm\n`;
      text += `  Sash Width:  ${calculations.outerCutW} - ${calculations.sashDeduction} = ${calculations.sashW} mm (Qty: 2 Pcs, 45° Miter)\n`;
      text += `  Sash Height: ${calculations.outerCutH} - ${calculations.sashDeduction} = ${calculations.sashH} mm (Qty: 2 Pcs, 45° Miter)\n`;
      text += `  Note: Sash H aur W dono ke liye is niyam ka upyog hoga (Outer Size = Design Size + 6mm).\n\n`;

      text += `STEP 3: GLASS SIZE (Glass Formula)\n`;
      text += `  Formula: Glass = Sash - (Sash_Beading_Side_Height * 2) - 8\n`;
      text += `  Sash Beading Side Height: ${calculations.beadSideH} mm (${activeSash.code})\n`;
      text += `  Glass Deduction: (${calculations.beadSideH} * 2) + 8 = ${calculations.glassDeduction} mm\n`;
      text += `  Glass Width:  ${calculations.sashW} - ${calculations.glassDeduction} = ${calculations.glassW} mm (90° Square Cut)\n`;
      text += `  Glass Height: ${calculations.sashH} - ${calculations.glassDeduction} = ${calculations.glassH} mm (90° Square Cut)\n`;
      text += `  Area: ${calculations.glassAreaSqFt} Sq.Ft (Qty: 1 Pane)\n\n`;

      text += `STEP 4: GLAZING BEADING (Beading Formula)\n`;
      text += `  Formula: Beading = Glass Size + 4mm\n`;
      text += `  Width:  ${calculations.glassW} + 4 = ${calculations.beadW} mm (Qty: 2 Pcs, 45° Miter)\n`;
      text += `  Height: ${calculations.glassH} + 4 = ${calculations.beadH} mm (Qty: 2 Pcs, 45° Miter)\n\n`;

      text += `STEP 5: GI STEEL REINFORCEMENTS\n`;
      text += `  Outer Steel: Outer Cut - 100mm = W: ${calculations.outerSteelW}mm / H: ${calculations.outerSteelH}mm (Qty: 4 Pcs, 90°)\n`;
      text += `  Sash Steel:  Sash Size - 110mm = W: ${calculations.sashSteelW}mm / H: ${calculations.sashSteelH}mm (Qty: 4 Pcs, 90°)\n`;
    }
    text += `===================================================================`;

    navigator.clipboard.writeText(text);
    setCopiedSteps(true);
    setTimeout(() => setCopiedSteps(false), 2500);
  };

  // Copy Standard Summary
  const handleCopySummary = () => {
    const isSld = activeSystem === 'sliding';
    const text = `=== UPVC ${isSld ? 'SLIDING' : 'CASEMENT'} CUTTING LIST SUMMARY ===
Window/Door Dimensions: ${testWidth}mm (W) x ${testHeight}mm (H) [${calculations.windowAreaSqFt} Sq.Ft]
Configuration: ${isSld ? `${trackType.toUpperCase()} | ${panelCount} Panels` : 'Casement Shutter'} | ${appType.toUpperCase()}
Series: ${currentSeries.name} (${currentSeries.brand})
Frame Profile: ${activeFrame.code} (${activeFrame.name})
Sash Profile:  ${activeSash.code} (${activeSash.name})

1. OUTER FRAME (45° Miter):
   - Width:  ${calculations.outerCutW} mm (Qty: 2) [Formula: W + 6mm]
   - Height: ${calculations.outerCutH} mm (Qty: 2) [Formula: H + 6mm]

2. SASH PROFILES (45° Miter):
   - Width:  ${calculations.sashW} mm (Qty: ${isSld ? panelCount * 2 : 2})
   - Height: ${calculations.sashH} mm (Qty: ${isSld ? panelCount * 2 : 2})

3. GLASS PANES (90° Square):
   - Size: ${calculations.glassW} mm x ${calculations.glassH} mm (Qty: ${isSld ? panelCount : 1} Panes)
   - Total Glass Area: ${calculations.glassAreaSqFt} Sq.Ft
   - Glass Deduction: -${calculations.glassDeduction} mm

4. GLAZING BEADING (45° Miter):
   - Width:  ${calculations.beadW} mm (Qty: ${isSld ? panelCount * 2 : 2}) [Glass + 4mm]
   - Height: ${calculations.beadH} mm (Qty: ${isSld ? panelCount * 2 : 2}) [Glass + 4mm]

${isSld ? `5. INTERLOCK CLIPS (90° Cut):
   - Length: ${calculations.interlockH} mm (Qty: ${calculations.interlockQty}) [Sash H - 16mm]` : ''}

6. GI STEEL REINFORCEMENTS (90° Cut):
   - Outer Frame Steel: ${calculations.outerSteelW}mm (Qty: 2W) / ${calculations.outerSteelH}mm (Qty: 2H) [-100mm]
   - Sash Steel:        ${calculations.sashSteelW}mm (Qty: ${isSld ? panelCount * 2 : 2}W) / ${calculations.sashSteelH}mm (Qty: ${isSld ? panelCount * 2 : 2}H) [-${calculations.sashSteelDeduction}mm]
=========================================`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Info */}
      <div className="bg-linear-to-r from-amber-500/10 via-orange-500/10 to-amber-600/15 border border-amber-300 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Calculator className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
                  <span>लाइव फॉर्मूला गणित एवं कटिंग चेकर</span>
                  <span className="text-amber-700 text-sm font-bold font-mono">
                    (Formula Kaam Karte Hue Dekhe)
                  </span>
                </h2>
                <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                यहाँ माप या प्रोफ़ाइल बदलने पर फॉर्मूले के अंदर संख्याएँ कैसे बैठती हैं (Substitution) और स्टेप-बाई-स्टेप रिजल्ट कैसे निकलता है, लाइव देखें।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* System Switcher Toggle */}
            <div className="inline-flex p-1 bg-white/90 border border-amber-200 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveSystem('sliding')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSystem === 'sliding'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sliding (स्लाइडिंग)
              </button>
              <button
                type="button"
                onClick={() => setActiveSystem('casement')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSystem === 'casement'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Casement (केसमेंट)
              </button>
            </div>

            {/* Copy Step-by-Step Formula Math Button */}
            <button
              type="button"
              onClick={handleCopyFormulaSteps}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white transition cursor-pointer shadow-xs"
              title="पूरा गणितीय स्टेप्स टेक्स्ट के रूप में कॉपी करें"
            >
              {copiedSteps ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Steps Copied!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Copy Math Steps</span>
                </>
              )}
            </button>

            {/* Copy Cutting Summary Button */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-xs"
            >
              {copiedSummary ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-300" />
                  <span>Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Series Tag Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-amber-300/60 text-xs">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>एक्टिव प्रोफाइल डेटा:</span>
          </span>
          <span className="font-extrabold text-slate-900 bg-white/90 border border-amber-200 px-2.5 py-1 rounded-md">
            {currentSeries.name} ({currentSeries.brand})
          </span>
          <span className="font-bold text-blue-900 bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-md">
            फ्रेम ऊँचाई: <b>{calculations.fHeight}mm</b>
          </span>
          <span className="font-bold text-amber-950 bg-amber-200/70 border border-amber-300 px-2.5 py-1 rounded-md">
            सैश रियल हाइट: <b>{calculations.sashRealH}mm</b>
          </span>
          <span className="font-bold text-emerald-950 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-md">
            बीड़िंग साइड हाइट: <b>{calculations.beadSideH}mm</b>
          </span>
          <span className="font-bold text-purple-950 bg-purple-100/70 border border-purple-200 px-2.5 py-1 rounded-md">
            वेल्डिंग अलाउंस: <b>+{calculations.weld}mm</b>
          </span>
        </div>
      </div>

      {/* =========================================================================
          CONTROL PANEL: CASEMENT (SUPER SIMPLE 4 INPUTS) vs SLIDING
         ========================================================================= */}
      {activeSystem === 'casement' ? (
        /* CASEMENT CONTROL PANEL: ONLY FRAME, SASH SELECTION & WIDTH/HEIGHT INPUTS */
        <div className="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Sliders className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  CASEMENT TEST PARAMETERS (सरल केसमेंट लाइव टेस्ट)
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  सिर्फ चौखट व पल्ला चुनें और माप (Width × Height) दर्ज करें — प्रोसेस केसमेंट नियम अनुसार लाइव चलेगा
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setTestWidth(1500);
                setTestHeight(1500);
                setWidthInput('1500');
                setHeightInput('1500');
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset (1500×1500)</span>
            </button>
          </div>

          {/* Casement Rule Detail Equation Bar */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-black text-blue-900 bg-blue-200/80 px-2 py-0.5 rounded text-[11px]">
                केसमेंट नियम (CASEMENT RULE DETAIL):
              </span>
              <span className="text-slate-800 font-mono font-bold">
                1. Outer = W/H + 6mm
              </span>
              <span className="text-slate-400 font-bold">•</span>
              <span className="text-blue-950 font-mono font-bold">
                2. Sash = Outer - ((Beding_Side × 2) - 16)
              </span>
              <span className="text-slate-400 font-bold">•</span>
              <span className="text-emerald-950 font-mono font-bold">
                3. Glass = Sash - (Sash_Bead × 2) - 8
              </span>
              <span className="text-slate-400 font-bold">•</span>
              <span className="text-purple-950 font-mono font-bold">
                4. Beading = Glass + 4mm
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-blue-700 bg-white/90 border border-blue-200 px-2.5 py-0.5 rounded-full shadow-2xs">
              Single Openable Shutter
            </span>
          </div>

          {/* 4 Super Simple Controls in Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* 1. FRAME WIDTH - DIRECT TYPE */}
            <div className="flex flex-col gap-1.5 bg-slate-50/80 border border-slate-200 p-3.5 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  1. FRAME WIDTH (चौड़ाई - MM)
                </label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {(testWidth / 304.8).toFixed(1)} Ft
                </span>
              </div>

              {/* Direct Type Input */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={widthInput}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  onBlur={handleWidthBlur}
                  placeholder="उदा. 1500"
                  className="w-full text-base font-black text-blue-950 pl-3 pr-11 py-2 border-2 border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner"
                />
                <span className="absolute right-3 text-xs font-black text-slate-400 pointer-events-none uppercase">
                  MM
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                कीबोर्ड से सीधे चौड़ाई टाइप करें
              </span>
            </div>

            {/* 2. FRAME HEIGHT - DIRECT TYPE */}
            <div className="flex flex-col gap-1.5 bg-slate-50/80 border border-slate-200 p-3.5 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  2. FRAME HEIGHT (ऊँचाई - MM)
                </label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {(testHeight / 304.8).toFixed(1)} Ft
                </span>
              </div>

              {/* Direct Type Input */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={heightInput}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  onBlur={handleHeightBlur}
                  placeholder="उदा. 1500"
                  className="w-full text-base font-black text-blue-950 pl-3 pr-11 py-2 border-2 border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner"
                />
                <span className="absolute right-3 text-xs font-black text-slate-400 pointer-events-none uppercase">
                  MM
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                कीबोर्ड से सीधे ऊँचाई टाइप करें
              </span>
            </div>

            {/* 3. FRAME PROFILE (चौखट) */}
            <div className="flex flex-col gap-1.5 bg-blue-50/60 border border-blue-200 p-3 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider">
                  3. FRAME PROFILE (चौखट)
                </label>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                  Bead: {calculations.frameBeadSide}mm
                </span>
              </div>

              <select
                value={selectedFrameId}
                onChange={(e) => setSelectedFrameId(e.target.value)}
                className="w-full px-2.5 py-2 border border-blue-300 rounded-lg text-xs font-bold text-slate-900 bg-white cursor-pointer focus:outline-hidden focus:border-blue-600 shadow-2xs"
              >
                {currentSeries.frames.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} - {f.name} (H: {f.height}mm, Bead: {f.beadingSideHeight || 60}mm)
                  </option>
                ))}
              </select>

              <div className="text-[10px] text-blue-800 font-semibold">
                Deduction: ({calculations.frameBeadSide}×2) - 16 = <b className="text-blue-950 font-black">{calculations.sashDeduction}mm</b>
              </div>
            </div>

            {/* 4. SASH PROFILE (पल्ला) */}
            <div className="flex flex-col gap-1.5 bg-amber-50/60 border border-amber-200 p-3 rounded-xl">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider">
                  4. SASH PROFILE (पल्ला)
                </label>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  Bead: {calculations.beadSideH}mm
                </span>
              </div>

              <select
                value={selectedSashId}
                onChange={(e) => setSelectedSashId(e.target.value)}
                className="w-full px-2.5 py-2 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 bg-white cursor-pointer focus:outline-hidden focus:border-amber-600 shadow-2xs"
              >
                {currentSeries.sashes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} (Real: {s.realHeight || 78}mm, Bead: {s.beadingSideHeight || 60}mm)
                  </option>
                ))}
              </select>

              <div className="text-[10px] text-amber-800 font-semibold">
                Glass Deduction: ({calculations.beadSideH}×2) + 8 = <b className="text-amber-950 font-black">{calculations.glassDeduction}mm</b>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SLIDING SYSTEM CONTROL PANEL */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>TEST PARAMETERS (माप बदलें और नीचे फॉर्मूला में लाइव असर देखें)</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setTestWidth(1500);
              setTestHeight(1500);
              setWidthInput('1500');
              setHeightInput('1500');
              setPanelCount(2);
              setTrackType('2track');
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset (1500×1500)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Width Input - Direct Type */}
          <div className="flex flex-col gap-1.5 bg-slate-50/70 border border-slate-200 p-3 rounded-xl">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                FRAME WIDTH (चौड़ाई - MM)
              </label>
              <span className="text-[10px] font-bold text-blue-600">
                {(testWidth / 304.8).toFixed(1)} Ft
              </span>
            </div>

            {/* Direct Type Input */}
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="numeric"
                value={widthInput}
                onChange={(e) => handleWidthChange(e.target.value)}
                onBlur={handleWidthBlur}
                placeholder="उदा. 1500"
                className="w-full text-base font-black text-blue-950 pl-3 pr-11 py-2 border-2 border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner"
              />
              <span className="absolute right-3 text-xs font-black text-slate-400 pointer-events-none uppercase">
                MM
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              कीबोर्ड से सीधे चौड़ाई टाइप करें
            </span>
          </div>

          {/* 2. Height Input - Direct Type */}
          <div className="flex flex-col gap-1.5 bg-slate-50/70 border border-slate-200 p-3 rounded-xl">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                FRAME HEIGHT (ऊँचाई - MM)
              </label>
              <span className="text-[10px] font-bold text-blue-600">
                {(testHeight / 304.8).toFixed(1)} Ft
              </span>
            </div>

            {/* Direct Type Input */}
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="numeric"
                value={heightInput}
                onChange={(e) => handleHeightChange(e.target.value)}
                onBlur={handleHeightBlur}
                placeholder="उदा. 1500"
                className="w-full text-base font-black text-blue-950 pl-3 pr-11 py-2 border-2 border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-inner"
              />
              <span className="absolute right-3 text-xs font-black text-slate-400 pointer-events-none uppercase">
                MM
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              कीबोर्ड से सीधे ऊँचाई टाइप करें
            </span>
          </div>

          {/* 3. Track or Casement Mode & Application */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {activeSystem === 'sliding' ? 'TRACK & APPLICATION' : 'APPLICATION TYPE'}
            </label>
            {activeSystem === 'sliding' ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTrackType('2track')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                    trackType === '2track'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  2-Track (52mm)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackType('3track');
                    if (panelCount === 2) setPanelCount(3);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                    trackType === '3track'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  3-Track (112mm)
                </button>
              </div>
            ) : (
              <div className="py-1.5 px-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 text-center">
                Casement 60 Openable System
              </div>
            )}

            {/* Window / Door toggle */}
            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => setAppType('window')}
                className={`py-1 px-1.5 rounded-md text-[11px] font-bold border transition cursor-pointer text-center ${
                  appType === 'window'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🪟 Window
              </button>
              <button
                type="button"
                onClick={() => setAppType('door')}
                className={`py-1 px-1.5 rounded-md text-[11px] font-bold border transition cursor-pointer text-center ${
                  appType === 'door'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🚪 Door
              </button>
            </div>
          </div>

          {/* 4. Panel Count */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {activeSystem === 'sliding' ? 'PANEL COUNT (पल्ले)' : 'SHUTTER PANELS'}
            </label>
            {activeSystem === 'sliding' ? (
              <div className="grid grid-cols-3 gap-1.5">
                {[2, 3, 4].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPanelCount(p)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                      panelCount === p
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p} Panels
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 text-center">
                Single Openable Sash
              </div>
            )}

            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Area: <b className="text-slate-800">{calculations.windowAreaSqFt} Sq.Ft</b> ({((testWidth * testHeight) / 1000000).toFixed(2)} m²)
            </div>
          </div>
        </div>

        {/* Profile Configuration & Per-Sash Selection Engine */}
        <div className="flex flex-col gap-4 pt-3 border-t border-slate-200">
          {/* Top Bar: Frame Profile & Sash Mode Switcher */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Frame Profile Selector (Col 1-5) */}
            <div className="lg:col-span-5 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                <span>CHAUドド / TRACK FRAME PROFILE</span>
                <span className="text-blue-600 font-bold">Height: {activeFrame.height}mm</span>
              </label>
              <select
                value={selectedFrameId}
                onChange={(e) => setSelectedFrameId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white cursor-pointer focus:outline-hidden focus:border-blue-600 shadow-2xs"
              >
                {currentSeries.frames.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} - {f.name} (Height: {f.height}mm, Bead: {f.beadingSideHeight || 40}mm)
                  </option>
                ))}
              </select>
            </div>

            {/* SASH MODE SWITCHER TOGGLE (Col 6-12) */}
            <div className="lg:col-span-7 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" />
                  <span>सैश चयन विकल्प (SASH SELECTION MODE)</span>
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  {sashMode === 'per_sash' ? '🎛️ Per-Sash Active' : 'All Sashes Unified'}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSashMode('all_same')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    sashMode === 'all_same'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>🏢 सभी पल्ले समान</span>
                  <span className="text-[10px] font-normal text-slate-500 hidden sm:inline">(All Same)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSashMode('per_sash')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    sashMode === 'per_sash'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🎛️ प्रत्येक सैश अलग चुनें</span>
                  <span className="text-[10px] font-extrabold bg-white/30 text-white px-1.5 py-0.2 rounded-full hidden sm:inline">
                    Per Sash
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons for Factory Standard Configurations */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">त्वरित प्रीसेट:</span>
            {trackType === '3track' && (
              <button
                type="button"
                onClick={applyPreset3TrackGlassMesh}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="3-Track Factory Standard: Panel 1 & 2 Glass + Panel 3 Fly Mesh"
              >
                <span>⚡ 3-Track: 2 काँच + 1 मच्छरदानी जाली</span>
              </button>
            )}
            {trackType === '2track' && (
              <button
                type="button"
                onClick={applyPreset2TrackGlassMesh}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="2-Track: Panel 1 Glass + Panel 2 Fly Mesh"
              >
                <span>⚡ 2-Track: 1 काँच + 1 जाली पल्ला</span>
              </button>
            )}
            <button
              type="button"
              onClick={applyPresetAllGlass}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              title="All panels set to Glass"
            >
              <span>🪟 सभी काँच (All Glass)</span>
            </button>
          </div>

          {/* MODE A: ALL SASHES SAME (Simple unified dropdown) */}
          {sashMode === 'all_same' && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>UNIFIED SHUTTER / SASH PROFILE (सभी पल्लों का सैश)</span>
                  <span className="text-amber-700 font-bold">
                    Real Height: {activeSash.realHeight}mm • Bead Side: {activeSash.beadingSideHeight}mm
                  </span>
                </label>
                <select
                  value={selectedSashId}
                  onChange={(e) => {
                    setSelectedSashId(e.target.value);
                    setPerSashConfigs((prev) => prev.map((s) => ({ ...s, sashProfileId: e.target.value })));
                  }}
                  className="px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white cursor-pointer focus:outline-hidden focus:border-amber-600 shadow-2xs"
                >
                  {currentSeries.sashes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} (Real H: {s.realHeight}mm, Bead Side: {s.beadingSideHeight}mm)
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-[11px] text-slate-600 bg-white/80 rounded-lg p-2.5 border border-amber-200 flex items-center justify-between">
                <span>
                  💡 वर्तमान में विंडो के सभी <b>{panelCount} पल्लों</b> पर यही प्रोफ़ाइल लागू है। यदि किसी पल्ले को <b>मच्छरदानी जाली (Fly Mesh)</b> या अलग प्रोफ़ाइल बनाना हो, तो ऊपर <b>'प्रत्येक सैश अलग चुनें'</b> पर क्लिक करें।
                </span>
                <button
                  type="button"
                  onClick={() => setSashMode('per_sash')}
                  className="ml-2 text-amber-700 hover:text-amber-900 font-extrabold underline text-xs shrink-0 cursor-pointer"
                >
                  अलग चुनें →
                </button>
              </div>
            </div>
          )}

          {/* MODE B: PER SASH CUSTOM SELECTION ENGINE (हर पल्ला अलग चुनने का विकल्प) */}
          {sashMode === 'per_sash' && (
            <div className="bg-linear-to-b from-amber-500/5 via-orange-500/5 to-slate-50 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                      <span>प्रत्येक पल्ला कस्टमाइज़ेशन इंजन</span>
                      <span className="text-amber-700 text-xs font-mono font-bold">(Per Sash Dedicated Selector)</span>
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      यहाँ आप हर एक पल्ले (काँच vs मच्छरदानी जाली vs सॉलिड) की प्रोफ़ाइल, मटेरियल, लॉक व रोलर अलग-अलग तय कर सकते हैं।
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-700">सैश नेविगेटर:</span>
                  <span className="px-2 py-0.5 bg-amber-500 text-white font-black text-xs rounded-full">
                    {panelCount} Panels Total
                  </span>
                </div>
              </div>

              {/* INTERACTIVE SASH TABS */}
              <div className="flex flex-wrap gap-2">
                {(calculations.perSashList || []).map((sashItem, idx) => {
                  const isActive = activeSashIndex === idx;
                  return (
                    <button
                      key={sashItem.sashNumber}
                      type="button"
                      onClick={() => setActiveSashIndex(idx)}
                      className={`flex-1 min-w-[140px] p-2.5 rounded-xl border text-left transition cursor-pointer relative ${
                        isActive
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-amber-400 hover:bg-amber-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          पल्ला {sashItem.sashNumber}
                        </span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                            sashItem.isMesh
                              ? isActive ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
                              : sashItem.isSolid
                              ? isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
                              : isActive ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {sashItem.isMesh ? '🦟 जाली' : sashItem.isSolid ? '🚪 सॉलिड' : '🪟 ग्लास'}
                        </span>
                      </div>

                      <div className={`text-[11px] font-extrabold truncate mt-1 ${isActive ? 'text-amber-100' : 'text-slate-600'}`}>
                        {sashItem.profile.code}
                      </div>

                      <div className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-white/90' : 'text-slate-500'}`}>
                        {sashItem.sWidth} × {sashItem.sHeight} mm
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ACTIVE SASH DETAILED INSPECTOR CARD */}
              {(() => {
                const sList = calculations.perSashList || [];
                if (sList.length === 0) return null;
                const curIndex = Math.max(0, Math.min(activeSashIndex, sList.length - 1));
                const curSash = sList[curIndex];
                const curCfg = perSashConfigs[curIndex] || {
                  panelType: 'glass',
                  glassType: '5mm Clear Glass',
                  lockType: 'touch_lock_left',
                  rollerType: 'double_tandem',
                };

                if (!curSash) return null;

                return (
                  <div className="bg-white border-2 border-amber-300 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-xs">
                    {/* Active Sash Header Banner with Quick Live Sizing Badges */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {curSash.sashNumber}
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <span>पल्ला {curSash.sashNumber} सेटिंग्स ({curSash.isMesh ? 'मच्छरदानी जाली' : curSash.isSolid ? 'सॉलिड पैनल' : 'काँच सैश'})</span>
                            <span className="text-[10px] font-bold text-amber-800 bg-white border border-amber-300 px-2 py-0.5 rounded-full font-mono">
                              Profile: {curSash.profile.code}
                            </span>
                          </h4>
                          <span className="text-[11px] text-slate-600 font-medium">
                            Real Height: {curSash.sRealH}mm • Beading Side: {curSash.sBeadH}mm
                          </span>
                        </div>
                      </div>

                      {/* Live Sizes of this Specific Sash */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="bg-white border border-slate-300 px-2.5 py-1 rounded-lg text-center shadow-2xs">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">सैश कटिंग</span>
                          <span className="text-xs font-black text-amber-950 font-mono">
                            {curSash.sWidth} × {curSash.sHeight} mm
                          </span>
                        </div>
                        <div className="bg-white border border-slate-300 px-2.5 py-1 rounded-lg text-center shadow-2xs">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">
                            {curSash.isMesh ? 'जाली कटिंग' : 'काँच कटिंग'}
                          </span>
                          <span className="text-xs font-black text-blue-950 font-mono">
                            {curSash.infillW} × {curSash.infillH} mm
                          </span>
                        </div>
                        <div className="bg-white border border-slate-300 px-2.5 py-1 rounded-lg text-center shadow-2xs">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">GI स्टील कट</span>
                          <span className="text-xs font-black text-slate-900 font-mono">
                            {curSash.steelW} × {curSash.steelH} mm
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Inputs for this Sash */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* 1. Panel Function / Type */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          पल्ला प्रकार (FUNCTION / INFILL)
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => updatePerSash(curIndex, { panelType: 'glass', glassType: '5mm Clear Glass' })}
                            className={`py-1.5 px-1 rounded-lg text-[11px] font-black border transition cursor-pointer text-center ${
                              curCfg.panelType === 'glass'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            🪟 काँच
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePerSash(curIndex, { panelType: 'mesh', glassType: 'SS-304 Wire Mesh' })}
                            className={`py-1.5 px-1 rounded-lg text-[11px] font-black border transition cursor-pointer text-center ${
                              curCfg.panelType === 'mesh'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            🦟 जाली
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePerSash(curIndex, { panelType: 'solid_panel', glassType: 'UPVC Sandwich Board' })}
                            className={`py-1.5 px-1 rounded-lg text-[11px] font-black border transition cursor-pointer text-center ${
                              curCfg.panelType === 'solid_panel'
                                ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            🚪 सॉलिड
                          </button>
                        </div>
                      </div>

                      {/* 2. Sash Profile Override for this specific sash */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                          <span>सैश प्रोफ़ाइल (SASH PROFILE)</span>
                          <span className="text-[10px] text-amber-700 font-bold">{curSash.profile.code}</span>
                        </label>
                        <select
                          value={curCfg.sashProfileId || defaultSash.id}
                          onChange={(e) => updatePerSash(curIndex, { sashProfileId: e.target.value })}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white cursor-pointer focus:outline-hidden focus:border-amber-600"
                        >
                          {currentSeries.sashes.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code} - {s.name} ({s.realHeight}mm)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 3. Glass / Mesh Specification */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          {curCfg.panelType === 'mesh'
                            ? 'जाली प्रकार (MESH TYPE)'
                            : curCfg.panelType === 'solid_panel'
                            ? 'शीट प्रकार (PANEL MATERIAL)'
                            : 'काँच प्रकार (GLASS SPEC)'}
                        </label>
                        {curCfg.panelType === 'mesh' ? (
                          <select
                            value={curCfg.glassType}
                            onChange={(e) => updatePerSash(curIndex, { glassType: e.target.value })}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white cursor-pointer focus:outline-hidden focus:border-amber-600"
                          >
                            <option value="SS-304 Wire Mesh">SS-304 हैवी स्टील जाली (Heavy SS Mesh)</option>
                            <option value="Fiberglass Fine Mesh">फाइबर मेश (Fiberglass Mosquito Net)</option>
                            <option value="Aluminium Black Mesh">एल्युमिनियम ब्लैक मेश (Black Powder Coated)</option>
                            <option value="Pet Screen Heavy Mesh">पेट स्क्रीन हैवी जाली (Pet Screen)</option>
                          </select>
                        ) : curCfg.panelType === 'solid_panel' ? (
                          <select
                            value={curCfg.glassType}
                            onChange={(e) => updatePerSash(curIndex, { glassType: e.target.value })}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white cursor-pointer focus:outline-hidden focus:border-amber-600"
                          >
                            <option value="UPVC Sandwich Board">9mm uPVC सैंडविच शीट (Sandwich Board)</option>
                            <option value="Ventilation Louvers">वेंटिलेशन ल्युवर ब्लेड्स (Louver Blades)</option>
                            <option value="ACP Sheet 4mm">4mm ACP शीट (Aluminium Composite)</option>
                          </select>
                        ) : (
                          <select
                            value={curCfg.glassType}
                            onChange={(e) => updatePerSash(curIndex, { glassType: e.target.value })}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white cursor-pointer focus:outline-hidden focus:border-amber-600"
                          >
                            <option value="5mm Clear Glass">5mm सादा काँच (5mm Clear Glass)</option>
                            <option value="6mm Toughened Glass">6mm टफन काँच (6mm Toughened)</option>
                            <option value="8mm Toughened Clear">8mm टफन काँच (8mm Toughened)</option>
                            <option value="DGU 22mm (5+12A+5)">DGU डबल ग्लास 22mm (5+12+5 Soundproof)</option>
                            <option value="Frosted / Privacy Glass">धुंधला प्राइवेसी काँच (Frosted Glass)</option>
                            <option value="Tinted Bronze Glass">ब्राउज टिंटेड काँच (Tinted Bronze)</option>
                            <option value="Low-E Solar Glass">Low-E सोलर प्रोटेक्टेड काँच</option>
                          </select>
                        )}
                      </div>

                      {/* 4. Lock & Roller */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          हैंडल व रोलर (HARDWARE)
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={curCfg.lockType}
                            onChange={(e) => updatePerSash(curIndex, { lockType: e.target.value })}
                            className="px-2 py-1.5 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-900 bg-white cursor-pointer"
                          >
                            <option value="touch_lock_left">टच लॉक बायाँ</option>
                            <option value="touch_lock_right">टच लॉक दायाँ</option>
                            <option value="crescent_lock">क्रेसेंट लॉक</option>
                            <option value="pop_up_key">पॉप-अप चाबी लॉक</option>
                            <option value="flush_pull">फ्लश हैंडल (D-Pull)</option>
                          </select>

                          <select
                            value={curCfg.rollerType}
                            onChange={(e) => updatePerSash(curIndex, { rollerType: e.target.value })}
                            className="px-2 py-1.5 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-900 bg-white cursor-pointer"
                          >
                            <option value="double_tandem">डबल टैंडम रोलर</option>
                            <option value="single_nylon">सिंगल नायलॉन</option>
                            <option value="heavy_steel">हैवी स्टील रोलर</option>
                            <option value="mesh_roller">मेश जाली रोलर</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      )}

      {/* VIEW SELECTOR TABS: Live Formula Working vs Cards vs Schematic */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('formulaFlow')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              viewMode === 'formulaFlow'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>⚡ लाइव फॉर्मूला स्टेप्स (Live Formula Math)</span>
            <span className="bg-white/30 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
              ACTIVE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>📦 कटिंग कार्ड्स (Cutting Cards)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('cadDiagram')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              viewMode === 'cadDiagram'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
            <span>📐 स्केमेटिक डायग्राम (CAD Schematic)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
            }`}
          >
            <span>सभी देखें (All)</span>
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-500 pr-2 hidden sm:block">
          कुल 10 चरण • संख्याएँ बदलते ही ऑटो-कैल्कुलेट
        </div>
      </div>

      {/* =========================================================================
          SECTION A: LIVE FORMULA WORKING ENGINE (फॉर्मूला काम करते हुए देखें)
         ========================================================================= */}
      {(viewMode === 'formulaFlow' || viewMode === 'all') && (
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  ∑
                </div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {activeSystem === 'sliding' ? 'स्लाइडिंग' : 'केसमेंट'} फॉर्मूला स्टेप-बाई-स्टेप गणितीय गणना (Live Calculation Proof)
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                नीचे प्रत्येक स्टेप में देखें कि कैसे माप, प्रोफ़ाइल डायमेंशन और नियम की संख्याएँ फॉर्मूले में बैठती हैं:
              </p>
            </div>

            <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              Real-Time Dynamic Math
            </span>
          </div>

          {/* Sash Focus Filter for Live Formula Calculations */}
          {activeSystem === 'sliding' && (calculations.perSashList || []).length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 p-3 rounded-xl border border-amber-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" />
                  <span>पल्ला अनुसार फॉर्मूला देखें (Formula for Sash):</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFormulaSashIndex(-1)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    selectedFormulaSashIndex === -1
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  🌐 संपूर्ण विंडो (All Sashes)
                </button>
                {(calculations.perSashList || []).map((s, idx) => (
                  <button
                    key={s.sashNumber}
                    type="button"
                    onClick={() => setSelectedFormulaSashIndex(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      selectedFormulaSashIndex === idx
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{s.isMesh ? '🦟' : s.isSolid ? '🚪' : '🪟'} {s.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({s.profile.code})</span>
                  </button>
                ))}
              </div>

              {selectedFormulaSashIndex >= 0 && (calculations.perSashList || [])[selectedFormulaSashIndex] && (
                <div className="text-[11px] font-bold text-amber-900 bg-white/90 px-2.5 py-1 rounded-lg border border-amber-300">
                  फोकस्ड: <b>{(calculations.perSashList || [])[selectedFormulaSashIndex].name}</b> ({(calculations.perSashList || [])[selectedFormulaSashIndex].profile.code})
                </div>
              )}
            </div>
          )}

          {activeSystem === 'sliding' ? (
            /* =========================================================
               SLIDING FORMULA WORKING STEPS (1 TO 8)
               ========================================================= */
            <div className="grid grid-cols-1 gap-5">
              
              {/* STEP 1: Outer Frame Cutting */}
              <div className="bg-slate-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs hover:border-blue-400 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 1: आउटर फ्रेम कटिंग साइज़ (Outer Frame Cutting)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    45° Miter Cut • 4 Pieces
                  </span>
                </div>

                {/* Formula Equation in words */}
                <div className="bg-white border border-blue-100 rounded-lg p-3 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-800">
                  <span className="font-bold text-slate-500">फार्मूला:</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-900 rounded font-bold">आउटर कटिंग साइज़</span>
                  <span>=</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold">विंडो माप (W / H)</span>
                  <span>+</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">6mm वेल्डिंग अलाउंस</span>
                </div>

                {/* Substituted Numbers Live Math */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-blue-800 uppercase">
                      चौड़ाई कटिंग (Top & Bottom Track)
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5 font-mono">
                      <span className="text-blue-700">{testWidth}mm</span>
                      <span>+</span>
                      <span className="text-amber-700">6mm</span>
                      <span>=</span>
                      <span className="text-xl text-blue-950 font-black">{calculations.outerCutW} mm</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      मात्रा: 2 Pcs (ऊपर और नीचे)
                    </div>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-blue-800 uppercase">
                      ऊँचाई कटिंग (Left & Right Track)
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5 font-mono">
                      <span className="text-blue-700">{testHeight}mm</span>
                      <span>+</span>
                      <span className="text-amber-700">6mm</span>
                      <span>=</span>
                      <span className="text-xl text-blue-950 font-black">{calculations.outerCutH} mm</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      मात्रा: 2 Pcs (बाएँ और दाएँ)
                    </div>
                  </div>
                </div>

                {/* Factory Niyam Explanation */}
                <div className="text-[11px] text-slate-600 bg-white rounded-lg p-2.5 border border-slate-200 flex items-start gap-1.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <b>+6mm क्यों जोड़ते हैं?</b> दोनों कोनों पर 45° कटिंग के बाद जब वेल्डिंग मशीन की हीटर प्लेट प्रोफाइल को पिघलाती है, तो 3mm-3mm दोनों तरफ (कुल 6mm) प्लास्टिक पिघलकर खत्म हो जाता है। अतः +6mm जोड़ने पर वेल्डिंग के बाद फ्रेम ठीक <b>{testWidth}mm × {testHeight}mm</b> का तैयार होता है।
                  </span>
                </div>
              </div>

              {/* STEP 2: Frame Deduction */}
              <div className="bg-slate-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs hover:border-amber-400 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 2: स्लाइडिंग फ्रेम डिडक्शन (Frame Deduction Calculation)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                    Track Clearance Formula
                  </span>
                </div>

                <div className="bg-white border border-amber-100 rounded-lg p-3 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-800">
                  <span className="font-bold text-slate-500">फार्मूला:</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-900 rounded font-bold">फ्रेम डिडक्शन</span>
                  <span>=</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold">(Frame Height × 2)</span>
                  <span>-</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-900 rounded font-bold">16mm ट्रैक चैनल डेप्थ</span>
                </div>

                {/* Substituted Numbers Live Math */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-amber-900">
                    लाइव गणित (Live Substitution):
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1 flex flex-wrap items-center gap-2 font-mono">
                    <span>({calculations.fHeight} × 2) - 16</span>
                    <span>=</span>
                    <span className="text-amber-800">{calculations.fHeightDouble} - 16</span>
                    <span>=</span>
                    <span className="text-2xl text-amber-950 font-black px-2 py-0.5 bg-white border border-amber-300 rounded-md">
                      {calculations.frameDeduction} mm
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white rounded-lg p-2.5 border border-slate-200 flex items-start gap-1.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <b>-16mm क्यों घटाया जाता है?</b> फ्रेम की ऊपरी और निचली प्रोफ़ाइल की ऊँचाई ({calculations.fHeight}mm + {calculations.fHeight}mm = {calculations.fHeightDouble}mm) होती है। लेकिन स्लाइडिंग पल्ला ट्रैक के चैनल में ऊपर 8mm और नीचे 8mm अंदर धँसकर चलता है। इसलिए 8mm + 8mm = 16mm वापस घट जाता है, जिससे कुल डिडक्शन <b>{calculations.frameDeduction}mm</b> बनता है।
                  </span>
                </div>
              </div>

              {/* STEP 3: Sliding Sash Height */}
              <div className="bg-slate-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs hover:border-emerald-400 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">
                      3
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 3: स्लाइडिंग सैश की ऊँचाई (Sliding Sash Height)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    45° Miter Cut • {panelCount * 2} Pieces
                  </span>
                </div>

                <div className="bg-white border border-emerald-100 rounded-lg p-3 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-800">
                  <span className="font-bold text-slate-500">फार्मूला:</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 rounded font-bold">Sash Height</span>
                  <span>=</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-900 rounded font-semibold">Outer Cut Height ({calculations.outerCutH}mm)</span>
                  <span>-</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-900 rounded font-semibold">फ्रेम डिडक्शन ({calculations.frameDeduction}mm)</span>
                </div>

                {/* Substituted Numbers Live Math */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-emerald-900">
                    लाइव गणित (Live Substitution):
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1 flex flex-wrap items-center gap-2 font-mono">
                    <span className="text-blue-700">{calculations.outerCutH} mm</span>
                    <span>-</span>
                    <span className="text-amber-700">{calculations.frameDeduction} mm</span>
                    <span>=</span>
                    <span className="text-2xl text-emerald-950 font-black px-2.5 py-0.5 bg-white border border-emerald-300 rounded-md">
                      {calculations.sashH} mm
                    </span>
                    <span className="text-xs font-semibold text-slate-500 ml-2">
                      (सभी {panelCount} पल्लों की ऊँचाई यही रहेगी)
                    </span>
                  </div>
                </div>
              </div>

              {/* STEP 4: Inter-Panel Overlap */}
              <div className="bg-slate-50 border border-purple-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs hover:border-purple-400 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center">
                      4
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 4: पल्लों का ओवरलैप (Inter-Panel Overlap Calculation)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                    Seal & Overlap Math
                  </span>
                </div>

                <div className="bg-white border border-purple-100 rounded-lg p-3 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-800">
                  <span className="font-bold text-slate-500">फार्मूला:</span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-900 rounded font-bold">Overlap</span>
                  <span>=</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold">(Sash Real Height / 2)</span>
                  <span>+</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold">4mm वूलपाइल सील अलाउंस</span>
                </div>

                {/* Substituted Numbers Live Math */}
                <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-purple-900">
                    लाइव गणित (Live Substitution):
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1 flex flex-wrap items-center gap-2 font-mono">
                    <span>({calculations.sashRealH} / 2) + 4</span>
                    <span>=</span>
                    <span className="text-purple-700">{calculations.halfSash} + 4</span>
                    <span>=</span>
                    <span className="text-2xl text-purple-950 font-black px-2.5 py-0.5 bg-white border border-purple-300 rounded-md">
                      {calculations.overlap} mm
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white rounded-lg p-2.5 border border-slate-200 flex items-start gap-1.5">
                  <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    जब दोनों पल्ले बीच में एक-दूसरे के ऊपर चढ़ते हैं (overlap), तो सैश प्रोफ़ाइल की आधी चौड़ाई ({calculations.halfSash}mm) और 4mm इण्टरलॉक वूलपाइल सील का गैप मिलकर <b>{calculations.overlap}mm</b> का ओवरलैप बनाता है।
                  </span>
                </div>
              </div>

              {/* STEP 5: Sliding Sash Width */}
              <div className="bg-slate-50 border border-indigo-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs hover:border-indigo-400 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                      5
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 5: प्रत्येक पल्ले की चौड़ाई (Sliding Sash Width)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
                    45° Miter Cut • {panelCount * 2} Pieces
                  </span>
                </div>

                <div className="bg-white border border-indigo-100 rounded-lg p-3 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-800">
                  <span className="font-bold text-slate-500">फार्मूला:</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 rounded font-bold">Sash Width</span>
                  <span>=</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold">[(Outer Cut W - Frame Deduction) / Panels]</span>
                  <span>+</span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-900 rounded font-semibold">Overlap ({calculations.overlap}mm)</span>
                </div>

                {/* Substituted Numbers Live Math */}
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-indigo-900">
                    लाइव गणित (Live Multi-Step Math):
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">कदम A (कुल अंदरूनी जगह):</span>
                      <span className="font-bold text-slate-800">
                        {calculations.outerCutW} - {calculations.frameDeduction} = <b>{calculations.innerClearanceW} mm</b>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">कदम B ({panelCount} पल्लों में बराबर बँटवारा):</span>
                      <span className="font-bold text-slate-800">
                        {calculations.innerClearanceW} / {panelCount} = <b>{calculations.perPanelBase} mm</b>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-indigo-200">
                      <span className="text-indigo-900 font-extrabold">कदम C (+ ओवरलैप जोड़ने पर):</span>
                      <span className="text-sm font-black text-slate-900">
                        {calculations.perPanelBase} + {calculations.overlap} = 
                        <span className="text-2xl text-indigo-950 font-black ml-2 px-2.5 py-0.5 bg-white border border-indigo-300 rounded-md">
                          {calculations.sashW} mm
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 6: Glass Deduction & Cut Dimensions */}
              <div className="bg-slate-50 border border-emerald-300 rounded-xl p-4 flex flex-col gap-3 shadow-2xs hover:border-emerald-400 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center">
                      6
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 6: काँच का कटिंग डिडक्शन व साइज़ (Glass Deduction & Sizing)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    90° Square Cut • {panelCount} Panes
                  </span>
                </div>

                <div className="bg-white border border-emerald-100 rounded-lg p-3 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-800">
                  <span className="font-bold text-slate-500">डिडक्शन फार्मूला:</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 rounded font-bold">Glass Deduction</span>
                  <span>=</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold">(Beading Side Height × 2)</span>
                  <span>+</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">10mm रबर गैस्केट क्लीयरेंस</span>
                </div>

                {/* Substituted Numbers Live Math */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">
                      डिडक्शन वैल्यू (Deduction)
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-1 font-mono">
                      ({calculations.beadSideH} × 2) + 10 = <span className="text-lg text-emerald-950 font-black">-{calculations.glassDeduction} mm</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      दोनों सिरों से बीड़िंग गहराई + रबर
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">
                      काँच की चौड़ाई (Glass Width)
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-1 font-mono">
                      {calculations.sashW} - {calculations.glassDeduction} = <span className="text-lg text-emerald-950 font-black">{calculations.glassW} mm</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Sash W - Glass Deduction
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">
                      काँच की ऊँचाई (Glass Height)
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-1 font-mono">
                      {calculations.sashH} - {calculations.glassDeduction} = <span className="text-lg text-emerald-950 font-black">{calculations.glassH} mm</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Sash H - Glass Deduction
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-200 text-emerald-950 font-bold">
                  <span>कुल काँच का क्षेत्रफल (Total Glass Area):</span>
                  <span className="text-sm font-black">{calculations.glassAreaSqFt} Sq.Ft ({panelCount} पल्लों का कुल)</span>
                </div>
              </div>

              {/* STEP 7: Glazing Beading & Interlock Profile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Beading */}
                <div className="bg-slate-50 border border-indigo-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                        7
                      </span>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        ग्लेज़िंग बीडिंग (Glazing Beading)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      Glass + 4mm
                    </span>
                  </div>

                  <div className="bg-white border border-indigo-100 rounded-lg p-2.5 text-xs font-mono space-y-1">
                    <div>
                      Width: {calculations.glassW} + 4 = <b className="text-indigo-950 text-sm">{calculations.beadW} mm</b> (Qty: {panelCount * 2} Pcs)
                    </div>
                    <div>
                      Height: {calculations.glassH} + 4 = <b className="text-indigo-950 text-sm">{calculations.beadH} mm</b> (Qty: {panelCount * 2} Pcs)
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    +4mm क्यों? कोनों पर 45° मिर्टर कट में बीड़िंग आसानी से खांचे में लॉक होने के लिए काँच से 4mm बड़ी काटी जाती है।
                  </div>
                </div>

                {/* Interlock */}
                <div className="bg-slate-50 border border-purple-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center">
                        8
                      </span>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        इण्टरलॉक प्रोफाइल (Interlock Profile)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Sash H - 16mm
                    </span>
                  </div>

                  <div className="bg-white border border-purple-100 rounded-lg p-2.5 text-xs font-mono space-y-1">
                    <div>
                      लम्बाई: {calculations.sashH} - 16 = <b className="text-purple-950 text-sm">{calculations.interlockH} mm</b>
                    </div>
                    <div>
                      मात्रा: ({panelCount} - 1) × 2 = <b className="text-purple-950 text-sm">{calculations.interlockQty} Pieces</b>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    -16mm क्यों? ऊपर और नीचे 8mm-8mm क्लीयरेंस ट्रैक पर पल्ला आसानी से सरकने के लिए रखी जाती है।
                  </div>
                </div>
              </div>

              {/* STEP 8: GI Steel Reinforcements */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center">
                      9
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      GI स्टील रिइन्फोर्समेंट (GI Steel Reinforcement Math)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">
                    90° Square Cut Steel
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-slate-600 uppercase">
                      आउटर फ्रेम स्टील (-100mm Deduction)
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-800 mt-1 space-y-1">
                      <div>चौड़ाई स्टील: {calculations.outerCutW} - 100 = <b className="text-slate-950">{calculations.outerSteelW} mm</b> (Qty: 2)</div>
                      <div>ऊँचाई स्टील: {calculations.outerCutH} - 100 = <b className="text-slate-950">{calculations.outerSteelH} mm</b> (Qty: 2)</div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-slate-600 uppercase">
                      सैश स्टील (-{calculations.sashSteelDeduction}mm Deduction)
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-800 mt-1 space-y-1">
                      <div>चौड़ाई स्टील: {calculations.sashW} - {calculations.sashSteelDeduction} = <b className="text-slate-950">{calculations.sashSteelW} mm</b> (Qty: {panelCount * 2})</div>
                      <div>ऊँचाई स्टील: {calculations.sashH} - {calculations.sashSteelDeduction} = <b className="text-slate-950">{calculations.sashSteelH} mm</b> (Qty: {panelCount * 2})</div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500">
                  -100mm क्यों? वेल्डिंग के समय स्टील हीटर प्लेट के सम्पर्क में न आए, इसलिए कोने से 50mm-50mm पीछे रखा जाता है।
                </div>
              </div>

              {/* STEP 10: PER-SASH MASTER FABRICATION SHEET (प्रत्येक पल्ले की सम्पूर्ण कटिंग लिस्ट शीट) */}
              <div className="bg-linear-to-b from-amber-500/10 via-white to-slate-50 border-2 border-amber-400 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      10
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span>चरण 10: प्रत्येक पल्ले की सम्पूर्ण कटिंग लिस्ट शीट (Per-Sash Master Cutting Sheet)</span>
                        <span className="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded-full">
                          फैक्ट्री रेडी
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600">
                        विंडो के सभी {panelCount} पल्लों का अलग-अलग सैश, काँच/जाली, बीड़िंग व स्टील कटिंग साइज़:
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-amber-950 bg-white border border-amber-300 px-3 py-1 rounded-lg self-start sm:self-auto">
                    कुल {panelCount} पल्ले • {calculations.windowAreaSqFt} Sq.Ft
                  </span>
                </div>

                {/* Comprehensive Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold text-[11px] uppercase">
                        <th className="p-2.5 rounded-tl-lg">पल्ला (Sash)</th>
                        <th className="p-2.5">प्रकार (Infill)</th>
                        <th className="p-2.5">सैश प्रोफ़ाइल (Profile)</th>
                        <th className="p-2.5 text-center">सैश कट (45° Miter)</th>
                        <th className="p-2.5 text-center">काँच / जाली कट (90°)</th>
                        <th className="p-2.5 text-center">ग्लेज़िंग बीड (45°)</th>
                        <th className="p-2.5 text-center">GI स्टील (90°)</th>
                        <th className="p-2.5 rounded-tr-lg">हार्डवेयर</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
                      {(calculations.perSashList || []).map((sashItem) => (
                        <tr key={sashItem.sashNumber} className="hover:bg-amber-50/50 transition">
                          {/* Col 1: Sash Name */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                                {sashItem.sashNumber}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 block">{sashItem.name}</span>
                                <span className="text-[10px] text-slate-500">Track: {sashItem.sashNumber <= 2 ? 'Track 1/2' : 'Track 3'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Panel Type */}
                          <td className="p-2.5">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase inline-flex items-center gap-1 ${
                                sashItem.isMesh
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : sashItem.isSolid
                                  ? 'bg-slate-200 text-slate-900 border border-slate-300'
                                  : 'bg-blue-100 text-blue-900 border border-blue-300'
                              }`}
                            >
                              {sashItem.isMesh ? '🦟 मच्छरदानी जाली' : sashItem.isSolid ? '🚪 सॉलिड पैनल' : '🪟 ग्लास'}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5 truncate max-w-[120px]">
                              {sashItem.glassType}
                            </span>
                          </td>

                          {/* Col 3: Sash Profile */}
                          <td className="p-2.5 font-mono">
                            <b className="text-amber-950 block">{sashItem.profile.code}</b>
                            <span className="text-[10px] text-slate-500">H: {sashItem.sRealH}mm</span>
                          </td>

                          {/* Col 4: Sash Cutting */}
                          <td className="p-2.5 text-center font-mono bg-amber-50/40">
                            <div className="font-black text-amber-950 text-xs">
                              {sashItem.sWidth} × {sashItem.sHeight} mm
                            </div>
                            <span className="text-[10px] text-slate-500">
                              W: 2 Pcs • H: 2 Pcs
                            </span>
                          </td>

                          {/* Col 5: Glass / Mesh Cut */}
                          <td className="p-2.5 text-center font-mono bg-blue-50/40">
                            <div className="font-black text-blue-950 text-xs">
                              {sashItem.infillW} × {sashItem.infillH} mm
                            </div>
                            <span className="text-[10px] text-blue-700 font-semibold">
                              Deduction: -{sashItem.infillDeduction}mm ({sashItem.infillAreaSqFt} sqft)
                            </span>
                          </td>

                          {/* Col 6: Beading */}
                          <td className="p-2.5 text-center font-mono">
                            <div className="font-bold text-slate-800 text-xs">
                              {sashItem.beadW} × {sashItem.beadH} mm
                            </div>
                            <span className="text-[10px] text-slate-500">
                              4 Pcs (Glass+4mm)
                            </span>
                          </td>

                          {/* Col 7: Steel */}
                          <td className="p-2.5 text-center font-mono bg-slate-50">
                            <div className="font-bold text-slate-900 text-xs">
                              {sashItem.steelW} × {sashItem.steelH} mm
                            </div>
                            <span className="text-[10px] text-slate-500">
                              -{sashItem.steelDeduction}mm (4 Pcs)
                            </span>
                          </td>

                          {/* Col 8: Hardware */}
                          <td className="p-2.5 text-[11px] text-slate-700">
                            <div className="font-bold">{sashItem.lockType}</div>
                            <div className="text-[10px] text-slate-500">{sashItem.rollerType}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            /* =========================================================
               CASEMENT FORMULA WORKING STEPS (EXACT CASEMENT RULE DETAIL)
               ========================================================= */
            <div className="grid grid-cols-1 gap-5">
              
              {/* STEP 1: Casement Outer Frame */}
              <div className="bg-slate-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 1: आउटर फ्रेम कटिंग साइज़ (Outer Frame Cutting)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                    Outer Size = Design Size + 6mm
                  </span>
                </div>

                <div className="bg-white border border-blue-100 rounded-lg p-3 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-800">
                  <span className="font-bold text-slate-500">नियम:</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-900 rounded font-bold">आउटर कटिंग</span>
                  <span>=</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold">डिज़ाइन माप (W / H)</span>
                  <span>+</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">6mm वेल्डिंग अलाउंस (3mm + 3mm दोनों कोने)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-blue-800 uppercase">
                      <span>चौड़ाई कटिंग (Top & Bottom):</span>
                      <span className="text-blue-600">45° Miter Cut</span>
                    </div>
                    <span className="text-base font-black text-blue-950 mt-1 block">
                      {testWidth} + 6 = {calculations.outerCutW} mm (Qty: 2 Pcs)
                    </span>
                  </div>
                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-blue-800 uppercase">
                      <span>ऊँचाई कटिंग (Left & Right):</span>
                      <span className="text-blue-600">45° Miter Cut</span>
                    </div>
                    <span className="text-base font-black text-blue-950 mt-1 block">
                      {testHeight} + 6 = {calculations.outerCutH} mm (Qty: 2 Pcs)
                    </span>
                  </div>
                </div>
              </div>

              {/* STEP 2: Sash / Palla Size (Casement Formula) */}
              <div className="bg-slate-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 2: सैश पल्ला कटिंग साइज़ (Casement Sash / Palla Size)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full font-mono">
                    Sash = Outer Size - ((Beding_Side × 2) - 16)
                  </span>
                </div>

                <div className="bg-white border border-amber-100 rounded-lg p-3 flex flex-col gap-1.5 text-xs">
                  <div className="text-slate-700 font-medium">
                    Sash H aur W dono ke liye is niyam ka upyog hoga (Outer Size = Design Size + 6mm).
                  </div>
                  <div className="font-mono text-slate-900 bg-amber-50/60 p-2 rounded border border-amber-200">
                    <div>• Frame Beding Side = <b>{calculations.frameBeadSide} mm</b> ({activeFrame.code})</div>
                    <div>• कुल डिडक्शन = (({calculations.frameBeadSide} × 2) - 16) = {calculations.fHeightDouble} - 16 = <b className="text-amber-900">{calculations.sashDeduction} mm</b></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-amber-900 uppercase">
                      <span>सैश चौड़ाई (Sash Width):</span>
                      <span className="text-amber-700">45° Miter Cut</span>
                    </div>
                    <span className="text-base font-black text-amber-950 mt-1 block">
                      {calculations.outerCutW} - {calculations.sashDeduction} = {calculations.sashW} mm (Qty: 2 Pcs)
                    </span>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-amber-900 uppercase">
                      <span>सैश ऊँचाई (Sash Height):</span>
                      <span className="text-amber-700">45° Miter Cut</span>
                    </div>
                    <span className="text-base font-black text-amber-950 mt-1 block">
                      {calculations.outerCutH} - {calculations.sashDeduction} = {calculations.sashH} mm (Qty: 2 Pcs)
                    </span>
                  </div>
                </div>
              </div>

              {/* STEP 3: Glass Size */}
              <div className="bg-slate-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">
                      3
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 3: काँच कटिंग साइज़ (Glass Size)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
                    Glass = Sash - (Sash_Beading × 2) - 8
                  </span>
                </div>

                <div className="bg-white border border-emerald-100 rounded-lg p-3 flex flex-col gap-1.5 text-xs">
                  <div className="text-slate-700 font-medium">
                    Sash size se beading side height × 2 aur -8mm clearance ghataya jata hai.
                  </div>
                  <div className="font-mono text-slate-900 bg-emerald-50/60 p-2 rounded border border-emerald-200">
                    <div>• Sash Beading Side Height = <b>{calculations.beadSideH} mm</b> ({activeSash.code})</div>
                    <div>• कुल ग्लास डिडक्शन = ({calculations.beadSideH} × 2) + 8 = <b className="text-emerald-950">{calculations.glassDeduction} mm</b></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-emerald-900 uppercase">
                      <span>काँच चौड़ाई (Glass Width):</span>
                      <span className="text-emerald-700">90° Square Cut</span>
                    </div>
                    <span className="text-base font-black text-emerald-950 mt-1 block">
                      {calculations.sashW} - {calculations.glassDeduction} = {calculations.glassW} mm (Qty: 1 Pane)
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-emerald-900 uppercase">
                      <span>काँच ऊँचाई (Glass Height):</span>
                      <span className="text-emerald-700">90° Square Cut</span>
                    </div>
                    <span className="text-base font-black text-emerald-950 mt-1 block">
                      {calculations.sashH} - {calculations.glassDeduction} = {calculations.glassH} mm (Qty: 1 Pane)
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-between bg-emerald-100/60 px-3 py-1.5 rounded-lg">
                  <span>ग्लास क्षेत्रफल (Glass Area): {calculations.glassAreaSqFt} Sq.Ft</span>
                  <span>काँच प्रकार: 5mm Clear Float Glass</span>
                </div>
              </div>

              {/* STEP 4: Beading Size */}
              <div className="bg-slate-50 border border-purple-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center">
                      4
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 4: ग्लेज़िंग बीडिंग कटिंग साइज़ (Glazing Beading Size)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full font-mono">
                    Beading = Glass Size + 4mm
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-purple-900 uppercase">
                      <span>बीडिंग चौड़ाई (Top & Bottom):</span>
                      <span className="text-purple-700">45° Miter Cut</span>
                    </div>
                    <span className="text-base font-black text-purple-950 mt-1 block">
                      {calculations.glassW} + 4 = {calculations.beadW} mm (Qty: 2 Pcs)
                    </span>
                  </div>
                  <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-purple-900 uppercase">
                      <span>बीडिंग ऊँचाई (Left & Right):</span>
                      <span className="text-purple-700">45° Miter Cut</span>
                    </div>
                    <span className="text-base font-black text-purple-950 mt-1 block">
                      {calculations.glassH} + 4 = {calculations.beadH} mm (Qty: 2 Pcs)
                    </span>
                  </div>
                </div>
              </div>

              {/* STEP 5: GI Steel Reinforcements */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center">
                      5
                    </span>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      चरण 5: जीआई स्टील रीइन्फोर्समेंट (GI Steel Reinforcement)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                    Outer -100mm | Sash -110mm
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] font-bold text-slate-700 uppercase block">चौखट स्टील (Outer Frame Steel):</span>
                    <div className="mt-1 space-y-1">
                      <div>W: {calculations.outerCutW} - 100 = <b>{calculations.outerSteelW} mm</b> (Qty: 2 Pcs)</div>
                      <div>H: {calculations.outerCutH} - 100 = <b>{calculations.outerSteelH} mm</b> (Qty: 2 Pcs)</div>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] font-bold text-slate-700 uppercase block">सैश पल्ला स्टील (Sash Steel):</span>
                    <div className="mt-1 space-y-1">
                      <div>W: {calculations.sashW} - 110 = <b>{calculations.sashSteelW} mm</b> (Qty: 2 Pcs)</div>
                      <div>H: {calculations.sashH} - 110 = <b>{calculations.sashSteelH} mm</b> (Qty: 2 Pcs)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 6: Factory Production Cutting Summary Sheet */}
              <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    📋 केसमेंट फैक्ट्री कटिंग समरी तालिका (Casement Cutting Summary)
                  </h4>
                  <span className="text-[11px] text-amber-300 font-mono font-bold">
                    {testWidth} × {testHeight} mm
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">प्रोफाइल / मद</th>
                        <th className="px-3 py-2">कोड</th>
                        <th className="px-3 py-2">कटिंग साइज़ (Cut Size)</th>
                        <th className="px-3 py-2">कट डिग्री</th>
                        <th className="px-3 py-2 text-center">संख्या (Qty)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-3 py-2 font-bold text-blue-900">चौखट टॉप व बॉटम (Outer Top/Bottom)</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{activeFrame.code}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{calculations.outerCutW} mm</td>
                        <td className="px-3 py-2 text-slate-600">45° / 45°</td>
                        <td className="px-3 py-2 text-center font-bold">2 Pcs</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-blue-900">चौखट लेफ्ट व राइट (Outer Left/Right)</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{activeFrame.code}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{calculations.outerCutH} mm</td>
                        <td className="px-3 py-2 text-slate-600">45° / 45°</td>
                        <td className="px-3 py-2 text-center font-bold">2 Pcs</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-amber-900">सैश पल्ला चौड़ाई (Sash Width)</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{activeSash.code}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{calculations.sashW} mm</td>
                        <td className="px-3 py-2 text-slate-600">45° / 45°</td>
                        <td className="px-3 py-2 text-center font-bold">2 Pcs</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-amber-900">सैश पल्ला ऊँचाई (Sash Height)</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{activeSash.code}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{calculations.sashH} mm</td>
                        <td className="px-3 py-2 text-slate-600">45° / 45°</td>
                        <td className="px-3 py-2 text-center font-bold">2 Pcs</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-emerald-900">ग्लास पैनल (Glass Pane)</td>
                        <td className="px-3 py-2 font-mono text-slate-600">5mm Float</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{calculations.glassW} × {calculations.glassH} mm</td>
                        <td className="px-3 py-2 text-slate-600">90° Square</td>
                        <td className="px-3 py-2 text-center font-bold">1 Pane</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-purple-900">ग्लेज़िंग बीडिंग चौड़ाई (Beading Width)</td>
                        <td className="px-3 py-2 font-mono text-slate-600">GB-12</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{calculations.beadW} mm</td>
                        <td className="px-3 py-2 text-slate-600">45° / 45°</td>
                        <td className="px-3 py-2 text-center font-bold">2 Pcs</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-purple-900">ग्लेज़िंग बीडिंग ऊँचाई (Beading Height)</td>
                        <td className="px-3 py-2 font-mono text-slate-600">GB-12</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{calculations.beadH} mm</td>
                        <td className="px-3 py-2 text-slate-600">45° / 45°</td>
                        <td className="px-3 py-2 text-center font-bold">2 Pcs</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-slate-700">चौखट स्टील रीइन्फोर्समेंट</td>
                        <td className="px-3 py-2 font-mono text-slate-600">GI Steel</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">W: {calculations.outerSteelW} / H: {calculations.outerSteelH} mm</td>
                        <td className="px-3 py-2 text-slate-600">90°</td>
                        <td className="px-3 py-2 text-center font-bold">4 Pcs</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-bold text-slate-700">सैश स्टील रीइन्फोर्समेंट</td>
                        <td className="px-3 py-2 font-mono text-slate-600">GI Steel</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">W: {calculations.sashSteelW} / H: {calculations.sashSteelH} mm</td>
                        <td className="px-3 py-2 text-slate-600">90°</td>
                        <td className="px-3 py-2 text-center font-bold">4 Pcs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          SECTION B: DETAILED PROFILE CARDS WITH EXPANDABLE FORMULA STEPS
         ========================================================================= */}
      {(viewMode === 'cards' || viewMode === 'all') && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>FACTORY PROFILE CUTTING CARDS (प्रत्येक कार्ड में 'फॉर्मूला देखें' बटन खोलें)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 1. OUTER FRAME CARD */}
            <div className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Outer Frame (आउटर फ्रेम)
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {activeFrame.code} (45° Miter Cut)
                      </span>
                    </div>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Qty: 4 Pieces
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      TOP & BOTTOM (चौड़ाई)
                    </span>
                    <span className="text-xl font-black text-blue-950 block mt-0.5">
                      {calculations.outerCutW} <span className="text-xs font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Qty: 2 Pcs (45°/45°)
                    </span>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      LEFT & RIGHT (ऊँचाई)
                    </span>
                    <span className="text-xl font-black text-blue-950 block mt-0.5">
                      {calculations.outerCutH} <span className="text-xs font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Qty: 2 Pcs (45°/45°)
                    </span>
                  </div>
                </div>
              </div>

              {/* Inline Collapsible Formula Viewer */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleCardExpand('frame')}
                  className="w-full flex items-center justify-between text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer p-1"
                >
                  <span className="flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>फॉर्मूला लाइव देखें (Formula Proof)</span>
                  </span>
                  {expandedCard.frame ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedCard.frame && (
                  <div className="mt-2 text-[11px] text-slate-600 bg-blue-50/70 rounded-lg p-2.5 space-y-1 font-mono border border-blue-100">
                    <div className="font-bold text-blue-950">Formula: Window Size + 6mm (+3mm each weld)</div>
                    <div>W: {testWidth} + 6 = <b>{calculations.outerCutW}mm</b></div>
                    <div>H: {testHeight} + 6 = <b>{calculations.outerCutH}mm</b></div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. SASH PROFILES CARD */}
            <div className="bg-white border-2 border-slate-200 hover:border-amber-400 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {activeSystem === 'sliding' ? 'Sliding Sash (शटर / पल्ला)' : 'Casement Sash (केसमेंट पल्ला)'}
                      </h4>
                      <span className="text-[11px] font-semibold text-amber-700">
                        {activeSash.code} (45° Miter Cut)
                      </span>
                    </div>
                  </div>
                  <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Qty: {activeSystem === 'sliding' ? panelCount * 4 : 4} Pieces
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      SASH WIDTH (चौड़ाई)
                    </span>
                    <span className="text-xl font-black text-amber-950 block mt-0.5">
                      {calculations.sashW} <span className="text-xs font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Qty: {activeSystem === 'sliding' ? panelCount * 2 : 2} Pcs
                    </span>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      SASH HEIGHT (ऊँचाई)
                    </span>
                    <span className="text-xl font-black text-amber-950 block mt-0.5">
                      {calculations.sashH} <span className="text-xs font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Qty: {activeSystem === 'sliding' ? panelCount * 2 : 2} Pcs
                    </span>
                  </div>
                </div>

                {/* Per Sash Breakdown inside Card 2 */}
                {sashMode === 'per_sash' && (calculations.perSashList || []).length > 1 && (
                  <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-amber-100">
                    <span className="text-[10px] font-bold text-amber-900 uppercase">प्रत्येक पल्ले का सैश कटिंग साइज़:</span>
                    {(calculations.perSashList || []).map((s) => (
                      <div key={s.sashNumber} className="flex items-center justify-between text-[11px] bg-amber-50/80 px-2 py-1 rounded border border-amber-200">
                        <span className="font-bold text-slate-800">
                          {s.isMesh ? '🦟' : s.isSolid ? '🚪' : '🪟'} {s.name}: <b className="font-mono text-amber-950">{s.profile.code}</b>
                        </span>
                        <span className="font-mono font-black text-amber-950">
                          {s.sWidth} × {s.sHeight} mm
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline Collapsible Formula Viewer */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleCardExpand('sash')}
                  className="w-full flex items-center justify-between text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer p-1"
                >
                  <span className="flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>फॉर्मूला लाइव देखें (Formula Proof)</span>
                  </span>
                  {expandedCard.sash ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedCard.sash && (
                  <div className="mt-2 text-[11px] text-slate-600 bg-amber-50/70 rounded-lg p-2.5 space-y-1 font-mono border border-amber-100">
                    {activeSystem === 'sliding' ? (
                      <>
                        <div className="text-amber-950 font-bold">Deduction: ({calculations.fHeight}*2)-16 = {calculations.frameDeduction}mm</div>
                        <div>H: {calculations.outerCutH} - {calculations.frameDeduction} = <b>{calculations.sashH}mm</b></div>
                        <div>Overlap: ({calculations.sashRealH}/2)+4 = <b>{calculations.overlap}mm</b></div>
                        <div>W: [({calculations.outerCutW}-{calculations.frameDeduction})/{panelCount}] + {calculations.overlap} = <b>{calculations.sashW}mm</b></div>
                      </>
                    ) : (
                      <>
                        <div className="text-amber-950 font-bold">Sash = Outer Size - ((Beding_Side * 2) - 16)</div>
                        <div>Deduction: ({calculations.frameBeadSide}*2) - 16 = <b>{calculations.sashDeduction}mm</b></div>
                        <div>W: {calculations.outerCutW} - {calculations.sashDeduction} = <b>{calculations.sashW}mm</b></div>
                        <div>H: {calculations.outerCutH} - {calculations.sashDeduction} = <b>{calculations.sashH}mm</b></div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. GLASS PANE CARD */}
            <div className="bg-white border-2 border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Glass Pane (काँच की माप)
                      </h4>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        90° Square Cut
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Qty: {activeSystem === 'sliding' ? panelCount : 1} Panes
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      GLASS WIDTH (चौड़ाई)
                    </span>
                    <span className="text-xl font-black text-emerald-950 block mt-0.5">
                      {calculations.glassW} <span className="text-xs font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      -{calculations.glassDeduction}mm Deduction
                    </span>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      GLASS HEIGHT (ऊँचाई)
                    </span>
                    <span className="text-xl font-black text-emerald-950 block mt-0.5">
                      {calculations.glassH} <span className="text-xs font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      -{calculations.glassDeduction}mm Deduction
                    </span>
                  </div>
                </div>

                {/* Per Sash Infill breakdown inside Card 3 */}
                {sashMode === 'per_sash' && (calculations.perSashList || []).length > 1 && (
                  <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase">प्रत्येक पल्ले का काँच / जाली कट:</span>
                    {(calculations.perSashList || []).map((s) => (
                      <div key={s.sashNumber} className="flex items-center justify-between text-[11px] bg-emerald-50/80 px-2 py-1 rounded border border-emerald-200">
                        <span className="font-bold text-slate-800">
                          {s.isMesh ? '🦟 जाली' : s.isSolid ? '🚪 पैनल' : '🪟 काँच'} ({s.name}):
                        </span>
                        <span className="font-mono font-black text-emerald-950">
                          {s.infillW} × {s.infillH} mm
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline Collapsible Formula Viewer */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleCardExpand('glass')}
                  className="w-full flex items-center justify-between text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer p-1"
                >
                  <span className="flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>काँच फॉर्मूला देखें (Formula Proof)</span>
                  </span>
                  {expandedCard.glass ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedCard.glass && (
                  <div className="mt-2 text-[11px] text-slate-600 bg-emerald-50/70 rounded-lg p-2.5 space-y-1 font-mono border border-emerald-100">
                    <div className="text-emerald-950 font-bold">
                      {activeSystem === 'casement'
                        ? `Deduction: (${calculations.beadSideH}*2)+8 = ${calculations.glassDeduction}mm`
                        : `Deduction: (${calculations.beadSideH}*2)+10 = ${calculations.glassDeduction}mm`}
                    </div>
                    <div>W: {calculations.sashW} - {calculations.glassDeduction} = <b>{calculations.glassW}mm</b></div>
                    <div>H: {calculations.sashH} - {calculations.glassDeduction} = <b>{calculations.glassH}mm</b></div>
                    <div className="text-emerald-900 font-bold mt-1">Area: {calculations.glassAreaSqFt} Sq.Ft</div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. GLAZING BEADING CARD */}
            <div className="bg-white border-2 border-slate-200 hover:border-indigo-400 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 font-extrabold text-xs flex items-center justify-center">
                      4
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Glazing Beading (ग्लेज़िंग बीड)
                      </h4>
                      <span className="text-[11px] font-semibold text-indigo-700">
                        45° Miter Cut
                      </span>
                    </div>
                  </div>
                  <span className="bg-indigo-50 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Qty: {activeSystem === 'sliding' ? panelCount * 4 : 4} Pieces
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                      BEAD WIDTH (चौड़ाई)
                    </span>
                    <span className="text-xl font-black text-indigo-950 block mt-0.5">
                      {calculations.beadW} <span className="text-xs font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Glass + 4mm
                    </span>
                  </div>

                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                      BEAD HEIGHT (ऊँचाई)
                    </span>
                    <span className="text-xl font-black text-indigo-950 block mt-0.5">
                      {calculations.beadH} <span className="text-xs font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Glass + 4mm
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleCardExpand('bead')}
                  className="w-full flex items-center justify-between text-xs font-bold text-indigo-800 hover:text-indigo-950 cursor-pointer p-1"
                >
                  <span className="flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>बीडिंग फॉर्मूला देखें</span>
                  </span>
                  {expandedCard.bead ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedCard.bead && (
                  <div className="mt-2 text-[11px] text-slate-600 bg-indigo-50/70 rounded-lg p-2.5 space-y-1 font-mono border border-indigo-100">
                    <div>W: {calculations.glassW} + 4 = <b>{calculations.beadW}mm</b></div>
                    <div>H: {calculations.glassH} + 4 = <b>{calculations.beadH}mm</b></div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. INTERLOCK PROFILES CARD */}
            {activeSystem === 'sliding' ? (
              <div className="bg-white border-2 border-slate-200 hover:border-purple-400 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center">
                        5
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Interlock Profile (इण्टरलॉक)
                        </h4>
                        <span className="text-[11px] font-semibold text-purple-700">
                          {calculations.is66 ? 'SWH 60-09 (Heavy)' : 'SWH 60-08'} (90° Square Cut)
                        </span>
                      </div>
                    </div>
                    <span className="bg-purple-50 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Qty: {calculations.interlockQty} Pieces
                    </span>
                  </div>

                  <div className="mt-4 bg-purple-50/70 border border-purple-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                      INTERLOCK LENGTH (कटिंग लम्बाई)
                    </span>
                    <span className="text-2xl font-black text-purple-950 block mt-0.5">
                      {calculations.interlockH} <span className="text-sm font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[11px] font-bold text-purple-700 block mt-1">
                      Quantity: {calculations.interlockQty} Pcs (({panelCount} - 1) × 2)
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleCardExpand('interlock')}
                    className="w-full flex items-center justify-between text-xs font-bold text-purple-800 hover:text-purple-950 cursor-pointer p-1"
                  >
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5" />
                      <span>इण्टरलॉक फॉर्मूला देखें</span>
                    </span>
                    {expandedCard.interlock ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {expandedCard.interlock && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-purple-50/70 rounded-lg p-2.5 space-y-1 font-mono border border-purple-100">
                      <div>Length = Sash H ({calculations.sashH}) - 16 = <b>{calculations.interlockH}mm</b></div>
                      <div>Qty = ({panelCount} - 1) × 2 = <b>{calculations.interlockQty} Pcs</b></div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-extrabold text-xs flex items-center justify-center">
                        5
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Mullion Profile (मलियन)
                        </h4>
                        <span className="text-[11px] font-semibold text-blue-700">
                          90° V-Notch Cut
                        </span>
                      </div>
                    </div>
                    <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      T-Mullion
                    </span>
                  </div>

                  <div className="mt-4 bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                      MULLION LENGTH
                    </span>
                    <span className="text-2xl font-black text-blue-950 block mt-0.5">
                      {calculations.mullionL} <span className="text-sm font-bold text-slate-500">mm</span>
                    </span>
                    <span className="text-[11px] font-bold text-blue-700 block mt-1">
                      Formula: Frame Height - (2 × {calculations.fHeight}mm)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. GI STEEL REINFORCEMENT CARD */}
            <div className="bg-white border-2 border-slate-200 hover:border-slate-400 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center">
                      6
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        GI Steel Reinforcement (स्टील)
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-600">
                        1.5mm Galvanized Steel (90° Cut)
                      </span>
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Frame & Sash
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      FRAME STEEL
                    </span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">
                      W: {calculations.outerSteelW} mm
                    </span>
                    <span className="text-xs font-black text-slate-900 block">
                      H: {calculations.outerSteelH} mm
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      -100mm
                    </span>
                  </div>

                  <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      SASH STEEL
                    </span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">
                      W: {calculations.sashSteelW} mm
                    </span>
                    <span className="text-xs font-black text-slate-900 block">
                      H: {calculations.sashSteelH} mm
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      -{calculations.sashSteelDeduction}mm
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleCardExpand('steel')}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-950 cursor-pointer p-1"
                >
                  <span className="flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>स्टील फॉर्मूला देखें</span>
                  </span>
                  {expandedCard.steel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedCard.steel && (
                  <div className="mt-2 text-[11px] text-slate-600 bg-slate-100 rounded-lg p-2.5 space-y-1 font-mono border border-slate-200">
                    <div>Frame: Outer - 100mm = <b>{calculations.outerSteelW} / {calculations.outerSteelH}mm</b></div>
                    <div>Sash: Sash - {calculations.sashSteelDeduction}mm = <b>{calculations.sashSteelW} / {calculations.sashSteelH}mm</b></div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION C: INTERACTIVE 2D CAD SCHEMATIC DIAGRAM
         ========================================================================= */}
      {(viewMode === 'cadDiagram' || viewMode === 'all') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                VISUAL CAD SCHEMATIC WITH LIVE COMPUTED SIZES (डायग्राम व्यू)
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Window: {testWidth} x {testHeight} mm | {activeSystem === 'sliding' ? `${panelCount} Panels` : '1 Openable Sash'}
            </span>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="w-full bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex items-center justify-center overflow-x-auto">
            <svg
              viewBox="0 0 700 380"
              className="w-full max-w-2xl h-auto select-none"
              style={{ minWidth: '460px' }}
            >
              <defs>
                <pattern id="checkerGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
                <pattern id="flyMeshPattern" width="22" height="22" patternUnits="userSpaceOnUse">
                  <rect width="22" height="22" fill="#0f172a" fillOpacity="0.08" />
                  <rect width="22" height="22" fill="#0284c7" fillOpacity="0.04" />
                  <path d="M 0 0 L 22 22 M 22 0 L 0 22" fill="none" stroke="#0f172a" strokeWidth="1.2" strokeOpacity="0.85" />
                  <path d="M 0 11 L 22 11 M 11 0 L 11 22" fill="none" stroke="#334155" strokeWidth="0.75" strokeOpacity="0.65" />
                  <rect x="0" y="0" width="22" height="22" fill="none" stroke="#475569" strokeWidth="0.6" strokeOpacity="0.5" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="700" height="380" fill="url(#checkerGrid)" />

              {/* Outer Frame Box */}
              <g transform="translate(100, 50)">
                {/* Outer Frame Border (Simulating 45° Welded Profile) */}
                <rect
                  x="0"
                  y="0"
                  width="500"
                  height="280"
                  fill="#f8fafc"
                  stroke="#1e293b"
                  strokeWidth="8"
                  rx="4"
                />

                {/* Inner Pocket Area */}
                <rect
                  x="20"
                  y="20"
                  width="460"
                  height="240"
                  fill="#f1f5f9"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />

                {/* Panels Rendering */}
                {activeSystem === 'sliding' ? (
                  (calculations.perSashList || []).map((sashItem, idx) => {
                    const totalPanels = panelCount;
                    const panelWidthSvg = (460 / totalPanels) + 24;
                    const isFrontTrack = idx % 2 === 0;
                    const isMesh = sashItem.isMesh;
                    const isSolid = sashItem.isSolid;
                    const isSelected = activeSashIndex === idx && sashMode === 'per_sash';

                    return (
                      <g
                        key={idx}
                        onClick={() => {
                          setSashMode('per_sash');
                          setActiveSashIndex(idx);
                        }}
                        className="cursor-pointer"
                        transform={`translate(${Math.max(20, Math.min(480 - panelWidthSvg, 20 + idx * ((460 - panelWidthSvg) / (totalPanels - 1 || 1))))}, 20)`}
                      >
                        {/* Sash Outer Frame */}
                        <rect
                          x="0"
                          y="0"
                          width={panelWidthSvg}
                          height="240"
                          fill={isSelected ? '#fef3c7' : isFrontTrack ? '#ffffff' : '#f8fafc'}
                          stroke={isSelected ? '#b45309' : isFrontTrack ? '#d97706' : '#94a3b8'}
                          strokeWidth={isSelected ? '4' : '3'}
                          rx="3"
                          style={{ filter: isFrontTrack || isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))' : 'none' }}
                        />

                        {/* Infill Area (Glass or Mesh or Solid Panel) */}
                        <rect
                          x="14"
                          y="14"
                          width={panelWidthSvg - 28}
                          height="212"
                          fill={isMesh ? 'url(#flyMeshPattern)' : isSolid ? '#cbd5e1' : '#e0f2fe'}
                          stroke={isMesh ? '#b45309' : isSolid ? '#64748b' : '#0284c7'}
                          strokeWidth="1.5"
                          opacity={isMesh ? 0.95 : 0.85}
                        />

                        {/* Glass Reflective Diagonal Line (only for glass) */}
                        {!isMesh && !isSolid && (
                          <line
                            x1="22"
                            y1="22"
                            x2={panelWidthSvg - 22}
                            y2="100"
                            stroke="#ffffff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            opacity="0.7"
                          />
                        )}

                        {/* Sash Panel Number Badge */}
                        <circle
                          cx={panelWidthSvg / 2}
                          cy="32"
                          r="11"
                          fill={isMesh ? '#b45309' : isSolid ? '#475569' : '#d97706'}
                        />
                        <text
                          x={panelWidthSvg / 2}
                          y="36"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {isMesh ? '🦟' : idx + 1}
                        </text>

                        {/* Infill Size Badge on Panel */}
                        <text
                          x={panelWidthSvg / 2}
                          y="108"
                          textAnchor="middle"
                          fill={isMesh ? '#78350f' : isSolid ? '#1e293b' : '#0369a1'}
                          fontSize="10.5"
                          fontWeight="bold"
                        >
                          {isMesh ? 'जाली' : isSolid ? 'पैनल' : 'काँच'}: {sashItem.infillW}×{sashItem.infillH}
                        </text>

                        {/* Beading Size Badge */}
                        <text
                          x={panelWidthSvg / 2}
                          y="126"
                          textAnchor="middle"
                          fill="#475569"
                          fontSize="9"
                          fontWeight="600"
                        >
                          Bead: {sashItem.beadW}×{sashItem.beadH}
                        </text>

                        {/* Sash Cut Dimensions & Profile Code */}
                        <rect
                          x={Math.max(4, (panelWidthSvg - 130) / 2)}
                          y="204"
                          width={Math.min(panelWidthSvg - 8, 130)}
                          height="28"
                          rx="4"
                          fill={isSelected ? '#b45309' : '#1e293b'}
                          opacity="0.9"
                        />
                        <text
                          x={panelWidthSvg / 2}
                          y="216"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="bold"
                        >
                          Sash: {sashItem.sWidth}×{sashItem.sHeight}
                        </text>
                        <text
                          x={panelWidthSvg / 2}
                          y="227"
                          textAnchor="middle"
                          fill="#fde68a"
                          fontSize="8"
                          fontWeight="bold"
                        >
                          {sashItem.profile.code}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  <g>
                    {/* Single Casement Sash */}
                    <rect
                      x="24"
                      y="24"
                      width="452"
                      height="232"
                      fill="#eff6ff"
                      stroke="#2563eb"
                      strokeWidth="3"
                      rx="2"
                    />
                    {/* Casement Glass */}
                    <rect
                      x="50"
                      y="50"
                      width="400"
                      height="180"
                      fill="#e0f2fe"
                      stroke="#0284c7"
                      strokeWidth="2"
                    />
                    <text
                      x="250"
                      y="140"
                      textAnchor="middle"
                      fill="#0369a1"
                      fontSize="13"
                      fontWeight="bold"
                    >
                      Glass: {calculations.glassW} × {calculations.glassH} mm
                    </text>
                    <text
                      x="250"
                      y="160"
                      textAnchor="middle"
                      fill="#1d4ed8"
                      fontSize="11"
                      fontWeight="600"
                    >
                      Beading: {calculations.beadW} × {calculations.beadH} mm
                    </text>
                    <text
                      x="250"
                      y="244"
                      textAnchor="middle"
                      fill="#1e40af"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Casement Sash: {calculations.sashW} × {calculations.sashH} mm
                    </text>
                  </g>
                )}

                {/* Outer Top Width Badge */}
                <g transform="translate(250, -18)">
                  <rect x="-80" y="-12" width="160" height="24" rx="12" fill="#1e293b" />
                  <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                    Outer Cut W: {calculations.outerCutW} mm
                  </text>
                </g>

                {/* Outer Right Height Badge */}
                <g transform="translate(520, 140)">
                  <rect x="-10" y="-12" width="160" height="24" rx="12" fill="#1e293b" />
                  <text x="70" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                    Outer Cut H: {calculations.outerCutH} mm
                  </text>
                </g>

                {/* Design Dimension Reference */}
                <text x="250" y="-28" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">
                  Design Width: {testWidth} mm (+6mm weld)
                </text>
              </g>
            </svg>
          </div>
        </div>
      )}

    </div>
  );
};
