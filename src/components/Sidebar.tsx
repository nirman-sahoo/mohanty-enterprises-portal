import React from 'react';
import {
  Home,
  ShoppingCart,
  ShoppingBag,
  Building2,
  Wallet,
  ArrowLeftRight,
  FileSpreadsheet,
  ClipboardList,
  Boxes,
  Users,
  Landmark,
  Settings,
  ChevronRight,
  MessageCircle,
  X,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'sales-voucher'
  | 'purchase-voucher'
  | 'bank-book'
  | 'cash-book'
  | 'contra-entry'
  | 'sales-register'
  | 'purchase-register'
  | 'stock-report'
  | 'party-outstandings'
  | 'payables'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSignOut: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  companyPhone?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile = false,
  onCloseMobile,
  companyPhone = '',
}) => {
  const handleItemClick = (tab: NavTab) => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navItemClass = (tab: NavTab) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
      activeTab === tab
        ? 'bg-[#F6B118] text-slate-950 font-bold'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const iconClass = (tab: NavTab) =>
    `w-3.5 h-3.5 shrink-0 ${activeTab === tab ? 'text-slate-950' : 'text-slate-400'}`;

  return (
    <>
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#18181B] text-slate-300 flex flex-col shrink-0 select-none border-r border-slate-800 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800/80 md:hidden">
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
            <span className="font-black text-xs text-white tracking-wider">MOHANTY ENTERPRISES</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard Overview */}
        <div className="p-3 border-b border-slate-800/80">
          <button
            onClick={() => handleItemClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#F6B118] text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Home className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {/* GROUP 1: TRANSACTIONS */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 px-3 py-1">
              Transactions
            </div>
            <div className="space-y-0.5 mt-1">
              <button onClick={() => handleItemClick('sales-voucher')} className={navItemClass('sales-voucher')}>
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className={iconClass('sales-voucher')} />
                  <span>Sales Voucher</span>
                </div>
                <ChevronRight className={`w-3 h-3 ${activeTab === 'sales-voucher' ? 'text-slate-900' : 'text-slate-600'}`} />
              </button>

              <button onClick={() => handleItemClick('purchase-voucher')} className={navItemClass('purchase-voucher')}>
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className={iconClass('purchase-voucher')} />
                  <span>Purchase Voucher</span>
                </div>
                <ChevronRight className={`w-3 h-3 ${activeTab === 'purchase-voucher' ? 'text-slate-900' : 'text-slate-600'}`} />
              </button>
            </div>
          </div>

          {/* GROUP 2: BANKING */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 px-3 py-1">
              Banking
            </div>
            <div className="space-y-0.5 mt-1">
              <button onClick={() => handleItemClick('bank-book')} className={navItemClass('bank-book')}>
                <div className="flex items-center gap-2.5">
                  <Building2 className={iconClass('bank-book')} />
                  <span>Bank Book</span>
                </div>
              </button>

              <button onClick={() => handleItemClick('cash-book')} className={navItemClass('cash-book')}>
                <div className="flex items-center gap-2.5">
                  <Wallet className={iconClass('cash-book')} />
                  <span>Cash Book</span>
                </div>
              </button>

              <button onClick={() => handleItemClick('contra-entry')} className={navItemClass('contra-entry')}>
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight className={iconClass('contra-entry')} />
                  <span>Contra Entry</span>
                </div>
              </button>
            </div>
          </div>

          {/* GROUP 3: REPORTS */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 px-3 py-1">
              Reports
            </div>
            <div className="space-y-0.5 mt-1">
              <button onClick={() => handleItemClick('sales-register')} className={navItemClass('sales-register')}>
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className={iconClass('sales-register')} />
                  <span>Sales Register</span>
                </div>
              </button>

              <button onClick={() => handleItemClick('purchase-register')} className={navItemClass('purchase-register')}>
                <div className="flex items-center gap-2.5">
                  <ClipboardList className={iconClass('purchase-register')} />
                  <span>Purchase Register</span>
                </div>
              </button>

              <button onClick={() => handleItemClick('stock-report')} className={navItemClass('stock-report')}>
                <div className="flex items-center gap-2.5">
                  <Boxes className={iconClass('stock-report')} />
                  <span>Stock Report</span>
                </div>
              </button>

              <button onClick={() => handleItemClick('party-outstandings')} className={navItemClass('party-outstandings')}>
                <div className="flex items-center gap-2.5">
                  <Users className={iconClass('party-outstandings')} />
                  <span>Party Outstandings</span>
                </div>
              </button>

              <button onClick={() => handleItemClick('payables')} className={navItemClass('payables')}>
                <div className="flex items-center gap-2.5">
                  <Landmark className={iconClass('payables')} />
                  <span>Payables</span>
                </div>
              </button>
            </div>
          </div>

          {/* GROUP 4: CONFIGURATION */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 px-3 py-1">
              Configuration
            </div>
            <div className="space-y-0.5 mt-1">
              <button onClick={() => handleItemClick('settings')} className={navItemClass('settings')}>
                <div className="flex items-center gap-2.5">
                  <Settings className={iconClass('settings')} />
                  <span>Settings</span>
                </div>
              </button>
            </div>
          </div>
        </nav>

        {/* WhatsApp Support Card */}
        {companyPhone.trim() && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 relative z-10">
            <a
              href={`https://wa.me/${companyPhone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 rounded-lg text-xs transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 fill-emerald-500/30" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-medium leading-none">Accounts Desk</p>
                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors mt-0.5 font-mono">
                  {companyPhone}
                </p>
              </div>
            </a>
          </div>
        )}
      </aside>
    </>
  );
};
