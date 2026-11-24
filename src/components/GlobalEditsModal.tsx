import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { CustomerDesignCardItem } from './CustomerProjectView';

export type GlobalEditCategory =
  | 'glass'
  | 'mesh'
  | 'color'
  | 'standard_bar'
  | 'design_quantity'
  | 'ri_thickness';

export interface GlobalEditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: GlobalEditCategory;
  designs: CustomerDesignCardItem[];
  onApplyGlobalEdit: (
    category: GlobalEditCategory,
    selectedDesignIds: string[],
    targetValue: string | number
  ) => void;
}

// -------------------------------------------------------------
// PRESET OPTIONS FOR ALL 6 GLOBAL EDIT CATEGORIES
// -------------------------------------------------------------
export const GLOBAL_GLASS_OPTIONS = [
  'PVC SHEET',
  '5 MM BLACK GLASS',
  '5 MM FROSTED TOUGHENED GLASS',
  '5 MM REFLECTIVE GLASS',
  '5 MM REFLECTIVE TOUGHENED GLASS',
  '5 MM CLEAR GLASS',
  '5MM BLACK REFLECTIVE',
  '5MM BLUE REFLECTIVE',
  '5mm Clear Toughened',
  '5MM PINHEAD GLASS',
  '5 MM FROSTED GLASS',
  '6 MM CLEAR GLASS',
  '6 MM FROSTED GLASS',
  '6 MM REFLECTIVE GLASS',
  '6 MM REFLECTIVE TOUGHENED GLASS',
  '6mm Clear Glass',
  '6mm Frosted Toughened',
  '6 MM CLEAR TOUGHNED GLASS',
  '8 MM CLEAR GLASS',
  '8 MM FROSTED TOUGHENED GLASS',
  'DGU 22MM (5+12A+5 CLEAR DOUBLE GLASS)',
  'DGU 24MM (6+12A+6 TOUGHENED DOUBLE GLASS)',
  'DGU 28MM (6+16A+6 SOUNDPROOF DGU)',
  '10 MM TOUGHENED GLASS',
  '12 MM TOUGHENED GLASS',
];

export const GLOBAL_MESH_OPTIONS = [
  'NO MESH',
  'SS 304 INVISIBLE MESH',
  'SS 304 HEAVY DUTY WIRE MESH',
  'FIBERGLASS CHARCOAL MESH',
  'FIBERGLASS GREY MESH',
  'ALUMINIUM WIRE MESH',
  'PET RESISTANT POLYESTER MESH',
  'POLLEN & DUST FILTER MESH',
  'PLEATED RETRACTABLE MOSQUITO MESH',
  'STAINLESS STEEL SECURITY MESH (0.8MM)',
];

export const GLOBAL_COLOR_OPTIONS = [
  { name: 'PURE WHITE (RAL 9016)', hex: '#f8fafc', border: '#cbd5e1' },
  { name: 'OFF WHITE / CREAM (RAL 9001)', hex: '#fef3c7', border: '#d97706' },
  { name: 'GOLDEN OAK WOODGRAIN', hex: '#b45309', border: '#92400e' },
  { name: 'WALNUT WOODGRAIN', hex: '#5b3a29', border: '#382318' },
  { name: 'DARK ASH / RUSTIC OAK', hex: '#374151', border: '#1f2937' },
  { name: 'MAHOGANY WOODGRAIN', hex: '#7f1d1d', border: '#450a0a' },
  { name: 'ANTHRACITE GREY (RAL 7016)', hex: '#334155', border: '#1e293b' },
  { name: 'JET BLACK (RAL 9005)', hex: '#0f172a', border: '#020617' },
  { name: 'CHERRY WOOD', hex: '#991b1b', border: '#7f1d1d' },
  { name: 'NATURAL TEAK WOODGRAIN', hex: '#854d0e', border: '#713f12' },
  { name: 'ANODIZED SILVER (ALU)', hex: '#94a3b8', border: '#64748b' },
  { name: 'CHAMPAGNE BRONZE (ALU)', hex: '#a1887f', border: '#6d4c41' },
];

export const GLOBAL_STANDARD_BAR_OPTIONS = [
  'NO STANDARD BAR',
  '18 MM FLAT GEORGIAN BAR (INTERNAL)',
  '26 MM CONTOURED GEORGIAN BAR',
  '18 MM DUPLEX ASTRAGAL BAR',
  '24 MM SURFACE MOUNTED SASH BAR',
  'INTERNAL BRASS GEORGIAN BAR',
  'DIAMOND LEAD PATTERN BAR',
  'RECTANGULAR 6-LITE COLONIAL GRID',
  'PRAIRIE 9-LITE DECORATIVE GRID',
  'CROSS 4-LITE STANDARD BAR',
];

