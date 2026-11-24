import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles,
  Download,
  Info,
  Maximize2,
  Minimize2,
  TableProperties,
  Image as ImageIcon,
  Columns,
  Layers,
} from 'lucide-react';
import {
  ExcelColumnWidths,
  DEFAULT_EXCEL_COLUMN_WIDTHS,
  getSavedExcelColumnWidths,
  saveExcelColumnWidths,
  ElevationSheetColumnWidths,
  DEFAULT_ELEVATION_SHEET_COLUMN_WIDTHS,
  getSavedElevationSheetExcelColWidths,
  saveElevationSheetExcelColWidths,
} from '../utils/excelExportUtils';

export interface ColumnDefinitionMeta {
  key: keyof ExcelColumnWidths;
  colLetter: string;
  name: string;
  nameHindi: string;
  description: string;
  defaultWidth: number;
  min: number;
  max: number;
  category: 'id' | 'cad' | 'desc' | 'spec' | 'commercial';
}

export const EXCEL_COLUMNS_META: ColumnDefinitionMeta[] = [
  {
    key: 'sr',
    colLetter: 'Col A',
    name: 'Sr. No.',
    nameHindi: 'क्रम संख्या',
    description: 'सीरियल नंबर (1, 2, 3...)',
    defaultWidth: 8,
    min: 5,
    max: 20,
    category: 'id',
  },
  {
    key: 'cad',
    colLetter: 'Col B',
    name: 'CAD Drawing',
    nameHindi: 'खिड़की/दरवाजा CAD चित्र',
    description: 'एंबेडेड आर्किटेक्चरल एलिवेशन ड्रॉइंग इमेज',
    defaultWidth: 36,
    min: 18,
    max: 75,
    category: 'cad',
  },
  {
    key: 'name',
    colLetter: 'Col C',
    name: 'Window / Door Description',
    nameHindi: 'नाम व प्रकार विवरण',
    description: 'मॉडल का नाम (उदा. 3-Track Sliding, French Door)',
    defaultWidth: 30,
    min: 15,
    max: 60,
    category: 'desc',
  },
  {
    key: 'dim',
    colLetter: 'Col D',
    name: 'Dimensions (W × H mm)',
    nameHindi: 'साइज / माप (मिमी)',
    description: 'खिड़की की चौड़ाई व ऊँचाई (उदा. 1800 × 2100 mm)',
    defaultWidth: 22,
    min: 12,
    max: 40,
    category: 'desc',
  },
  {
    key: 'series',
    colLetter: 'Col E',
    name: 'Profile Series & Color',
    nameHindi: 'प्रोफाइल सीरीज व कलर',
    description: 'प्रोफाइल की मोटाई व लेमिनेशन शेड',
    defaultWidth: 22,
    min: 12,
    max: 45,
    category: 'spec',
  },
  {
    key: 'glass',
    colLetter: 'Col F',
    name: 'Glass Specification',
    nameHindi: 'ग्लास विवरण / स्पेक',
    description: 'कांच की मोटाई व प्रकार (उदा. 5mm Clear Toughened)',
    defaultWidth: 24,
    min: 14,
    max: 50,
    category: 'spec',
  },
  {
    key: 'qty',
    colLetter: 'Col G',
    name: 'Qty',
    nameHindi: 'मात्रा (संख्या)',
    description: 'विंडो यूनिट्स की कुल संख्या',
    defaultWidth: 10,
    min: 6,
    max: 20,
    category: 'commercial',
  },
  {
    key: 'area',
    colLetter: 'Col H',
    name: 'Area (Sq.Ft)',
    nameHindi: 'क्षेत्रफल (वर्ग फीट)',
    description: 'प्रति यूनिट या कुल क्षेत्रफल',
    defaultWidth: 15,
    min: 10,
    max: 30,
    category: 'commercial',
  },
  {
    key: 'rate',
    colLetter: 'Col I',
    name: 'Rate (Rs./Sq.Ft)',
    nameHindi: 'दर (रुपये प्रति वर्ग फीट)',
    description: 'यूनिट दर (उदा. ₹550 / Sq.Ft)',
    defaultWidth: 16,
    min: 10,
    max: 35,
    category: 'commercial',
  },
  {
    key: 'amount',
    colLetter: 'Col J',
    name: 'Total Amount (Rs.)',
    nameHindi: 'कुल राशि (रुपये)',
    description: 'कुल मूल्य (मात्रा × एरिया × रेट)',
    defaultWidth: 20,
    min: 12,
    max: 40,
    category: 'commercial',
  },
];

