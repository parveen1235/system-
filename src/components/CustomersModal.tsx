import React, { useState } from 'react';
import { CustomerRecord } from '../types/erp';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building,
  FileText,
  X,
  Check,
  Award,
  ArrowUpRight,
} from 'lucide-react';

interface CustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerRecord[];
  onAddCustomer: (customer: Omit<CustomerRecord, 'id' | 'totalProjects' | 'totalSpent' | 'createdDate'>) => void;
  onSelectCustomerForProject?: (customer: CustomerRecord) => void;
  lang?: 'hi' | 'en';
}

export const CustomersModal: React.FC<CustomersModalProps> = ({
  isOpen,
  onClose,
  customers,
  onAddCustomer,
  onSelectCustomerForProject,
  lang = 'en',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    gstNumber: '',
    status: 'active' as 'active' | 'lead' | 'vip',
  });

  if (!isOpen) return null;

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    onAddCustomer(formData);
    setFormData({
      name: '',
      companyName: '',
      phone: '',
      email: '',
      city: '',
      address: '',
      gstNumber: '',
      status: 'active',
    });
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'hi' ? 'ग्राहक एवं क्लाइंट प्रबंधन (Customer CRM Hub)' : 'Customer & Client Management Hub'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'hi'
                  ? 'नए ग्राहक जोड़ें, संपर्क विवरण देखें व कोटेशन तैयार करें'
                  : 'Manage architecture firms, contractors, residential clients & GST details'}
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

        {/* Toolbar */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={lang === 'hi' ? 'ग्राहक का नाम, फ़ोन या शहर खोजें...' : 'Search by name, company, phone or city...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Cancel' : lang === 'hi' ? '+ नया ग्राहक जोड़ें' : '+ Add New Customer'}</span>
          </button>
        </div>

        {/* Form to add customer */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="p-5 bg-blue-50/40 border-b border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Contact Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Malhotra"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Company / Architecture Firm</label>
              <input
                type="text"
                placeholder="e.g. Malhotra Designs LLP"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone / Mobile *</label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="client@domain.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">City / Region</label>
              <input
                type="text"
                placeholder="e.g. Hyderabad, Bengaluru"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">GSTIN Number (Optional)</label>
              <input
                type="text"
                placeholder="27AAECD3341P1ZB"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Site / Office Address</label>
              <input
                type="text"
                placeholder="Plot No 42, Jubilee Hills Road No 36"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Customer</span>
              </button>
            </div>
          </form>
        )}

        {/* Customer Cards List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">No customers found</p>
            </div>
          ) : (
            filtered.map((customer, index) => (
              <div
                key={customer.id || `modal-cust-${index}-${customer.phone || customer.name || 'item'}`}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-200 rounded-xl transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{customer.name}</h3>
                    {customer.status === 'vip' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Award className="w-3 h-3" /> VIP
                      </span>
                    )}
                    {customer.companyName && (
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {customer.companyName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-blue-500" />
                      {customer.phone}
                    </span>
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {customer.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {customer.city}
                    </span>
                    {customer.gstNumber && (
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        GST: {customer.gstNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Total Spent</div>
                    <div className="text-xs font-bold text-slate-900">
                      ₹{customer.totalSpent.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">{customer.totalProjects} Projects</div>
                  </div>

                  {onSelectCustomerForProject && (
                    <button
                      onClick={() => {
                        onSelectCustomerForProject(customer);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition"
                    >
                      <span>Select</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Total Customers: <strong className="text-slate-800">{customers.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
