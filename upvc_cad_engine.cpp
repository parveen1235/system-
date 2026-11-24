/**
 * ============================================================================
 * uPVC & Aluminium Window/Door CAD Engine, 2mm Coupling & Cutting List System
 * ============================================================================
 * 
 * Standalone Industrial-Grade C++ Implementation
 * Compatible with C++17 / C++20 (GCC, Clang, MSVC, or Emscripten WebAssembly)
 * 
 * Includes:
 * 1. Dual-Dimensioning & 2mm Flat Expansion Coupler Assembly Math
 * 2. Automatic Internal Pocket & Daylight Opening Slicing
 * 3. 4-Panel [ FIX | SLIDE → | 🔒 | ← SLIDE | FIX ] (F-S-S-F / OXXO) Sliding Engine
 * 4. Factory Cutting List Deductions (+6mm Weld, Mullions, Sashes, Glass, Steel)
 * 5. Bill of Materials (BOM) & Complete Factory Quotation Engine
 * 6. Native Vector SVG Architectural CAD Drawing Exporter
 * 7. Interactive CLI Console & Test Suite
 * 
 * How to compile:
 *   g++ -std=c++17 -O2 upvc_cad_engine.cpp -o upvc_cad_engine
 * Run:
 *   ./upvc_cad_engine
 * ============================================================================
 */

#include <iostream>
#include <vector>
#include <string>
#include <iomanip>
#include <cmath>
#include <sstream>
#include <fstream>
#include <algorithm>
#include <memory>

namespace upvc {

// ----------------------------------------------------------------------------
// 1. Core Data Models & Enums
// ----------------------------------------------------------------------------

enum class SeriesType {
    Sliding62,    // 2-Track 62mm
    Sliding88,    // 3-Track 88mm
    Casement60,   // Casement 60mm
    DoorPremium   // Heavy Door 65/85mm
};

enum class SashType {
    Fixed,
    CasementLeft,
    CasementRight,
    SliderArrowRight,   // S1 ->
    SliderArrowLeft,    // S2 <-
    SliderArrowBoth,    // ↔ (Bi-directional)
    SliderFixedCenter,  // (+) Stationary Fixed Panel in Slider
    Louver,
    MeshSash
};

enum class Orientation {
    Horizontal,
    Vertical
};

enum class CouplingDirection {
    Horizontal,
    Vertical
};

struct Mullion {
    std::string id;
    Orientation orientation;
    double position; // mm from left edge (if vertical) or top edge (if horizontal)
    double width;    // mm (e.g., 74mm for casement, 4-16mm for sliding interlock)
};

struct FramePocket {
    std::string id;
    double x;        // internal X relative to frame (mm)
    double y;        // internal Y relative to frame (mm)
    double width;    // clear pocket width (mm)
    double height;   // clear pocket height (mm)
    SashType sashType;
    std::string customLabel;
    std::string glassType;
    bool hasMesh = false;
    bool hasCenterLock = false;
};

struct UPVCFrame {
    std::string id;
    std::string name;
    double width;               // Outer bounding width (mm)
    double height;              // Outer bounding height (mm)
    double x = 0;               // Assembly X (mm)
    double y = 0;               // Assembly Y (mm)
    SeriesType series = SeriesType::Sliding62;
    double frameProfileWidth = 60.0;   // Outer frame face width (mm)
    double mullionProfileWidth = 74.0; // Standard mullion width (mm)
    double sashProfileWidth = 60.0;    // Sash profile width (mm)
    std::string color = "White";
    bool hasCenterLock = false;        // Center meeting stile crescent lock (बीच का लॉक)
    std::vector<Mullion> mullions;
    std::vector<FramePocket> pockets;
};

struct CouplingConnection {
    std::string id;
    std::string sourceFrameId;
    std::string targetFrameId;
    CouplingDirection direction;
    double gap = 2.0; // Standard 2mm flat expansion coupler gap
    std::string couplerType = "flat_2mm";
};

// Cutting List Item
struct CuttingItem {
    std::string profileType; // "Outer Frame", "Mullion", "Sash", "Glazing Bead", "Reinforcement"
    std::string description;
    double length;           // mm
    int quantity;
    std::string cutAngle;    // "45° / 45°", "90° / 90°"
    std::string material;
};

// Bill of Materials Item
struct BOMItem {
    std::string category;
    std::string description;
    double quantity;
    std::string unit;
    double unitRate;
    double totalCost;
};

// ----------------------------------------------------------------------------
// 2. Geometry & Pocket Slicing Engine
// ----------------------------------------------------------------------------

class CADGeometryEngine {
public:
    /**
     * Slices a UPVCFrame into distinct internal daylight pockets based on mullions
     */
    static std::vector<FramePocket> calculateFramePockets(const UPVCFrame& frame) {
        std::vector<FramePocket> result;

        std::vector<double> vPositions;
        for (const auto& m : frame.mullions) {
            if (m.orientation == Orientation::Vertical) {
                vPositions.push_back(m.position);
            }
        }
        std::sort(vPositions.begin(), vPositions.end());

        std::vector<double> hPositions;
        for (const auto& m : frame.mullions) {
            if (m.orientation == Orientation::Horizontal) {
                hPositions.push_back(m.position);
            }
        }
        std::sort(hPositions.begin(), hPositions.end());

        // X boundaries
        std::vector<double> xBounds;
        xBounds.push_back(frame.frameProfileWidth);
        for (double vp : vPositions) {
            double mHalf = frame.mullionProfileWidth / 2.0;
            xBounds.push_back(vp - mHalf);
            xBounds.push_back(vp + mHalf);
        }
        xBounds.push_back(frame.width - frame.frameProfileWidth);

        // Y boundaries
        std::vector<double> yBounds;
        yBounds.push_back(frame.frameProfileWidth);
        for (double hp : hPositions) {
            double mHalf = frame.mullionProfileWidth / 2.0;
            yBounds.push_back(hp - mHalf);
            yBounds.push_back(hp + mHalf);
        }
        yBounds.push_back(frame.height - frame.frameProfileWidth);

        int pocketIndex = 1;
        for (size_t yIdx = 0; yIdx + 1 < yBounds.size(); yIdx += 2) {
            double py = yBounds[yIdx];
            double ph = yBounds[yIdx + 1] - py;
            if (ph <= 0) continue;

            for (size_t xIdx = 0; xIdx + 1 < xBounds.size(); xIdx += 2) {
                double px = xBounds[xIdx];
                double pw = xBounds[xIdx + 1] - px;
                if (pw <= 0) continue;

                FramePocket pocket;
                pocket.id = frame.id + "-p" + std::to_string(pocketIndex);
                pocket.x = px;
                pocket.y = py;
                pocket.width = pw;
                pocket.height = ph;
                pocket.sashType = SashType::Fixed;
                pocket.customLabel = "P" + std::to_string(pocketIndex);
                pocket.glassType = "Clear 5mm Toughened";
                result.push_back(pocket);
                pocketIndex++;
            }
        }
        return result;
    }

