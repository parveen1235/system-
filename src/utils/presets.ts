import { UPVCProject, UPVCFrame, CouplingConnection, SashType } from '../types/upvc';
import { DEFAULT_PRICING_CONFIG, recalculateFramePockets, resolveFramePositions } from './upvcCalculations';

export interface ProjectTemplate {
  id: string;
  name: string;
  nameHindi: string;
  description: string;
  category: 'standard' | 'casement' | 'sliding' | 'coupling' | 'door_window' | 'multi_frame';
  thumbnailIcon: string;
  panelCount?: number;
  configurationCode?: string;
  getProject: () => UPVCProject;
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'starter_1000x1000',
    name: 'Starter Frame 1000 x 1000 mm (1 Frame Standard)',
    nameHindi: 'शुरुआती सिंगल फ्रेम 1000 x 1000 mm (1 फ्रेम)',
    description: 'Clean single starter frame 1000mm x 1000mm ready for horizontal/vertical coupling and custom dimensioning.',
    category: 'standard',
    thumbnailIcon: 'single-frame',
    getProject: () => {
      const f1: UPVCFrame = {
        id: 'frame-f1',
        name: 'F1',
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f1.pockets = recalculateFramePockets(f1);
      if (f1.pockets[0]) {
        f1.pockets[0].sashType = 'fixed';
        f1.pockets[0].glassType = 'clear_6mm';
        f1.pockets[0].customLabel = '①';
      }

      return {
        id: `proj-${Date.now()}`,
        name: 'New UPVC Unit (1000x1000)',
        clientName: 'Site Project Elevation',
        referenceNo: 'UPVC-2026-001',
        date: new Date().toISOString().split('T')[0],
        frames: [f1],
        couplings: [],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },
  {
    id: 'video_starter_1800x2500',
    name: 'Starter Frame 1800 x 2500 (Video Starter)',
    nameHindi: 'शुरुआती फ्रेम 1800 x 2500 (वीडियो के अनुसार)',
    description: 'Clean single frame 1800mm x 2500mm ready for horizontal/vertical coupling and custom dimensioning.',
    category: 'standard',
    thumbnailIcon: 'single-frame',
    getProject: () => {
      const f1: UPVCFrame = {
        id: 'frame-f1',
        name: 'F1',
        width: 1800,
        height: 2500,
        x: 0,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f1.pockets = recalculateFramePockets(f1);
      if (f1.pockets[0]) {
        f1.pockets[0].sashType = 'fixed';
        f1.pockets[0].glassType = 'clear_6mm';
        f1.pockets[0].customLabel = '①';
      }

      return {
        id: 'proj-video-starter',
        name: 'Video CAD Starter Unit',
        clientName: 'Site Project Elevation',
        referenceNo: 'UPVC-2026-001',
        date: new Date().toISOString().split('T')[0],
        frames: [f1],
        couplings: [],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },
  {
    id: 'video_stepped_unit_complete',
    name: 'Video Stepped Multi-Coupled Unit (F1..F4 Asymmetric)',
    nameHindi: 'वीडियो फाइनल डिज़ाइन (F1 से F4 स्टेप्स 3800x2900)',
    description: 'Complete 4-frame asymmetric coupled elevation with top step (650mm), bottom step (650mm), and horizontal overhangs (1000mm & 100mm) exactly from video.',
    category: 'coupling',
    thumbnailIcon: 'multi-frame',
    getProject: () => {
      // F1: Bottom right frame (850 x 1250)
      const f1: UPVCFrame = {
        id: 'frame-f1',
        name: 'F1',
        width: 850,
        height: 1250,
        x: 950,
        y: 1900,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f1.pockets = recalculateFramePockets(f1);
      if (f1.pockets[0]) {
        f1.pockets[0].sashType = 'fixed';
        f1.pockets[0].glassType = 'clear_6mm';
        f1.pockets[0].customLabel = '①';
      }

      // F2: Bottom left stepped frame (1900 x 1250) extending left by 1000mm and down by 650mm
      const f2: UPVCFrame = {
        id: 'frame-f2',
        name: 'F2',
        width: 1900,
        height: 1250,
        x: -1000,
        y: 1900,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f2.pockets = recalculateFramePockets(f2);
      if (f2.pockets[0]) {
        f2.pockets[0].sashType = 'fixed';
        f2.pockets[0].glassType = 'clear_6mm';
        f2.pockets[0].customLabel = '②';
      }

      // F3: Top left frame (950 x 1250)
      const f3: UPVCFrame = {
        id: 'frame-f3',
        name: 'F3',
        width: 950,
        height: 1250,
        x: 0,
        y: 650,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f3.pockets = recalculateFramePockets(f3);
      if (f3.pockets[0]) {
        f3.pockets[0].sashType = 'fixed';
        f3.pockets[0].glassType = 'clear_6mm';
        f3.pockets[0].customLabel = '③';
      }

      // F4: Top right tall frame (950 x 1900) extending upward by 650mm and right by 100mm
      const f4: UPVCFrame = {
        id: 'frame-f4',
        name: 'F4',
        width: 950,
        height: 1900,
        x: 950,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f4.pockets = recalculateFramePockets(f4);
      if (f4.pockets[0]) {
        f4.pockets[0].sashType = 'fixed';
        f4.pockets[0].glassType = 'clear_6mm';
        f4.pockets[0].customLabel = '④';
      }

      // Couplers
      const c1: CouplingConnection = {
        id: 'cpl-h-center',
        sourceFrameId: 'frame-f2',
        targetFrameId: 'frame-f3',
        direction: 'vertical',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'top',
      };
      const c2: CouplingConnection = {
        id: 'cpl-v-top',
        sourceFrameId: 'frame-f3',
        targetFrameId: 'frame-f4',
        direction: 'horizontal',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'top',
      };
      const c3: CouplingConnection = {
        id: 'cpl-v-bot',
        sourceFrameId: 'frame-f2',
        targetFrameId: 'frame-f1',
        direction: 'horizontal',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'top',
      };

      return {
        id: 'proj-video-stepped',
        name: 'Video Stepped Elevation Unit',
        clientName: 'Villa Architectural Project',
        referenceNo: 'UPVC-2026-STEP',
        date: new Date().toISOString().split('T')[0],
        frames: [f1, f2, f3, f4],
        couplings: [c1, c2, c3],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },
  {
    id: 'user_cad_drawing_reference',
    name: 'Multi-Frame Coupled CAD Unit (Image Reference)',
    nameHindi: 'मल्टी-फ्रेम कप्लिंग असेंबली (इमेज रेफरेंस - F1..F6)',
    description: 'Exact architectural CAD layout from reference images with 6 coupled frames (F1 to F6), ①-⑥ glass badges, circled Ⓒ couplers, and independent width/height sizing.',
    category: 'coupling',
    thumbnailIcon: 'multi-frame',
    getProject: () => {
      // F1: Top left fixed unit 750 x 500
      const f1: UPVCFrame = {
        id: 'frame-f1',
        name: 'F1',
        width: 750,
        height: 500,
        x: 0,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f1.pockets = recalculateFramePockets(f1);
      if (f1.pockets[0]) {
        f1.pockets[0].sashType = 'fixed';
        f1.pockets[0].glassType = 'clear_6mm';
        f1.pockets[0].customLabel = '①';
      }

      // F2: Middle left window unit 750 x 1500 (with casement right sash)
      const f2: UPVCFrame = {
        id: 'frame-f2',
        name: 'F2',
        width: 750,
        height: 1500,
        x: 0,
        y: 502, // 500 + 2mm gap below F1
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f2.pockets = recalculateFramePockets(f2);
      if (f2.pockets[0]) {
        f2.pockets[0].sashType = 'casement_right';
        f2.pockets[0].glassType = 'clear_6mm';
        f2.pockets[0].customLabel = '②';
      }

      // F3: Bottom left unit 750 x 500
      const f3: UPVCFrame = {
        id: 'frame-f3',
        name: 'F3',
        width: 750,
        height: 500,
        x: 0,
        y: 2004, // 2000 + 4mm gaps
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f3.pockets = recalculateFramePockets(f3);
      if (f3.pockets[0]) {
        f3.pockets[0].sashType = 'fixed';
        f3.pockets[0].glassType = 'clear_6mm';
        f3.pockets[0].customLabel = '③';
      }

      // F4: Adjacent center top unit 750 x 500
      const f4: UPVCFrame = {
        id: 'frame-f4',
        name: 'F4',
        width: 750,
        height: 500,
        x: 752,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f4.pockets = recalculateFramePockets(f4);
      if (f4.pockets[0]) {
        f4.pockets[0].sashType = 'fixed';
        f4.pockets[0].glassType = 'clear_6mm';
        f4.pockets[0].customLabel = '④';
      }

      // F5: Center tall connector column / frame 150 x 2500
      const f5: UPVCFrame = {
        id: 'frame-f5',
        name: 'F5',
        width: 150,
        height: 2500,
        x: 1504,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 40,
        mullionProfileWidth: 50,
        sashProfileWidth: 40,
        color: 'white',
        reinforcement: 'steel_1.5mm',
        drainageCaps: true,
        mullions: [
          { id: 'mul-f5-1', orientation: 'horizontal', position: 500 },
          { id: 'mul-f5-2', orientation: 'horizontal', position: 2000 },
        ],
        pockets: [],
      };
      f5.pockets = recalculateFramePockets(f5);
      if (f5.pockets[0]) f5.pockets[0].customLabel = '⑤a';
      if (f5.pockets[1]) f5.pockets[1].customLabel = '⑤b';
      if (f5.pockets[2]) f5.pockets[2].customLabel = '⑤c';

      // F6: Right side door / large casement unit 1000 x 2000
      const f6: UPVCFrame = {
        id: 'frame-f6',
        name: 'F6',
        width: 1000,
        height: 2000,
        x: 1656,
        y: 500,
        series: 'door_premium',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.5mm',
        drainageCaps: true,
        mullions: [
          { id: 'mul-f6-h', orientation: 'horizontal', position: 600 },
        ],
        pockets: [],
      };
      f6.pockets = recalculateFramePockets(f6);
      if (f6.pockets[0]) {
        f6.pockets[0].sashType = 'top_hung';
        f6.pockets[0].customLabel = '⑥a';
      }
      if (f6.pockets[1]) {
        f6.pockets[1].sashType = 'casement_left';
        f6.pockets[1].customLabel = '⑥b';
      }

      // Couplings linking frames with 2mm expansion gap
      const c1: CouplingConnection = {
        id: 'cpl-f1-f2',
        sourceFrameId: 'frame-f1',
        targetFrameId: 'frame-f2',
        direction: 'vertical',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'top',
      };
      const c2: CouplingConnection = {
        id: 'cpl-f2-f3',
        sourceFrameId: 'frame-f2',
        targetFrameId: 'frame-f3',
        direction: 'vertical',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'top',
      };
      const c3: CouplingConnection = {
        id: 'cpl-f1-f4',
        sourceFrameId: 'frame-f1',
        targetFrameId: 'frame-f4',
        direction: 'horizontal',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'top',
      };
      const c4: CouplingConnection = {
        id: 'cpl-f4-f5',
        sourceFrameId: 'frame-f4',
        targetFrameId: 'frame-f5',
        direction: 'horizontal',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'top',
      };
      const c5: CouplingConnection = {
        id: 'cpl-f5-f6',
        sourceFrameId: 'frame-f5',
        targetFrameId: 'frame-f6',
        direction: 'horizontal',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'bottom',
      };

      return {
        id: 'proj-cad-image-ref',
        name: 'Multi-Coupled CAD Elevation (Image Preset)',
        clientName: 'Architectural Elevation Design',
        referenceNo: 'UPVC-CAD-001',
        date: new Date().toISOString().split('T')[0],
        frames: [f1, f2, f3, f4, f5, f6],
        couplings: [c1, c2, c3, c4, c5],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },
  {
    id: 'door_window_coupled_2mm',
    name: 'Balcony Door + Window (2mm Coupler)',
    nameHindi: 'दरवाजा + खिड़की (2mm कप्लिंग जोड़)',
    description: 'Independent door frame & window frame joined with a 2mm coupler gap. Each frame can be resized independently in height & width.',
    category: 'coupling',
    thumbnailIcon: 'door-window',
    getProject: () => {
      // Frame 1: Door (900 x 2100) with a horizontal transom mullion at 1400mm
      const doorFrame: UPVCFrame = {
        id: 'frame-door-1',
        name: 'F1 (Door Unit)',
        width: 900,
        height: 2100,
        x: 0,
        y: 0,
        series: 'door_premium',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.5mm',
        drainageCaps: true,
        mullions: [
          {
            id: 'mul-door-h1',
            orientation: 'horizontal',
            position: 1350,
          },
        ],
        pockets: [],
      };
      doorFrame.pockets = recalculateFramePockets(doorFrame);
      if (doorFrame.pockets[0]) {
        doorFrame.pockets[0].sashType = 'fixed';
        doorFrame.pockets[0].glassType = 'clear_6mm';
        doorFrame.pockets[0].customLabel = '①';
      }
      if (doorFrame.pockets[1]) {
        doorFrame.pockets[1].sashType = 'casement_right';
        doorFrame.pockets[1].glassType = 'clear_6mm';
        doorFrame.pockets[1].customLabel = '②';
      }

      // Frame 2: Window Unit (1200 x 1200) with 1 vertical mullion in center
      const windowFrame: UPVCFrame = {
        id: 'frame-win-1',
        name: 'F2 (Window Unit)',
        width: 1200,
        height: 1200,
        x: 902, // 900 + 2mm gap
        y: 900, // Aligned at bottom
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [
          {
            id: 'mul-win-v1',
            orientation: 'vertical',
            position: 600,
          },
        ],
        pockets: [],
      };
      windowFrame.pockets = recalculateFramePockets(windowFrame);
      if (windowFrame.pockets[0]) {
        windowFrame.pockets[0].sashType = 'fixed';
        windowFrame.pockets[0].glassType = 'clear_5mm';
        windowFrame.pockets[0].customLabel = '③';
      }
      if (windowFrame.pockets[1]) {
        windowFrame.pockets[1].sashType = 'casement_left';
        windowFrame.pockets[1].glassType = 'clear_5mm';
        windowFrame.pockets[1].customLabel = '④';
      }

      // Coupling joining Frame A right to Frame B left with 2mm gap, bottom aligned
      const coupling: CouplingConnection = {
        id: 'cpl-1',
        sourceFrameId: 'frame-door-1',
        targetFrameId: 'frame-win-1',
        direction: 'horizontal',
        gap: 2, // 2mm gap as requested
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'bottom', // Resting on same floor level or sill line
      };

      return {
        id: 'proj-door-win',
        name: 'Door + Window Coupled Unit (2mm Gap)',
        clientName: 'Modern Villa Project',
        referenceNo: 'UPVC-DW-2026',
        date: new Date().toISOString().split('T')[0],
        frames: [doorFrame, windowFrame],
        couplings: [coupling],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },
  {
    id: 'single_frame_mullions_transom',
    name: '3-Bay Window with Transom Mullions',
    nameHindi: '1 फ्रेम में मुलियन (टॉप फिक्स + 2 पल्ला)',
    description: 'Single outer frame divided inside with 1 horizontal transom and 1 vertical mullion into 4 distinct bays.',
    category: 'standard',
    thumbnailIcon: 'grid-mullion',
    getProject: () => {
      const frame: UPVCFrame = {
        id: 'frame-mullion-1',
        name: 'F1',
        width: 1500,
        height: 1500,
        x: 0,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [
          {
            id: 'mul-h-top',
            orientation: 'horizontal',
            position: 450, // Top fixed transom line
          },
          {
            id: 'mul-v-mid',
            orientation: 'vertical',
            position: 750, // Center vertical mullion
          },
        ],
        pockets: [],
      };
      frame.pockets = recalculateFramePockets(frame);
      if (frame.pockets[0]) { frame.pockets[0].sashType = 'fixed'; frame.pockets[0].customLabel = '①'; }
      if (frame.pockets[1]) { frame.pockets[1].sashType = 'fixed'; frame.pockets[1].customLabel = '②'; }
      if (frame.pockets[2]) { frame.pockets[2].sashType = 'casement_left'; frame.pockets[2].customLabel = '③'; }
      if (frame.pockets[3]) { frame.pockets[3].sashType = 'casement_right'; frame.pockets[3].customLabel = '④'; }

      return {
        id: 'proj-mullion-std',
        name: '3-Lite Transom Window',
        clientName: 'Residential Villa',
        referenceNo: 'UPVC-MUL-01',
        date: new Date().toISOString().split('T')[0],
        frames: [frame],
        couplings: [],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },
  {
    id: 'variable_angle_bay_lc_2frame',
    name: 'Variable Angle Coupler (LC) 2-Frame Bay (2x 750×1500 mm)',
    nameHindi: '📐 वेरिएबल एंगल कपलर (LC) 2-फ्रेम बे/कॉर्नर विंडो (750x1500)',
    description: 'Two 750x1500 mm casement frames coupled side-by-side with a Variable Angle Bay Pole (LC) joint with adjustable bend angle (90° / 135° / custom).',
    category: 'multi_frame',
    thumbnailIcon: 'double-frame',
    getProject: () => {
      const frameA: UPVCFrame = {
        id: 'frame-lc-1',
        name: 'F1',
        width: 750,
        height: 1500,
        x: 0,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.5mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      frameA.pockets = recalculateFramePockets(frameA);
      if (frameA.pockets[0]) {
        frameA.pockets[0].sashType = 'fixed';
        frameA.pockets[0].customLabel = '①';
      }

      const frameB: UPVCFrame = {
        id: 'frame-lc-2',
        name: 'F2',
        width: 750,
        height: 1500,
        x: 752,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.5mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      frameB.pockets = recalculateFramePockets(frameB);
      if (frameB.pockets[0]) {
        frameB.pockets[0].sashType = 'fixed';
        frameB.pockets[0].customLabel = '②';
      }

      const coupling: CouplingConnection = {
        id: 'cpl-bay-lc-1',
        sourceFrameId: 'frame-lc-1',
        targetFrameId: 'frame-lc-2',
        direction: 'horizontal',
        gap: 2,
        couplerType: 'variable_bay_pole',
        couplerWidth: 2,
        alignment: 'top',
        angle: 135,
        bendDirection: 'inward',
      };

      return {
        id: 'proj-variable-bay-lc',
        name: 'Variable Angle 135° Bay Window (LC Coupler)',
        clientName: 'Corner Bay Assembly',
        referenceNo: 'UPVC-BAY-LC',
        date: new Date().toISOString().split('T')[0],
        frames: [frameA, frameB],
        couplings: [coupling],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },
  {
    id: 'triple_coupled_bay_2mm',
    name: '3 Independent Coupled Frames (2mm Gaps)',
    nameHindi: '3 अलग-अलग फ्रेम (कप्लिंग 2mm गैप)',
    description: 'Three distinct window units joined side-by-side with 2mm expansion couplers. Center unit is taller.',
    category: 'multi_frame',
    thumbnailIcon: 'triple-frame',
    getProject: () => {
      const frameA: UPVCFrame = {
        id: 'frame-tri-1',
        name: 'F1',
        width: 800,
        height: 1400,
        x: 0,
        y: 100,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      frameA.pockets = recalculateFramePockets(frameA);
      if (frameA.pockets[0]) { frameA.pockets[0].sashType = 'casement_left'; frameA.pockets[0].customLabel = '①'; }

      const frameB: UPVCFrame = {
        id: 'frame-tri-2',
        name: 'F2',
        width: 1200,
        height: 1600,
        x: 802,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.5mm',
        drainageCaps: true,
        mullions: [
          {
            id: 'mul-center-h',
            orientation: 'horizontal',
            position: 500,
          },
        ],
        pockets: [],
      };
      frameB.pockets = recalculateFramePockets(frameB);
      if (frameB.pockets[0]) { frameB.pockets[0].sashType = 'fixed'; frameB.pockets[0].customLabel = '②'; }
      if (frameB.pockets[1]) { frameB.pockets[1].sashType = 'fixed'; frameB.pockets[1].customLabel = '③'; }

      const frameC: UPVCFrame = {
        id: 'frame-tri-3',
        name: 'F3',
        width: 800,
        height: 1400,
        x: 2004,
        y: 100,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      frameC.pockets = recalculateFramePockets(frameC);
      if (frameC.pockets[0]) { frameC.pockets[0].sashType = 'casement_right'; frameC.pockets[0].customLabel = '④'; }

      const coupling1: CouplingConnection = {
        id: 'cpl-tri-1',
        sourceFrameId: 'frame-tri-1',
        targetFrameId: 'frame-tri-2',
        direction: 'horizontal',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'bottom',
      };

      const coupling2: CouplingConnection = {
        id: 'cpl-tri-2',
        sourceFrameId: 'frame-tri-2',
        targetFrameId: 'frame-tri-3',
        direction: 'horizontal',
        gap: 2,
        couplerType: 'flat_2mm',
        couplerWidth: 2,
        alignment: 'bottom',
      };

      return {
        id: 'proj-tri-coupled',
        name: 'Architectural 3-Frame Stepped Assembly',
        clientName: 'Skyline Penthouse',
        referenceNo: 'UPVC-STEP-3',
        date: new Date().toISOString().split('T')[0],
        frames: [frameA, frameB, frameC],
        couplings: [coupling1, coupling2],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },

  // =========================================================================
  // SLIDING DESIGNS (4 CORE ARCHITECTURAL MODELS #1, #5, #8, #9)
  // =========================================================================
  {
    id: 'sliding_w1_2panel',
    name: 'Model #1: 2-Track 2-Panel Slider [ S1 → | S2 ← ] (1500 x 1200 mm)',
    nameHindi: 'मॉडल #1: 2-ट्रैक 2-पैनल स्लाइडिंग विंडो (2 पटरियां • S1 व S2)',
    description: '2-Track 2-Panel sliding window (1500x1200mm). 2 Tracks / Rails: S1 (Back Track →), S2 (Front Track ←). Slim 4mm interlock meeting stile, GHH=576mm touch locks.',
    category: 'sliding',
    thumbnailIcon: 'sliding-window',
    panelCount: 2,
    configurationCode: 'W1',
    getProject: () => createSlidingProject('W1', 1500, 1200, [750, 750], ['slider_arrow_right', 'slider_arrow_left'], 'clear_5mm', '2-Track'),
  },
  {
    id: 'sliding_w5_3panel_mesh',
    name: 'Model #5: 3-Track 2-Panel [ 2 Glass Panels + 1 Fly Mesh on S2 ] (2100 x 1500 mm)',
    nameHindi: 'मॉडल #5: 3-ट्रैक (2-पैनल सेम 2-ट्रैक + S2 के ऊपर मच्छर जाली MS1)',
    description: '3-Track Outer Frame with 2 Sliding Glass Panels (same as 2-track: S1 & S2) + 1 SS304 Fly Mesh Sash (MS1) sitting over S2 on Track 3. (GHH=710 touch locks).',
    category: 'sliding',
    thumbnailIcon: 'sliding-window',
    panelCount: 2,
    configurationCode: 'W5',
    getProject: () => createSlidingProject('W5', 2100, 1500, [1050, 1050], ['slider_arrow_right', 'slider_arrow_left'], 'clear_5mm', '3-Track', true),
  },
  {
    id: 'sliding_w8_3panel_all',
    name: 'Model #8: 3-Track 3-Panel All-Glass Slider [ S1 ↔ | S2 ↔ | S3 ↔ ] (2400 x 1500 mm)',
    nameHindi: 'मॉडल #8: 3-ट्रैक तीनों पल्ले स्लाइड [ S1 ↔ | S2 ↔ | S3 ↔ ]',
    description: '3-Track 3-Panel window with 3 independent sliding glass sashes S1, S2, S3 across 3 rails for maximum 66% ventilation.',
    category: 'sliding',
    thumbnailIcon: 'sliding-window',
    panelCount: 3,
    configurationCode: 'W8',
    getProject: () => createSlidingProject('W8', 2400, 1500, [800, 800, 800], ['slider_arrow_both', 'slider_arrow_both', 'slider_arrow_both'], 'clear_5mm', '3-Track'),
  },
  {
    id: 'sliding_w9_4panel_center',
    name: 'Model #9: 2-Track 4-Panel [ 2 TRACK 4 PANEL ] (3200 x 2100 mm)',
    nameHindi: 'मॉडल #9: 2-ट्रैक 4-पैनल सेंटर मीटिंग [ S1 → | S2 ← | S3 → | S4 ← ]',
    description: '2-Track 4-Panel center meeting sliding window/door with S1 (→), S2 (←), S3 (→), S4 (←) with Center Meeting Lock and GHH=710 touch locks.',
    category: 'sliding',
    thumbnailIcon: 'sliding-window',
    panelCount: 4,
    configurationCode: 'W9',
    getProject: () => createSlidingProject('W9', 3200, 2100, [800, 800, 800, 800], ['slider_arrow_right', 'slider_arrow_left', 'slider_arrow_right', 'slider_arrow_left'], 'clear_5mm', '2-Track'),
  },
  {
    id: 'sliding_w_2track_3panel_fix_center',
    name: '2-Track (2 Slide Panel Center 1 Fix Panel) (2100 x 1200 mm)',
    nameHindi: '2-ट्रैक (2 स्लाइड पैनल + सेंटर 1 फिक्स पैनल)',
    description: '2-Track 3-Panel window (2100x1200mm): S1 (→) & S3 (←) Slide with Center Fixed Panel S2 (//) and GHH=710 touch locks.',
    category: 'sliding',
    thumbnailIcon: 'sliding-window',
    panelCount: 3,
    configurationCode: 'W_2T_3P_FIX_CENTER',
    getProject: () => createSlidingProject('W_2T_3P_FIX_CENTER', 2100, 1200, [700, 700, 700], ['slider_arrow_right', 'slider_fixed_center', 'slider_arrow_left'], 'clear_5mm', '2-Track'),
  },
  {
    id: 'sliding_w_3track_5panel',
    name: '3-Track 5-Panel Slider (3500 x 1500 mm)',
    nameHindi: '3-ट्रैक 5-पैनल स्लाइडर [ 5 ग्लास सैश ]',
    description: '3-Track 5-Panel window (3500x1500mm): S1 (→), S2 (↔), S3 (←), S4 (→), S5 (←) with Center Meeting Stile Lock and GHH=710 touch locks.',
    category: 'sliding',
    thumbnailIcon: 'sliding-window',
    panelCount: 5,
    configurationCode: 'W_3T_5P',
    getProject: () => createSlidingProject('W_3T_5P', 3500, 1500, [700, 700, 700, 700, 700], ['slider_arrow_right', 'slider_arrow_both', 'slider_arrow_left', 'slider_arrow_right', 'slider_arrow_left'], 'clear_5mm', '3-Track'),
  },
  {
    id: 'sliding_w_3track_6panel',
    name: '3-Track 6-Panel Slider (3600 x 2100 mm)',
    nameHindi: '3-ट्रैक 6-पैनल स्लाइडिंग डोर / विंडो [ 6 ग्लास सैश • सेंटर मीटिंग ]',
    description: '3-Track 6-Panel sliding window/door (3600x2100mm): S1 (→), S2 (↔), S3 (←) || S4 (→), S5 (↔), S6 (←) with Center Meeting Stile Lock and GHH=710/1000 touch locks. 66% wide center clear opening.',
    category: 'sliding',
    thumbnailIcon: 'sliding-window',
    panelCount: 6,
    configurationCode: 'W_3T_6P',
    getProject: () => createSlidingProject('W_3T_6P', 3600, 2100, [600, 600, 600, 600, 600, 600], ['slider_arrow_right', 'slider_arrow_both', 'slider_arrow_left', 'slider_arrow_right', 'slider_arrow_both', 'slider_arrow_left'], 'clear_5mm', '3-Track'),
  },
  {
    id: 'sliding_6panel_3track_4g2m',
    name: '6 PANEL 3 TRACK (3200 x 2100 mm)',
    nameHindi: '6 पैनल 3 ट्रैक [ 4 ग्लास + 2 जाली MS1 & MS2 • सेंटर लॉक ]',
    description: '6 Panel 3 Track sliding window/door (3200x2100mm): 4 Glass Sashes S1 (→), S2 (←), S3 (→), S4 (←) + 2 Center Fly Mesh Sashes MS1 (5 ←) & MS2 (6 →) on Track 3 with Center Meeting Lock.',
    category: 'sliding',
    thumbnailIcon: 'sliding-window',
    panelCount: 6,
    configurationCode: '6P_3T',
    getProject: () => {
      const proj = createSlidingProject(
        '6P_3T',
        3200,
        2100,
        [800, 800, 800, 800],
        ['slider_arrow_right', 'slider_arrow_left', 'slider_arrow_right', 'slider_arrow_left'],
        'clear_6mm',
        '3-Track'
      );
      if (proj.frames[0]) {
        proj.frames[0].name = 'F1 (6 PANEL 3 TRACK)';
        proj.frames[0].series = 'sliding_88';
        proj.frames[0].frameProfileWidth = 88;
        proj.frames[0].hasCenterLock = true;
        if (proj.frames[0].pockets[0]) {
          proj.frames[0].pockets[0].customLabel = 'S1';
          proj.frames[0].pockets[0].hasMesh = false;
        }
        if (proj.frames[0].pockets[1]) {
          proj.frames[0].pockets[1].customLabel = 'S2';
          proj.frames[0].pockets[1].hasMesh = true;
        }
        if (proj.frames[0].pockets[2]) {
          proj.frames[0].pockets[2].customLabel = 'S3';
          proj.frames[0].pockets[2].hasMesh = true;
        }
        if (proj.frames[0].pockets[3]) {
          proj.frames[0].pockets[3].customLabel = 'S4';
          proj.frames[0].pockets[3].hasMesh = false;
        }
      }
      return proj;
    },
  },
  {
    id: 'french_casement_window_1200x1200',
    name: 'Casement French Window (Double Leaf 1200 x 1200 mm)',
    nameHindi: 'केसमेंट फ्रेंच विंडो (डबल पल्ला - बीच का सैश प्रोफाइल)',
    description: 'Casement French Window with dual meeting sashes in a single pocket, meeting in the middle with a central False Mullion / Flying Mullion (FM-60).',
    category: 'standard',
    thumbnailIcon: 'window-casement',
    getProject: () => {
      const f1: UPVCFrame = {
        id: 'frame-french-w1',
        name: 'W-FR1 (French Window)',
        width: 1200,
        height: 1200,
        x: 0,
        y: 0,
        series: 'casement_60',
        frameProfileWidth: 60,
        mullionProfileWidth: 74,
        sashProfileWidth: 60,
        color: 'white',
        reinforcement: 'steel_1.2mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f1.pockets = recalculateFramePockets(f1);
      if (f1.pockets[0]) {
        f1.pockets[0].sashType = 'french_open';
        f1.pockets[0].customLabel = 'S1';
        f1.pockets[0].glassType = 'clear_5mm';
      }
      return {
        id: 'proj-french-window',
        name: 'Casement French Window 1200x1200',
        clientName: 'Residential Villa',
        referenceNo: 'W-FR-01',
        date: new Date().toISOString().split('T')[0],
        frames: [f1],
        couplings: [],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },
  {
    id: 'french_casement_door_1500x2100',
    name: 'Casement French Door (Double Leaf 1500 x 2100 mm)',
    nameHindi: 'केसमेंट फ्रेंच डोर (डबल पल्ला दरवाजा - बीच का सैश)',
    description: 'Heavy duty French Casement Door with dual meeting stiles, center False Mullion (बीच की फॉल्स मुल्लियन), master & slave lever handles, and shootbolts.',
    category: 'door_window',
    thumbnailIcon: 'door',
    getProject: () => {
      const f1: UPVCFrame = {
        id: 'frame-french-d1',
        name: 'D-FR1 (French Door)',
        width: 1500,
        height: 2100,
        x: 0,
        y: 0,
        series: 'door_premium',
        frameProfileWidth: 65,
        mullionProfileWidth: 74,
        sashProfileWidth: 85,
        color: 'white',
        reinforcement: 'steel_1.5mm',
        drainageCaps: true,
        mullions: [],
        pockets: [],
      };
      f1.pockets = recalculateFramePockets(f1);
      if (f1.pockets[0]) {
        f1.pockets[0].sashType = 'french_open';
        f1.pockets[0].applicationType = 'door';
        f1.pockets[0].customLabel = 'D1';
        f1.pockets[0].glassType = 'clear_6mm';
        f1.pockets[0].handleType = 'door_lever';
      }
      return {
        id: 'proj-french-door',
        name: 'Casement French Door 1500x2100',
        clientName: 'Main Balcony / Patio',
        referenceNo: 'D-FR-01',
        date: new Date().toISOString().split('T')[0],
        frames: [f1],
        couplings: [],
        pricingConfig: { ...DEFAULT_PRICING_CONFIG },
      };
    },
  },
  {
    id: 'sliding_w_2track_4panel_fix_slide_slide_fix',
    name: '4-Panel Slider [ FIX - SLIDE → | ← SLIDE - FIX ] with Center Lock (3200 x 2100 mm)',
    nameHindi: '4-पैनल [ साइड फिक्स + बीच में 2 स्लाइड + बीच में लॉक ]',
    description: '4-Panel 2-Track window/door (3200x2100mm): Outer side panels are Stationary Fixed [FIX], center two panels are Sliding [S1 → | ← S2], meeting in the center with a dedicated Center Meeting Crescent Lock (बीच का लॉक).',
    category: 'sliding',
    thumbnailIcon: 'sliding-window',
    panelCount: 4,
    configurationCode: 'W_4P_FSSF_LOCK',
    getProject: () =>
      createSlidingProject(
        'W_4P_FSSF_LOCK',
        3200,
        2100,
        [800, 800, 800, 800],
        ['slider_fixed_center', 'slider_arrow_right', 'slider_arrow_left', 'slider_fixed_center'],
        'clear_5mm',
        '2-Track',
        false,
        true,
        ['FIX', 'S1', 'S2', 'FIX']
      ),
  },
];

/** Helper to generate factory sliding project definitions */
function createSlidingProject(
  ref: string,
  width: number,
  height: number,
  panelWidths: number[],
  sashTypes: SashType[],
  glassType: any = 'clear_5mm',
  trackType: string = '2-Track',
  meshOnS2: boolean = false,
  hasCenterLock: boolean = false,
  customLabels?: string[]
): UPVCProject {
  const mullions: { id: string; orientation: 'vertical'; position: number; width: number }[] = [];
  let cumX = 0;
  for (let i = 0; i < panelWidths.length - 1; i++) {
    cumX += panelWidths[i];
    mullions.push({
      id: `mul-sl-${ref.toLowerCase()}-${i + 1}`,
      orientation: 'vertical',
      position: cumX,
      width: 4, // Ultra-slim 4mm interlock meeting stile (adha ka adha)
    });
  }

  const f1: UPVCFrame = {
    id: `frame-${ref.toLowerCase()}`,
    name: `F1 (${ref})`,
    width,
    height,
    x: 0,
    y: 0,
    series: trackType === '3-Track' ? 'sliding_88' : 'sliding_62',
    frameProfileWidth: 45,
    mullionProfileWidth: 4, // 4mm interlock profile
    sashProfileWidth: 50,
    color: 'white',
    reinforcement: 'steel_1.5mm',
    drainageCaps: true,
    hasCenterLock: hasCenterLock,
    mullions: mullions as any,
    pockets: [],
  };

  f1.pockets = recalculateFramePockets(f1);
  let glassSashCounter = 1;
  sashTypes.forEach((st, idx) => {
    if (f1.pockets[idx]) {
      f1.pockets[idx].sashType = st;
      f1.pockets[idx].glassType = glassType;
      if (customLabels && customLabels[idx]) {
        f1.pockets[idx].customLabel = customLabels[idx];
      } else if (st === 'mesh_sash') {
        f1.pockets[idx].customLabel = 'MS1 (Mesh)';
        f1.pockets[idx].hasMesh = true;
      } else if (st === 'slider_fixed_center' || st === 'fixed') {
        f1.pockets[idx].customLabel = 'FIX';
      } else {
        f1.pockets[idx].customLabel = `S${glassSashCounter++}`;
      }
    }
  });

  if (meshOnS2 && f1.pockets[1]) {
    f1.pockets[1].hasMesh = true;
    f1.pockets[1].customLabel = 'S2';
  }

  return {
    id: `proj-${ref.toLowerCase()}`,
    name: `Sliding Window ${ref} (${width}x${height})`,
    clientName: 'Site Project Elevation',
    referenceNo: ref,
    date: new Date().toISOString().split('T')[0],
    frames: [f1],
    couplings: [],
    pricingConfig: { ...DEFAULT_PRICING_CONFIG },
  };
}

