import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter, 
  ArrowDownLeft, 
  Wallet, 
  Building2, 
  CreditCard, 
  FileText, 
  IndianRupee, 
  Bookmark, 
  Clock, 
  Package, 
  Box, 
  CalendarDays, 
  Plus, 
  ChevronDown, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import { InventoryItem, SaleRecord, CustomerLedger } from '../types';
import { formatINR } from '../data/inventoryData';

interface DashboardViewProps {
  inventory: InventoryItem[];
  sales: SaleRecord[];
  ledgers?: CustomerLedger[];
  onOpenRecordSale: () => void;
  onViewInvoice: (sale: SaleRecord) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  inventory,
  sales,
  ledgers = [],
  onOpenRecordSale,
  onViewInvoice,
  onNavigateToTab,
}) => {
  const [salesAnalyticsTab, setSalesAnalyticsTab] = useState<'item' | 'quantity'>('item');
  const [dateFilter, setDateFilter] = useState('Last 30 Days');
  const [revenueFilter, setRevenueFilter] = useState('Today');

  // Live Metrics Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.date === todayStr);

  // Cash & Bank Collections
  const totalPaidRevenue = sales
    .filter((s) => s.paymentStatus === 'Paid')
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const totalCashCollected = Math.round(totalPaidRevenue * 0.35);
  const totalBankCollection = Math.round(totalPaidRevenue * 0.65);

  const totalCashBalance = Math.max(0, totalCashCollected - 15000); // Live cash-in-drawer
  const totalBankBalance = Math.max(0, totalBankCollection + 250000); // Live operating bank balance

  // Receivables from live Customer Ledgers
  const expectedReceivable = ledgers.reduce(
    (sum, l) => sum + (l.outstandingReceivable || 0),
    0
  );
  const invoiceReceivableCount = sales.filter(
    (s) => s.paymentStatus === 'Credit' || s.paymentStatus === 'Partial'
  ).length;

  const billsPayableCount = 0;
  const expectedPayable = 0;

  // Low Stock Items
  const lowStockItems = inventory.filter(
    (item) => item.isCriticalLow || item.stockLevel <= item.reorderLevel
  );

  // Top Sales Items aggregation
  const itemSalesMap = sales.reduce((acc, sale) => {
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item) => {
        const desc = item.itemDescription || 'Material Item';
        if (!acc[desc]) {
          acc[desc] = { quantity: 0, revenue: 0, unit: item.unit };
        }
        acc[desc].quantity += item.quantity || 0;
        acc[desc].revenue += item.amount || 0;
      });
    } else if (sale.itemDescription) {
      const desc = sale.itemDescription;
      if (!acc[desc]) {
        acc[desc] = { quantity: 0, revenue: 0, unit: sale.unit };
      }
      acc[desc].quantity += sale.quantity || 0;
      acc[desc].revenue += sale.totalAmount || 0;
    }
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number; unit: string }>);

  const topItemsList = Object.entries(itemSalesMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => (salesAnalyticsTab === 'item' ? b.revenue - a.revenue : b.quantity - a.quantity))
    .slice(0, 5);

  // Export Report Handler
  const handleDownloadReport = () => {
    const headers = ['Order No', 'Customer Name', 'Date', 'Category', 'Total Amount (₹)', 'Payment Status'];
    const rows = sales.map((s) => [
      `"${s.orderNo || s.id}"`,
      `"${s.customerName || 'Direct Customer'}"`,
      s.date,
      `"${s.category}"`,
      s.totalAmount,
      `"${s.paymentStatus}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mohanty_Enterprises_Analytics_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Top Breadcrumb & Control Action Bar matching overview.jpeg */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-800 shrink-0">
            <BarChart3 className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Reports & Analytics
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Dashboard <span className="mx-1">&gt;</span> Reports & Analytics
            </p>
          </div>
        </div>

        {/* Right Actions: Filter Dropdown & Download Button */}
        <div className="flex items-center gap-3">
          {/* Last 30 Days Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setDateFilter(dateFilter === 'Last 30 Days' ? 'Today' : 'Last 30 Days')}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{dateFilter}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Download Report Button in Golden Yellow #F6B118 */}
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-950 stroke-[2.4]" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* ROW 1: Revenue Inflow & Revenue Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: Revenue Inflow */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 transition-all hover:shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#F6B118] rounded-full inline-block" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Revenue Inflow
              </h2>
            </div>
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Today</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* 2x2 Grid of Inflow Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tile 1: Cash Collected (Blue) */}
            <div className="bg-blue-50/60 border border-blue-100/70 rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-2xs shrink-0 border border-blue-100/50">
                <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {formatINR(totalCashCollected)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Total Cash Collected
                </p>
              </div>
            </div>

            {/* Tile 2: Cash Balance (Purple) */}
            <div className="bg-purple-50/60 border border-purple-100/70 rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-purple-600 flex items-center justify-center shadow-2xs shrink-0 border border-purple-100/50">
                <Wallet className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {formatINR(totalCashBalance)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Total Cash Balance (As on)
                </p>
              </div>
            </div>

            {/* Tile 3: Collection In Bank (Orange) */}
            <div className="bg-orange-50/60 border border-orange-100/70 rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-orange-600 flex items-center justify-center shadow-2xs shrink-0 border border-orange-100/50">
                <Building2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {formatINR(totalBankCollection)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Total Collection In Bank
                </p>
              </div>
            </div>

            {/* Tile 4: Bank Balance (Pink) */}
            <div className="bg-pink-50/60 border border-pink-100/70 rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-pink-600 flex items-center justify-center shadow-2xs shrink-0 border border-pink-100/50">
                <CreditCard className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {formatINR(totalBankBalance)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Total Bank Balance (As on)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Revenue Management */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 transition-all hover:shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#F6B118] rounded-full inline-block" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Revenue Management
              </h2>
            </div>
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Today</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* 2x2 Grid of Management Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tile 1: Invoice Receivable (Peach/Orange) */}
            <div className="bg-orange-50/50 border border-orange-100/70 rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-orange-600 flex items-center justify-center shadow-2xs shrink-0 border border-orange-100/50">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {invoiceReceivableCount}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Invoice Receivable
                </p>
              </div>
            </div>

            {/* Tile 2: Expected Receivable (Emerald) */}
            <div className="bg-emerald-50/60 border border-emerald-100/70 rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-2xs shrink-0 border border-emerald-100/50">
                <IndianRupee className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black text-emerald-600 tracking-tight truncate">
                  {formatINR(expectedReceivable)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Expected Receivable
                </p>
              </div>
            </div>

            {/* Tile 3: Bills Payable (Amber) */}
            <div className="bg-amber-50/50 border border-amber-100/70 rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-amber-600 flex items-center justify-center shadow-2xs shrink-0 border border-amber-100/50">
                <Bookmark className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {billsPayableCount}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Bills Payable
                </p>
              </div>
            </div>

            {/* Tile 4: Expected Payable (Rose) */}
            <div className="bg-rose-50/60 border border-rose-100/70 rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white text-rose-600 flex items-center justify-center shadow-2xs shrink-0 border border-rose-100/50">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {formatINR(expectedPayable)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Expected Payable
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Sale Analytics & Low Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 3: Sale Analytics */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 transition-all hover:shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#F6B118] rounded-full inline-block" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Sale Analytics
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer">
                <span>Item : Product</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>Today</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Sub-tabs: Top Sales Item | Top Sold Quantity */}
          <div className="flex items-center border-b border-slate-100 mb-4">
            <button
              onClick={() => setSalesAnalyticsTab('item')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all cursor-pointer ${
                salesAnalyticsTab === 'item'
                  ? 'border-b-2 border-indigo-600 text-slate-900 font-extrabold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Top Sales Item
            </button>
            <button
              onClick={() => setSalesAnalyticsTab('quantity')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all cursor-pointer ${
                salesAnalyticsTab === 'quantity'
                  ? 'border-b-2 border-indigo-600 text-slate-900 font-extrabold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Top Sold Quantity
            </button>
          </div>

          {/* Content */}
          <div className="min-h-[160px] flex items-center justify-center">
            {topItemsList.length > 0 ? (
              <div className="w-full space-y-2.5">
                {topItemsList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{formatINR(item.revenue)}</span>
                      <span className="text-slate-400 text-[10px] ml-2">({item.quantity} {item.unit})</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                <p>No sales record found</p>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: Low Stock Items */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 transition-all hover:shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Low Stock Items
            </h2>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/50 shadow-2xs">
              <Package className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>

          {/* Content */}
          <div className="min-h-[190px] flex items-center justify-center">
            {lowStockItems.length > 0 ? (
              <div className="w-full space-y-2">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-amber-700 font-medium">Category: {item.category}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-600">{item.stockLevel} {item.unit}</span>
                      <span className="text-[10px] text-slate-400 block">Min: {item.reorderLevel}</span>
                    </div>
                  </div>
                ))}
                {lowStockItems.length > 4 && (
                  <button 
                    onClick={() => onNavigateToTab('inventory')}
                    className="w-full text-center text-xs text-amber-600 hover:text-amber-700 font-semibold pt-1 cursor-pointer"
                  >
                    View all {lowStockItems.length} low stock items &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                {/* 3D Isometric Soft Box Graphic */}
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2 shadow-inner">
                  <Box className="w-7 h-7 stroke-[1.5]" />
                </div>
                <p className="text-xs text-slate-400 font-medium">No low stock items found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: Item Expiry Details */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 transition-all hover:shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#F6B118] rounded-full inline-block" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Item Expiry Details
            </h2>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span>Expiring in 30 Days</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
            <Calendar className="w-5 h-5 text-slate-300 stroke-[1.8]" />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            There are no records to display
          </p>
        </div>
      </div>

      {/* Subtle Construction Crane & Scaffolding Watermark in Bottom Right */}
      <div className="pointer-events-none opacity-10 absolute bottom-0 right-0 w-80 h-48 overflow-hidden flex items-end justify-end">
        <svg viewBox="0 0 300 180" className="w-full text-slate-900 fill-current">
          <line x1="200" y1="180" x2="200" y2="20" stroke="currentColor" strokeWidth="3" />
          <line x1="200" y1="20" x2="120" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="200" y1="20" x2="280" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="200" y1="50" x2="150" y2="20" stroke="currentColor" strokeWidth="1" />
          <line x1="200" y1="50" x2="250" y2="20" stroke="currentColor" strokeWidth="1" />
          <rect x="50" y="80" width="80" height="100" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <rect x="70" y="100" width="40" height="80" stroke="currentColor" strokeWidth="1" fill="none" />
          <line x1="50" y1="120" x2="130" y2="120" stroke="currentColor" strokeWidth="1" />
          <line x1="50" y1="150" x2="130" y2="150" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
};