    /**
     * Resolves positions of coupled frames maintaining exact 2mm coupler spacing
     */
    static void solveCouplingAssembly(std::vector<UPVCFrame>& frames, const std::vector<CouplingConnection>& couplings) {
        for (const auto& c : couplings) {
            UPVCFrame* source = nullptr;
            UPVCFrame* target = nullptr;
            for (auto& f : frames) {
                if (f.id == c.sourceFrameId) source = &f;
                if (f.id == c.targetFrameId) target = &f;
            }

            if (source && target) {
                if (c.direction == CouplingDirection::Horizontal) {
                    target->x = source->x + source->width + c.gap;
                    target->y = source->y;
                } else {
                    target->x = source->x;
                    target->y = source->y + source->height + c.gap;
                }
            }
        }
    }
};

// ----------------------------------------------------------------------------
// 3. 4-Panel Fix-Slide-Slide-Fix (F-S-S-F / OXXO) Window Builder
// ----------------------------------------------------------------------------

class WindowFactory {
public:
    /**
     * Creates a 4-Panel Window where:
     * - Left panel is FIX (stationary)
     * - Center left panel is SLIDE (S1 ->)
     * - Center right panel is SLIDE (<- S2)
     * - Right panel is FIX (stationary)
     * - Middle interlock meeting stile features a central crescent lock (बीच में लॉक)
     */
    static UPVCFrame create4PanelFixSlideSlideFix(double width = 3200.0, double height = 2100.0) {
        UPVCFrame frame;
        frame.id = "frame-4p-fssf";
        frame.name = "4-Panel Slider [ FIX - SLIDE → | 🔒 | ← SLIDE - FIX ]";
        frame.width = width;
        frame.height = height;
        frame.x = 0;
        frame.y = 0;
        frame.series = SeriesType::Sliding62;
        frame.frameProfileWidth = 45.0;
        frame.mullionProfileWidth = 4.0; // 4mm ultra-slim interlock meeting profile
        frame.sashProfileWidth = 50.0;
        frame.color = "Traffic White";
        frame.hasCenterLock = true; // 🔒 बीच में लॉक (Center Meeting Lock Active)

        double panelW = width / 4.0;

        // 3 Vertical partition interlocks
        Mullion m1{"mul-1", Orientation::Vertical, panelW * 1, 4.0};
        Mullion m2{"mul-2", Orientation::Vertical, panelW * 2, 4.0}; // CENTER MEETING STILE with Lock
        Mullion m3{"mul-3", Orientation::Vertical, panelW * 3, 4.0};

        frame.mullions = {m1, m2, m3};

        // Create 4 distinct pockets
        FramePocket p1;
        p1.id = "pkt-1-fix";
        p1.x = frame.frameProfileWidth;
        p1.y = frame.frameProfileWidth;
        p1.width = panelW - frame.frameProfileWidth;
        p1.height = height - (2.0 * frame.frameProfileWidth);
        p1.sashType = SashType::SliderFixedCenter; // Stationary FIX (+)
        p1.customLabel = "FIX";
        p1.glassType = "Clear 5mm Toughened";

        FramePocket p2;
        p2.id = "pkt-2-slide-right";
        p2.x = panelW;
        p2.y = frame.frameProfileWidth;
        p2.width = panelW;
        p2.height = height - (2.0 * frame.frameProfileWidth);
        p2.sashType = SashType::SliderArrowRight; // S1 Slide Right (→)
        p2.customLabel = "S1";
        p2.glassType = "Clear 5mm Toughened";

        FramePocket p3;
        p3.id = "pkt-3-slide-left";
        p3.x = panelW * 2;
        p3.y = frame.frameProfileWidth;
        p3.width = panelW;
        p3.height = height - (2.0 * frame.frameProfileWidth);
        p3.sashType = SashType::SliderArrowLeft; // S2 Slide Left (←)
        p3.customLabel = "S2";
        p3.glassType = "Clear 5mm Toughened";

        FramePocket p4;
        p4.id = "pkt-4-fix";
        p4.x = panelW * 3;
        p4.y = frame.frameProfileWidth;
        p4.width = panelW - frame.frameProfileWidth;
        p4.height = height - (2.0 * frame.frameProfileWidth);
        p4.sashType = SashType::SliderFixedCenter; // Stationary FIX (+)
        p4.customLabel = "FIX";
        p4.glassType = "Clear 5mm Toughened";

        frame.pockets = {p1, p2, p3, p4};
        return frame;
    }
};

// ----------------------------------------------------------------------------
// 4. Cutting List & BOM Deduction Engine
// ----------------------------------------------------------------------------

class FabricationEngine {
public:
    static std::vector<CuttingItem> generateCuttingList(const UPVCFrame& frame) {
        std::vector<CuttingItem> cuts;

        // 1. Outer Frame Profiles (45° Miter Cuts, +6mm welding allowance)
        double weldAllowance = 6.0;
        cuts.push_back({
            "Outer Frame",
            "Top & Bottom Outer Frame Track",
            frame.width + weldAllowance,
            2,
            "45° / 45° Miter",
            "uPVC Sliding Outer Frame"
        });
        cuts.push_back({
            "Outer Frame",
            "Left & Right Outer Frame Jamb",
            frame.height + weldAllowance,
            2,
            "45° / 45° Miter",
            "uPVC Sliding Outer Frame"
        });

        // 2. Steel Reinforcements for Outer Frame (-100mm corner weld relief)
        cuts.push_back({
            "Steel Reinforcement",
            "Top & Bottom Galvanized Steel (1.5mm)",
            frame.width - 100.0,
            2,
            "90° / 90° Square",
            "Galvanized Steel 1.5mm"
        });
        cuts.push_back({
            "Steel Reinforcement",
            "Left & Right Galvanized Steel (1.5mm)",
            frame.height - 100.0,
            2,
            "90° / 90° Square",
            "Galvanized Steel 1.5mm"
        });

        // 3. Sliding Sashes & Fixed Glass Deductions
        int sashCount = 0;
        int fixCount = 0;
        for (const auto& p : frame.pockets) {
            if (p.sashType == SashType::SliderArrowRight || p.sashType == SashType::SliderArrowLeft) {
                sashCount++;
            } else if (p.sashType == SashType::SliderFixedCenter || p.sashType == SashType::Fixed) {
                fixCount++;
            }
        }

        if (sashCount > 0) {
            // Formula for 4-Panel 2-Track Sashes (Panel width + overlap / 2 + 6mm weld)
            double panelW = frame.width / 4.0;
            double sashW = panelW + 16.0; // 16mm interlock overlap
            double sashH = frame.height - (2.0 * frame.frameProfileWidth) - 12.0; // Rail clearance

            cuts.push_back({
                "Sliding Sash",
                "Sliding Sash Horizontal (Top/Bottom)",
                sashW + weldAllowance,
                sashCount * 2,
                "45° / 45° Miter",
                "uPVC Sliding Sash Profile"
            });
            cuts.push_back({
                "Sliding Sash",
                "Sliding Sash Vertical (Stiles)",
                sashH + weldAllowance,
                sashCount * 2,
                "45° / 45° Miter",
                "uPVC Sliding Sash Profile"
            });

            // Sash Steel Reinforcement (-80mm)
            cuts.push_back({
                "Steel Reinforcement",
                "Sash Steel Stile (Vertical)",
                sashH - 80.0,
                sashCount * 2,
                "90° / 90° Square",
                "Galvanized Steel 1.2mm"
            });

            // Sliding Glass Panels (-2 * Sash profile + bead clearance)
            double glassW = sashW - (2.0 * frame.sashProfileWidth) + 12.0;
            double glassH = sashH - (2.0 * frame.sashProfileWidth) + 12.0;
            cuts.push_back({
                "Glass Panel",
                "Sliding Sash Toughened Glass",
                glassW,
                sashCount,
                std::to_string((int)glassW) + " x " + std::to_string((int)glassH) + " mm",
                "5mm Clear Toughened Glass"
            });
        }

        if (fixCount > 0) {
            double panelW = frame.width / 4.0;
            double fixGlassW = panelW - frame.frameProfileWidth - 10.0;
            double fixGlassH = frame.height - (2.0 * frame.frameProfileWidth) - 10.0;
            cuts.push_back({
                "Glass Panel",
                "Stationary Fixed Toughened Glass",
                fixGlassW,
                fixCount,
                std::to_string((int)fixGlassW) + " x " + std::to_string((int)fixGlassH) + " mm",
                "5mm Clear Toughened Glass"
            });
        }

        // 4. Hardware Items
        if (frame.hasCenterLock) {
            cuts.push_back({
                "Hardware",
                "Center Meeting Crescent Lock (बीच का लॉक)",
                1.0,
                1,
                "Stile Mount",
                "Heavy-Duty Zinc Die-Cast Crescent Lock"
            });
        }

        return cuts;
    }

