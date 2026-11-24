import React, { useState, useMemo, useEffect } from 'react';
import { CustomerDesignCardItem } from './CustomerProjectView';
import { CustomerRecord } from '../types/erp';
import {
  calculateProjectProfileRequirement,
  ProjectProfileRequisition,
  ProfileSectionRequirement,
} from '../utils/profileRequirementEngine';
import {
  Boxes,
  Scissors,
  Layers,
  Ruler,
  Scale,
  DollarSign,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Download,
  Info,
  ExternalLink,
  Shield,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { downloadBlob } from '../utils/exportUtils';

export interface ProfileRequirementViewProps {
  designs: CustomerDesignCardItem[];
  customer?: CustomerRecord;
  onOpenDesignInCAD?: (design: CustomerDesignCardItem) => void;
  className?: string;
  initialCategory?: 'upvc' | 'gi' | 'all';
}

export const ProfileRequirementView: React.FC<ProfileRequirementViewProps> = ({
  designs,
  customer,
  onOpenDesignInCAD,
  className = '',
  initialCategory = 'upvc',
}) => {
  // Material Separation Mode: 'upvc' (Duron Profiles) | 'gi' (GI Steel Reinforcement - ALAG) | 'all' (Combined)
  const [materialCategory, setMaterialCategory] = useState<'upvc' | 'gi' | 'all'>(initialCategory);

  useEffect(() => {
    if (initialCategory) {
      setMaterialCategory(initialCategory);
    }
  }, [initialCategory]);

  // 1. Universal Standard bar length state (Duron standard: 5800mm default)
  const [universalBarLength, setUniversalBarLength] = useState<number>(5800);

  // GI Standard Steel Pipe length state (6000mm / 20 Ft standard steel pipe default)
  const [giPipeLength, setGiPipeLength] = useState<number>(6000);
  const [giSawKerf, setGiSawKerf] = useState<number>(3); // 3mm metal cold saw blade kerf

  // 2. Custom bar length per section ID (groupKey): { [sectionId]: number }
  const [customBarLengths, setCustomBarLengths] = useState<Record<string, number>>({});

  // 3. Selection Strategy Mode:
  //    'universal': "Sabko ek size ka rakhna hai" (All profiles have uniform bar length)
  //    'per-section': "Kisi ek ka kam karna hai" (Individual custom bar length per profile)
  const [barConfigMode, setBarConfigMode] = useState<'universal' | 'per-section'>('universal');
  const [showSectionConfigPanel, setShowSectionConfigPanel] = useState<boolean>(false);

  const [sawKerf, setSawKerf] = useState<number>(4);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'bars' | 'window-wise'>('summary');
  const [isExporting, setIsExporting] = useState(false);

  // Common bar length presets for uPVC
  const BAR_PRESETS = [
    { label: '5800 mm (Duron Standard)', value: 5800 },
    { label: '5500 mm', value: 5500 },
    { label: '5000 mm', value: 5000 },
    { label: '4500 mm', value: 4500 },
    { label: '3000 mm (Half Bar)', value: 3000 },
    { label: '6000 mm (Standard 6M)', value: 6000 },
  ];

  // Common pipe length presets for GI Galvanized Steel Reinforcement
  const GI_PIPE_PRESETS = [
    { label: '6000 mm (Standard 6M / 20 Ft)', value: 6000 },
    { label: '5800 mm', value: 5800 },
    { label: '5000 mm', value: 5000 },
    { label: '4000 mm', value: 4000 },
    { label: '3000 mm (Half Pipe)', value: 3000 },
  ];

  // Helper flags
  const customizedCount = Object.keys(customBarLengths).length;
  const isAnyCustomized = customizedCount > 0;

  const handleSetSectionLength = (sectionId: string, length: number) => {
    const safeLength = Math.max(500, Math.min(12000, Math.round(length)));
    setCustomBarLengths((prev) => ({
      ...prev,
      [sectionId]: safeLength,
    }));
    setBarConfigMode('per-section');
  };

  const handleResetSectionLength = (sectionId: string) => {
    setCustomBarLengths((prev) => {
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
  };

  const handleApplyUniversalToAll = (length?: number) => {
    const target = length && length > 0 ? length : universalBarLength;
    setUniversalBarLength(target);
    setCustomBarLengths({});
    setBarConfigMode('universal');
  };

  const handleResetAllToDuronDefault = () => {
    setUniversalBarLength(5800);
    setCustomBarLengths({});
    setBarConfigMode('universal');
  };

  // Calculate requirement reactively
  const requisition: ProjectProfileRequisition = useMemo(() => {
    return calculateProjectProfileRequirement(designs, {
      standardBarLength: universalBarLength,
      sawKerf,
      giStandardPipeLength: giPipeLength,
      giSawKerf,
      brand: customer?.brand || 'Duron',
      sectionBarLengths: isAnyCustomized ? customBarLengths : undefined,
    });
  }, [designs, universalBarLength, customBarLengths, isAnyCustomized, sawKerf, giPipeLength, giSawKerf, customer]);

  // Active sections filtered according to the selected Material view
  const activeSections = useMemo(() => {
    if (materialCategory === 'upvc') return requisition.upvcSections;
    if (materialCategory === 'gi') return requisition.giSections;
    return requisition.sections;
  }, [materialCategory, requisition]);

  // Set default expanded section to first one if not set
  React.useEffect(() => {
    if (!expandedSectionId && requisition.sections.length > 0) {
      setExpandedSectionId(requisition.sections[0].id);
    }
  }, [requisition.sections, expandedSectionId]);

  // Export Profile Requirement to Excel (.xlsx) using ExcelJS with SEPARATE uPVC & GI Steel Sheets
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'UPVC & Aluminium CAD Engine';
      workbook.created = new Date();

      // ==========================================
      // SHEET 1: uPVC PROFILES REQUISITION (DURON)
      // ==========================================
      const sheet1 = workbook.addWorksheet('uPVC Profiles (Duron)');
      sheet1.mergeCells('A1:I1');
      sheet1.getCell('A1').value = `${customer?.name || 'PROJECT'} — DURON uPVC PROFILES REQUISITION`;
      sheet1.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      sheet1.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }, // Slate-900
      };
      sheet1.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      sheet1.getRow(1).height = 30;

      sheet1.mergeCells('A2:I2');
      sheet1.getCell('A2').value = `Standard Stock Bar Length: ${universalBarLength} mm (Duron Specification) ${isAnyCustomized ? `| Custom Per-Profile Lengths Active` : '| Universal'} | Saw Blade Kerf: ${sawKerf} mm | Total uPVC Bars: ${requisition.upvcSummary.totalBarsOrPipes} Bars | Date: ${new Date().toLocaleDateString('en-IN')}`;
      sheet1.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF475569' } };
      sheet1.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
      sheet1.getRow(2).height = 20;

      const headerRow1 = sheet1.addRow([
        'Sr No',
        'Profile Section (Extrusion)',
        'Category',
        'Profile Code',
        'Stock Bar Length (mm)',
        'Total Cuts (Pcs)',
        'Net Length (M)',
        'Bars to Order (Full Bars)',
        'Offcut / Scrap (M)',
      ]);
      headerRow1.height = 25;
      headerRow1.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' }, // Blue-600
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      requisition.upvcSections.forEach((sec, idx) => {
        const row = sheet1.addRow([
          idx + 1,
          sec.profileName,
          sec.category,
          sec.profileCode,
          sec.standardBarLength,
          sec.totalPieces,
          sec.totalNetMeters,
          sec.requiredBarsCount,
          `${sec.totalOffcutMeters} M (${sec.offcutPercent}%)`,
        ]);
        row.height = 20;
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        row.getCell(6).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'right' };
        row.getCell(8).alignment = { horizontal: 'center' };
        row.getCell(8).font = { bold: true, color: { argb: 'FF1E40AF' } };
        row.getCell(9).alignment = { horizontal: 'right' };
      });

      const totalRow1 = sheet1.addRow([
        '',
        'TOTAL uPVC EXTRUSIONS',
        '',
        '',
        '',
        requisition.upvcSummary.totalPiecesCount,
        requisition.upvcSummary.totalNetMeters,
        requisition.upvcSummary.totalBarsOrPipes,
        `${(requisition.upvcSummary.totalProcuredMeters - requisition.upvcSummary.totalNetMeters).toFixed(2)} M (${requisition.upvcSummary.overallWastagePercent}%)`,
      ]);
      totalRow1.height = 25;
      totalRow1.font = { bold: true };
      totalRow1.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDBEAFE' }, // Blue-100
        };
      });

      sheet1.columns = [
        { width: 8 },
        { width: 34 },
        { width: 18 },
        { width: 15 },
        { width: 22 },
        { width: 16 },
        { width: 16 },
        { width: 26 },
        { width: 22 },
      ];

      // ===============================================
      // SHEET 2: GI STEEL REINFORCEMENT ORDER (ALAG)
      // ===============================================
      const sheet2 = workbook.addWorksheet('GI Steel Reinforcement (अलग)');
      sheet2.mergeCells('A1:I1');
      sheet2.getCell('A1').value = `${customer?.name || 'PROJECT'} — GALVANIZED STEEL (GI) REINFORCEMENT REQUISITION`;
      sheet2.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      sheet2.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF78350F' }, // Amber-900
      };
      sheet2.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      sheet2.getRow(1).height = 30;

      sheet2.mergeCells('A2:I2');
      sheet2.getCell('A2').value = `Standard Steel Pipe Length: ${giPipeLength} mm (Standard 6M / 20 Ft) | Metal Blade Kerf: ${giSawKerf} mm | Total GI Pipes to Order: ${requisition.giSummary.totalPipesCount} Pipes | Total Steel Wt: ${requisition.giSummary.totalWeightKg} Kg | Date: ${new Date().toLocaleDateString('en-IN')}`;
      sheet2.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF92400E' } };
      sheet2.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
      sheet2.getRow(2).height = 20;

      const headerRow2 = sheet2.addRow([
        'Sr No',
        'GI Steel Profile Core',
        'Section Type',
        'Steel Code',
        'Stock Pipe Length (mm)',
        '90° Metal Cuts (Pcs)',
        'Net Length (M)',
        'Pipes to Order (Full Lengths)',
        'Steel Scrap (M)',
      ]);
      headerRow2.height = 25;
      headerRow2.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD97706' }, // Amber-600
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      requisition.giSections.forEach((sec, idx) => {
        const row = sheet2.addRow([
          idx + 1,
          sec.profileName,
          sec.category,
          sec.profileCode,
          sec.standardBarLength,
          sec.totalPieces,
          sec.totalNetMeters,
          sec.requiredBarsCount,
          `${sec.totalOffcutMeters} M (${sec.offcutPercent}%)`,
        ]);
        row.height = 20;
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        row.getCell(6).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'right' };
        row.getCell(8).alignment = { horizontal: 'center' };
        row.getCell(8).font = { bold: true, color: { argb: 'FFB45309' } };
        row.getCell(9).alignment = { horizontal: 'right' };
      });

      const totalRow2 = sheet2.addRow([
        '',
        'TOTAL GI STEEL PIPES',
        '',
        '',
        '',
        requisition.giSummary.totalPiecesCount,
        requisition.giSummary.totalNetMeters,
        requisition.giSummary.totalPipesCount,
        `${(requisition.giSummary.totalProcuredMeters - requisition.giSummary.totalNetMeters).toFixed(2)} M (${requisition.giSummary.overallWastagePercent}%)`,
      ]);
      totalRow2.height = 25;
      totalRow2.font = { bold: true };
      totalRow2.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' }, // Amber-100
        };
      });

      sheet2.columns = [
        { width: 8 },
        { width: 34 },
        { width: 18 },
        { width: 15 },
        { width: 22 },
        { width: 18 },
        { width: 16 },
        { width: 26 },
        { width: 22 },
      ];

      // ==========================================
      // SHEET 3: uPVC SAW CUTTING SCHEDULE (1D)
      // ==========================================
      const sheet3 = workbook.addWorksheet('uPVC Saw Cutting Sheet');
      sheet3.addRow(['uPVC Profile', 'Bar #', 'Bar Length (mm)', 'Cut Sequence (Window Tag & mm)', 'Used (mm)', 'Offcut (mm)', 'Efficiency %']);
      sheet3.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet3.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }, // Blue-900
      };

      requisition.upvcSections.forEach((sec) => {
        sec.optimizedBars.forEach((bar) => {
          const cutsStr = bar.cuts.map((c) => `${c.windowTag} (${c.pieceTag}): ${c.length}mm`).join(' + ');
          sheet3.addRow([
            sec.profileName,
            `Bar ${bar.barNumber}`,
            bar.barLength,
            cutsStr,
            bar.usedLength,
            bar.remainingLength,
            `${bar.efficiencyPercent}%`,
          ]);
        });
      });

      sheet3.columns = [
        { width: 30 },
        { width: 12 },
        { width: 18 },
        { width: 55 },
        { width: 14 },
        { width: 18 },
        { width: 14 },
      ];

      // ==========================================
      // SHEET 4: GI STEEL CUTTING SCHEDULE (1D)
      // ==========================================
      const sheet4 = workbook.addWorksheet('GI Steel Cutting Sheet');
      sheet4.addRow(['GI Steel Profile', 'Pipe #', 'Pipe Length (mm)', 'Cut Sequence (Window Tag & mm)', 'Used (mm)', 'Offcut (mm)', 'Efficiency %']);
      sheet4.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet4.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF78350F' }, // Amber-900
      };

      requisition.giSections.forEach((sec) => {
        sec.optimizedBars.forEach((bar) => {
          const cutsStr = bar.cuts.map((c) => `${c.windowTag} (${c.pieceTag}): ${c.length}mm`).join(' + ');
          sheet4.addRow([
            sec.profileName,
            `Pipe ${bar.barNumber}`,
            bar.barLength,
            cutsStr,
            bar.usedLength,
            bar.remainingLength,
            `${bar.efficiencyPercent}%`,
          ]);
        });
      });

      sheet4.columns = [
        { width: 30 },
        { width: 12 },
        { width: 18 },
        { width: 55 },
        { width: 14 },
        { width: 18 },
        { width: 14 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(
        `${(customer?.name || 'Project').replace(/\s+/g, '_')}_uPVC_${universalBarLength}mm_GI_Steel_${giPipeLength}mm_Requisition.xlsx`,
        blob
      );
    } catch (err) {
      console.error('Failed to export requirement excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 0. PRIMARY MATERIAL SELECTOR: uPVC PROFILES vs GI STEEL REINFORCEMENT (ALAG) vs COMBINED */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-slate-900 rounded-2xl border border-slate-700 shadow-md">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/95 rounded-xl border border-slate-800 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setMaterialCategory('upvc');
              if (requisition.upvcSections.length > 0) {
                setExpandedSectionId(requisition.upvcSections[0].id);
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              materialCategory === 'upvc'
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Boxes className="w-4 h-4 text-blue-300" />
            <span>🏢 Duron uPVC Profiles ({requisition.upvcSummary.totalBarsOrPipes} Bars)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMaterialCategory('gi');
              if (requisition.giSections.length > 0) {
                setExpandedSectionId(requisition.giSections[0].id);
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              materialCategory === 'gi'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/60 font-black'
                : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/80'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-950 fill-amber-900/20" />
            <span>🔩 GI Steel Reinforcement ({requisition.giSummary.totalPipesCount} Pipes) — अलग</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMaterialCategory('all');
              if (requisition.sections.length > 0) {
                setExpandedSectionId(requisition.sections[0].id);
              }
            }}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              materialCategory === 'all'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>📋 Combined (All)</span>
          </button>
        </div>

        <div className="text-xs text-slate-300 px-2 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${materialCategory === 'gi' ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
          {materialCategory === 'upvc' && (
            <span>uPVC Extrusions • <b className="text-blue-300">{requisition.upvcSummary.totalBarsOrPipes} Bars</b> ({universalBarLength}mm standard)</span>
          )}
          {materialCategory === 'gi' && (
            <span className="text-amber-300 font-bold">GI Steel Reinforcement Core • <b>{requisition.giSummary.totalPipesCount} Pipes</b> ({giPipeLength}mm / 20 Ft)</span>
          )}
          {materialCategory === 'all' && (
            <span>uPVC: <b>{requisition.upvcSummary.totalBarsOrPipes} Bars</b> | GI Steel: <b>{requisition.giSummary.totalPipesCount} Pipes</b></span>
          )}
        </div>
      </div>

      {/* 1. TOP BAR: STOCK LENGTH CONTROLLER & MODE SWITCHER */}
      <div
        className={`p-4 rounded-2xl text-white shadow-md border space-y-4 transition ${
          materialCategory === 'gi'
            ? 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-amber-500/50'
            : 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border-slate-700'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {materialCategory === 'gi' ? (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] font-extrabold tracking-wider uppercase flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-400" />
                    GI Steel Reinforcement Core (अलग विभाग)
                  </span>
                  <span className="text-amber-200/80 text-xs">• Standard 6000mm (20 Ft) Steel Pipe</span>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-extrabold tracking-wider uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    Duron Profile Engine
                  </span>
                  <span className="text-slate-400 text-xs">• 5800mm Standard Extrusion</span>
                </>
              )}
              {isAnyCustomized && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-extrabold flex items-center gap-1">
                  <Scissors className="w-3 h-3 text-amber-400" />
                  {customizedCount} प्रोफाइल में कम/कस्टम साइज लागू
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              {materialCategory === 'gi' ? (
                <>
                  <span>GI Galvanized Steel Pipe Requisition (जी.आई. स्टील रिइन्फोर्समेंट)</span>
                  <span className="text-xs font-medium text-amber-300/80 hidden sm:inline">(अलग से 6M स्टील पाइप खरीद शीट)</span>
                </>
              ) : (
                <>
                  <span>Profile Requirement & Bar Stock Optimization</span>
                  <span className="text-xs font-medium text-slate-400 hidden sm:inline">(प्रोफाइल आवश्यकता एवं बार सेलेक्शन)</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {materialCategory === 'gi' ? (
                <span>
                  <b>जी.आई. स्टील रिइन्फोर्समेंट</b> uPVC प्रोफाइल के चेंबर में मजबूती और विंड लोड (Wind Load) सहने के लिए डाला जाता है। यह फैक्ट्री में अलग से 6000mm (20 Ft) या कस्टम पाइप में खरीदा जाता है।
                </span>
              ) : (
                <span>
                  आप <b>सबको एक साइज</b> (उदा. 5800mm Duron Standard) रख सकते हैं, या <b>किसी एक प्रोफाइल का साइज कम/अलग</b> (उदा. सैश 4500mm, मुलियन 3000mm) कर सकते हैं।
                </span>
              )}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 self-start lg:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export Excel (Separate uPVC & GI)'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-600 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* MODE SELECTOR: SABKO EK SIZE vs KISI EK KA KAM KARNA HAI */}
        <div className="pt-3 border-t border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center p-1 bg-slate-950/90 rounded-xl border border-slate-700 w-fit">
            <button
              type="button"
              onClick={() => handleApplyUniversalToAll()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                barConfigMode === 'universal' && !isAnyCustomized
                  ? materialCategory === 'gi'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                    : 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>सबको एक साइज (Same Size for All)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBarConfigMode('per-section');
                setShowSectionConfigPanel(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                barConfigMode === 'per-section' || isAnyCustomized
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>किसी एक का कम / अलग करें (Custom per Profile)</span>
              {isAnyCustomized && (
                <span className="px-1.5 py-0.2 bg-slate-900 text-amber-300 rounded-full text-[10px] font-black">
                  {customizedCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAnyCustomized && (
              <button
                type="button"
                onClick={handleResetAllToDuronDefault}
                className="px-2.5 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-500/40 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                title="Reset all sections back to Duron 5800mm"
              >
                <RefreshCw className="w-3 h-3" />
                <span>सबको वापस {materialCategory === 'gi' ? `${giPipeLength}mm` : `${universalBarLength}mm`} करें</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSectionConfigPanel((prev) => !prev)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
            >
              <span>{showSectionConfigPanel ? 'Hide Bar Manager' : 'Manage Profile Bars'}</span>
              {showSectionConfigPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* STOCK CONTROLS: BAR LENGTH / GI PIPE LENGTH & KERF */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Input & Increment */}
          <div className="flex flex-wrap items-center gap-3">
            {materialCategory === 'gi' ? (
              // GI PIPE CONTROLS
              <div className="flex items-center gap-2 bg-slate-800/90 border border-amber-600/50 px-3 py-1.5 rounded-xl">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-left">
                  <label htmlFor="gi-pipe-length-input" className="block text-[10px] text-amber-300/80 font-bold uppercase tracking-wider">
                    GI Steel Pipe Length (mm):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="gi-pipe-length-input"
                      type="number"
                      min={1000}
                      max={12000}
                      step={100}
                      value={giPipeLength}
                      onChange={(e) => {
                        const val = Math.max(100, Number(e.target.value) || 6000);
                        setGiPipeLength(val);
                      }}
                      className="w-24 bg-slate-900 border border-amber-600/60 rounded px-2 py-0.5 text-sm font-black text-amber-300 focus:outline-none focus:border-amber-400 text-center font-mono"
                    />
                    <span className="text-xs font-mono font-bold text-amber-300/70">mm</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => setGiPipeLength((prev) => prev + 100)}
                    className="w-5 h-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold rounded flex items-center justify-center cursor-pointer"
                    title="Increase +100mm"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiPipeLength((prev) => Math.max(500, prev - 100))}
                    className="w-5 h-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold rounded flex items-center justify-center cursor-pointer"
                    title="Decrease -100mm"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ) : (
              // uPVC BAR CONTROLS
              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-600 px-3 py-1.5 rounded-xl">
                <Ruler className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-left">
                  <label htmlFor="custom-bar-length-input" className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Base Bar Length (mm):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="custom-bar-length-input"
                      type="number"
                      min={1000}
                      max={12000}
                      step={100}
                      value={universalBarLength}
                      onChange={(e) => {
                        const val = Math.max(100, Number(e.target.value) || 5800);
                        setUniversalBarLength(val);
                      }}
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-sm font-black text-amber-300 focus:outline-none focus:border-amber-400 text-center font-mono"
                    />
                    <span className="text-xs font-mono font-bold text-slate-400">mm</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => setUniversalBarLength((prev) => prev + 100)}
                    className="w-5 h-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold rounded flex items-center justify-center cursor-pointer"
                    title="Increase +100mm"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => setUniversalBarLength((prev) => Math.max(500, prev - 100))}
                    className="w-5 h-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold rounded flex items-center justify-center cursor-pointer"
                    title="Decrease -100mm"
                  >
                    ▼
                  </button>
                </div>
              </div>
            )}

            {/* Saw Blade Kerf Control */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-600 px-3 py-1.5 rounded-xl">
              <Scissors className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <label htmlFor="saw-kerf-select" className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {materialCategory === 'gi' ? 'Metal Saw Kerf:' : 'PVC Saw Kerf:'}
                </label>
                <div className="flex items-center gap-1">
                  {materialCategory === 'gi' ? (
                    <select
                      id="saw-kerf-select"
                      value={giSawKerf}
                      onChange={(e) => setGiSawKerf(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold text-emerald-300 focus:outline-none cursor-pointer"
                    >
                      <option value={2}>2 mm (Thin metal disc)</option>
                      <option value={3}>3 mm (Standard metal saw)</option>
                      <option value={4}>4 mm (Heavy circular blade)</option>
                    </select>
                  ) : (
                    <select
                      id="saw-kerf-select"
                      value={sawKerf}
                      onChange={(e) => setSawKerf(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold text-emerald-300 focus:outline-none cursor-pointer"
                    >
                      <option value={3}>3 mm (Fine blade)</option>
                      <option value={4}>4 mm (Standard Duron)</option>
                      <option value={5}>5 mm (Heavy duty blade)</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Presets:</span>
            {materialCategory === 'gi'
              ? GI_PIPE_PRESETS.map((preset) => {
                  const isSelected = giPipeLength === preset.value && !isAnyCustomized;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setGiPipeLength(preset.value);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                      title={`Apply ${preset.label}`}
                    >
                      {preset.label}
                    </button>
                  );
                })
              : BAR_PRESETS.map((preset) => {
                  const isSelected = universalBarLength === preset.value && !isAnyCustomized;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleApplyUniversalToAll(preset.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                      title={`Apply ${preset.label} to all profiles`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
          </div>
        </div>

        {/* PER-PROFILE BAR ADJUSTMENT PANEL (KISI EK KA KAM / ALAG KARNE KA PANEL) */}
        {(showSectionConfigPanel || barConfigMode === 'per-section') && (
          <div className="pt-3 border-t border-slate-700/90 bg-slate-950/70 p-3.5 rounded-xl border border-amber-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {materialCategory === 'gi'
                      ? 'जी.आई. स्टील पाइप साइज सेलेक्टर (Customize Steel Pipe Length per Section)'
                      : 'प्रोफाइल-वाइज़ बार साइज सेलेक्टर (Customize Any Profile\'s Bar Length)'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {materialCategory === 'gi'
                    ? `यहाँ आप किसी भी स्टील प्रोफाइल की पाइप लंबाई अलग कर सकते हैं। बाकियों पर ${giPipeLength}mm लागू रहेगा।`
                    : `यहाँ आप किसी भी प्रोफाइल (उदा. सैश, फ्रेम या मुलियन) की बार लंबाई कम या ज्यादा कर सकते हैं। बाकियों पर ${universalBarLength}mm लागू रहेगा।`}
                </p>
              </div>
              {isAnyCustomized && (
                <button
                  type="button"
                  onClick={handleResetAllToDuronDefault}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>सभी को {materialCategory === 'gi' ? `${giPipeLength}mm` : `${universalBarLength}mm`} करें</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeSections.map((sec) => {
                const currentLen = sec.standardBarLength;
                const isCustom = customBarLengths[sec.id] !== undefined;

                return (
                  <div
                    key={sec.id}
                    className={`p-3 rounded-xl border transition space-y-2 ${
                      isCustom
                        ? 'bg-amber-950/40 border-amber-500/70 shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              sec.category === 'Outer Frame'
                                ? 'bg-indigo-900 text-indigo-200'
                                : sec.category === 'Sash'
                                ? 'bg-emerald-900 text-emerald-200'
                                : sec.category === 'Mullion/Transom'
                                ? 'bg-amber-900 text-amber-200'
                                : sec.category === 'GI Reinforcement'
                                ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {sec.category}
                          </span>
                          <span className="text-xs font-bold text-white truncate block">
                            {sec.profileName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {sec.totalPieces} cuts • Net: {sec.totalNetMeters}M
                        </span>
                      </div>

                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => handleResetSectionLength(sec.id)}
                          className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold border border-amber-500/40 cursor-pointer transition shrink-0"
                          title="Reset to universal size"
                        >
                          Reset
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium shrink-0">Standard</span>
                      )}
                    </div>

                    {/* Interactive Bar Length Stepper */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleSetSectionLength(sec.id, Math.max(500, currentLen - 100))}
                          className="w-5 h-5 bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-slate-300 text-xs font-black rounded flex items-center justify-center cursor-pointer transition"
                          title="Kam karein (-100mm)"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={500}
                          max={12000}
                          step={100}
                          value={currentLen}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val > 0) handleSetSectionLength(sec.id, val);
                          }}
                          className="w-16 bg-transparent text-center text-xs font-black font-mono text-amber-300 focus:outline-none"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-500">mm</span>
                        <button
                          type="button"
                          onClick={() => handleSetSectionLength(sec.id, Math.min(12000, currentLen + 100))}
                          className="w-5 h-5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-black rounded flex items-center justify-center cursor-pointer transition"
                          title="Badhayein (+100mm)"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Presets for this Section */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetSectionLength(sec.id, 4500)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                            currentLen === 4500
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                          title="Set to 4500mm"
                        >
                          4500
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetSectionLength(sec.id, 3000)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                            currentLen === 3000
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                          title="Set to 3000mm (Half bar)"
                        >
                          3000
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetSectionLength(sec.id, materialCategory === 'gi' ? giPipeLength : 5800)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                            currentLen === (materialCategory === 'gi' ? giPipeLength : 5800) && isCustom
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                          title={`Set to standard (${materialCategory === 'gi' ? giPipeLength : 5800}mm)`}
                        >
                          {materialCategory === 'gi' ? giPipeLength : 5800}
                        </button>
                      </div>
                    </div>

                    {/* Result for this section */}
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-slate-400">
                        {sec.category === 'GI Reinforcement' ? 'Pipes needed:' : 'Bars needed:'}{' '}
                        <b className="text-white font-mono">{sec.requiredBarsCount} {sec.category === 'GI Reinforcement' ? 'Pipes' : 'Bars'}</b>
                      </span>
                      <span className="text-amber-300 font-mono text-[10px]">
                        Offcut: {sec.totalOffcutMeters}M ({sec.offcutPercent}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. EXECUTIVE KPI CARDS ("KITNA PROFILE LAG RAHA H") */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Bars/Pipes to Order */}
        <div
          className={`p-3.5 rounded-xl border-2 bg-white shadow-xs transition ${
            materialCategory === 'gi'
              ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/50'
              : 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/40'
          }`}
        >
          <div
            className={`flex items-center justify-between mb-1 ${
              materialCategory === 'gi' ? 'text-amber-700' : 'text-blue-600'
            }`}
          >
            <span className="text-[11px] font-black uppercase tracking-wider">
              {materialCategory === 'gi'
                ? 'Required GI Pipes'
                : materialCategory === 'upvc'
                ? 'Required uPVC Bars'
                : 'Required Bars/Pipes'}
            </span>
            {materialCategory === 'gi' ? <Shield className="w-4 h-4 text-amber-600" /> : <Boxes className="w-4 h-4" />}
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              materialCategory === 'gi' ? 'text-amber-950' : 'text-blue-950'
            }`}
          >
            {materialCategory === 'gi'
              ? requisition.giSummary.totalPipesCount
              : materialCategory === 'upvc'
              ? requisition.upvcSummary.totalBarsOrPipes
              : requisition.totalStandardBars}
            <span
              className={`text-xs font-bold ml-1 ${
                materialCategory === 'gi' ? 'text-amber-700' : 'text-blue-700'
              }`}
            >
              {materialCategory === 'gi' ? 'Pipes' : 'Bars'}
            </span>
          </div>
          <p
            className={`text-[10px] font-semibold mt-0.5 ${
              materialCategory === 'gi' ? 'text-amber-800' : 'text-blue-800'
            }`}
          >
            {materialCategory === 'gi'
              ? `Full ${giPipeLength}mm Pipes (20 Ft)`
              : isAnyCustomized
              ? `Mixed lengths (${customizedCount} custom)`
              : `Full ${universalBarLength}mm length`}
          </p>
        </div>

        {/* Total Running Meters */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Length</span>
            <Ruler className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {materialCategory === 'gi'
              ? requisition.giSummary.totalNetMeters
              : materialCategory === 'upvc'
              ? requisition.upvcSummary.totalNetMeters
              : requisition.totalNetMeters}
            <span className="text-xs font-bold text-slate-500 ml-1">Mtrs</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            Procured:{' '}
            {materialCategory === 'gi'
              ? requisition.giSummary.totalProcuredMeters
              : materialCategory === 'upvc'
              ? requisition.upvcSummary.totalProcuredMeters
              : requisition.totalProcuredMeters}{' '}
            M
          </p>
        </div>

        {/* Total Cut Pieces */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {materialCategory === 'gi' ? 'Steel Cuts (90°)' : 'Total Cuts'}
            </span>
            <Scissors className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {materialCategory === 'gi'
              ? requisition.giSummary.totalPiecesCount
              : materialCategory === 'upvc'
              ? requisition.upvcSummary.totalPiecesCount
              : requisition.totalPiecesCount}
            <span className="text-xs font-bold text-slate-500 ml-1">Pcs</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            Across {designs.length} designs
          </p>
        </div>

        {/* Cutting Efficiency */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Efficiency</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {materialCategory === 'gi'
              ? requisition.giSummary.overallEfficiencyPercent
              : materialCategory === 'upvc'
              ? requisition.upvcSummary.overallEfficiencyPercent
              : requisition.overallEfficiencyPercent}
            %
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            Wastage:{' '}
            {materialCategory === 'gi'
              ? requisition.giSummary.overallWastagePercent
              : materialCategory === 'upvc'
              ? requisition.upvcSummary.overallWastagePercent
              : requisition.overallWastagePercent}
            %
          </p>
        </div>

        {/* Total Profile / Steel Weight */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {materialCategory === 'gi' ? 'GI Steel Wt.' : 'Extrusion Wt.'}
            </span>
            <Scale className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {materialCategory === 'gi'
              ? requisition.giSummary.totalWeightKg
              : materialCategory === 'upvc'
              ? requisition.upvcSummary.totalWeightKg
              : requisition.totalWeightKg}
            <span className="text-xs font-bold text-slate-500 ml-1">Kg</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            {materialCategory === 'gi' ? 'Galvanized steel weight' : 'Approx shipping wt'}
          </p>
        </div>

        {/* Approx Cost */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {materialCategory === 'gi' ? 'Est. Steel Cost' : 'Est. Material'}
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ₹
            {(materialCategory === 'gi'
              ? requisition.giSummary.totalEstimatedCost
              : materialCategory === 'upvc'
              ? requisition.upvcSummary.totalEstimatedCost
              : requisition.totalEstimatedCost
            ).toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            {materialCategory === 'gi' ? 'Excl. GST' : 'Excl. GST & Glass'}
          </p>
        </div>
      </div>

      {/* 3. VIEW TOGGLE: SUMMARY TABLE VS BAR-BY-BAR CUTTING DIAGRAM VS WINDOW CONSUMPTION */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'summary'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Profile Order Requisition (सामग्री आवश्यकता)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bars')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bars'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Bar-by-Bar Cutting Layout ({universalBarLength}mm{isAnyCustomized ? ' / Mixed' : ''})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('window-wise')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'window-wise'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Window-Wise Consumption</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing calculated profile stock for <b className="text-slate-800">{designs.length}</b> windows ({designs.reduce((acc, d) => acc + (d.quantity || 1), 0)} total units)
        </div>
      </div>

      {/* TAB 1: MASTER PROFILE REQUISITION TABLE ("KITNE ME BAN JAYEGA WO LIKHA HO KITNA KON SA CHAHIYE") */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-3.5">
                    {materialCategory === 'gi' ? 'GI Steel Core Profile' : 'Profile Description'}
                  </th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">
                    {materialCategory === 'gi' ? 'Stock Pipe Length' : 'Stock Bar Length'}
                  </th>
                  <th className="py-3 px-3 text-center">
                    {materialCategory === 'gi' ? '90° Cuts' : 'Cut Pieces'}
                  </th>
                  <th className="py-3 px-3 text-right">Net Length (M)</th>
                  <th className={`py-3 px-3.5 text-center font-black ${materialCategory === 'gi' ? 'bg-amber-700' : 'bg-blue-900'} text-white`}>
                    {materialCategory === 'gi' ? 'Required GI Pipes (ऑर्डर पाइप)' : 'Required Bars (ऑर्डर बार)'}
                  </th>
                  <th className="py-3 px-3 text-right">Offcut / Scrap</th>
                  <th className="py-3 px-3 text-right">Est. Cost (₹)</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeSections.map((sec, idx) => {
                  const isExpanded = expandedSectionId === sec.id;
                  const isCustom = customBarLengths[sec.id] !== undefined;
                  return (
                    <React.Fragment key={sec.id}>
                      <tr
                        className={`hover:bg-blue-50/40 transition cursor-pointer ${
                          isExpanded ? 'bg-blue-50/30' : ''
                        }`}
                        onClick={() => setExpandedSectionId(isExpanded ? null : sec.id)}
                      >
                        {/* Profile Description */}
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-md text-[10px] font-mono flex items-center justify-center font-black shrink-0 ${
                                sec.category === 'GI Reinforcement'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <span className="text-slate-900 font-bold block">{sec.profileName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{sec.profileCode}</span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sec.category === 'Outer Frame'
                                ? 'bg-indigo-100 text-indigo-800'
                                : sec.category === 'Sash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sec.category === 'Mullion/Transom'
                                ? 'bg-amber-100 text-amber-800'
                                : sec.category === 'GI Reinforcement'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sec.category}
                          </span>
                        </td>

                        {/* Stock Bar Length - Interactive inline customizer */}
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex flex-col items-center gap-1">
                            <div
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border transition ${
                                isCustom
                                  ? 'bg-amber-50 border-amber-400 text-amber-950 font-black shadow-2xs'
                                  : 'bg-slate-50 border-slate-300 text-slate-800'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSetSectionLength(sec.id, Math.max(500, sec.standardBarLength - 100))}
                                className="w-4 h-5 bg-white hover:bg-amber-200 text-slate-700 font-black rounded text-[10px] flex items-center justify-center cursor-pointer border border-slate-200"
                                title="Kam karein (-100mm)"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={500}
                                max={12000}
                                step={100}
                                value={sec.standardBarLength}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val > 0) handleSetSectionLength(sec.id, val);
                                }}
                                className="w-14 bg-transparent text-center font-mono font-bold text-xs focus:outline-none"
                              />
                              <span className="text-[10px] font-mono text-slate-500">mm</span>
                              <button
                                type="button"
                                onClick={() => handleSetSectionLength(sec.id, Math.min(12000, sec.standardBarLength + 100))}
                                className="w-4 h-5 bg-white hover:bg-blue-200 text-slate-700 font-black rounded text-[10px] flex items-center justify-center cursor-pointer border border-slate-200"
                                title="Badhayein (+100mm)"
                              >
                                +
                              </button>
                            </div>

                            {isCustom ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded border border-amber-300">
                                  ✂ कम साइज
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleResetSectionLength(sec.id)}
                                  className="text-[9px] text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer"
                                  title="Reset to universal default"
                                >
                                  Reset
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-medium">Standard</span>
                            )}
                          </div>
                        </td>

                        {/* Cut Pieces */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {sec.totalPieces} pcs
                        </td>

                        {/* Net Length (M) */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          {sec.totalNetMeters} M
                        </td>

                        {/* REQUIRED BARS (THE KEY HIGHLIGHT) */}
                        <td className="py-3 px-3.5 text-center bg-blue-50/70 border-x border-blue-200">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white font-black text-xs shadow-xs font-mono">
                            <Boxes className="w-3.5 h-3.5" />
                            {sec.requiredBarsCount} Bars
                          </span>
                          <span className="block text-[9px] text-blue-700 font-semibold mt-0.5">
                            ({sec.totalProcuredMeters} Mtrs Total)
                          </span>
                        </td>

                        {/* Offcut / Scrap */}
                        <td className="py-3 px-3 text-right font-mono">
                          <span className="text-slate-700 font-bold">{sec.totalOffcutMeters} M</span>
                          <span className="block text-[10px] text-amber-600 font-medium">
                            {sec.offcutPercent}% offcut
                          </span>
                        </td>

                        {/* Est. Cost */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{sec.approxTotalCost.toLocaleString('en-IN')}
                        </td>

                        {/* Action / Expand */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSectionId(isExpanded ? null : sec.id);
                            }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            title="Toggle details"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED INLINE PIECE BREAKDOWN & MINI BAR GRAPHIC */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-t border-b border-blue-200">
                          <td colSpan={9} className="p-4">
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
                                <h5 className="text-xs font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                                  <span>Piece Cut Schedule & Bar Allocations for: {sec.profileName}</span>
                                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                                    {sec.requiredBarsCount} Full {sec.standardBarLength}mm Bars
                                  </span>
                                  {isCustom && (
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                      ✂ कम साइज बार ({sec.standardBarLength}mm)
                                    </span>
                                  )}
                                </h5>

                                <button
                                  type="button"
                                  onClick={() => setActiveTab('bars')}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <span>View Full Bar Graphic Diagrams</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Dedicated Quick Bar Size Overrides for this Profile */}
                              <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2">
                                  <Ruler className="w-4 h-4 text-amber-600" />
                                  <span className="text-xs font-bold text-slate-800">
                                    Stock Bar Length for this Profile:
                                  </span>
                                  <span className="font-mono font-bold text-xs text-slate-900">
                                    {sec.standardBarLength} mm
                                  </span>
                                  {isCustom ? (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                                      ✂ Customized
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500">
                                      (Using Universal: {universalBarLength}mm)
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] text-slate-500 font-medium">Quick Change:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSetSectionLength(sec.id, 4500)}
                                    className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-300 cursor-pointer"
                                  >
                                    4500 mm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetSectionLength(sec.id, 3000)}
                                    className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-300 cursor-pointer"
                                  >
                                    3000 mm (Half)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetSectionLength(sec.id, 5800)}
                                    className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-300 cursor-pointer"
                                  >
                                    5800 mm
                                  </button>
                                  {isCustom && (
                                    <button
                                      type="button"
                                      onClick={() => handleResetSectionLength(sec.id)}
                                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 cursor-pointer"
                                    >
                                      Reset to Universal ({universalBarLength}mm)
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Summary of pieces required */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {sec.pieces.map((p) => (
                                  <div
                                    key={p.id}
                                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center"
                                  >
                                    <span className="text-[10px] font-bold text-blue-700 block">{p.tag}</span>
                                    <span className="text-xs font-black font-mono text-slate-900">{p.length} mm</span>
                                    <span className="text-[10px] text-slate-500 block font-mono">Qty: {p.qty}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Mini Bar Preview (first 2 bars) */}
                              <div className="space-y-1.5 pt-2">
                                <span className="text-[11px] font-bold text-slate-700 block">
                                  Bar Cutting Preview (Showing {Math.min(3, sec.optimizedBars.length)} of {sec.optimizedBars.length} bars):
                                </span>
                                {sec.optimizedBars.slice(0, 3).map((bar) => (
                                  <div key={bar.barNumber} className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                                      <span className="font-bold text-slate-800">Bar #{bar.barNumber} ({bar.barLength}mm)</span>
                                      <span>
                                        Used: <b className="text-slate-900">{bar.usedLength}mm</b> | Offcut: <b className="text-amber-700">{bar.remainingLength}mm</b> ({bar.efficiencyPercent}% efficiency)
                                      </span>
                                    </div>
                                    <div className="w-full h-5 rounded-md bg-slate-100 border border-slate-300 flex overflow-hidden p-0.5 gap-0.5">
                                      {bar.cuts.map((cut, cIdx) => (
                                        <div
                                          key={cut.id || cIdx}
                                          style={{ width: `${cut.percentage}%` }}
                                          className="h-full bg-blue-600 text-white text-[9px] font-mono font-bold flex items-center justify-center truncate px-1 rounded-xs"
                                          title={`${cut.windowTag} (${cut.pieceTag}): ${cut.length}mm`}
                                        >
                                          {cut.windowTag}: {cut.length}mm
                                        </div>
                                      ))}
                                      {bar.remainingLength > 0 && (
                                        <div
                                          style={{ width: `${bar.wastePercent}%` }}
                                          className={`h-full flex items-center justify-center text-[8px] font-mono font-bold truncate rounded-xs ${
                                            bar.remainingLength >= 500
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                              : 'bg-amber-100 text-amber-800'
                                          }`}
                                          title={`Offcut: ${bar.remainingLength}mm (${bar.remainingLength >= 500 ? 'Reusable' : 'Scrap'})`}
                                        >
                                          {bar.remainingLength}mm
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* GRAND TOTAL ROW */}
                <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-700">
                  <td colSpan={3} className="py-3 px-3.5 uppercase tracking-wider text-xs font-black">
                    {materialCategory === 'gi'
                      ? 'TOTAL GI REINFORCEMENT PIPES:'
                      : materialCategory === 'upvc'
                      ? 'TOTAL uPVC DURON PROFILES:'
                      : 'GRAND REQUISITION TOTALS:'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-amber-400">
                    {materialCategory === 'gi'
                      ? requisition.giSummary.totalPiecesCount
                      : materialCategory === 'upvc'
                      ? requisition.upvcSummary.totalPiecesCount
                      : requisition.totalPiecesCount}{' '}
                    Pcs
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-white">
                    {materialCategory === 'gi'
                      ? requisition.giSummary.totalNetMeters
                      : materialCategory === 'upvc'
                      ? requisition.upvcSummary.totalNetMeters
                      : requisition.totalNetMeters}{' '}
                    M
                  </td>
                  <td
                    className={`py-3 px-3.5 text-center font-mono font-black text-sm text-white ${
                      materialCategory === 'gi' ? 'bg-amber-700' : 'bg-blue-700'
                    }`}
                  >
                    {materialCategory === 'gi'
                      ? `${requisition.giSummary.totalPipesCount} GI Pipes (${giPipeLength}mm / 20 Ft)`
                      : materialCategory === 'upvc'
                      ? `${requisition.upvcSummary.totalBarsOrPipes} uPVC Bars (${universalBarLength}mm)`
                      : `${requisition.totalStandardBars} Standard Bars ${isAnyCustomized ? '(Mixed Sizes)' : `(${universalBarLength}mm)`}`}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-amber-300">
                    {materialCategory === 'gi'
                      ? `${(requisition.giSummary.totalProcuredMeters - requisition.giSummary.totalNetMeters).toFixed(1)} M (${requisition.giSummary.overallWastagePercent}%)`
                      : materialCategory === 'upvc'
                      ? `${(requisition.upvcSummary.totalProcuredMeters - requisition.upvcSummary.totalNetMeters).toFixed(1)} M (${requisition.upvcSummary.overallWastagePercent}%)`
                      : `${(requisition.totalProcuredMeters - requisition.totalNetMeters).toFixed(1)} M (${requisition.overallWastagePercent}%)`}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-400">
                    ₹
                    {(materialCategory === 'gi'
                      ? requisition.giSummary.totalEstimatedCost
                      : materialCategory === 'upvc'
                      ? requisition.upvcSummary.totalEstimatedCost
                      : requisition.totalEstimatedCost
                    ).toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PROCUREMENT NOTE CALLOUT */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              materialCategory === 'gi'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-900'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-950'
            }`}
          >
            <Info
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                materialCategory === 'gi' ? 'text-amber-600' : 'text-blue-600'
              }`}
            />
            <div>
              <span className="font-extrabold block">
                {materialCategory === 'gi'
                  ? `GI Galvanized Steel Core Guidelines (${giPipeLength}mm Standard 20 Ft Pipe):`
                  : `Factory Procurement Guidelines (${
                      isAnyCustomized
                        ? `Mixed Bar Sizes — Base ${universalBarLength}mm`
                        : `Duron Standard ${universalBarLength}mm`
                    }):`}
              </span>
              <p
                className={`text-[11px] leading-relaxed mt-0.5 ${
                  materialCategory === 'gi' ? 'text-amber-800' : 'text-blue-900'
                }`}
              >
                {materialCategory === 'gi'
                  ? `GI Steel reinforcement is cut with 90° straight cuts and inserted into uPVC outer frames, sashes, and mullions with a standard -100mm deduction from corner welds (50mm deduction from each corner weld). Metal saw kerf is ${giSawKerf}mm. Total ${requisition.giSummary.totalPipesCount} Full Steel Pipes (${giPipeLength}mm each, approx ${requisition.giSummary.totalWeightKg} Kg total weight) are required.`
                  : `Calculations include standard 45° corner miter cuts (+6mm overall welding allowance for 3mm per weld head), -100mm corner weld deductions for galvanized steel reinforcement, and a ${sawKerf}mm saw kerf deduction per cut. Total ${requisition.upvcSummary.totalBarsOrPipes} Full uPVC Bars (${universalBarLength}mm) are required to fabricate this entire project.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BAR-BY-BAR CUTTING OPTIMIZATION DIAGRAMS (FACTORY FLOOR OPERATOR READY) */}
      {activeTab === 'bars' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">
                1D Linear Cutting Stock Diagram (
                {materialCategory === 'gi'
                  ? `GI Steel Pipes: ${giPipeLength}mm`
                  : `uPVC Stock Bars: ${isAnyCustomized ? 'Mixed / Custom Lengths' : `Duron ${universalBarLength}mm`}`}
                )
              </h4>
              <p className="text-xs text-slate-500">
                Color-coded cut allocation per {materialCategory === 'gi' ? 'pipe' : 'bar'} so the saw operator knows exactly which cuts to take from each stock {materialCategory === 'gi' ? 'pipe' : 'bar'}.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-3 h-3 rounded-xs inline-block ${
                    materialCategory === 'gi' ? 'bg-amber-600' : 'bg-blue-600'
                  }`}
                ></span>
                <span className="text-slate-600 font-medium">Cut Piece</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-200 border border-emerald-400 inline-block"></span>
                <span className="text-slate-600 font-medium">Reusable Offcut (≥500mm)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-200 border border-amber-400 inline-block"></span>
                <span className="text-slate-600 font-medium">Scrap (&lt;500mm)</span>
              </div>
            </div>
          </div>

          {activeSections.map((sec) => (
            <div
              key={sec.id}
              className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <h5 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                      {sec.category}
                    </span>
                    <span>{sec.profileName}</span>
                    <span className="text-slate-400 font-mono text-[11px]">({sec.profileCode})</span>
                  </h5>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-[11px] text-slate-500">
                      Total Required: <b>{sec.requiredBarsCount} {sec.category === 'GI Reinforcement' ? 'Pipes' : 'Bars'}</b> of {sec.standardBarLength}mm | Net: {sec.totalNetMeters}M | Efficiency: {sec.efficiencyPercent}%
                    </span>
                    {sec.standardBarLength !== (sec.category === 'GI Reinforcement' ? giPipeLength : universalBarLength) && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold flex items-center gap-1">
                        <Scissors className="w-2.5 h-2.5" />
                        कस्टम साइज ({sec.standardBarLength}mm)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-lg font-black text-xs font-mono border ${
                      sec.category === 'GI Reinforcement'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    {sec.requiredBarsCount} Full {sec.category === 'GI Reinforcement' ? 'Pipes' : 'Bars'}
                  </span>
                </div>
              </div>

              {/* Bars List */}
              <div className="space-y-2.5">
                {sec.optimizedBars.map((bar) => {
                  const isReusable = bar.remainingLength >= 500;
                  return (
                    <div key={bar.barNumber} className="space-y-1 bg-slate-50/60 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] ${
                              sec.category === 'GI Reinforcement'
                                ? 'bg-amber-200 text-amber-950 font-black'
                                : 'text-slate-900 bg-slate-200'
                            }`}
                          >
                            {sec.category === 'GI Reinforcement' ? `Pipe #${bar.barNumber}` : `Bar #${bar.barNumber}`}
                          </span>
                          <span className="text-slate-600 text-[11px]">
                            Capacity: <b>{bar.barLength} mm</b>
                          </span>
                        </div>
                        <div className="text-[11px]">
                          <span className="text-slate-600">Used: <b>{bar.usedLength} mm</b></span>
                          <span className="mx-1.5 text-slate-300">|</span>
                          <span className={isReusable ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                            Offcut: {bar.remainingLength} mm ({bar.wastePercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar Tube */}
                      <div className="w-full h-7 rounded-md bg-slate-200 border border-slate-300 flex overflow-hidden p-0.5 gap-0.5 shadow-inner">
                        {bar.cuts.map((cut, cIdx) => (
                          <div
                            key={cut.id || cIdx}
                            style={{ width: `${cut.percentage}%` }}
                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-mono font-black flex items-center justify-center truncate px-1 rounded-xs shadow-xs transition cursor-default"
                            title={`${cut.windowTag} (${cut.pieceTag}): ${cut.length}mm [${cut.startMm}mm - ${cut.endMm}mm]`}
                          >
                            <span className="truncate">{cut.windowTag}: {cut.length}mm</span>
                          </div>
                        ))}

                        {/* Offcut segment */}
                        {bar.remainingLength > 0 && (
                          <div
                            style={{ width: `${bar.wastePercent}%` }}
                            className={`h-full flex items-center justify-center text-[9px] font-mono font-bold truncate rounded-xs transition ${
                              isReusable
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                            }`}
                            title={`Offcut: ${bar.remainingLength}mm (${isReusable ? 'Reusable Offcut' : 'Scrap'})`}
                          >
                            <span className="truncate">
                              {bar.remainingLength}mm {isReusable ? '♻' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Cut detail pieces tags */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                        <span className="font-semibold text-slate-600">Cut order:</span>
                        {bar.cuts.map((cut, cIdx) => (
                          <span
                            key={cut.id || cIdx}
                            className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-700"
                          >
                            {cIdx + 1}. {cut.windowTag} ({cut.pieceTag}): <b>{cut.length}mm</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: WINDOW-WISE CONSUMPTION TABLE */}
      {activeTab === 'window-wise' && (
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-2.5 px-3">Tag</th>
                  <th className="py-2.5 px-3">Location / Typology</th>
                  <th className="py-2.5 px-3 text-center">Size (W × H)</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-center">Total Cuts</th>
                  <th className="py-2.5 px-3 text-right">Outer Frame (M)</th>
                  <th className="py-2.5 px-3 text-right">Sash (M)</th>
                  <th className="py-2.5 px-3 text-right">Bead (M)</th>
                  <th className="py-2.5 px-3 text-right">Steel (M)</th>
                  <th className="py-2.5 px-3 text-right font-black">Total Running (M)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requisition.windowSummaries.map((win) => (
                  <tr key={win.windowId} className="hover:bg-blue-50/30 transition">
                    <td className="py-2.5 px-3 font-bold text-blue-700 font-mono">
                      {win.tag}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 block">{win.type}</span>
                      <span className="text-[10px] text-slate-400 block">{win.location}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                      {win.width} × {win.height} mm
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {win.quantity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {win.totalPieces} pcs
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {win.totalFrameMeters} M
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {win.totalSashMeters} M
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {win.totalBeadMeters} M
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {win.totalSteelMeters} M
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900 bg-blue-50/40">
                      {win.totalLinearMeters} M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
