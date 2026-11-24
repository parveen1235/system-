import React, { useState } from 'react';
import { UPVCProject, PricingConfig, UPVCFrame } from '../types/upvc';
import { calculateBOM, DEFAULT_COLORS } from '../utils/upvcCalculations';
import { downloadQuotationCsv, downloadCostBreakupCsv } from '../utils/exportUtils';
import { getCompanyGstProfile, CompanyProfile, CompanyGstModal } from './CompanyGstModal';
import { CustomTableQuotation } from './CustomTableQuotation';
import { TypologyCostBreakupReport } from './TypologyCostBreakupReport';
import { CadElevationDrawing } from './CadElevationDrawing';
import {
  FileSpreadsheet,
  Printer,
  Sliders,
  CheckCircle2,
  Building2,
  User,
  Layers,
  Download,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Receipt,
  FileCheck,
  X,
  Sparkles,
  TableProperties,
  RefreshCw,
} from 'lucide-react';
import { downloadQuotationPdf, printQuotationSheet, downloadQuotationPdfViaPython, PythonQuotationPayload } from '../utils/exportUtils';
import {
  downloadQuotationExcelWithCad,
  getSavedExcelColumnWidths,
  downloadImageStyleQuotationExcel,
  getSavedElevationSheetExcelColWidths,
  ElevationSheetColumnWidths,
} from '../utils/excelExportUtils';
import { ExcelColumnSettingsModal } from './ExcelColumnSettingsModal';
import { getGlassDisplayName } from '../utils/glassUtils';

interface QuotationViewProps {
  project: UPVCProject;
  customerDesigns?: any[];
  onUpdatePricing: (pricing: PricingConfig) => void;
  onUpdateProjectInfo?: (clientName: string, refNo: string) => void;
  onClose?: () => void;
  lang?: 'hi' | 'en';
}

// Convert numbers to Indian Rupees in Words (e.g., 52400 -> Fifty Two Thousand Four Hundred Rupees Only)
function numberToWordsINR(amount: number): string {
  if (amount <= 0) return 'Zero Rupees Only';
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(num: number): string {
    if (num === 0) return '';
    if (num < 20) return a[num] + ' ';
    if (num < 100) return b[Math.floor(num / 10)] + ' ' + a[num % 10] + ' ';
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred ' + inWords(num % 100);
    if (num < 100000) return inWords(Math.floor(num / 1000)) + 'Thousand ' + inWords(num % 1000);
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + 'Lakh ' + inWords(num % 100000);
    return inWords(Math.floor(num / 10000000)) + 'Crore ' + inWords(num % 10000000);
  }

  const rounded = Math.round(amount);
  const words = inWords(rounded).replace(/\s+/g, ' ').trim();
  return words + ' Rupees Only';
}

