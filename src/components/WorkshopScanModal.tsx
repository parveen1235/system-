import React from 'react';
import { UPVCProject } from '../types/upvc';
import { ERPProjectRecord } from '../types/erp';
import { generateCuttingSchedule, calculateAssemblyBounds } from '../utils/upvcCalculations';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  Maximize,
  Scissors,
  Layers,
  Wrench,
  X,
  Share2,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface WorkshopScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: UPVCProject;
  erpRecord?: ERPProjectRecord;
  lang?: 'hi' | 'en';
}

export const WorkshopScanModal: React.FC<WorkshopScanModalProps> = ({
  isOpen,
  onClose,
  project,
  erpRecord,
  lang = 'en',
}) => {
  if (!isOpen) return null;

  const cuttingItems = generateCuttingSchedule(project.frames || [], project.couplings || []);
  const bounds = calculateAssemblyBounds(project.frames || []);

  const outerFrames = cuttingItems.filter((i) => i.itemType === 'Outer Frame');
  const mullions = cuttingItems.filter((i) => i.itemType === 'Mullion' || i.itemType === 'Transom');
  const sashes = cuttingItems.filter((i) => i.itemType === 'Sash');
  const glass = cuttingItems.filter((i) => i.itemType === 'Glass');
  const steel = cuttingItems.filter((i) => i.itemType === 'Reinforcement');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Workshop Fabrication Floor (Scan View)</h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  LIVE WORK ORDER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mobile-optimized read-only cut sheet & pocket assembly for factory fabricators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Work Order Card */}
          <div className="bg-slate-850 p-5 rounded-xl border border-slate-750 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Job Reference</div>
              <div className="text-xl font-black text-white font-mono">{project.referenceNo || 'WO-2026-084'}</div>
              <div className="text-xs text-emerald-400 font-medium mt-0.5">
                Client: {erpRecord?.clientName || project.clientName || 'Malhotra Luxury Residences'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Assembly Size</div>
                <div className="text-xs font-bold text-white font-mono">
                  {bounds.totalWidth} × {bounds.totalHeight} mm
                </div>
              </div>
              <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Total Frames</div>
                <div className="text-xs font-bold text-indigo-400 font-mono">
                  {project.frames?.length || 1} Units
                </div>
              </div>
              <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Coupler Gap</div>
                <div className="text-xs font-bold text-emerald-400 font-mono">2.0 mm</div>
              </div>
            </div>
          </div>

          {/* Quick checklist tabs / groups */}
          <div className="space-y-4">
            {/* 1. Outer Frame Cuts (45 deg) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wide">
                  <Scissors className="w-4 h-4 text-indigo-400" />
                  <span>1. Outer Frame Profiles (45° Miter Cuts)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{outerFrames.length} pieces</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {outerFrames.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-bold text-white">{item.tag}</div>
                      <div className="text-[10px] text-slate-400">{item.profileName.split(' ')[0]}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-amber-400">{item.length} mm</div>
                      <div className="text-[10px] text-slate-400 font-mono">45° ∠ 45°</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Mullions / Transoms (90 deg) */}
            {mullions.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wide">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>2. Mullions & Transoms (90° / V-Notch Joint)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{mullions.length} pieces</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {mullions.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-[11px] font-bold text-white">{item.tag}</div>
                        <div className="text-[10px] text-slate-400">{item.frameName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-blue-400">{item.length} mm</div>
                        <div className="text-[10px] text-slate-400 font-mono">90° Notch</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Glass Sizing with Bead Clearances */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>3. Glass Panel Cutting Schedule</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{glass.length} panels</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {glass.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-bold text-white">{item.tag}</div>
                      <div className="text-[10px] text-slate-400">{item.profileName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        {item.width} × {item.height} mm
                      </div>
                      <div className="text-[10px] text-slate-400">Qty: {item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <span>Worker Scan ID: TECH-FAB-04</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Barcode Label</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
