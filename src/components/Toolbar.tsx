import React, { useState } from 'react';
import {
  MousePointer,
  Columns,
  Rows,
  Split,
  Plus,
  Equal,
  Palette,
  Sliders,
  HelpCircle,
  FolderOpen,
  Layers,
  Square,
  Shield,
  Maximize,
  Trash2,
  Fan,
  Scissors,
  Bot,
  Grid,
} from 'lucide-react';
import { UPVCColor } from '../types/upvc';
import { DEFAULT_COLORS } from '../utils/upvcCalculations';
import { PaletteCategory } from './SashTypesPalette';

interface ToolbarProps {
  activeTool: 'select' | 'v_mullion' | 'h_mullion' | 'coupling' | 'h_coupling_split' | 'v_coupling_split';
  setActiveTool: (tool: 'select' | 'v_mullion' | 'h_mullion' | 'coupling' | 'h_coupling_split' | 'v_coupling_split') => void;
  onAddVerticalMullion: () => void;
  onAddHorizontalMullion: () => void;
  onAddCoupledFrame: (direction: 'right' | 'left' | 'bottom') => void;
  onAddNewFrame: () => void;
  onNewDesign1000?: () => void;
  onEqualizeMullions: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  selectedType: 'frame' | 'mullion' | 'pocket' | 'coupling' | null;
  currentColor: string;
  onSelectColor: (colorId: string) => void;
  showSashPalette?: boolean;
  onToggleSashPalette?: () => void;
  activeCategoryTab?: PaletteCategory;
  onSelectCategoryTab?: (category: PaletteCategory) => void;
  onOpenCuttingList?: () => void;
  onCloseSashPalette?: () => void;
  onOpenPaperScanBot?: () => void;
  onLoad4PanelFSSF?: () => void;
  lang: 'hi' | 'en';
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onAddVerticalMullion,
  onAddHorizontalMullion,
  onAddCoupledFrame,
  onAddNewFrame,
  onNewDesign1000,
  onEqualizeMullions,
  onDeleteSelected,
  hasSelection,
  selectedType,
  currentColor,
  onSelectColor,
  showSashPalette,
  onToggleSashPalette,
  activeCategoryTab = 'casement',
  onSelectCategoryTab,
  onOpenCuttingList,
  onCloseSashPalette,
  onOpenPaperScanBot,
  onLoad4PanelFSSF,
  lang,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleOpenCategory = (cat: PaletteCategory) => {
    if (onSelectCategoryTab) {
      onSelectCategoryTab(cat);
    }
  };

