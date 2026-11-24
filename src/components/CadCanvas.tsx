import React, { useState, useRef, useEffect } from 'react';
import { HardwareHandle } from './HardwareHandle';
import { calculateHandlePlacement, shouldShowSlidingHandle, getSlidingArrowDirection } from '../utils/handlePlacement';
import { FanPositionModal, FanPositionConfig } from './FanPositionModal';
import {
  UPVCFrame,
  Mullion,
  FramePocket,
  CouplingConnection,
  UPVCColor,
  SashType,
  GlassType,
  GridPattern,
  GeorgianBarConfig,
  CouplerType,
} from '../types/upvc';
import {
  calculateAssemblyBounds,
  DEFAULT_COLORS,
  recalculateFramePockets,
} from '../utils/upvcCalculations';
import { evaluateDimensionMath, getLiveMathPreview } from '../utils/dimensionMath';
import {
  Maximize,
  ZoomIn,
  ZoomOut,
  Layers,
  Split,
  MousePointer,
  RotateCcw,
  Check,
  Columns,
  Rows,
  Sliders,
  Move,
  Grid,
  Eye,
  Info,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Scissors,
  X,
  Box,
  Calculator,
} from 'lucide-react';

interface CadCanvasProps {
  frames: UPVCFrame[];
  couplings: CouplingConnection[];
  selectedFrameId: string | null;
  selectedMullionId: string | null;
  selectedPocketId: string | null;
  selectedCouplingId: string | null;
  activeTool: 'select' | 'v_mullion' | 'h_mullion' | 'coupling' | 'h_coupling_split' | 'v_coupling_split';
  setActiveTool: (tool: 'select' | 'v_mullion' | 'h_mullion' | 'coupling' | 'h_coupling_split' | 'v_coupling_split') => void;
  onSelectFrame: (id: string | null) => void;
  onSelectMullion: (id: string | null) => void;
  onSelectPocket: (id: string | null, targetMode?: 'shutter' | 'mesh') => void;
  onSelectCoupling: (id: string | null) => void;
  onUpdateFrameDimension: (
    frameId: string,
    width: number,
    height: number,
    anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'left' | 'right' | 'top' | 'bottom'
  ) => void;
  onUpdateTotalDimension: (type: 'total_w' | 'total_h', newTotalValue: number) => void;
  onUpdateMullionPosition: (frameId: string, mullionId: string, newPosition: number) => void;
  onSplitFrameHorizontal: (frameId: string, couplerType?: CouplerType, angle?: number, bendDirection?: 'inward' | 'outward') => void;
  onSplitFrameVertical: (frameId: string, couplerType?: CouplerType, angle?: number, bendDirection?: 'inward' | 'outward') => void;
  onUpdateCoupling?: (coupling: CouplingConnection) => void;
  onUpdatePocketSash?: (frameId: string, pocketId: string, sashType: SashType) => void;
  onAddMullionAtPosition?: (frameId: string, orientation: 'vertical' | 'horizontal', position?: number, targetPocketId?: string, forceSectional?: boolean) => void;
  onAddCrossMullion?: (frameId: string) => void;
  onEqualizeMullions?: () => void;
  onRequestMultipleMullions?: (frameId: string, orientation: 'vertical' | 'horizontal', pocketId?: string) => void;
  onRequestGeorgianBarPrompt?: (data: { frameId: string; pocketId?: string | null; initialPattern?: GridPattern; initialColor?: any; initialCols?: number; initialRows?: number }) => void;
  onUpdatePocketPanel?: (frameId: string, pocketId: string, config: { glassType?: GlassType; sashType?: SashType; gridPattern?: GridPattern; georgianBar?: GeorgianBarConfig; hasMesh?: boolean }) => void;
  onOpenPocketCustomizer?: (frameId: string, pocketId: string, targetMode?: 'shutter' | 'mesh') => void;
  onUpdateFanAc?: (action: {
    type: 'fan' | 'ac' | 'top_fan_transom' | 'bottom_ac_transom';
    diameter?: number;
    fanPanelType?: string;
    fanHorizontalAlign?: 'left' | 'center' | 'right';
    acUnitType?: string;
    frameId?: string;
    pocketId?: string;
  }) => void;
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  lang: 'hi' | 'en';
  viewMode: 'inside' | 'outside';
  setViewMode: (mode: 'inside' | 'outside') => void;
  floorDistance: number;
  setFloorDistance: (dist: number) => void;
  couplerGap: number;
  setCouplerGap: (gap: number) => void;
  onDeleteSelected?: () => void;
  onOpenCuttingList?: () => void;
  onClosePalette?: () => void;
  onOpen3D?: () => void;
}

