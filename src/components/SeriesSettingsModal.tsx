import React, { useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
  ChevronDown,
  Ruler,
} from 'lucide-react';
import {
  CustomSeries,
  INITIAL_CUSTOM_SERIES,
  ManufacturingNiyamRules,
  INITIAL_MANUFACTURING_NIYAM,
  STORAGE_KEY_CUSTOM_SERIES,
  STORAGE_KEY_FABRICATION_RULES,
  SeriesFrameProfile,
  SeriesSashProfile,
  SeriesBeadingProfile,
} from '../constants/customSeriesMaster';
import { SeriesCuttingChecker } from './SeriesCuttingChecker';

interface SeriesSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'hi' | 'en';
}

export const SeriesSettingsModal: React.FC<SeriesSettingsModalProps> = ({
  isOpen,
  onClose,
  lang = 'hi',
}) => {
  if (!isOpen) return null;

  // Filter state (type filter: casement / sliding)
  const [typeFilter, setTypeFilter] = useState<'casement' | 'sliding'>('casement');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');

  // Series List State
  const [seriesList, setSeriesList] = useState<CustomSeries[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_SERIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_CUSTOM_SERIES;
  });

  // Manufacturing Rules State
  const [rules, setRules] = useState<ManufacturingNiyamRules>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FABRICATION_RULES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_MANUFACTURING_NIYAM;
  });

  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(
    seriesList[0]?.id || 'casement-60'
  );

  // Active view tab: 'cuttingChecker' | 'profiles'
  const [activeModalTab, setActiveModalTab] = useState<'cuttingChecker' | 'profiles'>('cuttingChecker');

  // Sash Category Filter in main workspace: 'all' | 'window' | 'door' | 'mesh'
  const [sashCategoryFilter, setSashCategoryFilter] = useState<'all' | 'window' | 'door' | 'mesh'>('all');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered series list for sidebar
  const filteredSeries = seriesList.filter((s) => {
    const matchesType = s.type === typeFilter;
    const matchesBrand =
      brandFilter === 'ALL' ||
      s.brand.toUpperCase() === brandFilter ||
      (brandFilter === 'OTHER' && s.brand !== 'Prominance' && s.brand !== 'Duron');
    return matchesType && matchesBrand;
  });

  // Ensure selected series exists in current list
  const currentSeries =
    seriesList.find((s) => s.id === selectedSeriesId) ||
    filteredSeries[0] ||
    seriesList[0];

  // Update current selected series
  const updateCurrentSeries = (updater: (s: CustomSeries) => CustomSeries) => {
    setSeriesList((prev) =>
      prev.map((s) => (s.id === currentSeries.id ? updater(s) : s))
    );
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (
      window.confirm(
        'क्या आप वाकई डिफ़ॉल्ट सेटिंग्स और रूल्स पर रीसेट करना चाहते हैं?'
      )
    ) {
      setSeriesList(INITIAL_CUSTOM_SERIES);
      setRules(INITIAL_MANUFACTURING_NIYAM);
      localStorage.setItem(STORAGE_KEY_CUSTOM_SERIES, JSON.stringify(INITIAL_CUSTOM_SERIES));
      localStorage.setItem(STORAGE_KEY_FABRICATION_RULES, JSON.stringify(INITIAL_MANUFACTURING_NIYAM));
      showToast('🔄 सेटिंग्स रीसेट हो गईं।');
    }
  };

  // Save all settings
  const handleSaveAll = () => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SERIES, JSON.stringify(seriesList));
      localStorage.setItem(STORAGE_KEY_FABRICATION_RULES, JSON.stringify(rules));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('seriesSettingsUpdated', { detail: { seriesList, rules } }));
      showToast('✅ सभी सेटिंग्स सफलतापूर्वक सेव हो गईं!');
    } catch (e) {
      console.error(e);
      showToast('Error saving settings');
    }
  };

  // Add new series
  const handleAddNewSeries = () => {
    const newId = `series-${Date.now()}`;
    const newSeries: CustomSeries = {
      id: newId,
      name: typeFilter === 'casement' ? 'New Casement 60 Series' : 'New Sliding 60 Series',
      brand: 'Duron',
      type: typeFilter,
      seriesHeight: 60,
      frames: [
        {
          id: `f-${Date.now()}-1`,
          code: typeFilter === 'casement' ? 'CWH60-02' : 'SWH60-01',
          height: 60,
          beadingSideHeight: 40,
          name: 'Outer Frame Standard',
        },
      ],
      sashes: [
        {
          id: `s-${Date.now()}-1`,
          code: typeFilter === 'casement' ? 'CWH60-03' : 'SWH60-03',
          name: typeFilter === 'casement' ? 'Casement Window Sash (Outward)' : 'Sliding Window Sash',
          sashType: 'window',
          realHeight: 78,
          beadingSideHeight: 60,
        },
      ],
      mullions: [typeFilter === 'casement' ? 'CWH60-05' : 'SWH60-17'],
      beading: [
        {
          id: `b-${Date.now()}-1`,
          code: typeFilter === 'casement' ? 'CWH60-08' : 'SWH60-12',
          maxGlass: 8,
          name: 'Single Glass Bead',
        },
      ],
      meshBeading: [],
      glassOffset1: 6,
      glassOffset2: 4,
    };

    setSeriesList((prev) => [...prev, newSeries]);
    setSelectedSeriesId(newId);
    showToast('+ नई सीरीज जोड़ी गई');
  };

  // Delete series
  const handleDeleteSeries = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (seriesList.length <= 1) {
      alert('कम से कम एक सीरीज होनी चाहिए!');
      return;
    }
    if (window.confirm('क्या आप इस सीरीज को डिलीट करना चाहते हैं?')) {
      const remaining = seriesList.filter((s) => s.id !== id);
      setSeriesList(remaining);
      if (selectedSeriesId === id) {
        setSelectedSeriesId(remaining[0].id);
      }
      showToast('सीरीज हटाई गई');
    }
  };

  // Add Frame
  const handleAddFrame = () => {
    const newFrame: SeriesFrameProfile = {
      id: `f-${Date.now()}`,
      code: `CWH60-0${currentSeries.frames.length + 1}`,
      height: 60,
      beadingSideHeight: 40,
      name: 'Outer Frame Variant',
    };
    updateCurrentSeries((s) => ({
      ...s,
      frames: [...s.frames, newFrame],
    }));
  };

  // Add Window Sash
  const handleAddWindowSash = () => {
    const newSash: SeriesSashProfile = {
      id: `sash-${Date.now()}`,
      code: `CWH60-0${currentSeries.sashes.length + 3}`,
      name: 'Casement Window Sash (Outward)',
      sashType: 'window',
      realHeight: 78,
      beadingSideHeight: 60,
    };
    updateCurrentSeries((s) => ({
      ...s,
      sashes: [...s.sashes, newSash],
    }));
  };

  // Add Door Sash
  const handleAddDoorSash = () => {
    const newSash: SeriesSashProfile = {
      id: `sash-${Date.now()}`,
      code: `CWH60-0${currentSeries.sashes.length + 5}`,
      name: 'Casement Door Sash (Outward)',
      sashType: 'door',
      realHeight: 104,
      beadingSideHeight: 86,
    };
    updateCurrentSeries((s) => ({
      ...s,
      sashes: [...s.sashes, newSash],
    }));
  };

  // Add Other Sash
  const handleAddOtherSash = () => {
    const newSash: SeriesSashProfile = {
      id: `sash-${Date.now()}`,
      code: `SASH-NEW-${currentSeries.sashes.length + 1}`,
      name: 'Special Custom Sash Profile',
      sashType: 'window',
      realHeight: 70,
      beadingSideHeight: 52,
    };
    updateCurrentSeries((s) => ({
      ...s,
      sashes: [...s.sashes, newSash],
    }));
  };

  // Add Mullion
  const handleAddMullion = () => {
    updateCurrentSeries((s) => ({
      ...s,
      mullions: [...s.mullions, `CWH60-${s.mullions.length + 5}`],
    }));
  };

  // Add Glass Beading
  const handleAddGlassBeading = () => {
    const newBead: SeriesBeadingProfile = {
      id: `bead-${Date.now()}`,
      code: `CWH60-${currentSeries.beading.length + 8}`,
      maxGlass: 12,
      name: 'Glazing Bead',
    };
    updateCurrentSeries((s) => ({
      ...s,
      beading: [...s.beading, newBead],
    }));
  };

  // Add Default Mesh Beading
  const handleAddDefaultMeshBeading = () => {
    const newMeshBead: SeriesBeadingProfile = {
      id: `mbead-${Date.now()}`,
      code: 'SWH60-12-MESH',
      maxGlass: 2,
      name: 'Fly-Mesh Spline Beading',
    };
    updateCurrentSeries((s) => ({
      ...s,
      meshBeading: [...(s.meshBeading || []), newMeshBead],
    }));
    showToast('जाली बीडिंग जोड़ी गई');
  };

  // Filtered sashes for display
  const displayedSashes = currentSeries.sashes.filter((sash) => {
    if (sashCategoryFilter === 'window') return sash.sashType === 'window';
    if (sashCategoryFilter === 'door') return sash.sashType === 'door';
    if (sashCategoryFilter === 'mesh') return false;
    return true;
  });

  const windowSashCount = currentSeries.sashes.filter((s) => s.sashType === 'window').length;
  const doorSashCount = currentSeries.sashes.filter((s) => s.sashType === 'door').length;
  const meshSashCount = 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 font-sans">
      <div className="w-full max-w-[1440px] min-h-[92vh] bg-[#f8fafc] text-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* =========================================================
            Top Header Bar
           ========================================================= */}
        <header className="flex flex-wrap items-center justify-between bg-white px-6 py-4 border-b border-slate-200 shadow-2xs gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Series & Profile Settings
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                CASEMENT, SLIDING AUR CUTTING SIZE KE DYNAMIC RULES
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs: Live Cutting Checker vs Profile Database */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveModalTab('cuttingChecker')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeModalTab === 'cuttingChecker'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>कटिंग साइज़ लाइव टेस्ट (Live Checker)</span>
              <span className="bg-white/25 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                TEST
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModalTab('profiles')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeModalTab === 'profiles'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>प्रोफाइल डेटाबेस (Profiles & Hardware)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {toastMessage && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md animate-fade-in flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {toastMessage}
              </span>
            )}
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              Reset to Defaults
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save All Update
            </button>
          </div>
        </header>

        {/* =========================================================
            Main 2-Column Content Area
           ========================================================= */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-6 items-start flex-1 overflow-y-auto">
          
          {/* =========================================================
              LEFT SIDEBAR: Switcher, Filter, Series Cards & Calculations Rules
             ========================================================= */}
          <aside className="flex flex-col gap-4">
            
            {/* Top 2 Buttons: CASEMENT (OPENABLE) / SLIDING (SLIDER) */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('casement');
                  const match = seriesList.find((s) => s.type === 'casement');
                  if (match) setSelectedSeriesId(match.id);
                }}
                className={`py-2 px-3 rounded-lg flex flex-col items-center justify-center transition cursor-pointer ${
                  typeFilter === 'casement'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span className="font-extrabold text-xs tracking-wide">CASEMENT</span>
                <span className="text-[10px] font-semibold opacity-90 tracking-wider">OPENABLE</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('sliding');
                  const match = seriesList.find((s) => s.type === 'sliding');
                  if (match) setSelectedSeriesId(match.id);
                }}
                className={`py-2 px-3 rounded-lg flex flex-col items-center justify-center transition cursor-pointer ${
                  typeFilter === 'sliding'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span className="font-extrabold text-xs tracking-wide">SLIDING</span>
                <span className="text-[10px] font-semibold opacity-90 tracking-wider">SLIDER</span>
              </button>
            </div>

            {/* Filter by Brand / Company */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                FILTER BY BRAND / COMPANY
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {['ALL', 'DURON', 'PROMINANCE', 'OTHER'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrandFilter(b)}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition text-center cursor-pointer border ${
                      brandFilter === b
                        ? 'bg-white text-slate-900 border-slate-300 shadow-2xs'
                        : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200/60'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Casement/Sliding Series List Header + Add New */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {typeFilter === 'casement' ? 'CASEMENT' : 'SLIDING'} SERIES LIST
              </span>
              <button
                type="button"
                onClick={handleAddNewSeries}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                ADD NEW
              </button>
            </div>

            {/* Series Cards List */}
            <div className="flex flex-col gap-2.5">
              {filteredSeries.map((s) => {
                const isActive = s.id === currentSeries.id;
                if (isActive) {
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSeriesId(s.id)}
                      className="bg-[#131722] text-white border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col gap-2 transition cursor-pointer relative"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-white line-clamp-1">
                          {s.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-300">
                            {s.seriesHeight}mm
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSeries(s.id, e)}
                            className="text-slate-400 hover:text-rose-400 transition cursor-pointer p-0.5"
                            title="Delete series"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                          {s.brand}
                        </span>
                        <span className="bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                          {s.type}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSeriesId(s.id)}
                    className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-2 transition cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-800 line-clamp-1">
                        {s.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          {s.seriesHeight}mm
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSeries(s.id, e)}
                          className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-0.5"
                          title="Delete series"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                        {s.brand}
                      </span>
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                        {s.type}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredSeries.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No series found
                </div>
              )}
            </div>

            {/* =========================================================
                CASEMENT OR SLIDING RULE DETAIL CARD
               ========================================================= */}
            {typeFilter === 'sliding' ? (
              <div className="bg-[#fffbeb] border border-amber-200/90 rounded-xl p-4 text-slate-800 flex flex-col gap-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>SLIDING RULE DETAIL (SLIDING NIYAM)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('cuttingChecker')}
                    className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  >
                    <Ruler className="w-3 h-3" />
                    <span>Live Test</span>
                  </button>
                </div>

                <div className="text-xs text-slate-600 font-medium leading-relaxed">
                  Sliding dynamic rules logic:
                </div>

                {/* 1. Outer Frame Size */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-800">1. Outer Frame Size:</span>
                  <div className="bg-white border border-amber-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-amber-950">
                    Outer Size = Design Size + 6mm
                  </div>
                </div>

                {/* 2. Sash Height (Sliding Height) */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-800">2. Sash Height (Sliding Height):</span>
                  <div className="bg-white border border-amber-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-amber-950">
                    Sash_H = Outer Size - ((Frame_Height * 2) - 16)
                  </div>
                </div>

                {/* 3. Sash Width (Sliding Width) */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-800">3. Sash Width (Sliding Width):</span>
                  <div className="bg-white border border-amber-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-amber-950">
                    Sash_W = (Outer Size - (Frame_Height * 2 - 16)) / panels + ((SASH REAL_H / 2) + 4)
                  </div>
                </div>

                {/* 4. Glass Size */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-800">4. Glass Size:</span>
                  <div className="bg-white border border-amber-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-amber-950 space-y-0.5">
                    <div>Glass_H = Sash_H - (Bead_Side_H * 2 + 6 + 4)</div>
                    <div>Glass_W = Sash_W - (Bead_Side_H * 2 + 6 + 4)</div>
                  </div>
                </div>

                {/* 5. Beading Size */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-800">5. Beading Size:</span>
                  <div className="bg-white border border-amber-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-amber-950">
                    Beading = Glass Size + 4mm
                  </div>
                </div>

                {/* 6. Sash Interlock Height */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-800">6. Sash Interlock Height:</span>
                  <div className="bg-white border border-amber-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-amber-950 space-y-0.5">
                    <div>Interlock_H = Sash_H - HeightOffset</div>
                    <div className="text-slate-600 font-sans text-[11px]">Qty = (panels - 1) * 2</div>
                  </div>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    Sash overlapping ke liye dynamic interlock profile calculation.
                  </span>
                </div>

                {/* Example Card Box */}
                <div className="bg-white border border-amber-200/90 rounded-lg p-3 flex flex-col gap-1.5 text-xs text-slate-700 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[11px] text-slate-900">
                      EXAMPLE (HEIGHT 1500, WIDTH 1500)
                    </span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Sliding 60 Series
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Inputs: Frame_H=44mm, Sash_Real_H=70mm, Bead_Side_H=52mm
                  </div>
                  <div className="text-[11px] font-medium space-y-0.5 pt-1">
                    <div>1. <b>Outer:</b> 1500 + 6 = <b>1506mm</b></div>
                    <div>2. <b>Sash_H:</b> 1506 - ((44*2) - 16) = 1506 - 72 = <b className="text-amber-700">1434mm</b></div>
                    <div>3. <b>Sash_W:</b> (1506 - (44*2 - 16)) / 2 + ((70/2) + 4) = (1434)/2 + 39 = <b className="text-amber-700">756mm</b></div>
                    <div>4. <b>Glass H x W:</b></div>
                    <div className="pl-2">H: 1434 - (52*2 + 6 + 4) = <b className="text-amber-700">1320mm</b></div>
                    <div className="pl-2">W: 756 - (52*2 + 6 + 4) = <b className="text-amber-700">642mm</b></div>
                    <div>5. <b>Beading H x W:</b></div>
                    <div className="pl-2">H: 1320 + 4 = <b className="text-amber-700">1324mm</b></div>
                    <div className="pl-2">W: 642 + 4 = <b className="text-amber-700">646mm</b></div>
                  </div>
                </div>

                {/* ❄️ AC & Exhaust Fan Formulas */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    ❄️ AC & EXHAUST FAN FORMULAS (AC/FAN नियम):
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Sliding frames ya coupling joints ke sath dynamic calculations is tarah se hoti hain:
                  </p>

                  <div className="text-[11px] font-semibold text-slate-800">
                    • AC Partition Height (ऊंचाई):
                  </div>
                  <div className="bg-white border border-amber-200 rounded-md px-3 py-1 font-mono text-[11px] font-bold text-amber-950">
                    Partition_H = AC_Height + 120 mm (Coupled Frame)
                  </div>

                  <div className="text-[11px] font-semibold text-slate-800">
                    • Exhaust Fan Height (ऊंचाई):
                  </div>
                  <div className="bg-white border border-amber-200 rounded-md px-3 py-1 font-mono text-[11px] font-bold text-amber-950">
                    Partition_H = Fan_Diameter + 120 mm (Coupled Frame)
                  </div>

                  <div className="text-[11px] font-semibold text-slate-800">
                    • AC Partition Width (चौड़ाई):
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div>Left/Right boundary offsets based on adjacency:</div>
                    <div>- If Outer Frame side: <b className="text-amber-700">+58 mm</b> offset</div>
                    <div>- If Mullion side: <b className="text-amber-700">+18 mm</b> offset</div>
                  </div>
                </div>
              </div>
            ) : (
            <div className="bg-[#f0f7ff] border border-blue-200/80 rounded-xl p-4 text-slate-800 flex flex-col gap-3.5 shadow-2xs">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>CASEMENT RULE DETAIL (CASEMENT NIYAM)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('cuttingChecker')}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-2xs transition cursor-pointer"
                >
                  <Ruler className="w-3 h-3" />
                  <span>Live Test</span>
                </button>
              </div>

              <div className="text-xs text-slate-600 font-medium leading-relaxed">
                Casement/Kapat calculations rules logic:
              </div>

              {/* 1. Outer Frame Size */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-800">1. Outer Frame Size:</span>
                <div className="bg-white border border-blue-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-blue-950">
                  Outer Size = Design Size + 6mm
                </div>
              </div>

              {/* 2. Sash / Palla Size */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-800">2. Sash / Palla Size (Casement Formula):</span>
                <div className="bg-white border border-blue-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-blue-950">
                  Sash = Outer Size - ((Beding_Side * 2) - 16)
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Sash H aur W dono ke liye is niyam ka upyog hoga (Outer Size = Design Size + 6mm).
                </span>
              </div>

              {/* 3. Glass Size */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-800">3. Glass Size:</span>
                <div className="bg-white border border-blue-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-blue-950">
                  Glass = Sash - (Sash_Beading_Side_Height * 2) - 8
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Sash size se beading side height x 2 aur -8mm clearance ghataya jata hai.
                </span>
              </div>

              {/* 4. Beading Size */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-800">4. Beading Size:</span>
                <div className="bg-white border border-blue-200/80 rounded-md px-3 py-1.5 font-mono text-xs font-bold text-blue-950">
                  Beading = Glass Size + 4mm
                </div>
              </div>

              {/* Example Card Box */}
              <div className="bg-white border border-blue-200/90 rounded-lg p-3 flex flex-col gap-1.5 text-xs text-slate-700 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[11px] text-slate-900">
                    EXAMPLE (HEIGHT 1500, WIDTH 1500)
                  </span>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Casement 60 Series
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Inputs: Frame_Bead_Side=60mm, Sash_Real_H=78mm, Sash_Bead_Side_H=60mm
                </div>
                <div className="text-[11px] font-medium space-y-0.5 pt-1">
                  <div>1. <b>Outer:</b> 1500 + 6 = <b>1506mm</b></div>
                  <div>2. <b>Sash H/W:</b> 1506 - ((60*2) - 16) = 1506 - 104 = <b className="text-blue-600">1402mm</b></div>
                  <div>3. <b>Glass:</b> 1402 - (60 * 2) - 8 = 1402 - 128 = <b className="text-blue-600">1274mm</b></div>
                  <div>4. <b>Beading:</b> 1274 + 4 = <b className="text-blue-600">1278mm</b></div>
                </div>
              </div>

              {/* ⚡ Horizontal Mullion Rule (Upper Fixed + Lower Door Combo) */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                  ⚡ HORIZONTAL MULLION RULE (UPER FIXED + NICHE DOOR COMBO):
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Jab door ke upar fixed glass or beech mein horizontal mullion design ho, tab sash height (sashH) nikalne ke liye niche outer frame hoti hai par upar horizontal mullion hota hai.
                </p>
                <div className="text-[11px] font-semibold text-slate-800">
                  • Sash Height (Niche/Upar Sash):
                </div>
                <div className="bg-white border border-blue-200 rounded-md px-3 py-1.5 font-mono text-[11px] font-bold text-blue-950">
                  sashH = Segment_H - (Frame_Height + (Mullion_Height / 2) - 16)
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Mullion height (60mm) ka aadha (30mm) aur frame height (60mm) judkar overlapping (-16mm) subtract hota hai.
                </p>

                {/* Sub-Card: If Mullion Total Height = 72mm */}
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-md p-2.5 space-y-1 text-[11px] text-slate-800 mt-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    ✏️ IF MULLION TOTAL HEIGHT = 72MM:
                  </div>
                  <p className="text-slate-600">
                    Agar aapki mullion profile ki height 72mm hai, toh calculations is tarah badal jayengi:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                    <li>Mullion_Height / 2 = 72 / 2 = <b>36mm</b></li>
                    <li>Frame_Height = <b>60mm</b></li>
                    <li>Deduction = 60 + 36 - 16 = <b className="text-blue-700">80mm</b></li>
                    <li><b>sashH = Segment_H - 80mm</b></li>
                  </ul>
                </div>
              </div>

              {/* ❄️ AC & Exhaust Fan Formulas */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                  ❄️ AC & EXHAUST FAN FORMULAS (AC/FAN नियम):
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  AC aur Exhaust Fan lagane par frame and compartment automatic rules se resize ho jate hain:
                </p>

                <div className="text-[11px] font-semibold text-slate-800">
                  • AC Partition Height (ऊंचाई):
                </div>
                <div className="bg-white border border-blue-200 rounded-md px-3 py-1 font-mono text-[11px] font-bold text-blue-950">
                  Partition_H = AC_Height + 110 mm (Mullion joint)
                </div>

                <div className="text-[11px] font-semibold text-slate-800">
                  • Exhaust Fan Height (ऊंचाई):
                </div>
                <div className="bg-white border border-blue-200 rounded-md px-3 py-1 font-mono text-[11px] font-bold text-blue-950">
                  Partition_H = Fan_Diameter + 110 mm (Mullion joint)
                </div>

                <div className="text-[11px] font-semibold text-slate-800">
                  • AC Partition Width (चौड़ाई):
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>Left/Right boundary offsets based on adjacency:</div>
                  <div>- If Outer Frame side: <b className="text-blue-700">+58 mm</b> offset</div>
                  <div>- If Mullion side: <b className="text-blue-700">+18 mm</b> offset</div>
                </div>
              </div>

              </div>
            )}

          </aside>

          {/* =========================================================
              RIGHT MAIN WORKSPACE PANEL: Cutting Checker or Profile Database
             ========================================================= */}
          {activeModalTab === 'cuttingChecker' ? (
            <div className="flex flex-col gap-6">
              <SeriesCuttingChecker
                currentSeries={currentSeries}
                rules={rules}
              />
            </div>
          ) : (
            <main className="flex flex-col gap-6">
            
            {/* Top 4-Column Card: Series Name, Brand, Series Type, Main Profile Height */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Series Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    SERIES NAME
                  </label>
                  <input
                    type="text"
                    value={currentSeries.name}
                    onChange={(e) =>
                      updateCurrentSeries((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="e.g. Casement 60 Series"
                    className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* 2. Company / Brand */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    COMPANY / BRAND
                  </label>
                  <div className="relative">
                    <select
                      value={currentSeries.brand}
                      onChange={(e) =>
                        updateCurrentSeries((s) => ({ ...s, brand: e.target.value }))
                      }
                      className="w-full appearance-none px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 pr-8 cursor-pointer"
                    >
                      <option value="Duron">Duron</option>
                      <option value="Prominance">Prominance</option>
                      <option value="Kommerling">Kommerling</option>
                      <option value="Veka">Veka</option>
                      <option value="Aluplast">Aluplast</option>
                      <option value="Deceuninck">Deceuninck</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Series Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    SERIES TYPE
                  </label>
                  <div className="relative">
                    <select
                      value={currentSeries.type === 'casement' ? 'casement' : 'sliding'}
                      onChange={(e) =>
                        updateCurrentSeries((s) => ({
                          ...s,
                          type: e.target.value as 'casement' | 'sliding',
                        }))
                      }
                      className="w-full appearance-none px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 pr-8 cursor-pointer"
                    >
                      <option value="casement">Casement / Openable</option>
                      <option value="sliding">Sliding / Slider</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* 4. Main Profile Height (MM) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    MAIN PROFILE HEIGHT (MM)
                  </label>
                  <input
                    type="number"
                    value={currentSeries.seriesHeight}
                    onChange={(e) =>
                      updateCurrentSeries((s) => ({
                        ...s,
                        seriesHeight: Number(e.target.value) || 60,
                      }))
                    }
                    className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

              </div>
            </div>

            {/* =========================================================
                SECTION 1: Series Frames (Chaukat)
               ========================================================= */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Series Frames (Chaukat)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Is Series me multiple frames define karein aur sashes frame height ke hisab se automatic adjust hote hain.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFrame}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Frame
                </button>
              </div>

              {/* Grid of Frame Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentSeries.frames || []).map((frame, index) => (
                  <div
                    key={frame.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-4"
                  >
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      {/* Frame Code */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          FRAME CODE
                        </label>
                        <input
                          type="text"
                          value={frame.code}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentSeries((s) => {
                              const arr = [...s.frames];
                              arr[index] = { ...arr[index], code: val };
                              return { ...s, frames: arr };
                            });
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                        />
                      </div>

                      {/* Frame Height */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          FRAME HEIGHT (MM)
                        </label>
                        <input
                          type="number"
                          value={frame.height}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateCurrentSeries((s) => {
                              const arr = [...s.frames];
                              arr[index] = { ...arr[index], height: val };
                              return { ...s, frames: arr };
                            });
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                        />
                      </div>

                      {/* Beding Side */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          BEDING SIDE (MM)
                        </label>
                        <input
                          type="number"
                          value={frame.beadingSideHeight || 40}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateCurrentSeries((s) => {
                              const arr = [...s.frames];
                              arr[index] = { ...arr[index], beadingSideHeight: val };
                              return { ...s, frames: arr };
                            });
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-amber-600 bg-amber-50/40"
                        />
                      </div>
                    </div>

                    {/* Delete Frame Button */}
                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentSeries((s) => ({
                          ...s,
                          frames: s.frames.filter((_, i) => i !== index),
                        }));
                      }}
                      className="text-slate-300 hover:text-rose-500 transition cursor-pointer p-1"
                      title="Delete Frame"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400 hover:text-rose-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* =========================================================
                SECTION 2: Series Sashes (Palley / शटर प्रोफाइल)
               ========================================================= */}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Series Sashes (Palley / शटर प्रोफाइल)
                    </h3>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {currentSeries.sashes.length} Profiles
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Window (खिड़की) और Door (दरवाजा) के लिए अलग-अलग Sash Profiles सेट करें ताकि कटिंग साइज और ग्लास साइज एकदम सटीक निकले।
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAddWindowSash}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + 🪟 Window Sash
                  </button>
                  <button
                    type="button"
                    onClick={handleAddDoorSash}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + 🚪 Door Sash
                  </button>
                  <button
                    type="button"
                    onClick={handleAddOtherSash}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Other
                  </button>
                </div>
              </div>

              {/* Sub-Filter Tabs for Sashes */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setSashCategoryFilter('all')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    sashCategoryFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({currentSeries.sashes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSashCategoryFilter('window')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    sashCategoryFilter === 'window'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🪟 Window Sashes ({windowSashCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSashCategoryFilter('door')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    sashCategoryFilter === 'door'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🚪 Door Sashes ({doorSashCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSashCategoryFilter('mesh')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    sashCategoryFilter === 'mesh'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🕸️ Mesh ({meshSashCount})
                </button>
              </div>

              {/* Grid of 2x2 Sash Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedSashes.map((sash, index) => {
                  const isDoor = sash.sashType === 'door';
                  return (
                    <div
                      key={sash.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-3.5"
                    >
                      {/* Top Row: Sash Index + Badge + Trash */}
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">
                            SASH #{index + 1}
                          </span>
                          {isDoor ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              🚪 Door Sash (दरवाजा)
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              🪟 Window Sash (खिड़की)
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentSeries((s) => ({
                              ...s,
                              sashes: s.sashes.filter((it) => it.id !== sash.id),
                            }));
                          }}
                          className="text-slate-300 hover:text-rose-500 transition cursor-pointer p-0.5"
                          title="Delete Sash"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400 hover:text-rose-600" />
                        </button>
                      </div>

                      {/* Row 1: Category & Profile Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            CATEGORY (प्रकार)
                          </label>
                          <div className="relative">
                            <select
                              value={sash.sashType}
                              onChange={(e) => {
                                const val = e.target.value as 'window' | 'door';
                                updateCurrentSeries((s) => {
                                  const arr = [...s.sashes];
                                  const idx = arr.findIndex((it) => it.id === sash.id);
                                  if (idx >= 0) arr[idx] = { ...arr[idx], sashType: val };
                                  return { ...s, sashes: arr };
                                });
                              }}
                              className="w-full appearance-none px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-800 bg-white pr-7 cursor-pointer"
                            >
                              <option value="window">🪟 Window Sash (खिड़की)</option>
                              <option value="door">🚪 Door Sash (दरवाजा)</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            PROFILE NAME / DESCRIPTION
                          </label>
                          <input
                            type="text"
                            value={sash.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentSeries((s) => {
                                const arr = [...s.sashes];
                                const idx = arr.findIndex((it) => it.id === sash.id);
                                if (idx >= 0) arr[idx] = { ...arr[idx], name: val };
                                return { ...s, sashes: arr };
                              });
                            }}
                            className="px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-800 bg-white"
                          />
                        </div>
                      </div>

                      {/* Row 2: Sash Code, Sash Height, Bead Side Height */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            SASH CODE
                          </label>
                          <input
                            type="text"
                            value={sash.code}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentSeries((s) => {
                                const arr = [...s.sashes];
                                const idx = arr.findIndex((it) => it.id === sash.id);
                                if (idx >= 0) arr[idx] = { ...arr[idx], code: val };
                                return { ...s, sashes: arr };
                              });
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-mono font-bold text-blue-600 bg-blue-50/30"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            SASH HEIGHT (MM)
                          </label>
                          <input
                            type="number"
                            value={sash.realHeight}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              updateCurrentSeries((s) => {
                                const arr = [...s.sashes];
                                const idx = arr.findIndex((it) => it.id === sash.id);
                                if (idx >= 0) arr[idx] = { ...arr[idx], realHeight: val };
                                return { ...s, sashes: arr };
                              });
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            BEAD SIDE HT (MM)
                          </label>
                          <input
                            type="number"
                            value={sash.beadingSideHeight}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              updateCurrentSeries((s) => {
                                const arr = [...s.sashes];
                                const idx = arr.findIndex((it) => it.id === sash.id);
                                if (idx >= 0) arr[idx] = { ...arr[idx], beadingSideHeight: val };
                                return { ...s, sashes: arr };
                              });
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                          />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* =========================================================
                SECTION 3: Series Mullions (T-Mullions / Transoms)
               ========================================================= */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Series Mullions (T-Mullions / Transoms)
                  </h3>
                  <p className="text-xs text-slate-500">
                    T-Mullion and partition profiles define karein aur unki height set karein.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMullion}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Mullion
                </button>
              </div>

              {/* Grid of Mullion Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentSeries.mullions || []).map((mulCode, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="text-xs font-bold text-slate-700">
                        MULLION #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          updateCurrentSeries((s) => ({
                            ...s,
                            mullions: s.mullions.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="text-slate-300 hover:text-rose-500 transition cursor-pointer p-0.5"
                        title="Delete Mullion"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400 hover:text-rose-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          PROFILE CODE
                        </label>
                        <input
                          type="text"
                          value={mulCode}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentSeries((s) => {
                              const arr = [...s.mullions];
                              arr[idx] = val;
                              return { ...s, mullions: arr };
                            });
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          HEIGHT / WIDTH (MM)
                        </label>
                        <input
                          type="number"
                          value={currentSeries.seriesHeight || 60}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 60;
                            // Update profile height if needed
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* =========================================================
                SECTION 3.5: Series Interlocks (Sliding Interlocks) - Only for Sliding
               ========================================================= */}
            {currentSeries.type === 'sliding' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Series Interlocks (Sliding Interlocks)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sliding sashes overlap interlock configurations and height offsets customizer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `int-${Date.now()}`;
                      const count = (currentSeries.interlocks || []).length;
                      const newInt: any = {
                        id: newId,
                        code: `SWH 60-${String(8 + count).padStart(2, '0')}`,
                        name: count === 0 ? 'Interlock Profile (Standard)' : count === 1 ? 'Interlock Profile (Heavy)' : 'Interlock Profile',
                        heightOffset: 0,
                        targetSash: currentSeries.sashes[0]?.code || '',
                      };
                      updateCurrentSeries((s) => ({
                        ...s,
                        interlocks: [...(s.interlocks || []), newInt],
                      }));
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Interlock
                  </button>
                </div>

                {/* Grid of Interlock Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(currentSeries.interlocks || []).map((interlock, idx) => (
                    <div
                      key={interlock.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800">
                          INTERLOCK #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentSeries((s) => ({
                              ...s,
                              interlocks: (s.interlocks || []).filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-slate-300 hover:text-rose-500 transition cursor-pointer p-0.5"
                          title="Delete Interlock"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400 hover:text-rose-600" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            INTERLOCK CODE
                          </label>
                          <input
                            type="text"
                            value={interlock.code}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentSeries((s) => {
                                const arr = [...(s.interlocks || [])];
                                arr[idx] = { ...arr[idx], code: val };
                                return { ...s, interlocks: arr };
                              });
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-mono font-bold text-amber-600 bg-amber-50/30"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            NAME / DETAIL
                          </label>
                          <input
                            type="text"
                            value={interlock.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentSeries((s) => {
                                const arr = [...(s.interlocks || [])];
                                arr[idx] = { ...arr[idx], name: val };
                                return { ...s, interlocks: arr };
                              });
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-800 bg-slate-50/50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            SUB OFFSET (MM)
                          </label>
                          <input
                            type="number"
                            value={interlock.heightOffset ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              updateCurrentSeries((s) => {
                                const arr = [...(s.interlocks || [])];
                                arr[idx] = { ...arr[idx], heightOffset: val };
                                return { ...s, interlocks: arr };
                              });
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            USED ON SASH
                          </label>
                          <select
                            value={interlock.targetSash || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentSeries((s) => {
                                const arr = [...(s.interlocks || [])];
                                arr[idx] = { ...arr[idx], targetSash: val };
                                return { ...s, interlocks: arr };
                              });
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-800 bg-white"
                          >
                            <option value="">All / Any Sash</option>
                            {currentSeries.sashes.map((sash) => (
                              <option key={sash.id} value={sash.code}>
                                {sash.code} ({sash.realHeight}mm)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =========================================================
                SECTION 4: Glass Offset Adjustment
               ========================================================= */}
            <div className="bg-[#f0f7ff] border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-2.5 max-w-2xl">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-xs font-extrabold text-blue-950">
                    Casement Glass Offset Adjustment
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Casement glass size subtract karte waqt rule: <span className="font-mono font-semibold text-blue-900">Sash - (Sash_Height * 2) + O1 + O2</span>. Aap in offsets ko change kar sakte hain (Default: O1=6, O2=4).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                    OFFSET 1 (MM)
                  </label>
                  <input
                    type="number"
                    value={currentSeries.glassOffset1 ?? 6}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      updateCurrentSeries((s) => ({ ...s, glassOffset1: val }));
                    }}
                    className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-center text-slate-900 bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                    OFFSET 2 (MM)
                  </label>
                  <input
                    type="number"
                    value={currentSeries.glassOffset2 ?? 4}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      updateCurrentSeries((s) => ({ ...s, glassOffset2: val }));
                    }}
                    className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-center text-slate-900 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* =========================================================
                SECTION 5: Glass Beadings & Sizing Rules (ग्लास बीडिंग)
               ========================================================= */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Glass Beadings & Sizing Rules (ग्लास बीडिंग)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defines glass bead profiles for standard single/DGU glass panes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddGlassBeading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Glass Beading
                </button>
              </div>

              {/* Grid of Glass Bead Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(currentSeries.beading || []).map((bead, idx) => (
                  <div
                    key={bead.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          GLASS BEAD CODE
                        </label>
                        <input
                          type="text"
                          value={bead.code}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentSeries((s) => {
                              const arr = [...s.beading];
                              arr[idx] = { ...arr[idx], code: val };
                              return { ...s, beading: arr };
                            });
                          }}
                          className="px-2 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          MAX GLASS THICKNESS (MM)
                        </label>
                        <input
                          type="number"
                          value={bead.maxGlass}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateCurrentSeries((s) => {
                              const arr = [...s.beading];
                              arr[idx] = { ...arr[idx], maxGlass: val };
                              return { ...s, beading: arr };
                            });
                          }}
                          className="px-2 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentSeries((s) => ({
                          ...s,
                          beading: s.beading.filter((_, i) => i !== idx),
                        }));
                      }}
                      className="text-slate-300 hover:text-rose-500 transition cursor-pointer p-1"
                      title="Delete Glass Bead"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400 hover:text-rose-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* =========================================================
                SECTION 6: SLIDING / MESH Mesh Beading Profiles (जाली बीडिंग प्रोफाइल)
               ========================================================= */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    <span className="text-emerald-700 font-extrabold mr-1.5">SLIDING / MESH</span>
                    Mesh Beading Profiles (जाली बीडिंग प्रोफाइल)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Jab sliding ya casement me mesh (जाली) lage tab fly-mesh beading cutting ke liye profile code specify karein.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddDefaultMeshBeading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Mesh Beading
                </button>
              </div>

              {/* Mesh Beading Content or Empty State */}
              {(!currentSeries.meshBeading || currentSeries.meshBeading.length === 0) ? (
                <div className="border border-dashed border-slate-200 bg-slate-50/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2.5 text-center">
                  <p className="text-xs text-slate-500 font-medium">
                    Mesh Beading is not configured yet for this series.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddDefaultMeshBeading}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-2xs"
                  >
                    + Add Default Mesh Beading (SWH60-12-MESH)
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(currentSeries.meshBeading || []).map((mbead, idx) => (
                    <div
                      key={mbead.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            MESH BEAD CODE
                          </label>
                          <input
                            type="text"
                            value={mbead.code}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentSeries((s) => {
                                const arr = [...(s.meshBeading || [])];
                                arr[idx] = { ...arr[idx], code: val };
                                return { ...s, meshBeading: arr };
                              });
                            }}
                            className="px-2 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            MAX MESH THICKNESS (MM)
                          </label>
                          <input
                            type="number"
                            value={mbead.maxGlass}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 2;
                              updateCurrentSeries((s) => {
                                const arr = [...(s.meshBeading || [])];
                                arr[idx] = { ...arr[idx], maxGlass: val };
                                return { ...s, meshBeading: arr };
                              });
                            }}
                            className="px-2 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-800 bg-slate-50/50"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          updateCurrentSeries((s) => ({
                            ...s,
                            meshBeading: (s.meshBeading || []).filter((_, i) => i !== idx),
                          }));
                        }}
                        className="text-slate-300 hover:text-rose-500 transition cursor-pointer p-1"
                        title="Delete Mesh Bead"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400 hover:text-rose-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* =========================================================
                BOTTOM UPDATE & SAVE BUTTON
               ========================================================= */}
            <div className="flex justify-end pt-2 pb-4">
              <button
                type="button"
                onClick={handleSaveAll}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" />
                Update & Save
              </button>
            </div>

          </main>
          )}

        </div>

      </div>
    </div>
  );
};
