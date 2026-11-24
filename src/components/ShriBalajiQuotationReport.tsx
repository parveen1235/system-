import React, { useState, useEffect, useRef } from 'react';
import { CustomerRecord, CustomerDesignCardItem } from '../types/erp';
import { UPVCFrame, UPVCProject } from '../types/upvc';
import { recalculateFramePockets } from '../utils/upvcCalculations';
import { CadElevationDrawing } from './CadElevationDrawing';
import { downloadQuotationPdf, printQuotationSheet } from '../utils/exportUtils';
import {
  Download,
  Printer,
  Edit3,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  FileText,
  Building2,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  Upload,
  Image as ImageIcon,
  FileSpreadsheet,
  Sliders,
  TableProperties,
} from 'lucide-react';
import {
  downloadImageStyleQuotationExcel,
  getSavedElevationSheetExcelColWidths,
  saveElevationSheetExcelColWidths,
  ElevationSheetColumnWidths,
} from '../utils/excelExportUtils';
import { ExcelColumnSettingsModal } from './ExcelColumnSettingsModal';

export interface ShriBalajiQuotationReportProps {
  customer?: CustomerRecord | { id: string; name?: string; phone?: string; brand?: string; siteAddress?: string };
  designs?: CustomerDesignCardItem[];
  defaultQuoteNo?: string;
  onClose?: () => void;
}

export interface QuotationItemRow {
  id: string;
  sNo: number | string;
  designName: string;
  glass: string;
  width: number;
  height: number;
  sqFt: number;
  projectData?: UPVCProject;
  frame?: UPVCFrame;
}

const DEFAULT_TERMS: string[] = [
  'Shri Balaji Traders shall not be responsible for any kind of breakage of glass after installation.',
  "Shri Balaji Traders shall not be responsible for the safety or security of the goods once delivered at the customer's site.",
  'Cleaning of window frames and glass is not included in our scope of work.',
  'The customer shall provide the required electricity free of cost for installation.',
  'The protective film should be removed immediately after installation. If the customer chooses to retain the protective film after installation, Shri Balaji Traders shall not be responsible for its removal or for any marks, stains, or damage caused due to delayed removal.',
  'This quotation/offer shall remain valid for 30 (Thirty) days from the date of issue.',
  'Cancellation of the order shall be accepted only before the commencement of production and shall be subject to written approval by Shri Balaji Traders.',
  'In case of cancellation, any amount paid by the customer shall be refunded after deducting 5% of the total order value towards order processing and administrative charges.',
  'Once production has commenced or the goods are ready for dispatch/delivery, the customer shall be liable to pay the full order value and the order cannot be cancelled.',
  'Any typographical, clerical, calculation, or human error in the quotation, price, quantity, specifications, taxes, or total amount shall be subject to correction before the final invoice, and the customer agrees to pay the corrected amount.',
  "Delivery timelines are approximate and may vary due to manufacturing schedules, transportation delays, weather conditions, or any other circumstances beyond the company's control.",
  'Any damage caused due to misuse, improper handling, structural movement, civil work, alteration, natural calamities, or third-party interference shall not be covered under warranty.',
];

/**
 * Creates default 3-track sliding window frame if designs are empty
 */
function createFallbackWindow(width: number, height: number, refTag: string): UPVCFrame {
  const f: UPVCFrame = {
    id: `fb-frame-${refTag.toLowerCase()}`,
    name: refTag,
    width,
    height,
    x: 0,
    y: 0,
    series: 'sliding_88',
    frameProfileWidth: 45,
    mullionProfileWidth: 4,
    sashProfileWidth: 50,
    color: 'white',
    reinforcement: 'steel_1.5mm',
    drainageCaps: true,
    mullions: [
      {
        id: `m-v-${refTag}`,
        orientation: 'vertical',
        position: Math.round(width / 2),
        width: 4,
      },
    ],
    pockets: [],
  };
  f.pockets = recalculateFramePockets(f);
  if (f.pockets[0]) {
    f.pockets[0].sashType = 'slider_arrow_right';
    f.pockets[0].customLabel = 'S1';
    f.pockets[0].glassType = 'clear_6mm';
  }
  if (f.pockets[1]) {
    f.pockets[1].sashType = 'slider_arrow_left';
    f.pockets[1].customLabel = 'S2';
    f.pockets[1].hasMesh = true;
    f.pockets[1].glassType = 'clear_6mm';
  }
  return f;
}

