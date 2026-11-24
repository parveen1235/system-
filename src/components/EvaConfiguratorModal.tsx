import React, { useState } from 'react';
import { UPVCProject, UPVCFrame, GlassType, CustomerDesignCardItem } from '../types/upvc';
import { CadElevationDrawing } from './CadElevationDrawing';
import { recalculateFramePockets, DEFAULT_PRICING_CONFIG } from '../utils/upvcCalculations';
import {
  X,
  Minus,
  Maximize2,
  Bell,
  ChevronDown,
  Save,
  Pencil,
  RotateCcw,
  RotateCw,
  Maximize,
  Box,
  Layers,
  Sparkles,
  ExternalLink,
  Eye,
  Check
} from 'lucide-react';

export interface EvaConfiguratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  design: CustomerDesignCardItem;
  onSaveDesign: (updatedDesign: CustomerDesignCardItem) => void;
  onOpenInFullCAD?: (project: UPVCProject) => void;
  onOpen3DModal?: (project: UPVCProject) => void;
}

export const EvaConfiguratorModal: React.FC<EvaConfiguratorModalProps> = ({
  isOpen,
  onClose,
  design,
  onSaveDesign,
  onOpenInFullCAD,
  onOpen3DModal,
}) => {
  if (!isOpen) return null;

  // Local Form State
  const [tag, setTag] = useState(design.tag || 'W10');
  const [quantity, setQuantity] = useState(design.quantity || 1);
  const [designName, setDesignName] = useState(design.type || 'Sliding Window');
  const [location, setLocation] = useState(design.location || 'Hall');
  const [floorNumber, setFloorNumber] = useState('1');
  const [note, setNote] = useState('');
  const [selectedGlass, setSelectedGlass] = useState<string>(
    design.glassType === 'tinted_reflective' || design.glassType === 'clear_6mm'
      ? '5 MM BLACK GLASS'
      : '5 MM BLACK GLASS'
  );
  const [viewMode, setViewMode] = useState<'Inside' | 'Outside'>('Inside');
  const [showDimensions, setShowDimensions] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Local project copy for interactive canvas
  const [currentProject, setCurrentProject] = useState<UPVCProject>(() => {
    if (design.projectData && design.projectData.frames?.length > 0) {
      return JSON.parse(JSON.stringify(design.projectData));
    }
    // Fallback frame
    const fW = design.width || 1200;
    const fH = design.height || 1700;
    const isSlider = design.type === 'Sliding' || design.seriesName?.toLowerCase().includes('sliding');

    const f: UPVCFrame = {
      id: `f-${design.id}`,
      name: 'F1',
      x: 0,
      y: 0,
      width: fW,
      height: fH,
      frameProfileWidth: 60,
      mullionProfileWidth: 74,
      sashProfileWidth: 60,
      color: design.profileColor || 'white',
      series: 'sliding_62',
      mullions: isSlider ? [{ id: 'm1', orientation: 'vertical', position: Math.round(fW / 2) }] : [],
      pockets: [],
      reinforcement: 'steel_1.5mm',
      drainageCaps: true,
    };
    f.pockets = recalculateFramePockets(f).map((pkt, idx) => ({
      ...pkt,
      sashType: isSlider
        ? (idx === 0 ? 'slider_arrow_right' : 'slider_arrow_left')
        : 'casement_left',
      glassType: 'tint_grey',
    }));

    return {
      id: `proj_${design.id}`,
      name: `${design.tag} Project`,
      clientName: 'Customer',
      referenceNo: design.tag,
      date: new Date().toISOString(),
      frames: [f],
      couplings: [],
      pricingConfig: DEFAULT_PRICING_CONFIG,
    };
  });

  const handleApply = () => {
    const updated: CustomerDesignCardItem = {
      ...design,
      tag,
      quantity,
      location,
      type: designName,
      projectData: currentProject,
      totalPrice: design.unitPrice * quantity,
    };
    onSaveDesign(updated);
    setToastMsg('Design updated successfully!');
    setTimeout(() => {
      setToastMsg(null);
      onClose();
    }, 600);
  };

  const frames = currentProject.frames || [];
  const couplings = currentProject.couplings || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col border border-slate-300 overflow-hidden">
        {/* TOP BAR (Matches Screenshot 4) */}
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
          {/* Left Brand & Design Ref */}
          <div className="flex items-center gap-6">
            {/* Logo 'eva' */}
            <div className="flex items-center gap-1.5 font-bold tracking-tight">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                e
              </div>
              <span className="text-base font-extrabold text-slate-800">eva</span>
            </div>

            {/* Design ref : W10 | Qty: 1 | Location: Hall */}
            <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Design ref. :</span>
                <span className="font-bold text-slate-900">{tag}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Qty:</span>
                <span className="font-bold text-slate-900">{quantity}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Location:</span>
                <span className="font-bold text-slate-900">{location || 'None'}</span>
                <Pencil className="w-3 h-3 text-slate-400 cursor-pointer hover:text-blue-600 ml-0.5" />
              </div>
            </div>
          </div>

          {/* Right Action Icons & Window Controls */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer">
              <Bell className="w-4 h-4" />
            </button>

            {/* Save ▾ Button */}
            <div className="flex items-center">
              <button
                onClick={handleApply}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-l-md flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                onClick={handleApply}
                className="bg-blue-700 hover:bg-blue-800 text-white px-1.5 py-1.5 rounded-r-md border-l border-blue-500 transition cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Window control buttons: -  🗖  ✕ */}
            <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-slate-200">
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                title="Minimize"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                title="Maximize"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN BODY: LEFT FORM + CENTER CAD CANVAS */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: EDIT FORM (Matches Screenshot 4) */}
          <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
            {/* Tab: Edit */}
            <div className="border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 border-b-2 border-blue-600 pb-2 -mb-2.5">
                Edit
              </span>
            </div>

            {/* Form Fields */}
            <div className="p-4 space-y-3.5 text-xs">
              {/* Row: Design Ref * | Quantity * */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Design ref. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Design Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Design name
                </label>
                <input
                  type="text"
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Row: Location | Floor Number */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bed Room"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Floor number
                  </label>
                  <input
                    type="text"
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Note
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Special instructions or customer notes"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-500 resize-none text-xs"
                />
              </div>

              {/* Selected Glass Dropdown */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Selected glass
                </label>
                <div className="relative">
                  <select
                    value={selectedGlass}
                    onChange={(e) => setSelectedGlass(e.target.value)}
                    className="w-full appearance-none px-2.5 py-2 border border-slate-300 rounded-md font-semibold text-slate-800 bg-white focus:outline-none focus:border-blue-500 pr-8 text-xs cursor-pointer"
                  >
                    <option value="5 MM BLACK GLASS">5 MM BLACK GLASS</option>
                    <option value="6 MM TOUGHENED CLEAR">6 MM TOUGHENED CLEAR</option>
                    <option value="5 MM TOUGHENED FROSTED">5 MM TOUGHENED FROSTED</option>
                    <option value="5 MM TINTED REFLECTIVE">5 MM TINTED REFLECTIVE</option>
                    <option value="DGU 24 MM (5+14A+5)">DGU 24 MM (5+14A+5)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Note: This is not applied to louver glass.
                </p>
              </div>

              {/* Action Buttons: Cancel | Apply */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply</span>
                </button>
              </div>

              {/* Open in full Vector CAD workspace */}
              {onOpenInFullCAD && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenInFullCAD(currentProject);
                      onClose();
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 rounded-md font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Full CAD Workspace</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CENTER WORKSPACE: CAD GRID CANVAS */}
          <div className="flex-1 bg-[#f8fafc] flex flex-col relative overflow-hidden">
            {/* Canvas Grid Background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(148, 163, 184, 0.2) 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px',
              }}
            />

            {/* Toast Notification */}
            {toastMsg && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{toastMsg}</span>
              </div>
            )}

            {/* CAD Drawing Area */}
            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
              <div className="w-full max-w-2xl h-full max-h-[560px] flex items-center justify-center">
                <CadElevationDrawing
                  frames={frames}
                  couplings={couplings}
                  width="100%"
                  height="100%"
                  showDimensions={showDimensions}
                  showLabels={true}
                  showHandles={true}
                  showArrows={true}
                  badgeTag={tag}
                  title={`${tag} • ${design.width}×${design.height}mm`}
                />
              </div>

              {/* Bottom floor line indicator: Floor Aperture Distance = 900 */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-slate-500 bg-white/90 border border-slate-200 px-3 py-1 rounded shadow-2xs">
                Floor Aperture Distance = {design.floorDistance || 900}
              </div>
            </div>

            {/* Bottom View Mode Toggle: [Inside] | [Outside] */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center bg-white rounded-md border border-slate-300 shadow-xs p-0.5 text-xs font-semibold">
              <button
                onClick={() => setViewMode('Inside')}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  viewMode === 'Inside'
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inside
              </button>
              <button
                onClick={() => setViewMode('Outside')}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  viewMode === 'Outside'
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Outside
              </button>
            </div>

            {/* Floating Bottom-Right Toolbar (Matches Screenshot 4) */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg shadow-md p-1">
              <button
                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition cursor-pointer"
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition cursor-pointer"
                title="Redo"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDimensions(!showDimensions)}
                className={`p-1.5 rounded transition cursor-pointer ${
                  showDimensions ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Toggle Dimensions"
              >
                <Maximize className="w-4 h-4" />
              </button>
              {onOpen3DModal && (
                <button
                  onClick={() => onOpen3DModal(currentProject)}
                  className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded transition cursor-pointer"
                  title="3D Realistic View"
                >
                  <Box className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
