import { UPVCProject, UPVCFrame, CouplingConnection, GlassType } from '../types/upvc';
import { CustomerRecord, CustomerDesignCardItem } from '../types/erp';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderCadElevationSvgString } from '../components/CadElevationDrawing';
import {
  calculateAssemblyBounds,
  generateCuttingSchedule,
  calculateBOM,
  DEFAULT_COLORS,
  generateProductionReports,
  resolveFramePositions,
  recalculateFramePockets,
} from './upvcCalculations';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { getGlassDisplayName } from './glassUtils';
import { calculateHandlePlacement } from './handlePlacement';

// Helper to trigger direct browser download of a Blob
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// Helper to trigger direct text/csv download
export function downloadText(filename: string, text: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(filename, blob);
}

// 1. Generate Full CAD Drawing SVG String with ISO Title Block, Dimensions, Hardware, Couplings
export function generateProjectCadSvgString(
  project: UPVCProject,
  options?: {
    excelLegibilityMode?: boolean;
    frameId?: string;
  }
): string {
  try {
    let targetFrames = project.frames || [];
    let targetCouplings = project.couplings || [];
    if (options?.frameId) {
      const single = targetFrames.find((f) => f.id === options.frameId);
      if (single) {
        targetFrames = [single];
        targetCouplings = [];
      }
    }
    const cadSvg = renderCadElevationSvgString({
      frames: targetFrames,
      couplings: targetCouplings,
      showDimensions: true,
      showLabels: true,
      showHandles: true,
      showArrows: true,
      isExport: true,
      excelLegibilityMode: options?.excelLegibilityMode,
    });
    if (cadSvg && cadSvg.length > 100) {
      return cadSvg;
    }
  } catch (err) {
    console.warn('renderCadElevationSvgString failed in generateProjectCadSvgString:', err);
  }

  const bounds = calculateAssemblyBounds(project.frames || []);
  const minX = bounds.minX - 100;
  const minY = bounds.minY - 100;
  const totalW = bounds.totalWidth + 200;
  const totalH = bounds.totalHeight + 200;

  const framesSvg = (project.frames || [])
    .map((frame) => {
      const fpw = frame.frameProfileWidth || 60;
      const mpw = frame.mullionProfileWidth || 74;
      const colorObj = DEFAULT_COLORS.find((c) => c.id === frame.color) || DEFAULT_COLORS[0];
      const frameColor = colorObj.hex;

      // Mullions
      const mullionsSvg = (frame.mullions || [])
        .map((m) => {
          const isVert = m.orientation === 'vertical';
          const mW = isVert ? (m.width || mpw) : frame.width - 2 * fpw;
          const mH = isVert ? frame.height - 2 * fpw : (m.width || mpw);
          const mX = isVert ? frame.x + m.position - (m.width || mpw) / 2 : frame.x + fpw;
          const mY = isVert ? frame.y + fpw : frame.y + m.position - (m.width || mpw) / 2;
          return `<rect x="${mX}" y="${mY}" width="${mW}" height="${mH}" fill="${frameColor}" stroke="#0f172a" stroke-width="2" />`;
        })
        .join('\n');

      // Pockets / Glass
      const pocketsSvg = (frame.pockets || [])
        .map((p, pIdx) => {
          const pX = frame.x + p.x;
          const pY = frame.y + p.y;
          const centerY = pY + p.height / 2;
          const centerX = pX + p.width / 2;
          const hp = calculateHandlePlacement(frame, p, pIdx);
          const apexY = hp.y;

          let sashSymbol = '';
          if (p.sashType === 'casement_left') {
            sashSymbol = `<polygon points="${pX + p.width - 8},${pY + 8} ${pX + 8},${apexY} ${pX + p.width - 8},${pY + p.height - 8}" fill="none" stroke="#0284c7" stroke-width="2" stroke-dasharray="6 4" />`;
          } else if (p.sashType === 'casement_right') {
            sashSymbol = `<polygon points="${pX + 8},${pY + 8} ${pX + p.width - 8},${apexY} ${pX + 8},${pY + p.height - 8}" fill="none" stroke="#0284c7" stroke-width="2" stroke-dasharray="6 4" />`;
          } else if (p.sashType === 'top_hung') {
            sashSymbol = `<polygon points="${pX + 8},${pY + 8} ${centerX},${pY + p.height - 8} ${pX + p.width - 8},${pY + 8}" fill="none" stroke="#0284c7" stroke-width="2" stroke-dasharray="6 4" />`;
          } else if (p.sashType === 'bottom_hung') {
            sashSymbol = `<polygon points="${pX + 8},${pY + p.height - 8} ${centerX},${pY + 8} ${pX + p.width - 8},${pY + p.height - 8}" fill="none" stroke="#0284c7" stroke-width="2" stroke-dasharray="6 4" />`;
          } else if (p.sashType?.startsWith('slider') || p.sashType?.includes('sliding')) {
            sashSymbol = `
              <line x1="${centerX}" y1="${pY}" x2="${centerX}" y2="${pY + p.height}" stroke="#0284c7" stroke-width="2" />
              <path d="M ${pX + p.width * 0.25} ${centerY} L ${pX + p.width * 0.4} ${centerY} M ${pX + p.width * 0.35} ${centerY - 5} L ${pX + p.width * 0.4} ${centerY} L ${pX + p.width * 0.35} ${centerY + 5}" stroke="#0284c7" stroke-width="2" fill="none" />
              <path d="M ${pX + p.width * 0.75} ${centerY} L ${pX + p.width * 0.6} ${centerY} M ${pX + p.width * 0.65} ${centerY - 5} L ${pX + p.width * 0.6} ${centerY} L ${pX + p.width * 0.65} ${centerY + 5}" stroke="#0284c7" stroke-width="2" fill="none" />
            `;
          }

          // Georgian Bar Grid in Fallback
          let georgianSvg = '';
          const gPattern = p.georgianBar?.pattern || p.gridPattern || (frame as any)?.georgianBar?.pattern;
          if (gPattern && gPattern !== 'none') {
            const cfg = p.georgianBar || (frame as any)?.georgianBar;
            const barCol = cfg?.color === 'white' ? '#ffffff' : cfg?.color === 'black' ? '#18181b' : cfg?.color === 'silver' ? '#cbd5e1' : cfg?.color === 'bronze' ? '#78350f' : '#f59e0b';
            const bThick = Math.max(2, Math.round((cfg?.barWidth || 18) * 0.15));
            const cols = cfg?.cols || (gPattern === 'georgian_3x3' || gPattern === 'georgian_3x2' ? 3 : 2);
            const rows = cfg?.rows || (gPattern === 'georgian_3x3' || gPattern === 'georgian_2x3' ? 3 : 2);
            const gLines: string[] = [];
            for (let c = 1; c < cols; c++) {
              const lx = pX + (c * p.width) / cols;
              gLines.push(`<line x1="${lx}" y1="${pY}" x2="${lx}" y2="${pY + p.height}" stroke="${barCol}" stroke-width="${bThick}" />`);
            }
            for (let r = 1; r < rows; r++) {
              const ly = pY + (r * p.height) / rows;
              gLines.push(`<line x1="${pX}" y1="${ly}" x2="${pX + p.width}" y2="${ly}" stroke="${barCol}" stroke-width="${bThick}" />`);
            }
            georgianSvg = gLines.join('\n');
          }

          return `
            <g id="pocket-${p.id}">
              <rect x="${pX}" y="${pY}" width="${p.width}" height="${p.height}" fill="#e0f2fe" stroke="#334155" stroke-width="1.5" opacity="0.95" />
              ${georgianSvg}
              ${sashSymbol}
              <text x="${centerX}" y="${centerY - 10}" font-size="12" font-family="sans-serif" font-weight="bold" fill="#0f172a" text-anchor="middle">${(p.sashType || 'Fixed').toUpperCase().replace(/_/g, ' ')}</text>
              <text x="${centerX}" y="${centerY + 14}" font-size="10" font-family="sans-serif" fill="#475569" text-anchor="middle">${Math.round(p.width)} × ${Math.round(p.height)} mm</text>
            </g>
          `;
        })
        .join('\n');

      return `
        <g id="frame-${frame.id}">
          <!-- Outer Profile -->
          <rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" fill="${frameColor}" stroke="#0f172a" stroke-width="4" />
          <!-- Inner Pocket Zone -->
          <rect x="${frame.x + fpw}" y="${frame.y + fpw}" width="${frame.width - 2 * fpw}" height="${frame.height - 2 * fpw}" fill="#f1f5f9" stroke="#0f172a" stroke-width="1.5" />
          ${pocketsSvg}
          ${mullionsSvg}
          <!-- Frame Width Callout Badge -->
          <g transform="translate(${frame.x + frame.width / 2}, ${frame.y - 25})">
            <rect x="-45" y="-14" width="90" height="28" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="2" />
            <text x="0" y="5" font-size="14" font-weight="900" font-family="sans-serif" fill="#0f172a" text-anchor="middle">${Math.round(frame.width)} mm</text>
          </g>
          <!-- Frame Height Callout Badge (Horizontal) -->
          <g transform="translate(${frame.x - 48}, ${frame.y + frame.height / 2})">
            <rect x="-45" y="-14" width="90" height="28" rx="6" fill="#ffffff" stroke="#0f172a" stroke-width="2" />
            <text x="0" y="5" font-size="13" font-weight="900" font-family="sans-serif" fill="#0f172a" text-anchor="middle">${Math.round(frame.height)} mm</text>
          </g>
        </g>
      `;
    })
    .join('\n');

  // Couplers
  const couplersSvg = (project.couplings || [])
    .map((c) => {
      const src = (project.frames || []).find((f) => f.id === c.sourceFrameId);
      const tgt = (project.frames || []).find((f) => f.id === c.targetFrameId);
      if (!src || !tgt) return '';
      const gap = c.gap || 2;
      return `
        <rect x="${src.x + src.width}" y="${Math.min(src.y, tgt.y)}" width="${gap}" height="${Math.max(src.height, tgt.height)}" fill="#f59e0b" />
        <text x="${src.x + src.width + gap / 2}" y="${Math.min(src.y, tgt.y) - 15}" font-size="11" font-weight="bold" fill="#d97706" font-family="sans-serif" text-anchor="middle">2mm Coupler</text>
      `;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${totalW} ${totalH}" width="100%" height="100%">
  <defs>
    <style>
      text { font-family: 'Segoe UI', Arial, sans-serif; }
    </style>
  </defs>
  <!-- Background -->
  <rect x="${minX}" y="${minY}" width="${totalW}" height="${totalH}" fill="#ffffff" />
  
  <!-- Grid pattern hint -->
  <g opacity="0.15">
    <line x1="${minX}" y1="${bounds.minY}" x2="${minX + totalW}" y2="${bounds.minY}" stroke="#94a3b8" stroke-dasharray="4 4" />
    <line x1="${bounds.minX}" y1="${minY}" x2="${bounds.minX}" y2="${minY + totalH}" stroke="#94a3b8" stroke-dasharray="4 4" />
  </g>

  <!-- Frames & Couplings -->
  ${couplersSvg}
  ${framesSvg}

  <!-- Title Block at Bottom Right -->
  <g transform="translate(${bounds.minX}, ${bounds.minY + bounds.totalHeight + 50})">
    <rect x="0" y="0" width="${bounds.totalWidth}" height="70" fill="#f8fafc" stroke="#0f172a" stroke-width="2" rx="4" />
    <text x="15" y="24" font-size="14" font-weight="bold" fill="#0f172a">PROJECT: ${project.name || 'UPVC Window Plan'}</text>
    <text x="15" y="44" font-size="11" fill="#475569">CLIENT: ${project.clientName || 'Standard Client'} | NO: ${project.referenceNo || 'UPVC-2026'}</text>
    <text x="15" y="60" font-size="10" fill="#64748b">DATE: ${project.date || new Date().toISOString().split('T')[0]} | TOTAL: ${bounds.totalWidth} mm (W) × ${bounds.totalHeight} mm (H)</text>
  </g>
</svg>`;
}

// 2. Download SVG File
export function downloadCadSvg(project: UPVCProject, filename?: string) {
  const svgContent = generateProjectCadSvgString(project);
  const name = filename || `${(project.name || 'UPVC_CAD_Drawing').replace(/\s+/g, '_')}_${Date.now()}.svg`;
  downloadText(name, svgContent, 'image/svg+xml;charset=utf-8');
}

// 3. Ultra-HD Vector-to-PNG Rasterization Engine (300 DPI / 3600px+)
/**
 * Converts any SVG string into an Ultra-HD (3600px+ / 300 DPI) PNG Blob
 * with high geometric precision, crisp typography, and preserved aspect ratio.
 * Resolves the issue where text/dimensions become blurry when inserted into Excel.
 */
export async function convertSvgStringToUltraHdPngBlob(
  svgString: string,
  preferredMaxDim = 3600
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      // 1. Extract or determine viewBox to preserve exact aspect ratio
      let vbW = 1200;
      let vbH = 900;
      const vbMatch = svgString.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
      if (vbMatch) {
        vbW = Math.abs(parseFloat(vbMatch[3])) || 1200;
        vbH = Math.abs(parseFloat(vbMatch[4])) || 900;
      }

      const aspect = vbW / Math.max(1, vbH);
      let targetW = preferredMaxDim;
      let targetH = Math.round(targetW / aspect);

      if (aspect < 0.7) {
        // Very tall assembly (e.g. doors)
        targetH = preferredMaxDim;
        targetW = Math.round(targetH * aspect);
      }

      targetW = Math.max(1600, Math.min(4800, targetW));
      targetH = Math.max(1200, Math.min(4800, targetH));

      // 2. Inject explicit width and height into root <svg> tag so the browser rasterizer
      // allocates full pixel resolution instead of the 300x150 default
      let enhancedSvg = svgString;

      enhancedSvg = enhancedSvg.replace(
        /<svg\b([^>]*)/i,
        (_match, attrs) => {
          const cleanAttrs = attrs
            .replace(/\bwidth=["'][^"']*["']/gi, '')
            .replace(/\bheight=["'][^"']*["']/gi, '');
          return `<svg width="${targetW}" height="${targetH}" ${cleanAttrs}`;
        }
      );

      // Inject crisp vector styling for maximum legibility when scaled
      const styleInjection = `
        <style>
          text {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-weight: 900 !important;
            text-rendering: geometricPrecision !important;
            shape-rendering: geometricPrecision !important;
          }
        </style>
      `;
      if (enhancedSvg.includes('<defs>')) {
        enhancedSvg = enhancedSvg.replace('<defs>', `<defs>${styleInjection}`);
      } else {
        enhancedSvg = enhancedSvg.replace(/<svg\b([^>]*)>/i, `<svg$1><defs>${styleInjection}</defs>`);
      }

      const blob = new Blob([enhancedSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(null);
      }, 4500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.drawImage(img, 0, 0, targetW, targetH);
            canvas.toBlob((pngBlob) => {
              URL.revokeObjectURL(url);
              resolve(pngBlob);
            }, 'image/png');
            return;
          }
        } catch (e) {
          console.warn('Canvas export failed:', e);
        }
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.onerror = (e) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        console.warn('SVG image load error for Ultra HD PNG:', e);
        resolve(null);
      };

      img.src = url;
    } catch (err) {
      console.warn('convertSvgStringToUltraHdPngBlob error:', err);
      resolve(null);
    }
  });
}

/**
 * Downloads a crisp Ultra-HD (3600px / 300 DPI) CAD Elevation PNG for printing,
 * client presentations, or embedding into Microsoft Excel without blurry text.
 */
export async function downloadCadPng(
  project: UPVCProject,
  filename?: string,
  options?: { excelLegibilityMode?: boolean; frameId?: string }
): Promise<boolean> {
  try {
    const svgString = generateProjectCadSvgString(project, options);
    const pngBlob = await convertSvgStringToUltraHdPngBlob(svgString, 3600);
    if (pngBlob) {
      const name =
        filename ||
        `${(project.name || 'UPVC_CAD_Drawing').replace(/\s+/g, '_')}_${Date.now()}.png`;
      downloadBlob(name, pngBlob);
      return true;
    }
  } catch (err) {
    console.warn('downloadCadPng failed:', err);
  }
  return false;
}

/**
 * Copies the Ultra-HD CAD Elevation directly to the user's system clipboard as a PNG image.
 * The user can immediately press Ctrl+V in Excel to paste the crystal-clear CAD drawing!
 */
export async function copyCadPngToClipboard(
  project: UPVCProject,
  options?: { excelLegibilityMode?: boolean; frameId?: string }
): Promise<boolean> {
  try {
    const svgString = generateProjectCadSvgString(project, options);
    const pngBlob = await convertSvgStringToUltraHdPngBlob(svgString, 3600);
    if (!pngBlob) return false;

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob,
        }),
      ]);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('copyCadPngToClipboard failed:', err);
    return false;
  }
}

/**
 * Generates a clean, factory-grade vector SVG string for a single design or window.
 * Contains outer profile, mullions, sashes, opening arrows, witness lines, and dimensions.
 */
export function generateDesignElevationCadSvgString(design: CustomerDesignCardItem): string {
  // 1. Resolve raw frames & couplings
  let rawFrames: UPVCFrame[] = [];
  let couplings: CouplingConnection[] = [];

  if (design.projectData?.frames && design.projectData.frames.length > 0) {
    rawFrames = design.projectData.frames;
    couplings = design.projectData.couplings || [];
  } else {
    // High-accuracy fallback
    const isSlider = design.type === 'Sliding' || design.seriesName?.toLowerCase().includes('sliding');
    const fW = design.width || 1200;
    const fH = design.height || 1200;

    const fallbackFrame: UPVCFrame = {
      id: `f-${design.id || 'export'}`,
      name: design.tag || 'Window',
      x: 0,
      y: 0,
      width: fW,
      height: fH,
      frameProfileWidth: 60,
      mullionProfileWidth: 74,
      sashProfileWidth: 60,
      color: design.profileColor || 'white',
      series: (design.seriesName?.includes('sliding') || isSlider ? 'sliding_62' : 'casement_60') as UPVCFrame['series'],
      mullions: isSlider ? [{ id: 'mul-center', orientation: 'vertical', position: Math.round(fW / 2) }] : [],
      pockets: [],
      reinforcement: 'steel_1.5mm',
      drainageCaps: true,
    };

    fallbackFrame.pockets = recalculateFramePockets(fallbackFrame).map((pkt, idx) => ({
      ...pkt,
      sashType: isSlider
        ? (idx === 0 ? 'slider_arrow_right' : 'slider_arrow_left')
        : (design.type === 'Fixed' ? 'fixed' : (idx % 2 === 0 ? 'casement_left' : 'casement_right')),
      glassType: ((design.glassType as GlassType) || 'clear_6mm'),
    }));

    rawFrames = [fallbackFrame];
  }

  // Use the full architectural CAD elevation renderer from CadElevationDrawing
  const tag = design.tag || 'W1';
  const typeName = (design.type || 'Window').replace(/_/g, ' ');
  const dimText = `${Math.round(design.width || 1200)} × ${Math.round(design.height || 1200)} mm`;
  const exportTitle = `${tag} • ${typeName} • ${dimText}`;

  try {
    const cadSvg = renderCadElevationSvgString({
      frames: rawFrames,
      couplings,
      showDimensions: true,
      showLabels: false,
      showHandles: true,
      showArrows: true,
      isExport: true,
    });
    if (cadSvg && cadSvg.length > 100) {
      return cadSvg;
    }
  } catch (err) {
    console.warn('renderCadElevationSvgString failed, falling back to manual SVG:', err);
  }

  // Resolve multi-frame positions with 2mm couplers for manual fallback
  const positionedFrames = resolveFramePositions(rawFrames, couplings);
  const activeFrames: UPVCFrame[] = positionedFrames.map((f) => {
    const pockets = f.pockets && f.pockets.length > 0 ? f.pockets : recalculateFramePockets(f);
    return { ...f, pockets };
  });

  const bounds = calculateAssemblyBounds(activeFrames);
  const totalW = bounds.totalWidth || design.width || 1200;
  const totalH = bounds.totalHeight || design.height || 1200;

  const maxSpan = Math.max(totalW, totalH, 500);
  const scale = Math.max(0.9, maxSpan / 850);
  const dimFontSize = Math.max(46, Math.min(108, Math.round(maxSpan * 0.062)));

  // Margin for external dimensions (Left Height + Bottom Width)
  const dimMarginLeft = Math.max(90, Math.round(dimFontSize * 1.35));
  const bottomGap = Math.max(125, Math.round(dimFontSize * 1.4));
  const dimMarginBottom = bottomGap + Math.max(65, Math.round(dimFontSize * 0.75)) + 30;
  const dimMarginTop = 25;
  const dimMarginRight = 25;

  const minX = bounds.minX - dimMarginLeft;
  const minY = bounds.minY - dimMarginTop;
  const viewW = totalW + dimMarginLeft + dimMarginRight;
  const viewH = totalH + dimMarginTop + dimMarginBottom;

  // Profile Colors
  const primaryFrame = activeFrames[0];
  const colorObj = DEFAULT_COLORS.find((c) => c.id === primaryFrame?.color) || DEFAULT_COLORS[0];
  const frameColorHex = colorObj.hex;
  const isDark = primaryFrame?.color === 'anthracite' || primaryFrame?.color === 'black' || primaryFrame?.color === 'dark_oak' || primaryFrame?.color === 'walnut';
  const mitreStroke = isDark ? '#94a3b8' : '#334155';

  // Dimension coordinates
  const dimY = bounds.maxY + bottomGap;
  const dimX = bounds.minX - dimMarginLeft * 0.52;
  const arrowW = Math.max(6, Math.min(18, Math.round(9 * scale)));
  const arrowH = Math.max(14, Math.min(42, Math.round(20 * scale)));

  const valWStr = `${Math.round(totalW)}`;
  const textW_W = valWStr.length * dimFontSize * 0.65 + 16;
  const textW_H = dimFontSize * 1.25;

  const valHStr = `${Math.round(totalH)}`;
  const textH_W = valHStr.length * dimFontSize * 0.65 + 16;
  const textH_H = dimFontSize * 1.25;

  let svgBody = `
    <!-- Canvas White Background -->
    <rect x="${minX}" y="${minY}" width="${viewW}" height="${viewH}" fill="#ffffff" />

    <!-- 1. Left Height Dimension (Rotated 90 degrees) -->
    <g id="dim-left">
      <line x1="${bounds.minX}" y1="${bounds.minY}" x2="${bounds.minX - dimMarginLeft * 0.85}" y2="${bounds.minY}" stroke="#94a3b8" stroke-width="${Math.max(1.5, 2 * scale)}" stroke-dasharray="5 3" />
      <line x1="${bounds.minX}" y1="${bounds.maxY}" x2="${bounds.minX - dimMarginLeft * 0.85}" y2="${bounds.maxY}" stroke="#94a3b8" stroke-width="${Math.max(1.5, 2 * scale)}" stroke-dasharray="5 3" />
      <line x1="${dimX}" y1="${bounds.minY}" x2="${dimX}" y2="${bounds.maxY}" stroke="#0f172a" stroke-width="${Math.max(2, 2.8 * scale)}" />
      <polygon points="${dimX},${bounds.minY} ${dimX - arrowW},${bounds.minY + arrowH} ${dimX + arrowW},${bounds.minY + arrowH}" fill="#0f172a" />
      <polygon points="${dimX},${bounds.maxY} ${dimX - arrowW},${bounds.maxY - arrowH} ${dimX + arrowW},${bounds.maxY - arrowH}" fill="#0f172a" />
      <g transform="translate(${dimX}, ${(bounds.minY + bounds.maxY) / 2}) rotate(-90)">
        <rect x="${-textH_W / 2}" y="${-textH_H / 2}" width="${textH_W}" height="${textH_H}" fill="#ffffff" />
        <text x="0" y="${dimFontSize * 0.35}" text-anchor="middle" fill="#0f172a" font-size="${dimFontSize}" font-weight="900" font-family="ui-sans-serif, system-ui, sans-serif">${valHStr}</text>
      </g>
    </g>

    <!-- 2. Bottom Width Dimension (Horizontal) -->
    <g id="dim-bottom">
      <line x1="${bounds.minX}" y1="${bounds.maxY + 4}" x2="${bounds.minX}" y2="${dimY + Math.max(14, 18 * scale)}" stroke="#94a3b8" stroke-width="${Math.max(1.5, 2 * scale)}" stroke-dasharray="5 3" />
      <line x1="${bounds.maxX}" y1="${bounds.maxY + 4}" x2="${bounds.maxX}" y2="${dimY + Math.max(14, 18 * scale)}" stroke="#94a3b8" stroke-width="${Math.max(1.5, 2 * scale)}" stroke-dasharray="5 3" />
      <line x1="${bounds.minX}" y1="${dimY}" x2="${bounds.maxX}" y2="${dimY}" stroke="#0f172a" stroke-width="${Math.max(2, 2.8 * scale)}" />
      <polygon points="${bounds.minX},${dimY} ${bounds.minX + arrowH},${dimY - arrowW} ${bounds.minX + arrowH},${dimY + arrowW}" fill="#0f172a" />
      <polygon points="${bounds.maxX},${dimY} ${bounds.maxX - arrowH},${dimY - arrowW} ${bounds.maxX - arrowH},${dimY + arrowW}" fill="#0f172a" />
      <g transform="translate(${(bounds.minX + bounds.maxX) / 2}, ${dimY})">
        <rect x="${-textW_W / 2}" y="${-textW_H / 2}" width="${textW_W}" height="${textW_H}" fill="#ffffff" />
        <text x="0" y="${dimFontSize * 0.35}" text-anchor="middle" fill="#0f172a" font-size="${dimFontSize}" font-weight="900" font-family="ui-sans-serif, system-ui, sans-serif">${valWStr}</text>
      </g>
    </g>
  `;

  // 3. Couplers if present
  couplings.forEach((c) => {
    const src = activeFrames.find((f) => f.id === c.sourceFrameId);
    const tgt = activeFrames.find((f) => f.id === c.targetFrameId);
    if (!src || !tgt) return;
    const isHorizontal = c.direction === 'horizontal' || src.x !== tgt.x;
    const gap = c.gap || 2;
    const cX = isHorizontal ? src.x + src.width : Math.min(src.x, tgt.x);
    const cY = isHorizontal ? Math.min(src.y, tgt.y) : src.y + src.height;
    const cW = isHorizontal ? gap : Math.max(src.width, tgt.width);
    const cH = isHorizontal ? Math.max(src.height, tgt.height) : gap;

    svgBody += `
      <rect x="${cX}" y="${cY}" width="${cW}" height="${cH}" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" />
    `;
  });

  // 4. Frames, Mullions, Pockets
  activeFrames.forEach((f) => {
    const fpw = f.frameProfileWidth || 60;
    const mpw = f.mullionProfileWidth || 74;

    // Outer profile
    svgBody += `
      <rect x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" fill="${frameColorHex}" stroke="#0f172a" stroke-width="3.5" />
      <rect x="${f.x + fpw}" y="${f.y + fpw}" width="${Math.max(0, f.width - 2 * fpw)}" height="${Math.max(0, f.height - 2 * fpw)}" fill="none" stroke="${mitreStroke}" stroke-width="1.5" />
      <!-- Mitre Joints -->
      <line x1="${f.x}" y1="${f.y}" x2="${f.x + fpw}" y2="${f.y + fpw}" stroke="${mitreStroke}" stroke-width="1.5" />
      <line x1="${f.x + f.width}" y1="${f.y}" x2="${f.x + f.width - fpw}" y2="${f.y + fpw}" stroke="${mitreStroke}" stroke-width="1.5" />
      <line x1="${f.x}" y1="${f.y + f.height}" x2="${f.x + fpw}" y2="${f.y + f.height - fpw}" stroke="${mitreStroke}" stroke-width="1.5" />
      <line x1="${f.x + f.width}" y1="${f.y + f.height}" x2="${f.x + f.width - fpw}" y2="${f.y + f.height - fpw}" stroke="${mitreStroke}" stroke-width="1.5" />
    `;

    // Mullions
    (f.mullions || []).forEach((m) => {
      const isVert = m.orientation === 'vertical';
      const mW = isVert ? (m.width || mpw) : f.width - 2 * fpw;
      const mH = isVert ? f.height - 2 * fpw : (m.width || mpw);
      const mX = isVert ? f.x + m.position - (m.width || mpw) / 2 : f.x + fpw;
      const mY = isVert ? f.y + fpw : f.y + m.position - (m.width || mpw) / 2;
      svgBody += `
        <rect x="${mX}" y="${mY}" width="${mW}" height="${mH}" fill="${frameColorHex}" stroke="#0f172a" stroke-width="2.5" />
      `;
    });

    // Pockets
    (f.pockets || []).forEach((p, pIdx) => {
      const pX = f.x + p.x;
      const pY = f.y + p.y;
      const pW = p.width;
      const pH = p.height;
      const centerX = pX + pW / 2;
      const centerY = pY + pH / 2;
      const hp = calculateHandlePlacement(f, p, pIdx);
      const apexY = hp.y;

      let symbolSvg = '';
      const sashType = (p.sashType || 'fixed').toLowerCase();

      const isOpenable = sashType.includes('casement') || sashType.includes('hung') || sashType.includes('tilt') || sashType.includes('french');
      const isSlider = sashType.includes('slider') || sashType.includes('slide');

      if (sashType.includes('casement_left')) {
        symbolSvg = `
          <!-- Casement Left Swing Dash Triangle -->
          <polygon points="${pX + pW - 12},${pY + 12} ${pX + 12},${apexY} ${pX + pW - 12},${pY + pH - 12}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="7 4" />
        `;
      } else if (sashType.includes('casement_right')) {
        symbolSvg = `
          <!-- Casement Right Swing Dash Triangle -->
          <polygon points="${pX + 12},${pY + 12} ${pX + pW - 12},${apexY} ${pX + 12},${pY + pH - 12}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="7 4" />
        `;
      } else if (sashType.includes('top_hung')) {
        symbolSvg = `
          <!-- Top Hung Swing Dash Triangle -->
          <polygon points="${pX + 12},${pY + 12} ${centerX},${pY + pH - 12} ${pX + pW - 12},${pY + 12}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="7 4" />
        `;
      } else if (sashType.includes('bottom_hung')) {
        symbolSvg = `
          <!-- Bottom Hung Swing Dash Triangle -->
          <polygon points="${pX + 12},${pY + pH - 12} ${centerX},${pY + 12} ${pX + pW - 12},${pY + pH - 12}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="7 4" />
        `;
      } else if (isSlider) {
        const isRight = sashType.includes('right');
        const arrowDir = isRight ? 1 : -1;
        const arrowSpan = Math.min(60, pW * 0.3);
        const arrowStart = centerX - arrowSpan * arrowDir;
        const arrowEnd = centerX + arrowSpan * arrowDir;
        symbolSvg = `
          <!-- Sash outline border -->
          <rect x="${pX + 8}" y="${pY + 8}" width="${pW - 16}" height="${pH - 16}" fill="none" stroke="#0284c7" stroke-width="2" />
          <!-- Sliding Arrow -->
          <line x1="${arrowStart}" y1="${centerY}" x2="${arrowEnd}" y2="${centerY}" stroke="#0284c7" stroke-width="3.5" />
          <polygon points="${arrowEnd},${centerY} ${arrowEnd - 12 * arrowDir},${centerY - 8} ${arrowEnd - 12 * arrowDir},${centerY + 8}" fill="#0284c7" />
          ${(p.hasMesh || (f as any).hasMesh || sashType === 'slider_3t_2p_mesh') ? `
          <!-- Fly Mesh Green Sliding Arrow -->
          <line x1="${arrowStart}" y1="${centerY + 24}" x2="${arrowEnd}" y2="${centerY + 24}" stroke="#059669" stroke-width="2.6" stroke-linecap="round" />
          <polygon points="${arrowEnd},${centerY + 24} ${arrowEnd - 10 * arrowDir},${centerY + 24 - 5} ${arrowEnd - 10 * arrowDir},${centerY + 24 + 5}" fill="#059669" />
          ` : ''}
        `;
      }

      // Georgian Bar / Dorgen Bar Grid SVG for this pocket
      const gPatt = p.georgianBar?.pattern || p.gridPattern;
      let georgianGridSvg = '';
      if (gPatt && gPatt !== 'none') {
        const barColor = p.georgianBar?.color === 'white' ? '#ffffff' : p.georgianBar?.color === 'black' ? '#18181b' : p.georgianBar?.color === 'silver' ? '#cbd5e1' : p.georgianBar?.color === 'bronze' ? '#78350f' : '#d97706';
        const strokeW = Math.max(2, Math.round((p.georgianBar?.barWidth || 18) * 0.16 * scale));

        // Determine glass bounding box for grid
        let targetGX = pX;
        let targetGY = pY;
        let targetGW = pW;
        let targetGH = pH;
        if (isOpenable) {
          targetGX = pX + 34; targetGY = pY + 34; targetGW = Math.max(10, pW - 68); targetGH = Math.max(10, pH - 68);
        } else if (!isSlider) {
          targetGX = pX + 16; targetGY = pY + 16; targetGW = Math.max(10, pW - 32); targetGH = Math.max(10, pH - 32);
        }

        const vLines: number[] = [];
        const hLines: number[] = [];

        if (gPatt === 'georgian_2x2') {
          vLines.push(targetGX + targetGW / 2);
          hLines.push(targetGY + targetGH / 2);
        } else if (gPatt === 'georgian_2x3') {
          vLines.push(targetGX + targetGW / 2);
          hLines.push(targetGY + targetGH / 3, targetGY + (2 * targetGH) / 3);
        } else if (gPatt === 'georgian_3x2') {
          vLines.push(targetGX + targetGW / 3, targetGX + (2 * targetGW) / 3);
          hLines.push(targetGY + targetGH / 2);
        } else if (gPatt === 'georgian_3x3') {
          vLines.push(targetGX + targetGW / 3, targetGX + (2 * targetGW) / 3);
          hLines.push(targetGY + targetGH / 3, targetGY + (2 * targetGH) / 3);
        } else if (gPatt === 'georgian_3x4') {
          vLines.push(targetGX + targetGW / 3, targetGX + (2 * targetGW) / 3);
          hLines.push(targetGY + targetGH / 4, targetGY + (2 * targetGH) / 4, targetGY + (3 * targetGH) / 4);
        } else if (gPatt === 'georgian_4x4') {
          vLines.push(targetGX + targetGW / 4, targetGX + (2 * targetGW) / 4, targetGX + (3 * targetGW) / 4);
          hLines.push(targetGY + targetGH / 4, targetGY + (2 * targetGH) / 4, targetGY + (3 * targetGH) / 4);
        } else if (gPatt === 'custom') {
          const cols = Math.max(1, p.georgianBar?.cols || 2);
          const rows = Math.max(1, p.georgianBar?.rows || 2);
          for (let c = 1; c < cols; c++) vLines.push(targetGX + (c * targetGW) / cols);
          for (let r = 1; r < rows; r++) hLines.push(targetGY + (r * targetGH) / rows);
        }

        if (gPatt === 'georgian_prairie' || gPatt === 'georgian_colonial') {
          const mX = Math.min(80, Math.max(24, Math.round(targetGW * 0.16)));
          const mY = Math.min(80, Math.max(24, Math.round(targetGH * 0.16)));
          georgianGridSvg = `
            <line x1="${targetGX + mX}" y1="${targetGY}" x2="${targetGX + mX}" y2="${targetGY + targetGH}" stroke="${barColor}" stroke-width="${strokeW}" />
            <line x1="${targetGX + targetGW - mX}" y1="${targetGY}" x2="${targetGX + targetGW - mX}" y2="${targetGY + targetGH}" stroke="${barColor}" stroke-width="${strokeW}" />
            <line x1="${targetGX}" y1="${targetGY + mY}" x2="${targetGX + targetGW}" y2="${targetGY + mY}" stroke="${barColor}" stroke-width="${strokeW}" />
            <line x1="${targetGX}" y1="${targetGY + targetGH - mY}" x2="${targetGX + targetGW}" y2="${targetGY + targetGH - mY}" stroke="${barColor}" stroke-width="${strokeW}" />
          `;
        } else if (gPatt === 'georgian_diamond') {
          const step = Math.min(90, Math.max(45, Math.round(Math.min(targetGW, targetGH) * 0.35)));
          let dLines = '';
          for (let offset = -targetGH; offset < targetGW + targetGH; offset += step) {
            dLines += `<line x1="${targetGX + offset}" y1="${targetGY}" x2="${targetGX + offset + targetGH}" y2="${targetGY + targetGH}" stroke="${barColor}" stroke-width="${strokeW}" />`;
            dLines += `<line x1="${targetGX + offset + targetGH}" y1="${targetGY}" x2="${targetGX + offset}" y2="${targetGY + targetGH}" stroke="${barColor}" stroke-width="${strokeW}" />`;
          }
          georgianGridSvg = dLines;
        } else {
          let bars = '';
          vLines.forEach((vx) => {
            bars += `<line x1="${vx}" y1="${targetGY}" x2="${vx}" y2="${targetGY + targetGH}" stroke="${barColor}" stroke-width="${strokeW}" />`;
          });
          hLines.forEach((hy) => {
            bars += `<line x1="${targetGX}" y1="${hy}" x2="${targetGX + targetGW}" y2="${hy}" stroke="${barColor}" stroke-width="${strokeW}" />`;
          });
          vLines.forEach((vx) => {
            hLines.forEach((hy) => {
              bars += `<rect x="${vx - strokeW}" y="${hy - strokeW}" width="${strokeW * 2}" height="${strokeW * 2}" fill="${barColor}" stroke="#0f172a" stroke-width="0.8" rx="1" />`;
            });
          });
          georgianGridSvg = bars;
        }
      }

      if (isOpenable) {
        // Openable Sash: Authentic White Sash Profile + Soft Beading + Center Glass
        svgBody += `
          <!-- Openable Sash Profile Frame -->
          <rect x="${pX}" y="${pY}" width="${pW}" height="${pH}" fill="#ffffff" stroke="#0f172a" stroke-width="2" />
          <!-- Glazing Beading -->
          <rect x="${pX + 24}" y="${pY + 24}" width="${Math.max(10, pW - 48)}" height="${Math.max(10, pH - 48)}" fill="#f1f5f9" stroke="#334155" stroke-width="1.2" />
          <!-- Glass Pane ONLY -->
          <rect x="${pX + 34}" y="${pY + 34}" width="${Math.max(10, pW - 68)}" height="${Math.max(10, pH - 68)}" fill="#e0f2fe" stroke="#0f172a" stroke-width="1.2" />
          ${georgianGridSvg}
          ${symbolSvg}
        `;
      } else if (isSlider) {
        // Sliding Pocket
        svgBody += `
          <!-- Glass Pane -->
          <rect x="${pX}" y="${pY}" width="${pW}" height="${pH}" fill="#e0f2fe" stroke="#334155" stroke-width="1.5" />
          ${georgianGridSvg}
          ${symbolSvg}
        `;
      } else {
        // Fixed Pocket: Beading + Center Glass
        svgBody += `
          <!-- Fixed Glazing Beading -->
          <rect x="${pX}" y="${pY}" width="${pW}" height="${pH}" fill="#f1f5f9" stroke="#0f172a" stroke-width="1.5" />
          <!-- Glass Pane ONLY -->
          <rect x="${pX + 16}" y="${pY + 16}" width="${Math.max(10, pW - 32)}" height="${Math.max(10, pH - 32)}" fill="#e0f2fe" stroke="#334155" stroke-width="1.2" />
          ${georgianGridSvg}
          ${symbolSvg}
        `;
      }
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${viewW} ${viewH}" width="100%" height="100%">
  <defs>
    <style>
      text { font-family: 'Segoe UI', Arial, sans-serif; }
    </style>
  </defs>
  ${svgBody}
</svg>`;
}

/**
 * Converts an SVG string into a high-resolution PNG data URL (base64).
 */
export function svgToPngBase64(svgString: string, width = 540, height = 360): Promise<string> {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timeoutId = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve('');
      }, 4000);

      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            resolve(dataUrl);
            return;
          }
        } catch (e) {
          console.warn('Canvas export toDataURL failed:', e);
        }
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.onerror = (e) => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(url);
        console.warn('SVG img failed to render to canvas:', e);
        resolve('');
      };

      img.src = url;
    } catch (err) {
      console.warn('svgToPngBase64 failure:', err);
      resolve('');
    }
  });
}