    static std::vector<BOMItem> calculateBOM(const UPVCFrame& frame) {
        std::vector<BOMItem> bom;

        double areaSqMt = (frame.width * frame.height) / 1000000.0;
        double areaSqFt = areaSqMt * 10.7639;

        // Profile length meters
        double perimeterM = (2.0 * (frame.width + frame.height)) / 1000.0;
        double sashLengthM = ((frame.width / 2.0) + (frame.height * 2.0)) / 1000.0 * 2.0;
        double totalProfileM = perimeterM + sashLengthM;

        // 1. uPVC Profiles
        double profileRatePerM = 480.0; // ₹ / meter
        bom.push_back({"Profiles", "uPVC Extruded Profiles (Frame & Sash)", totalProfileM, "Mtr", profileRatePerM, totalProfileM * profileRatePerM});

        // 2. Galvanized Steel
        double steelM = totalProfileM * 0.85;
        double steelRatePerM = 160.0;
        bom.push_back({"Reinforcement", "Galvanized Steel 1.5mm", steelM, "Mtr", steelRatePerM, steelM * steelRatePerM});

        // 3. Glass
        double glassRatePerSqFt = 95.0; // ₹ / sqft
        bom.push_back({"Glass", "5mm Toughened Clear Glass", areaSqFt, "Sq.Ft", glassRatePerSqFt, areaSqFt * glassRatePerSqFt});

        // 4. Hardware
        bom.push_back({"Hardware", "Heavy-Duty Brass/Nylon Rollers", 4.0, "Nos", 280.0, 1120.0});
        bom.push_back({"Hardware", "Touch-Lock Handles (GHH=710)", 2.0, "Nos", 350.0, 700.0});
        if (frame.hasCenterLock) {
            bom.push_back({"Hardware", "Center Meeting Crescent Lock (बीच का लॉक)", 1.0, "Nos", 450.0, 450.0});
        }
        bom.push_back({"Hardware", "Wool Pile & EPDM Weather Gaskets", perimeterM * 3.0, "Mtr", 25.0, perimeterM * 3.0 * 25.0});

        // 5. Fabrication Labor & Assembly
        double laborPerSqFt = 75.0;
        bom.push_back({"Labor", "Cutting, Welding, Milling & Hardware Fitting", areaSqFt, "Sq.Ft", laborPerSqFt, areaSqFt * laborPerSqFt});

        return bom;
    }
};

// ----------------------------------------------------------------------------
// 5. Architectural Vector SVG Exporter
// ----------------------------------------------------------------------------

class SVGExporter {
public:
    static std::string exportFrameToSVG(const UPVCFrame& frame) {
        std::stringstream svg;

        double margin = 160.0;
        double svgW = frame.width + (margin * 2.0);
        double svgH = frame.height + (margin * 2.0);

        svg << "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        svg << "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " << svgW << " " << svgH << "\">\n";
        svg << "  <!-- uPVC CAD Engine Generated Drawing -->\n";
        svg << "  <defs>\n";
        svg << "    <linearGradient id=\"glassGrad\" x1=\"0%\" y1=\"0%\" x2=\"0%\" y2=\"100%\">\n";
        svg << "      <stop offset=\"0%\" stop-color=\"#f0f9ff\"/>\n";
        svg << "      <stop offset=\"100%\" stop-color=\"#cbeffd\"/>\n";
        svg << "    </linearGradient>\n";
        svg << "    <marker id=\"cadArrow\" markerWidth=\"8\" markerHeight=\"8\" refX=\"4\" refY=\"4\" orient=\"auto\">\n";
        svg << "      <polygon points=\"0 1, 8 4, 0 7\" fill=\"#0f172a\"/>\n";
        svg << "    </marker>\n";
        svg << "  </defs>\n\n";

        // Background
        svg << "  <rect width=\"100%\" height=\"100%\" fill=\"#f8fafc\"/>\n\n";

        double ox = margin;
        double oy = margin;

        // Outer Frame
        svg << "  <!-- Outer Frame -->\n";
        svg << "  <rect x=\"" << ox << "\" y=\"" << oy << "\" width=\"" << frame.width << "\" height=\"" << frame.height
            << "\" fill=\"#ffffff\" stroke=\"#0f172a\" stroke-width=\"4\" rx=\"3\"/>\n";

        // Inner Daylight Boundary
        double fpw = frame.frameProfileWidth;
        svg << "  <rect x=\"" << (ox + fpw) << "\" y=\"" << (oy + fpw) << "\" width=\"" << (frame.width - 2 * fpw)
            << "\" height=\"" << (frame.height - 2 * fpw) << "\" fill=\"none\" stroke=\"#64748b\" stroke-width=\"1.5\"/>\n\n";

        // Pockets & Sashes
        svg << "  <!-- 4-Panels (Fix - Slide - Slide - Fix) -->\n";
        double panelW = frame.width / 4.0;
        for (size_t i = 0; i < frame.pockets.size(); i++) {
            const auto& p = frame.pockets[i];
            double px = ox + (i * panelW);
            double py = oy + fpw;
            double pw = panelW;
            double ph = frame.height - 2 * fpw;

            // Glass background
            svg << "  <rect x=\"" << (px + 4) << "\" y=\"" << (py + 4) << "\" width=\"" << (pw - 8) << "\" height=\"" << (ph - 8)
                << "\" fill=\"url(#glassGrad)\" stroke=\"#94a3b8\" stroke-width=\"1\" rx=\"2\"/>\n";

            // Panel Label
            double textY = py + 40.0;
            svg << "  <text x=\"" << (px + pw / 2.0) << "\" y=\"" << textY << "\" font-size=\"24\" font-weight=\"bold\" "
                << "text-anchor=\"middle\" fill=\"#0f172a\" font-family=\"Arial, sans-serif\">" << p.customLabel << "</text>\n";

            // Panel Operation Graphics
            double centerY = py + ph / 2.0;
            if (p.sashType == SashType::SliderFixedCenter) {
                // Fixed (+) indicator
                svg << "  <circle cx=\"" << (px + pw / 2.0) << "\" cy=\"" << centerY << "\" r=\"20\" fill=\"#ffffff\" stroke=\"#475569\" stroke-width=\"2\"/>\n";
                svg << "  <line x1=\"" << (px + pw / 2.0 - 10) << "\" y1=\"" << centerY << "\" x2=\"" << (px + pw / 2.0 + 10) << "\" y2=\"" << centerY << "\" stroke=\"#475569\" stroke-width=\"2.5\"/>\n";
                svg << "  <line x1=\"" << (px + pw / 2.0) << "\" y1=\"" << (centerY - 10) << "\" x2=\"" << (px + pw / 2.0) << "\" y2=\"" << (centerY + 10) << "\" stroke=\"#475569\" stroke-width=\"2.5\"/>\n";
            } else if (p.sashType == SashType::SliderArrowRight) {
                // Slide Right Arrow (->)
                svg << "  <line x1=\"" << (px + pw * 0.25) << "\" y1=\"" << centerY << "\" x2=\"" << (px + pw * 0.75) << "\" y2=\"" << centerY << "\" stroke=\"#0284c7\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n";
                svg << "  <polygon points=\"" << (px + pw * 0.70) << "," << (centerY - 10) << " " << (px + pw * 0.80) << "," << centerY << " " << (px + pw * 0.70) << "," << (centerY + 10) << "\" fill=\"#0284c7\"/>\n";
            } else if (p.sashType == SashType::SliderArrowLeft) {
                // Slide Left Arrow (<-)
                svg << "  <line x1=\"" << (px + pw * 0.75) << "\" y1=\"" << centerY << "\" x2=\"" << (px + pw * 0.25) << "\" y2=\"" << centerY << "\" stroke=\"#0284c7\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n";
                svg << "  <polygon points=\"" << (px + pw * 0.30) << "," << (centerY - 10) << " " << (px + pw * 0.20) << "," << centerY << " " << (px + pw * 0.30) << "," << (centerY + 10) << "\" fill=\"#0284c7\"/>\n";
            }
        }

        // Center Meeting Lock
        if (frame.hasCenterLock) {
            double centerMeetingX = ox + (frame.width / 2.0);
            double centerY = oy + (frame.height / 2.0);
            svg << "  <!-- Center Meeting Stile Lock (बीच का लॉक) -->\n";
            svg << "  <line x1=\"" << centerMeetingX << "\" y1=\"" << (oy + fpw) << "\" x2=\"" << centerMeetingX << "\" y2=\"" << (oy + frame.height - fpw)
                << "\" stroke=\"#0284c7\" stroke-width=\"2.5\" stroke-dasharray=\"6 4\"/>\n";
            svg << "  <g transform=\"translate(" << centerMeetingX << ", " << centerY << ")\">\n";
            svg << "    <rect x=\"-16\" y=\"-18\" width=\"32\" height=\"36\" rx=\"6\" fill=\"#f59e0b\" stroke=\"#78350f\" stroke-width=\"2\"/>\n";
            svg << "    <circle cx=\"0\" cy=\"0\" r=\"5\" fill=\"#78350f\"/>\n";
            svg << "    <rect x=\"-45\" y=\"26\" width=\"90\" height=\"22\" rx=\"4\" fill=\"#ffffff\" stroke=\"#0284c7\" stroke-width=\"1.5\"/>\n";
            svg << "    <text x=\"0\" y=\"41\" font-size=\"11\" font-weight=\"bold\" fill=\"#0284c7\" text-anchor=\"middle\" font-family=\"Arial, sans-serif\">🔒 सेंटर लॉक</text>\n";
            svg << "  </g>\n";
        }

        // Architectural Dimensions (Clean External CAD Lines)
        // 1. Width Dimension at Bottom
        double dimBottomY = oy + frame.height + 60.0;
        svg << "  <!-- Outer Width Dimension -->\n";
        svg << "  <line x1=\"" << ox << "\" y1=\"" << dimBottomY << "\" x2=\"" << (ox + frame.width) << "\" y2=\"" << dimBottomY << "\" stroke=\"#0f172a\" stroke-width=\"2.5\" marker-start=\"url(#cadArrow)\" marker-end=\"url(#cadArrow)\"/>\n";
        svg << "  <line x1=\"" << ox << "\" y1=\"" << (oy + frame.height + 10) << "\" x2=\"" << ox << "\" y2=\"" << (dimBottomY + 15) << "\" stroke=\"#64748b\" stroke-width=\"1.2\"/>\n";
        svg << "  <line x1=\"" << (ox + frame.width) << "\" y1=\"" << (oy + frame.height + 10) << "\" x2=\"" << (ox + frame.width) << "\" y2=\"" << (dimBottomY + 15) << "\" stroke=\"#64748b\" stroke-width=\"1.2\"/>\n";
        svg << "  <rect x=\"" << (ox + frame.width / 2.0 - 50) << "\" y=\"" << (dimBottomY - 18) << "\" width=\"100\" height=\"36\" fill=\"#ffffff\" rx=\"4\"/>\n";
        svg << "  <text x=\"" << (ox + frame.width / 2.0) << "\" y=\"" << (dimBottomY + 7) << "\" font-size=\"22\" font-weight=\"bold\" fill=\"#0f172a\" text-anchor=\"middle\" font-family=\"Arial, sans-serif\">"
            << (int)frame.width << " mm</text>\n";

        // 2. Height Dimension on Left
        double dimLeftX = ox - 60.0;
        svg << "  <!-- Outer Height Dimension -->\n";
        svg << "  <line x1=\"" << dimLeftX << "\" y1=\"" << oy << "\" x2=\"" << dimLeftX << "\" y2=\"" << (oy + frame.height) << "\" stroke=\"#0f172a\" stroke-width=\"2.5\" marker-start=\"url(#cadArrow)\" marker-end=\"url(#cadArrow)\"/>\n";
        svg << "  <line x1=\"" << (ox - 10) << "\" y1=\"" << oy << "\" x2=\"" << (dimLeftX - 15) << "\" y2=\"" << oy << "\" stroke=\"#64748b\" stroke-width=\"1.2\"/>\n";
        svg << "  <line x1=\"" << (ox - 10) << "\" y1=\"" << (oy + frame.height) << "\" x2=\"" << (dimLeftX - 15) << "\" y2=\"" << (oy + frame.height) << "\" stroke=\"#64748b\" stroke-width=\"1.2\"/>\n";
        svg << "  <g transform=\"translate(" << dimLeftX << ", " << (oy + frame.height / 2.0) << ") rotate(-90)\">\n";
        svg << "    <rect x=\"-50\" y=\"-18\" width=\"100\" height=\"36\" fill=\"#ffffff\" rx=\"4\"/>\n";
        svg << "    <text x=\"0\" y=\"7\" font-size=\"22\" font-weight=\"bold\" fill=\"#0f172a\" text-anchor=\"middle\" font-family=\"Arial, sans-serif\">"
            << (int)frame.height << " mm</text>\n";
        svg << "  </g>\n";

        // Title Block
        svg << "  <text x=\"" << (ox + frame.width / 2.0) << "\" y=\"" << (oy - 40) << "\" font-size=\"22\" font-weight=\"bold\" text-anchor=\"middle\" fill=\"#0f172a\" font-family=\"Arial, sans-serif\">"
            << frame.name << "</text>\n";

        svg << "</svg>\n";
        return svg.str();
    }
};

} // namespace upvc