export interface ElevationColMeta {
  key: keyof Omit<ElevationSheetColumnWidths, 'rowHeight'>;
  colLetter: string;
  name: string;
  nameHindi: string;
  description: string;
  defaultWidth: number;
  min: number;
  max: number;
}

export const ELEVATION_SHEET_COLUMNS_META: ElevationColMeta[] = [
  {
    key: 'sNo',
    colLetter: 'Col A',
    name: 'S.NO.',
    nameHindi: 'क्रम संख्या (S.No)',
    description: 'सीरियल नंबर (1, 2, 3...)',
    defaultWidth: 8,
    min: 5,
    max: 20,
  },
  {
    key: 'discription',
    colLetter: 'Col B',
    name: 'DISCRIPTION (CAD Drawing)',
    nameHindi: 'खिड़की/दरवाजा CAD चित्र',
    description: 'सैश, हैंडल व आयामों (Dimensions) सहित एंबेडेड एलिवेशन ड्राइंग',
    defaultWidth: 44,
    min: 24,
    max: 85,
  },
  {
    key: 'designName',
    colLetter: 'Col C',
    name: 'DESIGN NAME & SPECS',
    nameHindi: 'डिज़ाइन नाम, साइज़ व एरिया',
    description: 'मॉडल प्रकार (3 TRACK), साइज़ W×H mm, एरिया Sq.Ft',
    defaultWidth: 32,
    min: 18,
    max: 65,
  },
  {
    key: 'glass',
    colLetter: 'Col D',
    name: 'GLASS SPECIFICATION',
    nameHindi: 'ग्लास विवरण / स्पेक',
    description: 'कांच की मोटाई व प्रकार (उदा. 6 MM CLEAR TOUGHNED / DGU)',
    defaultWidth: 28,
    min: 16,
    max: 55,
  },
];

export interface ExcelColumnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFormat?: 'standard' | 'elevation_sheet';
  onApply?: (widths: ExcelColumnWidths) => void;
  onDownloadNow?: (widths: ExcelColumnWidths) => void;
  onDownloadElevationSheet?: (widths: ElevationSheetColumnWidths) => void;
  isDownloading?: boolean;
}

