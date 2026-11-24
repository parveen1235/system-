import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Bot,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Sliders,
  Maximize2,
  Eye,
  FileText,
  FileCheck,
  Check,
  Zap,
  ShieldCheck,
  RotateCw,
  Cpu,
  HelpCircle,
  Crop,
  ChevronRight,
} from 'lucide-react';
import { UPVCProject, UPVCFrame } from '../types/upvc';
import {
  analyzeImageGeometry,
  performTokenFreeOcr,
  parsePaperDrawingContent,
  buildProjectFromPaperScan,
  PaperScanResult,
  SAMPLE_PAPER_ORDERS,
  SamplePaperOrder,
} from '../utils/paperCadVisionEngine';

interface PaperScanCadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyProject: (newProject: UPVCProject) => void;
  onOpen3D?: () => void;
  onOpenCuttingList?: () => void;
  onOpenQuotation?: () => void;
  lang?: 'hi' | 'en';
}

export const PaperScanCadModal: React.FC<PaperScanCadModalProps> = ({
  isOpen,
  onClose,
  onApplyProject,
  onOpen3D,
  onOpenCuttingList,
  onOpenQuotation,
  lang = 'hi',
}) => {
  if (!isOpen) return null;

  // Active step: 'input' | 'analyzing' | 'review' | 'applied'
  const [step, setStep] = useState<'input' | 'analyzing' | 'review' | 'applied'>('input');
  const [inputTab, setInputTab] = useState<'upload' | 'camera' | 'samples'>('upload');

  // Image states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [preprocessedSrc, setPreprocessedSrc] = useState<string | null>(null);
  const [showEnhancedImage, setShowEnhancedImage] = useState(false);

  // Analysis states
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [scanResult, setScanResult] = useState<PaperScanResult | null>(null);

  // Camera streaming
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Editable fields in review
  const [customWidth, setCustomWidth] = useState<number>(1500);
  const [customHeight, setCustomHeight] = useState<number>(1500);
  const [customTypology, setCustomTypology] = useState<string>('slider_2t');
  const [customMullions, setCustomMullions] = useState<number>(0);
  const [customHasTopLight, setCustomHasTopLight] = useState<boolean>(false);
  const [customColor, setCustomColor] = useState<string>('white');
  const [customGlass, setCustomGlass] = useState<string>('clear_6mm');
  const [customSeries, setCustomSeries] = useState<string>('slider_2track');

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when closing or changing tabs
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError(
        lang === 'hi'
          ? 'कैमरा खोलने में असमर्थ। कृपया फ़ोटो अपलोड विकल्प का उपयोग करें या कैमरा अनुमति दें।'
          : 'Unable to access camera. Please allow camera permissions or use the upload file option.'
      );
      setCameraActive(false);
    }
  };

  // Capture Photo from Camera
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    startAnalysis(dataUrl);
  };

  // Handle File Upload or Drag-and-Drop
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        startAnalysis(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run the 100% Free Local Analysis Engine
  const startAnalysis = async (sourceDataUrl: string, sampleTextOverride?: string) => {
    setImageSrc(sourceDataUrl);
    setStep('analyzing');
    setProgressPercent(10);
    setProgressStatus(lang === 'hi' ? 'कागज़ की ज्यामिति और किनारों का विश्लेषण हो रहा है...' : 'Analyzing paper geometry & frame edges...');

    const img = new Image();
    img.src = sourceDataUrl;
    img.onload = async () => {
      try {
        // 1. Computer Vision geometry & line detection on HTML5 Canvas
        setProgressPercent(25);
        setProgressStatus(lang === 'hi' ? 'सफेद-काले स्ट्रोक और ग्रिड लाइनें खोजी जा रही हैं...' : 'Detecting ink strokes & division mullions...');
        const geom = await analyzeImageGeometry(img);
        setPreprocessedSrc(geom.preprocessedDataUrl);

        // 2. Token-Free OCR (runs inside browser worker)
        setProgressPercent(45);
        setProgressStatus(lang === 'hi' ? 'हैंडराइटिंग और माप पढ़े जा रहे हैं (WebAssembly OCR)...' : 'Reading handwriting & dimensions (Zero Tokens)...');

        let rawOcrText = sampleTextOverride || '';
        if (!sampleTextOverride) {
          rawOcrText = await performTokenFreeOcr(geom.preprocessedDataUrl, (pct, msg) => {
            setProgressPercent(pct);
            setProgressStatus(msg);
          });
        }

        // 3. Rule-Based uPVC Drawing Brain Synthesis
        setProgressPercent(85);
        setProgressStatus(lang === 'hi' ? 'uPVC इंजीनियरिंग नियमों और सैश असाइनमेंट को तैयार किया जा रहा है...' : 'Applying uPVC engineering rules & sash layouts...');

        const result = parsePaperDrawingContent(rawOcrText, geom);
        setScanResult(result);

        // Initialize review form with detected values
        setCustomWidth(result.width);
        setCustomHeight(result.height);
        setCustomTypology(result.typology);
        setCustomMullions(result.mullionCount);
        setCustomHasTopLight(result.transomCount > 0 || result.typology.includes('toplight'));
        setCustomColor(result.color);
        setCustomGlass(result.glassType);
        setCustomSeries(result.series);

        setProgressPercent(100);
        setProgressStatus(lang === 'hi' ? 'विश्लेषण पूरा! परिणाम तैयार हैं।' : 'Analysis complete! Results ready.');

        setTimeout(() => {
          setStep('review');
        }, 500);
      } catch (err) {
        console.error('Analysis error:', err);
        // Fallback result if OCR had an issue
        const fallbackGeom = { aspectRatio: 1.0, detectedCols: 2, detectedRows: 1, hasTopLight: false };
        const result = parsePaperDrawingContent(sampleTextOverride || '', fallbackGeom);
        setScanResult(result);
        setCustomWidth(result.width);
        setCustomHeight(result.height);
        setCustomTypology(result.typology);
        setStep('review');
      }
    };
  };

  // Pick a pre-built sample paper order
  const handleSelectSample = (sample: SamplePaperOrder) => {
    startAnalysis(sample.sampleImageUrl, sample.mockOcrText);
  };

  // Generate CAD project and apply to main app
  const handleGenerateCad = () => {
    if (!scanResult) return;

    // Build synthesized result with any user modifications
    const finalResult: PaperScanResult = {
      ...scanResult,
      width: Number(customWidth) || 1500,
      height: Number(customHeight) || 1500,
      typology: customTypology as any,
      mullionCount: customMullions,
      transomCount: customHasTopLight ? 1 : 0,
      color: customColor,
      glassType: customGlass as any,
      series: customSeries,
    };

    const newProject = buildProjectFromPaperScan(
      finalResult,
      `Scanned Order ${finalResult.width}×${finalResult.height} mm`
    );

    onApplyProject(newProject);
    setStep('applied');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* ========================================================================= */}
        {/* HEADER                                                                    */}
        {/* ========================================================================= */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {lang === 'hi' ? 'AI Paper-to-CAD Scanner Bot' : 'AI Paper-to-CAD Scanner Bot'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  0 Tokens Used (100% Free)
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-medium">
                  In-Browser WebAssembly
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'hi'
                  ? 'हाथ से बना पर्चा या स्केच स्कैन करें — बिना किसी टोकन या खर्च के सीधे CAD में ड्रॉइंग तैयार!'
                  : 'Scan paper notepad / hand sketch — builds production-ready CAD drawing with zero external API tokens!'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="बंद करें (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* BODY CONTAINER                                                            */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/90">

          {/* ----------------------------------------------------------------------- */}
          {/* STEP 1: INPUT MODES (UPLOAD / CAMERA / SAMPLES)                        */}
          {/* ----------------------------------------------------------------------- */}
          {step === 'input' && (
            <div className="space-y-5">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 max-w-md mx-auto">
                <button
                  onClick={() => {
                    stopCamera();
                    setInputTab('upload');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    inputTab === 'upload'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'फोटो अपलोड करें' : 'Upload Photo'}</span>
                </button>

                <button
                  onClick={() => {
                    setInputTab('camera');
                    startCamera();
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    inputTab === 'camera'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'कैमरा से खीचें' : 'Use Camera'}</span>
                </button>

                <button
                  onClick={() => {
                    stopCamera();
                    setInputTab('samples');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    inputTab === 'samples'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'सैंपल पर्चा (Demo)' : 'Sample Orders'}</span>
                </button>
              </div>

              {/* TAB 1: UPLOAD AREA */}
              {inputTab === 'upload' && (
                <div className="max-w-2xl mx-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 sm:p-12 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-800/30 transition group flex flex-col items-center justify-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-600/20 transition duration-200 mb-4">
                      <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      {lang === 'hi' ? 'हाथ से लिखे पर्चे या स्केच की फोटो यहाँ डालें' : 'Upload Hand Sketch or Order Note Photo'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mb-4">
                      {lang === 'hi'
                        ? 'साइट डायरी, रसीद, या कागज़ पर खींची खिड़की/दरवाज़े की ड्राइंग (PNG, JPG, WEBP) सिलेक्ट करें।'
                        : 'Drag and drop or browse for notebook sketches, contractor slips, or drawing prints.'}
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{lang === 'hi' ? 'कंप्यूटर या फ़ोन से फ़ोटो चुनें' : 'Select Photo from Device'}</span>
                    </button>
                  </div>

                  {/* Token-free badge banner */}
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-emerald-400">
                        {lang === 'hi' ? '100% मुफ़्त और सुरक्षित (Zero Token Engine):' : '100% Free & Private (Zero Token Engine):'}
                      </span>{' '}
                      <span className="text-slate-300">
                        {lang === 'hi'
                          ? 'आपकी फोटो किसी भी सर्वर पर नहीं भेजी जाती। सभी कैलकुलेशन और OCR आपके ब्राउज़र के अंदर ही WebAssembly द्वारा होते हैं।'
                          : 'Your photos stay strictly inside your browser. Geometry detection and OCR process locally without any external token billing.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE CAMERA CAPTURE */}
              {inputTab === 'camera' && (
                <div className="max-w-xl mx-auto flex flex-col items-center">
                  <div className="relative w-full aspect-4/3 bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Scanner Framing Box Overlay */}
                    <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                      <div className="flex justify-between items-center text-[11px] font-bold text-emerald-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs w-max">
                        <span>{lang === 'hi' ? 'कागज़ को इस फ्रेम के अंदर रखें' : 'Align paper sketch inside this frame'}</span>
                      </div>
                      <div className="flex justify-end text-[10px] text-slate-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs w-max self-end">
                        <span>W × H & Typology</span>
                      </div>
                    </div>

                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
                        <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                        <p className="text-xs text-slate-300 mb-4">{cameraError}</p>
                        <button
                          onClick={startCamera}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                        >
                          पुनः प्रयास करें (Retry)
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={capturePhoto}
                      disabled={!cameraActive}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{lang === 'hi' ? 'स्केच की फोटो खींचें (Capture Photo)' : 'Capture Paper Sketch'}</span>
                    </button>

                    <button
                      onClick={startCamera}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="कैमरा रिफ्रेश करें"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: ONE-CLICK SAMPLE SKETCH ORDERS */}
              {inputTab === 'samples' && (
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'hi' ? 'तुरंत टेस्ट करें (1-क्लिक में चलाएं)' : 'Test Instantly with Real-World Hand Sketches'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {lang === 'hi'
                        ? 'यदि आपके पास अभी कोई पर्चा नहीं है, तो नीचे दिए गए किसी भी सैंपल पर क्लिक करें:'
                        : 'If you do not have a paper drawing right now, click any sample below to see the bot in action:'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {SAMPLE_PAPER_ORDERS.map((sample) => (
                      <div
                        key={sample.id}
                        onClick={() => handleSelectSample(sample)}
                        className="bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 rounded-xl p-3.5 cursor-pointer transition flex flex-col justify-between group"
                      >
                        <div>
                          <div className="w-full h-36 rounded-lg bg-white overflow-hidden mb-3 border border-slate-700/50 flex items-center justify-center p-2 group-hover:border-blue-500/40 transition">
                            <img
                              src={sample.sampleImageUrl}
                              alt={sample.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition mb-1">
                            {lang === 'hi' ? sample.titleHindi : sample.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {sample.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-blue-400 font-semibold">
                          <span>{lang === 'hi' ? 'स्कैन करें' : 'Analyze & Build'}</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* STEP 2: LIVE IN-BROWSER COMPUTER VISION & OCR SCANNING                  */}
          {/* ----------------------------------------------------------------------- */}
          {step === 'analyzing' && (
            <div className="max-w-md mx-auto py-12 flex flex-col items-center text-center space-y-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 animate-pulse">
                  <Bot className="w-10 h-10" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-[10px] animate-spin">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  {lang === 'hi' ? 'कागज़ के स्केच का स्थानीय विश्लेषण चालू है...' : 'Analyzing Paper Sketch Locally...'}
                </h3>
                <p className="text-xs text-emerald-400 font-medium font-mono">
                  {progressStatus}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="bg-linear-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero Tokens: In-browser WebAssembly OCR + Computer Vision</span>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* STEP 3: INTERACTIVE VERIFICATION & CAD SYNTHESIS STUDIO               */}
          {/* ----------------------------------------------------------------------- */}
          {step === 'review' && scanResult && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Image Preview with Vision Highlights (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    {lang === 'hi' ? 'स्कैन की गई छवि (Paper Sketch)' : 'Scanned Sketch Image'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEnhancedImage(!showEnhancedImage)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition border ${
                        showEnhancedImage
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                      title="Toggle binarized ink strokes for high clarity"
                    >
                      {showEnhancedImage ? 'Original' : 'Enhanced B&W'}
                    </button>
                    <button
                      onClick={() => {
                        stopCamera();
                        setStep('input');
                      }}
                      className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      {lang === 'hi' ? 'दूसरा बदलें' : 'Rescan'}
                    </button>
                  </div>
                </div>

                {/* The Scanned Image Canvas */}
                <div className="relative w-full h-72 sm:h-80 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center p-2">
                  <img
                    src={showEnhancedImage && preprocessedSrc ? preprocessedSrc : imageSrc || ''}
                    alt="Paper Scan"
                    className="max-w-full max-h-full object-contain rounded"
                  />

                  {/* Overlaid detected dimension badge */}
                  <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded border border-blue-500/40 text-[11px] font-mono font-bold text-blue-300 shadow">
                    Aspect: {scanResult.detectedAspect} | Cols: {scanResult.detectedGrid.columns}
                  </div>

                  {scanResult.confidence > 0 && (
                    <div className="absolute top-2 right-2 bg-emerald-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-emerald-500/40 text-[10px] font-bold text-emerald-400 shadow">
                      Confidence: {scanResult.confidence}%
                    </div>
                  )}
                </div>

                {/* OCR Raw Text Detected Preview */}
                {scanResult.rawText && (
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {lang === 'hi' ? 'OCR द्वारा पढ़ा गया टेक्स्ट:' : 'Extracted Text:'}
                    </div>
                    <p className="text-[11px] text-slate-300 font-mono whitespace-pre-line max-h-20 overflow-y-auto">
                      {scanResult.rawText}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: AI Bot Brain Interpretation & Adjustment Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* AI Bot Persona Message */}
                <div className="bg-linear-to-r from-indigo-950/40 to-blue-950/30 p-3.5 rounded-xl border border-indigo-500/30 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-indigo-300">
                      {lang === 'hi' ? 'एआई बॉट की समझ (Bot Interpretation):' : 'AI Bot Interpretation:'}
                    </div>
                    <p className="text-slate-200">
                      {lang === 'hi'
                        ? `मैंने आपके स्केच से ${customWidth} × ${customHeight} mm की ${
                            scanResult.typologyLabelHindi
                          } पहचानी है। नीचे यदि कोई बदलाव करना चाहें तो करके तुरंत CAD में बदलें:`
                        : `Identified ${customWidth} × ${customHeight} mm ${scanResult.typologyLabel}. Verify or tweak any parameter below before loading into CAD:`}
                    </p>
                  </div>
                </div>

                {/* Interactive Verification Form */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  {/* Dimensions: Width & Height */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {lang === 'hi' ? 'चौड़ाई (Width in mm)' : 'Width (mm)'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(Math.max(300, parseInt(e.target.value) || 0))}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm font-bold text-white font-mono"
                        />
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => setCustomWidth((w) => w + 50)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                          >
                            +50
                          </button>
                          <button
                            onClick={() => setCustomWidth((w) => Math.max(300, w - 50))}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                          >
                            -50
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {lang === 'hi' ? 'ऊंचाई (Height in mm)' : 'Height (mm)'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(Math.max(300, parseInt(e.target.value) || 0))}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm font-bold text-white font-mono"
                        />
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => setCustomHeight((h) => h + 50)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                          >
                            +50
                          </button>
                          <button
                            onClick={() => setCustomHeight((h) => Math.max(300, h - 50))}
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                          >
                            -50
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Typology Select */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'hi' ? 'विंडो/डोर टाइप (Typology)' : 'Typology'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'slider_3t', label: '3-Track Slider + Mesh', hi: '3-ट्रैक स्लाइडर + जाली' },
                        { id: 'slider_2t', label: '2-Track Slider', hi: '2-ट्रैक स्लाइडर' },
                        { id: 'casement', label: 'Casement Window', hi: 'केसमेंट (पल्ला)' },
                        { id: 'window_with_toplight', label: 'Casement + Top Light', hi: 'केसमेंट + टॉप लाइट' },
                        { id: 'french_door', label: 'French Door (2 Palla)', hi: 'फ्रेंच दरवाज़ा' },
                        { id: 'top_hung', label: 'Top Hung Vent', hi: 'टॉप हंग वेंटिलेटर' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setCustomTypology(t.id);
                            if (t.id === 'slider_3t') setCustomSeries('slider_3track');
                            else if (t.id === 'slider_2t') setCustomSeries('slider_2track');
                            else setCustomSeries('casement_60');
                          }}
                          className={`p-2 rounded-lg text-left text-xs font-medium border transition ${
                            customTypology === t.id
                              ? 'bg-blue-600/20 text-blue-300 border-blue-500 font-bold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <div className="text-white text-xs font-semibold">{t.label}</div>
                          <div className="text-[10px] text-slate-400">{t.hi}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mullions and Top Light Transom */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {lang === 'hi' ? 'खड़े विभाजन (Vertical Mullions)' : 'Vertical Mullions'}
                      </label>
                      <select
                        value={customMullions}
                        onChange={(e) => setCustomMullions(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value={0}>0 Mullion (Single Bay / Slider)</option>
                        <option value={1}>1 Mullion (2 Equal Bays / 1 Fix + 1 Open)</option>
                        <option value={2}>2 Mullions (3 Bays / Center Open)</option>
                        <option value={3}>3 Mullions (4 Bays)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {lang === 'hi' ? 'ऊपरी रौशनदान (Top Light Transom)' : 'Top Light Transom'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomHasTopLight(!customHasTopLight)}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border flex items-center justify-between transition ${
                          customHasTopLight
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        <span>{customHasTopLight ? 'हाँ (Top Light Active)' : 'नहीं (No Transom)'}</span>
                        {customHasTopLight && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Profile Series & Glass */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {lang === 'hi' ? 'प्रोफ़ाइल सीरीज़ (Profile Series)' : 'Profile Series'}
                      </label>
                      <select
                        value={customSeries}
                        onChange={(e) => setCustomSeries(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="slider_3track">3-Track Sliding (88mm)</option>
                        <option value="slider_2track">2-Track Sliding (60mm)</option>
                        <option value="casement_60">Casement 60mm Classic</option>
                        <option value="casement_outer_sliding">System Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {lang === 'hi' ? 'कांच का प्रकार (Glass Type)' : 'Glass Type'}
                      </label>
                      <select
                        value={customGlass}
                        onChange={(e) => setCustomGlass(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="clear_5mm">Clear 5mm Toughened</option>
                        <option value="clear_6mm">Clear 6mm Toughened</option>
                        <option value="dgu_5_12_5">DGU 5-12-5 Double Glass</option>
                        <option value="frosted">Frosted / Privacy (Bathroom)</option>
                        <option value="tint_bronze">Tinted Bronze</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleGenerateCad}
                    className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 group"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition duration-300" />
                    <span>
                      {lang === 'hi'
                        ? '📐 CAD में बदलें और ड्रॉइंग बनाएं (Load into CAD)'
                        : '📐 Generate & Load CAD Drawing'}
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* STEP 4: SUCCESS / APPLIED CONFIRMATION                                 */}
          {/* ----------------------------------------------------------------------- */}
          {step === 'applied' && (
            <div className="max-w-md mx-auto py-10 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {lang === 'hi' ? 'ड्रॉइंग CAD में सफलतापूर्वक तैयार!' : 'CAD Drawing Created Successfully!'}
                </h3>
                <p className="text-xs text-slate-300">
                  {lang === 'hi'
                    ? `आपके कागज़ के स्केच से ${customWidth} × ${customHeight} mm का सटीक uPVC डिज़ाइन मुख्य कैनवास पर लोड कर दिया गया है।`
                    : `Your paper sketch was successfully synthesized and loaded onto the active CAD canvas (${customWidth} × ${customHeight} mm).`}
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 text-left space-y-1">
                <div>✓ 2mm coupling readiness configured</div>
                <div>✓ Miter weld deduction formulas applied (+6mm allowance)</div>
                <div>✓ Glass sizes and pocket tolerances calculated</div>
              </div>

              {/* Quick action shortcuts */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {onOpen3D && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpen3D();
                    }}
                    className="py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                  >
                    {lang === 'hi' ? '3D में देखें (View 3D)' : 'View 3D Model'}
                  </button>
                )}

                {onOpenCuttingList && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCuttingList();
                    }}
                    className="py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                  >
                    {lang === 'hi' ? 'कटिंग लिस्ट (Cutting List)' : 'Cutting List'}
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition"
              >
                {lang === 'hi' ? 'CAD कैनवास पर काम जारी रखें' : 'Continue Editing on CAD Canvas'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
