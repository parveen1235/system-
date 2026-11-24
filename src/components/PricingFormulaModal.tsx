import React, { useState } from 'react';
import { X, Sliders, CheckCircle2, Percent, DollarSign, Calculator } from 'lucide-react';
import { PricingConfig } from '../types/upvc';

interface PricingFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  pricingConfig: PricingConfig;
  onUpdateConfig: (config: PricingConfig) => void;
}

export const PricingFormulaModal: React.FC<PricingFormulaModalProps> = ({
  isOpen,
  onClose,
  pricingConfig,
  onUpdateConfig,
}) => {
  const [config, setConfig] = useState<PricingConfig>(pricingConfig);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(config);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Pricing Formula (मूल्य निर्धारण नियम)</h2>
              <p className="text-xs text-slate-500 font-medium">Configure labour rates, wastage factor, profit margin & GST</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fabrication Labour (₹/m²)</label>
              <input
                type="number"
                value={config.laborCostPerSqMeter}
                onChange={(e) => setConfig({ ...config, laborCostPerSqMeter: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Site Installation (₹/m²)</label>
              <input
                type="number"
                value={config.installationCostPerSqMeter}
                onChange={(e) => setConfig({ ...config, installationCostPerSqMeter: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Wastage Buffer (%)</label>
              <input
                type="number"
                value={config.wastagePercent}
                onChange={(e) => setConfig({ ...config, wastagePercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Profit Margin (%)</label>
              <input
                type="number"
                value={config.profitMarginPercent}
                onChange={(e) => setConfig({ ...config, profitMarginPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">GST / Tax (%)</label>
              <input
                type="number"
                value={config.taxPercent}
                onChange={(e) => setConfig({ ...config, taxPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">White Profile Rate (₹/meter)</label>
              <input
                type="number"
                value={config.profileCostPerMeter}
                onChange={(e) => setConfig({ ...config, profileCostPerMeter: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Reinforcement GI Steel (₹/kg)</label>
              <input
                type="number"
                value={config.reinforcementCostPerKg}
                onChange={(e) => setConfig({ ...config, reinforcementCostPerKg: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pricing Formula updated successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Apply Rates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