function mmToFeetInches(mm: number): string {
  const totalInches = mm / 25.4;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

// High-Fidelity Technical Drawing Box matching CAD Studio (Double Size)
const WindowDrawingBox: React.FC<{ frame: UPVCFrame }> = ({ frame }) => {
  return (
    <div className="drawing-box flex items-center justify-center p-2 bg-white border border-slate-200 rounded">
      <CadElevationDrawing
        frame={frame}
        width="100%"
        height="100%"
        showDimensions={true}
        showLabels={true}
        showHandles={true}
        showArrows={true}
        allowEnlarge={true}
      />
    </div>
  );
};

export const QuotationView: React.FC<QuotationViewProps> = ({
  project,
  customerDesigns,
  onUpdatePricing,
  onUpdateProjectInfo,
  onClose,
  lang = 'hi',
}) => {
  const [activeTab, setActiveTab] = useState<'custom_table' | 'proposal' | 'bom_breakdown' | 'typology_cost'>('custom_table');
  const [showRateEditor, setShowRateEditor] = useState<boolean>(false);
  const [showCompanyModal, setShowCompanyModal] = useState<boolean>(false);

  // Company Profile from localStorage
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(getCompanyGstProfile);

  // Client Details (with realistic defaults)
  const [clientName, setClientName] = useState<string>(project.clientName || 'Mr. Rajesh Sharma');
  const [refNo, setRefNo] = useState<string>(project.referenceNo || 'QTE-2026-089');
  const [siteAddress, setSiteAddress] = useState<string>(
    'Villa No. 42, Palm Meadows Enclave, Sector 54, Golf Course Road, Gurugram, HR'
  );
  const [clientPhone, setClientPhone] = useState<string>('+91 98111 22334');
  const [clientEmail, setClientEmail] = useState<string>('rajesh.sharma@example.com');
  const [projectName, setProjectName] = useState<string>('Sharma Villa Residence');
  const [architectRef, setArchitectRef] = useState<string>('Studio Linear Arch (Ar. Mehta)');
  const [validDays] = useState<number>(15);

  const quoteDate = project.date || '02 Sep 2026';

  // Bill of Materials Calculation
  const { items, subtotal, taxAmount, grandTotal, totalAreaSqM, totalAreaSqFt } = calculateBOM(
    project.frames,
    project.couplings,
    project.pricingConfig
  );

  const pricePerSqFt = totalAreaSqFt > 0 ? Math.round(grandTotal / totalAreaSqFt) : 580;

  // Window & Door counts
  const doorCount = project.frames.filter((f) => f.height >= 1800).length;
  const windowCount = project.frames.length - doorCount;
  const totalUnitsText = `${windowCount} Window${windowCount !== 1 ? 's' : ''}${
    doorCount > 0 ? ` / ${doorCount} Door${doorCount !== 1 ? 's' : ''}` : ''
  }`;

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isGeneratingPythonPdf, setIsGeneratingPythonPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [showExcelColModal, setShowExcelColModal] = useState(false);
  const [quotationToast, setQuotationToast] = useState<string | null>(null);

  const handleDownloadPythonPdf = async () => {
    setIsGeneratingPythonPdf(true);
    try {
      const liveFrames = project.frames || [];
      const rows = liveFrames.map((f, idx) => {
        const areaSqFt = ((f.width * f.height) / (304.8 * 304.8)).toFixed(2);
        const rate = '570';
        const amt = Math.round(parseFloat(areaSqFt) * 570);
        return {
          srNo: idx + 1,
          drawingName: f.name || `Frame ${idx + 1} (${f.type || 'Window'})`,
          glassName: f.glassType || '5mm Clear Toughened',
          qty: 1,
          dimensions: `${Math.round(f.width)} × ${Math.round(f.height)} mm`,
          customValues: {
            area: areaSqFt,
            rate: rate,
            amount: amt.toLocaleString('en-IN'),
          },
        };
      });

      const payload: PythonQuotationPayload = {
        company: {
          name: companyProfile.companyName || 'REMIX uPVC WINDOWS & DOORS',
          companyName: companyProfile.companyName || 'REMIX uPVC WINDOWS & DOORS',
          tagline: companyProfile.tagline || 'Fabrication, Thermal & Acoustic Glazing Solutions',
          address: companyProfile.address,
          phone: companyProfile.phone,
          email: companyProfile.email,
          gstin: companyProfile.gstin,
          logoUrl: companyProfile.logoUrl,
        },
        client: {
          name: clientName || 'Valued Client',
          refNo: refNo || 'QT-2026-001',
          date: new Date().toLocaleDateString('en-GB'),
          address: project.siteAddress || '',
          phone: project.clientPhone || '',
          email: project.clientEmail || '',
          showBilling: true,
          showAddress: true,
        },
        columns: [
          { id: 'area', name: 'Area (Sq.Ft)' },
          { id: 'rate', name: 'Rate (Rs./Sq.Ft)' },
          { id: 'amount', name: 'Total Amount (Rs.)' },
        ],
        rows: rows,
        summary: {
          baseItemLabel: 'uPVC Windows & Doors',
          totalArea: totalAreaSqFt.toFixed(2),
          rate: '570',
          basePrice: grandTotal.toLocaleString('en-IN'),
          totalAmount: grandTotal.toLocaleString('en-IN'),
          charges: [],
        },
        bank: {
          bankName: companyProfile.bankName,
          accountName: companyProfile.accountName,
          accountNo: companyProfile.accountNo,
          ifsc: companyProfile.ifsc,
          branch: companyProfile.branch,
          upiId: companyProfile.upiId,
        },
      };

      const fileName = `Quotation_${(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_Python_Vector.pdf`;
      const targetId =
        activeTab === 'proposal'
          ? 'proposal-printable-sheet'
          : activeTab === 'bom_breakdown'
          ? 'bom-printable-sheet'
          : 'custom-quotation-printable-sheet';

      const success = await downloadQuotationPdfViaPython(payload, fileName, targetId);
      if (success) {
        setQuotationToast('Python Vector PDF सफलतापूर्वक डाउनलोड हो गया! (100% Vector PDF Downloaded)');
        setTimeout(() => setQuotationToast(null), 5000);
      } else {
        setQuotationToast('PDF डाउनलोड नहीं हो सका, कृपया Print बटन का उपयोग करें।');
        setTimeout(() => setQuotationToast(null), 4000);
      }
    } catch (err) {
      console.error('Python PDF generation error:', err);
      handleDownloadPdf();
    } finally {
      setIsGeneratingPythonPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const options = {
        project,
        columnWidths: getSavedExcelColumnWidths(),
        companyProfile: {
          name: companyProfile.name || companyProfile.companyName,
          companyName: companyProfile.name || companyProfile.companyName,
          tagline: companyProfile.tagline,
          address: companyProfile.address,
          phone: companyProfile.phone,
          email: companyProfile.email,
          gstin: companyProfile.gstin,
          logoUrl: companyProfile.logoUrl,
          bankName: companyProfile.bankName,
          accountName: companyProfile.accountName,
          accountNo: companyProfile.accountNo,
          ifsc: companyProfile.ifsc,
          branch: companyProfile.branch,
          upiId: companyProfile.upiId,
        },
        clientName: clientName || 'Valued Client',
        refNo: refNo || 'QT-2026-001',
        quoteDate: new Date().toLocaleDateString('en-GB'),
        summary: {
          baseItemLabel: 'uPVC Windows & Doors',
          totalArea: totalAreaSqFt.toFixed(2),
          rate: '570',
          basePrice: grandTotal.toLocaleString('en-IN'),
          totalAmount: grandTotal.toLocaleString('en-IN'),
          charges: [],
        },
        filename: `Quotation_${(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_CAD_Drawings.xlsx`,
      };

      const success = await downloadQuotationExcelWithCad(options);
      if (success) {
        setQuotationToast('Excel Sheet (.xlsx) CAD ड्रॉइंग सहित डाउनलोड हो गई!');
        setTimeout(() => setQuotationToast(null), 5000);
      } else {
        setQuotationToast('Excel डाउनलोड नहीं हो सका, पुनः प्रयास करें।');
        setTimeout(() => setQuotationToast(null), 4000);
      }
    } catch (err) {
      console.error('Excel generation error:', err);
      setQuotationToast('Excel generation error');
      setTimeout(() => setQuotationToast(null), 4000);
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const [isGeneratingElevationExcel, setIsGeneratingElevationExcel] = useState(false);

  const handleDownloadElevationSheetExcel = async (overrideWidths?: ElevationSheetColumnWidths) => {
    setIsGeneratingElevationExcel(true);
    try {
      const success = await downloadImageStyleQuotationExcel({
        companyName: companyProfile.name || companyProfile.companyName || 'UPVC WINDOWS & DOORS',
        addressLine1: companyProfile.address || '',
        phone: companyProfile.phone || '',
        quoteNo: refNo || 'QT-2026-001',
        quoteDate: new Date().toLocaleDateString('en-GB'),
        customerName: clientName || 'Client',
        items: (project.frames || []).map((f, idx) => ({
          sNo: idx + 1,
          designName: f.name || `Window W${idx + 1}`,
          glass: f.pockets && f.pockets[0]?.glassType ? getGlassDisplayName(f.pockets[0].glassType) : '6mm Clear Toughened',
          width: f.width,
          height: f.height,
          sqFt: Number(((f.width * f.height) / 92903.04).toFixed(1)),
          frame: f,
        })),
        financialSummary: {
          itemTitle: 'upvc Windows & Door',
          totalSqFt: Number(totalAreaSqFt.toFixed(1)),
          ratePerSqFt: 550,
          price: grandTotal,
          cartageAmount: 1500,
          totalAmount: grandTotal + 1500,
        },
        filename: `Quotation_${(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_Elevation_Sheet.xlsx`,
        columnWidths: overrideWidths || getSavedElevationSheetExcelColWidths(),
      });
      if (success) {
        setQuotationToast('इमेज जैसा कोटेशन एक्सेल (Elevation Sheet Excel) डाउनलोड हो गया!');
        setTimeout(() => setQuotationToast(null), 4000);
      }
    } catch (err) {
      console.error('Error generating elevation sheet excel:', err);
    } finally {
      setIsGeneratingElevationExcel(false);
    }
  };

  const handlePrint = async () => {
    const targetId =
      activeTab === 'proposal'
        ? 'proposal-printable-sheet'
        : activeTab === 'bom_breakdown'
        ? 'bom-printable-sheet'
        : activeTab === 'typology_cost'
        ? 'typology-cost-printable-sheet'
        : 'custom-quotation-printable-sheet';
    const fileName = `Quotation_${(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_${refNo || 'QT'}.pdf`;
    setQuotationToast('प्रिंट आदेश भेजा गया... (A4 Print / PDF Ready)');
    await printQuotationSheet(targetId, fileName);
    setTimeout(() => setQuotationToast(null), 4000);
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const fileName = `Quotation_${(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_${refNo || 'QT'}.pdf`;
      const targetId =
        activeTab === 'proposal'
          ? 'proposal-printable-sheet'
          : activeTab === 'bom_breakdown'
          ? 'bom-printable-sheet'
          : activeTab === 'typology_cost'
          ? 'typology-cost-printable-sheet'
          : 'custom-quotation-printable-sheet';
      const success = await downloadQuotationPdf(targetId, fileName);
      if (success) {
        setQuotationToast('कोटेशन PDF सफलतापूर्वक डाउनलोड हो गया! (PDF Downloaded)');
        setTimeout(() => setQuotationToast(null), 4000);
      } else {
        setQuotationToast('PDF डाउनलोड नहीं हो सका, कृपया Print बटन का उपयोग करें।');
        setTimeout(() => setQuotationToast(null), 4000);
      }
    } catch (err) {
      console.error('Download PDF error:', err);
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSaveInfo = () => {
    if (onUpdateProjectInfo) {
      onUpdateProjectInfo(clientName, refNo);
    }
  };

  const handleCompanyProfileUpdated = (updated: CompanyProfile) => {
    setCompanyProfile(updated);
  };

  // WhatsApp share link formatted
  const whatsappText = encodeURIComponent(
    `*${companyProfile.companyName} - Official Quotation*\n` +
      `Quote No: ${refNo} | Date: ${quoteDate}\n` +
      `Customer: ${clientName}\n` +
      `Project: ${projectName}\n` +
      `Total Units: ${totalUnitsText}\n` +
      `Total Glass Area: ${totalAreaSqFt} Sq.Ft\n` +
      `Avg. Rate: ₹${pricePerSqFt} / Sq.Ft\n` +
      `*Net Estimate: ₹${grandTotal.toLocaleString()}*\n\n` +
      `Contact: ${companyProfile.phone} | ${companyProfile.email}`
  );

  return (
    <div className="w-full h-full bg-[#f1f5f9] flex flex-col overflow-hidden text-[#0f172a] font-sans antialiased">
      {/* Embedded Design System Styles from User Template */}
      <style>{`
        :root {
          --bg-body: #f1f5f9;
          --bg-paper: #ffffff;
          --text-main: #0f172a;
          --text-muted: #475569;
          --text-subtle: #94a3b8;
          --border-color: #e2e8f0;
          --border-dark: #cbd5e1;

          --primary-blue: #1e40af;
          --primary-blue-light: #eff6ff;
          --primary-blue-border: #bfdbfe;

          --accent-emerald: #059669;
          --accent-emerald-light: #ecfdf5;
          --accent-emerald-border: #a7f3d0;

          --accent-amber: #d97706;
          --accent-amber-light: #fffbeb;

          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-xl: 20px;

          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 10px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
          --shadow-lg: 0 12px 24px -4px rgba(0, 0, 0, 0.08);
        }

        .font-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }

        .top-toolbar {
          max-width: 1020px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          width: 100%;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--accent-emerald-light);
          color: var(--accent-emerald);
          border: 1px solid var(--accent-emerald-border);
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .status-badge::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-emerald);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 700;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          outline: none;
          white-space: nowrap;
          text-decoration: none;
        }

        .btn-outline {
          background: #ffffff;
          border-color: var(--border-color);
          color: #334155;
          box-shadow: var(--shadow-sm);
        }
        .btn-outline:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .btn-primary {
          background: var(--primary-blue);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(30, 64, 175, 0.25);
        }
        .btn-primary:hover {
          background: #1d4ed8;
        }

        .btn-whatsapp {
          background: #25D366;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.25);
        }
        .btn-whatsapp:hover {
          background: #20ba5a;
        }

        .report-sheet {
          max-width: 1020px;
          width: 100%;
          margin: 0 auto;
          background: var(--bg-paper);
          border-radius: var(--radius-xl);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-lg);
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .company-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid var(--primary-blue);
          padding-bottom: 24px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .brand-box {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .company-logo {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--primary-blue), #3b82f6);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 900;
          font-size: 22px;
          box-shadow: var(--shadow-md);
        }

        .company-meta h1 {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .company-meta p {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .company-tax-info {
          font-size: 11px;
          color: #334155;
          font-weight: 700;
          margin-top: 4px;
        }

        .quotation-serial-box {
          text-align: right;
          background: var(--primary-blue-light);
          border: 1px solid var(--primary-blue-border);
          border-radius: var(--radius-lg);
          padding: 12px 18px;
        }
        .quotation-serial-box .quote-tag {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--primary-blue);
        }
        .quotation-serial-box .quote-num {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
        }
        .quotation-serial-box .quote-date {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .party-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          background: #f8fafc;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 20px;
        }

        @media (max-width: 640px) {
          .party-info-grid {
            grid-template-columns: 1fr;
          }
        }

        .info-block h3 {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-subtle);
          margin-bottom: 6px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .info-block .client-name {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .info-block .client-address {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
          line-height: 1.4;
        }
        .info-block .contact-details {
          font-size: 11px;
          font-weight: 600;
          color: #334155;
          margin-top: 6px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .metrics-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        @media (max-width: 768px) {
          .metrics-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .metric-tile {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          box-shadow: var(--shadow-sm);
        }
        .metric-tile span:first-child {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-subtle);
          display: block;
        }
        .metric-tile span:last-child {
          font-size: 18px;
          font-weight: 900;
          color: var(--primary-blue);
          display: block;
          margin-top: 2px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .elevation-cards-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .window-item-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          background: #ffffff;
          display: grid;
          grid-template-columns: 320px 1fr 180px;
          gap: 16px;
          padding: 16px;
          align-items: center;
          box-shadow: var(--shadow-sm);
          page-break-inside: avoid;
        }

        @media (max-width: 900px) {
          .window-item-card {
            grid-template-columns: 1fr;
          }
        }

        .drawing-box {
          width: 100%;
          height: 250px;
          background: #f8fafc;
          border: 1px dashed var(--border-dark);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 8px;
        }

        .drawing-svg-frame {
          width: 100%;
          height: 100%;
        }

        .drawing-dim-label {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 9px;
          font-weight: 800;
          color: #1e40af;
          background: #ffffff;
          padding: 1px 4px;
          border-radius: 3px;
          border: 1px solid #bfdbfe;
        }

        .window-spec-col h4 {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .window-spec-col p.location {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          margin-top: 1px;
        }

        .spec-badges-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .spec-chip {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          background: #f1f5f9;
          color: #334155;
          border: 1px solid var(--border-color);
        }
        .spec-chip.chip-blue {
          background: var(--primary-blue-light);
          color: var(--primary-blue);
          border-color: var(--primary-blue-border);
        }
        .spec-chip.chip-emerald {
          background: var(--accent-emerald-light);
          color: var(--accent-emerald);
          border-color: var(--accent-emerald-border);
        }

        .window-price-col {
          text-align: right;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-left: 1px solid var(--border-color);
          padding-left: 16px;
          height: 100%;
        }
        .price-rate-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-subtle);
        }
        .price-rate-value {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .price-total-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .price-total-value {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
        }

        .calculation-section {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .calculation-section {
            grid-template-columns: 1fr;
          }
        }

        .inclusions-box {
          background: #f8fafc;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 16px;
        }
        .inclusions-box h4 {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .inclusions-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11px;
          color: #334155;
        }
        .inclusions-list li {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .inclusions-list li::before {
          content: '✓';
          color: var(--accent-emerald);
          font-weight: 900;
        }

        .grand-total-box {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 18px;
          box-shadow: var(--shadow-sm);
        }
        .cost-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 12px;
          color: var(--text-muted);
          border-bottom: 1px dashed var(--border-color);
        }
        .cost-row.cost-grand-total {
          border-bottom: none;
          border-top: 2px solid #0f172a;
          margin-top: 8px;
          padding-top: 10px;
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }
        .cost-grand-total .total-amount {
          font-size: 20px;
          color: var(--primary-blue);
        }

        .terms-payment-grid {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 20px;
          border-top: 1px solid var(--border-color);
          padding-top: 20px;
        }

        @media (max-width: 768px) {
          .terms-payment-grid {
            grid-template-columns: 1fr;
          }
        }

        .terms-box h4 {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .terms-ordered-list {
          padding-left: 16px;
          font-size: 11px;
          color: #475569;
          line-height: 1.6;
        }

        .bank-qr-card {
          background: #f8fafc;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
        }
        .qr-placeholder {
          width: 100px;
          height: 100px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
        }
        .qr-placeholder svg {
          width: 100%;
          height: 100%;
        }
        .bank-details {
          font-size: 10px;
          color: #475569;
          line-height: 1.4;
        }

        .signature-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 40px;
          margin-top: 20px;
          border-top: 1px solid var(--border-color);
        }
        .sig-block {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
        }
        .sig-line {
          width: 180px;
          border-top: 1px solid #94a3b8;
          margin-bottom: 6px;
        }

        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
          }
          .top-toolbar, .no-print {
            display: none !important;
          }
          .report-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .window-item-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* ------------------------------------------------------------- */}
      {/* Top Controls Toolbar */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 no-print shadow-xs">
        <div className="top-toolbar">
          <div className="toolbar-left">
            <div className="status-badge">Approved Quotation</div>
            <span className="font-mono font-bold text-xs" style={{ color: 'var(--text-muted)' }}>
              # {refNo}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Tab switchers */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-bold mr-1">
              <button
                onClick={() => setActiveTab('custom_table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeTab === 'custom_table'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>Itemized Table (टेबल कोटेशन)</span>
              </button>
              <button
                onClick={() => setActiveTab('proposal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeTab === 'proposal'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Visual Proposal</span>
              </button>
              <button
                onClick={() => setActiveTab('bom_breakdown')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeTab === 'bom_breakdown'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Material BOM & Cost</span>
              </button>
              <button
                onClick={() => setActiveTab('typology_cost')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeTab === 'typology_cost'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Typology Cost Breakup (लागत ब्रेकअप)</span>
              </button>
            </div>

            {/* Edit company details */}
            <button
              onClick={() => setShowCompanyModal(true)}
              className="btn btn-outline"
              title="Company Name, GSTIN, Bank details"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Company & Bank</span>
            </button>

            {/* Rate Editor */}
            <button
              onClick={() => setShowRateEditor(!showRateEditor)}
              className="btn btn-outline"
              title="Edit master unit rates"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Rates</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={() => downloadQuotationCsv(project)}
              className="btn btn-outline"
              title="Download CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Cost Breakup Report CSV Export */}
            <button
              onClick={() => downloadCostBreakupCsv(project)}
              className="btn btn-outline flex items-center gap-1.5"
              title="Download Cost Breakup Report CSV (लागत ब्रेकअप रिपोर्ट CSV)"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Cost Breakup</span>
            </button>

            {/* WhatsApp Share Button */}
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
              Share on WhatsApp
            </a>

            {/* 📗 CAD Drawing Excel Sheet (.xlsx) with embedded CAD elevation drawings */}
            <button
              onClick={handleDownloadExcel}
              disabled={isGeneratingExcel}
              className={`btn flex items-center gap-1.5 font-bold transition cursor-pointer ${
                isGeneratingExcel
                  ? 'bg-teal-800 text-white opacity-80 cursor-wait'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95 ring-2 ring-emerald-500/40'
              }`}
              title="Download CAD Elevation Drawings in Excel (.xlsx) with embedded drawings, cutting list & BOM"
            >
              {isGeneratingExcel ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              )}
              <span>{isGeneratingExcel ? 'Creating Excel...' : 'CAD Drawing Excel'}</span>
            </button>

            {/* 🖼️ Image-Style Elevation Sheet Excel (जैसा इमेज में है - Shri Balaji Format) */}
            <button
              onClick={() => handleDownloadElevationSheetExcel()}
              disabled={isGeneratingElevationExcel}
              className={`btn flex items-center gap-1.5 font-black transition cursor-pointer ${
                isGeneratingElevationExcel
                  ? 'bg-amber-800 text-white opacity-80 cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-95 ring-2 ring-amber-300'
              }`}
              title="Download Image-Style Quotation Sheet in Excel (जैसा इमेज में है - Shri Balaji Format with CAD drawings, financial summary & terms)"
            >
              {isGeneratingElevationExcel ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950" />
              )}
              <span>{isGeneratingElevationExcel ? 'Creating...' : 'इमेज जैसा एक्सेल'}</span>
            </button>

            {/* 📊 Excel Column Width Settings Button (तय करें किस कॉलम को कितनी जगह मिलेगी) */}
            <button
              onClick={() => setShowExcelColModal(true)}
              className="btn btn-outline flex items-center gap-1.5 font-bold text-emerald-900 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer active:scale-95"
              title="Set column widths & space for Excel (.xlsx) sheet (तय करें किस कॉलम को कितनी जगह मिलेगी)"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">कॉलम जगह/साइज (Column Space)</span>
              <span className="sm:hidden">कॉलम साइज</span>
            </button>

            {/* 🐍 Python ReportLab Vector PDF (100% Real Vector Text) */}
            <button
              onClick={handleDownloadPythonPdf}
              disabled={isGeneratingPythonPdf}
              className={`btn flex items-center gap-1.5 font-bold transition cursor-pointer ${
                isGeneratingPythonPdf
                  ? 'bg-emerald-800 text-white opacity-80 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 ring-2 ring-emerald-400/40'
              }`}
              title="Download Python Vector PDF with 100% selectable vector text & crisp CAD elevations"
            >
              {isGeneratingPythonPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              )}
              <span>{isGeneratingPythonPdf ? 'Generating Vector PDF...' : 'Python Vector PDF'}</span>
            </button>

            {/* Direct High-Resolution PDF Download */}
            <button
              className={`btn flex items-center gap-1.5 font-bold transition cursor-pointer ${
                isDownloadingPdf
                  ? 'bg-rose-700 text-white opacity-80 cursor-wait'
                  : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
              }`}
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              title="Download official quotation as PDF / कोटेशन PDF डाउनलोड करें"
            >
              {isDownloadingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              className="btn btn-outline flex items-center gap-1.5 font-bold cursor-pointer hover:bg-slate-50 active:scale-95"
              onClick={handlePrint}
              title="Print official quotation / कोटेशन प्रिंट करें"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Rate Editor */}
        {showRateEditor && (
          <div className="max-w-[1020px] mx-auto mt-3 pt-3 border-t border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Master Unit Rates (₹)</span>
              </h4>
              <button
                onClick={() => setShowRateEditor(false)}
                className="text-[11px] text-slate-500 hover:text-slate-800"
              >
                Close ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 text-[11px] font-semibold">Frame (₹/m):</label>
                <input
                  type="number"
                  value={project.pricingConfig.profileRatePerMeter}
                  onChange={(e) =>
                    onUpdatePricing({
                      ...project.pricingConfig,
                      profileRatePerMeter: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-slate-900 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 text-[11px] font-semibold">Mullion (₹/m):</label>
                <input
                  type="number"
                  value={project.pricingConfig.mullionRatePerMeter}
                  onChange={(e) =>
                    onUpdatePricing({
                      ...project.pricingConfig,
                      mullionRatePerMeter: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-slate-900 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 text-[11px] font-semibold">Sash (₹/m):</label>
                <input
                  type="number"
                  value={project.pricingConfig.sashRatePerMeter}
                  onChange={(e) =>
                    onUpdatePricing({
                      ...project.pricingConfig,
                      sashRatePerMeter: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-slate-900 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 text-[11px] font-semibold">GI Steel (₹/m):</label>
                <input
                  type="number"
                  value={project.pricingConfig.reinforcementRatePerMeter}
                  onChange={(e) =>
                    onUpdatePricing({
                      ...project.pricingConfig,
                      reinforcementRatePerMeter: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-slate-900 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 text-[11px] font-semibold">Labor (₹/sq.m):</label>
                <input
                  type="number"
                  value={project.pricingConfig.laborCostPerSqM}
                  onChange={(e) =>
                    onUpdatePricing({
                      ...project.pricingConfig,
                      laborCostPerSqM: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-slate-900 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 text-[11px] font-semibold">GST Tax (%):</label>
                <input
                  type="number"
                  value={project.pricingConfig.taxPercent}
                  onChange={(e) =>
                    onUpdatePricing({
                      ...project.pricingConfig,
                      taxPercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-slate-900 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SCROLLABLE CONTENT AREA */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center">
        {activeTab === 'custom_table' ? (
          <CustomTableQuotation
            project={project}
            customerDesigns={customerDesigns}
            companyProfile={companyProfile}
            onUpdateCompanyProfile={handleCompanyProfileUpdated}
            lang={lang}
          />
        ) : activeTab === 'proposal' ? (
          /* =========================================================
             CLIENT REPORT PAPER SHEET (PRINTABLE CONTAINER)
             ========================================================= */
          <main className="report-sheet" id="proposal-printable-sheet">
            {/* 1. COMPANY HEADER & SERIAL */}
            <header className="company-header">
              <div className="brand-box">
                <div className="company-logo">uP</div>
                <div className="company-meta">
                  <h1>{companyProfile.companyName}</h1>
                  <p>{companyProfile.tagline || 'Fabrication, Thermal & Acoustic Glazing Solutions'}</p>
                  <div className="company-tax-info font-mono">
                    GSTIN: {companyProfile.gstin} | {companyProfile.phone} | {companyProfile.email}
                  </div>
                </div>
              </div>

              <div className="quotation-serial-box">
                <div className="quote-tag">Official Quotation</div>
                <div className="quote-num font-mono">{refNo}</div>
                <div className="quote-date">Date: {quoteDate} (Valid 15 Days)</div>
              </div>
            </header>

            {/* 2. CLIENT & SITE INFO */}
            <section className="party-info-grid">
              <div className="info-block">
                <h3>Customer / Billing Details</h3>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  onBlur={handleSaveInfo}
                  className="client-name w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none"
                  placeholder="Customer Full Name"
                />
                <textarea
                  rows={2}
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="client-address w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none resize-none"
                  placeholder="Address, Sector, City"
                />
                <div className="contact-details">
                  <span className="flex items-center gap-1">
                    📞{' '}
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none text-[11px]"
                      placeholder="+91..."
                    />
                  </span>
                  <span className="flex items-center gap-1">
                    ✉️{' '}
                    <input
                      type="text"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none text-[11px]"
                      placeholder="email@..."
                    />
                  </span>
                </div>
              </div>

              <div className="info-block">
                <h3>Project / Site Details</h3>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="client-name w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none"
                  placeholder="Project / Residence Name"
                />
                <div className="client-address">
                  Architect / In-charge:{' '}
                  <input
                    type="text"
                    value={architectRef}
                    onChange={(e) => setArchitectRef(e.target.value)}
                    className="font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none"
                    placeholder="Architect Name / In-charge"
                  />
                  <br />
                  Profile Brand: <b>Duron 60mm & 2.5-Track Sliding</b>
                  <br />
                  Color / Finish: <b>German White (UV Stabilized)</b>
                </div>
              </div>
            </section>

            {/* 3. PROJECT METRICS SUMMARY */}
            <section className="metrics-row">
              <div className="metric-tile">
                <span>Total Units</span>
                <span className="font-mono">{totalUnitsText}</span>
              </div>
              <div className="metric-tile">
                <span>Total Glass Area</span>
                <span className="font-mono">{totalAreaSqFt} Sq.Ft</span>
              </div>
              <div className="metric-tile">
                <span>Avg. Rate</span>
                <span className="font-mono">₹{pricePerSqFt} / Sq.Ft</span>
              </div>
              <div className="metric-tile">
                <span>Net Estimate</span>
                <span className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                  ₹{grandTotal.toLocaleString()}
                </span>
              </div>
            </section>

            {/* 4. DETAILED WINDOW ELEVATION SCHEDULE */}
            <section>
              <div className="section-title">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                Item Elevation Schedule & Specifications
              </div>

              <div className="elevation-cards-container">
                {project.frames.map((frame, idx) => {
                  const fWidth = Math.round(frame.width);
                  const fHeight = Math.round(frame.height);
                  const areaSqM = (fWidth * fHeight) / 1000000;
                  const areaSqFt = Math.round(areaSqM * 10.7639 * 100) / 100;

                  const isDoor = fHeight >= 1800;
                  const isSlider = frame.pockets.some(
                    (p) => p.sashType?.startsWith('slider') || p.sashType?.startsWith('mesh_slider')
                  );
                  const isFrench = frame.pockets.some((p) => p.sashType === 'french_open');
                  const isCasement = frame.pockets.some((p) => p.sashType?.startsWith('casement'));
                  const isFixedOnly = frame.pockets.every((p) => p.sashType === 'fixed');

                  let itemTitle = 'Living Room Sliding Window';
                  let itemTag = '3-Track (2 Glass + 1 SS Mesh)';
                  let hardwareTag = 'Touch Lock & Nylon Rollers';

                  if (isDoor) {
                    itemTitle = 'Balcony Single Leaf Door';
                    itemTag = 'Heavy Door Sash 104mm';
                    hardwareTag = 'Key Cylinder Lock & Pop-up Handle';
                  } else if (isFrench) {
                    itemTitle = 'French Casement Window (2 Sashes)';
                    itemTag = 'Twin Casement 60mm';
                    hardwareTag = 'Multi-point Espag & Shootbolts';
                  } else if (isCasement) {
                    itemTitle = 'Master Bed Casement + Top Vent';
                    itemTag = 'Casement 60mm Series';
                    hardwareTag = 'Multi-point Espag Lock';
                  } else if (isFixedOnly) {
                    itemTitle = 'Architectural Picture Window';
                    itemTag = 'Fixed Frame 60mm';
                    hardwareTag = 'Glazing Beads & Gaskets';
                  }

                  const markName = frame.name || `W-0${idx + 1}`;
                  const frameShare = totalAreaSqFt > 0 ? areaSqFt / totalAreaSqFt : 1;
                  const lineItemTotal = Math.round(grandTotal * frameShare);
                  const lineItemRate = areaSqFt > 0 ? Math.round(lineItemTotal / areaSqFt) : pricePerSqFt;

                  const glassTypeDesc = getGlassDisplayName(
                    frame.pockets[0]?.glassType,
                    frame.pockets[0]?.glassName || frame.glassName
                  ).toUpperCase();

                  return (
                    <div key={frame.id} className="window-item-card">
                      {/* 2D Vector Drawing */}
                      <WindowDrawingBox frame={frame} />

                      {/* Specs */}
                      <div className="window-spec-col">
                        <h4>
                          #{idx + 1}. {markName}: {itemTitle}{' '}
                          <span className="spec-chip chip-blue font-mono">Qty: 1</span>
                        </h4>
                        <p className="location font-mono">
                          Size: {fWidth} × {fHeight} mm ({mmToFeetInches(fWidth)} × {mmToFeetInches(fHeight)}) | Area:{' '}
                          {areaSqFt} Sq.Ft each
                        </p>
                        <div className="spec-badges-list">
                          <span className="spec-chip">{itemTag}</span>
                          <span className="spec-chip chip-blue">{glassTypeDesc} Toughened Glass</span>
                          <span className="spec-chip">
                            {frame.series?.toUpperCase() || 'DURON'} Series
                          </span>
                          <span className="spec-chip chip-emerald">{hardwareTag}</span>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="window-price-col">
                        <span className="price-rate-label">Unit Rate</span>
                        <span className="price-rate-value font-mono">₹{lineItemRate} / Sq.Ft</span>
                        <span className="price-total-label">Total Amount</span>
                        <span className="price-total-value font-mono">₹{lineItemTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 5. FINANCIAL CALCULATION & INCLUSIONS */}
            <section className="calculation-section">
              {/* Inclusions */}
              <div className="inclusions-box">
                <h4>Scope of Work & Technical Inclusions</h4>
                <ul className="inclusions-list">
                  <li>uPVC Profiles lead-free with 10-Year anti-yellowing UV warranty.</li>
                  <li>1.2mm to 1.5mm Galvanized Iron (GI) steel reinforcement inside all chambers.</li>
                  <li>High quality EPDM weather-sealing gaskets and anti-rattle wool piles.</li>
                  <li>Includes silicone perimeter weather sealing and site installation by factory technicians.</li>
                  <li>Complete transport and crane/staircase lifting within Delhi NCR included.</li>
                </ul>
              </div>

              {/* Grand Total Table */}
              <div className="grand-total-box">
                <div className="cost-row">
                  <span>Total Windows & Doors Cost ({totalAreaSqFt} Sq.Ft)</span>
                  <span className="font-mono font-bold">₹{Math.round(subtotal * 0.85).toLocaleString()}.00</span>
                </div>
                <div className="cost-row">
                  <span>Hardware & SS Mesh Add-on</span>
                  <span className="font-mono font-bold">₹{Math.round(subtotal * 0.15).toLocaleString()}.00</span>
                </div>
                <div className="cost-row">
                  <span>Installation & Silicon Packing</span>
                  <span className="font-mono font-bold" style={{ color: 'var(--accent-emerald)' }}>
                    FREE (Included)
                  </span>
                </div>
                <div className="cost-row">
                  <span>GST Taxes ({project.pricingConfig.taxPercent}%)</span>
                  <span className="font-mono font-bold">₹{taxAmount.toLocaleString()}.00</span>
                </div>
                <div className="cost-row cost-grand-total">
                  <span>Net Final Amount (GST Incl.)</span>
                  <span className="total-amount font-mono">₹{grandTotal.toLocaleString()}.00</span>
                </div>
                <div className="text-[10px] text-slate-500 font-sans italic pt-2">
                  Amount in words: <span className="text-slate-800 font-semibold">{numberToWordsINR(grandTotal)}</span>
                </div>
              </div>
            </section>

            {/* 6. TERMS & CONDITIONS + BANK DETAILS */}
            <section className="terms-payment-grid">
              <div className="terms-box">
                <h4>Commercial Terms & Conditions</h4>
                <ol className="terms-ordered-list">
                  <li>
                    <b>Payment Schedule:</b> 50% advance along with confirmed work order, 40% upon dispatch from factory,
                    and 10% on completion of site installation.
                  </li>
                  <li>
                    <b>Delivery Period:</b> Standard fabrication time is 10 to 14 business days from the date of final site
                    masonry clearance.
                  </li>
                  <li>
                    <b>Site Readiness:</b> Finished window opening plastered sills and 230V electricity supply to be
                    provided by client.
                  </li>
                  <li>
                    <b>Warranty:</b> 10 Years warranty on uPVC profile integrity, 1 Year warranty on all moving hardware.
                  </li>
                </ol>
              </div>

              <div className="bank-qr-card">
                <div className="qr-placeholder">
                  {/* UPI QR Vector Mockup */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="6" y="6" width="1" height="1" fill="#0f172a" />
                    <rect x="17" y="6" width="1" height="1" fill="#0f172a" />
                    <rect x="6" y="17" width="1" height="1" fill="#0f172a" />
                    <path d="M14 14h3v3h-3zM17 17h4v4h-4zM14 20h3v1h-3zM20 14h1v3h-1z" />
                  </svg>
                </div>
                <div className="bank-details">
                  <b>{companyProfile.bankName || 'HDFC BANK LTD'}</b>
                  <br />
                  A/c: {companyProfile.accountNo || '50200012345678'}
                  <br />
                  IFSC: {companyProfile.ifsc || 'HDFC0000123'}
                  <br />
                  UPI ID: {companyProfile.upiId || 'remixupvc@hdfcbank'}
                </div>
              </div>
            </section>

            {/* 7. SIGNATURE AUTHORIZATION */}
            <footer className="signature-row">
              <div className="sig-block">
                <div className="sig-line"></div>
                Customer Acceptance Signature
              </div>
              <div className="sig-block">
                <div className="sig-line"></div>
                Authorized Signatory ({companyProfile.companyName})
              </div>
            </footer>
          </main>
        ) : activeTab === 'typology_cost' ? (
          <div id="typology-cost-printable-sheet" className="w-full max-w-6xl report-sheet">
            <TypologyCostBreakupReport
              activeProject={project}
              customer={{ name: clientName, referenceNo: refNo }}
              defaultProjectCode={refNo}
              defaultProjectName={clientName}
            />
          </div>
        ) : (
          /* =========================================================
             TAB 2: FACTORY BOM & MATERIAL COST ANALYSIS
             ========================================================= */
          <div id="bom-printable-sheet" className="max-w-5xl w-full space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Grand Total (with Tax)
                </span>
                <div className="text-2xl font-extrabold text-emerald-700 font-mono">
                  ₹ {grandTotal.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">Includes {project.pricingConfig.taxPercent}% GST</span>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Average Rate Per Sq.Ft
                </span>
                <div className="text-2xl font-extrabold text-blue-700 font-mono">
                  ₹ {pricePerSqFt} <span className="text-xs font-normal text-slate-500">/ sq.ft</span>
                </div>
                <span className="text-[10px] text-slate-400">₹ {Math.round(grandTotal / (totalAreaSqM || 1))} / m²</span>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Total Window Area
                </span>
                <div className="text-2xl font-extrabold text-slate-800 font-mono">
                  {totalAreaSqFt} <span className="text-xs font-normal text-slate-500">sq.ft</span>
                </div>
                <span className="text-[10px] text-slate-400">{totalAreaSqM} m²</span>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Coupled Frames
                </span>
                <div className="text-2xl font-extrabold text-indigo-700 font-mono">
                  {project.frames.length} <span className="text-xs font-normal text-slate-500">Units</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">
                  {project.couplings.length} Couplers (2mm)
                </span>
              </div>
            </div>

            {/* Itemized BOM Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Itemized Factory Material Breakdown (BOM)</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">Auto-calculated from CAD geometry</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5 text-center">Qty / Dim</th>
                      <th className="px-4 py-2.5 text-center">Unit</th>
                      <th className="px-4 py-2.5 text-right">Unit Rate (₹)</th>
                      <th className="px-4 py-2.5 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={`${item.category}-${item.name}-${idx}`} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-2 font-bold uppercase text-[10px] text-blue-800">
                          {item.category}
                        </td>
                        <td className="px-4 py-2 font-medium">{item.description}</td>
                        <td className="px-4 py-2 text-center font-mono font-semibold">{item.quantity}</td>
                        <td className="px-4 py-2 text-center font-bold text-slate-500">{item.unit}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">
                          ₹{item.unitRate.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">
                          ₹{item.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-xs border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right text-slate-600">
                        Net Material Subtotal:
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-900">
                        ₹{subtotal.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right text-slate-600">
                        GST ({project.pricingConfig.taxPercent}%):
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-900">
                        ₹{taxAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 text-emerald-900">
                      <td colSpan={5} className="px-4 py-2.5 text-right font-black">
                        GRAND TOTAL (₹):
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-black text-sm">
                        ₹{grandTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Company GST & Bank Profile Modal */}
      <CompanyGstModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onProfileUpdated={handleCompanyProfileUpdated}
      />

      {/* Excel Column Width Settings Modal (कॉलम जगह/साइज सेटिंग) */}
      <ExcelColumnSettingsModal
        isOpen={showExcelColModal}
        onClose={() => setShowExcelColModal(false)}
        onDownloadNow={() => {
          handleDownloadExcel();
          setShowExcelColModal(false);
        }}
        onDownloadElevationSheet={(colWidths) => {
          handleDownloadElevationSheetExcel(colWidths);
          setShowExcelColModal(false);
        }}
        isDownloading={isGeneratingExcel || isGeneratingElevationExcel}
      />

      {/* Floating Feedback Toast for PDF Generation */}
      {quotationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-emerald-500/50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{quotationToast}</span>
          <button
            onClick={() => setQuotationToast(null)}
            className="text-slate-400 hover:text-white text-xs font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
