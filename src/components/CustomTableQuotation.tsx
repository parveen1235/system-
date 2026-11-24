import React, { useState, useRef, useEffect } from 'react';
import { UPVCProject, UPVCFrame, CouplingConnection } from '../types/upvc';
import { CompanyProfile } from './CompanyGstModal';
import { CadElevationDrawing } from './CadElevationDrawing';
import {
  Plus,
  Trash2,
  Copy,
  Printer,
  Download,
  Upload,
  Image as ImageIcon,
  Building2,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Settings2,
  Sliders,
  Sparkles,
  ArrowUpDown,
  X,
  Edit3,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
} from 'lucide-react';
import {
  downloadQuotationPdf,
  printQuotationSheet,
  downloadQuotationPdfViaPython,
  svgElementToPngDataUrl,
  PythonQuotationPayload,
} from '../utils/exportUtils';
import {
  downloadQuotationExcelWithCad,
  generateSingleFrameCadSvgString,
  svgStringToPngBase64,
  ExcelQuotationOptions,
  ExcelExportRow,
  getSavedExcelColumnWidths,
  downloadImageStyleQuotationExcel,
  getSavedElevationSheetExcelColWidths,
  ElevationSheetColumnWidths,
} from '../utils/excelExportUtils';
import { ExcelColumnSettingsModal } from './ExcelColumnSettingsModal';
import { getGlassDisplayName } from '../utils/glassUtils';
import {
  QuotationSettingsModal,
  getMasterQuotationDefaults,
  QuotationMasterDefaults,
} from './QuotationSettingsModal';

export interface CustomTableColumn {
  id: string;
  name: string;
  type?: 'text' | 'number';
  placeholder?: string;
  width?: string;
}

export interface CustomTableRow {
  id: string;
  srNo: number;
  frameId?: string;
  frame?: UPVCFrame;
  frames?: UPVCFrame[];
  couplings?: any[];
  drawingName: string;
  qty: number;
  glassName: string;
  customValues: Record<string, string>;
}

export interface BankDetailsState {
  bankName: string;
  accountNo: string;
  branchAddress: string;
  ifsc: string;
  accountHolder?: string;
  upiId?: string;
}

export interface CommercialSummaryLine {
  id: string;
  label: string;
  sqFt: string;
  rate: string;
  price: string;
  isDeduction?: boolean;
}

// Helper to get connected coupled cluster of frames for a specific frame
export function getFrameCoupledCluster(
  frameId: string,
  allFrames?: UPVCFrame[],
  couplings?: CouplingConnection[]
): UPVCFrame[] {
  if (!allFrames || allFrames.length <= 1) return allFrames || [];
  if (!couplings || couplings.length === 0) {
    const f = allFrames.find((item) => item.id === frameId);
    return f ? [f] : [allFrames[0]];
  }

  const hasCoupling = couplings.some((c) => c.sourceFrameId === frameId || c.targetFrameId === frameId);
  if (!hasCoupling) {
    const f = allFrames.find((item) => item.id === frameId);
    return f ? [f] : [allFrames[0]];
  }

  const cluster = new Set<string>([frameId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of couplings) {
      if (cluster.has(c.sourceFrameId) && !cluster.has(c.targetFrameId)) {
        cluster.add(c.targetFrameId);
        changed = true;
      }
      if (cluster.has(c.targetFrameId) && !cluster.has(c.sourceFrameId)) {
        cluster.add(c.sourceFrameId);
        changed = true;
      }
    }
  }

  return allFrames.filter((f) => cluster.has(f.id));
}

export function getCouplingsForFrames(frameIds: string[], couplings?: CouplingConnection[]): CouplingConnection[] {
  if (!couplings || couplings.length === 0) return [];
  const idSet = new Set(frameIds);
  return couplings.filter((c) => idSet.has(c.sourceFrameId) && idSet.has(c.targetFrameId));
}

interface CustomTableQuotationProps {
  project: UPVCProject;
  companyProfile: CompanyProfile;
  customerDesigns?: any[];
  onUpdateCompanyProfile?: (profile: CompanyProfile) => void;
  lang?: 'hi' | 'en';
}