export const ShriBalajiQuotationReport: React.FC<ShriBalajiQuotationReportProps> = ({
  customer,
  designs = [],
  defaultQuoteNo = '001',
}) => {
  const customerId = customer?.id || 'default';
  const storageKey = `upvc_balaji_quote_${customerId}`;

  // Company details
  const [companyName, setCompanyName] = useState('SHRI BALAJI TRADERS');
  const [addressLine1, setAddressLine1] = useState('GROUND FLOOR, K-39, RAJAPURI MAIN ROAD,');
  const [addressLine2, setAddressLine2] = useState('UTTAM NAGAR, NEW DELHI - 110059');
  const [phone, setPhone] = useState('MB.:9971742045');
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  // Metadata
  const [quoteNo, setQuoteNo] = useState(defaultQuoteNo);
  const [quoteDate, setQuoteDate] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  });

  // PDF File Name (user request: "pdf ka name likh sake")
  const [pdfFileName, setPdfFileName] = useState(() => {
    const custClean = (customer?.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `Quotation_${defaultQuoteNo}_${custClean}`;
  });

  // Edit Mode toggle
  const [isEditMode, setIsEditMode] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // DISCRIPTION Column Box Width (कॉलम चौड़ाई in px): default 300px
  const [descriptionBoxWidth, setDescriptionBoxWidth] = useState<number>(300);
  // DISCRIPTION Column Height (कॉलम ऊंचाई in px): default 240px (increased for tall, clear CAD elevation without side clipping)
  const [drawingHeight, setDrawingHeight] = useState<number>(240);

  // Items table
  const [items, setItems] = useState<QuotationItemRow[]>(() => {
    // If designs exist, populate from designs
    if (designs && designs.length > 0) {
      return designs.map((d, idx) => {
        const frame = d.projectData?.frames?.[0] || createFallbackWindow(d.width, d.height, d.tag || `W${idx + 1}`);
        const sqFt = Number(((d.width * d.height * (d.quantity || 1)) / 92903.04).toFixed(1));
        const designName = d.seriesName?.includes('3-Track') || d.type?.includes('3-Track') || (frame.mullions && frame.mullions.length >= 2)
          ? '3 TRACK'
          : d.seriesName?.includes('2-Track') || d.type?.includes('2-Track')
          ? '2 TRACK'
          : d.type?.toUpperCase() || '3 TRACK';
        const glass = d.glassType?.toUpperCase().includes('DGU')
          ? 'DGU INSULATED GLASS'
          : '6 MM CLEAR TOUGHNED';

        return {
          id: d.id || `item-${idx + 1}`,
          sNo: idx + 1,
          designName,
          glass,
          width: d.width,
          height: d.height,
          sqFt,
          projectData: d.projectData,
          frame,
        };
      });
    }

    // Default matching user reference images (714x1597, 860x1514, 2061x1495)
    return [
      {
        id: 'balaji-item-1',
        sNo: 1,
        designName: '3 TRACK',
        glass: '6 MM CLEAR TOUGHNED',
        width: 714,
        height: 1597,
        sqFt: 12.3,
        frame: createFallbackWindow(714, 1597, 'W1'),
      },
      {
        id: 'balaji-item-2',
        sNo: 2,
        designName: '3 TRACK',
        glass: '6 MM CLEAR TOUGHNED',
        width: 860,
        height: 1514,
        sqFt: 14.0,
        frame: createFallbackWindow(860, 1514, 'W2'),
      },
      {
        id: 'balaji-item-3',
        sNo: 3,
        designName: '3 TRACK',
        glass: '6 MM CLEAR TOUGHNED',
        width: 2061,
        height: 1495,
        sqFt: 33.2,
        frame: createFallbackWindow(2061, 1495, 'W3'),
      },
    ];
  });

  // Financial summary
  const totalCalculatedSqFt = items.reduce((acc, curr) => acc + (curr.sqFt || 0), 0);
  const [itemTitle, setItemTitle] = useState('upvc Windows & Door');
  const [totalSqFt, setTotalSqFt] = useState<number>(() => Math.round(totalCalculatedSqFt) || 68);
  const [ratePerSqFt, setRatePerSqFt] = useState<number>(550.0);
  const [cartageAmount, setCartageAmount] = useState<number>(1500.0);
  const [manualPriceOverride, setManualPriceOverride] = useState<number | null>(null);
  const [manualTotalOverride, setManualTotalOverride] = useState<number | null>(null);

  // Derived financials
  const effectivePrice = manualPriceOverride !== null ? manualPriceOverride : Math.round(totalSqFt * ratePerSqFt);
  const effectiveTotal = manualTotalOverride !== null ? manualTotalOverride : Math.round(effectivePrice + cartageAmount);

  // Terms & Conditions
  const [terms, setTerms] = useState<string[]>(DEFAULT_TERMS);
  const [paymentTerms, setPaymentTerms] = useState('50% Advance After Deliver 40% Complete workout 10%');
  const [warrantyText, setWarrantyText] = useState('Hardware 5 year Profile 20 Years');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved modifications from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
        if (parsed.addressLine2) setAddressLine2(parsed.addressLine2);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.quoteNo) setQuoteNo(parsed.quoteNo);
        if (parsed.quoteDate) setQuoteDate(parsed.quoteDate);
        if (parsed.pdfFileName) setPdfFileName(parsed.pdfFileName);
        if (parsed.itemTitle) setItemTitle(parsed.itemTitle);
        if (parsed.totalSqFt !== undefined) setTotalSqFt(parsed.totalSqFt);
        if (parsed.ratePerSqFt !== undefined) setRatePerSqFt(parsed.ratePerSqFt);
        if (parsed.cartageAmount !== undefined) setCartageAmount(parsed.cartageAmount);
        if (parsed.terms) setTerms(parsed.terms);
        if (parsed.paymentTerms) setPaymentTerms(parsed.paymentTerms);
        if (parsed.warrantyText) setWarrantyText(parsed.warrantyText);
        if (parsed.customLogoUrl) setCustomLogoUrl(parsed.customLogoUrl);
        if (parsed.descriptionBoxWidth) {
          setDescriptionBoxWidth(Number(parsed.descriptionBoxWidth));
        } else if (parsed.drawingSize) {
          if (parsed.drawingSize === 'compact') setDescriptionBoxWidth(240);
          else if (parsed.drawingSize === 'medium') setDescriptionBoxWidth(300);
          else if (parsed.drawingSize === 'large') setDescriptionBoxWidth(360);
        }
        if (parsed.drawingHeight) {
          setDrawingHeight(Number(parsed.drawingHeight));
        }
      }
    } catch (e) {
      console.warn('Could not restore saved quotation state', e);
    }
  }, [storageKey]);

  // Auto-save changes to localStorage
  const saveStateToStorage = () => {
    try {
      const stateToSave = {
        companyName,
        addressLine1,
        addressLine2,
        phone,
        quoteNo,
        quoteDate,
        pdfFileName,
        itemTitle,
        totalSqFt,
        ratePerSqFt,
        cartageAmount,
        terms,
        paymentTerms,
        warrantyText,
        customLogoUrl,
        descriptionBoxWidth,
        drawingHeight,
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Could not save quotation state', e);
    }
  };

  useEffect(() => {
    saveStateToStorage();
  }, [
    companyName,
    addressLine1,
    addressLine2,
    phone,
    quoteNo,
    quoteDate,
    pdfFileName,
    itemTitle,
    totalSqFt,
    ratePerSqFt,
    cartageAmount,
    terms,
    paymentTerms,
    warrantyText,
    customLogoUrl,
    descriptionBoxWidth,
    drawingHeight,
  ]);

  // Add Item
  const handleAddItem = () => {
    const nextNo = items.length + 1;
    const newItem: QuotationItemRow = {
      id: `custom-item-${Date.now()}`,
      sNo: nextNo,
      designName: '3 TRACK',
      glass: '6 MM CLEAR TOUGHNED',
      width: 1200,
      height: 1200,
      sqFt: 15.5,
      frame: createFallbackWindow(1200, 1200, `W${nextNo}`),
    };
    const updated = [...items, newItem];
    setItems(updated);
    setTotalSqFt(Math.round(updated.reduce((acc, curr) => acc + curr.sqFt, 0)));
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    if (items.length <= 1) return;
    const updated = items.filter((it) => it.id !== id).map((it, idx) => ({ ...it, sNo: idx + 1 }));
    setItems(updated);
    setTotalSqFt(Math.round(updated.reduce((acc, curr) => acc + curr.sqFt, 0)));
  };

  // Update item field
  const handleUpdateItem = (id: string, field: keyof QuotationItemRow, value: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const updated = { ...it, [field]: value };
          if (field === 'width' || field === 'height') {
            const w = field === 'width' ? Number(value) || it.width : it.width;
            const h = field === 'height' ? Number(value) || it.height : it.height;
            updated.sqFt = Number(((w * h) / 92903.04).toFixed(1));
            updated.frame = createFallbackWindow(w, h, `W${it.sNo}`);
          }
          return updated;
        }
        return it;
      })
    );
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCustomLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const cleanName = pdfFileName.trim() ? pdfFileName.trim() : `Quotation_${quoteNo}`;
      await downloadQuotationPdf('shri-balaji-quotation-sheet', cleanName);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);
  const [printNotification, setPrintNotification] = useState<string | null>(null);

  // Print
  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintNotification('प्रिंट तैयार किया जा रहा है... (A4 शीट प्रिंट डायलॉग / PDF डाउनलोड)');
    try {
      const cleanName = pdfFileName.trim() ? pdfFileName.trim() : `Quotation_${quoteNo}`;
      const success = await printQuotationSheet('shri-balaji-quotation-sheet', cleanName);
      if (success) {
        setPrintNotification('प्रिंट कमांड भेजा गया / A4 प्रिंट तैयार हो गया!');
      } else {
        await downloadQuotationPdf('shri-balaji-quotation-sheet', cleanName);
        setPrintNotification('A4 कोटेशन PDF डाउनलोड हो गई है!');
      }
      setTimeout(() => setPrintNotification(null), 4500);
    } catch (err) {
      console.error('Failed to print quotation:', err);
      const cleanName = pdfFileName.trim() ? pdfFileName.trim() : `Quotation_${quoteNo}`;
      await downloadQuotationPdf('shri-balaji-quotation-sheet', cleanName);
      setPrintNotification('A4 कोटेशन PDF डाउनलोड हो गई है!');
      setTimeout(() => setPrintNotification(null), 4500);
    } finally {
      setIsPrinting(false);
    }
  };

  const [showExcelColModal, setShowExcelColModal] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Download Image-Style Elevation Sheet Excel
  const handleDownloadExcel = async (overrideWidths?: ElevationSheetColumnWidths) => {
    setIsExportingExcel(true);
    try {
      const baseClean = pdfFileName.trim() ? pdfFileName.trim() : `Quotation_${quoteNo}`;
      const cleanName = baseClean.endsWith('.xlsx') ? baseClean : `${baseClean}_Elevation_Sheet.xlsx`;
      await downloadImageStyleQuotationExcel({
        companyName,
        addressLine1,
        addressLine2,
        phone,
        quoteNo,
        quoteDate,
        customerName: customer?.name || 'Customer',
        customerPhone: customer?.phone || '',
        siteAddress: customer?.siteAddress || '',
        items: items.map((it) => ({
          sNo: it.sNo,
          designName: it.designName,
          glass: it.glass,
          width: it.width,
          height: it.height,
          sqFt: it.sqFt,
          frame: it.frame,
        })),
        financialSummary: {
          itemTitle,
          totalSqFt,
          ratePerSqFt,
          price: effectivePrice,
          cartageAmount,
          totalAmount: effectiveTotal,
        },
        terms,
        paymentTerms,
        warrantyText,
        filename: cleanName,
        columnWidths: overrideWidths || getSavedElevationSheetExcelColWidths(),
      });
      setPrintNotification('इमेज जैसा एक्सेल (Elevation Sheet Excel) डाउनलोड हो गया है!');
      setTimeout(() => setPrintNotification(null), 4500);
    } catch (err) {
      console.error('Failed to export Elevation Sheet Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Reset to default
  const handleReset = () => {
    if (window.confirm('क्या आप सभी फ़ील्ड्स को प्रारंभिक डिफ़ॉल्ट मानों पर रीसेट करना चाहते हैं?')) {
      setCompanyName('SHRI BALAJI TRADERS');
      setAddressLine1('GROUND FLOOR, K-39, RAJAPURI MAIN ROAD,');
      setAddressLine2('UTTAM NAGAR, NEW DELHI - 110059');
      setPhone('MB.:9971742045');
      setQuoteNo(defaultQuoteNo);
      setRatePerSqFt(550.0);
      setCartageAmount(1500.0);
      setTerms(DEFAULT_TERMS);
      setPaymentTerms('50% Advance After Deliver 40% Complete workout 10%');
      setWarrantyText('Hardware 5 year Profile 20 Years');
      setCustomLogoUrl(null);
      setManualPriceOverride(null);
      setManualTotalOverride(null);
      localStorage.removeItem(storageKey);
    }
  };

  const showFormInputs = isEditMode && !isExportingPdf && !isPrinting;

  return (
    <div className="w-full space-y-4">
      {/* ========================================================================= */}
      {/* TOP CONTROLS & PDF FILENAME BAR (user request: "pdf ka name likh sake") */}
      {/* ========================================================================= */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        {/* Left: Custom PDF Name Input */}
        <div className="flex-1 max-w-lg">
          <label className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>PDF फ़ाइल का नाम (PDF File Name):</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={pdfFileName}
              onChange={(e) => setPdfFileName(e.target.value)}
              placeholder="e.g. Quotation_001_Shri_Balaji"
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-blue-500 font-mono"
            />
            <span className="text-xs text-slate-400 font-mono">.pdf</span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              isEditMode
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Toggle inline editing"
          >
            {isEditMode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Editing ON (संपादन चालू)</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Mode (संपादन करें)</span>
              </>
            )}
          </button>

          {/* Add Window Row Button */}
          {isEditMode && (
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Add another window item to quotation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Window (विंडो जोड़ें)</span>
            </button>
          )}

          {/* Reset Template */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
            title="Reset to default template"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* DISCRIPTION Column Box Width & Height Controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1.5 border border-slate-700 text-xs gap-3 flex-wrap">
            {/* Box Width */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-amber-400 px-1 flex items-center gap-1">
                <span>कॉलम चौड़ाई (Width):</span>
              </span>
              <button
                type="button"
                onClick={() => setDescriptionBoxWidth(240)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                  descriptionBoxWidth === 240
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="240px Width"
              >
                240px
              </button>
              <button
                type="button"
                onClick={() => setDescriptionBoxWidth(300)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                  descriptionBoxWidth === 300
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="300px Width"
              >
                300px
              </button>
              <button
                type="button"
                onClick={() => setDescriptionBoxWidth(360)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                  descriptionBoxWidth === 360
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="360px Width"
              >
                360px
              </button>
              <div className="flex items-center gap-0.5 pl-1 border-l border-slate-700">
                <button
                  type="button"
                  onClick={() => setDescriptionBoxWidth((prev) => Math.max(160, prev - 20))}
                  className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-black cursor-pointer"
                  title="Decrease width by 20px"
                >
                  -
                </button>
                <input
                  type="number"
                  min="160"
                  max="520"
                  step="10"
                  value={descriptionBoxWidth}
                  onChange={(e) => setDescriptionBoxWidth(Math.max(160, Math.min(520, Number(e.target.value) || 300)))}
                  className="w-13 bg-slate-900 border border-slate-600 text-amber-300 rounded px-1 py-0.5 text-center text-xs font-mono font-bold"
                  title="Width in px"
                />
                <button
                  type="button"
                  onClick={() => setDescriptionBoxWidth((prev) => Math.min(520, prev + 20))}
                  className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-black cursor-pointer"
                  title="Increase width by 20px"
                >
                  +
                </button>
                <span className="text-[10px] text-slate-400">px</span>
              </div>
            </div>

            {/* Column Height */}
            <div className="flex items-center gap-1.5 pl-2.5 border-l border-slate-700">
              <span className="text-[11px] font-bold text-emerald-400 px-1 flex items-center gap-1">
                <span>कॉलम ऊंचाई (Height):</span>
              </span>
              <button
                type="button"
                onClick={() => setDrawingHeight(190)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                  drawingHeight === 190
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="190px Height"
              >
                190px
              </button>
              <button
                type="button"
                onClick={() => setDrawingHeight(240)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                  drawingHeight === 240
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="240px Height"
              >
                240px
              </button>
              <button
                type="button"
                onClick={() => setDrawingHeight(290)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                  drawingHeight === 290
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="290px Height"
              >
                290px
              </button>
              <div className="flex items-center gap-0.5 pl-1 border-l border-slate-700">
                <button
                  type="button"
                  onClick={() => setDrawingHeight((prev) => Math.max(140, prev - 20))}
                  className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-black cursor-pointer"
                  title="Decrease height by 20px"
                >
                  -
                </button>
                <input
                  type="number"
                  min="140"
                  max="450"
                  step="10"
                  value={drawingHeight}
                  onChange={(e) => setDrawingHeight(Math.max(140, Math.min(450, Number(e.target.value) || 240)))}
                  className="w-13 bg-slate-900 border border-slate-600 text-emerald-300 rounded px-1 py-0.5 text-center text-xs font-mono font-bold"
                  title="Height in px"
                />
                <button
                  type="button"
                  onClick={() => setDrawingHeight((prev) => Math.min(450, prev + 20))}
                  className="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-black cursor-pointer"
                  title="Increase height by 20px"
                >
                  +
                </button>
                <span className="text-[10px] text-slate-400">px</span>
              </div>
            </div>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
            title="Print Quotation / Generate Printable A4 Document"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>{isPrinting ? 'Printing...' : 'Print (प्रिंट)'}</span>
          </button>

          {/* Download PDF Button (user request: "pdf daunlod") */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-lg text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md"
            title="Download formatted multi-page PDF"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF (पीडीएफ)'}</span>
          </button>

          {/* Excel Column Widths Setting Button (user request: "jaha ak seting ho jo me jagah set kar saku ki kon se coulm ko kitni jagah milegi") */}
          <button
            type="button"
            onClick={() => setShowExcelColModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
            title="Configure column space and widths for Excel export"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>कॉलम जगह सेटिंग (Space)</span>
          </button>

          {/* Download Image-Style Excel Button (user request: "excel asa ho jesa mane image h") */}
          <button
            type="button"
            onClick={() => handleDownloadExcel()}
            disabled={isExportingExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md ring-2 ring-emerald-400/40"
            title="Download Excel spreadsheet matching the exact layout of the reference image"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>
              {isExportingExcel ? 'Generating Excel...' : 'Download Excel (इमेज जैसा एक्सेल)'}
            </span>
          </button>
        </div>
      </div>

      {/* Excel Column Space & Width Configuration Modal */}
      <ExcelColumnSettingsModal
        isOpen={showExcelColModal}
        onClose={() => setShowExcelColModal(false)}
        initialFormat="elevation_sheet"
        onDownloadElevationSheet={(colWidths) => {
          handleDownloadExcel(colWidths);
          setShowExcelColModal(false);
        }}
        isDownloading={isExportingExcel}
      />

      {/* Floating Print / PDF Notification Toast */}
      {printNotification && (
        <div className="no-print p-3 bg-blue-950/90 border border-blue-500 rounded-xl text-blue-200 text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">🖨️</span>
            <span>{printNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setPrintNotification(null)}
            className="text-blue-300 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hidden file input for logo */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLogoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* PRINTABLE QUOTATION SHEET CONTAINER (A4 FORMAT, MATCHING USER'S IMAGES) */}
      {/* ========================================================================= */}
      <div className="w-full overflow-x-auto pb-8 flex justify-start lg:justify-center bg-slate-100 p-2 sm:p-6 rounded-2xl border border-slate-300">
        <div
          id="shri-balaji-quotation-sheet"
          className="custom-quotation-sheet report-sheet bg-white text-black font-sans shadow-xl w-full max-w-[880px] min-h-[1100px] p-5 sm:p-8 pr-6 sm:pr-9 mx-auto space-y-6 select-text transition print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none"

          style={{
            fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            color: '#000000',
            backgroundColor: '#ffffff',
          }}
        >
          {/* ------------------------------------------------------------- */}
          {/* HEADER: LOGO (LEFT) & COMPANY DETAILS (RIGHT) */}
          {/* ------------------------------------------------------------- */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b-2 border-transparent">
            {/* Left Logo */}
            <div className="relative group/logo">
              {customLogoUrl ? (
                <img
                  src={customLogoUrl}
                  alt="Company Logo"
                  className="max-h-24 max-w-[240px] object-contain"
                />
              ) : (
                /* Authentic Shree Balaji Traders Duron Vector Logo */
                <div className="flex items-center gap-2">
                  {/* Swastik & Graphic */}
                  <div className="flex flex-col items-center">
                    <span className="text-red-600 font-bold text-lg leading-none">卐</span>
                    <div className="w-16 h-14 relative flex items-center justify-center">
                      <svg viewBox="0 0 100 90" className="w-full h-full">
                        {/* House roof */}
                        <path d="M 10 35 L 50 10 L 90 35 L 85 40 L 50 18 L 15 40 Z" fill="#0284c7" />
                        {/* 3 Window Panels / Building Pillars */}
                        <rect x="22" y="32" width="16" height="52" fill="#0284c7" rx="2" />
                        <rect x="42" y="32" width="16" height="52" fill="#38bdf8" rx="2" />
                        <rect x="62" y="32" width="16" height="52" fill="#0284c7" rx="2" />
                      </svg>
                    </div>
                  </div>

                  {/* Brand Typography */}
                  <div className="flex flex-col leading-tight">
                    <span className="text-red-700 font-black text-xl tracking-tight">
                      SHREE BALAJI
                    </span>
                    <span className="text-slate-800 font-bold text-xs tracking-wider -mt-1">
                      — TRADERS —
                    </span>
                    <span className="text-blue-700 font-black text-2xl tracking-tighter italic">
                      DURON
                    </span>
                    <span className="text-[9px] font-bold text-red-700 uppercase tracking-widest -mt-0.5">
                      PREMIUM UPVC WINDOW & DOOR
                    </span>
                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-red-700 text-white font-black text-[10px] rounded-full self-start">
                      MB- 9971742045
                    </span>
                  </div>
                </div>
              )}

              {/* Upload logo overlay in edit mode */}
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="no-print absolute -bottom-2 left-0 text-[10px] bg-slate-900/90 text-white px-2 py-0.5 rounded shadow cursor-pointer flex items-center gap-1 opacity-80 hover:opacity-100"
                >
                  <Upload className="w-2.5 h-2.5" />
                  <span>Logo बदलें</span>
                </button>
              )}
            </div>

            {/* Right Company Details (Editable in-place, protected from clipping) */}
            <div className="text-right w-full sm:w-auto shrink-0 max-w-[360px] min-w-0 pr-1">
              {/* Always rendered in PDF Export & Print with clean, untruncated typography */}
              <div className="hidden print:block pdf-export-show space-y-0.5 text-right pr-1">
                <h1 className="font-bold text-base uppercase tracking-tight text-slate-900">{companyName}</h1>
                <p className="text-xs uppercase leading-tight text-slate-800">{addressLine1}</p>
                <p className="text-xs uppercase leading-tight text-slate-800">{addressLine2}</p>
                <p className="text-xs font-bold uppercase leading-tight text-slate-900">{phone}</p>
              </div>

              {/* On-Screen interactive display */}
              <div className="print:hidden pdf-export-hide">
                {showFormInputs ? (
                  <div className="space-y-1 inline-flex flex-col items-end w-full max-w-[360px]">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="font-bold text-base uppercase text-right border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden w-full max-w-[340px] bg-transparent px-1"
                      placeholder="COMPANY NAME"
                    />
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="text-xs uppercase text-right border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden w-full max-w-[340px] bg-transparent px-1"
                      placeholder="Address Line 1"
                    />
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="text-xs uppercase text-right border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden w-full max-w-[340px] bg-transparent px-1"
                      placeholder="Address Line 2"
                    />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="text-xs font-bold uppercase text-right border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden w-full max-w-[240px] bg-transparent px-1"
                      placeholder="MB.:9971742045"
                    />
                  </div>
                ) : (
                  <div className="space-y-0.5 text-right pr-1">
                    <h1 className="font-bold text-base uppercase tracking-tight text-slate-900">{companyName}</h1>
                    <p className="text-xs uppercase leading-tight text-slate-800">{addressLine1}</p>
                    <p className="text-xs uppercase leading-tight text-slate-800">{addressLine2}</p>
                    <p className="text-xs font-bold uppercase leading-tight text-slate-900">{phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* QUOTATION NUMBER & DATE ROW */}
          {/* ------------------------------------------------------------- */}
          <div className="flex items-center justify-between text-xs font-bold pt-4 pb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span>Quot No. :</span>
              <span className="hidden print:inline pdf-export-show font-bold">{quoteNo}</span>
              <div className="print:hidden pdf-export-hide">
                {showFormInputs ? (
                  <input
                    type="text"
                    value={quoteNo}
                    onChange={(e) => setQuoteNo(e.target.value)}
                    className="font-bold border-b border-slate-400 focus:border-blue-600 focus:outline-hidden min-w-[80px] w-28 bg-transparent px-1"
                    placeholder="001"
                  />
                ) : (
                  <span>{quoteNo}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pr-1">
              <span>Date :</span>
              <span className="hidden print:inline pdf-export-show font-bold pr-1">{quoteDate}</span>
              <div className="print:hidden pdf-export-hide">
                {showFormInputs ? (
                  <input
                    type="text"
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                    className="font-bold border-b border-slate-400 focus:border-blue-600 focus:outline-hidden min-w-[100px] w-32 text-right bg-transparent px-1"
                    placeholder="DD-MM-YYYY"
                  />
                ) : (
                  <span className="pr-1">{quoteDate}</span>
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* MAIN ITEMS TABLE: S.NO. | DISCRIPTION | DESIGN NAME | GLASS */}
          {/* ------------------------------------------------------------- */}
          <div className="w-full">
            <table
              className="w-full border-collapse"
              style={{ border: '1.5px solid #000000' }}
            >
              <thead>
                <tr className="border-b-[1.5px] border-black text-xs font-bold text-center bg-slate-50/50">
                  <th className="py-2.5 px-2 border-r-[1.5px] border-black w-12 text-center text-xs font-bold">S.NO.</th>
                  <th 
                    className="py-2.5 px-2 border-r-[1.5px] border-black text-center text-xs font-bold"
                    style={{ width: `${descriptionBoxWidth}px` }}
                  >
                    DISCRIPTION
                  </th>
                  <th className="py-2.5 px-3 border-r-[1.5px] border-black min-w-[140px] text-center text-xs font-bold">DESIGN NAME</th>
                  <th className="py-2.5 px-3 text-center text-xs font-bold min-w-[140px]">GLASS</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  return (
                    <tr
                      key={item.id}
                      className="border-b-[1.5px] border-black page-break-inside-avoid relative group/row"
                    >
                      {/* 1. S.NO. */}
                      <td className="py-2.5 px-2 border-r-[1.5px] border-black text-center text-xs font-bold align-middle w-12">
                        <span className="hidden print:block pdf-export-show">{item.sNo}</span>
                        <div className="print:hidden pdf-export-hide">
                          {showFormInputs ? (
                            <input
                              type="text"
                              value={item.sNo}
                              onChange={(e) => handleUpdateItem(item.id, 'sNo', e.target.value)}
                              className="w-8 text-center font-bold bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden"
                            />
                          ) : (
                            <span>{item.sNo}</span>
                          )}
                        </div>

                        {/* Delete Row button in edit mode */}
                        {showFormInputs && items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="no-print block mx-auto mt-2 text-red-500 hover:text-red-700 cursor-pointer p-1"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>

                      {/* 2. DISCRIPTION (CAD DRAWING ELEVATION VIEW WITH FULL DIMENSIONS) */}
                      <td 
                        className="py-2.5 px-2 border-r-[1.5px] border-black align-middle text-center overflow-visible"
                        style={{ width: `${descriptionBoxWidth}px` }}
                      >
                        <div className="w-full flex flex-col items-center justify-center">
                          {item.frame ? (
                            <div className="w-full flex items-center justify-center p-1 bg-white rounded">
                              <CadElevationDrawing
                                frame={item.frame}
                                width="100%"
                                height={drawingHeight}
                                showDimensions={true}
                                showLabels={false}
                                showHandles={true}
                                showArrows={true}
                                excelLegibilityMode={true}
                                allowEnlarge={true}
                              />
                            </div>
                          ) : (
                            <div className="text-slate-400 text-xs italic">CAD Preview</div>
                          )}

                          {/* Editable dimensions bar in edit mode */}
                          {showFormInputs && (
                            <div className="no-print mt-1.5 flex items-center justify-center gap-1.5 text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              <span>W:</span>
                              <input
                                type="number"
                                value={item.width}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, 'width', Number(e.target.value))
                                }
                                className="w-12 px-1 border border-slate-300 rounded font-mono text-center text-[10px]"
                              />
                              <span>H:</span>
                              <input
                                type="number"
                                value={item.height}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, 'height', Number(e.target.value))
                                }
                                className="w-12 px-1 border border-slate-300 rounded font-mono text-center text-[10px]"
                              />
                              <span className="text-[9px] text-slate-500 font-mono">mm ({item.sqFt} SqFt)</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. DESIGN NAME */}
                      <td className="py-2.5 px-3 border-r-[1.5px] border-black text-center text-xs font-bold align-middle">
                        <span className="hidden print:block pdf-export-show uppercase font-bold">{item.designName}</span>
                        <div className="print:hidden pdf-export-hide">
                          {showFormInputs ? (
                            <textarea
                              value={item.designName}
                              onChange={(e) => handleUpdateItem(item.id, 'designName', e.target.value)}
                              rows={2}
                              className="w-full text-center font-bold uppercase bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden resize-none"
                              placeholder="DESIGN NAME"
                            />
                          ) : (
                            <span className="uppercase">{item.designName}</span>
                          )}
                        </div>
                      </td>

                      {/* 4. GLASS */}
                      <td className="py-2.5 px-3 text-center text-xs font-bold align-middle">
                        <span className="hidden print:block pdf-export-show uppercase font-bold">{item.glass}</span>
                        <div className="print:hidden pdf-export-hide">
                          {showFormInputs ? (
                            <textarea
                              value={item.glass}
                              onChange={(e) => handleUpdateItem(item.id, 'glass', e.target.value)}
                              rows={2}
                              className="w-full text-center font-bold uppercase bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden resize-none"
                              placeholder="GLASS SPEC"
                            />
                          ) : (
                            <span className="uppercase">{item.glass}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* FINANCIAL SUMMARY TABLE (RIGHT-ALIGNED / EXACT MATCH) */}
          {/* ------------------------------------------------------------- */}
          <div className="flex justify-end pt-2 page-break-inside-avoid commercial-summary-wrapper">
            <div className="w-full sm:w-[480px]">
              <table
                className="w-full border-collapse text-xs"
                style={{ border: '1.5px solid #000000' }}
              >
                <thead>
                  <tr className="border-b-[1.5px] border-black font-bold text-center">
                    <th className="py-1.5 px-3 border-r-[1.5px] border-black text-left w-44"></th>
                    <th className="py-1.5 px-2 border-r-[1.5px] border-black w-16">Sq.Ft.</th>
                    <th className="py-1.5 px-2 border-r-[1.5px] border-black w-28">
                      Per Sq.Ft Amt
                    </th>
                    <th className="py-1.5 px-3 w-32 text-right">PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: upvc Windows & Door */}
                  <tr className="border-b-[1.5px] border-black font-medium">
                    <td className="py-1.5 px-3 border-r-[1.5px] border-black font-semibold text-slate-800">
                      <span className="hidden print:inline pdf-export-show">{itemTitle}</span>
                      <div className="print:hidden pdf-export-hide">
                        {showFormInputs ? (
                          <input
                            type="text"
                            value={itemTitle}
                            onChange={(e) => setItemTitle(e.target.value)}
                            className="w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden"
                          />
                        ) : (
                          <span>{itemTitle}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-2 border-r-[1.5px] border-black text-center font-bold">
                      <span className="hidden print:inline pdf-export-show">{totalSqFt}</span>
                      <div className="print:hidden pdf-export-hide">
                        {showFormInputs ? (
                          <input
                            type="number"
                            value={totalSqFt}
                            onChange={(e) => setTotalSqFt(Number(e.target.value))}
                            className="w-12 text-center font-bold bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden"
                          />
                        ) : (
                          <span>{totalSqFt}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-2 border-r-[1.5px] border-black text-center font-mono">
                      <span className="hidden print:inline pdf-export-show">₹ {ratePerSqFt.toFixed(2)}</span>
                      <div className="print:hidden pdf-export-hide">
                        {showFormInputs ? (
                          <div className="flex items-center justify-center gap-1">
                            <span>₹</span>
                            <input
                              type="number"
                              value={ratePerSqFt}
                              onChange={(e) => setRatePerSqFt(Number(e.target.value))}
                              className="w-16 text-center font-mono bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden"
                            />
                          </div>
                        ) : (
                          `₹ ${ratePerSqFt.toFixed(2)}`
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                      <span className="hidden print:inline pdf-export-show">₹ {effectivePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <div className="print:hidden pdf-export-hide">
                        {showFormInputs ? (
                          <div className="flex items-center justify-end gap-1">
                            <span>₹</span>
                            <input
                              type="number"
                              value={effectivePrice}
                              onChange={(e) => setManualPriceOverride(Number(e.target.value))}
                              className="w-24 text-right font-mono font-bold bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden"
                            />
                          </div>
                        ) : (
                          `₹ ${effectivePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Row 2: CARTAGE AMOUNT */}
                  <tr className="border-b-[1.5px] border-black font-medium">
                    <td className="py-1.5 px-3 border-r-[1.5px] border-black font-semibold text-slate-800">
                      CARTAGE AMOUNT
                    </td>
                    <td className="py-1.5 px-2 border-r-[1.5px] border-black text-center"></td>
                    <td className="py-1.5 px-2 border-r-[1.5px] border-black text-center"></td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                      <span className="hidden print:inline pdf-export-show">₹ {cartageAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <div className="print:hidden pdf-export-hide">
                        {showFormInputs ? (
                          <div className="flex items-center justify-end gap-1">
                            <span>₹</span>
                            <input
                              type="number"
                              value={cartageAmount}
                              onChange={(e) => setCartageAmount(Number(e.target.value))}
                              className="w-24 text-right font-mono font-bold bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden"
                            />
                          </div>
                        ) : (
                          `₹ ${cartageAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Row 3: TOTAL AMOUNT */}
                  <tr className="font-bold">
                    <td className="py-1.5 px-3 border-r-[1.5px] border-black font-black uppercase text-slate-900">
                      TOTAL AMOUNT
                    </td>
                    <td className="py-1.5 px-2 border-r-[1.5px] border-black text-center"></td>
                    <td className="py-1.5 px-2 border-r-[1.5px] border-black text-center"></td>
                    <td className="py-1.5 px-3 text-right font-mono font-black text-slate-950">
                      {isEditMode ? (
                        <div className="flex items-center justify-end gap-1">
                          <span>₹</span>
                          <input
                            type="number"
                            value={effectiveTotal}
                            onChange={(e) => setManualTotalOverride(Number(e.target.value))}
                            className="w-24 text-right font-mono font-black bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden"
                          />
                        </div>
                      ) : (
                        `₹ ${effectiveTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* TERMS & CONDITIONS (EXACT MATCHING 12 CLAUSES + PAYMENT TERMS) */}
          {/* ------------------------------------------------------------- */}
          <div className="pt-4 space-y-2 page-break-inside-avoid quotation-footer-block">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs underline uppercase">Terms & Conditions</h3>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setTerms([...terms, 'New term clause text.'])}
                  className="no-print text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>नियम जोड़ें (Add Term)</span>
                </button>
              )}
            </div>

            <ol className="text-[11px] leading-relaxed space-y-1.5 text-slate-900 list-none pl-0">
              {terms.map((t, idx) => (
                <li key={idx} className="flex items-start gap-2 group/term">
                  <span className="font-bold shrink-0">{idx + 1}</span>
                  {isEditMode ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={t}
                        onChange={(e) => {
                          const updated = [...terms];
                          updated[idx] = e.target.value;
                          setTerms(updated);
                        }}
                        className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setTerms(terms.filter((_, i) => i !== idx))}
                        className="no-print text-red-400 hover:text-red-600 opacity-0 group-hover/term:opacity-100 transition p-0.5 cursor-pointer"
                        title="Delete term"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span>{t}</span>
                  )}
                </li>
              ))}

              {/* Clause 15: Payment Terms */}
              <li className="flex items-start gap-2 pt-1 font-bold">
                <span className="shrink-0">15</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full font-bold bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden text-[11px]"
                  />
                ) : (
                  <span>{paymentTerms}</span>
                )}
              </li>
            </ol>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* WARRANTY (PAGE 3 CONTENT MATCHING SCREENSHOT) */}
          {/* ------------------------------------------------------------- */}
          <div className="pt-4 page-break-inside-avoid">
            <h4 className="font-bold text-xs uppercase mb-1">WARRANTY :-</h4>
            {isEditMode ? (
              <input
                type="text"
                value={warrantyText}
                onChange={(e) => setWarrantyText(e.target.value)}
                className="w-full font-bold text-xs bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-hidden"
              />
            ) : (
              <p className="font-bold text-xs text-slate-900">{warrantyText}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
