import React, { useState, useRef } from 'react';
import {
  Settings,
  X,
  Building2,
  Receipt,
  CreditCard,
  ShieldCheck,
  Landmark,
  Upload,
  Trash2,
  Plus,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  Sliders,
  TableProperties,
} from 'lucide-react';
import { CommercialSummaryLine } from './CustomTableQuotation';
import {
  ExcelColumnWidths,
  DEFAULT_EXCEL_COLUMN_WIDTHS,
  getSavedExcelColumnWidths,
  saveExcelColumnWidths,
} from '../utils/excelExportUtils';
import { EXCEL_COLUMNS_META } from './ExcelColumnSettingsModal';

export interface MasterBankDetails {
  bankName: string;
  accountHolder: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  upiId: string;
}

export interface QuotationMasterDefaults {
  companyLogo: string;
  logoScale?: 'sm' | 'md' | 'lg' | 'xl';
  showClientBillingDetails?: boolean;
  showClientAddress?: boolean;
  companyPhone2?: string;
  baseItemLabel: string;
  baseItemRate: string;
  defaultExtraLines: CommercialSummaryLine[];
  defaultAdvancePercent: number;
  totalAmountLabel: string;
  advanceAmountLabel: string;
  balanceLabel: string;
  paymentTerms: string[];
  guaranteeTerms: string[];
  bankDetails: MasterBankDetails;
}

export const DEFAULT_MASTER_QUOTATION_CONFIG: QuotationMasterDefaults = {
  companyLogo: '',
  logoScale: 'lg',
  showClientBillingDetails: true,
  showClientAddress: true,
  companyPhone2: '',
  baseItemLabel: 'upvc Windows & Door',
  baseItemRate: '570.00',
  defaultExtraLines: [
    {
      id: 'default-line-cartage',
      label: 'CARTAGE AMOUNT',
      sqFt: '',
      rate: '',
      price: '1,800.00',
      isDeduction: false,
    },
  ],
  defaultAdvancePercent: 50,
  totalAmountLabel: 'TOTAL AMOUNT',
  advanceAmountLabel: 'ADVANCE AMOUNT RECEIVED',
  balanceLabel: 'BALANCE DUE / NET PAYABLE',
  paymentTerms: [
    '50% Advance along with confirmed Purchase Order / CAD drawing approval.',
    '40% against material readiness & dispatch at site prior to installation.',
    '10% upon complete installation, silicon perimeter sealing, and handover.',
    'Accepted Payment Modes: NEFT / RTGS / IMPS / Account Payee Cheque / UPI.',
    'Work will commence post site sill plaster clearance and electricity availability at site.',
  ],
  guaranteeTerms: [
    '10 Years Warranty on UPVC Profiles against warping, cracking & color fading (UV resistance).',
    '1 Year Comprehensive Guarantee on all moving Hardware, Rollers, Hinges, Friction Stays & Locks.',
    '5 Years Guarantee on Double Glazed Hermetically Sealed Units (DGU) against internal moisture condensation.',
    'All Profiles are 100% Lead-Free, RoHS compliant, and engineered for high wind pressure resistance.',
  ],
  bankDetails: {
    bankName: 'HDFC Bank Ltd.',
    accountHolder: 'REMIX uPVC & Aluminium Fabrication',
    accountNo: '50200012345678',
    ifsc: 'HDFC0000123',
    branch: 'Industrial Area Branch, New Delhi',
    upiId: 'remixupvc@okhdfcbank',
  },
};

