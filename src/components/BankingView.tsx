import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  ArrowLeftRight, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Download, 
  RefreshCw,
  Search,
  X,
  IndianRupee,
  ShieldCheck
} from 'lucide-react';
import { BankAccount, ContraEntry } from '../types';
import { formatINR } from '../data/inventoryData';

const INITIAL_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-1',
    bankName: 'State Bank of India (SBI)',
    accountNumber: '394821004921',
    branch: 'Choudwar Industrial Branch, Cuttack',
    ifsc: 'SBIN0001234',
    accountType: 'Current',
    currentBalance: 1850000,
    unclearedChequesCount: 1,
    status: 'Reconciled'
  },
  {
    id: 'bank-2',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200084719201',
    branch: 'Bajrakabati Road Corporate, Cuttack',
    ifsc: 'HDFC0000412',
    accountType: 'Current',
    currentBalance: 640000,
    unclearedChequesCount: 0,
    status: 'Reconciled'
  },
  {
    id: 'bank-3',
    bankName: 'Office Cash in Safe Drawer',
    accountNumber: 'DRAWER-01',
    branch: 'Headquarters Dispatch Office',
    ifsc: 'N/A',
    accountType: 'Cash Drawer',
    currentBalance: 34500,
    unclearedChequesCount: 0,
    status: 'Active'
  }
];

const INITIAL_CONTRA: ContraEntry[] = [
  {
    id: 'ce-1',
    voucherNo: 'CNT-2026-0018',
    date: '2026-11-06',
    fromAccount: 'Office Cash in Safe Drawer',
    toAccount: 'State Bank of India (SBI)',
    amount: 50000,
    referenceNo: 'CHQ-881290',
    remarks: 'Daily wholesale counter cash deposited into SBI Current Account'
  },
  {
    id: 'ce-2',
    voucherNo: 'CNT-2026-0017',
    date: '2026-11-04',
    fromAccount: 'State Bank of India (SBI)',
    toAccount: 'Office Cash in Safe Drawer',
    amount: 25000,
    referenceNo: 'ATM-WD-551',
    remarks: 'Cash self-withdrawal for yard labour weekly wages advance'
  },
  {
    id: 'ce-3',
    voucherNo: 'CNT-2026-0016',
    date: '2026-11-02',
    fromAccount: 'State Bank of India (SBI)',
    toAccount: 'HDFC Bank Ltd',
    amount: 200000,
    referenceNo: 'RTGS-SBI-99120',
    remarks: 'Inter-account liquidity fund transfer for vendor credit settlement'
  }
];

