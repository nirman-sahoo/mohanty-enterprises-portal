import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Filter, 
  Printer, 
  Eye, 
  Building2,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { SaleRecord, Category } from '../types';
import { CATEGORIES, formatINR } from '../data/inventoryData';

interface InvoicesViewProps {
  sales: SaleRecord[];
  onViewInvoice: (sale: SaleRecord) => void;
  onOpenRecordSale: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  sales,
  onViewInvoice,
  onOpenRecordSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<string>('ALL');

  // Filter invoices
  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.truckNumber && sale.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || sale.category === selectedCategory;
    const matchesPayment = selectedPayment === 'ALL' || sale.paymentStatus === selectedPayment;

    return matchesSearch && matchesCategory && matchesPayment;
  });

  const totalFilteredValue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);

  const handleExportCSV = () => {
    const headers = ['Invoice No', 'Date', 'Customer Name', 'Category', 'Item Description', 'Quantity', 'Unit', 'Unit Price', 'Total Amount', 'Payment Status', 'Delivery Status', 'Vehicle No'];
    const rows = filteredSales.map((s) => [
      s.invoiceNo,
      s.date,
      `"${s.customerName}"`,
      s.category,
      `"${s.itemDescription}"`,
      s.quantity,
      s.unit,
      s.unitPrice,
      s.totalAmount,
      s.paymentStatus,
      s.status,
      s.truckNumber || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mohanty_Enterprises_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Commercial Invoices Register
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            GST-compliant B2B billing records for Cement, TMT Bars, Fertilizers, and Asbestos sheets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Filtered Value</p>
            <p className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {formatINR(totalFilteredValue)}
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, invoice no, item description, or truck..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="ALL">All Terms</option>
            <option value="Paid">Paid</option>
            <option value="Credit">Credit</option>
            <option value="Partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Contractor / Buyer</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-3 text-right">Quantity</th>
                <th className="py-3 px-3 text-right">Unit Rate (₹)</th>
                <th className="py-3 px-3 text-right">Taxable Total (₹)</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Logistics</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No commercial invoices match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {sale.invoiceNo}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {sale.date}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {sale.customerName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {sale.category}
                    </td>
                    <td className="py-3 px-3 text-slate-900 font-medium max-w-[200px] truncate">
                      {sale.itemDescription}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {sale.quantity} {sale.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      ₹{sale.unitPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatINR(sale.totalAmount)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          sale.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : sale.paymentStatus === 'Partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {sale.truckNumber || 'Assigned'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewInvoice(sale)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
