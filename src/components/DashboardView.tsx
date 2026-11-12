import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Plus,
  ShoppingBag,
  FileText,
  ArrowDownLeft,
  ArrowLeftRight,
  Send,
} from 'lucide-react';
import {
  BankAccount,
  ContraEntry,
  CustomerLedger,
  InventoryItem,
  MoneyReceipt,
  PaymentVoucher,
  PurchaseRecord,
  SaleRecord,
} from '../types';
import { formatINR } from '../utils/formatters';
import {
  computeAllAccountBalances,
  computeFinancialSummary,
  getPurchaseLiveStatus,
  isCashAccount,
} from '../utils/accountingEngine';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  inventory: InventoryItem[];
  sales: SaleRecord[];
  ledgers: CustomerLedger[];
  purchases: PurchaseRecord[];
  moneyReceipts: MoneyReceipt[];
  paymentVouchers: PaymentVoucher[];
  bankAccounts: BankAccount[];
  contraEntries: ContraEntry[];
  onViewInvoice: (sale: SaleRecord) => void;
  onNavigateToTab: (tab: NavTab) => void;
  onOpenReceivePayment?: () => void;
  onOpenPaySupplier?: () => void;
}

function formatCompactINR(val: number): string {
  if (val <= 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${Math.round(val)}`;
}

function formatShortDateLabel(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(parsed);
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  inventory,
  sales,
  ledgers,
  purchases,
  moneyReceipts,
  paymentVouchers,
  bankAccounts,
  contraEntries,
  onViewInvoice,
  onNavigateToTab,
  onOpenReceivePayment,
  onOpenPaySupplier,
}) => {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const financialSummary = useMemo(
    () =>
      computeFinancialSummary({
        sales,
        purchases,
        inventory,
        ledgers,
        paymentVouchers,
        moneyReceipts,
        accounts: bankAccounts,
        contraEntries,
      }),
    [sales, purchases, inventory, ledgers, paymentVouchers, moneyReceipts, bankAccounts, contraEntries]
  );

  const accountBalances = useMemo(
    () =>
      computeAllAccountBalances({
        accounts: bankAccounts,
        sales,
        moneyReceipts,
        purchases,
        paymentVouchers,
        contraEntries,
      }),
    [bankAccounts, sales, moneyReceipts, purchases, paymentVouchers, contraEntries]
  );

  const unpaidPurchaseCount = useMemo(
    () => purchases.filter((po) => getPurchaseLiveStatus(po, paymentVouchers).balanceDue > 0.5).length,
    [purchases, paymentVouchers]
  );

  const duePartyCount = useMemo(
    () => ledgers.filter((l) => (l.outstandingReceivable || 0) > 0.5).length,
    [ledgers]
  );

  const lowStockCount = useMemo(
    () => inventory.filter((item) => item.stockLevel <= item.reorderLevel).length,
    [inventory]
  );

  const dailyActivity = useMemo(() => {
    const map = new Map<string, { date: string; sales: number; purchases: number }>();

    sales.forEach((s) => {
      if (!s.date || s.status === 'Cancelled') return;
      const cur = map.get(s.date) || { date: s.date, sales: 0, purchases: 0 };
      cur.sales += s.totalAmount || 0;
      map.set(s.date, cur);
    });

    purchases.forEach((p) => {
      if (!p.date) return;
      const cur = map.get(p.date) || { date: p.date, sales: 0, purchases: 0 };
      cur.purchases += p.totalAmount || 0;
      map.set(p.date, cur);
    });

    const sorted = Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    const maxVal = sorted.reduce((m, d) => Math.max(m, d.sales, d.purchases), 0) || 0;
    return { rows: sorted, maxVal };
  }, [sales, purchases]);

  const activeDayPreview = useMemo(() => {
    if (dailyActivity.rows.length === 0) return null;
    if (hoveredDate) {
      return dailyActivity.rows.find((r) => r.date === hoveredDate) || null;
    }
    return dailyActivity.rows[dailyActivity.rows.length - 1];
  }, [dailyActivity.rows, hoveredDate]);

  const recentVouchers = useMemo(() => {
    const extractTs = (rawId: string) => {
      const m = rawId.match(/(\d{10,})$/);
      return m ? Number(m[1]) : 0;
    };

    const saleRows = sales.map((s) => ({
      id: `s-${s.id}`,
      sortTs: extractTs(s.id),
      date: s.date || '',
      voucherNo: s.invoiceNo || s.orderNo,
      party: s.customerName,
      type: 'Sale' as const,
      status: s.paymentStatus,
      amount: s.totalAmount,
      saleRecord: s,
    }));

    const purchaseRows = purchases.map((p) => {
      const live = getPurchaseLiveStatus(p, paymentVouchers);
      return {
        id: `p-${p.id}`,
        sortTs: extractTs(p.id),
        date: p.date || '',
        voucherNo: p.purchaseNo,
        party: p.supplierName,
        type: 'Purchase' as const,
        status: live.status,
        amount: p.totalAmount,
        saleRecord: undefined,
      };
    });

    return [...saleRows, ...purchaseRows]
      .sort((a, b) => {
        const cmp = (b.date || '').localeCompare(a.date || '');
        if (cmp !== 0) return cmp;
        return b.sortTs - a.sortTs;
      })
      .slice(0, 7);
  }, [sales, purchases, paymentVouchers]);

  const corporateBanksCount = bankAccounts.filter((a) => !isCashAccount(a)).length;

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6 pb-8 max-w-7xl mx-auto">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            {todayFormatted} · {sales.length} {sales.length === 1 ? 'Sale' : 'Sales'} · {purchases.length}{' '}
            {purchases.length === 1 ? 'Purchase' : 'Purchases'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateToTab('purchase-voucher')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
            <span>Purchase Voucher</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('sales-voucher')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Sales Voucher</span>
          </button>
        </div>
      </div>

      {/* Unified Single-Strip KPI Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70 overflow-hidden">
        <button
          type="button"
          onClick={() => onNavigateToTab('bank-book')}
          className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cash &amp; Bank</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-950 mt-2 truncate">
            {formatINR(financialSummary.totalLiquidity)}
          </p>
          <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-1.5 truncate">
            Cash {formatINR(financialSummary.cashClosingBalance)} · Bank {formatINR(financialSummary.bankClosingBalance)}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('party-outstandings')}
          className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Party Receivables</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-950 mt-2 truncate">
            {formatINR(financialSummary.totalReceivables)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 truncate">
            {duePartyCount === 0
              ? 'All party accounts settled'
              : `${duePartyCount} ${duePartyCount === 1 ? 'party' : 'parties'} pending`}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('payables')}
          className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Supplier Payables</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-950 mt-2 truncate">
            {formatINR(financialSummary.totalPayables)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 truncate">
            {unpaidPurchaseCount === 0
              ? 'No unpaid supplier bills'
              : `${unpaidPurchaseCount} unpaid ${unpaidPurchaseCount === 1 ? 'bill' : 'bills'}`}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('stock-report')}
          className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Closing Stock Value</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-950 mt-2 truncate">
            {formatINR(financialSummary.closingStockValue)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 truncate">
            {inventory.length === 0
              ? 'No SKUs in catalog'
              : `${inventory.length} ${inventory.length === 1 ? 'SKU' : 'SKUs'} · ${lowStockCount} below reorder`}
          </p>
        </button>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2/3: Trading Activity & Recent Vouchers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trading & Cashflow Overview */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Trading &amp; Cashflow</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeDayPreview
                    ? `${formatShortDateLabel(activeDayPreview.date)} · Sales ${formatINR(activeDayPreview.sales)} · Purchases ${formatINR(activeDayPreview.purchases)}`
                    : 'Non-GST sales, purchases, and operating cash collections'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500 shrink-0">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 inline-block" />
                  Sales
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#F6B118] inline-block" />
                  Purchases
                </span>
              </div>
            </div>

            {dailyActivity.rows.length > 0 && dailyActivity.maxVal > 0 ? (
              <div className="relative pt-2 pb-1">
                <div className="flex items-stretch gap-3 h-40">
                  {/* Compact Y-Axis Scale */}
                  <div className="flex flex-col justify-between text-[10px] font-mono tabular-nums text-slate-400 pb-6 pr-1 select-none text-right w-12 shrink-0">
                    <span>{formatCompactINR(dailyActivity.maxVal)}</span>
                    <span>{formatCompactINR(dailyActivity.maxVal / 2)}</span>
                    <span>₹0</span>
                  </div>

                  {/* Bars & Dashed Gridlines */}
                  <div className="flex-1 relative flex items-end gap-2 sm:gap-4 border-b border-slate-200 pb-6">
                    <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-100 pointer-events-none" />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-3 border-t border-dashed border-slate-100 pointer-events-none" />

                    {dailyActivity.rows.map((day) => {
                      const salePct =
                        day.sales > 0 ? Math.max(6, Math.round((day.sales / dailyActivity.maxVal) * 100)) : 0;
                      const purPct =
                        day.purchases > 0 ? Math.max(6, Math.round((day.purchases / dailyActivity.maxVal) * 100)) : 0;
                      const isHovered = hoveredDate === day.date;

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={() => setHoveredDate(day.date)}
                          onMouseLeave={() => setHoveredDate(null)}
                          className={`relative flex-1 flex flex-col items-center h-full justify-end min-w-0 rounded-t-lg transition-colors px-1 ${
                            isHovered ? 'bg-slate-50/90' : ''
                          }`}
                        >
                          <div className="w-full flex items-end justify-center gap-1.5 h-full">
                            <div
                              title={`Sales: ${formatINR(day.sales)}`}
                              style={{ height: `${salePct}%` }}
                              className="w-full max-w-[18px] bg-slate-900 rounded-t-sm transition-opacity"
                            />
                            <div
                              title={`Purchases: ${formatINR(day.purchases)}`}
                              style={{ height: `${purPct}%` }}
                              className="w-full max-w-[18px] bg-[#F6B118] rounded-t-sm transition-opacity"
                            />
                          </div>
                          <span className="absolute -bottom-5 text-[10px] font-mono text-slate-400 truncate">
                            {formatShortDateLabel(day.date)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative h-28 flex items-center justify-center border-y border-slate-100">
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/70" />
                <p className="relative bg-white px-4 text-xs text-slate-400">
                  No daily sales or purchase activity yet — chart updates automatically as vouchers are posted.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-slate-100">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Total Sales</p>
                <p className="text-base font-bold font-mono tabular-nums text-slate-950 mt-0.5">
                  {formatINR(financialSummary.grossSales)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Total Purchases</p>
                <p className="text-base font-bold font-mono tabular-nums text-slate-950 mt-0.5">
                  {formatINR(financialSummary.grossPurchases)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Gross Trading Profit</p>
                <p
                  className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
                    financialSummary.grossTradingProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatINR(financialSummary.grossTradingProfit)}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Vouchers Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Vouchers</h2>
                <p className="text-[11px] text-slate-400">Latest Sales &amp; Purchase bills</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('sales-register')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Sales Register</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentVouchers.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">No vouchers posted yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Record a Purchase Voucher to add inward stock or post a Sales Voucher to bill a party.
                </p>
                <div className="mt-5 flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('purchase-voucher')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Record Purchase
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('sales-voucher')}
                    className="px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Create Sales Voucher
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 bg-slate-50/50">
                      <th className="py-2.5 px-5">Date</th>
                      <th className="py-2.5 px-3">Voucher</th>
                      <th className="py-2.5 px-3">Party / Supplier</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentVouchers.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          if (row.saleRecord) {
                            onViewInvoice(row.saleRecord);
                          } else {
                            onNavigateToTab('purchase-register');
                          }
                        }}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-5 font-mono text-slate-500 whitespace-nowrap">{row.date}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-mono font-semibold text-slate-900">{row.voucherNo}</span>
                          <span className="ml-1.5 text-[11px] text-slate-400">· {row.type}</span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[190px] truncate">{row.party}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold ${
                              row.status === 'Paid'
                                ? 'text-emerald-700'
                                : row.status === 'Partial'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-5 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                          {formatINR(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3: Accounts, Quick Actions & Financial Position */}
        <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100">
          {/* Accounts List */}
          <div className="p-5 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Cash &amp; Bank Accounts</h2>
              <button
                type="button"
                onClick={() => onNavigateToTab('settings')}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                {corporateBanksCount === 0 ? '+ Add Bank' : 'Manage'}
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              {bankAccounts.map((acc) => {
                const bal = accountBalances[acc.id] ?? acc.openingBalance ?? 0;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => onNavigateToTab(isCashAccount(acc) ? 'cash-book' : 'bank-book')}
                    className="w-full flex items-center justify-between py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-800 truncate">{acc.bankName}</p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {isCashAccount(acc) ? 'Cash Book' : `A/C ${acc.accountNumber}`}
                      </p>
                    </div>
                    <span className="font-mono font-bold tabular-nums text-slate-900 shrink-0">
                      {formatINR(bal)}
                    </span>
                  </button>
                );
              })}

              {corporateBanksCount === 0 && (
                <p className="text-[11px] text-slate-400 pt-1">
                  Add your corporate bank account in Settings to track Bank Book receipts &amp; payments.
                </p>
              )}
            </div>
          </div>

          {/* Quick Accounting Actions */}
          <div className="p-5 sm:p-6 space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quick Actions</h3>
            <div className="space-y-1.5 text-xs">
              {onOpenReceivePayment && (
                <button
                  type="button"
                  onClick={onOpenReceivePayment}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Receive Party Payment</span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
              {onOpenPaySupplier && (
                <button
                  type="button"
                  onClick={onOpenPaySupplier}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pay Supplier Bill</span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateToTab('contra-entry')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-slate-600" />
                  <span>Contra Cash / Bank Transfer</span>
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Financial Position Summary */}
          <div className="p-5 sm:p-6 space-y-2.5 text-xs">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Position</h3>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Operating Inflows</span>
              <span className="font-mono font-semibold tabular-nums text-emerald-700">
                {formatINR(financialSummary.operatingInflows)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Operating Outflows</span>
              <span className="font-mono font-semibold tabular-nums text-rose-700">
                {formatINR(financialSummary.operatingOutflows)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
              <span className="font-semibold text-slate-700">Net Working Capital</span>
              <span className="font-mono font-bold tabular-nums text-slate-950">
                {formatINR(financialSummary.netWorkingCapital)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