export function getMasterQuotationDefaults(): QuotationMasterDefaults {
  try {
    const raw = localStorage.getItem('upvc_master_quotation_defaults');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_MASTER_QUOTATION_CONFIG,
        ...parsed,
        logoScale: parsed.logoScale || DEFAULT_MASTER_QUOTATION_CONFIG.logoScale,
        showClientBillingDetails: parsed.showClientBillingDetails !== undefined ? parsed.showClientBillingDetails : true,
        showClientAddress: parsed.showClientAddress !== undefined ? parsed.showClientAddress : true,
        companyPhone2: parsed.companyPhone2 || '',
        bankDetails: {
          ...DEFAULT_MASTER_QUOTATION_CONFIG.bankDetails,
          ...(parsed.bankDetails || {}),
        },
        paymentTerms: parsed.paymentTerms?.length ? parsed.paymentTerms : DEFAULT_MASTER_QUOTATION_CONFIG.paymentTerms,
        guaranteeTerms: parsed.guaranteeTerms?.length ? parsed.guaranteeTerms : DEFAULT_MASTER_QUOTATION_CONFIG.guaranteeTerms,
        defaultExtraLines: parsed.defaultExtraLines?.length ? parsed.defaultExtraLines : DEFAULT_MASTER_QUOTATION_CONFIG.defaultExtraLines,
      };
    }
  } catch (e) {}

  // Fallback to individual legacy localStorage keys if available
  try {
    const savedLogo = localStorage.getItem('upvc_default_quotation_logo') || localStorage.getItem('upvc_quotation_logo') || '';
    const savedBank = localStorage.getItem('upvc_custom_quote_bank');
    const savedPayment = localStorage.getItem('upvc_custom_quote_payment');
    const savedGuarantee = localStorage.getItem('upvc_custom_quote_guarantee');
    const savedTotalLabel = localStorage.getItem('upvc_custom_quote_total_label');
    const savedAdvanceLabel = localStorage.getItem('upvc_custom_quote_advance_label');
    const savedBalanceLabel = localStorage.getItem('upvc_custom_quote_balance_label');

    return {
      ...DEFAULT_MASTER_QUOTATION_CONFIG,
      companyLogo: savedLogo || DEFAULT_MASTER_QUOTATION_CONFIG.companyLogo,
      bankDetails: savedBank ? JSON.parse(savedBank) : DEFAULT_MASTER_QUOTATION_CONFIG.bankDetails,
      paymentTerms: savedPayment ? JSON.parse(savedPayment) : DEFAULT_MASTER_QUOTATION_CONFIG.paymentTerms,
      guaranteeTerms: savedGuarantee ? JSON.parse(savedGuarantee) : DEFAULT_MASTER_QUOTATION_CONFIG.guaranteeTerms,
      totalAmountLabel: savedTotalLabel || DEFAULT_MASTER_QUOTATION_CONFIG.totalAmountLabel,
      advanceAmountLabel: savedAdvanceLabel || DEFAULT_MASTER_QUOTATION_CONFIG.advanceAmountLabel,
      balanceLabel: savedBalanceLabel || DEFAULT_MASTER_QUOTATION_CONFIG.balanceLabel,
    };
  } catch (e) {}

  return DEFAULT_MASTER_QUOTATION_CONFIG;
}

interface QuotationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToCurrent: (defaults: QuotationMasterDefaults) => void;
  currentQuotationValues?: Partial<QuotationMasterDefaults>;
}

