# UPVC CAD, Fabrication & Quotation Engine — Master System Architecture & Specifications

This repository contains a specialized, industrial-grade **uPVC & Aluminium Window/Door CAD Designer, Multi-Frame 2mm Coupling System, Cutting List / BOM Generator, and Quotation Application** built with React, TypeScript, Vite, Tailwind CSS, and Lucide Icons.

---

## 📐 Core Engineering & Manufacturing Principles

### 1. Dual Dimensioning & Geometry System
- **Total Assembly Outer Boundary**: Outer envelope calculated across all coupled frames including coupler gaps (default 2mm).
- **Individual Frame Dimensions**: Outer bounding box for each frame ($W \times H$ in mm).
- **Pocket / Internal Clearances**:
  $$\text{Pocket Width} = \text{Frame Width} - 2 \times \text{FrameProfileWidth} - \sum \text{MullionWidths}$$
  $$\text{Pocket Height} = \text{Frame Height} - 2 \times \text{FrameProfileWidth} - \sum \text{TransomWidths}$$
- **Outer-Only Clean CAD Display**: Internal pocket dimensions are suppressed on the visual canvas for clutter-free readability, while all outer width and height dimensions with arrowheads and witness lines are rendered externally.

### 2. Multi-Frame 2mm Coupling Engine
- **Horizontal Coupling (Side-by-Side)**:
  - Source frame on Left, Target frame on Right.
  - Gap: Exactly `2mm` flat expansion coupler (or custom box profile width).
  - Target Frame $X = \text{Source Frame } X + \text{Source Frame Width} + \text{CouplerGap}$.
- **Vertical Coupling (Stacked Window/Door + Top Light)**:
  - Source frame on Top, Target frame on Bottom.
  - Target Frame $Y = \text{Source Frame } Y + \text{Source Frame Height} + \text{CouplerGap}$.
- **Directional Resize & Neighbor Collision Prevention**:
  - When expanding a frame towards an open edge, it grows in that direction.
  - If a neighboring coupled frame exists on a side (Left, Right, Top, or Bottom), the resize arrow and directional growth button pointing towards the occupied side are automatically hidden to prevent overlap.
  - The dimension lines dynamically move to the unobstructed side (e.g. height badge shifts to the left side if the right side is coupled).

### 3. Cutting List (Deduction Formulas & Bill of Materials)
- **Outer Frame Profiles**: Cut with $45^\circ$ miter cuts.
  - Top & Bottom lengths = Frame Width $+ 6\text{mm}$ (welding allowance: $3\text{mm} \times 2$).
  - Left & Right lengths = Frame Height $+ 6\text{mm}$.
- **Mullion & Transom Profiles**: Cut with $90^\circ$ or V-notch.
  - Vertical Mullion length = $\text{Frame Height} - (2 \times \text{FrameProfileWidth}) + \text{Welding/Joint Allowance}$.
- **Casement & Sliding Sashes**:
  - Casement Sash Width = $\text{Pocket Width} + 2 \times \text{Overlap} (8\text{mm}) - \text{Clearance}$.
  - Casement Sash Height = $\text{Pocket Height} + 2 \times \text{Overlap} (8\text{mm}) - \text{Clearance}$.
- **Glass Panel Sizing**:
  - Glass Width = $\text{Pocket Width} - 2 \times (\text{Bead Clearance} \approx 6\text{mm})$.
  - Glass Height = $\text{Pocket Height} - 2 \times (\text{Bead Clearance} \approx 6\text{mm})$.
- **Galvanized Steel Reinforcement**:
  - Outer Frame Reinforcement = $\text{Profile Length} - 100\text{mm}$ (50mm deduction from corner welds).
  - Mullion Reinforcement = $\text{Mullion Length} - 20\text{mm}$.

---

## 🛠️ Key Codebase Modules

| Module Path | Primary Responsibility |
|---|---|
| `/src/types/upvc.ts` | Complete TypeScript type definitions (`UPVCFrame`, `CouplingConnection`, `Mullion`, `FramePocket`, `CuttingItem`, `BOMItem`, `PricingConfig`). |
| `/src/utils/upvcCalculations.ts` | Mathematical calculation engine for pocket slicing, frame dimension resizing with anchor points (`left`, `right`, `top`, `bottom`), 2mm coupling chain updates, cutting list generation, and BOM pricing. |
| `/src/utils/presets.ts` | Predefined window & door templates (Casement, 2-Track Slider, 3-Track Slider, French Door, Villa Window with Louver, Bay Window). |
| `/src/components/CadCanvas.tsx` | High-precision interactive SVG canvas supporting pan, zoom, grid, dimension badges, directional handles, sash swing animations, and direct inline dimension editing. |
| `/src/components/Inspector.tsx` | Right-hand property inspector for frame dimensions, profile series, colors, mullion positions, glass type, sash operation, and reinforcement. |
| `/src/components/Toolbar.tsx` | Top action bar for adding frames, mullions, couplers, presets, switching between 2D CAD, 3D Realism, Cutting List, and Quotation views. |
| `/src/components/CuttingListModal.tsx` | Factory-ready profile cutting optimization sheet, glass sizes, and hardware counts with print & CSV export. |
| `/src/components/QuotationView.tsx` | Comprehensive cost estimate calculator (Profile, Glass, Steel, Hardware, Fabrication Labor, Wastage %, GST). |
| `/src/components/Canvas3D.tsx` | Interactive Three.js / Canvas 3D visualization of windows with realistic glass reflections and profile colors. |
| `/src/components/ExportDrawingModal.tsx` | PDF / DXF / High-resolution SVG technical drawing exporter with manufacturing title blocks. |

---

## 💡 Instructions for Any AI Maintaining or Rebuilding this Project
1. **Never break the 2mm Coupling Guarantee**: Chained multi-frame assemblies must always calculate neighbor positions using exact 2mm spacing unless specifically designated as a box coupler.
2. **Interactive Dimension Editing**: All dimension badges on the CAD canvas must allow direct click-to-edit with immediate response on `Enter`, click-outside, or Apply button.
3. **Outer-Only Clean Display**: Do not clutter the canvas with inner pocket dimension labels unless inspecting or explicitly requested.
4. **Collision-Safe Arrow Logic**: If a frame has a neighbor on a given side, suppress the expansion arrow towards that neighbor.