/**
 * Helper to calculate pocket indices string (e.g. "1,2", "1,2,3")
 */
function getDesignPocketIndices(design: CustomerDesignCardItem): string {
  const frames = design.projectData?.frames;
  if (!frames || frames.length === 0) return '1,2';
  const totalPockets = frames.reduce((acc, f) => acc + (f.pockets?.length || 0), 0);
  if (totalPockets <= 0) return '1,2';
  return Array.from({ length: totalPockets }, (_, i) => i + 1).join(',');
}

/**
 * Helper to style a cell or merged range borders in ExcelJS
 */
function setRangeBorders(
  ws: ExcelJS.Worksheet,
  startCol: number,
  endCol: number,
  startRow: number,
  endRow: number,
  borders: {
    top?: ExcelJS.BorderStyle;
    bottom?: ExcelJS.BorderStyle;
    left?: ExcelJS.BorderStyle;
    right?: ExcelJS.BorderStyle;
    color?: string;
  }
) {
  const colorArgb = borders.color || 'FF94A3B8';
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      cell.border = {
        top: r === startRow && borders.top ? { style: borders.top, color: { argb: colorArgb } } : cell.border?.top,
        bottom: r === endRow && borders.bottom ? { style: borders.bottom, color: { argb: colorArgb } } : cell.border?.bottom,
        left: c === startCol && borders.left ? { style: borders.left, color: { argb: colorArgb } } : cell.border?.left,
        right: c === endCol && borders.right ? { style: borders.right, color: { argb: colorArgb } } : cell.border?.right,
      };
    }
  }
}