export function QuotationSettingsModal({
  isOpen,
  onClose,
  onApplyToCurrent,
  currentQuotationValues,
}: QuotationSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'logo' | 'commercial' | 'payment' | 'warranty' | 'bank' | 'excel_columns'>('logo');
  const [excelWidths, setExcelWidths] = useState<ExcelColumnWidths>(getSavedExcelColumnWidths);
  const [defaults, setDefaults] = useState<QuotationMasterDefaults>(() => {
    const loaded = getMasterQuotationDefaults();
    if (currentQuotationValues) {
      return {
        ...loaded,
        companyLogo: currentQuotationValues.companyLogo || loaded.companyLogo,
        baseItemLabel: currentQuotationValues.baseItemLabel || loaded.baseItemLabel,
        baseItemRate: currentQuotationValues.baseItemRate || loaded.baseItemRate,
        totalAmountLabel: currentQuotationValues.totalAmountLabel || loaded.totalAmountLabel,
        advanceAmountLabel: currentQuotationValues.advanceAmountLabel || loaded.advanceAmountLabel,
        balanceLabel: currentQuotationValues.balanceLabel || loaded.balanceLabel,
        paymentTerms: currentQuotationValues.paymentTerms || loaded.paymentTerms,
        guaranteeTerms: currentQuotationValues.guaranteeTerms || loaded.guaranteeTerms,
        bankDetails: currentQuotationValues.bankDetails || loaded.bankDetails,
        defaultExtraLines: currentQuotationValues.defaultExtraLines || loaded.defaultExtraLines,
      };
    }
    return loaded;
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('कृपया 2MB से कम साइज का लोगो चुनें (Please select logo under 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        setDefaults((prev) => ({ ...prev, companyLogo: res }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMasterDefaults = () => {
    try {
      localStorage.setItem('upvc_master_quotation_defaults', JSON.stringify(defaults));
      if (defaults.companyLogo) {
        localStorage.setItem('upvc_default_quotation_logo', defaults.companyLogo);
        localStorage.setItem('upvc_quotation_logo', defaults.companyLogo);
      }
      localStorage.setItem('upvc_custom_quote_bank', JSON.stringify(defaults.bankDetails));
      localStorage.setItem('upvc_custom_quote_payment', JSON.stringify(defaults.paymentTerms));
      localStorage.setItem('upvc_custom_quote_guarantee', JSON.stringify(defaults.guaranteeTerms));
      localStorage.setItem('upvc_custom_quote_total_label', defaults.totalAmountLabel);
      localStorage.setItem('upvc_custom_quote_advance_label', defaults.advanceAmountLabel);
      localStorage.setItem('upvc_custom_quote_balance_label', defaults.balanceLabel);
      saveExcelColumnWidths(excelWidths);

      setSaveSuccessMsg('डिफॉल्ट सेटिंग्स व एक्सेल कॉलम साइज सफलतापूर्वक सेव हो गई हैं! अब किसी भी नए कस्टमर के कोटेशन में यही सेटिंग्स अपने-आप खुलेंगी।');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (e) {
      alert('Error saving defaults to storage.');
    }
  };

  const handleSaveAndApply = () => {
    handleSaveMasterDefaults();
    onApplyToCurrent(defaults);
    onClose();
  };

  const handleAddDefaultExtraLine = (preset?: Partial<CommercialSummaryLine>) => {
    const newLine: CommercialSummaryLine = {
      id: `extra-def-${Date.now()}`,
      label: preset?.label || 'NEW EXTRA ITEM / अतिरिक्त मद',
      sqFt: preset?.sqFt || '',
      rate: preset?.rate || '',
      price: preset?.price || '0.00',
      isDeduction: preset?.isDeduction || false,
    };
    setDefaults((prev) => ({
      ...prev,
      defaultExtraLines: [...prev.defaultExtraLines, newLine],
    }));
  };

  const handleUpdateDefaultExtraLine = (id: string, updates: Partial<CommercialSummaryLine>) => {
    setDefaults((prev) => ({
      ...prev,
      defaultExtraLines: prev.defaultExtraLines.map((line) =>
        line.id === id ? { ...line, ...updates } : line
      ),
    }));
  };

  const handleDeleteDefaultExtraLine = (id: string) => {
    setDefaults((prev) => ({
      ...prev,
      defaultExtraLines: prev.defaultExtraLines.filter((l) => l.id !== id),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide flex items-center gap-2">
                <span>Quotation Master Defaults & Settings</span>
                <span className="bg-blue-500/30 text-blue-300 text-[10px] px-2 py-0.5 rounded-full uppercase border border-blue-400/30 font-semibold">
                  हर नए कस्टमर हेतु
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                यहाँ सेट किया गया लोगो, पेमेंट शर्तें, गारंटी, बैंक और अमाउंट सारांश हर नए कोटेशन में अपने-आप खुलेगा।
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center gap-2 text-emerald-900 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none py-1.5">
          <button
            onClick={() => setActiveTab('logo')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'logo'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Logo & Branding (लोगो)</span>
          </button>

          <button
            onClick={() => setActiveTab('commercial')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'commercial'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>2. Commercial Summary (अमाउंट सारांश)</span>
          </button>

          <button
            onClick={() => setActiveTab('payment')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'payment'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>3. Payment Terms (भुगतान शर्तें)</span>
          </button>

          <button
            onClick={() => setActiveTab('warranty')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'warranty'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>4. Guarantee & Warranty (गारंटी)</span>
          </button>

          <button
            onClick={() => setActiveTab('bank')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'bank'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>5. Bank & UPI Details (बैंक विवरण)</span>
          </button>

          <button
            onClick={() => setActiveTab('excel_columns')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'excel_columns'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>6. Excel Column Space (कॉलम साइज/स्पेस)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs text-slate-800">
          {/* TAB 1: LOGO */}
          {activeTab === 'logo' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Default Company Logo (डिफॉल्ट कंपनी लोगो)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  यह लोगो हर नए ग्राहक के कोटेशन हेडर में बाईं तरफ अपने-आप आएगा। आप इसे कभी भी कोटेशन पेज से भी बदल सकते हैं।
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="w-40 h-28 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-white overflow-hidden p-2 shadow-inner">
                    {defaults.companyLogo ? (
                      <img
                        src={defaults.companyLogo}
                        alt="Company Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <Building2 className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                        <span className="text-[10px]">No Logo Selected</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Default Logo / लोगो अपलोड करें</span>
                    </button>
                    {defaults.companyLogo && (
                      <button
                        onClick={() => setDefaults((prev) => ({ ...prev, companyLogo: '' }))}
                        className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Logo (लोगो हटाएं)</span>
                      </button>
                    )}
                    <span className="text-[11px] text-slate-500 italic">
                      Recommended: PNG, JPG or WebP with transparent background (Max 2MB).
                    </span>
                  </div>
                </div>

                {/* Logo Display Size Selector */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                    Logo Display Size in Quotation Table (कोटेशन टेबल में लोगो का आकार):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'sm', label: 'Normal (80px)', desc: 'Compact' },
                      { id: 'md', label: 'Medium (100px)', desc: 'Standard' },
                      { id: 'lg', label: 'Large (120px)', desc: 'Prominent ★' },
                      { id: 'xl', label: 'Extra Large (150px)', desc: 'Big Brand' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDefaults((prev) => ({ ...prev, logoScale: item.id as any }))}
                        className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                          (defaults.logoScale || 'lg') === item.id
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs">{item.label}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CLIENT & HEADER DISPLAY SETTINGS */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    Client Details & Address Visibility (क्लाइंट विवरण व पता दिखाना है या नहीं)
                  </h3>
                  <p className="text-xs text-slate-500">
                    यहाँ से तय करें कि बिल / कोटेशन टेबल में क्लाइंट की बिलिंग डिटेल्स और साइट पता दिखेगा या नहीं।
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition">
                    <input
                      type="checkbox"
                      checked={defaults.showClientBillingDetails !== false}
                      onChange={(e) =>
                        setDefaults((prev) => ({ ...prev, showClientBillingDetails: e.target.checked }))
                      }
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Show Client / Billing Details
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        क्लाइंट का नाम व फोन नंबर टेबल हेडर में दिखाएं
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition">
                    <input
                      type="checkbox"
                      checked={defaults.showClientAddress !== false}
                      onChange={(e) =>
                        setDefaults((prev) => ({ ...prev, showClientAddress: e.target.checked }))
                      }
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Show Site / Client Address
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        साइट व डिलीवरी का पता टेबल हेडर में दिखाएं
                      </span>
                    </div>
                  </label>
                </div>

                {/* Extra Mobile default */}
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Company Extra Mobile / WhatsApp No. (कंपनी का अतिरिक्त मोबाइल नंबर):
                  </label>
                  <input
                    type="text"
                    value={defaults.companyPhone2 || ''}
                    onChange={(e) => setDefaults((prev) => ({ ...prev, companyPhone2: e.target.value }))}
                    placeholder="e.g. +91 91234 56789 / 98765 43211"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    यह दूसरा मोबाइल नंबर कोटेशन हेडर में प्राथमिक नंबर के साथ दिखेगा।
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMMERCIAL SUMMARY DEFAULTS */}
          {activeTab === 'commercial' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    Commercial Summary Defaults (कोटेशन सारांश व अतिरिक्त लाइन्स)
                  </h3>
                  <p className="text-xs text-slate-500">
                    कोटेशन के नीचे जो 4-कॉलम कमर्शियल समरी टेबल (Description, Sq.Ft, Rate, Price) दिखती है, उसके डिफॉल्ट्स यहाँ सेट करें।
                  </p>
                </div>

                {/* Base Item Label & Default Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Default Base Item Name (मुख्य कार्य का नाम):
                    </label>
                    <input
                      type="text"
                      value={defaults.baseItemLabel}
                      onChange={(e) => setDefaults({ ...defaults, baseItemLabel: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                      placeholder="upvc Windows & Door"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Default Base Rate (₹/Sq.Ft):
                    </label>
                    <input
                      type="text"
                      value={defaults.baseItemRate}
                      onChange={(e) => setDefaults({ ...defaults, baseItemRate: e.target.value.replace(/[^0-9.]/g, '') })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                      placeholder="570.00"
                    />
                  </div>
                </div>

                {/* Default Extra Horizontal Lines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">
                      Default Extra Horizontal Lines (अतिरिक्त पंक्तियां जैसे भाड़ा, फिटिंग, आदि):
                    </label>
                    <button
                      onClick={() => handleAddDefaultExtraLine()}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Line / लाइन जोड़ें</span>
                    </button>
                  </div>

                  <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold">
                        <tr>
                          <th className="px-3 py-1.5 text-left">Description / नाम</th>
                          <th className="px-2 py-1.5 text-center w-20">Sq.Ft</th>
                          <th className="px-2 py-1.5 text-center w-24">Rate (₹)</th>
                          <th className="px-3 py-1.5 text-right w-28">Price (₹)</th>
                          <th className="px-2 py-1.5 text-center w-16">Type</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {defaults.defaultExtraLines.map((line) => (
                          <tr key={line.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={line.label}
                                onChange={(e) => handleUpdateDefaultExtraLine(line.id, { label: e.target.value })}
                                className="w-full bg-transparent font-semibold text-slate-900 focus:outline-none px-1 py-0.5 border-b border-transparent focus:border-blue-500 uppercase"
                              />
                            </td>
                            <td className="px-1 py-1 text-center">
                              <input
                                type="text"
                                value={line.sqFt}
                                onChange={(e) => handleUpdateDefaultExtraLine(line.id, { sqFt: e.target.value })}
                                placeholder="-"
                                className="w-full text-center bg-transparent font-mono text-slate-700 focus:outline-none px-1 py-0.5"
                              />
                            </td>
                            <td className="px-1 py-1 text-center">
                              <input
                                type="text"
                                value={line.rate}
                                onChange={(e) => handleUpdateDefaultExtraLine(line.id, { rate: e.target.value })}
                                placeholder="-"
                                className="w-full text-center bg-transparent font-mono text-slate-700 focus:outline-none px-1 py-0.5"
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="text"
                                value={line.price}
                                onChange={(e) => handleUpdateDefaultExtraLine(line.id, { price: e.target.value })}
                                className="w-full text-right bg-transparent font-mono font-bold text-slate-900 focus:outline-none px-1 py-0.5"
                              />
                            </td>
                            <td className="px-1 py-1 text-center">
                              <button
                                onClick={() => handleUpdateDefaultExtraLine(line.id, { isDeduction: !line.isDeduction })}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                  line.isDeduction ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {line.isDeduction ? '- Minus' : '+ Add'}
                              </button>
                            </td>
                            <td className="px-1 py-1 text-center">
                              <button
                                onClick={() => handleDeleteDefaultExtraLine(line.id)}
                                className="text-slate-400 hover:text-red-500 cursor-pointer p-1"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Preset Quick Add Buttons */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                    <span className="text-slate-500 font-semibold">Quick Presets:</span>
                    <button
                      onClick={() => handleAddDefaultExtraLine({ label: 'CARTAGE / FREIGHT (भाड़ा)', price: '1,800.00' })}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-semibold cursor-pointer"
                    >
                      + Cartage
                    </button>
                    <button
                      onClick={() => handleAddDefaultExtraLine({ label: 'INSTALLATION / FITTING (फिटिंग)', price: '4,500.00' })}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-semibold cursor-pointer"
                    >
                      + Fitting
                    </button>
                    <button
                      onClick={() => handleAddDefaultExtraLine({ label: 'GST @ 18%', price: '5,400.00' })}
                      className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold cursor-pointer"
                    >
                      + GST 18%
                    </button>
                    <button
                      onClick={() => handleAddDefaultExtraLine({ label: 'SPECIAL DISCOUNT / छूट', price: '2,000.00', isDeduction: true })}
                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded font-bold cursor-pointer"
                    >
                      - Discount
                    </button>
                  </div>
                </div>

                {/* Default Advance & Labels */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Default Advance %:
                    </label>
                    <div className="flex items-center gap-1">
                      {[50, 40, 30].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setDefaults({ ...defaults, defaultAdvancePercent: pct })}
                          className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                            defaults.defaultAdvancePercent === pct
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Total Amount Label:
                    </label>
                    <input
                      type="text"
                      value={defaults.totalAmountLabel}
                      onChange={(e) => setDefaults({ ...defaults, totalAmountLabel: e.target.value })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Advance Amount Label:
                    </label>
                    <input
                      type="text"
                      value={defaults.advanceAmountLabel}
                      onChange={(e) => setDefaults({ ...defaults, advanceAmountLabel: e.target.value })}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-bold text-blue-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT TERMS */}
          {activeTab === 'payment' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Default Payment Terms (डिफॉल्ट भुगतान शर्तें)
                    </h3>
                    <p className="text-xs text-slate-500">
                      नए कोटेशन में नीचे भुगतान शर्तों के रूप में यही पंक्तियाँ दिखेंगी।
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setDefaults((prev) => ({
                        ...prev,
                        paymentTerms: [...prev.paymentTerms, 'New Payment Term Clause'],
                      }))
                    }
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Clause / शर्त जोड़ें</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {defaults.paymentTerms.map((term, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200 group">
                      <span className="font-mono font-bold text-amber-700 mt-1">{i + 1}.</span>
                      <textarea
                        rows={2}
                        value={term}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDefaults((prev) => ({
                            ...prev,
                            paymentTerms: prev.paymentTerms.map((t, idx) => (idx === i ? val : t)),
                          }));
                        }}
                        className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-amber-500 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          setDefaults((prev) => ({
                            ...prev,
                            paymentTerms: prev.paymentTerms.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setDefaults((prev) => ({
                      ...prev,
                      paymentTerms: DEFAULT_MASTER_QUOTATION_CONFIG.paymentTerms,
                    }))
                  }
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer pt-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Factory Standard Payment Terms</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: GUARANTEE & WARRANTY */}
          {activeTab === 'warranty' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Default Guarantee & Warranty Terms (डिफॉल्ट गारंटी व वारंटी)
                    </h3>
                    <p className="text-xs text-slate-500">
                      हर नए कोटेशन में प्रोफाइल, हार्डवेयर व ग्लास की वारंटी शर्तें यहाँ से ऑटोमैटिक लोड होंगी।
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setDefaults((prev) => ({
                        ...prev,
                        guaranteeTerms: [...prev.guaranteeTerms, 'New Warranty Term Clause'],
                      }))
                    }
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Clause / शर्त जोड़ें</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {defaults.guaranteeTerms.map((term, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200 group">
                      <span className="text-emerald-600 font-bold mt-1">✓</span>
                      <textarea
                        rows={2}
                        value={term}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDefaults((prev) => ({
                            ...prev,
                            guaranteeTerms: prev.guaranteeTerms.map((t, idx) => (idx === i ? val : t)),
                          }));
                        }}
                        className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          setDefaults((prev) => ({
                            ...prev,
                            guaranteeTerms: prev.guaranteeTerms.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setDefaults((prev) => ({
                      ...prev,
                      guaranteeTerms: DEFAULT_MASTER_QUOTATION_CONFIG.guaranteeTerms,
                    }))
                  }
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer pt-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Factory Standard Warranty Terms</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: BANK & UPI DETAILS */}
          {activeTab === 'bank' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    Default Bank & UPI Payment Details (बैंक व यूपीआई विवरण)
                  </h3>
                  <p className="text-xs text-slate-500">
                    यह बैंक खाता विवरण हर नए कोटेशन के फुटर में ग्राहक को भुगतान करने हेतु स्वतः प्रदर्शित होगा।
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Bank Name (बैंक का नाम):
                    </label>
                    <input
                      type="text"
                      value={defaults.bankDetails.bankName}
                      onChange={(e) =>
                        setDefaults({
                          ...defaults,
                          bankDetails: { ...defaults.bankDetails, bankName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                      placeholder="e.g. HDFC Bank Ltd."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Beneficiary / Account Holder (खाताधारक का नाम):
                    </label>
                    <input
                      type="text"
                      value={defaults.bankDetails.accountHolder}
                      onChange={(e) =>
                        setDefaults({
                          ...defaults,
                          bankDetails: { ...defaults.bankDetails, accountHolder: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                      placeholder="e.g. REMIX uPVC Fabrication"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Account Number (खाता संख्या):
                    </label>
                    <input
                      type="text"
                      value={defaults.bankDetails.accountNo}
                      onChange={(e) =>
                        setDefaults({
                          ...defaults,
                          bankDetails: { ...defaults.bankDetails, accountNo: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-blue-950 focus:outline-none focus:border-blue-600"
                      placeholder="e.g. 50200012345678"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      IFSC Code (आईएफएससी कोड):
                    </label>
                    <input
                      type="text"
                      value={defaults.bankDetails.ifsc}
                      onChange={(e) =>
                        setDefaults({
                          ...defaults,
                          bankDetails: { ...defaults.bankDetails, ifsc: e.target.value.toUpperCase() },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-blue-950 uppercase focus:outline-none focus:border-blue-600"
                      placeholder="e.g. HDFC0000123"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Branch Location (शाखा):
                    </label>
                    <input
                      type="text"
                      value={defaults.bankDetails.branch}
                      onChange={(e) =>
                        setDefaults({
                          ...defaults,
                          bankDetails: { ...defaults.bankDetails, branch: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-600"
                      placeholder="e.g. Industrial Area Branch, New Delhi"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      UPI ID (यूपीआई आईडी):
                    </label>
                    <input
                      type="text"
                      value={defaults.bankDetails.upiId}
                      onChange={(e) =>
                        setDefaults({
                          ...defaults,
                          bankDetails: { ...defaults.bankDetails, upiId: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-emerald-900 focus:outline-none focus:border-blue-600"
                      placeholder="e.g. remixupvc@okhdfcbank"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: EXCEL COLUMN WIDTHS */}
          {activeTab === 'excel_columns' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/40">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>Excel Export Column Space Allocation (एक्सेल कॉलम साइज सेटिंग)</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      यहाँ से आप तय कर सकते हैं कि एक्सेल (.xlsx) शीट में किस कॉलम को कितनी चौड़ाई (जगह) मिलेगी।
                    </p>
                  </div>

                  <button
                    onClick={() => setExcelWidths({ ...DEFAULT_EXCEL_COLUMN_WIDTHS })}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>डिफ़ॉल्ट साइज</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60 flex-wrap">
                  <span className="text-[11px] font-bold text-emerald-900">क्विक प्रीसेट्स:</span>
                  <button
                    onClick={() => setExcelWidths({ ...DEFAULT_EXCEL_COLUMN_WIDTHS })}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer"
                  >
                    स्टैंडर्ड
                  </button>
                  <button
                    onClick={() =>
                      setExcelWidths({
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
                      })
                    }
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 text-emerald-900 cursor-pointer"
                  >
                    बड़ा CAD चित्र (Big CAD)
                  </button>
                  <button
                    onClick={() =>
                      setExcelWidths({
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
                      })
                    }
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 border border-blue-300 hover:bg-blue-200 text-blue-900 cursor-pointer"
                  >
                    विस्तृत नाम व ग्लास विवरण
                  </button>
                  <button
                    onClick={() =>
                      setExcelWidths({
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
                      })
                    }
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-900 cursor-pointer"
                  >
                    रेट व अमाउंट फोकस
                  </button>
                </div>
              </div>

              {/* Grid of columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXCEL_COLUMNS_META.map((meta) => {
                  const currentW = Number(excelWidths[meta.key]) || meta.defaultWidth;
                  return (
                    <div
                      key={meta.key}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-1.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded">
                            {meta.colLetter}
                          </span>
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {meta.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 font-mono">
                          <input
                            type="number"
                            min={meta.min}
                            max={meta.max}
                            value={currentW}
                            onChange={(e) => {
                              const val = Math.max(
                                meta.min,
                                Math.min(meta.max, parseInt(e.target.value) || meta.min)
                              );
                              setExcelWidths((prev) => ({ ...prev, [meta.key]: val }));
                            }}
                            className="w-12 text-center text-xs font-bold border border-slate-300 rounded px-1 py-0.5"
                          />
                          <span className="text-[10px] text-slate-500 font-sans">units</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const val = Math.max(meta.min, currentW - 2);
                            setExcelWidths((prev) => ({ ...prev, [meta.key]: val }));
                          }}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center border border-slate-300"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min={meta.min}
                          max={meta.max}
                          value={currentW}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setExcelWidths((prev) => ({ ...prev, [meta.key]: val }));
                          }}
                          className="flex-1 accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <button
                          onClick={() => {
                            const val = Math.min(meta.max, currentW + 2);
                            setExcelWidths((prev) => ({ ...prev, [meta.key]: val }));
                          }}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center border border-slate-300"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>{meta.description}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setExcelWidths((prev) => ({ ...prev, [meta.key]: meta.min + 2 }))
                            }
                            className="px-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            कम
                          </button>
                          <button
                            onClick={() =>
                              setExcelWidths((prev) => ({ ...prev, [meta.key]: meta.defaultWidth }))
                            }
                            className="px-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            नॉर्मल
                          </button>
                          <button
                            onClick={() =>
                              setExcelWidths((prev) => ({
                                ...prev,
                                [meta.key]: Math.round(meta.defaultWidth * 1.35),
                              }))
                            }
                            className="px-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            चौड़ा
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('क्या आप सभी सेटिंग्स को मूल फ़ैक्टरी डिफ़ॉल्ट पर रीसेट करना चाहते हैं?')) {
                  setDefaults(DEFAULT_MASTER_QUOTATION_CONFIG);
                }
              }}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSaveMasterDefaults}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-xl shadow-xs transition cursor-pointer text-xs flex items-center gap-1.5"
              title="Save as default for future new quotations"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Save as Default for New Customers</span>
            </button>

            <button
              onClick={handleSaveAndApply}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
              title="Save master default AND apply to current open quotation right now"
            >
              <Sparkles className="w-4 h-4" />
              <span>Save & Apply to Current Quotation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
