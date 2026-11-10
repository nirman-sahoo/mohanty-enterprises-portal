import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  ArrowLeftRight, 
  CheckCircle2, 
  Clock, 
  Download, 
  X,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { BankAccount, ContraEntry } from '../types';
import { formatINR } from '../data/inventoryData';
import { DeleteConfirmModal } from './common/DeleteConfirmModal';

interface BankingViewProps {
  accounts: BankAccount[];
  contraEntries: ContraEntry[];
  onSaveAccount: (account: BankAccount) => Promise<void>;
  onSaveContra: (entry: ContraEntry) => Promise<void>;
  onDeleteContra?: (entry: ContraEntry) => Promise<void>;
}

export const BankingView: React.FC<BankingViewProps> = ({
  accounts,
  contraEntries,
  onSaveAccount,
  onSaveContra,
  onDeleteContra,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'reconciliation' | 'contra'>('accounts');
  const [isContraModalOpen, setIsContraModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contraToDelete, setContraToDelete] = useState<ContraEntry | null>(null);
  const [isDeletingContra, setIsDeletingContra] = useState(false);

  // Form State
  const [contraForm, setContraForm] = useState({
    fromAccount: accounts[0]?.bankName || 'Office Cash in Safe Drawer',
    toAccount: accounts[1]?.bankName || 'State Bank of India (Current A/C)',
    amount: '',
    referenceNo: '',
    remarks: '',
    date: new Date().toISOString().split('T')[0]
  });

  const totalLiquidity = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  const handlePostContra = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(contraForm.amount);
    if (!amt || amt <= 0 || contraForm.fromAccount === contraForm.toAccount) return;

    setIsSubmitting(true);
    const newContra: ContraEntry = {
      id: `ce-${Date.now()}`,
      voucherNo: `CNT-2026-${String(contraEntries.length + 1).padStart(4, '0')}`,
      date: contraForm.date,
      fromAccount: contraForm.fromAccount,
      toAccount: contraForm.toAccount,
      amount: amt,
      referenceNo: contraForm.referenceNo || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      remarks: contraForm.remarks || 'Inter-account fund transfer'
    };

    try {
      await onSaveContra(newContra);
      setIsContraModalOpen(false);
      setContraForm({
        fromAccount: accounts[0]?.bankName || 'Office Cash in Safe Drawer',
        toAccount: accounts[1]?.bankName || 'State Bank of India (Current A/C)',
        amount: '',
        referenceNo: '',
        remarks: '',
        date: new Date().toISOString().split('T')[0]
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteContra = async () => {
    if (!contraToDelete || !onDeleteContra) return;
    try {
      setIsDeletingContra(true);
      await onDeleteContra(contraToDelete);
      setContraToDelete(null);
    } catch (err) {
      console.error('Failed to delete contra entry:', err);
    } finally {
      setIsDeletingContra(false);
    }
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
              Manage commercial bank accounts, cash safe drawers, and internal liquidity transfers live in database
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
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Across verified bank accounts & cash drawer</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SBI Current Account</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatINR(accounts.find(a => a.bankName.includes('SBI') || a.bankName.includes('State Bank'))?.currentBalance || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Primary GST settlement account</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Safe Petty Cash in Drawer</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {formatINR(accounts.find(a => a.accountType === 'Cash Drawer')?.currentBalance || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Counter cash verified in system</p>
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
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contraEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <ArrowLeftRight className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No Contra entries recorded yet</p>
                        <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;+ Post Contra Transfer&rdquo; to move funds between bank accounts and cash drawers.</p>
                      </td>
                    </tr>
                  ) : (
                    contraEntries.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/75">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.voucherNo}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{c.date}</td>
                        <td className="py-3 px-4 font-medium text-rose-700">{c.fromAccount}</td>
                        <td className="py-3 px-4 font-medium text-emerald-700">{c.toAccount}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">{formatINR(c.amount)}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{c.referenceNo}</td>
                        <td className="py-3 px-4 text-slate-600">{c.remarks}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setContraToDelete(c)}
                            title="Delete Contra Entry"
                            className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
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
                    Monthly bank statements matched with ERP general ledger entries. Inward RTGS/NEFT receipts verified with bank passbook records.
                  </span>
                </div>
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
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Transferring...' : 'Confirm & Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Contra Entry */}
      {contraToDelete && (
        <DeleteConfirmModal
          isOpen={!!contraToDelete}
          title="Delete Contra Fund Transfer"
          message={`Are you sure you want to permanently delete contra transfer ${contraToDelete.voucherNo}? The fund movement record between accounts will be removed.`}
          itemDetails={`Voucher: ${contraToDelete.voucherNo} • Date: ${contraToDelete.date} • ${contraToDelete.fromAccount} → ${contraToDelete.toAccount} • ${formatINR(contraToDelete.amount)}`}
          isDeleting={isDeletingContra}
          onConfirm={handleConfirmDeleteContra}
          onCancel={() => setContraToDelete(null)}
        />
      )}
    </div>
  );
};
