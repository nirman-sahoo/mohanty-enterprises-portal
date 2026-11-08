import React from 'react';
import { 
  Home,
  LayoutDashboard, 
  Users, 
  Boxes, 
  ShoppingCart, 
  ShoppingBag, 
  Receipt, 
  FileSpreadsheet, 
  CreditCard, 
  ArrowLeftRight, 
  Building2, 
  BookOpen, 
  BarChart3, 
  Settings, 
  ChevronRight,
  MessageCircle,
  LogOut,
  X
} from 'lucide-react';

export type NavTab = 
  | 'overview' 
  | 'account-master'
  | 'ledger' 
  | 'inventory' 
  | 'new-sale' 
  | 'purchase' 
  | 'expenses' 
  | 'invoices' 
  | 'banking' 
  | 'journal' 
  | 'reports' 
  | 'hr-payroll' 
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSignOut: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onSignOut,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const handleItemClick = (tab: NavTab) => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#18181B] text-slate-300 flex flex-col shrink-0 select-none border-r border-slate-800 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header with Close Button */}
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

        {/* Top Active Dashboard Tab */}
        <div className="p-3 border-b border-slate-800/80">
          <button
            onClick={() => handleItemClick('overview')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#F6B118] text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Home className={`w-4 h-4 ${activeTab === 'overview' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Navigation Scrollable Area */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {/* GROUP 1: MASTER */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 px-3 py-1">
              MASTER
            </div>
            <div className="space-y-0.5 mt-0.5">
              <button
                onClick={() => handleItemClick('account-master')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'account-master'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className={`w-3.5 h-3.5 ${activeTab === 'account-master' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Account Master</span>
                </div>
              </button>

              <button
                onClick={() => handleItemClick('ledger')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={`w-3.5 h-3.5 ${activeTab === 'ledger' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Party Master</span>
                </div>
              </button>

              <button
                onClick={() => handleItemClick('inventory')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Boxes className={`w-3.5 h-3.5 ${activeTab === 'inventory' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Item Master</span>
                </div>
              </button>
            </div>
          </div>

          {/* GROUP 2: TRANSACTIONS */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 px-3 py-1">
              TRANSACTIONS
            </div>
            <div className="space-y-0.5 mt-0.5">
              <button
                onClick={() => handleItemClick('new-sale')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'new-sale'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className={`w-3.5 h-3.5 ${activeTab === 'new-sale' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Sales</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </button>

              <button
                onClick={() => handleItemClick('purchase')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'purchase'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className={`w-3.5 h-3.5 ${activeTab === 'purchase' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Purchase</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </button>

              <button
                onClick={() => handleItemClick('expenses')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'expenses'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className={`w-3.5 h-3.5 ${activeTab === 'expenses' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Expenses</span>
                </div>
              </button>
            </div>
          </div>

          {/* GROUP 3: CORE ACCOUNTING */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 px-3 py-1">
              CORE ACCOUNTING
            </div>
            <div className="space-y-0.5 mt-0.5">
              <button
                onClick={() => handleItemClick('invoices')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'invoices'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${activeTab === 'invoices' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Receipt</span>
                </div>
              </button>

              <button
                onClick={() => handleItemClick('ledger')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className={`w-3.5 h-3.5 ${activeTab === 'ledger' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Payment</span>
                </div>
              </button>

              <button
                onClick={() => handleItemClick('banking')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'banking'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ArrowLeftRight className={`w-3.5 h-3.5 ${activeTab === 'banking' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Contra Entry</span>
                </div>
              </button>

              <button
                onClick={() => handleItemClick('banking')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'banking'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className={`w-3.5 h-3.5 ${activeTab === 'banking' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Bank Reconciliation</span>
                </div>
              </button>

              <button
                onClick={() => handleItemClick('journal')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                  activeTab === 'journal'
                    ? 'bg-[#F6B118] text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'journal' ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>Journal Voucher</span>
                </div>
              </button>
            </div>
          </div>

          {/* SYSTEM MODULES: Reports, HR/Payroll, Settings */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1">
            <button
              onClick={() => handleItemClick('reports')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-[#F6B118] text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeTab === 'reports' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>Reports</span>
            </button>

            <button
              onClick={() => handleItemClick('hr-payroll')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold transition-all text-left cursor-pointer ${
                activeTab === 'hr-payroll'
                  ? 'bg-[#F6B118] text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <Users className={`w-4 h-4 ${activeTab === 'hr-payroll' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>HR & Payroll</span>
            </button>

            <button
              onClick={() => handleItemClick('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#F6B118] text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>Settings</span>
            </button>
          </div>
        </nav>

        {/* WhatsApp Support Card at Bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 relative z-10">
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 rounded-lg text-xs transition-colors cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 fill-emerald-500/30" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium leading-none">Support</p>
              <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors mt-0.5">
                +91 98765 43210
              </p>
            </div>
          </a>
        </div>

        {/* Construction Skyline Outline Watermark Illustration at Bottom */}
        <div className="pointer-events-none opacity-20 absolute bottom-0 left-0 right-0 h-16 flex items-end">
          <svg viewBox="0 0 300 80" className="w-full text-amber-400 fill-current">
            <path d="M10 80 V50 H30 V80 H40 V40 H60 V80 H70 V30 H90 V80 H100 V60 H120 V80 H130 V20 H150 V80 H160 V45 H180 V80 H190 V35 H210 V80 H220 V55 H240 V80 H250 V25 H270 V80 H280 V50 H290 V80 Z" />
            <path d="M75 30 L80 15 H140 L145 30 Z" opacity="0.6"/>
            <line x1="80" y1="15" x2="60" y2="5" stroke="currentColor" strokeWidth="2"/>
            <line x1="60" y1="5" x2="160" y2="5" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
      </aside>
    </>
  );
};