// Convert numbers to Indian Rupees in Words (e.g. 52400 -> Fifty Two Thousand Four Hundred Rupees Only)
export function numberToWordsINR(amount: number): string {
  if (amount <= 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
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

  return inWords(amount).replace(/\s+/g, ' ').trim() + ' Rupees Only';
}

// Build table rows from all design items of a customer
export const buildRowsFromCustomerDesigns = (designs: any[]): CustomTableRow[] => {
  return designs.map((d, idx) => {
    const fWidth = Math.round(d.width || d.projectData?.frames?.[0]?.width || 1000);
    const fHeight = Math.round(d.height || d.projectData?.frames?.[0]?.height || 1000);
    const areaSqM = (fWidth * fHeight) / 1000000;
    const areaSqFt = Math.round(areaSqM * 10.7639 * 10) / 10;
    
    const qty = Number(d.quantity) || 1;
    const estRate = d.unitPrice && areaSqFt > 0 ? Math.round(d.unitPrice / areaSqFt) : 650;
    const estTotal = d.totalPrice || (d.unitPrice ? d.unitPrice * qty : Math.round(areaSqFt * estRate * qty));

    const primaryFrame = d.projectData?.frames?.[0];
    const glassDesc = getGlassDisplayName(
      d.glassType || primaryFrame?.pockets?.[0]?.glassType,
      d.glassName || primaryFrame?.pockets?.[0]?.glassName || primaryFrame?.glassName
    );

    const defName = `${d.tag || `W-${idx + 1}`}: ${d.type || 'Window'} (${fWidth}×${fHeight}mm) - ${d.location || 'General'}`;

    return {
      id: `row-${d.id || idx}`,
      srNo: idx + 1,
      frameId: primaryFrame?.id || `f-${idx}`,
      frame: primaryFrame,
      frames: d.projectData?.frames && d.projectData.frames.length > 0 ? d.projectData.frames : (primaryFrame ? [primaryFrame] : undefined),
      couplings: d.projectData?.couplings || [],
      drawingName: defName,
      qty,
      glassName: glassDesc,
      customValues: {
        area: `${areaSqFt}`,
        rate: `${estRate}`,
        amount: `${estTotal.toLocaleString('en-IN')}`,
      },
    };
  });
};

// High-Fidelity 2D Vector Drawing Thumbnail for table cell (Identical to CAD Canvas)
export const TableDrawingThumbnail: React.FC<{
  frame?: UPVCFrame;
  frames?: UPVCFrame[];
  couplings?: any[];
  width?: number;
  height?: number;
  name?: string;
  badgeTag?: string;
  showDimensions?: boolean;
}> = ({
  frame,
  frames,
  couplings = [],
  width = 370,
  height = 245,
  name,
  badgeTag,
  showDimensions = true,
}) => {
  return (
    <CadElevationDrawing
      frame={frame}
      frames={frames}
      couplings={couplings}
      width={width}
      height={height}
      title={name}
      badgeTag={badgeTag}
      showDimensions={showDimensions}
      showLabels={true}
      showHandles={true}
      showArrows={true}
      allowEnlarge={true}
    />
  );
};

export const CustomTableQuotation: React.FC<CustomTableQuotationProps> = ({
  project,
  companyProfile: initialCompanyProfile,
  customerDesigns,
  onUpdateCompanyProfile,
  lang = 'hi',
}) => {
  // 1. Company Profile State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem('upvc_custom_table_company');
      if (saved) return { ...initialCompanyProfile, ...JSON.parse(saved) };
    } catch (e) {}
    return initialCompanyProfile;
  });

  const [companyLogo, setCompanyLogo] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('upvc_quotation_logo') ||
        localStorage.getItem('upvc_default_quotation_logo') ||
        getMasterQuotationDefaults().companyLogo ||
        companyProfile.logoUrl ||
        ''
      );
    } catch (e) {
      return '';
    }
  });

  // 2. Client & Project Details State
  const masterDefaults = getMasterQuotationDefaults();
  const [clientName, setClientName] = useState<string>(project.clientName || 'Mr. Rajesh Sharma');
  const [refNo, setRefNo] = useState<string>(project.referenceNo || 'QT-2026-089');
  const [quoteDate, setQuoteDate] = useState<string>(project.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  const [validUntil, setValidUntil] = useState<string>('15 Days from Date');
  const [siteAddress, setSiteAddress] = useState<string>(
    'Villa No. 42, Palm Meadows, Sector 54, Golf Course Road, Gurugram, HR'
  );
  const [clientPhone, setClientPhone] = useState<string>('+91 98111 22334');
  const [clientPhone2, setClientPhone2] = useState<string>(() => {
    try {
      return localStorage.getItem(`upvc_custom_quote_client_phone2_${project.id}`) || '';
    } catch (e) {
      return '';
    }
  });
  const [clientEmail, setClientEmail] = useState<string>('rajesh.sharma@example.com');

  // Client Details & Address Visibility Controls
  const [showClientBillingDetails, setShowClientBillingDetails] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`upvc_quote_show_client_billing_${project.id}`);
      if (saved !== null) return saved === 'true';
      return masterDefaults.showClientBillingDetails !== false;
    } catch (e) {
      return true;
    }
  });
  const [showSiteAddress, setShowSiteAddress] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`upvc_quote_show_site_addr_${project.id}`);
      if (saved !== null) return saved === 'true';
      return masterDefaults.showClientAddress !== false;
    } catch (e) {
      return true;
    }
  });

  // Extra Mobile Display Toggles
  const [showCompanyPhone2, setShowCompanyPhone2] = useState<boolean>(() => {
    return Boolean(companyProfile.phone2 || masterDefaults.companyPhone2);
  });
  const [showClientPhone2, setShowClientPhone2] = useState<boolean>(() => {
    return Boolean(clientPhone2);
  });

  // Logo Scale / Size State ('sm' | 'md' | 'lg' | 'xl')
  const [logoScale, setLogoScale] = useState<'sm' | 'md' | 'lg' | 'xl'>(() => {
    try {
      const saved = localStorage.getItem('upvc_custom_quote_logo_scale') as any;
      if (saved) return saved;
      return masterDefaults.logoScale || 'lg';
    } catch (e) {
      return 'lg';
    }
  });

  // 3. Dynamic Custom Columns State
  // Default columns: Area, Rate, and Total Amount
  const [columns, setColumns] = useState<CustomTableColumn[]>(() => {
    try {
      const saved = localStorage.getItem('upvc_custom_quote_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'area', name: 'Area (Sq.Ft)', placeholder: 'e.g. 24.5', width: '95px' },
      { id: 'rate', name: 'Rate (Rs./Sq.Ft)', placeholder: 'e.g. 650', width: '105px' },
      { id: 'amount', name: 'Total Amount (Rs.)', placeholder: 'e.g. 18,500', width: '125px' },
    ];
  });

  // 4. Dynamic Rows State - Supports loading ALL customer designs
  const [rows, setRows] = useState<CustomTableRow[]>(() => {
    // 1. If customerDesigns prop is passed and has items, use all of them
    if (customerDesigns && customerDesigns.length > 0) {
      return buildRowsFromCustomerDesigns(customerDesigns);
    }

    // 2. Check localStorage for active customer designs
    try {
      const activeCustId = localStorage.getItem('upvc_active_customer_id');
      if (activeCustId) {
        const rawCust = localStorage.getItem(`upvc_cust_designs_${activeCustId}`);
        if (rawCust) {
          const list = JSON.parse(rawCust);
          if (Array.isArray(list) && list.length > 0) {
            return buildRowsFromCustomerDesigns(list);
          }
        }
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem(`upvc_custom_quote_rows_${project.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // 3. Initialize from project frames if available
    if (project.frames && project.frames.length > 0) {
      return project.frames.map((frame, idx) => {
        const fWidth = Math.round(frame.width);
        const fHeight = Math.round(frame.height);
        const areaSqM = (fWidth * fHeight) / 1000000;
        const areaSqFt = Math.round(areaSqM * 10.7639 * 10) / 10;

        const isDoor = fHeight >= 1800;
        const isSlider = frame.pockets.some(
          (p) => p.sashType?.startsWith('slider') || p.sashType?.startsWith('mesh_slider')
        );
        const isFrench = frame.pockets.some((p) => p.sashType === 'french_open');
        const isCasement = frame.pockets.some((p) => p.sashType?.startsWith('casement'));

        let defName = `W-${idx + 1}: Sliding Window (${fWidth}×${fHeight}mm)`;
        if (isDoor) defName = `D-${idx + 1}: Casement Door (${fWidth}×${fHeight}mm)`;
        else if (isFrench) defName = `W-${idx + 1}: French Open Window (${fWidth}×${fHeight}mm)`;
        else if (isCasement) defName = `W-${idx + 1}: Casement Window (${fWidth}×${fHeight}mm)`;

        const glassDesc = getGlassDisplayName(
          frame.pockets[0]?.glassType,
          frame.pockets[0]?.glassName || frame.glassName
        );

        const estRate = 650;
        const estTotal = Math.round(areaSqFt * estRate);

        return {
          id: `row-${frame.id}`,
          srNo: idx + 1,
          frameId: frame.id,
          frame: frame,
          frames: project.frames,
          couplings: project.couplings,
          drawingName: defName,
          qty: 1,
          glassName: glassDesc,
          customValues: {
            area: `${areaSqFt}`,
            rate: `${estRate}`,
            amount: `${estTotal.toLocaleString('en-IN')}`,
          },
        };
      });
    }

    // Default sample row if empty
    return [
      {
        id: 'row-1',
        srNo: 1,
        drawingName: 'W-01: 3-Track Sliding Window (1200×1200mm)',
        qty: 2,
        glassName: '5mm Clear Toughened Glass',
        customValues: {
          area: '15.5',
          rate: '650',
          amount: '20,160',
        },
      },
    ];
  });

  // Sync rows when customerDesigns prop changes
  useEffect(() => {
    if (customerDesigns && customerDesigns.length > 0) {
      setRows(buildRowsFromCustomerDesigns(customerDesigns));
    }
  }, [customerDesigns]);

  // 5. Bank Details State (as explicitly requested: ACOUNT NUMBER, BANK NAME, BRANCH ADRES, IFSC CODE)
  const [bankDetails, setBankDetails] = useState<BankDetailsState>(() => {
    try {
      const saved = localStorage.getItem('upvc_custom_quote_bank');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const master = getMasterQuotationDefaults();
    return {
      bankName: master.bankDetails.bankName || companyProfile.bankName || 'HDFC BANK LTD',
      accountNo: master.bankDetails.accountNo || companyProfile.accountNo || '50200012345678',
      branchAddress: master.bankDetails.branch || companyProfile.branchAddress || 'Okhla Industrial Area Phase-II, New Delhi',
      ifsc: master.bankDetails.ifsc || companyProfile.ifsc || 'HDFC0000123',
      accountHolder: master.bankDetails.accountHolder || companyProfile.accountHolder || companyProfile.companyName || 'Remix uPVC Windows Pvt Ltd',
      upiId: master.bankDetails.upiId || companyProfile.upiId || 'remixupvc@hdfcbank',
    };
  });

  // 6. Guarantee / Warranty Terms State ("GARENTY")
  const [guaranteeTerms, setGuaranteeTerms] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('upvc_custom_quote_guarantee');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getMasterQuotationDefaults().guaranteeTerms;
  });

  // 7. Payment Terms State ("PAYMENT TYPE")
  const [paymentTerms, setPaymentTerms] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('upvc_custom_quote_payment');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getMasterQuotationDefaults().paymentTerms;
  });

  // 8. Custom Column Modal / Prompt State & Settings Modal State
  const [showAddColModal, setShowAddColModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showExcelColModal, setShowExcelColModal] = useState<boolean>(false);
  const [newColName, setNewColName] = useState<string>('');

  // 9. Logo file input ref
  const logoInputRef = useRef<HTMLInputElement>(null);

  // 10. CAD Drawing View Controls State
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showCoupledAssembly, setShowCoupledAssembly] = useState<boolean>(true);

  // 11. Editable Total Amount & Advance Amount State
  const [customTotalAmount, setCustomTotalAmount] = useState<string>(() => {
    try {
      return localStorage.getItem(`upvc_custom_quote_total_${project.id}`) || '';
    } catch (e) {
      return '';
    }
  });

  const [totalAmountLabel, setTotalAmountLabel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('upvc_custom_quote_total_label');
      if (saved) return saved.replace(/[\u0900-\u097F]+/g, '').replace(/\(\s*[/\-–]?\s*\)/g, '').replace(/\s*\/\s*$/, '').trim() || 'Total Amount';
      return getMasterQuotationDefaults().totalAmountLabel || 'Total Amount';
    } catch (e) {
      return 'Total Amount';
    }
  });

  const [advanceAmount, setAdvanceAmount] = useState<string>(() => {
    try {
      return localStorage.getItem(`upvc_custom_quote_advance_${project.id}`) || '0';
    } catch (e) {
      return '0';
    }
  });

  // Advance visibility state: "JAB DE TAB WO DIKHE NAHI TO NA DIKHE OR ISE QUTION TABLE ME HIDE KAR SAKE"
  const [showAdvance, setShowAdvance] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`upvc_custom_quote_show_advance_${project.id}`);
      if (saved !== null) {
        return saved === 'true';
      }
      // If advance was saved and > 0, show it; otherwise default to false (not shown until given)!
      const savedAdv = localStorage.getItem(`upvc_custom_quote_advance_${project.id}`);
      if (savedAdv) {
        const val = parseFloat(savedAdv.replace(/,/g, ''));
        return !isNaN(val) && val > 0;
      }
      return false;
    } catch (e) {
      return false;
    }
  });

  const [advanceAmountLabel, setAdvanceAmountLabel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('upvc_custom_quote_advance_label');
      if (saved) return saved.replace(/[\u0900-\u097F]+/g, '').replace(/\(\s*[/\-–]?\s*\)/g, '').replace(/\s*\/\s*$/, '').trim() || 'Advance Amount Received';
      return getMasterQuotationDefaults().advanceAmountLabel || 'Advance Amount Received';
    } catch (e) {
      return 'Advance Amount Received';
    }
  });

  const [balanceLabel, setBalanceLabel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('upvc_custom_quote_balance_label');
      if (saved) return saved.replace(/[\u0900-\u097F]+/g, '').replace(/\(\s*[/\-–]?\s*\)/g, '').replace(/\s*\/\s*$/, '').trim() || 'Balance Due / Net Payable';
      return getMasterQuotationDefaults().balanceLabel || 'Balance Due / Net Payable';
    } catch (e) {
      return 'Balance Due / Net Payable';
    }
  });

  // 12. Commercial Summary Table State (Matching the user-specified image with extra horizontal lines)
  const [baseItemLabel, setBaseItemLabel] = useState<string>(() => {
    try {
      return (
        localStorage.getItem(`upvc_quote_base_label_${project.id}`) ||
        getMasterQuotationDefaults().baseItemLabel ||
        'upvc Windows & Door'
      );
    } catch (e) {
      return 'upvc Windows & Door';
    }
  });

  const [baseItemSqFt, setBaseItemSqFt] = useState<string>(() => {
    try {
      return localStorage.getItem(`upvc_quote_base_sqft_${project.id}`) || '';
    } catch (e) {
      return '';
    }
  });

  const [baseItemRate, setBaseItemRate] = useState<string>(() => {
    try {
      return (
        localStorage.getItem(`upvc_quote_base_rate_${project.id}`) ||
        getMasterQuotationDefaults().baseItemRate ||
        ''
      );
    } catch (e) {
      return '';
    }
  });

  const [baseItemPrice, setBaseItemPrice] = useState<string>(() => {
    try {
      return localStorage.getItem(`upvc_quote_base_price_${project.id}`) || '';
    } catch (e) {
      return '';
    }
  });

  const [extraSummaryLines, setExtraSummaryLines] = useState<CommercialSummaryLine[]>(() => {
    try {
      const saved = localStorage.getItem(`upvc_quote_extra_lines_${project.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const master = getMasterQuotationDefaults();
    return master.defaultExtraLines && master.defaultExtraLines.length > 0
      ? master.defaultExtraLines
      : [
          {
            id: 'line-cartage',
            label: 'CARTAGE AMOUNT',
            sqFt: '',
            rate: '',
            price: '1,800.00',
          },
        ];
  });

  // Auto-sync rows frame data when project.frames updates in CAD Studio
  useEffect(() => {
    if (project.frames && project.frames.length > 0 && (!customerDesigns || customerDesigns.length === 0)) {
      setRows((prev) =>
        prev.map((r, idx) => {
          const match =
            project.frames.find((f) => f.id === r.frameId) ||
            project.frames[idx] ||
            project.frames[0];
          if (match) {
            const fWidth = Math.round(match.width);
            const fHeight = Math.round(match.height);
            const areaSqM = (fWidth * fHeight) / 1000000;
            const areaSqFt = Math.round(areaSqM * 10.7639 * 10) / 10;
            return {
              ...r,
              frameId: match.id,
              frame: match,
              frames: project.frames,
              couplings: project.couplings || [],
              customValues: {
                ...r.customValues,
                area: r.customValues.area || `${areaSqFt}`,
              },
            };
          }
          return r;
        })
      );
    }
  }, [project.frames, project.couplings, customerDesigns]);

  // Persistence helpers
  const saveState = () => {
    try {
      localStorage.setItem('upvc_custom_quote_columns', JSON.stringify(columns));
      localStorage.setItem(`upvc_custom_quote_rows_${project.id}`, JSON.stringify(rows));
      localStorage.setItem('upvc_custom_quote_bank', JSON.stringify(bankDetails));
      localStorage.setItem('upvc_custom_quote_guarantee', JSON.stringify(guaranteeTerms));
      localStorage.setItem('upvc_custom_quote_payment', JSON.stringify(paymentTerms));
      localStorage.setItem('upvc_custom_table_company', JSON.stringify(companyProfile));
      localStorage.setItem(`upvc_custom_quote_total_${project.id}`, customTotalAmount);
      localStorage.setItem(`upvc_custom_quote_total_label`, totalAmountLabel);
      localStorage.setItem(`upvc_custom_quote_advance_${project.id}`, advanceAmount);
      localStorage.setItem(`upvc_custom_quote_show_advance_${project.id}`, String(showAdvance));
      localStorage.setItem('upvc_custom_quote_advance_label', advanceAmountLabel);
      localStorage.setItem('upvc_custom_quote_balance_label', balanceLabel);
      localStorage.setItem(`upvc_quote_base_label_${project.id}`, baseItemLabel);
      localStorage.setItem(`upvc_quote_base_sqft_${project.id}`, baseItemSqFt);
      localStorage.setItem(`upvc_quote_base_rate_${project.id}`, baseItemRate);
      localStorage.setItem(`upvc_quote_base_price_${project.id}`, baseItemPrice);
      localStorage.setItem(`upvc_quote_extra_lines_${project.id}`, JSON.stringify(extraSummaryLines));
      localStorage.setItem(`upvc_custom_quote_client_phone2_${project.id}`, clientPhone2);
      localStorage.setItem(`upvc_quote_show_client_billing_${project.id}`, String(showClientBillingDetails));
      localStorage.setItem(`upvc_quote_show_site_addr_${project.id}`, String(showSiteAddress));
      localStorage.setItem('upvc_custom_quote_logo_scale', logoScale);
      if (companyLogo) {
        localStorage.setItem('upvc_quotation_logo', companyLogo);
      }
    } catch (e) {}
  };

  useEffect(() => {
    saveState();
  }, [
    columns,
    rows,
    bankDetails,
    guaranteeTerms,
    paymentTerms,
    companyProfile,
    companyLogo,
    customTotalAmount,
    totalAmountLabel,
    advanceAmount,
    showAdvance,
    advanceAmountLabel,
    balanceLabel,
    baseItemLabel,
    baseItemSqFt,
    baseItemRate,
    baseItemPrice,
    extraSummaryLines,
    clientPhone2,
    showClientBillingDetails,
    showSiteAddress,
    logoScale,
  ]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Please upload a logo image under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        setCompanyLogo(res);
        try {
          localStorage.setItem('upvc_quotation_logo', res);
        } catch (err) {}
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setCompanyLogo('');
    try {
      localStorage.removeItem('upvc_quotation_logo');
    } catch (err) {}
  };

  // Add Custom Column
  const handleAddColumn = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const colId = `col_${Date.now()}`;
    const newCol: CustomTableColumn = {
      id: colId,
      name: trimmed,
      width: '120px',
    };
    setColumns((prev) => [...prev, newCol]);
    setNewColName('');
    setShowAddColModal(false);
  };

  // Delete Column
  const handleDeleteColumn = (colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    setRows((prev) =>
      prev.map((r) => {
        const nextVals = { ...r.customValues };
        delete nextVals[colId];
        return { ...r, customValues: nextVals };
      })
    );
  };

  // Rename Column
  const handleRenameColumn = (colId: string, newName: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, name: newName } : c))
    );
  };

  // Add Row
  const handleAddRow = (frameTemplate?: UPVCFrame) => {
    const newSrNo = rows.length + 1;
    const newRowId = `row_${Date.now()}`;

    let newRow: CustomTableRow;
    if (frameTemplate) {
      const fWidth = Math.round(frameTemplate.width);
      const fHeight = Math.round(frameTemplate.height);
      newRow = {
        id: newRowId,
        srNo: newSrNo,
        frameId: frameTemplate.id,
        frame: frameTemplate,
        drawingName: `W-${newSrNo}: Window (${fWidth}×${fHeight}mm)`,
        qty: 1,
        glassName: '5mm Clear Toughened Glass',
        customValues: {},
      };
    } else {
      newRow = {
        id: newRowId,
        srNo: newSrNo,
        drawingName: `Item #${newSrNo}: Custom uPVC Frame`,
        qty: 1,
        glassName: '5mm Clear Toughened Glass',
        customValues: {},
      };
    }

    setRows((prev) => [...prev, newRow]);
  };

  // Delete Row
  const handleDeleteRow = (rowId: string) => {
    if (rows.length <= 1) {
      alert('At least one row is required');
      return;
    }
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== rowId);
      return filtered.map((r, i) => ({ ...r, srNo: i + 1 }));
    });
  };

  // Duplicate Row
  const handleDuplicateRow = (row: CustomTableRow) => {
    const newRowId = `row_${Date.now()}`;
    const cloned: CustomTableRow = {
      ...row,
      id: newRowId,
      srNo: rows.length + 1,
      customValues: { ...row.customValues },
    };
    setRows((prev) => [...prev, cloned]);
  };

  // Update Row Field
  const handleUpdateRow = (
    rowId: string,
    field: 'drawingName' | 'qty' | 'glassName',
    val: any
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: val } : r))
    );
  };

  // Update Row Custom Value
  const handleUpdateRowCustomVal = (rowId: string, colId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            customValues: {
              ...r.customValues,
              [colId]: val,
            },
          };
        }
        return r;
      })
    );
  };

  // Reset to CAD Project
  const handleResetToProject = () => {
    if (window.confirm('Reset table rows to match current 2D CAD frames?')) {
      if (project.frames && project.frames.length > 0) {
        const newRows = project.frames.map((frame, idx) => {
          const fWidth = Math.round(frame.width);
          const fHeight = Math.round(frame.height);
          const areaSqM = (fWidth * fHeight) / 1000000;
          const areaSqFt = Math.round(areaSqM * 10.7639 * 10) / 10;
          const glassDesc = getGlassDisplayName(
            frame.pockets[0]?.glassType,
            frame.pockets[0]?.glassName || frame.glassName
          );

          return {
            id: `row-${frame.id}-${Date.now()}`,
            srNo: idx + 1,
            frameId: frame.id,
            frame: frame,
            drawingName: `W-${idx + 1}: Frame (${fWidth}×${fHeight}mm)`,
            qty: 1,
            glassName: glassDesc,
            customValues: {
              rate: '650',
              amount: `${Math.round(areaSqFt * 650).toLocaleString()}`,
            },
          };
        });
        setRows(newRows);
      }
    }
  };

  // Popular quick suggestions for new columns
  const columnPresets = [
    'Rate (₹/Sq.Ft)',
    'Area (Sq.Ft)',
    'Total Amount (₹)',
    'Mosquito Mesh',
    'Profile Series',
    'Profile Color',
    'Hardware / Locks',
    'Location / Floor',
    'Reinforcement Steel',
    'Remarks',
  ];

  const handleSyncAllCustomerDesigns = () => {
    let list: any[] = customerDesigns || [];
    if (!list || list.length === 0) {
      try {
        const activeCustId = localStorage.getItem('upvc_active_customer_id');
        if (activeCustId) {
          const rawCust = localStorage.getItem(`upvc_cust_designs_${activeCustId}`);
          if (rawCust) list = JSON.parse(rawCust);
        }
      } catch (e) {}
    }
    if (list && list.length > 0) {
      setRows(buildRowsFromCustomerDesigns(list));
    } else if (project.frames && project.frames.length > 0) {
      setRows(
        project.frames.map((frame, idx) => {
          const fWidth = Math.round(frame.width);
          const fHeight = Math.round(frame.height);
          const areaSqM = (fWidth * fHeight) / 1000000;
          const areaSqFt = Math.round(areaSqM * 10.7639 * 10) / 10;
          const estRate = 650;
          const estTotal = Math.round(areaSqFt * estRate);
          return {
            id: `row-${frame.id}`,
            srNo: idx + 1,
            frameId: frame.id,
            frame: frame,
            frames: project.frames,
            couplings: project.couplings,
            drawingName: `W-${idx + 1}: Frame (${fWidth}×${fHeight}mm)`,
            qty: 1,
            glassName: '5mm Clear Toughened Glass',
            customValues: {
              area: `${areaSqFt}`,
              rate: `${estRate}`,
              amount: `${estTotal.toLocaleString('en-IN')}`,
            },
          };
        })
      );
    }
  };

  const totalUnits = rows.reduce((sum, r) => sum + (Number(r.qty) || 1), 0);

  const totalAreaSqFt = rows.reduce((sum, r) => {
    const parsedArea = parseFloat(r.customValues['area'] || '0');
    if (parsedArea > 0) return sum + parsedArea * (Number(r.qty) || 1);
    if (r.frame) {
      const a = ((r.frame.width * r.frame.height) / 1000000) * 10.7639;
      return sum + Math.round(a * 10) / 10 * (Number(r.qty) || 1);
    }
    return sum;
  }, 0);

  const calculatedGrandTotal = rows.reduce((sum, r) => {
    const rawAmt = r.customValues['amount']?.replace(/,/g, '') || '0';
    const parsedAmt = parseFloat(rawAmt);
    if (parsedAmt > 0) return sum + parsedAmt;
    const parsedRate = parseFloat(r.customValues['rate']?.replace(/,/g, '') || '0');
    const parsedArea = parseFloat(r.customValues['area'] || '0');
    if (parsedRate > 0 && parsedArea > 0) {
      return sum + Math.round(parsedRate * parsedArea * (Number(r.qty) || 1));
    }
    return sum;
  }, 0);

  const parsedCustomTotal = parseFloat(customTotalAmount.replace(/,/g, ''));
  const isUsingCustomTotal = !isNaN(parsedCustomTotal) && customTotalAmount.trim() !== '';

  // Base item effective values (defaults to rows calculation if not explicitly edited)
  const displayBaseSqFt = baseItemSqFt.trim() !== '' ? baseItemSqFt : Math.round(totalAreaSqFt).toString();
  const displayBaseRate = baseItemRate.trim() !== ''
    ? baseItemRate
    : (totalAreaSqFt > 0 ? (calculatedGrandTotal / totalAreaSqFt).toFixed(2) : '570.00');
  const displayBasePrice = baseItemPrice.trim() !== ''
    ? baseItemPrice
    : Math.round(calculatedGrandTotal).toLocaleString('en-IN');

  const numericBasePrice = parseFloat(displayBasePrice.replace(/,/g, '')) || 0;

  const extraLinesTotal = extraSummaryLines.reduce((acc, line) => {
    const p = parseFloat(line.price.replace(/,/g, '')) || 0;
    return line.isDeduction ? acc - p : acc + p;
  }, 0);

  const effectiveCommercialTotal = isUsingCustomTotal
    ? parsedCustomTotal
    : numericBasePrice + extraLinesTotal;

  const effectiveTotalAmount = effectiveCommercialTotal;

  const parsedAdvance = parseFloat(advanceAmount.replace(/,/g, '')) || 0;
  const netPayable = Math.max(0, effectiveTotalAmount - parsedAdvance);

  const grandTotalAmount = effectiveTotalAmount;

  // Handlers for Extra Horizontal Lines in Commercial Summary
  const handleAddExtraLine = (preset?: Partial<CommercialSummaryLine>) => {
    const newLine: CommercialSummaryLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: preset?.label || 'EXTRA CHARGES',
      sqFt: preset?.sqFt || '',
      rate: preset?.rate || '',
      price: preset?.price || '0.00',
      isDeduction: preset?.isDeduction || false,
    };
    setExtraSummaryLines((prev) => [...prev, newLine]);
  };

  const handleUpdateExtraLine = (id: string, updates: Partial<CommercialSummaryLine>) => {
    setExtraSummaryLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, ...updates };
        if ((updates.sqFt !== undefined || updates.rate !== undefined) && updates.price === undefined) {
          const s = parseFloat((updates.sqFt !== undefined ? updates.sqFt : line.sqFt).replace(/,/g, ''));
          const r = parseFloat((updates.rate !== undefined ? updates.rate : line.rate).replace(/,/g, ''));
          if (!isNaN(s) && !isNaN(r) && s > 0 && r > 0) {
            updated.price = Math.round(s * r).toLocaleString('en-IN');
          }
        }
        return updated;
      })
    );
  };

  const handleDeleteExtraLine = (id: string) => {
    setExtraSummaryLines((prev) => prev.filter((line) => line.id !== id));
  };

  // Handler when user applies master settings to the current quotation
  const handleApplyMasterDefaultsToCurrent = (newDefaults: QuotationMasterDefaults) => {
    if (newDefaults.companyLogo) {
      setCompanyLogo(newDefaults.companyLogo);
    }
    if (newDefaults.logoScale) {
      setLogoScale(newDefaults.logoScale);
    }
    if (newDefaults.showClientBillingDetails !== undefined) {
      setShowClientBillingDetails(newDefaults.showClientBillingDetails);
    }
    if (newDefaults.showClientAddress !== undefined) {
      setShowSiteAddress(newDefaults.showClientAddress);
    }
    if (newDefaults.companyPhone2 && !companyProfile.phone2) {
      setCompanyProfile((prev) => ({ ...prev, phone2: newDefaults.companyPhone2 }));
      setShowCompanyPhone2(true);
    }
    if (newDefaults.baseItemLabel) {
      setBaseItemLabel(newDefaults.baseItemLabel);
    }
    if (newDefaults.baseItemRate) {
      setBaseItemRate(newDefaults.baseItemRate);
    }
    if (newDefaults.defaultExtraLines && newDefaults.defaultExtraLines.length > 0) {
      setExtraSummaryLines(newDefaults.defaultExtraLines);
    }
    if (newDefaults.totalAmountLabel) {
      setTotalAmountLabel(newDefaults.totalAmountLabel);
    }
    if (newDefaults.advanceAmountLabel) {
      setAdvanceAmountLabel(newDefaults.advanceAmountLabel);
    }
    if (newDefaults.balanceLabel) {
      setBalanceLabel(newDefaults.balanceLabel);
    }
    if (newDefaults.paymentTerms && newDefaults.paymentTerms.length > 0) {
      setPaymentTerms(newDefaults.paymentTerms);
    }
    if (newDefaults.guaranteeTerms && newDefaults.guaranteeTerms.length > 0) {
      setGuaranteeTerms(newDefaults.guaranteeTerms);
    }
    if (newDefaults.bankDetails) {
      setBankDetails({
        bankName: newDefaults.bankDetails.bankName,
        accountNo: newDefaults.bankDetails.accountNo,
        branchAddress: newDefaults.bankDetails.branch,
        ifsc: newDefaults.bankDetails.ifsc,
        accountHolder: newDefaults.bankDetails.accountHolder,
        upiId: newDefaults.bankDetails.upiId,
      });
    }

    if (newDefaults.defaultAdvancePercent && effectiveCommercialTotal > 0) {
      const adv = Math.round((effectiveCommercialTotal * newDefaults.defaultAdvancePercent) / 100);
      setAdvanceAmount(adv.toLocaleString('en-IN'));
      setShowAdvance(true);
    }
  };

  // Auto-load master defaults when opening a different project/customer if no overrides exist
  useEffect(() => {
    const master = getMasterQuotationDefaults();
    const savedTotal = localStorage.getItem(`upvc_custom_quote_total_${project.id}`);
    const savedBaseLabel = localStorage.getItem(`upvc_quote_base_label_${project.id}`);
    const savedLines = localStorage.getItem(`upvc_quote_extra_lines_${project.id}`);

    if (!savedBaseLabel && master.baseItemLabel) {
      setBaseItemLabel(master.baseItemLabel);
    }
    if (!savedLines && master.defaultExtraLines && master.defaultExtraLines.length > 0) {
      setExtraSummaryLines(master.defaultExtraLines);
    }
    if (!savedTotal && master.baseItemRate) {
      setBaseItemRate(master.baseItemRate);
    }
  }, [project.id]);

  // High-reliability PDF Generation & Print Handlers
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPythonPdf, setIsGeneratingPythonPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  const handleDownloadPythonPdf = async () => {
    setIsGeneratingPythonPdf(true);
    try {
      // Collect CAD drawing thumbnails for each row from DOM
      const rowsWithDrawings = await Promise.all(
        rows.map(async (row, idx) => {
          const liveFrame =
            (project.frames || []).find((f) => f.id === row.frameId) ||
            row.frame ||
            project.frames?.[0];

          let dimText = '';
          if (row.frames && row.frames.length > 1) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            row.frames.forEach((f) => {
              minX = Math.min(minX, f.x);
              minY = Math.min(minY, f.y);
              maxX = Math.max(maxX, f.x + f.width);
              maxY = Math.max(maxY, f.y + f.height);
            });
            dimText = `${Math.round(maxX - minX)} × ${Math.round(maxY - minY)} mm`;
          } else if (liveFrame) {
            dimText = `${Math.round(liveFrame.width)} × ${Math.round(liveFrame.height)} mm`;
          }

          let drawingImageBase64 = '';
          try {
            const tableRows = document.querySelectorAll('#custom-quotation-printable-sheet tbody tr');
            const targetRow = tableRows[idx];
            if (targetRow) {
              const svgEl = targetRow.querySelector('svg');
              if (svgEl) {
                drawingImageBase64 = await svgElementToPngDataUrl(svgEl);
              }
            }
          } catch (e) {
            // ignore
          }

          let calculatedArea = 0;
          if (row.frames && row.frames.length > 0) {
            row.frames.forEach((f) => {
              calculatedArea += (f.width * f.height) / (304.8 * 304.8);
            });
          } else if (liveFrame) {
            calculatedArea = (liveFrame.width * liveFrame.height) / (304.8 * 304.8);
          }
          const rowAreaStr = calculatedArea > 0 ? calculatedArea.toFixed(2) : '10.76';
          const rawRowArea = row.customValues?.['area'] || rowAreaStr;
          const rawRowRate = row.customValues?.['rate'] || displayBaseRate || '570';
          const computedAmt = Math.round(parseFloat(rawRowArea) * (parseFloat(rawRowRate.replace(/,/g, '')) || 570) * (row.qty || 1));
          const rawRowAmt = row.customValues?.['amount'] || computedAmt.toLocaleString('en-IN');

          return {
            srNo: row.srNo || idx + 1,
            drawingName: row.drawingName || 'uPVC Window / Door',
            glassName: row.glassName || '-',
            qty: row.qty || 1,
            customValues: {
              area: rawRowArea,
              rate: rawRowRate,
              amount: rawRowAmt,
              ...(row.customValues || {}),
            },
            dimensions: dimText,
            drawingImageBase64,
          };
        })
      );

      const activeColumns = (columns && columns.length > 0)
        ? columns
        : [
            { id: 'area', name: 'Area (Sq.Ft)', width: '95px' },
            { id: 'rate', name: 'Rate (Rs./Sq.Ft)', width: '105px' },
            { id: 'amount', name: 'Total Amount (Rs.)', width: '125px' },
          ];

      const payload: PythonQuotationPayload = {
        company: {
          name: companyProfile.companyName || (companyProfile as any).name || 'REMIX uPVC WINDOWS & DOORS',
          companyName: companyProfile.companyName || (companyProfile as any).name || 'REMIX uPVC WINDOWS & DOORS',
          tagline: companyProfile.tagline || 'Fabrication, Thermal & Acoustic Glazing Solutions',
          address: companyProfile.address,
          phone: companyProfile.phone,
          phone2: showCompanyPhone2 ? companyProfile.phone2 : undefined,
          email: companyProfile.email,
          gstin: companyProfile.gstin,
          logoUrl: companyLogo || companyProfile.logoUrl,
        },
        client: {
          name: clientName,
          refNo: refNo,
          date: quoteDate,
          validUntil: validUntil,
          address: siteAddress,
          phone: clientPhone,
          phone2: showClientPhone2 ? clientPhone2 : undefined,
          email: clientEmail,
          showBilling: showClientBillingDetails,
          showAddress: showSiteAddress,
        },
        columns: activeColumns.map((c) => ({
          id: c.id,
          name: c.name.replace(/₹/g, 'Rs.').replace(/[\u0900-\u097F]+/g, '').replace(/\(\s*[/\-–]?\s*\)/g, '').trim(),
          width: c.width,
        })),
        rows: rowsWithDrawings,
        summary: {
          baseItemLabel: baseItemLabel || 'uPVC Windows & Doors',
          totalArea: displayBaseSqFt || totalAreaSqFt.toFixed(2),
          rate: displayBaseRate,
          basePrice: displayBasePrice,
          charges: extraSummaryLines
            .filter((l) => l.price && parseFloat(l.price.replace(/,/g, '')) !== 0)
            .map((l) => ({
              label: l.label.replace(/[\u0900-\u097F]+/g, '').replace(/\(\s*[/\-–]?\s*\)/g, '').trim(),
              amount: l.price,
            })),
          totalAmountLabel: totalAmountLabel || 'TOTAL AMOUNT',
          totalAmount: (isUsingCustomTotal ? customTotalAmount : Math.round(effectiveCommercialTotal).toLocaleString('en-IN')) || effectiveTotalAmount.toLocaleString('en-IN'),
          advanceAmountLabel: advanceAmountLabel || 'ADVANCE AMOUNT RECEIVED',
          advanceAmount: (showAdvance && parsedAdvance > 0) ? parsedAdvance.toLocaleString('en-IN') : undefined,
          balanceLabel: balanceLabel || 'BALANCE DUE / NET PAYABLE',
          balanceAmount: (showAdvance && parsedAdvance > 0) ? netPayable.toLocaleString('en-IN') : undefined,
        },
        bank: {
          bankName: bankDetails.bankName,
          accountName: bankDetails.accountHolder || companyProfile.companyName,
          accountNo: bankDetails.accountNo,
          ifsc: bankDetails.ifsc,
          branch: bankDetails.branchAddress,
          upiId: bankDetails.upiId,
        },
        terms: paymentTerms && paymentTerms.length > 0 ? paymentTerms : [
          '50% Advance with Purchase Order, 40% before dispatch, 10% after installation.',
          'Quotation is valid for 15 days from issuance date.',
          'Site readiness (civil/masonry work & electrical supply) by client.',
        ],
        guaranteeTerms: guaranteeTerms && guaranteeTerms.length > 0 ? guaranteeTerms : [
          '10 Years Warranty on UPVC Profiles against warping, cracking & color fading.',
          '1 Year Comprehensive Guarantee on all moving Hardware, Rollers, Hinges & Locks.',
        ],
      };

      const fileName = `Quotation_${(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_Python_Vector.pdf`;
      const success = await downloadQuotationPdfViaPython(payload, fileName, 'custom-quotation-printable-sheet');

      if (success) {
        setPdfToast('Python Vector PDF downloaded successfully! (100% genuine vector text & crisp CAD)');
        setTimeout(() => setPdfToast(null), 5000);
      } else {
        setPdfToast('Could not generate Python PDF, fallback PDF downloaded.');
        setTimeout(() => setPdfToast(null), 4000);
      }
    } catch (err) {
      console.error('Python PDF generation error:', err);
      handleDownloadPdf();
    } finally {
      setIsGeneratingPythonPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const fileName = `Quotation_${(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_${refNo || 'QT'}.pdf`;
      const success = await downloadQuotationPdf('custom-quotation-printable-sheet', fileName);
      if (success) {
        setPdfToast('Quotation HD PDF downloaded! (Note: use "Print -> Save as PDF" for selectable vector text)');
        setTimeout(() => setPdfToast(null), 5000);
      } else {
        setPdfToast('Could not generate PDF, please use the Print button.');
        setTimeout(() => setPdfToast(null), 4000);
      }
    } catch (err) {
      console.error('PDF export error:', err);
      setPdfToast('PDF error. Falling back to print dialog...');
      setTimeout(() => setPdfToast(null), 4000);
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      // Collect CAD drawing thumbnails for each row from DOM or generate SVG
      const rowsWithDrawings: ExcelExportRow[] = await Promise.all(
        rows.map(async (row, idx) => {
          const liveFrame =
            (project.frames || []).find((f) => f.id === row.frameId) ||
            row.frame ||
            (project.frames || [])[idx];

          let drawingImageBase64 = row.drawingImageBase64 || '';
          if (!drawingImageBase64) {
            if (liveFrame) {
              try {
                const svgStr = generateSingleFrameCadSvgString(liveFrame);
                drawingImageBase64 = await svgStringToPngBase64(svgStr, 2400, 1600);
              } catch (e) {
                console.warn(`Could not generate single frame CAD PNG for row ${idx + 1}`, e);
              }
            }
            if (!drawingImageBase64) {
              const rowSvgEl = document.getElementById(`quotation-row-svg-${row.id}`);
              if (rowSvgEl) {
                try {
                  drawingImageBase64 = await svgElementToPngDataUrl(rowSvgEl as unknown as SVGElement);
                } catch (e) {
                  console.warn(`Could not extract CAD PNG for row ${idx + 1}`, e);
                }
              }
            }
          }

          const dimText = row.dimensions
            ? row.dimensions
            : liveFrame
            ? `${Math.round(liveFrame.width)} × ${Math.round(liveFrame.height)} mm`
            : '';

          const wVal = liveFrame ? liveFrame.width : 1200;
          const hVal = liveFrame ? liveFrame.height : 1500;
          const rowAreaStr = ((wVal * hVal) / (304.8 * 304.8)).toFixed(2);
          const rawRowArea = row.customValues?.['area'] || rowAreaStr;
          const rawRowRate = row.customValues?.['rate'] || displayBaseRate || '570';
          const computedAmt = Math.round(parseFloat(rawRowArea) * (parseFloat(rawRowRate.replace(/,/g, '')) || 570) * (row.qty || 1));
          const rawRowAmt = row.customValues?.['amount'] || computedAmt.toLocaleString('en-IN');

          return {
            srNo: row.srNo || idx + 1,
            drawingName: row.drawingName || 'uPVC Window / Door',
            glassName: row.glassName || '-',
            series: liveFrame?.series ? liveFrame.series.replace(/_/g, ' ') : '60mm uPVC',
            qty: row.qty || 1,
            area: rawRowArea,
            rate: rawRowRate,
            amount: rawRowAmt,
            dimensions: dimText,
            drawingImageBase64,
            frame: liveFrame,
          };
        })
      );

      const options: ExcelQuotationOptions = {
        project,
        columnWidths: getSavedExcelColumnWidths(),
        companyProfile: {
          name: companyProfile.companyName || (companyProfile as any).name || 'REMIX uPVC WINDOWS & DOORS',
          companyName: companyProfile.companyName || (companyProfile as any).name || 'REMIX uPVC WINDOWS & DOORS',
          tagline: companyProfile.tagline || 'Fabrication, Thermal & Acoustic Glazing Solutions',
          address: companyProfile.address,
          phone: companyProfile.phone,
          phone2: showCompanyPhone2 ? companyProfile.phone2 : undefined,
          email: companyProfile.email,
          gstin: companyProfile.gstin,
          logoUrl: companyLogo || companyProfile.logoUrl,
          bankName: bankDetails.bankName,
          accountName: bankDetails.accountHolder || companyProfile.companyName,
          accountNo: bankDetails.accountNo,
          ifsc: bankDetails.ifsc,
          branch: bankDetails.branchAddress,
          upiId: bankDetails.upiId,
        },
        clientName,
        refNo,
        quoteDate,
        validUntil,
        siteAddress,
        clientPhone,
        clientEmail,
        rows: rowsWithDrawings,
        summary: {
          baseItemLabel: baseItemLabel || 'uPVC Windows & Doors',
          totalArea: displayBaseSqFt || totalAreaSqFt.toFixed(2),
          rate: displayBaseRate,
          basePrice: displayBasePrice,
          charges: extraSummaryLines
            .filter((l) => l.price && parseFloat(l.price.replace(/,/g, '')) !== 0)
            .map((l) => ({
              label: l.label.replace(/[\u0900-\u097F]+/g, '').replace(/\(\s*[/\-–]?\s*\)/g, '').trim(),
              amount: l.price,
            })),
          totalAmountLabel: totalAmountLabel || 'TOTAL AMOUNT',
          totalAmount: (isUsingCustomTotal ? customTotalAmount : Math.round(effectiveCommercialTotal).toLocaleString('en-IN')) || effectiveTotalAmount.toLocaleString('en-IN'),
          advanceAmountLabel: advanceAmountLabel || 'ADVANCE AMOUNT RECEIVED',
          advanceAmount: (showAdvance && parsedAdvance > 0) ? parsedAdvance.toLocaleString('en-IN') : undefined,
          balanceLabel: balanceLabel || 'BALANCE DUE / NET PAYABLE',
          balanceAmount: (showAdvance && parsedAdvance > 0) ? netPayable.toLocaleString('en-IN') : undefined,
        },
        terms: paymentTerms && paymentTerms.length > 0 ? paymentTerms : undefined,
        guaranteeTerms: guaranteeTerms && guaranteeTerms.length > 0 ? guaranteeTerms : undefined,
        filename: `Quotation_${(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_CAD_Drawings.xlsx`,
      };

      const success = await downloadQuotationExcelWithCad(options);
      if (success) {
        setPdfToast('Excel Workbook (.xlsx) with CAD drawings downloaded! (3 tabs: CAD Elevations, Cutting Schedule & BOM)');
        setTimeout(() => setPdfToast(null), 5000);
      } else {
        setPdfToast('Could not download Excel file, please try again.');
        setTimeout(() => setPdfToast(null), 4000);
      }
    } catch (err) {
      console.error('Excel generation error:', err);
      setPdfToast('Error while generating Excel with CAD drawings.');
      setTimeout(() => setPdfToast(null), 4000);
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const [isGeneratingElevationExcel, setIsGeneratingElevationExcel] = useState<boolean>(false);

  const handleDownloadElevationSheetExcel = async (overrideWidths?: ElevationSheetColumnWidths) => {
    setIsGeneratingElevationExcel(true);
    setPdfToast('Creating Image-Style Quotation Sheet Excel (.xlsx)...');
    try {
      const calcArea = parseFloat(displayBaseSqFt || String(totalAreaSqFt)) || totalAreaSqFt;
      const calcRate = parseFloat(displayBaseRate) || 570;
      const calcBasePrice = parseFloat(displayBasePrice.replace(/,/g, '')) || 0;
      const cartageLine = extraSummaryLines.find((c) =>
        c.label.toLowerCase().includes('cartage') || c.label.toLowerCase().includes('freight')
      );
      const cartageAmt = cartageLine ? parseFloat(cartageLine.price.replace(/,/g, '')) || 0 : 0;

      const success = await downloadImageStyleQuotationExcel({
        companyName: companyProfile.companyName || (companyProfile as any).name || 'REMIX uPVC WINDOWS & DOORS',
        addressLine1: companyProfile.address || '',
        phone: companyProfile.phone || '',
        quoteNo: refNo || '001',
        quoteDate: quoteDate || new Date().toLocaleDateString('en-GB'),
        customerName: clientName || 'Client',
        customerPhone: clientPhone || '',
        siteAddress: siteAddress || '',
        items: rows.map((r, idx) => ({
          sNo: r.srNo || idx + 1,
          designName: r.name || 'Window',
          glass: r.glassName || 'Clear Glass',
          width: r.frame ? r.frame.width : 1200,
          height: r.frame ? r.frame.height : 1200,
          sqFt: Number(r.area) || Number((((r.frame?.width || 1200) * (r.frame?.height || 1200)) / 92903.04).toFixed(1)),
          frame: r.frame,
        })),
        financialSummary: {
          itemTitle: baseItemLabel || 'upvc Windows & Door',
          totalSqFt: calcArea,
          ratePerSqFt: calcRate,
          price: calcBasePrice,
          cartageAmount: cartageAmt,
          totalAmount: Math.round(effectiveCommercialTotal),
        },
        terms: paymentTerms,
        paymentTerms: paymentTerms && paymentTerms[0] ? paymentTerms[0] : '50% Advance After Deliver 40% Complete workout 10%',
        warrantyText: guaranteeTerms && guaranteeTerms[0] ? guaranteeTerms[0] : 'Hardware 5 year Profile 20 Years',
        filename: `Quotation_${(clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}_Elevation_Sheet.xlsx`,
        columnWidths: overrideWidths || getSavedElevationSheetExcelColWidths(),
      });
      if (success) {
        setPdfToast('Image-Style Elevation Sheet Excel downloaded! (इमेज जैसा कोटेशन एक्सेल डाउनलोड हो गया)');
        setTimeout(() => setPdfToast(null), 5000);
      }
    } catch (err) {
      console.error('Error generating elevation sheet excel:', err);
    } finally {
      setIsGeneratingElevationExcel(false);
    }
  };

  const handlePrint = () => {
    printQuotationSheet('custom-quotation-printable-sheet');
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Action Bar for Table Customizer */}
      <div className="w-full max-w-6xl mb-4 flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddColModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Add a custom column next to Glass Name"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Column</span>
          </button>

          <button
            onClick={() => handleAddRow(project.frames[0])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Add a new row / window item"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Row</span>
          </button>

          <button
            onClick={handleResetToProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
            title="Sync rows with current 2D CAD frames"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sync CAD Frames</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Logo Scale Switcher */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-semibold" title="Logo size in quotation">
            <span className="text-[10px] text-slate-500 px-1.5 font-bold uppercase">Logo:</span>
            {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setLogoScale(sz)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                  logoScale === sz ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Client Details & Address Visibility Toggles */}
          <button
            onClick={() => setShowClientBillingDetails(!showClientBillingDetails)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
              showClientBillingDetails
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
            }`}
            title={showClientBillingDetails ? 'Hide Client Billing Details' : 'Show Client Billing Details'}
          >
            {showClientBillingDetails ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Client</span>
          </button>

          <button
            onClick={() => setShowSiteAddress(!showSiteAddress)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
              showSiteAddress
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
            }`}
            title={showSiteAddress ? 'Hide Site Address' : 'Show Site Address'}
          >
            {showSiteAddress ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Address</span>
          </button>

          {/* Master Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs transition cursor-pointer border border-amber-400"
            title="Quotation Settings (Logo, Rates, Client Details Visibility, Payment Terms, Guarantee & Bank Details)"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>⚙️ Settings</span>
          </button>

          <button
            onClick={() => logoInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
            title="Upload Company Logo image"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>{companyLogo ? 'Change Logo' : 'Upload Logo'}</span>
          </button>
          <input
            type="file"
            ref={logoInputRef}
            onChange={handleLogoUpload}
            accept="image/*"
            className="hidden"
          />

          {companyLogo && (
            <button
              onClick={handleRemoveLogo}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition text-xs font-bold"
              title="Remove uploaded logo"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* 📗 CAD Drawing Excel Sheet (.xlsx) with embedded CAD elevation drawings */}
          <button
            onClick={handleDownloadExcel}
            disabled={isGeneratingExcel}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md transition cursor-pointer ${
              isGeneratingExcel
                ? 'bg-teal-800 text-white opacity-80 cursor-wait'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95 ring-2 ring-emerald-400/40'
            }`}
            title="Download full CAD Drawings in Microsoft Excel Sheet (.xlsx) with embedded drawings, cutting list & BOM"
          >
            {isGeneratingExcel ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            )}
            <span>{isGeneratingExcel ? 'Creating Excel...' : 'CAD Drawing Excel'}</span>
          </button>

          {/* 🖼️ Image-Style Elevation Sheet Excel (जैसा यूजर ने इमेज दिया है - Shri Balaji Format) */}
          <button
            onClick={() => handleDownloadElevationSheetExcel()}
            disabled={isGeneratingElevationExcel}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md transition cursor-pointer ${
              isGeneratingElevationExcel
                ? 'bg-amber-800 text-white opacity-80 cursor-wait'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-95 ring-2 ring-amber-300 font-black'
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
            title="Set column widths & space allocation for Excel export (एक्सेल में किस कॉलम को कितनी जगह मिलेगी)"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-700" />
            <span>कॉलम जगह/साइज (Column Space)</span>
          </button>

          {/* 🐍 Python ReportLab Vector PDF (100% Real Selectable Vector Text) */}
          <button
            onClick={handleDownloadPythonPdf}
            disabled={isGeneratingPythonPdf}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md transition cursor-pointer ${
              isGeneratingPythonPdf
                ? 'bg-emerald-800 text-white opacity-80 cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 ring-2 ring-emerald-400/40'
            }`}
            title="Generate Python Vector PDF with 100% selectable text, crisp tables and CAD elevations"
          >
            {isGeneratingPythonPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            )}
            <span>{isGeneratingPythonPdf ? 'Generating Python PDF...' : 'Python Vector PDF'}</span>
          </button>

          {/* High-Resolution Direct PDF Download */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-xs transition cursor-pointer ${
              isGeneratingPdf
                ? 'bg-rose-700 text-white opacity-80 cursor-wait'
                : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
            }`}
            title="Download Quotation as Ultra-HD lossless PDF file (380+ DPI, crystal clear text)"
          >
            {isGeneratingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingPdf ? 'Generating HD PDF...' : 'Download PDF (HD)'}</span>
          </button>

          {/* Direct Print Dialog / Vector PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
            title="Print or Save as Vector PDF using browser print dialog"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Print / Vector PDF</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE SHEET CONTAINER (A4-Ready Professional Table Layout)
         ========================================================================= */}
      <div
        id="custom-quotation-printable-sheet"
        className="custom-quotation-sheet w-full max-w-6xl bg-white border border-slate-200 shadow-xl rounded-2xl p-6 sm:p-10 flex flex-col gap-6 text-slate-900 print:shadow-none print:border-none print:p-0 print:max-w-full"
      >
        {/* =====================================================================
            1. COMPANY HEADER & CLIENT METADATA
           ===================================================================== */}
        <header className="border-b-2 border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
            {/* Company Logo & Identity */}
            <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 w-full min-w-0">
              {companyLogo ? (
                <div
                  className={`relative group shrink-0 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center bg-white p-2 shadow-xs transition-all ${
                    logoScale === 'sm'
                      ? 'w-24 h-20'
                      : logoScale === 'md'
                      ? 'w-32 h-24'
                      : logoScale === 'xl'
                      ? 'w-48 h-36'
                      : 'w-40 h-28'
                  }`}
                >
                  <img
                    src={companyLogo}
                    alt="Company Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/60 text-white text-[10px] font-bold flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer print:hidden gap-1">
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded text-white text-[10px] font-bold shadow-xs cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Change</span>
                    </button>
                    <button
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 px-2 py-0.5 rounded text-white text-[10px] font-bold shadow-xs cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className={`shrink-0 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex flex-col items-center justify-center shadow-md font-black tracking-tighter cursor-pointer group print:cursor-default transition-all ${
                    logoScale === 'sm'
                      ? 'w-24 h-20 text-xl'
                      : logoScale === 'md'
                      ? 'w-32 h-24 text-2xl'
                      : logoScale === 'xl'
                      ? 'w-48 h-36 text-3xl'
                      : 'w-40 h-28 text-2xl'
                  }`}
                  title="Click to upload company logo"
                >
                  <span>uP</span>
                  <span className="text-[9px] tracking-normal font-sans opacity-85 group-hover:underline print:hidden mt-0.5">
                    + Upload Logo
                  </span>
                </div>
              )}

              {/* Company Info & Address (Full width, never cut off) */}
              <div className="flex-1 w-full min-w-0">
                <input
                  type="text"
                  value={companyProfile.companyName}
                  onChange={(e) =>
                    setCompanyProfile({ ...companyProfile, companyName: e.target.value })
                  }
                  className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none"
                  placeholder="Company / Brand Name"
                />
                <input
                  type="text"
                  value={companyProfile.tagline || 'Fabrication, Thermal & Acoustic Glazing Solutions'}
                  onChange={(e) =>
                    setCompanyProfile({ ...companyProfile, tagline: e.target.value })
                  }
                  className="text-xs text-slate-600 font-semibold block w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none mt-0.5"
                  placeholder="Tagline / Business Category"
                />

                {/* Company Address Block - Multi-line auto-wrap, completely visible */}
                <div className="mt-2 text-[11px] text-slate-700 w-full flex items-start gap-1.5 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-800 shrink-0 select-none">📍 Address:</span>
                  <textarea
                    rows={2}
                    value={companyProfile.address}
                    onChange={(e) =>
                      setCompanyProfile({ ...companyProfile, address: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none text-[11px] font-medium leading-relaxed resize-none p-0 text-slate-800"
                    placeholder="Factory, Office or Showroom Full Address"
                  />
                </div>

                {/* Mobile Contacts & GSTIN Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-700 mt-2 font-medium">
                  {/* Primary Mobile */}
                  <span className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">📞 Mob:</span>
                    <input
                      type="text"
                      value={companyProfile.phone}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, phone: e.target.value })
                      }
                      className="w-28 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none text-[11px] font-mono font-bold text-slate-900"
                      placeholder="Primary Mobile"
                    />
                  </span>

                  {/* Extra Company Mobile Number */}
                  {companyProfile.phone2 || showCompanyPhone2 ? (
                    <span className="flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <span className="font-bold text-emerald-800">📱 Mob 2:</span>
                      <input
                        type="text"
                        value={companyProfile.phone2 || ''}
                        onChange={(e) =>
                          setCompanyProfile({ ...companyProfile, phone2: e.target.value })
                        }
                        className="w-28 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none text-[11px] font-mono font-bold text-emerald-950"
                        placeholder="Extra Mobile No."
                      />
                      <button
                        onClick={() => {
                          setCompanyProfile({ ...companyProfile, phone2: '' });
                          setShowCompanyPhone2(false);
                        }}
                        className="text-slate-400 hover:text-red-500 print:hidden text-xs cursor-pointer ml-0.5"
                        title="Remove Extra Mobile"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowCompanyPhone2(true)}
                      className="text-[10px] text-blue-700 font-bold hover:underline flex items-center gap-0.5 print:hidden cursor-pointer"
                      title="Add Extra Company Mobile Number"
                    >
                      <span>+ Add Extra Mobile</span>
                    </button>
                  )}

                  {/* GSTIN */}
                  <span className="flex items-center gap-1 font-mono font-bold text-blue-900">
                    <span>GSTIN:</span>
                    <input
                      type="text"
                      value={companyProfile.gstin}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, gstin: e.target.value })
                      }
                      className="w-36 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none text-[11px] uppercase font-bold text-blue-900"
                      placeholder="GSTIN Number"
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* Quotation Ref & Serial (REF: removed completely as requested) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[210px] text-right font-sans shrink-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700 mb-0.5">
                Detailed Quotation
              </div>
              <div className="text-base font-black font-mono text-slate-900 flex items-center justify-end gap-1">
                <span className="text-slate-400 font-mono text-xs select-none">#</span>
                <span className="hidden print:inline-block pdf-export-show font-mono font-black text-blue-900">{refNo}</span>
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="font-mono font-black text-right w-32 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none text-blue-900 print:hidden pdf-export-hide"
                  title="Quotation / Serial Number"
                  placeholder="QT-2026-001"
                />
              </div>
              <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-end gap-1">
                <span>Date:</span>
                <span className="hidden print:inline-block pdf-export-show font-mono">{quoteDate}</span>
                <input
                  type="text"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="text-right w-24 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none font-mono text-[11px] print:hidden pdf-export-hide"
                />
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                <span>Validity:</span>
                <span className="hidden print:inline-block pdf-export-show">{validUntil}</span>
                <input
                  type="text"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="text-right w-28 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none text-[10px] print:hidden pdf-export-hide"
                />
              </div>
            </div>
          </div>

          {/* Customer / Project Information Bar (Conditional Visibility as configured in settings) */}
          {(showClientBillingDetails || showSiteAddress) && (
            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Client / Billing Details Block */}
              {showClientBillingDetails && (
                <div
                  className={`bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 ${
                    !showSiteAddress ? 'sm:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                      Client / Billing Details:
                    </span>
                    <button
                      onClick={() => setShowClientBillingDetails(false)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 text-[10px] font-semibold print:hidden flex items-center gap-0.5 cursor-pointer"
                      title="Hide Client Billing Details"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>Hide</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="font-bold text-sm text-slate-900 w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none"
                    placeholder="Client Name"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="text-slate-700 w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none font-medium"
                      placeholder="Primary Mobile"
                    />

                    {/* Extra Client Mobile Number */}
                    {clientPhone2 || showClientPhone2 ? (
                      <div className="flex items-center gap-1 shrink-0 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        <span className="text-blue-800 text-[10px] font-bold">Mob 2:</span>
                        <input
                          type="text"
                          value={clientPhone2}
                          onChange={(e) => setClientPhone2(e.target.value)}
                          className="text-blue-950 w-28 bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none font-mono text-[11px] font-bold"
                          placeholder="Extra Mobile"
                        />
                        <button
                          onClick={() => {
                            setClientPhone2('');
                            setShowClientPhone2(false);
                          }}
                          className="text-slate-400 hover:text-red-500 print:hidden text-xs cursor-pointer"
                          title="Remove Extra Mobile"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowClientPhone2(true)}
                        className="text-[10px] text-blue-600 hover:underline shrink-0 print:hidden font-bold cursor-pointer"
                        title="Add Extra Client Mobile Number"
                      >
                        + Extra Mobile
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Site / Installation Address Block */}
              {showSiteAddress && (
                <div
                  className={`bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 ${
                    !showClientBillingDetails ? 'sm:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                      Site / Installation Address:
                    </span>
                    <button
                      onClick={() => setShowSiteAddress(false)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 text-[10px] font-semibold print:hidden flex items-center gap-0.5 cursor-pointer"
                      title="Hide Site Address"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>Hide</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    className="text-slate-700 font-medium w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none resize-none leading-relaxed"
                    placeholder="Site address and delivery location"
                  />
                </div>
              )}
            </div>
          )}

          {/* When either or both are hidden, show quick restore controls in screen view */}
          {(!showClientBillingDetails || !showSiteAddress) && (
            <div className="mt-3 flex items-center gap-3 text-xs bg-slate-50 border border-dashed border-slate-300 rounded-lg p-2.5 print:hidden">
              <span className="text-slate-600 font-semibold">Hidden Header Details:</span>
              {!showClientBillingDetails && (
                <button
                  onClick={() => setShowClientBillingDetails(true)}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1 cursor-pointer text-[11px] transition shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Show Client Details</span>
                </button>
              )}
              {!showSiteAddress && (
                <button
                  onClick={() => setShowSiteAddress(true)}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1 cursor-pointer text-[11px] transition shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Show Site Address</span>
                </button>
              )}
            </div>
          )}
        </header>

        {/* =====================================================================
            2. MAIN QUOTATION TABLE (Strictly Ordered as Requested)
               Sr.No | Window/Door Drawing | Qty | Drawing Name | Glass Name | [Custom Columns]
           ===================================================================== */}
        <section className="overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>Window & Door Schedule with CAD Elevation Drawings</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono">
                  {rows.length} Items
                </span>
              </h3>
            </div>

            {/* Drawing Display Controls (Hidden on Print) */}
            <div className="flex items-center flex-wrap gap-3 text-xs print:hidden">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 font-medium select-none">
                <input
                  type="checkbox"
                  checked={showDimensions}
                  onChange={(e) => setShowDimensions(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Dimensions</span>
              </label>

              {project.couplings && project.couplings.length > 0 && (
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-slate-900 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={showCoupledAssembly}
                    onChange={(e) => setShowCoupledAssembly(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>Coupled Assembly</span>
                </label>
              )}

              <button
                onClick={handleSyncAllCustomerDesigns}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition cursor-pointer border border-blue-200 shadow-xs"
                title="Load all window & door designs of this customer into quotation"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Load All Designs</span>
              </button>

              <button
                onClick={() => {
                  if (project.frames && project.frames.length > 0) {
                    setRows((prev) =>
                      prev.map((r) => {
                        const match = project.frames.find((f) => f.id === r.frameId);
                        if (match) {
                          return { ...r, frame: match };
                        }
                        return r;
                      })
                    );
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer border border-slate-300"
                title="Refresh drawings from latest CAD Studio changes"
              >
                <RefreshCw className="w-3 h-3 text-blue-600" />
                <span>Sync CAD</span>
              </button>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[11px]">
                {/* 1. Sr. No. */}
                <th className="border border-slate-300 px-3 py-2.5 text-center w-14">
                  Sr.No.
                </th>

                {/* 2. Window / Door Design Drawing (High-Fidelity CAD) */}
                <th className="border border-slate-300 px-3 py-2.5 text-center w-[395px] min-w-[385px]">
                  Window / Door Design Drawing (CAD)
                </th>

                {/* 3. Qty */}
                <th className="border border-slate-300 px-2 py-2.5 text-center w-16">
                  Qty
                </th>

                {/* 4. Drawing Name */}
                <th className="border border-slate-300 px-3 py-2.5 min-w-[180px]">
                  Drawing Name / Type
                </th>

                {/* 5. Glass Name */}
                <th className="border border-slate-300 px-3 py-2.5 min-w-[170px]">
                  Glass Name / Spec
                </th>

                {/* 6. Dynamic Custom Columns (Next to Glass) */}
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="border border-slate-300 px-2.5 py-2.5 bg-blue-50/50 text-blue-900 group relative"
                    style={{ width: col.width || '120px' }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="hidden print:inline-block pdf-export-show font-bold uppercase text-[11px] text-blue-900">
                        {col.name}
                      </span>
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => handleRenameColumn(col.id, e.target.value)}
                        className="bg-transparent font-bold uppercase text-[11px] text-blue-900 w-full focus:outline-none focus:bg-white px-1 py-0.5 rounded print:hidden pdf-export-hide"
                      />
                      <button
                        onClick={() => handleDeleteColumn(col.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-0.5 rounded transition print:hidden"
                        title="Delete this column"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}

                {/* Action column (hidden on print) */}
                <th className="border border-slate-300 px-2 py-2.5 text-center w-16 print:hidden">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, idx) => {
                const liveFrame =
                  (project.frames || []).find((f) => f.id === row.frameId) ||
                  row.frame ||
                  project.frames?.[0];

                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-300 hover:bg-slate-50/70 transition"
                  >
                    {/* 1. Sr. No. */}
                    <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-slate-700">
                      {row.srNo}
                    </td>

                    {/* 2. Window / Door Design Drawing (Exact Architectural CAD Drawing) */}
                    <td className="border border-slate-300 p-2.5 align-middle text-center bg-slate-50/40 w-[395px] min-w-[385px]">
                      <div className="flex flex-col items-center justify-center">
                        {(() => {
                          const isMultiCustomerView = Boolean(customerDesigns && customerDesigns.length > 0);
                          let targetFrames: UPVCFrame[] | undefined = undefined;
                          let targetCouplings: CouplingConnection[] = [];

                          if (isMultiCustomerView) {
                            targetFrames = row.frames && row.frames.length > 0 ? row.frames : liveFrame ? [liveFrame] : undefined;
                            targetCouplings = row.couplings || [];
                          } else if (showCoupledAssembly && project.frames && project.frames.length > 1) {
                            targetFrames = project.frames;
                            targetCouplings = project.couplings || [];
                          } else if (liveFrame && project.frames && project.frames.length > 1) {
                            targetFrames = getFrameCoupledCluster(liveFrame.id, project.frames, project.couplings);
                            targetCouplings = getCouplingsForFrames(targetFrames.map((f) => f.id), project.couplings);
                          } else if (liveFrame) {
                            targetFrames = [liveFrame];
                            targetCouplings = [];
                          } else if (row.frames && row.frames.length > 0) {
                            targetFrames = row.frames;
                            targetCouplings = row.couplings || [];
                          } else if (project.frames && project.frames.length > 0) {
                            targetFrames = project.frames;
                            targetCouplings = project.couplings || [];
                          }

                          // Calculate assembly envelope if multi-frame
                          let dimText = '';
                          if (targetFrames && targetFrames.length > 1) {
                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                            targetFrames.forEach((f) => {
                              minX = Math.min(minX, f.x);
                              minY = Math.min(minY, f.y);
                              maxX = Math.max(maxX, f.x + f.width);
                              maxY = Math.max(maxY, f.y + f.height);
                            });
                            dimText = `${Math.round(maxX - minX)} × ${Math.round(maxY - minY)} mm (${targetFrames.length} Coupled Frames)`;
                          } else if (liveFrame) {
                            dimText = `${Math.round(liveFrame.width)} × ${Math.round(liveFrame.height)} mm`;
                          }

                          return (
                            <>
                              <TableDrawingThumbnail
                                frame={liveFrame}
                                frames={targetFrames}
                                couplings={targetCouplings}
                                width={370}
                                height={245}
                                name={row.drawingName}
                                badgeTag={`W-${row.srNo}`}
                                showDimensions={showDimensions}
                              />
                              {dimText && (
                                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-700 font-mono font-bold w-full max-w-[370px] px-2.5 bg-white py-1.5 rounded border border-slate-200">
                                  <span>{dimText}</span>
                                  <span className="text-blue-600 print:hidden text-[10px] font-sans font-bold flex items-center gap-1">
                                    🔍 Click to Enlarge
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>

                  {/* 3. Qty */}
                  <td className="border border-slate-300 px-1.5 py-2 text-center align-middle">
                    <div className="hidden print:block pdf-export-show font-bold font-mono text-sm">
                      {row.qty}
                    </div>
                    <div className="flex items-center justify-center gap-1 print:hidden pdf-export-hide">
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-12 text-center font-bold font-mono text-sm py-1 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </td>

                  {/* 4. Drawing Name */}
                  <td className="border border-slate-300 px-3 py-2 align-middle">
                    <div className="hidden print:block pdf-export-show font-bold text-slate-900 text-xs whitespace-pre-wrap">
                      {row.drawingName || 'Window / Door'}
                    </div>
                    <textarea
                      rows={2}
                      value={row.drawingName}
                      onChange={(e) => handleUpdateRow(row.id, 'drawingName', e.target.value)}
                      className="w-full font-bold text-slate-900 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded px-1.5 py-1 text-xs resize-none focus:outline-none print:hidden pdf-export-hide"
                      placeholder="Enter window / door name"
                    />
                    {row.frame && (
                      <span className="text-[10px] text-slate-500 font-mono block px-1.5 print:px-0">
                        Outer: {Math.round(row.frame.width)}mm (W) × {Math.round(row.frame.height)}mm (H)
                      </span>
                    )}
                  </td>

                  {/* 5. Glass Name */}
                  <td className="border border-slate-300 px-3 py-2 align-middle">
                    <div className="hidden print:block pdf-export-show font-medium text-slate-800 text-xs">
                      {row.glassName || '-'}
                    </div>
                    <input
                      type="text"
                      value={row.glassName}
                      onChange={(e) => handleUpdateRow(row.id, 'glassName', e.target.value)}
                      className="w-full font-medium text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded px-1.5 py-1 text-xs focus:outline-none print:hidden pdf-export-hide"
                      placeholder="Glass type & thickness"
                    />
                  </td>

                  {/* 6. Dynamic Custom Columns */}
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className="border border-slate-300 px-2 py-2 align-middle bg-blue-50/20"
                    >
                      <div className="hidden print:block pdf-export-show font-mono text-xs font-semibold text-slate-800 text-right">
                        {row.customValues[col.id] || '-'}
                      </div>
                      <input
                        type="text"
                        value={row.customValues[col.id] || ''}
                        onChange={(e) =>
                          handleUpdateRowCustomVal(row.id, col.id, e.target.value)
                        }
                        className="w-full font-mono text-xs font-semibold text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded px-1.5 py-1 focus:outline-none text-right print:hidden pdf-export-hide"
                        placeholder={col.placeholder || '-'}
                      />
                    </td>
                  ))}

                  {/* Actions (hidden in print) */}
                  <td className="border border-slate-300 px-1 py-2 text-center align-middle print:hidden">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleDuplicateRow(row)}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                        title="Duplicate Row"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>

            {/* Total Summary Footer */}
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
              {/* Row 1: Columns Subtotal */}
              <tr>
                <td colSpan={2} className="border border-slate-300 px-3 py-2 text-right text-xs uppercase tracking-wider text-slate-700">
                  Subtotal Summary:
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center font-mono text-sm text-blue-800 font-black">
                  {totalUnits} Pcs
                </td>
                <td colSpan={2} className="border border-slate-300 px-3 py-2 text-xs text-slate-600">
                  Total Items: <b>{rows.length} Designs ({totalUnits} Total Units)</b>
                </td>
                {columns.map((col) => {
                  if (col.id === 'area') {
                    return (
                      <td key={col.id} className="border border-slate-300 px-2 py-2 text-right font-mono text-xs font-bold text-slate-900 bg-blue-50/50">
                        {totalAreaSqFt.toFixed(1)} Sq.Ft
                      </td>
                    );
                  }
                  if (col.id === 'amount') {
                    return (
                      <td key={col.id} className="border border-slate-300 px-2 py-2 text-right font-mono text-xs font-bold text-slate-800 bg-slate-50">
                        ₹{Math.round(calculatedGrandTotal).toLocaleString('en-IN')}
                      </td>
                    );
                  }
                  return (
                    <td key={col.id} className="border border-slate-300 px-2 py-2 text-right text-xs text-slate-400 bg-blue-50/20">
                      -
                    </td>
                  );
                })}
                <td className="border border-slate-300 px-1 py-2 print:hidden"></td>
              </tr>

            </tfoot>
          </table>

          {/* ========================================================================= */}
          {/* COMMERCIAL SUMMARY (MATCHING USER-SPECIFIED IMAGE EXACTLY) */}
          {/* ========================================================================= */}
          {(() => {
            const hasCartageLine = extraSummaryLines.some((l) =>
              l.label.toUpperCase().includes('CARTAGE')
            );
            const cartageLine = extraSummaryLines.find((l) =>
              l.label.toUpperCase().includes('CARTAGE')
            );

            return (
              <div className="commercial-summary-wrapper page-break-inside-avoid mt-5 w-full flex flex-col items-end">
                <div className="commercial-summary-box page-break-inside-avoid w-full max-w-2xl border-2 border-slate-900 bg-white shadow-sm print:max-w-none print:w-full">
                  {/* Top Banner: COMMERCIAL SUMMARY */}
                  <div className="border-b-2 border-slate-900 bg-slate-100 py-1.5 px-3 text-center flex items-center justify-between">
                    <span className="font-mono text-sm font-black tracking-widest text-slate-900 uppercase mx-auto">
                      COMMERCIAL SUMMARY
                    </span>
                  </div>

                  {/* CARTAGE OPTION CONTROL BAR (Directly Accessible) */}
                  <div className="bg-blue-50/80 border-b border-slate-400 px-3 py-1.5 flex items-center justify-between flex-wrap gap-2 text-xs print:hidden">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 font-bold text-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasCartageLine}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleAddExtraLine({
                                label: 'CARTAGE / FREIGHT',
                                price: '1,800.00',
                              });
                            } else {
                              if (cartageLine) handleDeleteExtraLine(cartageLine.id);
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="flex items-center gap-1 font-extrabold text-blue-950">
                          Cartage / Freight (Add Shipping)
                        </span>
                      </label>
                      {hasCartageLine && cartageLine && (
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-400 shadow-xs">
                          <span className="text-slate-500 font-mono text-xs">₹</span>
                          <input
                            type="text"
                            value={cartageLine.price}
                            onChange={(e) => handleUpdateExtraLine(cartageLine.id, { price: e.target.value })}
                            placeholder="1,800.00"
                            className="w-20 font-mono font-black text-slate-950 text-xs focus:outline-none"
                            title="Edit Cartage Amount"
                          />
                        </div>
                      )}
                    </div>
                    {/* Quick Cartage Presets */}
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-500 font-medium">Quick Cartage:</span>
                      {['1000', '1500', '1800', '2500'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            if (cartageLine) {
                              handleUpdateExtraLine(cartageLine.id, { price: Number(amt).toLocaleString('en-IN') + '.00' });
                            } else {
                              handleAddExtraLine({ label: 'CARTAGE / FREIGHT', price: Number(amt).toLocaleString('en-IN') + '.00' });
                            }
                          }}
                          className="px-1.5 py-0.5 bg-white hover:bg-slate-200 border border-slate-300 rounded text-slate-800 font-bold transition cursor-pointer"
                        >
                          ₹{amt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (cartageLine) {
                            handleUpdateExtraLine(cartageLine.id, { price: '0.00', label: 'CARTAGE / FREIGHT (FREE)' });
                          } else {
                            handleAddExtraLine({ label: 'CARTAGE / FREIGHT (FREE)', price: '0.00' });
                          }
                        }}
                        className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded text-emerald-900 font-black transition cursor-pointer"
                      >
                        FREE
                      </button>
                    </div>
                  </div>

              {/* Exact 4-Column Layout: Description | Sq.Ft. | Per Sq.Ft Amt | PRICE */}
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-50 font-bold text-slate-900 text-center">
                    <th className="border-r border-slate-900 px-3 py-2 text-left font-bold text-slate-900">
                      ITEM DESCRIPTION
                    </th>
                    <th className="border-r border-slate-900 px-2 py-2 text-center w-24 font-bold text-slate-900">
                      Sq.Ft.
                    </th>
                    <th className="border-r border-slate-900 px-2 py-2 text-center w-32 font-bold text-slate-900">
                      Per Sq.Ft Amt
                    </th>
                    <th className="px-3 py-2 text-right w-36 font-bold text-slate-900">
                      PRICE (₹)
                    </th>
                    <th className="w-8 print:hidden"></th>
                  </tr>
                </thead>

                <tbody>
                  {/* Row 1: upvc Windows & Door (Base Manufacturing Work) */}
                  <tr className="border-b border-slate-900 hover:bg-slate-50/60">
                    <td className="border-r border-slate-900 px-3 py-2">
                      <div className="hidden print:block pdf-export-show font-bold text-slate-900">
                        {baseItemLabel || 'upvc Windows & Door'}
                      </div>
                      <input
                        type="text"
                        value={baseItemLabel}
                        onChange={(e) => setBaseItemLabel(e.target.value)}
                        placeholder="upvc Windows & Door"
                        className="w-full bg-transparent font-bold text-slate-900 focus:outline-none focus:bg-amber-50/50 px-1 py-0.5 rounded print:hidden pdf-export-hide"
                        title="Click to edit item name"
                      />
                    </td>
                    <td className="border-r border-slate-900 px-2 py-2 text-center font-mono font-bold text-slate-800">
                      <div className="hidden print:block pdf-export-show text-center font-mono font-bold text-slate-800">
                        {displayBaseSqFt || '-'}
                      </div>
                      <input
                        type="text"
                        value={displayBaseSqFt}
                        onChange={(e) => setBaseItemSqFt(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder={Math.round(totalAreaSqFt).toString()}
                        className="w-full bg-transparent text-center font-mono font-bold text-slate-800 focus:outline-none focus:bg-amber-50/50 px-1 py-0.5 rounded print:hidden pdf-export-hide"
                        title="Click to edit total Sq.Ft."
                      />
                    </td>
                    <td className="border-r border-slate-900 px-2 py-2 text-center font-mono font-bold text-slate-800">
                      <div className="hidden print:block pdf-export-show text-center font-mono font-bold text-slate-800">
                        {displayBaseRate ? `₹ ${displayBaseRate}` : '-'}
                      </div>
                      <div className="flex items-center justify-center gap-0.5 print:hidden pdf-export-hide">
                        <span className="text-slate-500 font-sans">₹</span>
                        <input
                          type="text"
                          value={displayBaseRate}
                          onChange={(e) => setBaseItemRate(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="570.00"
                          className="w-20 bg-transparent text-center font-mono font-bold text-slate-800 focus:outline-none focus:bg-amber-50/50 px-1 py-0.5 rounded"
                          title="Click to edit rate per Sq.Ft."
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-black text-slate-950">
                      <div className="hidden print:block pdf-export-show font-mono font-black text-slate-950 text-right">
                        ₹ {displayBasePrice}
                      </div>
                      <div className="flex items-center justify-end gap-1 print:hidden pdf-export-hide">
                        <span className="text-slate-500 font-sans">₹</span>
                        <input
                          type="text"
                          value={displayBasePrice}
                          onChange={(e) => setBaseItemPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                          placeholder={Math.round(calculatedGrandTotal).toLocaleString('en-IN')}
                          className="w-28 bg-transparent text-right font-mono font-black text-slate-950 focus:outline-none focus:bg-amber-50/50 px-1 py-0.5 rounded"
                          title="Click to edit base price directly"
                        />
                      </div>
                    </td>
                    <td className="print:hidden text-center">
                      {(baseItemSqFt !== '' || baseItemRate !== '' || baseItemPrice !== '') && (
                        <button
                          onClick={() => {
                            setBaseItemSqFt('');
                            setBaseItemRate('');
                            setBaseItemPrice('');
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 p-0.5 cursor-pointer"
                          title="Reset to auto-calculated values"
                        >
                          ↺
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Extra Horizontal Lines (e.g. CARTAGE AMOUNT, INSTALLATION, HARDWARE, etc.) */}
                  {extraSummaryLines.map((line) => {
                    const formattedLinePrice = line.price && line.price.trim() !== '' ? line.price : '0.00';
                    return (
                      <tr key={line.id} className="border-b border-slate-900 hover:bg-slate-50/60 group">
                        <td className="border-r border-slate-900 px-3 py-1.5">
                          <div className={`hidden print:block pdf-export-show font-bold uppercase ${
                            line.isDeduction ? 'text-rose-700' : 'text-slate-800'
                          }`}>
                            {line.label || 'EXTRA CHARGE'}
                          </div>
                          <input
                            type="text"
                            value={line.label}
                            onChange={(e) => handleUpdateExtraLine(line.id, { label: e.target.value })}
                            placeholder="CARTAGE AMOUNT"
                            className={`w-full bg-transparent font-bold focus:outline-none focus:bg-amber-50/50 px-1 py-0.5 rounded uppercase print:hidden pdf-export-hide ${
                              line.isDeduction ? 'text-rose-700' : 'text-slate-800'
                            }`}
                            title="Edit Line Description"
                          />
                        </td>
                        <td className="border-r border-slate-900 px-2 py-1.5 text-center font-mono">
                          <div className="hidden print:block pdf-export-show text-center font-mono text-slate-700">
                            {line.sqFt || '-'}
                          </div>
                          <input
                            type="text"
                            value={line.sqFt}
                            onChange={(e) => handleUpdateExtraLine(line.id, { sqFt: e.target.value })}
                            placeholder="-"
                            className="w-full bg-transparent text-center font-mono text-slate-700 focus:outline-none focus:bg-amber-50/50 px-1 py-0.5 rounded print:hidden pdf-export-hide"
                            title="Sq.Ft (optional)"
                          />
                        </td>
                        <td className="border-r border-slate-900 px-2 py-1.5 text-center font-mono">
                          <div className="hidden print:block pdf-export-show text-center font-mono text-slate-700">
                            {line.rate ? `₹ ${line.rate}` : '-'}
                          </div>
                          <input
                            type="text"
                            value={line.rate}
                            onChange={(e) => handleUpdateExtraLine(line.id, { rate: e.target.value })}
                            placeholder="-"
                            className="w-full bg-transparent text-center font-mono text-slate-700 focus:outline-none focus:bg-amber-50/50 px-1 py-0.5 rounded print:hidden pdf-export-hide"
                            title="Per Sq.Ft Amt (optional)"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold">
                          <div className={`hidden print:block pdf-export-show font-mono font-bold text-right ${
                            line.isDeduction ? 'text-rose-700' : 'text-slate-900'
                          }`}>
                            {line.isDeduction ? '- ₹ ' : '₹ '}{formattedLinePrice}
                          </div>
                          <div className="flex items-center justify-end gap-1 print:hidden pdf-export-hide">
                            <span className={`font-sans ${line.isDeduction ? 'text-rose-600' : 'text-slate-500'}`}>
                              {line.isDeduction ? '- ₹' : '₹'}
                            </span>
                            <input
                              type="text"
                              value={line.price}
                              onChange={(e) => handleUpdateExtraLine(line.id, { price: e.target.value })}
                              placeholder="0.00"
                              className={`w-28 bg-transparent text-right font-mono font-bold focus:outline-none focus:bg-amber-50/50 px-1 py-0.5 rounded ${
                                line.isDeduction ? 'text-rose-700' : 'text-slate-900'
                              }`}
                              title="Price amount"
                            />
                          </div>
                        </td>
                        <td className="print:hidden text-center px-1">
                          <button
                            onClick={() => handleDeleteExtraLine(line.id)}
                            className="text-red-500 hover:text-red-700 p-1 opacity-60 group-hover:opacity-100 transition cursor-pointer"
                            title="Delete this line"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* TOTAL AMOUNT Row (Highlighted Bold Border matching image) */}
                  <tr className="border-t-2 border-b-2 border-slate-900 bg-amber-50/70 font-black">
                    <td colSpan={3} className="border-r border-slate-900 px-3 py-2 text-left">
                      <div className="hidden print:block pdf-export-show font-black tracking-wider text-slate-950 text-xs sm:text-sm uppercase">
                        {totalAmountLabel || 'TOTAL AMOUNT'}
                      </div>
                      <div className="flex items-center justify-between gap-2 print:hidden pdf-export-hide">
                        <input
                          type="text"
                          value={totalAmountLabel}
                          onChange={(e) => setTotalAmountLabel(e.target.value)}
                          className="bg-transparent font-black tracking-wider text-slate-950 text-xs sm:text-sm uppercase focus:outline-none w-full max-w-xs"
                          title="Edit Total Amount Label"
                        />
                        {isUsingCustomTotal && (
                          <button
                            onClick={() => {
                              setCustomTotalAmount('');
                              try {
                                localStorage.removeItem(`upvc_custom_quote_total_${project.id}`);
                              } catch (err) {}
                            }}
                            className="text-[10px] text-blue-700 bg-blue-100 hover:bg-blue-200 px-1.5 py-0.5 rounded font-semibold transition cursor-pointer shrink-0"
                            title="Revert to auto-calculated total"
                          >
                            ↺ Auto Sum
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm sm:text-base font-black text-slate-950">
                      <div className="hidden print:block pdf-export-show font-mono text-sm sm:text-base font-black text-slate-950 text-right">
                        ₹ {isUsingCustomTotal ? (parseFloat(customTotalAmount || '0').toLocaleString('en-IN')) : Math.round(effectiveCommercialTotal).toLocaleString('en-IN')}
                      </div>
                      <div className="flex items-center justify-end gap-1 print:hidden pdf-export-hide">
                        <span className="text-sm font-bold text-slate-700">₹</span>
                        <input
                          type="text"
                          value={
                            isUsingCustomTotal
                              ? customTotalAmount
                              : Math.round(effectiveCommercialTotal).toLocaleString('en-IN')
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setCustomTotalAmount(val);
                          }}
                          placeholder={Math.round(effectiveCommercialTotal).toLocaleString('en-IN')}
                          className="w-32 bg-transparent text-right font-mono font-black text-slate-950 focus:outline-none focus:bg-amber-100 px-1 py-0.5 rounded"
                          title="Edit Total Amount directly"
                        />
                      </div>
                    </td>
                    <td className="print:hidden text-center px-1">
                      <button
                        onClick={() => {
                          setShowAdvance((prev) => {
                            const next = !prev;
                            if (next && parsedAdvance === 0 && effectiveCommercialTotal > 0) {
                              setAdvanceAmount(String(Math.round(effectiveCommercialTotal * 0.5)));
                            }
                            return next;
                          });
                        }}
                        className={`p-1 rounded text-xs transition cursor-pointer flex items-center justify-center ${
                          showAdvance && parsedAdvance > 0
                            ? 'text-blue-700 hover:bg-blue-100'
                            : 'text-slate-400 hover:bg-slate-200'
                        }`}
                        title={
                          showAdvance && parsedAdvance > 0
                            ? 'Hide Advance Amount & Balance Due'
                            : 'Show Advance Amount & Balance Due'
                        }
                      >
                        {showAdvance && parsedAdvance > 0 ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* ADVANCE AMOUNT Hidden State Helper Bar (Screen Only) */}
                  {!showAdvance && (
                    <tr className="border-b border-slate-300 bg-slate-50/90 print:hidden pdf-export-hide">
                      <td colSpan={5} className="px-3 py-2 text-left">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 text-slate-600">
                            <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold">
                              Advance Amount & Balance Due is hidden — quotation shows Total Amount only
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setShowAdvance(true);
                              if (parsedAdvance === 0 && effectiveCommercialTotal > 0) {
                                const val = Math.round((effectiveCommercialTotal * 50) / 100);
                                setAdvanceAmount(String(val));
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-xs transition cursor-pointer"
                            title="Add Advance Amount to this quotation"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Advance Amount</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* ADVANCE AMOUNT & BALANCE DUE Rows (Shown when enabled) */}
                  {showAdvance && (
                    <>
                      {/* ADVANCE AMOUNT Row */}
                      <tr className={`border-b border-slate-900 bg-blue-50/70 ${parsedAdvance <= 0 ? 'print:hidden pdf-export-hide' : ''}`}>
                        <td colSpan={3} className="border-r border-slate-900 px-3 py-2 text-left">
                          <div className="hidden print:block pdf-export-show font-bold text-blue-950 text-xs uppercase">
                            {advanceAmountLabel || 'ADVANCE AMOUNT'}
                          </div>
                          <div className="flex items-center justify-between gap-2 flex-wrap print:hidden pdf-export-hide">
                            <input
                              type="text"
                              value={advanceAmountLabel}
                              onChange={(e) => setAdvanceAmountLabel(e.target.value)}
                              className="bg-transparent font-bold text-blue-950 text-xs uppercase focus:outline-none w-full max-w-xs"
                              title="Edit Advance Label"
                            />
                            {/* Quick % buttons, Clear, and Hide buttons */}
                            <div className="flex items-center gap-1.5 print:hidden">
                              <span className="text-[10px] text-slate-600 font-semibold">Quick %:</span>
                              {[50, 40, 30].map((pct) => (
                                <button
                                  key={pct}
                                  onClick={() => {
                                    const val = Math.round((effectiveCommercialTotal * pct) / 100);
                                    setAdvanceAmount(String(val));
                                    setShowAdvance(true);
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-white hover:bg-blue-100 text-blue-800 font-bold border border-blue-300 shadow-2xs transition cursor-pointer"
                                  title={`Set Advance to ${pct}% (₹${Math.round((effectiveCommercialTotal * pct) / 100).toLocaleString('en-IN')})`}
                                >
                                  {pct}%
                                </button>
                              ))}
                              {parsedAdvance > 0 && (
                                <button
                                  onClick={() => {
                                    setAdvanceAmount('0');
                                    setShowAdvance(false);
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer font-medium"
                                  title="Clear Advance Amount"
                                >
                                  Clear
                                </button>
                              )}
                              <button
                                onClick={() => setShowAdvance(false)}
                                className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition cursor-pointer"
                                title="Hide Advance Amount and Balance Due"
                              >
                                <EyeOff className="w-3 h-3" />
                                <span>Hide</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-blue-950">
                          <div className="hidden print:block pdf-export-show font-mono font-bold text-blue-950 text-right">
                            ₹ {Math.round(parsedAdvance).toLocaleString('en-IN')}
                          </div>
                          <div className="flex items-center justify-end gap-1 print:hidden pdf-export-hide">
                            <span className="text-blue-700 font-sans">₹</span>
                            <input
                              type="text"
                              value={advanceAmount}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                setAdvanceAmount(val);
                                if (parseFloat(val) > 0) {
                                  setShowAdvance(true);
                                }
                              }}
                              placeholder="0"
                              className="w-32 bg-transparent text-right font-mono font-bold text-blue-950 focus:outline-none focus:bg-blue-100 px-1 py-0.5 rounded"
                              title="Enter Advance Amount received"
                            />
                          </div>
                        </td>
                        <td className="print:hidden text-center px-1">
                          <button
                            onClick={() => setShowAdvance(false)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                            title="Hide Advance Row"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* BALANCE DUE Row */}
                      <tr className={`border-b border-slate-900 bg-emerald-100/80 font-black ${parsedAdvance <= 0 ? 'print:hidden pdf-export-hide' : ''}`}>
                        <td colSpan={3} className="border-r border-slate-900 px-3 py-2 text-left">
                          <div className="hidden print:block pdf-export-show font-black tracking-wide text-emerald-950 text-xs uppercase">
                            {balanceLabel || 'BALANCE DUE'}
                          </div>
                          <div className="flex items-center justify-between print:hidden pdf-export-hide">
                            <input
                              type="text"
                              value={balanceLabel}
                              onChange={(e) => setBalanceLabel(e.target.value)}
                              className="bg-transparent font-black tracking-wide text-emerald-950 text-xs uppercase focus:outline-none w-full max-w-xs"
                              title="Edit Balance Due Label"
                            />
                            <span className="text-[10px] text-emerald-800 font-normal italic">
                              (Net Payable = Total Amount - Advance)
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm sm:text-base font-black text-emerald-950">
                          ₹ {Math.round(netPayable).toLocaleString('en-IN')}
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              {/* Total in Words */}
              <div className="bg-slate-50 px-3 py-2 border-t border-slate-300 text-xs text-slate-800">
                <div>
                  <span className="font-bold text-slate-700">Total in Words: </span>
                  <span className="font-semibold text-blue-950 italic">
                    {numberToWordsINR(Math.round(effectiveCommercialTotal))}
                  </span>
                </div>
                {showAdvance && parsedAdvance > 0 && (
                  <div className="mt-1 pt-1 border-t border-slate-200 text-[11px] text-emerald-900">
                    <span className="font-bold">Balance Due in Words: </span>
                    <span className="font-semibold italic">{numberToWordsINR(Math.round(netPayable))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons to Add Extra Horizontal Lines and Toggle Advance */}
            <div className="mt-2.5 flex items-center justify-between w-full max-w-2xl print:hidden flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleAddExtraLine()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="Add an extra line to Commercial Summary table"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Extra Line</span>
                </button>

                {/* Advance Amount Hide/Show Toggle Button */}
                <button
                  onClick={() => {
                    setShowAdvance((prev) => {
                      const next = !prev;
                      if (next && parsedAdvance === 0 && effectiveCommercialTotal > 0) {
                        const defaultVal = Math.round(effectiveCommercialTotal * 0.5);
                        setAdvanceAmount(String(defaultVal));
                      }
                      return next;
                    });
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer border ${
                    showAdvance && parsedAdvance > 0
                      ? 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                  title="Toggle Advance Amount & Balance Due in Quotation Table"
                >
                  {showAdvance && parsedAdvance > 0 ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Advance: Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>+ Advance: Hidden</span>
                    </>
                  )}
                </button>

                {/* Quick Preset Chips */}
                <button
                  onClick={() => handleAddExtraLine({ label: 'CARTAGE / FREIGHT', price: '1,800.00' })}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[11px] font-semibold transition cursor-pointer"
                  title="Add Cartage row"
                >
                  + Cartage
                </button>
                <button
                  onClick={() => handleAddExtraLine({ label: 'INSTALLATION / FITTING', price: '4,500.00' })}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[11px] font-semibold transition cursor-pointer"
                  title="Add Installation row"
                >
                  + Fitting
                </button>
                <button
                  onClick={() => handleAddExtraLine({ label: 'SPECIAL HARDWARE / MESH', price: '2,500.00' })}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[11px] font-semibold transition cursor-pointer"
                  title="Add Hardware row"
                >
                  + Hardware
                </button>
                <button
                  onClick={() => {
                    const gstVal = Math.round((numericBasePrice * 18) / 100);
                    handleAddExtraLine({ label: 'GST @ 18%', price: gstVal.toLocaleString('en-IN') });
                  }}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-bold transition cursor-pointer"
                  title="Add 18% GST row"
                >
                  + GST 18%
                </button>
                <button
                  onClick={() => handleAddExtraLine({ label: 'SPECIAL DISCOUNT', price: '2,000.00', isDeduction: true })}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded text-[11px] font-bold transition cursor-pointer"
                  title="Add Discount deduction"
                >
                  - Discount
                </button>
              </div>
            </div>
          </div>
        );
      })()}

          {/* Quick Add Row & Add Column Helper Bar */}
          <div className="mt-2 flex items-center justify-between text-xs print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddRow()}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add Row</span>
              </button>

              <button
                onClick={() => setShowAddColModal(true)}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add Column</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Total Units: {rows.reduce((sum, r) => sum + (r.qty || 1), 0)} Pcs
            </span>
          </div>
        </section>

        {/* =====================================================================
            3. FOOTER SECTION (Strictly as Requested)
               - Bank Account Details: Account Number, Bank Name, Branch Address, IFSC Code
               - Guarantee / Warranty Terms
               - Payment Type / Payment Terms
           ===================================================================== */}
        <footer className="quotation-footer-block page-break-inside-avoid border-t-2 border-slate-800 pt-5 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 3A. BANK ACCOUNT DETAILS */}
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Bank & Account Details</span>
                  </h4>
                  <span className="text-[9px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                    RTGS / NEFT / IMPS
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                      Account Number:
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountNo}
                      onChange={(e) =>
                        setBankDetails({ ...bankDetails, accountNo: e.target.value })
                      }
                      className="font-mono font-bold text-slate-900 w-full bg-white px-2 py-1 rounded border border-slate-200 focus:border-blue-500 focus:outline-none"
                      placeholder="e.g. 50200012345678"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                      Bank Name:
                    </label>
                    <input
                      type="text"
                      value={bankDetails.bankName}
                      onChange={(e) =>
                        setBankDetails({ ...bankDetails, bankName: e.target.value })
                      }
                      className="font-semibold text-slate-900 w-full bg-white px-2 py-1 rounded border border-slate-200 focus:border-blue-500 focus:outline-none"
                      placeholder="e.g. HDFC BANK LTD / SBI"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                      Branch Address:
                    </label>
                    <input
                      type="text"
                      value={bankDetails.branchAddress}
                      onChange={(e) =>
                        setBankDetails({ ...bankDetails, branchAddress: e.target.value })
                      }
                      className="text-slate-800 w-full bg-white px-2 py-1 rounded border border-slate-200 focus:border-blue-500 focus:outline-none text-[11px]"
                      placeholder="e.g. Okhla Phase II, New Delhi"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                      IFSC Code:
                    </label>
                    <input
                      type="text"
                      value={bankDetails.ifsc}
                      onChange={(e) =>
                        setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })
                      }
                      className="font-mono font-bold text-blue-900 uppercase w-full bg-white px-2 py-1 rounded border border-slate-200 focus:border-blue-500 focus:outline-none"
                      placeholder="e.g. HDFC0000123"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                      Beneficiary / Account Holder:
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountHolder}
                      onChange={(e) =>
                        setBankDetails({ ...bankDetails, accountHolder: e.target.value })
                      }
                      className="text-slate-800 w-full bg-white px-2 py-1 rounded border border-slate-200 focus:border-blue-500 focus:outline-none text-[11px]"
                      placeholder="Company Account Holder Name"
                    />
                  </div>
                </div>
              </div>

              {bankDetails.upiId && (
                <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                  <span>UPI ID: <b className="font-mono">{bankDetails.upiId}</b></span>
                </div>
              )}
            </div>

            {/* 3B. GUARANTEE / WARRANTY TERMS ("GARENTY") */}
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Guarantee & Warranty</span>
                  </h4>
                  <button
                    onClick={() => setGuaranteeTerms((prev) => [...prev, 'New Warranty Term'])}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer print:hidden"
                  >
                    + Add Point
                  </button>
                </div>

                <div className="space-y-2 text-[11px] text-slate-700">
                  {guaranteeTerms.map((term, i) => (
                    <div key={i} className="flex items-start gap-1.5 group">
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                      <textarea
                        rows={2}
                        value={term}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGuaranteeTerms((prev) =>
                            prev.map((t, idx) => (idx === i ? val : t))
                          );
                        }}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded px-1 resize-none focus:outline-none leading-relaxed"
                      />
                      <button
                        onClick={() =>
                          setGuaranteeTerms((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 transition print:hidden"
                        title="Remove term"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500 italic">
                * All warranties valid with genuine factory maintenance guidelines.
              </div>
            </div>

            {/* 3C. PAYMENT TERMS / PAYMENT TYPE */}
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>Payment Terms & Type</span>
                  </h4>
                  <button
                    onClick={() => setPaymentTerms((prev) => [...prev, 'New Payment Term'])}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer print:hidden"
                  >
                    + Add Point
                  </button>
                </div>

                <div className="space-y-2 text-[11px] text-slate-700">
                  {paymentTerms.map((term, i) => (
                    <div key={i} className="flex items-start gap-1.5 group">
                      <span className="font-mono font-bold text-amber-700 mt-0.5">{i + 1}.</span>
                      <textarea
                        rows={2}
                        value={term}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPaymentTerms((prev) =>
                            prev.map((t, idx) => (idx === i ? val : t))
                          );
                        }}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:bg-white rounded px-1 resize-none focus:outline-none leading-relaxed"
                      />
                      <button
                        onClick={() =>
                          setPaymentTerms((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 transition print:hidden"
                        title="Remove term"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500 italic">
                * Prices exclusive of crane lifting unless explicitly mentioned in contract.
              </div>
            </div>
          </div>

          {/* 4. SIGNATURES & ACCEPTANCE BLOCK */}
          <div className="pt-8 mt-4 border-t border-slate-200 flex flex-row items-end justify-between px-4">
            <div className="text-center">
              <div className="w-48 border-t border-slate-400 mx-auto mb-1.5"></div>
              <span className="text-xs font-bold text-slate-700 block">Customer Acceptance & Signature</span>
              <span className="text-[10px] text-slate-400">(Accepted all drawings & terms)</span>
            </div>

            <div className="text-center">
              <div className="w-56 border-t border-slate-400 mx-auto mb-1.5"></div>
              <span className="text-xs font-bold text-slate-900 block">
                For {companyProfile.companyName || 'REMIX uPVC'}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">Authorized Signatory & Stamp</span>
            </div>
          </div>
        </footer>
      </div>

      {/* =====================================================================
          POPUP MODAL: ADD CUSTOM COLUMN
         ===================================================================== */}
      {showAddColModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  + Add Custom Column
                </h3>
                <p className="text-xs text-slate-500">
                  This column will be added next to Glass Name
                </p>
              </div>
              <button
                onClick={() => setShowAddColModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddColumn(newColName);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Column Title:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Rate (₹/Sq.Ft) or Mesh Type or Location"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">
                  Quick Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {columnPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddColumn(preset)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddColModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newColName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Add Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          POPUP MODAL: MASTER QUOTATION DEFAULTS SETTINGS (Settings Button)
         ===================================================================== */}
      <QuotationSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onApplyToCurrent={handleApplyMasterDefaultsToCurrent}
        currentQuotationValues={{
          companyLogo,
          baseItemLabel,
          baseItemRate,
          defaultExtraLines: extraSummaryLines,
          totalAmountLabel,
          advanceAmountLabel,
          balanceLabel,
          paymentTerms,
          guaranteeTerms,
          bankDetails: {
            bankName: bankDetails.bankName,
            accountNo: bankDetails.accountNo,
            branch: bankDetails.branchAddress,
            ifsc: bankDetails.ifsc,
            accountHolder: bankDetails.accountHolder,
            upiId: bankDetails.upiId,
          },
        }}
      />

      {/* =====================================================================
          POPUP MODAL: EXCEL COLUMN WIDTHS & SPACE SETTINGS
         ===================================================================== */}
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
      {pdfToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-emerald-500/50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{pdfToast}</span>
          <button
            onClick={() => setPdfToast(null)}
            className="text-slate-400 hover:text-white text-xs font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
