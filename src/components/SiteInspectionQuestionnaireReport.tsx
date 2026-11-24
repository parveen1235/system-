import React, { useState, useEffect, useRef } from 'react';
import { CustomerRecord, CustomerDesignCardItem } from '../types/erp';
import { downloadQuotationPdf } from '../utils/exportUtils';
import {
  Download,
  Printer,
  FileSpreadsheet,
  Edit3,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  Search,
  Building2,
  User,
  Calendar,
  Phone,
  MapPin,
  ClipboardCheck,
  ShieldCheck,
  HelpCircle,
  Save,
  FileText,
  Sparkles,
} from 'lucide-react';

export interface InspectionQuestion {
  id: string;
  section: string;
  questionNumber: string;
  questionText: string;
  questionHindi?: string;
  standardSpec?: string;
  status: 'pass' | 'fail' | 'in_progress' | 'na';
  remarks: string;
}

export interface SiteInspectionQuestionnaireReportProps {
  customer?: CustomerRecord | { id: string; name?: string; phone?: string; brand?: string; siteAddress?: string };
  designs?: CustomerDesignCardItem[];
  defaultReportNo?: string;
  onClose?: () => void;
}

const DEFAULT_QUESTIONS: InspectionQuestion[] = [
  // SECTION 1: CIVIL APERTURE & MEASUREMENT
  {
    id: 'q-1-1',
    section: '1. Civil Opening & Aperture Verification (चिनाई एवं ओपनिंग माप)',
    questionNumber: 'Q-01',
    questionText: 'Are the masonry aperture dimensions (Width, Height, Diagonals) within ±2mm tolerance of approved CAD drawings?',
    questionHindi: 'क्या चिनाई ओपनिंग का आकार (चौड़ाई, ऊंचाई, विकर्ण) स्वीकृत CAD ड्राइंग के ±2mm के भीतर है?',
    standardSpec: 'Tolerance: ±2mm diagonal squareness confirmed before frame anchor drilling.',
    status: 'pass',
    remarks: 'Aperture diagonals verified with laser tape. Squareness is 100% true.',
  },
  {
    id: 'q-1-2',
    section: '1. Civil Opening & Aperture Verification (चिनाई एवं ओपनिंग माप)',
    questionNumber: 'Q-02',
    questionText: 'Is the bottom sill granite / marble ledge level with adequate outward slope (3° to 5°) for rain water runoff?',
    questionHindi: 'क्या नीचे की सिल/ग्रेनाइट लेवल में है और पानी निकासी के लिए 3° से 5° का ढलान है?',
    standardSpec: 'Outward slope ≥ 3° to avoid water pooling beneath the outer track.',
    status: 'pass',
    remarks: 'Granite sill checked with spirit level. 4° outward slope confirmed.',
  },
  {
    id: 'q-1-3',
    section: '1. Civil Opening & Aperture Verification (चिनाई एवं ओपनिंग माप)',
    questionNumber: 'Q-03',
    questionText: 'Is stable 220V/15A electric power supply available at site for screw drilling and silicone gun heating?',
    questionHindi: 'क्या साइट पर इंस्टॉलेशन टूल्स एवं सिलिकॉन के लिए बिजली आपूर्ति उपलब्ध है?',
    standardSpec: 'Site facility verified for fabrication and anchoring tools.',
    status: 'pass',
    remarks: 'Power point verified next to bedroom and hall windows.',
  },

  // SECTION 2: FRAME EXTRUSION & STEEL REINFORCEMENT
  {
    id: 'q-2-1',
    section: '2. Outer Frame & GI Steel Reinforcement (आउटर फ्रेम एवं जी.आई. स्टील)',
    questionNumber: 'Q-04',
    questionText: 'Has 1.5mm / 1.2mm Galvanized Iron (GI) steel reinforcement pipe been inserted inside all outer frame & mullion chambers with -100mm corner weld deductions?',
    questionHindi: 'क्या सभी आउटर फ्रेम और मुल्लियन में 1.5mm/1.2mm जी.आई. स्टील रीइन्फोर्समेंट डाला गया है?',
    standardSpec: 'IS:14392 & EN 12608 standards; corner deduction 50mm on each end.',
    status: 'pass',
    remarks: 'Factory inspection confirmed; zinc coating 120 GSM verified.',
  },
  {
    id: 'q-2-2',
    section: '2. Outer Frame & GI Steel Reinforcement (आउटर फ्रेम एवं जी.आई. स्टील)',
    questionNumber: 'Q-05',
    questionText: 'Are frame fastener screw anchor points spaced at maximum 300mm pitch and 150mm from welded corners?',
    questionHindi: 'क्या फ्रेम फास्टनर स्क्रू कोनों से 150mm और आपस में 300mm की दूरी पर लगे हैं?',
    standardSpec: 'Rawl plug fasteners 10x100mm torqued securely into RCC/brickwork.',
    status: 'pass',
    remarks: 'Anchored into concrete columns and brick lintels as per standard.',
  },
  {
    id: 'q-2-3',
    section: '2. Outer Frame & GI Steel Reinforcement (आउटर फ्रेम एवं जी.आई. स्टील)',
    questionNumber: 'Q-06',
    questionText: 'Are factory drainage weep-hole slots de-burred and protected with external snap-on drainage caps?',
    questionHindi: 'क्या पानी निकासी के ड्रेनेज स्लॉट्स साफ हैं और उन पर कैप्स लगे हैं?',
    standardSpec: '2 drainage slots per pocket min 5x25mm with UV-stabilized caps.',
    status: 'pass',
    remarks: 'Snap-on drainage caps firmly seated on all lower tracks.',
  },

  // SECTION 3: SASHES, ROLLERS & CASEMENT OPERATION
  {
    id: 'q-3-1',
    section: '3. Sash Assembly, Rollers & Operation (सैश, रोलर एवं संचालन)',
    questionNumber: 'Q-07',
    questionText: 'For Sliding Windows: Do adjustable brass/nylon tandem rollers slide friction-free across the aluminium track without wobbling?',
    questionHindi: 'स्लाइडिंग विंडो: क्या रोलर्स एल्युमिनियम ट्रैक पर बिना अटके स्मूथ चल रहे हैं?',
    standardSpec: 'Operating force ≤ 30N; height leveling adjusted via allen screw.',
    status: 'pass',
    remarks: 'Roller heights balanced; sashes glide effortlessly with finger push.',
  },
  {
    id: 'q-3-2',
    section: '3. Sash Assembly, Rollers & Operation (सैश, रोलर एवं संचालन)',
    questionNumber: 'Q-08',
    questionText: 'For Casement / French Windows: Is the central meeting sash / false mullion (बीच का सैश प्रोफाइल) aligned with flush bolts and handles?',
    questionHindi: 'केसमेंट / फ्रेंच विंडो: क्या बीच की सैश प्रोफाइल (फॉल्स मुल्लियन) और हैंडल पूरी तरह सही बैठ रहे हैं?',
    standardSpec: 'Dual leaf french casement meeting gap sealed with EPDM star gasket.',
    status: 'pass',
    remarks: 'Master & slave leaves lock airtight; central false mullion seal is 100% snug.',
  },
  {
    id: 'q-3-3',
    section: '3. Sash Assembly, Rollers & Operation (सैश, रोलर एवं संचालन)',
    questionNumber: 'Q-09',
    questionText: 'Are high-density silicone wool pile weather-strips and interlock fins installed to block dust and sound penetration?',
    questionHindi: 'क्या धूल और शोर रोकने के लिए वूलपाइल एवं इंटरलॉक फिन्स लगे हैं?',
    standardSpec: 'Fin-seal wool pile 6x7mm inserted on all sash perimeter grooves.',
    status: 'pass',
    remarks: 'Triple-fin wool pile confirmed; blocks outside road noise.',
  },

  // SECTION 4: GLASS, GLAZING BEADS & SILICONE SEALING
  {
    id: 'q-4-1',
    section: '4. Glass, Glazing Beads & Weather Sealing (ग्लास एवं सिलिकॉन सीलिंग)',
    questionNumber: 'Q-10',
    questionText: 'Is the glass free of scratches, bubbles, edge chips, and certified with ISI toughened glass stamp in the corner?',
    questionHindi: 'क्या ग्लास स्क्रैच-रहित है और कोने में टफन्ड ग्लास का ISI मार्क मौजूद है?',
    standardSpec: 'Toughened glass float quality according to IS 2553 standards.',
    status: 'pass',
    remarks: '6mm Clear Toughened Glass with permanent corner laser monogram inspected.',
  },
  {
    id: 'q-4-2',
    section: '4. Glass, Glazing Beads & Weather Sealing (ग्लास एवं सिलिकॉन सीलिंग)',
    questionNumber: 'Q-11',
    questionText: 'Are all 45° miter-cut glazing beads tightly snapped into frame channels without gaps or bulging?',
    questionHindi: 'क्या सभी 45° कटिंग वाले ग्लाज़िंग बीड्स बिना किसी गैप के मजबूती से लॉक हैं?',
    standardSpec: 'Zero corner separation; EPDM co-extruded wedge gasket compression.',
    status: 'pass',
    remarks: 'Miter corners flush and tight.',
  },
  {
    id: 'q-4-3',
    section: '4. Glass, Glazing Beads & Weather Sealing (ग्लास एवं सिलिकॉन सीलिंग)',
    questionNumber: 'Q-12',
    questionText: 'Has non-staining, UV-resistant neutral cure weather silicone sealant been applied continuously along the outer perimeter gap (6mm - 10mm)?',
    questionHindi: 'क्या बाहर की तरफ पूरे फ्रेम के चारों ओर न्यूट्रल वेदर सिलिकॉन सीलेंट भरा गया है?',
    standardSpec: 'Neutral silicone with backing foam rod to prevent monsoon water ingress.',
    status: 'pass',
    remarks: 'Wacker / Dow Corning neutral silicone applied with smooth tooling.',
  },

  // SECTION 5: CLEANING, PROTECTION & CUSTOMER HANDOVER
  {
    id: 'q-5-1',
    section: '5. Cleaning, Protection Tape & Client Handover (सफाई एवं अंतिम हैंडओवर)',
    questionNumber: 'Q-13',
    questionText: 'Have protective surface films been peeled off (or instructed to client if civil painting is pending)?',
    questionHindi: 'क्या प्रोफाइल की सुरक्षात्मक टेप हटा दी गई है अथवा क्लाइंट को निर्देश दे दिया गया है?',
    standardSpec: 'Adhesive tape must not be exposed to direct sun for > 30 days to avoid gummy residue.',
    status: 'pass',
    remarks: 'Client advised; protective film removed from internal visible faces.',
  },
  {
    id: 'q-5-2',
    section: '5. Cleaning, Protection Tape & Client Handover (सफाई एवं अंतिम हैंडओवर)',
    questionNumber: 'Q-14',
    questionText: 'Has the client been demonstrated key operation, friction stay opening restriction, and drainage maintenance?',
    questionHindi: 'क्या क्लाइंट को चाबी, लॉक, हैंडल संचालन और सफाई का डेमो दिया गया है?',
    standardSpec: 'Operational demonstration and warranty documentation handed over.',
    status: 'pass',
    remarks: 'Full working demonstration provided to owner at site.',
  },
];

