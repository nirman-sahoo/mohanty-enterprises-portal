import React, { useMemo, useState } from 'react';
import {
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Printer,
  Search,
  Trash2,
  Landmark,
  Filter,
} from 'lucide-react';
import {
  BankAccount,
  ContraEntry,
  LedgerBookEntry,
  MoneyReceipt,
  PaymentVoucher,
  PurchaseRecord,
  SaleRecord,
} from '../../types';
import { formatINR } from '../../utils/formatters';
import {
  computeAccountBook,
  computeAllAccountBalances,
  isCashAccount,
} from '../../utils/accountingEngine';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface BankBookViewProps {
  accounts: BankAccount[];
  sales: SaleRecord[];
  moneyReceipts: MoneyReceipt[];
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  contraEntries: ContraEntry[];
  onOpenReceivePayment: (accountId?: string) => void;
  onOpenPaySupplier: (accountId?: string) => void;
  onDeleteBookEntry: (entry: LedgerBookEntry) => Promise<void>;
}

export const BankBookView: React.FC<BankBookViewProps> = ({
  accounts,
  sales,
  moneyReceipts,
  purchases,
  paymentVouchers,
  contraEntries,
  onOpenReceivePayment,
  onOpenPaySupplier,
  onDeleteBookEntry,
}) => {
  const bankOnlyAccounts = useMemo(() => accounts.filter((a) => !isCashAccount(a)), [accounts]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [entryToDelete, setEntryToDelete] = useState<LedgerBookEntry | null>(null);

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

  const bookData = useMemo(
    () =>
      computeAccountBook({
        bookType: 'bank',
        selectedAccountId,
        accounts,
        sales,
        moneyReceipts,
        purchases,
        paymentVouchers,
        contraEntries,
      }),
    [selectedAccountId, accounts, sales, moneyReceipts, purchases, paymentVouchers, contraEntries]
  );

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return bookData.entries.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      if (!q) return true;
      return (
        e.voucherNo.toLowerCase().includes(q) ||
        e.particulars.toLowerCase().includes(q) ||
        e.accountName.toLowerCase().includes(q) ||
        (e.referenceNo || '').toLowerCase().includes(q) ||
        e.voucherType.toLowerCase().includes(q)
      );
    });
  }, [bookData.entries, searchTerm, startDate, endDate]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Voucher No',
      'Voucher Type',
      'Bank Account',
      'Particulars',
      'Mode / Ref',
      'Debit / Receipt (INR)',
      'Credit / Payment (INR)',
      'Running Balance (INR)',
    ];
    const rows = filteredEntries.map((e) => [
      e.date,
      `"${e.voucherNo}"`,
      `"${e.voucherType}"`,
      `"${e.accountName}"`,
      `"${e.particulars.replace(/"/g, '""')}"`,
      `"${e.paymentMode}${e.referenceNo ? ` (${e.referenceNo})` : ''}"`,
      e.debit,
      e.credit,
      e.runningBalance,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bank_Book_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeBankObj = bankOnlyAccounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6 pb-10">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bank Book Ledger</h1>
            <p className="text-xs text-slate-500 font-medium">
              Double-entry bank register across all corporate accounts · Live running balances
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenReceivePayment(selectedAccountId !== 'ALL' ? selectedAccountId : undefined)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>+ Bank Receipt</span>
          </button>
          <button
            onClick={() => onOpenPaySupplier(selectedAccountId !== 'ALL' ? selectedAccountId : undefined)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+ Bank Payment</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Bank Account Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <button
          type="button"
          onClick={() => setSelectedAccountId('ALL')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedAccountId === 'ALL'
              ? 'bg-slate-900 text-white border-amber-400 shadow-md'
              : 'bg-white text-slate-900 border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedAccountId === 'ALL' ? 'text-amber-400' : 'text-slate-500'}`}>
              Consolidated Bank Book
            </span>
            <Landmark className={`w-4 h-4 ${selectedAccountId === 'ALL' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p className="text-lg font-black font-mono tabular-nums mt-2">
            {formatINR(
              bankOnlyAccounts.reduce((sum, acc) => sum + (accountBalances[acc.id] ?? acc.openingBalance ?? 0), 0)
            )}
          </p>
          <p className={`text-[11px] mt-1 ${selectedAccountId === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
            {bankOnlyAccounts.length} Active Bank Account{bankOnlyAccounts.length === 1 ? '' : 's'}
          </p>
        </button>

        {bankOnlyAccounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id;
          const liveBal = accountBalances[acc.id] ?? acc.openingBalance ?? 0;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => setSelectedAccountId(acc.id)}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-amber-400 shadow-md'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-amber-400' : 'text-slate-600'}`}>
                  {acc.bankName}
                </span>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {acc.accountType}
                </span>
              </div>
              <p className="text-lg font-black font-mono tabular-nums mt-2">{formatINR(liveBal)}</p>
              <p className={`text-[11px] font-mono mt-1 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                A/C {acc.accountNumber} · {acc.ifsc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Double-Entry Totals Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Opening Balance</p>
          <p className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1">
            {formatINR(bookData.openingBalance)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Configured in Settings</p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-emerald-700">Total Deposits (Dr)</p>
          <p className="text-lg font-black font-mono tabular-nums text-emerald-700 mt-1">
            {formatINR(bookData.totalDebits)}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Receipts &amp; Contra Inward</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-rose-700">Total Withdrawals (Cr)</p>
          <p className="text-lg font-black font-mono tabular-nums text-rose-700 mt-1">
            {formatINR(bookData.totalCredits)}
          </p>
          <p className="text-[10px] text-rose-600 mt-0.5">Supplier Payments &amp; Contra Out</p>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl border border-amber-400 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-amber-400">Closing Bank Balance</p>
          <p className="text-lg font-black font-mono tabular-nums text-white mt-1">
            {formatINR(bookData.closingBalance)}
          </p>
          <p className="text-[10px] text-slate-300 mt-0.5">
            {activeBankObj ? activeBankObj.bankName : 'All Bank Accounts Combined'}
          </p>
        </div>
      </div>

      {/* Filters + Ledger Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voucher no, party, UTR/cheque, narration..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
            />
            {(startDate || endDate || searchTerm) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSearchTerm('');
                }}
                className="px-2.5 py-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Bank Account</th>
                <th className="py-3 px-4">Particulars &amp; Ref</th>
                <th className="py-3 px-4 text-right text-emerald-700">Deposit (Dr)</th>
                <th className="py-3 px-4 text-right text-rose-700">Withdrawal (Cr)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
                <th className="py-3 px-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No bank transactions recorded yet. Record a Bank Receipt, Bank Payment, Sales/Purchase Voucher, or Contra Entry.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{entry.date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{entry.voucherNo}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold ${
                          entry.debit > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {entry.voucherType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium max-w-[170px] truncate">{entry.accountName}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{entry.particulars}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {entry.paymentMode}
                        {entry.referenceNo ? ` · Ref: ${entry.referenceNo}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 whitespace-nowrap">
                      {entry.debit > 0 ? formatINR(entry.debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700 whitespace-nowrap">
                      {entry.credit > 0 ? formatINR(entry.credit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-slate-950 whitespace-nowrap">
                      {formatINR(entry.runningBalance)}
                    </td>
                    <td className="py-3 px-4 text-center print:hidden">
                      {entry.canDeleteDirect ? (
                        <button
                          onClick={() => setEntryToDelete(entry)}
                          title="Delete voucher"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400" title="Linked to Sales/Purchase Voucher">
                          Linked
                        </span>
                      )}
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
        title="Delete Bank Book Voucher?"
        message="This will permanently delete this voucher from Firestore and automatically reverse its impact from Party Outstandings / Payables and Bank Book running balances."
        itemDetails={
          entryToDelete
            ? [
                { label: 'Voucher No', value: entryToDelete.voucherNo },
                { label: 'Type', value: entryToDelete.voucherType },
                { label: 'Amount', value: formatINR(entryToDelete.debit || entryToDelete.credit) },
              ]
            : undefined
        }
        onCancel={() => setEntryToDelete(null)}
        onConfirm={async () => {
          if (entryToDelete) {
            await onDeleteBookEntry(entryToDelete);
          }
        }}
      />
    </div>
  );
};