/**
 * Helper to set background fill for a range
 */
function setRangeFill(
  ws: ExcelJS.Worksheet,
  startCol: number,
  endCol: number,
  startRow: number,
  endRow: number,
  colorArgb: string
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colorArgb },
      };
    }
  }
}

/**
 * Exports the Elevation Report to Excel (.xlsx) matching the EXACT visual card layout
 * seen on the website screen and in EvaWin industrial PDF format:
 * - Cover & Remarks sections (Project Data, Design Remarks)
 * - 2-Column Grid of Elevation Cards with:
 *   - "VIEW FROM INSIDE" top bar
 *   - High-resolution CAD Elevation Drawing embedded directly in the card
 *   - "▲ OUT" sill drainage orientation indicator
 *   - 3-line specifications box (Ref/Qty/Location, W/H/Area, Glass Spec)
 * - Also includes a secondary "Elevation Schedule (Table)" worksheet for data analysis.
 */
export async function exportElevationReportToExcel(
  customer: CustomerRecord,
  designs: CustomerDesignCardItem[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EvaWin CAD Elevation Engine';
  workbook.created = new Date();

  // 1. PRIMARY WORKSHEET: Exact Visual Elevation Report
  const ws = workbook.addWorksheet('Elevation Diagram Report', {
    views: [{ showGridLines: true }],
  });

  // Column Width Setup:
  // Col A: Margin (3)
  // Cols B..F: Card 1 (5 cols of 11.5 width => ~58 width, ~430px)
  // Col G: Spacer between cards (4)
  // Cols H..L: Card 2 (5 cols of 11.5 width => ~58 width, ~430px)
  // Col M: Margin (3)
  ws.columns = [
    { width: 3 },    // A: Left margin
    { width: 11.5 }, // B: Card 1 col 1
    { width: 11.5 }, // C: Card 1 col 2
    { width: 11.5 }, // D: Card 1 col 3
    { width: 11.5 }, // E: Card 1 col 4
    { width: 11.5 }, // F: Card 1 col 5
    { width: 4 },    // G: Middle spacer
    { width: 11.5 }, // H: Card 2 col 1
    { width: 11.5 }, // I: Card 2 col 2
    { width: 11.5 }, // J: Card 2 col 3
    { width: 11.5 }, // K: Card 2 col 4
    { width: 11.5 }, // L: Card 2 col 5
    { width: 3 },    // M: Right margin
  ];

  const reportCompanyName =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('cost_report_company_name') : null) ||
    customer.companyName ||
    (customer as unknown as { company?: string }).company ||
    'Shri Balaji Traders';
  const reportWebsite =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('cost_report_website') : null) ||
    'www.evawinoptimize.com';
  const projectCode = (customer as unknown as { quoteNo?: string }).quoteNo || customer.id || 'SHR-QT-00000062';
  const projectName = customer.name || 'SEC-5 P-14 F-A19';
  const dateFormatted = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
  const dateOnly = new Date().toLocaleDateString('en-GB');

  const totalQty = designs.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const totalSqFt = designs.reduce((sum, d) => {
    const areaSqM = ((d.width || 1200) * (d.height || 1200)) / 1000000;
    return sum + areaSqM * 10.7639 * (d.quantity || 1);
  }, 0);

  // Top Spacing
  ws.getRow(1).height = 10;

  // Row 2: Title & Date
  ws.mergeCells('B2:F2');
  const titleCell = ws.getCell('B2');
  titleCell.value = 'Elevation Diagram Report';
  titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells('H2:L2');
  const dateCell = ws.getCell('H2');
  dateCell.value = `Date: ${dateFormatted}`;
  dateCell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF475569' } };
  dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(2).height = 28;

  // Row 3: Project & Project Code
  ws.mergeCells('B3:F3');
  const projCell = ws.getCell('B3');
  projCell.value = `Project: ${projectName}`;
  projCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  projCell.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells('H3:L3');
  const codeCell = ws.getCell('H3');
  codeCell.value = `Project Code : ${projectCode}`;
  codeCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1D4ED8' } };
  codeCell.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(3).height = 22;

  // Row 4: Solid Deep Blue Accent Line
  ws.mergeCells('B4:L4');
  setRangeFill(ws, 2, 12, 4, 4, 'FF2563EB');
  ws.getRow(4).height = 6;

  // Row 5: Spacer
  ws.getRow(5).height = 10;

  // Row 6: Project Table Header Caption
  const caption1 = ws.getCell('B6');
  caption1.value = 'Report includes the data from projects :';
  caption1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  ws.getRow(6).height = 18;

  // Row 7: Project Table Columns Header
  ws.getCell('B7').value = 'Sl No.';
  ws.mergeCells('C7:E7');
  ws.getCell('C7').value = 'Project Name';
  ws.mergeCells('F7:H7');
  ws.getCell('F7').value = 'Project Code';
  ws.mergeCells('I7:J7');
  ws.getCell('I7').value = 'Qty';
  ws.mergeCells('K7:L7');
  ws.getCell('K7').value = 'Quote Alias';

  ['B7', 'C7', 'F7', 'I7', 'K7'].forEach((key) => {
    const c = ws.getCell(key);
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
    c.alignment = { horizontal: key === 'C7' || key === 'F7' ? 'left' : 'center', vertical: 'middle' };
  });
  setRangeFill(ws, 2, 12, 7, 7, 'FFF1F5F9');
  setRangeBorders(ws, 2, 12, 7, 7, { top: 'thin', bottom: 'thin', left: 'thin', right: 'thin', color: 'FF94A3B8' });
  ws.getRow(7).height = 20;

  // Row 8: Project Table Row
  ws.getCell('B8').value = 1;
  ws.mergeCells('C8:E8');
  ws.getCell('C8').value = projectName;
  ws.mergeCells('F8:H8');
  ws.getCell('F8').value = projectCode;
  ws.mergeCells('I8:J8');
  ws.getCell('I8').value = totalQty;
  ws.mergeCells('K8:L8');
  ws.getCell('K8').value = 'A';

  ['B8', 'C8', 'F8', 'I8', 'K8'].forEach((key) => {
    const c = ws.getCell(key);
    c.font = { name: 'Arial', size: 9.5, bold: key === 'C8' || key === 'I8', color: { argb: 'FF334155' } };
    c.alignment = { horizontal: key === 'C8' || key === 'F8' ? 'left' : 'center', vertical: 'middle' };
  });
  setRangeBorders(ws, 2, 12, 8, 8, { top: 'thin', bottom: 'thin', left: 'thin', right: 'thin', color: 'FFCBD5E1' });
  ws.getRow(8).height = 20;

  // Row 9: Spacer
  ws.getRow(9).height = 12;

  // Row 10: Remarks Table Caption
  const caption2 = ws.getCell('B10');
  caption2.value = 'Design Remarks : :';
  caption2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  ws.getRow(10).height = 18;

  // Row 11: Remarks Table Headers
  ws.mergeCells('B11:C11');
  ws.getCell('B11').value = 'Design Ref';
  ws.mergeCells('D11:E11');
  ws.getCell('D11').value = 'Remark Date';
  ws.mergeCells('F11:L11');
  ws.getCell('F11').value = 'Remarks';

  ['B11', 'D11', 'F11'].forEach((key) => {
    const c = ws.getCell(key);
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
    c.alignment = { horizontal: 'left', vertical: 'middle' };
  });
  setRangeFill(ws, 2, 12, 11, 11, 'FFF1F5F9');
  setRangeBorders(ws, 2, 12, 11, 11, { top: 'thin', bottom: 'thin', left: 'thin', right: 'thin', color: 'FF94A3B8' });
  ws.getRow(11).height = 20;

  // Remarks rows
  let currRow = 12;
  designs.forEach((d) => {
    ws.mergeCells(`B${currRow}:C${currRow}`);
    const refCell = ws.getCell(`B${currRow}`);
    refCell.value = d.tag || 'W';
    refCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1D4ED8' } };
    refCell.alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells(`D${currRow}:E${currRow}`);
    const dateRemCell = ws.getCell(`D${currRow}`);
    dateRemCell.value = dateOnly;
    dateRemCell.font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
    dateRemCell.alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells(`F${currRow}:L${currRow}`);
    const remCell = ws.getCell(`F${currRow}`);
    remCell.value = `${d.seriesName || 'Standard'} • ${(d.profileColor || 'White').toUpperCase()} • ${d.type || 'Window'}`;
    remCell.font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };
    remCell.alignment = { horizontal: 'left', vertical: 'middle' };

    setRangeBorders(ws, 2, 12, currRow, currRow, {
      top: 'thin',
      bottom: 'thin',
      left: 'thin',
      right: 'thin',
      color: 'FFE2E8F0',
    });
    ws.getRow(currRow).height = 19;
    currRow++;
  });

  // Divider row before Elevation Diagrams
  ws.getRow(currRow).height = 14;
  currRow++;

  ws.mergeCells(`B${currRow}:L${currRow}`);
  const sectionDivider = ws.getCell(`B${currRow}`);
  sectionDivider.value = 'ELEVATION DIAGRAMS (VIEW FROM INSIDE)';
  sectionDivider.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
  sectionDivider.alignment = { horizontal: 'center', vertical: 'middle' };
  setRangeFill(ws, 2, 12, currRow, currRow, 'FFEFF6FF');
  setRangeBorders(ws, 2, 12, currRow, currRow, {
    top: 'thin',
    bottom: 'thin',
    left: 'thin',
    right: 'thin',
    color: 'FFBFDBFE',
  });
  ws.getRow(currRow).height = 24;
  currRow++;

  ws.getRow(currRow).height = 14;
  currRow++;

  // -------------------------------------------------------------------
  // 2-COLUMN GRID OF ELEVATION CARDS
  // Matches EvaWin screen layout with:
  // - Top bar: "VIEW FROM INSIDE"
  // - Center: Large CAD Elevation Drawing embedded
  // - OUT Drainage indicator
  // - 3-Line specifications box
  // -------------------------------------------------------------------
  for (let pairIdx = 0; pairIdx < designs.length; pairIdx += 2) {
    const d1 = designs[pairIdx];
    const d2 = pairIdx + 1 < designs.length ? designs[pairIdx + 1] : null;

    if (onProgress) {
      onProgress(Math.min(pairIdx + 2, designs.length), designs.length);
    }

    const r = currRow;

    // === ROW r: "VIEW FROM INSIDE" Top Bar ===
    // Card 1
    ws.mergeCells(`B${r}:F${r}`);
    const vfi1 = ws.getCell(`B${r}`);
    vfi1.value = 'VIEW FROM INSIDE';
    vfi1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF475569' } };
    vfi1.alignment = { horizontal: 'center', vertical: 'middle' };
    setRangeFill(ws, 2, 6, r, r, 'FFF8FAFC');
    setRangeBorders(ws, 2, 6, r, r, { top: 'thin', bottom: 'thin', left: 'thin', right: 'thin', color: 'FF94A3B8' });

    // Card 2
    if (d2) {
      ws.mergeCells(`H${r}:L${r}`);
      const vfi2 = ws.getCell(`H${r}`);
      vfi2.value = 'VIEW FROM INSIDE';
      vfi2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF475569' } };
      vfi2.alignment = { horizontal: 'center', vertical: 'middle' };
      setRangeFill(ws, 8, 12, r, r, 'FFF8FAFC');
      setRangeBorders(ws, 8, 12, r, r, { top: 'thin', bottom: 'thin', left: 'thin', right: 'thin', color: 'FF94A3B8' });
    }
    ws.getRow(r).height = 20;

    // === ROW r+1: CAD DRAWING CANVAS (Height: 185pt ≈ 246px) ===
    ws.mergeCells(`B${r + 1}:F${r + 1}`);
    setRangeFill(ws, 2, 6, r + 1, r + 1, 'FFFFFFFF');
    setRangeBorders(ws, 2, 6, r + 1, r + 1, { left: 'thin', right: 'thin', color: 'FF94A3B8' });

    if (d2) {
      ws.mergeCells(`H${r + 1}:L${r + 1}`);
      setRangeFill(ws, 8, 12, r + 1, r + 1, 'FFFFFFFF');
      setRangeBorders(ws, 8, 12, r + 1, r + 1, { left: 'thin', right: 'thin', color: 'FF94A3B8' });
    }
    ws.getRow(r + 1).height = 185;

    // Render & Embed CAD Image for d1
    try {
      const svgStr1 = generateDesignElevationCadSvgString(d1);
      const pngBase64_1 = await svgToPngBase64(svgStr1, 720, 480);
      if (pngBase64_1) {
        const cleanBase64_1 = pngBase64_1.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageId1 = workbook.addImage({
          base64: cleanBase64_1,
          extension: 'png',
        });
        // Column B is index 1.0 (0-indexed). Centered in B..F
        ws.addImage(imageId1, {
          tl: { col: 1.15, row: r + 0.08 },
          ext: { width: 340, height: 232 },
          editAs: 'oneCell',
        });
      }
    } catch (imgErr) {
      console.warn(`CAD embed error for ${d1.tag}:`, imgErr);
    }

    // Render & Embed CAD Image for d2
    if (d2) {
      try {
        const svgStr2 = generateDesignElevationCadSvgString(d2);
        const pngBase64_2 = await svgToPngBase64(svgStr2, 720, 480);
        if (pngBase64_2) {
          const cleanBase64_2 = pngBase64_2.replace(/^data:image\/[a-z]+;base64,/, '');
          const imageId2 = workbook.addImage({
            base64: cleanBase64_2,
            extension: 'png',
          });
          // Column H is index 7.0 (0-indexed). Centered in H..L
          ws.addImage(imageId2, {
            tl: { col: 7.15, row: r + 0.08 },
            ext: { width: 340, height: 232 },
            editAs: 'oneCell',
          });
        }
      } catch (imgErr) {
        console.warn(`CAD embed error for ${d2.tag}:`, imgErr);
      }
    }

    // === ROW r+2: DRAINAGE / SILL OUT INDICATOR ===
    ws.mergeCells(`B${r + 2}:F${r + 2}`);
    const out1 = ws.getCell(`B${r + 2}`);
    out1.value = '▲   OUT';
    out1.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF64748B' } };
    out1.alignment = { horizontal: 'center', vertical: 'middle' };
    setRangeFill(ws, 2, 6, r + 2, r + 2, 'FFFFFFFF');
    setRangeBorders(ws, 2, 6, r + 2, r + 2, { left: 'thin', right: 'thin', color: 'FF94A3B8' });

    if (d2) {
      ws.mergeCells(`H${r + 2}:L${r + 2}`);
      const out2 = ws.getCell(`H${r + 2}`);
      out2.value = '▲   OUT';
      out2.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF64748B' } };
      out2.alignment = { horizontal: 'center', vertical: 'middle' };
      setRangeFill(ws, 8, 12, r + 2, r + 2, 'FFFFFFFF');
      setRangeBorders(ws, 8, 12, r + 2, r + 2, { left: 'thin', right: 'thin', color: 'FF94A3B8' });
    }
    ws.getRow(r + 2).height = 18;

    // === 3-LINE SPECIFICATIONS BOX ===
    const w1 = d1.width || 1200;
    const h1 = d1.height || 1200;
    const qty1 = d1.quantity || 1;
    const areaSqM1 = ((w1 * h1) / 1000000).toFixed(3);
    const pocketIndices1 = getDesignPocketIndices(d1);
    const glassName1 = getGlassDisplayName(d1.glassType, d1.glassName);

    // ROW r+3: Line 1 (Design Ref, Qty, Location)
    ws.mergeCells(`B${r + 3}:F${r + 3}`);
    const spec1_1 = ws.getCell(`B${r + 3}`);
    spec1_1.value = `Design Ref : ${d1.tag || 'W'}          Qty : ${qty1}          Location : ${d1.location || ''}`;
    spec1_1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    spec1_1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    setRangeFill(ws, 2, 6, r + 3, r + 3, 'FFFFFFFF');
    setRangeBorders(ws, 2, 6, r + 3, r + 3, { top: 'thin', left: 'thin', right: 'thin', color: 'FF94A3B8' });

    // ROW r+4: Line 2 (W, H, Area)
    ws.mergeCells(`B${r + 4}:F${r + 4}`);
    const spec1_2 = ws.getCell(`B${r + 4}`);
    spec1_2.value = `W = ${Number(w1).toFixed(2)}; H = ${Number(h1).toFixed(2)}          Area : ${areaSqM1} SqMt`;
    spec1_2.font = { name: 'Arial', size: 9.5, color: { argb: 'FF1E293B' } };
    spec1_2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    setRangeFill(ws, 2, 6, r + 4, r + 4, 'FFFFFFFF');
    setRangeBorders(ws, 2, 6, r + 4, r + 4, { left: 'thin', right: 'thin', color: 'FF94A3B8' });

    // ROW r+5: Line 3 (Glass)
    ws.mergeCells(`B${r + 5}:F${r + 5}`);
    const spec1_3 = ws.getCell(`B${r + 5}`);
    spec1_3.value = `Glass : (${pocketIndices1}) ${glassName1.toUpperCase()}`;
    spec1_3.font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };
    spec1_3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    setRangeFill(ws, 2, 6, r + 5, r + 5, 'FFFFFFFF');
    setRangeBorders(ws, 2, 6, r + 5, r + 5, { bottom: 'thin', left: 'thin', right: 'thin', color: 'FF94A3B8' });

    // Card 2 3-Line Box
    if (d2) {
      const w2 = d2.width || 1200;
      const h2 = d2.height || 1200;
      const qty2 = d2.quantity || 1;
      const areaSqM2 = ((w2 * h2) / 1000000).toFixed(3);
      const pocketIndices2 = getDesignPocketIndices(d2);
      const glassName2 = getGlassDisplayName(d2.glassType, d2.glassName);

      ws.mergeCells(`H${r + 3}:L${r + 3}`);
      const spec2_1 = ws.getCell(`H${r + 3}`);
      spec2_1.value = `Design Ref : ${d2.tag || 'W'}          Qty : ${qty2}          Location : ${d2.location || ''}`;
      spec2_1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      spec2_1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      setRangeFill(ws, 8, 12, r + 3, r + 3, 'FFFFFFFF');
      setRangeBorders(ws, 8, 12, r + 3, r + 3, { top: 'thin', left: 'thin', right: 'thin', color: 'FF94A3B8' });

      ws.mergeCells(`H${r + 4}:L${r + 4}`);
      const spec2_2 = ws.getCell(`H${r + 4}`);
      spec2_2.value = `W = ${Number(w2).toFixed(2)}; H = ${Number(h2).toFixed(2)}          Area : ${areaSqM2} SqMt`;
      spec2_2.font = { name: 'Arial', size: 9.5, color: { argb: 'FF1E293B' } };
      spec2_2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      setRangeFill(ws, 8, 12, r + 4, r + 4, 'FFFFFFFF');
      setRangeBorders(ws, 8, 12, r + 4, r + 4, { left: 'thin', right: 'thin', color: 'FF94A3B8' });

      ws.mergeCells(`H${r + 5}:L${r + 5}`);
      const spec2_3 = ws.getCell(`H${r + 5}`);
      spec2_3.value = `Glass : (${pocketIndices2}) ${glassName2.toUpperCase()}`;
      spec2_3.font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };
      spec2_3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      setRangeFill(ws, 8, 12, r + 5, r + 5, 'FFFFFFFF');
      setRangeBorders(ws, 8, 12, r + 5, r + 5, { bottom: 'thin', left: 'thin', right: 'thin', color: 'FF94A3B8' });
    }

    ws.getRow(r + 3).height = 20;
    ws.getRow(r + 4).height = 20;
    ws.getRow(r + 5).height = 20;

    // Spacing between card pairs
    ws.getRow(r + 6).height = 18;
    currRow = r + 7;
  }

  // Footer Banner
  ws.mergeCells(`B${currRow}:L${currRow}`);
  const footerCell = ws.getCell(`B${currRow}`);
  footerCell.value = `${reportCompanyName}   |   Elevation Diagram Report   |   ${reportWebsite}`;
  footerCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF64748B' } };
  footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  setRangeFill(ws, 2, 12, currRow, currRow, 'FFF8FAFC');
  setRangeBorders(ws, 2, 12, currRow, currRow, { top: 'thin', bottom: 'thin', color: 'FFCBD5E1' });
  ws.getRow(currRow).height = 24;

  // -------------------------------------------------------------------
  // 2. SECONDARY WORKSHEET: Detailed Data Table (Elevation Schedule)
  // For easy sorting, price checks, and Excel calculations
  // -------------------------------------------------------------------
  const wsTable = workbook.addWorksheet('Elevation Schedule (Table)');
  wsTable.columns = [
    { width: 6 },   // A: Sr.
    { width: 14 },  // B: Design Tag
    { width: 22 },  // C: Location
    { width: 26 },  // D: Typology & Series
    { width: 13 },  // E: Width (mm)
    { width: 13 },  // F: Height (mm)
    { width: 16 },  // G: Size (Ft & In)
    { width: 16 },  // H: Floor Clear (mm)
    { width: 26 },  // I: Glass Spec
    { width: 16 },  // J: Profile Color
    { width: 10 },  // K: Qty
    { width: 13 },  // L: Unit Sq.Ft
    { width: 14 },  // M: Total Sq.Ft
    { width: 15 },  // N: Rate (₹/Sq.Ft)
    { width: 18 },  // O: Total Price (₹)
  ];

  wsTable.mergeCells('A1:O1');
  const tTitle = wsTable.getCell('A1');
  tTitle.value = `${customer.name.toUpperCase()} - ARCHITECTURAL ELEVATION & SIZING SCHEDULE`;
  tTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  tTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  tTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsTable.getRow(1).height = 32;

  const tHeaders = [
    'Sr.',
    'Design Tag',
    'Location',
    'Typology & Series',
    'Width (mm)',
    'Height (mm)',
    'Size (Ft & In)',
    'Floor Clear',
    'Glass Specification',
    'Color',
    'Qty',
    'Unit Sq.Ft',
    'Total Sq.Ft',
    'Rate (₹/Sq.Ft)',
    'Total Price (₹)',
  ];
  const tHeaderRow = wsTable.getRow(2);
  tHeaderRow.values = tHeaders;
  tHeaderRow.height = 26;
  tHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  designs.forEach((d, idx) => {
    const w = d.width || 1200;
    const h = d.height || 1200;
    const qty = d.quantity || 1;
    const areaSqM = (w * h) / 1000000;
    const unitSqFt = Number((areaSqM * 10.7639).toFixed(2));
    const rowTotalSqFt = Number((unitSqFt * qty).toFixed(2));
    const inchesW = w / 25.4;
    const dimFtIn = `${Math.floor(inchesW / 12)}' ${Math.round(inchesW % 12)}" × ${Math.floor(h / 25.4 / 12)}' ${Math.round((h / 25.4) % 12)}"`;
    const rowTotalPrice = d.totalPrice || (d.unitPrice ? d.unitPrice * qty : 0);
    const ratePerSqFt = unitSqFt > 0 && d.unitPrice ? Math.round(d.unitPrice / unitSqFt) : 0;

    const row = wsTable.getRow(3 + idx);
    row.values = [
      idx + 1,
      d.tag || `W${idx + 1}`,
      d.location || 'Standard Aperture',
      `${d.type || 'Window'} (${d.seriesName || 'Standard'})`,
      w,
      h,
      dimFtIn,
      d.floorDistance || 900,
      getGlassDisplayName(d.glassType, d.glassName),
      (d.profileColor || 'white').toUpperCase(),
      qty,
      unitSqFt,
      rowTotalSqFt,
      ratePerSqFt > 0 ? `₹${ratePerSqFt}` : '-',
      rowTotalPrice > 0 ? `₹${rowTotalPrice.toLocaleString('en-IN')}` : '-',
    ];
    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 3 || colNum === 4 ? 'left' : 'center',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(`${customer.name.replace(/\s+/g, '_')}_Elevation_Report.xlsx`, blob);
}

/**
 * Generates an HTML .xls spreadsheet table matching the exact EvaWin Card Layout
 */
export function generateElevationReportXlsHtml(
  customer: CustomerRecord,
  designs: CustomerDesignCardItem[],
  pngBase64Map?: Record<string, string>
): string {
  const totalQty = designs.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const totalSqFt = designs.reduce((sum, d) => {
    const areaSqM = ((d.width || 1200) * (d.height || 1200)) / 1000000;
    return sum + areaSqM * 10.7639 * (d.quantity || 1);
  }, 0);

  const reportCompanyName =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('cost_report_company_name') : null) ||
    customer.companyName ||
    (customer as unknown as { company?: string }).company ||
    'Shri Balaji Traders';
  const projectCode = (customer as unknown as { quoteNo?: string }).quoteNo || customer.id || 'SHR-QT-00000062';
  const projectName = customer.name || 'SEC-5 P-14 F-A19';
  const dateFormatted = new Date().toLocaleString('en-IN');

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <style>
        body { font-family: Arial, sans-serif; background-color: #ffffff; }
        .main-title { font-size: 20px; font-weight: bold; color: #0f172a; }
        .date-text { font-size: 11px; color: #475569; text-align: right; }
        .blue-bar { background-color: #2563eb; height: 6px; }
        .card-table { border-collapse: collapse; width: 440px; margin: 10px auto; border: 1.5px solid #94a3b8; background-color: #ffffff; }
        .card-vfi { background-color: #f8fafc; font-size: 11px; font-weight: bold; text-align: center; color: #475569; padding: 6px; border-bottom: 1px solid #cbd5e1; }
        .card-img-cell { background-color: #ffffff; text-align: center; vertical-align: middle; padding: 10px; }
        .card-out { font-size: 10px; font-weight: bold; color: #64748b; text-align: center; padding: 4px; }
        .spec-box { border-top: 1px solid #94a3b8; padding: 6px 10px; font-size: 11px; line-height: 1.5; color: #1e293b; }
      </style>
    </head>
    <body>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td colspan="4" class="main-title">Elevation Diagram Report</td>
          <td colspan="4" class="date-text">Date: ${dateFormatted}</td>
        </tr>
        <tr>
          <td colspan="4" style="font-size: 13px; font-weight: bold; color: #1e293b;">Project: ${projectName}</td>
          <td colspan="4" style="font-size: 13px; font-weight: bold; color: #1d4ed8; text-align: right;">Project Code : ${projectCode}</td>
        </tr>
        <tr>
          <td colspan="8" class="blue-bar"></td>
        </tr>
      </table>

      <br />
      <h3 style="font-size: 13px; color: #1e293b; margin-bottom: 6px;">Report includes the data from projects :</h3>
      <table border="1" cellpadding="6" style="border-collapse: collapse; width: 100%; font-size: 12px; border-color: #cbd5e1;">
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <th>Sl No.</th><th>Project Name</th><th>Project Code</th><th>Qty</th><th>Quote Alias</th>
        </tr>
        <tr>
          <td align="center">1</td>
          <td><b>${projectName}</b></td>
          <td>${projectCode}</td>
          <td align="center"><b>${totalQty}</b></td>
          <td align="center"><b>A</b></td>
        </tr>
      </table>

      <br />
      <h3 style="font-size: 13px; color: #1e293b; margin-bottom: 6px;">Design Remarks : :</h3>
      <table border="1" cellpadding="6" style="border-collapse: collapse; width: 100%; font-size: 12px; border-color: #cbd5e1;">
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <th>Design Ref</th><th>Remark Date</th><th>Remarks</th>
        </tr>
  `;

  designs.forEach((d) => {
    html += `
      <tr>
        <td style="color: #1d4ed8; font-weight: bold;">${d.tag || 'W'}</td>
        <td>${new Date().toLocaleDateString('en-GB')}</td>
        <td>${d.seriesName || 'Standard'} • ${(d.profileColor || 'White').toUpperCase()} • ${d.type || 'Window'}</td>
      </tr>
    `;
  });

  html += `
      </table>

      <br /><br />
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 8px; text-align: center; font-weight: bold; color: #1e40af; font-size: 13px;">
        ELEVATION DIAGRAMS (VIEW FROM INSIDE)
      </div>
      <br />

      <table style="width: 100%; border-collapse: separate; border-spacing: 20px;">
  `;

  for (let i = 0; i < designs.length; i += 2) {
    const d1 = designs[i];
    const d2 = i + 1 < designs.length ? designs[i + 1] : null;

    const w1 = d1.width || 1200;
    const h1 = d1.height || 1200;
    const qty1 = d1.quantity || 1;
    const areaSqM1 = ((w1 * h1) / 1000000).toFixed(3);
    const glassName1 = getGlassDisplayName(d1.glassType, d1.glassName);
    const img1 = pngBase64Map ? pngBase64Map[d1.id] : '';

    html += `<tr><td style="width: 50%; vertical-align: top;">
      <table class="card-table">
        <tr><td class="card-vfi">VIEW FROM INSIDE</td></tr>
        <tr>
          <td class="card-img-cell">
            ${img1 ? `<img src="${img1}" width="340" height="230" alt="${d1.tag}" />` : `<b>${d1.tag} CAD Elevation Drawing</b>`}
          </td>
        </tr>
        <tr><td class="card-out">▲ OUT</td></tr>
        <tr>
          <td class="spec-box">
            <b>Design Ref : ${d1.tag}</b> &nbsp;&nbsp;&nbsp;&nbsp; <b>Qty : ${qty1}</b> &nbsp;&nbsp;&nbsp;&nbsp; Location : ${d1.location || ''}<br />
            W = ${Number(w1).toFixed(2)}; H = ${Number(h1).toFixed(2)} &nbsp;&nbsp;&nbsp;&nbsp; Area : ${areaSqM1} SqMt<br />
            Glass : (${getDesignPocketIndices(d1)}) ${glassName1.toUpperCase()}
          </td>
        </tr>
      </table>
    </td>`;

    if (d2) {
      const w2 = d2.width || 1200;
      const h2 = d2.height || 1200;
      const qty2 = d2.quantity || 1;
      const areaSqM2 = ((w2 * h2) / 1000000).toFixed(3);
      const glassName2 = getGlassDisplayName(d2.glassType, d2.glassName);
      const img2 = pngBase64Map ? pngBase64Map[d2.id] : '';

      html += `<td style="width: 50%; vertical-align: top;">
        <table class="card-table">
          <tr><td class="card-vfi">VIEW FROM INSIDE</td></tr>
          <tr>
            <td class="card-img-cell">
              ${img2 ? `<img src="${img2}" width="340" height="230" alt="${d2.tag}" />` : `<b>${d2.tag} CAD Elevation Drawing</b>`}
            </td>
          </tr>
          <tr><td class="card-out">▲ OUT</td></tr>
          <tr>
            <td class="spec-box">
              <b>Design Ref : ${d2.tag}</b> &nbsp;&nbsp;&nbsp;&nbsp; <b>Qty : ${qty2}</b> &nbsp;&nbsp;&nbsp;&nbsp; Location : ${d2.location || ''}<br />
              W = ${Number(w2).toFixed(2)}; H = ${Number(h2).toFixed(2)} &nbsp;&nbsp;&nbsp;&nbsp; Area : ${areaSqM2} SqMt<br />
              Glass : (${getDesignPocketIndices(d2)}) ${glassName2.toUpperCase()}
            </td>
          </tr>
        </table>
      </td>`;
    } else {
      html += `<td style="width: 50%;"></td>`;
    }

    html += `</tr>`;
  }

  html += `
      </table>

      <br />
      <div style="text-align: center; font-size: 11px; color: #64748b; padding: 10px; border-top: 1px solid #cbd5e1;">
        ${reportCompanyName} | Elevation Diagram Report | Total Units: ${totalQty} | Total Area: ${totalSqFt.toFixed(2)} Sq.Ft
      </div>
    </body>
    </html>
  `;

  return html;
}

// 4. Download DXF Data for CNC/AutoCAD fabricators
export function generateProjectDxf(project: UPVCProject): string {
  let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;

  (project.frames || []).forEach((f) => {
    // Outer Frame rectangle as 4 lines
    // Bottom line
    dxf += `0\nLINE\n8\nFRAME_OUTER\n10\n${f.x}\n20\n${f.y}\n11\n${f.x + f.width}\n21\n${f.y}\n`;
    // Right line
    dxf += `0\nLINE\n8\nFRAME_OUTER\n10\n${f.x + f.width}\n20\n${f.y}\n11\n${f.x + f.width}\n21\n${f.y + f.height}\n`;
    // Top line
    dxf += `0\nLINE\n8\nFRAME_OUTER\n10\n${f.x + f.width}\n20\n${f.y + f.height}\n11\n${f.x}\n21\n${f.y + f.height}\n`;
    // Left line
    dxf += `0\nLINE\n8\nFRAME_OUTER\n10\n${f.x}\n20\n${f.y + f.height}\n11\n${f.x}\n21\n${f.y}\n`;

    // Mullions
    (f.mullions || []).forEach((m) => {
      if (m.orientation === 'vertical') {
        dxf += `0\nLINE\n8\nMULLION\n10\n${f.x + m.position}\n20\n${f.y}\n11\n${f.x + m.position}\n21\n${f.y + f.height}\n`;
      } else {
        dxf += `0\nLINE\n8\nTRANSOM\n10\n${f.x}\n20\n${f.y + m.position}\n11\n${f.x + f.width}\n21\n${f.y + m.position}\n`;
      }
    });
  });

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

export function downloadCadDxf(project: UPVCProject, filename?: string) {
  const dxfContent = generateProjectDxf(project);
  const name = filename || `${(project.name || 'UPVC_CAD_Export').replace(/\s+/g, '_')}_${Date.now()}.dxf`;
  downloadText(name, dxfContent, 'application/dxf;charset=utf-8');
}

// 5. Download Project JSON Backup
export function downloadProjectJson(project: UPVCProject, filename?: string) {
  const jsonContent = JSON.stringify(project, null, 2);
  const name = filename || `${(project.name || 'UPVC_Project_Backup').replace(/\s+/g, '_')}_${Date.now()}.json`;
  downloadText(name, jsonContent, 'application/json;charset=utf-8');
}

// 6. Download Cutting List CSV
export function downloadCuttingListCsv(project: UPVCProject, filename?: string) {
  const sawItems = generateCuttingSchedule(project.frames || [], project.couplings || []);
  const headers = [
    'Tag',
    'Frame',
    'Item Type',
    'Profile Description',
    'Length (mm)',
    'Width (mm)',
    'Height (mm)',
    'Qty',
    'Cut Left Angle',
    'Cut Right Angle',
    'Notes',
  ];

  const rows = sawItems.map((i) => [
    i.tag,
    i.frameName,
    i.itemType,
    `"${i.profileName}"`,
    i.length,
    i.width || '-',
    i.height || '-',
    i.quantity,
    i.cutAngleLeft,
    i.cutAngleRight,
    `"${i.notes || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const name = filename || `uPVC_Cutting_Schedule_${project.referenceNo || 'Report'}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadText(name, csvContent, 'text/csv;charset=utf-8');
}

// 7. Download Quotation CSV / Excel Format
export function downloadQuotationCsv(project: UPVCProject, filename?: string) {
  const { items, subtotal, taxAmount, grandTotal, totalAreaSqM, totalAreaSqFt } = calculateBOM(
    project.frames || [],
    project.couplings || [],
    project.pricingConfig
  );

  const headers = ['Category', 'Item Description', 'Unit', 'Quantity', 'Rate (INR)', 'Total Amount (INR)'];
  const rows = items.map((i) => [
    `"${i.category}"`,
    `"${i.name} - ${i.description}"`,
    i.unit,
    i.quantity,
    i.unitRate,
    i.totalAmount,
  ]);

  rows.push(['', '', '', '', 'Subtotal', subtotal]);
  rows.push(['', '', '', '', `GST (${project.pricingConfig.taxPercent}%)`, taxAmount]);
  rows.push(['', '', '', '', 'GRAND TOTAL', grandTotal]);
  rows.push(['', '', '', '', 'Total Area Sq.Ft', totalAreaSqFt]);
  rows.push(['', '', '', '', 'Total Area Sq.M', totalAreaSqM]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const name = filename || `uPVC_Quotation_${project.referenceNo || 'BOM'}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadText(name, csvContent, 'text/csv;charset=utf-8');
}

// 7b. Download Cost Breakup Report CSV Format
export function downloadCostBreakupCsv(project: UPVCProject, filename?: string) {
  const reports = generateProductionReports(project.frames || [], project.couplings || [], {
    name: project.name,
    referenceNo: project.referenceNo,
    clientName: project.clientName,
  });

  const lines: string[] = [];
  lines.push('COST BREAKUP REPORT');
  lines.push(`Project:,"${project.name || 'UPVC Project'}",Ref No:,"${project.referenceNo || 'UPVC-2026'}",Date:,"${new Date().toLocaleDateString('en-IN')}"`);
  lines.push('');

  reports.forEach((rep) => {
    lines.push(`Design Ref:,"${rep.designRef}",Typology:,"${rep.typologyType}",Dimensions:,"${rep.width} x ${rep.height} mm",Qty:,${rep.quantity},Area:,"${rep.areaSqM?.toFixed(3)} SqM (${rep.areaSqFt?.toFixed(3)} SqFt)",Series:,"${rep.series}"`);
    lines.push('Category,Description,Item Code,Qty,Unit,Rate (INR),Cost (INR)');

    (rep.costBreakupRows || []).forEach((row) => {
      lines.push(`"${row.category}","${row.description}","${row.itemCode}",${row.qty.toFixed(row.unit === 'Pcs' || row.unit === 'Set' ? 0 : 3)},${row.unit},${row.rate.toFixed(2)},${row.cost.toFixed(2)}`);
    });

    if (rep.costSummary) {
      lines.push('');
      lines.push('COST SUMMARY,AMOUNT (INR)');
      lines.push(`Profile Cost,${rep.costSummary.profileCost.toFixed(2)}`);
      lines.push(`Profile Wastage (${rep.costSummary.profileWastagePercent.toFixed(2)}%),${rep.costSummary.profileWastageCost.toFixed(2)}`);
      lines.push(`RI Cost,${rep.costSummary.riCost.toFixed(2)}`);
      lines.push(`RI Wastage (${rep.costSummary.riWastagePercent.toFixed(2)}%),${rep.costSummary.riWastageCost.toFixed(2)}`);
      lines.push(`Hardware Cost,${rep.costSummary.hardwareCost.toFixed(2)}`);
      lines.push(`Glass Cost,${rep.costSummary.glassCost.toFixed(2)}`);
      lines.push(`Glass Wastage (${rep.costSummary.glassWastagePercent.toFixed(2)}%),${rep.costSummary.glassWastageCost.toFixed(2)}`);
      lines.push(`Total Raw Material Cost,${rep.costSummary.totalRawMaterialCost.toFixed(2)}`);
      lines.push(`Fabrication Labour (${rep.costSummary.fabricationLabourRate.toFixed(4)}),${rep.costSummary.fabricationLabourCost.toFixed(2)}`);
      lines.push(`Installation Labour (${rep.costSummary.installationLabourRate.toFixed(4)}),${rep.costSummary.installationLabourCost.toFixed(2)}`);
      lines.push(`Sub Total Including Labour,${rep.costSummary.subTotalIncludingLabour.toFixed(2)}`);
      lines.push(`Profit (${rep.costSummary.profitPercent.toFixed(2)}%),${rep.costSummary.profitCost.toFixed(2)}`);
      lines.push(`Extra Cost,${rep.costSummary.extraCost.toFixed(2)}`);
      lines.push(`Basic Value,${rep.costSummary.basicValue.toFixed(2)}`);
      lines.push(`Discount (${rep.costSummary.discountPercent.toFixed(2)}%),${rep.costSummary.discountAmount.toFixed(2)}`);
      lines.push(`Sub Total,${rep.costSummary.subTotal.toFixed(2)}`);
      lines.push(`Transportation,${rep.costSummary.transportationCost.toFixed(2)}`);
      lines.push(`Loading / Unloading,${rep.costSummary.loadingUnloadingCost.toFixed(2)}`);
      lines.push(`Total Project Cost,${rep.costSummary.totalProjectCost.toFixed(2)}`);
      lines.push(`GST (${rep.costSummary.gstPercent.toFixed(2)}%),${rep.costSummary.gstAmount.toFixed(2)}`);
      lines.push(`GRAND TOTAL,${rep.costSummary.grandTotal.toFixed(2)}`);
    }
    lines.push('');
    lines.push('----------------------------------------------------');
    lines.push('');
  });

  const csvContent = lines.join('\n');
  const name = filename || `Cost_Breakup_Report_${project.referenceNo || 'BOM'}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadText(name, csvContent, 'text/csv;charset=utf-8');
}

// 8. Site Measurement Confirmation Sheet (Formatted Printable CSV/Text)
export function downloadSiteMeasurementDoc(customer: CustomerRecord, designs: any[]) {
  const headers = ['Sr', 'Tag', 'Location', 'Width (mm)', 'Height (mm)', 'Type', 'Glass Type', 'Floor Distance (mm)', 'Status'];
  const rows = (designs || []).map((d, idx) => [
    idx + 1,
    d.tag || `W${idx + 1}`,
    `"${d.location || 'Main'}"`,
    d.width,
    d.height,
    `"${d.type || 'Casement'}"`,
    `"${getGlassDisplayName(d.glassType, d.glassName)}"`,
    d.floorDistance || 900,
    '"Site Verified"',
  ]);

  const title = `SITE MEASUREMENT & RE-CHECK CONFIRMATION SHEET\nCustomer: ${customer.name}\nSite City: ${customer.city}\nPhone: ${customer.phone}\nDate: ${new Date().toLocaleDateString('en-GB')}\n\n`;
  const csvContent = title + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadText(`Site_Measurement_Sheet_${customer.name.replace(/\s+/g, '_')}.csv`, csvContent, 'text/csv;charset=utf-8');
}

// 9. Material Specification & Warranty Certificate
export function downloadWarrantyDoc(customer: CustomerRecord, designs: any[]) {
  const totalQty = (designs || []).reduce((sum, d) => sum + (d.quantity || 1), 0);
  const totalVal = (designs || []).reduce((sum, d) => sum + (d.totalPrice || d.unitPrice * (d.quantity || 1)), 0);

  const doc = `================================================================================
DURON UPVC & ALUMINIUM SYSTEMS - 10 YEAR COMPREHENSIVE WARRANTY CERTIFICATE
================================================================================
Certificate No : DUR-WAR-2026-${customer.id}
Issue Date     : ${new Date().toLocaleDateString('en-GB')}
Issued To      : ${customer.name} (${customer.companyName || 'Residential Site'})
Site Address   : ${customer.city}, India
Phone Contact  : ${customer.phone}

PROJECT DETAILS:
- Total Openings Fabricated : ${designs.length} Units (Qty: ${totalQty} Windows/Doors)
- Profile Series Installed : ${customer.brand || 'Duron 60mm Lead-Free Multi-Chamber uPVC'}
- Hardware Classification  : Heavy Duty 304 Stainless Steel Friction Stays & Espag Multi-Locks
- Glass Configuration      : Toughened AIS / Saint-Gobain Glazing with EPDM Gaskets
- Total Valuation          : INR ₹${totalVal.toLocaleString('en-IN')}

TERMS OF WARRANTY COVERAGE:
1. 10 Years warranty against profile color discoloration, yellowing, or structural UV degradation.
2. 5 Years comprehensive coverage on hardware mechanisms, multi-point lock rods, and rollers.
3. 2 Years warranty on EPDM double-compression sealing gaskets and weather pile integrity.
4. Complies with EN 12608 Class-A and ISO 9001:2015 Manufacturing Standards.

Authorized Signatory:
For DURON MANUFACTURING SYSTEMS LTD.
Technical Quality Assurance Dept.
================================================================================`;

  downloadText(`Warranty_Certificate_${customer.name.replace(/\s+/g, '_')}.txt`, doc, 'text/plain;charset=utf-8');
}

// 10. Factory Production Job Card (CSV & TXT)
export function downloadFactoryJobCardDoc(customer: CustomerRecord, designs: any[]) {
  let text = `================================================================================\n`;
  text += `FACTORY PRODUCTION JOB CARD & BATCH CUTTING ORDER\n`;
  text += `Customer: ${customer.name} | Job ID: JOB-${customer.id}-${Date.now()}\n`;
  text += `Date: ${new Date().toLocaleDateString('en-GB')} | Brand: ${customer.brand || 'Duron Casement 60'}\n`;
  text += `================================================================================\n\n`;

  (designs || []).forEach((d, idx) => {
    text += `ITEM #${idx + 1}: ${d.tag} - ${d.type} (${d.location})\n`;
    text += `Outer Size : ${d.width}mm (W) × ${d.height}mm (H) | Qty: ${d.quantity} Nos\n`;
    text += `Series     : ${d.seriesName}\n`;
    text += `Glass Spec : ${getGlassDisplayName(d.glassType, d.glassName)}\n`;
    text += `Floor Dist : ${d.floorDistance || 900}mm\n`;
    text += `--------------------------------------------------------------------------------\n`;
  });

  downloadText(`Factory_Job_Card_${customer.name.replace(/\s+/g, '_')}.txt`, text, 'text/plain;charset=utf-8');
}

// 11. UPVC CAD Master Engineering Specification & Blueprint Markdown Exporter
export function downloadCadMasterSpecMarkdown() {
  const masterContent = `# 📐 MASTER UPVC & ALUMINIUM CAD FABRICATION & COUPLING ENGINE SPECIFICATION
> **Document Version:** 4.0 (Production Grade)  
> **Target Audience:** Google AI Studio / Full-Stack AI Engineers / Window & Door Fabricators  
> **Use Case:** Complete Blueprint & Source Architecture to build or fix any uPVC/Aluminium CAD Designer, 2mm Multi-Frame Coupling, Cutting List BOM & Quotation Engine.

---

## 📑 TABLE OF CONTENTS
1. [Core Mathematical Geometry & Dimensioning](#1-core-mathematical-geometry--dimensioning)
2. [2mm Coupling & Multi-Frame Assembly Engine](#2-2mm-coupling--multi-frame-assembly-engine)
3. [Casement Window & Door Mechanics](#3-casement-window--door-mechanics)
4. [Sliding Window Mechanics & W1..W18 Architectural Models](#4-sliding-window-mechanics--w1w18-architectural-models)
5. [Manufacturing Cutting List & Deduction Formulas](#5-manufacturing-cutting-list--deduction-formulas)
6. [Bill of Materials (BOM) & Costing Formulas](#6-bill-of-materials-bom--costing-formulas)
7. [SVG CAD Canvas Rendering & Interactive UX Guidelines](#7-svg-cad-canvas-rendering--interactive-ux-guidelines)
8. [Standard Data Models & TypeScript Types](#8-standard-data-models--typescript-types)

---

## 1. CORE MATHEMATICAL GEOMETRY & DIMENSIONING

### 1.1 Dual Dimensioning Hierarchy
Any window or multi-frame assembly has two primary dimension systems:
1. **Total Assembly Envelope**:
   $$\\text{Total Width} = \\sum \\text{Frame Widths} + \\sum \\text{Coupler Gaps}$$
   $$\\text{Total Height} = \\max(\\text{Frame Heights}) \\quad \\text{(for horizontal arrays)}$$
2. **Individual Frame Dimensions**:
   Outer bounding box of each frame in millimetres ($W \\times H$).

### 1.2 Pocket / Internal Clearance Calculation
When vertical mullions or horizontal transoms divide a frame:
$$\\text{Pocket Width}_i = \\text{Section Width}_i - \\text{Frame Profile Deductions}$$
$$\\text{Pocket Height}_j = \\text{Section Height}_j - \\text{Frame Profile Deductions}$$

- **Outer-Only Clean Display Rule**: On the 2D CAD visual canvas, suppress internal pocket dimension clutter. All outer frame widths, heights, and total assembly dimensions must be rendered with clean external witness lines and interactive dimension badges.

---

## 2. 2mm COUPLING & MULTI-FRAME ASSEMBLY ENGINE

### 2.1 Coupling Types & Gaps
| Coupler Type | Standard Gap Width | Structural Purpose |
|---|---|---|
| **Flat Expansion Coupler** | **2.0 mm** | Standard window-to-window or window-to-door coupling |
| **Heavy Box Coupler (I-Coupler)** | **15.0 mm – 50.0 mm** | Wind-load reinforcement for high-rise elevations |
| **Corner Bay Post (90° / 135°)** | **60.0 mm – 80.0 mm** | Corner windows and bay window elevations |

### 2.2 Coordinate Calculation for Coupled Assemblies
- **Horizontal Coupling (Side-by-Side)**:
  $$\\text{Target Frame } X = \\text{Source Frame } X + \\text{Source Frame Width} + \\text{Coupler Gap (2mm)}$$
- **Vertical Coupling (Stacked Window + Top Light)**:
  $$\\text{Target Frame } Y = \\text{Source Frame } Y + \\text{Source Frame Height} + \\text{Coupler Gap (2mm)}$$

### 2.3 Directional Resize & Neighbor Collision Prevention
1. **Collision-Safe Arrow Logic**: If Frame $A$ has a neighbor coupled to its Right edge, the Right expansion arrow on Frame $A$ must be **suppressed/hidden** to prevent frame overlap.
2. **Dimension Repositioning**: If the Right side is occupied by a coupled frame, shift the height dimension line to the Left unobstructed edge.

---

## 3. CASEMENT WINDOW & DOOR MECHANICS

### 3.1 Casement Sash Types & Visual Representation
- **Fixed Glass (\`fixed\`)**: Clean glass panel with subtle reflection lines.
- **Left Hinged (\`casement_left\`)**: Dashed triangle pointing from Left hinges to Right edge handle $[<]$.
- **Right Hinged (\`casement_right\`)**: Dashed triangle pointing from Right hinges to Left edge handle $[>]$.
- **Top Hung Awning (\`top_hung\`)**: Dashed triangle pointing from Top hinges to Bottom center handle $[\\vee]$.
- **Bottom Hung Hopper (\`bottom_hung\`)**: Dashed triangle pointing from Bottom hinges to Top center handle $[\\wedge]$.
- **Tilt & Turn (\`tilt_turn\`)**: Dual dashed triangles (Side open + Hopper open) with 3-position handle.
- **French Double Door (\`french_open\`)**: Master & Slave meeting sashes without central mullion.
- **Fixed Center with Louver (\`louver\`)**: Ventilation slatted blades.

---

## 4. SLIDING WINDOW MECHANICS & W1..W18 ARCHITECTURAL MODELS

### 4.1 Standard Sliding Parameters
- **Glass / Handle Height (GHH)**: Standardized at **$576\\text{ mm}$** from the bottom track.
- **Flush Touch-Locks / Pop-up Handles**: Positioned at sash stiles at $GHH = 576\\text{mm}$.
- **Arrow Symbols**:
  - \`[→]\` Right Sliding Sash (\`slider_arrow_right\`)
  - \`[←]\` Left Sliding Sash (\`slider_arrow_left\`)
  - \`[↔]\` Bi-directional Sliding Sash (\`slider_arrow_both\`)
  - \`[(+)]\` Stationary Fixed Glass Panel (\`slider_fixed_center\`)

### 4.2 Factory Sliding Models Reference (W1 to W18)
| Code | Configuration | Default Size ($W \\times H$) | Panel Division | Tracks |
|---|---|---|---|---|
| **W1** | 2-Panel Slider | $1500 \\times 1500$ mm | $[750 \\mid 750]$ mm | 2-Track ($62\\text{mm}$) |
| **W2** | 3-Panel Center Fixed | $1500 \\times 1500$ mm | $[397 \\mid 707 \\mid 396]$ mm | 2.5-Track / 3-Track |
| **W3** | 3-Panel Middle Slider | $1500 \\times 1500$ mm | $[524 \\mid 452 \\mid 524]$ mm | 3-Track ($88\\text{mm}$) |
| **W4** | 3-Panel Left Cascade | $1500 \\times 1500$ mm | $[524 \\mid 452 \\mid 524]$ mm | 3-Track ($88\\text{mm}$) |
| **W5** | 4-Panel Center Meeting | $1500 \\times 1500$ mm | $[395 \\mid 355 \\mid 354 \\mid 396]$ mm | 2-Track ($62\\text{mm}$) |
| **W6** | 4-Panel Wide Sashes | $1500 \\times 1500$ mm | $[411 \\mid 339 \\mid 339 \\mid 411]$ mm | 2-Track ($62\\text{mm}$) |
| **W7** | 5-Panel Multi-Track | $1500 \\times 1500$ mm | $[331 \\mid 259 \\mid 290 \\mid 290 \\mid 331]$ mm | 3-Track ($88\\text{mm}$) |
| **W8** | 5-Panel Variant B | $1500 \\times 1500$ mm | $[331 \\mid 290 \\mid 290 \\mid 259 \\mid 331]$ mm | 3-Track ($88\\text{mm}$) |
| **W9** | 5-Panel Equal Inners | $1500 \\times 1500$ mm | $[343 \\mid 271 \\mid 271 \\mid 271 \\mid 343]$ mm | 3-Track ($88\\text{mm}$) |
| **W11** | 6-Panel Multi-Track | $1500 \\times 1500$ mm | $[288 \\mid 216 \\mid 247 \\mid 247 \\mid 216 \\mid 287]$ mm | 3-Track ($88\\text{mm}$) |
| **W12** | 6-Panel Variant | $1500 \\times 1500$ mm | $[288 \\mid 216 \\mid 247 \\mid 247 \\mid 216 \\mid 287]$ mm | 3-Track ($88\\text{mm}$) |
| **W13** | 6-Panel Wide Outers | $1500 \\times 1500$ mm | $[298 \\mid 209 \\mid 228 \\mid 228 \\mid 209 \\mid 298]$ mm | 3-Track ($88\\text{mm}$) |

---

## 5. MANUFACTURING CUTTING LIST & DEDUCTION FORMULAS

### 5.1 Outer Frame Profiles ($45^\\circ$ Miter Cuts)
- **Welding Burn-off Allowance**: $+3.0\\text{mm}$ per weld end ($+6.0\\text{mm}$ total per bar).
$$\\text{Top / Bottom Cut Length} = \\text{Frame Width} + 6\\text{mm}$$
$$\\text{Left / Right Cut Length} = \\text{Frame Height} + 6\\text{mm}$$

### 5.2 Mullions & Transoms ($90^\\circ$ Butt or V-Notch Cuts)
$$\\text{Vertical Mullion Cut Length} = \\text{Frame Height} - (2 \\times \\text{Frame Profile Width}) + \\text{Joint Allowance (2mm)}$$
$$\\text{Horizontal Transom Cut Length} = \\text{Bay Width} + \\text{Joint Allowance (2mm)}$$

### 5.3 Casement Sash Profiles ($45^\\circ$ Miter Cuts)
$$\\text{Sash Width} = \\text{Pocket Width} + (2 \\times 8\\text{mm Overlap}) - 12\\text{mm Clearance} + 6\\text{mm Welding}$$
$$\\text{Sash Height} = \\text{Pocket Height} + (2 \\times 8\\text{mm Overlap}) - 12\\text{mm Clearance} + 6\\text{mm Welding}$$

### 5.4 Glass Cutting Sizing
$$\\text{Glass Width} = \\text{Internal Daylight Opening Width} - (2 \\times 6\\text{mm Glazing Bead Clearance})$$
$$\\text{Glass Height} = \\text{Internal Daylight Opening Height} - (2 \\times 6\\text{mm Glazing Bead Clearance})$$

### 5.5 Galvanized Steel Reinforcement ($90^\\circ$ Straight Cuts)
- **Outer Frame Reinforcement**: $\\text{Profile Cut Length} - 100\\text{mm}$ (deduct $50\\text{mm}$ from each welded corner).
- **Mullion Reinforcement**: $\\text{Mullion Cut Length} - 20\\text{mm}$.
- **Sash Reinforcement**: $\\text{Sash Cut Length} - 100\\text{mm}$.

---

## 6. BILL OF MATERIALS (BOM) & COSTING FORMULAS

1. **uPVC Profiles Cost**:
   $$\\text{Profile Cost} = \\sum (\\text{Length in Meters} \\times \\text{Rate per Meter})$$
2. **Galvanized Steel Cost**:
   $$\\text{Steel Cost} = \\sum (\\text{Length in Meters} \\times \\text{Steel Weight (kg/m)} \\times \\text{Rate per kg})$$
3. **Glass Cost**:
   $$\\text{Glass Area (Sq.Ft)} = \\frac{\\text{Glass Width (mm)} \\times \\text{Glass Height (mm)}}{92903.04}$$
   $$\\text{Glass Cost} = \\text{Glass Area} \\times \\text{Rate per Sq.Ft}$$
4. **Hardware & EPDM Gaskets**:
   - Friction Stays (Pairs) / Hinges
   - Espag Gear Rods & Transmission Handles
   - EPDM Rubber Gasket Perimeter ($2 \\times (W + H) \\times \\text{Rate/m}$)
   - Wool Pile Weatherstripping for Sliders
5. **Fabrication & Installation**:
   $$\\text{Total Fabrication Cost} = (\\text{Material Cost} + \\text{Hardware}) \\times (1 + \\text{Wastage \\%}) + \\text{Labor per Sq.Ft}$$

---

## 7. SVG CAD CANVAS RENDERING & INTERACTIVE UX GUIDELINES

1. **High-Precision SVG Scaling**:
   - Dynamic \`viewBox\` containing whole assembly bounding box plus dimension margins ($120\\text{mm}$ padding).
   - Crisp lines with vector sharpness at all zoom levels.
2. **Dimension Badges**:
   - Interactive badge with width/height in mm.
   - Click to edit inline with immediate recalculation.
3. **Coupler Visuals**:
   - Distinct hatch fill and coupler label (e.g. \`2mm Coupler\` or \`15mm Box Coupler\`).

---

## 8. STANDARD DATA MODELS & TYPESCRIPT TYPES

\`\`\`typescript
export interface UPVCFrame {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  series: 'casement_60' | 'casement_70' | 'sliding_62' | 'sliding_88' | 'door_premium';
  frameProfileWidth: number; // e.g. 60mm or 88mm
  mullionProfileWidth: number; // e.g. 50mm
  sashProfileWidth: number; // e.g. 60mm
  color: 'white' | 'anthracite' | 'golden_oak' | 'walnut' | 'dark_oak';
  reinforcement: 'steel_1.2mm' | 'steel_1.5mm' | 'steel_2.0mm';
  drainageCaps: boolean;
  mullions: Mullion[];
  pockets: FramePocket[];
}

export interface CouplingConnection {
  id: string;
  sourceFrameId: string;
  targetFrameId: string;
  type: 'flat_2mm' | 'box_profile' | 'corner_90' | 'bay_135';
  gap: number; // default 2.0 mm
  reinforced: boolean;
}
\`\`\`

---
*Generated by UPVC Master Fabrication Engine for Google AI Studio.*
`;

  downloadText('UPVC_CAD_MASTER_SPECIFICATION.md', masterContent, 'text/markdown;charset=utf-8');
}

/**
 * Synchronize all live form inputs and textareas to HTML attributes
 * so that html2canvas, clones, and print media accurately capture typed content.
 */
export function syncFormInputsForExport(container: HTMLElement) {
  container.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    if (input.type === 'checkbox' || input.type === 'radio') {
      if (input.checked) {
        input.setAttribute('checked', 'checked');
      } else {
        input.removeAttribute('checked');
      }
    } else {
      const val = input.value !== undefined ? input.value : input.getAttribute('value') || '';
      input.setAttribute('value', val);
      input.defaultValue = val;
    }
  });

  container.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((textarea) => {
    const val = textarea.value !== undefined ? textarea.value : textarea.innerHTML || '';
    textarea.innerHTML = val;
    textarea.setAttribute('value', val);
    textarea.defaultValue = val;
  });
}

/**
 * Downloads a high-resolution PDF of any printable quotation or proposal element using html2canvas-pro and jsPDF.
 * Supports modern Tailwind v4 OKLCH colors, crisp 2x vector elevations, and smart multi-page A4 splitting.
 */
export async function downloadQuotationPdf(
  elementIdOrEl: string | HTMLElement = 'custom-quotation-printable-sheet',
  filename = 'UPVC_Quotation.pdf'
): Promise<boolean> {
  let element = typeof elementIdOrEl === 'string'
    ? document.getElementById(elementIdOrEl)
    : elementIdOrEl;

  // Fallback search if the specified ID is not found in the DOM
  if (!element) {
    element =
      document.getElementById('shri-balaji-quotation-sheet') ||
      document.getElementById('custom-quotation-printable-sheet') ||
      document.getElementById('project-report-content-sheet') ||
      document.getElementById('proposal-printable-sheet') ||
      document.getElementById('bom-printable-sheet') ||
      document.getElementById('typology-cost-printable-sheet') ||
      document.querySelector<HTMLElement>('.custom-quotation-sheet') ||
      document.querySelector<HTMLElement>('.report-sheet') ||
      document.querySelector<HTMLElement>('#printable-sheet');
  }

  if (!element) {
    console.error('Target element for PDF export not found:', elementIdOrEl);
    return false;
  }

  // 1. Sync all form input values so user edits appear in PDF
  syncFormInputsForExport(element);

  // 2. Add PDF export mode class to optimize margins, remove edit outlines, hide action buttons
  element.classList.add('pdf-export-mode');

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  try {
    // 3. Render element to high-resolution canvas using html2canvas-pro (native oklch & modern CSS support)
    const canvas = await html2canvas(element, {
      scale: 2.0, // 280+ DPI for razor-sharp typography, vector CAD elevations, smooth memory
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1100,
    });

    // 4. Multi-page A4 PDF configuration
    // A4 dimensions: 210mm x 297mm
    const marginHorizontal = 6; // mm
    const marginVertical = 8;   // mm
    const usableWidth = 210 - marginHorizontal * 2; // 198mm
    const usableHeight = 297 - marginVertical * 2;  // 281mm

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const pxPerMm = canvasWidth / usableWidth;
    const pageCanvasHeightInPx = Math.floor(usableHeight * pxPerMm);

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    });

    if (canvasHeight <= pageCanvasHeightInPx) {
      // Single Page: Lossless PNG eliminates JPEG artifacts and fuzzy text halos
      const imgData = canvas.toDataURL('image/png');
      const imgHeightInMm = canvasHeight / pxPerMm;
      pdf.addImage(imgData, 'PNG', marginHorizontal, marginVertical, usableWidth, imgHeightInMm, undefined, 'FAST');
    } else {
      // Multi-Page Slicing with Safe Breakpoints
      // Gather avoidance zones (table rows, headers, cards) so we don't slice text mid-row
      const avoidCutTops: number[] = [];
      const elementRect = element.getBoundingClientRect();

      // Only avoid cuts on window items table rows, not inside the commercial summary itself
      const avoidElements = element.querySelectorAll<HTMLElement>(
        '.custom-quotation-sheet tbody tr, .report-header, .signature-row, .bank-qr-card, .page-break-avoid'
      );

      avoidElements.forEach((el) => {
        // Exclude any row that belongs to commercial summary table
        if (el.closest('.commercial-summary-box') || el.closest('.commercial-summary-wrapper')) {
          return;
        }
        const rect = el.getBoundingClientRect();
        const topInPx = ((rect.top - elementRect.top) / element.offsetHeight) * canvasHeight;
        avoidCutTops.push(Math.round(topInPx));
      });

      // Strict Unbroken Blocks (Commercial Summary and Footer MUST NEVER be sliced in half across 2 pages)
      const unbrokenBlocks: { top: number; bottom: number; name: string }[] = [];
      const unbrokenElements = element.querySelectorAll<HTMLElement>(
        '.commercial-summary-wrapper, .commercial-summary-box, .quotation-footer-block, .page-break-inside-avoid'
      );

      unbrokenElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const topInPx = Math.round(((rect.top - elementRect.top) / element.offsetHeight) * canvasHeight);
        const bottomInPx = Math.round(((rect.bottom - elementRect.top) / element.offsetHeight) * canvasHeight);
        if (bottomInPx > topInPx + 30) {
          unbrokenBlocks.push({ top: topInPx, bottom: bottomInPx, name: el.className });
        }
      });

      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < canvasHeight) {
        if (pageIndex > 35) break; // Hard safety stop against infinite loops
        if (pageIndex > 0) {
          pdf.addPage('a4', 'portrait');
        }

        let sliceHeight = Math.min(pageCanvasHeightInPx, canvasHeight - renderedHeight);

        // If not the last slice, try to find a safe boundary near the bottom of this page slice
        if (renderedHeight + sliceHeight < canvasHeight) {
          const rawCutPoint = renderedHeight + sliceHeight;

          // 1. Check if rawCutPoint intersects any unbroken block (Commercial Summary or Footer)
          // If so, slice immediately BEFORE this block so the entire block starts on the next page!
          const intersectingBlock = unbrokenBlocks.find(
            (b) => b.top < rawCutPoint && b.bottom > rawCutPoint && b.top > renderedHeight + 60
          );

          if (intersectingBlock) {
            sliceHeight = intersectingBlock.top - renderedHeight;
          } else {
            // 2. Look for an avoid boundary that is within 30% of the bottom edge
            const candidateCut = avoidCutTops
              .filter((top) => top > renderedHeight + sliceHeight * 0.70 && top <= rawCutPoint)
              .pop();

            if (candidateCut && candidateCut > renderedHeight + 100) {
              sliceHeight = candidateCut - renderedHeight;
            }
          }
        }

        // Clamp sliceHeight to prevent zero or tiny slices that break canvas / loop
        sliceHeight = Math.max(150, Math.min(pageCanvasHeightInPx, sliceHeight));
        if (renderedHeight + sliceHeight > canvasHeight) {
          sliceHeight = canvasHeight - renderedHeight;
        }

        // Create page canvas slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasWidth, sliceHeight);
          ctx.drawImage(
            canvas,
            0, renderedHeight, canvasWidth, sliceHeight,
            0, 0, canvasWidth, sliceHeight
          );

          const sliceData = pageCanvas.toDataURL('image/png');
          const sliceHeightInMm = sliceHeight / pxPerMm;
          pdf.addImage(
            sliceData,
            'PNG',
            marginHorizontal,
            marginVertical,
            usableWidth,
            sliceHeightInMm,
            undefined,
            'FAST'
          );
        }

        renderedHeight += sliceHeight;
        pageIndex++;
      }
    }

    pdf.save(cleanFilename);
    return true;
  } catch (err) {
    console.error('Error generating quotation PDF with html2canvas-pro & jsPDF:', err);
    return false;
  } finally {
    element.classList.remove('pdf-export-mode');
  }
}

/**
 * High-reliability print handler for quotation sheets and reports.
 * 1. Synchronizes all input and textarea values so user modifications appear in print.
 * 2. Attempts native browser print via an isolated offscreen iframe with complete CSS.
 * 3. Also attempts direct window.print().
 * 4. In sandboxed environments (like iframes where window.print is blocked by browser security),
 *    it automatically generates & downloads the crisp multi-page A4 PDF so the user is never blocked.
 */
export async function printQuotationSheet(
  elementIdOrEl: string | HTMLElement = 'custom-quotation-printable-sheet',
  filename = 'UPVC_Quotation.pdf'
): Promise<boolean> {
  let element = typeof elementIdOrEl === 'string'
    ? document.getElementById(elementIdOrEl)
    : elementIdOrEl;

  // Fallback search if the specified ID is not found in the DOM
  if (!element) {
    element =
      document.getElementById('shri-balaji-quotation-sheet') ||
      document.getElementById('custom-quotation-printable-sheet') ||
      document.getElementById('project-report-content-sheet') ||
      document.getElementById('proposal-printable-sheet') ||
      document.getElementById('bom-printable-sheet') ||
      document.getElementById('typology-cost-printable-sheet') ||
      document.querySelector<HTMLElement>('.custom-quotation-sheet') ||
      document.querySelector<HTMLElement>('.report-sheet') ||
      document.querySelector<HTMLElement>('#printable-sheet');
  }

  if (!element) {
    console.error('Target element for printing not found:', elementIdOrEl);
    try {
      window.print();
    } catch {}
    return false;
  }

  // 1. Sync all form inputs (customer names, rates, notes, dates)
  syncFormInputsForExport(element);

  // 2. Check if we are inside a sandboxed iframe where window.print() is often blocked by Chromium
  const isInsideIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  // 3. Mark body for print isolation
  document.body.classList.add('is-printing-quotation');

  let printAttempted = false;

  // 4. Attempt iframe-isolated printing
  try {
    const printIframe = document.createElement('iframe');
    printIframe.name = 'uPVC_CAD_Print_Frame';
    printIframe.style.position = 'fixed';
    printIframe.style.left = '-9999px';
    printIframe.style.top = '-9999px';
    printIframe.style.width = '210mm';
    printIframe.style.height = '297mm';
    printIframe.style.border = '0';
    printIframe.style.opacity = '0';
    printIframe.style.pointerEvents = 'none';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (doc) {
      // Collect all stylesheets from parent document
      let stylesHtml = '';
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleEl) => {
        stylesHtml += styleEl.outerHTML;
      });

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename.replace(/\.pdf$/i, '')}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            ${stylesHtml}
            <style>
              @page { size: A4 portrait; margin: 6mm 6mm 6mm 6mm; }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 10px !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print, button, input[type="file"], [role="button"] { display: none !important; }
              input, textarea { border: none !important; outline: none !important; background: transparent !important; }
              table { width: 100% !important; border-collapse: collapse !important; }
              tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            </style>
          </head>
          <body>
            <div class="custom-quotation-sheet report-sheet" style="background:#ffffff; color:#000000; width:100%;">
              ${element.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      await new Promise((r) => setTimeout(r, 250));

      if (printIframe.contentWindow) {
        printIframe.contentWindow.focus();
        try {
          printIframe.contentWindow.print();
          printAttempted = true;
        } catch (iframePrintErr) {
          console.warn('Iframe print blocked:', iframePrintErr);
        }
      }
    }

    setTimeout(() => {
      try {
        if (printIframe.parentNode) {
          printIframe.parentNode.removeChild(printIframe);
        }
      } catch {
        // ignore
      }
    }, 4000);
  } catch (iframeErr) {
    console.warn('Iframe print attempt failed:', iframeErr);
  }

  // 5. Also attempt direct window.print() if not attempted or supported
  try {
    window.print();
    printAttempted = true;
  } catch (winPrintErr) {
    console.warn('Direct window.print() failed:', winPrintErr);
  }

  // 6. In sandboxed environments (like AI Studio preview iframe), Chromium silently ignores window.print()
  // without throwing an error. Therefore, if in an iframe or as fallback, always download the crisp A4 PDF
  // so the user gets the printable file immediately without being blocked!
  if (isInsideIframe) {
    await downloadQuotationPdf(element, filename);
  }

  // Remove print isolation marker
  setTimeout(() => {
    document.body.classList.remove('is-printing-quotation');
  }, 1200);

  return true;
}