export const ExcelColumnSettingsModal: React.FC<ExcelColumnSettingsModalProps> = ({
  isOpen,
  onClose,
  initialFormat = 'standard',
  onApply,
  onDownloadNow,
  onDownloadElevationSheet,
  isDownloading = false,
}) => {
  const [activeFormat, setActiveFormat] = useState<'standard' | 'elevation_sheet'>(initialFormat);
  const [widths, setWidths] = useState<ExcelColumnWidths>(getSavedExcelColumnWidths);
  const [elevationWidths, setElevationWidths] = useState<ElevationSheetColumnWidths>(
    getSavedElevationSheetExcelColWidths
  );
  const [savedToast, setSavedToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWidths(getSavedExcelColumnWidths());
      setElevationWidths(getSavedElevationSheetExcelColWidths());
      if (initialFormat) {
        setActiveFormat(initialFormat);
      }
    }
  }, [isOpen, initialFormat]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Standard 10-Column Handlers
  // -------------------------------------------------------------
  const totalStandardWidth: number = (
    Object.values(widths) as Array<number | undefined>
  ).reduce<number>((sum, w) => sum + (typeof w === 'number' ? w : 0), 0);

  const handleStandardWidthChange = (key: keyof ExcelColumnWidths, val: number) => {
    const meta = EXCEL_COLUMNS_META.find((m) => m.key === key);
    const clamped = Math.max(meta ? meta.min : 4, Math.min(meta ? meta.max : 100, val));
    setWidths((prev) => ({ ...prev, [key]: clamped }));
  };

  const handleStandardNudge = (key: keyof ExcelColumnWidths, delta: number) => {
    const cur = Number(widths[key]) || 20;
    handleStandardWidthChange(key, cur + delta);
  };

  const applyStandardPreset = (
    preset: 'standard' | 'large_cad' | 'detailed_text' | 'commercial' | 'compact'
  ) => {
    let newWidths: ExcelColumnWidths = { ...DEFAULT_EXCEL_COLUMN_WIDTHS };
    switch (preset) {
      case 'standard':
        newWidths = { ...DEFAULT_EXCEL_COLUMN_WIDTHS };
        break;
      case 'large_cad':
        newWidths = {
          ...DEFAULT_EXCEL_COLUMN_WIDTHS,
          sr: 7,
          cad: 52,
          name: 26,
          dim: 20,
          series: 20,
          glass: 22,
          qty: 8,
          area: 14,
          rate: 15,
          amount: 18,
        };
        break;
      case 'detailed_text':
        newWidths = {
          ...DEFAULT_EXCEL_COLUMN_WIDTHS,
          sr: 7,
          cad: 30,
          name: 44,
          dim: 24,
          series: 28,
          glass: 32,
          qty: 9,
          area: 14,
          rate: 15,
          amount: 19,
        };
        break;
      case 'commercial':
        newWidths = {
          ...DEFAULT_EXCEL_COLUMN_WIDTHS,
          sr: 8,
          cad: 32,
          name: 26,
          dim: 20,
          series: 20,
          glass: 22,
          qty: 12,
          area: 18,
          rate: 22,
          amount: 26,
        };
        break;
      case 'compact':
        newWidths = {
          sr: 6,
          cad: 24,
          name: 22,
          dim: 16,
          series: 16,
          glass: 18,
          qty: 7,
          area: 12,
          rate: 13,
          amount: 16,
        };
        break;
    }
    setWidths(newWidths);
  };

  // -------------------------------------------------------------
  // Elevation Sheet (4-Column Image Style) Handlers
  // -------------------------------------------------------------
  const totalElevationWidth: number =
    Number(elevationWidths.sNo) +
    Number(elevationWidths.discription) +
    Number(elevationWidths.designName) +
    Number(elevationWidths.glass);

  const handleElevationWidthChange = (
    key: keyof Omit<ElevationSheetColumnWidths, 'rowHeight'>,
    val: number
  ) => {
    const meta = ELEVATION_SHEET_COLUMNS_META.find((m) => m.key === key);
    const clamped = Math.max(meta ? meta.min : 4, Math.min(meta ? meta.max : 100, val));
    setElevationWidths((prev) => ({ ...prev, [key]: clamped }));
  };

  const handleElevationNudge = (
    key: keyof Omit<ElevationSheetColumnWidths, 'rowHeight'>,
    delta: number
  ) => {
    const cur = Number(elevationWidths[key]) || 30;
    handleElevationWidthChange(key, cur + delta);
  };

  const applyElevationPreset = (preset: 'standard' | 'large_cad' | 'compact') => {
    switch (preset) {
      case 'standard':
        setElevationWidths({ ...DEFAULT_ELEVATION_SHEET_COLUMN_WIDTHS });
        break;
      case 'large_cad':
        setElevationWidths({
          sNo: 7,
          discription: 56,
          designName: 28,
          glass: 25,
          rowHeight: 160,
        });
        break;
      case 'compact':
        setElevationWidths({
          sNo: 6,
          discription: 36,
          designName: 28,
          glass: 24,
          rowHeight: 110,
        });
        break;
    }
  };

  // -------------------------------------------------------------
  // Global Save & Download Actions
  // -------------------------------------------------------------
  const handleSave = () => {
    if (activeFormat === 'standard') {
      saveExcelColumnWidths(widths);
      if (onApply) onApply(widths);
      setSavedToast('स्टैंडर्ड कोटेशन कॉलम साइज सेव हो गया! (Standard Column widths saved)');
    } else {
      saveElevationSheetExcelColWidths(elevationWidths);
      setSavedToast('इमेज स्टाइल कोटेशन शीट कॉलम साइज सेव हो गया! (Elevation Sheet widths saved)');
    }
    setTimeout(() => {
      setSavedToast(null);
      onClose();
    }, 1200);
  };

  const handleDownloadStandardWithCurrent = () => {
    saveExcelColumnWidths(widths);
    if (onApply) onApply(widths);
    if (onDownloadNow) {
      onDownloadNow(widths);
    }
  };

  const handleDownloadElevationWithCurrent = () => {
    saveElevationSheetExcelColWidths(elevationWidths);
    if (onDownloadElevationSheet) {
      onDownloadElevationSheet(elevationWidths);
    }
  };

  const handleReset = () => {
    if (activeFormat === 'standard') {
      setWidths({ ...DEFAULT_EXCEL_COLUMN_WIDTHS });
    } else {
      setElevationWidths({ ...DEFAULT_ELEVATION_SHEET_COLUMN_WIDTHS });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-emerald-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-emerald-100 shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <span>Excel Column Space & Width Settings</span>
                <span className="bg-emerald-600/60 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full uppercase border border-emerald-500/40 font-bold">
                  कॉलम जगह व चौड़ाई सेटिंग
                </span>
              </h2>
              <p className="text-xs text-emerald-200">
                तय करें कि एक्सेल शीट में किस कॉलम को कितनी जगह (चौड़ाई/Width) मिलेगी।
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast Notice */}
        {savedToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2 text-emerald-900 text-xs font-bold animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedToast}</span>
          </div>
        )}

        {/* FORMAT SELECTION TABS: STANDARD TABLE vs ELEVATION SHEET (IMAGE FORMAT) */}
        <div className="bg-slate-900 p-2 border-b border-slate-800 flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">
            एक्सेल फॉर्मेट चुनें:
          </span>

          <button
            onClick={() => setActiveFormat('standard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              activeFormat === 'standard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>1. विस्तृत तालिका (Standard 10 Columns)</span>
          </button>

          <button
            onClick={() => setActiveFormat('elevation_sheet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              activeFormat === 'elevation_sheet'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>2. इमेज वाला कोटेशन शीट (Shri Balaji 4-Col Format)</span>
            <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black">
              इमेज जैसा
            </span>
          </button>
        </div>

        {/* FORMAT DESCRIPTION BANNER */}
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/60 text-amber-950 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            {activeFormat === 'standard' ? (
              <span>
                <strong>विस्तृत तालिका एक्सेल (10 कॉलम):</strong> इसमें Sr No, CAD चित्र, विवरण, माप,
                सीरीज, ग्लास, मात्रा, एरिया, रेट व कुल राशि के 10 कॉलम होते हैं।
              </span>
            ) : (
              <span>
                <strong>इमेज वाला कोटेशन शीट एक्सेल (4 कॉलम):</strong> बिल्कुल आपकी भेजी गई कोटेशन इमेज
                जैसा लेआउट — <strong>S.NO. | DISCRIPTION (CAD चित्र) | DESIGN NAME | GLASS</strong> +
                नीचे एरिया, रेट, कार्टेज व 12 नियम व शर्तें!
              </span>
            )}
          </div>
        </div>

        {/* PRESETS BAR */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <span>त्वरित लेआउट प्रीसेट्स (Layout Presets):</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {activeFormat === 'standard' ? (
              <>
                <button
                  onClick={() => applyStandardPreset('standard')}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                  title="Standard balanced column widths"
                >
                  संतुलित (Balanced)
                </button>
                <button
                  onClick={() => applyStandardPreset('large_cad')}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 transition cursor-pointer shadow-2xs"
                  title="Wide CAD drawing column"
                >
                  बड़ा CAD चित्र (Large CAD)
                </button>
                <button
                  onClick={() => applyStandardPreset('detailed_text')}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 transition cursor-pointer shadow-2xs"
                  title="Wider description and glass columns"
                >
                  लंबा विवरण (Wide Text)
                </button>
                <button
                  onClick={() => applyStandardPreset('commercial')}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 transition cursor-pointer shadow-2xs"
                  title="Wider rate, area & amount columns"
                >
                  कमर्शियल (Focus Rates)
                </button>
                <button
                  onClick={() => applyStandardPreset('compact')}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                  title="Compact column widths"
                >
                  कॉम्पैक्ट (Compact)
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => applyElevationPreset('standard')}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                  title="Standard elevation sheet layout"
                >
                  इमेज जैसा बैलेंस्ड (Default Image)
                </button>
                <button
                  onClick={() => applyElevationPreset('large_cad')}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 transition cursor-pointer shadow-2xs"
                  title="Extra wide CAD Drawing column"
                >
                  बड़ा CAD चित्र (Wide CAD)
                </button>
                <button
                  onClick={() => applyElevationPreset('compact')}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                  title="Compact elevation layout"
                >
                  कॉम्पैक्ट शीट (Compact A4)
                </button>
              </>
            )}
          </div>
        </div>

        {/* LIVE VISUAL PROPORTIONAL PREVIEW BAR */}
        <div className="bg-slate-900 text-white p-3 sm:px-5 shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <TableProperties className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                लाइव टेबल चौड़ाई अनुपात (Live Table Column Proportions):
              </span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              कुल चौड़ाई यूनिट: {activeFormat === 'standard' ? totalStandardWidth : totalElevationWidth}
            </span>
          </div>

          {activeFormat === 'standard' ? (
            <div className="w-full h-8 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-700 text-[10px] font-bold">
              {EXCEL_COLUMNS_META.map((meta) => {
                const w = Number(widths[meta.key]) || meta.defaultWidth;
                const pct = Math.max(3, (w / Math.max(1, totalStandardWidth)) * 100);
                const bgColors: Record<string, string> = {
                  id: 'bg-slate-700 text-slate-200 border-r border-slate-600',
                  cad: 'bg-blue-700 text-white border-r border-blue-500 font-black',
                  desc: 'bg-indigo-700 text-white border-r border-indigo-500',
                  spec: 'bg-teal-700 text-white border-r border-teal-500',
                  commercial: 'bg-emerald-700 text-white border-r border-emerald-500',
                };
                return (
                  <div
                    key={meta.key}
                    style={{ width: `${pct}%` }}
                    className={`h-full flex flex-col items-center justify-center overflow-hidden transition-all duration-150 px-0.5 ${
                      bgColors[meta.category] || 'bg-slate-700'
                    }`}
                    title={`${meta.name}: ${w} (${pct.toFixed(1)}%)`}
                  >
                    <span className="truncate leading-none">{String(meta.key).toUpperCase()}</span>
                    <span className="text-[8px] opacity-80 leading-none mt-0.5">{w}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full h-8 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-700 text-[10px] font-bold">
              {ELEVATION_SHEET_COLUMNS_META.map((meta) => {
                const w = Number(elevationWidths[meta.key]) || meta.defaultWidth;
                const pct = Math.max(4, (w / Math.max(1, totalElevationWidth)) * 100);
                const colors: Record<string, string> = {
                  sNo: 'bg-slate-700 text-slate-200 border-r border-slate-600',
                  discription: 'bg-blue-700 text-white border-r border-blue-500 font-black',
                  designName: 'bg-amber-700 text-white border-r border-amber-500',
                  glass: 'bg-emerald-700 text-white border-r border-emerald-500',
                };
                return (
                  <div
                    key={meta.key}
                    style={{ width: `${pct}%` }}
                    className={`h-full flex flex-col items-center justify-center overflow-hidden transition-all duration-150 px-0.5 ${
                      colors[meta.key] || 'bg-slate-700'
                    }`}
                    title={`${meta.name}: ${w} (${pct.toFixed(1)}%)`}
                  >
                    <span className="truncate leading-none">{meta.name.split(' ')[0]}</span>
                    <span className="text-[8px] opacity-80 leading-none mt-0.5">{w}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SCROLLABLE COLUMN EDITORS LIST */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeFormat === 'standard' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXCEL_COLUMNS_META.map((meta) => {
                const currentW = Number(widths[meta.key]) || meta.defaultWidth;
                return (
                  <div
                    key={meta.key}
                    className={`p-3.5 rounded-xl border transition-all ${
                      meta.key === 'cad'
                        ? 'border-blue-300 bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {meta.colLetter}
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 leading-tight">
                            {meta.name}
                          </h4>
                          <span className="text-[11px] font-bold text-emerald-700 leading-none">
                            {meta.nameHindi}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStandardNudge(meta.key, -1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center transition cursor-pointer"
                          title="Decrease width by 1"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={meta.min}
                          max={meta.max}
                          value={currentW}
                          onChange={(e) =>
                            handleStandardWidthChange(meta.key, Number(e.target.value) || meta.min)
                          }
                          className="w-12 text-center text-xs font-mono font-black border border-slate-300 rounded px-1 py-0.5 bg-slate-50 text-slate-900"
                        />
                        <button
                          onClick={() => handleStandardNudge(meta.key, 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center transition cursor-pointer"
                          title="Increase width by 1"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-2">{meta.description}</p>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Min: {meta.min}</span>
                        <span className="text-blue-700 font-bold">Default: {meta.defaultWidth}</span>
                        <span>Max: {meta.max}</span>
                      </div>

                      <input
                        type="range"
                        min={meta.min}
                        max={meta.max}
                        value={currentW}
                        onChange={(e) =>
                          handleStandardWidthChange(meta.key, Number(e.target.value))
                        }
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ELEVATION_SHEET_COLUMNS_META.map((meta) => {
                  const currentW = Number(elevationWidths[meta.key]) || meta.defaultWidth;
                  return (
                    <div
                      key={meta.key}
                      className={`p-4 rounded-xl border transition-all ${
                        meta.key === 'discription'
                          ? 'border-blue-400 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {meta.colLetter}
                          </span>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 leading-tight">
                              {meta.name}
                            </h4>
                            <span className="text-[11px] font-bold text-amber-700 leading-none">
                              {meta.nameHindi}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleElevationNudge(meta.key, -1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center transition cursor-pointer"
                            title="Decrease width by 1"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={meta.min}
                            max={meta.max}
                            value={currentW}
                            onChange={(e) =>
                              handleElevationWidthChange(meta.key, Number(e.target.value) || meta.min)
                            }
                            className="w-12 text-center text-xs font-mono font-black border border-slate-300 rounded px-1 py-0.5 bg-slate-50 text-slate-900"
                          />
                          <button
                            onClick={() => handleElevationNudge(meta.key, 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center transition cursor-pointer"
                            title="Increase width by 1"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 mb-2">{meta.description}</p>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Min: {meta.min}</span>
                          <span className="text-blue-700 font-bold">Default: {meta.defaultWidth}</span>
                          <span>Max: {meta.max}</span>
                        </div>

                        <input
                          type="range"
                          min={meta.min}
                          max={meta.max}
                          value={currentW}
                          onChange={(e) =>
                            handleElevationWidthChange(meta.key, Number(e.target.value))
                          }
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CAD Row Height Adjustment */}
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <span>CAD एलिवेशन पंक्ति ऊंचाई (Drawing Row Height):</span>
                    <span className="font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                      {elevationWidths.rowHeight || 135} pt
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    एक्सेल में प्रत्येक विंडो रो की ऊंचाई ताकि CAD ड्राइंग बड़ी व साफ दिखे।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setElevationWidths((prev) => ({
                        ...prev,
                        rowHeight: Math.max(90, (prev.rowHeight || 135) - 10),
                      }))
                    }
                    className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-black text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={90}
                    max={220}
                    step={5}
                    value={elevationWidths.rowHeight || 135}
                    onChange={(e) =>
                      setElevationWidths((prev) => ({
                        ...prev,
                        rowHeight: Number(e.target.value) || 135,
                      }))
                    }
                    className="w-32 h-1.5 bg-emerald-200 rounded accent-emerald-700 cursor-pointer"
                  />
                  <button
                    onClick={() =>
                      setElevationWidths((prev) => ({
                        ...prev,
                        rowHeight: Math.min(220, (prev.rowHeight || 135) + 10),
                      }))
                    }
                    className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-black text-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-slate-200 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>डिफ़ॉल्ट रीसेट (Reset Defaults)</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer border border-slate-200"
            >
              रद्द करें (Cancel)
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md transition cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>सेटिंग्स सेव करें (Save Settings)</span>
            </button>

            {/* Direct Download buttons depending on format */}
            {activeFormat === 'standard' && onDownloadNow && (
              <button
                onClick={handleDownloadStandardWithCurrent}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition cursor-pointer active:scale-95 ring-2 ring-emerald-500/30"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span>
                  {isDownloading ? 'एक्सेल बन रहा है...' : 'विस्तृत एक्सेल डाउनलोड करें'}
                </span>
              </button>
            )}

            {activeFormat === 'elevation_sheet' && (
              <button
                onClick={handleDownloadElevationWithCurrent}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-slate-950 shadow-md transition cursor-pointer active:scale-95 ring-2 ring-amber-400 font-black"
              >
                <Download className="w-3.5 h-3.5 text-slate-950" />
                <span>
                  {isDownloading ? 'एक्सेल बन रहा है...' : 'इमेज जैसा एक्सेल डाउनलोड करें'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
