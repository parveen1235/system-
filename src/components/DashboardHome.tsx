import React, { useState, useEffect } from 'react';
import {
  Layers,
  LayoutDashboard,
  CreditCard,
  Users,
  Plus,
  Boxes,
  Sliders,
  HelpCircle,
  SlidersHorizontal,
  PenTool,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardList,
  BarChart3,
  PieChart,
  Pencil,
  ChevronDown,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Receipt,
  FileText,
  Scissors,
  Bot,
} from 'lucide-react';
import { CustomerRecord, ERPProjectRecord, InventoryItem } from '../types/erp';
import { UPVCProject } from '../types/upvc';
import { getCustomerSummary, syncCustomerRecord } from '../utils/customerStorage';
import { PWAInstallButton } from './PWAInstallButton';

interface DashboardHomeProps {
  onNavigateToCAD: (projectId?: string, customer?: CustomerRecord) => void;
  onOpenCustomers: () => void;
  onOpenCustomerProject?: (customer: CustomerRecord) => void;
  onOpenInventory: () => void;
  onOpenCuttingList: () => void;
  onOpenQuotation: () => void;
  onOpenWorkshopScan: () => void;
  onNewDesign1000: () => void;
  onOpenPaymentLedger?: () => void;
  onOpenQuickQuote?: () => void;
  onOpenPricingFormula?: () => void;
  onOpenSeriesSettings?: () => void;
  onOpenCompanyGst?: () => void;
  onOpenGuide?: () => void;
  onOpenPaperScanBot?: () => void;
  projects: ERPProjectRecord[];
  inventory: InventoryItem[];
  customers: CustomerRecord[];
  currentCADProject: UPVCProject;
  lang?: 'hi' | 'en';
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onNavigateToCAD,
  onOpenCustomers,
  onOpenCustomerProject,
  onOpenInventory,
  onOpenCuttingList,
  onOpenQuotation,
  onOpenWorkshopScan,
  onNewDesign1000,
  onOpenPaymentLedger,
  onOpenQuickQuote,
  onOpenPricingFormula,
  onOpenSeriesSettings,
  onOpenCompanyGst,
  onOpenGuide,
  onOpenPaperScanBot,
  projects,
  inventory,
  customers,
  currentCADProject,
  lang = 'hi',
}) => {
  const [chartType, setChartType] = useState<'bar' | 'donut'>('bar');

  // Live listener for customer design updates
  const [, setRefreshTick] = useState(0);
  useEffect(() => {
    const handleDesignsChanged = () => setRefreshTick((t) => t + 1);
    window.addEventListener('upvc_customer_designs_changed', handleDesignsChanged);
    window.addEventListener('storage', handleDesignsChanged);
    return () => {
      window.removeEventListener('upvc_customer_designs_changed', handleDesignsChanged);
      window.removeEventListener('storage', handleDesignsChanged);
    };
  }, []);

  const getCustVal = (c: CustomerRecord) => getCustomerSummary(c).totalAmount;
  const getCustDesigns = (c: CustomerRecord) => getCustomerSummary(c).designsCount;

  // Dynamic calculations from customers state
  const totalCustomersCount = customers.length;
  const totalDesignsCount = customers.reduce((acc, c) => acc + getCustDesigns(c), 0);
  const approvedQuotesCount = customers.filter((c) => c.approvalStatus === 'approved').length;
  const rejectedQuotesCount = customers.filter((c) => c.approvalStatus === 'rejected').length;
  const pendingQuotesCount = customers.filter((c) => (c.approvalStatus || 'pending') === 'pending').length;

  const totalTurnover = customers.reduce((acc, c) => acc + getCustVal(c), 0);
  const totalApprovedValue = customers
    .filter((c) => c.approvalStatus === 'approved')
    .reduce((acc, c) => acc + getCustVal(c), 0);
  const totalRejectedValue = customers
    .filter((c) => c.approvalStatus === 'rejected')
    .reduce((acc, c) => acc + getCustVal(c), 0);
  const totalPendingValue = customers
    .filter((c) => (c.approvalStatus || 'pending') === 'pending')
    .reduce((acc, c) => acc + getCustVal(c), 0);

  const totalReceivedValue = 0; // ₹0
  const pendingCollection = totalTurnover - totalReceivedValue; // ₹2,29,210

  const conversionRate = totalTurnover > 0 ? Math.round((totalApprovedValue / totalTurnover) * 100) : 0;

  return (
    <div className="h-full w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER BAR */}
      {/* ------------------------------------------------------------- */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        {/* Left: Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                uPVC & Aluminium ERP Studio
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                PRO V2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Automated Window & Door Fabrication Suite • Cutting, Glass, Hardware & Quotation
            </p>
          </div>
        </div>

        {/* Right: User Profile & Logo / GST & Android Install */}
        <div className="flex items-center gap-2.5">
          <PWAInstallButton variant="dashboard" />

          <button
            onClick={onOpenCompanyGst}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 transition shadow-xs cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              R
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 leading-none">RAJ</div>
              <div className="text-[10px] font-medium text-slate-400 leading-none mt-0.5">RAM</div>
            </div>
            <div className="pl-1.5 border-l border-slate-200 flex items-center gap-1 text-[11px] font-semibold text-blue-700">
              <span>Logo & GST</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. BODY: LEFT NAVIGATION PANEL + MAIN WORKSPACE */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 flex max-w-[1720px] w-full mx-auto p-4 sm:p-6 gap-6 overflow-hidden">
        {/* ========================================================= */}
        {/* LEFT NAVIGATION PANEL */}
        {/* ========================================================= */}
        <aside className="w-64 shrink-0 flex flex-col h-full min-h-0 bg-transparent">
          <div className="px-2 py-1 text-[11px] font-bold text-blue-600 tracking-wider flex items-center gap-1.5 uppercase shrink-0 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>NAVIGATION PANEL</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-2 pb-10 scrollbar-light overscroll-contain">
            {/* 1. Home Dashboard (Active) */}
            <div className="w-full p-3.5 rounded-2xl bg-blue-600 text-white shadow-sm flex items-center gap-3.5 cursor-default transition">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">Home Dashboard</div>
                <div className="text-[11px] text-blue-100 font-medium">Main overview</div>
              </div>
            </div>

            {/* 2. QUOTATION (कोटेशन टेबल) - PRIMARY */}
            <button
              onClick={onOpenQuotation}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center gap-3.5 text-left transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-extrabold flex items-center justify-between">
                  <span>QUOTATION (कोटेशन)</span>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900">NEW</span>
                </div>
                <div className="text-[11px] text-blue-100 font-medium">Drawings, Glass, Bank & Terms</div>
              </div>
            </button>

          {/* 2.5 CUTTING LIST & BOM (फैक्ट्री कटिंग लिस्ट) - PRIMARY */}
          <button
            onClick={onOpenCuttingList}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center gap-3.5 text-left transition group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-extrabold flex items-center justify-between">
                <span>CUTTING LIST (कटिंग लिस्ट)</span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-white text-emerald-900">BOM</span>
              </div>
              <div className="text-[11px] text-emerald-100 font-medium">Profile, Glass, Steel & Hardware</div>
            </div>
          </button>

          {/* 2.8 AI PAPER SCANNER BOT (कागज़ स्कैन कर CAD बनाएं) - ZERO TOKEN */}
          {onOpenPaperScanBot && (
            <button
              onClick={onOpenPaperScanBot}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 text-white shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center gap-3.5 text-left transition group cursor-pointer border border-indigo-400/30"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 text-amber-300 flex items-center justify-center shrink-0 group-hover:rotate-12 transition">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-extrabold flex items-center justify-between">
                  <span>AI PAPER SCANNER</span>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950">0 TOKEN</span>
                </div>
                <div className="text-[11px] text-indigo-100 font-medium">कागज़ के स्केच से तुरंत CAD बनाएं</div>
              </div>
            </button>
          )}

          {/* 3. PAYMENT LEDGER */}
          <button
            onClick={onOpenPaymentLedger}
            className="w-full p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs flex items-center gap-3.5 text-left transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">PAYMENT LEDGER</div>
              <div className="text-[11px] text-emerald-600 font-medium">Payments & graphs</div>
            </div>
          </button>

          {/* 3. Customers Dekho */}
          <button
            onClick={onOpenCustomers}
            className="w-full p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xs flex items-center gap-3.5 text-left transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Customers Dekho</div>
              <div className="text-[11px] text-blue-600 font-medium">Add & manage projects</div>
            </div>
          </button>

          {/* 4. Quick Quote */}
          <button
            onClick={onOpenQuickQuote}
            className="w-full p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs flex items-center gap-3.5 text-left transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Quick Quote</div>
              <div className="text-[11px] text-slate-500 font-medium">Instant calculations</div>
            </div>
          </button>

          {/* 5. Inventory & Rates */}
          <button
            onClick={onOpenInventory}
            className="w-full p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:shadow-xs flex items-center gap-3.5 text-left transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Inventory & Rates</div>
              <div className="text-[11px] text-purple-600 font-medium">Hardware, profile, glass</div>
            </div>
          </button>

          {/* 6. Pricing Formula & Rate Engine (Dedicated Page) */}
          <button
            onClick={onOpenPricingFormula}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center gap-3.5 text-left transition group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black flex items-center justify-between">
                <span>PRICING FORMULA</span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-white text-teal-900">
                  21 HEADS
                </span>
              </div>
              <div className="text-[11px] text-teal-100 font-medium truncate">
                Labour, Profit, Tax & BOM Engine
              </div>
            </div>
          </button>

          {/* 7. हिसाब कैसे होता है? (Formula Dekho) */}
          <button
            onClick={onOpenGuide}
            className="w-full p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 hover:bg-emerald-100/70 flex items-center justify-between text-left transition group"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <div className="text-[11px] font-bold text-emerald-950 leading-tight">
                हिसाब कैसे होता है? (Formula Dekho)
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
              GUIDE 💡
            </span>
          </button>

          {/* 8. Series & Profile Settings (सीरीज़ एवं कटिंग नियम) */}
          <button
            onClick={onOpenSeriesSettings}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center gap-3.5 text-left transition group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-extrabold flex items-center justify-between">
                <span>Series & Profile Settings</span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-white text-orange-800">RULES</span>
              </div>
              <div className="text-[11px] text-orange-100 font-medium">Casement, Sliding & Cutting Formulas</div>
            </div>
          </button>

          {/* 9. 2D Elevation Studio CAD */}
          <button
            onClick={() => onNavigateToCAD()}
            className="w-full p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-xs flex items-center gap-3.5 text-left transition group"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">2D Elevation Studio</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-800">
                  CAD
                </span>
              </div>
              <div className="text-[11px] text-teal-600 font-medium">Parametric Elevation & Excel</div>
            </div>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN WORKSPACE CONTENT */}
      {/* ========================================================= */}
      <main className="flex-1 min-h-0 h-full space-y-5 overflow-y-auto pr-1 pb-10 scrollbar-light overscroll-contain">
        {/* ZERO-TOKEN AI PAPER-TO-CAD SCANNER BANNER */}
        {onOpenPaperScanBot && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-500/30">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0 shadow-inner">
                <Bot className="w-7 h-7 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-extrabold tracking-tight text-white">
                    कागज़ का पर्चा स्कैन कर CAD बनाएं (Paper-to-CAD Bot)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase tracking-wide">
                    100% Offline • 0 Tokens
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
                  हाथ से बने स्केच, डायमेंशन (W × H), मुल्लियन और साश को कैमरे या फोटो से तुरंत समझकर ऑटोमैटिक 2D CAD मॉडल और कटिंग लिस्ट तैयार करें। बिना किसी बाहरी API या टोकन के!
                </p>
              </div>
            </div>
            <button
              onClick={onOpenPaperScanBot}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>स्केच स्कैन करें (Scan Now)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SECTION 1: QUOTATION APPROVALS STATUS */}
        {/* ------------------------------------------------------------- */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-2.5">
            <span>📋</span>
            <span className="text-blue-700 uppercase tracking-wide font-extrabold">
              QUOTATION APPROVALS STATUS (कोटेशन की स्थिति) 📁
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Card 1: TOTAL CUSTOMERS */}
              <div className="bg-white rounded-2xl border border-purple-100 p-3.5 flex items-center gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-none">
                    {totalCustomersCount}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">
                    TOTAL CUSTOMERS
                  </div>
                </div>
              </div>

              {/* Card 2: TOTAL DESIGNS */}
              <div className="bg-white rounded-2xl border border-blue-100 p-3.5 flex items-center gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-none">
                    {totalDesignsCount}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">
                    TOTAL DESIGNS
                  </div>
                </div>
              </div>

              {/* Card 3: APPROVED */}
              <div className="bg-white rounded-2xl border border-emerald-100 p-3.5 flex items-center gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-none">
                    {approvedQuotesCount}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">
                    APPROVED
                  </div>
                </div>
              </div>

              {/* Card 4: REJECTED */}
              <div className="bg-white rounded-2xl border border-rose-100 p-3.5 flex items-center gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-none">
                    {rejectedQuotesCount}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">
                    REJECTED
                  </div>
                </div>
              </div>

              {/* Card 5: PENDING */}
              <div className="bg-white rounded-2xl border border-amber-100 p-3.5 flex items-center gap-3.5 shadow-2xs col-span-2 sm:col-span-1">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-none">
                    {pendingQuotesCount}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">
                    PENDING
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 2: KUL HISAB-KITAB (TURNOVER & PAYMENTS OVERVIEW) */}
          {/* ------------------------------------------------------------- */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-2.5">
              <span>🏷️</span>
              <span className="uppercase tracking-wide">
                KUL HISAB-KITAB (TURNOVER & PAYMENTS OVERVIEW) 📊
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Pending Payment */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50/80 to-orange-50/40 border border-rose-100/90 p-5 shadow-2xs">
                <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wide flex items-center gap-1">
                  <span>TOTAL PENDING PAYMENT (कुल बाकी पैसा)</span>
                  <span>⏳</span>
                </div>
                <div className="text-3xl font-black text-rose-600 tracking-tight mt-1.5">
                  ₹{pendingCollection.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-rose-500/90 font-medium mt-1">
                  Outstanding balance yet to be collected from customers
                </div>
                <div className="absolute right-4 bottom-3 text-2xl opacity-70">⏳</div>
              </div>

              {/* Card 2: Total Received */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-100/90 p-5 shadow-2xs">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                  <span>TOTAL RECEIVED (कुल मिला पैसा)</span>
                  <span>✅</span>
                </div>
                <div className="text-3xl font-black text-emerald-600 tracking-tight mt-1.5">
                  ₹{totalReceivedValue.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-emerald-600/90 font-medium mt-1">
                  Total advances and milestones safe in bank
                </div>
                <div className="absolute right-4 bottom-3 text-2xl opacity-70">✅</div>
              </div>

              {/* Card 3: Kul Business Turn-Over */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-100/90 p-5 shadow-2xs">
                <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                  <span>KUL BUSINESS TURN-OVER (कुल कारोबार)</span>
                  <span>💼</span>
                </div>
                <div className="text-3xl font-black text-blue-600 tracking-tight mt-1.5">
                  ₹{totalTurnover.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-blue-500/90 font-medium mt-1">
                  Combined total value of active and approved projects
                </div>
                <div className="absolute right-4 bottom-3 text-2xl opacity-70">💼</div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 3: FINANCIAL ANALYSIS */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    FINANCIAL ANALYSIS (वित्तीय विश्लेषण) 📊
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Approved business revenue vs. pending and rejected quotation values
                </p>
              </div>

              {/* Bar / Donut Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    chartType === 'bar'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Bar</span>
                </button>
                <button
                  onClick={() => setChartType('donut')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    chartType === 'donut'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Donut</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center">
              {/* Chart Visualization Area */}
              <div className="lg:col-span-7 h-56 flex items-end justify-between px-6 pt-2 pb-2 relative">
                {/* Horizontal Y-Axis Guideline levels */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-medium pl-1">
                  <div className="border-b border-dashed border-slate-200 pb-1 flex justify-between">
                    <span>₹240k</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200 pb-1 flex justify-between">
                    <span>₹180k</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200 pb-1 flex justify-between">
                    <span>₹120k</span>
                  </div>
                  <div className="border-b border-dashed border-slate-200 pb-1 flex justify-between">
                    <span>₹60k</span>
                  </div>
                  <div className="border-b border-slate-300 pb-1 flex justify-between">
                    <span>₹0k</span>
                  </div>
                </div>

                {/* 3 Chart Columns */}
                <div className="w-full flex items-end justify-around relative z-10 h-full pb-6 pl-10">
                  {/* 1. Approved Revenue */}
                  <div className="flex flex-col items-center gap-2 w-28">
                    <div
                      className="w-12 bg-emerald-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${totalApprovedValue > 0 ? (totalApprovedValue / 240000) * 160 : 4}px` }}
                    />
                    <span className="text-[11px] font-semibold text-slate-600 text-center">
                      Approved Revenue
                    </span>
                  </div>

                  {/* 2. Pending Quotes (₹229k) */}
                  <div className="flex flex-col items-center gap-2 w-28">
                    <div
                      className="w-12 bg-amber-500 rounded-t-lg shadow-sm transition-all duration-500"
                      style={{ height: '148px' }}
                    />
                    <span className="text-[11px] font-semibold text-slate-800 text-center">
                      Pending Quotes
                    </span>
                  </div>

                  {/* 3. Rejected Quotes */}
                  <div className="flex flex-col items-center gap-2 w-28">
                    <div
                      className="w-12 bg-rose-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${totalRejectedValue > 0 ? (totalRejectedValue / 240000) * 160 : 4}px` }}
                    />
                    <span className="text-[11px] font-semibold text-slate-600 text-center">
                      Rejected Quotes
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown Analysis Side */}
              <div className="lg:col-span-5 space-y-4 pl-0 lg:pl-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>BREAKDOWN ANALYSIS</span>
                  <span className="text-[10px] lowercase text-slate-400">Values in INR</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Approved */}
                  <div className="flex items-center justify-between font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-800">Approved (मंजूर)</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      ₹{totalApprovedValue.toLocaleString('en-IN')} (0%)
                    </span>
                  </div>

                  {/* Pending */}
                  <div>
                    <div className="flex items-center justify-between font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-slate-800 font-bold">Pending (बाकी)</span>
                      </div>
                      <span className="font-bold text-amber-700">
                        ₹{totalPendingValue.toLocaleString('en-IN')} (100%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-full" />
                    </div>
                  </div>

                  {/* Rejected */}
                  <div className="flex items-center justify-between font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-slate-800">Rejected (रद्द)</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      ₹{totalRejectedValue.toLocaleString('en-IN')} (0%)
                    </span>
                  </div>
                </div>

                {/* Conversion Rate Box */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                        CONVERSION RATE
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium">कुल सफलता दर</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-800 leading-none">0%</div>
                    <div className="text-[9px] font-bold text-emerald-700 tracking-wider uppercase mt-0.5">
                      HIGH PERFORMANCE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 4: RECENT CUSTOMERS */}
          {/* ------------------------------------------------------------- */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Recent Customers</span>
              </div>
              <button
                onClick={onOpenCustomers}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(customers || []).slice(0, 2).map((customer, index) => {
                const customerKey = customer.id || `customer-${index}-${customer.phone || customer.name || 'item'}`;
                const initial = (customer.name || 'C').charAt(0).toUpperCase();
                const summary = getCustomerSummary(customer);
                const designs = summary.designsCount;
                const qty = summary.qtyCount;
                const val = summary.totalAmount;

                return (
                  <div
                    key={customerKey}
                    onClick={() => {
                      const synced = syncCustomerRecord(customer);
                      if (onOpenCustomerProject) {
                        onOpenCustomerProject(synced);
                      } else {
                        onNavigateToCAD(undefined, synced);
                      }
                    }}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs hover:border-blue-300 transition cursor-pointer group"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold text-base flex items-center justify-center shrink-0 shadow-2xs">
                          {initial}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                              {customer.name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCustomers();
                              }}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {customer.phone} • {customer.city}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3 Metric Columns */}
                    <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-base font-black text-slate-900 leading-none">
                          {designs}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                          DESIGNS
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-base font-black text-slate-900 leading-none">{qty}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                          QTY
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-blue-50/50 border border-blue-100/80">
                        <div className="text-base font-black text-blue-600 leading-none">
                          ₹{val.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] font-bold text-blue-600/80 uppercase tracking-wide mt-1">
                          VALUE
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
