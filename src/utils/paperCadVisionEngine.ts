import { UPVCFrame, UPVCProject, Mullion, FramePocket, SashType, GlassType } from '../types/upvc';
import { recalculateFramePockets, DEFAULT_PRICING_CONFIG } from './upvcCalculations';
import { createWorker } from 'tesseract.js';

export interface PaperScanResult {
  rawText: string;
  width: number;
  height: number;
  detectedAspect: number; // width / height from canvas geometry
  typology: 'slider_3t' | 'slider_2t' | 'casement' | 'french_door' | 'top_hung' | 'fixed' | 'door_with_toplight' | 'window_with_toplight';
  typologyLabel: string;
  typologyLabelHindi: string;
  series: 'casement_60' | 'casement_70' | 'sliding_62' | 'sliding_88' | 'sliding_3track' | 'door_premium';
  color: string;
  glassType: GlassType;
  mullionCount: number; // vertical mullions count
  transomCount: number; // horizontal transoms count
  sashAssignments: SashType[];
  confidence: number; // 0 to 100
  notes: string[];
  notesHindi: string[];
  detectedGrid: {
    columns: number;
    rows: number;
    hasTopLight: boolean;
  };
}

/**
 * Preprocess image on HTML5 Canvas and perform geometric line & aspect ratio detection
 */
export async function analyzeImageGeometry(imageElement: HTMLImageElement): Promise<{
  aspectRatio: number;
  detectedCols: number;
  detectedRows: number;
  hasTopLight: boolean;
  preprocessedDataUrl: string;
}> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { aspectRatio: 1.0, detectedCols: 2, detectedRows: 1, hasTopLight: false, preprocessedDataUrl: imageElement.src };
  }

  // Scale down for fast processing
  const maxDim = 800;
  let w = imageElement.naturalWidth || imageElement.width || 600;
  let h = imageElement.naturalHeight || imageElement.height || 600;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(imageElement, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Grayscale & Contrast stretching
  const gray = new Uint8Array(w * h);
  let minVal = 255;
  let maxVal = 0;

  for (let i = 0; i < data.length; i += 4) {
    // Luminance
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const idx = i / 4;
    gray[idx] = lum;
    if (lum < minVal) minVal = lum;
    if (lum > maxVal) maxVal = lum;
  }

  // 2. Adaptive Binarization / Threshold
  const range = Math.max(1, maxVal - minVal);
  const thresh = minVal + range * 0.45; // Dark ink strokes
  const binary = new Uint8Array(w * h);

  for (let i = 0; i < gray.length; i++) {
    binary[i] = gray[i] < thresh ? 1 : 0; // 1 = ink stroke (black)
  }

  // 3. Find outer bounding box of sketch (skip outer 5% margin to ignore scanner edges)
  const marginX = Math.round(w * 0.05);
  const marginY = Math.round(h * 0.05);
  let minX = w, maxX = 0, minY = h, maxY = 0;

  for (let y = marginY; y < h - marginY; y++) {
    for (let x = marginX; x < w - marginX; x++) {
      if (binary[y * w + x] === 1) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const sketchW = Math.max(50, maxX - minX);
  const sketchH = Math.max(50, maxY - minY);
  const rawAspect = sketchW / sketchH;

  // 4. Horizontal & Vertical projection profiles inside sketch box to detect dividers (mullions / transoms)
  const vProfile = new Int32Array(sketchW);
  const hProfile = new Int32Array(sketchH);

  for (let y = 0; y < sketchH; y++) {
    for (let x = 0; x < sketchW; x++) {
      const px = binary[(minY + y) * w + (minX + x)];
      if (px === 1) {
        vProfile[x]++;
        hProfile[y]++;
      }
    }
  }

  // Count strong vertical lines (potential vertical mullions)
  let vLines = 0;
  const vThreshold = sketchH * 0.4;
  for (let x = Math.round(sketchW * 0.2); x < sketchW * 0.8; x++) {
    if (vProfile[x] > vThreshold && vProfile[x - 1] <= vThreshold) {
      vLines++;
      x += Math.round(sketchW * 0.1); // skip nearby
    }
  }

  // Count strong horizontal lines (transoms / top-light divider)
  let hLines = 0;
  let hasTopLight = false;
  const hThreshold = sketchW * 0.4;
  for (let y = Math.round(sketchH * 0.15); y < sketchH * 0.85; y++) {
    if (hProfile[y] > hThreshold && hProfile[y - 1] <= hThreshold) {
      hLines++;
      if (y < sketchH * 0.4) {
        hasTopLight = true;
      }
      y += Math.round(sketchH * 0.1);
    }
  }

  const detectedCols = Math.min(4, Math.max(1, vLines + 1));
  const detectedRows = Math.min(3, Math.max(1, hLines + 1));

  // Visual feedback: write clean enhanced image back to canvas
  for (let i = 0; i < gray.length; i++) {
    const val = binary[i] === 1 ? 20 : 250;
    const pxIdx = i * 4;
    data[pxIdx] = val;
    data[pxIdx + 1] = val;
    data[pxIdx + 2] = val;
    data[pxIdx + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  return {
    aspectRatio: Number(rawAspect.toFixed(2)),
    detectedCols,
    detectedRows,
    hasTopLight,
    preprocessedDataUrl: canvas.toDataURL('image/jpeg', 0.85),
  };
}

/**
 * 100% In-Browser OCR using Tesseract.js WebAssembly Worker (Zero External API Tokens)
 */
export async function performTokenFreeOcr(
  imageSource: string | HTMLImageElement | File,
  onProgress?: (percent: number, status: string) => void
): Promise<string> {
  try {
    onProgress?.(15, 'Initializing local WebAssembly OCR engine...');
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress) {
          onProgress?.(Math.round(20 + m.progress * 65), `Reading handwriting & numbers (${Math.round(m.progress * 100)}%)...`);
        }
      },
    });

    onProgress?.(40, 'Scanning paper text & dimensions...');
    const ret = await worker.recognize(imageSource);
    await worker.terminate();

    onProgress?.(90, 'Parsing technical drawings & layout...');
    return ret.data.text || '';
  } catch (err) {
    console.warn('Tesseract OCR fallback triggered:', err);
    return '';
  }
}

