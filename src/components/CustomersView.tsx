import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  UserPlus,
  Search,
  Phone,
  MapPin,
  ExternalLink,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Building,
  ChevronDown,
  Calculator,
} from 'lucide-react';
import { CustomerRecord } from '../types/erp';
import { getCustomerSummary, syncCustomerRecord } from '../utils/customerStorage';

interface CustomersViewProps {
  customers: CustomerRecord[];
  onBack: () => void;
  onAddCustomer: (customer: {
    name: string;
    phone: string;
    city: string;
    brand: string;
    companyName?: string;
  }) => void;
  onSelectCustomer: (customer: CustomerRecord) => void;
  onDeleteCustomer: (id: string) => void;
  onUpdateCustomerStatus: (id: string, status: 'pending' | 'approved' | 'rejected') => void;
  onEditCustomer?: (customer: CustomerRecord) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onBack,
  onAddCustomer,
  onSelectCustomer,
  onDeleteCustomer,
  onUpdateCustomerStatus,
  onEditCustomer,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [brand, setBrand] = useState('Duron');
  const [formError, setFormError] = useState('');

  // Filter & Search
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Status dropdown open ID
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);

  // Live refresh counter to automatically re-render when customer designs change
  const [, setRefreshTick] = useState(0);
  useEffect(() => {
    const handleDesignsChanged = () => {
      setRefreshTick((t) => t + 1);
    };
    window.addEventListener('upvc_customer_designs_changed', handleDesignsChanged);
    window.addEventListener('storage', handleDesignsChanged);
    return () => {
      window.removeEventListener('upvc_customer_designs_changed', handleDesignsChanged);
      window.removeEventListener('storage', handleDesignsChanged);
    };
  }, []);

  const handleOpenCustomer = (customer: CustomerRecord) => {
    const synced = syncCustomerRecord(customer);
    onSelectCustomer(synced);
  };

  // Handle Add Customer Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter customer name');
      return;
    }
    setFormError('');
    onAddCustomer({
      name: name.trim(),
      phone: phone.trim() || '9876543210',
      city: city.trim() || 'Delhi',
      brand,
    });
    setName('');
    setPhone('');
    setCity('');
  };

  // Filter counts
  const pendingCount = customers.filter((c) => (c.approvalStatus || 'pending') === 'pending').length;
  const approvedCount = customers.filter((c) => c.approvalStatus === 'approved').length;
  const rejectedCount = customers.filter((c) => c.approvalStatus === 'rejected').length;

  // Filtered List
  const filteredCustomers = customers.filter((c) => {
    const status = c.approvalStatus || 'pending';
    const matchesFilter = activeFilter === 'all' || status === activeFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Title Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-30 shadow-xs">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition flex items-center justify-center"
          title="Back to Dashboard (डैशबोर्ड पर जाएँ)"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Customers
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {customers.length} Registered Customers
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Form Card: NAYA CUSTOMER ADD KAREIN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>NAYA CUSTOMER ADD KAREIN</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Customer Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  CUSTOMER NAME <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  MOBILE NUMBER
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* City / Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  CITY / LOCATION
                </label>
                <input
                  type="text"
                  placeholder="Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Company / Brand */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  COMPANY / BRAND (सामग्री ब्रांड)
                </label>
                <div className="relative">
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 appearance-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="Duron">Duron</option>
                    <option value="Prominance">Prominance</option>
                    <option value="Deceuninck">Deceuninck</option>
                    <option value="Kommerling">Kommerling</option>
                    <option value="Alupure">Alupure</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-xs font-semibold text-rose-600 mt-2">{formError}</p>
            )}

              <div className="flex justify-end mt-4">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <span>+ Add & Open in CAD (कस्टमर जोड़ें व CAD खोलें)</span>
              </button>
            </div>
          </form>
        </div>

        {/* Filter Pills & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* All List */}
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-900 border border-slate-300 shadow-xs ring-2 ring-blue-500/10'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <span>All List</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {customers.length}
              </span>
            </button>

            {/* Pending */}
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                activeFilter === 'pending'
                  ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <span>Pending ⏳</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {pendingCount}
              </span>
            </button>

            {/* Approved */}
            <button
              onClick={() => setActiveFilter('approved')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                activeFilter === 'approved'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <span>Approved ✅</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {approvedCount}
              </span>
            </button>

            {/* Rejected */}
            <button
              onClick={() => setActiveFilter('rejected')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                activeFilter === 'rejected'
                  ? 'bg-rose-50 text-rose-900 border border-rose-300 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <span>Rejected ❌</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                {rejectedCount}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search customers by name, phone or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition"
            />
          </div>
        </div>

        {/* Customers Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">CUSTOMER</th>
                  <th className="py-3.5 px-4">CONTACT</th>
                  <th className="py-3.5 px-4">STATUS / DECISION</th>
                  <th className="py-3.5 px-4 text-center">DESIGNS</th>
                  <th className="py-3.5 px-4 text-right">PROJECT VALUE</th>
                  <th className="py-3.5 px-4 text-center">JOINED</th>
                  <th className="py-3.5 px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-medium">
                      No customers found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer, index) => {
                    const customerKey = customer.id || `customer-${index}-${customer.phone || customer.name || 'item'}`;
                    const status = customer.approvalStatus || 'pending';
                    const initial = (customer.name || 'C').charAt(0).toUpperCase();
                    const summary = getCustomerSummary(customer);

                    return (
                      <tr
                        key={customerKey}
                        onClick={() => handleOpenCustomer(customer)}
                        className="hover:bg-blue-50/50 transition group cursor-pointer"
                        title="Click to open this customer's window design in 2D CAD"
                      >
                        {/* Customer Column */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold text-base flex items-center justify-center shrink-0 shadow-xs group-hover:bg-blue-600 group-hover:text-white transition">
                              {initial}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                                {customer.name}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{customer.city}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{customer.phone}</span>
                          </div>
                        </td>

                        {/* Status / Decision Dropdown */}
                        <td className="py-4 px-4 relative" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <button
                              onClick={() =>
                                setOpenStatusDropdownId(
                                  openStatusDropdownId === customer.id ? null : customer.id
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                                status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <span>
                                {status === 'approved'
                                  ? '✅ Approved'
                                  : status === 'rejected'
                                  ? '❌ Rejected'
                                  : '⏳ Pending'}
                              </span>
                              <ChevronDown className="w-3 h-3 opacity-60" />
                            </button>

                            {/* Dropdown Menu */}
                            {openStatusDropdownId === customer.id && (
                              <div className="absolute left-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-xs font-semibold">
                                <button
                                  onClick={() => {
                                    onUpdateCustomerStatus(customer.id, 'pending');
                                    setOpenStatusDropdownId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-amber-50 text-amber-800 flex items-center gap-2"
                                >
                                  <span>⏳</span>
                                  <span>Pending</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onUpdateCustomerStatus(customer.id, 'approved');
                                    setOpenStatusDropdownId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-emerald-800 flex items-center gap-2"
                                >
                                  <span>✅</span>
                                  <span>Approved</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onUpdateCustomerStatus(customer.id, 'rejected');
                                    setOpenStatusDropdownId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-800 flex items-center gap-2"
                                >
                                  <span>❌</span>
                                  <span>Rejected</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Designs Count */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
                            {summary.designsCount} {summary.designsCount === 1 ? 'design' : 'designs'}
                          </span>
                        </td>

                        {/* Project Value */}
                        <td className="py-4 px-4 text-right">
                          <span className="font-bold text-slate-900 text-sm">
                            ₹{summary.totalAmount.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="py-4 px-4 text-center text-xs font-medium text-slate-500">
                          {customer.createdDate || '30 Aug 2026'}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {/* Open Pricing & Costing */}
                            <button
                              onClick={() => {
                                handleOpenCustomer(customer);
                                // Set active tab preference in localStorage if desired
                                localStorage.setItem(`upvc_last_active_tab_${customer.id}`, 'pricing');
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Open Customer Pricing & Step-by-Step BOM Costing (लागत एवं मूल्य सूची देखें)"
                            >
                              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Pricing (लागत)</span>
                            </button>

                            {/* Open Customer Designs Hub */}
                            <button
                              onClick={() => handleOpenCustomer(customer)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Open Customer Project & Saved Designs (प्रोजेक्ट और डिज़ाइन देखें)"
                            >
                              <span>Open Designs</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => onEditCustomer && onEditCustomer(customer)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Edit / Open Customer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => onDeleteCustomer(customer.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
