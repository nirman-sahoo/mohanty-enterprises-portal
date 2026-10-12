import React from 'react';
import { Plus } from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  onOpenRecordSale: () => void;
  operatorName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenRecordSale,
  operatorName = 'Ayushman Mohanty',
}) => {
  // Format current date cleanly
  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getBreadcrumbTitle = (tab: NavTab) => {
    switch (tab) {
      case 'overview':
        return 'Executive Overview';
      case 'new-sale':
        return 'Sale Entry Terminal';
      case 'invoices':
        return 'Commercial Invoices';
      case 'inventory':
        return 'Material Inventory';
      case 'ledger':
        return 'Party Accounts & Ledger';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-slate-900">Mohanty Enterprises</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 font-medium">{getBreadcrumbTitle(activeTab)}</span>
      </div>

      {/* Right side: Current Date, User Profile, SINGLE prominent "+ Record Sale" button */}
      <div className="flex items-center gap-5">
        {/* Current Date */}
        <div className="hidden md:flex items-center text-xs text-slate-500 font-medium">
          <span>{currentDate}</span>
        </div>

        {/* User Profile */}
        <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
            {getInitials(operatorName)}
          </div>
          <div className="text-left text-xs leading-tight">
            <p className="font-semibold text-slate-800">{operatorName}</p>
            <p className="text-slate-500 text-[11px]">Wholesale Desk</p>
          </div>
        </div>

        {/* SINGLE prominent "+ Record Sale" primary button */}
        <button
          onClick={onOpenRecordSale}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>+ Record Sale</span>
        </button>
      </div>
    </header>
  );
};
