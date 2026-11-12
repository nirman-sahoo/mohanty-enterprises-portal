import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Download,
  Printer,
  Eye,
  Trash2,
  Plus,
  Filter,
  Send,
} from 'lucide-react';
import { CompanySettings, SaleRecord } from '../../types';
import { formatINR, generateBillWhatsAppUrl } from '../../utils/formatters';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface SalesRegisterViewProps {
  sales: SaleRecord[];
  settings?: CompanySettings;
  onViewInvoice: (sale: SaleRecord) => void;
  onNewSalesVoucher: () => void;
  onDeleteSale: (sale: SaleRecord) => Promise<void>;
}

export const SalesRegisterView: React.FC<SalesRegisterViewProps> = ({
  sales,
  settings,
  onViewInvoice,
  onNewSalesVoucher,
  onDeleteSale,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Paid' | 'Partial' | 'Credit'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);

  const filteredSales = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sales.filter((s) => {
      if (statusFilter !== 'ALL' && s.paymentStatus !== statusFilter) return false;
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      if (!q) return true;
      return (
        (s.invoiceNo || '').toLowerCase().includes(q) ||
        (s.orderNo || '').toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.itemDescription || '').toLowerCase().includes(q)
      );
    });
  }, [sales, searchTerm, statusFilter, startDate, endDate]);

  const totals = useMemo(() => {
    return filteredSales.reduce(
      (acc, s) => {
        const paid =
          typeof s.paidAmount === 'number'
            ? s.paidAmount
            : s.paymentStatus === 'Paid'
            ? s.totalAmount
            : s.paymentStatus === 'Partial'
            ? Math.round(s.totalAmount * 0.5)
            : 0;
        const due = Math.max(0, s.totalAmount - paid);
        return {
          gross: acc.gross + s.totalAmount,
          paid: acc.paid + paid,
          due: acc.due + due,
        };
      },
      { gross: 0, paid: 0, due: 0 }
    );
  }, [filteredSales]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Bill / Invoice No',
      'Party Name',
      'Items Summary',
      'Bill Amount',
      'Paid Upfront',
      'Credit Due',
      'Status',
      'Mode / Account',
    ];
    const rows = filteredSales.map((s) => {
      const paid =
        typeof s.paidAmount === 'number'
          ? s.paidAmount
          : s.paymentStatus === 'Paid'
          ? s.totalAmount
          : s.paymentStatus === 'Partial'
          ? Math.round(s.totalAmount * 0.5)
          : 0;
      const itemsText =
        s.items && s.items.length > 0
          ? s.items.map((it) => `${it.itemDescription} (${it.quantity} ${it.unit})`).join(' | ')
          : `${s.itemDescription} (${s.quantity} ${s.unit})`;
      return [
        s.date,
        `"${s.invoiceNo || s.orderNo}"`,
        `"${s.customerName}"`,
        `"${itemsText}"`,
        s.totalAmount,
        paid,
        Math.max(0, s.totalAmount - paid),
        `"${s.paymentStatus}"`,
        `"${s.paymentMode || 'Credit'}${s.bankAccountName ? ` (${s.bankAccountName})` : ''}"`,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sales_Register_${new Date().toISOString().split('T')[0]}.csv`;
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
            <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Register (Daybook)</h1>
            <p className="text-xs text-slate-500 font-medium">
              Complete sales bills, upfront collections, and credit receivables register
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNewSalesVoucher}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>New Sales Voucher</span>
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

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Sales Vouchers</p>
          <p className="text-base font-black font-mono tabular-nums text-slate-900 mt-1">{filteredSales.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Matching Bills</p>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-amber-400 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-amber-400">Total Sales Value</p>
          <p className="text-base font-black font-mono tabular-nums text-white mt-1">{formatINR(totals.gross)}</p>
          <p className="text-[10px] text-slate-300 mt-0.5">Total Billed</p>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-emerald-700">Paid at Counter</p>
          <p className="text-base font-black font-mono tabular-nums text-emerald-700 mt-1">{formatINR(totals.paid)}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Instant Cash / Bank</p>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-rose-700">Booked to Credit</p>
          <p className="text-base font-black font-mono tabular-nums text-rose-700 mt-1">{formatINR(totals.due)}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Moved to Party Ledger</p>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search bill no, customer, material..."
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
              <option value="Credit">Credit</option>
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
                <th className="py-3 px-4">Bill / Voucher No</th>
                <th className="py-3 px-4">Customer / Party</th>
                <th className="py-3 px-4">Materials &amp; Qty</th>
                <th className="py-3 px-4 text-right">Bill Total</th>
                <th className="py-3 px-4 text-center">Settlement</th>
                <th className="py-3 px-4 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No matching sales vouchers found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const summary =
                    sale.items && sale.items.length > 0
                      ? `${sale.items[0].itemDescription} (${sale.items[0].quantity} ${sale.items[0].unit})${
                          sale.items.length > 1 ? ` +${sale.items.length - 1} more` : ''
                        }`
                      : `${sale.itemDescription} (${sale.quantity} ${sale.unit})`;

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{sale.date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {sale.invoiceNo || sale.orderNo}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{sale.customerName}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium max-w-[200px] truncate">{summary}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-slate-950">
                        {formatINR(sale.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[11px] font-semibold ${
                            sale.paymentStatus === 'Paid'
                              ? 'text-emerald-700'
                              : sale.paymentStatus === 'Partial'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {sale.paymentStatus}
                        </span>
                        {sale.paymentMode && sale.paymentMode !== 'Credit' && (
                          <p className="text-[10px] text-slate-500 mt-0.5">{sale.paymentMode}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewInvoice(sale)}
                            title="View Bill"
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={generateBillWhatsAppUrl(sale, settings)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send on WhatsApp"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setSaleToDelete(sale)}
                            title="Delete Sales Voucher"
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
        isOpen={!!saleToDelete}
        title="Delete Sales Voucher?"
        message="Deleting this sales voucher will remove it from Sales Register, restore sold quantities back to Inventory Stock, reverse Party Ledger dues, and adjust Cash/Bank Book."
        itemDetails={
          saleToDelete
            ? [
                { label: 'Invoice No', value: saleToDelete.invoiceNo || saleToDelete.orderNo },
                { label: 'Party', value: saleToDelete.customerName },
                { label: 'Gross Amount', value: formatINR(saleToDelete.totalAmount) },
              ]
            : undefined
        }
        onCancel={() => setSaleToDelete(null)}
        onConfirm={async () => {
          if (saleToDelete) {
            await onDeleteSale(saleToDelete);
          }
        }}
      />
    </div>
  );
};
