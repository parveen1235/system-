import React, { useState } from 'react';
import { X, CreditCard, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, Search, Download } from 'lucide-react';
import { CustomerRecord } from '../types/erp';
import { getCustomerSummary } from '../utils/customerStorage';

interface PaymentLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerRecord[];
}

export const PaymentLedgerModal: React.FC<PaymentLedgerModalProps> = ({ isOpen, onClose, customers }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const getCustVal = (c: CustomerRecord) => getCustomerSummary(c).totalAmount;
  const totalTurnover = customers.reduce((acc, c) => acc + getCustVal(c), 0);
  const totalReceived = 0;
  const totalPending = totalTurnover - totalReceived;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">PAYMENT LEDGER (भुगतान खाता)</h2>
              <p className="text-xs text-slate-500 font-medium">Customer-wise receivable & collection tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5 shrink-0">
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100">
            <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wide">Pending Balance (बाकी पैसा) ⏳</p>
            <p className="text-2xl font-black text-rose-600 mt-1">₹{totalPending.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-rose-500 mt-0.5">Yet to be received from active client projects</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Advance Received (मिला पैसा) ✅</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalReceived.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">Total advances cleared in bank account</p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Total Order Book (कुल कारोबार) 💼</p>
            <p className="text-2xl font-black text-blue-600 mt-1">₹{totalTurnover.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-blue-500 mt-0.5">Sum of all approved & pending client orders</p>
          </div>
        </div>

        {/* Table of Customer Receivables */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase sticky top-0">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3 text-right">Order Value</th>
                <th className="py-3 px-3 text-right">Received</th>
                <th className="py-3 px-3 text-right">Pending Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(customers || []).map((c, index) => {
                const customerKey = c.id || `ledger-cust-${index}-${c.phone || c.name || 'item'}`;
                const val = getCustomerSummary(c).totalAmount;
                const rec = 0;
                const bal = val - rec;
                return (
                  <tr key={customerKey} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-3 text-slate-600">{c.phone}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">₹{val.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">₹{rec.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">₹{bal.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        ⏳ Payment Due
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 shrink-0">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
            <Download className="w-3.5 h-3.5" />
            <span>Export Statement (PDF / Excel)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