/**
 * Rule-Based uPVC Drawing Parser & Synthesizer
 * Takes extracted OCR text + Canvas geometric contour analysis
 */
export function parsePaperDrawingContent(
  rawText: string,
  geom: {
    aspectRatio: number;
    detectedCols: number;
    detectedRows: number;
    hasTopLight: boolean;
  }
): PaperScanResult {
  const text = (rawText || '').toLowerCase();
  const notes: string[] = [];
  const notesHindi: string[] = [];

  let detectedWidth = 0;
  let detectedHeight = 0;
  let confidence = 70;

  // ----------------------------------------------------
  // 1. EXTRACT DIMENSIONS
  // ----------------------------------------------------

  // Pattern A: W 1800 H 2100 or Width: 1800 Height: 2100
  const wMatch = text.match(/(?:w|width|wd|choudai|wth|w-)\s*[:=]?\s*(\d{3,4})/i);
  const hMatch = text.match(/(?:h|height|ht|unchai|hgt|h-)\s*[:=]?\s*(\d{3,4})/i);

  if (wMatch && hMatch) {
    detectedWidth = parseInt(wMatch[1], 10);
    detectedHeight = parseInt(hMatch[1], 10);
    confidence += 15;
    notes.push(`Found explicit W:${detectedWidth}mm, H:${detectedHeight}mm tags`);
    notesHindi.push(`सीधा W:${detectedWidth}mm और H:${detectedHeight}mm माप पहचाना`);
  }

  // Pattern B: 1800 x 2100 or 1500*1200 or 1500X1500 mm
  if (!detectedWidth || !detectedHeight) {
    const dimRegex = /(\d{3,4})\s*(?:x|X|\*|by|×|\/)\s*(\d{3,4})/g;
    let match;
    const candidates: { w: number; h: number }[] = [];
    while ((match = dimRegex.exec(text)) !== null) {
      const num1 = parseInt(match[1], 10);
      const num2 = parseInt(match[2], 10);
      // Valid window range: 350mm to 6000mm
      if (num1 >= 350 && num1 <= 6000 && num2 >= 350 && num2 <= 3600) {
        candidates.push({ w: num1, h: num2 });
      }
    }

    if (candidates.length > 0) {
      // Pick first valid candidate
      detectedWidth = candidates[0].w;
      detectedHeight = candidates[0].h;
      confidence += 15;
      notes.push(`Detected size notation: ${detectedWidth} × ${detectedHeight} mm`);
      notesHindi.push(`माप मिला: ${detectedWidth} × ${detectedHeight} mm`);
    }
  }

  // Pattern C: Feet notation e.g. 5x7 ft, 4' x 5', 6 * 4 feet
  if (!detectedWidth || !detectedHeight) {
    const feetRegex = /(\d(?:\.\d+)?)\s*(?:'|ft|feet|f|foot|फुट)?\s*(?:x|X|\*|by)\s*(\d(?:\.\d+)?)\s*(?:'|ft|feet|f|foot|फुट)/i;
    const ftMatch = text.match(feetRegex);
    if (ftMatch) {
      const ftW = parseFloat(ftMatch[1]);
      const ftH = parseFloat(ftMatch[2]);
      if (ftW > 0 && ftW <= 25 && ftH > 0 && ftH <= 15) {
        detectedWidth = Math.round(ftW * 304.8 / 5) * 5; // rounded to 5mm
        detectedHeight = Math.round(ftH * 304.8 / 5) * 5;
        confidence += 10;
        notes.push(`Converted feet measurement: ${ftW}' × ${ftH}' -> ${detectedWidth} × ${detectedHeight} mm`);
        notesHindi.push(`फ़ुट को mm में बदला: ${ftW}' × ${ftH}' -> ${detectedWidth} × ${detectedHeight} mm`);
      }
    }
  }

  // Pattern D: Standalone 3-4 digit numbers with aspect ratio estimation
  if (!detectedWidth || !detectedHeight) {
    const numbers = (text.match(/\b\d{3,4}\b/g) || [])
      .map(n => parseInt(n, 10))
      .filter(n => n >= 400 && n <= 3500);

    if (numbers.length >= 2) {
      detectedWidth = numbers[0];
      detectedHeight = numbers[1];
      notes.push(`Inferred dimensions from numbers: ${detectedWidth} × ${detectedHeight} mm`);
      notesHindi.push(`नंबरों से माप अनुमानित किया: ${detectedWidth} × ${detectedHeight} mm`);
    } else if (numbers.length === 1) {
      const single = numbers[0];
      if (geom.aspectRatio >= 1) {
        detectedWidth = single;
        detectedHeight = Math.round((single / geom.aspectRatio) / 10) * 10;
      } else {
        detectedHeight = single;
        detectedWidth = Math.round((single * geom.aspectRatio) / 10) * 10;
      }
      notes.push(`Inferred second dimension from sketch aspect ratio: ${detectedWidth} × ${detectedHeight} mm`);
      notesHindi.push(`स्केच अनुपात से दूसरा माप निकाला: ${detectedWidth} × ${detectedHeight} mm`);
    }
  }

  // Fallback: If handwriting had no legible numbers, use sketch aspect ratio + sensible standard architectural scale
  if (!detectedWidth || !detectedHeight) {
    if (geom.aspectRatio < 0.65) {
      // Tall door
      detectedWidth = 900;
      detectedHeight = 2100;
      notes.push('No numeric dimensions detected; deduced Single Door 900 × 2100 mm from portrait sketch');
      notesHindi.push('कोई संख्या नहीं मिली; खड़े स्केच से 900 × 2100 mm दरवाज़ा चुना');
    } else if (geom.aspectRatio < 0.85) {
      // Tall window / French Door
      detectedWidth = 1200;
      detectedHeight = 1800;
      notes.push('Deduced Window 1200 × 1800 mm from sketch geometry');
      notesHindi.push('स्केच अनुपात से 1200 × 1800 mm खिड़की चुनी');
    } else if (geom.aspectRatio > 1.4) {
      // Wide 3-track sliding window
      detectedWidth = 1800;
      detectedHeight = 1200;
      notes.push('Deduced Wide Slider 1800 × 1200 mm from sketch geometry');
      notesHindi.push('चौड़े स्केच से 1800 × 1200 mm स्लाइडर खिड़की चुनी');
    } else {
      // Standard square window
      detectedWidth = 1200;
      detectedHeight = 1200;
      notes.push('Applied default standard window size 1200 × 1200 mm');
      notesHindi.push('डिफ़ॉल्ट स्टैंडर्ड साइज़ 1200 × 1200 mm लागू किया');
    }
  }

  // ----------------------------------------------------
  // 2. TYPOLOGY & SASH EXTRACTION
  // ----------------------------------------------------
  let typology: PaperScanResult['typology'] = 'slider_2t';
  let typologyLabel = '2-Track Sliding Window';
  let typologyLabelHindi = '2-ट्रैक स्लाइडिंग खिड़की';
  let series: PaperScanResult['series'] = 'sliding_62';
  let mullionCount = 0;
  let transomCount = 0;
  let sashAssignments: SashType[] = ['slider_arrow_right', 'slider_arrow_left'];

  const is3Track = text.includes('3 track') || text.includes('3t') || text.includes('3-track') || text.includes('three track') || text.includes('3 shutter') || text.includes('3 panel') || geom.detectedCols === 3;
  const isCasement = text.includes('casement') || text.includes('openable') || text.includes('hinge') || text.includes('palla') || text.includes('palley') || text.includes('french window');
  const isDoor = text.includes('door') || text.includes('gate') || text.includes('darwaza') || (detectedHeight >= 2000 && detectedWidth <= 1200);
  const isFrenchDoor = text.includes('french door') || (text.includes('door') && detectedWidth >= 1400);
  const isTopHung = text.includes('top hung') || text.includes('ventilator') || text.includes('vent') || text.includes('roshandhan');
  const isFixed = text.includes('fixed') || text.includes('glass only') || text.includes('fix');
  const hasTopLightText = text.includes('top light') || text.includes('toplight') || text.includes('transom') || text.includes('upper glass') || geom.hasTopLight;

  if (hasTopLightText && isDoor) {
    typology = 'door_with_toplight';
    typologyLabel = 'Main Door with Top Light Transom';
    typologyLabelHindi = 'टॉप लाइट ट्रांसॉम के साथ मुख्य दरवाज़ा';
    series = 'casement_60';
    transomCount = 1;
    mullionCount = 0;
    sashAssignments = ['fixed', 'french_open'];
  } else if (hasTopLightText) {
    typology = 'window_with_toplight';
    typologyLabel = 'Casement Window with Top Fixed Light';
    typologyLabelHindi = 'टॉप फिक्स्ड लाइट के साथ केसमेंट खिड़की';
    series = 'casement_60';
    transomCount = 1;
    mullionCount = 1;
    sashAssignments = ['fixed', 'fixed', 'casement_left', 'casement_right'];
  } else if (isFrenchDoor) {
    typology = 'french_door';
    typologyLabel = 'Double French Door (2 Palla)';
    typologyLabelHindi = 'डबल फ्रेंच दरवाज़ा (2 पल्ला)';
    series = 'casement_60';
    mullionCount = 0;
    sashAssignments = ['french_open'];
  } else if (isDoor) {
    typology = 'french_door';
    typologyLabel = 'Single Openable Door';
    typologyLabelHindi = 'सिंगल ओपन होने वाला दरवाज़ा';
    series = 'casement_60';
    mullionCount = 0;
    sashAssignments = ['casement_left'];
  } else if (is3Track) {
    typology = 'slider_3t';
    typologyLabel = '3-Track Sliding Window with Mosquito Mesh';
    typologyLabelHindi = '3-ट्रैक स्लाइडिंग विंडो + मच्छर जाली (Mesh)';
    series = 'sliding_3track';
    mullionCount = 0;
    sashAssignments = ['slider_3s_mesh'];
    notes.push('Detected 3-panel sliding system with integrated insect screen');
    notesHindi.push('3-पैनल स्लाइडिंग मेश ट्रैक पहचाना गया');
  } else if (isCasement) {
    typology = 'casement';
    if (geom.detectedCols >= 2 || detectedWidth >= 1200) {
      typologyLabel = '2-Panel Casement Window (1 Fix + 1 Open or 2 Open)';
      typologyLabelHindi = '2-पैनल केसमेंट खिड़की (1 फिक्स + 1 खुला)';
      series = 'casement_60';
      mullionCount = 1;
      sashAssignments = ['fixed', 'casement_right'];
    } else {
      typologyLabel = 'Single Casement Openable Window';
      typologyLabelHindi = 'सिंगल केसमेंट ओपन खिड़की';
      series = 'casement_60';
      mullionCount = 0;
      sashAssignments = ['casement_right'];
    }
  } else if (isTopHung) {
    typology = 'top_hung';
    typologyLabel = 'Top Hung Ventilator / Exhaust';
    typologyLabelHindi = 'टॉप हंग वेंटिलेटर / रौशनदान';
    series = 'casement_60';
    mullionCount = 0;
    sashAssignments = ['top_hung'];
  } else if (isFixed) {
    typology = 'fixed';
    typologyLabel = 'Full Fixed Architectural Glass Window';
    typologyLabelHindi = 'फुल फिक्स्ड ग्लास खिड़की';
    series = 'casement_60';
    mullionCount = geom.detectedCols > 1 ? geom.detectedCols - 1 : 0;
    sashAssignments = ['fixed'];
  } else {
    // Default standard slider
    typology = 'slider_2t';
    typologyLabel = '2-Track 2-Panel Sliding Window';
    typologyLabelHindi = '2-ट्रैक 2-पैनल स्लाइडिंग खिड़की';
    series = 'sliding_62';
    mullionCount = 0;
    sashAssignments = ['slider_arrow_right', 'slider_arrow_left'];
  }

  // ----------------------------------------------------
  // 3. COLOR & GLASS EXTRACTION
  // ----------------------------------------------------
  let color = 'white';
  if (text.includes('anthracite') || text.includes('grey') || text.includes('gray') || text.includes('slate')) {
    color = 'anthracite';
  } else if (text.includes('walnut') || text.includes('dark wood')) {
    color = 'walnut';
  } else if (text.includes('oak') || text.includes('wood') || text.includes('golden')) {
    color = 'golden_oak';
  } else if (text.includes('black') || text.includes('matt black')) {
    color = 'matt_black';
  }

  let glassType: GlassType = 'clear_6mm';
  if (text.includes('dgu') || text.includes('double glass') || text.includes('toughened dgu')) {
    glassType = 'dgu_5_12_5';
  } else if (text.includes('frosted') || text.includes('blur') || text.includes('toilet') || text.includes('bath')) {
    glassType = 'frosted';
  } else if (text.includes('tint') || text.includes('tinted') || text.includes('bronze')) {
    glassType = 'tint_bronze';
  } else if (text.includes('5mm')) {
    glassType = 'clear_5mm';
  } else if (text.includes('8mm')) {
    glassType = 'clear_8mm';
  }

  return {
    rawText,
    width: detectedWidth,
    height: detectedHeight,
    detectedAspect: geom.aspectRatio,
    typology,
    typologyLabel,
    typologyLabelHindi,
    series,
    color,
    glassType,
    mullionCount,
    transomCount,
    sashAssignments,
    confidence: Math.min(98, confidence),
    notes,
    notesHindi,
    detectedGrid: {
      columns: geom.detectedCols,
      rows: geom.detectedRows,
      hasTopLight: geom.hasTopLight,
    },
  };
}

