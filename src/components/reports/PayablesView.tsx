import React, { useMemo, useState } from 'react';
import {
  Landmark,
  Search,
  Download,
  Printer,
  ArrowUpRight,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import { PaymentVoucher, PurchaseRecord, SupplierPayableSummary } from '../../types';
import { formatINR } from '../../utils/formatters';
import { computeSupplierPayables, getPurchaseLiveStatus } from '../../utils/accountingEngine';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface PayablesViewProps {
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  onOpenPaySupplier: (supplier: SupplierPayableSummary | null) => void;
  onDeletePaymentVoucher: (voucher: PaymentVoucher) => Promise<void>;
}

export const PayablesView: React.FC<PayablesViewProps> = ({
  purchases,
  paymentVouchers,
  onOpenPaySupplier,
  onDeletePaymentVoucher,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'CLEARED'>('ALL');
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<SupplierPayableSummary | null>(null);
  const [voucherToDelete, setVoucherToDelete] = useState<PaymentVoucher | null>(null);

  const payables = useMemo(
    () => computeSupplierPayables(purchases, paymentVouchers),
    [purchases, paymentVouchers]
  );

  const filteredPayables = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return payables.filter((p) => {
      if (statusFilter === 'DUE' && p.outstandingPayable <= 0.5) return false;
      if (statusFilter === 'CLEARED' && p.outstandingPayable > 0.5) return false;
      if (!q) return true;
      return (
        p.supplierName.toLowerCase().includes(q) ||
        (p.supplierPhone || '').includes(q)
      );
    });
  }, [payables, searchTerm, statusFilter]);

  const kpis = useMemo(() => {
    const totalPurchased = payables.reduce((s, p) => s + p.totalPurchased, 0);
    const totalPaid = payables.reduce((s, p) => s + p.totalPaid, 0);
    const netPayable = payables.reduce((s, p) => s + p.outstandingPayable, 0);
    const pendingVendors = payables.filter((p) => p.outstandingPayable > 0.5).length;
    return { totalPurchased, totalPaid, netPayable, pendingVendors };
  }, [payables]);

  const handleExportCSV = () => {
    const headers = [
      'Supplier Name',
      'Bills Count',
      'Unpaid Bills',
      'Total Purchased (INR)',
      'Total Paid (INR)',
      'Net Payable (INR)',
      'Last Purchase Date',
      'Last Payment Date',
    ];
    const rows = filteredPayables.map((p) => [
      `"${p.supplierName}"`,
      p.billCount,
      p.unpaidBillCount,
      p.totalPurchased,
      p.totalPaid,
      p.outstandingPayable,
      p.lastPurchaseDate || '',
      p.lastPaymentDate || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Supplier_Payables_${new Date().toISOString().split('T')[0]}.csv`;
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
            <Landmark className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Supplier Payables (Sundry Creditors)</h1>
            <p className="text-xs text-slate-500 font-medium">
              Manufacturer &amp; mill outstandings, bill-wise balances &amp; Supplier Payment Vouchers synced with Cash/Bank Book
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenPaySupplier(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>Pay Supplier</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Total Purchases</p>
          <p className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1">
            {formatINR(kpis.totalPurchased)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{payables.length} Suppliers</p>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-emerald-700">Total Paid to Vendors</p>
          <p className="text-lg font-black font-mono tabular-nums text-emerald-700 mt-1">{formatINR(kpis.totalPaid)}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Upfront + Payment Vouchers</p>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-rose-700">Net Payables Due</p>
          <p className="text-lg font-black font-mono tabular-nums text-rose-700 mt-1">{formatINR(kpis.netPayable)}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">{kpis.pendingVendors} Vendors Awaiting Payment</p>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-amber-400 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-amber-400">Payment Vouchers Issued</p>
          <p className="text-lg font-black font-mono tabular-nums text-white mt-1">{paymentVouchers.length}</p>
          <p className="text-[10px] text-slate-300 mt-0.5">Recorded Outflows</p>
        </div>
      </div>

      {/* Creditors Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search supplier name or phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs"
          >
            <option value="ALL">All Suppliers</option>
            <option value="DUE">Pending Payables Only</option>
            <option value="CLEARED">Fully Paid Suppliers</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Supplier / Mill</th>
                <th className="py-3 px-4 text-center">Bills</th>
                <th className="py-3 px-4 text-right">Total Purchased</th>
                <th className="py-3 px-4 text-right text-emerald-700">Total Paid</th>
                <th className="py-3 px-4 text-right text-rose-700">Net Payable</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayables.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No supplier payables found. Record a Purchase Voucher to track vendor balances.
                  </td>
                </tr>
              ) : (
                filteredPayables.map((sup) => (
                  <tr key={sup.supplierName} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{sup.supplierName}</p>
                      {sup.supplierPhone && (
                        <p className="text-[10px] font-mono text-slate-500">{sup.supplierPhone}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="font-bold text-slate-900">{sup.billCount}</span>
                      {sup.unpaidBillCount > 0 && (
                        <span className="ml-1.5 text-[11px] font-medium text-rose-600">
                          ({sup.unpaidBillCount} open)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatINR(sup.totalPurchased)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {formatINR(sup.totalPaid)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-rose-700">
                      {sup.outstandingPayable > 0.5 ? (
                        formatINR(sup.outstandingPayable)
                      ) : (
                        <span className="text-emerald-600 font-bold">Cleared</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {sup.lastPaymentDate
                        ? `Paid: ${sup.lastPaymentDate}`
                        : sup.lastPurchaseDate
                        ? `Bill: ${sup.lastPurchaseDate}`
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenPaySupplier(sup)}
                          className="px-2.5 py-1 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Pay</span>
                        </button>
                        <button
                          onClick={() => setSelectedSupplierDetail(sup)}
                          title="Inspect Bills & Payments"
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Vouchers History */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">
            Supplier Payment Vouchers History ({paymentVouchers.length})
          </h3>
          <p className="text-[11px] text-slate-500">
            Outflows posted against Supplier Accounts (reflected in Cash Book / Bank Book)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Voucher No</th>
                <th className="py-2.5 px-4">Supplier Name</th>
                <th className="py-2.5 px-4">Linked Bill</th>
                <th className="py-2.5 px-4">Paid From Account</th>
                <th className="py-2.5 px-4">Mode / Ref</th>
                <th className="py-2.5 px-4 text-right text-rose-700">Amount Paid</th>
                <th className="py-2.5 px-4 text-center print:hidden">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No supplier payment vouchers posted yet. Click &quot;Pay Supplier&quot; to settle pending bills.
                  </td>
                </tr>
              ) : (
                paymentVouchers.map((pv) => (
                  <tr key={pv.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-slate-600">{pv.date}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{pv.voucherNo}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{pv.supplierName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{pv.purchaseNo || 'On-Account'}</td>
                    <td className="py-2.5 px-4 text-slate-700">{pv.bankAccountName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {pv.paymentMode}
                      {pv.referenceNo ? ` · ${pv.referenceNo}` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-rose-700">
                      {formatINR(pv.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-center print:hidden">
                      <button
                        onClick={() => setVoucherToDelete(pv)}
                        title="Delete Payment Voucher"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
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

      {/* Supplier Bills & Payments Inspector Modal */}
      {selectedSupplierDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-400">
              <div>
                <h3 className="font-bold text-sm">{selectedSupplierDetail.supplierName} · Vendor Ledger</h3>
                {selectedSupplierDetail.supplierPhone && (
                  <p className="text-[11px] text-slate-400 font-mono">
                    Phone: {selectedSupplierDetail.supplierPhone}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedSupplierDetail(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Total Billed</p>
                  <p className="text-sm font-black font-mono text-slate-900 mt-1">
                    {formatINR(selectedSupplierDetail.totalPurchased)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Total Paid</p>
                  <p className="text-sm font-black font-mono text-emerald-700 mt-1">
                    {formatINR(selectedSupplierDetail.totalPaid)}
                  </p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <p className="text-[10px] font-bold uppercase text-rose-700">Balance Payable</p>
                  <p className="text-sm font-black font-mono text-rose-700 mt-1">
                    {formatINR(selectedSupplierDetail.outstandingPayable)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Purchase Vouchers ({selectedSupplierDetail.purchases.length})</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Voucher No</th>
                        <th className="py-2 px-3 text-right">Gross Bill</th>
                        <th className="py-2 px-3 text-right">Settled</th>
                        <th className="py-2 px-3 text-right">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSupplierDetail.purchases.map((po) => {
                        const live = getPurchaseLiveStatus(po, paymentVouchers);
                        return (
                          <tr key={po.id}>
                            <td className="py-2 px-3 font-mono text-slate-600">{po.date}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{po.purchaseNo}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatINR(po.totalAmount)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatINR(live.totalSettled)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                              {formatINR(live.balanceDue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!voucherToDelete}
        title="Delete Supplier Payment Voucher?"
        message="This will remove the payment voucher from Firestore, restore the amount to Supplier Payables, and reverse the outflow in Cash/Bank Book."
        itemDetails={
          voucherToDelete
            ? [
                { label: 'Voucher No', value: voucherToDelete.voucherNo },
                { label: 'Supplier', value: voucherToDelete.supplierName },
                { label: 'Amount', value: formatINR(voucherToDelete.amount) },
              ]
            : undefined
        }
        onCancel={() => setVoucherToDelete(null)}
        onConfirm={async () => {
          if (voucherToDelete) {
            await onDeletePaymentVoucher(voucherToDelete);
          }
        }}
      />
    </div>
  );
};
