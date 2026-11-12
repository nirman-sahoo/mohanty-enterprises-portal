import React, { useMemo, useState } from 'react';
import {
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Menu,
  AlertTriangle,
  Clock,
  Landmark,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { CustomerLedger, InventoryItem, SupplierPayableSummary } from '../types';
import { formatINR } from '../utils/formatters';

interface HeaderProps {
  activeTab: NavTab;
  onNewSalesVoucher: () => void;
  operatorName?: string;
  companyName?: string;
  companyTagline?: string;
  companySlogan?: string;
  inventory?: InventoryItem[];
  ledgers?: CustomerLedger[];
  payables?: SupplierPayableSummary[];
  onSignOut?: () => void;
  onNavigateToTab?: (tab: NavTab) => void;
  onToggleMobileMenu?: () => void;
}

interface LiveAlert {
  id: string;
  type: 'stock' | 'receivable' | 'payable';
  title: string;
  message: string;
  targetTab: NavTab;
}

const TAB_LABELS: Record<NavTab, string> = {
  dashboard: 'Overview',
  'sales-voucher': 'Sales Voucher',
  'purchase-voucher': 'Purchase Voucher',
  'bank-book': 'Bank Book',
  'cash-book': 'Cash Book',
  'contra-entry': 'Contra Entry',
  'sales-register': 'Sales Register',
  'purchase-register': 'Purchase Register',
  'stock-report': 'Stock Report',
  'party-outstandings': 'Party Outstandings',
  payables: 'Supplier Payables',
  settings: 'Settings',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNewSalesVoucher,
  operatorName = 'Administrator',
  companyName = 'MOHANTY ENTERPRISES',
  inventory = [],
  ledgers = [],
  payables = [],
  onSignOut,
  onNavigateToTab,
  onToggleMobileMenu,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const liveAlerts = useMemo<LiveAlert[]>(() => {
    const alerts: LiveAlert[] = [];

    const lowStock = inventory.filter((i) => i.stockLevel <= i.reorderLevel);
    if (lowStock.length > 0) {
      const sample = lowStock.slice(0, 2).map((i) => `${i.name} (${i.stockLevel} ${i.unit})`).join(', ');
      alerts.push({
        id: `low-stock-${lowStock.length}`,
        type: 'stock',
        title: `${lowStock.length} Item${lowStock.length > 1 ? 's' : ''} Below Reorder Level`,
        message: `${sample}${lowStock.length > 2 ? ` +${lowStock.length - 2} more` : ''}`,
        targetTab: 'stock-report',
      });
    }

    const dueParties = ledgers.filter((l) => l.outstandingReceivable > 0.5);
    if (dueParties.length > 0) {
      const totalDue = dueParties.reduce((s, l) => s + l.outstandingReceivable, 0);
      alerts.push({
        id: `receivable-${dueParties.length}-${Math.round(totalDue)}`,
        type: 'receivable',
        title: `${dueParties.length} Party Receivable${dueParties.length > 1 ? 's' : ''} Due`,
        message: `Total pending collection ${formatINR(totalDue)} across active party accounts.`,
        targetTab: 'party-outstandings',
      });
    }

    const dueSuppliers = payables.filter((p) => p.outstandingPayable > 0.5);
    if (dueSuppliers.length > 0) {
      const totalPay = dueSuppliers.reduce((s, p) => s + p.outstandingPayable, 0);
      alerts.push({
        id: `payable-${dueSuppliers.length}-${Math.round(totalPay)}`,
        type: 'payable',
        title: `${dueSuppliers.length} Supplier Payable${dueSuppliers.length > 1 ? 's' : ''} Pending`,
        message: `Outstanding vendor balance ${formatINR(totalPay)} awaiting settlement.`,
        targetTab: 'payables',
      });
    }

    return alerts.filter((a) => !dismissedIds.includes(a.id));
  }, [inventory, ledgers, payables, dismissedIds]);

  const currentDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const initials = operatorName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('') || 'AD';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none relative print:hidden">
      {/* Left Brand + Active Section */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5 stroke-[2]" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onNavigateToTab && onNavigateToTab('dashboard')}
          className="flex items-center gap-2.5 text-left cursor-pointer group min-w-0"
        >
          <img
            src="/images/logo.png"
            alt={companyName}
            className="w-8 h-8 object-contain shrink-0"
          />
          <span className="hidden sm:inline font-bold text-sm text-slate-900 tracking-tight truncate">
            {companyName}
          </span>
        </button>

        <span className="hidden md:inline text-slate-300 text-sm">/</span>
        <span className="hidden md:inline text-xs font-semibold text-slate-500 truncate">
          {TAB_LABELS[activeTab] || 'Workspace'}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden lg:inline text-xs font-medium text-slate-400 mr-1">
          {currentDate}
        </span>

        {activeTab !== 'sales-voucher' && (
          <button
            onClick={onNewSalesVoucher}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Sales Voucher</span>
          </button>
        )}

        {/* Live Accounting Alerts */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
            }}
            title={`Accounting Alerts (${liveAlerts.length})`}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {liveAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {liveAlerts.length}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <span className="font-semibold text-xs">Accounting &amp; Stock Alerts</span>
                {liveAlerts.length > 0 && (
                  <button
                    onClick={() => setDismissedIds(liveAlerts.map((a) => a.id))}
                    className="text-[11px] text-amber-300 hover:text-amber-100 font-semibold cursor-pointer"
                  >
                    Dismiss all
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {liveAlerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 space-y-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                    <p className="font-semibold text-slate-700">All books &amp; stock levels clear</p>
                    <p className="text-[11px] text-slate-400">No pending alerts right now.</p>
                  </div>
                ) : (
                  liveAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        if (onNavigateToTab) onNavigateToTab(alert.targetTab);
                      }}
                      className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3"
                    >
                      <div className="mt-0.5 shrink-0">
                        {alert.type === 'stock' && (
                          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {alert.type === 'receivable' && (
                          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {alert.type === 'payable' && (
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                            <Landmark className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900">{alert.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{alert.message}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 mt-1.5">
                          <span>Open Report</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => onNavigateToTab && onNavigateToTab('settings')}
          title="Settings"
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-slate-900 text-amber-400'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative pl-1">
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              {initials}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-700 max-w-[120px] truncate">
              {operatorName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{operatorName}</p>
                <p className="text-[11px] text-slate-400">Accounts Workspace</p>
              </div>
              {onNavigateToTab && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onNavigateToTab('settings');
                  }}
                  className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-left font-medium"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Settings</span>
                </button>
              )}
              {onSignOut && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left font-medium mt-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