/**
 * Builds an authentic, industrial-ready UPVCProject based on parsed paper parameters.
 */
export function buildProjectFromPaperScan(result: PaperScanResult, projectName?: string): UPVCProject {
  const frameId = `frame-paper-${Date.now()}`;
  const width = Math.max(400, Math.min(6000, result.width || 1500));
  const height = Math.max(400, Math.min(3600, result.height || 1500));

  const fpw = result.series.includes('slider') ? 50 : 60;
  const mpw = 74;

  const mullions: Mullion[] = [];

  // If window with top light: add horizontal transom at 450mm from top
  if (result.typology === 'window_with_toplight' || result.typology === 'door_with_toplight' || result.transomCount > 0) {
    const transomY = Math.round(Math.min(500, Math.max(350, height * 0.25)));
    mullions.push({
      id: `mul-transom-${Date.now()}`,
      orientation: 'horizontal',
      position: transomY,
    });
  }

  // If vertical mullions are needed
  if (result.mullionCount > 0 && result.typology !== 'slider_3t' && result.typology !== 'slider_2t') {
    const bayWidth = (width - 2 * fpw - result.mullionCount * mpw) / (result.mullionCount + 1);
    for (let i = 1; i <= result.mullionCount; i++) {
      mullions.push({
        id: `mul-v-${i}-${Date.now()}`,
        orientation: 'vertical',
        position: Math.round(fpw + i * bayWidth + (i - 1) * mpw),
      });
    }
  }

  const frame: UPVCFrame = {
    id: frameId,
    name: 'F1',
    width,
    height,
    x: 0,
    y: 0,
    series: result.series,
    frameProfileWidth: fpw,
    mullionProfileWidth: mpw,
    sashProfileWidth: 60,
    color: result.color,
    reinforcement: 'steel_1.2mm',
    drainageCaps: true,
    mullions,
    pockets: [],
  };

  // Calculate internal pockets
  frame.pockets = recalculateFramePockets(frame);

  // Assign sashes and glass to pockets
  if (frame.pockets.length > 0) {
    if (result.typology === 'slider_3t') {
      frame.pockets.forEach((p) => {
        p.sashType = 'slider_3s_mesh';
        p.glassType = result.glassType;
      });
    } else if (result.typology === 'slider_2t') {
      frame.pockets.forEach((p, idx) => {
        p.sashType = idx % 2 === 0 ? 'slider_arrow_right' : 'slider_arrow_left';
        p.glassType = result.glassType;
      });
    } else if (result.typology === 'window_with_toplight') {
      // Top pockets are fixed, bottom pockets are casements
      frame.pockets.forEach((p) => {
        if (p.y < 500) {
          p.sashType = 'fixed';
          p.glassType = result.glassType;
        } else {
          p.sashType = 'casement_right';
          p.glassType = result.glassType;
        }
      });
    } else if (result.typology === 'door_with_toplight') {
      frame.pockets.forEach((p) => {
        if (p.y < 500) {
          p.sashType = 'fixed';
          p.glassType = result.glassType;
        } else {
          p.sashType = 'french_open';
          p.glassType = result.glassType;
        }
      });
    } else if (result.typology === 'casement') {
      frame.pockets.forEach((p, idx) => {
        p.sashType = idx % 2 === 0 ? 'fixed' : 'casement_right';
        p.glassType = result.glassType;
      });
    } else if (result.typology === 'top_hung') {
      frame.pockets.forEach((p) => {
        p.sashType = 'top_hung';
        p.glassType = result.glassType;
      });
    } else {
      frame.pockets.forEach((p) => {
        p.sashType = 'fixed';
        p.glassType = result.glassType;
      });
    }
  }

  const projName = projectName || `Scanned CAD ${width}x${height} mm (${result.typologyLabel})`;

  return {
    id: `proj-paper-${Date.now()}`,
    name: projName,
    clientName: 'Site Sketch Order',
    referenceNo: `SCAN-${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split('T')[0],
    frames: [frame],
    couplings: [],
    pricingConfig: { ...DEFAULT_PRICING_CONFIG },
  };
}

/**
 * Pre-defined sample paper sketch orders for instant 1-click testing
 */
export interface SamplePaperOrder {
  id: string;
  title: string;
  titleHindi: string;
  description: string;
  sampleImageUrl: string;
  mockOcrText: string;
}

export const SAMPLE_PAPER_ORDERS: SamplePaperOrder[] = [
  {
    id: 'sample_slider_3t',
    title: '3-Track Sliding Window (1800 x 2100 mm)',
    titleHindi: '3-ट्रैक स्लाइडिंग खिड़की (1800 x 2100 mm)',
    description: 'Order paper slip: "W 1800 H 2100 - 3 Track Slider with Mosquito Mesh, Toughened DGU Glass, White"',
    sampleImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500" viewBox="0 0 600 500"><rect width="600" height="500" fill="%23fdfbf7"/><rect x="30" y="30" width="540" height="440" fill="none" stroke="%23334155" stroke-width="2" stroke-dasharray="4,4"/><text x="50" y="70" font-family="sans-serif" font-size="20" font-weight="bold" fill="%230f172a">SITE ORDER SLIP #402</text><text x="50" y="105" font-family="sans-serif" font-size="16" fill="%23334155">Master Bedroom Balcony Window</text><rect x="120" y="140" width="360" height="220" fill="%23e2e8f0" stroke="%231e293b" stroke-width="5"/><line x1="240" y1="140" x2="240" y2="360" stroke="%231e293b" stroke-width="4"/><line x1="360" y1="140" x2="360" y2="360" stroke="%231e293b" stroke-width="4"/><text x="145" y="255" font-size="16" fill="%230f172a">Glass 1</text><text x="265" y="255" font-size="16" fill="%230f172a">Glass 2</text><text x="385" y="255" font-size="16" fill="%230f172a">Mesh</text><text x="220" y="390" font-size="20" font-weight="bold" fill="%232563eb">W: 1800 mm</text><text x="495" y="255" font-size="20" font-weight="bold" fill="%232563eb">H: 2100 mm</text><text x="50" y="440" font-size="15" fill="%23047857">Spec: 3 Track UPVC Slider + Mesh / White Profile</text></svg>',
    mockOcrText: 'SITE ORDER SLIP #402\nMaster Bedroom Balcony Window\nW: 1800 mm  H: 2100 mm\nSpec: 3 Track UPVC Slider + Mesh / White Profile / DGU 5-12-5',
  },
  {
    id: 'sample_casement_toplight',
    title: 'Casement Window + Top Light (1500 x 1800 mm)',
    titleHindi: 'केसमेंट खिड़की + टॉप फिक्स्ड (1500 x 1800 mm)',
    description: 'Architect hand-sketch: "1500 W x 1800 H - Top Fixed Light 450mm, Bottom 2-Panel Casement (1 Open + 1 Fix)"',
    sampleImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500" viewBox="0 0 600 500"><rect width="600" height="500" fill="%23fffefc"/><rect x="30" y="30" width="540" height="440" fill="none" stroke="%23475569" stroke-width="2"/><text x="50" y="65" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230f172a">WINDOW SKETCH - LIVING ROOM</text><rect x="150" y="100" width="300" height="300" fill="%23f1f5f9" stroke="%230f172a" stroke-width="5"/><line x1="150" y1="180" x2="450" y2="180" stroke="%230f172a" stroke-width="5"/><line x1="300" y1="180" x2="300" y2="400" stroke="%230f172a" stroke-width="4"/><text x="240" y="150" font-size="15" font-weight="bold" fill="%23475569">TOP LIGHT (FIX)</text><text x="180" y="300" font-size="15" fill="%232563eb">FIX GLASS</text><text x="330" y="300" font-size="15" fill="%2316a34a">CASEMENT OPEN</text><text x="230" y="430" font-size="20" font-weight="bold" fill="%23dc2626">1500 x 1800 mm</text><text x="50" y="450" font-size="14" fill="%23334155">Casement 60 series, Walnut texture, 6mm clear glass</text></svg>',
    mockOcrText: 'WINDOW SKETCH - LIVING ROOM\n1500 x 1800 mm\nTOP LIGHT (FIX) 450mm\nBottom: 1 Fix + 1 Casement Openable\nCasement 60 series, Walnut texture, 6mm clear glass',
  },
  {
    id: 'sample_french_door',
    title: 'French Balcony Door (1600 x 2100 mm)',
    titleHindi: 'फ्रेंच बालकनी दरवाज़ा (1600 x 2100 mm)',
    description: 'Contractor diary: "Door W=1600 H=2100 mm, Double Shutter French Open, Anthracite Grey"',
    sampleImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500" viewBox="0 0 600 500"><rect width="600" height="500" fill="%23fafafa"/><rect x="30" y="30" width="540" height="440" fill="none" stroke="%23cbd5e1" stroke-width="1"/><text x="50" y="65" font-family="sans-serif" font-size="18" font-weight="bold" fill="%231e293b">BALCONY ENTRANCE DOOR</text><rect x="180" y="90" width="240" height="340" fill="%23e2e8f0" stroke="%231e293b" stroke-width="5"/><line x1="300" y1="90" x2="300" y2="430" stroke="%231e293b" stroke-width="4"/><text x="205" y="270" font-size="16" fill="%230f172a">Left Palla</text><text x="325" y="270" font-size="16" fill="%230f172a">Right Palla</text><text x="230" y="80" font-size="18" font-weight="bold" fill="%232563eb">W: 1600</text><text x="435" y="270" font-size="18" font-weight="bold" fill="%232563eb">H: 2100</text><text x="50" y="455" font-size="14" fill="%23475569">Double French Door / Anthracite Grey RAL 7016 / Toughened Glass</text></svg>',
    mockOcrText: 'BALCONY ENTRANCE DOOR\nW: 1600 H: 2100\nDouble French Door / Anthracite Grey RAL 7016 / Toughened Glass\n2 Palla French Open with Center False Mullion',
  },
];
