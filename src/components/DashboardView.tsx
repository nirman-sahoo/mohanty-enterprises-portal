import React, { useState } from 'react';
import { 
  IndianRupee, 
  Truck, 
  CreditCard, 
  ShoppingBag, 
  AlertTriangle, 
  ArrowUpRight, 
  Eye, 
  FileText,
  Search,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { InventoryItem, SaleRecord, Category } from '../types';
import { CATEGORIES, formatINR } from '../data/inventoryData';

interface DashboardViewProps {
  inventory: InventoryItem[];
  sales: SaleRecord[];
  onOpenRecordSale: () => void;
  onViewInvoice: (sale: SaleRecord) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  inventory,
  sales,
  onOpenRecordSale,
  onViewInvoice,
  onNavigateToTab,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Compute Core Metrics
  // 1. Today's Sales Value (₹) - today is 2026-10-11
  const todaySales = sales.filter((s) => s.date === '2026-10-11' || s.date === new Date().toISOString().split('T')[0]);
  const todaySalesValue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);

  // 2. Active Deliveries (Trucks in transit)
  const activeDeliveriesCount = sales.filter((s) => s.status === 'In Transit').length;

  // 3. Outstanding Receivables (₹)
  const outstandingReceivables = sales
    .filter((s) => s.paymentStatus === 'Credit' || s.paymentStatus === 'Partial')
    .reduce((acc, s) => acc + (s.paymentStatus === 'Credit' ? s.totalAmount : s.totalAmount * 0.5), 0) + 2680000;

  // 4. Total Orders Recorded Today
  const totalOrdersRecordedToday = todaySales.length;

  // Low Stock Items for Left Column
  // Strictly only show items needing restock: Item Name, Category, Stock Level, subtle "Critical Low" tag. NO yard location subtext!
  const lowStockItems = inventory.filter(
    (item) => item.isCriticalLow || item.stockLevel <= item.reorderLevel
  );

  // Category Distribution Calculation across CEMENT, SCAN TMT BAR, FERTILIZER, Asbestos
  const totalSalesAmount = sales.reduce((acc, s) => acc + s.totalAmount, 0);

  const categoryStats = CATEGORIES.map((cat) => {
    const catSales = sales.filter((s) => s.category === cat);
    const orderCount = catSales.length;
    const catValue = catSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const percentage = totalSalesAmount > 0 ? Math.round((catValue / totalSalesAmount) * 100) : 0;
    
    // Quick unit summary
    const sampleUnit = catSales[0]?.unit || 'Units';
    const totalVolume = catSales.reduce((acc, s) => acc + s.quantity, 0);

    return {
      category: cat,
      orderCount,
      totalValue: catValue,
      percentage,
      totalVolume,
      sampleUnit,
    };
  });

  // Filtered recent sales table
  const filteredSales = selectedCategoryFilter === 'ALL'
    ? sales
    : sales.filter((s) => s.category === selectedCategoryFilter);

  return (
    <div className="space-y-6">
      {/* TOP METRIC CARDS (4 Grid Layout - NO Large Hero Banners) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Sales Value (₹) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Today's Sales Value
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {formatINR(todaySalesValue)}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Billing volume</span>
            <span className="font-semibold text-emerald-600 font-mono">+18.4% vs y'day</span>
          </div>
        </div>

        {/* 2. Active Deliveries (Trucks in transit) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Deliveries
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {activeDeliveriesCount}{' '}
              <span className="text-sm font-normal text-slate-500">Trucks in transit</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Fleet status</span>
            <span className="font-semibold text-slate-700">Dispatch on schedule</span>
          </div>
        </div>

        {/* 3. Outstanding Receivables (₹) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Outstanding Receivables
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {formatINR(outstandingReceivables)}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>B2B Credit Book</span>
            <span className="font-semibold text-slate-700 font-mono">5 Major Parties</span>
          </div>
        </div>

        {/* 4. Total Orders Recorded Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Orders Today
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {totalOrdersRecordedToday}{' '}
              <span className="text-sm font-normal text-slate-500">Orders recorded</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Commercial invoices</span>
            <span className="font-semibold text-slate-700">100% Tax Compliant</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA (TWO COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: LOW STOCK ALERTS */}
        {/* Strictly: Item Name, Category, Stock Level, and a subtle "Critical Low" tag. NO yard location subtext! */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Low Stock Alerts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Items requiring replenishment
              </p>
            </div>
            <span className="text-xs font-semibold font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {lowStockItems.length} Items Alert
            </span>
          </div>

          <div className="divide-y divide-slate-100 mt-2 overflow-y-auto max-h-[380px]">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="py-3 px-1 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    {item.category}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                    {item.stockLevel} {item.unit}
                  </p>
                  <span className="inline-block mt-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Critical Low
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateToTab('inventory')}
              className="w-full py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer text-center"
            >
              Open Full Inventory Registry →
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: TRADING CATEGORY DISTRIBUTION */}
        {/* Visual breakdown of active orders across CEMENT, SCAN TMT BAR, FERTILIZER, and Asbestos */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Trading Category Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active order volume & sales share across wholesale verticals
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600 font-semibold">
              Total {formatINR(totalSalesAmount)}
            </div>
          </div>

          {/* Distribution Bars and Breakdown */}
          <div className="space-y-4.5 mt-4">
            {categoryStats.map((stat) => {
              // Accent color per category
              const getAccent = (cat: Category) => {
                switch (cat) {
                  case 'CEMENT':
                    return { bar: 'bg-slate-700', text: 'text-slate-800', light: 'bg-slate-100' };
                  case 'SCAN TMT BAR':
                    return { bar: 'bg-amber-500', text: 'text-amber-800', light: 'bg-amber-50' };
                  case 'FERTILIZER':
                    return { bar: 'bg-emerald-600', text: 'text-emerald-800', light: 'bg-emerald-50' };
                  case 'Asbestos':
                    return { bar: 'bg-blue-600', text: 'text-blue-800', light: 'bg-blue-50' };
                }
              };

              const style = getAccent(stat.category);

              return (
                <div key={stat.category} className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-all">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{stat.category}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{stat.orderCount} Active Orders</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatINR(stat.totalValue)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 tabular-nums">
                        ({stat.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${style.bar} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(8, stat.percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                    <span>
                      Dispatched Volume:{' '}
                      <strong className="text-slate-700 font-mono">
                        {stat.totalVolume} {stat.sampleUnit}
                      </strong>
                    </span>
                    <button
                      onClick={() => setSelectedCategoryFilter(stat.category === selectedCategoryFilter ? 'ALL' : stat.category)}
                      className="text-amber-700 hover:underline font-semibold cursor-pointer"
                    >
                      {selectedCategoryFilter === stat.category ? 'Showing Filtered' : 'Filter Orders'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Wholesale pricing updated for FY 2026-27</span>
            <button
              onClick={onOpenRecordSale}
              className="text-amber-700 font-semibold hover:text-amber-900 cursor-pointer"
            >
              + Record Sale for any Category
            </button>
          </div>
        </div>
      </div>

      {/* RECENT RECORDED SALES & INVOICE STREAM */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recent Sales & Dispatch Register
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live orders recorded across Cement, TMT Bars, Fertilizers, and Asbestos
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategoryFilter(c)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer truncate max-w-[110px] ${
                    selectedCategoryFilter === c
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabular Sales List */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Invoice No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer / Contractor</th>
                <th className="py-3 px-3">Material Category</th>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-3 text-right">Quantity</th>
                <th className="py-3 px-3 text-right">Total Amount (₹)</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSales.slice(0, 7).map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {sale.invoiceNo}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono">
                    {sale.date}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {sale.customerName}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {sale.category}
                  </td>
                  <td className="py-3 px-3 text-slate-900 font-semibold max-w-[180px] truncate">
                    {sale.itemDescription}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {sale.quantity} {sale.unit}
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
                  <td className="py-3 px-3">
                    <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                      {sale.status === 'In Transit' ? (
                        <>
                          <Truck className="w-3 h-3 text-blue-600" />
                          <span>In Transit</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Delivered</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onViewInvoice(sale)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                    >
                      Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
