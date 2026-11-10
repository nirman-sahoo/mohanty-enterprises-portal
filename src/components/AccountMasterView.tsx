import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Search, 
  X,
  Trash2
} from 'lucide-react';
import { AccountHead } from '../types';
import { formatINR } from '../data/inventoryData';
import { DeleteConfirmModal } from './common/DeleteConfirmModal';

interface AccountMasterViewProps {
  accounts: AccountHead[];
  onSaveAccount: (acc: AccountHead) => Promise<void>;
  onDeleteAccount?: (acc: AccountHead) => Promise<void>;
}

export const AccountMasterView: React.FC<AccountMasterViewProps> = ({
  accounts,
  onSaveAccount,
  onDeleteAccount
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<AccountHead | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    group: 'Current Assets' as AccountHead['group'],
    balance: '',
    balanceType: 'Dr' as AccountHead['balanceType']
  });

  const filtered = accounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || acc.code.includes(searchTerm);
    const matchesGroup = selectedGroup === 'ALL' || acc.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSubmitting(true);
    const newAcc: AccountHead = {
      id: `acc-${Date.now()}`,
      code: formData.code || String(1000 + accounts.length + 1),
      name: formData.name,
      group: formData.group,
      balance: parseFloat(formData.balance) || 0,
      balanceType: formData.balanceType
    };

    try {
      await onSaveAccount(newAcc);
      setIsAddModalOpen(false);
      setFormData({
        code: '',
        name: '',
        group: 'Current Assets',
        balance: '',
        balanceType: 'Dr'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete || !onDeleteAccount) return;
    try {
      setIsDeletingAccount(true);
      await onDeleteAccount(accountToDelete);
      setAccountToDelete(null);
    } catch (err) {
      console.error('Failed to delete account head:', err);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-2xs">
            <LayoutDashboard className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Account Master & Chart of Accounts
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Enterprise general ledger heads, balance sheet asset/liability hierarchies, and profit & loss groups
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ Add Ledger Head</span>
        </button>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search account title or GL code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'Current Assets', 'Current Liabilities', 'Direct Incomes', 'Direct Expenses', 'Indirect Expenses'].map((grp) => (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGroup === grp
                    ? 'bg-[#F6B118] text-slate-950 font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">GL Code</th>
                <th className="py-3.5 px-4">Account Head Name</th>
                <th className="py-3.5 px-4">Account Group</th>
                <th className="py-3.5 px-4 text-right">Running Balance (₹)</th>
                <th className="py-3.5 px-4 text-center">Type</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <LayoutDashboard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No ledger heads matching filter</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;+ Add Ledger Head&rdquo; to create chart of accounts entries.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{acc.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{acc.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {acc.group}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                      {formatINR(acc.balance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        acc.balanceType === 'Dr' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {acc.balanceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setAccountToDelete(acc)}
                        title="Delete GL Account Head"
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
      </div>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-400">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-wide">Add General Ledger Head</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Account Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse Rent A/C or Fuel Advance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Account Group</label>
                <select
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                >
                  <option value="Current Assets">Current Assets</option>
                  <option value="Fixed Assets">Fixed Assets</option>
                  <option value="Current Liabilities">Current Liabilities</option>
                  <option value="Direct Incomes">Direct Incomes (Sales)</option>
                  <option value="Direct Expenses">Direct Expenses</option>
                  <option value="Indirect Expenses">Indirect Expenses</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Dr / Cr</label>
                  <select
                    value={formData.balanceType}
                    onChange={(e) => setFormData({ ...formData, balanceType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-bold"
                  >
                    <option value="Dr">Debit (Dr)</option>
                    <option value="Cr">Credit (Cr)</option>
                  </select>
                </div>
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
                  {isSubmitting ? 'Saving...' : 'Save Account Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Account Head */}
      {accountToDelete && (
        <DeleteConfirmModal
          isOpen={!!accountToDelete}
          title="Delete Account Head"
          message={`Are you sure you want to permanently delete GL Account "${accountToDelete.name}" (${accountToDelete.code})? Any general ledger postings associated with this head will lose their master link.`}
          itemDetails={`GL Code: ${accountToDelete.code} • ${accountToDelete.name} • Group: ${accountToDelete.group} • Balance: ${formatINR(accountToDelete.balance)} ${accountToDelete.balanceType}`}
          isDeleting={isDeletingAccount}
          onConfirm={handleConfirmDeleteAccount}
          onCancel={() => setAccountToDelete(null)}
        />
      )}
    </div>
  );
};
