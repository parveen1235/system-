import React, { useState } from 'react';
import { InventoryItem } from '../types/erp';
import {
  Boxes,
  Search,
  AlertTriangle,
  Plus,
  RefreshCw,
  X,
  TrendingDown,
  Layers,
  Sparkles,
  Package,
} from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onUpdateStock: (itemId: string, newQty: number) => void;
  onOpenFullManager?: () => void;
  lang?: 'hi' | 'en';
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onUpdateStock,
  onOpenFullManager,
  lang = 'en',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(inventory.map((i) => i.category)))];

  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalValue = inventory.reduce((acc, curr) => acc + curr.totalValue, 0);
  const lowStockCount = inventory.filter((i) => i.isLowStock || i.stockQty <= i.reorderLevel).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'hi'
                  ? 'कच्चा माल एवं प्रोफ़ाइल इन्वेंट्री (Raw Material Inventory)'
                  : 'Raw Material Inventory & Stock Management'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'hi'
                  ? 'uPVC बार (6m), जीआई स्टील, कांच शीट एवं हार्डवेयर स्टॉक की लाइव स्थिति'
                  : 'Live tracking for 6m uPVC bars, GI reinforcement, Glass & Hardware fittings'}
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

        {/* Quick KPI stats in modal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/50 border-b border-slate-200">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Total Inventory Value</div>
              <div className="text-base font-bold text-slate-900 font-mono">₹{totalValue.toLocaleString('en-IN')}</div>
            </div>
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Total SKUs Monitored</div>
              <div className="text-base font-bold text-slate-900">{inventory.length} Items</div>
            </div>
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] text-amber-700 font-medium">Low Stock Alerts</div>
              <div className="text-base font-bold text-amber-900">{lowStockCount} Reorder Warnings</div>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by profile SKU, name or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto flex-1 p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3 rounded-l-lg">Item / SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3">Brand</th>
                <th className="p-3 text-right">In Stock</th>
                <th className="p-3 text-right">Reorder Min</th>
                <th className="p-3 text-right">Unit Rate (₹)</th>
                <th className="p-3 text-right">Stock Value (₹)</th>
                <th className="p-3 text-center rounded-r-lg">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const isLow = item.stockQty <= item.reorderLevel;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-medium text-slate-900">
                      <div>{item.name}</div>
                      <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-600">{item.brand}</td>
                    <td className="p-3 text-right">
                      {editingItemId === item.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editQty}
                            onChange={(e) => setEditQty(Number(e.target.value))}
                            className="w-16 px-1.5 py-0.5 border border-indigo-400 rounded text-right font-bold text-xs"
                          />
                          <button
                            onClick={() => {
                              onUpdateStock(item.id, editQty);
                              setEditingItemId(null);
                            }}
                            className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-bold"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 font-mono font-bold">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          <span className={isLow ? 'text-amber-600' : 'text-slate-900'}>
                            {item.stockQty} {item.unit}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right text-slate-500 font-mono">
                      {item.reorderLevel} {item.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      ₹{item.unitRate.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      ₹{(item.stockQty * item.unitRate).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setEditingItemId(item.id);
                          setEditQty(item.stockQty);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Displaying <strong className="text-slate-800">{filtered.length}</strong> of {inventory.length} inventory items
          </span>
          <div className="flex items-center gap-2">
            {onOpenFullManager && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFullManager();
                }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Open Master Rates Manager (मास्टर रेट्स)</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