/**
 * Converts an in-DOM SVG element into an Ultra-HD PNG data URL for embedding in ReportLab / PDF / Excel
 */
export async function svgElementToPngDataUrl(svgEl: SVGElement): Promise<string> {
  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (val: string) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    const timer = setTimeout(() => {
      safeResolve('');
    }, 3000);

    try {
      const clonedSvg = svgEl.cloneNode(true) as SVGElement;
      
      // Determine true aspect ratio from viewBox or dimensions
      const vb = svgEl.getAttribute('viewBox');
      let targetW = 2400;
      let targetH = 1600;
      if (vb) {
        const parts = vb.split(/[\s,]+/).map(parseFloat).filter((n) => !isNaN(n));
        if (parts.length >= 4) {
          const vbW = Math.abs(parts[2]) || 1200;
          const vbH = Math.abs(parts[3]) || 900;
          const aspect = vbW / Math.max(1, vbH);
          targetW = 2400;
          targetH = Math.round(targetW / aspect);
          if (aspect < 0.7) {
            targetH = 2400;
            targetW = Math.round(targetH * aspect);
          }
        }
      }

      clonedSvg.setAttribute('width', String(targetW));
      clonedSvg.setAttribute('height', String(targetH));

      const xml = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const dataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            safeResolve(dataUrl);
            return;
          }
        } catch (e) {
          // ignore
        }
        URL.revokeObjectURL(url);
        safeResolve('');
      };

      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        safeResolve('');
      };

      img.src = url;
    } catch {
      safeResolve('');
    }
  });
}

