import React, { useState } from 'react';
import { X, Check, Shield, Sparkles, Layers, Sliders } from 'lucide-react';
import { HANDLE_OPTIONS, HandleOption } from '../data/handleOptions';
import { HandleThumbnail } from './HandleThumbnail';
import { FramePocket } from '../types/upvc';

interface HandleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPocket: FramePocket;
  frameId: string;
  onUpdatePocket: (frameId: string, updatedPocket: FramePocket) => void;
  lang?: 'en' | 'hi';
}

export const HandleSelectionModal: React.FC<HandleSelectionModalProps> = ({
  isOpen,
  onClose,
  currentPocket,
  frameId,
  onUpdatePocket,
  lang = 'hi',
}) => {
  const [selectedType, setSelectedType] = useState<string>(currentPocket.handleType || 'casement_espag');
  const [selectedColor, setSelectedColor] = useState<'silver' | 'black' | 'white' | 'gold'>(
    currentPocket.handleColor || 'silver'
  );
  const [activeTab, setActiveTab] = useState<'all' | 'casement' | 'sliding' | 'door' | 'vent'>('all');

  if (!isOpen) return null;

  const filteredHandles = HANDLE_OPTIONS.filter((h) => {
    if (activeTab === 'all') return true;
    return h.category === activeTab;
  });

  const selectedOption = HANDLE_OPTIONS.find((h) => h.id === selectedType) || HANDLE_OPTIONS[0];

  const handleApply = () => {
    const isDoor =
      currentPocket.height >= 1600 ||
      currentPocket.applicationType === 'door' ||
      selectedType.includes('door_lever');
    const defaultGHH = isDoor ? 1000 : Math.round(currentPocket.height / 2);

    const itemCode = selectedOption?.itemCode || '';
    const handleName = selectedOption?.name || '';

    onUpdatePocket(frameId, {
      ...currentPocket,
      handleType: selectedType as any,
      handleCode: itemCode,
      handleName: handleName,
      handleColor: selectedColor,
      handleHeight: currentPocket.handleHeight ?? defaultGHH,
    });
    onClose();
  };

  const finishes = [
    { id: 'silver', label: 'Silver Chrome', labelHi: 'सिल्वर क्रोम', bg: 'bg-slate-300', text: 'text-slate-950' },
    { id: 'black', label: 'Matte Black', labelHi: 'मैट ब्लैक', bg: 'bg-slate-900 border border-slate-600', text: 'text-white' },
    { id: 'white', label: 'Pure White', labelHi: 'प्योर व्हाइट', bg: 'bg-white', text: 'text-slate-950' },
    { id: 'gold', label: 'Luxury Gold', labelHi: 'रॉयल गोल्ड', bg: 'bg-amber-400', text: 'text-slate-950' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {lang === 'hi' ? 'हैंडल गैलरी एवं डिज़ाइन चयन' : 'Hardware Handle Gallery & Design Selector'}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {lang === 'hi' ? 'लाइव CAD रिफ्लेक्शन' : 'Live CAD Reactive'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'hi'
                  ? 'हैंडल चुनें — यह तुरंत आपकी 2D CAD ड्राइंग और कोटेशन में बदल जाएगा।'
                  : 'Select any handle — it will instantly update on your CAD design canvas and quotation drawing.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Finish & Category Filter Bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'all', label: lang === 'hi' ? 'सभी' : 'All' },
              { id: 'casement', label: lang === 'hi' ? 'कैसमेंट' : 'Casement' },
              { id: 'sliding', label: lang === 'hi' ? 'स्लाइडिंग' : 'Sliding' },
              { id: 'door', label: lang === 'hi' ? 'दरवाजा' : 'Door' },
              { id: 'vent', label: lang === 'hi' ? 'वेंटिलेटर' : 'Vent' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Color Finish Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">
              {lang === 'hi' ? 'रंग (Finish):' : 'Finish:'}
            </span>
            <div className="flex items-center gap-1.5">
              {finishes.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedColor(f.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                    selectedColor === f.id
                      ? 'border-blue-500 bg-blue-950/50 text-blue-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${f.bg} shadow-xs`} />
                  <span className="text-[11px]">{lang === 'hi' ? f.labelHi : f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content: 2-Column Split (Grid on Left, Detailed Inspector & Live CAD Preview on Right) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden">
          {/* Handles Grid (7 cols) */}
          <div className="md:col-span-7 p-5 overflow-y-auto border-r border-slate-800 space-y-3 max-h-[calc(92vh-180px)]">
            <div className="grid grid-cols-2 gap-3">
              {filteredHandles.map((handle) => {
                const isSelected = selectedType === handle.id;
                return (
                  <div
                    key={handle.id}
                    onClick={() => setSelectedType(handle.id)}
                    className={`relative p-3 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center gap-2 group ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/30 shadow-md ring-1 ring-blue-500'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* SVG Image Thumbnail */}
                    <div className="p-1 rounded-lg bg-slate-950/70 border border-slate-800/80 group-hover:border-slate-700 transition">
                      <HandleThumbnail
                        type={handle.id}
                        color={selectedColor}
                        size={84}
                        orientation="right"
                      />
                    </div>

                    {/* Info */}
                    <div className="w-full">
                      <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition line-clamp-1">
                        {lang === 'hi' ? handle.nameHi : handle.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {lang === 'hi' ? handle.suitableForHi : handle.suitableFor}
                      </p>
                    </div>

                    {/* Category pill */}
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-800/80 text-slate-400 border border-slate-700/50">
                      {handle.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Handle Details & CAD Preview (5 cols) */}
          <div className="md:col-span-5 p-5 bg-slate-950/40 flex flex-col justify-between overflow-y-auto max-h-[calc(92vh-180px)]">
            <div className="space-y-4">
              {/* Big Visual Preview Box */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center text-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                  {lang === 'hi' ? 'लाइव 2D CAD ड्राइंग प्रीव्यू' : 'Live 2D CAD Drawing Preview'}
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                  <HandleThumbnail
                    type={selectedOption.id}
                    color={selectedColor}
                    size={130}
                    orientation="right"
                  />
                </div>
                <h3 className="text-sm font-bold text-white mt-3">
                  {lang === 'hi' ? selectedOption.nameHi : selectedOption.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {lang === 'hi' ? selectedOption.descriptionHi : selectedOption.description}
                </p>
              </div>

              {/* Technical Specifications */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">{lang === 'hi' ? 'स्पिंडल साइज (Spindle):' : 'Spindle Size:'}</span>
                  <span className="font-mono text-white font-semibold">{selectedOption.spindleSize}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">{lang === 'hi' ? 'मानक GHH ऊंचाई (GHH Height):' : 'Standard GHH:'}</span>
                  <span className="font-mono text-blue-400 font-semibold">{selectedOption.standardGHH} mm</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">{lang === 'hi' ? 'सुरक्षा रेटिंग (Security):' : 'Security Rating:'}</span>
                  <span className="font-medium text-emerald-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    {selectedOption.securityRating}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{lang === 'hi' ? 'उपयुक्त (Suitable For):' : 'Suitable For:'}</span>
                  <span className="text-slate-200 text-right">{lang === 'hi' ? selectedOption.suitableForHi : selectedOption.suitableFor}</span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  {lang === 'hi' ? 'प्रमुख विशेषताएं:' : 'Key Engineering Features:'}
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {(lang === 'hi' ? selectedOption.featuresHi : selectedOption.features).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
              >
                {lang === 'hi' ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {lang === 'hi' ? 'डिज़ाइन पर लागू करें' : 'Apply to Design'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
