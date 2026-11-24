import React, { useState } from 'react';
import { UPVCProject } from '../types/upvc';
import {
  FolderOpen,
  Plus,
  Trash2,
  Calendar,
  Layers,
  X,
  Check,
  Download,
  Copy,
  Sparkles,
} from 'lucide-react';
import { calculateAssemblyBounds } from '../utils/upvcCalculations';

interface SavedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedProjects: UPVCProject[];
  currentProjectId: string;
  onLoadProject: (project: UPVCProject) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onSaveCurrentProject: (name?: string) => void;
  lang: 'hi' | 'en';
}

export const SavedProjectsModal: React.FC<SavedProjectsModalProps> = ({
  isOpen,
  onClose,
  savedProjects,
  currentProjectId,
  onLoadProject,
  onNewProject,
  onDeleteProject,
  onSaveCurrentProject,
  lang,
}) => {
  const [saveName, setSaveName] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'hi' ? 'सुरक्षित डिज़ाइन (Saved Projects)' : 'Saved Designs & Projects'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'hi'
                  ? 'पुराने डिज़ाइन खोलें या 1000×1000mm का नया डिज़ाइन शुरू करें'
                  : 'Manage saved elevations or start a new 1000x1000 design'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'hi' ? '+ नया डिज़ाइन (1000×1000mm)' : '+ New Design (1000x1000mm)'}</span>
          </button>

          <button
            onClick={() => {
              onSaveCurrentProject();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'hi' ? 'वर्तमान डिज़ाइन सुरक्षित करें (Save Current)' : 'Save Current Design'}</span>
          </button>
        </div>

        {/* Projects List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {savedProjects.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40 text-blue-500" />
              <p className="text-sm font-semibold text-slate-600">
                {lang === 'hi' ? 'कोई सुरक्षित डिज़ाइन नहीं मिला' : 'No saved designs yet'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'hi'
                  ? 'अपना काम सुरक्षित करने के लिए ऊपर "वर्तमान डिज़ाइन सुरक्षित करें" दबाएँ।'
                  : 'Click "Save Current Design" to store your elevations.'}
              </p>
            </div>
          ) : (
            savedProjects.map((p) => {
              const bounds = calculateAssemblyBounds(p.frames || []);
              const isCurrent = p.id === currentProjectId;

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {p.name || 'Untitled Elevation'}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                          Active (चालू)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <Layers className="w-3 h-3 text-blue-500" />
                        {bounds.totalWidth} × {bounds.totalHeight} mm
                      </span>
                      <span>{p.frames?.length || 1} Frames ({p.couplings?.length || 0} Couplings)</span>
                      {p.referenceNo && <span>Ref: {p.referenceNo}</span>}
                      {p.date && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {p.date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onLoadProject(p);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        isCurrent
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      {lang === 'hi' ? 'लोड करें (Open)' : 'Open'}
                    </button>

                    {savedProjects.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(lang === 'hi' ? 'क्या आप इस डिज़ाइन को हटाना चाहते हैं?' : 'Delete this saved design?')) {
                            onDeleteProject(p.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            {savedProjects.length} {lang === 'hi' ? 'डिज़ाइन सुरक्षित हैं' : 'saved projects in local database'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition"
          >
            {lang === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
