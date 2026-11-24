import React, { useState } from 'react';
import { X, Building2, Upload, FileText, CheckCircle2 } from 'lucide-react';

export interface CompanyProfile {
  companyName: string;
  tagline?: string;
  gstin: string;
  phone: string;
  phone2?: string;
  email: string;
  address: string;
  logoUrl?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  branchAddress?: string;
  accountHolder?: string;
  upiId?: string;
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'REMIX uPVC WINDOWS & DOORS',
  tagline: 'Fabrication, Thermal & Acoustic Glazing Solutions',
  gstin: '07AAAAA0000A1Z5',
  phone: '+91 98765 43210',
  email: 'info@remixupvc.com',
  address: 'Plot 42, Industrial Area, Phase II, New Delhi - 110020',
  bankName: 'HDFC BANK LTD',
  accountNo: '50200012345678',
  ifsc: 'HDFC0000123',
  branchAddress: 'Okhla Industrial Area Phase-II, New Delhi',
  accountHolder: 'Remix uPVC Windows & Doors Pvt. Ltd.',
  upiId: 'remixupvc@hdfcbank',
};

export function getCompanyGstProfile(): CompanyProfile {
  try {
    const saved = localStorage.getItem('upvc_company_gst_profile');
    if (saved) {
      return { ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return DEFAULT_COMPANY_PROFILE;
}

interface CompanyGstModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: CompanyProfile) => void;
}

export const CompanyGstModal: React.FC<CompanyGstModalProps> = ({ isOpen, onClose, onProfileUpdated }) => {
  const initial = getCompanyGstProfile();
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [tagline, setTagline] = useState(initial.tagline || 'Fabrication, Thermal & Acoustic Glazing Solutions');
  const [gstin, setGstin] = useState(initial.gstin);
  const [phone, setPhone] = useState(initial.phone);
  const [phone2, setPhone2] = useState(initial.phone2 || '');
  const [email, setEmail] = useState(initial.email);
  const [address, setAddress] = useState(initial.address);
  const [bankName, setBankName] = useState(initial.bankName || 'HDFC BANK LTD');
  const [accountNo, setAccountNo] = useState(initial.accountNo || '50200012345678');
  const [ifsc, setIfsc] = useState(initial.ifsc || 'HDFC0000123');
  const [upiId, setUpiId] = useState(initial.upiId || 'remixupvc@hdfcbank');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompanyProfile = {
      companyName,
      tagline,
      gstin,
      phone,
      phone2,
      email,
      address,
      bankName,
      accountNo,
      ifsc,
      upiId,
    };
    try {
      localStorage.setItem('upvc_company_gst_profile', JSON.stringify(updated));
    } catch (err) {}
    if (onProfileUpdated) {
      onProfileUpdated(updated);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Company Letterhead & Bank Profile</h2>
              <p className="text-xs text-slate-500 font-medium">Configure company info, GSTIN & UPI Bank details for Quotations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Company / Brand Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tagline / Business Category</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mobile (Primary)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Extra Mobile / WhatsApp (अतिरिक्त)</label>
              <input
                type="text"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Alternate phone / WhatsApp"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Factory / Office Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Bank & UPI Details (For QR Code)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Account Number</label>
                <input
                  type="text"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">UPI ID (e.g. name@bank)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Logo Upload Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Quotation Header Logo</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 bg-slate-50/50 cursor-pointer transition">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-slate-700">Click to upload company logo (PNG, JPG)</p>
              <p className="text-[10px] text-slate-400">Max size 2MB, transparent background recommended</p>
            </div>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Company Logo & GST details saved successfully!</span>
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Save Company Info
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
