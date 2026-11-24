import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  CheckCircle2,
  ExternalLink,
  X,
  Sparkles,
  QrCode,
  Layers,
  ShieldCheck,
  Copy,
  Check,
  Cpu,
  Globe,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'one_click' | 'manual' | 'apk'>('one_click');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  // QR Code generator URL using public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    currentUrl
  )}&bgcolor=ffffff&color=0f172a&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">
                  Android App (PWA & APK)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-slate-950">
                  Android Ready
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                अपने मोबाइल में बिना प्ले स्टोर के तुरंत ऐप की तरह इनस्टॉल करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('one_click')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'one_click'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1-Click Install (तुरंत इनस्टॉल)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>फोन पर कैसे लगाएं (Guide)</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'apk'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>APK / Play Store फाइल बनाएं</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm flex-1">
          {/* TAB 1: ONE CLICK INSTALL & QR */}
          {activeTab === 'one_click' && (
            <div className="space-y-5">
              {isInstalled ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">
                      ऐप पहले से इंस्टॉल है! (App is already installed)
                    </div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      यह ऐप आपके डिवाइस पर स्टैंडअलोन फुल-स्क्रीन मोड में चल रही है।
                    </div>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-base text-emerald-950 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Android App तैयार है!</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        नीचे दिए बटन पर क्लिक करें। आपका फ़ोन इसे तुरंत होम स्क्रीन पर ऐप के रूप में जोड़ देगा।
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDirectInstall}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App on Android Now (अभी इनस्टॉल करें)</span>
                  </button>
                  {installSuccess && (
                    <div className="text-center text-xs font-bold text-emerald-700 animate-pulse">
                      ✓ इनस्टॉल स्वीकार कर लिया गया! ऐप होम स्क्रीन पर आ गई है।
                    </div>
                  )}
                </div>
              ) : null}

              {/* Mobile QR & URL Sharing Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center gap-5">
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0 text-center">
                  <img
                    src={qrCodeUrl}
                    alt="Scan with Android Phone"
                    className="w-36 h-36 mx-auto rounded"
                  />
                  <span className="text-[10px] font-bold text-slate-500 block mt-1">
                    अपने मोबाइल से स्कैन करें
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 text-left w-full">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>मोबाइल में यह लिंक खोलें:</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    अपने Android फोन के कैमरे या QR स्कैनर से स्कैन करें, या नीचे दिए लिंक को Chrome ब्राउज़र में खोलें:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentUrl}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono truncate select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PWA WebAPK सपोर्टेड • कोई प्ले स्टोर चार्ज नहीं • ऑटो अपडेट</span>
                  </div>
                </div>
              </div>

              {/* Key Features of Android App */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    <span>फुल स्क्रीन ऐप (No URL Bar)</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    बिना ब्राउज़र एड्रेस बार के एकदम ओरिजिनल एंड्रॉइड ऐप की तरह फुल स्क्रीन में चलती है।
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ऑफलाइन काम करे (Offline Ready)</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    सर्विस वर्कर कैशिंग से बिना इंटरनेट या धीमे नेटवर्क पर भी CAD व कटिंग लिस्ट खुलती है।
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>होम स्क्रीन आइकॉन (Home Icon)</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    फोन के ऐप ड्रॉअर और होम स्क्रीन पर uPVC CAD का खुद का लोगो/आइकॉन आता है।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL INSTALLATION GUIDE */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
                <span className="font-bold">Android Phone (Chrome, Edge, Samsung Internet) में 3 सेकंड में इनस्टॉल करने के आसान स्टेप्स:</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">
                      मोबाइल में Google Chrome या Samsung Internet खोलें
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      इस वेबपेज का लिंक अपने Android फोन के Chrome ब्राउज़र में पेस्ट करें और खोलें।
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">
                      ऊपर दाईं तरफ 3 डॉट्स (⋮) मेनू पर टैप करें
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      Chrome के ऊपरी दाएं कोने में दिए गए तीन बिंदुओं (Menu) पर क्लिक करें।
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <div className="font-bold text-emerald-950">
                      "Install app" या "Add to Home screen" (होम स्क्रीन पर जोड़ें) चुनें
                    </div>
                    <div className="text-emerald-800 mt-0.5">
                      मेनू में <strong>"Install app"</strong> (या हिंदी में "ऐप इंस्टॉल करें") विकल्प पर टैप करें। कुछ ही सेकंड में यह आपके फोन में ऐप बन जाएगी!
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    4
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">
                      होम स्क्रीन से किसी भी अन्य ऐप की तरह खोलें
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      अब आपके फोन की स्क्रीन पर <strong>"uPVC CAD"</strong> का ऐप आइकॉन आ जाएगा, जिसपर टैप करते ही यह फुल स्क्रीन में खुल जाएगी।
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APK / PLAY STORE BUILDER */}
          {activeTab === 'apk' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-slate-900 text-sm mb-1">
                  क्या आपको अलग से .APK या .AAB फाइल चाहिए?
                </div>
                <p className="text-slate-600">
                  यदि आप इसे Google Play Store पर डालना चाहते हैं या सीधे व्हाट्सएप से किसी को <strong>.apk</strong> फाइल भेजना चाहते हैं, तो आप नीचे दिए 2 तरीकों का उपयोग कर सकते हैं:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Method 1: PWABuilder */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-blue-700 text-sm">
                      1. PWABuilder (Microsoft द्वारा फ्री टूल)
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                      1-Click APK
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    माइक्रोसॉफ्ट का आधिकारिक टूल किसी भी PWA को ऑटोमैटिकली साइन किया हुआ Android APK और AAB (Google Play Store पैकेज) बना देता है।
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                    <li>
                      <a
                        href="https://www.pwabuilder.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 font-bold underline inline-flex items-center gap-1"
                      >
                        pwabuilder.com <ExternalLink className="w-2.5 h-2.5" />
                      </a>{' '}
                      पर जाएं।
                    </li>
                    <li>इस वेब ऐप का लाइव लिंक पेस्ट करें और "Start" दबाएं।</li>
                    <li>"Package for Stores" पर क्लिक कर <strong>Android APK</strong> डाउनलोड कर लें!</li>
                  </ol>
                </div>

                {/* Method 2: Capacitor / Android Studio */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-indigo-700 text-sm">
                      2. Capacitor Native Wrapper
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                      Native Kotlin/Java
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Capacitor से सीधे Android Studio प्रोजेक्ट जनरेट कर सकते हैं:
                  </p>
                  <div className="p-2 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded space-y-1">
                    <div>npm install @capacitor/core @capacitor/cli</div>
                    <div>npx cap init "uPVC CAD" com.upvc.cad</div>
                    <div>npm run build && npx cap add android</div>
                    <div>npx cap open android</div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Android Studio में "Build APK" दबाते ही तुरंत मोबाइल APK बन जाती है।
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>PWA Manifest v2.5 Active</span>
          </div>

          <div className="flex items-center gap-2">
            {isInstallable && activeTab !== 'one_click' && (
              <button
                onClick={handleDirectInstall}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install on Phone</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
