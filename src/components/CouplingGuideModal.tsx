import React from 'react';
import { X, Split, Layers, CheckCircle2, Info, ArrowRight } from 'lucide-react';

interface CouplingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CouplingGuideModal: React.FC<CouplingGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Mullion (मुलियन) vs. Coupling (कप्लिंग 2mm) गाइड
              </h2>
              <p className="text-xs text-slate-400">
                uPVC फैब्रिकेशन में मुलियन और कप्लिंग का सही इस्तेमाल कैसे करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Mullion Card */}
            <div className="bg-slate-800/60 border border-blue-500/40 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600/20 text-blue-400 text-xs px-3 py-1 rounded-bl-lg font-medium border-l border-b border-blue-500/30">
                1 ही फ्रेम के अंदर
              </div>
              <div className="flex items-center gap-2.5 mb-3 text-blue-400 font-bold text-base">
                <Layers className="w-5 h-5" />
                Mullion (खड़ा / आड़ा मुलियन)
              </div>

              {/* Visual Diagram */}
              <div className="bg-slate-950/80 border border-slate-700/60 rounded-lg p-3 my-3 flex items-center justify-center">
                <svg width="220" height="120" viewBox="0 0 220 120" className="overflow-visible">
                  {/* Outer Frame */}
                  <rect x="10" y="10" width="200" height="100" fill="none" stroke="#3b82f6" strokeWidth="6" rx="2" />
                  {/* Vertical Mullion */}
                  <line x1="110" y1="10" x2="110" y2="110" stroke="#60a5fa" strokeWidth="6" />
                  {/* Glass Pockets */}
                  <rect x="16" y="16" width="91" height="88" fill="#3b82f6" fillOpacity="0.15" />
                  <rect x="113" y="16" width="91" height="88" fill="#3b82f6" fillOpacity="0.15" />
                  <text x="60" y="65" fill="#93c5fd" fontSize="10" textAnchor="middle">Bay 1 (फिक्स/पल्ला)</text>
                  <text x="160" y="65" fill="#93c5fd" fontSize="10" textAnchor="middle">Bay 2 (फिक्स/पल्ला)</text>
                  <text x="110" y="122" fill="#60a5fa" fontSize="9" textAnchor="middle">Mullion Profile (74mm)</text>
                </svg>
              </div>

              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>फ्रेम अलग नहीं होता:</strong> 1 ही बाहरी फ्रेम के अंदर प्रोफाइल लगाई जाती है।</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>साइज लॉक रहता है:</strong> मुलियन की पोजीशन बदलने से टोटल फ्रेम का बाहरी साइज नहीं बदलता।</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>अलग-अलग डिजाइन:</strong> एक ही फ्रेम में एक तरफ फिक्स ग्लास और दूसरी तरफ ओपन पल्ला या स्लाइडर लगा सकते हैं।</span>
                </li>
              </ul>
            </div>

            {/* Coupling Card */}
            <div className="bg-slate-800/60 border border-emerald-500/40 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-600/20 text-emerald-400 text-xs px-3 py-1 rounded-bl-lg font-medium border-l border-b border-emerald-500/30">
                2 अलग-अलग फ्रेम (2mm गैप)
              </div>
              <div className="flex items-center gap-2.5 mb-3 text-emerald-400 font-bold text-base">
                <Split className="w-5 h-5" />
                Coupling (कप्लिंग 2mm जोड़)
              </div>

              {/* Visual Diagram */}
              <div className="bg-slate-950/80 border border-slate-700/60 rounded-lg p-3 my-3 flex items-center justify-center">
                <svg width="220" height="120" viewBox="0 0 220 120" className="overflow-visible">
                  {/* Frame 1 (Door - Taller) */}
                  <rect x="10" y="10" width="85" height="100" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="5" rx="2" />
                  <text x="52" y="65" fill="#6ee7b7" fontSize="10" textAnchor="middle">Frame A (दरवाजा)</text>

                  {/* 2mm Gap Indicator */}
                  <rect x="97" y="10" width="6" height="100" fill="#f59e0b" fillOpacity="0.4" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
                  <text x="100" y="6" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle">2mm GAP</text>

                  {/* Frame 2 (Window - Shorter) */}
                  <rect x="105" y="30" width="105" height="80" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="5" rx="2" />
                  <text x="157" y="75" fill="#6ee7b7" fontSize="10" textAnchor="middle">Frame B (खिड़की)</text>
                  <text x="110" y="122" fill="#10b981" fontSize="9" textAnchor="middle">2mm Coupler Strip</text>
                </svg>
              </div>

              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>दोनों फ्रेम पूरी तरह अलग हैं:</strong> Frame A और Frame B का आपस में कोई निर्भरता नहीं।</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>2 mm का स्टैंडर्ड गैप:</strong> दोनों चौखट के बीच 2mm का कप्लिंग गैप या एक्सपेंशन प्रोफाइल रहता है।</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>स्वतंत्र साइज बढ़ाना/घटाना:</strong> Frame A को सेलेक्ट करके उसकी चौड़ाई/ऊंचाई जितना मर्जी बढ़ाएं, Frame B का साइज अपनी जगह स्वतंत्र रहता है!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Practical Example Box */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-slate-200 font-semibold text-xs uppercase tracking-wider">
                प्रैक्टिकल उदाहरण (Example):
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                अगर आपको बालकनी में <strong>7 फीट ऊंचा दरवाजा (Door)</strong> और साथ में <strong>4 फीट ऊंची खिड़की (Window)</strong> जोड़नी है, तो आप <strong>Coupling (2mm)</strong> का उपयोग करेंगे। दोनों चौखट अलग-अलग बनेंगी और साइट पर 2mm कप्लर से जुड़ेंगी। लेकिन अगर खिड़की में ऊपर वेंटिलेटर और नीचे 2 पल्ले लगाने हैं तो एक ही फ्रेम के अंदर <strong>Mullion</strong> लगाएंगे।
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-md transition"
          >
            समझ गया (Close Guide)
          </button>
        </div>
      </div>
    </div>
  );
};
