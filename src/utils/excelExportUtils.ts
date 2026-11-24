import ExcelJS from 'exceljs';
import { UPVCProject, UPVCFrame } from '../types/upvc';
import {
  calculateAssemblyBounds,
  DEFAULT_COLORS,
  generateCuttingSchedule,
  calculateBOM,
} from './upvcCalculations';
import { downloadBlob, svgElementToPngDataUrl } from './exportUtils';
import { getGlassDisplayName } from './glassUtils';
import { renderCadElevationSvgString } from '../components/CadElevationDrawing';
import { calculateHandlePlacement } from './handlePlacement';

export interface ExcelExportRow {
  srNo: number | string;
  drawingName: string;
  dimensions?: string;
  glassName?: string;
  series?: string;
  color?: string;
  qty: number;
  area?: string;
  rate?: string;
  amount?: string;
  drawingImageBase64?: string;
  frame?: UPVCFrame;
}

export interface ExcelQuotationOptions {
  project: UPVCProject;
  companyProfile?: {
    name?: string;
    companyName?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    phone2?: string;
    email?: string;
    gstin?: string;
    logoUrl?: string;
    bankName?: string;
    accountName?: string;
    accountNo?: string;
    ifsc?: string;
    branch?: string;
    upiId?: string;
  };
  clientName?: string;
  refNo?: string;
  quoteDate?: string;
  validUntil?: string;
  siteAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  rows?: ExcelExportRow[];
  summary?: {
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
  terms?: string[];
  guaranteeTerms?: string[];
  filename?: string;
  columnWidths?: Partial<ExcelColumnWidths>;
  customColumns?: Array<{ id: string; name: string; width?: number }>;
}

export interface ExcelColumnWidths {
  sr: number;        // Sr No (Col A)
  cad: number;       // CAD Drawing (Col B)
  name: number;      // Window/Door Name & Type (Col C)
  dim: number;       // Dimensions W × H mm (Col D)
  series: number;    // Series & Color (Col E)
  glass: number;     // Glass Spec (Col F)
  qty: number;       // Qty (Col G)
  area: number;      // Area Sq.Ft (Col H)
  rate: number;      // Rate Rs./Sq.Ft (Col I)
  amount: number;    // Total Amount Rs. (Col J)
  [colKey: string]: number | undefined;
}

export const DEFAULT_EXCEL_COLUMN_WIDTHS: ExcelColumnWidths = {
  sr: 8,
  cad: 36,
  name: 30,
  dim: 22,
  series: 22,
  glass: 24,
  qty: 10,
  area: 15,
  rate: 16,
  amount: 20,
};

export const EXCEL_COLUMN_STORAGE_KEY = 'upvc_excel_column_widths';

export function getSavedExcelColumnWidths(): ExcelColumnWidths {
  try {
    const raw = localStorage.getItem(EXCEL_COLUMN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_EXCEL_COLUMN_WIDTHS,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved excel column widths:', e);
  }
  return { ...DEFAULT_EXCEL_COLUMN_WIDTHS };
}

export function saveExcelColumnWidths(widths: Partial<ExcelColumnWidths>): ExcelColumnWidths {
  try {
    const current = getSavedExcelColumnWidths();
    const updated = { ...current, ...widths };
    localStorage.setItem(EXCEL_COLUMN_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save excel column widths:', e);
    return { ...DEFAULT_EXCEL_COLUMN_WIDTHS, ...widths };
  }
}

export interface ElevationSheetColumnWidths {
  sNo: number;         // Col A: S.NO. (default: 8)
  discription: number; // Col B: DISCRIPTION with embedded CAD Drawing (default: 44)
  designName: number;  // Col C: DESIGN NAME, dimensions & area (default: 32)
  glass: number;       // Col D: GLASS specification (default: 28)
  rowHeight: number;   // CAD drawing row height in pt (default: 135)
}

export const DEFAULT_ELEVATION_SHEET_COLUMN_WIDTHS: ElevationSheetColumnWidths = {
  sNo: 8,
  discription: 44,
  designName: 32,
  glass: 28,
  rowHeight: 135,
};

export const ELEVATION_SHEET_STORAGE_KEY = 'upvc_elevation_sheet_excel_col_widths';

export function getSavedElevationSheetExcelColWidths(): ElevationSheetColumnWidths {
  try {
    const saved = localStorage.getItem(ELEVATION_SHEET_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_ELEVATION_SHEET_COLUMN_WIDTHS,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved elevation sheet excel column widths:', e);
  }
  return { ...DEFAULT_ELEVATION_SHEET_COLUMN_WIDTHS };
}

export function saveElevationSheetExcelColWidths(
  widths: Partial<ElevationSheetColumnWidths>
): ElevationSheetColumnWidths {
  try {
    const current = getSavedElevationSheetExcelColWidths();
    const updated = { ...current, ...widths };
    localStorage.setItem(ELEVATION_SHEET_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save elevation sheet excel column widths:', e);
    return { ...DEFAULT_ELEVATION_SHEET_COLUMN_WIDTHS, ...widths };
  }
}

export interface ImageStyleQuotationExcelOptions {
  companyName?: string;
  addressLine1?: string;
  addressLine2?: string;
  phone?: string;
  quoteNo?: string;
  quoteDate?: string;
  customerName?: string;
  customerPhone?: string;
  siteAddress?: string;
  items: Array<{
    sNo: number | string;
    designName: string;
    glass: string;
    width: number;
    height: number;
    sqFt: number;
    frame?: UPVCFrame;
  }>;
  financialSummary?: {
    itemTitle?: string;
    totalSqFt?: number;
    ratePerSqFt?: number;
    price?: number;
    cartageAmount?: number;
    totalAmount?: number;
  };
  terms?: string[];
  paymentTerms?: string;
  warrantyText?: string;
  filename?: string;
  columnWidths?: Partial<ElevationSheetColumnWidths>;
}

/**
 * Generates an SVG string of a single UPVC frame with outer dimensions and pocket glass zones.
 */
export function generateSingleFrameCadSvgString(frame: UPVCFrame): string {
  try {
    const rendered = renderCadElevationSvgString({
      frames: [frame],
      couplings: [],
      showDimensions: true,
      showLabels: true,
      showHandles: true,
      showArrows: true,
      isExport: true,
      excelLegibilityMode: true,
    });
    if (rendered && rendered.length > 100) {
      return rendered;
    }
  } catch (err) {
    console.warn('renderCadElevationSvgString failed in generateSingleFrameCadSvgString:', err);
  }

  const pad = 60;
  const minX = frame.x - pad;
  const minY = frame.y - pad;
  const totalW = frame.width + pad * 2;
  const totalH = frame.height + pad * 2;
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

  // Pockets
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
        sashSymbol = `<polygon points="${pX + p.width - 8},${pY + 8} ${pX + 8},${apexY} ${pX + p.width - 8},${pY + p.height - 8}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="6 4" />`;
      } else if (p.sashType === 'casement_right') {
        sashSymbol = `<polygon points="${pX + 8},${pY + 8} ${pX + p.width - 8},${apexY} ${pX + 8},${pY + p.height - 8}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="6 4" />`;
      } else if (p.sashType === 'top_hung') {
        sashSymbol = `<polygon points="${pX + 8},${pY + 8} ${centerX},${pY + p.height - 8} ${pX + p.width - 8},${pY + 8}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="6 4" />`;
      } else if (p.sashType === 'bottom_hung') {
        sashSymbol = `<polygon points="${pX + 8},${pY + p.height - 8} ${centerX},${pY + 8} ${pX + p.width - 8},${pY + p.height - 8}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="6 4" />`;
      } else if (p.sashType?.startsWith('slider') || p.sashType?.includes('sliding')) {
        sashSymbol = `
          <line x1="${centerX}" y1="${pY}" x2="${centerX}" y2="${pY + p.height}" stroke="#0284c7" stroke-width="2" />
          <path d="M ${pX + p.width * 0.25} ${centerY} L ${pX + p.width * 0.4} ${centerY} M ${pX + p.width * 0.35} ${centerY - 5} L ${pX + p.width * 0.4} ${centerY} L ${pX + p.width * 0.35} ${centerY + 5}" stroke="#0284c7" stroke-width="2" fill="none" />
          <path d="M ${pX + p.width * 0.75} ${centerY} L ${pX + p.width * 0.6} ${centerY} M ${pX + p.width * 0.65} ${centerY - 5} L ${pX + p.width * 0.6} ${centerY} L ${pX + p.width * 0.65} ${centerY + 5}" stroke="#0284c7" stroke-width="2" fill="none" />
        `;
      } else if (p.sashType === 'louver' || p.sashType === 'ac_provision') {
        const blades = [];
        for (let ly = pY + 12; ly < pY + p.height - 8; ly += 14) {
          blades.push(`<line x1="${pX + 6}" y1="${ly}" x2="${pX + p.width - 6}" y2="${ly}" stroke="#64748b" stroke-width="2" />`);
        }
        sashSymbol = blades.join('\n');
      }

      const isAcOrFan =
        p.sashType === 'ac_provision' ||
        p.sashType === 'window_ac' ||
        p.sashType === 'exhaust_fan' ||
        p.sashType === 'fan_provision';
      const pocketFill = isAcOrFan ? '#fef3c7' : '#e0f2fe';

      // Georgian Bar Grid in Excel CAD Drawing
      const gPatt = p.georgianBar?.pattern || p.gridPattern;
      let georgianGridSvg = '';
      if (gPatt && gPatt !== 'none') {
        const barColor = p.georgianBar?.color === 'white' ? '#cbd5e1' : p.georgianBar?.color === 'black' ? '#18181b' : '#d97706';
        const barW = 2.5;
        if (gPatt === 'georgian_2x2') {
          georgianGridSvg = `
            <line x1="${centerX}" y1="${pY}" x2="${centerX}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX}" y1="${centerY}" x2="${pX + p.width}" y2="${centerY}" stroke="${barColor}" stroke-width="${barW}" />
          `;
        } else if (gPatt === 'georgian_2x3') {
          georgianGridSvg = `
            <line x1="${centerX}" y1="${pY}" x2="${centerX}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX}" y1="${pY + p.height / 3}" x2="${pX + p.width}" y2="${pY + p.height / 3}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX}" y1="${pY + (2 * p.height) / 3}" x2="${pX + p.width}" y2="${pY + (2 * p.height) / 3}" stroke="${barColor}" stroke-width="${barW}" />
          `;
        } else if (gPatt === 'georgian_3x2') {
          georgianGridSvg = `
            <line x1="${pX + p.width / 3}" y1="${pY}" x2="${pX + p.width / 3}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX + (2 * p.width) / 3}" y1="${pY}" x2="${pX + (2 * p.width) / 3}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX}" y1="${centerY}" x2="${pX + p.width}" y2="${centerY}" stroke="${barColor}" stroke-width="${barW}" />
          `;
        } else if (gPatt === 'georgian_3x3') {
          georgianGridSvg = `
            <line x1="${pX + p.width / 3}" y1="${pY}" x2="${pX + p.width / 3}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX + (2 * p.width) / 3}" y1="${pY}" x2="${pX + (2 * p.width) / 3}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX}" y1="${pY + p.height / 3}" x2="${pX + p.width}" y2="${pY + p.height / 3}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX}" y1="${pY + (2 * p.height) / 3}" x2="${pX + p.width}" y2="${pY + (2 * p.height) / 3}" stroke="${barColor}" stroke-width="${barW}" />
          `;
        } else if (gPatt === 'georgian_prairie' || gPatt === 'georgian_colonial') {
          const mX = Math.round(p.width * 0.16);
          const mY = Math.round(p.height * 0.16);
          georgianGridSvg = `
            <rect x="${pX + mX}" y="${pY + mY}" width="${p.width - 2 * mX}" height="${p.height - 2 * mY}" fill="none" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX + mX}" y1="${pY}" x2="${pX + mX}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX + p.width - mX}" y1="${pY}" x2="${pX + p.width - mX}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX}" y1="${pY + mY}" x2="${pX + p.width}" y2="${pY + mY}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX}" y1="${pY + p.height - mY}" x2="${pX + p.width}" y2="${pY + p.height - mY}" stroke="${barColor}" stroke-width="${barW}" />
          `;
        } else if (gPatt === 'georgian_diamond') {
          georgianGridSvg = `
            <line x1="${pX}" y1="${pY}" x2="${pX + p.width}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
            <line x1="${pX + p.width}" y1="${pY}" x2="${pX}" y2="${pY + p.height}" stroke="${barColor}" stroke-width="${barW}" />
          `;
        }
      }

      return `
        <g id="pocket-${p.id}">
          <rect x="${pX}" y="${pY}" width="${p.width}" height="${p.height}" fill="${pocketFill}" stroke="#334155" stroke-width="1.5" opacity="0.95" />
          ${georgianGridSvg}
          ${sashSymbol}
          <text x="${centerX}" y="${centerY - 8}" font-size="12" font-family="sans-serif" font-weight="bold" fill="#0f172a" text-anchor="middle">${(p.sashType || 'Fixed').toUpperCase().replace(/_/g, ' ')}</text>
          <text x="${centerX}" y="${centerY + 14}" font-size="10" font-family="sans-serif" fill="#475569" text-anchor="middle">${Math.round(p.width)} × ${Math.round(p.height)} mm</text>
        </g>
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
  <rect x="${minX}" y="${minY}" width="${totalW}" height="${totalH}" fill="#ffffff" />
  <g id="frame-${frame.id}">
    <rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" fill="${frameColor}" stroke="#0f172a" stroke-width="4" rx="2" />
    <rect x="${frame.x + fpw}" y="${frame.y + fpw}" width="${frame.width - 2 * fpw}" height="${frame.height - 2 * fpw}" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5" />
    ${pocketsSvg}
    ${mullionsSvg}
    <!-- Width Callout -->
    <g transform="translate(${frame.x + frame.width / 2}, ${frame.y - 20})">
      <rect x="-45" y="-12" width="90" height="24" rx="5" fill="#ffffff" stroke="#0f172a" stroke-width="1.5" />
      <text x="0" y="4" font-size="12" font-weight="900" font-family="sans-serif" fill="#0f172a" text-anchor="middle">${Math.round(frame.width)} mm</text>
    </g>
    <!-- Height Callout (Horizontal) -->
    <g transform="translate(${frame.x - 48}, ${frame.y + frame.height / 2})">
      <rect x="-45" y="-12" width="90" height="24" rx="5" fill="#ffffff" stroke="#0f172a" stroke-width="1.5" />
      <text x="0" y="4" font-size="12" font-weight="900" font-family="sans-serif" fill="#0f172a" text-anchor="middle">${Math.round(frame.height)} mm</text>
    </g>
  </g>
</svg>`;
}

/**
 * Converts SVG markup into high-res (2400px+ / 300 DPI) PNG base64 string using in-browser Canvas.
 * Automatically injects width/height attributes and vector precision styles so numbers and
 * dimension lines stay razor-sharp even when embedded or zoomed in Excel.
 */
export async function svgStringToPngBase64(svgString: string, targetWidth = 2400, targetHeight = 1600): Promise<string> {
  return new Promise((resolve) => {
    try {
      // 1. Determine viewBox and preserve aspect ratio
      let vbW = targetWidth;
      let vbH = targetHeight;
      const vbMatch = svgString.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
      if (vbMatch) {
        vbW = Math.abs(parseFloat(vbMatch[3])) || targetWidth;
        vbH = Math.abs(parseFloat(vbMatch[4])) || targetHeight;
      }

      const aspect = vbW / Math.max(1, vbH);
      let renderW = targetWidth;
      let renderH = Math.round(renderW / aspect);
      if (aspect < 0.7) {
        renderH = targetWidth;
        renderW = Math.round(renderH * aspect);
      }
      renderW = Math.max(1600, Math.min(3600, renderW));
      renderH = Math.max(1200, Math.min(3600, renderH));

      // Inject explicit width and height on root <svg> so browser rasterizes at full resolution
      let enhancedSvg = svgString.replace(
        /<svg\b([^>]*)/i,
        (_match, attrs) => {
          const cleanAttrs = attrs
            .replace(/\bwidth=["'][^"']*["']/gi, '')
            .replace(/\bheight=["'][^"']*["']/gi, '');
          return `<svg width="${renderW}" height="${renderH}" ${cleanAttrs}`;
        }
      );

      // Inject crisp vector styling for maximum legibility in Excel
      const styleInjection = `
        <style>
          text {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
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
        resolve('');
      }, 3500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = renderW;
          canvas.height = renderH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, renderW, renderH);
            ctx.drawImage(img, 0, 0, renderW, renderH);
            const dataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            resolve(dataUrl);
            return;
          }
        } catch {
          // ignore
        }
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.src = url;
    } catch {
      resolve('');
    }
  });
}

/**
 * Generates an industrial-grade, multi-tab Excel Workbook (.xlsx) with embedded CAD drawings,
 * complete with quotation breakdown, cutting schedule, and hardware BOM.
 */
export async function generateQuotationExcelWithCad(options: ExcelQuotationOptions): Promise<Blob> {
  const {
    project,
    companyProfile = {},
    clientName = 'Valued Client',
    refNo = 'QT-2026-001',
    quoteDate = new Date().toLocaleDateString('en-GB'),
    validUntil = '15 Days from Date',
    siteAddress = '',
    clientPhone = '',
    clientEmail = '',
    rows: providedRows,
    summary: providedSummary,
    terms,
    guaranteeTerms,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyProfile.name || companyProfile.companyName || 'UPVC CAD Master';
  workbook.lastModifiedBy = 'UPVC CAD Designer';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ---------------------------------------------------------------------------------
  // SHEET 1: Quotation & CAD Drawings (खिड़की/दरवाजा CAD ड्रॉइंग एवं कोटेशन)
  // ---------------------------------------------------------------------------------
  const wsQuote = workbook.addWorksheet('Quotation & CAD Drawings', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ showGridLines: true }],
  });

  const colWidths: ExcelColumnWidths = {
    ...getSavedExcelColumnWidths(),
    ...(options.columnWidths || {}),
  };

  // Column definitions configured dynamically by user settings
  wsQuote.columns = [
    { key: 'sr', width: Number(colWidths.sr) || 8 },         // Col A: Sr No
    { key: 'cad', width: Number(colWidths.cad) || 36 },      // Col B: CAD Drawing (Wide for embedded image!)
    { key: 'name', width: Number(colWidths.name) || 30 },     // Col C: Drawing Name / Type
    { key: 'dim', width: Number(colWidths.dim) || 22 },       // Col D: Dimensions (W x H mm)
    { key: 'series', width: Number(colWidths.series) || 22 }, // Col E: Series & Color
    { key: 'glass', width: Number(colWidths.glass) || 24 },   // Col F: Glass Specification
    { key: 'qty', width: Number(colWidths.qty) || 10 },       // Col G: Qty
    { key: 'area', width: Number(colWidths.area) || 15 },     // Col H: Area (Sq.Ft)
    { key: 'rate', width: Number(colWidths.rate) || 16 },     // Col I: Rate (Rs./Sq.Ft)
    { key: 'amount', width: Number(colWidths.amount) || 20 }, // Col J: Total Amount (Rs.)
  ];

  // 1. Company Header Banner (Row 1)
  const compTitle = companyProfile.name || companyProfile.companyName || 'REMIX uPVC WINDOWS & DOORS';
  const tagline = companyProfile.tagline || 'Fabrication, Thermal & Acoustic Glazing Solutions';
  
  wsQuote.mergeCells('A1:J1');
  const titleRow = wsQuote.getCell('A1');
  titleRow.value = `${compTitle.toUpperCase()} — ${tagline}`;
  titleRow.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Dark slate
  };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  wsQuote.getRow(1).height = 32;

  // 2. Company Address & Contact Details (Row 2)
  const contactInfo = [
    companyProfile.address ? `Address: ${companyProfile.address}` : '',
    companyProfile.phone ? `Mob: ${companyProfile.phone}` : '',
    companyProfile.email ? `Email: ${companyProfile.email}` : '',
    companyProfile.gstin ? `GSTIN: ${companyProfile.gstin}` : '',
  ].filter(Boolean).join('  |  ');

  wsQuote.mergeCells('A2:J2');
  const contactRow = wsQuote.getCell('A2');
  contactRow.value = contactInfo || 'Premium German & Indian Standard Multi-Chamber uPVC Window/Door Systems';
  contactRow.font = { name: 'Arial', size: 9, bold: false, color: { argb: 'FF334155' } };
  contactRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  contactRow.alignment = { horizontal: 'center', vertical: 'middle' };
  wsQuote.getRow(2).height = 20;

  // 3. Client & Quotation Metadata Box (Rows 4-6)
  wsQuote.getRow(3).height = 8; // Spacer

  // Left card: Client
  wsQuote.mergeCells('A4:E4');
  wsQuote.getCell('A4').value = `CLIENT / BILLING DETAILS: ${clientName.toUpperCase()}`;
  wsQuote.getCell('A4').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  wsQuote.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  wsQuote.mergeCells('A5:E5');
  wsQuote.getCell('A5').value = `Site Address: ${siteAddress || 'As per delivery schedule'}`;
  wsQuote.getCell('A5').font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };

  wsQuote.mergeCells('A6:E6');
  wsQuote.getCell('A6').value = `Phone: ${clientPhone || '-'}   |   Email: ${clientEmail || '-'}`;
  wsQuote.getCell('A6').font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };

  // Right card: Quote Details
  wsQuote.mergeCells('F4:J4');
  wsQuote.getCell('F4').value = `QUOTATION ESTIMATE & CAD SCHEDULE`;
  wsQuote.getCell('F4').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  wsQuote.getCell('F4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; // Blue
  wsQuote.getCell('F4').alignment = { horizontal: 'center' };

  wsQuote.mergeCells('F5:J5');
  wsQuote.getCell('F5').value = `Quote Ref: ${refNo}   |   Date: ${quoteDate}   |   Valid: ${validUntil}`;
  wsQuote.getCell('F5').font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
  wsQuote.getCell('F5').alignment = { horizontal: 'center' };

  wsQuote.mergeCells('F6:J6');
  wsQuote.getCell('F6').value = `Project: ${project.name || 'UPVC Architectural Project'}   |   Total Assemblies: ${project.frames?.length || 1}`;
  wsQuote.getCell('F6').font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
  wsQuote.getCell('F6').alignment = { horizontal: 'center' };

  wsQuote.getRow(7).height = 10; // Spacer

  // 4. Quotation Table Headers (Row 8)
  const headerRowIdx = 8;
  const tableHeaders = [
    'Sr.',
    'CAD Elevation Drawing\n(खिड़की CAD चित्र)',
    'Window / Door Description',
    'Dimensions\n(W × H mm)',
    'Profile Series & Color',
    'Glass Specification',
    'Qty',
    'Area\n(Sq.Ft)',
    'Rate\n(Rs./Sq.Ft)',
    'Total Amount\n(Rs.)',
  ];

  const headerRow = wsQuote.getRow(headerRowIdx);
  headerRow.values = tableHeaders;
  headerRow.height = 30;

  headerRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNum >= 8 ? 'FF1E40AF' : 'FF1E293B' }, // Darker blue for commercial columns
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF475569' } },
    };
  });

  // Prepare data rows
  const frames = project.frames || [];
  let rowsToExport: ExcelExportRow[] = [];

  if (providedRows && providedRows.length > 0) {
    rowsToExport = providedRows;
  } else {
    // Generate from project frames
    rowsToExport = frames.map((f, idx) => {
      const areaSqFt = ((f.width * f.height) / (304.8 * 304.8)).toFixed(2);
      const colorObj = DEFAULT_COLORS.find((c) => c.id === f.color) || DEFAULT_COLORS[0];
      const rate = 570;
      const amt = Math.round(parseFloat(areaSqFt) * rate);

      const firstPocket = f.pockets?.[0];
      const glassSpec = getGlassDisplayName(
        firstPocket?.glassType,
        firstPocket?.glassName || f.glassName
      );

      return {
        srNo: idx + 1,
        drawingName: f.name || `Frame ${idx + 1}`,
        dimensions: `${Math.round(f.width)} × ${Math.round(f.height)} mm`,
        series: `${f.series || '60mm Series'} / ${colorObj.name}`,
        glassName: glassSpec,
        qty: 1,
        area: areaSqFt,
        rate: String(rate),
        amount: amt.toLocaleString('en-IN'),
        frame: f,
      };
    });
  }

  // Populate Quotation Rows with Embedded CAD Images
  let currentRowIdx = 9;

  for (const r of rowsToExport) {
    const row = wsQuote.getRow(currentRowIdx);
    row.height = 100; // Tall row to accommodate clear CAD drawing!

    row.values = [
      r.srNo,
      '', // Col B: Left blank for embedded image overlay
      r.drawingName,
      r.dimensions || '-',
      r.series || '60mm uPVC / White',
      r.glassName || '5mm Clear Toughened',
      r.qty,
      parseFloat(String(r.area || '0').replace(/,/g, '')),
      parseFloat(String(r.rate || '0').replace(/,/g, '')),
      parseFloat(String(r.amount || '0').replace(/,/g, '')),
    ];

    // Alignments and borders
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { name: 'Arial', size: 9, bold: colNum === 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 1 || colNum === 7 ? 'center' : colNum >= 8 ? 'right' : colNum === 4 ? 'center' : 'left',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };

      // Number formats
      if (colNum === 8) cell.numFmt = '#,##0.00';
      if (colNum === 9 || colNum === 10) cell.numFmt = '₹#,##0';
    });

    // Obtain or generate CAD Drawing PNG Base64
    let base64Png = r.drawingImageBase64;
    if (!base64Png && r.frame) {
      try {
        const svgStr = generateSingleFrameCadSvgString(r.frame);
        base64Png = await svgStringToPngBase64(svgStr, 2400, 1600);
      } catch {
        // ignore
      }
    }

    // Embed CAD Image into Column B of current row
    if (base64Png && base64Png.includes('base64,')) {
      try {
        const cleanBase64 = base64Png.split('base64,')[1];
        const imageId = workbook.addImage({
          base64: cleanBase64,
          extension: 'png',
        });

        const cadColW = Number(colWidths.cad) || 36;
        const imgW = Math.max(140, Math.min(Math.round(cadColW * 5.6), 380));
        const imgH = 110;
        wsQuote.addImage(imageId, {
          tl: { col: 1.04, row: currentRowIdx - 1 + 0.05 },
          ext: { width: imgW, height: imgH },
          editAs: 'oneCell',
        });
      } catch (err) {
        console.warn('Could not embed CAD image into Excel cell:', err);
      }
    } else {
      // Fallback text in CAD cell if image could not be loaded
      wsQuote.getCell(`B${currentRowIdx}`).value = `[CAD Elevation]\n${r.dimensions || ''}`;
      wsQuote.getCell(`B${currentRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    currentRowIdx++;
  }

  // 5. Commercial Summary Section (Bottom Table)
  const summaryRowStart = currentRowIdx + 1;

  // Base Subtotal Row
  const totalSqFt = providedSummary?.totalArea || rowsToExport.reduce((sum, r) => sum + (parseFloat(String(r.area).replace(/,/g, '')) || 0), 0).toFixed(2);
  const totalAmt = providedSummary?.totalAmount || rowsToExport.reduce((sum, r) => sum + (parseFloat(String(r.amount).replace(/,/g, '')) || 0), 0).toLocaleString('en-IN');

  wsQuote.mergeCells(`A${summaryRowStart}:G${summaryRowStart}`);
  const sumHeader = wsQuote.getCell(`A${summaryRowStart}`);
  sumHeader.value = providedSummary?.baseItemLabel || 'TOTAL uPVC WINDOWS & DOORS BASE ESTIMATE';
  sumHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  sumHeader.alignment = { horizontal: 'right', vertical: 'middle' };
  sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

  wsQuote.getCell(`H${summaryRowStart}`).value = parseFloat(totalSqFt);
  wsQuote.getCell(`H${summaryRowStart}`).font = { name: 'Arial', size: 10, bold: true };
  wsQuote.getCell(`H${summaryRowStart}`).numFmt = '#,##0.00';
  wsQuote.getCell(`H${summaryRowStart}`).alignment = { horizontal: 'right', vertical: 'middle' };

  wsQuote.getCell(`I${summaryRowStart}`).value = '-';
  wsQuote.getCell(`I${summaryRowStart}`).alignment = { horizontal: 'center', vertical: 'middle' };

  wsQuote.getCell(`J${summaryRowStart}`).value = parseFloat(String(totalAmt).replace(/,/g, ''));
  wsQuote.getCell(`J${summaryRowStart}`).font = { name: 'Arial', size: 10, bold: true };
  wsQuote.getCell(`J${summaryRowStart}`).numFmt = '₹#,##0';
  wsQuote.getCell(`J${summaryRowStart}`).alignment = { horizontal: 'right', vertical: 'middle' };
  wsQuote.getRow(summaryRowStart).height = 24;

  let lastSummaryRow = summaryRowStart;

  // Additional Charges (Freight, Installation, Hardware upgrades, etc.)
  if (providedSummary?.charges && providedSummary.charges.length > 0) {
    for (const chg of providedSummary.charges) {
      lastSummaryRow++;
      wsQuote.mergeCells(`A${lastSummaryRow}:I${lastSummaryRow}`);
      const chgLbl = wsQuote.getCell(`A${lastSummaryRow}`);
      chgLbl.value = `+ ${chg.label}`;
      chgLbl.font = { name: 'Arial', size: 9, bold: false, color: { argb: 'FF475569' } };
      chgLbl.alignment = { horizontal: 'right', vertical: 'middle' };

      const chgVal = wsQuote.getCell(`J${lastSummaryRow}`);
      chgVal.value = parseFloat(chg.amount.replace(/,/g, ''));
      chgVal.font = { name: 'Arial', size: 9, bold: false };
      chgVal.numFmt = '₹#,##0';
      chgVal.alignment = { horizontal: 'right', vertical: 'middle' };
      wsQuote.getRow(lastSummaryRow).height = 20;
    }
  }

  // Final Grand Total Highlighted Row
  lastSummaryRow++;
  wsQuote.mergeCells(`A${lastSummaryRow}:I${lastSummaryRow}`);
  const grandTotLbl = wsQuote.getCell(`A${lastSummaryRow}`);
  grandTotLbl.value = (providedSummary?.totalAmountLabel || 'GRAND TOTAL (NET PAYABLE)').toUpperCase();
  grandTotLbl.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  grandTotLbl.alignment = { horizontal: 'right', vertical: 'middle' };
  grandTotLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Soft amber fill

  const grandTotVal = wsQuote.getCell(`J${lastSummaryRow}`);
  grandTotVal.value = parseFloat(String(totalAmt).replace(/,/g, ''));
  grandTotVal.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
  grandTotVal.numFmt = '₹#,##0';
  grandTotVal.alignment = { horizontal: 'right', vertical: 'middle' };
  grandTotVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  wsQuote.getRow(lastSummaryRow).height = 28;

  // Advance and Balance Due (if specified)
  if (providedSummary?.advanceAmount && parseFloat(providedSummary.advanceAmount.replace(/,/g, '')) > 0) {
    lastSummaryRow++;
    wsQuote.mergeCells(`A${lastSummaryRow}:I${lastSummaryRow}`);
    wsQuote.getCell(`A${lastSummaryRow}`).value = providedSummary.advanceAmountLabel || 'ADVANCE RECEIVED:';
    wsQuote.getCell(`A${lastSummaryRow}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
    wsQuote.getCell(`A${lastSummaryRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

    wsQuote.getCell(`J${lastSummaryRow}`).value = parseFloat(providedSummary.advanceAmount.replace(/,/g, ''));
    wsQuote.getCell(`J${lastSummaryRow}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
    wsQuote.getCell(`J${lastSummaryRow}`).numFmt = '₹#,##0';
    wsQuote.getCell(`J${lastSummaryRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

    lastSummaryRow++;
    wsQuote.mergeCells(`A${lastSummaryRow}:I${lastSummaryRow}`);
    wsQuote.getCell(`A${lastSummaryRow}`).value = providedSummary.balanceLabel || 'BALANCE PAYABLE AT SITE:';
    wsQuote.getCell(`A${lastSummaryRow}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
    wsQuote.getCell(`A${lastSummaryRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

    wsQuote.getCell(`J${lastSummaryRow}`).value = parseFloat(String(providedSummary.balanceAmount || '0').replace(/,/g, ''));
    wsQuote.getCell(`J${lastSummaryRow}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
    wsQuote.getCell(`J${lastSummaryRow}`).numFmt = '₹#,##0';
    wsQuote.getCell(`J${lastSummaryRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  // 6. Bank Details & Terms & Conditions (Footer Rows)
  lastSummaryRow += 2;
  wsQuote.mergeCells(`A${lastSummaryRow}:D${lastSummaryRow}`);
  wsQuote.getCell(`A${lastSummaryRow}`).value = 'BANK DETAILS FOR RTGS / NEFT / UPI PAYMENT:';
  wsQuote.getCell(`A${lastSummaryRow}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
  wsQuote.getCell(`A${lastSummaryRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  wsQuote.mergeCells(`F${lastSummaryRow}:J${lastSummaryRow}`);
  wsQuote.getCell(`F${lastSummaryRow}`).value = 'TERMS & WARRANTY GUARANTEE:';
  wsQuote.getCell(`F${lastSummaryRow}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
  wsQuote.getCell(`F${lastSummaryRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  const bankLines = [
    `Bank Name: ${companyProfile.bankName || 'HDFC Bank Ltd.'}`,
    `A/C Name: ${companyProfile.accountName || compTitle}`,
    `A/C No: ${companyProfile.accountNo || '50200012345678'}`,
    `IFSC Code: ${companyProfile.ifsc || 'HDFC0001234'}   |   UPI ID: ${companyProfile.upiId || 'remix@upi'}`,
  ];

  const defaultTerms = terms || [
    '1. 50% Advance with Purchase Order, 40% before dispatch, 10% on installation.',
    '2. Delivery schedule: 10-15 business days from measurement confirmation.',
    '3. 10 Years Warranty on uPVC Profiles against discoloration, cracking & warping.',
    '4. 1 Year comprehensive guarantee on all moving rollers, locks, hinges & hardware.',
  ];

  for (let i = 0; i < 4; i++) {
    const rIdx = lastSummaryRow + 1 + i;
    wsQuote.mergeCells(`A${rIdx}:D${rIdx}`);
    wsQuote.getCell(`A${rIdx}`).value = bankLines[i] || '';
    wsQuote.getCell(`A${rIdx}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF334155' } };

    wsQuote.mergeCells(`F${rIdx}:J${rIdx}`);
    wsQuote.getCell(`F${rIdx}`).value = defaultTerms[i] || '';
    wsQuote.getCell(`F${rIdx}`).font = { name: 'Arial', size: 8.5, color: { argb: 'FF334155' } };
    wsQuote.getRow(rIdx).height = 18;
  }

  // ---------------------------------------------------------------------------------
  // SHEET 2: Cutting List & Saw Schedule (प्रोफ़ाइल कटिंग लिस्ट)
  // ---------------------------------------------------------------------------------
  const wsCutting = workbook.addWorksheet('Cutting List & Saw Schedule', {
    pageSetup: { paperSize: 9, orientation: 'portrait' },
    views: [{ showGridLines: true }],
  });

  wsCutting.columns = [
    { header: 'Mark / Tag', key: 'tag', width: 14 },
    { header: 'Frame Name', key: 'frameName', width: 24 },
    { header: 'Component Type', key: 'type', width: 18 },
    { header: 'Profile Specification', key: 'prof', width: 32 },
    { header: 'Cut Length (mm)', key: 'len', width: 16 },
    { header: 'Cut Angle L', key: 'angL', width: 14 },
    { header: 'Cut Angle R', key: 'angR', width: 14 },
    { header: 'Steel Reinf (mm)', key: 'steel', width: 18 },
    { header: 'Qty', key: 'qty', width: 10 },
    { header: 'Fabrication Notes', key: 'notes', width: 28 },
  ];

  // Header styling
  const cutHeader = wsCutting.getRow(1);
  cutHeader.height = 26;
  cutHeader.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const cuttingItems = generateCuttingSchedule(project.frames || [], project.couplings || []);
  cuttingItems.forEach((item) => {
    const row = wsCutting.addRow({
      tag: item.tag,
      frameName: item.frameName,
      type: item.itemType,
      prof: item.profileName,
      len: item.length,
      angL: `${item.cutAngleLeft}°`,
      angR: `${item.cutAngleRight}°`,
      steel: item.itemType === 'Outer Frame' ? Math.max(0, item.length - 100) : item.itemType === 'Mullion' ? Math.max(0, item.length - 20) : '-',
      qty: item.quantity,
      notes: item.notes || 'Factory 3mm weld allowance included',
    });

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 1 || colNum === 6 || colNum === 7 || colNum === 9 ? 'center' : colNum === 5 || colNum === 8 ? 'right' : 'left',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // ---------------------------------------------------------------------------------
  // SHEET 3: Glass & Hardware BOM (ग्लास एवं हार्डवेयर लिस्ट)
  // ---------------------------------------------------------------------------------
  const wsBOM = workbook.addWorksheet('Glass & Hardware BOM', {
    pageSetup: { paperSize: 9, orientation: 'portrait' },
    views: [{ showGridLines: true }],
  });

  wsBOM.columns = [
    { header: 'Category', key: 'cat', width: 18 },
    { header: 'Item Name & Description', key: 'name', width: 36 },
    { header: 'Specification / Dimensions', key: 'spec', width: 28 },
    { header: 'Quantity', key: 'qty', width: 12 },
    { header: 'Unit', key: 'unit', width: 12 },
    { header: 'Unit Rate (INR)', key: 'rate', width: 16 },
    { header: 'Total Amount (INR)', key: 'amt', width: 18 },
  ];

  const bomHeader = wsBOM.getRow(1);
  bomHeader.height = 26;
  bomHeader.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const bomResult = calculateBOM(project.frames || [], project.couplings || [], project.pricingConfig);
  (bomResult.items || []).forEach((bi) => {
    const row = wsBOM.addRow({
      cat: bi.category,
      name: bi.name,
      spec: bi.description,
      qty: bi.quantity,
      unit: bi.unit,
      rate: bi.unitRate,
      amt: bi.totalAmount,
    });

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 1 || colNum === 5 ? 'center' : colNum === 4 || colNum >= 6 ? 'right' : 'left',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (colNum === 6 || colNum === 7) cell.numFmt = '₹#,##0';
    });
  });

  // Write workbook to buffer and return Blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Direct browser trigger to download the Excel workbook with CAD drawings
 */
export async function downloadQuotationExcelWithCad(options: ExcelQuotationOptions): Promise<boolean> {
  try {
    const blob = await generateQuotationExcelWithCad(options);
    const clientSanitized = (options.clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = options.filename || `Quotation_${clientSanitized}_with_CAD_Drawings.xlsx`;
    downloadBlob(filename, blob);
    return true;
  } catch (err) {
    console.error('Error generating Excel with CAD drawings:', err);
    return false;
  }
}

/**
 * Generates an Excel quotation spreadsheet matching the exact layout of the user's reference image
 * (Official Elevation Quotation Sheet format / Shri Balaji Traders style):
 * - Company Header with logo/name, address, phone
 * - Quotation No. & Date
 * - 4-Column Table: S.NO. | DISCRIPTION (with CAD drawing) | DESIGN NAME | GLASS
 * - Summary box: Item Title, Total Sq.Ft, Rate, Price, Cartage, Total Amount
 * - Full Terms & Conditions (12 bullet points), Payment Terms, Warranty
 * - Authorized Signatory block
 * - User-configurable column space settings
 */
export async function generateImageStyleQuotationExcel(
  options: ImageStyleQuotationExcelOptions
): Promise<Blob> {
  const {
    companyName = 'SHRI BALAJI TRADERS',
    addressLine1 = 'GROUND FLOOR, K-39, RAJAPURI MAIN ROAD,',
    addressLine2 = 'UTTAM NAGAR, NEW DELHI - 110059',
    phone = 'MB.:9971742045',
    quoteNo = '001',
    quoteDate = new Date().toLocaleDateString('en-GB'),
    items = [],
    financialSummary,
    terms,
    paymentTerms = '50% Advance After Deliver 40% Complete workout 10%',
    warrantyText = 'Hardware 5 year Profile 20 Years',
  } = options;

  const colWidths: ElevationSheetColumnWidths = {
    ...getSavedElevationSheetExcelColWidths(),
    ...(options.columnWidths || {}),
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName;
  workbook.lastModifiedBy = 'UPVC CAD Designer';
  workbook.created = new Date();
  workbook.modified = new Date();

  const ws = workbook.addWorksheet('Quotation Sheet', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ showGridLines: true }],
  });

  // 4 Main Columns matching user's reference image
  ws.columns = [
    { key: 'sNo', width: Number(colWidths.sNo) || 8 },                  // Col A: S.NO.
    { key: 'discription', width: Number(colWidths.discription) || 44 }, // Col B: DISCRIPTION (CAD Drawing)
    { key: 'designName', width: Number(colWidths.designName) || 32 },   // Col C: DESIGN NAME
    { key: 'glass', width: Number(colWidths.glass) || 28 },             // Col D: GLASS
  ];

  // 1. Company Brand Header (Row 1)
  ws.mergeCells('A1:D1');
  const cellBrand = ws.getCell('A1');
  cellBrand.value = `卐  ${companyName.toUpperCase()}  卐`;
  cellBrand.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFB91C1C' } }; // Deep Red
  cellBrand.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // 2. Subtitle / Product Specialization (Row 2)
  ws.mergeCells('A2:D2');
  const cellSub = ws.getCell('A2');
  cellSub.value = 'PREMIUM uPVC & ALUMINIUM WINDOW & DOOR SYSTEMS';
  cellSub.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0284C7' } }; // Blue
  cellSub.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // 3. Address Lines (Row 3 & 4)
  ws.mergeCells('A3:D3');
  const cellAddr1 = ws.getCell('A3');
  cellAddr1.value = addressLine1;
  cellAddr1.font = { name: 'Arial', size: 9, bold: false, color: { argb: 'FF334155' } };
  cellAddr1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 16;

  ws.mergeCells('A4:D4');
  const cellAddr2 = ws.getCell('A4');
  cellAddr2.value = `${addressLine2}  |  ${phone}`;
  cellAddr2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
  cellAddr2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 17;

  // Thin separator border under header
  ['A4', 'B4', 'C4', 'D4'].forEach((cellRef) => {
    const c = ws.getCell(cellRef);
    c.border = {
      ...(c.border || {}),
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  });

  // Spacer (Row 5)
  ws.getRow(5).height = 6;

  // 4. Quotation Metadata Row (Row 6)
  // Left: Quot No.
  ws.mergeCells('A6:B6');
  const cellQuoteNo = ws.getCell('A6');
  cellQuoteNo.value = `Quot No. : ${quoteNo}`;
  cellQuoteNo.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
  cellQuoteNo.alignment = { horizontal: 'left', vertical: 'middle' };

  // Right: Date
  ws.mergeCells('C6:D6');
  const cellDate = ws.getCell('C6');
  cellDate.value = `Date : ${quoteDate}`;
  cellDate.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
  cellDate.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(6).height = 20;

  // Spacer (Row 7)
  ws.getRow(7).height = 4;

  // 5. Main Table Header (Row 8)
  const headerRow = ws.getRow(8);
  headerRow.height = 26;

  const headers = [
    { col: 'A', text: 'S.NO.' },
    { col: 'B', text: 'DISCRIPTION' },
    { col: 'C', text: 'DESIGN NAME' },
    { col: 'D', text: 'GLASS' },
  ];

  headers.forEach(({ col, text }) => {
    const cell = ws.getCell(`${col}8`);
    cell.value = text;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } },
    };
  });

  // 6. Window Items Rows
  let currentRowIdx = 9;
  const targetRowHeight = Number(colWidths.rowHeight) || 135;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const row = ws.getRow(currentRowIdx);
    row.height = targetRowHeight;

    // Col A: S.NO.
    const cellA = ws.getCell(`A${currentRowIdx}`);
    cellA.value = item.sNo || i + 1;
    cellA.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
    cellA.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col B: DISCRIPTION (CAD Drawing embedded as image)
    const cellB = ws.getCell(`B${currentRowIdx}`);
    cellB.value = ''; // clean background for image
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col C: DESIGN NAME & Dimensions
    const cellC = ws.getCell(`C${currentRowIdx}`);
    cellC.value = `${item.designName.toUpperCase()}\n\nSize: ${item.width} × ${item.height} mm\nArea: ${item.sqFt} Sq.Ft`;
    cellC.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
    cellC.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Col D: GLASS
    const cellD = ws.getCell(`D${currentRowIdx}`);
    cellD.value = item.glass.toUpperCase();
    cellD.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0369A1' } };
    cellD.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Apply borders to all 4 cells
    [cellA, cellB, cellC, cellD].forEach((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Generate & Embed High-Resolution CAD Elevation Drawing into Col B
    if (item.frame) {
      try {
        const svgString = renderCadElevationSvgString({
          frames: [item.frame],
          couplings: [],
          showDimensions: true,
          showLabels: true,
          showHandles: true,
          showArrows: true,
          isExport: true,
        });

        const pngBase64 = await svgStringToPngBase64(svgString, 1800, 1200);
        if (pngBase64) {
          const imageId = workbook.addImage({
            base64: pngBase64,
            extension: 'png',
          });

          const discColW = Number(colWidths.discription) || 44;
          const imgW = Math.max(160, Math.min(Math.round(discColW * 6.6), 390));
          const imgH = Math.max(90, Math.min(Math.round(targetRowHeight * 1.1), 220));

          ws.addImage(imageId, {
            tl: { col: 1.05, row: currentRowIdx - 1 + 0.05 },
            ext: { width: imgW, height: imgH },
            editAs: 'oneCell',
          });
        }
      } catch (err) {
        console.warn(`Could not embed CAD image for item ${item.sNo}:`, err);
      }
    }

    currentRowIdx++;
  }

  // Double border under table
  ['A', 'B', 'C', 'D'].forEach((col) => {
    const c = ws.getCell(`${col}${currentRowIdx - 1}`);
    c.border = {
      ...(c.border || {}),
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
    };
  });

  // Spacer
  ws.getRow(currentRowIdx).height = 6;
  currentRowIdx++;

  // 7. Commercial & Financial Summary Box (matching user's reference image)
  const defaultTotalSqFt = items.reduce((acc, curr) => acc + (curr.sqFt || 0), 0);
  const fin = financialSummary || {};
  const itemTitle = fin.itemTitle || 'upvc Windows & Door';
  const totalSqFt = fin.totalSqFt !== undefined ? fin.totalSqFt : Math.round(defaultTotalSqFt) || 68;
  const ratePerSqFt = fin.ratePerSqFt !== undefined ? fin.ratePerSqFt : 550;
  const price = fin.price !== undefined ? fin.price : Math.round(totalSqFt * ratePerSqFt);
  const cartageAmount = fin.cartageAmount !== undefined ? fin.cartageAmount : 1500;
  const totalAmount = fin.totalAmount !== undefined ? fin.totalAmount : Math.round(price + cartageAmount);

  // Summary Row 1: Item & Total Area
  const sumRow1 = ws.getRow(currentRowIdx);
  sumRow1.height = 24;

  ws.mergeCells(`A${currentRowIdx}:B${currentRowIdx}`);
  const sumTitleCell = ws.getCell(`A${currentRowIdx}`);
  sumTitleCell.value = `${itemTitle.toUpperCase()}   (Total Area: ${totalSqFt} Sq.Ft)`;
  sumTitleCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  sumTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sumTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

  const rateCell = ws.getCell(`C${currentRowIdx}`);
  rateCell.value = `Rate: ₹${ratePerSqFt} / Sq.Ft`;
  rateCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  rateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

  const priceCell = ws.getCell(`D${currentRowIdx}`);
  priceCell.value = `Price: ₹${price.toLocaleString('en-IN')}`;
  priceCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  priceCell.alignment = { horizontal: 'right', vertical: 'middle' };
  priceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

  ['A', 'B', 'C', 'D'].forEach((col) => {
    ws.getCell(`${col}${currentRowIdx}`).border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  currentRowIdx++;

  // Summary Row 2: Cartage & Final Grand Total
  const sumRow2 = ws.getRow(currentRowIdx);
  sumRow2.height = 28;

  ws.mergeCells(`A${currentRowIdx}:B${currentRowIdx}`);
  const cartageCell = ws.getCell(`A${currentRowIdx}`);
  cartageCell.value = `Cartage & Freight Charges: ₹${cartageAmount.toLocaleString('en-IN')}`;
  cartageCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  cartageCell.alignment = { horizontal: 'left', vertical: 'middle' };
  cartageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  ws.mergeCells(`C${currentRowIdx}:D${currentRowIdx}`);
  const grandTotalCell = ws.getCell(`C${currentRowIdx}`);
  grandTotalCell.value = `GRAND TOTAL : ₹${totalAmount.toLocaleString('en-IN')}`;
  grandTotalCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFB91C1C' } };
  grandTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
  grandTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };

  ['A', 'B', 'C', 'D'].forEach((col) => {
    ws.getCell(`${col}${currentRowIdx}`).border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  currentRowIdx++;

  // Spacer
  ws.getRow(currentRowIdx).height = 10;
  currentRowIdx++;

  // 8. Terms & Conditions Section (Row by Row)
  const defaultTermsList: string[] = [
    `${companyName} shall not be responsible for any kind of breakage of glass after installation.`,
    `Goods once delivered at site will be under the safety and security of the customer.`,
    `Cleaning of window frames and glass is not included in our scope of work.`,
    `The customer shall provide required electricity free of cost for installation work.`,
    `Protective film should be removed immediately after installation.`,
    `This quotation shall remain valid for 30 (Thirty) days from the date of issue.`,
    `Cancellation accepted only before commencement of production with 5% admin charges.`,
    `Once production has commenced, the customer is liable to pay the full order value.`,
    `Any typographical or clerical error in quotation shall be subject to correction.`,
    `Delivery timelines are approximate based on manufacturing schedule.`,
    `Any damage caused due to misuse or third-party interference is not covered under warranty.`,
  ];

  const termsToUse = terms && terms.length > 0 ? terms : defaultTermsList;

  // Terms Header
  ws.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
  const termHeader = ws.getCell(`A${currentRowIdx}`);
  termHeader.value = 'Terms & Conditions:';
  termHeader.font = { name: 'Arial', size: 10, bold: true, underline: true, color: { argb: 'FF0F172A' } };
  termHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(currentRowIdx).height = 18;
  currentRowIdx++;

  // Terms items
  termsToUse.forEach((term, idx) => {
    ws.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
    const termCell = ws.getCell(`A${currentRowIdx}`);
    termCell.value = `${idx + 1}.  ${term}`;
    termCell.font = { name: 'Arial', size: 8, color: { argb: 'FF334155' } };
    termCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ws.getRow(currentRowIdx).height = 16;
    currentRowIdx++;
  });

  // Spacer
  ws.getRow(currentRowIdx).height = 8;
  currentRowIdx++;

  // 9. Payment Terms & Warranty Box
  ws.mergeCells(`A${currentRowIdx}:B${currentRowIdx}`);
  const payCell = ws.getCell(`A${currentRowIdx}`);
  payCell.value = `Payment Terms: ${paymentTerms}`;
  payCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
  payCell.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells(`C${currentRowIdx}:D${currentRowIdx}`);
  const warCell = ws.getCell(`C${currentRowIdx}`);
  warCell.value = `Warranty: ${warrantyText}`;
  warCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
  warCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(currentRowIdx).height = 20;
  currentRowIdx++;

  // Spacer before Signature
  ws.getRow(currentRowIdx).height = 14;
  currentRowIdx++;

  // 10. Signature Box
  ws.mergeCells(`C${currentRowIdx}:D${currentRowIdx}`);
  const signCompanyCell = ws.getCell(`C${currentRowIdx}`);
  signCompanyCell.value = `For ${companyName.toUpperCase()}`;
  signCompanyCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  signCompanyCell.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(currentRowIdx).height = 18;
  currentRowIdx++;

  ws.getRow(currentRowIdx).height = 22; // space for physical stamp/sign
  currentRowIdx++;

  ws.mergeCells(`C${currentRowIdx}:D${currentRowIdx}`);
  const signLabelCell = ws.getCell(`C${currentRowIdx}`);
  signLabelCell.value = 'Authorized Signatory';
  signLabelCell.font = { name: 'Arial', size: 9, bold: true, italic: true, color: { argb: 'FF475569' } };
  signLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(currentRowIdx).height = 18;

  // Write workbook to buffer and return Blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Direct browser trigger to download the Image-Style / Elevation Sheet Excel workbook
 */
export async function downloadImageStyleQuotationExcel(
  options: ImageStyleQuotationExcelOptions
): Promise<boolean> {
  try {
    const blob = await generateImageStyleQuotationExcel(options);
    const clientSanitized = (options.customerName || options.companyName || 'Quotation').replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );
    const filename = options.filename || `Quotation_${options.quoteNo || '001'}_${clientSanitized}_Elevation_Sheet.xlsx`;
    downloadBlob(filename, blob);
    return true;
  } catch (err) {
    console.error('Error generating Elevation Sheet Excel:', err);
    return false;
  }
}