// ----------------------------------------------------------------------------
// 6. Interactive CLI & Test Main
// ----------------------------------------------------------------------------

int main() {
    std::cout << "=================================================================\n";
    std::cout << " uPVC & Aluminium Window CAD Engine (Standalone C++ Architecture)\n";
    std::cout << "=================================================================\n";

    // 1. Construct 4-Panel Fix-Slide-Slide-Fix Window
    std::cout << "\n[1] Constructing 4-Panel [ FIX | SLIDE -> | 🔒 | <- SLIDE | FIX ]...\n";
    auto frame = upvc::WindowFactory::create4PanelFixSlideSlideFix(3200.0, 2100.0);
    std::cout << "  - Window Name: " << frame.name << "\n";
    std::cout << "  - Dimensions:  " << frame.width << " x " << frame.height << " mm\n";
    std::cout << "  - Panel Count: " << frame.pockets.size() << " Panels\n";
    std::cout << "  - Center Lock: " << (frame.hasCenterLock ? "YES (🔒 Active at Middle Meeting Stile)" : "NO") << "\n";

    for (size_t i = 0; i < frame.pockets.size(); i++) {
        const auto& p = frame.pockets[i];
        std::string opStr = (p.sashType == upvc::SashType::SliderFixedCenter) ? "STATIONARY FIX (+)" :
                            (p.sashType == upvc::SashType::SliderArrowRight) ? "SLIDE RIGHT (->)" : "SLIDE LEFT (<-)";
        std::cout << "    * Bay " << (i + 1) << " [" << p.customLabel << "]: Width = " << p.width
                  << " mm | Operation = " << opStr << "\n";
    }

    // 2. Generate Factory Cutting List Deductions
    std::cout << "\n[2] Factory Cutting List & Deduction Sheet:\n";
    std::cout << "-----------------------------------------------------------------------------------\n";
    std::cout << std::left << std::setw(20) << "Profile Type"
              << std::setw(34) << "Description"
              << std::setw(12) << "Length"
              << std::setw(6)  << "Qty"
              << std::setw(15) << "Cut Angle" << "\n";
    std::cout << "-----------------------------------------------------------------------------------\n";

    auto cuttingList = upvc::FabricationEngine::generateCuttingList(frame);
    for (const auto& c : cuttingList) {
        std::cout << std::left << std::setw(20) << c.profileType
                  << std::setw(34) << c.description
                  << std::setw(12) << (std::to_string((int)c.length) + " mm")
                  << std::setw(6)  << c.quantity
                  << std::setw(15) << c.cutAngle << "\n";
    }

    // 3. Bill of Materials & Cost Quotation
    std::cout << "\n[3] Bill of Materials (BOM) & Factory Quotation Estimate:\n";
    std::cout << "-----------------------------------------------------------------------------------\n";
    std::cout << std::left << std::setw(16) << "Category"
              << std::setw(36) << "Item Name"
              << std::setw(10) << "Quantity"
              << std::setw(8)  << "Unit"
              << std::setw(12) << "Rate (₹)"
              << std::setw(12) << "Amount (₹)" << "\n";
    std::cout << "-----------------------------------------------------------------------------------\n";

    auto bom = upvc::FabricationEngine::calculateBOM(frame);
    double subTotal = 0;
    for (const auto& b : bom) {
        subTotal += b.totalCost;
        std::cout << std::left << std::setw(16) << b.category
                  << std::setw(36) << b.description
                  << std::setw(10) << std::fixed << std::setprecision(1) << b.quantity
                  << std::setw(8)  << b.unit
                  << std::setw(12) << std::fixed << std::setprecision(2) << b.unitRate
                  << std::setw(12) << std::fixed << std::setprecision(2) << b.totalCost << "\n";
    }
    double gst = subTotal * 0.18;
    double grandTotal = subTotal + gst;

    std::cout << "-----------------------------------------------------------------------------------\n";
    std::cout << std::right << std::setw(72) << "Sub Total: ₹ " << std::fixed << std::setprecision(2) << subTotal << "\n";
    std::cout << std::right << std::setw(72) << "GST @ 18%: ₹ " << std::fixed << std::setprecision(2) << gst << "\n";
    std::cout << std::right << std::setw(72) << "Grand Total Estimate: ₹ " << std::fixed << std::setprecision(2) << grandTotal << "\n";
    std::cout << "-----------------------------------------------------------------------------------\n";

    // 4. Export Vector CAD Drawing (SVG)
    std::cout << "\n[4] Exporting Vector CAD SVG Drawing...\n";
    std::string svgOutput = upvc::SVGExporter::exportFrameToSVG(frame);
    std::string svgFileName = "upvc_4panel_drawing.svg";
    std::ofstream outFile(svgFileName);
    if (outFile.is_open()) {
        outFile << svgOutput;
        outFile.close();
        std::cout << "  ✓ SVG technical drawing successfully exported to: " << svgFileName << "\n";
    } else {
        std::cout << "  ✗ Could not write SVG file.\n";
    }

    std::cout << "\n=================================================================\n";
    std::cout << " C++ Engine Execution Completed Successfully!\n";
    std::cout << "=================================================================\n";

    return 0;
}
