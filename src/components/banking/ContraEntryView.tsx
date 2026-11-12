import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Search,
  Landmark,
  Wallet,
} from 'lucide-react';
import {
  BankAccount,
  CompanySettings,
  ContraEntry,
  MoneyReceipt,
  PaymentVoucher,
  PurchaseRecord,
  SaleRecord,
} from '../../types';
import { formatINR } from '../../utils/formatters';
import { computeAllAccountBalances, getNextVoucherSequence, isCashAccount } from '../../utils/accountingEngine';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { DEFAULT_COMPANY_SETTINGS } from '../../services/firebaseService';

interface ContraEntryViewProps {
  accounts: BankAccount[];
  sales: SaleRecord[];
  moneyReceipts: MoneyReceipt[];
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  contraEntries: ContraEntry[];
  settings?: CompanySettings;
  onSaveContra: (entry: ContraEntry) => Promise<void>;
  onDeleteContra: (entry: ContraEntry) => Promise<void>;
}

export const ContraEntryView: React.FC<ContraEntryViewProps> = ({
  accounts,
  sales,
  moneyReceipts,
  purchases,
  paymentVouchers,
  contraEntries,
  settings = DEFAULT_COMPANY_SETTINGS,
  onSaveContra,
  onDeleteContra,
}) => {
  const cashAcc = accounts.find((a) => isCashAccount(a));
  const bankOnlyAccounts = accounts.filter((a) => !isCashAccount(a));

  const accountBalances = useMemo(
    () =>
      computeAllAccountBalances({
        accounts,
        sales,
        moneyReceipts,
        purchases,
        paymentVouchers,
        contraEntries,
      }),
    [accounts, sales, moneyReceipts, purchases, paymentVouchers, contraEntries]
  );

  const nextContraNo = useMemo(() => {
    const num = getNextVoucherSequence(contraEntries.map((c) => c.voucherNo));
    return `${settings.contraPrefix || 'CNT/'}${String(num).padStart(4, '0')}`;
  }, [contraEntries, settings.contraPrefix]);

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fromAccountId, setFromAccountId] = useState<string>(cashAcc?.id || accounts[0]?.id || 'bank-drawer');
  const [toAccountId, setToAccountId] = useState<string>(bankOnlyAccounts[0]?.id || accounts[1]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [entryToDelete, setEntryToDelete] = useState<ContraEntry | null>(null);

  const applyPreset = (type: 'deposit' | 'withdrawal' | 'bank-to-bank') => {
    setErrorMsg(null);
    if (type === 'deposit') {
      if (cashAcc) setFromAccountId(cashAcc.id);
      if (bankOnlyAccounts[0]) setToAccountId(bankOnlyAccounts[0].id);
      setRemarks('Cash deposited into bank account');
    } else if (type === 'withdrawal') {
      if (bankOnlyAccounts[0]) setFromAccountId(bankOnlyAccounts[0].id);
      if (cashAcc) setToAccountId(cashAcc.id);
      setRemarks('Cash withdrawn from bank for safe drawer');
    } else {
      if (bankOnlyAccounts[0]) setFromAccountId(bankOnlyAccounts[0].id);
      if (bankOnlyAccounts[1]) setToAccountId(bankOnlyAccounts[1].id);
      setRemarks('Internal bank-to-bank fund transfer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const numAmount = parseFloat(amount);
    if (!fromAccountId || !toAccountId) {
      setErrorMsg('Please select both Source (Credit) and Destination (Debit) accounts.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setErrorMsg('Source and Destination accounts cannot be the same.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Please enter a valid transfer amount greater than zero.');
      return;
    }

    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);

    setIsSubmitting(true);
    try {
      const entry: ContraEntry = {
        id: `cnt-${Date.now()}`,
        voucherNo: nextContraNo,
        date,
        fromAccountId,
        fromAccount: fromAcc?.bankName || fromAccountId,
        toAccountId,
        toAccount: toAcc?.bankName || toAccountId,
        amount: numAmount,
        referenceNo: referenceNo.trim(),
        remarks: remarks.trim() || 'Contra fund transfer',
      };

      await onSaveContra(entry);
      setAmount('');
      setReferenceNo('');
      setRemarks('');
      setSuccessMsg(`Contra Voucher ${entry.voucherNo} posted — both Cash & Bank Books updated.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to post Contra Entry:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to post Contra Entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return contraEntries.filter((ce) => {
      if (!q) return true;
      return (
        ce.voucherNo.toLowerCase().includes(q) ||
        ce.fromAccount.toLowerCase().includes(q) ||
        ce.toAccount.toLowerCase().includes(q) ||
        (ce.referenceNo || '').toLowerCase().includes(q) ||
        (ce.remarks || '').toLowerCase().includes(q)
      );
    });
  }, [contraEntries, searchTerm]);

  const totalContraValue = contraEntries.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contra Entry Transfers</h1>
            <p className="text-xs text-slate-500 font-medium">
              Cash Deposit to Bank, Cash Withdrawal from Bank, or Bank-to-Bank Internal Fund Transfers
            </p>
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs flex items-center gap-3">
          <span className="text-slate-400 font-medium">Total Contra Volume:</span>
          <span className="font-mono font-extrabold text-amber-400 tabular-nums">
            {formatINR(totalContraValue)}
          </span>
        </div>
      </div>

      {/* Live Cash & Bank Account Balances Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const cash = isCashAccount(acc);
          const bal = accountBalances[acc.id] ?? acc.openingBalance ?? 0;
          return (
            <div
              key={acc.id}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {cash ? (
                    <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  ) : (
                    <Landmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  )}
                  <p className="text-xs font-bold text-slate-900 truncate">{acc.bankName}</p>
                </div>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                  {cash ? 'Safe Drawer Account' : `A/C ${acc.accountNumber}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black font-mono tabular-nums text-slate-950">{formatINR(bal)}</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Live Balance</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contra Posting Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Post New Contra Voucher ({nextContraNo})</h2>
            <p className="text-[11px] text-slate-500">
              Credits Source Account &amp; Debits Destination Account automatically
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('deposit')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              Cash Deposit to Bank
            </button>
            <button
              type="button"
              onClick={() => applyPreset('withdrawal')}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              Cash Withdrawal from Bank
            </button>
            <button
              type="button"
              onClick={() => applyPreset('bank-to-bank')}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              Bank-to-Bank Transfer
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">From Account (Credit / Outward) *</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-amber-400"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} ({formatINR(accountBalances[acc.id] ?? 0)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">To Account (Debit / Inward) *</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-amber-400"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} ({formatINR(accountBalances[acc.id] ?? 0)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Transfer Amount (₹) *</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Contra Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Cheque / Slip / UTR Ref No</label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Slip / cheque / UTR reference"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Narration / Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Purpose of contra transfer"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting Contra...' : 'Post Contra Voucher'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Contra Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">Contra Voucher Register ({filteredEntries.length})</h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contra voucher, account, ref..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">From Account (Cr)</th>
                <th className="py-3 px-4">To Account (Dr)</th>
                <th className="py-3 px-4">Ref / Remarks</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No contra entries posted yet. Use the form above to transfer funds between Cash and Bank accounts.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{entry.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{entry.voucherNo}</td>
                    <td className="py-3 px-4 font-semibold text-rose-700">{entry.fromAccount}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">{entry.toAccount}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {entry.remarks || '-'}
                      {entry.referenceNo && (
                        <span className="block text-[10px] font-mono text-slate-400">Ref: {entry.referenceNo}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-slate-950 whitespace-nowrap">
                      {formatINR(entry.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setEntryToDelete(entry)}
                        title="Delete contra entry"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!entryToDelete}
        title="Delete Contra Voucher?"
        message="Deleting this contra entry will immediately reverse both the Credit on the source account and the Debit on the destination account across Cash Book & Bank Book."
        itemDetails={
          entryToDelete
            ? [
                { label: 'Voucher No', value: entryToDelete.voucherNo },
                { label: 'Transfer', value: `${entryToDelete.fromAccount} → ${entryToDelete.toAccount}` },
                { label: 'Amount', value: formatINR(entryToDelete.amount) },
              ]
            : undefined
        }
        onCancel={() => setEntryToDelete(null)}
        onConfirm={async () => {
          if (entryToDelete) {
            await onDeleteContra(entryToDelete);
          }
        }}
      />
    </div>
  );
};