  return (
    <aside className="w-16 bg-white border-r border-slate-200 py-3 flex flex-col items-center justify-between shrink-0 select-none z-20 shadow-xs">
      {/* Top Core Tool Buttons */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        {/* + New 1000x1000 Design Button */}
        {onNewDesign1000 && (
          <button
            onClick={onNewDesign1000}
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition group"
            title="नया 1000×1000mm डिज़ाइन (+ New 1000×1000 Frame)"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[8px] font-black mt-0.5 leading-none">1000²</span>
          </button>
        )}

        {/* 4-Panel [ FIX | SLIDE → | 🔒 | ← SLIDE | FIX ] Quick Button */}
        {onLoad4PanelFSSF && (
          <button
            onClick={onLoad4PanelFSSF}
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition group cursor-pointer"
            title="4-पैनल विंडो तुरंत लोड करें: साइड फिक्स + बीच में 2 स्लाइड + बीच में लॉक"
          >
            <span className="text-[12px] leading-none">🔒</span>
            <span className="text-[7px] font-black mt-0.5 leading-none">4P FSSF</span>
          </button>
        )}

        {/* 1. Select Tool */}
        <button
          onClick={() => setActiveTool('select')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition group relative ${
            activeTool === 'select'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
          title="Select & Dimension Editor (सेलेक्ट टूल)"
        >
          <MousePointer className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">Select</span>
        </button>

        {/* 1.3 AI PAPER-TO-CAD SCANNER BOT BUTTON */}
        {onOpenPaperScanBot && (
          <button
            onClick={onOpenPaperScanBot}
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center bg-linear-to-br from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-600/20 transition group cursor-pointer relative"
            title="कागज़ स्कैन कर CAD बनाएं (Zero-Token AI Paper-to-CAD Scanner)"
          >
            <Bot className="w-4 h-4 text-amber-300" />
            <span className="text-[7.5px] font-black mt-0.5 leading-none">AI Scan</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
          </button>
        )}

        {/* 1.5 CUTTING LIST TOOL BUTTON */}
        {onOpenCuttingList && (
          <button
            onClick={onOpenCuttingList}
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 shadow-xs transition group cursor-pointer"
            title="Factory Cutting List & BOM (कटिंग लिस्ट व निर्माण सूची खोलें)"
          >
            <Scissors className="w-4 h-4 text-emerald-600 group-hover:text-white" />
            <span className="text-[8px] font-black mt-0.5 leading-none">Cutting</span>
          </button>
        )}

        <div className="w-8 h-px bg-slate-200 my-0.5" />

        {/* 2. CASEMENT (केसमेंट ऑप्शन्स) */}
        <button
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'sash:casement_left');
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'sash_type', sashType: 'casement_left' }));
            setTimeout(() => {
              if (onCloseSashPalette) onCloseSashPalette();
            }, 50);
          }}
          onDragEnd={() => {
            if (onCloseSashPalette) onCloseSashPalette();
          }}
          onClick={() => handleOpenCategory('casement')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition group relative cursor-grab active:cursor-grabbing ${
            showSashPalette && activeCategoryTab === 'casement'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 border border-slate-200'
          }`}
          title="Casement Options / केसमेंट (Drag to window or click)"
        >
          <Square className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5 truncate">Casement</span>
        </button>

        {/* 3. SLIDING (स्लाइडिंग ऑप्शन्स) */}
        <button
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'sash:slider_arrow_right');
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'sash_type', sashType: 'slider_arrow_right' }));
            setTimeout(() => {
              if (onCloseSashPalette) onCloseSashPalette();
            }, 50);
          }}
          onDragEnd={() => {
            if (onCloseSashPalette) onCloseSashPalette();
          }}
          onClick={() => handleOpenCategory('sliding')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition group relative cursor-grab active:cursor-grabbing ${
            showSashPalette && activeCategoryTab === 'sliding'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 border border-slate-200'
          }`}
          title="Sliding Options / स्लाइडिंग (Drag to window or click)"
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5 truncate">Sliding</span>
        </button>

        {/* TOOL SYSTEM (FAN & AC - टूल) */}
        <button
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'fan_ac:dia_200');
            e.dataTransfer.setData(
              'application/json',
              JSON.stringify({
                type: 'fan_ac',
                hasFanCutout: true,
                fanCutoutDiameter: 200,
                fanPanelType: 'glass_hole',
                rawText: 'fan_ac:dia_200',
              })
            );
            e.dataTransfer.effectAllowed = 'copyMove';
            setTimeout(() => {
              if (onCloseSashPalette) onCloseSashPalette();
            }, 50);
          }}
          onDragEnd={() => {
            if (onCloseSashPalette) onCloseSashPalette();
          }}
          onClick={() => handleOpenCategory('fan_ac')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition group relative cursor-grab active:cursor-grabbing ${
            showSashPalette && activeCategoryTab === 'fan_ac'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25'
              : 'text-cyan-800 bg-cyan-50/60 hover:bg-cyan-100 hover:text-cyan-700 hover:border-cyan-300 border border-cyan-200'
          }`}
          title="Tool (Fan & AC) / टूल: पंखा व एसी (Drag to any section or click to open)"
        >
          <Fan className="w-4 h-4" />
          <span className="text-[8px] font-extrabold mt-0.5 truncate">Tool</span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full border-2 border-white" />
        </button>

        {/* 4. PANELS & MESH (पैनल व मेश) */}
        <button
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'panel:mesh_sash');
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'panel_type', sashType: 'mesh_sash' }));
            setTimeout(() => {
              if (onCloseSashPalette) onCloseSashPalette();
            }, 50);
          }}
          onDragEnd={() => {
            if (onCloseSashPalette) onCloseSashPalette();
          }}
          onClick={() => handleOpenCategory('panels')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition group relative cursor-grab active:cursor-grabbing ${
            showSashPalette && activeCategoryTab === 'panels'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 border border-slate-200'
          }`}
          title="Panels, Mesh & Glass / पैनल व मेश (Drag to window or click)"
        >
          <Shield className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5 truncate">Panels</span>
        </button>

        {/* 4.5 DORGEN BAR / GEORGIAN BAR (डोरगन बार / काँच सजावटी ग्रिड) */}
        <button
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'panel:georgian_grid');
            e.dataTransfer.setData(
              'application/json',
              JSON.stringify({
                type: 'panel_type',
                gridPattern: 'georgian_2x2',
                georgianBar: {
                  enabled: true,
                  pattern: 'georgian_2x2',
                  color: 'gold',
                  barWidth: 18,
                  style: 'internal',
                },
              })
            );
            setTimeout(() => {
              if (onCloseSashPalette) onCloseSashPalette();
            }, 50);
          }}
          onDragEnd={() => {
            if (onCloseSashPalette) onCloseSashPalette();
          }}
          onClick={() => handleOpenCategory('panels')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition group relative cursor-grab active:cursor-grabbing ${
            showSashPalette && activeCategoryTab === 'panels'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'text-amber-800 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 border border-slate-200'
          }`}
          title="Georgian Bar (डोरगन बार) - Drag to window bay or click to open styles"
        >
          <Grid className="w-4 h-4 text-amber-500 group-hover:text-amber-600" />
          <span className="text-[7.5px] font-black mt-0.5 truncate leading-none">Dorgen</span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white" />
        </button>

        {/* 5. COUPLING (2mm कप्लिंग जोड़) */}
        <button
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'h_split');
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'coupling', direction: 'horizontal' }));
            setTimeout(() => {
              if (onCloseSashPalette) onCloseSashPalette();
            }, 50);
          }}
          onDragEnd={() => {
            if (onCloseSashPalette) onCloseSashPalette();
          }}
          onClick={() => handleOpenCategory('coupling')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition group relative cursor-grab active:cursor-grabbing ${
            showSashPalette && activeCategoryTab === 'coupling'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 border border-slate-200'
          }`}
          title="Coupling Options / 2mm कप्लिंग जोड़ (Drag to window or click)"
        >
          <Split className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5 truncate">Coupling</span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
        </button>

        {/* 6. MULLIONS & TRANSOMS (मुलियन व ट्रांसॉम) */}
        <button
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'mullion:vertical');
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'mullion', orientation: 'vertical' }));
            setTimeout(() => {
              if (onCloseSashPalette) onCloseSashPalette();
            }, 50);
          }}
          onDragEnd={() => {
            if (onCloseSashPalette) onCloseSashPalette();
          }}
          onClick={() => handleOpenCategory('mullions')}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition group relative cursor-grab active:cursor-grabbing ${
            showSashPalette && activeCategoryTab === 'mullions'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 border border-slate-200'
          }`}
          title="Mullions & Transoms / मुलियन (Drag to window or click)"
        >
          <Columns className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5 truncate">Mullion</span>
        </button>

        <div className="w-8 h-px bg-slate-200 my-0.5" />

        {/* 7. Equalize Mullions Button */}
        <button
          onClick={onEqualizeMullions}
          className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition"
          title="Equalize Bays / खानों को बराबर करें"
        >
          <Equal className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5">Equal</span>
        </button>

        {/* 8. Profile Color Picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition"
            title="uPVC Profile Color (प्रोफाइल रंग)"
          >
            <Palette className="w-4 h-4" />
            <span className="text-[8px] font-bold mt-0.5">Color</span>
          </button>

          {showColorPicker && (
            <div className="absolute left-full top-0 ml-2 w-48 bg-white border border-slate-300 rounded-xl shadow-xl p-2.5 z-50 animate-in fade-in">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Profile Colors</div>
              <div className="grid grid-cols-3 gap-2">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectColor(c.id);
                      setShowColorPicker(false);
                    }}
                    className={`h-8 rounded-lg border flex items-center justify-center transition ${
                      currentColor === c.id ? 'ring-2 ring-blue-500' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-8 h-px bg-slate-200 my-0.5" />

        {/* 9. Delete Selected Item Button */}
        <button
          onClick={onDeleteSelected}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition group relative ${
            hasSelection
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 shadow-xs'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-200'
          }`}
          title={lang === 'hi' ? 'सेलेक्टेड फ्रेम / मुलियन / कप्लिंग हटाएं (Delete / Backspace)' : 'Delete Selected Item (Del / Backspace)'}
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5">{lang === 'hi' ? 'Delete' : 'Delete'}</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="flex flex-col items-center gap-1">
        <div className="text-[9px] font-black text-slate-400">CAD</div>
      </div>
    </aside>
  );
};
