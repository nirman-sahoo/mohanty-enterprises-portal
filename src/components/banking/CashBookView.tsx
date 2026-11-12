import React, { useMemo, useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Printer,
  Search,
  Trash2,
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
import { computeAccountBook, isCashAccount } from '../../utils/accountingEngine';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface CashBookViewProps {
  accounts: BankAccount[];
  sales: SaleRecord[];
  moneyReceipts: MoneyReceipt[];
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  contraEntries: ContraEntry[];
  onOpenReceivePayment: () => void;
  onOpenPaySupplier: () => void;
  onDeleteBookEntry: (entry: LedgerBookEntry) => Promise<void>;
}

export const CashBookView: React.FC<CashBookViewProps> = ({
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
  const cashAccount = useMemo(() => accounts.find((a) => isCashAccount(a)), [accounts]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [entryToDelete, setEntryToDelete] = useState<LedgerBookEntry | null>(null);

  const bookData = useMemo(
    () =>
      computeAccountBook({
        bookType: 'cash',
        accounts,
        sales,
        moneyReceipts,
        purchases,
        paymentVouchers,
        contraEntries,
      }),
    [accounts, sales, moneyReceipts, purchases, paymentVouchers, contraEntries]
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
      'Particulars',
      'Reference',
      'Cash Receipt (Dr)',
      'Cash Payment (Cr)',
      'Running Cash Balance',
    ];
    const rows = filteredEntries.map((e) => [
      e.date,
      `"${e.voucherNo}"`,
      `"${e.voucherType}"`,
      `"${e.particulars.replace(/"/g, '""')}"`,
      `"${e.referenceNo || ''}"`,
      e.debit,
      e.credit,
      e.runningBalance,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cash_Book_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cash Book (Safe Drawer)</h1>
            <p className="text-xs text-slate-500 font-medium">
              {cashAccount?.bankName || 'Office Cash in Safe Drawer'} · Cash Sales, Receipts, Payments &amp; Contra Transfers
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenReceivePayment}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>+ Cash Receipt</span>
          </button>
          <button
            onClick={onOpenPaySupplier}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+ Cash Payment</span>
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

      {/* Double-Entry Totals Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Opening Cash Balance</p>
          <p className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1">
            {formatINR(bookData.openingBalance)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Editable in Settings</p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-emerald-700">Cash Receipts (Dr)</p>
          <p className="text-lg font-black font-mono tabular-nums text-emerald-700 mt-1">
            {formatINR(bookData.totalDebits)}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Cash Sales + Party Receipts + Withdrawals</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-rose-700">Cash Payments (Cr)</p>
          <p className="text-lg font-black font-mono tabular-nums text-rose-700 mt-1">
            {formatINR(bookData.totalCredits)}
          </p>
          <p className="text-[10px] text-rose-600 mt-0.5">Cash Purchases + Supplier Pay + Deposits</p>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl border border-amber-400 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-amber-400">Cash-in-Hand (Closing)</p>
          <p className="text-lg font-black font-mono tabular-nums text-white mt-1">
            {formatINR(bookData.closingBalance)}
          </p>
          <p className="text-[10px] text-slate-300 mt-0.5">Physical Safe Drawer Balance</p>
        </div>
      </div>

      {/* Filters + Cash Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cash voucher, party name, narration..."
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
                <th className="py-3 px-4">Particulars &amp; Narration</th>
                <th className="py-3 px-4 text-right text-emerald-700">Cash In (Dr)</th>
                <th className="py-3 px-4 text-right text-rose-700">Cash Out (Cr)</th>
                <th className="py-3 px-4 text-right">Cash Balance</th>
                <th className="py-3 px-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No cash transactions recorded yet. Use Sales/Purchase Vouchers in Cash mode, Contra Entry, or Cash Receipt/Payment.
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
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{entry.particulars}</p>
                      {entry.referenceNo && (
                        <p className="text-[10px] text-slate-500 font-mono">Ref: {entry.referenceNo}</p>
                      )}
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
        title="Delete Cash Book Voucher?"
        message="This will permanently delete this cash voucher from Firestore and reverse its balance impact on Party Outstandings / Payables and Cash-in-Hand."
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
