import React, { useState, useEffect } from 'react';
import {
  InventoryMasterItem,
  InventoryCategory,
  InventoryUnit,
  INITIAL_INVENTORY_MASTER,
  STORAGE_KEY_INVENTORY,
  getActiveInventoryMaster,
} from '../constants/inventory';
import {
  Boxes,
  Search,
  Plus,
  RotateCcw,
  Save,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Package,
  Check,
  X,
  Sliders,
  DollarSign,
  Filter,
  ShieldAlert,
  Info,
  Edit3,
} from 'lucide-react';

interface InventoryManagerProps {
  onBack?: () => void;
  onClose?: () => void;
  lang?: 'hi' | 'en';
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  onBack,
  onClose,
  lang = 'hi',
}) => {
  // Load inventory items from localStorage or fall back to getActiveInventoryMaster()
  const [items, setItems] = useState<InventoryMasterItem[]>(() => {
    return getActiveInventoryMaster();
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'All'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryMasterItem | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);

  // New Item State (for Add Item Modal)
  const [newItem, setNewItem] = useState<{
    code: string;
    name: string;
    category: InventoryCategory;
    unit: InventoryUnit;
    price: number;
    thickness: string;
    weight: number;
    color: string;
    application: string;
    status: 'Active' | 'Inactive';
    externalCode: string;
  }>({
    code: '',
    name: '',
    category: 'Hardware',
    unit: 'Pieces',
    price: 0,
    thickness: '',
    weight: 0,
    color: '',
    application: '',
    status: 'Active',
    externalCode: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Helper to show auto-dismiss toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Open Add Item modal with smart category defaults
  const handleOpenAddModal = () => {
    const defaultCategory: InventoryCategory =
      selectedCategory === 'All' ? 'Hardware' : selectedCategory;

    let defaultUnit: InventoryUnit = 'Pieces';
    let defaultPrice = 0;
    let defaultThickness = '';
    let defaultWeight = 0;
    let defaultColor = '';

    if (defaultCategory === 'Glass') {
      defaultUnit = 'Sq.Ft';
      defaultPrice = 84.0;
      defaultThickness = '6mm';
      defaultWeight = 15.0;
      defaultColor = 'Clear';
    } else if (defaultCategory === 'Profile') {
      defaultUnit = 'Kilogram';
      defaultPrice = 140.0;
      defaultWeight = 1.15;
      defaultColor = 'White, Walnut, Anthracite, Black';
    } else if (defaultCategory === 'Reinforcement') {
      defaultUnit = 'Meter';
      defaultPrice = 81.0;
      defaultThickness = '1.2mm';
      defaultColor = 'Steel Galvanized';
    } else if (defaultCategory === 'Hardware') {
      defaultUnit = 'Pieces';
      defaultPrice = 0;
    } else if (defaultCategory === 'Other') {
      defaultUnit = 'CAN';
      defaultPrice = 100.0;
    }

    const codePrefix =
      defaultCategory === 'Glass'
        ? 'GL-CUSTOM'
        : defaultCategory === 'Profile'
        ? 'PRF-CUSTOM'
        : defaultCategory === 'Reinforcement'
        ? 'STEEL-CRI'
        : 'HW-CUSTOM';

    const generatedCode = `${codePrefix}-${Date.now().toString().slice(-4)}`;

    setNewItem({
      code: generatedCode,
      name: '',
      category: defaultCategory,
      unit: defaultUnit,
      price: defaultPrice,
      thickness: defaultThickness,
      weight: defaultWeight,
      color: defaultColor,
      application: '',
      status: 'Active',
      externalCode: '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  // Update new item category & sync unit defaults
  const handleCategoryChangeForNew = (cat: InventoryCategory) => {
    let unit: InventoryUnit = 'Pieces';
    let price = 0;
    let thickness = '';
    let weight = 0;
    let color = '';

    if (cat === 'Glass') {
      unit = 'Sq.Ft';
      price = 84.0;
      thickness = '6mm';
      weight = 15.0;
      color = 'Clear';
    } else if (cat === 'Profile') {
      unit = 'Kilogram';
      price = 140.0;
      weight = 1.15;
      color = 'White, Walnut, Anthracite, Black';
    } else if (cat === 'Reinforcement') {
      unit = 'Meter';
      price = 81.0;
      thickness = '1.2mm';
      color = 'Steel Galvanized';
    } else if (cat === 'Other') {
      unit = 'CAN';
      price = 100.0;
    }

    setNewItem((prev) => ({
      ...prev,
      category: cat,
      unit,
      price,
      thickness,
      weight,
      color,
    }));
  };

  // Save changes to localStorage
  const handleSaveToStorage = (customItems?: InventoryMasterItem[]) => {
    const listToSave = customItems || items;
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(listToSave));
      showToast(
        lang === 'hi'
          ? '✓ इन्वेंट्री और रेट्स सफलतापूर्वक सुरक्षित हो गए (Saved to LocalStorage)'
          : '✓ Inventory & Rates successfully saved!'
      );
    } catch (e) {
      console.error('Failed to save to localStorage', e);
      showToast('Error saving inventory.');
    }
  };

  // Reset to default catalogue
  const handleResetToDefaults = () => {
    setItems(INITIAL_INVENTORY_MASTER);
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(INITIAL_INVENTORY_MASTER));
      showToast(
        lang === 'hi'
          ? '✓ फ़ैक्टरी डिफ़ॉल्ट रेट्स पुनर्स्थापित हो गए (Reset to Defaults)'
          : '✓ Reset to factory default catalogue!'
      );
    } catch (e) {}
    setResetConfirmOpen(false);
  };

  // Inline field updater for existing item
  const handleUpdateItemField = (
    id: string,
    field: keyof InventoryMasterItem,
    value: any
  ) => {
    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return updated;
    });
  };

  // Add new item submit handler
  const handleAddNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.code.trim()) {
      setFormError('Item Code is required.');
      return;
    }
    if (!newItem.name.trim()) {
      setFormError('Item Name / Specification is required.');
      return;
    }

    const created: InventoryMasterItem = {
      id: `inv-${Date.now()}`,
      code: newItem.code.trim().toUpperCase(),
      name: newItem.name.trim(),
      category: newItem.category,
      unit: newItem.unit,
      price: Number(newItem.price) || 0,
      thickness: newItem.thickness ? newItem.thickness.trim() : undefined,
      weight: Number(newItem.weight) || undefined,
      color: newItem.color ? newItem.color.trim() : undefined,
      application: newItem.application ? newItem.application.trim() : undefined,
      status: newItem.status,
      externalCode: newItem.externalCode ? newItem.externalCode.trim() : undefined,
      stockQty: 100,
      reorderLevel: 25,
    };

    const updatedList = [created, ...items];
    setItems(updatedList);
    setShowAddModal(false);
    handleSaveToStorage(updatedList);
    showToast(
      lang === 'hi'
        ? `✓ नया आइटम "${created.name}" जोड़ा गया!`
        : `✓ New item "${created.name}" added!`
    );
  };

  // Delete item handler
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const updatedList = items.filter((i) => i.id !== itemToDelete.id);
    setItems(updatedList);
    handleSaveToStorage(updatedList);
    showToast(`Deleted ${itemToDelete.code}`);
    setItemToDelete(null);
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      (item.brand && item.brand.toLowerCase().includes(q)) ||
      (item.rmCategory && item.rmCategory.toLowerCase().includes(q)) ||
      (item.reportingCategory && item.reportingCategory.toLowerCase().includes(q)) ||
      (item.externalCode && item.externalCode.toLowerCase().includes(q)) ||
      (item.application && item.application.toLowerCase().includes(q)) ||
      (item.color && item.color.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // KPI calculations
  const totalCount = items.length;
  const activeCount = items.filter((i) => i.status === 'Active').length;
  const profileCount = items.filter((i) => i.category === 'Profile').length;
  const glassCount = items.filter((i) => i.category === 'Glass').length;
  const hardwareCount = items.filter((i) => i.category === 'Hardware').length;
  const steelCount = items.filter((i) => i.category === 'Reinforcement').length;

  const categoriesList: { id: InventoryCategory | 'All'; label: string; count: number }[] = [
    { id: 'All', label: 'All Items', count: totalCount },
    { id: 'Hardware', label: 'Hardware & Locks', count: hardwareCount },
    { id: 'Profile', label: 'uPVC Profiles (₹/kg)', count: profileCount },
    { id: 'Glass', label: 'Glass & Mesh', count: glassCount },
    { id: 'Reinforcement', label: 'GI Steel (₹/mtr)', count: steelCount },
    { id: 'Other', label: 'Consumables & Seals', count: items.filter((i) => i.category === 'Other').length },
  ];

  return (
    <div className="w-full h-full bg-slate-900 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Navigation */}
      <div className="h-16 bg-slate-950/90 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {(onBack || onClose) && (
            <button
              onClick={onBack || onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
              title="Return to Dashboard / Previous Screen"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back (पीछे जाएँ)</span>
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-white tracking-wide uppercase">
                {lang === 'hi'
                  ? 'इन्वेंट्री और सामग्री मास्टर रेट्स (Inventory & Rates)'
                  : 'Master Inventory & Material Database'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {totalCount} Materials
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'hi'
                ? 'uPVC प्रोफाइल (₹/kg), काँच (₹/sqft), GI स्टील (₹/m), एवं हार्डवेयर के लाइव रेट्स'
                : 'Real-time stock pricing, kg/meter weights, and unit rates for quotation engine'}
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-rose-300 text-xs font-bold transition cursor-pointer"
            title="Restore default factory catalogue rates"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Item (नया आइटम जोड़ें)</span>
          </button>

          <button
            onClick={() => handleSaveToStorage()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md transition cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes (सुरक्षित करें)</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-4 bg-slate-950/60 border-b border-slate-800 shrink-0">
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Catalogue</div>
            <div className="text-base font-extrabold text-white font-mono">{totalCount} SKUs</div>
          </div>
          <Package className="w-4 h-4 text-purple-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Active Materials</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono">{activeCount} / {totalCount}</div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">uPVC Profiles</div>
            <div className="text-base font-extrabold text-blue-400 font-mono">{profileCount} Extrusions</div>
          </div>
          <Layers className="w-4 h-4 text-blue-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Glass & Mesh</div>
            <div className="text-base font-extrabold text-cyan-400 font-mono">{glassCount} Varieties</div>
          </div>
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">GI Reinforcement</div>
            <div className="text-base font-extrabold text-amber-400 font-mono">{steelCount} Steel Types</div>
          </div>
          <ShieldAlert className="w-4 h-4 text-amber-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Hardware & Locks</div>
            <div className="text-base font-extrabold text-indigo-400 font-mono">{hardwareCount} Items</div>
          </div>
          <Sliders className="w-4 h-4 text-indigo-400" />
        </div>
      </div>

      {/* 3. Search & Category Filter Tabs */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Search Field */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search code (e.g. CWH60-01, GL-TOUGH6MM), name or spec..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {categoriesList.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/80'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-purple-800 text-purple-100' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Table / Dynamic Item Cards View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            <Boxes className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-400">No items match your search or filter</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing the search query or category filter</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
              }}
              className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4 w-44">Item Code</th>
                  <th className="py-3 px-4">Item Name / Specification</th>
                  <th className="py-3 px-3 w-32">Category</th>
                  <th className="py-3 px-3 w-28">Unit</th>
                  <th className="py-3 px-4 w-36 text-right">Unit Price (₹)</th>
                  <th className="py-3 px-3 w-40">Specification Specs</th>
                  <th className="py-3 px-3 w-24 text-center">Status</th>
                  <th className="py-3 px-4 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredItems.map((item) => {
                  const isGlass = item.category === 'Glass';
                  const isProfile = item.category === 'Profile';
                  const isSteel = item.category === 'Reinforcement';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* 1. Item Code Badge (Editable) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={item.code}
                            onChange={(e) =>
                              handleUpdateItemField(item.id, 'code', e.target.value.toUpperCase())
                            }
                            className="font-mono text-xs font-bold text-purple-300 bg-purple-950/40 border border-purple-500/30 rounded-lg px-2 py-1 w-full focus:bg-slate-900 focus:border-purple-400 focus:outline-none transition"
                            title="Item Code (Click to edit)"
                          />
                        </div>
                      </td>

                      {/* 2. Item Name & Application */}
                      <td className="py-3 px-4 align-middle">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateItemField(item.id, 'name', e.target.value)
                            }
                            className="font-semibold text-xs text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-purple-400 focus:bg-slate-900 focus:outline-none rounded px-1.5 py-0.5 w-full transition"
                            title="Click to edit name"
                          />
                          {item.application && (
                            <div className="text-[11px] text-slate-400 px-1.5 flex items-center gap-1">
                              <span className="text-slate-500">App:</span>
                              <span className="truncate max-w-sm">{item.application}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Category Selector */}
                      <td className="py-3 px-3 align-middle">
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleUpdateItemField(
                              item.id,
                              'category',
                              e.target.value as InventoryCategory
                            )
                          }
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 font-medium focus:outline-none focus:border-purple-400 transition"
                        >
                          <option value="Hardware">Hardware</option>
                          <option value="Profile">Profile</option>
                          <option value="Glass">Glass</option>
                          <option value="Reinforcement">Reinforcement</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>

                      {/* 4. Unit Selector */}
                      <td className="py-3 px-3 align-middle">
                        <select
                          value={item.unit}
                          onChange={(e) =>
                            handleUpdateItemField(
                              item.id,
                              'unit',
                              e.target.value as InventoryUnit
                            )
                          }
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-purple-400 transition"
                        >
                          <option value="Pieces">Pieces</option>
                          <option value="Kilogram">Kilogram</option>
                          <option value="Meter">Meter</option>
                          <option value="Sq.Ft">Sq.Ft</option>
                          <option value="sq mtr">sq mtr</option>
                          <option value="CAN">CAN</option>
                          <option value="Set">Set</option>
                        </select>
                      </td>

                      {/* 5. Unit Price (₹ INR) */}
                      <td className="py-3 px-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1 font-mono">
                          <span className="text-slate-400 text-xs font-bold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) =>
                              handleUpdateItemField(item.id, 'price', Number(e.target.value))
                            }
                            className="w-24 text-right font-extrabold text-xs text-emerald-400 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 focus:bg-slate-950 focus:border-emerald-400 focus:outline-none transition"
                          />
                        </div>
                      </td>

                      {/* 6. Dynamic Category-Specific Fields */}
                      <td className="py-3 px-3 align-middle">
                        <div className="space-y-1 text-[11px]">
                          {isGlass && (
                            <div className="flex flex-col gap-0.5">
                              {item.thickness && (
                                <div className="text-cyan-300 font-mono">
                                  Thick: <strong>{item.thickness}</strong>
                                </div>
                              )}
                              {item.weight && (
                                <div className="text-slate-400">
                                  Wt: {item.weight} kg/m²
                                </div>
                              )}
                              {item.color && (
                                <div className="text-slate-400 truncate max-w-[120px]">
                                  {item.color}
                                </div>
                              )}
                            </div>
                          )}

                          {isProfile && (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.brand && (
                                  <span className="text-[10px] bg-purple-900/60 text-purple-200 border border-purple-500/40 rounded px-1.5 py-0.5 font-bold tracking-wide">
                                    {item.brand}
                                  </span>
                                )}
                                {item.rmCategory && (
                                  <span className="text-[10px] bg-blue-950/60 text-blue-300 border border-blue-600/40 rounded px-1.5 py-0.5 font-medium">
                                    {item.rmCategory}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-blue-300 font-mono text-[10.5px] bg-blue-950/70 border border-blue-700/50 px-1.5 py-0.5 rounded font-bold">
                                  ⚖️ {item.weight ? `${item.weight} kg/m` : '1.02 kg/m'}
                                </span>
                                {item.packetQty ? (
                                  <span className="text-amber-300 font-mono text-[10px] bg-amber-950/70 border border-amber-700/50 px-1.5 py-0.5 rounded font-semibold">
                                    📦 {item.packetQty} Pcs/Pkt
                                  </span>
                                ) : null}
                              </div>
                              {item.color && (
                                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={item.color}>
                                  🎨 {item.color}
                                </div>
                              )}
                            </div>
                          )}

                          {isSteel && (
                            <div className="flex flex-col gap-0.5">
                              <div className="text-amber-300 font-mono">
                                GI Thick: <strong>{item.thickness || '1.2mm'}</strong>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Galvanized Steel
                              </div>
                            </div>
                          )}

                          {!isGlass && !isProfile && !isSteel && (
                            <div className="text-slate-500 italic">
                              {item.application || 'Standard fitting'}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. Active / Inactive Switch */}
                      <td className="py-3 px-3 text-center align-middle">
                        <button
                          onClick={() =>
                            handleUpdateItemField(
                              item.id,
                              'status',
                              item.status === 'Active' ? 'Inactive' : 'Active'
                            )
                          }
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition cursor-pointer ${
                            item.status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                          }`}
                        >
                          {item.status}
                        </button>
                      </td>

                      {/* 8. Delete Action */}
                      <td className="py-3 px-4 text-center align-middle">
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete material from catalogue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Footer Info Bar */}
      <div className="h-12 bg-slate-950 border-t border-slate-800 px-6 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-white font-mono">{filteredItems.length}</strong> of{' '}
            <strong className="text-white font-mono">{totalCount}</strong> materials
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] text-slate-500">
            Storage Key: <code className="text-purple-300 font-mono">{STORAGE_KEY_INVENTORY}</code>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSaveToStorage()}
            className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Inventory Rates</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: ADD ITEM */}
      {/* ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add New Material / Profile Item</h3>
                  <p className="text-[11px] text-slate-400">Auto-assigns category units & base rates</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewItemSubmit} className="space-y-3.5">
              {/* Category selector & Quick Glass Presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Category (श्रेणी चुनें)
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => handleCategoryChangeForNew(e.target.value as InventoryCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Glass">Glass & Fly Mesh (Toughened, Clear, DGU, Laminated, SS304)</option>
                  <option value="Hardware">Hardware (Locks, Handles, Hinges, Rollers)</option>
                  <option value="Profile">Profile (uPVC Frame, Sash, Mullion, Beading)</option>
                  <option value="Reinforcement">Reinforcement (GI Steel 1.2mm / 1.5mm)</option>
                  <option value="Other">Other (Consumables, Silicone, Screws)</option>
                </select>

                {newItem.category === 'Glass' && (
                  <div className="mt-2.5 p-2.5 bg-slate-950/80 rounded-xl border border-purple-500/20">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>Quick Glass Template Presets (1-क्लिक प्रीसेट):</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {[
                        { name: '5mm Clear Glass', code: 'GL-CLR-5MM', thk: '5mm', price: 52, unit: 'Sq.Ft' as InventoryUnit, color: 'Clear', app: 'Standard Window Pane' },
                        { name: '6mm Toughened Clear', code: 'GL-TOUGH-6MM', thk: '6mm', price: 84, unit: 'Sq.Ft' as InventoryUnit, color: 'Clear', app: 'Safety Toughened Sash' },
                        { name: '8mm Toughened Clear', code: 'GL-TOUGH-8MM', thk: '8mm', price: 115, unit: 'Sq.Ft' as InventoryUnit, color: 'Clear', app: 'Heavy Sliding Door' },
                        { name: '10mm Clear Toughened', code: 'GL-TOUGH-10MM', thk: '10mm', price: 185, unit: 'Sq.Ft' as InventoryUnit, color: 'Clear', app: 'Large Casement Door' },
                        { name: '12mm Heavy Toughened', code: 'GL-TOUGH-12MM', thk: '12mm', price: 210, unit: 'Sq.Ft' as InventoryUnit, color: 'Clear', app: 'Frameless Glass Wall' },
                        { name: '20mm DGU (5+10A+5)', code: 'GL-DGU-20MM', thk: '20mm', price: 155, unit: 'Sq.Ft' as InventoryUnit, color: 'Clear Air', app: 'Thermal Soundproof DGU' },
                        { name: '24mm DGU (6+12A+6)', code: 'GL-DGU-24MM', thk: '24mm', price: 175, unit: 'Sq.Ft' as InventoryUnit, color: 'Argon Gas', app: 'Acoustic Double Glaze' },
                        { name: '30mm Heavy DGU', code: 'GL-DGU-30MM', thk: '30mm', price: 245, unit: 'Sq.Ft' as InventoryUnit, color: 'Light Blue', app: 'Highway Acoustic Facade' },
                        { name: '11.52mm Laminated Safety', code: 'GL-LAM-11-52', thk: '11.52mm', price: 215, unit: 'Sq.Ft' as InventoryUnit, color: 'Safety PVB', app: 'Anti-Burglar Glazing' },
                        { name: '5mm Frosted Privacy', code: 'GL-FROST-5MM', thk: '5mm', price: 68, unit: 'Sq.Ft' as InventoryUnit, color: 'Frosted', app: 'Bathroom Privacy' },
                        { name: '5mm Bronze Tinted', code: 'GL-TINT-BRZ5', thk: '5mm', price: 78, unit: 'Sq.Ft' as InventoryUnit, color: 'Bronze', app: 'Sun Heat Absorption' },
                        { name: '5mm Green Tinted', code: 'GL-TINT-GRN5', thk: '5mm', price: 78, unit: 'Sq.Ft' as InventoryUnit, color: 'Green', app: 'Solar Cool-Lite' },
                        { name: '5mm Blue Tinted', code: 'GL-TINT-BLU5', thk: '5mm', price: 82, unit: 'Sq.Ft' as InventoryUnit, color: 'Blue', app: 'Modern Facade' },
                        { name: '5mm Grey Tinted', code: 'GL-TINT-GRY5', thk: '5mm', price: 78, unit: 'Sq.Ft' as InventoryUnit, color: 'Euro Grey', app: 'Glare Reduction' },
                        { name: '6mm Low-E Solar Glass', code: 'GL-LOWE-6MM', thk: '6mm', price: 135, unit: 'Sq.Ft' as InventoryUnit, color: 'Neutral Low-E', app: 'Solar Heat Control' },
                        { name: '6mm Reflective Mirror', code: 'GL-REFL-MIRROR', thk: '6mm', price: 118, unit: 'Sq.Ft' as InventoryUnit, color: 'Mirror', app: 'Daytime Privacy' },
                        { name: '5mm Fluted / Pinhead', code: 'GL-PINHEAD-5MM', thk: '5mm', price: 74, unit: 'Sq.Ft' as InventoryUnit, color: 'Fluted', app: 'Decorative Privacy' },
                        { name: 'SS 304 Fly Mesh', code: 'MS-SS304', thk: '1mm', price: 23, unit: 'Sq.Ft' as InventoryUnit, color: 'Steel Grey', app: 'Mosquito Protection' },
                        { name: 'SS 316 Security Mesh', code: 'MS-SS316', thk: '1.2mm', price: 75, unit: 'Sq.Ft' as InventoryUnit, color: 'Black', app: 'Burglar Proof Mesh' },
                        { name: 'PVC Sandwich Panel', code: 'PVCS-5MM', thk: '5mm', price: 25, unit: 'Sq.Ft' as InventoryUnit, color: 'White Panel', app: 'Door Bottom Infill' },
                      ].map((preset) => (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() => {
                            setNewItem({
                              ...newItem,
                              code: preset.code,
                              name: preset.name,
                              thickness: preset.thk,
                              price: preset.price,
                              unit: preset.unit,
                              color: preset.color,
                              application: preset.app,
                              weight: preset.thk.includes('6mm') ? 15 : preset.thk.includes('5mm') ? 12.5 : 25,
                            });
                          }}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 hover:bg-purple-900/60 border border-slate-700 hover:border-purple-500 text-slate-300 hover:text-purple-200 transition whitespace-nowrap cursor-pointer"
                        >
                          + {preset.name} (₹{preset.price})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Code & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Item Code (e.g. CWH60-01) *
                  </label>
                  <input
                    type="text"
                    value={newItem.code}
                    onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-500"
                    placeholder="UPVC-CODE-01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Unit (इकाई)
                  </label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as InventoryUnit })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Pieces">Pieces (pcs)</option>
                    <option value="Kilogram">Kilogram (kg)</option>
                    <option value="Meter">Meter (mtr)</option>
                    <option value="Sq.Ft">Sq.Ft (sqft)</option>
                    <option value="sq mtr">sq mtr (m²)</option>
                    <option value="CAN">CAN</option>
                    <option value="Set">Set</option>
                  </select>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Item Name / Description *
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g. 6mm Toughened Glass or Casement Outer Frame"
                  required
                />
              </div>

              {/* Price & Weight/Thickness */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Unit Base Rate (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-extrabold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {newItem.category === 'Glass' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Glass Thickness (mm)
                    </label>
                    <input
                      type="text"
                      value={newItem.thickness}
                      onChange={(e) => setNewItem({ ...newItem, thickness: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g. 6mm or 24mm DGU"
                    />
                  </div>
                ) : newItem.category === 'Profile' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Weight per Meter (kg/m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.weight}
                      onChange={(e) => setNewItem({ ...newItem, weight: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                      placeholder="1.15"
                    />
                  </div>
                ) : newItem.category === 'Reinforcement' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      GI Steel Thickness (mm)
                    </label>
                    <input
                      type="text"
                      value={newItem.thickness}
                      onChange={(e) => setNewItem({ ...newItem, thickness: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                      placeholder="1.2mm or 1.5mm"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Application / Notes
                    </label>
                    <input
                      type="text"
                      value={newItem.application}
                      onChange={(e) => setNewItem({ ...newItem, application: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g. Casement sash lock"
                    />
                  </div>
                )}
              </div>

              {formError && (
                <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer active:scale-95"
                >
                  + Add Item to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================== */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-white">Delete Item?</h3>
            <p className="text-xs text-slate-400 mt-1">
              Are you sure you want to delete{' '}
              <strong className="text-rose-300 font-mono">{itemToDelete.code}</strong> (
              {itemToDelete.name})?
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition cursor-pointer active:scale-95"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: RESET CONFIRMATION */}
      {/* ========================================== */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-white">Restore Factory Rates?</h3>
            <p className="text-xs text-slate-400 mt-1">
              This will overwrite custom edits and restore the full master catalogue of{' '}
              <strong className="text-amber-300">{INITIAL_INVENTORY_MASTER.length} materials</strong>.
            </p>

            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer active:scale-95"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