export const GLOBAL_QUANTITY_OPTIONS = [
  '1 QTY',
  '2 QTY',
  '3 QTY',
  '4 QTY',
  '5 QTY',
  '6 QTY',
  '8 QTY',
  '10 QTY',
  '12 QTY',
  '15 QTY',
  '20 QTY',
  'CUSTOM QTY',
];

export const GLOBAL_RI_OPTIONS = [
  '0.8 MM GI REINFORCEMENT',
  '1.0 MM GI REINFORCEMENT',
  '1.2 MM GI REINFORCEMENT',
  '1.5 MM GI REINFORCEMENT (STANDARD)',
  '1.8 MM GI REINFORCEMENT',
  '2.0 MM HEAVY DUTY GI REINFORCEMENT',
  '2.5 MM STRUCTURAL GI REINFORCEMENT',
  'NO REINFORCEMENT (NON-LOAD)',
];

export const GlobalEditsModal: React.FC<GlobalEditsModalProps> = ({
  isOpen,
  onClose,
  category,
  designs,
  onApplyGlobalEdit,
}) => {
  if (!isOpen) return null;

  // Search states
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');

  // Selected design IDs in the left tree
  const [selectedDesignIds, setSelectedDesignIds] = useState<string[]>(() =>
    designs.map((d) => d.id)
  );

  // Collapsed groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Right-side selected radio option
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customQtyValue, setCustomQtyValue] = useState<number>(1);

  // Titles mapping
  const categoryTitle = useMemo(() => {
    switch (category) {
      case 'glass':
        return 'Glass';
      case 'mesh':
        return 'Mesh';
      case 'color':
        return 'Color';
      case 'standard_bar':
        return 'Standard bar';
      case 'design_quantity':
        return 'Design quantity';
      case 'ri_thickness':
        return 'RI thickness';
    }
  }, [category]);

  const rightHeaderTitle = useMemo(() => {
    switch (category) {
      case 'glass':
        return 'Glass name';
      case 'mesh':
        return 'Mesh name';
      case 'color':
        return 'Color name';
      case 'standard_bar':
        return 'Standard bar name';
      case 'design_quantity':
        return 'Design quantity';
      case 'ri_thickness':
        return 'RI thickness';
    }
  }, [category]);

  // Helper to extract the design's current property value
  const getDesignCurrentValue = (d: CustomerDesignCardItem): string => {
    switch (category) {
      case 'glass': {
        const g = d.glassType || d.projectData?.frames?.[0]?.pockets?.[0]?.glassType;
        if (!g) return '5 MM CLEAR GLASS';
        const str = String(g).toLowerCase();
        if (str.includes('black')) return '5 MM BLACK GLASS';
        if (str.includes('frosted')) return '5 MM FROSTED GLASS';
        if (str.includes('reflective')) return '5 MM REFLECTIVE GLASS';
        if (str.includes('dgu') || str.includes('22')) return 'DGU 22MM (5+12A+5 CLEAR DOUBLE GLASS)';
        if (str.includes('6mm') || str.includes('6_mm')) return '6 MM CLEAR GLASS';
        if (str.includes('8mm')) return '8 MM CLEAR GLASS';
        return '5 MM CLEAR GLASS';
      }
      case 'mesh': {
        const hasMesh = d.projectData?.frames?.some((f) =>
          f.pockets?.some((p) => p.hasMesh || p.sashType?.startsWith('mesh'))
        );
        return hasMesh ? 'SS 304 INVISIBLE MESH' : 'NO MESH';
      }
      case 'color': {
        const frameColor = d.projectData?.frames?.[0]?.color;
        const colorName = typeof frameColor === 'object' && frameColor !== null ? (frameColor as any).name : frameColor;
        const c = d.profileColor || colorName || 'white';
        const str = String(c).toLowerCase();
        if (str.includes('golden')) return 'GOLDEN OAK WOODGRAIN';
        if (str.includes('walnut')) return 'WALNUT WOODGRAIN';
        if (str.includes('dark') || str.includes('ash')) return 'DARK ASH / RUSTIC OAK';
        if (str.includes('grey') || str.includes('gray') || str.includes('anthracite')) return 'ANTHRACITE GREY (RAL 7016)';
        if (str.includes('black')) return 'JET BLACK (RAL 9005)';
        if (str.includes('mahogany')) return 'MAHOGANY WOODGRAIN';
        return 'PURE WHITE (RAL 9016)';
      }
      case 'standard_bar': {
        const hasBar = d.projectData?.frames?.some((f) => (f as any).standardBar);
        return hasBar ? '18 MM FLAT GEORGIAN BAR (INTERNAL)' : 'NO STANDARD BAR';
      }
      case 'design_quantity': {
        return `${d.quantity || 1} QTY`;
      }
      case 'ri_thickness': {
        const t = (d.projectData?.frames?.[0] as any)?.reinforcementThickness;
        if (t === 1.2) return '1.2 MM GI REINFORCEMENT';
        if (t === 2.0) return '2.0 MM HEAVY DUTY GI REINFORCEMENT';
        return '1.5 MM GI REINFORCEMENT (STANDARD)';
      }
    }
  };

  // Group designs by current value
  const groupedDesigns = useMemo(() => {
    const map = new Map<string, CustomerDesignCardItem[]>();
    designs.forEach((d) => {
      const val = getDesignCurrentValue(d);
      if (!map.has(val)) {
        map.set(val, []);
      }
      map.get(val)!.push(d);
    });

    // Convert map to array and apply left search
    const result: { groupName: string; items: CustomerDesignCardItem[] }[] = [];
    const query = leftSearch.trim().toLowerCase();

    map.forEach((items, groupName) => {
      const filteredItems = items.filter(
        (it) =>
          it.tag.toLowerCase().includes(query) ||
          (it.designName && it.designName.toLowerCase().includes(query)) ||
          groupName.toLowerCase().includes(query)
      );

      if (filteredItems.length > 0) {
        result.push({ groupName, items: filteredItems });
      }
    });

    return result;
  }, [designs, category, leftSearch]);

  // Options list filtered by right search
  const filteredOptions = useMemo(() => {
    let list: { name: string; hex?: string; border?: string }[] = [];
    switch (category) {
      case 'glass':
        list = GLOBAL_GLASS_OPTIONS.map((name) => ({ name }));
        break;
      case 'mesh':
        list = GLOBAL_MESH_OPTIONS.map((name) => ({ name }));
        break;
      case 'color':
        list = GLOBAL_COLOR_OPTIONS;
        break;
      case 'standard_bar':
        list = GLOBAL_STANDARD_BAR_OPTIONS.map((name) => ({ name }));
        break;
      case 'design_quantity':
        list = GLOBAL_QUANTITY_OPTIONS.map((name) => ({ name }));
        break;
      case 'ri_thickness':
        list = GLOBAL_RI_OPTIONS.map((name) => ({ name }));
        break;
    }

    const q = rightSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [category, rightSearch]);

  // Calculate actual changes count
  const changesCount = useMemo(() => {
    if (!selectedOption) return 0;
    let count = 0;
    selectedDesignIds.forEach((id) => {
      const d = designs.find((item) => item.id === id);
      if (d) {
        const currentVal = getDesignCurrentValue(d);
        if (category === 'design_quantity') {
          const targetQty =
            selectedOption === 'CUSTOM QTY'
              ? customQtyValue
              : parseInt(selectedOption, 10) || 1;
          if (d.quantity !== targetQty) count++;
        } else {
          if (currentVal !== selectedOption) count++;
        }
      }
    });
    return count;
  }, [selectedOption, selectedDesignIds, designs, category, customQtyValue]);

  // Toggle group expansion
  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Toggle all designs in a group
  const handleToggleGroup = (groupItems: CustomerDesignCardItem[]) => {
    const groupItemIds = groupItems.map((i) => i.id);
    const allSelected = groupItemIds.every((id) => selectedDesignIds.includes(id));

    if (allSelected) {
      setSelectedDesignIds((prev) => prev.filter((id) => !groupItemIds.includes(id)));
    } else {
      setSelectedDesignIds((prev) => Array.from(new Set([...prev, ...groupItemIds])));
    }
  };

  // Toggle individual design
  const handleToggleDesign = (id: string) => {
    setSelectedDesignIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle Save
  const handleSave = () => {
    if (!selectedOption || changesCount === 0) return;
    let targetVal: string | number = selectedOption;
    if (category === 'design_quantity') {
      targetVal =
        selectedOption === 'CUSTOM QTY'
          ? customQtyValue
          : parseInt(selectedOption, 10) || 1;
    }
    onApplyGlobalEdit(category, selectedDesignIds, targetVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-4xl h-[620px] max-h-[92vh] flex flex-col overflow-hidden font-sans">
        {/* ========================================================= */}
        {/* MODAL HEADER                                              */}
        {/* ========================================================= */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              {categoryTitle}
            </h2>
            <Info className="w-4 h-4 text-slate-400 cursor-help" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* TWO-COLUMN BODY                                           */}
        {/* ========================================================= */}
        <div className="flex-1 flex overflow-hidden">
          {/* ------------------------------------------------------- */}
          {/* LEFT COLUMN: Current Project Designs Grouped Tree View  */}
          {/* ------------------------------------------------------- */}
          <div className="w-[46%] border-r border-slate-200 flex flex-col bg-white">
            {/* Search Bar */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search"
                  value={leftSearch}
                  onChange={(e) => setLeftSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tree View Content */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
              {groupedDesigns.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No designs found
                </div>
              ) : (
                groupedDesigns.map((group) => {
                  const isCollapsed = collapsedGroups[group.groupName];
                  const groupItemIds = group.items.map((it) => it.id);
                  const isAllGroupSelected = groupItemIds.every((id) =>
                    selectedDesignIds.includes(id)
                  );
                  const isSomeGroupSelected =
                    !isAllGroupSelected &&
                    groupItemIds.some((id) => selectedDesignIds.includes(id));

                  return (
                    <div key={group.groupName} className="space-y-0.5">
                      {/* Group Header Row */}
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 transition cursor-pointer select-none">
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapse(group.groupName)}
                          className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAllGroupSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomeGroupSelected;
                            }}
                            onChange={() => handleToggleGroup(group.items)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                            {group.groupName}
                          </span>
                        </label>
                      </div>

                      {/* Child Designs List */}
                      {!isCollapsed && (
                        <div className="pl-8 space-y-1">
                          {group.items.map((item) => {
                            const isSelected = selectedDesignIds.includes(item.id);
                            return (
                              <label
                                key={item.id}
                                className="flex items-center gap-2.5 py-1 px-2 rounded hover:bg-blue-50/50 transition cursor-pointer select-none text-xs text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleDesign(item.id)}
                                  className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="font-semibold text-slate-900">
                                  {item.tag}
                                </span>
                                {item.designName && (
                                  <span className="text-slate-400 text-[11px] truncate">
                                    - {item.designName}
                                  </span>
                                )}
                                <span className="text-slate-400 text-[10px] ml-auto">
                                  {item.width} × {item.height}mm
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* RIGHT COLUMN: Available Options Radio List              */}
          {/* ------------------------------------------------------- */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Header & Search */}
            <div className="p-3.5 border-b border-slate-100 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                {rightHeaderTitle}
              </h3>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search"
                  value={rightSearch}
                  onChange={(e) => setRightSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Radio Options List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedOption === opt.name;
                  return (
                    <div key={opt.name} className="space-y-1.5">
                      <label
                        className={`flex items-center gap-2.5 py-1 px-2 rounded-md transition cursor-pointer select-none ${
                          isChecked ? 'bg-blue-50/70 font-semibold text-blue-900' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name="global_option_radio"
                          value={opt.name}
                          checked={isChecked}
                          onChange={() => setSelectedOption(opt.name)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />

                        {/* Optional Color swatch */}
                        {opt.hex && (
                          <span
                            className="w-4 h-4 rounded-full border shrink-0 shadow-2xs"
                            style={{
                              backgroundColor: opt.hex,
                              borderColor: opt.border || '#cbd5e1',
                            }}
                          />
                        )}

                        <span className="text-xs">{opt.name}</span>
                      </label>

                      {/* If CUSTOM QTY is selected in Design quantity */}
                      {category === 'design_quantity' && opt.name === 'CUSTOM QTY' && isChecked && (
                        <div className="pl-7 pt-1 flex items-center gap-2">
                          <label className="text-[11px] font-semibold text-slate-500">
                            Enter Quantity:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={customQtyValue}
                            onChange={(e) => setCustomQtyValue(Math.max(1, Number(e.target.value)))}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL FOOTER                                              */}
        {/* ========================================================= */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          {/* Left: Changes Indicator */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#dc2626]">
            <AlertTriangle className="w-4 h-4 text-[#dc2626] fill-[#dc2626]/10 shrink-0" />
            <span>{changesCount} changes</span>
          </div>

          {/* Right: Cancel & Save Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-md hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={changesCount === 0}
              className={`px-5 py-2 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                changesCount > 0
                  ? 'bg-[#0066cc] hover:bg-[#0052a3] text-white shadow-xs cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
