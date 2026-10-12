import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Boxes, 
  BookOpen, 
  LogOut,
  Building2
} from 'lucide-react';

export type NavTab = 'overview' | 'new-sale' | 'invoices' | 'inventory' | 'ledger';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onSignOut,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'new-sale', label: 'New Sale', icon: PlusCircle },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none z-20">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 shrink-0">
          <Building2 className="w-5 h-5 text-slate-950 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white tracking-tight truncate">
            Mohanty Enterprises
          </h2>
          <p className="text-[11px] font-medium text-slate-400 truncate">
            Wholesale Trading Terminal
          </p>
        </div>
      </div>

      {/* Navigation Links - Clean, Clutter-Free, NO Alert Widgets or Bottom Banners */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Session & Sign Out at bottom */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/40 text-xs">
          <div className="min-w-0">
            <p className="font-semibold text-slate-200 truncate">Ayushman Mohanty</p>
            <p className="text-[11px] text-slate-400 truncate">Managing Director</p>
          </div>
          <button
            onClick={onSignOut}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