export const SiteInspectionQuestionnaireReport: React.FC<SiteInspectionQuestionnaireReportProps> = ({
  customer,
  designs = [],
  defaultReportNo = 'INSP-001',
  onClose,
}) => {
  const customerId = customer?.id || 'default';
  const storageKey = `upvc_inspection_questions_${customerId}`;

  // Report details
  const [reportNo, setReportNo] = useState(defaultReportNo);
  const [inspectionDate, setInspectionDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [inspectorName, setInspectorName] = useState('Er. Amit Sharma (Lead QA Engineer)');
  const [siteSupervisor, setSiteSupervisor] = useState('Rajesh Verma');
  const [clientRepresentative, setClientRepresentative] = useState(customer?.name || 'Customer / Site Incharge');

  // PDF File Name (user request: "pdf ka name likh sake")
  const defaultFileName = () => {
    const custClean = (customer?.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `Site_Inspection_Questionnaire_${custClean}_${reportNo}`;
  };
  const [pdfFileName, setPdfFileName] = useState(defaultFileName);

  // Editable Questions State
  const [questions, setQuestions] = useState<InspectionQuestion[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not parse saved inspection questions:', e);
    }
    return DEFAULT_QUESTIONS;
  });

  // UI state
  const [isEditMode, setIsEditMode] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail' | 'in_progress' | 'na'>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState<string | null>(null);

  // New Question form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionHindi, setNewQuestionHindi] = useState('');
  const [newQuestionSection, setNewQuestionSection] = useState('1. Civil Opening & Aperture Verification (चिनाई एवं ओपनिंग माप)');
  const [newQuestionSpec, setNewQuestionSpec] = useState('');
  const [newQuestionStatus, setNewQuestionStatus] = useState<'pass' | 'fail' | 'in_progress' | 'na'>('pass');
  const [newQuestionRemarks, setNewQuestionRemarks] = useState('');

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(questions));
    } catch (e) {
      console.warn('Could not save questions to localStorage:', e);
    }
  }, [questions, storageKey]);

  // Available unique sections
  const existingSections = Array.from(new Set(questions.map((q) => q.section)));

  // Filtered questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      !searchFilter ||
      q.questionText.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (q.questionHindi && q.questionHindi.toLowerCase().includes(searchFilter.toLowerCase())) ||
      q.remarks.toLowerCase().includes(searchFilter.toLowerCase()) ||
      q.section.toLowerCase().includes(searchFilter.toLowerCase()) ||
      q.questionNumber.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group by section
  const groupedBySection = existingSections.map((sec) => ({
    section: sec,
    items: filteredQuestions.filter((q) => q.section === sec),
  })).filter((grp) => grp.items.length > 0);

  // Metrics
  const totalCount = questions.length;
  const passCount = questions.filter((q) => q.status === 'pass').length;
  const failCount = questions.filter((q) => q.status === 'fail').length;
  const inProgressCount = questions.filter((q) => q.status === 'in_progress').length;
  const naCount = questions.filter((q) => q.status === 'na').length;
  const passPercentage = totalCount > 0 ? Math.round((passCount / (totalCount - naCount || 1)) * 100) : 100;

  // Handlers for Question Editing
  const handleUpdateQuestion = (id: string, field: keyof InspectionQuestion, value: any) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm('Are you sure you want to delete this inspection question? (क्या आप यह प्रश्न हटाना चाहते हैं?)')) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all questions back to factory standard default inspection checklist? (सभी प्रश्न डिफ़ॉल्ट पर रीसेट करें?)')) {
      setQuestions(DEFAULT_QUESTIONS);
      localStorage.removeItem(storageKey);
    }
  };

  const handleAddNewQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const nextNum = `Q-${String(questions.length + 1).padStart(2, '0')}`;
    const newQ: InspectionQuestion = {
      id: `q-custom-${Date.now()}`,
      section: newQuestionSection.trim() || 'Custom Inspection Checks (अतिरिक्त जांच प्रश्न)',
      questionNumber: nextNum,
      questionText: newQuestionText.trim(),
      questionHindi: newQuestionHindi.trim() || undefined,
      standardSpec: newQuestionSpec.trim() || 'Factory Standard Quality Check',
      status: newQuestionStatus,
      remarks: newQuestionRemarks.trim() || 'Verified on site.',
    };

    setQuestions((prev) => [...prev, newQ]);
    setNewQuestionText('');
    setNewQuestionHindi('');
    setNewQuestionSpec('');
    setNewQuestionRemarks('');
    setShowAddModal(false);
  };

  // PDF Export Handler (user request: "pdf daunlod or pdf ka name likh sake")
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setPdfSuccessToast(null);

    // Ensure clean file name
    let cleanName = pdfFileName.trim();
    if (!cleanName) {
      cleanName = defaultFileName();
    }
    if (!cleanName.toLowerCase().endsWith('.pdf')) {
      cleanName = `${cleanName}.pdf`;
    }

    try {
      // Direct call to high-resolution exporter
      const success = await downloadQuotationPdf('site-inspection-printable-sheet', cleanName);
      if (success) {
        setPdfSuccessToast(`PDF successfully downloaded: ${cleanName}`);
      } else {
        // Fallback to print
        window.print();
      }
    } catch (err) {
      console.error('PDF export failed:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
      setTimeout(() => setPdfSuccessToast(null), 6000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* =========================================================================
          CONTROL TOOLBAR: EDIT MODE, PDF FILE NAME INPUT, DOWNLOAD PDF BUTTON
         ========================================================================= */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4 print:hidden">
        {/* Left: Title & Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                Site Inspection Questionnaire (प्रश्नावली रिपोर्ट)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                100% Editable
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Edit questions, set pass/fail status, type custom PDF file name, and download instant high-DPI PDF.
            </p>
          </div>
        </div>

        {/* Center / Right: PDF File Name Input & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Custom PDF File Name Input (User: "pdf ka name likh sake") */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-blue-500 transition-colors grow sm:grow-0">
            <span className="text-[11px] font-bold text-slate-400 mr-2 shrink-0 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              PDF Name:
            </span>
            <input
              type="text"
              value={pdfFileName}
              onChange={(e) => setPdfFileName(e.target.value)}
              placeholder="e.g. Site_Inspection_Report"
              className="bg-transparent text-xs text-white font-mono focus:outline-hidden w-44 sm:w-60"
              title="Type your custom PDF filename here (पीडीएफ का नाम लिखें)"
            />
            <span className="text-[11px] text-slate-400 font-mono">.pdf</span>
          </div>

          {/* Edit / Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isEditMode
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Toggle between inline editing and print preview mode"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditMode ? 'Editing Mode (चालू)' : 'Preview Mode'}</span>
          </button>

          {/* Add Question Button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Add a new custom question to the report (नया प्रश्न जोड़ें)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Question (प्रश्न जोड़ें)</span>
          </button>

          {/* DOWNLOAD PDF BUTTON (User: "pdf daunlod") */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-60 text-white rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg border border-emerald-400/30"
            title="Download this inspection report as a vector/lossless PDF file"
          >
            {isExportingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download PDF (पीडीएफ डाउनलोड)</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            title="Print or Save via Browser Print Dialog"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {/* Reset Questions */}
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="p-2 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-xl text-xs transition cursor-pointer border border-slate-700"
            title="Reset questions to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {pdfSuccessToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-3 animate-fade-in print:hidden shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><b>Success:</b> {pdfSuccessToast}</span>
          </div>
          <button
            onClick={() => setPdfSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          FILTER & QUICK STATS BAR
         ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs print:hidden">
        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5 grow">
          <div className="relative grow sm:grow-0 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search question, keyword, or note..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pass')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === 'pass' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Pass ({passCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('fail')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === 'fail' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Defect ({failCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('in_progress')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === 'in_progress' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pending ({inProgressCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('na')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                statusFilter === 'na' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              N/A ({naCount})
            </button>
          </div>
        </div>

        {/* Quality Score Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">QA Audit Score</span>
            <span className="text-xs font-black text-slate-900">
              {passCount} / {totalCount - naCount} Passed
            </span>
          </div>
          <div
            className={`px-3 py-1.5 rounded-xl font-black text-sm flex items-center gap-1.5 shadow-2xs ${
              passPercentage >= 90
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : passPercentage >= 75
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{passPercentage}%</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE REPORT SHEET (CAPTURED BY html2canvas & jsPDF)
         ========================================================================= */}
      <div
        id="site-inspection-printable-sheet"
        className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900 font-sans print:border-none print:p-0 print:shadow-none"
      >
        {/* REPORT HEADER */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-blue-900 text-white font-black text-[11px] tracking-wider uppercase">
                  uPVC & Aluminium Engineering QA Report
                </span>
                <span className="text-xs font-bold text-slate-500">ISO 9001:2015 Compliant</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                SITE INSPECTION & QUALITY AUDIT QUESTIONNAIRE
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                साइट माप, इंस्टॉलेशन गुणवत्ता एवं प्री-डिस्पैच प्रश्नावली रिपोर्ट
              </p>
            </div>

            {/* Document Reference Info */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 sm:text-right shrink-0 min-w-[220px]">
              <div className="flex sm:justify-end items-center gap-1.5">
                <span className="text-slate-500 font-bold">Report No:</span>
                {isEditMode ? (
                  <input
                    type="text"
                    value={reportNo}
                    onChange={(e) => setReportNo(e.target.value)}
                    className="font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right w-24"
                  />
                ) : (
                  <b className="font-mono text-slate-900">{reportNo}</b>
                )}
              </div>
              <div className="flex sm:justify-end items-center gap-1.5">
                <span className="text-slate-500 font-bold">Date:</span>
                {isEditMode ? (
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="font-semibold text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right"
                  />
                ) : (
                  <b className="text-slate-900">{inspectionDate}</b>
                )}
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                Customer Ref: <b className="text-blue-700">{customer?.id || 'BALAJI-001'}</b>
              </div>
            </div>
          </div>

          {/* Customer & Site Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-black block">Customer / Client</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{customer?.name || 'Walk-in Client'}</p>
              <p className="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400" />
                {customer?.phone || '+91 9971742045'}
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-black block">Site Address / Location</span>
              <p className="font-semibold text-slate-900 text-[11px] mt-0.5 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{customer?.siteAddress || customer?.address || 'Site Under Inspection, New Delhi'}</span>
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-black block">Inspection Officers</span>
              <div className="space-y-1 mt-0.5">
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500">Lead QA:</span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded px-1 py-0.5 w-full"
                    />
                  ) : (
                    <b className="text-slate-900">{inspectorName}</b>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500">Supervisor:</span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={siteSupervisor}
                      onChange={(e) => setSiteSupervisor(e.target.value)}
                      className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded px-1 py-0.5 w-full"
                    />
                  ) : (
                    <span className="text-slate-800">{siteSupervisor}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QUESTIONS SECTIONS & TABLES */}
        <div className="space-y-6">
          {groupedBySection.map((grp, secIdx) => (
            <div key={grp.section} className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
              {/* Section Header */}
              <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">
                    {secIdx + 1}
                  </span>
                  <span>{grp.section}</span>
                </div>
                <span className="text-[11px] text-slate-300 font-normal">
                  {grp.items.length} questions
                </span>
              </div>

              {/* Questions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <th className="py-2 px-3 w-14 text-center">Ref</th>
                      <th className="py-2 px-3">Question & Engineering Standard (प्रश्न एवं तकनीकी मानक)</th>
                      <th className="py-2 px-3 w-40 text-center">Status (स्थिति)</th>
                      <th className="py-2 px-3 w-64">Site Observations / Remarks (टिप्पणी)</th>
                      {isEditMode && <th className="py-2 px-2 w-12 text-center print:hidden">Del</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {grp.items.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Ref Badge */}
                        <td className="py-2.5 px-3 text-center align-top font-mono font-bold text-blue-700">
                          {q.questionNumber}
                        </td>

                        {/* Question Text (Editable in Edit Mode) */}
                        <td className="py-2.5 px-3 align-top space-y-1">
                          {isEditMode ? (
                            <div className="space-y-1">
                              <textarea
                                value={q.questionText}
                                onChange={(e) => handleUpdateQuestion(q.id, 'questionText', e.target.value)}
                                rows={2}
                                className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded p-1.5 focus:border-blue-500 focus:outline-hidden"
                                placeholder="Question in English..."
                              />
                              <input
                                type="text"
                                value={q.questionHindi || ''}
                                onChange={(e) => handleUpdateQuestion(q.id, 'questionHindi', e.target.value)}
                                className="w-full text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:border-blue-500 focus:outline-hidden"
                                placeholder="प्रश्न हिंदी में (वैकल्पिक)..."
                              />
                              <input
                                type="text"
                                value={q.standardSpec || ''}
                                onChange={(e) => handleUpdateQuestion(q.id, 'standardSpec', e.target.value)}
                                className="w-full text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:border-blue-500 focus:outline-hidden"
                                placeholder="Engineering standard / tolerance..."
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-slate-900 leading-snug">{q.questionText}</p>
                              {q.questionHindi && (
                                <p className="text-[11px] text-slate-600 font-medium mt-0.5">{q.questionHindi}</p>
                              )}
                              {q.standardSpec && (
                                <p className="text-[10px] text-slate-500 font-mono mt-1 bg-slate-100 px-2 py-0.5 rounded inline-block">
                                  Standard: {q.standardSpec}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status (Pass, Fail, In Progress, NA) */}
                        <td className="py-2.5 px-3 align-top text-center">
                          {isEditMode ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(q.id, 'status', 'pass')}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-0.5 ${
                                  q.status === 'pass'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-emerald-800 hover:bg-emerald-50'
                                }`}
                                title="Mark as Pass (ठीक है)"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>OK</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(q.id, 'status', 'fail')}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-0.5 ${
                                  q.status === 'fail'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-rose-800 hover:bg-rose-50'
                                }`}
                                title="Mark as Defect / Fail (त्रुटि)"
                              >
                                ✕
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(q.id, 'status', 'in_progress')}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                  q.status === 'in_progress'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-amber-800 hover:bg-amber-50'
                                }`}
                                title="Mark as In Progress (प्रगति पर)"
                              >
                                ⏳
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(q.id, 'status', 'na')}
                                className={`px-1.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                  q.status === 'na'
                                    ? 'bg-slate-700 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title="Not Applicable (लागू नहीं)"
                              >
                                NA
                              </button>
                            </div>
                          ) : (
                            <div>
                              {q.status === 'pass' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>PASSED (स्वीकृत)</span>
                                </span>
                              )}
                              {q.status === 'fail' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black border border-rose-300">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>DEFECT (सुधार आवश्यक)</span>
                                </span>
                              )}
                              {q.status === 'in_progress' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>IN PROGRESS</span>
                                </span>
                              )}
                              {q.status === 'na' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-300">
                                  <span>N / A</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Remarks (Editable in Edit Mode) */}
                        <td className="py-2.5 px-3 align-top">
                          {isEditMode ? (
                            <textarea
                              value={q.remarks}
                              onChange={(e) => handleUpdateQuestion(q.id, 'remarks', e.target.value)}
                              rows={2}
                              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded p-1.5 focus:border-blue-500 focus:outline-hidden"
                              placeholder="Write observation or remarks..."
                            />
                          ) : (
                            <p className="text-xs text-slate-700 italic">
                              {q.remarks || 'No issues noted.'}
                            </p>
                          )}
                        </td>

                        {/* Delete Button (Edit Mode only) */}
                        {isEditMode && (
                          <td className="py-2.5 px-2 align-top text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Delete this question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* SIGNATURES & HANDOVER ACCEPTANCE BLOCK */}
        <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          {/* Site Supervisor Sign */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between h-32">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-black block">Site Supervisor Sign-off</span>
              <p className="font-bold text-slate-800 mt-1">{siteSupervisor}</p>
            </div>
            <div className="border-b border-dashed border-slate-400 pb-1 text-right text-[10px] text-slate-400 font-mono">
              Signature & Date
            </div>
          </div>

          {/* Quality Assurance Engineer Sign */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between h-32">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-black block">Lead QA Engineer</span>
              <p className="font-bold text-slate-800 mt-1">{inspectorName}</p>
            </div>
            <div className="border-b border-dashed border-slate-400 pb-1 text-right text-[10px] text-slate-400 font-mono">
              Seal & Approval
            </div>
          </div>

          {/* Customer Acceptance Sign */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between h-32">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-black block">Customer Acceptance</span>
              {isEditMode ? (
                <input
                  type="text"
                  value={clientRepresentative}
                  onChange={(e) => setClientRepresentative(e.target.value)}
                  className="font-bold text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs w-full mt-1"
                />
              ) : (
                <p className="font-bold text-slate-800 mt-1">{clientRepresentative}</p>
              )}
            </div>
            <div className="border-b border-dashed border-slate-400 pb-1 text-right text-[10px] text-slate-400 font-mono">
              Customer Sign
            </div>
          </div>
        </div>

        {/* FOOTER NOTE */}
        <div className="pt-2 text-[10px] text-slate-500 text-center border-t border-slate-200 flex items-center justify-between">
          <span>Official Factory Document • Shri Balaji Traders uPVC & Aluminium Fabrication</span>
          <span>PDF Name: {pdfFileName}.pdf • Page 1 of 1</span>
        </div>
      </div>

      {/* =========================================================================
          MODAL: ADD NEW CUSTOM QUESTION (नया प्रश्न जोड़ें)
         ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">Add New Inspection Question (नया प्रश्न जोड़ें)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewQuestion} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Section / Category (विभाग / श्रेणी)
                </label>
                <input
                  type="text"
                  list="sections-list"
                  value={newQuestionSection}
                  onChange={(e) => setNewQuestionSection(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                  placeholder="Select or type new category..."
                  required
                />
                <datalist id="sections-list">
                  {existingSections.map((sec) => (
                    <option key={sec} value={sec} />
                  ))}
                  <option value="6. Hardware, Hinges & Friction Stays (हार्डवेयर एवं फ्रिक्शन स्टे)" />
                  <option value="7. Acoustic & Thermal Insulation (साउंडप्रूफिंग एवं इंसुलेशन)" />
                  <option value="8. Custom Site Check (साइट विशेष जांच)" />
                </datalist>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Question Text (अंग्रेजी में प्रश्न) *
                </label>
                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-hidden focus:border-blue-500"
                  placeholder="e.g. Has structural neutral silicone been tested with water nozzle?"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Hindi Question Translation (हिंदी अनुवाद - वैकल्पिक)
                </label>
                <input
                  type="text"
                  value={newQuestionHindi}
                  onChange={(e) => setNewQuestionHindi(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-hidden focus:border-blue-500"
                  placeholder="उदा. क्या पानी के दबाव से सिलिकॉन लीकेज टेस्ट किया गया?"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Engineering Specification / Tolerance (मानक)
                </label>
                <input
                  type="text"
                  value={newQuestionSpec}
                  onChange={(e) => setNewQuestionSpec(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden focus:border-blue-500"
                  placeholder="e.g. 5.5 bar pressure test for 5 minutes"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial Status</label>
                  <select
                    value={newQuestionStatus}
                    onChange={(e) => setNewQuestionStatus(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="pass">Pass (स्वीकृत - OK)</option>
                    <option value="fail">Defect (सुधार आवश्यक)</option>
                    <option value="in_progress">In Progress (प्रगति पर)</option>
                    <option value="na">N/A (लागू नहीं)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Site Observation Note</label>
                  <input
                    type="text"
                    value={newQuestionRemarks}
                    onChange={(e) => setNewQuestionRemarks(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                    placeholder="e.g. Verified on site without issues."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Question (प्रश्न जोड़ें)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
