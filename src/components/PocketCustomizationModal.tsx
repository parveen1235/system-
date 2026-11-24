import React, { useState, useEffect, useMemo } from 'react';
import {
  UPVCFrame,
  FramePocket,
  SashType,
  GlassType,
} from '../types/upvc';
import {
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { HandleThumbnail } from './HandleThumbnail';
import {
  MASTER_GLASS_PRESETS,
  getGlassDisplayName,
  getGlassShortBadge,
} from '../utils/glassUtils';
import {
  CustomSeries,
  INITIAL_CUSTOM_SERIES,
  STORAGE_KEY_CUSTOM_SERIES,
} from '../constants/customSeriesMaster';
import { getCustomSeriesList, recalculateFramePockets } from '../utils/upvcCalculations';
import { CASEMENT_FRAME_PROFILES } from '../data/casementSpecifications';

interface PocketCustomizationModalProps {
  isOpen?: boolean;
  onClose: () => void;
  frames?: UPVCFrame[];
  frame: UPVCFrame;
  pocket: FramePocket;
  selectedFrameId?: string;
  selectedPocketId?: string;
  onSelectFrame?: (frameId: string) => void;
  onSelectPocket?: (pocketId: string) => void;
  onSavePocket: (frameId: string, updatedPocket: FramePocket) => void;
  onUpdateFrame?: (updatedFrame: UPVCFrame) => void;
  lang?: 'hi' | 'en';
  isDocked?: boolean;
  initialTarget?: 'shutter' | 'mesh';
}

export interface AvailableFrameOption {
  id: string;
  code: string;
  name: string;
  height: number;
  beadingSideHeight?: number;
  isSavedInSeries?: boolean;
}

export function getFramesForSystem(
  systemName: string,
  seriesList: CustomSeries[],
  isSliderFallback: boolean = false
): AvailableFrameOption[] {
  const clean = (systemName || '').trim().toLowerCase();

  // 1. Match exact by name or id
  let targetSeries = seriesList.find(
    (s) => s.name.toLowerCase() === clean || s.id.toLowerCase() === clean
  );

  // 2. If not matched exact, match intelligently by brand/type and series dimensions
  if (!targetSeries) {
    const isSlider = clean.includes('sliding') || isSliderFallback;
    const candidates = seriesList.filter((s) => s.type === (isSlider ? 'sliding' : 'casement'));
    const numbersInClean = clean.match(/\d+/g) || [];

    let bestCandidate = candidates.find((s) => {
      const sName = s.name.toLowerCase();
      const sBrand = s.brand.toLowerCase();
      const brandMatch = clean.includes(sBrand) || sName.includes(sBrand);
      const numberMatch = numbersInClean.some((num) => sName.includes(num) || String(s.seriesHeight) === num);
      return brandMatch && numberMatch;
    });

    if (!bestCandidate) {
      bestCandidate = candidates.find(
        (s) => clean.includes(s.brand.toLowerCase()) || s.name.toLowerCase().includes(clean)
      );
    }

    targetSeries = bestCandidate || candidates[0];
  }

  const result: AvailableFrameOption[] = [];
  const addedCodes = new Set<string>();

  // 1. All frames explicitly saved in this series ("WO SABHI FRAME JO SERIES ME SAVE HO US SYSTEM NAME KE")
  if (targetSeries && Array.isArray(targetSeries.frames) && targetSeries.frames.length > 0) {
    targetSeries.frames.forEach((f) => {
      const normCode = (f.code || '').trim();
      if (!normCode) return;
      const key = normCode.replace(/[\s-_]/g, '').toUpperCase();
      if (!addedCodes.has(key)) {
        addedCodes.add(key);
        result.push({
          id: f.id || f.code,
          code: f.code,
          name: f.name || `${f.code} Frame Profile`,
          height: f.height || (targetSeries?.type === 'sliding' ? 44 : 60),
          beadingSideHeight: f.beadingSideHeight,
          isSavedInSeries: true,
        });
      }
    });
  } else {
    // Fallback only if no frames exist in the matched series
    const isSliding = targetSeries?.type === 'sliding' || clean.includes('sliding') || isSliderFallback;

    if (!isSliding) {
      CASEMENT_FRAME_PROFILES.forEach((cfp) => {
        const key = cfp.code.replace(/[\s-_]/g, '').toUpperCase();
        if (!addedCodes.has(key)) {
          addedCodes.add(key);
          result.push({
            id: cfp.id,
            code: cfp.code,
            name: cfp.name,
            height: cfp.dimensions.includes('50mm') ? 50 : cfp.dimensions.includes('65mm') ? 65 : 60,
            beadingSideHeight: 40,
            isSavedInSeries: false,
          });
        }
      });
    } else {
      const defaultSlidingProfiles = [
        { code: 'SWH 60-01', name: 'SLD 2-Track Outer Frame (60mm × 52mm)', height: 44, beadingSideHeight: 28 },
        { code: 'SWH 60-02', name: 'SLD 3-Track Outer Frame (60mm × 112mm)', height: 44, beadingSideHeight: 28 },
        { code: 'SWH 60-02-FIN', name: 'SLD 3-Track with Fin Architrave', height: 44, beadingSideHeight: 28 },
      ];
      defaultSlidingProfiles.forEach((sfp) => {
        const key = sfp.code.replace(/[\s-_]/g, '').toUpperCase();
        if (!addedCodes.has(key)) {
          addedCodes.add(key);
          result.push({
            id: sfp.code,
            code: sfp.code,
            name: sfp.name,
            height: sfp.height,
            beadingSideHeight: sfp.beadingSideHeight,
            isSavedInSeries: false,
          });
        }
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// SPECIFICATION CONSTANTS
// ---------------------------------------------------------------------------

export const SYSTEM_OPTIONS = [
  'DURON 60MM SLIDING SERIES',
  'DURON 60MM CASEMENT SERIES',
  'DURON 62MM SLIDING SERIES',
  'DURON 88MM 3-TRACK SLIDING SERIES',
  'CWH 60MM CASEMENT SERIES',
];

export const CASEMENT_PART_GROUPS = [
  'Door',
  'Window',
];

export const SLIDING_PART_GROUPS = [
  'Door',
  'Window',
];

export const MESH_PART_GROUPS = [
  'Door Mesh',
  'Window Mesh',
];

// Sash Options explicitly requested by user
export const CASEMENT_WINDOW_SASH_OPTIONS = [
  {
    code: 'CWH 60-03',
    name: 'CMT OUTWARD SASH 60MM X 78MM (CWH 60-03) (Thickness : 2.2mm)',
    label: 'CMT OUTWARD SASH 60MM X 78MM',
    thickness: '2.2mm',
    type: 'Outward Sash',
  },
  {
    code: 'CWH 60-04',
    name: 'CMT INWARD SASH 60MM X 71MM (CWH 60-04) (Thickness : 2.2mm)',
    label: 'CMT INWARD SASH 60MM X 71MM',
    thickness: '2.2mm',
    type: 'Inward Sash',
  },
  {
    code: 'CWH 60-12',
    name: 'CMT SLIM SASH 58MM X 60MM (CWH 60-12) (Thickness : 2.0mm)',
    label: 'CMT SLIM SASH 58MM X 60MM',
    thickness: '2.0mm',
    type: 'Slim Vent Sash',
  },
];

export const CASEMENT_DOOR_SASH_OPTIONS = [
  {
    code: 'CWH 60-06',
    name: 'CMT OUTWARD SASH 60MM X 104MM (CWH 60-06) (Thickness : 1.9mm)',
    label: 'CMT OUTWARD SASH 60MM X 104MM',
    thickness: '1.9mm',
    type: 'Outward Door Sash',
  },
  {
    code: 'CWH 60-07',
    name: 'CMT INWARD SASH 60MM X 104MM (CWH 60-07) (Thickness : 2.2mm)',
    label: 'CMT INWARD SASH 60MM X 104MM',
    thickness: '2.2mm',
    type: 'Inward Door Sash',
  },
  {
    code: 'CWH 65-06',
    name: 'COMMERCIAL ENTRANCE SASH 115MM (CWH 65-06) (Thickness : 2.2mm)',
    label: 'COMMERCIAL ENTRANCE SASH 115MM',
    thickness: '2.2mm',
    type: 'Commercial Door Sash',
  },
];

// Reinforcements for Casement Sash
export const CASEMENT_WINDOW_REINFORCEMENTS = [
  'RI-28MM X 35MM X 16MM (CRI 60-03-1.5MM)',
  'RI-28MM X 35MM X 16MM (CRI 60-03-1.2MM)',
  'RI-28MM X 35MM X 16MM (CRI 60-03-2.0MM)',
  'NO REINFORCEMENT',
];

export const CASEMENT_DOOR_REINFORCEMENTS = [
  'RI-28MM X 35MM X 16MM (CRI 60-06-1.5MM)',
  'RI-BOX-20MM X 30MM (SRI 60-06-2.0MM)',
  'RI-35MM X 28MM X 15MM (CRI 60-07-2.0MM)',
  'NO REINFORCEMENT',
];

// Sliding Profiles & Reinforcements (Duron 60 Sliding Catalogue)
export const SLIDING_WINDOW_SASH_OPTIONS = [
  {
    code: 'SWH 60-03',
    name: 'SLD SASH 42MM X 57MM (SWH 60-03) (Thickness : 1.9mm)',
    label: 'SLD SASH 42MM X 57MM (SWH 60-03)',
    thickness: '1.9mm',
  },
  {
    code: 'SWH 60-04',
    name: 'SLD SASH 42MM X 66MM (SWH 60-04) (Thickness : 2.2mm)',
    label: 'SLD SASH 42MM X 66MM (SWH 60-04)',
    thickness: '2.2mm',
  },
];

export const SLIDING_DOOR_SASH_OPTIONS = [
  {
    code: 'SWH 60-05',
    name: 'SLD SASH 42MM X 75MM (SWH 60-05) (Thickness : 2.1mm)',
    label: 'SLD SASH 42MM X 75MM (SWH 60-05)',
    thickness: '2.1mm',
  },
  {
    code: 'SWH 60-06',
    name: 'SLD SASH 42MM X 88MM (SWH 60-06) (Thickness : 1.9mm)',
    label: 'SLD SASH 42MM X 88MM (SWH 60-06)',
    thickness: '1.9mm',
  },
];

export const SLIDING_REINFORCEMENTS = [
  'RI-TP2-15MM X 29MM X 15MM (SRI 60-03-1.5MM)',
  'RI-TP2-15MM X 35MM X 15MM (SRI 85-02-1.5MM)',
  'RI-BOX-20MM X 30MM (SRI 60-06-2.0MM)',
  'NO REINFORCEMENT',
];

// Casement Window Handles (4 official options)
export const CASEMENT_WINDOW_HANDLES = [
  'COCKSPUR HANDLE LEFT (UPVC-HW-CHL)',
  'COCKSPUR HANDLE RIGHT (UPVC-HW-CHR)',
  'ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY)',
  'ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)',
];

// Casement Door Handles (8 official options)
export const CASEMENT_DOOR_HANDLES = [
  'CASEMENT DOUBLE SIDE DOOR HANDLE (UPVC-HW-CMTDSDH)',
  'CASEMENT DOUBLE SIDE DOOR HANDLE WITH KEY (UPVC-HW-CMTDSDHKEY)',
  'ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)',
  'ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY)',
  'CMT DOOR LOCKING SET (UPVC HW-CDLS)',
  'MORTIES DOOR LOCK SET (UPVC-HW-MLS)',
  'COCKSPUR HANDLE RIGHT (UPVC-HW-CHR)',
  'COCKSPUR HANDLE LEFT (UPVC-HW-CHL)',
];

// Door Shutter Hinges (3 options shown in Image 3)
export const DOOR_SHUTTER_HINGES = [
  '3D HINGES (UPVC-HW-3DH)',
  'HEAVY FLAG HINGE (UPVC-HW-FLG)',
  'SS BUTT HINGE 4" (UPVC-HW-BHSS)',
];

// T Lock Options
export const T_LOCK_OPTIONS = [
  'None',
  'T-LOCK (UPVC-HW-TLOCK)',
];

export const PocketCustomizationModal: React.FC<PocketCustomizationModalProps> = ({
  isOpen,
  onClose,
  frames,
  frame,
  pocket,
  selectedFrameId,
  selectedPocketId,
  onSelectFrame,
  onSelectPocket,
  onSavePocket,
  onUpdateFrame,
  lang = 'hi',
  isDocked = false,
  initialTarget,
}) => {
  if (!isOpen || !pocket || !frame) return null;

  // Determine initial states based on frame series and pocket height
  // "JAB SASH PER TIPE TO AUTO MATICK SYSTEM ME CASMENT 60 SERIES HOGA"
  const isSliderSash =
    pocket.sashType?.startsWith('slider') ||
    pocket.sashType?.startsWith('mesh_slider') ||
    (frame.series?.toLowerCase().includes('sliding') &&
      !pocket.sashType?.startsWith('casement') &&
      pocket.sashType !== 'top_hung' &&
      pocket.sashType !== 'french_open' &&
      pocket.sashType !== 'tilt_turn' &&
      pocket.seriesCode !== 'CWH-60');

  const isDoorInitial =
    pocket.applicationType === 'door' ||
    pocket.height >= 1800 ||
    frame.height >= 1800;

  const isPocketMeshType =
    pocket.sashType === 'mesh_sash' ||
    pocket.sashType?.startsWith('mesh_slider');

  // Mode: Shutter (Glass/Sash) vs Mesh (जाली)
  const [activeMode, setActiveMode] = useState<'shutter' | 'mesh'>(() => {
    if (initialTarget === 'mesh' || isPocketMeshType) {
      return 'mesh';
    }
    return 'shutter';
  });

  // Load saved series list (including any user saved series and frames)
  const [seriesList, setSeriesList] = useState<CustomSeries[]>(() => {
    return getCustomSeriesList();
  });

  useEffect(() => {
    const handleSync = () => {
      setSeriesList(getCustomSeriesList());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('seriesSettingsUpdated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('seriesSettingsUpdated', handleSync);
    };
  }, []);

  // System options list (all saved series + standard presets)
  const systemOptions = useMemo(() => {
    const names: string[] = [];
    seriesList.forEach((s) => {
      if (s.name && !names.includes(s.name)) {
        names.push(s.name);
      }
    });
    SYSTEM_OPTIONS.forEach((sys) => {
      if (!names.includes(sys)) {
        names.push(sys);
      }
    });
    return names;
  }, [seriesList]);

  // 1. System:
  const [system, setSystem] = useState<string>(() => {
    if (frame.seriesCode) {
      const match = seriesList.find((s) => s.id === frame.seriesCode || s.name === frame.seriesCode);
      if (match) return match.name;
    }
    if (frame.series) {
      const match = seriesList.find(
        (s) => s.name.toLowerCase() === frame.series?.toLowerCase() || s.id === frame.series
      );
      if (match) return match.name;
    }
    if (isSliderSash) {
      const sld = seriesList.find((s) => s.type === 'sliding');
      return sld?.name || 'DURON 60MM SLIDING SERIES';
    }
    const cmt = seriesList.find((s) => s.type === 'casement');
    return cmt?.name || 'DURON 60MM CASEMENT SERIES';
  });

  const selectedSeries = useMemo(() => {
    const clean = system.trim().toLowerCase();
    let found = seriesList.find(
      (s) => s.name.toLowerCase() === clean || s.id.toLowerCase() === clean
    );
    if (found) return found;

    if (clean.includes('sliding') || isSliderSash) {
      found =
        seriesList.find((s) => s.type === 'sliding' && (clean.includes(s.brand.toLowerCase()) || clean.includes(s.name.toLowerCase()))) ||
        seriesList.find((s) => s.type === 'sliding');
      return found || seriesList[1] || seriesList[0];
    } else {
      found =
        seriesList.find((s) => s.type === 'casement' && (clean.includes(s.brand.toLowerCase()) || clean.includes(s.name.toLowerCase()))) ||
        seriesList.find((s) => s.type === 'casement');
      return found || seriesList[0];
    }
  }, [system, seriesList, isSliderSash]);

  // Available frames for this selected system ("WO SABHI FRAME JO SERIES ME SAVE HO US SYSTEM NAME KE")
  const availableFrameProfiles = useMemo(() => {
    return getFramesForSystem(system, seriesList, isSliderSash);
  }, [system, seriesList, isSliderSash]);

  // Frame Profile Code state (outer frame)
  const [frameProfileCode, setFrameProfileCode] = useState<string>(() => {
    return (
      pocket.frameProfileCode ||
      frame.frameProfileCode ||
      availableFrameProfiles[0]?.code ||
      'CWH 60-01'
    );
  });

  // Keep frameProfileCode in sync with frame / pocket / availableFrameProfiles
  useEffect(() => {
    const currentCode = pocket.frameProfileCode || frame.frameProfileCode;
    if (currentCode && availableFrameProfiles.some((fp) => fp.code === currentCode)) {
      setFrameProfileCode(currentCode);
    } else if (availableFrameProfiles.length > 0) {
      setFrameProfileCode(availableFrameProfiles[0].code);
    }
  }, [pocket.id, frame.id, pocket.frameProfileCode, frame.frameProfileCode, availableFrameProfiles]);

  const selectedFrameProfileDetails = useMemo(() => {
    return (
      availableFrameProfiles.find((fp) => fp.code === frameProfileCode) ||
      availableFrameProfiles[0]
    );
  }, [availableFrameProfiles, frameProfileCode]);

  // 2. Part Group:
  // In Casement: 'Door' or 'Window'
  // In Sliding: 'Door' or 'Window'
  // When Mesh is tapped/active: 'Door Mesh' or 'Window Mesh'
  const [partGroup, setPartGroup] = useState<string>(() => {
    if (initialTarget === 'mesh' || isPocketMeshType) {
      return isDoorInitial ? 'Door Mesh' : 'Window Mesh';
    }
    return isDoorInitial ? 'Door' : 'Window';
  });

  // Re-sync mode and partGroup when active pocket or target changes
  useEffect(() => {
    const isMesh =
      initialTarget === 'mesh' ||
      pocket.sashType === 'mesh_sash' ||
      pocket.sashType?.startsWith('mesh_slider');
    setActiveMode(isMesh ? 'mesh' : 'shutter');
    if (isMesh) {
      setPartGroup(isDoorInitial ? 'Door Mesh' : 'Window Mesh');
    } else {
      setPartGroup(isDoorInitial ? 'Door' : 'Window');
    }
  }, [pocket.id, initialTarget, isDoorInitial]);

  const isCurrentSlider =
    system.toLowerCase().includes('sliding') ||
    isSliderSash;

  const isCurrentDoor =
    partGroup.toLowerCase().includes('door');

  const isCurrentMesh =
    activeMode === 'mesh' ||
    partGroup.toLowerCase().includes('mesh') ||
    Boolean(pocket.hasMesh) ||
    pocket.sashType?.startsWith('mesh') ||
    Boolean(pocket.meshType);

  // Fix Shutter ('No' or 'Yes' as shown in the uploaded reference image)
  const [fixShutter, setFixShutter] = useState<'No' | 'Yes'>(() => {
    return pocket.sashType === 'fixed' ? 'Yes' : 'No';
  });

  // 3-Sided Frame for Door ('4_side' or '3_side' - eliminates bottom frame sill)
  const [frameSides, setFrameSides] = useState<'4_side' | '3_side'>(() => {
    if (pocket.frameSides === '3_side' || pocket.isThreeSidedFrame) return '3_side';
    if (frame.frameSides === '3_side' || frame.isThreeSidedFrame) return '3_side';
    return '4_side';
  });

  const handleFixShutterChange = (val: 'No' | 'Yes') => {
    setFixShutter(val);
  };

  const handleModeChange = (newMode: 'shutter' | 'mesh') => {
    setActiveMode(newMode);
    const isDoor = partGroup.toLowerCase().includes('door') || isDoorInitial;
    if (newMode === 'mesh') {
      const targetGroup = isDoor ? 'Door Mesh' : 'Window Mesh';
      setPartGroup(targetGroup);
      handlePartGroupChange(targetGroup);
    } else {
      const targetGroup = isDoor ? 'Door' : 'Window';
      setPartGroup(targetGroup);
      handlePartGroupChange(targetGroup);
    }
  };

  // 3. Hinges And Friction Stay
  const [hingeStayType, setHingeStayType] = useState<string>(() => {
    if (pocket.hingeType?.toLowerCase().includes('hinge') || pocket.shutterHingeType) {
      return 'Hinges';
    }
    return isDoorInitial ? 'Hinges' : 'Friction Stay';
  });

  // 4. Handle Hardware
  const [handleHardware, setHandleHardware] = useState<string>(() => {
    if (pocket.handleCode) {
      if (pocket.handleCode === 'UPVC-HW-CHR') return 'COCKSPUR HANDLE RIGHT (UPVC-HW-CHR)';
      if (pocket.handleCode === 'UPVC-HW-CHL') return 'COCKSPUR HANDLE LEFT (UPVC-HW-CHL)';
      if (pocket.handleCode === 'UPVC-HW-SCEHKEY') return 'ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY)';
      if (pocket.handleCode === 'UPVC-HW-SCEHWK') return 'ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)';
      if (pocket.handleCode === 'UPVC-HW-CMTDSDH') return 'CASEMENT DOUBLE SIDE DOOR HANDLE (UPVC-HW-CMTDSDH)';
      if (pocket.handleCode === 'UPVC-HW-CMTDSDHKEY') return 'CASEMENT DOUBLE SIDE DOOR HANDLE WITH KEY (UPVC-HW-CMTDSDHKEY)';
      if (pocket.handleCode === 'UPVC-HW-CDLS' || pocket.handleCode === 'UPVC HW-CDLS') return 'CMT DOOR LOCKING SET (UPVC HW-CDLS)';
      if (pocket.handleCode === 'UPVC-HW-MLS') return 'MORTIES DOOR LOCK SET (UPVC-HW-MLS)';
      if (pocket.handleCode === 'UPVC-HW-DHDLE') return 'HEAVY D-HANDLE WITH GEAR (UPVC-HW-DHDLE)';
      if (pocket.handleCode === 'UPVC-HW-SDH') return 'SLD D HANDLE (UPVC-HW-SDH)';
      if (pocket.handleCode === 'UPVC-HW-DSDHK') return 'SLD DOUBLE SIDE DOOR HANDLE WITH KEY (UPVC-HW-DSDHK)';
      if (pocket.handleCode === 'UPVC-HW-SDSDHWK') return 'SLD DOUBLE SIDE DOOR HANDLE WITHOUT KEY (UPVC-HW-SDSDHWK)';
      if (pocket.handleCode === 'UPVC-HW-LCKSET') return 'SLD DOOR LOCKING SET (UPVC-HW-LCKSET)';
      if (pocket.handleCode === 'UPVC-HW-POPUPH') return 'SLD POP UP HANDLE (UPVC-HW-POPUPH)';
      if (pocket.handleCode === 'UPVC-HW-POP-KEY') return 'SLD POP UP HANDLE WITH KEY (UPVC-HW-POP-KEY)';
      if (pocket.handleCode === 'UPVC-HW-STLL') return 'SLD TOUCH LOCK LEFT (UPVC-HW-STLL)';
      if (pocket.handleCode === 'UPVC-HW-STLR') return 'SLD TOUCH LOCK RIGHT (UPVC-HW-STLR)';
      if (pocket.handleCode.includes('STLL') || pocket.handleCode.includes('STLR')) return 'SLD TOUCH LOCK (UPVC-HW-STLL / STLR)';
      if (pocket.handleCode === 'UPVC-HW-FMH') return 'FLY MESH HANDLE (UPVC-HW-FMH)';
      if (pocket.handleCode === 'UPVC-HW-SCH') return 'SLD C HANDLE (UPVC-HW-SCH)';
    }
    if (isSliderSash) {
      return isDoorInitial
        ? 'ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)'
        : 'SLD TOUCH LOCK RIGHT (UPVC-HW-STLR)';
    }
    return isDoorInitial
      ? 'CASEMENT DOUBLE SIDE DOOR HANDLE (UPVC-HW-CMTDSDH)'
      : 'COCKSPUR HANDLE LEFT (UPVC-HW-CHL)';
  });

  // 5. T-Lock
  const [tLock, setTLock] = useState<string>(() => pocket.tLockType || 'None');

  // 6. Door Shutter Hinges (When Door)
  const [doorShutterHinges, setDoorShutterHinges] = useState<string>(
    () => pocket.shutterHingeType || '3D HINGES (UPVC-HW-3DH)'
  );

  // Roller (for sliding - DWAG default for sliding door as in reference image)
  const [rollerHardware, setRollerHardware] = useState<string>(() => {
    if (pocket.rollerType) return pocket.rollerType;
    return isDoorInitial
      ? 'DOUBLE WHEEL ADJUSTABLE WITH GROOVE (UPVC-HW-DWAG)'
      : 'SINGLE WHEEL WITH GROOVE (UPVC-HW-SWG)';
  });

  // Glass Type & Custom Name
  const [selectedGlassType, setSelectedGlassType] = useState<GlassType>(
    pocket.glassType || 'clear_6mm'
  );
  const [customGlassName, setCustomGlassName] = useState<string>(() => {
    return (
      pocket.glassName ||
      frame.glassName ||
      getGlassDisplayName(pocket.glassType || 'clear_6mm')
    );
  });

  // Re-sync glass when active pocket or frame changes
  useEffect(() => {
    setSelectedGlassType(pocket.glassType || 'clear_6mm');
    setCustomGlassName(
      pocket.glassName ||
      frame.glassName ||
      getGlassDisplayName(pocket.glassType || 'clear_6mm')
    );
  }, [pocket.id, pocket.glassType, pocket.glassName, frame.id, frame.glassName]);

  // Equalization
  const [allowEqualization, setAllowEqualization] = useState<boolean>(true);

  // Accordion Expand/Collapse - Top defaults to open as shown in user's reference images
  const [expandedSection, setExpandedSection] = useState<'top' | 'bottom' | 'left' | 'right' | null>('top');

  // Default Sash Names
  const defaultWindowSash = 'CMT OUTWARD SASH 60MM X 78MM (CWH 60-03) (Thickness : 2.2mm)';
  const defaultDoorSash = 'CMT OUTWARD SASH 60MM X 104MM (CWH 60-06) (Thickness : 1.9mm)';
  const defaultWindowReinforcement = 'RI-28MM X 35MM X 16MM (CRI 60-03-1.5MM)';
  const defaultDoorReinforcement = 'RI-28MM X 35MM X 16MM (CRI 60-06-1.5MM)';

  // Directional Sash Profiles
  const defaultSlidingWindowSash = 'SLD SASH 42MM X 57MM (SWH 60-03) (Thickness : 1.9mm)';
  const defaultSlidingDoorSash = 'SLD SASH 42MM X 75MM (SWH 60-05) (Thickness : 2.1mm)';

  const getSashProfileString = (code?: string, sideCustom?: string) => {
    if (sideCustom) return sideCustom;
    if (code === 'CWH 60-04') return 'CMT INWARD SASH 60MM X 71MM (CWH 60-04) (Thickness : 2.2mm)';
    if (code === 'CWH 60-07') return 'CMT INWARD SASH 60MM X 104MM (CWH 60-07) (Thickness : 2.2mm)';
    if (code === 'CWH 60-06') return defaultDoorSash;
    if (code === 'CWH 60-12') return 'CMT SLIM SASH 58MM X 60MM (CWH 60-12) (Thickness : 2.0mm)';
    if (code === 'CWH 65-06') return 'COMMERCIAL ENTRANCE SASH 115MM (CWH 65-06) (Thickness : 2.2mm)';
    if (code === 'CWH 60-03') return defaultWindowSash;
    if (code === 'SWH 60-04') return 'SLD SASH 42MM X 66MM (SWH 60-04) (Thickness : 2.2mm)';
    if (code === 'SWH 60-05') return 'SLD SASH 42MM X 75MM (SWH 60-05) (Thickness : 2.1mm)';
    if (code === 'SWH 60-06') return 'SLD SASH 42MM X 88MM (SWH 60-06) (Thickness : 1.9mm)';
    if (code === 'SWH 60-03') return 'SLD SASH 42MM X 57MM (SWH 60-03) (Thickness : 1.9mm)';
    if (isSliderSash) {
      return isDoorInitial ? defaultSlidingDoorSash : defaultSlidingWindowSash;
    }
    return isDoorInitial ? defaultDoorSash : defaultWindowSash;
  };

  const [topSashProfile, setTopSashProfile] = useState<string>(() => {
    return getSashProfileString(pocket.sashProfileCode, pocket.sashProfileTop);
  });

  const [topReinforcement, setTopReinforcement] = useState<string>(() => {
    if (pocket.reinforcementCavity) return pocket.reinforcementCavity;
    if (isSliderSash) return 'RI-TP2-15MM X 29MM X 15MM (SRI 60-03-1.5MM)';
    return isDoorInitial ? defaultDoorReinforcement : defaultWindowReinforcement;
  });

  const [bottomSashProfile, setBottomSashProfile] = useState<string>(() => {
    return getSashProfileString(pocket.sashProfileCode, pocket.sashProfileBottom);
  });

  const [bottomReinforcement, setBottomReinforcement] = useState<string>(() => {
    if (pocket.reinforcementCavity) return pocket.reinforcementCavity;
    if (isSliderSash) return 'RI-TP2-15MM X 29MM X 15MM (SRI 60-03-1.5MM)';
    return isDoorInitial ? defaultDoorReinforcement : defaultWindowReinforcement;
  });

  const [leftSashProfile, setLeftSashProfile] = useState<string>(() => {
    return getSashProfileString(pocket.sashProfileCode, pocket.sashProfileLeft);
  });

  const [leftReinforcement, setLeftReinforcement] = useState<string>(() => {
    if (pocket.reinforcementCavity) return pocket.reinforcementCavity;
    if (isSliderSash) return 'RI-TP2-15MM X 29MM X 15MM (SRI 60-03-1.5MM)';
    return isDoorInitial ? defaultDoorReinforcement : defaultWindowReinforcement;
  });

  const [rightSashProfile, setRightSashProfile] = useState<string>(() => {
    return getSashProfileString(pocket.sashProfileCode, pocket.sashProfileRight);
  });

  const [rightReinforcement, setRightReinforcement] = useState<string>(() => {
    if (pocket.reinforcementCavity) return pocket.reinforcementCavity;
    if (isSliderSash) return 'RI-TP2-15MM X 29MM X 15MM (SRI 60-03-1.5MM)';
    return isDoorInitial ? defaultDoorReinforcement : defaultWindowReinforcement;
  });

  // Re-sync sash profiles & fixShutter when active pocket updates
  useEffect(() => {
    setFixShutter(pocket.sashType === 'fixed' ? 'Yes' : 'No');
    setTopSashProfile(getSashProfileString(pocket.sashProfileCode, pocket.sashProfileTop));
    setBottomSashProfile(getSashProfileString(pocket.sashProfileCode, pocket.sashProfileBottom));
    setLeftSashProfile(getSashProfileString(pocket.sashProfileCode, pocket.sashProfileLeft));
    setRightSashProfile(getSashProfileString(pocket.sashProfileCode, pocket.sashProfileRight));
    if (pocket.reinforcementCavity) {
      setTopReinforcement(pocket.reinforcementCavity);
      setBottomReinforcement(pocket.reinforcementCavity);
      setLeftReinforcement(pocket.reinforcementCavity);
      setRightReinforcement(pocket.reinforcementCavity);
    }
  }, [
    pocket.id,
    pocket.sashProfileCode,
    pocket.sashType,
    pocket.sashProfileTop,
    pocket.sashProfileBottom,
    pocket.sashProfileLeft,
    pocket.sashProfileRight,
    pocket.reinforcementCavity,
  ]);

  // Handle System Change
  const handleSystemChange = (newSys: string) => {
    setSystem(newSys);
    const newMatchedSeries =
      seriesList.find(
        (s) => s.name.toLowerCase() === newSys.toLowerCase() || s.id.toLowerCase() === newSys.toLowerCase()
      ) ||
      (newSys.toLowerCase().includes('sliding')
        ? seriesList.find((s) => s.type === 'sliding')
        : seriesList.find((s) => s.type === 'casement'));

    const isSlider = newSys.toLowerCase().includes('sliding') || newMatchedSeries?.type === 'sliding';
    const isDoor = partGroup.toLowerCase().includes('door') || isDoorInitial;

    // Automatically set frame to the first frame saved in this newly selected series
    const newFrames = getFramesForSystem(newSys, seriesList, isSlider);
    if (newFrames.length > 0) {
      const firstF = newFrames[0];
      setFrameProfileCode(firstF.code);
      if (onUpdateFrame) {
        onUpdateFrame({
          ...frame,
          seriesCode: newMatchedSeries?.id || newMatchedSeries?.code || frame.seriesCode,
          series: newMatchedSeries?.name || newSys,
          frameProfileCode: firstF.code,
          frameProfileWidth: firstF.height || frame.frameProfileWidth || 60,
        });
      }
    }

    if (activeMode === 'mesh') {
      const targetGroup = isDoor ? 'Door Mesh' : 'Window Mesh';
      setPartGroup(targetGroup);
      handlePartGroupChange(targetGroup);
      return;
    }

    const targetGroup = isDoor ? 'Door' : 'Window';
    setPartGroup(targetGroup);

    if (isSlider) {
      setRollerHardware(
        isDoor
          ? 'DOUBLE WHEEL ADJUSTABLE WITH GROOVE (UPVC-HW-DWAG)'
          : 'SINGLE WHEEL WITH GROOVE (UPVC-HW-SWG)'
      );
      setHandleHardware(
        isDoor
          ? 'SLD D HANDLE (UPVC-HW-SDH)'
          : 'SLD TOUCH LOCK RIGHT (UPVC-HW-STLR)'
      );
      const sldDefault = isDoor ? defaultSlidingDoorSash : defaultSlidingWindowSash;
      setTopSashProfile(sldDefault);
      setBottomSashProfile(sldDefault);
      setLeftSashProfile(sldDefault);
      setRightSashProfile(sldDefault);
    } else {
      setHingeStayType(isDoor ? 'Hinges' : 'Friction Stay');
      setDoorShutterHinges(isDoor ? '3D HINGES (UPVC-HW-3DH)' : '2D HINGES (UPVC-HW-2DH)');
      setHandleHardware(
        isDoor
          ? 'CASEMENT DOUBLE SIDE DOOR HANDLE (UPVC-HW-CMTDSDH)'
          : 'COCKSPUR HANDLE LEFT (UPVC-HW-CHL)'
      );
      setTopSashProfile(isDoor ? defaultDoorSash : defaultWindowSash);
      setBottomSashProfile(isDoor ? defaultDoorSash : defaultWindowSash);
      setLeftSashProfile(isDoor ? defaultDoorSash : defaultWindowSash);
      setRightSashProfile(isDoor ? defaultDoorSash : defaultWindowSash);
      setTopReinforcement(isDoor ? defaultDoorReinforcement : defaultWindowReinforcement);
      setBottomReinforcement(isDoor ? defaultDoorReinforcement : defaultWindowReinforcement);
      setLeftReinforcement(isDoor ? defaultDoorReinforcement : defaultWindowReinforcement);
      setRightReinforcement(isDoor ? defaultDoorReinforcement : defaultWindowReinforcement);
    }
  };

  // Handle Frame Profile Change (Outer Frame Profile)
  const handleFrameProfileChange = (newCode: string) => {
    setFrameProfileCode(newCode);
    const matchedF = availableFrameProfiles.find((fp) => fp.code === newCode);
    const updatedFrameData: UPVCFrame = {
      ...frame,
      frameProfileCode: newCode,
      frameProfileWidth: matchedF?.height || frame.frameProfileWidth || 60,
      seriesCode: selectedSeries?.id || selectedSeries?.code || frame.seriesCode,
      series: selectedSeries?.name || system,
    };
    if (onUpdateFrame) {
      onUpdateFrame(updatedFrameData);
    }
    const updatedPkt: FramePocket = {
      ...pocket,
      frameProfileCode: newCode,
      seriesCode: selectedSeries?.id || selectedSeries?.code || pocket.seriesCode,
    };
    onSavePocket(frame.id, updatedPkt);
  };

  // Handle Part Group Change
  const handlePartGroupChange = (newGroup: string) => {
    setPartGroup(newGroup);
    const isDoor = newGroup.toLowerCase().includes('door');
    const isMesh = newGroup.toLowerCase().includes('mesh') || activeMode === 'mesh';

    if (isMesh) {
      setActiveMode('mesh');
      setHandleHardware(isDoor ? 'SLD C HANDLE (UPVC-HW-SCH)' : 'FLY MESH HANDLE (UPVC-HW-FMH)');
      setRollerHardware('FLY MESH SCREEN ROLLER (UPVC-HW-MR8)');
      return;
    }

    setActiveMode('shutter');

    if (!isCurrentSlider) {
      // Casement Series
      setSystem('DURON 60MM CASEMENT SERIES');
      if (isDoor) {
        setHingeStayType('Hinges');
        setDoorShutterHinges('3D HINGES (UPVC-HW-3DH)');
        setHandleHardware('CASEMENT DOUBLE SIDE DOOR HANDLE (UPVC-HW-CMTDSDH)');
        setTopSashProfile(defaultDoorSash);
        setBottomSashProfile(defaultDoorSash);
        setLeftSashProfile(defaultDoorSash);
        setRightSashProfile(defaultDoorSash);
        setTopReinforcement(defaultDoorReinforcement);
        setBottomReinforcement(defaultDoorReinforcement);
        setLeftReinforcement(defaultDoorReinforcement);
        setRightReinforcement(defaultDoorReinforcement);
      } else {
        setHingeStayType('Friction Stay');
        setHandleHardware('COCKSPUR HANDLE LEFT (UPVC-HW-CHL)');
        setTopSashProfile(defaultWindowSash);
        setBottomSashProfile(defaultWindowSash);
        setLeftSashProfile(defaultWindowSash);
        setRightSashProfile(defaultWindowSash);
        setTopReinforcement(defaultWindowReinforcement);
        setBottomReinforcement(defaultWindowReinforcement);
        setLeftReinforcement(defaultWindowReinforcement);
        setRightReinforcement(defaultWindowReinforcement);
      }
    } else {
      // Sliding Series
      setSystem('DURON 60MM SLIDING SERIES');
      if (isDoor) {
        setRollerHardware('DOUBLE WHEEL ADJUSTABLE WITH GROOVE (UPVC-HW-DWAG)');
        setHandleHardware('SLD D HANDLE (UPVC-HW-SDH)');
        setTopSashProfile(defaultSlidingDoorSash);
        setBottomSashProfile(defaultSlidingDoorSash);
        setLeftSashProfile(defaultSlidingDoorSash);
        setRightSashProfile(defaultSlidingDoorSash);
      } else {
        setRollerHardware('SINGLE WHEEL WITH GROOVE (UPVC-HW-SWG)');
        setHandleHardware('SLD TOUCH LOCK RIGHT (UPVC-HW-STLR)');
        setTopSashProfile(defaultSlidingWindowSash);
        setBottomSashProfile(defaultSlidingWindowSash);
        setLeftSashProfile(defaultSlidingWindowSash);
        setRightSashProfile(defaultSlidingWindowSash);
      }
    }
  };

  // Synchronized Sash Profile changes (All 4 sides Top, Bottom, Left, Right synchronize together)
  const handleTopSashChange = (val: string) => {
    setTopSashProfile(val);
    setBottomSashProfile(val);
    setLeftSashProfile(val);
    setRightSashProfile(val);
  };

  const handleBottomSashChange = (val: string) => {
    setBottomSashProfile(val);
    setTopSashProfile(val);
    setLeftSashProfile(val);
    setRightSashProfile(val);
  };

  const handleLeftSashChange = (val: string) => {
    setLeftSashProfile(val);
    setTopSashProfile(val);
    setBottomSashProfile(val);
    setRightSashProfile(val);
  };

  const handleRightSashChange = (val: string) => {
    setRightSashProfile(val);
    setTopSashProfile(val);
    setBottomSashProfile(val);
    setLeftSashProfile(val);
  };

  const handleTopReinforcementChange = (val: string) => {
    setTopReinforcement(val);
    setBottomReinforcement(val);
    setLeftReinforcement(val);
    setRightReinforcement(val);
  };

  const handleBottomReinforcementChange = (val: string) => {
    setBottomReinforcement(val);
    setTopReinforcement(val);
    setLeftReinforcement(val);
    setRightReinforcement(val);
  };

  const handleLeftReinforcementChange = (val: string) => {
    setLeftReinforcement(val);
    setTopReinforcement(val);
    setBottomReinforcement(val);
    setRightReinforcement(val);
  };

  const handleRightReinforcementChange = (val: string) => {
    setRightReinforcement(val);
    setTopReinforcement(val);
    setBottomReinforcement(val);
    setLeftReinforcement(val);
  };

  // Helper to extract thickness info from selected sash profile
  const getSelectedSashThickness = (profileStr: string) => {
    // Sliding Profiles
    if (profileStr.includes('SWH 60-04') || profileStr.includes('42MM X 66MM') || profileStr.includes('66MM')) return 'Thickness : 2.2mm';
    if (profileStr.includes('SWH 60-05') || profileStr.includes('42MM X 75MM') || profileStr.includes('75MM')) return 'Thickness : 2.1mm';
    if (profileStr.includes('SWH 60-03') || profileStr.includes('42MM X 57MM') || profileStr.includes('57MM')) return 'Thickness : 1.9mm';
    if (profileStr.includes('SWH 60-06') || profileStr.includes('42MM X 88MM') || profileStr.includes('88MM')) return 'Thickness : 1.9mm';
    // Explicit thickness strings
    if (profileStr.includes('Thickness : 2.2mm') || profileStr.includes('2.2mm')) return 'Thickness : 2.2mm';
    if (profileStr.includes('Thickness : 2.1mm') || profileStr.includes('2.1mm')) return 'Thickness : 2.1mm';
    if (profileStr.includes('Thickness : 1.9mm') || profileStr.includes('1.9mm')) return 'Thickness : 1.9mm';
    // Casement Profiles
    if (profileStr.includes('CWH 60-03') || profileStr.includes('CWH 60-04') || profileStr.includes('CWH 60-07')) return 'Thickness : 2.2mm';
    if (profileStr.includes('CWH 60-06')) return 'Thickness : 1.9mm';
    return 'Standard Wall';
  };

  // Handle Apply Submission
  const handleApply = () => {
    let resolvedSashType: SashType = pocket.sashType || (isCurrentSlider ? 'slider_arrow_right' : 'casement_left');
    let resolvedHandleType: any = pocket.handleType || (isCurrentSlider ? 'sliding_flush' : 'casement_espag');
    let assignedCode: string | undefined = undefined;
    let isMesh = false;

    if (fixShutter === 'Yes' || partGroup.includes('Fixed')) {
      resolvedSashType = 'fixed';
      resolvedHandleType = 'none';
    } else if (activeMode === 'mesh' || partGroup.includes('Mesh')) {
      resolvedSashType = 'mesh_slider_right';
      resolvedHandleType = handleHardware.includes('SCH') ? 'c_handle' : 'sliding_flush';
      isMesh = true;
    } else {
      const hh = handleHardware.toUpperCase();

      if (hh.includes('UPVC-HW-CHL') || (hh.includes('COCKSPUR') && hh.includes('LEFT'))) {
        resolvedHandleType = 'cockspur_left';
        assignedCode = 'UPVC-HW-CHL';
      } else if (hh.includes('UPVC-HW-CHR') || (hh.includes('COCKSPUR') && hh.includes('RIGHT'))) {
        resolvedHandleType = 'cockspur_right';
        assignedCode = 'UPVC-HW-CHR';
      } else if (hh.includes('UPVC-HW-CMTDSDHKEY') || (hh.includes('DOUBLE SIDE') && hh.includes('KEY'))) {
        resolvedHandleType = 'door_double_side_key';
        assignedCode = 'UPVC-HW-CMTDSDHKEY';
      } else if (hh.includes('UPVC-HW-CMTDSDH') || hh.includes('DOUBLE SIDE')) {
        resolvedHandleType = 'door_double_side';
        assignedCode = 'UPVC-HW-CMTDSDH';
      } else if (hh.includes('UPVC HW-CDLS') || hh.includes('UPVC-HW-CDLS') || hh.includes('CMT DOOR')) {
        resolvedHandleType = 'door_lock_set';
        assignedCode = 'UPVC-HW-CDLS';
      } else if (hh.includes('UPVC-HW-MLS') || hh.includes('MORTIES') || hh.includes('MORTISE')) {
        resolvedHandleType = 'mortise_lock_set';
        assignedCode = 'UPVC-HW-MLS';
      } else if (hh.includes('UPVC-HW-SCEHKEY') || (hh.includes('ESPAG') && hh.includes('KEY') && !hh.includes('WITHOUT') && !hh.includes('NO KEY'))) {
        resolvedHandleType = 'espag_key';
        assignedCode = 'UPVC-HW-SCEHKEY';
      } else if (hh.includes('UPVC-HW-SCEHWK') || (hh.includes('ESPAG') && (hh.includes('WITHOUT') || hh.includes('NO KEY')))) {
        resolvedHandleType = 'espag_no_key';
        assignedCode = 'UPVC-HW-SCEHWK';
      } else if (hh.includes('UPVC-HW-DSDHK') || (hh.includes('DOUBLE SIDE') && hh.includes('KEY'))) {
        resolvedHandleType = 'door_double_side_key';
        assignedCode = 'UPVC-HW-DSDHK';
      } else if (hh.includes('UPVC-HW-SDSDHWK') || (hh.includes('DOUBLE SIDE') && !hh.includes('KEY'))) {
        resolvedHandleType = 'door_double_side';
        assignedCode = 'UPVC-HW-SDSDHWK';
      } else if (hh.includes('UPVC-HW-LCKSET') || hh.includes('LOCKING SET') || hh.includes('LOCK SET')) {
        resolvedHandleType = 'door_lock_set';
        assignedCode = 'UPVC-HW-LCKSET';
      } else if (hh.includes('UPVC-HW-SDH') || hh.includes('D-HANDLE') || hh.includes('D_PULL')) {
        resolvedHandleType = 'sliding_d_pull';
        assignedCode = 'UPVC-HW-SDH';
      } else if (hh.includes('UPVC-HW-POP-KEY') || (hh.includes('POP') && hh.includes('KEY'))) {
        resolvedHandleType = 'sliding_pop_key';
        assignedCode = 'UPVC-HW-POP-KEY';
      } else if (hh.includes('UPVC-HW-POPUPH') || hh.includes('POP')) {
        resolvedHandleType = 'pop_up';
        assignedCode = 'UPVC-HW-POPUPH';
      } else if (hh.includes('UPVC-HW-STLL') || (hh.includes('TOUCH') && hh.includes('LEFT'))) {
        resolvedHandleType = 'sliding_touch_left';
        assignedCode = 'UPVC-HW-STLL';
      } else if (hh.includes('UPVC-HW-STLR') || (hh.includes('TOUCH') && hh.includes('RIGHT'))) {
        resolvedHandleType = 'sliding_touch_right';
        assignedCode = 'UPVC-HW-STLR';
      } else if (hh.includes('UPVC-HW-STLL / STLR') || hh.includes('TOUCH') || hh.includes('FLUSH')) {
        resolvedHandleType = 'sliding_flush';
        assignedCode = 'UPVC-HW-STLL / STLR';
      } else if (hh.includes('UPVC-HW-FMH') || hh.includes('FLY MESH')) {
        resolvedHandleType = 'fly_mesh_handle';
        assignedCode = 'UPVC-HW-FMH';
      } else if (hh.includes('UPVC-HW-SCH') || hh.includes('C HANDLE')) {
        resolvedHandleType = 'c_handle';
        assignedCode = 'UPVC-HW-SCH';
      } else if (hh.includes('CRESCENT')) {
        resolvedHandleType = 'crescent_lock';
      }

      // Preserve existing sash direction unless user explicitly selected fixed
      if (pocket.sashType && pocket.sashType !== 'fixed') {
        resolvedSashType = pocket.sashType;
      }
    }

    // Determine accurate sash profile code by checking all sides (Top, Bottom, Left, Right)
    const allSashProfiles = [topSashProfile, bottomSashProfile, leftSashProfile, rightSashProfile].join(' ');
    let chosenSashProfileCode = pocket.sashProfileCode;
    if (isCurrentSlider) {
      if (allSashProfiles.includes('60-06') || allSashProfiles.includes('88MM')) {
        chosenSashProfileCode = 'SWH 60-06';
      } else if (allSashProfiles.includes('60-05') || allSashProfiles.includes('75MM')) {
        chosenSashProfileCode = 'SWH 60-05';
      } else if (allSashProfiles.includes('60-04') || allSashProfiles.includes('66MM')) {
        chosenSashProfileCode = 'SWH 60-04';
      } else if (allSashProfiles.includes('60-03') || allSashProfiles.includes('57MM')) {
        chosenSashProfileCode = 'SWH 60-03';
      } else {
        chosenSashProfileCode = isCurrentDoor ? 'SWH 60-05' : 'SWH 60-03';
      }
    } else {
      if (allSashProfiles.includes('60-12') || allSashProfiles.includes('58MM')) {
        chosenSashProfileCode = 'CWH 60-12';
      } else if (allSashProfiles.includes('65-06') || allSashProfiles.includes('115MM')) {
        chosenSashProfileCode = 'CWH 65-06';
      } else if (allSashProfiles.includes('60-07')) {
        chosenSashProfileCode = 'CWH 60-07';
      } else if (allSashProfiles.includes('60-06') || (isCurrentDoor && !allSashProfiles.includes('60-03') && !allSashProfiles.includes('60-04'))) {
        chosenSashProfileCode = 'CWH 60-06';
      } else if (allSashProfiles.includes('60-04') || allSashProfiles.includes('71MM')) {
        chosenSashProfileCode = 'CWH 60-04';
      } else {
        chosenSashProfileCode = isCurrentDoor ? 'CWH 60-06' : 'CWH 60-03';
      }
    }

    if (fixShutter === 'No' && resolvedSashType === 'fixed') {
      resolvedSashType = isCurrentSlider ? 'slider_arrow_right' : 'casement_left';
    }

    // User rule: All 4 sides of the sash (Top, Bottom, Left, Right) always use the same profile section
    let finalTopSash = topSashProfile;
    let finalBottomSash = topSashProfile;
    let finalLeftSash = topSashProfile;
    let finalRightSash = topSashProfile;

    if (allowEqualization || isCurrentSlider || !isCurrentSlider) {
      if (chosenSashProfileCode === 'SWH 60-04') {
        const str66 = 'SLD SASH 42MM X 66MM (SWH 60-04) (Thickness : 2.2mm)';
        finalTopSash = str66;
        finalBottomSash = str66;
        finalLeftSash = str66;
        finalRightSash = str66;
      } else if (chosenSashProfileCode === 'SWH 60-03') {
        const str57 = 'SLD SASH 42MM X 57MM (SWH 60-03) (Thickness : 1.9mm)';
        finalTopSash = str57;
        finalBottomSash = str57;
        finalLeftSash = str57;
        finalRightSash = str57;
      } else if (chosenSashProfileCode === 'SWH 60-05') {
        const str75 = 'SLD SASH 42MM X 75MM (SWH 60-05) (Thickness : 2.1mm)';
        finalTopSash = str75;
        finalBottomSash = str75;
        finalLeftSash = str75;
        finalRightSash = str75;
      } else if (chosenSashProfileCode === 'SWH 60-06') {
        const str88 = 'SLD SASH 42MM X 88MM (SWH 60-06) (Thickness : 1.9mm)';
        finalTopSash = str88;
        finalBottomSash = str88;
        finalLeftSash = str88;
        finalRightSash = str88;
      } else if (chosenSashProfileCode === 'CWH 60-03') {
        const str = 'CMT OUTWARD SASH 60MM X 78MM (CWH 60-03) (Thickness : 2.2mm)';
        finalTopSash = str;
        finalBottomSash = str;
        finalLeftSash = str;
        finalRightSash = str;
      } else if (chosenSashProfileCode === 'CWH 60-04') {
        const str = 'CMT INWARD SASH 60MM X 71MM (CWH 60-04) (Thickness : 2.2mm)';
        finalTopSash = str;
        finalBottomSash = str;
        finalLeftSash = str;
        finalRightSash = str;
      } else if (chosenSashProfileCode === 'CWH 60-06') {
        const str = 'CMT OUTWARD SASH 60MM X 104MM (CWH 60-06) (Thickness : 1.9mm)';
        finalTopSash = str;
        finalBottomSash = str;
        finalLeftSash = str;
        finalRightSash = str;
      } else if (chosenSashProfileCode === 'CWH 60-07') {
        const str = 'CMT INWARD SASH 60MM X 104MM (CWH 60-07) (Thickness : 2.2mm)';
        finalTopSash = str;
        finalBottomSash = str;
        finalLeftSash = str;
        finalRightSash = str;
      } else if (chosenSashProfileCode === 'CWH 60-12') {
        const str = 'CMT SLIM SASH 58MM X 60MM (CWH 60-12) (Thickness : 2.0mm)';
        finalTopSash = str;
        finalBottomSash = str;
        finalLeftSash = str;
        finalRightSash = str;
      } else if (chosenSashProfileCode === 'CWH 65-06') {
        const str = 'COMMERCIAL ENTRANCE SASH 115MM (CWH 65-06) (Thickness : 2.2mm)';
        finalTopSash = str;
        finalBottomSash = str;
        finalLeftSash = str;
        finalRightSash = str;
      }
    }

    const safeGHH = pocket.handleHeight ?? (isCurrentDoor ? 1000 : Math.round(pocket.height / 2));
    const is3Side = isCurrentDoor && frameSides === '3_side';

    const matchedF = availableFrameProfiles.find((fp) => fp.code === frameProfileCode);
    if (onUpdateFrame) {
      const updatedF = {
        ...frame,
        isThreeSidedFrame: is3Side,
        frameSides: is3Side ? ('3_side' as const) : ('4_side' as const),
        frameProfileCode: frameProfileCode || frame.frameProfileCode,
        frameProfileWidth: matchedF?.height || frame.frameProfileWidth || 60,
        seriesCode: selectedSeries?.id || selectedSeries?.code || frame.seriesCode,
        series: selectedSeries?.name || system,
      };
      updatedF.pockets = recalculateFramePockets(updatedF);
      onUpdateFrame(updatedF);
    }

    const updated: FramePocket = {
      ...pocket,
      isThreeSidedFrame: is3Side,
      frameSides: is3Side ? '3_side' : '4_side',
      frameProfileCode: frameProfileCode || pocket.frameProfileCode,
      seriesCode: selectedSeries?.id || selectedSeries?.code || pocket.seriesCode,
      sashType: resolvedSashType,
      handleType: resolvedHandleType,
      handleCode: assignedCode || pocket.handleCode,
      applicationType: isCurrentDoor ? 'door' : 'window',
      sashProfileCode: chosenSashProfileCode,
      rollerType: isCurrentSlider ? rollerHardware : undefined,
      hingeType: !isCurrentSlider ? (isCurrentDoor ? doorShutterHinges : hingeStayType) : undefined,
      stayType: !isCurrentSlider ? hingeStayType : undefined,
      tLockType: tLock,
      shutterHingeType: isCurrentDoor ? doorShutterHinges : undefined,
      sashProfileTop: finalTopSash,
      sashProfileBottom: finalBottomSash,
      sashProfileLeft: finalLeftSash,
      sashProfileRight: finalRightSash,
      reinforcementCavity: topReinforcement,
      glassType: selectedGlassType,
      glassName: (customGlassName || '').trim() || getGlassDisplayName(selectedGlassType),
      hasMesh: isMesh || pocket.hasMesh,
      handleHeight: Math.min(safeGHH, Math.max(80, pocket.height - 80)),
    };

    onSavePocket(frame.id, updated);
    onClose();
  };

  return (
    <div
      className={`${
        isDocked
          ? 'w-80 lg:w-96 shrink-0 h-full border-l border-slate-200'
          : 'fixed top-0 right-0 h-full w-[380px] sm:w-[420px] z-50 shadow-2xl border-l border-slate-200'
      } bg-white flex flex-col font-sans overflow-hidden`}
    >
      {/* Header: Properties with Dimensions and Close Icon */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              {lang === 'hi' ? 'प्रॉपर्टीज़ (Properties)' : 'Properties'}
            </h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {frame.name || `Frame ${Math.round(frame.width)}×${Math.round(frame.height)}`}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Bay {Math.round(pocket.width)} × {Math.round(pocket.height)} mm • Frame {Math.round(frame.width)} × {Math.round(frame.height)} mm
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-slate-700 custom-scrollbar">
        {/* 1. SYSTEM (सिस्टम / सीरीज चयन) */}
        <div className="space-y-1.5 p-3 bg-slate-50/90 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>1. {lang === 'hi' ? 'सिस्टम (SYSTEM)' : 'SYSTEM'}</span>
            </label>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
              {selectedSeries?.type === 'sliding' || isCurrentSlider ? 'Sliding Series' : 'Casement Series'}
            </span>
          </div>
          <div className="relative">
            <select
              value={system}
              onChange={(e) => handleSystemChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-3 pr-8 text-xs font-bold text-slate-800 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-xs"
            >
              {systemOptions.map((sys) => (
                <option key={sys} value={sys}>
                  {sys}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 2. FRAME (फ़्रेम प्रोफाइल - इस सिस्टम नाम की सीरीज में सेव सभी फ्रेम) */}
        <div className="space-y-2.5 p-3 bg-blue-50/70 rounded-xl border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>2. {lang === 'hi' ? 'फ़्रेम (FRAME)' : 'FRAME'}</span>
            </label>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
              {availableFrameProfiles.length} {availableFrameProfiles.length === 1 ? 'Frame' : 'Frames'} in {selectedSeries?.name || 'Series'}
            </span>
          </div>

          {/* Frame Profile Selector (Outer Frame from the selected Series) */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
              <span>{lang === 'hi' ? 'सीरीज में सेव फ़्रेम (Saved Outer Frames)' : 'Frames Saved in Series'}</span>
              <span className="text-[9px] text-blue-600 font-semibold">{selectedSeries?.brand || ''}</span>
            </div>
            <div className="relative">
              <select
                value={frameProfileCode}
                onChange={(e) => handleFrameProfileChange(e.target.value)}
                className="w-full bg-white border border-blue-300 rounded-lg py-2 pl-3 pr-8 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-xs"
              >
                {availableFrameProfiles.map((fp) => (
                  <option key={fp.code} value={fp.code}>
                    {fp.code} — {fp.name} ({fp.height}mm) {fp.isSavedInSeries ? '★ Saved' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {selectedFrameProfileDetails && (
              <div className="flex items-center justify-between text-[10px] text-blue-800 bg-blue-100/60 px-2 py-1 rounded-md mt-1 font-medium">
                <span>Face Width: <strong>{selectedFrameProfileDetails.height}mm</strong></span>
                {selectedFrameProfileDetails.beadingSideHeight && (
                  <span>Inner Rebate: <strong>{selectedFrameProfileDetails.beadingSideHeight}mm</strong></span>
                )}
                <span className="text-emerald-700 font-bold">
                  {selectedFrameProfileDetails.isSavedInSeries ? '✓ Saved in Series' : 'Standard'}
                </span>
              </div>
            )}
          </div>

          {/* Assembly Frame Switcher (if multiple frames exist in the project) */}
          {frames && frames.length > 1 && (
            <div className="pt-2 border-t border-blue-200/70 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-900">
                <span>{lang === 'hi' ? 'असेंबली फ़्रेम चुनें' : 'Select Assembly Frame'}:</span>
                <span className="text-blue-600 font-bold">
                  {frames.findIndex((f) => f.id === frame.id) + 1} of {frames.length}
                </span>
              </div>
              <div className="relative">
                <select
                  value={frame.id}
                  onChange={(e) => {
                    if (onSelectFrame) {
                      onSelectFrame(e.target.value);
                    }
                  }}
                  className="w-full bg-white border border-blue-300 rounded-lg py-1.5 pl-2.5 pr-8 text-[11px] font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-xs"
                >
                  {frames.map((f, idx) => {
                    const bayCount = f.pockets?.length || 1;
                    return (
                      <option key={f.id} value={f.id}>
                        {`Frame ${idx + 1}: ${f.name || 'Window/Door'} (${Math.round(f.width)} × ${Math.round(f.height)} mm) • ${bayCount} Bay(s)`}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-blue-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Quick Frame Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 pb-0.5 custom-scrollbar">
                {frames.map((f, idx) => {
                  const isCur = f.id === frame.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onSelectFrame && onSelectFrame(f.id)}
                      className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                        isCur
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>F{idx + 1}</span>
                      <span className={isCur ? 'text-blue-200' : 'text-slate-400'}>
                        {Math.round(f.width)}×{Math.round(f.height)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bay / Pocket Navigation within the current frame */}
          {frame.pockets && frame.pockets.length > 1 && (
            <div className="pt-2 border-t border-blue-200/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  {lang === 'hi' ? 'खाना / बे चुनें (Bay Select):' : 'Bay / Pocket Select:'}
                </span>
                <span className="text-[10px] text-blue-700 font-bold">
                  {frame.pockets.length} Bays
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {frame.pockets.map((pkt, pIdx) => {
                  const isSelected = pkt.id === pocket.id;
                  return (
                    <button
                      key={pkt.id}
                      type="button"
                      onClick={() => onSelectPocket && onSelectPocket(pkt.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition border cursor-pointer ${
                        isSelected
                          ? 'bg-white border-blue-500 text-blue-700 shadow-xs ring-1 ring-blue-400 font-bold'
                          : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Bay {pIdx + 1}</span>
                        <span className="text-[10px] opacity-75">{Math.round(pkt.width)}×{Math.round(pkt.height)}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {pkt.sashType?.replace(/_/g, ' ') || 'Fixed Glass'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Shutter vs Mesh Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => handleModeChange('shutter')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'shutter'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🪟 {isCurrentSlider ? 'Sliding' : 'Casement'} Shutter</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('mesh')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'mesh'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🕸️ Mesh (जाली)</span>
          </button>
        </div>

        {/* 2. Part group */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 tracking-wide block">
              Part group
            </label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm">
              {activeMode === 'mesh' ? 'Mesh (जाली)' : isCurrentSlider ? 'Sliding Shutter' : 'Casement Shutter'}
            </span>
          </div>
          <div className="relative">
            <select
              value={partGroup}
              onChange={(e) => handlePartGroupChange(e.target.value)}
              className="w-full bg-transparent border-b border-slate-200 py-1.5 pr-8 text-sm font-semibold text-slate-800 focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
            >
              {activeMode === 'mesh' ? (
                MESH_PART_GROUPS.map((pg) => (
                  <option key={pg} value={pg}>
                    {lang === 'hi'
                      ? pg === 'Door Mesh'
                        ? 'Door Mesh (डोर मेश जाली)'
                        : 'Window Mesh (विंडो मेश जाली)'
                      : pg}
                  </option>
                ))
              ) : isCurrentSlider ? (
                SLIDING_PART_GROUPS.map((pg) => (
                  <option key={pg} value={pg}>
                    {lang === 'hi'
                      ? pg === 'Door'
                        ? 'Door (डोर)'
                        : 'Window (विंडो)'
                      : pg}
                  </option>
                ))
              ) : (
                CASEMENT_PART_GROUPS.map((pg) => (
                  <option key={pg} value={pg}>
                    {lang === 'hi'
                      ? pg === 'Door'
                        ? 'Door (डोर)'
                        : 'Window (विंडो)'
                      : pg}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Fix Shutter (as shown in reference image: 'Fix Shutter' -> 'No' / 'Yes') */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 tracking-wide block">
            Fix Shutter
          </label>
          <div className="relative">
            <select
              value={fixShutter}
              onChange={(e) => handleFixShutterChange(e.target.value as 'No' | 'Yes')}
              className="w-full bg-transparent border-b border-slate-200 py-1.5 pr-8 text-sm font-semibold text-slate-800 focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Frame Sides Option (FRAME 3 SIDE / नीचे चौखट नहीं) for Door */}
        {isCurrentDoor && (
          <div className="space-y-1.5 p-2.5 bg-amber-50/80 border border-amber-300 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 tracking-wide flex items-center gap-1">
                <span>🚪 Frame Type (चौखट प्रकार)</span>
              </label>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                frameSides === '3_side'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {frameSides === '3_side' ? '3 SIDES (NO SILL)' : '4 SIDES'}
              </span>
            </div>
            <div className="relative">
              <select
                value={frameSides}
                onChange={(e) => setFrameSides(e.target.value as '4_side' | '3_side')}
                className="w-full bg-white border border-amber-300 rounded-md py-1.5 px-2 pr-8 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 appearance-none cursor-pointer"
              >
                <option value="4_side">4 Sides Frame (Standard - चारों तरफ चौखट)</option>
                <option value="3_side">Frame 3 Side (3 साइड फ्रेम - नीचे वाला फ्रेम नहीं)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-amber-700 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {frameSides === '3_side' && (
              <div className="text-[10px] text-amber-900 leading-tight space-y-0.5 pt-0.5 font-medium">
                <div>✓ <strong>Width:</strong> FW + 6mm ➔ 1 PC (Top Only)</div>
                <div>✓ <strong>Height:</strong> FH + 3mm ➔ 2 PCS (Left & Right)</div>
                <div>✓ <strong>Bottom Frame:</strong> Removed / 0 PC (नीचे चौखट नहीं)</div>
              </div>
            )}
          </div>
        )}

        {/* 3. Hinges And Friction Stay (When Casement) */}
        {!isCurrentSlider && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 tracking-wide block">
              Hinges And Friction Stay
            </label>
            <div className="relative">
              <select
                value={hingeStayType}
                onChange={(e) => setHingeStayType(e.target.value)}
                className="w-full bg-transparent border-b border-slate-200 py-1.5 pr-8 text-sm font-semibold text-slate-800 focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
              >
                {isCurrentDoor ? (
                  <>
                    <option value="Hinges">Hinges</option>
                    <option value="Friction Stay">Friction Stay</option>
                    <option value="None">None</option>
                  </>
                ) : (
                  <>
                    <option value="Friction Stay">Friction Stay</option>
                    <option value="Hinges">Hinges</option>
                    <option value="None">None</option>
                  </>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* 4. Sliding Roller (When Sliding - includes DWAG from reference image) */}
        {isCurrentSlider && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
              <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
              <span>{isCurrentDoor ? 'DOOR ROLLER RSB' : 'WINDOW ROLLER RSB'}</span>
            </div>
            <div className="relative">
              <select
                value={rollerHardware}
                onChange={(e) => setRollerHardware(e.target.value)}
                className="w-full bg-transparent border-b border-slate-200 py-1.5 pr-8 text-sm font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
              >
                <option value="DOUBLE WHEEL ADJUSTABLE WITH GROOVE (UPVC-HW-DWAG)">
                  DOUBLE WHEEL ADJUSTABLE WITH GROOVE (UPVC-HW-DWAG)
                </option>
                <option value="SINGLE WHEEL WITH GROOVE (UPVC-HW-SWG)">
                  SINGLE WHEEL WITH GROOVE (UPVC-HW-SWG)
                </option>
                <option value="DOUBLE WHEEL WITHOUT GROOVE (UPVC-HW-SDWR)">
                  DOUBLE WHEEL WITHOUT GROOVE (UPVC-HW-SDWR)
                </option>
                <option value="DOUBLE WHEEL HEAVY TANDEM (UPVC-HW-HDTR)">
                  DOUBLE WHEEL HEAVY TANDEM (UPVC-HW-HDTR)
                </option>
                <option value="FLY MESH SCREEN ROLLER (UPVC-HW-MR8)">
                  FLY MESH SCREEN ROLLER (UPVC-HW-MR8)
                </option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* 5. HANDLE SECTION (Includes ESPAG HANDLE WITHOUT KEY from reference image) */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
            <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
            <span>
              {isCurrentSlider
                ? isCurrentDoor
                  ? 'DOOR HANDLE RIGHT'
                  : 'WINDOW HANDLE RIGHT'
                : isCurrentDoor
                ? 'DOOR SIDE HUNG HANDLE'
                : 'WINDOW SIDE HUNG HANDLE'}
            </span>
          </div>
          <div className="relative">
            <select
              value={handleHardware}
              onChange={(e) => setHandleHardware(e.target.value)}
              className="w-full bg-transparent border-b border-slate-200 py-1.5 pr-8 text-sm font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
            >
              {isCurrentMesh ? (
                <>
                  <option value="SLD C HANDLE (UPVC-HW-SCH)">
                    SLD C HANDLE (UPVC-HW-SCH)
                  </option>
                  <option value="FLY MESH HANDLE (UPVC-HW-FMH)">
                    FLY MESH HANDLE (UPVC-HW-FMH)
                  </option>
                  <option value="SLD TOUCH LOCK LEFT (UPVC-HW-STLL)">
                    SLD TOUCH LOCK LEFT (UPVC-HW-STLL)
                  </option>
                  <option value="ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY)">
                    ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY)
                  </option>
                  <option value="ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)">
                    ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)
                  </option>
                  <option value="SLD POP UP HANDLE (UPVC-HW-POPUPH)">
                    SLD POP UP HANDLE (UPVC-HW-POPUPH)
                  </option>
                  <option value="SLD POP UP HANDLE WITH KEY (UPVC-HW-POP-KEY)">
                    SLD POP UP HANDLE WITH KEY (UPVC-HW-POP-KEY)
                  </option>
                </>
              ) : isCurrentSlider ? (
                isCurrentDoor ? (
                  <>
                    <option value="ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)">
                      ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)
                    </option>
                    <option value="ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY)">
                      ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY)
                    </option>
                    <option value="SLD POP UP HANDLE (UPVC-HW-POPUPH)">
                      SLD POP UP HANDLE (UPVC-HW-POPUPH)
                    </option>
                    <option value="SLD POP UP HANDLE WITH KEY (UPVC-HW-POP-KEY)">
                      SLD POP UP HANDLE WITH KEY (UPVC-HW-POP-KEY)
                    </option>
                    <option value="SLD D HANDLE (UPVC-HW-SDH)">
                      SLD D HANDLE (UPVC-HW-SDH)
                    </option>
                    <option value="SLD DOOR LOCKING SET (UPVC-HW-LCKSET)">
                      SLD DOOR LOCKING SET (UPVC-HW-LCKSET)
                    </option>
                    <option value="SLD DOUBLE SIDE DOOR HANDLE WITH KEY (UPVC-HW-DSDHK)">
                      SLD DOUBLE SIDE DOOR HANDLE WITH KEY (UPVC-HW-DSDHK)
                    </option>
                    <option value="SLD DOUBLE SIDE DOOR HANDLE WITHOUT KEY (UPVC-HW-SDSDHWK)">
                      SLD DOUBLE SIDE DOOR HANDLE WITHOUT KEY (UPVC-HW-SDSDHWK)
                    </option>
                    <option value="SLD TOUCH LOCK LEFT (UPVC-HW-STLL)">
                      SLD TOUCH LOCK LEFT (UPVC-HW-STLL)
                    </option>
                  </>
                ) : (
                  <>
                    <option value="ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY)">
                      ESPAG HANDLE WITH KEY (UPVC-HW-SCEHKEY)
                    </option>
                    <option value="ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)">
                      ESPAG HANDLE WITHOUT KEY (UPVC-HW-SCEHWK)
                    </option>
                    <option value="SLD POP UP HANDLE (UPVC-HW-POPUPH)">
                      SLD POP UP HANDLE (UPVC-HW-POPUPH)
                    </option>
                    <option value="SLD POP UP HANDLE WITH KEY (UPVC-HW-POP-KEY)">
                      SLD POP UP HANDLE WITH KEY (UPVC-HW-POP-KEY)
                    </option>
                    <option value="SLD TOUCH LOCK LEFT (UPVC-HW-STLL)">
                      SLD TOUCH LOCK LEFT (UPVC-HW-STLL)
                    </option>
                  </>
                )
              ) : isCurrentDoor ? (
                CASEMENT_DOOR_HANDLES.map((hName) => (
                  <option key={hName} value={hName}>
                    {hName}
                  </option>
                ))
              ) : (
                CASEMENT_WINDOW_HANDLES.map((hName) => (
                  <option key={hName} value={hName}>
                    {hName}
                  </option>
                ))
              )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Visual Handle Preview Thumbnail */}
            <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg mt-2">
              <div className="p-1 bg-white rounded border border-slate-200 shadow-2xs">
                <HandleThumbnail
                  type={
                    handleHardware.toLowerCase().includes('espag')
                      ? 'casement_espag'
                      : handleHardware.toLowerCase().includes('d handle') || handleHardware.toLowerCase().includes('d-handle') || handleHardware.toLowerCase().includes('c handle') || handleHardware.includes('UPVC-HW-SDH') || handleHardware.includes('UPVC-HW-SCH')
                      ? 'sliding_d_pull'
                      : handleHardware.toLowerCase().includes('pop-up') || handleHardware.toLowerCase().includes('pop up') || handleHardware.toLowerCase().includes('pop-key')
                      ? 'sliding_pop_key'
                      : handleHardware.toLowerCase().includes('touch lock left') || handleHardware.toLowerCase().includes('stll')
                      ? 'sliding_touch_left'
                      : handleHardware.toLowerCase().includes('touch lock right') || handleHardware.toLowerCase().includes('stlr')
                      ? 'sliding_touch_right'
                      : handleHardware.toLowerCase().includes('touch lock') || handleHardware.toLowerCase().includes('fly mesh') || handleHardware.toLowerCase().includes('fmh')
                      ? 'sliding_touch_left'
                      : handleHardware.toLowerCase().includes('crescent')
                      ? 'sliding_crescent_lock'
                      : handleHardware.toLowerCase().includes('finger pull') || handleHardware.toLowerCase().includes('fpull')
                      ? 'sliding_flush'
                      : (handleHardware.toLowerCase().includes('double side') && handleHardware.toLowerCase().includes('key')) || handleHardware.includes('DSDHK')
                      ? 'door_double_side_key'
                      : handleHardware.toLowerCase().includes('double side') || handleHardware.toLowerCase().includes('lever') || handleHardware.toLowerCase().includes('locking set') || handleHardware.includes('LCKSET') || handleHardware.toLowerCase().includes('door')
                      ? 'door_lever'
                      : handleHardware.toLowerCase().includes('cockspur') && handleHardware.toLowerCase().includes('left')
                      ? 'cockspur_left'
                      : handleHardware.toLowerCase().includes('cockspur')
                      ? 'cockspur_right'
                      : 'casement_espag'
                  }
                  color={pocket.handleColor || 'silver'}
                  size={46}
                  orientation="right"
                />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800 line-clamp-1">{handleHardware.split('(')[0].trim()}</div>
                <div className="text-[10px] text-blue-600 font-medium">CAD Live Updated • {pocket.handleColor || 'Silver'} Finish</div>
              </div>
            </div>
          </div>

          {/* 6. T LOCK SECTION */}
          {!isCurrentSlider && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 tracking-wide block uppercase">
                {isCurrentDoor ? 'DOOR SIDE HUNG T LOCK' : 'WINDOW SIDE HUNG T LOCK'}
              </label>
              <div className="relative">
                <select
                  value={tLock}
                  onChange={(e) => setTLock(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-200 py-1.5 pr-8 text-sm font-semibold text-slate-800 focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                >
                  {T_LOCK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* 7. DOOR SHUTTER HINGES (Shown ONLY When Door, exactly as in Image 3) */}
          {!isCurrentSlider && isCurrentDoor && (
            <div className="space-y-1 pt-1 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
                <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                <span>DOOR SHUTTER HINGES</span>
              </div>
              <div className="relative">
                <select
                  value={doorShutterHinges}
                  onChange={(e) => setDoorShutterHinges(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-200 py-1.5 pr-8 text-sm font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                >
                  {DOOR_SHUTTER_HINGES.map((hName) => (
                    <option key={hName} value={hName}>
                      {hName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* 8. GLASS SPECIFICATION (काँच का प्रकार व नाम) */}
          <div className="space-y-2 pt-2 pb-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                <span>{lang === 'hi' ? 'काँच का प्रकार व नाम (GLASS)' : 'GLASS SPECIFICATION'}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {getGlassShortBadge(selectedGlassType, customGlassName)}
              </span>
            </div>

            {/* Glass Presets Dropdown */}
            <div className="relative">
              <select
                value={selectedGlassType}
                onChange={(e) => {
                  const newType = e.target.value as GlassType;
                  setSelectedGlassType(newType);
                  const matched = MASTER_GLASS_PRESETS.find((g) => g.id === newType);
                  if (matched) {
                    setCustomGlassName(matched.name);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg py-1.5 pl-2.5 pr-8 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-xs"
              >
                {MASTER_GLASS_PRESETS.map((gp) => (
                  <option key={gp.id} value={gp.id}>
                    {gp.name} ({gp.nameHindi}) {gp.badge || ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Quick Popular Glass Badges */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                { id: 'clear_6mm', label: '6mm Toughened' },
                { id: 'tint_grey', label: '5mm Black Tint' },
                { id: 'clear_5mm', label: '5mm Float' },
                { id: 'frosted', label: 'Frosted' },
                { id: 'dgu_6_16_6', label: 'DGU 28mm' },
              ].map((pill) => {
                const isSelected = selectedGlassType === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setSelectedGlassType(pill.id as GlassType);
                      const matched = MASTER_GLASS_PRESETS.find((g) => g.id === pill.id);
                      if (matched) {
                        setCustomGlassName(matched.name);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {/* Editable Exact Glass Name Input */}
            <div className="pt-2 border-t border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {lang === 'hi' ? 'काँच का नाम (कोटेशन/रिपोर्ट में यही नाम दिखेगा):' : 'Exact Glass Name (Shown in all Quotations & Reports):'}
                </label>
              </div>
              <input
                type="text"
                value={customGlassName}
                onChange={(e) => setCustomGlassName(e.target.value)}
                placeholder="उदा. 6mm Toughened Clear Glass / 5 MM BLACK GLASS"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
              <p className="text-[9.5px] text-slate-400 leading-tight">
                {lang === 'hi'
                  ? 'यह नाम सीधे कोटेशन, कटिंग लिस्ट, एलिवेशन और बिल ऑफ मटेरियल्स (BOM) में प्रदर्शित होगा।'
                  : 'This exact glass description will be displayed across all reports and quotations.'}
              </p>
            </div>
          </div>

          {/* 9. SLIDING SASH QUICK SELECT (SLIDING WINDOW / DOOR) */}
          {isCurrentSlider && (
            <div className="pt-2 pb-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span>🪟</span>
                  <span>स्लाइडिंग सैश प्रोफाइल (SLIDING SASH SIZE)</span>
                </label>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {topSashProfile.includes('60-04') || topSashProfile.includes('66MM') || bottomSashProfile.includes('60-04') || bottomSashProfile.includes('66MM')
                    ? '42×66mm Heavy (SWH 60-04)'
                    : topSashProfile.includes('60-05') || topSashProfile.includes('75MM') || bottomSashProfile.includes('60-05') || bottomSashProfile.includes('75MM')
                    ? '42×75mm Door (SWH 60-05)'
                    : topSashProfile.includes('60-06') || topSashProfile.includes('88MM') || bottomSashProfile.includes('60-06') || bottomSashProfile.includes('88MM')
                    ? '42×88mm Super (SWH 60-06)'
                    : '42×57mm Standard (SWH 60-03)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    code: 'SWH 60-03',
                    name: 'SLD SASH 42MM X 57MM (SWH 60-03) (Thickness : 1.9mm)',
                    short: '42 × 57 mm',
                    desc: 'Standard Window (1.9mm)',
                    rf: 'RI-TP2-15MM X 29MM X 15MM (SRI 60-03-1.5MM)',
                  },
                  {
                    code: 'SWH 60-04',
                    name: 'SLD SASH 42MM X 66MM (SWH 60-04) (Thickness : 2.2mm)',
                    short: '42 × 66 mm',
                    desc: 'Heavy Window (2.2mm)',
                    rf: 'RI-TP2-15MM X 38MM X 15MM (SRI 60-04-1.5MM)',
                  },
                  {
                    code: 'SWH 60-05',
                    name: 'SLD SASH 42MM X 75MM (SWH 60-05) (Thickness : 2.1mm)',
                    short: '42 × 75 mm',
                    desc: 'Balcony Door (2.1mm)',
                    rf: 'RI-TP2-15MM X 47MM X 15MM (SRI 85-02-1.5MM)',
                  },
                  {
                    code: 'SWH 60-06',
                    name: 'SLD SASH 42MM X 88MM (SWH 60-06) (Thickness : 1.9mm)',
                    short: '42 × 88 mm',
                    desc: 'Super Heavy Door (1.9mm)',
                    rf: 'RI-TP2-15MM X 60MM X 15MM (SRI 60-06-2.0MM)',
                  },
                ].map((opt) => {
                  const isSelected =
                    topSashProfile.includes(opt.code) ||
                    bottomSashProfile.includes(opt.code) ||
                    pocket.sashProfileCode === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        handleTopSashChange(opt.name);
                        handleBottomSashChange(opt.name);
                        handleLeftSashChange(opt.name);
                        handleRightSashChange(opt.name);
                        handleTopReinforcementChange(opt.rf);
                        handleBottomReinforcementChange(opt.rf);
                        handleLeftReinforcementChange(opt.rf);
                        handleRightReinforcementChange(opt.rf);
                        setFixShutter('No');
                        if (partGroup.includes('Fixed')) {
                          setPartGroup(opt.code.includes('05') || opt.code.includes('06') ? 'Door' : 'Window');
                        }
                      }}
                      className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-black ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                          {opt.short}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {opt.code}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium leading-tight">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. CASEMENT SASH QUICK SELECT (CASEMENT WINDOW / DOOR) */}
          {!isCurrentSlider && (
            <div className="pt-2 pb-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span>🪟</span>
                  <span>कैसमेंट सैश प्रोफाइल (CASEMENT SASH SIZE)</span>
                </label>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {topSashProfile.includes('60-04') || topSashProfile.includes('71MM')
                    ? '60×71mm Inward (CWH 60-04)'
                    : topSashProfile.includes('60-06') || topSashProfile.includes('104MM')
                    ? '60×104mm Out Door (CWH 60-06)'
                    : topSashProfile.includes('60-07')
                    ? '60×104mm In Door (CWH 60-07)'
                    : topSashProfile.includes('60-12') || topSashProfile.includes('58MM')
                    ? '58×60mm Slim (CWH 60-12)'
                    : topSashProfile.includes('65-06') || topSashProfile.includes('115MM')
                    ? '65×115mm Entrance (CWH 65-06)'
                    : '60×78mm Outward (CWH 60-03)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    code: 'CWH 60-03',
                    name: 'CMT OUTWARD SASH 60MM X 78MM (CWH 60-03) (Thickness : 2.2mm)',
                    short: '60 × 78 mm Outward',
                    desc: 'Standard Window (2.2mm)',
                    rf: 'RI-28MM X 35MM X 16MM (CRI 60-03-1.5MM)',
                  },
                  {
                    code: 'CWH 60-04',
                    name: 'CMT INWARD SASH 60MM X 71MM (CWH 60-04) (Thickness : 2.2mm)',
                    short: '60 × 71 mm Inward',
                    desc: 'Inward Tilt/Turn (2.2mm)',
                    rf: 'RI-28MM X 35MM X 16MM (CRI 60-03-1.5MM)',
                  },
                  {
                    code: 'CWH 60-06',
                    name: 'CMT OUTWARD SASH 60MM X 104MM (CWH 60-06) (Thickness : 1.9mm)',
                    short: '60 × 104 mm Out Door',
                    desc: 'Heavy Door Outward (1.9mm)',
                    rf: 'RI-28MM X 35MM X 16MM (CRI 60-06-1.5MM)',
                  },
                  {
                    code: 'CWH 60-07',
                    name: 'CMT INWARD SASH 60MM X 104MM (CWH 60-07) (Thickness : 2.2mm)',
                    short: '60 × 104 mm In Door',
                    desc: 'Heavy Door Inward (2.2mm)',
                    rf: 'RI-35MM X 28MM X 15MM (CRI 60-07-2.0MM)',
                  },
                  {
                    code: 'CWH 60-12',
                    name: 'CMT SLIM SASH 58MM X 60MM (CWH 60-12) (Thickness : 2.0mm)',
                    short: '58 × 60 mm Slim Vent',
                    desc: 'Slim Openable Vent (2.0mm)',
                    rf: 'RI-28MM X 35MM X 16MM (CRI 60-03-1.5MM)',
                  },
                  {
                    code: 'CWH 65-06',
                    name: 'COMMERCIAL ENTRANCE SASH 115MM (CWH 65-06) (Thickness : 2.2mm)',
                    short: '65 × 115 mm Commercial',
                    desc: 'Commercial Entrance (2.2mm)',
                    rf: 'RI-28MM X 35MM X 16MM (CRI 60-06-1.5MM)',
                  },
                ].map((opt) => {
                  const isSelected =
                    topSashProfile.includes(opt.code) ||
                    bottomSashProfile.includes(opt.code) ||
                    pocket.sashProfileCode === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        handleTopSashChange(opt.name);
                        handleBottomSashChange(opt.name);
                        handleLeftSashChange(opt.name);
                        handleRightSashChange(opt.name);
                        handleTopReinforcementChange(opt.rf);
                        handleBottomReinforcementChange(opt.rf);
                        handleLeftReinforcementChange(opt.rf);
                        handleRightReinforcementChange(opt.rf);
                        setFixShutter('No');
                        if (partGroup.includes('Fixed')) {
                          setPartGroup(opt.code.includes('06') || opt.code.includes('07') || opt.code.includes('65') ? 'Door' : 'Window');
                        }
                      }}
                      className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-black ${isSelected ? 'text-purple-700' : 'text-slate-800'}`}>
                          {opt.short}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {opt.code}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium leading-tight">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. ACCORDIONS FOR TOP, BOTTOM, LEFT, RIGHT */}
          <div className="pt-2 divide-y divide-slate-100 border-t border-slate-100">
            
            {/* Top Section */}
            <div className="py-2">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'top' ? null : 'top')}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-800 hover:text-blue-600 transition cursor-pointer"
              >
                <span>Top</span>
                {expandedSection === 'top' ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {expandedSection === 'top' && (
                <div className="mt-3 space-y-3 pl-1 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
                      <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      <span>
                        {isCurrentSlider
                          ? (isCurrentDoor ? 'DOOR SASH TOP' : 'WINDOW SASH TOP')
                          : (isCurrentDoor ? 'CASEMENT SIDE HUNG DOOR SASH TOP' : 'CASEMENT SIDE HUNG WINDOW SASH TOP')}
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={topSashProfile}
                        onChange={(e) => handleTopSashChange(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 py-1 pr-8 text-xs font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                      >
                        {isCurrentSlider ? (
                          isCurrentDoor ? (
                            SLIDING_DOOR_SASH_OPTIONS.map((opt) => (
                              <option key={opt.name} value={opt.name}>
                                {opt.name}
                              </option>
                            ))
                          ) : (
                            SLIDING_WINDOW_SASH_OPTIONS.map((opt) => (
                              <option key={opt.name} value={opt.name}>
                                {opt.name}
                              </option>
                            ))
                          )
                        ) : isCurrentDoor ? (
                          CASEMENT_DOOR_SASH_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.name}>
                              {opt.name}
                            </option>
                          ))
                        ) : (
                          CASEMENT_WINDOW_SASH_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.name}>
                              {opt.name}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    {/* Thickness indicator */}
                    <div className="text-[10px] text-blue-600 font-semibold pt-0.5">
                      {getSelectedSashThickness(topSashProfile)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 tracking-wide block">
                      REINFORCEMENT (Cavity no : 1)
                    </label>
                    <div className="relative">
                      <select
                        value={topReinforcement}
                        onChange={(e) => handleTopReinforcementChange(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 py-1 pr-8 text-xs font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                      >
                        {isCurrentSlider ? (
                          SLIDING_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        ) : isCurrentDoor ? (
                          CASEMENT_DOOR_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        ) : (
                          CASEMENT_WINDOW_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Section */}
            <div className="py-2">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'bottom' ? null : 'bottom')}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-800 hover:text-blue-600 transition cursor-pointer"
              >
                <span>Bottom</span>
                {expandedSection === 'bottom' ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {expandedSection === 'bottom' && (
                <div className="mt-3 space-y-3 pl-1 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
                      <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      <span>
                        {isCurrentSlider
                          ? (isCurrentDoor ? 'DOOR RIGHT SASH BOTTOM' : 'WINDOW SASH BOTTOM')
                          : (isCurrentDoor ? 'CASEMENT SIDE HUNG DOOR SASH BOTTOM' : 'CASEMENT SIDE HUNG WINDOW SASH BOTTOM')}
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={bottomSashProfile}
                        onChange={(e) => handleBottomSashChange(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 py-1 pr-8 text-xs font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                      >
                        {isCurrentSlider ? (
                          isCurrentDoor ? (
                            SLIDING_DOOR_SASH_OPTIONS.map((opt) => (
                              <option key={opt.name} value={opt.name}>
                                {opt.name}
                              </option>
                            ))
                          ) : (
                            SLIDING_WINDOW_SASH_OPTIONS.map((opt) => (
                              <option key={opt.name} value={opt.name}>
                                {opt.name}
                              </option>
                            ))
                          )
                        ) : isCurrentDoor ? (
                          CASEMENT_DOOR_SASH_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.name}>
                              {opt.name}
                            </option>
                          ))
                        ) : (
                          CASEMENT_WINDOW_SASH_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.name}>
                              {opt.name}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <div className="text-[10px] text-blue-600 font-semibold pt-0.5">
                      {getSelectedSashThickness(bottomSashProfile)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 tracking-wide block">
                      REINFORCEMENT (Cavity no : 1)
                    </label>
                    <div className="relative">
                      <select
                        value={bottomReinforcement}
                        onChange={(e) => handleBottomReinforcementChange(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 py-1 pr-8 text-xs font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                      >
                        {isCurrentSlider ? (
                          SLIDING_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        ) : isCurrentDoor ? (
                          CASEMENT_DOOR_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        ) : (
                          CASEMENT_WINDOW_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Left Section */}
            <div className="py-2">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'left' ? null : 'left')}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-800 hover:text-blue-600 transition cursor-pointer"
              >
                <span>Left</span>
                {expandedSection === 'left' ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {expandedSection === 'left' && (
                <div className="mt-3 space-y-3 pl-1 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
                      <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      <span>
                        {isCurrentSlider
                          ? (isCurrentDoor ? 'DOOR SASH LEFT' : 'WINDOW SASH LEFT / INTERLOCK')
                          : (isCurrentDoor ? 'CASEMENT SIDE HUNG DOOR SASH LEFT' : 'CASEMENT SIDE HUNG WINDOW SASH LEFT')}
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={leftSashProfile}
                        onChange={(e) => handleLeftSashChange(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 py-1 pr-8 text-xs font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                      >
                        {isCurrentSlider ? (
                          isCurrentDoor ? (
                            SLIDING_DOOR_SASH_OPTIONS.map((opt) => (
                              <option key={opt.name} value={opt.name}>
                                {opt.name}
                              </option>
                            ))
                          ) : (
                            SLIDING_WINDOW_SASH_OPTIONS.map((opt) => (
                              <option key={opt.name} value={opt.name}>
                                {opt.name}
                              </option>
                            ))
                          )
                        ) : isCurrentDoor ? (
                          CASEMENT_DOOR_SASH_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.name}>
                              {opt.name}
                            </option>
                          ))
                        ) : (
                          CASEMENT_WINDOW_SASH_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.name}>
                              {opt.name}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <div className="text-[10px] text-blue-600 font-semibold pt-0.5">
                      {getSelectedSashThickness(leftSashProfile)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 tracking-wide block">
                      REINFORCEMENT (Cavity no : 1)
                    </label>
                    <div className="relative">
                      <select
                        value={leftReinforcement}
                        onChange={(e) => handleLeftReinforcementChange(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 py-1 pr-8 text-xs font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                      >
                        {isCurrentSlider ? (
                          SLIDING_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        ) : isCurrentDoor ? (
                          CASEMENT_DOOR_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        ) : (
                          CASEMENT_WINDOW_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Section */}
            <div className="py-2">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'right' ? null : 'right')}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-800 hover:text-blue-600 transition cursor-pointer"
              >
                <span>Right</span>
                {expandedSection === 'right' ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {expandedSection === 'right' && (
                <div className="mt-3 space-y-3 pl-1 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide">
                      <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      <span>
                        {isCurrentSlider
                          ? (isCurrentDoor ? 'DOOR SASH RIGHT' : 'WINDOW SASH RIGHT')
                          : (isCurrentDoor ? 'CASEMENT SIDE HUNG DOOR SASH RIGHT' : 'CASEMENT SIDE HUNG WINDOW SASH RIGHT')}
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={rightSashProfile}
                        onChange={(e) => handleRightSashChange(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 py-1 pr-8 text-xs font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                      >
                        {isCurrentSlider ? (
                          isCurrentDoor ? (
                            SLIDING_DOOR_SASH_OPTIONS.map((opt) => (
                              <option key={opt.name} value={opt.name}>
                                {opt.name}
                              </option>
                            ))
                          ) : (
                            SLIDING_WINDOW_SASH_OPTIONS.map((opt) => (
                              <option key={opt.name} value={opt.name}>
                                {opt.name}
                              </option>
                            ))
                          )
                        ) : isCurrentDoor ? (
                          CASEMENT_DOOR_SASH_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.name}>
                              {opt.name}
                            </option>
                          ))
                        ) : (
                          CASEMENT_WINDOW_SASH_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.name}>
                              {opt.name}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <div className="text-[10px] text-blue-600 font-semibold pt-0.5">
                      {getSelectedSashThickness(rightSashProfile)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 tracking-wide block">
                      REINFORCEMENT (Cavity no : 1)
                    </label>
                    <div className="relative">
                      <select
                        value={rightReinforcement}
                        onChange={(e) => handleRightReinforcementChange(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-200 py-1 pr-8 text-xs font-semibold text-slate-800 uppercase focus:outline-hidden focus:border-blue-600 appearance-none cursor-pointer"
                      >
                        {isCurrentSlider ? (
                          SLIDING_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        ) : isCurrentDoor ? (
                          CASEMENT_DOOR_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        ) : (
                          CASEMENT_WINDOW_REINFORCEMENTS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 10. Allow sash equalization Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowEqualization}
                onChange={(e) => setAllowEqualization(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600">Allow sash equalization</span>
            </label>
          </div>

        </div>

        {/* Footer: Apply Button */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-2.5 px-4 rounded-md bg-[#0066cc] hover:bg-[#0055b3] active:bg-[#004499] text-white font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Apply</span>
          </button>
        </div>

      </div>
  );
};
