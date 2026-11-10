import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  X,
  Trash2
} from 'lucide-react';
import { JournalEntry } from '../types';
import { formatINR } from '../data/inventoryData';
import { DeleteConfirmModal } from './common/DeleteConfirmModal';

interface JournalViewProps {
  entries: JournalEntry[];
  onSaveEntry: (entry: JournalEntry) => Promise<void>;
  onDeleteEntry?: (entry: JournalEntry) => Promise<void>;
}

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  onSaveEntry,
  onDeleteEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  // Form
  const [formData, setFormData] = useState({
    debitAccount: '',
    debitAmount: '',
    creditAccount: '',
    creditAmount: '',
    narration: '',
    date: new Date().toISOString().split('T')[0]
  });

  const filtered = entries.filter(j => 
    j.jvNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.narration.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.debitAccount.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.creditAccount.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddJV = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.debitAmount);
    if (!formData.debitAccount || !formData.creditAccount || !amt) return;

    setIsSubmitting(true);
    const newJV: JournalEntry = {
      id: `jv-${Date.now()}`,
      jvNo: `JV-2026-${String(entries.length + 1).padStart(4, '0')}`,
      date: formData.date,
      debitAccount: formData.debitAccount,
      debitAmount: amt,
      creditAccount: formData.creditAccount,
      creditAmount: amt,
      narration: formData.narration,
      authorizedBy: 'Ayushman Mohanty'
    };

    try {
      await onSaveEntry(newJV);
      setIsAddModalOpen(false);
      setFormData({
        debitAccount: '',
        debitAmount: '',
        creditAccount: '',
        creditAmount: '',
        narration: '',
        date: new Date().toISOString().split('T')[0]
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/60 shadow-2xs">
            <BookOpen className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Journal Vouchers (JV) Register
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Double-entry adjustments, transit spillage loss, depreciation, and month-end closing entries recorded live in database
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ Create Journal Voucher</span>
        </button>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search JV number, account, or narration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">JV Number</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Debit Account (Dr)</th>
                <th className="py-3.5 px-4">Credit Account (Cr)</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4">Narration</th>
                <th className="py-3.5 px-4 text-center">Authorized</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Journal Vouchers recorded yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;+ Create Journal Voucher&rdquo; to post non-cash double-entry bookkeeping transactions.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{j.jvNo}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">{j.date}</td>
                    <td className="py-3.5 px-4 font-bold text-blue-700">{j.debitAccount}</td>
                    <td className="py-3.5 px-4 font-bold text-purple-700">{j.creditAccount}</td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatINR(j.debitAmount)}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">{j.narration}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Approved
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {onDeleteEntry && (
                        <button
                          onClick={() => setEntryToDelete(j)}
                          className="px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer inline-flex items-center gap-1 border border-transparent hover:border-rose-200"
                          title="Delete Journal Voucher"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      <DeleteConfirmModal
        isOpen={!!entryToDelete}
        title="Delete Journal Voucher"
        message={`Are you sure you want to permanently delete journal voucher ${entryToDelete?.jvNo}?`}
        itemDetails={entryToDelete ? [
          { label: 'JV Number', value: entryToDelete.jvNo },
          { label: 'Debit Account', value: entryToDelete.debitAccount },
          { label: 'Credit Account', value: entryToDelete.creditAccount },
          { label: 'Amount', value: formatINR(entryToDelete.debitAmount) }
        ] : []}
        confirmButtonText="Delete Voucher"
        onConfirm={async () => {
          if (entryToDelete && onDeleteEntry) {
            await onDeleteEntry(entryToDelete);
          }
        }}
        onClose={() => setEntryToDelete(null)}
      />

      {/* Add JV Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-400">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-wide">Record Double-Entry Journal Voucher</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddJV} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Debit Account (Dr)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spillage Loss or Depreciation A/C"
                  value={formData.debitAccount}
                  onChange={(e) => setFormData({ ...formData, debitAccount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Credit Account (Cr)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse Inventory or Fixed Asset A/C"
                  value={formData.creditAccount}
                  onChange={(e) => setFormData({ ...formData, creditAccount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Voucher Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 10000"
                    value={formData.debitAmount}
                    onChange={(e) => setFormData({ ...formData, debitAmount: e.target.value, creditAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Voucher Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Narration / Justification</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the accounting reason for this non-cash entry..."
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Post Journal Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