export interface PythonQuotationPayload {
  company: {
    name?: string;
    companyName?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    phone2?: string;
    email?: string;
    gstin?: string;
    logoUrl?: string;
  };
  client: {
    name?: string;
    refNo?: string;
    date?: string;
    validUntil?: string;
    address?: string;
    phone?: string;
    phone2?: string;
    email?: string;
    showBilling?: boolean;
    showAddress?: boolean;
  };
  columns?: Array<{ id: string; name: string; width?: string }>;
  rows: Array<{
    srNo: number | string;
    drawingName: string;
    glassName?: string;
    qty: number;
    customValues: Record<string, any>;
    dimensions?: string;
    drawingImageBase64?: string;
  }>;
  summary: {
    baseItemLabel?: string;
    totalArea?: string;
    rate?: string;
    basePrice?: string;
    charges?: Array<{ label: string; amount: string }>;
    totalAmountLabel?: string;
    totalAmount?: string;
    advanceAmountLabel?: string;
    advanceAmount?: string;
    balanceLabel?: string;
    balanceAmount?: string;
  };
  bank?: {
    bankName?: string;
    accountName?: string;
    accountNo?: string;
    ifsc?: string;
    branch?: string;
    upiId?: string;
  };
  terms?: string[];
  guaranteeTerms?: string[];
}

/**
 * High-precision vector PDF generator powered by Python & ReportLab.
 * Outputs pure vector fonts, crisp native tables, and high-res CAD drawings.
 */
export async function downloadQuotationPdfViaPython(
  payload: PythonQuotationPayload,
  fileName: string = 'Quotation_Vector.pdf',
  fallbackElementId: string = 'custom-quotation-printable-sheet'
): Promise<boolean> {
  try {
    const res = await fetch('/api/generate-quotation-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Python PDF server returned error, falling back to local exporter:', err);
      return await downloadQuotationPdf(fallbackElementId, fileName);
    }

    const blob = await res.blob();
    if (blob && blob.size > 1000) {
      downloadBlob(fileName, blob);
      return true;
    } else {
      console.warn('Python PDF returned empty payload, falling back to local exporter.');
      return await downloadQuotationPdf(fallbackElementId, fileName);
    }
  } catch (err) {
    console.warn('Network error reaching Python PDF generator, falling back to local exporter:', err);
    return await downloadQuotationPdf(fallbackElementId, fileName);
  }
}

