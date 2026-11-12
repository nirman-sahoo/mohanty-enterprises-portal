import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  Search,
  Download,
  Printer,
  Trash2,
  Plus,
  Filter,
  ArrowUpRight,
} from 'lucide-react';
import { PaymentVoucher, PurchaseRecord } from '../../types';
import { formatINR } from '../../utils/formatters';
import { getPurchaseLiveStatus } from '../../utils/accountingEngine';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface PurchaseRegisterViewProps {
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  onNewPurchaseVoucher: () => void;
  onPayBill: (supplierName: string) => void;
  onDeletePurchase: (purchase: PurchaseRecord) => Promise<void>;
}

export const PurchaseRegisterView: React.FC<PurchaseRegisterViewProps> = ({
  purchases,
  paymentVouchers,
  onNewPurchaseVoucher,
  onPayBill,
  onDeletePurchase,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Paid' | 'Partial' | 'Pending'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseRecord | null>(null);

  const enrichedPurchases = useMemo(() => {
    return purchases.map((po) => ({
      po,
      live: getPurchaseLiveStatus(po, paymentVouchers),
    }));
  }, [purchases, paymentVouchers]);

  const filteredPurchases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return enrichedPurchases.filter(({ po, live }) => {
      if (statusFilter !== 'ALL' && live.status !== statusFilter) return false;
      if (startDate && po.date < startDate) return false;
      if (endDate && po.date > endDate) return false;
      if (!q) return true;
      return (
        po.purchaseNo.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q) ||
        (po.challanNo || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedPurchases, searchTerm, statusFilter, startDate, endDate]);

  const totals = useMemo(() => {
    return filteredPurchases.reduce(
      (acc, { po, live }) => ({
        gross: acc.gross + po.totalAmount,
        settled: acc.settled + live.totalSettled,
        payable: acc.payable + live.balanceDue,
      }),
      { gross: 0, settled: 0, payable: 0 }
    );
  }, [filteredPurchases]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Purchase Voucher No',
      'Supplier Name',
      'Challan / L.R. No',
      'Bill Amount',
      'Settled Amount',
      'Balance Payable',
      'Status',
    ];
    const rows = filteredPurchases.map(({ po, live }) => [
      po.date,
      `"${po.purchaseNo}"`,
      `"${po.supplierName}"`,
      `"${po.challanNo || ''}"`,
      po.totalAmount,
      live.totalSettled,
      live.balanceDue,
      `"${live.status}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Purchase_Register_${new Date().toISOString().split('T')[0]}.csv`;
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
            <ClipboardList className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Purchase Register (Inward Daybook)</h1>
            <p className="text-xs text-slate-500 font-medium">
              Complete vendor bills, settled amounts, and remaining supplier payables
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNewPurchaseVoucher}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>New Purchase Voucher</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
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

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Purchase Vouchers</p>
          <p className="text-base font-black font-mono tabular-nums text-slate-900 mt-1">{filteredPurchases.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Matching Bills</p>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-amber-400 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-amber-400">Total Purchases</p>
          <p className="text-base font-black font-mono tabular-nums text-white mt-1">{formatINR(totals.gross)}</p>
          <p className="text-[10px] text-slate-300 mt-0.5">Total Vendor Value</p>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-emerald-700">Total Paid</p>
          <p className="text-base font-black font-mono tabular-nums text-emerald-700 mt-1">{formatINR(totals.settled)}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Upfront + Vouchers</p>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-rose-700">Balance Payable</p>
          <p className="text-base font-black font-mono tabular-nums text-rose-700 mt-1">{formatINR(totals.payable)}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Outstanding Creditors</p>
        </div>
      </div>

      {/* Filters & Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search purchase no, supplier, challan..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
            </select>
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Supplier / Mill</th>
                <th className="py-3 px-4">Items Inward</th>
                <th className="py-3 px-4 text-right">Bill Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No matching purchase vouchers found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(({ po, live }) => {
                  const first = po.items?.[0];
                  const itemText = first
                    ? `${first.itemName} (${first.quantity} ${first.unit})${
                        po.items.length > 1 ? ` +${po.items.length - 1} more` : ''
                      }`
                    : po.category;
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{po.date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {po.purchaseNo}
                        {po.challanNo && (
                          <span className="block text-[10px] font-normal text-slate-400">Ch: {po.challanNo}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{po.supplierName}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium max-w-[190px] truncate">{itemText}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-slate-950">
                        {formatINR(po.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700">
                        {live.balanceDue > 0.5 ? formatINR(live.balanceDue) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[11px] font-semibold ${
                            live.status === 'Paid'
                              ? 'text-emerald-700'
                              : live.status === 'Partial'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {live.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          {live.balanceDue > 0.5 && (
                            <button
                              onClick={() => onPayBill(po.supplierName)}
                              title="Pay Supplier"
                              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          )}
                          <button
                            onClick={() => setPurchaseToDelete(po)}
                            title="Delete Purchase Voucher"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!purchaseToDelete}
        title="Delete Purchase Voucher?"
        message="Deleting this purchase voucher will reverse stocked-in quantities from Inventory and update Supplier Payables and Cash/Bank Book."
        itemDetails={
          purchaseToDelete
            ? [
                { label: 'Voucher No', value: purchaseToDelete.purchaseNo },
                { label: 'Supplier', value: purchaseToDelete.supplierName },
                { label: 'Gross Bill', value: formatINR(purchaseToDelete.totalAmount) },
              ]
            : undefined
        }
        onCancel={() => setPurchaseToDelete(null)}
        onConfirm={async () => {
          if (purchaseToDelete) {
            await onDeletePurchase(purchaseToDelete);
          }
        }}
      />
    </div>
  );
};
