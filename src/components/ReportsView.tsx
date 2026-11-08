import React, { useState } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Printer, 
  TrendingUp, 
  IndianRupee, 
  FileText, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Boxes, 
  Users, 
  Building2,
  CheckCircle2,
  ShoppingBag
} from 'lucide-react';
import { SaleRecord, InventoryItem, CustomerLedger } from '../types';
import { formatINR } from '../data/inventoryData';

interface ReportsViewProps {
  sales: SaleRecord[];
  inventory: InventoryItem[];
  ledgers: CustomerLedger[];
  onOpenRecordSale: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  inventory,
  ledgers,
  onOpenRecordSale,
}) => {
  const [reportType, setReportType] = useState<'sales' | 'gst' | 'stock' | 'receivables'>('sales');
  const [dateRange, setDateRange] = useState<'30' | '7' | 'today' | 'all'>('30');

  // Sales Totals
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalGstCollected = sales.reduce((sum, s) => sum + (s.gstAmount || 0), 0);
  const totalReceivables = ledgers.reduce((sum, l) => sum + (l.outstandingReceivable || 0), 0);
  const totalStockValuation = inventory.reduce((sum, i) => sum + (i.stockLevel * i.unitPrice), 0);

  // Export report as CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `Mohanty_Enterprises_${reportType.toUpperCase()}_Report.csv`;

    if (reportType === 'sales') {
      headers = ['Invoice No', 'Order No', 'Customer Name', 'Date', 'Category', 'Total Amount', 'Status', 'Payment'];
      rows = sales.map((s) => [
        `"${s.invoiceNo}"`,
        `"${s.orderNo}"`,
        `"${s.customerName}"`,
        s.date,
        `"${s.category}"`,
        s.totalAmount,
        `"${s.status}"`,
        `"${s.paymentStatus}"`,
      ]);
    } else if (reportType === 'gst') {
      headers = ['Invoice No', 'Date', 'Customer Name', 'Taxable Value', 'GST Rate', 'IGST/CGST Amount', 'Total Invoice Value'];
      rows = sales.map((s) => [
        `"${s.invoiceNo}"`,
        s.date,
        `"${s.customerName}"`,
        s.subtotal,
        s.isGst ? '18%' : '0%',
        s.gstAmount,
        s.totalAmount,
      ]);
    } else if (reportType === 'stock') {
      headers = ['Item Name', 'Category', 'Stock Level', 'Unit', 'Unit Price', 'Stock Valuation', 'Reorder Level'];
      rows = inventory.map((i) => [
        `"${i.name}"`,
        `"${i.category}"`,
        i.stockLevel,
        `"${i.unit}"`,
        i.unitPrice,
        i.stockLevel * i.unitPrice,
        i.reorderLevel,
      ]);
    } else {
      headers = ['Party Name', 'Phone', 'Total Billed', 'Total Received', 'Outstanding Receivable', 'Credit Limit'];
      rows = ledgers.map((l) => [
        `"${l.name}"`,
        `"${l.phone}"`,
        l.totalBilled,
        l.totalPaid,
        l.outstandingReceivable,
        l.creditLimit,
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-2xs">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Commercial Reports & Financial Statements
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Real-time audit registers, GSTR-1 tax logs, debtor ageing analysis, and stock valuation
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="all">All Time (FY 2026-27)</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Sales Turnover</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalSalesRevenue)}</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{sales.length} verified orders processed</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Output Liability (18%)</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{formatINR(totalGstCollected)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Ready for GSTR-3B monthly filing</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Receivables</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{formatINR(totalReceivables)}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Across {ledgers.length} party Khatabook accounts</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Warehouse Stock Value</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(totalStockValuation)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Live valuation across {inventory.length} catalog items</p>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Sub-Tabs Bar */}
        <div className="px-6 pt-4 border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'sales', label: 'Commercial Sales Register' },
            { id: 'gst', label: 'GST Tax Compliance (GSTR-1)' },
            { id: 'stock', label: 'Material Stock Valuation' },
            { id: 'receivables', label: 'Khatabook Debtor Ageing' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`pb-3 px-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                reportType === tab.id
                  ? 'border-b-2 border-[#F6B118] text-slate-900 font-extrabold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Report Content Table */}
        <div className="p-6">
          {reportType === 'sales' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Dispatch Status</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No sales recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    sales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/75">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">{s.invoiceNo}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.customerName}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{s.date}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {s.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(s.totalAmount)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            s.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'gst' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Taxable Value</th>
                    <th className="py-3 px-4 text-center">GST Rate</th>
                    <th className="py-3 px-4 text-right">Tax Amount</th>
                    <th className="py-3 px-4 text-right">Invoice Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/75">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{s.invoiceNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.customerName}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{s.date}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">{formatINR(s.subtotal)}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{s.isGst ? '18%' : '0%'}</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-600">{formatINR(s.gstAmount)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatINR(s.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'stock' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Material SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Total Valuation</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((item) => {
                    const isLow = item.stockLevel <= item.reorderLevel;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/75">
                        <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {item.stockLevel} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">{formatINR(item.unitPrice)}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {formatINR(item.stockLevel * item.unitPrice)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isLow ? 'Low Stock' : 'Adequate'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'receivables' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Party / Contractor</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4 text-right">Total Billed</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgers.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/75">
                      <td className="py-3 px-4 font-bold text-slate-900">{l.name}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{l.phone}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">{formatINR(l.totalBilled)}</td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatINR(l.totalPaid)}</td>
                      <td className="py-3 px-4 text-right font-black text-rose-600">{formatINR(l.outstandingReceivable)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          l.outstandingReceivable > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {l.outstandingReceivable > 0 ? 'Balance Due' : 'Cleared'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
