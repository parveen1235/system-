# UPVC Window & Door CAD, Multi-Coupling & Fabrication Engine
## Complete Technical Specification & Architectural Blueprint

This document contains the complete end-to-end technical reference and specifications for reproducing this uPVC & Aluminium Window/Door CAD, Fabrication, and Quotation software.

---

## 1. Project Overview & Capabilities
This application is an industrial-grade CAD and Quotation tool designed for uPVC & Aluminium window/door fabricators, architects, and estimating engineers.

### Core Capabilities:
1. **Interactive 2D Vector CAD Canvas**:
   - High-precision SVG canvas with continuous Pan, Zoom (10% to 500%), and Orthographic Grid snapping.
   - Dual dimensioning: Overall assembly outer boundary dimensions + individual frame dimensions with dynamic witness lines and CAD arrow markers.
   - Direct click-to-edit dimension badges with keyboard input, quick +/- stepping, and anchor directional growth.
   - Collision-aware directional grow arrows (only free edges can be expanded).
   - Real-time sash swing opening arcs and hinge/handle indicator symbols.
2. **Multi-Frame 2mm Coupling System**:
   - Seamless side-by-side (Horizontal) and top-to-bottom stacked (Vertical) frame coupling.
   - Strict 2mm expansion gap tolerance maintained across chained multi-frame assemblies.
   - Automatic frame position propagation when resizing coupled frames.
3. **Mullion & Transom Sub-Pocket Division Engine**:
   - Full-span and T-joint mullions/transoms.
   - Automatic sub-pocket calculation with precise inner clearances.
4. **Factory Cutting List & Glass Optimization**:
   - 45° outer frame miter cuts with 6mm total welding allowance (3mm per corner).
   - 90° mullion cuts with mechanical cleat or V-notch allowances.
   - Glass width & height clearance deductions.
   - Galvanized steel reinforcement cuts (with 100mm corner clearance deductions).
5. **Bill of Materials (BOM) & Quotation Engine**:
   - Accurate metric cost breakdown: uPVC profiles, glass, steel, hardware, fasteners, fabrication labor, wastage percentage, and GST/tax calculation.
   - Professional PDF quote generation with client details.
6. **3D Photorealistic Preview**:
   - Perspective 3D rendering with glass transparency, reflections, profile finishes (White, Golden Oak, Dark Walnut, Anthracite Grey, Jet Black).
7. **Production Drawing Export**:
   - Export to SVG, DXF, High-Res PNG, and Factory Production Worksheets.

---

## 2. Mathematical Models & Deduction Formulas

### A. Frame Geometry & Pockets
Given a frame with outer dimensions $W \times H$:
- Outer Profile Face Width: $P_f$ (Standard: 60mm)
- Mullion Profile Width: $M_w$ (Standard: 74mm)
- Initial Inner Area:
  $$\text{Inner Width} = W - 2 \times P_f$$
  $$\text{Inner Height} = H - 2 \times P_f$$

When vertical mullions at positions $x_1, x_2, \dots, x_n$ are added:
$$\text{Pocket}_0 \text{ Width} = x_1 - P_f - \frac{M_w}{2}$$
$$\text{Pocket}_i \text{ Width} = (x_{i+1} - x_i) - M_w$$
$$\text{Pocket}_n \text{ Width} = (W - P_f) - x_n - \frac{M_w}{2}$$

### B. 2mm Coupling Math
For horizontal coupling between `Frame A` (left) and `Frame B` (right):
$$X_B = X_A + W_A + \text{CouplerGap (2mm)}$$

For vertical coupling between `Frame A` (top) and `Frame B` (bottom):
$$Y_B = Y_A + H_A + \text{CouplerGap (2mm)}$$

### C. Cutting List Formulas (Factory Standards)
1. **Outer Frame (Miter 45°/45°)**:
   $$\text{Cutting Length (Top/Bottom)} = W + 6\text{mm}$$
   $$\text{Cutting Length (Left/Right)} = H + 6\text{mm}$$
2. **Vertical Mullion (Straight 90°/90°)**:
   $$\text{Cutting Length} = H - 2 \times P_f + 4\text{mm}$$
3. **Casement Sash (Miter 45°/45°)**:
   $$\text{Sash Width} = \text{Pocket Width} + 2 \times 8\text{mm (overlap)} - 4\text{mm (tolerance)} + 6\text{mm (weld)}$$
   $$\text{Sash Height} = \text{Pocket Height} + 2 \times 8\text{mm (overlap)} - 4\text{mm (tolerance)} + 6\text{mm (weld)}$$
4. **Glass Sizing**:
   $$\text{Glass Width} = \text{Pocket Width} - 12\text{mm (6mm clearance per side)}$$
   $$\text{Glass Height} = \text{Pocket Height} - 12\text{mm (6mm clearance per side)}$$
5. **Steel Reinforcement (90°/90°)**:
   $$\text{Outer Frame Steel} = \text{Frame Profile Length} - 100\text{mm}$$
   $$\text{Mullion Steel} = \text{Mullion Length} - 20\text{mm}$$

---

## 3. Data Schema & TypeScript Interfaces

```typescript
export interface UPVCFrame {
  id: string;
  name: string;
  width: number; // outer mm
  height: number; // outer mm
  x: number; // canvas mm
  y: number; // canvas mm
  series: 'casement_60' | 'casement_70' | 'sliding_62' | 'sliding_88' | 'sliding_3track' | 'door_premium';
  frameProfileWidth: number;
  mullionProfileWidth: number;
  sashProfileWidth: number;
  color: string;
  mullions: Mullion[];
  pockets: FramePocket[];
  reinforcement: 'steel_1.2mm' | 'steel_1.5mm' | 'steel_2.0mm' | 'none';
  drainageCaps: boolean;
}

export interface CouplingConnection {
  id: string;
  sourceFrameId: string;
  targetFrameId: string;
  direction: 'horizontal' | 'vertical';
  gap: number; // standard 2mm
  couplerType: 'flat_2mm' | 'box_profile' | 'h_coupler' | 'corner_90' | 'corner_135';
  couplerWidth: number;
  alignment: 'top' | 'center' | 'bottom' | 'custom';
}
```

---

## 4. UI / CAD Interaction Flow
1. **Selection Model**: Clicking a frame selects it, displaying bounding dimension handles and active resize arrows on non-obstructed sides.
2. **Direct Dimension Input**: Clicking any dimension badge opens an inline numeric modal with anchor selectors (`Left`, `Right`, `Top`, `Bottom`), quick +/- adjustment chips, and instantaneous calculation on Enter/Apply.
3. **Collision Safety**: The system checks spatial bounds against all adjacent coupled frames. Expansion arrows are suppressed in directions with existing neighboring frames to avoid overlapping geometry.
4. **Clean Presentation**: Internal pocket dimensions are hidden from the visual stage to maintain an uncluttered architectural drawing standard while retaining all overall assembly and frame exterior measurements.

---

## 5. Technology Stack
- **Frontend Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Vector CAD**: High-Precision SVG with Custom Markers, Gradients, and Transforms
- **3D Graphics**: Three.js / Canvas WebGL
- **Icons**: Lucide React
- **Build Tool**: Vite