export const BankingView: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS);
  const [contraEntries, setContraEntries] = useState<ContraEntry[]>(INITIAL_CONTRA);
  const [activeTab, setActiveTab] = useState<'accounts' | 'reconciliation' | 'contra'>('accounts');
  const [isContraModalOpen, setIsContraModalOpen] = useState(false);

  // Form State
  const [contraForm, setContraForm] = useState({
    fromAccount: 'Office Cash in Safe Drawer',
    toAccount: 'State Bank of India (SBI)',
    amount: '',
    referenceNo: '',
    remarks: '',
    date: new Date().toISOString().split('T')[0]
  });

  const totalLiquidity = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  const handlePostContra = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(contraForm.amount);
    if (!amt || amt <= 0 || contraForm.fromAccount === contraForm.toAccount) return;

    // Adjust account balances
    setAccounts(prev => prev.map(acc => {
      if (acc.bankName === contraForm.fromAccount) {
        return { ...acc, currentBalance: acc.currentBalance - amt };
      }
      if (acc.bankName === contraForm.toAccount) {
        return { ...acc, currentBalance: acc.currentBalance + amt };
      }
      return acc;
    }));

    const newContra: ContraEntry = {
      id: `ce-${Date.now()}`,
      voucherNo: `CNT-2026-${String(contraEntries.length + 19).padStart(4, '0')}`,
      date: contraForm.date,
      fromAccount: contraForm.fromAccount,
      toAccount: contraForm.toAccount,
      amount: amt,
      referenceNo: contraForm.referenceNo || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      remarks: contraForm.remarks || 'Inter-account fund transfer'
    };

    setContraEntries([newContra, ...contraEntries]);
    setIsContraModalOpen(false);
    setContraForm({
      fromAccount: 'Office Cash in Safe Drawer',
      toAccount: 'State Bank of India (SBI)',
      amount: '',
      referenceNo: '',
      remarks: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs">
            <Building2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Banking, Reconciliation & Contra Entries
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage commercial bank accounts, cash safe drawers, and internal liquidity transfers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsContraModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Post Contra Transfer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Commercial Liquidity</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalLiquidity)}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Across 2 bank accounts & 1 cash drawer</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SBI Current Account</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatINR(accounts.find(a => a.bankName.includes('SBI'))?.currentBalance || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Primary GST settlement account</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Safe Petty Cash in Drawer</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {formatINR(accounts.find(a => a.accountType === 'Cash Drawer')?.currentBalance || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Counter cash verified today</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-6 pt-4 border-b border-slate-200 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'accounts'
                ? 'border-b-2 border-[#F6B118] text-slate-900 font-extrabold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Bank & Cash Accounts
          </button>
          <button
            onClick={() => setActiveTab('contra')}
            className={`pb-3 text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'contra'
                ? 'border-b-2 border-[#F6B118] text-slate-900 font-extrabold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Contra Entry Register (Cash &lt;&gt; Bank)
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`pb-3 text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'reconciliation'
                ? 'border-b-2 border-[#F6B118] text-slate-900 font-extrabold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Bank Reconciliation Checklist
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'accounts' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {accounts.map((acc) => (
                <div key={acc.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-800">
                      {acc.accountType}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{acc.status}</span>
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{acc.bankName}</h3>
                  <p className="font-mono text-xs text-slate-500 mt-0.5">A/C: {acc.accountNumber}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Branch: {acc.branch}</p>
                  <p className="text-[11px] font-mono text-slate-400">IFSC: {acc.ifsc}</p>
                  
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Verified Balance</span>
                    <span className="text-base font-black text-slate-900">{formatINR(acc.currentBalance)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'contra' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Voucher No</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Source (From)</th>
                    <th className="py-3.5 px-4">Destination (To)</th>
                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-4">Cheque / Ref No</th>
                    <th className="py-3.5 px-4">Narration / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contraEntries.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/75">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.voucherNo}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{c.date}</td>
                      <td className="py-3 px-4 font-medium text-rose-700">{c.fromAccount}</td>
                      <td className="py-3 px-4 font-medium text-emerald-700">{c.toAccount}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatINR(c.amount)}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.referenceNo}</td>
                      <td className="py-3 px-4 text-slate-600">{c.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reconciliation' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <span>
                    Monthly bank statements matched with ERP general ledger entries. All inward RTGS/NEFT receipts verified with bank passbook records.
                  </span>
                </div>
                <button 
                  onClick={() => alert('Bank ledger records matched with CBS feed. 0 variances found.')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  Verify CBS Feed
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                      <th className="py-3 px-4">Bank Account</th>
                      <th className="py-3 px-4">ERP Book Balance</th>
                      <th className="py-3 px-4">Statement Balance</th>
                      <th className="py-3 px-4">Uncleared Cheques</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.filter(a => a.accountType !== 'Cash Drawer').map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{acc.bankName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{formatINR(acc.currentBalance)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{formatINR(acc.currentBalance)}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{acc.unclearedChequesCount} Cheque pending</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Reconciled
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contra Entry Modal */}
      {isContraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-400">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-wide">Post Contra Fund Transfer Voucher</h3>
              </div>
              <button 
                onClick={() => setIsContraModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostContra} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Source Account (Debit/From)</label>
                  <select
                    value={contraForm.fromAccount}
                    onChange={(e) => setContraForm({ ...contraForm, fromAccount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.bankName}>
                        {a.bankName} ({formatINR(a.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Destination (Credit/To)</label>
                  <select
                    value={contraForm.toAccount}
                    onChange={(e) => setContraForm({ ...contraForm, toAccount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.bankName}>
                        {a.bankName} ({formatINR(a.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Transfer Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 50000"
                    value={contraForm.amount}
                    onChange={(e) => setContraForm({ ...contraForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={contraForm.date}
                    onChange={(e) => setContraForm({ ...contraForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cheque / UTR / Reference No</label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-991201 or Self Cash Withdrawal"
                  value={contraForm.referenceNo}
                  onChange={(e) => setContraForm({ ...contraForm, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Narration / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Counter cash deposit to SBI"
                  value={contraForm.remarks}
                  onChange={(e) => setContraForm({ ...contraForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsContraModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Confirm & Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