export const CadCanvas: React.FC<CadCanvasProps> = ({
  frames,
  couplings,
  selectedFrameId,
  selectedMullionId,
  selectedPocketId,
  selectedCouplingId,
  activeTool,
  setActiveTool,
  onSelectFrame,
  onSelectMullion,
  onSelectPocket,
  onSelectCoupling,
  onUpdateCoupling,
  onUpdateFrameDimension,
  onUpdateTotalDimension,
  onUpdateMullionPosition,
  onSplitFrameHorizontal,
  onSplitFrameVertical,
  onUpdatePocketSash,
  onAddMullionAtPosition,
  onAddCrossMullion,
  onEqualizeMullions,
  onRequestMultipleMullions,
  onRequestGeorgianBarPrompt,
  onUpdatePocketPanel,
  onOpenPocketCustomizer,
  onUpdateFanAc,
  zoom,
  setZoom,
  lang,
  viewMode,
  setViewMode,
  floorDistance,
  setFloorDistance,
  couplerGap,
  setCouplerGap,
  onDeleteSelected,
  onOpenCuttingList,
  onClosePalette,
  onOpen3D,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 260, y: 140 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  // Global keyboard shortcut for Delete and Backspace keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (
        targetTag === 'input' ||
        targetTag === 'textarea' ||
        targetTag === 'select' ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCouplingId || selectedMullionId || selectedFrameId || selectedPocketId) {
          e.preventDefault();
          if (onDeleteSelected) {
            onDeleteSelected();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCouplingId, selectedMullionId, selectedFrameId, selectedPocketId, onDeleteSelected]);

  // Floating Coupling Toolbar Visibility
  const [showCouplingPanel, setShowCouplingPanel] = useState(true);

  // Active angled coupling detector:
  // If a horizontal coupling has an angle < 180 or is variable_bay_pole / corner,
  // it is an angular coupling and automatically renders bent according to that angle on this single screen.
  // When coupling is simple/flat (angle 180 or flat_2mm), it renders straight/flat side-by-side!
  const activeAngledCoupling = (couplings || []).find(
    (c) =>
      c.direction === 'horizontal' &&
      ((c.angle !== undefined && c.angle !== 180) ||
        c.couplerType === 'variable_bay_pole' ||
        c.couplerType === 'corner_90' ||
        c.couplerType === 'corner_135')
  );

  const isAngledBayView = Boolean(activeAngledCoupling);

  // Drag-and-drop state for Coupling & Sash tools
  const [draggedCoupler, setDraggedCoupler] = useState<'h_split' | 'v_split' | 'corner' | null>(null);
  const [dropTargetFrameId, setDropTargetFrameId] = useState<string | null>(null);
  const [dropTargetPocketId, setDropTargetPocketId] = useState<string | null>(null);
  const [dropTargetPoint, setDropTargetPoint] = useState<{ x: number; y: number } | null>(null);
  // Fan Position Prompt dialog state when dragging or adding fan (Left, Center, or Right)
  const [fanPositionPrompt, setFanPositionPrompt] = useState<FanPositionConfig | null>(null);

  // Direct Inline Dimension Editor State (Click-to-Type like in video)
  const [inlineEditing, setInlineEditing] = useState<{
    id: string;
    type: 'frame_w' | 'frame_h' | 'bay_w' | 'mullion_pos' | 'mullion_segment' | 'step_x' | 'step_y' | 'total_w' | 'total_h';
    frameId?: string;
    mullionId?: string;
    mullionRole?: 'top' | 'bottom' | 'left' | 'right';
    totalDim?: number;
    totalBays?: number;
    screenX: number;
    screenY: number;
    value: string;
    title: string;
    anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'left' | 'right' | 'top' | 'bottom';
  } | null>(null);

  // Floor distance inline editing
  const [editingFloorDist, setEditingFloorDist] = useState(false);
  const [floorDistInput, setFloorDistInput] = useState(floorDistance.toString());

  // Mouse drag handles for interactive resizing
  const [dragHandle, setDragHandle] = useState<{
    type: 'frame_w_right' | 'frame_w_left' | 'frame_h_bot' | 'frame_h_top' | 'mullion';
    frameId: string;
    mullionId?: string;
    startX: number;
    startY: number;
    initialW?: number;
    initialH?: number;
    initialX?: number;
    initialY?: number;
    initialPos?: number;
    orientation?: 'vertical' | 'horizontal';
  } | null>(null);

  // Selected frame within coupling editor
  const [couplingEditorFrameId, setCouplingEditorFrameId] = useState<string | null>(null);
  const [couplingSelectedDirection, setCouplingSelectedDirection] = useState<
    'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'center'
  >('right');
  const [couplingWidthDirection, setCouplingWidthDirection] = useState<'left' | 'right'>('right');
  const [couplingHeightDirection, setCouplingHeightDirection] = useState<'top' | 'bottom'>('top');
  const [couplingDimensionInput, setCouplingDimensionInput] = useState<{
    width: string;
    height: string;
  }>({ width: '1000', height: '1000' });

  // When a coupling is selected or frames update, sync the editor inputs
  useEffect(() => {
    if (selectedCouplingId) {
      const c = couplings.find((x) => x.id === selectedCouplingId);
      if (c) {
        const frameToSelect = couplingEditorFrameId && (c.sourceFrameId === couplingEditorFrameId || c.targetFrameId === couplingEditorFrameId)
          ? couplingEditorFrameId
          : c.sourceFrameId;
        setCouplingEditorFrameId(frameToSelect);
        const f = frames.find((item) => item.id === frameToSelect);
        if (f) {
          setCouplingDimensionInput({
            width: f.width.toString(),
            height: f.height.toString(),
          });
          const defaultHDir: 'top' | 'bottom' = frameToSelect === c.sourceFrameId ? 'top' : 'top';
          const defaultWDir: 'left' | 'right' = frameToSelect === c.sourceFrameId ? 'left' : 'right';
          setCouplingHeightDirection(defaultHDir);
          setCouplingWidthDirection(defaultWDir);
          setCouplingSelectedDirection(c.direction === 'horizontal' ? defaultWDir : defaultHDir);
        }
      }
    }
  }, [selectedCouplingId, couplings, frames]);

  // Sync coupling editor inputs when couplingEditorFrameId changes
  const handleSelectCouplingFrame = (frameId: string) => {
    setCouplingEditorFrameId(frameId);
    const f = frames.find((item) => item.id === frameId);
    const c = couplings.find((x) => x.id === selectedCouplingId);
    if (f && c) {
      setCouplingDimensionInput({
        width: f.width.toString(),
        height: f.height.toString(),
      });
      if (c.direction === 'horizontal') {
        const wDir = frameId === c.sourceFrameId ? 'left' : 'right';
        setCouplingWidthDirection(wDir);
        setCouplingSelectedDirection(wDir);
      } else {
        const hDir = frameId === c.sourceFrameId ? 'top' : 'top';
        setCouplingHeightDirection(hDir);
        setCouplingSelectedDirection(hDir);
      }
    }
  };

  const bounds = calculateAssemblyBounds(frames);

  // Dynamic Auto-fit whenever frames change or dimensions expand/shrink so design stays fully in view
  useEffect(() => {
    if (containerRef.current && frames.length > 0) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      if (containerWidth <= 0 || containerHeight <= 0) return;

      const padding = 200;
      const fitZoom = Math.min(
        (containerWidth - padding * 2) / Math.max(500, bounds.totalWidth),
        (containerHeight - padding * 2) / Math.max(500, bounds.totalHeight),
        1.15
      );
      const safeZoom = Math.max(0.2, Math.min(fitZoom, 1.2));
      setZoom(safeZoom);

      const centerX = (containerWidth - bounds.totalWidth * safeZoom) / 2 - bounds.minX * safeZoom;
      const centerY = (containerHeight - bounds.totalHeight * safeZoom) / 2 - bounds.minY * safeZoom;
      setPan({ x: Math.round(centerX), y: Math.round(centerY) });
    }
  }, [frames.length, bounds.totalWidth, bounds.totalHeight]);

  const fitToScreen = () => {
    if (containerRef.current && frames.length > 0) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const padding = 200;
      const fitZoom = Math.min(
        (containerWidth - padding * 2) / Math.max(500, bounds.totalWidth),
        (containerHeight - padding * 2) / Math.max(500, bounds.totalHeight),
        1.15
      );
      const safeZoom = Math.max(0.2, Math.min(fitZoom, 1.25));
      setZoom(safeZoom);

      const centerX = (containerWidth - bounds.totalWidth * safeZoom) / 2 - bounds.minX * safeZoom;
      const centerY = (containerHeight - bounds.totalHeight * safeZoom) / 2 - bounds.minY * safeZoom;
      setPan({ x: Math.round(centerX), y: Math.round(centerY) });
    }
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.max(0.2, Math.min(prev * zoomFactor, 3.5)));
  };

  // Canvas Mouse down for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).tagName === 'svg' ||
      (e.target as HTMLElement).id === 'cad-canvas-bg' ||
      (e.target as HTMLElement).id === 'cad-grid-rect'
    ) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectFrame(null);
      onSelectMullion(null);
      onSelectPocket(null);
      onSelectCoupling(null);
      setInlineEditing(null);
    }
  };

  // Canvas Mouse move for pan & drag resize
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    if (dragHandle) {
      const dx = (e.clientX - dragHandle.startX) / zoom;
      const dy = (e.clientY - dragHandle.startY) / zoom;
      const frame = frames.find((f) => f.id === dragHandle.frameId);
      if (!frame) return;

      if (dragHandle.type === 'frame_w_right') {
        const initialW = dragHandle.initialW || 1000;
        const newW = Math.max(200, Math.round((initialW + dx) / 10) * 10);
        onUpdateFrameDimension(frame.id, newW, frame.height, 'right');
      } else if (dragHandle.type === 'frame_w_left') {
        const initialW = dragHandle.initialW || 1000;
        const newW = Math.max(200, Math.round((initialW - dx) / 10) * 10);
        onUpdateFrameDimension(frame.id, newW, frame.height, 'left');
      } else if (dragHandle.type === 'frame_h_bot') {
        const initialH = dragHandle.initialH || 1000;
        const newH = Math.max(200, Math.round((initialH + dy) / 10) * 10);
        onUpdateFrameDimension(frame.id, frame.width, newH, 'bottom');
      } else if (dragHandle.type === 'frame_h_top') {
        const initialH = dragHandle.initialH || 1000;
        const newH = Math.max(200, Math.round((initialH - dy) / 10) * 10);
        onUpdateFrameDimension(frame.id, frame.width, newH, 'top');
      } else if (dragHandle.type === 'mullion' && dragHandle.mullionId) {
        const initial = dragHandle.initialPos || 0;
        if (dragHandle.orientation === 'vertical') {
          const newPos = Math.max(
            frame.frameProfileWidth + 40,
            Math.min(frame.width - frame.frameProfileWidth - 40, Math.round((initial + dx) / 10) * 10)
          );
          onUpdateMullionPosition(frame.id, dragHandle.mullionId, newPos);
        } else {
          const newPos = Math.max(
            frame.frameProfileWidth + 40,
            Math.min(frame.height - frame.frameProfileWidth - 40, Math.round((initial + dy) / 10) * 10)
          );
          onUpdateMullionPosition(frame.id, dragHandle.mullionId, newPos);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragHandle(null);
  };

  // Submit direct inline edit with math calculation evaluation
  const submitInlineDimension = () => {
    if (!inlineEditing) return;
    const raw = String(inlineEditing.value || '').trim();
    const evaluated = evaluateDimensionMath(raw);
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const num = evaluated !== null ? evaluated : Math.round(parseFloat(cleaned));
    
    if (isNaN(num) || num < 50) {
      setInlineEditing(null);
      return;
    }

    if (inlineEditing.type === 'total_w' || inlineEditing.type === 'total_h') {
      onUpdateTotalDimension(inlineEditing.type, num);
      setInlineEditing(null);
      return;
    }

    if (inlineEditing.frameId) {
      const frame = frames.find((f) => f.id === inlineEditing.frameId);
      if (frame) {
        if (inlineEditing.type === 'frame_w') {
          const defaultAnchor = inlineEditing.anchor || 'right';
          onUpdateFrameDimension(frame.id, num, frame.height, defaultAnchor);
        } else if (inlineEditing.type === 'bay_w') {
          const defaultAnchor = inlineEditing.anchor || 'right';
          const totalBays = inlineEditing.totalBays || 1;
          const newW = num * totalBays;
          onUpdateFrameDimension(frame.id, newW, frame.height, defaultAnchor);
        } else if (inlineEditing.type === 'frame_h') {
          const defaultAnchor = inlineEditing.anchor || 'bottom';
          onUpdateFrameDimension(frame.id, frame.width, num, defaultAnchor);
        } else if (inlineEditing.type === 'mullion_segment' && inlineEditing.mullionId) {
          const role = inlineEditing.mullionRole;
          const totalD = inlineEditing.totalDim || (role === 'left' || role === 'right' ? frame.width : frame.height);
          let newMullionPos = num;
          if (role === 'bottom') {
            // User edited bottom height. Top automatically becomes totalD - num. Total frame height is strictly conserved!
            const clamped = Math.max(60, Math.min(totalD - 60, num));
            newMullionPos = totalD - clamped;
          } else if (role === 'top') {
            // User edited top height. Bottom automatically becomes totalD - num. Total frame height is strictly conserved!
            newMullionPos = Math.max(60, Math.min(totalD - 60, num));
          } else if (role === 'right') {
            // User edited right width. Left automatically becomes totalD - num. Total frame width is strictly conserved!
            const clamped = Math.max(60, Math.min(totalD - 60, num));
            newMullionPos = totalD - clamped;
          } else if (role === 'left') {
            // User edited left width. Right automatically becomes totalD - num. Total frame width is strictly conserved!
            newMullionPos = Math.max(60, Math.min(totalD - 60, num));
          }
          onUpdateMullionPosition(frame.id, inlineEditing.mullionId, newMullionPos);
        } else if (inlineEditing.type === 'mullion_pos' && inlineEditing.mullionId) {
          onUpdateMullionPosition(frame.id, inlineEditing.mullionId, num);
        }
      }
    }

    setInlineEditing(null);
  };

  // Collect distinct stepped coordinate segments for outer dimension chains
  // Internal pocket dimensions and tiny profile deductions are suppressed for clean, professional CAD display
  const distinctXCoords: number[] = Array.from(
    new Set<number>(frames.flatMap((f) => [Math.round(f.x), Math.round(f.x + f.width)]))
  ).sort((a, b) => a - b);

  const distinctYCoords: number[] = Array.from(
    new Set<number>(frames.flatMap((f) => [Math.round(f.y), Math.round(f.y + f.height)]))
  ).sort((a, b) => a - b);

  // Handle frame selection or tool application
  const handleFrameClick = (frameId: string) => {
    if (activeTool === 'h_coupling_split') {
      onSplitFrameHorizontal(frameId);
      return;
    }
    if (activeTool === 'v_coupling_split') {
      onSplitFrameVertical(frameId);
      return;
    }
    if (activeTool === 'v_mullion') {
      if (onAddMullionAtPosition) {
        onAddMullionAtPosition(frameId, 'vertical');
        setActiveTool('select');
        return;
      }
    }
    if (activeTool === 'h_mullion') {
      if (onAddMullionAtPosition) {
        onAddMullionAtPosition(frameId, 'horizontal');
        setActiveTool('select');
        return;
      }
    }
    onSelectFrame(frameId);
    onSelectMullion(null);
    onSelectPocket(null);
    onSelectCoupling(null);
  };

  // HTML5 Drag and Drop Handlers for All 5 Categories (Casement, Sliding, Panels, Coupling, Mullions)
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;
      setDropTargetPoint({ x: canvasX, y: canvasY });

      // Find frame under cursor
      const hitFrame = frames.find(
        (f) =>
          canvasX >= f.x &&
          canvasX <= f.x + f.width &&
          canvasY >= f.y &&
          canvasY <= f.y + f.height
      );
      setDropTargetFrameId(hitFrame ? hitFrame.id : null);

      if (hitFrame) {
        // Find specific pocket inside frame
        const relX = canvasX - hitFrame.x;
        const relY = canvasY - hitFrame.y;
        const hitPocket = hitFrame.pockets.find(
          (p) =>
            relX >= p.x &&
            relX <= p.x + p.width &&
            relY >= p.y &&
            relY <= p.y + p.height
        );
        setDropTargetPocketId(hitPocket ? hitPocket.id : null);
      } else {
        setDropTargetPocketId(null);
      }
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (onClosePalette) {
      onClosePalette();
    }
    const rawText = e.dataTransfer.getData('text/plain') || (draggedCoupler as string) || '';
    let jsonSash: any = null;
    try {
      const rawJson = e.dataTransfer.getData('application/json');
      if (rawJson) jsonSash = JSON.parse(rawJson);
    } catch (err) {
      // ignore
    }

    const targetFrameId = dropTargetFrameId || selectedFrameId || frames[0]?.id;
    const targetFrame = targetFrameId ? frames.find((f) => f.id === targetFrameId) : null;
    const targetPocketId = dropTargetPocketId || targetFrame?.pockets[0]?.id;

    // 1. SASH & SLIDING TYPES (Casement & Sliding)
    if (rawText.startsWith('sash:') || jsonSash?.type === 'sash_type') {
      const cleanSashRaw = rawText.replace('sash:', '');
      const sashType = (jsonSash?.sashType || cleanSashRaw.split(':')[0]) as SashType;
      const openDirection = jsonSash?.openDirection || (cleanSashRaw.includes(':in') ? 'in' : cleanSashRaw.includes(':out') ? 'out' : undefined);
      if (onUpdatePocketSash && targetFrame && targetPocketId) {
        onUpdatePocketSash(targetFrame.id, targetPocketId, sashType);
        if (openDirection && onUpdatePocketPanel) {
          onUpdatePocketPanel(targetFrame.id, targetPocketId, { openDirection });
        }
        onSelectFrame(targetFrame.id);
        onSelectPocket(targetPocketId);
      }
    }
    // 2. PANELS, MESH & GLASS INFILL
    else if (rawText.startsWith('panel:') || jsonSash?.type === 'panel_type') {
      if (targetFrame && targetPocketId) {
        const isGeorgianBarDrop =
          rawText.includes('georgian') ||
          rawText.includes('dorgen') ||
          jsonSash?.gridPattern?.startsWith('georgian') ||
          jsonSash?.georgianBar?.enabled;

        if (isGeorgianBarDrop && onRequestGeorgianBarPrompt) {
          const targetPkt = targetFrame.pockets?.find((p) => p.id === targetPocketId);
          onRequestGeorgianBarPrompt({
            frameId: targetFrame.id,
            pocketId: targetPocketId,
            initialPattern: jsonSash?.gridPattern || targetPkt?.gridPattern || 'georgian_2x2',
            initialColor: jsonSash?.georgianBar?.color || targetPkt?.georgianBar?.color || 'gold',
            initialCols: jsonSash?.georgianBar?.cols || 2,
            initialRows: jsonSash?.georgianBar?.rows || 2,
          });
        } else if (onUpdatePocketPanel) {
          onUpdatePocketPanel(targetFrame.id, targetPocketId, {
            glassType: jsonSash?.glassType,
            sashType:
              jsonSash?.sashType ||
              (rawText === 'panel:louver'
                ? 'louver'
                : rawText === 'panel:upvc_panel'
                ? 'upvc_panel'
                : rawText === 'panel:mesh_sash'
                ? 'mesh_sash'
                : undefined),
            gridPattern: jsonSash?.gridPattern,
            georgianBar: jsonSash?.georgianBar,
            hasMesh: jsonSash?.hasMesh,
          });
        } else if (jsonSash?.sashType && onUpdatePocketSash) {
          onUpdatePocketSash(targetFrame.id, targetPocketId, jsonSash.sashType);
        }
        onSelectFrame(targetFrame.id);
        onSelectPocket(targetPocketId);
      }
    }
    // 3. MULLIONS & TRANSOMS
    else if (rawText.startsWith('mullion:') || jsonSash?.type === 'mullion') {
      if (targetFrame) {
        if (
          rawText === 'mullion:multi_vertical' ||
          jsonSash?.orientation === 'multi_vertical'
        ) {
          if (onRequestMultipleMullions) {
            onRequestMultipleMullions(targetFrame.id, 'vertical', dropTargetPocketId || undefined);
          }
        } else if (
          rawText === 'mullion:multi_horizontal' ||
          jsonSash?.orientation === 'multi_horizontal'
        ) {
          if (onRequestMultipleMullions) {
            onRequestMultipleMullions(targetFrame.id, 'horizontal', dropTargetPocketId || undefined);
          }
        } else if (rawText === 'mullion:equalize' || jsonSash?.rawText === 'mullion:equalize') {
          if (onEqualizeMullions) onEqualizeMullions();
        } else if (jsonSash?.orientation === 'cross' || rawText === 'mullion:cross') {
          if (onAddCrossMullion) {
            onAddCrossMullion(targetFrame.id);
          } else if (onAddMullionAtPosition) {
            onAddMullionAtPosition(targetFrame.id, 'vertical');
            onAddMullionAtPosition(targetFrame.id, 'horizontal');
          }
        } else if (jsonSash?.orientation === 'horizontal' || rawText === 'mullion:horizontal' || rawText === 'mullion:horizontal_section') {
          const isSectional = jsonSash?.isSectional || rawText === 'mullion:horizontal_section';
          if (onAddMullionAtPosition) {
            onAddMullionAtPosition(targetFrame.id, 'horizontal', undefined, dropTargetPocketId || undefined, isSectional);
          }
        } else {
          // Vertical Mullion
          const isSectional = jsonSash?.isSectional || rawText === 'mullion:vertical_section';
          if (onAddMullionAtPosition) {
            onAddMullionAtPosition(targetFrame.id, 'vertical', undefined, dropTargetPocketId || undefined, isSectional);
          }
        }
        onSelectFrame(targetFrame.id);
      }
    }
    // 4. COUPLING & FRAME SPLIT (2mm Coupler & Variable Angle Coupler)
    else if (
      rawText.startsWith('coupling:') ||
      jsonSash?.type === 'coupling' ||
      rawText === 'h_split' ||
      rawText === 'v_split' ||
      jsonSash?.rawText === 'h_split' ||
      jsonSash?.rawText === 'v_split'
    ) {
      if (targetFrame) {
        const isVertSplit =
          rawText === 'v_split' ||
          jsonSash?.rawText === 'v_split' ||
          rawText === 'coupling:vertical' ||
          jsonSash?.action === 'v_split' ||
          rawText.includes('variable_bay_pole') ||
          rawText.includes('corner_90') ||
          rawText.includes('corner_135') ||
          jsonSash?.couplerType === 'variable_bay_pole' ||
          jsonSash?.couplerType === 'corner_90' ||
          jsonSash?.couplerType === 'corner_135';

        const chosenCouplerType: CouplerType = jsonSash?.couplerType || (
          rawText.includes('variable_bay_pole') ? 'variable_bay_pole' :
          rawText.includes('corner_90') ? 'corner_90' :
          rawText.includes('corner_135') ? 'corner_135' :
          rawText.includes('box') ? 'box_profile' : 'flat_2mm'
        );
        const chosenAngle = jsonSash?.angle ?? (
          chosenCouplerType === 'corner_90' ? 90 :
          chosenCouplerType === 'corner_135' ? 135 :
          chosenCouplerType === 'variable_bay_pole' ? 135 : undefined
        );
        const chosenBend = jsonSash?.bendDirection || 'inward';

        if (isVertSplit) {
          onSplitFrameVertical(targetFrame.id, chosenCouplerType, chosenAngle, chosenBend);
        } else {
          onSplitFrameHorizontal(targetFrame.id, chosenCouplerType, chosenAngle, chosenBend);
        }
      }
    }
    // 5. FAN & AC SYSTEM (Exhaust Fan, Window AC, Louvers, Transoms)
    else if (rawText.startsWith('fan_ac:') || rawText.startsWith('ac:') || jsonSash?.type === 'fan_ac' || rawText === 'tool_window_ac') {
      if (onUpdateFanAc && targetFrame) {
        const isTopTransom = rawText === 'fan_ac:top_transom' || jsonSash?.action === 'top_fan_transom';
        const isBottomTransom = rawText === 'fan_ac:bottom_transom' || jsonSash?.action === 'bottom_ac_transom';

        // Explicitly check AC first so 'fan_ac:ac' is NEVER misidentified as fan!
        const isAc =
          !isBottomTransom &&
          (rawText === 'fan_ac:ac' ||
            rawText === 'ac:window_ac' ||
            rawText === 'tool_window_ac' ||
            rawText.endsWith(':ac') ||
            rawText.includes('window_ac') ||
            rawText.includes('ac_box') ||
            rawText.includes('ac_provision') ||
            jsonSash?.sashType === 'ac_provision' ||
            jsonSash?.hasACLouver ||
            jsonSash?.acUnitType === 'box_cutout');

        const isFan =
          !isAc &&
          !isTopTransom &&
          !isBottomTransom &&
          (jsonSash?.hasFanCutout ||
            rawText.endsWith(':fan') ||
            rawText.includes('exhaust_fan') ||
            rawText.includes('dia_') ||
            rawText.includes('louver_fan') ||
            rawText === 'fan_ac:fan' ||
            rawText === 'tool_exhaust_fan');

        if (isFan) {
          const targetPocket = targetFrame.pockets.find((p) => p.id === targetPocketId);
          let detectedAlign: 'left' | 'center' | 'right' = 'center';
          if (dropTargetPoint && targetPocket) {
            const relX = dropTargetPoint.x - targetFrame.x;
            const pocketLocalX = relX - targetPocket.x;
            const ratio = pocketLocalX / targetPocket.width;
            if (ratio < 0.35) detectedAlign = 'left';
            else if (ratio > 0.65) detectedAlign = 'right';
            else detectedAlign = 'center';
          }

          const chosenDia =
            jsonSash?.fanCutoutDiameter ||
            (rawText.includes('250') ? 250 : rawText.includes('150') ? 150 : 200);
          const chosenPanelType: 'glass_hole' | 'pvc_sheet' | 'louver_hole' =
            jsonSash?.fanPanelType || (rawText.includes('louver_fan') ? 'louver_hole' : 'glass_hole');

          // Ask the user: Left side, Center, or Right side?
          setFanPositionPrompt({
            frameId: targetFrame.id,
            pocketId: targetPocketId || targetPocket?.id || targetFrame.pockets[0]?.id || '',
            diameter: chosenDia,
            fanPanelType: chosenPanelType,
            position: detectedAlign,
          });
          onSelectFrame(targetFrame.id);
          if (targetPocketId) onSelectPocket(targetPocketId);
        } else {
          onUpdateFanAc({
            type: isTopTransom
              ? 'top_fan_transom'
              : isBottomTransom
              ? 'bottom_ac_transom'
              : 'ac',
            diameter:
              jsonSash?.fanCutoutDiameter ||
              (rawText.includes('250') ? 250 : rawText.includes('150') ? 150 : 200),
            fanPanelType:
              jsonSash?.fanPanelType || (rawText.includes('louver_fan') ? 'louver_hole' : 'glass_hole'),
            acUnitType:
              jsonSash?.acUnitType ||
              (rawText.includes('louver')
                ? 'louver'
                : rawText.includes('panel')
                ? 'insulated_panel'
                : 'box_cutout'),
            frameId: targetFrame.id,
            pocketId: targetPocketId,
          });
          onSelectFrame(targetFrame.id);
          if (targetPocketId) onSelectPocket(targetPocketId);
        }
      }
    }

    setDraggedCoupler(null);
    setDropTargetFrameId(null);
    setDropTargetPocketId(null);
    setDropTargetPoint(null);
  };

  const handleConfirmFanPosition = (config: FanPositionConfig) => {
    if (onUpdateFanAc) {
      onUpdateFanAc({
        type: 'fan',
        diameter: config.diameter,
        fanPanelType: config.fanPanelType,
        fanHorizontalAlign: config.position,
        frameId: config.frameId,
        pocketId: config.pocketId,
      });
    }
    setFanPositionPrompt(null);
  };

  // Authentic Georgian Bar / Dorgen Bar SVG Renderer for any glass area
  const renderGeorgianBarGrid = (
    gX: number,
    gY: number,
    gW: number,
    gH: number,
    pkt: FramePocket,
    fColorHex?: string
  ) => {
    const parentFrame = frames.find((f) => f.pockets.some((p) => p.id === pkt.id));
    const pattern = pkt.georgianBar?.pattern || pkt.gridPattern || (parentFrame as any)?.georgianBar?.pattern;
    if (!pattern || pattern === 'none') return null;

    const cfg = pkt.georgianBar || (parentFrame as any)?.georgianBar;
    const barColor = cfg?.color || 'gold';
    const configuredWidth = cfg?.barWidth || 18;
    const barThickness = Math.max(8, Math.min(22, Math.round(configuredWidth * 0.75)));
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

    const clipId = `georgian-clip-${pkt.id}-${Math.round(gX)}-${Math.round(gY)}`;

    return (
      <g id={`georgian-bars-${pkt.id}`} pointerEvents="none">
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
              <g id={`georgian-prairie-${pkt.id}`}>
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
              <g id={`georgian-diamond-${pkt.id}`}>
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

          {/* Standard Rectangular Grids (2x2, 2x3, 3x3, etc.) */}
          {!isColonial && !isDiamond && (
            <g id={`georgian-grid-bars-${pkt.id}`}>
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

  return (
    <div
      ref={containerRef}
      id="cad-canvas-container"
      className="w-full h-full relative overflow-hidden bg-[#fafbfc] select-none cursor-default"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      {/* ------------------------------------------------------------- */}
      {/* FLOATING COUPLING TOOLBAR (Draggable to canvas as requested) */}
      {/* ------------------------------------------------------------- */}
      {showCouplingPanel && (
        <div className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-3 shadow-2xl w-72 animate-in fade-in slide-in-from-left-4">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 tracking-wide">
              <Split className="w-4 h-4 text-blue-600" />
              <span>Coupling Tools (2mm कप्लिंग जोड़)</span>
            </div>
            <button
              onClick={() => setShowCouplingPanel(false)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="text-[11px] font-medium text-slate-500 mb-2">
            👇 <b>Drag & drop</b> on any frame or click to split:
          </div>

          {/* Coupling Action Icons Grid */}
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {/* 1. Horizontal Coupling Tool (Draggable) */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', 'h_split');
                setDraggedCoupler('h_split');
              }}
              onClick={() => {
                setActiveTool('h_coupling_split');
                if (selectedFrameId) onSplitFrameHorizontal(selectedFrameId);
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition ${
                activeTool === 'h_coupling_split'
                  ? 'bg-blue-50 border-blue-600 text-blue-600 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title="Drag onto frame to split Horizontally (Top/Bottom 2mm Coupling)"
            >
              <div className="w-6 h-6 flex flex-col justify-between items-center py-0.5 border border-slate-400 rounded-xs bg-white mb-1 shadow-2xs">
                <div className="w-full h-1.5 bg-blue-100 border-b border-dashed border-blue-500" />
                <div className="w-full h-1.5 bg-blue-100" />
              </div>
              <span className="text-[9px] font-bold">Horiz.</span>
            </div>

            {/* 2. Vertical Coupling Tool (Draggable) */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', 'v_split');
                setDraggedCoupler('v_split');
              }}
              onClick={() => {
                setActiveTool('v_coupling_split');
                if (selectedFrameId) onSplitFrameVertical(selectedFrameId);
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition ${
                activeTool === 'v_coupling_split'
                  ? 'bg-blue-50 border-blue-600 text-blue-600 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title="Drag onto frame to split Vertically (Left/Right 2mm Coupling)"
            >
              <div className="w-6 h-6 flex justify-between items-center px-0.5 border border-slate-400 rounded-xs bg-white mb-1 shadow-2xs">
                <div className="h-full w-1.5 bg-blue-100 border-r border-dashed border-blue-500" />
                <div className="h-full w-1.5 bg-blue-100" />
              </div>
              <span className="text-[9px] font-bold">Vert.</span>
            </div>

            {/* 3. 180° Flat Simple Coupler */}
            <button
              onClick={() => {
                const targetC = selectedCouplingId 
                  ? (couplings || []).find(c => c.id === selectedCouplingId) 
                  : (couplings || []).find(c => c.direction === 'horizontal');
                if (targetC && onUpdateCoupling) {
                  onUpdateCoupling({
                    ...targetC,
                    couplerType: 'flat_2mm',
                    angle: 180,
                    gap: 2,
                  });
                  onSelectCoupling(targetC.id);
                } else {
                  setCouplerGap(2);
                }
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
              title="सीधा फ़्लैट जोड़ (180° Flat Simple Coupler)"
            >
              <div className="w-6 h-6 border border-slate-300 rounded-xs flex items-center justify-center bg-white mb-1 shadow-2xs">
                <div className="w-1 h-4 bg-amber-500 rounded-full" />
              </div>
              <span className="text-[9px] font-bold">180° सीधा</span>
            </button>

            {/* 4. Variable Bay Pole 135° */}
            <button
              onClick={() => {
                const targetC = selectedCouplingId 
                  ? (couplings || []).find(c => c.id === selectedCouplingId) 
                  : (couplings || []).find(c => c.direction === 'horizontal');
                if (targetC && onUpdateCoupling) {
                  onUpdateCoupling({
                    ...targetC,
                    couplerType: 'variable_bay_pole',
                    angle: 135,
                    gap: 38,
                  });
                  onSelectCoupling(targetC.id);
                } else {
                  setCouplerGap(10);
                }
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg border bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 transition cursor-pointer"
              title="Variable Bay Pole 135° (135° बे-पोल मोड़)"
            >
              <div className="w-6 h-6 border border-amber-500 rounded-full flex items-center justify-center bg-white mb-1 shadow-2xs">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
              </div>
              <span className="text-[9px] font-bold">135° Bay</span>
            </button>

            {/* 5. Corner Coupler 90° */}
            <button
              onClick={() => {
                const targetC = selectedCouplingId 
                  ? (couplings || []).find(c => c.id === selectedCouplingId) 
                  : (couplings || []).find(c => c.direction === 'horizontal');
                if (targetC && onUpdateCoupling) {
                  onUpdateCoupling({
                    ...targetC,
                    couplerType: 'corner_90',
                    angle: 90,
                    gap: 50,
                  });
                  onSelectCoupling(targetC.id);
                } else {
                  setCouplerGap(50);
                }
              }}
              className="flex flex-col items-center justify-center p-1.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Corner Coupler 90° (90° कॉर्नर मोड़)"
            >
              <div className="w-6 h-6 border-l-2 border-t-2 border-blue-600 bg-white mb-1 rounded-tl-xs shadow-2xs" />
              <span className="text-[9px] font-bold">90° Corner</span>
            </button>
          </div>

          {/* Quick Gap Selector */}
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-600 font-medium text-[11px]">Coupler Gap:</span>
            <div className="flex items-center gap-1.5">
              {[2, 10, 50].map((g) => (
                <button
                  key={g}
                  onClick={() => setCouplerGap(g)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    couplerGap === g
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {g}mm
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Button to Re-open Coupling Panel */}
      {!showCouplingPanel && (
        <button
          onClick={() => setShowCouplingPanel(true)}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-white/95 border border-slate-300 rounded-xl px-3.5 py-2 shadow-lg text-xs font-bold text-slate-800 hover:bg-blue-50 hover:border-blue-400 transition"
        >
          <Split className="w-4 h-4 text-blue-600" />
          <span>Coupling Tools</span>
        </button>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SVG CAD WORLD */}
      {/* ------------------------------------------------------------- */}
      <svg
        className="w-full h-full absolute inset-0 overflow-visible pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          {/* Engineering CAD Graph Grid ("GRAF JASE BOX") */}
          <linearGradient id="bayPoleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="25%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="75%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <pattern id="cadGrid50" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.9" />
          </pattern>
          <pattern id="cadGrid200" width="200" height="200" patternUnits="userSpaceOnUse">
            <rect width="200" height="200" fill="url(#cadGrid50)" />
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
          </pattern>

          {/* Glass Tint Shading & Architectural Grid Pattern */}
          <pattern id="slidingGlassGrid" width="22" height="22" patternUnits="userSpaceOnUse">
            <rect width="22" height="22" fill="#c3ebfa" />
            <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#a2daf5" strokeWidth="0.8" />
          </pattern>

          {/* S1 Background Track Soft Recessed Glass */}
          <linearGradient id="sashBackGlassShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b4d7eb" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#a3cfeb" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#8fc4e3" stopOpacity="0.95" />
          </linearGradient>

          {/* S2 Foreground Track Crisp Elevated Glass */}
          <linearGradient id="sashFrontGlassShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.98" />
            <stop offset="50%" stopColor="#ddf2fd" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#c3e8fb" stopOpacity="0.98" />
          </linearGradient>

          {/* Sliding Interlock Slim Profile Texture */}
          <linearGradient id="slidingInterlockGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#cbd5e1" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#f1f5f9" stopOpacity="1" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.85" />
          </linearGradient>

          {/* S2 Foreground Elevation Drop Shadow onto S1 (Multi-Stop Smooth Shadow) */}
          <linearGradient id="sashOverlapShadowGrad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#0f172a" stopOpacity="0.32" />
            <stop offset="70%" stopColor="#0f172a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>

          {/* S2 Foreground Elevation Drop Shadow Filter */}
          <filter id="sashFrontShadow" x="-30%" y="-10%" width="160%" height="120%">
            <feDropShadow dx="-5" dy="0" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.45" />
          </filter>

          {/* Mosquito Mesh SS304 Wire Grid Pattern (Ultra-Crisp, High-Contrast & Scaled for Large Sizes) */}
          {(() => {
            const effectiveZoom = Math.max(0.2, Math.min(1.5, zoom));
            const meshPatternSize = Math.max(22, Math.min(90, Math.round(26 / effectiveZoom)));
            const meshWireStroke = Math.max(1.1, Math.min(3.2, Number((1.2 / effectiveZoom).toFixed(2))));
            const meshBorderStroke = Math.max(0.65, Math.min(2.0, Number((0.7 / effectiveZoom).toFixed(2))));
            return (
              <>
                <pattern id="flyMeshDiamond" width={meshPatternSize} height={meshPatternSize} patternUnits="userSpaceOnUse">
                  {/* Authentic SS304 / Charcoal Insect Screen Background Tint */}
                  <rect width={meshPatternSize} height={meshPatternSize} fill="#0f172a" fillOpacity="0.08" />
                  <rect width={meshPatternSize} height={meshPatternSize} fill="#0284c7" fillOpacity="0.04" />
                  {/* Stainless Steel Woven Diamond Wires - High Contrast Crisp Lines */}
                  <path
                    d={`M 0 0 L ${meshPatternSize} ${meshPatternSize} M ${meshPatternSize} 0 L 0 ${meshPatternSize}`}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={meshWireStroke}
                    strokeOpacity="0.85"
                  />
                  {/* Orthogonal Grid Wires */}
                  <path
                    d={`M 0 ${meshPatternSize / 2} L ${meshPatternSize} ${meshPatternSize / 2} M ${meshPatternSize / 2} 0 L ${meshPatternSize / 2} ${meshPatternSize}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={meshBorderStroke}
                    strokeOpacity="0.65"
                  />
                  {/* Cell Perimeter Border */}
                  <rect
                    x="0"
                    y="0"
                    width={meshPatternSize}
                    height={meshPatternSize}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={meshBorderStroke}
                    strokeOpacity="0.5"
                  />
                </pattern>

                <pattern id="videoMeshPattern" width={meshPatternSize} height={meshPatternSize} patternUnits="userSpaceOnUse">
                  <rect width={meshPatternSize} height={meshPatternSize} fill="#0f172a" fillOpacity="0.08" />
                  <rect width={meshPatternSize} height={meshPatternSize} fill="#0284c7" fillOpacity="0.04" />
                  <path
                    d={`M 0 0 L ${meshPatternSize} ${meshPatternSize} M ${meshPatternSize} 0 L 0 ${meshPatternSize}`}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={meshWireStroke}
                    strokeOpacity="0.85"
                  />
                  <path
                    d={`M 0 ${meshPatternSize / 2} L ${meshPatternSize} ${meshPatternSize / 2} M ${meshPatternSize / 2} 0 L ${meshPatternSize / 2} ${meshPatternSize}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={meshBorderStroke}
                    strokeOpacity="0.65"
                  />
                  <rect
                    x="0"
                    y="0"
                    width={meshPatternSize}
                    height={meshPatternSize}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={meshBorderStroke}
                    strokeOpacity="0.5"
                  />
                </pattern>
              </>
            );
          })()}

          <linearGradient id="videoGlassShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d7effc" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#c3e7fa" stopOpacity="0.95" />
          </linearGradient>

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

          {/* 3D Coupler Post Column Gradient */}
          <linearGradient id="post3DShade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="35%" stopColor="#f1f5f9" />
            <stop offset="70%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          {/* Bay Window Perspective Glass Tint */}
          <linearGradient id="bayGlassTint" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.9" />
          </linearGradient>
          {/* Glass Grid pattern overlay */}
          <pattern id="glassGridPattern" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#93c5fd" strokeWidth="0.75" strokeOpacity="0.75" />
          </pattern>

          {/* Authentic Georgian Bar (Dorgen Bar) Extrusion Gradients */}
          {/* 1. Golden Brass Bar (गोल्डन ब्रास बार) */}
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

          {/* 2. Pure White Bar (सफेद बार) */}
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

          {/* 3. Matt Black Bar (ब्लैक बार) */}
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

          {/* 4. Silver Aluminium Bar (सिल्वर बार) */}
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

          {/* 5. Architectural Bronze Bar (ब्रॉन्ज बार) */}
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

          {/* --------------------------------------------------------- */}
          {/* BOLD & PROMINENT ARCHITECTURAL DIMENSION ARROW MARKERS */}
          {/* --------------------------------------------------------- */}
          {/* Dark Solid Architectural Arrows */}
          <marker
            id="cadArrowStart"
            markerWidth="52"
            markerHeight="36"
            refX="3"
            refY="18"
            orient="auto"
          >
            <path d="M 48 3 L 3 18 L 48 33 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="2.4" />
          </marker>
          <marker
            id="cadArrowEnd"
            markerWidth="52"
            markerHeight="36"
            refX="49"
            refY="18"
            orient="auto"
          >
            <path d="M 4 3 L 49 18 L 4 33 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="2.4" />
          </marker>

          {/* Blue Solid Arrows for Active Frame / Hover Selection */}
          <marker
            id="cadArrowBlueStart"
            markerWidth="52"
            markerHeight="36"
            refX="3"
            refY="18"
            orient="auto"
          >
            <path d="M 48 3 L 3 18 L 48 33 Z" fill="#1d4ed8" stroke="#1d4ed8" strokeWidth="2.4" />
          </marker>
          <marker
            id="cadArrowBlueEnd"
            markerWidth="52"
            markerHeight="36"
            refX="49"
            refY="18"
            orient="auto"
          >
            <path d="M 4 3 L 49 18 L 4 33 Z" fill="#1d4ed8" stroke="#1d4ed8" strokeWidth="2.4" />
          </marker>

          {/* Dedicated Mullion Segment Dimension Arrow Markers */}
          <marker
            id="cadArrowMullionStart"
            markerWidth="44"
            markerHeight="28"
            refX="3"
            refY="14"
            orient="auto"
          >
            <path d="M 40 3 L 3 14 L 40 25 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
          </marker>
          <marker
            id="cadArrowMullionEnd"
            markerWidth="44"
            markerHeight="28"
            refX="41"
            refY="14"
            orient="auto"
          >
            <path d="M 4 3 L 41 14 L 4 25 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
          </marker>

          {/* Distinct 45-degree Architectural Hash/Slash markers */}
          <marker id="cadSlash" markerWidth="32" markerHeight="32" refX="16" refY="16" orient="auto">
            <line x1="4" y1="28" x2="28" y2="4" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
          </marker>
          <marker id="cadSlashBlue" markerWidth="32" markerHeight="32" refX="16" refY="16" orient="auto">
            <line x1="4" y1="28" x2="28" y2="4" stroke="#1d4ed8" strokeWidth="7" strokeLinecap="round" />
          </marker>

          {/* Architectural Hardware Handle Gradients */}
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

          {/* Extruded Aluminum Track Rail Metallic Gradient */}
          <linearGradient id="trackRailSilver" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="30%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* Global Architectural Drafting Grid */}
        {showGrid && (
          <rect
            id="cad-grid-rect"
            x={bounds.minX - 5000}
            y={bounds.minY - 5000}
            width={bounds.totalWidth + 10000}
            height={bounds.totalHeight + 10000}
            fill="url(#cadGrid200)"
          />
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2D CAD FABRICATION ASSEMBLY WITH FULL DESIGN DETAILS */}
        {/* ------------------------------------------------------------- */}
        {/* ------------------------------------------------------------- */}
        {/* LEFT MULTI-TIER HEIGHT DIMENSION CHAIN (Bolder & Clearer) */}
        {/* ------------------------------------------------------------- */}
            <g id="dimension-chain-left" className="select-none">
          {/* 1. Outer Total Height Line with Bold Solid Arrows */}
          <line
            x1={bounds.minX - 165}
            y1={bounds.minY}
            x2={bounds.minX - 165}
            y2={bounds.maxY}
            stroke="#0f172a"
            strokeWidth="3.8"
            markerStart="url(#cadArrowStart)"
            markerEnd="url(#cadArrowEnd)"
          />
          {/* Extension witness lines for Total Height */}
          <line
            x1={bounds.minX - 195}
            y1={bounds.minY}
            x2={bounds.minX - 12}
            y2={bounds.minY}
            stroke="#475569"
            strokeWidth="2"
            strokeDasharray="6 3"
          />
          <line
            x1={bounds.minX - 195}
            y1={bounds.maxY}
            x2={bounds.minX - 12}
            y2={bounds.maxY}
            stroke="#475569"
            strokeWidth="2"
            strokeDasharray="6 3"
          />

          {/* Total Height Number Badge (Large Bold Click-to-Edit) */}
          <g
            transform={`translate(${bounds.minX - 165}, ${(bounds.minY + bounds.maxY) / 2}) rotate(-90)`}
            onClick={() => {
              setInlineEditing({
                id: `total-h`,
                type: 'total_h',
                screenX: bounds.minX - 165,
                screenY: (bounds.minY + bounds.maxY) / 2,
                value: bounds.totalHeight.toString(),
                title: 'Total Height (कुल ऊँचाई)',
              });
            }}
            className="cursor-pointer group select-none"
          >
            <rect
              x="-80"
              y="-33"
              width="160"
              height="66"
              rx="14"
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="3.5"
              className="group-hover:stroke-blue-600 group-hover:scale-105 transition filter drop-shadow-xl"
            />
            <text
              x="0"
              y="12"
              fill="#090d16"
              fontSize="42"
              fontWeight="900"
              fontFamily="sans-serif"
              textAnchor="middle"
              className="group-hover:fill-blue-600 transition"
            >
              {bounds.totalHeight}
            </text>
            <text
              x="0"
              y="-40"
              fill="#334155"
              fontSize="13"
              fontWeight="900"
              fontFamily="sans-serif"
              textAnchor="middle"
              className="tracking-wider"
            >
              TOTAL H
            </text>
          </g>

          {/* 2. Inner Individual Height Segments (Upper & Lower / Mullion Segments - Separate Arrows for Each!) */}
          {(() => {
            const heightSegments: {
              y1: number;
              y2: number;
              height: number;
              frame: UPVCFrame;
              label?: string;
              mullionId?: string;
              mullionRole?: 'top' | 'bottom';
            }[] = [];

            for (const f of frames) {
              const hMulls = (f.mullions || [])
                .filter((m) => m.orientation === 'horizontal')
                .sort((a, b) => a.position - b.position);

              if (hMulls.length > 0) {
                const cutPoints = [0, ...hMulls.map((m) => m.position), f.height];
                for (let i = 0; i < cutPoints.length - 1; i++) {
                  const y1 = f.y + cutPoints[i];
                  const y2 = f.y + cutPoints[i + 1];
                  const segH = Math.round(cutPoints[i + 1] - cutPoints[i]);
                  const isFirst = i === 0;
                  const isLast = i === cutPoints.length - 2;
                  const mId = isLast ? hMulls[hMulls.length - 1].id : hMulls[i].id;
                  const role: 'top' | 'bottom' = isFirst ? 'top' : 'bottom';
                  const label = isFirst ? (lang === 'hi' ? 'ऊपर (Top)' : 'Top') : isLast ? (lang === 'hi' ? 'नीचे (Bottom)' : 'Bottom') : `Part ${i + 1}`;

                  const exists = heightSegments.some(
                    (s) => Math.abs(s.y1 - y1) <= 15 && Math.abs(s.y2 - y2) <= 15
                  );
                  if (!exists) {
                    heightSegments.push({
                      y1,
                      y2,
                      height: segH,
                      frame: f,
                      label,
                      mullionId: mId,
                      mullionRole: role,
                    });
                  }
                }
              } else {
                const y1 = f.y;
                const y2 = f.y + f.height;
                const segH = Math.round(f.height);
                const exists = heightSegments.some(
                  (s) => Math.abs(s.y1 - y1) <= 15 && Math.abs(s.y2 - y2) <= 15
                );
                if (!exists) {
                  heightSegments.push({
                    y1,
                    y2,
                    height: segH,
                    frame: f,
                    label: f.name || 'Frame',
                  });
                }
              }
            }
            heightSegments.sort((a, b) => a.y1 - b.y1);

            // If only 1 vertical segment exists across the entire window, suppress inner tier so it doesn't duplicate Total Height
            if (heightSegments.length <= 1) return null;

            return heightSegments.map((seg, idx) => {
              const f = seg.frame;
              const y1 = seg.y1;
              const y2 = seg.y2;
              const segH = seg.height;
              const midY = (y1 + y2) / 2;

              return (
                <g key={`left-h-seg-${f.id}-${idx}`}>
                  {/* Distinct Arrow for this vertical part (Upper or Lower) */}
                  <line
                    x1={bounds.minX - 80}
                    y1={y1}
                    x2={bounds.minX - 80}
                    y2={y2}
                    stroke="#334155"
                    strokeWidth="3.2"
                    markerStart="url(#cadSlash)"
                    markerEnd="url(#cadSlash)"
                  />
                  {/* Extension witness lines */}
                  <line
                    x1={bounds.minX - 110}
                    y1={y1}
                    x2={bounds.minX - 10}
                    y2={y1}
                    stroke="#64748b"
                    strokeWidth="1.8"
                  />
                  <line
                    x1={bounds.minX - 110}
                    y1={y2}
                    x2={bounds.minX - 10}
                    y2={y2}
                    stroke="#64748b"
                    strokeWidth="1.8"
                  />

                  {/* Segment Dimension Box - Click to edit */}
                  <g
                    transform={`translate(${bounds.minX - 80}, ${midY}) rotate(-90)`}
                    onClick={() => {
                      onSelectFrame(f.id);
                      if (seg.mullionId) {
                        onSelectMullion(seg.mullionId);
                        setInlineEditing({
                          id: `mullion-seg-${seg.mullionId}-${seg.mullionRole}`,
                          type: 'mullion_segment',
                          frameId: f.id,
                          mullionId: seg.mullionId,
                          mullionRole: seg.mullionRole,
                          totalDim: f.height,
                          screenX: bounds.minX - 80,
                          screenY: midY,
                          value: segH.toString(),
                          title: `${seg.label} ऊँचाई (Mullion Height: ${segH} mm)`,
                        });
                      } else {
                        setInlineEditing({
                          id: `seg-h-${f.id}`,
                          type: 'frame_h',
                          frameId: f.id,
                          screenX: bounds.minX - 80,
                          screenY: midY,
                          value: segH.toString(),
                          title: `${f.name || 'Frame'} Height (फ्रेम ऊंचाई)`,
                          anchor: 'bottom',
                        });
                      }
                    }}
                    className="cursor-pointer group select-none"
                  >
                    <rect
                      x="-65"
                      y="-28"
                      width="130"
                      height="56"
                      rx="12"
                      fill="#ffffff"
                      stroke="#334155"
                      strokeWidth="2.8"
                      className="group-hover:stroke-blue-600 group-hover:fill-blue-50 transition filter drop-shadow-md"
                    />
                    <text
                      x="0"
                      y="11"
                      fill="#090d16"
                      fontSize="36"
                      fontWeight="900"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      className="group-hover:fill-blue-600 transition"
                    >
                      {segH}
                    </text>
                  </g>
                </g>
              );
            });
          })()}
        </g>

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM MULTI-TIER WIDTH DIMENSION CHAIN (Large Numbers & Bay Segments) */}
        {/* ------------------------------------------------------------- */}
        <g id="dimension-chain-bottom" className="select-none">
          {/* 1. Outer Total Width Line with Bold Solid Arrows */}
          <line
            x1={bounds.minX}
            y1={bounds.maxY + 165}
            x2={bounds.maxX}
            y2={bounds.maxY + 165}
            stroke="#0f172a"
            strokeWidth="3.8"
            markerStart="url(#cadArrowStart)"
            markerEnd="url(#cadArrowEnd)"
          />
          {/* Extension witness lines for Total Width */}
          <line
            x1={bounds.minX}
            y1={bounds.maxY + 8}
            x2={bounds.minX}
            y2={bounds.maxY + 195}
            stroke="#475569"
            strokeWidth="2"
            strokeDasharray="6 3"
          />
          <line
            x1={bounds.maxX}
            y1={bounds.maxY + 8}
            x2={bounds.maxX}
            y2={bounds.maxY + 195}
            stroke="#475569"
            strokeWidth="2"
            strokeDasharray="6 3"
          />

          {/* Large Total Width Number Badge */}
          <g
            transform={`translate(${(bounds.minX + bounds.maxX) / 2}, ${bounds.maxY + 165})`}
            onClick={() => {
              setInlineEditing({
                id: `total-w`,
                type: 'total_w',
                screenX: (bounds.minX + bounds.maxX) / 2,
                screenY: bounds.maxY + 165,
                value: bounds.totalWidth.toString(),
                title: 'Total Width (कुल चौड़ाई)',
              });
            }}
            className="cursor-pointer group select-none"
          >
            <rect
              x="-82"
              y="-33"
              width="165"
              height="66"
              rx="14"
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="3.5"
              className="group-hover:stroke-blue-600 group-hover:scale-105 transition filter drop-shadow-xl"
            />
            <text
              x="0"
              y="12"
              fill="#090d16"
              fontSize="44"
              fontWeight="900"
              fontFamily="sans-serif"
              textAnchor="middle"
              className="group-hover:fill-blue-600 transition"
            >
              {bounds.totalWidth}
            </text>
            <text
              x="0"
              y="48"
              fill="#334155"
              fontSize="13"
              fontWeight="900"
              fontFamily="sans-serif"
              textAnchor="middle"
              className="tracking-wider"
            >
              TOTAL W
            </text>
          </g>

          {/* 2. Inner Bay / Panel Width Segments (EVA Dual-Tier Style) */}
          {(() => {
            // Filter frames so vertically stacked frames don't duplicate on the bottom width line
            const baseFramesForBays: UPVCFrame[] = [];
            const sortedByX = [...frames].sort((a, b) => a.x - b.x);
            for (const f of sortedByX) {
              const existing = baseFramesForBays.find((bf) => Math.abs(bf.x - f.x) <= 20 && Math.abs(bf.width - f.width) <= 20);
              if (!existing) {
                baseFramesForBays.push(f);
              } else if ((f.y + f.height) > (existing.y + existing.height)) {
                const idx = baseFramesForBays.indexOf(existing);
                baseFramesForBays[idx] = f;
              }
            }

            const baySegments: {
              x1: number;
              x2: number;
              width: number;
              frame: UPVCFrame;
              label: string;
              bayIndex: number;
              totalBays: number;
              mullionId?: string;
              mullionRole?: 'left' | 'right';
            }[] = [];

            baseFramesForBays.forEach((frame) => {
              const isSlider = frame.series.startsWith('sliding') ||
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
                    bayIndex: pIdx,
                    totalBays: numPanels,
                  });
                }
              } else {
                const vMulls = (frame.mullions || [])
                  .filter((m) => m.orientation === 'vertical' && !m.parentPocketId)
                  .sort((a, b) => a.position - b.position);

                if (vMulls.length > 0) {
                  // Divided by vertical mullions
                  let prevX = frame.x;
                  vMulls.forEach((m, mIdx) => {
                    const mX = frame.x + m.position;
                    const w = Math.round(mX - prevX);
                    baySegments.push({
                      x1: prevX,
                      x2: mX,
                      width: w,
                      frame,
                      label: `Bay ${mIdx + 1}`,
                      bayIndex: mIdx,
                      totalBays: vMulls.length + 1,
                      mullionId: m.id,
                      mullionRole: 'left',
                    });
                    prevX = mX;
                  });
                  const lastW = Math.round(frame.x + frame.width - prevX);
                  baySegments.push({
                    x1: prevX,
                    x2: frame.x + frame.width,
                    width: lastW,
                    frame,
                    label: `Bay ${vMulls.length + 1}`,
                    bayIndex: vMulls.length,
                    totalBays: vMulls.length + 1,
                    mullionId: vMulls[vMulls.length - 1].id,
                    mullionRole: 'right',
                  });
                } else {
                  // Multi-pocket casements: only split if in a single horizontal row (not stacked vertically by a horizontal transom)
                  const pCount = (frame.pockets || []).length;
                  let numPanels = 1;
                  if (pCount > 1) {
                    const firstPktY = frame.pockets?.[0]?.y || 0;
                    const isSingleRow = frame.pockets?.every((p) => Math.abs(p.y - firstPktY) < 10);
                    if (isSingleRow) {
                      numPanels = pCount;
                    }
                  }

                  if (numPanels > 1) {
                    const exactW = frame.width / numPanels;
                    const displayW = exactW % 1 === 0 ? exactW : Number(exactW.toFixed(1));
                    for (let pIdx = 0; pIdx < numPanels; pIdx++) {
                      const startX = frame.x + pIdx * exactW;
                      const endX = pIdx === numPanels - 1 ? frame.x + frame.width : frame.x + (pIdx + 1) * exactW;
                      baySegments.push({
                        x1: startX,
                        x2: endX,
                        width: displayW,
                        frame,
                        label: `S${pIdx + 1}`,
                        bayIndex: pIdx,
                        totalBays: numPanels,
                      });
                    }
                  } else {
                    baySegments.push({
                      x1: frame.x,
                      x2: frame.x + frame.width,
                      width: frame.width,
                      frame,
                      label: frame.name || 'Frame',
                      bayIndex: 0,
                      totalBays: 1,
                    });
                  }
                }
              }
            });

            // Suppress inner bay line if only 1 bay exists across the whole assembly (Total Width line already covers it)
            if (baySegments.length <= 1) return null;

            const tier1Y = bounds.maxY + 75;

            return baySegments.map((seg, idx) => {
              const x1 = seg.x1;
              const x2 = seg.x2;
              const segW = seg.width;
              const midX = (x1 + x2) / 2;
              const matchingFrame = seg.frame;
              const isFirstInAssembly = idx === 0;
              const isLastInAssembly = idx === baySegments.length - 1;

              return (
                <g key={`bot-bay-w-${idx}-${matchingFrame.id}`}>
                  {/* Arrow Line for this Bay */}
                  <line
                    x1={x1 + 4}
                    y1={tier1Y}
                    x2={x2 - 4}
                    y2={tier1Y}
                    stroke="#1e293b"
                    strokeWidth="3.2"
                    markerStart="url(#cadArrowStart)"
                    markerEnd="url(#cadArrowEnd)"
                  />
                  {/* Witness Lines from Frame Bottom Down to Dimension Line */}
                  <line
                    x1={x1}
                    y1={bounds.maxY + 8}
                    x2={x1}
                    y2={tier1Y + 22}
                    stroke="#64748b"
                    strokeWidth="1.8"
                  />
                  <line
                    x1={x2}
                    y1={bounds.maxY + 8}
                    x2={x2}
                    y2={tier1Y + 22}
                    stroke="#64748b"
                    strokeWidth="1.8"
                  />

                  {/* Terminal Witness End Block / Divider */}
                  {isFirstInAssembly && (
                    <rect
                      x={x1 - 5}
                      y={tier1Y - 18}
                      width="10"
                      height="36"
                      rx="2"
                      fill="#475569"
                    />
                  )}
                  {isLastInAssembly ? (
                    <rect
                      x={x2 - 5}
                      y={tier1Y - 18}
                      width="10"
                      height="36"
                      rx="2"
                      fill="#475569"
                    />
                  ) : (
                    <line
                      x1={x2}
                      y1={tier1Y - 16}
                      x2={x2}
                      y2={tier1Y + 16}
                      stroke="#475569"
                      strokeWidth="3"
                    />
                  )}

                  {/* Large Bay Dimension Badge */}
                  <g
                    transform={`translate(${midX}, ${tier1Y})`}
                    onClick={() => {
                      onSelectFrame(matchingFrame.id);
                      if (seg.mullionId) {
                        setInlineEditing({
                          id: `bay-w-${matchingFrame.id}-${idx}`,
                          type: 'mullion_segment',
                          frameId: matchingFrame.id,
                          mullionId: seg.mullionId,
                          mullionRole: seg.mullionRole,
                          totalDim: matchingFrame.width,
                          screenX: midX,
                          screenY: tier1Y,
                          value: segW.toString(),
                          title: `${seg.label} Width (पैनल चौड़ाई)`,
                          anchor: 'right',
                        });
                      } else {
                        setInlineEditing({
                          id: `bay-w-${matchingFrame.id}-${idx}`,
                          type: seg.totalBays > 1 ? 'bay_w' : 'frame_w',
                          frameId: matchingFrame.id,
                          screenX: midX,
                          screenY: tier1Y,
                          value: segW.toString(),
                          totalBays: seg.totalBays,
                          title: `${seg.label} Panel Width (${segW}mm)`,
                          anchor: 'right',
                        });
                      }
                    }}
                    className="cursor-pointer group select-none"
                  >
                    <rect
                      x="-65"
                      y="-28"
                      width="130"
                      height="56"
                      rx="12"
                      fill="#ffffff"
                      stroke="#334155"
                      strokeWidth="2.8"
                      className="group-hover:stroke-blue-600 group-hover:scale-105 transition filter drop-shadow-md"
                    />
                    <text
                      x="0"
                      y="11"
                      fill="#090d16"
                      fontSize="36"
                      fontWeight="900"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      className="group-hover:fill-blue-600 transition"
                    >
                      {segW}
                    </text>
                  </g>
                </g>
              );
            });
          })()}

          {/* Architectural Floor Aperture Datum (matching reference) */}
          <g transform={`translate(${bounds.maxX}, ${bounds.maxY + 215})`} className="select-none pointer-events-none">
            <line x1="-160" y1="0" x2="0" y2="0" stroke="#64748b" strokeWidth="2" />
            <line x1="-160" y1="0" x2="-150" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="-140" y1="0" x2="-130" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="-120" y1="0" x2="-110" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="-100" y1="0" x2="-90" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="-80" y1="0" x2="-70" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="-60" y1="0" x2="-50" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="-40" y1="0" x2="-30" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="-20" y1="0" x2="-10" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="-8" y="-8" fill="#475569" fontSize="13" fontWeight="700" fontFamily="sans-serif" textAnchor="end">
              ▼ Floor Aperture Distance = {floorDistance || 900}
            </text>
          </g>
        </g>

        {/* ------------------------------------------------------------- */}
        {/* ARCHITECTURAL TRACK CROSS-SECTION PLAN (OUT / IN) & TITLE BLOCK */}
        {/* ------------------------------------------------------------- */}
        {frames.map((frame, fIdx) => {
          const isSlidingFrame = frame.series.startsWith('sliding') || (frame.pockets || []).some((p) => p.sashType.startsWith('slider_'));
          const trackCount = frame.series === 'sliding_88' || frame.pockets.length > 2 ? 3 : 2;
          const planY = bounds.maxY + 250;
          const planH = 55;
          const titleBlockY = planY + planH + 18;

          return (
            <g key={`track-plan-block-${frame.id}`} id={`track-plan-${frame.id}`} className="select-none">
              {isSlidingFrame && (
                <g id={`track-section-${frame.id}`}>
                  {/* Track plan outer box */}
                  <rect
                    x={frame.x}
                    y={planY}
                    width={frame.width}
                    height={planH}
                    fill="#f8fafc"
                    stroke="#334155"
                    strokeWidth="2"
                    rx="4"
                  />

                  {/* Top Badge: Track Identification */}
                  <rect
                    x={frame.x}
                    y={planY - 20}
                    width={trackCount === 3 ? 310 : 250}
                    height="18"
                    rx="3"
                    fill="#0f172a"
                  />
                  <text
                    x={frame.x + 8}
                    y={planY - 7}
                    fill={trackCount === 3 ? '#34d399' : '#38bdf8'}
                    fontSize="10"
                    fontWeight="900"
                    fontFamily="sans-serif"
                  >
                    {(() => {
                      const hasFrameMesh = (frame.pockets || []).some(
                        (p) =>
                          p.hasMesh ||
                          p.sashType === 'mesh_sash' ||
                          (p.customLabel && (p.customLabel.includes('Mesh') || p.customLabel.startsWith('M')))
                      );
                      if (trackCount === 3) {
                        return hasFrameMesh
                          ? '🛤️ 3 TRACK (3 RAILS) • 2 GLASS + 1 MESH'
                          : '🛤️ 3 TRACK (3 RAILS) • 3 GLASS SASHES (S1 ↔ | S2 ↔ | S3 ↔)';
                      }
                      return '🛤️ 2 TRACK (2 RAILS) • 2 PANELS (S1 & S2)';
                    })()}
                  </text>

                  {/* Left OUT / IN markers */}
                  <text x={frame.x - 34} y={planY + 16} fill="#475569" fontSize="10" fontWeight="900" fontFamily="sans-serif">
                    OUT (बाहर)
                  </text>
                  <text x={frame.x - 26} y={planY + 44} fill="#475569" fontSize="10" fontWeight="900" fontFamily="sans-serif">
                    IN (अंदर)
                  </text>

                  {/* Track guide rails */}
                  {Array.from({ length: trackCount }).map((_, tIdx) => {
                    const railY = planY + 14 + (tIdx * (planH - 28)) / Math.max(1, trackCount - 1);
                    const hasFrameMesh = (frame.pockets || []).some(
                      (p) =>
                        p.hasMesh ||
                        p.sashType === 'mesh_sash' ||
                        (p.customLabel && (p.customLabel.includes('Mesh') || p.customLabel.startsWith('M')))
                    );
                    const isMeshRail = trackCount === 3 && hasFrameMesh && tIdx === 0;
                    return (
                      <g key={`rail-${tIdx}`}>
                        <line
                          x1={frame.x + 8}
                          y1={railY}
                          x2={frame.x + frame.width - 8}
                          y2={railY}
                          stroke={isMeshRail ? '#10b981' : '#94a3b8'}
                          strokeWidth={isMeshRail ? 2 : 1.5}
                          strokeDasharray={isMeshRail ? '5 3' : 'none'}
                        />
                        <text
                          x={frame.x + frame.width + 6}
                          y={railY + 3.5}
                          fill="#64748b"
                          fontSize="8.5"
                          fontWeight="700"
                          fontFamily="sans-serif"
                        >
                          {trackCount === 3
                            ? hasFrameMesh
                              ? tIdx === 0
                                ? 'R1: जाली (Mesh)'
                                : tIdx === 1
                                ? 'R2: S1 (पीछे)'
                                : 'R3: S2 (आगे)'
                              : tIdx === 0
                              ? 'R1: S1 (पीछे)'
                              : tIdx === 1
                              ? 'R2: S2 (मध्य)'
                              : 'R3: S3 (आगे)'
                            : tIdx === 0
                            ? 'R1: S1 (पीछे)'
                            : 'R2: S2 (आगे)'}
                        </text>
                      </g>
                    );
                  })}

                  {/* Sashes on Tracks */}
                  {(frame.pockets || []).map((p, pIdx) => {
                    const sashW = p.width;
                    const sashX = frame.x + p.x;
                    const isMesh =
                      p.sashType === 'mesh_sash' ||
                      p.hasMesh ||
                      p.customLabel?.includes('Mesh') ||
                      p.customLabel?.startsWith('M');
                    const hasFrameMesh = (frame.pockets || []).some(
                      (pkt) =>
                        pkt.hasMesh ||
                        pkt.sashType === 'mesh_sash' ||
                        (pkt.customLabel && (pkt.customLabel.includes('Mesh') || pkt.customLabel.startsWith('M')))
                    );

                    let trackIdx = 0;
                    if (trackCount === 3) {
                      if (frame.pockets.length === 2) {
                        // 3-Track 2-Panel: S1 on Rail 1, S2 on Rail 2
                        trackIdx = pIdx === 0 ? 0 : 1;
                      } else if (frame.pockets.length === 4) {
                        // 3-Track 4-Bay (e.g. 6 PANEL 3 TRACK):
                        // S1 & S4 on Rail 1 (Track 0), S2 & S3 on Rail 2 (Track 1), MS1 & MS2 overlaid on Rail 3 (Track 2)
                        trackIdx = pIdx === 0 || pIdx === 3 ? 0 : 1;
                      } else if (frame.pockets.length === 6) {
                        // 3-Track 6-Panel:
                        // S1 (0), S6 (5) on Rail 1 (Track 0)
                        // S2 (1), S5 (4) on Rail 2 (Track 1)
                        // S3 (2), S4 (3) on Rail 3 (Track 2 - meeting at center)
                        if (pIdx === 0 || pIdx === 5) trackIdx = 0;
                        else if (pIdx === 1 || pIdx === 4) trackIdx = 1;
                        else trackIdx = 2;
                      } else if (hasFrameMesh) {
                        if (isMesh) trackIdx = 0; // Track 1: Fly Mesh
                        else if (pIdx === 1 || p.customLabel === 'S1') trackIdx = 1; // Track 2: S1 Glass
                        else trackIdx = 2; // Track 3: S2 Glass
                      } else {
                        // 3 Glass Panels on 3 Rails:
                        trackIdx = Math.min(2, pIdx);
                      }
                    } else {
                      // 2-Track:
                      if (pIdx === 0 || p.customLabel === 'S1') trackIdx = 0; // Track 1: S1 (Behind)
                      else trackIdx = 1; // Track 2: S2 (Front)
                    }


                    const railY = planY + 14 + (trackIdx * (planH - 28)) / Math.max(1, trackCount - 1);
                    const overlapLeft = trackIdx > 0 ? 8 : 0;
                    const overlapRight = trackIdx < (trackCount - 1) ? 8 : 0;
                    const sashPlanX = sashX - overlapLeft + 3;
                    const sashPlanW = sashW + overlapLeft + overlapRight - 6;
                    const isFixed = p.sashType === 'slider_fixed_center' || p.sashType === 'fixed';

                    return (
                      <g key={`track-sash-${p.id}`}>
                        {/* Drop shadow if foreground */}
                        {trackIdx > 0 && (
                          <rect
                            x={sashPlanX - 2}
                            y={railY - 6}
                            width="4"
                            height={12}
                            fill="#0f172a"
                            fillOpacity="0.3"
                          />
                        )}
                        <rect
                          x={sashPlanX}
                          y={railY - 6}
                          width={sashPlanW}
                          height={12}
                          rx="2"
                          fill={isMesh && frame.pockets.length !== 2 && frame.pockets.length !== 4 ? 'url(#flyMeshDiamond)' : trackIdx === 0 ? '#dbe4ed' : '#ffffff'}
                          stroke={isMesh && frame.pockets.length !== 2 && frame.pockets.length !== 4 ? '#059669' : '#0f172a'}
                          strokeWidth={trackIdx === (trackCount - 1) ? 2 : 1.5}
                        />
                        {/* Label S1 / S2 / MS1 */}
                        <text
                          x={sashPlanX + sashPlanW / 2}
                          y={railY + 3.5}
                          fill={isMesh && frame.pockets.length !== 2 && frame.pockets.length !== 4 ? '#065f46' : '#0f172a'}
                          fontSize="9.5"
                          fontWeight="900"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                        >
                          {p.customLabel || `S${pIdx + 1}`} {p.sashType === 'slider_arrow_right' ? '→' : p.sashType === 'slider_arrow_left' ? '←' : p.sashType === 'slider_arrow_both' ? '↔' : isFixed ? '(+)' : ''}
                        </text>

                        {/* If 3-Track (2-Panel or 4-Bay 6-Panel) and this panel has overlaid Fly Mesh, render MS1/MS2 Mesh Sash on Rail 3 */}
                        {trackCount === 3 && (frame.pockets.length === 2 || frame.pockets.length === 4) && p.hasMesh && (() => {
                          const planMeshIdx = frame.pockets.slice(0, pIdx).filter((pk) => pk.hasMesh || pk.sashType === 'mesh_sash').length + 1;
                          const meshDirArrow = p.sashType === 'slider_arrow_right' ? '→' : p.sashType === 'slider_arrow_both' ? '↔' : '←';
                          return (
                            <g id={`mesh-sash-rail3-${p.id}`}>
                              <rect
                                x={sashPlanX}
                                y={planY + 14 + (2 * (planH - 28)) / 2 - 6}
                                width={sashPlanW}
                                height={12}
                                rx="2"
                                fill="url(#flyMeshDiamond)"
                                stroke="#059669"
                                strokeWidth={1.8}
                              />
                              <text
                                x={sashPlanX + sashPlanW / 2}
                                y={planY + 14 + (2 * (planH - 28)) / 2 + 3.5}
                                fill="#065f46"
                                fontSize="9.5"
                                fontWeight="900"
                                fontFamily="sans-serif"
                                textAnchor="middle"
                              >
                                {`MS${planMeshIdx} (जाली) ${meshDirArrow}`}
                              </text>
                            </g>
                          );
                        })()}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Title Block Box (Factory PDF Format) */}
              <g id={`title-block-${frame.id}`} transform={`translate(${frame.x}, ${isSlidingFrame ? titleBlockY : bounds.maxY + 235})`}>
                <rect
                  x="0"
                  y="0"
                  width={frame.width}
                  height="64"
                  fill="#f8fafc"
                  stroke="#0f172a"
                  strokeWidth="2"
                  rx="4"
                />
                {/* Header row */}
                <line x1="0" y1="32" x2={frame.width} y2="32" stroke="#cbd5e1" strokeWidth="1.2" />
                <text x="14" y="20" fill="#0f172a" fontSize="12" fontWeight="900" fontFamily="sans-serif">
                  Design Ref: {frame.name || `W${fIdx + 1}`}
                </text>
                <text x={frame.width - 14} y="20" fill="#0f172a" fontSize="12" fontWeight="900" fontFamily="sans-serif" textAnchor="end">
                  Qty: 1
                </text>

                {/* Details row */}
                <text x="14" y="50" fill="#334155" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                  W = {frame.width}.00 ; H = {frame.height}.00  |  Area: {((frame.width * frame.height) / 1000000).toFixed(3)} SqMt
                </text>
                <text x={frame.width - 14} y="50" fill="#475569" fontSize="10.5" fontWeight="800" fontFamily="sans-serif" textAnchor="end">
                  View From Inside
                </text>
              </g>
            </g>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* RENDER 2MM COUPLINGS & CIRCLED Ⓒ BADGES */}
        {/* ------------------------------------------------------------- */}
        {(couplings || []).map((c) => {
          const source = (frames || []).find((f) => f.id === c.sourceFrameId);
          const target = (frames || []).find((f) => f.id === c.targetFrameId);
          if (!source || !target) return null;

          const isSelected = selectedCouplingId === c.id;
          const gap = c.gap ?? 2;

          if (c.direction === 'horizontal') {
            const fLeft = source.x <= target.x ? source : target;
            const fRight = source.x <= target.x ? target : source;
            const jointX = fLeft.x + fLeft.width;
            const jointYStart = Math.max(fLeft.y, fRight.y);
            const jointYEnd = Math.min(fLeft.y + fLeft.height, fRight.y + fRight.height);
            const jointHeight = Math.max(0, jointYEnd - jointYStart);
            if (jointHeight <= 0) return null; // Only render when frames actually contact vertically!
            const badgeY = jointYStart + jointHeight / 2;

            return (
              <g
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCoupling(c.id);
                  onSelectFrame(null);
                  onSelectMullion(null);
                  onSelectPocket(null);
                }}
                className="cursor-pointer group"
              >
                {/* Coupler Joint Visual Line / Column (Bay Pole, Box Corner, or 2mm Flat) */}
                {(() => {
                  const isBayPole = c.couplerType === 'variable_bay_pole' || (c.angle !== undefined && c.angle !== 180 && c.couplerType !== 'corner_90');
                  const isCorner90 = c.couplerType === 'corner_90' || c.angle === 90;

                  if (isBayPole) {
                    const poleW = Math.max(gap, 28);
                    return (
                      <g>
                        {/* Bay Pole Post Body */}
                        <rect
                          x={jointX}
                          y={jointYStart}
                          width={poleW}
                          height={jointHeight}
                          fill="url(#bayPoleGradient)"
                          stroke={isSelected ? '#2563eb' : '#334155'}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        {/* Center internal structural steel reinforcing axis */}
                        <line
                          x1={jointX + poleW / 2}
                          y1={jointYStart}
                          x2={jointX + poleW / 2}
                          y2={jointYStart + jointHeight}
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                          strokeDasharray="6 3"
                        />
                        {/* Top mounting head cap */}
                        <rect
                          x={jointX - 3}
                          y={jointYStart - 6}
                          width={poleW + 6}
                          height={6}
                          rx="1.5"
                          fill="#1e293b"
                          stroke="#0f172a"
                          strokeWidth="1"
                        />
                        {/* Bottom mounting sill cap */}
                        <rect
                          x={jointX - 3}
                          y={jointYStart + jointHeight}
                          width={poleW + 6}
                          height={6}
                          rx="1.5"
                          fill="#1e293b"
                          stroke="#0f172a"
                          strokeWidth="1"
                        />
                        {/* Bay Pole text label if height permits */}
                        {jointHeight >= 180 && (
                          <text
                            x={jointX + poleW / 2}
                            y={jointYStart + 45}
                            fill="#f8fafc"
                            fontSize="9"
                            fontWeight="900"
                            textAnchor="middle"
                            letterSpacing="0.8"
                            className="pointer-events-none select-none drop-shadow-xs"
                          >
                            BAY POLE
                          </text>
                        )}
                      </g>
                    );
                  }

                  if (isCorner90) {
                    const cornerW = Math.max(gap, 36);
                    return (
                      <g>
                        <rect
                          x={jointX}
                          y={jointYStart}
                          width={cornerW}
                          height={jointHeight}
                          fill="#cbd5e1"
                          stroke={isSelected ? '#2563eb' : '#475569'}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <line
                          x1={jointX + cornerW / 2}
                          y1={jointYStart}
                          x2={jointX + cornerW / 2}
                          y2={jointYStart + jointHeight}
                          stroke="#64748b"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                        />
                      </g>
                    );
                  }

                  // Standard 2mm Flat Coupler
                  return (
                    <rect
                      x={jointX}
                      y={jointYStart}
                      width={gap}
                      height={jointHeight}
                      fill="#f59e0b"
                      stroke={isSelected ? '#2563eb' : '#d97706'}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                  );
                })()}

                {/* Circled 'LC' Angle / Coupler Marker */}
                <g transform={`translate(${jointX + gap / 2}, ${badgeY})`}>
                  <circle
                    r="19"
                    fill={isSelected ? '#2563eb' : '#ffffff'}
                    stroke={isSelected ? '#1d4ed8' : '#d97706'}
                    strokeWidth="3.5"
                    className="filter drop-shadow-md hover:scale-110 active:scale-95 transition-transform"
                  />
                  <text
                    x="0"
                    y="5.5"
                    fill={isSelected ? '#ffffff' : '#d97706'}
                    fontSize="13"
                    fontWeight="900"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    textAnchor="middle"
                    letterSpacing="0.5"
                  >
                    LC
                  </text>

                  {/* Always display angle badge right under the 'A' marker */}
                  <g transform="translate(0, 27)">
                    <rect
                      x="-26"
                      y="-10"
                      width="52"
                      height="20"
                      rx="10"
                      fill={isSelected ? '#1d4ed8' : '#b45309'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="filter drop-shadow-xs"
                    />
                    <text
                      x="0"
                      y="3.5"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="900"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      ∠{c.angle ?? (c.couplerType === 'corner_90' ? 90 : c.couplerType === 'corner_135' ? 135 : 180)}°
                    </text>
                  </g>
                </g>

                {/* If angled coupling, draw visual corner arc indicator at top of joint */}
                {(c.angle !== undefined && c.angle !== 180 || c.couplerType === 'corner_90' || c.couplerType === 'corner_135' || c.couplerType === 'variable_bay_pole') && (
                  <g transform={`translate(${jointX + gap / 2}, ${jointYStart - 18})`} className="pointer-events-none">
                    <path
                      d="M -36 14 A 40 40 0 0 1 36 14"
                      fill="none"
                      stroke="#b45309"
                      strokeWidth="2.5"
                      strokeDasharray="4,3"
                    />
                    <circle cx="-36" cy="14" r="3.5" fill="#b45309" />
                    <circle cx="36" cy="14" r="3.5" fill="#b45309" />
                    <rect
                      x="-32"
                      y="-14"
                      width="64"
                      height="18"
                      rx="9"
                      fill="#fef3c7"
                      stroke="#d97706"
                      strokeWidth="1.5"
                      className="filter drop-shadow-xs"
                    />
                    <text
                      x="0"
                      y="-1.5"
                      fill="#92400e"
                      fontSize="10"
                      fontWeight="900"
                      fontFamily="system-ui, sans-serif"
                      textAnchor="middle"
                    >
                      📐 मोड़ {c.angle ?? (c.couplerType === 'corner_90' ? 90 : 135)}°
                    </text>
                  </g>
                )}
              </g>
            );
          } else {
            // Vertical Coupling (stacked frames)
            const fTop = source.y <= target.y ? source : target;
            const fBot = source.y <= target.y ? target : source;
            const jointY = fTop.y + fTop.height;
            const jointXStart = Math.max(fTop.x, fBot.x);
            const jointXEnd = Math.min(fTop.x + fTop.width, fBot.x + fBot.width);
            const jointWidth = Math.max(0, jointXEnd - jointXStart);
            if (jointWidth <= 0) return null; // Only render when frames actually contact horizontally!
            const badgeX = jointXStart + jointWidth / 2;

            return (
              <g
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCoupling(c.id);
                  onSelectFrame(null);
                  onSelectMullion(null);
                  onSelectPocket(null);
                }}
                className="cursor-pointer group"
              >
                <rect
                  x={jointXStart}
                  y={jointY}
                  width={jointWidth}
                  height={gap}
                  fill="#f59e0b"
                  stroke={isSelected ? '#2563eb' : '#d97706'}
                  strokeWidth={isSelected ? 3 : 2}
                />

                {/* Circled 'LC' Angle / Coupler Badge */}
                <g transform={`translate(${badgeX}, ${jointY + gap / 2})`}>
                  <circle
                    r="19"
                    fill={isSelected ? '#2563eb' : '#ffffff'}
                    stroke={isSelected ? '#1d4ed8' : '#d97706'}
                    strokeWidth="3.5"
                    className="filter drop-shadow-md hover:scale-110 active:scale-95 transition-transform"
                  />
                  <text
                    x="0"
                    y="5.5"
                    fill={isSelected ? '#ffffff' : '#d97706'}
                    fontSize="13"
                    fontWeight="900"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    textAnchor="middle"
                    letterSpacing="0.5"
                  >
                    LC
                  </text>

                  {/* Always display angle badge right next to the 'A' marker */}
                  <g transform="translate(32, 0)">
                    <rect
                      x="-26"
                      y="-10"
                      width="52"
                      height="20"
                      rx="10"
                      fill={isSelected ? '#1d4ed8' : '#b45309'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="filter drop-shadow-xs"
                    />
                    <text
                      x="0"
                      y="3.5"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="900"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      ∠{c.angle ?? (c.couplerType === 'corner_90' ? 90 : c.couplerType === 'corner_135' ? 135 : 180)}°
                    </text>
                  </g>
                </g>
              </g>
            );
          }
        })}

        {/* ------------------------------------------------------------- */}
        {/* RENDER EACH INDEPENDENT FRAME (F1, F2, F3...) */}
        {/* ------------------------------------------------------------- */}
        {(frames || []).map((frame, fIdx) => {
          const isFrameSelected = selectedFrameId === frame.id;
          const isHovered = hoveredFrameId === frame.id;
          const isDropTarget = dropTargetFrameId === frame.id;
          const fpw = Math.min(frame.frameProfileWidth || 45, 45);
          const mpw = frame.mullionProfileWidth || 74;
          const frameColorObj = DEFAULT_COLORS.find((c) => c.id === frame.color) || DEFAULT_COLORS[0];

          return (
            <g
              key={frame.id}
              id={`frame-svg-${frame.id}`}
              onMouseEnter={() => setHoveredFrameId(frame.id)}
              onMouseLeave={() => setHoveredFrameId(null)}
            >
              {/* Outer Frame Extrusion */}
              <g
                onClick={(e) => {
                  e.stopPropagation();
                  handleFrameClick(frame.id);
                }}
                className="cursor-pointer"
              >
                {/* Active Selection / Hover / Drag-over Highlight Ring */}
                {(isFrameSelected || isHovered || isDropTarget) && (
                  <rect
                    x={frame.x - 4}
                    y={frame.y - 4}
                    width={frame.width + 8}
                    height={frame.height + 8}
                    fill="none"
                    stroke={isDropTarget ? '#f59e0b' : isFrameSelected ? '#2563eb' : '#93c5fd'}
                    strokeWidth={isDropTarget ? 3 : 2.5}
                    strokeDasharray={isDropTarget ? '6 3' : isFrameSelected ? 'none' : '4 2'}
                    rx="4"
                  />
                )}

                {/* Outer Profile Box (4-side vs 3-side Frame) */}
                {Boolean(
                  frame.isThreeSidedFrame ||
                  frame.frameSides === '3_side' ||
                  (frame.pockets || []).some((p) => p.isThreeSidedFrame || p.frameSides === '3_side')
                ) ? (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFrame(frame.id);
                      onSelectMullion(null);
                      onSelectPocket(null);
                      onSelectCoupling(null);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Top profile */}
                    <rect
                      x={frame.x}
                      y={frame.y}
                      width={frame.width}
                      height={fpw}
                      fill={frameColorObj?.hex || '#ffffff'}
                      stroke="#0f172a"
                      strokeWidth="2.4"
                    />
                    {/* Left leg profile */}
                    <rect
                      x={frame.x}
                      y={frame.y}
                      width={fpw}
                      height={frame.height}
                      fill={frameColorObj?.hex || '#ffffff'}
                      stroke="#0f172a"
                      strokeWidth="2.4"
                    />
                    {/* Right leg profile */}
                    <rect
                      x={frame.x + frame.width - fpw}
                      y={frame.y}
                      width={fpw}
                      height={frame.height}
                      fill={frameColorObj?.hex || '#ffffff'}
                      stroke="#0f172a"
                      strokeWidth="2.4"
                    />
                    {/* Inner rebate lines (Top, Left, Right) */}
                    <line x1={frame.x + fpw} y1={frame.y + fpw} x2={frame.x + frame.width - fpw} y2={frame.y + fpw} stroke="#1e293b" strokeWidth="1.8" />
                    <line x1={frame.x + fpw} y1={frame.y + fpw} x2={frame.x + fpw} y2={frame.y + frame.height} stroke="#1e293b" strokeWidth="1.8" />
                    <line x1={frame.x + frame.width - fpw} y1={frame.y + fpw} x2={frame.x + frame.width - fpw} y2={frame.y + frame.height} stroke="#1e293b" strokeWidth="1.8" />
                    {/* 45 Degree Top Mitre Lines */}
                    <line x1={frame.x} y1={frame.y} x2={frame.x + fpw} y2={frame.y + fpw} stroke="#334155" strokeWidth="1.4" />
                    <line x1={frame.x + frame.width} y1={frame.y} x2={frame.x + frame.width - fpw} y2={frame.y + fpw} stroke="#334155" strokeWidth="1.4" />
                    {/* Open Sill Line (Dashed) */}
                    <line x1={frame.x} y1={frame.y + frame.height} x2={frame.x + frame.width} y2={frame.y + frame.height} stroke="#d97706" strokeWidth="2.4" strokeDasharray="6 3" />
                    <text
                      x={frame.x + frame.width / 2}
                      y={frame.y + frame.height - 4}
                      fill="#b45309"
                      fontSize="9"
                      fontWeight="900"
                      textAnchor="middle"
                      className="select-none"
                    >
                      [3-SIDE FRAME • NO SILL]
                    </text>
                  </g>
                ) : (
                  <>
                    {/* Outer Profile Box with Subtle Black Boundary */}
                    <rect
                      x={frame.x}
                      y={frame.y}
                      width={frame.width}
                      height={frame.height}
                      fill={frameColorObj?.hex || '#ffffff'}
                      stroke="#0f172a"
                      strokeWidth="2.4"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFrame(frame.id);
                        onSelectMullion(null);
                        onSelectPocket(null);
                        onSelectCoupling(null);
                      }}
                      className="cursor-pointer"
                    />

                    {/* Inner Cutout Profile (Glazing rebate) with Subtle Dark Border */}
                    <rect
                      x={frame.x + fpw}
                      y={frame.y + fpw}
                      width={Math.max(10, frame.width - 2 * fpw)}
                      height={Math.max(10, frame.height - 2 * fpw)}
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="1.8"
                    />

                    {/* 45 Degree Corner Mitre Joint Lines */}
                    <line x1={frame.x} y1={frame.y} x2={frame.x + fpw} y2={frame.y + fpw} stroke="#334155" strokeWidth="1.4" />
                    <line x1={frame.x + frame.width} y1={frame.y} x2={frame.x + frame.width - fpw} y2={frame.y + fpw} stroke="#334155" strokeWidth="1.4" />
                    <line x1={frame.x} y1={frame.y + frame.height} x2={frame.x + fpw} y2={frame.y + frame.height - fpw} stroke="#334155" strokeWidth="1.4" />
                    <line x1={frame.x + frame.width} y1={frame.y + frame.height} x2={frame.x + frame.width - fpw} y2={frame.y + frame.height - fpw} stroke="#334155" strokeWidth="1.4" />
                  </>
                )}

                {/* Frame Tag Badge [F1], [F2], [F3] in bottom-right corner */}
                <g 
                  transform={`translate(${frame.x + frame.width - fpw - 44}, ${frame.y + frame.height - fpw - 34})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFrame(frame.id);
                    onSelectMullion(null);
                    onSelectPocket(null);
                    onSelectCoupling(null);
                  }}
                  className="cursor-pointer group/frametag"
                >
                  <rect
                    x="0"
                    y="0"
                    width="42"
                    height="30"
                    rx="2"
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="1.6"
                    className="filter drop-shadow-xs"
                  />
                  <text
                    x="21"
                    y="21"
                    fill="#0f172a"
                    fontSize="18"
                    fontWeight="900"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    {frame.name?.startsWith('F') ? frame.name.split(' ')[0] : `F${fIdx + 1}`}
                  </text>
                </g>

                {/* --------------------------------------------------------- */}
                {/* FRAME HEADER & IDENTITY BADGE */}
                {/* --------------------------------------------------------- */}
              </g>

              {/* --------------------------------------------------------- */}
              {/* GLASS POCKETS / BAYS WITH SASHES, BADGES & ARROWS */}
              {/* --------------------------------------------------------- */}
              {(frame.pockets || []).map((pocket, pIdx) => {
                const isPocketSelected = selectedPocketId === pocket.id;
                const pX = frame.x + pocket.x;
                const pY = frame.y + pocket.y;
                const centerX = pX + pocket.width / 2;
                const centerY = pY + pocket.height / 2;

                const isSlider =
                  pocket.sashType.startsWith('slider') ||
                  pocket.sashType === 'mesh_sash' ||
                  frame.series.startsWith('sliding');

                const isSash =
                  pocket.sashType.startsWith('casement') ||
                  pocket.sashType === 'top_hung' ||
                  pocket.sashType === 'bottom_hung' ||
                  pocket.sashType === 'french_open' ||
                  pocket.sashType === 'tilt_turn' ||
                  pocket.sashType.startsWith('slider') ||
                  pocket.sashType === 'mesh_sash';

                const isMeshSashOnly =
                  pocket.sashType === 'mesh_sash' ||
                  pocket.sashType === 'mesh_slider_right' ||
                  pocket.sashType === 'mesh_slider_left' ||
                  pocket.sashType === 'slider_3t_2p_mesh' ||
                  pocket.sashType === 'slider_2s_with_mesh' ||
                  pocket.sashType === 'slider_3s_mesh';
                const hasMeshLayer = Boolean(pocket.hasMesh) || isMeshSashOnly;
                const meshOrder = (frame.pockets || [])
                  .slice(0, pIdx)
                  .filter((pk) => Boolean(pk.hasMesh) || pk.sashType === 'mesh_sash' || pk.sashType === 'mesh_slider_right' || pk.sashType === 'mesh_slider_left').length;
                const meshPanelNumber = (frame.pockets?.length || 2) + meshOrder + 1;
                const meshTagLabelText = `MS${meshOrder + 1} (FLY MESH)`;

                const sashLabelText =
                  pocket.sashLabel ||
                  (isMeshSashOnly
                    ? `MS${meshOrder + 1}`
                    : pocket.customLabel?.startsWith('S') || pocket.customLabel?.startsWith('M')
                    ? pocket.customLabel
                    : `S${pIdx + 1}`);

                const isSlidingSash =
                  pocket.sashType.startsWith('slider') ||
                  pocket.sashType.startsWith('mesh_slider') ||
                  pocket.sashType === 'mesh_sash';

                const fNameLower = (frame.name || '').toLowerCase();
                const isCasementWindow = [
                  'casement',
                  'casement_left',
                  'casement_right',
                  'top_hung',
                  'bottom_hung',
                  'tilt_turn',
                  'french_open',
                ].includes(pocket.sashType || '');
                const isWindowFrame = isCasementWindow || pocket.applicationType === 'window' || fNameLower.startsWith('w') || fNameLower.includes('window');
                const isDoorFrame = !isCasementWindow && (pocket.applicationType === 'door' || fNameLower.startsWith('d') || fNameLower.includes('door') || frame.series === 'door_premium');
                const defaultGHH = (isSlidingSash || isCasementWindow)
                  ? Math.round(pocket.height / 2)
                  : (isDoorFrame ? 1000 : Math.round(pocket.height / 2));
                const ghhValue = pocket.handleHeight || defaultGHH;

                const bayNumber = (pocket.customLabel && /^S(\d+)/i.test(pocket.customLabel))
                  ? pocket.customLabel.replace(/^S/i, '').split(' ')[0]
                  : (pIdx + 1).toString();

                const isHandleVisible = shouldShowSlidingHandle(frame, pocket, pIdx);

                const vMullCount = frame.mullions ? frame.mullions.filter((m) => m.orientation === 'vertical').length : 0;
                const is6PanelFrame =
                  (frame.pockets && frame.pockets.length === 6) ||
                  vMullCount === 5 ||
                  ((frame.pockets?.length || 0) !== 4 &&
                    (frame.name?.toLowerCase().includes('6-panel') ||
                      frame.name?.toLowerCase().includes('6 panel') ||
                      frame.name?.toLowerCase().includes('6s')));

                const slidingArrowDir = isSlider ? getSlidingArrowDirection(frame, pocket, pIdx) : 'none';

                // Effective sash type for arrow rendering:
                // 6-Panel: S2 (2nd panel / 2 sare, pIdx === 1) and S5 (5th panel / 5 wave, pIdx === 4) MUST HAVE ARROW ON BOTH SIDES (<-> / दोनों तरफ)
                const effectiveSashType = (() => {
                  if (isSlider && is6PanelFrame && (pIdx === 1 || pIdx === 4)) {
                    if (pocket.sashType !== 'slider_fixed_center' && pocket.sashType !== 'fixed') {
                      return 'slider_arrow_both';
                    }
                  }
                  if (isSlider && slidingArrowDir === 'both') {
                    return 'slider_arrow_both';
                  }
                  return pocket.sashType;
                })();

                const isBackTrack =
                  isSlider &&
                  !isMeshSashOnly &&
                  (sashLabelText === 'S1' ||
                    (frame.pockets.length === 2 && pIdx === 0) ||
                    (frame.pockets.length === 3 && (pIdx === 0 || pIdx === 1) && !isMeshSashOnly) ||
                    (frame.pockets.length === 4 && (pIdx === 0 || pIdx === 3)) ||
                    (frame.pockets.length === 6 && (pIdx === 0 || pIdx === 5)));

                const isFrontTrack =
                  isSlider &&
                  !isMeshSashOnly &&
                  (sashLabelText === 'S2' ||
                    (frame.pockets.length === 2 && pIdx === 1) ||
                    (frame.pockets.length === 3 && pIdx === 2) ||
                    (frame.pockets.length === 4 && (pIdx === 1 || pIdx === 2)) ||
                    (frame.pockets.length === 6 && (pIdx === 2 || pIdx === 3)));

                // Sliding overlap calculations: S2 steps in front of S1 with 16mm overlap
                const isSlidingAssembly = isSlider && frame.pockets && frame.pockets.length > 1;
                const hasLeftSlider = isSlidingAssembly && pIdx > 0 && !isMeshSashOnly;
                const hasRightSlider = isSlidingAssembly && pIdx < frame.pockets.length - 1 && !isMeshSashOnly;

                // Overlap offsets for true continuous sliding tracks
                const overlapLeft = (isFrontTrack && hasLeftSlider) ? 14 : 0;
                const overlapRight = (isBackTrack && hasRightSlider) ? 14 : 0;

                const actualSashX = pX - overlapLeft;
                const actualSashW = pocket.width + overlapLeft + overlapRight;

                // Dynamic sash face thickness (clear 4-sided box extrusion) and glazing bead thickness
                // For sliding sashes, use realistic slim meeting stiles (~16px) to eliminate bulky white dividers
                const sashFaceW = isSlider
                  ? Math.max(22, Math.min(Math.round(pocket.width * 0.12), Math.round(pocket.height * 0.12), 28))
                  : isSash
                  ? Math.max(30, Math.min(Math.round(pocket.width * 0.18), Math.round(pocket.height * 0.18), 42))
                  : 0;

                const interlockW = isSlider ? 16 : sashFaceW;
                const beadFaceW = isSlider
                  ? 6
                  : Math.max(10, Math.min(Math.round(pocket.width * 0.08), Math.round(pocket.height * 0.08), 16));

                // Meeting stile specific offsets
                const leftSashOffset = (isFrontTrack && hasLeftSlider) ? interlockW : sashFaceW;
                const rightSashOffset = (isBackTrack && hasRightSlider) ? interlockW : sashFaceW;

                // Glass pane boundaries (after sash + beading)
                const glassX = actualSashX + leftSashOffset + beadFaceW;
                const glassY = pY + sashFaceW + beadFaceW;
                const glassW = Math.max(10, actualSashW - (leftSashOffset + rightSashOffset + 2 * beadFaceW));
                const glassH = Math.max(10, pocket.height - 2 * (sashFaceW + beadFaceW));

                // Compute precise, collision-safe handle position and orientation for any sash pocket
                const handlePlacement = calculateHandlePlacement(frame, pocket, pIdx);

                return (
                  <g
                    key={pocket.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeTool === 'h_coupling_split') {
                        onSplitFrameHorizontal(frame.id);
                        return;
                      }
                      if (activeTool === 'v_coupling_split') {
                        onSplitFrameVertical(frame.id);
                        return;
                      }
                      if (activeTool === 'v_mullion') {
                        if (onAddMullionAtPosition) {
                          onAddMullionAtPosition(frame.id, 'vertical', undefined, pocket.id);
                          setActiveTool('select');
                          return;
                        }
                      }
                      if (activeTool === 'h_mullion') {
                        if (onAddMullionAtPosition) {
                          onAddMullionAtPosition(frame.id, 'horizontal', undefined, pocket.id);
                          setActiveTool('select');
                          return;
                        }
                      }
                      onSelectPocket(pocket.id);
                      onSelectFrame(frame.id);
                      onSelectMullion(null);
                      onSelectCoupling(null);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onOpenPocketCustomizer) {
                        onOpenPocketCustomizer(frame.id, pocket.id);
                      }
                    }}
                    className="cursor-pointer group"
                  >
                    {/* ========================================================= */}
                    {/* SASH PROFILE & MITERED GLAZING BEADING ARCHITECTURAL LINES */}
                    {/* ========================================================= */}
                    {(() => {
                      const isFrench = pocket.sashType === 'french_open';
                      if (isFrench) {
                        const leftLeafW = Math.round(pocket.width / 2);
                        const rightLeafW = pocket.width - leftLeafW;
                        const leafSashFaceW = Math.max(22, Math.min(Math.round(leftLeafW * 0.16), Math.round(pocket.height * 0.16), 38));
                        const leafBeadFaceW = Math.max(6, Math.min(Math.round(leftLeafW * 0.08), Math.round(pocket.height * 0.08), 12));
                        const fmW = Math.max(16, Math.min(26, Math.round(leafSashFaceW * 0.75)));
                        const midX = pX + leftLeafW;

                        // Left Leaf Glass
                        const lGlassX = pX + leafSashFaceW + leafBeadFaceW;
                        const lGlassY = pY + leafSashFaceW + leafBeadFaceW;
                        const lGlassW = Math.max(8, leftLeafW - 2 * (leafSashFaceW + leafBeadFaceW));
                        const lGlassH = Math.max(8, pocket.height - 2 * (leafSashFaceW + leafBeadFaceW));

                        // Right Leaf Glass
                        const rGlassX = midX + leafSashFaceW + leafBeadFaceW;
                        const rGlassY = pY + leafSashFaceW + leafBeadFaceW;
                        const rGlassW = Math.max(8, rightLeafW - 2 * (leafSashFaceW + leafBeadFaceW));
                        const rGlassH = Math.max(8, pocket.height - 2 * (leafSashFaceW + leafBeadFaceW));

                        const sashFill = frameColorObj?.hex || '#ffffff';
                        const beadFill = frameColorObj?.innerShade || '#f8fafc';

                        return (
                          <g id={`pocket-detail-${pocket.id}`}>
                            {/* ======================================================== */}
                            {/* FRENCH CASEMENT: DUAL SASHES MEETING IN CENTER (बीच में सैश) */}
                            {/* ======================================================== */}

                            {/* --- 1. LEFT SASH LEAF --- */}
                            <g id={`french-left-leaf-${pocket.id}`}>
                              {/* Outer Sash Profile Box */}
                              <rect
                                x={pX}
                                y={pY}
                                width={leftLeafW}
                                height={pocket.height}
                                fill={sashFill}
                                stroke={isPocketSelected ? '#0284c7' : '#0f172a'}
                                strokeWidth={isPocketSelected ? 2.5 : 1.8}
                              />
                              {/* 4 Corner 45° Miters */}
                              <line x1={pX} y1={pY} x2={pX + leafSashFaceW} y2={pY + leafSashFaceW} stroke="#334155" strokeWidth="1.3" />
                              <line x1={midX} y1={pY} x2={midX - leafSashFaceW} y2={pY + leafSashFaceW} stroke="#334155" strokeWidth="1.3" />
                              <line x1={pX} y1={pY + pocket.height} x2={pX + leafSashFaceW} y2={pY + pocket.height - leafSashFaceW} stroke="#334155" strokeWidth="1.3" />
                              <line x1={midX} y1={pY + pocket.height} x2={midX - leafSashFaceW} y2={pY + pocket.height - leafSashFaceW} stroke="#334155" strokeWidth="1.3" />

                              {/* Inner Step Outline */}
                              <rect
                                x={pX + leafSashFaceW}
                                y={pY + leafSashFaceW}
                                width={leftLeafW - 2 * leafSashFaceW}
                                height={pocket.height - 2 * leafSashFaceW}
                                fill="#ffffff"
                                stroke="#334155"
                                strokeWidth="1.2"
                              />

                              {/* Left Glazing Beading Base */}
                              <rect
                                x={pX + leafSashFaceW}
                                y={pY + leafSashFaceW}
                                width={leftLeafW - 2 * leafSashFaceW}
                                height={pocket.height - 2 * leafSashFaceW}
                                fill={beadFill}
                                stroke="#1e293b"
                                strokeWidth="1.1"
                              />
                              {/* Beading 45° Miters */}
                              <line x1={pX + leafSashFaceW} y1={pY + leafSashFaceW} x2={lGlassX} y2={lGlassY} stroke="#475569" strokeWidth="1" />
                              <line x1={midX - leafSashFaceW} y1={pY + leafSashFaceW} x2={lGlassX + lGlassW} y2={lGlassY} stroke="#475569" strokeWidth="1" />
                              <line x1={pX + leafSashFaceW} y1={pY + pocket.height - leafSashFaceW} x2={lGlassX} y2={lGlassY + lGlassH} stroke="#475569" strokeWidth="1" />
                              <line x1={midX - leafSashFaceW} y1={pY + pocket.height - leafSashFaceW} x2={lGlassX + lGlassW} y2={lGlassY + lGlassH} stroke="#475569" strokeWidth="1" />

                              {/* Left Glass Surface */}
                              <rect
                                x={lGlassX}
                                y={lGlassY}
                                width={lGlassW}
                                height={lGlassH}
                                fill="url(#videoGlassShade)"
                                stroke="#0f172a"
                                strokeWidth={1.4}
                              />
                              <rect
                                x={lGlassX + 1}
                                y={lGlassY + 1}
                                width={Math.max(2, lGlassW - 2)}
                                height={Math.max(2, lGlassH - 2)}
                                fill="none"
                                stroke="#0f172a"
                                strokeWidth="1"
                                strokeOpacity="0.7"
                              />
                              <line
                                x1={lGlassX + Math.min(28, lGlassW * 0.3)}
                                y1={lGlassY + 5}
                                x2={lGlassX + 5}
                                y2={lGlassY + Math.min(28, lGlassH * 0.3)}
                                stroke="#ffffff"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeOpacity="0.65"
                              />
                              {/* Georgian / Dorgen Bar on Left Leaf Glass */}
                              {renderGeorgianBarGrid(lGlassX, lGlassY, lGlassW, lGlassH, pocket, frameColorObj?.hex)}
                            </g>

                            {/* --- 2. RIGHT SASH LEAF --- */}
                            <g id={`french-right-leaf-${pocket.id}`}>
                              {/* Outer Sash Profile Box */}
                              <rect
                                x={midX}
                                y={pY}
                                width={rightLeafW}
                                height={pocket.height}
                                fill={sashFill}
                                stroke={isPocketSelected ? '#0284c7' : '#0f172a'}
                                strokeWidth={isPocketSelected ? 2.5 : 1.8}
                              />
                              {/* 4 Corner 45° Miters */}
                              <line x1={midX} y1={pY} x2={midX + leafSashFaceW} y2={pY + leafSashFaceW} stroke="#334155" strokeWidth="1.3" />
                              <line x1={pX + pocket.width} y1={pY} x2={pX + pocket.width - leafSashFaceW} y2={pY + leafSashFaceW} stroke="#334155" strokeWidth="1.3" />
                              <line x1={midX} y1={pY + pocket.height} x2={midX + leafSashFaceW} y2={pY + pocket.height - leafSashFaceW} stroke="#334155" strokeWidth="1.3" />
                              <line x1={pX + pocket.width} y1={pY + pocket.height} x2={pX + pocket.width - leafSashFaceW} y2={pY + pocket.height - leafSashFaceW} stroke="#334155" strokeWidth="1.3" />

                              {/* Inner Step Outline */}
                              <rect
                                x={midX + leafSashFaceW}
                                y={pY + leafSashFaceW}
                                width={rightLeafW - 2 * leafSashFaceW}
                                height={pocket.height - 2 * leafSashFaceW}
                                fill="#ffffff"
                                stroke="#334155"
                                strokeWidth="1.2"
                              />

                              {/* Right Glazing Beading Base */}
                              <rect
                                x={midX + leafSashFaceW}
                                y={pY + leafSashFaceW}
                                width={rightLeafW - 2 * leafSashFaceW}
                                height={pocket.height - 2 * leafSashFaceW}
                                fill={beadFill}
                                stroke="#1e293b"
                                strokeWidth="1.1"
                              />
                              {/* Beading 45° Miters */}
                              <line x1={midX + leafSashFaceW} y1={pY + leafSashFaceW} x2={rGlassX} y2={rGlassY} stroke="#475569" strokeWidth="1" />
                              <line x1={pX + pocket.width - leafSashFaceW} y1={pY + leafSashFaceW} x2={rGlassX + rGlassW} y2={rGlassY} stroke="#475569" strokeWidth="1" />
                              <line x1={midX + leafSashFaceW} y1={pY + pocket.height - leafSashFaceW} x2={rGlassX} y2={rGlassY + rGlassH} stroke="#475569" strokeWidth="1" />
                              <line x1={pX + pocket.width - leafSashFaceW} y1={pY + pocket.height - leafSashFaceW} x2={rGlassX + rGlassW} y2={rGlassY + rGlassH} stroke="#475569" strokeWidth="1" />

                              {/* Right Glass Surface */}
                              <rect
                                x={rGlassX}
                                y={rGlassY}
                                width={rGlassW}
                                height={rGlassH}
                                fill="url(#videoGlassShade)"
                                stroke="#0f172a"
                                strokeWidth={1.4}
                              />
                              <rect
                                x={rGlassX + 1}
                                y={rGlassY + 1}
                                width={Math.max(2, rGlassW - 2)}
                                height={Math.max(2, rGlassH - 2)}
                                fill="none"
                                stroke="#0f172a"
                                strokeWidth="1"
                                strokeOpacity="0.7"
                              />
                              <line
                                x1={rGlassX + Math.min(28, rGlassW * 0.3)}
                                y1={rGlassY + 5}
                                x2={rGlassX + 5}
                                y2={rGlassY + Math.min(28, rGlassH * 0.3)}
                                stroke="#ffffff"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeOpacity="0.65"
                              />
                              {/* Georgian / Dorgen Bar on Right Leaf Glass */}
                              {renderGeorgianBarGrid(rGlassX, rGlassY, rGlassW, rGlassH, pocket, frameColorObj?.hex)}
                            </g>

                            {/* --- 3. CENTER MEETING ZONE / FALSE MULLION (बीच का सैश प्रोफाइल / फॉल्स मुल्लियन) --- */}
                            <g id={`french-center-mullion-${pocket.id}`}>
                              {/* False Mullion Profile Extrusion Body */}
                              <rect
                                x={midX - fmW / 2}
                                y={pY}
                                width={fmW}
                                height={pocket.height}
                                fill={sashFill}
                                stroke="#0f172a"
                                strokeWidth="1.8"
                              />
                              {/* Architectural Chamfer / Highlight Lines */}
                              <line
                                x1={midX - fmW / 2 + 2.5}
                                y1={pY}
                                x2={midX - fmW / 2 + 2.5}
                                y2={pY + pocket.height}
                                stroke="#94a3b8"
                                strokeWidth="1"
                              />
                              <line
                                x1={midX + fmW / 2 - 2.5}
                                y1={pY}
                                x2={midX + fmW / 2 - 2.5}
                                y2={pY + pocket.height}
                                stroke="#94a3b8"
                                strokeWidth="1"
                              />
                              {/* Top & Bottom End Caps */}
                              <rect
                                x={midX - fmW / 2 - 1.5}
                                y={pY}
                                width={fmW + 3}
                                height="9"
                                fill="#334155"
                                stroke="#0f172a"
                                strokeWidth="1"
                                rx="1.5"
                              />
                              <rect
                                x={midX - fmW / 2 - 1.5}
                                y={pY + pocket.height - 9}
                                width={fmW + 3}
                                height="9"
                                fill="#334155"
                                stroke="#0f172a"
                                strokeWidth="1"
                                rx="1.5"
                              />
                              {/* Center Split Seam */}
                              <line
                                x1={midX}
                                y1={pY + 9}
                                x2={midX}
                                y2={pY + pocket.height - 9}
                                stroke="#0f172a"
                                strokeWidth="2.2"
                              />
                            </g>
                          </g>
                        );
                      }

                      return (
                        <g id={`pocket-detail-${pocket.id}`}>
                          {/* 1. Openable / Sliding Sash 4-Sided Profile Body with Architectural Miters */}
                          {isSash && sashFaceW > 0 && (
                            <g id={`sash-body-${pocket.id}`}>
                              {/* S2 Drop Shadow cast onto S1 (Left neighbor) */}
                              {isFrontTrack && hasLeftSlider && (
                                <g pointerEvents="none">
                                  <rect
                                    x={actualSashX - 16}
                                    y={pY}
                                    width="16"
                                    height={pocket.height}
                                    fill="url(#sashOverlapShadowGrad)"
                                  />
                                </g>
                              )}

                              {/* Outer Sash Profile 4-Sided Box (Solid uPVC/Aluminium Profile) */}
                              <rect
                                x={actualSashX}
                                y={pY}
                                width={actualSashW}
                                height={pocket.height}
                                fill={
                                  isFrontTrack
                                    ? '#ffffff'
                                    : isBackTrack
                                    ? '#f8fafc'
                                    : frameColorObj?.hex || '#ffffff'
                                }
                                stroke={isPocketSelected ? '#0284c7' : '#0f172a'}
                                strokeWidth={isPocketSelected ? 2.5 : isFrontTrack ? 2.2 : 1.6}
                              />

                              {/* Sash 45-degree Miter Cut Corner Lines at 4 corners */}
                              <line x1={actualSashX} y1={pY} x2={actualSashX + leftSashOffset} y2={pY + sashFaceW} stroke="#334155" strokeWidth="1.4" />
                              <line x1={actualSashX + actualSashW} y1={pY} x2={actualSashX + actualSashW - rightSashOffset} y2={pY + sashFaceW} stroke="#334155" strokeWidth="1.4" />
                              <line x1={actualSashX} y1={pY + pocket.height} x2={actualSashX + leftSashOffset} y2={pY + pocket.height - sashFaceW} stroke="#334155" strokeWidth="1.4" />
                              <line x1={actualSashX + actualSashW} y1={pY + pocket.height} x2={actualSashX + actualSashW - rightSashOffset} y2={pY + pocket.height - sashFaceW} stroke="#334155" strokeWidth="1.4" />

                              {/* Sash Inner Step Outline */}
                              <rect
                                x={actualSashX + leftSashOffset}
                                y={pY + sashFaceW}
                                width={actualSashW - (leftSashOffset + rightSashOffset)}
                                height={pocket.height - 2 * sashFaceW}
                                fill={isBackTrack ? '#f1f5f9' : '#ffffff'}
                                stroke="#334155"
                                strokeWidth="1.2"
                              />

                              {/* S2 Front Elevation Interlock Meeting Stile Accents & 2.5D Highlights */}
                              {isFrontTrack && hasLeftSlider && (
                                <g pointerEvents="none">
                                  {/* Left edge 2.5D elevated highlight line */}
                                  <line
                                    x1={actualSashX}
                                    y1={pY}
                                    x2={actualSashX}
                                    y2={pY + pocket.height}
                                    stroke="#38bdf8"
                                    strokeWidth="2.2"
                                    strokeOpacity="0.95"
                                  />
                                  <line
                                    x1={actualSashX + 1.2}
                                    y1={pY}
                                    x2={actualSashX + 1.2}
                                    y2={pY + pocket.height}
                                    stroke="#ffffff"
                                    strokeWidth="1.2"
                                  />
                                  {/* Top bright highlight line */}
                                  <line
                                    x1={actualSashX}
                                    y1={pY}
                                    x2={actualSashX + actualSashW}
                                    y2={pY}
                                    stroke="#ffffff"
                                    strokeWidth="1.6"
                                  />
                                </g>
                              )}

                              {/* S1 Back Track Recess Shadow on Right Meeting Edge (slides behind S2) */}
                              {isBackTrack && hasRightSlider && (
                                <rect
                                  x={actualSashX + actualSashW - 16}
                                  y={pY}
                                  width="16"
                                  height={pocket.height}
                                  fill="#0f172a"
                                  fillOpacity="0.18"
                                  pointerEvents="none"
                                />
                              )}
                            </g>
                          )}

                          {/* 2. Glazing Beading Profile (Beding Line - 45° Mitered Beads) */}
                          <g id={`beading-lines-${pocket.id}`}>
                            <rect
                              x={actualSashX + leftSashOffset}
                              y={pY + sashFaceW}
                              width={actualSashW - (leftSashOffset + rightSashOffset)}
                              height={pocket.height - 2 * sashFaceW}
                              fill={isBackTrack ? '#e2e8f0' : frameColorObj?.innerShade || '#f8fafc'}
                              stroke="#1e293b"
                              strokeWidth="1.2"
                            />

                            {/* Beading 45° Miter Lines at 4 corners */}
                            <line
                              x1={actualSashX + leftSashOffset}
                              y1={pY + sashFaceW}
                              x2={glassX}
                              y2={glassY}
                              stroke="#475569"
                              strokeWidth="1"
                            />
                            <line
                              x1={actualSashX + actualSashW - rightSashOffset}
                              y1={pY + sashFaceW}
                              x2={glassX + glassW}
                              y2={glassY}
                              stroke="#475569"
                              strokeWidth="1"
                            />
                            <line
                              x1={actualSashX + leftSashOffset}
                              y1={pY + pocket.height - sashFaceW}
                              x2={glassX}
                              y2={glassY + glassH}
                              stroke="#475569"
                              strokeWidth="1"
                            />
                            <line
                              x1={actualSashX + actualSashW - rightSashOffset}
                              y1={pY + pocket.height - sashFaceW}
                              x2={glassX + glassW}
                              y2={glassY + glassH}
                              stroke="#475569"
                              strokeWidth="1"
                            />
                          </g>

                          {/* 3. Glass Surface / Infill Pane with Rubber Gasket Perimeter */}
                          <rect
                            x={glassX}
                            y={glassY}
                            width={glassW}
                            height={glassH}
                            fill={
                              isMeshSashOnly
                                ? 'url(#flyMeshDiamond)'
                                : isBackTrack
                                ? 'url(#sashBackGlassShade)'
                                : isFrontTrack
                                ? 'url(#sashFrontGlassShade)'
                                : isSlider
                                ? 'url(#slidingGlassGrid)'
                                : 'url(#videoGlassShade)'
                            }
                            stroke={isPocketSelected ? '#0284c7' : '#0f172a'}
                            strokeWidth={isPocketSelected ? 2.2 : 1.4}
                          />

                          {/* Fly Mesh Wire Layer - strictly inside the glass area within glazing beading */}
                          {hasMeshLayer && !isMeshSashOnly && (
                            <rect
                              x={glassX}
                              y={glassY}
                              width={glassW}
                              height={glassH}
                              fill="url(#flyMeshDiamond)"
                              pointerEvents="none"
                            />
                          )}

                          {/* Rubber Gasket Outer Seal Line around Glass / Mesh */}
                          <rect
                            x={glassX + 1}
                            y={glassY + 1}
                            width={Math.max(2, glassW - 2)}
                            height={Math.max(2, glassH - 2)}
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="1"
                            strokeOpacity="0.7"
                          />

                          {/* Glass Reflection Highlight Streak */}
                          {!isMeshSashOnly && (
                            <line
                              x1={glassX + Math.min(36, glassW * 0.25)}
                              y1={glassY + 5}
                              x2={glassX + 5}
                              y2={glassY + Math.min(36, glassH * 0.25)}
                              stroke="#ffffff"
                              strokeWidth={isFrontTrack ? '2.6' : '1.8'}
                              strokeLinecap="round"
                              strokeOpacity={isFrontTrack ? '0.95' : '0.65'}
                            />
                          )}

                          {/* Georgian / Dorgen Bar on Glass Infill Pane */}
                          {renderGeorgianBarGrid(glassX, glassY, glassW, glassH, pocket, frameColorObj?.hex)}
                        </g>
                      );
                    })()}

                    {/* Openable Sash Triangles & Architectural Hardware Handles */}
                    {(pocket.sashType === 'casement_left' ||
                      pocket.sashType === 'casement_right' ||
                      pocket.sashType === 'casement_door_4side' ||
                      pocket.sashType === 'casement_door_3side' ||
                      pocket.sashType === 'casement') && (() => {
                        const isApexLeft = handlePlacement.side === 'left';
                        const apexY = handlePlacement.y;
                        const trianglePoints = isApexLeft
                          ? `${pX + pocket.width - 8},${pY + 8} ${pX + 8},${apexY} ${pX + pocket.width - 8},${pY + pocket.height - 8}`
                          : `${pX + 8},${pY + 8} ${pX + pocket.width - 8},${apexY} ${pX + 8},${pY + pocket.height - 8}`;

                        const fNameLower = (frame.name || '').toLowerCase();
                        const isCasementWin = [
                          'casement',
                          'casement_left',
                          'casement_right',
                          'top_hung',
                          'bottom_hung',
                          'tilt_turn',
                          'french_open',
                        ].includes(pocket.sashType || '');
                        const isWindowFrame = isCasementWin || pocket.applicationType === 'window' || fNameLower.startsWith('w') || fNameLower.includes('window');
                        const isDoorType =
                          !isCasementWin && (
                            pocket.applicationType === 'door' ||
                            pocket.sashType?.includes('door') ||
                            frame.series === 'door_premium' ||
                            fNameLower.includes('door') ||
                            fNameLower.startsWith('d')
                          );

                        const openDir = pocket.openDirection || 'out';
                        const isOpeningIn = openDir === 'in';
                        const ghhVal = Math.round(frame.y + frame.height - handlePlacement.y);

                        return (
                          <g id={`casement-hardware-${pocket.id}`}>
                            {/* Swing Triangle Polygon: Solid if IN, Dashed if OUT */}
                            <polygon
                              points={trianglePoints}
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth="2"
                              strokeDasharray={isOpeningIn ? undefined : "6 4"}
                            />

                            {/* S1 Badge at top edge */}
                            <g transform={`translate(${centerX}, ${pY + 12})`} pointerEvents="none">
                              <rect x="-16" y="-9" width="32" height="18" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                              <text x="0" y="3.5" textAnchor="middle" fill="#0f172a" fontSize="10.5" fontWeight="900" fontFamily="monospace">
                                {`S ${pIdx + 1}`}
                              </text>
                            </g>

                            {/* Circled Pocket Index Badge (1, 2...) */}
                            <g transform={`translate(${centerX}, ${centerY - 16})`} pointerEvents="none">
                              <ellipse cx="0" cy="0" rx="14" ry="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                              <text x="0" y="3.5" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">
                                {pIdx + 1}
                              </text>
                            </g>

                            {/* Interactive OUT / IN Badge (Click to toggle!) */}
                            <g
                              transform={`translate(${centerX}, ${centerY + 16})`}
                              className="cursor-pointer group"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdatePocketPanel) {
                                  onUpdatePocketPanel(frame.id, pocket.id, {
                                    openDirection: isOpeningIn ? 'out' : 'in',
                                  });
                                }
                              }}
                              title="Click to toggle OUT / IN (बाहर / अंदर बदलें)"
                            >
                              <rect
                                x="-26"
                                y="-9"
                                width="52"
                                height="18"
                                rx="2"
                                fill="#ffffff"
                                stroke="#38bdf8"
                                strokeWidth="1.4"
                                className="group-hover:stroke-blue-600 group-hover:fill-sky-50 transition"
                              />
                              <text
                                x="0"
                                y="3.5"
                                textAnchor="middle"
                                fill="#0284c7"
                                fontSize="10.5"
                                fontWeight="900"
                                fontFamily="sans-serif"
                                className="group-hover:fill-blue-700 select-none"
                              >
                                {isOpeningIn ? 'IN' : 'OUT'}
                              </text>
                            </g>

                            {/* Corner Hardware Marker (F1 badge) */}
                            <g transform={`translate(${pX + pocket.width - 14}, ${pY + pocket.height - 10})`} pointerEvents="none">
                              <rect x="-10" y="-8" width="20" height="15" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
                              <text x="0" y="3" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold" fontFamily="monospace">
                                {pocket.cornerCode || 'F1'}
                              </text>
                            </g>

                            {/* Realistic Espag / Door Handle on Opening Stile */}
                            <HardwareHandle
                              x={handlePlacement.x}
                              y={handlePlacement.y}
                              type={
                                pocket.handleType ||
                                (isDoorType ? 'door_lever' : 'casement_espag')
                              }
                              orientation={handlePlacement.orientation}
                              color={pocket.handleColor || 'silver'}
                              title="Casement Handle"
                            />

                            {/* GHH Height Badge beside handle */}
                            <g transform={`translate(${isApexLeft ? handlePlacement.x + 8 : handlePlacement.x - 76}, ${handlePlacement.y - 7})`}>
                              <rect x="0" y="0" width="68" height="15" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
                              <text x="34" y="11" textAnchor="middle" fill="#0f172a" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                                GHH = {ghhVal}
                              </text>
                            </g>
                          </g>
                        );
                      })()}
                          {pocket.sashType === 'top_hung' && (
                            <g id={`top-hung-hardware-${pocket.id}`}>
                              <polygon
                                points={`${pX + 8},${pY + 8} ${centerX},${pY + pocket.height - 8} ${pX + pocket.width - 8},${pY + 8}`}
                                fill="none"
                                stroke="#0284c7"
                                strokeWidth="2"
                                strokeDasharray="6 4"
                              />
                              {/* Cockspur Handle on Bottom Center Rail */}
                              <HardwareHandle
                                x={handlePlacement.x}
                                y={handlePlacement.y}
                                type={pocket.handleType || 'top_bottom_cockspur'}
                                orientation={handlePlacement.orientation}
                                color={pocket.handleColor || 'silver'}
                                title="Top Hung Cockspur Handle"
                              />
                            </g>
                          )}
                          {pocket.sashType === 'bottom_hung' && (
                            <g id={`bottom-hung-hardware-${pocket.id}`}>
                              <polygon
                                points={`${pX + 8},${pY + pocket.height - 8} ${centerX},${pY + 8} ${pX + pocket.width - 8},${pY + pocket.height - 8}`}
                                fill="none"
                                stroke="#0284c7"
                                strokeWidth="2"
                                strokeDasharray="6 4"
                              />
                              {/* Cockspur Handle on Top Center Rail */}
                              <HardwareHandle
                                x={handlePlacement.x}
                                y={handlePlacement.y}
                                type={pocket.handleType || 'top_bottom_cockspur'}
                                orientation={handlePlacement.orientation}
                                color={pocket.handleColor || 'silver'}
                                title="Bottom Hung Hopper Handle"
                              />
                            </g>
                          )}
                          {pocket.sashType === 'french_open' && (
                            <g id={`french-door-hardware-${pocket.id}`}>
                              {/* Left Leaf Swing Triangle pointing to meeting stile handle */}
                              <polygon
                                points={`${pX + 8},${pY + 8} ${centerX - 6},${handlePlacement.y} ${pX + 8},${pY + pocket.height - 8}`}
                                fill="none"
                                stroke="#0284c7"
                                strokeWidth="2"
                                strokeDasharray="6 4"
                              />
                              {/* Right Leaf Swing Triangle pointing to meeting stile handle */}
                              <polygon
                                points={`${pX + pocket.width - 8},${pY + 8} ${centerX + 6},${handlePlacement.y} ${pX + pocket.width - 8},${pY + pocket.height - 8}`}
                                fill="none"
                                stroke="#0284c7"
                                strokeWidth="2"
                                strokeDasharray="6 4"
                              />
                              {/* Left & Right Door Handles Facing Center */}
                              <HardwareHandle
                                x={centerX - 18}
                                y={handlePlacement.y}
                                type={pocket.handleType || (pocket.height >= 1600 || frame.series === 'door_premium' || frame.name.toLowerCase().includes('door') ? 'door_lever' : 'casement_espag')}
                                orientation="left"
                                color={pocket.handleColor || 'silver'}
                                title="Left Door Master Handle"
                              />
                              <HardwareHandle
                                x={centerX + 18}
                                y={handlePlacement.y}
                                type={pocket.handleType || (pocket.height >= 1600 || frame.series === 'door_premium' || frame.name.toLowerCase().includes('door') ? 'door_lever' : 'casement_espag')}
                                orientation="right"
                                color={pocket.handleColor || 'silver'}
                                title="Right Door Slave Handle"
                              />
                            </g>
                          )}
                          {pocket.sashType === 'tilt_turn' && (() => {
                            const isApexLeft = handlePlacement.side === 'left';
                            const sideSwingPoints = isApexLeft
                              ? `${pX + pocket.width - 8},${pY + 8} ${pX + 8},${centerY} ${pX + pocket.width - 8},${pY + pocket.height - 8}`
                              : `${pX + 8},${pY + 8} ${pX + pocket.width - 8},${centerY} ${pX + 8},${pY + pocket.height - 8}`;
                            return (
                              <g id={`tilt-turn-hardware-${pocket.id}`}>
                                <polygon
                                  points={sideSwingPoints}
                                  fill="none"
                                  stroke="#0284c7"
                                  strokeWidth="2"
                                  strokeDasharray="6 4"
                                />
                                <polygon
                                  points={`${pX + 8},${pY + pocket.height - 8} ${centerX},${pY + 8} ${pX + pocket.width - 8},${pY + pocket.height - 8}`}
                                  fill="none"
                                  stroke="#0284c7"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 3"
                                />
                                <HardwareHandle
                                  x={handlePlacement.x}
                                  y={handlePlacement.y}
                                  type={pocket.handleType || 'casement_espag'}
                                  orientation={handlePlacement.orientation}
                                  color={pocket.handleColor || 'silver'}
                                  title="Tilt & Turn Espag Handle"
                                />
                              </g>
                            );
                          })()}

                          {/* Individual Sliding Sash Directions (matching factory technical drawings) */}
                          {effectiveSashType === 'slider_arrow_right' && (() => {
                            const arrowHalfL = Math.max(48, Math.min(pocket.width * 0.24, 110));
                            const arrowHeadL = Math.max(22, Math.min(42, arrowHalfL * 0.42));
                            const arrowHeadH = Math.max(12, Math.min(22, arrowHalfL * 0.22));
                            const arrowStroke = Math.max(3.8, Math.min(6.5, pocket.width * 0.008));
                            const hasMesh = pocket.hasMesh || hasMeshLayer;
                            const circleR = Math.max(15, Math.min(22, pocket.width * 0.035));
                            const circleFont = Math.max(14, Math.min(20, pocket.width * 0.032));
                            const glassArrowY = hasMesh ? centerY - 14 : centerY + 8;
                            const circleY = hasMesh
                              ? glassArrowY - circleR - 16
                              : centerY - Math.max(22, Math.min(34, arrowHeadH * 2));
                            const meshArrowY = centerY + 18;
                            const meshCircleY = meshArrowY + circleR + 16;
                            const meshHalfL = Math.max(42, Math.min(pocket.width * 0.20, 95));
                            const meshHeadL = Math.max(18, Math.min(36, meshHalfL * 0.42));
                            const meshHeadH = Math.max(10, Math.min(18, meshHalfL * 0.20));
                            const meshStroke = Math.max(3.2, Math.min(5.2, pocket.width * 0.007));

                            return (
                              <g
                                id={`slider-arrow-right-${pocket.id}`}
                                className="cursor-pointer group/slider-arrow hover:opacity-80 transition-opacity"
                                title="क्लिक करके एरो दिशा बदलें (Click to cycle arrow: ↔ / → / ← / +)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPocket(pocket.id);
                                  onSelectFrame(frame.id);
                                  onUpdatePocketSash(frame.id, pocket.id, 'slider_arrow_left');
                                }}
                              >
                                {/* Glass Center Circled Bay Number */}
                                <g transform={`translate(${centerX}, ${circleY})`}>
                                  <circle r={circleR} fill="#ffffff" stroke="#0f172a" strokeWidth="2.2" />
                                  <text
                                    x="0"
                                    y={circleFont * 0.35}
                                    fill="#0f172a"
                                    fontSize={circleFont}
                                    fontWeight="900"
                                    fontFamily="sans-serif"
                                    textAnchor="middle"
                                  >
                                    {bayNumber}
                                  </text>
                                </g>

                                {/* Slide Right Arrow (Glass) */}
                                <g transform={`translate(${centerX}, ${glassArrowY})`}>
                                  <line x1={-arrowHalfL} y1="0" x2={arrowHalfL} y2="0" stroke="#0f172a" strokeWidth={arrowStroke} strokeLinecap="round" />
                                  <polygon points={`${arrowHalfL - arrowHeadL},${-arrowHeadH} ${arrowHalfL},0 ${arrowHalfL - arrowHeadL},${arrowHeadH}`} fill="#0f172a" />
                                </g>

                                {/* If Fly Mesh is present, also render Mesh Slide Arrow in Green with Circle 3 Badge below */}
                                {hasMesh && (
                                  <>
                                    <g transform={`translate(${centerX}, ${meshArrowY})`}>
                                      <line x1={-meshHalfL} y1="0" x2={meshHalfL} y2="0" stroke="#059669" strokeWidth={meshStroke} strokeLinecap="round" />
                                      <polygon points={`${meshHalfL - meshHeadL},${-meshHeadH} ${meshHalfL},0 ${meshHalfL - meshHeadL},${meshHeadH}`} fill="#059669" />
                                    </g>
                                    <g transform={`translate(${centerX}, ${meshCircleY})`}>
                                      <circle r={circleR} fill="#ffffff" stroke="#059669" strokeWidth="2.2" />
                                      <text
                                        x="0"
                                        y={circleFont * 0.35}
                                        fill="#059669"
                                        fontSize={circleFont}
                                        fontWeight="900"
                                        fontFamily="sans-serif"
                                        textAnchor="middle"
                                      >
                                        {meshPanelNumber}
                                      </text>
                                    </g>
                                  </>
                                )}

                                {/* Outer Touch-Lock / Lever Handle */}
                                {isHandleVisible && (
                                  <>
                                    <HardwareHandle
                                      x={handlePlacement.x}
                                      y={handlePlacement.y}
                                      type={pocket.handleType || 'sliding_flush'}
                                      orientation={handlePlacement.orientation}
                                      color={pocket.handleColor || 'silver'}
                                      title="Sliding Handle"
                                    />
                                    {pocket.handleHeight && (
                                      <g transform={`translate(${handlePlacement.x > centerX ? pX + pocket.width - 88 : pX + 12}, ${handlePlacement.y + 24})`}>
                                        <rect
                                          x="0"
                                          y="-10"
                                          width="76"
                                          height="20"
                                          rx="2"
                                          fill="#ffffff"
                                          stroke="#0f172a"
                                          strokeWidth="1.4"
                                          className="filter drop-shadow-xs"
                                        />
                                        <text
                                          x="38"
                                          y="4.5"
                                          fill="#0f172a"
                                          fontSize="10.5"
                                          fontWeight="900"
                                          fontFamily="sans-serif"
                                          textAnchor="middle"
                                        >
                                          GHH = {ghhValue}
                                        </text>
                                      </g>
                                    )}
                                  </>
                                )}
                              </g>
                            );
                          })()}

                          {effectiveSashType === 'slider_arrow_left' && (() => {
                            const arrowHalfL = Math.max(48, Math.min(pocket.width * 0.24, 110));
                            const arrowHeadL = Math.max(22, Math.min(42, arrowHalfL * 0.42));
                            const arrowHeadH = Math.max(12, Math.min(22, arrowHalfL * 0.22));
                            const arrowStroke = Math.max(3.8, Math.min(6.5, pocket.width * 0.008));
                            const hasMesh = pocket.hasMesh || hasMeshLayer;
                            const circleR = Math.max(15, Math.min(22, pocket.width * 0.035));
                            const circleFont = Math.max(14, Math.min(20, pocket.width * 0.032));
                            const glassArrowY = hasMesh ? centerY - 14 : centerY + 8;
                            const circleY = hasMesh
                              ? glassArrowY - circleR - 16
                              : centerY - Math.max(22, Math.min(34, arrowHeadH * 2));
                            const meshArrowY = centerY + 18;
                            const meshCircleY = meshArrowY + circleR + 16;
                            const meshHalfL = Math.max(42, Math.min(pocket.width * 0.20, 95));
                            const meshHeadL = Math.max(18, Math.min(36, meshHalfL * 0.42));
                            const meshHeadH = Math.max(10, Math.min(18, meshHalfL * 0.20));
                            const meshStroke = Math.max(3.2, Math.min(5.2, pocket.width * 0.007));

                            return (
                              <g
                                id={`slider-arrow-left-${pocket.id}`}
                                className="cursor-pointer group/slider-arrow hover:opacity-80 transition-opacity"
                                title="क्लिक करके एरो दिशा बदलें (Click to cycle arrow: ↔ / → / ← / +)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPocket(pocket.id);
                                  onSelectFrame(frame.id);
                                  onUpdatePocketSash(frame.id, pocket.id, 'slider_fixed_center');
                                }}
                              >
                                {/* Glass Center Circled Bay Number */}
                                <g transform={`translate(${centerX}, ${circleY})`}>
                                  <circle r={circleR} fill="#ffffff" stroke="#0f172a" strokeWidth="2.2" />
                                  <text
                                    x="0"
                                    y={circleFont * 0.35}
                                    fill="#0f172a"
                                    fontSize={circleFont}
                                    fontWeight="900"
                                    fontFamily="sans-serif"
                                    textAnchor="middle"
                                  >
                                    {bayNumber}
                                  </text>
                                </g>

                                {/* Slide Left Arrow (Glass) */}
                                <g transform={`translate(${centerX}, ${glassArrowY})`}>
                                  <line x1={arrowHalfL} y1="0" x2={-arrowHalfL} y2="0" stroke="#0f172a" strokeWidth={arrowStroke} strokeLinecap="round" />
                                  <polygon points={`${-arrowHalfL + arrowHeadL},${-arrowHeadH} ${-arrowHalfL},0 ${-arrowHalfL + arrowHeadL},${arrowHeadH}`} fill="#0f172a" />
                                </g>

                                {/* If Fly Mesh is present, also render Mesh Slide Arrow in Green with Circle 3 Badge below */}
                                {hasMesh && (
                                  <>
                                    <g transform={`translate(${centerX}, ${meshArrowY})`}>
                                      <line x1={meshHalfL} y1="0" x2={-meshHalfL} y2="0" stroke="#059669" strokeWidth={meshStroke} strokeLinecap="round" />
                                      <polygon points={`${-meshHalfL + meshHeadL},${-meshHeadH} ${-meshHalfL},0 ${-meshHalfL + meshHeadL},${meshHeadH}`} fill="#059669" />
                                    </g>
                                    <g transform={`translate(${centerX}, ${meshCircleY})`}>
                                      <circle r={circleR} fill="#ffffff" stroke="#059669" strokeWidth="2.2" />
                                      <text
                                        x="0"
                                        y={circleFont * 0.35}
                                        fill="#059669"
                                        fontSize={circleFont}
                                        fontWeight="900"
                                        fontFamily="sans-serif"
                                        textAnchor="middle"
                                      >
                                        {meshPanelNumber}
                                      </text>
                                    </g>
                                  </>
                                )}

                                {/* Outer Touch-Lock / Lever Handle */}
                                {isHandleVisible && (
                                  <>
                                    <HardwareHandle
                                      x={handlePlacement.x}
                                      y={handlePlacement.y}
                                      type={pocket.handleType || 'sliding_flush'}
                                      orientation={handlePlacement.orientation}
                                      color={pocket.handleColor || 'silver'}
                                      title="Sliding Handle"
                                    />
                                    {pocket.handleHeight && (
                                      <g transform={`translate(${handlePlacement.x > centerX ? pX + pocket.width - 88 : pX + 12}, ${handlePlacement.y + 24})`}>
                                        <rect
                                          x="0"
                                          y="-10"
                                          width="76"
                                          height="20"
                                          rx="2"
                                          fill="#ffffff"
                                          stroke="#0f172a"
                                          strokeWidth="1.4"
                                          className="filter drop-shadow-xs"
                                        />
                                        <text
                                          x="38"
                                          y="4.5"
                                          fill="#0f172a"
                                          fontSize="10.5"
                                          fontWeight="900"
                                          fontFamily="sans-serif"
                                          textAnchor="middle"
                                        >
                                          GHH = {ghhValue}
                                        </text>
                                      </g>
                                    )}
                                  </>
                                )}
                              </g>
                            );
                          })()}

                    {effectiveSashType === 'slider_arrow_both' && (() => {
                      const arrowHalfL = Math.max(48, Math.min(pocket.width * 0.24, 110));
                      const arrowHeadL = Math.max(22, Math.min(42, arrowHalfL * 0.42));
                      const arrowHeadH = Math.max(12, Math.min(22, arrowHalfL * 0.22));
                      const arrowStroke = Math.max(3.8, Math.min(6.5, pocket.width * 0.008));
                      const hasMesh = pocket.hasMesh || hasMeshLayer;
                      const circleR = Math.max(15, Math.min(22, pocket.width * 0.035));
                      const circleFont = Math.max(14, Math.min(20, pocket.width * 0.032));
                      const glassArrowY = hasMesh ? centerY - 14 : centerY + 8;
                      const circleY = hasMesh
                        ? glassArrowY - circleR - 16
                        : centerY - Math.max(22, Math.min(34, arrowHeadH * 2));
                      const meshArrowY = centerY + 18;
                      const meshCircleY = meshArrowY + circleR + 16;
                      const meshHalfL = Math.max(42, Math.min(pocket.width * 0.20, 95));
                      const meshHeadL = Math.max(18, Math.min(36, meshHalfL * 0.42));
                      const meshHeadH = Math.max(10, Math.min(18, meshHalfL * 0.20));
                      const meshStroke = Math.max(3.2, Math.min(5.2, pocket.width * 0.007));

                      return (
                        <g
                          id={`slider-arrow-both-${pocket.id}`}
                          className="cursor-pointer group/slider-arrow hover:opacity-80 transition-opacity"
                          title="क्लिक करके एरो दिशा बदलें (Click to cycle arrow: ↔ / → / ← / +)"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPocket(pocket.id);
                            onSelectFrame(frame.id);
                            onUpdatePocketSash(frame.id, pocket.id, 'slider_arrow_right');
                          }}
                        >
                          {/* Glass Center Circled Bay Number */}
                          <g transform={`translate(${centerX}, ${circleY})`}>
                            <circle r={circleR} fill="#ffffff" stroke="#0f172a" strokeWidth="2.2" />
                            <text
                              x="0"
                              y={circleFont * 0.35}
                              fill="#0f172a"
                              fontSize={circleFont}
                              fontWeight="900"
                              fontFamily="sans-serif"
                              textAnchor="middle"
                            >
                              {bayNumber}
                            </text>
                          </g>

                          {/* Bi-directional Slide Arrow */}
                          <g transform={`translate(${centerX}, ${glassArrowY})`}>
                            <line x1={-arrowHalfL} y1="0" x2={arrowHalfL} y2="0" stroke="#0f172a" strokeWidth={arrowStroke} strokeLinecap="round" />
                            <polygon points={`${-arrowHalfL + arrowHeadL},${-arrowHeadH} ${-arrowHalfL},0 ${-arrowHalfL + arrowHeadL},${arrowHeadH}`} fill="#0f172a" />
                            <polygon points={`${arrowHalfL - arrowHeadL},${-arrowHeadH} ${arrowHalfL},0 ${arrowHalfL - arrowHeadL},${arrowHeadH}`} fill="#0f172a" />
                          </g>

                          {/* If Fly Mesh is present, also render Mesh Slide Arrow in Green with Circle 3 Badge below */}
                          {hasMesh && (
                            <>
                              <g transform={`translate(${centerX}, ${meshArrowY})`}>
                                <line x1={-meshHalfL} y1="0" x2={meshHalfL} y2="0" stroke="#059669" strokeWidth={meshStroke} strokeLinecap="round" />
                                <polygon points={`${meshHalfL - meshHeadL},${-meshHeadH} ${meshHalfL},0 ${meshHalfL - meshHeadL},${meshHeadH}`} fill="#059669" />
                              </g>
                              <g transform={`translate(${centerX}, ${meshCircleY})`}>
                                <circle r={circleR} fill="#ffffff" stroke="#059669" strokeWidth="2.2" />
                                <text
                                  x="0"
                                  y={circleFont * 0.35}
                                  fill="#059669"
                                  fontSize={circleFont}
                                  fontWeight="900"
                                  fontFamily="sans-serif"
                                  textAnchor="middle"
                                >
                                  {meshPanelNumber}
                                </text>
                              </g>
                            </>
                          )}

                          {/* Outer Touch-Lock Handle & GHH Badge */}
                          {isHandleVisible && (
                            <>
                              <HardwareHandle
                                x={handlePlacement.x}
                                y={handlePlacement.y}
                                type={pocket.handleType || 'sliding_flush'}
                                orientation={handlePlacement.orientation}
                                color={pocket.handleColor || 'silver'}
                                title="Sliding Flush Handle"
                              />
                              {pocket.handleHeight && (
                                <g transform={`translate(${handlePlacement.x > centerX ? pX + pocket.width - 88 : pX + 12}, ${handlePlacement.y + 24})`}>
                                  <rect
                                    x="0"
                                    y="-10"
                                    width="76"
                                    height="20"
                                    rx="2"
                                    fill="#ffffff"
                                    stroke="#0f172a"
                                    strokeWidth="1.4"
                                  />
                                  <text
                                    x="38"
                                    y="4.5"
                                    fill="#0f172a"
                                    fontSize="10.5"
                                    fontWeight="900"
                                    fontFamily="sans-serif"
                                    textAnchor="middle"
                                  >
                                    GHH = {ghhValue}
                                  </text>
                                </g>
                              )}
                            </>
                          )}
                        </g>
                      );
                    })()}

                    {effectiveSashType === 'slider_fixed_center' && (
                      <g
                        id={`slider-fixed-center-${pocket.id}`}
                        className="cursor-pointer group/slider-arrow hover:opacity-80 transition-opacity"
                        title="फिक्स पैनल (Fixed Glass Panel) - No Slide"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPocket(pocket.id);
                          onSelectFrame(frame.id);
                        }}
                      >
                        {/* Glass Center FIX Label */}
                        <g transform={`translate(${centerX}, ${centerY - 18})`}>
                          <rect x="-26" y="-12" width="52" height="24" rx="4" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" className="shadow-xs" />
                          <text
                            x="0"
                            y="4.5"
                            fill="#0f172a"
                            fontSize="11"
                            fontWeight="900"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                          >
                            {pocket.customLabel || 'FIX'}
                          </text>
                        </g>
                        {/* Fixed Panel (+) Indicator and Glass Marks (//) */}
                        <g transform={`translate(${centerX}, ${centerY + 14})`}>
                          <circle r="12" fill="#ffffff" stroke="#475569" strokeWidth="1.8" />
                          <line x1="-6" y1="0" x2="6" y2="0" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                          <line x1="0" y1="-6" x2="0" y2="6" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                        </g>
                      </g>
                    )}

                    {/* Mosquito Fly Mesh Sash with Slide Direction Arrow (MS1) */}
                    {(pocket.sashType === 'mesh_sash' ||
                      pocket.sashType === 'mesh_slider_right' ||
                      pocket.sashType === 'mesh_slider_left' ||
                      pocket.sashType === 'slider_3t_2p_mesh' ||
                      pocket.sashType === 'slider_2s_with_mesh' ||
                      pocket.sashType === 'slider_3s_mesh') && (
                      <g
                        id={`mesh-sash-hardware-${pocket.id}`}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPocket(pocket.id, 'mesh');
                          onSelectFrame(frame.id);
                          onSelectMullion(null);
                          onSelectCoupling(null);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (onOpenPocketCustomizer) {
                            onOpenPocketCustomizer(frame.id, pocket.id, 'mesh');
                          }
                        }}
                      >
                        {/* Top Identification Tag [MS1] */}
                        <g transform={`translate(${centerX}, ${pY + 18})`}>
                          <rect
                            x="-34"
                            y="-10"
                            width="68"
                            height="20"
                            rx="3"
                            fill="#ecfdf5"
                            stroke="#059669"
                            strokeWidth="1.8"
                          />
                          <text
                            x="0"
                            y="4.5"
                            fill="#065f46"
                            fontSize="11"
                            fontWeight="900"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                          >
                            {pocket.customLabel || 'MS1 (Mesh)'}
                          </text>
                        </g>

                        {/* Center Circle Letter Indicator (M) */}
                        <g transform={`translate(${centerX}, ${centerY - 14})`}>
                          <circle r="14" fill="#ecfdf5" stroke="#059669" strokeWidth="2" />
                          <text
                            x="0"
                            y="5"
                            fill="#065f46"
                            fontSize="13"
                            fontWeight="900"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                          >
                            M
                          </text>
                        </g>

                        {/* Slide Direction Arrow for Mesh Sash */}
                        {(() => {
                          const mHalfL = Math.max(48, Math.min(pocket.width * 0.22, 105));
                          const mHeadL = Math.max(22, Math.min(40, mHalfL * 0.42));
                          const mHeadH = Math.max(12, Math.min(20, mHalfL * 0.20));
                          const mStroke = Math.max(3.6, Math.min(6, pocket.width * 0.007));
                          return (
                            <g transform={`translate(${centerX}, ${centerY + 22})`}>
                              {pocket.sashType === 'mesh_slider_left' ? (
                                <>
                                  <line x1={mHalfL} y1="0" x2={-mHalfL} y2="0" stroke="#059669" strokeWidth={mStroke} strokeLinecap="round" />
                                  <polygon points={`${-mHalfL + mHeadL},${-mHeadH} ${-mHalfL},0 ${-mHalfL + mHeadL},${mHeadH}`} fill="#059669" />
                                </>
                              ) : (
                                <>
                                  <line x1={-mHalfL} y1="0" x2={mHalfL} y2="0" stroke="#059669" strokeWidth={mStroke} strokeLinecap="round" />
                                  <polygon points={`${mHalfL - mHeadL},${-mHeadH} ${mHalfL},0 ${mHalfL - mHeadL},${mHeadH}`} fill="#059669" />
                                </>
                              )}
                            </g>
                          );
                        })()}

                        {/* Mesh Sash Flush Pull Handle */}
                        <HardwareHandle
                          x={pocket.sashType === 'mesh_slider_left' ? pX + pocket.width - 12 : pX + 12}
                          y={centerY}
                          type={pocket.handleType || 'sliding_flush'}
                          orientation={pocket.sashType === 'mesh_slider_left' ? 'right' : 'left'}
                          color={pocket.handleColor || 'silver'}
                          title="Mesh Pull Handle"
                        />
                        <g transform={`translate(${pocket.sashType === 'mesh_slider_left' ? pX + pocket.width - 88 : pX + 12}, ${centerY + 24})`}>
                          <rect
                            x="0"
                            y="-10"
                            width="76"
                            height="20"
                            rx="2"
                            fill="#ffffff"
                            stroke="#059669"
                            strokeWidth="1.4"
                          />
                          <text
                            x="38"
                            y="4.5"
                            fill="#065f46"
                            fontSize="10.5"
                            fontWeight="900"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                          >
                            GHH = {ghhValue}
                          </text>
                        </g>
                      </g>
                    )}

                    {/* 2-Track Slider (Single Pocket 2-Sash Layout with 2.5D S1/S2 Depth & Slim Seamless Overlap) */}
                    {(pocket.sashType === 'slider_2s' || pocket.sashType === 'slider_2s_xo') && (
                      <g id={`slider-2s-hardware-${pocket.id}`}>
                        {/* 1. S1 Left Panel (Recessed Background Track - Halka Piche, slips behind S2) */}
                        <g id={`slider-s1-back-${pocket.id}`}>
                          <rect
                            x={pX}
                            y={pY}
                            width={pocket.width * 0.5 + 10}
                            height={pocket.height}
                            fill="#e2e8f0"
                            stroke="#0f172a"
                            strokeWidth="1.6"
                          />
                          <rect
                            x={pX + 22}
                            y={pY + 22}
                            width={Math.max(10, pocket.width * 0.5 + 10 - 32)}
                            height={Math.max(10, pocket.height - 44)}
                            fill="url(#sashBackGlassShade)"
                            stroke="#1e293b"
                            strokeWidth="1.2"
                          />
                          {/* S1 45-deg miters on outer corners */}
                          <line x1={pX} y1={pY} x2={pX + 22} y2={pY + 22} stroke="#334155" strokeWidth="1.2" />
                          <line x1={pX} y1={pY + pocket.height} x2={pX + 22} y2={pY + pocket.height - 22} stroke="#334155" strokeWidth="1.2" />
                        </g>

                        {/* 2. S2 Right Panel (Foreground Elevated Track - Halka Uper with Overlap Drop Shadow onto S1) */}
                        <g id={`slider-s2-front-${pocket.id}`}>
                          {/* S2 Elevation Drop Shadow cast to the left onto S1 */}
                          <rect
                            x={centerX - 12}
                            y={pY}
                            width="10"
                            height={pocket.height}
                            fill="#0f172a"
                            fillOpacity="0.3"
                          />
                          <rect
                            x={centerX - 2}
                            y={pY}
                            width={pocket.width * 0.5 + 2}
                            height={pocket.height}
                            fill="#ffffff"
                            stroke="#0f172a"
                            strokeWidth="2.2"
                          />
                          {/* S2 elevated left edge 2.5D highlight line */}
                          <line
                            x1={centerX - 2}
                            y1={pY}
                            x2={centerX - 2}
                            y2={pY + pocket.height}
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeOpacity="0.95"
                          />
                          <line
                            x1={centerX - 0.8}
                            y1={pY}
                            x2={centerX - 0.8}
                            y2={pY + pocket.height}
                            stroke="#ffffff"
                            strokeWidth="1.2"
                          />
                          {/* S2 Glass pane starts right next to slim 12mm interlock */}
                          <rect
                            x={centerX + 12}
                            y={pY + 22}
                            width={Math.max(10, pocket.width * 0.5 + 2 - 34)}
                            height={Math.max(10, pocket.height - 44)}
                            fill="url(#sashFrontGlassShade)"
                            stroke="#0f172a"
                            strokeWidth="1.4"
                          />
                          {/* S2 45-deg miters on outer corners */}
                          <line x1={pX + pocket.width} y1={pY} x2={pX + pocket.width - 22} y2={pY + 22} stroke="#334155" strokeWidth="1.2" />
                          <line x1={pX + pocket.width} y1={pY + pocket.height} x2={pX + pocket.width - 22} y2={pY + pocket.height - 22} stroke="#334155" strokeWidth="1.2" />
                          {/* Glossy reflection on S2 glass */}
                          <line
                            x1={centerX + 26}
                            y1={pY + 28}
                            x2={centerX + 16}
                            y2={pY + 46}
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </g>
                        
                        {/* S1 Left Sash Badges & Controls */}
                        <g transform={`translate(${pX + pocket.width * 0.25 - 4}, ${pY + 16})`}>
                          <rect x="-20" y="-10" width="40" height="20" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.6" />
                          <text x="0" y="4.5" fill="#0f172a" fontSize="12" fontWeight="900" textAnchor="middle">S1 (Back)</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.25 - 4}, ${centerY - 16})`}>
                          <circle r="16" fill="#ffffff" stroke="#0f172a" strokeWidth="2.2" />
                          <text x="0" y="5.5" fill="#0f172a" fontSize="15" fontWeight="900" textAnchor="middle">1</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.25 - 4}, ${centerY + 18})`}>
                          {(() => {
                            const pHalfL = Math.max(38, Math.min(pocket.width * 0.12, 75));
                            const pHeadL = Math.max(16, Math.min(30, pHalfL * 0.42));
                            const pHeadH = Math.max(9, Math.min(16, pHalfL * 0.22));
                            const pStroke = Math.max(3.4, Math.min(5.2, pocket.width * 0.005));
                            return (
                              <>
                                <line x1={-pHalfL} y1="0" x2={pHalfL} y2="0" stroke="#0f172a" strokeWidth={pStroke} strokeLinecap="round" />
                                <polygon points={`${pHalfL - pHeadL},${-pHeadH} ${pHalfL},0 ${pHalfL - pHeadL},${pHeadH}`} fill="#0f172a" />
                              </>
                            );
                          })()}
                        </g>
                        <HardwareHandle
                          x={pX + 14}
                          y={handlePlacement.y}
                          type={pocket.handleType || 'sliding_flush'}
                          orientation="right"
                          color={pocket.handleColor || 'silver'}
                        />
                        {pocket.handleHeight && (
                          <g transform={`translate(${pX + 12}, ${handlePlacement.y + 24})`}>
                            <rect x="0" y="-10" width="76" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
                            <text x="38" y="4.5" fill="#0f172a" fontSize="10.5" fontWeight="900" textAnchor="middle">GHH = {ghhValue}</text>
                          </g>
                        )}

                        {/* S2 Right Sash Badges & Controls (Fixed) */}
                        <g transform={`translate(${pX + pocket.width * 0.75 + 4}, ${pY + 16})`}>
                          <rect x="-20" y="-10" width="40" height="20" rx="3" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                          <text x="0" y="4.5" fill="#0284c7" fontSize="12" fontWeight="900" textAnchor="middle">S2 (Front)</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.75 + 4}, ${centerY})`}>
                          <circle r="13" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
                          <line x1="-6" y1="0" x2="6" y2="0" stroke="#0f172a" strokeWidth="2" />
                          <line x1="0" y1="-6" x2="0" y2="6" stroke="#0f172a" strokeWidth="2" />
                        </g>
                      </g>
                    )}

                    {pocket.sashType === 'slider_2s_ox' && (
                      <g id={`slider-2s-ox-hardware-${pocket.id}`}>
                        {/* 1. S1 Left Panel (Recessed Background Track - Fixed) */}
                        <g id={`slider-s1-back-ox-${pocket.id}`}>
                          <rect
                            x={pX}
                            y={pY}
                            width={pocket.width * 0.5 + 10}
                            height={pocket.height}
                            fill="#e2e8f0"
                            stroke="#0f172a"
                            strokeWidth="1.6"
                          />
                          <rect
                            x={pX + 22}
                            y={pY + 22}
                            width={Math.max(10, pocket.width * 0.5 + 10 - 32)}
                            height={Math.max(10, pocket.height - 44)}
                            fill="url(#sashBackGlassShade)"
                            stroke="#1e293b"
                            strokeWidth="1.2"
                          />
                          <line x1={pX} y1={pY} x2={pX + 22} y2={pY + 22} stroke="#334155" strokeWidth="1.2" />
                          <line x1={pX} y1={pY + pocket.height} x2={pX + 22} y2={pY + pocket.height - 22} stroke="#334155" strokeWidth="1.2" />
                        </g>

                        {/* 2. S2 Right Panel (Foreground Elevated Track - Openable with Overlap Shadow) */}
                        <g id={`slider-s2-front-ox-${pocket.id}`}>
                          <rect
                            x={centerX - 12}
                            y={pY}
                            width="10"
                            height={pocket.height}
                            fill="#0f172a"
                            fillOpacity="0.3"
                          />
                          <rect
                            x={centerX - 2}
                            y={pY}
                            width={pocket.width * 0.5 + 2}
                            height={pocket.height}
                            fill="#ffffff"
                            stroke="#0f172a"
                            strokeWidth="2.2"
                          />
                          <line
                            x1={centerX - 2}
                            y1={pY}
                            x2={centerX - 2}
                            y2={pY + pocket.height}
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeOpacity="0.95"
                          />
                          <line
                            x1={centerX - 0.8}
                            y1={pY}
                            x2={centerX - 0.8}
                            y2={pY + pocket.height}
                            stroke="#ffffff"
                            strokeWidth="1.2"
                          />
                          <rect
                            x={centerX + 12}
                            y={pY + 22}
                            width={Math.max(10, pocket.width * 0.5 + 2 - 34)}
                            height={Math.max(10, pocket.height - 44)}
                            fill="url(#sashFrontGlassShade)"
                            stroke="#0f172a"
                            strokeWidth="1.4"
                          />
                          <line x1={pX + pocket.width} y1={pY} x2={pX + pocket.width - 22} y2={pY + 22} stroke="#334155" strokeWidth="1.2" />
                          <line x1={pX + pocket.width} y1={pY + pocket.height} x2={pX + pocket.width - 22} y2={pY + pocket.height - 22} stroke="#334155" strokeWidth="1.2" />
                        </g>
                        
                        {/* S1 Left Sash Badges (Fixed) */}
                        <g transform={`translate(${pX + pocket.width * 0.25 - 4}, ${pY + 16})`}>
                          <rect x="-20" y="-10" width="40" height="20" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.6" />
                          <text x="0" y="4.5" fill="#0f172a" fontSize="12" fontWeight="900" textAnchor="middle">S1 (Back)</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.25 - 4}, ${centerY})`}>
                          <circle r="13" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
                          <line x1="-6" y1="0" x2="6" y2="0" stroke="#0f172a" strokeWidth="2" />
                          <line x1="0" y1="-6" x2="0" y2="6" stroke="#0f172a" strokeWidth="2" />
                        </g>

                        {/* S2 Right Sash Badges (Openable) */}
                        <g transform={`translate(${pX + pocket.width * 0.75 + 4}, ${pY + 16})`}>
                          <rect x="-20" y="-10" width="40" height="20" rx="3" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                          <text x="0" y="4.5" fill="#0284c7" fontSize="12" fontWeight="900" textAnchor="middle">S2 (Front)</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.75 + 4}, ${centerY - 16})`}>
                          <circle r="16" fill="#ffffff" stroke="#0f172a" strokeWidth="2.2" />
                          <text x="0" y="5.5" fill="#0f172a" fontSize="15" fontWeight="900" textAnchor="middle">2</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.75 + 4}, ${centerY + 18})`}>
                          {(() => {
                            const pHalfL = Math.max(38, Math.min(pocket.width * 0.12, 75));
                            const pHeadL = Math.max(16, Math.min(30, pHalfL * 0.42));
                            const pHeadH = Math.max(9, Math.min(16, pHalfL * 0.22));
                            const pStroke = Math.max(3.4, Math.min(5.2, pocket.width * 0.005));
                            return (
                              <>
                                <line x1={pHalfL} y1="0" x2={-pHalfL} y2="0" stroke="#0f172a" strokeWidth={pStroke} strokeLinecap="round" />
                                <polygon points={`${-pHalfL + pHeadL},${-pHeadH} ${-pHalfL},0 ${-pHalfL + pHeadL},${pHeadH}`} fill="#0f172a" />
                              </>
                            );
                          })()}
                        </g>
                        <HardwareHandle
                          x={pX + pocket.width - 14}
                          y={handlePlacement.y}
                          type={pocket.handleType || 'sliding_flush'}
                          orientation="left"
                          color={pocket.handleColor || 'silver'}
                        />
                        {pocket.handleHeight && (
                          <g transform={`translate(${pX + pocket.width - 88}, ${handlePlacement.y + 24})`}>
                            <rect x="0" y="-10" width="76" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
                            <text x="38" y="4.5" fill="#0f172a" fontSize="10.5" fontWeight="900" textAnchor="middle">GHH = {ghhValue}</text>
                          </g>
                        )}
                      </g>
                    )}

                    {pocket.sashType === 'slider_2s_xx' && (
                      <g id={`slider-2s-xx-hardware-${pocket.id}`}>
                        {/* 1. S1 Left Panel (Recessed Background Track - Both Sliding) */}
                        <g id={`slider-s1-back-xx-${pocket.id}`}>
                          <rect
                            x={pX}
                            y={pY}
                            width={pocket.width * 0.5 + 10}
                            height={pocket.height}
                            fill="#e2e8f0"
                            stroke="#0f172a"
                            strokeWidth="1.6"
                          />
                          <rect
                            x={pX + 22}
                            y={pY + 22}
                            width={Math.max(10, pocket.width * 0.5 + 10 - 32)}
                            height={Math.max(10, pocket.height - 44)}
                            fill="url(#sashBackGlassShade)"
                            stroke="#1e293b"
                            strokeWidth="1.2"
                          />
                          <line x1={pX} y1={pY} x2={pX + 22} y2={pY + 22} stroke="#334155" strokeWidth="1.2" />
                          <line x1={pX} y1={pY + pocket.height} x2={pX + 22} y2={pY + pocket.height - 22} stroke="#334155" strokeWidth="1.2" />
                        </g>

                        {/* 2. S2 Right Panel (Foreground Elevated Track with Overlap Drop Shadow) */}
                        <g id={`slider-s2-front-xx-${pocket.id}`}>
                          <rect
                            x={centerX - 12}
                            y={pY}
                            width="10"
                            height={pocket.height}
                            fill="#0f172a"
                            fillOpacity="0.3"
                          />
                          <rect
                            x={centerX - 2}
                            y={pY}
                            width={pocket.width * 0.5 + 2}
                            height={pocket.height}
                            fill="#ffffff"
                            stroke="#0f172a"
                            strokeWidth="2.2"
                          />
                          <line
                            x1={centerX - 2}
                            y1={pY}
                            x2={centerX - 2}
                            y2={pY + pocket.height}
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeOpacity="0.95"
                          />
                          <line
                            x1={centerX - 0.8}
                            y1={pY}
                            x2={centerX - 0.8}
                            y2={pY + pocket.height}
                            stroke="#ffffff"
                            strokeWidth="1.2"
                          />
                          <rect
                            x={centerX + 12}
                            y={pY + 22}
                            width={Math.max(10, pocket.width * 0.5 + 2 - 34)}
                            height={Math.max(10, pocket.height - 44)}
                            fill="url(#sashFrontGlassShade)"
                            stroke="#0f172a"
                            strokeWidth="1.4"
                          />
                          <line x1={pX + pocket.width} y1={pY} x2={pX + pocket.width - 22} y2={pY + 22} stroke="#334155" strokeWidth="1.2" />
                          <line x1={pX + pocket.width} y1={pY + pocket.height} x2={pX + pocket.width - 22} y2={pY + pocket.height - 22} stroke="#334155" strokeWidth="1.2" />
                          <line
                            x1={centerX + 26}
                            y1={pY + 28}
                            x2={centerX + 16}
                            y2={pY + 46}
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </g>
                        
                        {/* S1 Left Sash */}
                        <g transform={`translate(${pX + pocket.width * 0.25 - 4}, ${pY + 16})`}>
                          <rect x="-20" y="-10" width="40" height="20" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.6" />
                          <text x="0" y="4.5" fill="#0f172a" fontSize="12" fontWeight="900" textAnchor="middle">S1 (Back)</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.25 - 4}, ${centerY - 16})`}>
                          <circle r="16" fill="#ffffff" stroke="#0f172a" strokeWidth="2.2" />
                          <text x="0" y="5.5" fill="#0f172a" fontSize="15" fontWeight="900" textAnchor="middle">1</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.25 - 4}, ${centerY + 18})`}>
                          {(() => {
                            const pHalfL = Math.max(38, Math.min(pocket.width * 0.12, 75));
                            const pHeadL = Math.max(16, Math.min(30, pHalfL * 0.42));
                            const pHeadH = Math.max(9, Math.min(16, pHalfL * 0.22));
                            const pStroke = Math.max(3.4, Math.min(5.2, pocket.width * 0.005));
                            return (
                              <>
                                <line x1={-pHalfL} y1="0" x2={pHalfL} y2="0" stroke="#0f172a" strokeWidth={pStroke} strokeLinecap="round" />
                                <polygon points={`${pHalfL - pHeadL},${-pHeadH} ${pHalfL},0 ${pHalfL - pHeadL},${pHeadH}`} fill="#0f172a" />
                              </>
                            );
                          })()}
                        </g>
                        <HardwareHandle x={pX + 14} y={handlePlacement.y} type={pocket.handleType || 'sliding_flush'} orientation="right" color={pocket.handleColor || 'silver'} />
                        {pocket.handleHeight && (
                          <g transform={`translate(${pX + 12}, ${handlePlacement.y + 24})`}>
                            <rect x="0" y="-10" width="76" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
                            <text x="38" y="4.5" fill="#0f172a" fontSize="10.5" fontWeight="900" textAnchor="middle">GHH = {ghhValue}</text>
                          </g>
                        )}

                        {/* S2 Right Sash */}
                        <g transform={`translate(${pX + pocket.width * 0.75 + 4}, ${pY + 16})`}>
                          <rect x="-20" y="-10" width="40" height="20" rx="3" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                          <text x="0" y="4.5" fill="#0284c7" fontSize="12" fontWeight="900" textAnchor="middle">S2 (Front)</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.75 + 4}, ${centerY - 16})`}>
                          <circle r="16" fill="#ffffff" stroke="#0f172a" strokeWidth="2.2" />
                          <text x="0" y="5.5" fill="#0f172a" fontSize="15" fontWeight="900" textAnchor="middle">2</text>
                        </g>
                        <g transform={`translate(${pX + pocket.width * 0.75 + 4}, ${centerY + 18})`}>
                          {(() => {
                            const pHalfL = Math.max(38, Math.min(pocket.width * 0.12, 75));
                            const pHeadL = Math.max(16, Math.min(30, pHalfL * 0.42));
                            const pHeadH = Math.max(9, Math.min(16, pHalfL * 0.22));
                            const pStroke = Math.max(3.4, Math.min(5.2, pocket.width * 0.005));
                            return (
                              <>
                                <line x1={pHalfL} y1="0" x2={-pHalfL} y2="0" stroke="#0f172a" strokeWidth={pStroke} strokeLinecap="round" />
                                <polygon points={`${-pHalfL + pHeadL},${-pHeadH} ${-pHalfL},0 ${-pHalfL + pHeadL},${pHeadH}`} fill="#0f172a" />
                              </>
                            );
                          })()}
                        </g>
                        <HardwareHandle x={pX + pocket.width - 14} y={handlePlacement.y} type={pocket.handleType || 'sliding_flush'} orientation="left" color={pocket.handleColor || 'silver'} />
                        {pocket.handleHeight && (
                          <g transform={`translate(${pX + pocket.width - 88}, ${handlePlacement.y + 24})`}>
                            <rect x="0" y="-10" width="76" height="20" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.4" />
                            <text x="38" y="4.5" fill="#0f172a" fontSize="10.5" fontWeight="900" textAnchor="middle">GHH = {ghhValue}</text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* 3-Track Slider Variants */}
                    {pocket.sashType === 'slider_3s_oxo' && (
                      <g id={`slider-3s-oxo-hardware-${pocket.id}`}>
                        <line x1={pX + pocket.width / 3} y1={pY} x2={pX + pocket.width / 3} y2={pY + pocket.height} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                        <line x1={pX + (pocket.width * 2) / 3} y1={pY} x2={pX + (pocket.width * 2) / 3} y2={pY + pocket.height} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                        {/* Bay Numbers 1, 2, 3 */}
                        <circle cx={pX + pocket.width / 6} cy={centerY - 22} r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                        <text x={pX + pocket.width / 6} y={centerY - 18.5} fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">1</text>
                        <circle cx={pX + pocket.width / 2} cy={centerY - 22} r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                        <text x={pX + pocket.width / 2} y={centerY - 18.5} fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">2</text>
                        <circle cx={pX + (pocket.width * 5) / 6} cy={centerY - 22} r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                        <text x={pX + (pocket.width * 5) / 6} y={centerY - 18.5} fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">3</text>
                        {/* Left Arrow Right (->) */}
                        <line x1={pX + pocket.width * 0.06} y1={centerY} x2={pX + pocket.width * 0.27} y2={centerY} stroke="#0284c7" strokeWidth="3.2" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.22},${centerY - 8} ${pX + pocket.width * 0.28},${centerY} ${pX + pocket.width * 0.22},${centerY + 8}`} fill="#0284c7" />
                        {/* Center Fixed (+) */}
                        <circle cx={pX + pocket.width / 2} cy={centerY} r="12" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" />
                        <line x1={pX + pocket.width / 2 - 6} y1={centerY} x2={pX + pocket.width / 2 + 6} y2={centerY} stroke="#334155" strokeWidth="2.2" />
                        <line x1={pX + pocket.width / 2} y1={centerY - 6} x2={pX + pocket.width / 2} y2={centerY + 6} stroke="#334155" strokeWidth="2.2" />
                        {/* Right Arrow Left (<-) */}
                        <line x1={pX + pocket.width * 0.94} y1={centerY} x2={pX + pocket.width * 0.73} y2={centerY} stroke="#0284c7" strokeWidth="3.2" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.78},${centerY - 8} ${pX + pocket.width * 0.72},${centerY} ${pX + pocket.width * 0.78},${centerY + 8}`} fill="#0284c7" />
                        {/* Outer Flush Handles */}
                        <HardwareHandle
                          x={pX + 14}
                          y={handlePlacement.y}
                          type={pocket.handleType || 'sliding_flush'}
                          orientation="right"
                          color={pocket.handleColor || 'silver'}
                          title="Left Touch-Lock Handle"
                        />
                        <HardwareHandle
                          x={pX + pocket.width - 14}
                          y={handlePlacement.y}
                          type={pocket.handleType || 'sliding_flush'}
                          orientation="left"
                          color={pocket.handleColor || 'silver'}
                          title="Right Touch-Lock Handle"
                        />
                      </g>
                    )}
                    {(pocket.sashType === 'slider_3s' || pocket.sashType === 'slider_3s_xxx') && (
                      <g id={`slider-3s-all-hardware-${pocket.id}`}>
                        <line x1={pX + pocket.width / 3} y1={pY} x2={pX + pocket.width / 3} y2={pY + pocket.height} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                        <line x1={pX + (pocket.width * 2) / 3} y1={pY} x2={pX + (pocket.width * 2) / 3} y2={pY + pocket.height} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 2" />
                        {/* Bay Numbers 1, 2, 3 */}
                        <circle cx={pX + pocket.width / 6} cy={centerY - 22} r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                        <text x={pX + pocket.width / 6} y={centerY - 18.5} fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">1</text>
                        <circle cx={pX + pocket.width / 2} cy={centerY - 22} r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                        <text x={pX + pocket.width / 2} y={centerY - 18.5} fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">2</text>
                        <circle cx={pX + (pocket.width * 5) / 6} cy={centerY - 22} r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                        <text x={pX + (pocket.width * 5) / 6} y={centerY - 18.5} fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">3</text>
                        {/* Panel 1: Bi-directional Arrow <-> */}
                        <line x1={pX + pocket.width * 0.06} y1={centerY} x2={pX + pocket.width * 0.27} y2={centerY} stroke="#0284c7" strokeWidth="3.2" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.11},${centerY - 7} ${pX + pocket.width * 0.05},${centerY} ${pX + pocket.width * 0.11},${centerY + 7}`} fill="#0284c7" />
                        <polygon points={`${pX + pocket.width * 0.22},${centerY - 7} ${pX + pocket.width * 0.28},${centerY} ${pX + pocket.width * 0.22},${centerY + 7}`} fill="#0284c7" />
                        {/* Panel 2: Bi-directional Arrow <-> */}
                        <line x1={pX + pocket.width * 0.39} y1={centerY} x2={pX + pocket.width * 0.61} y2={centerY} stroke="#0284c7" strokeWidth="3.2" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.44},${centerY - 7} ${pX + pocket.width * 0.38},${centerY} ${pX + pocket.width * 0.44},${centerY + 7}`} fill="#0284c7" />
                        <polygon points={`${pX + pocket.width * 0.56},${centerY - 7} ${pX + pocket.width * 0.62},${centerY} ${pX + pocket.width * 0.56},${centerY + 7}`} fill="#0284c7" />
                        {/* Panel 3: Bi-directional Arrow <-> */}
                        <line x1={pX + pocket.width * 0.73} y1={centerY} x2={pX + pocket.width * 0.94} y2={centerY} stroke="#0284c7" strokeWidth="3.2" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.78},${centerY - 7} ${pX + pocket.width * 0.72},${centerY} ${pX + pocket.width * 0.78},${centerY + 7}`} fill="#0284c7" />
                        <polygon points={`${pX + pocket.width * 0.89},${centerY - 7} ${pX + pocket.width * 0.95},${centerY} ${pX + pocket.width * 0.89},${centerY + 7}`} fill="#0284c7" />
                        {/* Touch-Lock Handles on S1 and S3 */}
                        <HardwareHandle
                          x={pX + 14}
                          y={handlePlacement.y}
                          type={pocket.handleType || 'sliding_flush'}
                          orientation="right"
                          color={pocket.handleColor || 'silver'}
                          title="Sliding Sash 1 Touch-Lock"
                        />
                        <HardwareHandle
                          x={pX + pocket.width - 14}
                          y={handlePlacement.y}
                          type={pocket.handleType || 'sliding_flush'}
                          orientation="left"
                          color={pocket.handleColor || 'silver'}
                          title="Sliding Sash 3 Touch-Lock"
                        />
                      </g>
                    )}


                    {/* 4-Track Slider Variants */}
                    {/* 4-Track Slider Variants (including OXXO Side FIX + Center Slide + Center LOCK) */}
                    {(pocket.sashType === 'slider_4s' || pocket.sashType === 'slider_4s_oxxo' || pocket.sashType === 'slider_4s_xxxx') && (
                      <g id={`slider-4s-hardware-${pocket.id}`}>
                        <line x1={pX + pocket.width / 4} y1={pY} x2={pX + pocket.width / 4} y2={pY + pocket.height} stroke="#0284c7" strokeWidth="1.2" strokeDasharray="4 2" />
                        <line x1={pX + pocket.width / 2} y1={pY} x2={pX + pocket.width / 2} y2={pY + pocket.height} stroke="#0284c7" strokeWidth="2" />
                        <line x1={pX + (pocket.width * 3) / 4} y1={pY} x2={pX + (pocket.width * 3) / 4} y2={pY + pocket.height} stroke="#0284c7" strokeWidth="1.2" strokeDasharray="4 2" />

                        {/* Bay Labels for 4-Panel */}
                        <circle cx={pX + pocket.width / 8} cy={centerY - 22} r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                        <text x={pX + pocket.width / 8} y={centerY - 18.5} fill="#0f172a" fontSize="9" fontWeight="900" textAnchor="middle">
                          {pocket.sashType === 'slider_4s_oxxo' ? 'FIX' : '1'}
                        </text>

                        <circle cx={pX + (pocket.width * 3) / 8} cy={centerY - 22} r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                        <text x={pX + (pocket.width * 3) / 8} y={centerY - 18.5} fill="#0f172a" fontSize="9" fontWeight="900" textAnchor="middle">
                          {pocket.sashType === 'slider_4s_oxxo' ? 'S1' : '2'}
                        </text>

                        <circle cx={pX + (pocket.width * 5) / 8} cy={centerY - 22} r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                        <text x={pX + (pocket.width * 5) / 8} y={centerY - 18.5} fill="#0f172a" fontSize="9" fontWeight="900" textAnchor="middle">
                          {pocket.sashType === 'slider_4s_oxxo' ? 'S2' : '3'}
                        </text>

                        <circle cx={pX + (pocket.width * 7) / 8} cy={centerY - 22} r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                        <text x={pX + (pocket.width * 7) / 8} y={centerY - 18.5} fill="#0f172a" fontSize="9" fontWeight="900" textAnchor="middle">
                          {pocket.sashType === 'slider_4s_oxxo' ? 'FIX' : '4'}
                        </text>

                        {/* Panel 1: Left outer */}
                        {pocket.sashType === 'slider_4s_oxxo' ? (
                          /* Stationary Fixed Glass Panel (+) */
                          <g>
                            <circle cx={pX + pocket.width / 8} cy={centerY} r="10" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.8" />
                            <line x1={pX + pocket.width / 8 - 5} y1={centerY} x2={pX + pocket.width / 8 + 5} y2={centerY} stroke="#334155" strokeWidth="1.8" />
                            <line x1={pX + pocket.width / 8} y1={centerY - 5} x2={pX + pocket.width / 8} y2={centerY + 5} stroke="#334155" strokeWidth="1.8" />
                          </g>
                        ) : (
                          <line x1={pX + pocket.width * 0.05} y1={centerY} x2={pX + pocket.width * 0.2} y2={centerY} stroke="#0284c7" strokeWidth="2.8" strokeLinecap="round" />
                        )}

                        {/* Panel 2: Middle Left -> Slide towards center meeting */}
                        <line x1={pX + pocket.width * 0.28} y1={centerY} x2={pX + pocket.width * 0.45} y2={centerY} stroke="#0284c7" strokeWidth="3.2" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.41},${centerY - 7} ${pX + pocket.width * 0.46},${centerY} ${pX + pocket.width * 0.41},${centerY + 7}`} fill="#0284c7" />

                        {/* Panel 3: Middle Right <- Slide towards center meeting */}
                        <line x1={pX + pocket.width * 0.72} y1={centerY} x2={pX + pocket.width * 0.55} y2={centerY} stroke="#0284c7" strokeWidth="3.2" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.59},${centerY - 7} ${pX + pocket.width * 0.54},${centerY} ${pX + pocket.width * 0.59},${centerY + 7}`} fill="#0284c7" />

                        {/* Panel 4: Right outer */}
                        {pocket.sashType === 'slider_4s_oxxo' ? (
                          /* Stationary Fixed Glass Panel (+) */
                          <g>
                            <circle cx={pX + (pocket.width * 7) / 8} cy={centerY} r="10" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.8" />
                            <line x1={pX + (pocket.width * 7) / 8 - 5} y1={centerY} x2={pX + (pocket.width * 7) / 8 + 5} y2={centerY} stroke="#334155" strokeWidth="1.8" />
                            <line x1={pX + (pocket.width * 7) / 8} y1={centerY - 5} x2={pX + (pocket.width * 7) / 8} y2={centerY + 5} stroke="#334155" strokeWidth="1.8" />
                          </g>
                        ) : (
                          <line x1={pX + pocket.width * 0.8} y1={centerY} x2={pX + pocket.width * 0.95} y2={centerY} stroke="#0284c7" strokeWidth="2.8" strokeLinecap="round" />
                        )}

                        {/* Center Meeting Stile Handles */}
                        <HardwareHandle
                          x={centerX - 12}
                          y={centerY}
                          type={pocket.handleType || 'sliding_flush'}
                          orientation="left"
                          color={pocket.handleColor || 'silver'}
                          title="Left Meeting Stile Handle"
                        />
                        <HardwareHandle
                          x={centerX + 12}
                          y={centerY}
                          type={pocket.handleType || 'sliding_flush'}
                          orientation="right"
                          color={pocket.handleColor || 'silver'}
                          title="Right Meeting Stile Handle"
                        />
                        {/* Dedicated Central Interlock Cam Lock (बीच का लॉक) */}
                        {(pocket.hasCenterLock === true || frame.hasCenterLock === true || pocket.sashType === 'slider_4s_oxxo') && (
                          <>
                            <HardwareHandle
                              x={centerX}
                              y={centerY}
                              type="crescent_lock"
                              orientation="center"
                              color={pocket.handleColor || 'silver'}
                              title="Center Meeting Stile Lock / बीच का लॉक"
                              scale={1.2}
                            />
                            <g transform={`translate(${centerX}, ${centerY + 24})`}>
                              <rect x="-34" y="-8" width="68" height="16" rx="2" fill="#ffffff" stroke="#0284c7" strokeWidth="1.2" className="filter drop-shadow-xs" />
                              <text x="0" y="3" fill="#0284c7" fontSize="8" fontWeight="900" textAnchor="middle">🔒 सेंटर लॉक</text>
                            </g>
                          </>
                        )}
                      </g>
                    )}

                    {/* 5-Panel Slider Variants */}
                    {(pocket.sashType === 'slider_5s_fixed_center' || pocket.sashType === 'slider_5s_multi') && (
                      <g id={`slider-5s-hardware-${pocket.id}`}>
                        {[1, 2, 3, 4].map((i) => (
                          <line key={i} x1={pX + (pocket.width * i) / 5} y1={pY} x2={pX + (pocket.width * i) / 5} y2={pY + pocket.height} stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 2" />
                        ))}
                        {/* Fixed Center (+) or Center Slider */}
                        {pocket.sashType === 'slider_5s_fixed_center' ? (
                          <g>
                            <circle cx={centerX} cy={centerY} r="8" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
                            <line x1={centerX - 4} y1={centerY} x2={centerX + 4} y2={centerY} stroke="#334155" strokeWidth="1.5" />
                            <line x1={centerX} y1={centerY - 4} x2={centerX} y2={centerY + 4} stroke="#334155" strokeWidth="1.5" />
                          </g>
                        ) : (
                          <line x1={pX + pocket.width * 0.44} y1={centerY} x2={pX + pocket.width * 0.56} y2={centerY} stroke="#0284c7" strokeWidth="2" />
                        )}
                        <HardwareHandle x={pX + 14} y={handlePlacement.y} type={pocket.handleType || "sliding_flush"} orientation="right" color={pocket.handleColor || 'silver'} />
                        <HardwareHandle x={pX + pocket.width - 14} y={handlePlacement.y} type={pocket.handleType || "sliding_flush"} orientation="left" color={pocket.handleColor || 'silver'} />
                      </g>
                    )}

                    {/* 6-Panel Slider Variants */}
                    {(pocket.sashType === 'slider_6s_meeting' || pocket.sashType === 'slider_6s_multi') && (
                      <g id={`slider-6s-hardware-${pocket.id}`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <line key={i} x1={pX + (pocket.width * i) / 6} y1={pY} x2={pX + (pocket.width * i) / 6} y2={pY + pocket.height} stroke="#0284c7" strokeWidth={i === 3 ? "2" : "1"} strokeDasharray={i === 3 ? "none" : "3 2"} />
                        ))}
                        {/* Bay Numbers 1 to 6 with #2 and #5 highlighted */}
                        {[1, 2, 3, 4, 5, 6].map((num) => {
                          const bayCenterX = pX + (pocket.width * (num - 0.5)) / 6;
                          const isBothArrow = num === 2 || num === 5;
                          return (
                            <g key={num} transform={`translate(${bayCenterX}, ${centerY - 22})`}>
                              <circle r="9" fill="#ffffff" stroke={isBothArrow ? "#0284c7" : "#0f172a"} strokeWidth={isBothArrow ? "2" : "1.2"} />
                              <text x="0" y="3.5" fill={isBothArrow ? "#0284c7" : "#0f172a"} fontSize="9.5" fontWeight="900" textAnchor="middle">{num}</text>
                            </g>
                          );
                        })}
                        {/* Outer jamb handles */}
                        <HardwareHandle x={pX + 14} y={handlePlacement.y} type={pocket.handleType || "sliding_flush"} orientation="right" color={pocket.handleColor || 'silver'} title="Left Jamb Touch-Lock" />
                        <HardwareHandle x={pX + pocket.width - 14} y={handlePlacement.y} type={pocket.handleType || "sliding_flush"} orientation="left" color={pocket.handleColor || 'silver'} title="Right Jamb Touch-Lock" />
                        {/* S1: Slide Right (->) */}
                        <line x1={pX + pocket.width * 0.04} y1={centerY} x2={pX + pocket.width * 0.12} y2={centerY} stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.10},${centerY - 5} ${pX + pocket.width * 0.13},${centerY} ${pX + pocket.width * 0.10},${centerY + 5}`} fill="#0284c7" />

                        {/* S2 (2nd Panel): Bi-directional (दोनों तरफ <->) */}
                        <line x1={pX + pocket.width * 0.21} y1={centerY} x2={pX + pocket.width * 0.29} y2={centerY} stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.23},${centerY - 5} ${pX + pocket.width * 0.20},${centerY} ${pX + pocket.width * 0.23},${centerY + 5}`} fill="#0284c7" />
                        <polygon points={`${pX + pocket.width * 0.27},${centerY - 5} ${pX + pocket.width * 0.30},${centerY} ${pX + pocket.width * 0.27},${centerY + 5}`} fill="#0284c7" />

                        {/* S3: Slide Left (<-) Meeting Center */}
                        <line x1={pX + pocket.width * 0.45} y1={centerY} x2={pX + pocket.width * 0.37} y2={centerY} stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.39},${centerY - 5} ${pX + pocket.width * 0.36},${centerY} ${pX + pocket.width * 0.39},${centerY + 5}`} fill="#0284c7" />

                        {/* S4: Slide Right (->) Meeting Center */}
                        <line x1={pX + pocket.width * 0.55} y1={centerY} x2={pX + pocket.width * 0.63} y2={centerY} stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.61},${centerY - 5} ${pX + pocket.width * 0.64},${centerY} ${pX + pocket.width * 0.61},${centerY + 5}`} fill="#0284c7" />

                        {/* S5 (5th Panel): Bi-directional (दोनों तरफ <->) */}
                        <line x1={pX + pocket.width * 0.71} y1={centerY} x2={pX + pocket.width * 0.79} y2={centerY} stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.73},${centerY - 5} ${pX + pocket.width * 0.70},${centerY} ${pX + pocket.width * 0.73},${centerY + 5}`} fill="#0284c7" />
                        <polygon points={`${pX + pocket.width * 0.77},${centerY - 5} ${pX + pocket.width * 0.80},${centerY} ${pX + pocket.width * 0.77},${centerY + 5}`} fill="#0284c7" />

                        {/* S6: Slide Left (<-) */}
                        <line x1={pX + pocket.width * 0.96} y1={centerY} x2={pX + pocket.width * 0.88} y2={centerY} stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                        <polygon points={`${pX + pocket.width * 0.90},${centerY - 5} ${pX + pocket.width * 0.87},${centerY} ${pX + pocket.width * 0.90},${centerY + 5}`} fill="#0284c7" />
                        {/* Center Meeting Stile Handles on S3 and S4 */}
                        <HardwareHandle x={centerX - 12} y={handlePlacement.y} type={pocket.handleType || "sliding_flush"} orientation="left" color={pocket.handleColor || 'silver'} title="Center Meeting Lock Left (S3)" />
                        <HardwareHandle x={centerX + 12} y={handlePlacement.y} type={pocket.handleType || "sliding_flush"} orientation="right" color={pocket.handleColor || 'silver'} title="Center Meeting Lock Right (S4)" />
                        {/* Dedicated Central Crescent Lock in the middle (बीच में भी लॉक) - respects hasCenterLock */}
                        {(pocket.hasCenterLock === true || frame.hasCenterLock === true) && (
                          <>
                            <HardwareHandle x={centerX} y={handlePlacement.y} type="crescent_lock" orientation="center" color={pocket.handleColor || 'silver'} title="Center Meeting Stile Lock / बीच का लॉक" scale={1.15} />
                            <g transform={`translate(${centerX}, ${handlePlacement.y + 24})`}>
                              <rect x="-34" y="-8" width="68" height="16" rx="2" fill="#ffffff" stroke="#0284c7" strokeWidth="1.2" className="filter drop-shadow-xs" />
                              <text x="0" y="3" fill="#0284c7" fontSize="8" fontWeight="900" textAnchor="middle">🔒 सेंटर लॉक</text>
                            </g>
                          </>
                        )}
                      </g>
                    )}

                    {/* 7, 8, 10, 12 Panel Sliding Hardware */}
                    {(pocket.sashType === 'slider_7s_multi' ||
                      pocket.sashType === 'slider_8s_meeting' ||
                      pocket.sashType === 'slider_8s_multi' ||
                      pocket.sashType === 'slider_10s_meeting' ||
                      pocket.sashType === 'slider_12s_meeting') && (
                      <g id={`slider-multi-hardware-${pocket.id}`}>
                        <line x1={centerX} y1={pY} x2={centerX} y2={pY + pocket.height} stroke="#0284c7" strokeWidth="2.5" />
                        {/* Left Meeting <- */}
                        <polygon points={`${centerX - 10},${centerY - 5} ${centerX - 22},${centerY} ${centerX - 10},${centerY + 5}`} fill="#0284c7" />
                        {/* Right Meeting -> */}
                        <polygon points={`${centerX + 10},${centerY - 5} ${centerX + 22},${centerY} ${centerX + 10},${centerY + 5}`} fill="#0284c7" />
                        <HardwareHandle x={centerX - 12} y={handlePlacement.y} type={pocket.handleType || "sliding_flush"} orientation="left" color={pocket.handleColor || 'silver'} />
                        <HardwareHandle x={centerX + 12} y={handlePlacement.y} type={pocket.handleType || "sliding_flush"} orientation="right" color={pocket.handleColor || 'silver'} />
                      </g>
                    )}

                    {/* Exhaust Fan Cutout Provision (Glass remains fully visible everywhere except the circular hole) */}
                    {(pocket.hasFanCutout || pocket.sashType === 'fan_provision') && (
                      <g id={`fan-cutout-${pocket.id}`}>
                        {/* Infill sheet ONLY if explicitly set to solid PVC sheet or Louvers in inspector */}
                        {pocket.fanPanelType === 'pvc_sheet' && (
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
                        {pocket.fanPanelType === 'louver_hole' && (
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
                          const fanDia = pocket.fanCutoutDiameter || 200;
                          const maxR = Math.min(glassW * 0.44, glassH * 0.44);
                          const fanR = Math.min(maxR, Math.max(40, (fanDia / 2) * 0.88));
                          const boltAngles = [0, 45, 90, 135, 180, 225, 270, 315];
                          const bladeAngles = [0, 72, 144, 216, 288];

                          // Horizontal Alignment: Left, Center, or Right
                          const align = pocket.fanHorizontalAlign || 'center';
                          const clearance = fanR + 25; // 25mm profile & seal margin
                          let fanCenterX = centerX;
                          if (align === 'left') {
                            fanCenterX = Math.min(centerX, glassX + clearance);
                          } else if (align === 'right') {
                            fanCenterX = Math.max(centerX, glassX + glassW - clearance);
                          } else {
                            fanCenterX = centerX;
                          }

                          return (
                            <g transform={`translate(${fanCenterX}, ${centerY})`}>
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
                                  x={-Math.max(65, ((pocket.customLabel || `Ø${fanDia}mm GLASS FAN`).length * 4.5))}
                                  y="-10"
                                  width={Math.max(130, ((pocket.customLabel || `Ø${fanDia}mm GLASS FAN`).length * 9))}
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
                                  {pocket.customLabel ? pocket.customLabel : `Ø${fanDia}mm GLASS CUTOUT FAN`}
                                </text>
                              </g>
                            </g>
                          );
                        })()}
                      </g>
                    )}

                    {/* AC Provision / Window AC Unit (100% FULL POCKET FIT) / Louver Blades / ACP Insulated Sheet */}
                    {(pocket.hasACLouver || pocket.sashType === 'ac_provision' || pocket.sashType === 'louver') && (
                      <g id={`ac-provision-${pocket.id}`}>
                        {pocket.acUnitType === 'insulated_panel' ? (
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
                            <text x={centerX} y={centerY + 4} fill="#0284c7" fontSize="11" fontWeight="bold" textAnchor="middle">
                              {pocket.customLabel || 'ACP INSULATED AC OPENING'}
                            </text>
                          </g>
                        ) : pocket.acUnitType === 'louver' || pocket.sashType === 'louver' ? (
                          // Louver Blades (35mm pitch)
                          <g>
                            {Array.from({ length: Math.max(3, Math.floor(pocket.height / 35)) }).map((_, i, arr) => {
                              const ly = pY + ((i + 1) * pocket.height) / (arr.length + 1);
                              return (
                                <line
                                  key={i}
                                  x1={pX + 4}
                                  y1={ly}
                                  x2={pX + pocket.width - 4}
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
                              width={pocket.width - 12}
                              height={pocket.height - 12}
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
                                    x={-Math.max(65, ((pocket.customLabel || 'WINDOW AC UNIT').length * 4.5))}
                                    y="-9"
                                    width={Math.max(130, ((pocket.customLabel || 'WINDOW AC UNIT').length * 9))}
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
                                    {pocket.customLabel
                                      ? `${pocket.customLabel} (${Math.round(pocket.width)}×${Math.round(pocket.height)})`
                                      : `WINDOW AC (${Math.round(pocket.width)}×${Math.round(pocket.height)} mm)`}
                                  </text>
                                </g>
                              </g>
                            );
                          })()
                        )}
                      </g>
                    )}

                    {/* Security Grill Bars Pattern */}
                    {pocket.hasGrill && (
                      <g id={`security-grill-${pocket.id}`} stroke="#475569" strokeWidth="1.5">
                        {Array.from({ length: Math.max(1, Math.floor(glassW / 80)) }).map((_, i, arr) => {
                          const gx = glassX + ((i + 1) * glassW) / (arr.length + 1);
                          return <line key={`gv-${i}`} x1={gx} y1={glassY} x2={gx} y2={glassY + glassH} />;
                        })}
                        {Array.from({ length: Math.max(1, Math.floor(glassH / 120)) }).map((_, j, arr) => {
                          const gy = glassY + ((j + 1) * glassH) / (arr.length + 1);
                          return <line key={`gh-${j}`} x1={glassX} y1={gy} x2={glassX + glassW} y2={gy} />;
                        })}
                      </g>
                    )}

                    {/* UPVC Solid Panel Planks */}
                    {pocket.sashType === 'upvc_panel' && (
                      <g>
                        <rect x={pX} y={pY} width={pocket.width} height={pocket.height} fill="#f1f5f9" />
                        {Array.from({ length: Math.max(2, Math.floor(pocket.width / 50)) }).map((_, i, arr) => {
                          const lx = pX + ((i + 1) * pocket.width) / (arr.length + 1);
                          return <line key={i} x1={lx} y1={pY + 2} x2={lx} y2={pY + pocket.height - 2} stroke="#cbd5e1" strokeWidth="1.5" />;
                        })}
                      </g>
                    )}

                    {/* Drag Drop Pocket Hover Highlight */}
                    {dropTargetPocketId === pocket.id && (
                      <rect
                        x={pX + 2}
                        y={pY + 2}
                        width={pocket.width - 4}
                        height={pocket.height - 4}
                        fill="#38bdf8"
                        fillOpacity="0.3"
                        stroke="#0284c7"
                        strokeWidth="3"
                        strokeDasharray="8 4"
                        className="animate-pulse"
                      />
                    )}

                    {/* Top Horizontally Centered Sash Tag [S1], [S2] */}
                    {isSash && (
                      pocket.sashType === 'french_open' ? (
                        <g id={`french-sash-tags-${pocket.id}`}>
                          {/* Left Leaf Tag */}
                          <g
                            transform={`translate(${pX + Math.round(pocket.width / 4)}, ${pY + 14})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPocket(pocket.id);
                              onSelectFrame(frame.id);
                            }}
                            className="cursor-pointer group/sashtag"
                          >
                            <rect
                              x="-20"
                              y="-10"
                              width="40"
                              height="20"
                              rx="2"
                              fill={isPocketSelected ? '#0284c7' : '#ffffff'}
                              stroke={isPocketSelected ? '#0284c7' : '#0f172a'}
                              strokeWidth="1.6"
                              className="filter drop-shadow-xs"
                            />
                            <text
                              x="0"
                              y="4.5"
                              fill={isPocketSelected ? '#ffffff' : '#0f172a'}
                              fontSize="12"
                              fontWeight="900"
                              fontFamily="sans-serif"
                              textAnchor="middle"
                            >
                              {sashLabelText}-L
                            </text>
                          </g>

                          {/* Center False Mullion Badge [FM] */}
                          <g
                            transform={`translate(${centerX}, ${pY + 14})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPocket(pocket.id);
                              onSelectFrame(frame.id);
                            }}
                            className="cursor-pointer"
                          >
                            <rect
                              x="-14"
                              y="-9"
                              width="28"
                              height="18"
                              rx="2"
                              fill="#1e293b"
                              stroke="#0f172a"
                              strokeWidth="1.4"
                              className="filter drop-shadow-xs"
                            />
                            <text
                              x="0"
                              y="3.5"
                              fill="#38bdf8"
                              fontSize="9.5"
                              fontWeight="900"
                              fontFamily="sans-serif"
                              textAnchor="middle"
                            >
                              FM
                            </text>
                            <title>False Mullion / Flying Mullion (बीच का सैश प्रोफाइल)</title>
                          </g>

                          {/* Right Leaf Tag */}
                          <g
                            transform={`translate(${pX + Math.round((pocket.width * 3) / 4)}, ${pY + 14})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPocket(pocket.id);
                              onSelectFrame(frame.id);
                            }}
                            className="cursor-pointer group/sashtag"
                          >
                            <rect
                              x="-20"
                              y="-10"
                              width="40"
                              height="20"
                              rx="2"
                              fill={isPocketSelected ? '#0284c7' : '#ffffff'}
                              stroke={isPocketSelected ? '#0284c7' : '#0f172a'}
                              strokeWidth="1.6"
                              className="filter drop-shadow-xs"
                            />
                            <text
                              x="0"
                              y="4.5"
                              fill={isPocketSelected ? '#ffffff' : '#0f172a'}
                              fontSize="12"
                              fontWeight="900"
                              fontFamily="sans-serif"
                              textAnchor="middle"
                            >
                              {sashLabelText}-R
                            </text>
                          </g>
                        </g>
                      ) : (
                        <g
                          transform={`translate(${centerX}, ${pY + 14})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPocket(pocket.id);
                            onSelectFrame(frame.id);
                            onSelectMullion(null);
                            onSelectCoupling(null);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (onOpenPocketCustomizer) {
                              onOpenPocketCustomizer(frame.id, pocket.id);
                            }
                          }}
                          className="cursor-pointer group/sashtag"
                        >
                          <rect
                            x="-18"
                            y="-10"
                            width="36"
                            height="20"
                            rx="2"
                            fill={isPocketSelected ? '#0284c7' : '#ffffff'}
                            stroke={isPocketSelected ? '#0284c7' : '#0f172a'}
                            strokeWidth="1.6"
                            className="filter drop-shadow-xs group-hover/sashtag:fill-blue-50 group-hover/sashtag:stroke-blue-600 transition"
                          />
                          <text
                            x="0"
                            y="4.5"
                            fill={isPocketSelected ? '#ffffff' : '#0f172a'}
                            fontSize="13"
                            fontWeight="900"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                          >
                            {sashLabelText}
                          </text>
                        </g>
                      )
                    )}

                    {/* Bottom Centered Mesh Identification Tag [MS3] */}
                    {(pocket.hasMesh || pocket.sashType === 'mesh_sash' || hasMeshLayer) && (
                      <g
                        transform={`translate(${centerX}, ${pY + pocket.height - (isPocketSelected ? 34 : 18)})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPocket(pocket.id, 'mesh');
                          onSelectFrame(frame.id);
                          onSelectMullion(null);
                          onSelectCoupling(null);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (onOpenPocketCustomizer) {
                            onOpenPocketCustomizer(frame.id, pocket.id, 'mesh');
                          }
                        }}
                        className="cursor-pointer group/meshtag select-none"
                      >
                        <rect
                          x="-42"
                          y="-9"
                          width="84"
                          height="18"
                          rx="3"
                          fill="#ecfdf5"
                          stroke="#059669"
                          strokeWidth="1.6"
                          className="filter drop-shadow-xs group-hover/meshtag:fill-emerald-100 transition"
                        />
                        <text
                          x="0"
                          y="3.5"
                          fill="#065f46"
                          fontSize="9.5"
                          fontWeight="900"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                        >
                          {pocket.customLabel?.includes('MS') ? pocket.customLabel : meshTagLabelText}
                        </text>
                      </g>
                    )}

                    {/* Non-Slider Glass Unit Number Badge (for multi-lite casement/fixed) */}
                    {!isSlider && !isSash && (
                      <g
                        transform={`translate(${centerX}, ${centerY})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPocket(pocket.id);
                          onSelectFrame(frame.id);
                          onSelectMullion(null);
                          onSelectCoupling(null);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (onOpenPocketCustomizer) {
                            onOpenPocketCustomizer(frame.id, pocket.id);
                          }
                        }}
                        className="cursor-pointer group/badge"
                      >
                        <circle
                          r="15"
                          fill={isPocketSelected ? '#0284c7' : '#ffffff'}
                          stroke={isPocketSelected ? '#ffffff' : '#0f172a'}
                          strokeWidth="1.6"
                          className="filter drop-shadow-xs group-hover/badge:scale-110 transition"
                        />
                        <text
                          x="0"
                          y="5"
                          fill={isPocketSelected ? '#ffffff' : '#0f172a'}
                          fontSize="14"
                          fontWeight="900"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                        >
                          {pocket.customLabel || pIdx + 1}
                        </text>
                      </g>
                    )}

                    {/* Section Edit Button on Selected Pocket (Bottom Corner) */}
                    {isPocketSelected && onOpenPocketCustomizer && (
                      <g
                        transform={`translate(${centerX}, ${pY + pocket.height - 18})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPocketCustomizer(frame.id, pocket.id);
                        }}
                        className="cursor-pointer group/btn"
                      >
                        <rect
                          x="-38"
                          y="-9"
                          width="76"
                          height="18"
                          rx="3"
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="1"
                          className="filter drop-shadow-xs group-hover/btn:fill-blue-600 transition"
                        />
                        <text
                          x="0"
                          y="3.5"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          textAnchor="middle"
                        >
                          ⚙️ {lang === 'hi' ? 'सेक्शन' : 'Edit'}
                        </text>
                      </g>
                    )}

                    {/* Live Drag & Drop Pocket Highlight with Equal Division Center Guides */}
                    {dropTargetPocketId === pocket.id && (
                      <g className="pointer-events-none">
                        <rect
                          x={pX + 2}
                          y={pY + 2}
                          width={pocket.width - 4}
                          height={pocket.height - 4}
                          fill="#0284c7"
                          fillOpacity="0.18"
                          stroke="#0284c7"
                          strokeWidth="3"
                          strokeDasharray="8 4"
                          rx="4"
                        />
                        {/* Center vertical and horizontal guide lines */}
                        <line
                          x1={centerX}
                          y1={pY + 2}
                          x2={centerX}
                          y2={pY + pocket.height - 2}
                          stroke="#0284c7"
                          strokeWidth="2"
                          strokeDasharray="6 3"
                          opacity="0.8"
                        />
                        <line
                          x1={pX + 2}
                          y1={centerY}
                          x2={pX + pocket.width - 2}
                          y2={centerY}
                          stroke="#0284c7"
                          strokeWidth="2"
                          strokeDasharray="6 3"
                          opacity="0.8"
                        />
                        {/* Center badge */}
                        <rect
                          x={centerX - 80}
                          y={centerY - 20}
                          width="160"
                          height="40"
                          rx="8"
                          fill="#0f172a"
                          fillOpacity="0.96"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        <text
                          x={centerX}
                          y={centerY - 4}
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          🎯 = 50% | 50% =
                        </text>
                        <text
                          x={centerX}
                          y={centerY + 11}
                          fill="#38bdf8"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {lang === 'hi' ? 'बराबर 2 भागों में बांटेगा' : 'Divides Area Equally'}
                        </text>

                        {/* 3 Interactive Position Zones (Left, Center, Right) */}
                        {(() => {
                          let activeZone: 'left' | 'center' | 'right' = 'center';
                          if (dropTargetPoint) {
                            const relX = dropTargetPoint.x - frame.x;
                            const localX = relX - pocket.x;
                            const ratio = localX / pocket.width;
                            if (ratio < 0.35) activeZone = 'left';
                            else if (ratio > 0.65) activeZone = 'right';
                          }

                          const zoneW = (pocket.width - 4) / 3;
                          const zoneH = Math.min(32, Math.max(22, pocket.height * 0.22));
                          const zoneY = pY + pocket.height - zoneH - 6;

                          if (pocket.width < 120 || pocket.height < 100) return null;

                          return (
                            <g>
                              {[
                                { key: 'left', label: '⬅️ LEFT', x: pX + 2 },
                                { key: 'center', label: '⏺️ CENTER', x: pX + 2 + zoneW },
                                { key: 'right', label: '➡️ RIGHT', x: pX + 2 + zoneW * 2 },
                              ].map((z) => {
                                const isCurrent = activeZone === z.key;
                                return (
                                  <g key={z.key}>
                                    <rect
                                      x={z.x + 2}
                                      y={zoneY}
                                      width={zoneW - 4}
                                      height={zoneH}
                                      rx="5"
                                      fill={isCurrent ? '#06b6d4' : '#0f172a'}
                                      fillOpacity={isCurrent ? 0.95 : 0.75}
                                      stroke={isCurrent ? '#ffffff' : '#38bdf8'}
                                      strokeWidth={isCurrent ? 2 : 1}
                                    />
                                    <text
                                      x={z.x + zoneW / 2}
                                      y={zoneY + zoneH / 2 + 3.5}
                                      fill={isCurrent ? '#082f49' : '#e0f2fe'}
                                      fontSize="9"
                                      fontWeight="900"
                                      textAnchor="middle"
                                    >
                                      {z.label}
                                    </text>
                                  </g>
                                );
                              })}
                            </g>
                          );
                        })()}
                      </g>
                    )}
                  </g>
                );
              })}

              {/* --------------------------------------------------------- */}
              {/* RENDER MULLIONS / TRANSOMS INSIDE FRAME */}
              {/* --------------------------------------------------------- */}
              {(frame.mullions || []).map((mullion) => {
                const isMullionSelected = selectedMullionId === mullion.id;
                const isVert = mullion.orientation === 'vertical';
                const isSlidingInterlock =
                  isVert &&
                  (frame.series.startsWith('sliding') ||
                    (mullion.width && mullion.width <= 24) ||
                    (frame.pockets || []).some((p) => p.sashType.startsWith('slider_') || p.sashType === 'mesh_sash'));

                const mWidth = isSlidingInterlock
                  ? (mullion.width && mullion.width <= 12 ? mullion.width : 4)
                  : mullion.width || mpw;

                const isPartial = mullion.spanStart !== undefined && mullion.spanEnd !== undefined;

                const mX = isVert
                  ? frame.x + mullion.position - mWidth / 2
                  : isPartial
                  ? frame.x + mullion.spanStart!
                  : frame.x + fpw;
                const mY = isVert
                  ? isPartial
                    ? frame.y + mullion.spanStart!
                    : frame.y + fpw
                  : frame.y + mullion.position - mWidth / 2;
                const mW = isVert
                  ? mWidth
                  : isPartial
                  ? mullion.spanEnd! - mullion.spanStart!
                  : frame.width - 2 * fpw;
                const mH = isVert
                  ? isPartial
                    ? mullion.spanEnd! - mullion.spanStart!
                    : frame.height - 2 * fpw
                  : mWidth;

                return (
                  <g
                    key={mullion.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMullion(mullion.id);
                      onSelectFrame(frame.id);
                      onSelectPocket(null);
                      onSelectCoupling(null);
                    }}
                    className="cursor-move group"
                  >
                    <title>
                      {`${isVert ? 'खड़ा मुलियन (Vertical Mullion)' : 'आड़ा ट्रांसोम (Transom)'} - चौड़ाई: ${mWidth}mm | कट साइज: ${Math.round((isVert ? frame.height : frame.width) - 2 * fpw + 4)}mm (क्लिक करके विवरण देखें)`}
                    </title>
                    {!isSlidingInterlock ? (
                      /* Standard Casement/Fixed Vertical or Horizontal Mullion */
                      <rect
                        x={mX}
                        y={mY}
                        width={mW}
                        height={mH}
                        fill={frameColorObj?.hex || '#ffffff'}
                        stroke={isMullionSelected ? '#2563eb' : '#0f172a'}
                        strokeWidth={isMullionSelected ? 3.5 : 2}
                      />
                    ) : (
                      /* Sliding Interlock Guide Line & Center Meeting Lock (बीच का लॉक) */
                      (() => {
                        const vertMullions = (frame.mullions || []).filter((m) => m.orientation === 'vertical').sort((a, b) => a.position - b.position);
                        // Center lock should NOT be put on all windows ("center lock sabme nahi lagana h")
                        // 1. If frame.hasCenterLock === false, NEVER show center lock
                        // 2. NEVER show on 2-panel slider (vertMullions.length <= 1)
                        // Center lock should NOT be put on all windows ("center lock sabme nahi lagana h")
                        // Only show when frame.hasCenterLock === true or pocket.hasCenterLock === true
                        const isCenterMullionOf6 = vertMullions.length === 5 && vertMullions[2]?.id === mullion.id;
                        const isCenterMullionOf4 = vertMullions.length === 3 && vertMullions[1]?.id === mullion.id;

                        const allowCenterLock = frame.hasCenterLock === true;

                        const isCenterMeeting = isVert && isSlidingInterlock && allowCenterLock && (
                          isCenterMullionOf6 || isCenterMullionOf4
                        );
                        const firstPocket = frame.pockets?.[0];
                        const ghh = firstPocket?.handleHeight;
                        const centerLockY = (ghh && ghh >= 60 && ghh <= frame.height - 40)
                          ? frame.y + frame.height - ghh
                          : frame.y + frame.height / 2;

                        return (
                          <g>
                            {/* Thin technical interlock joint line */}
                            <line
                              x1={mX + mW / 2}
                              y1={mY}
                              x2={mX + mW / 2}
                              y2={mY + mH}
                              stroke={isCenterMeeting ? '#0284c7' : '#cbd5e1'}
                              strokeWidth={isCenterMeeting ? 1.6 : 1}
                              strokeDasharray={isCenterMeeting ? '6 3' : '3 3'}
                              strokeOpacity={isCenterMeeting ? 0.95 : 0.6}
                            />
                            {isMullionSelected && (
                              <rect
                                x={mX - 2}
                                y={mY}
                                width={mW + 4}
                                height={mH}
                                fill="#38bdf8"
                                fillOpacity="0.25"
                                stroke="#0284c7"
                                strokeWidth="1.5"
                              />
                            )}
                            {/* Dedicated Center Meeting Stile Lock / Interlock Cam Lock (बीच का लॉक) */}
                            {isCenterMeeting && (
                              <g id={`center-meeting-lock-${mullion.id}`} className="group/centerlock pointer-events-auto">
                                <title>सेंटर मीटिंग लॉक / बीच का लॉक (Center Meeting Stile Crescent Lock)</title>
                                <HardwareHandle
                                  x={mX + mW / 2}
                                  y={centerLockY}
                                  type="crescent_lock"
                                  orientation="center"
                                  color="silver"
                                  scale={1.2}
                                  title="सेंटर लॉक (Center Meeting Lock)"
                                />
                                <g transform={`translate(${mX + mW / 2}, ${centerLockY + 24})`}>
                                  <rect
                                    x="-34"
                                    y="-8"
                                    width="68"
                                    height="16"
                                    rx="2"
                                    fill="#ffffff"
                                    stroke="#0284c7"
                                    strokeWidth="1.2"
                                    className="filter drop-shadow-xs"
                                  />
                                  <text
                                    x="0"
                                    y="3"
                                    fill="#0284c7"
                                    fontSize="8"
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
                      })()
                    )}

                    {/* Architectural Mullion/Transom Identification Badge (T1, T2, M1, M2...) */}
                    {!isSlidingInterlock && (() => {
                      const sameOrientMullions = (frame.mullions || [])
                        .filter((m) => m.orientation === mullion.orientation)
                        .sort((a, b) => a.position - b.position);
                      const mIdx = sameOrientMullions.findIndex((m) => m.id === mullion.id) + 1;
                      const tag = isVert ? `M${mIdx}` : `T${mIdx}`;

                      return (
                        <g
                          transform={`translate(${mX + mW / 2}, ${mY + mH / 2})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMullion(mullion.id);
                            onSelectFrame(frame.id);
                            onSelectPocket(null);
                            onSelectCoupling(null);
                          }}
                          className="cursor-pointer group"
                        >
                          <rect
                            x="-17"
                            y="-11"
                            width="34"
                            height="22"
                            rx="3"
                            fill={isMullionSelected ? '#2563eb' : '#ffffff'}
                            stroke={isMullionSelected ? '#1d4ed8' : '#334155'}
                            strokeWidth={isMullionSelected ? 2.5 : 1.5}
                            className="group-hover:scale-105 transition filter drop-shadow-xs"
                          />
                          <text
                            x="0"
                            y="4"
                            fill={isMullionSelected ? '#ffffff' : '#0f172a'}
                            fontSize="11"
                            fontWeight="900"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {tag}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })}

              {/* --------------------------------------------------------- */}
              {/* LIVE DRAG-OVER SPLIT LINE PREVIEW */}
              {/* --------------------------------------------------------- */}
              {isDropTarget && (
                <g>
                  {draggedCoupler === 'h_split' ? (
                    <g>
                      <line
                        x1={frame.x}
                        y1={frame.y + frame.height / 2}
                        x2={frame.x + frame.width}
                        y2={frame.y + frame.height / 2}
                        stroke="#f59e0b"
                        strokeWidth="3"
                        strokeDasharray="8 4"
                      />
                      <g transform={`translate(${frame.x + frame.width / 2}, ${frame.y + frame.height / 2})`}>
                        <rect x="-85" y="-12" width="170" height="24" rx="12" fill="#f59e0b" />
                        <text x="0" y="4" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                          ✂ Drop to Split Horizontal 2mm
                        </text>
                      </g>
                    </g>
                  ) : (
                    <g>
                      <line
                        x1={frame.x + frame.width / 2}
                        y1={frame.y}
                        x2={frame.x + frame.width / 2}
                        y2={frame.y + frame.height}
                        stroke="#f59e0b"
                        strokeWidth="3"
                        strokeDasharray="8 4"
                      />
                      <g transform={`translate(${frame.x + frame.width / 2}, ${frame.y + frame.height / 2})`}>
                        <rect x="-80" y="-12" width="160" height="24" rx="12" fill="#f59e0b" />
                        <text x="0" y="4" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                          ✂ Drop to Split Vertical 2mm
                        </text>
                      </g>
                    </g>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* MULLION DIMENSION ARROWS & DIRECT CLICK-TO-INPUT BADGES */}
        {/* Shows Top/Bottom height and Left/Right width arrows just like coupling */}
        {/* ------------------------------------------------------------- */}
        {frames.map((f) => {
          const mList = f.mullions || [];
          if (mList.length === 0) return null;

          const isHNeighbor = (fA: typeof f, fB: typeof f) => {
            const yOverlap = Math.min(fA.y + fA.height, fB.y + fB.height) - Math.max(fA.y, fB.y);
            return yOverlap > 10;
          };
          const isVNeighbor = (fA: typeof f, fB: typeof f) => {
            const xOverlap = Math.min(fA.x + fA.width, fB.x + fB.width) - Math.max(fA.x, fB.x);
            return xOverlap > 10;
          };

          const hasNeighborRight = frames.some(
            (other) => other.id !== f.id && isHNeighbor(f, other) && other.x >= f.x + f.width - 15 && other.x <= f.x + f.width + 120
          );
          const hasNeighborLeft = frames.some(
            (other) => other.id !== f.id && isHNeighbor(f, other) && other.x + other.width >= f.x - 120 && other.x + other.width <= f.x + 15
          );
          const hasNeighborTop = frames.some(
            (other) => other.id !== f.id && isVNeighbor(f, other) && other.y + other.height >= f.y - 120 && other.y + other.height <= f.y + 15
          );
          const hasNeighborBottom = frames.some(
            (other) => other.id !== f.id && isVNeighbor(f, other) && other.y >= f.y + f.height - 15 && other.y <= f.y + f.height + 120
          );

          const hMullions = mList.filter((m) => m.orientation === 'horizontal').sort((a, b) => a.position - b.position);
          const vMullions = mList.filter((m) => m.orientation === 'vertical').sort((a, b) => a.position - b.position);

          // Horizontal Mullion Height Dimensions (Top Part vs Bottom Part)
          const mHDimX = !hasNeighborRight ? f.x + f.width + 48 : !hasNeighborLeft ? f.x - 48 : f.x + 36;
          const mHWitnessX1 = !hasNeighborRight ? f.x + f.width + 4 : !hasNeighborLeft ? f.x - 4 : f.x + 8;
          const mHWitnessX2 = !hasNeighborRight ? f.x + f.width + 66 : !hasNeighborLeft ? f.x - 66 : f.x + 64;
          const hCutPoints = [0, ...hMullions.map((m) => m.position), f.height];

          // Vertical Mullion Width Dimensions (Left Part vs Right Part)
          const mWDimY = !hasNeighborTop ? f.y - 48 : !hasNeighborBottom ? f.y + f.height + 48 : f.y + 36;
          const mWWitnessY1 = !hasNeighborTop ? f.y - 4 : !hasNeighborBottom ? f.y + f.height + 4 : f.y + 8;
          const mWWitnessY2 = !hasNeighborTop ? f.y - 66 : !hasNeighborBottom ? f.y + f.height + 66 : f.y + 64;
          const vCutPoints = [0, ...vMullions.map((m) => m.position), f.width];

          return (
            <g key={`mullion-dims-${f.id}`} className="select-none pointer-events-auto">
              {/* 1. HORIZONTAL MULLIONS HEIGHT DIMENSION ARROWS & BADGES */}
              {hMullions.length > 0 && (
                <g id={`h-mullion-dim-chain-${f.id}`}>
                  {/* Witness ticks at each boundary */}
                  {hCutPoints.map((cp) => (
                    <line
                      key={`h-cp-${f.id}-${cp}`}
                      x1={mHWitnessX1}
                      y1={f.y + cp}
                      x2={mHWitnessX2}
                      y2={f.y + cp}
                      stroke="#2563eb"
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                    />
                  ))}
                  {/* Height Segment Lines with CAD Arrowheads and Clickable Badges */}
                  {Array.from({ length: hCutPoints.length - 1 }).map((_, idx) => {
                    const y1 = f.y + hCutPoints[idx];
                    const y2 = f.y + hCutPoints[idx + 1];
                    const segH = hCutPoints[idx + 1] - hCutPoints[idx];
                    const isFirst = idx === 0;
                    const isLast = idx === hCutPoints.length - 2;
                    const mId = isLast ? hMullions[hMullions.length - 1].id : hMullions[idx].id;
                    const role: 'top' | 'bottom' = isFirst ? 'top' : 'bottom';
                    const label = isFirst ? (lang === 'hi' ? 'ऊपर (Top)' : 'Top') : isLast ? (lang === 'hi' ? 'नीचे (Bottom)' : 'Bottom') : `Part ${idx + 1}`;
                    const midY = (y1 + y2) / 2;

                    return (
                      <g key={`h-seg-${f.id}-${idx}`}>
                        {/* Segment Line with dedicated Mullion Arrowheads */}
                        <line
                          x1={mHDimX}
                          y1={y1}
                          x2={mHDimX}
                          y2={y2}
                          stroke="#2563eb"
                          strokeWidth="3.2"
                          markerStart="url(#cadArrowMullionStart)"
                          markerEnd="url(#cadArrowMullionEnd)"
                        />
                        {/* Interactive Click-to-Input Badge (Oriented vertically along height arrow) */}
                        <g
                          transform={`translate(${mHDimX}, ${midY}) rotate(-90)`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMullion(mId);
                            onSelectFrame(f.id);
                            onSelectPocket(null);
                            onSelectCoupling(null);
                            setInlineEditing({
                              id: `mullion-seg-${mId}-${role}`,
                              type: 'mullion_segment',
                              frameId: f.id,
                              mullionId: mId,
                              mullionRole: role,
                              totalDim: f.height,
                              screenX: mHDimX,
                              screenY: midY,
                              value: segH.toString(),
                              title: `${label} ऊँचाई (Mullion Height: ${segH} mm)`,
                            });
                          }}
                          className="cursor-pointer group"
                        >
                          <rect
                            x="-26"
                            y="-13"
                            width="52"
                            height="26"
                            rx="4"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="group-hover:bg-blue-50 group-hover:scale-105 transition filter drop-shadow-sm"
                          />
                          <text
                            x="0"
                            y="5"
                            fill="#0f172a"
                            fontSize="14"
                            fontWeight="900"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {segH}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 2. VERTICAL MULLIONS WIDTH DIMENSION ARROWS & BADGES */}
              {vMullions.length > 0 && (
                <g id={`v-mullion-dim-chain-${f.id}`}>
                  {/* Witness ticks at each boundary */}
                  {vCutPoints.map((cp) => (
                    <line
                      key={`v-cp-${f.id}-${cp}`}
                      x1={f.x + cp}
                      y1={mWWitnessY1}
                      x2={f.x + cp}
                      y2={mWWitnessY2}
                      stroke="#2563eb"
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                    />
                  ))}
                  {/* Width Segment Lines with CAD Arrowheads and Clickable Badges */}
                  {Array.from({ length: vCutPoints.length - 1 }).map((_, idx) => {
                    const x1 = f.x + vCutPoints[idx];
                    const x2 = f.x + vCutPoints[idx + 1];
                    const segW = vCutPoints[idx + 1] - vCutPoints[idx];
                    const isFirst = idx === 0;
                    const isLast = idx === vCutPoints.length - 2;
                    const mId = isLast ? vMullions[vMullions.length - 1].id : vMullions[idx].id;
                    const role: 'left' | 'right' = isFirst ? 'left' : 'right';
                    const label = isFirst ? (lang === 'hi' ? 'बायाँ (Left)' : 'Left') : isLast ? (lang === 'hi' ? 'दायाँ (Right)' : 'Right') : `Part ${idx + 1}`;
                    const midX = (x1 + x2) / 2;

                    return (
                      <g key={`v-seg-${f.id}-${idx}`}>
                        {/* Segment Line with dedicated Mullion Arrowheads */}
                        <line
                          x1={x1}
                          y1={mWDimY}
                          x2={x2}
                          y2={mWDimY}
                          stroke="#2563eb"
                          strokeWidth="3.2"
                          markerStart="url(#cadArrowMullionStart)"
                          markerEnd="url(#cadArrowMullionEnd)"
                        />
                        {/* Interactive Click-to-Input Badge */}
                        <g
                          transform={`translate(${midX}, ${mWDimY})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMullion(mId);
                            onSelectFrame(f.id);
                            onSelectPocket(null);
                            onSelectCoupling(null);
                            setInlineEditing({
                              id: `mullion-seg-${mId}-${role}`,
                              type: 'mullion_segment',
                              frameId: f.id,
                              mullionId: mId,
                              mullionRole: role,
                              totalDim: f.width,
                              screenX: midX,
                              screenY: mWDimY,
                              value: segW.toString(),
                              title: `${label} चौड़ाई (Mullion Width: ${segW} mm)`,
                            });
                          }}
                          className="cursor-pointer group"
                        >
                          <rect
                            x="-26"
                            y="-13"
                            width="52"
                            height="26"
                            rx="4"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2"
                            className="group-hover:bg-blue-50 group-hover:scale-105 transition filter drop-shadow-sm"
                          />
                          <text
                            x="0"
                            y="5"
                            fill="#0f172a"
                            fontSize="14"
                            fontWeight="900"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {segW}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* DEDICATED TOP LAYER: SELECTED FRAME CONTROLS, DIMENSIONS & HUD */}
        {/* Rendered ONLY for the currently selected frame so the drawing stays clean! */}
        {/* ------------------------------------------------------------- */}
        {(() => {
          const selectedFrame = frames.find((f) => f.id === selectedFrameId);
          if (!selectedFrame) return null;
          const curFrame = selectedFrame;
          const isSelected = true;

          // Check adjacent neighbor frames within coupling distance
          const isHNeighbor = (fA: typeof curFrame, fB: typeof curFrame) => {
            const yOverlap = Math.min(fA.y + fA.height, fB.y + fB.height) - Math.max(fA.y, fB.y);
            return yOverlap > 10;
          };
          const isVNeighbor = (fA: typeof curFrame, fB: typeof curFrame) => {
            const xOverlap = Math.min(fA.x + fA.width, fB.x + fB.width) - Math.max(fA.x, fB.x);
            return xOverlap > 10;
          };

          const hasNeighborRight = frames.some(
            (f) => f.id !== curFrame.id && isHNeighbor(curFrame, f) && f.x >= curFrame.x + curFrame.width - 15 && f.x <= curFrame.x + curFrame.width + 120
          );
          const hasNeighborLeft = frames.some(
            (f) => f.id !== curFrame.id && isHNeighbor(curFrame, f) && f.x + f.width >= curFrame.x - 120 && f.x + f.width <= curFrame.x + 15
          );
          const hasNeighborTop = frames.some(
            (f) => f.id !== curFrame.id && isVNeighbor(curFrame, f) && f.y + f.height >= curFrame.y - 120 && f.y + f.height <= curFrame.y + 15
          );
          const hasNeighborBottom = frames.some(
            (f) => f.id !== curFrame.id && isVNeighbor(curFrame, f) && f.y >= curFrame.y + curFrame.height - 15 && f.y <= curFrame.y + curFrame.height + 120
          );

          const curHMullions = (curFrame.mullions || []).filter((m) => m.orientation === 'horizontal');
          const curVMullions = (curFrame.mullions || []).filter((m) => m.orientation === 'vertical');
          const hasHMullions = curHMullions.length > 0;
          const hasVMullions = curVMullions.length > 0;

          // Height Dimension X position (offset outward if horizontal mullions exist to form a 2-tier CAD chain):
          const hOffset = hasHMullions ? 128 : 52;
          const hDimX = !hasNeighborRight
            ? curFrame.x + curFrame.width + hOffset
            : !hasNeighborLeft
            ? curFrame.x - hOffset
            : curFrame.x + (hasHMullions ? 92 : 42);

          const hWitnessX1 = !hasNeighborRight
            ? curFrame.x + curFrame.width + 5
            : !hasNeighborLeft
            ? curFrame.x - 5
            : curFrame.x + 10;

          const hWitnessX2 = !hasNeighborRight
            ? curFrame.x + curFrame.width + (hasHMullions ? 144 : 68)
            : !hasNeighborLeft
            ? curFrame.x - (hasHMullions ? 144 : 68)
            : curFrame.x + (hasHMullions ? 106 : 74);

          // Width Dimension Y position (offset outward if vertical mullions exist to form a 2-tier CAD chain):
          const wOffset = hasVMullions ? 128 : 52;
          const wDimY = !hasNeighborTop
            ? curFrame.y - wOffset
            : !hasNeighborBottom
            ? curFrame.y + curFrame.height + wOffset
            : curFrame.y + (hasVMullions ? 92 : 42);

          const wWitnessY1 = !hasNeighborTop
            ? curFrame.y - 5
            : !hasNeighborBottom
            ? curFrame.y + curFrame.height + 5
            : curFrame.y + 10;

          const wWitnessY2 = !hasNeighborTop
            ? curFrame.y - (hasVMullions ? 144 : 68)
            : !hasNeighborBottom
            ? curFrame.y + curFrame.height + (hasVMullions ? 144 : 68)
            : curFrame.y + (hasVMullions ? 106 : 74);

          // Quick Action Header position (placed at top-center of frame)
          const hudY = hasNeighborTop ? curFrame.y + 30 : curFrame.y - 26;

          return (
            <g key={`frame-dim-overlay-${curFrame.id}`} id={`frame-dim-overlay-${curFrame.id}`} className="select-none">
              {/* Highlight selection rect with vivid blue border & subtle glow when selected */}
              {isSelected && (
                <rect
                  x={curFrame.x}
                  y={curFrame.y}
                  width={curFrame.width}
                  height={curFrame.height}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeDasharray="12 6"
                  className="filter drop-shadow-lg pointer-events-none"
                  rx="4"
                />
              )}

              {/* 1. DYNAMIC WIDTH DIMENSION LINE */}
              <line
                x1={curFrame.x}
                y1={wDimY}
                x2={curFrame.x + curFrame.width}
                y2={wDimY}
                stroke={isSelected ? '#1d4ed8' : '#475569'}
                strokeWidth={isSelected ? 3.8 : 2.8}
                markerStart={isSelected ? 'url(#cadArrowBlueStart)' : 'url(#cadSlash)'}
                markerEnd={isSelected ? 'url(#cadArrowBlueEnd)' : 'url(#cadSlash)'}
              />
              {/* Width Witness lines */}
              <line x1={curFrame.x} y1={wWitnessY1} x2={curFrame.x} y2={wWitnessY2} stroke={isSelected ? '#1d4ed8' : '#64748b'} strokeWidth={isSelected ? 2 : 1.5} />
              <line x1={curFrame.x + curFrame.width} y1={wWitnessY1} x2={curFrame.x + curFrame.width} y2={wWitnessY2} stroke={isSelected ? '#1d4ed8' : '#64748b'} strokeWidth={isSelected ? 2 : 1.5} />

              {/* Width Badge (Always clickable & clearly visible) */}
              <g
                transform={`translate(${curFrame.x + curFrame.width / 2}, ${wDimY})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFrame(curFrame.id);
                  setInlineEditing({
                    id: `fw-${curFrame.id}`,
                    type: 'frame_w',
                    frameId: curFrame.id,
                    screenX: curFrame.x + curFrame.width / 2,
                    screenY: wDimY,
                    value: curFrame.width.toString(),
                    title: `${curFrame.name || 'Frame'} Width (चौड़ाई)`,
                    anchor: hasNeighborRight ? 'left' : 'right',
                  });
                }}
                className="cursor-pointer group"
              >
                <rect
                  x="-65"
                  y="-27"
                  width="130"
                  height="54"
                  rx="14"
                  fill="#ffffff"
                  stroke={isSelected ? '#1d4ed8' : '#475569'}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                  className="group-hover:bg-blue-50 group-hover:scale-105 transition filter drop-shadow-xl"
                />
                <text
                  x="0"
                  y="10.5"
                  fill={isSelected ? '#1d4ed8' : '#0f172a'}
                  fontSize={isSelected ? '28' : '25'}
                  fontWeight="900"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {curFrame.width}
                </text>
              </g>

              {/* 2. DYNAMIC HEIGHT DIMENSION LINE - ALWAYS SHOWS TRUE FRAME HEIGHT */}
              <line
                x1={hDimX}
                y1={curFrame.y}
                x2={hDimX}
                y2={curFrame.y + curFrame.height}
                stroke={isSelected ? '#1d4ed8' : '#475569'}
                strokeWidth={isSelected ? 3.8 : 2.8}
                markerStart={isSelected ? 'url(#cadArrowBlueStart)' : 'url(#cadSlash)'}
                markerEnd={isSelected ? 'url(#cadArrowBlueEnd)' : 'url(#cadSlash)'}
              />
              {/* Height Witness lines */}
              <line x1={hWitnessX1} y1={curFrame.y} x2={hWitnessX2} y2={curFrame.y} stroke={isSelected ? '#1d4ed8' : '#64748b'} strokeWidth={isSelected ? 2 : 1.5} />
              <line x1={hWitnessX1} y1={curFrame.y + curFrame.height} x2={hWitnessX2} y2={curFrame.y + curFrame.height} stroke={isSelected ? '#1d4ed8' : '#64748b'} strokeWidth={isSelected ? 2 : 1.5} />

              {/* Height Badge (ALWAYS TRUE FRAME HEIGHT - Oriented vertically along height arrow) */}
              <g
                transform={`translate(${hDimX}, ${curFrame.y + curFrame.height / 2}) rotate(-90)`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFrame(curFrame.id);
                  setInlineEditing({
                    id: `fh-${curFrame.id}`,
                    type: 'frame_h',
                    frameId: curFrame.id,
                    screenX: hDimX,
                    screenY: curFrame.y + curFrame.height / 2,
                    value: curFrame.height.toString(),
                    title: `${curFrame.name || 'Frame'} Height (फ्रेम ऊंचाई)`,
                    anchor: hasNeighborBottom ? 'top' : 'bottom',
                  });
                }}
                className="cursor-pointer group"
              >
                <rect
                  x="-65"
                  y="-27"
                  width="130"
                  height="54"
                  rx="14"
                  fill="#ffffff"
                  stroke={isSelected ? '#1d4ed8' : '#475569'}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                  className="group-hover:bg-blue-50 group-hover:scale-105 transition filter drop-shadow-xl"
                />
                <text
                  x="0"
                  y="10.5"
                  fill={isSelected ? '#1d4ed8' : '#0f172a'}
                  fontSize={isSelected ? '28' : '25'}
                  fontWeight="900"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {curFrame.height}
                </text>
              </g>

              {/* 3. DUAL-DIMENSION & QUICK ACTION FLOATING CAPSULE (ON SELECTED FRAME) */}
              {isSelected && (
                <g
                  transform={`translate(${curFrame.x + curFrame.width / 2}, ${hudY})`}
                  className="pointer-events-auto select-none"
                >
                  <rect
                    x="-135"
                    y="-18"
                    width="270"
                    height="36"
                    rx="18"
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    className="filter drop-shadow-2xl"
                  />
                  
                  {/* Frame Tag */}
                  <rect x="-127" y="-12" width="34" height="24" rx="12" fill="#2563eb" />
                  <text x="-110" y="4" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle">
                    {curFrame.name || 'F'}
                  </text>

                  {/* Width Tag (Clickable) */}
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineEditing({
                        id: `fw-${curFrame.id}`,
                        type: 'frame_w',
                        frameId: curFrame.id,
                        screenX: curFrame.x + curFrame.width / 2,
                        screenY: wDimY,
                        value: curFrame.width.toString(),
                        title: `${curFrame.name || 'Frame'} Width (चौड़ाई)`,
                        anchor: hasNeighborRight ? 'left' : 'right',
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <text x="-52" y="4" fill="#93c5fd" fontSize="12" fontWeight="bold" textAnchor="middle">
                      W: <tspan fill="#ffffff" fontWeight="900">{curFrame.width}</tspan>
                    </text>
                  </g>

                  <line x1="-12" y1="-8" x2="-12" y2="8" stroke="#475569" strokeWidth="1.5" />

                  {/* Height Tag (Clickable) */}
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineEditing({
                        id: `fh-${curFrame.id}`,
                        type: 'frame_h',
                        frameId: curFrame.id,
                        screenX: hDimX,
                        screenY: curFrame.y + curFrame.height / 2,
                        value: curFrame.height.toString(),
                        title: `${curFrame.name || 'Frame'} Height (फ्रेम ऊंचाई)`,
                        anchor: hasNeighborBottom ? 'top' : 'bottom',
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <text x="28" y="4" fill="#93c5fd" fontSize="12" fontWeight="bold" textAnchor="middle">
                      H: <tspan fill="#ffffff" fontWeight="900">{curFrame.height}</tspan>
                    </text>
                  </g>

                  {/* Direct Delete Button */}
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteSelected) onDeleteSelected();
                    }}
                    className="cursor-pointer group"
                  >
                    <rect
                      x="75"
                      y="-12"
                      width="52"
                      height="24"
                      rx="12"
                      fill="#e11d48"
                      className="group-hover:fill-rose-700 transition"
                    />
                    <text x="101" y="4" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                      🗑️ Del
                    </text>
                  </g>
                </g>
              )}

              {/* 4. DIRECTIONAL RESIZE ARROWS: Only show on selected frame in free unobstructed directions */}
              {isSelected && !hasNeighborRight && (
                <g
                  transform={`translate(${curFrame.x + curFrame.width}, ${curFrame.y + curFrame.height / 2})`}
                  className="cursor-ew-resize group pointer-events-auto"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragHandle({
                      type: 'frame_w_right',
                      frameId: curFrame.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialW: curFrame.width,
                    });
                  }}
                  title="Drag to Expand Right (दाएँ बढ़ाएँ)"
                >
                  <circle r="28" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3.5" className="filter drop-shadow-2xl group-hover:scale-120 transition" />
                  <text x="0" y="8" fill="#ffffff" fontSize="26" fontWeight="900" textAnchor="middle">
                    →
                  </text>
                </g>
              )}

              {isSelected && !hasNeighborLeft && (
                <g
                  transform={`translate(${curFrame.x}, ${curFrame.y + curFrame.height / 2})`}
                  className="cursor-ew-resize group pointer-events-auto"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragHandle({
                      type: 'frame_w_left',
                      frameId: curFrame.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialW: curFrame.width,
                    });
                  }}
                  title="Drag to Expand Left (बाएँ बढ़ाएँ)"
                >
                  <circle r="28" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3.5" className="filter drop-shadow-2xl group-hover:scale-120 transition" />
                  <text x="0" y="8" fill="#ffffff" fontSize="26" fontWeight="900" textAnchor="middle">
                    ←
                  </text>
                </g>
              )}

              {isSelected && !hasNeighborBottom && (
                <g
                  transform={`translate(${curFrame.x + curFrame.width / 2}, ${curFrame.y + curFrame.height})`}
                  className="cursor-ns-resize group pointer-events-auto"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragHandle({
                      type: 'frame_h_bot',
                      frameId: curFrame.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialH: curFrame.height,
                    });
                  }}
                  title="Drag to Expand Down (नीचे बढ़ाएँ)"
                >
                  <circle r="28" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3.5" className="filter drop-shadow-2xl group-hover:scale-120 transition" />
                  <text x="0" y="8" fill="#ffffff" fontSize="26" fontWeight="900" textAnchor="middle">
                    ↓
                  </text>
                </g>
              )}

              {isSelected && !hasNeighborTop && (
                <g
                  transform={`translate(${curFrame.x + curFrame.width / 2}, ${curFrame.y})`}
                  className="cursor-ns-resize group pointer-events-auto"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragHandle({
                      type: 'frame_h_top',
                      frameId: curFrame.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialH: curFrame.height,
                    });
                  }}
                  title="Drag to Expand Up (ऊपर बढ़ाएँ)"
                >
                  <circle r="28" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3.5" className="filter drop-shadow-2xl group-hover:scale-120 transition" />
                  <text x="0" y="8" fill="#ffffff" fontSize="26" fontWeight="900" textAnchor="middle">
                    ↑
                  </text>
                </g>
              )}
            </g>
          );
        })()}
      </svg>

      {/* ------------------------------------------------------------- */}
      {/* FLOATING QUICK-ADJUST CONTROLLER FOR ANGLED BAY (ON SAME SCREEN) */}
      {/* ------------------------------------------------------------- */}
      {activeAngledCoupling && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-black tracking-wide text-amber-400 uppercase">मोड़ एलिवेशन</span>
          </div>

          <div className="h-5 w-px bg-slate-700" />

          {/* Straighten (180° Simple) button */}
          <button
            type="button"
            onClick={() => {
              if (onUpdateCoupling) {
                onUpdateCoupling({
                  ...activeAngledCoupling,
                  couplerType: 'flat_2mm',
                  angle: 180,
                  gap: 2,
                });
              }
            }}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-600/40 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/40 rounded-lg font-bold transition cursor-pointer shadow-xs"
            title="कप्लिंग को सीधा (180° Flat Simple) करें"
          >
            <span>↔️ सीधा (180° Simple)</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          {/* Angle Display & Quick Step Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-300 font-medium">कोण:</span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-bold">
              ∠{activeAngledCoupling.angle || 135}°
            </span>
            <div className="flex items-center gap-1">
              {[90, 120, 135, 150].map((presetAngle) => (
                <button
                  key={presetAngle}
                  type="button"
                  onClick={() => {
                    if (onUpdateCoupling) {
                      onUpdateCoupling({
                        ...activeAngledCoupling,
                        angle: presetAngle,
                        couplerType: presetAngle === 90 ? 'corner_90' : 'variable_bay_pole',
                      });
                    }
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                    (activeAngledCoupling.angle || 135) === presetAngle
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {presetAngle}°
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-slate-700" />

          {/* Slider for smooth live angle changing (up to 180°) */}
          <div className="flex items-center gap-1.5" title="कोण स्लाइडर (60° से 180°)">
            <input
              type="range"
              min="60"
              max="180"
              step="1"
              value={activeAngledCoupling.angle || 135}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && onUpdateCoupling) {
                  onUpdateCoupling({
                    ...activeAngledCoupling,
                    angle: val,
                    couplerType: val === 180 ? 'flat_2mm' : val === 90 ? 'corner_90' : 'variable_bay_pole',
                    gap: val === 180 ? 2 : val === 90 ? 50 : 38,
                  });
                }
              }}
              className="w-24 accent-amber-400 cursor-pointer"
            />
          </div>

          <div className="h-5 w-px bg-slate-700" />

          {/* Inward / Outward Bend Toggle */}
          <button
            type="button"
            onClick={() => {
              if (onUpdateCoupling) {
                onUpdateCoupling({
                  ...activeAngledCoupling,
                  bendDirection: activeAngledCoupling.bendDirection === 'outward' ? 'inward' : 'outward',
                });
              }
            }}
            className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold transition cursor-pointer"
          >
            {activeAngledCoupling.bendDirection === 'outward' ? '↗️ Outward' : '↘️ Inward'}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DIRECT INLINE EDITING INPUT BOX WITH DIRECTION SELECTOR */}
      {/* ------------------------------------------------------------- */}
      {inlineEditing && (
        <>
          {/* Click-outside backdrop to dismiss or commit */}
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
            onClick={submitInlineDimension}
          />

          <div
            className="absolute z-50 animate-in zoom-in-95 pointer-events-auto"
            style={{
              left: `${Math.max(10, pan.x + inlineEditing.screenX * zoom - 130)}px`,
              top: `${Math.max(10, pan.y + inlineEditing.screenY * zoom - 45)}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col bg-white border border-blue-600 rounded-2xl shadow-xl overflow-hidden p-3 gap-2 w-[260px] sm:w-[280px]">
              <div className="flex items-center justify-between px-0.5 text-xs font-bold text-slate-800">
                <span className="truncate max-w-[170px]">{inlineEditing.title || 'साइज बदलें'}</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-600 font-mono font-bold text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">mm</span>
                  <button
                    type="button"
                    onClick={() => setInlineEditing(null)}
                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center rounded-xl overflow-hidden border-2 border-blue-500 bg-white transition shadow-inner h-11">
                <input
                  type="text"
                  autoFocus
                  value={inlineEditing.value}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setInlineEditing({
                      ...inlineEditing,
                      value: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitInlineDimension();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setInlineEditing(null);
                    }
                  }}
                  className="w-full px-3 text-2xl font-black text-center font-mono text-slate-950 bg-white focus:outline-none tracking-tight"
                  placeholder="1200 या 1200+50"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    submitInlineDimension();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3.5 h-full font-bold flex items-center justify-center transition shrink-0"
                  title="Apply (Enter)"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                </button>
              </div>

              {/* Live Calculation Preview Badge */}
              {(() => {
                const preview = getLiveMathPreview(inlineEditing.value);
                if (!preview.isExpression) return null;
                return (
                  <div className="flex items-center justify-between px-2 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold font-mono text-emerald-800">
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                      <span>कैलकुलेशन:</span>
                    </span>
                    {preview.calculated !== null ? (
                      <span className="text-sm font-black text-emerald-700">= {preview.calculated} mm</span>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-normal">अधूरा हिसाब...</span>
                    )}
                  </div>
                );
              })()}

              {/* Quick Stepper Buttons (4 compact buttons) */}
              <div className="grid grid-cols-4 gap-1">
                {[-50, -10, 10, 50].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const cur = evaluateDimensionMath(inlineEditing.value) ?? (parseInt(inlineEditing.value.replace(/[^0-9]/g, '') || '0', 10) || 0);
                      const next = Math.max(50, cur + delta);
                      setInlineEditing({ ...inlineEditing, value: next.toString() });
                    }}
                    className="py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition text-center"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>

              {/* Bay / Panel preview */}
              {inlineEditing.type === 'bay_w' && (
                <div className="text-[10px] text-center font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">
                  पैनल = {inlineEditing.value} mm &bull; कुल = {(evaluateDimensionMath(inlineEditing.value) ?? (parseInt(inlineEditing.value.replace(/[^0-9]/g, '') || '0', 10) || 0)) * (inlineEditing.totalBays || 1)} mm
                </div>
              )}

              {/* Mullion Segment Preview */}
              {inlineEditing.type === 'mullion_segment' && (() => {
                const curVal = evaluateDimensionMath(inlineEditing.value) ?? (parseInt(inlineEditing.value.replace(/[^0-9]/g, '') || '0', 10) || 0);
                const totalD = inlineEditing.totalDim || 0;
                const otherVal = Math.max(0, totalD - curVal);
                return (
                  <div className="flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono">
                    <span className="text-blue-700 font-bold">{curVal} mm</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-emerald-700 font-bold">{otherVal} mm</span>
                  </div>
                );
              })()}

              {/* Direction Selection in 1 compact row */}
              {(inlineEditing.type === 'frame_w' || inlineEditing.type === 'frame_h') && inlineEditing.frameId && (
                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 shrink-0">दिशा:</span>
                  {inlineEditing.type === 'frame_w' ? (
                    <div className="grid grid-cols-2 gap-1 flex-1">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setInlineEditing({ ...inlineEditing, anchor: 'left' });
                        }}
                        className={`py-1 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                          inlineEditing.anchor === 'left' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                        title="बाएँ (Left)"
                      >
                        <span>⬅ बाएँ</span>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setInlineEditing({ ...inlineEditing, anchor: 'right' });
                        }}
                        className={`py-1 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                          inlineEditing.anchor === 'right' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                        title="दाएँ (Right)"
                      >
                        <span>दाएँ ➔</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1 flex-1">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setInlineEditing({ ...inlineEditing, anchor: 'top' });
                        }}
                        className={`py-1 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                          inlineEditing.anchor === 'top' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                        title="ऊपर (Top)"
                      >
                        <span>⬆ ऊपर</span>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setInlineEditing({ ...inlineEditing, anchor: 'bottom' });
                        }}
                        className={`py-1 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                          inlineEditing.anchor === 'bottom' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                        title="नीचे (Bottom)"
                      >
                        <span>⬇ नीचे</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Full Apply Button */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  submitInlineDimension();
                }}
                className="w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>लागू करें (Apply Size)</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE 2MM COUPLING JOINT & DIRECTION CONTROLLER POPUP */}
      {/* ------------------------------------------------------------- */}
      {selectedCouplingId && (() => {
        const c = couplings.find((x) => x.id === selectedCouplingId);
        if (!c) return null;
        const sourceFrame = frames.find((f) => f.id === c.sourceFrameId);
        const targetFrame = frames.find((f) => f.id === c.targetFrameId);
        const activeFrame = frames.find((f) => f.id === couplingEditorFrameId) || sourceFrame;
        if (!sourceFrame || !targetFrame || !activeFrame) return null;

        const applyCouplingDimension = (dimTarget?: 'width' | 'height') => {
          const w = parseInt(couplingDimensionInput.width, 10);
          if (!isNaN(w) && w > 100) {
            onUpdateFrameDimension(activeFrame.id, w, activeFrame.height, couplingWidthDirection);
          }
        };

        const adjustSize = (dim: 'width', delta: number) => {
          const currentVal = parseInt(couplingDimensionInput.width, 10) || activeFrame.width;
          const newVal = Math.max(200, currentVal + delta);
          const updatedInput = { ...couplingDimensionInput, width: newVal.toString() };
          setCouplingDimensionInput(updatedInput);
          onUpdateFrameDimension(activeFrame.id, newVal, activeFrame.height, couplingWidthDirection);
        };

        return (
          <div className="absolute top-4 right-4 z-40 w-96 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-amber-500 shadow-2xl p-4 animate-in slide-in-from-right-4 pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  A
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">Coupling Joint & Angle Editor</h4>
                  <p className="text-[11px] text-slate-500">Ⓐ कप्लिंग जोड़ - कोण मोड़ 2D एलिवेशन</p>
                </div>
              </div>
              <button
                onClick={() => onSelectCoupling(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Step: Coupler Type & Bend Angle Section */}
            <div className="mt-3 bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <span>📐</span>
                  <span>कप्लिंग प्रकार व मोड़ कोण (Coupler & Angle):</span>
                </span>
                {(c.angle !== undefined || c.couplerType === 'variable_bay_pole' || c.couplerType === 'corner_90' || c.couplerType === 'corner_135') && (
                  <span className="text-[11px] font-mono font-extrabold bg-amber-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                    {c.angle ?? (c.couplerType === 'corner_90' ? 90 : 135)}° मोड़
                  </span>
                )}
              </div>

              {/* Coupler Type Selector */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {[
                  { id: 'flat_2mm', label: '2mm सीधा (180°)' },
                  { id: 'variable_bay_pole', label: '📐 एंगल मोड़' },
                  { id: 'corner_90', label: '90° L-कॉर्नर' },
                  { id: 'corner_135', label: '135° बे-पोल' },
                  { id: 'box_profile', label: '50mm बॉक्स' },
                ].map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => {
                      if (onUpdateCoupling) {
                        const defaultAng = ct.id === 'corner_90' ? 90 : ct.id === 'corner_135' ? 135 : ct.id === 'variable_bay_pole' ? (c.angle ?? 135) : 180;
                        onUpdateCoupling({
                          ...c,
                          couplerType: ct.id as any,
                          angle: defaultAng,
                        });
                      }
                    }}
                    className={`py-1.5 px-1 rounded-lg border font-bold text-center transition ${
                      c.couplerType === ct.id || (!c.couplerType && ct.id === 'flat_2mm')
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>

              {/* Variable Angle Controls (if applicable) */}
              {(c.couplerType === 'variable_bay_pole' || c.couplerType === 'corner_90' || c.couplerType === 'corner_135' || (c.angle !== undefined && c.angle !== 180)) && (() => {
                const currentAngle = c.angle ?? (c.couplerType === 'corner_90' ? 90 : 135);
                const bendDir = c.bendDirection || 'inward';

                return (
                  <div className="space-y-2 pt-1 border-t border-amber-200">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                      <span>मोड़ एंगल (Bend Angle):</span>
                      <span className="font-mono text-amber-900 font-extrabold">{currentAngle}°</span>
                    </div>

                    {/* Quick +/- buttons and input */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateCoupling) {
                            onUpdateCoupling({
                              ...c,
                              couplerType: c.couplerType === 'flat_2mm' ? 'variable_bay_pole' : c.couplerType,
                              angle: Math.max(45, currentAngle - 5),
                            });
                          }
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg font-mono font-bold text-xs active:scale-95"
                      >
                        -5°
                      </button>
                      <input
                        type="number"
                        min="45"
                        max="180"
                        value={currentAngle}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && onUpdateCoupling) {
                            onUpdateCoupling({
                              ...c,
                              couplerType: c.couplerType === 'flat_2mm' ? 'variable_bay_pole' : c.couplerType,
                              angle: Math.max(45, Math.min(180, val)),
                            });
                          }
                        }}
                        className="flex-1 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center font-mono font-bold text-slate-900 text-sm focus:border-amber-500 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-amber-800 font-mono">° Deg</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateCoupling) {
                            onUpdateCoupling({
                              ...c,
                              couplerType: c.couplerType === 'flat_2mm' ? 'variable_bay_pole' : c.couplerType,
                              angle: Math.min(180, currentAngle + 5),
                            });
                          }
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg font-mono font-bold text-xs active:scale-95"
                      >
                        +5°
                      </button>
                    </div>

                    {/* Range slider */}
                    <input
                      type="range"
                      min="45"
                      max="180"
                      step="1"
                      value={currentAngle}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (onUpdateCoupling) {
                          onUpdateCoupling({
                            ...c,
                            couplerType: c.couplerType === 'flat_2mm' ? 'variable_bay_pole' : c.couplerType,
                            angle: val,
                          });
                        }
                      }}
                      className="w-full accent-amber-500 cursor-pointer"
                    />

                    {/* Presets */}
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { deg: 90, label: '90° L' },
                        { deg: 120, label: '120°' },
                        { deg: 135, label: '135°' },
                        { deg: 150, label: '150°' },
                        { deg: 180, label: '180°' },
                      ].map((p) => (
                        <button
                          key={p.deg}
                          type="button"
                          onClick={() => {
                            if (onUpdateCoupling) {
                              onUpdateCoupling({
                                ...c,
                                couplerType: p.deg === 180 ? 'flat_2mm' : p.deg === 90 ? 'corner_90' : p.deg === 135 ? 'corner_135' : 'variable_bay_pole',
                                angle: p.deg,
                              });
                            }
                          }}
                          className={`py-1 text-center rounded-md border text-[10px] font-mono font-bold transition ${
                            currentAngle === p.deg
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Bend direction toggle */}
                    <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
                      <span className="font-bold text-slate-600">मोड़ दिशा:</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateCoupling) {
                              onUpdateCoupling({ ...c, bendDirection: 'inward' });
                            }
                          }}
                          className={`px-2 py-0.5 rounded border transition font-bold ${
                            bendDir === 'inward'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          ↩ अंदर (Inward)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateCoupling) {
                              onUpdateCoupling({ ...c, bendDirection: 'outward' });
                            }
                          }}
                          className={`px-2 py-0.5 rounded border transition font-bold ${
                            bendDir === 'outward'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          ↪ बाहर (Outward)
                        </button>
                      </div>
                    </div>

                    {/* Automatic Single-Screen Angle Visualization Note */}
                    <div className="w-full mt-2 py-1.5 px-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center justify-center gap-1.5 text-center">
                      <Split className="w-3.5 h-3.5 text-amber-600" />
                      <span>कोण बदलते ही स्क्रीन पर विंडो तुरंत मुड़ेगी</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Step 1: Select Frame (F1 vs F2) */}
            <div className="mt-3">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                1. किस साइड के फ्रेम की साइज बदलना है? (Select Frame):
              </label>
              {(() => {
                const isHorizontal = c.direction === 'horizontal';
                const fFirst = isHorizontal
                  ? (sourceFrame.x <= targetFrame.x ? sourceFrame : targetFrame)
                  : (sourceFrame.y <= targetFrame.y ? sourceFrame : targetFrame);
                const fSecond = isHorizontal
                  ? (sourceFrame.x <= targetFrame.x ? targetFrame : sourceFrame)
                  : (sourceFrame.y <= targetFrame.y ? targetFrame : sourceFrame);

                return (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSelectCouplingFrame(fFirst.id)}
                      className={`p-2.5 rounded-xl border-2 text-left transition flex flex-col ${
                        activeFrame.id === fFirst.id
                          ? 'border-blue-600 bg-blue-50/80 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-blue-700">{fFirst.name || 'Frame 1'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 rounded font-bold text-slate-600">
                          {isHorizontal ? 'बायाँ (Left)' : 'ऊपर (Top)'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900 mt-1">
                        {fFirst.width} × {fFirst.height} mm
                      </span>
                    </button>

                    <button
                      onClick={() => handleSelectCouplingFrame(fSecond.id)}
                      className={`p-2.5 rounded-xl border-2 text-left transition flex flex-col ${
                        activeFrame.id === fSecond.id
                          ? 'border-blue-600 bg-blue-50/80 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-blue-700">{fSecond.name || 'Frame 2'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 rounded font-bold text-slate-600">
                          {isHorizontal ? 'दायाँ (Right)' : 'नीचे (Bottom)'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900 mt-1">
                        {fSecond.width} × {fSecond.height} mm
                      </span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Step 2: Direction of Expansion */}
            <div className="mt-3.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2.5">
              <div>
                <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ऊंचाई बढ़ाने की दिशा (Height Direction):</span>
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase font-mono">
                    {couplingHeightDirection === 'top' ? '⬆ ऊपर (Top)' : '⬇ नीचे (Bottom)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCouplingHeightDirection('top');
                      setCouplingSelectedDirection('top');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border transition ${
                      couplingHeightDirection === 'top'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>⬆</span>
                    <span>ऊपर (Top)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCouplingHeightDirection('bottom');
                      setCouplingSelectedDirection('bottom');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border transition ${
                      couplingHeightDirection === 'bottom'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>⬇</span>
                    <span>नीचे (Bottom)</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>चौड़ाई बढ़ाने की दिशा (Width Direction):</span>
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase font-mono">
                    {couplingWidthDirection === 'left' ? '⬅ बाएँ (Left)' : '➔ दाएँ (Right)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCouplingWidthDirection('left');
                      setCouplingSelectedDirection('left');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border transition ${
                      couplingWidthDirection === 'left'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>⬅</span>
                    <span>बाएँ (Left)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCouplingWidthDirection('right');
                      setCouplingSelectedDirection('right');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border transition ${
                      couplingWidthDirection === 'right'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>➔</span>
                    <span>दाएँ (Right)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Size Inputs & Quick +/- Buttons */}
            <div className="mt-3.5 space-y-2.5">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>चौड़ाई / Width (mm):</span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => adjustSize('width', -100)}
                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-mono font-bold text-slate-800"
                    >
                      -100
                    </button>
                    <button
                      onClick={() => adjustSize('width', +100)}
                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-mono font-bold text-slate-800"
                    >
                      +100
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={couplingDimensionInput.width}
                  onChange={(e) => setCouplingDimensionInput({ ...couplingDimensionInput, width: e.target.value })}
                  onBlur={() => applyCouplingDimension('width')}
                  onKeyDown={(e) => e.key === 'Enter' && applyCouplingDimension('width')}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-center text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>ऊंचाई / Height (mm):</span>
                  <span className="font-mono text-blue-700 font-extrabold text-sm">{activeFrame.height} mm</span>
                </div>
                <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-1.5 leading-snug">
                  <span className="shrink-0 mt-0.5">🔒</span>
                  <span>कपलिंग की ऊंचाई सिर्फ फ्रेम पर टाइप करने पर ही बदल सकती है।</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCoupling(null);
                    onSelectFrame(activeFrame.id);
                    setInlineEditing({
                      id: `fh-${activeFrame.id}`,
                      type: 'frame_h',
                      frameId: activeFrame.id,
                      screenX: activeFrame.x + activeFrame.width / 2,
                      screenY: activeFrame.y + activeFrame.height / 2,
                      value: activeFrame.height.toString(),
                      title: `${activeFrame.name || 'Frame'} Height (फ्रेम ऊंचाई टाइप करें)`,
                    });
                  }}
                  className="w-full py-1.5 px-2 text-xs font-extrabold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>✏️ फ्रेम पर ऊंचाई टाइप करें (Type on Frame)</span>
                </button>
              </div>
            </div>

            {/* Apply Button */}
            <button
              type="button"
              onClick={() => applyCouplingDimension()}
              className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition"
            >
              <Check className="w-4 h-4" />
              <span>साइज व दिशा लागू करें (Apply & Update)</span>
            </button>
          </div>
        );
      })()}

      {/* Exhaust Fan Cutout Position (Left, Center, Right) Selection Prompt Modal */}
      <FanPositionModal
        isOpen={!!fanPositionPrompt}
        initialConfig={fanPositionPrompt}
        lang={lang}
        onConfirm={handleConfirmFanPosition}
        onCancel={() => setFanPositionPrompt(null)}
      />
    </div>
  );
};
