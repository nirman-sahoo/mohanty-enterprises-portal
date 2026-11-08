import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Bell, 
  Settings, 
  LogOut, 
  ChevronDown, 
  User, 
  Plus,
  Menu,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  Boxes,
  ArrowRight
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  onOpenRecordSale: () => void;
  operatorName?: string;
  onSignOut?: () => void;
  onNavigateToTab?: (tab: NavTab) => void;
  onToggleMobileMenu?: () => void;
}

interface NotificationItem {
  id: string;
  type: 'stock' | 'credit' | 'hr';
  title: string;
  message: string;
  time: string;
  targetTab: NavTab;
  read: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenRecordSale,
  operatorName = 'Ayushman Mohanty',
  onSignOut,
  onNavigateToTab,
  onToggleMobileMenu,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      type: 'stock',
      title: 'Low Stock Alert: Cement Inventory',
      message: 'UltraTech PPC Cement stock is at 80 bags (Minimum reorder threshold is 100 bags).',
      time: '12m ago',
      targetTab: 'inventory',
      read: false
    },
    {
      id: 'notif-2',
      type: 'credit',
      title: 'Overdue Khatabook Receivable',
      message: 'Maa Tarini Constructions has ₹1,85,000 overdue beyond 30 credit days.',
      time: '1h ago',
      targetTab: 'ledger',
      read: false
    },
    {
      id: 'notif-3',
      type: 'hr',
      title: 'HR Leave Request Awaiting Action',
      message: 'Ramesh Kumar (Yard Supervisor) applied for 2 days Casual Leave.',
      time: '3h ago',
      targetTab: 'hr-payroll',
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Format date: "Mon, 27 Oct 2026"
  const currentDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setIsNotificationsOpen(false);
    if (onNavigateToTab) {
      onNavigateToTab(notif.targetTab);
    }
  };

  return (
    <header className="h-20 bg-white border-b-2 border-amber-400 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none shadow-sm relative">
      {/* Left: Hamburger (mobile) + Brand Identity matching overview.jpeg */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5 stroke-[2.2]" />
          </button>
        )}

        {/* Official Gold Medallion Logo */}
        <img 
          src="/images/logo.png" 
          alt="Mohanty Enterprises Logo" 
          className="w-11 h-11 sm:w-13 sm:h-13 object-contain drop-shadow-sm cursor-pointer" 
          onClick={() => onNavigateToTab && onNavigateToTab('overview')}
        />

        {/* Thin vertical dark separator */}
        <div className="h-10 w-[1.5px] bg-slate-900 mx-2 sm:mx-3.5 hidden sm:block" />

        {/* Company Title & Slogan Tagline */}
        <div className="hidden sm:block">
          <div className="text-sm sm:text-base font-black text-[#0B1D3A] tracking-wider leading-tight font-sans">
            MOHANTY
          </div>
          <div className="text-sm sm:text-base font-black text-[#0B1D3A] tracking-wider leading-tight font-sans">
            ENTERPRISES
          </div>
          <div className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-700 tracking-wider uppercase mt-0.5">
            CEMENT • STEEL • CONSTRUCTION MATERIALS
          </div>
        </div>
      </div>

      {/* Center: "Building a Stronger Tomorrow... Together" with Golden Swoosh */}
      <div className="hidden xl:flex flex-col items-center justify-center">
        <span className="font-serif italic font-bold text-slate-900 text-sm tracking-wide">
          Building a Stronger Tomorrow... Together
        </span>
        <svg 
          className="w-56 h-2 text-amber-400 -mt-0.5" 
          viewBox="0 0 200 8" 
          fill="none"
        >
          <path 
            d="M4 2C55 8 145 8 196 2" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Right Controls: Date Pill, User Profile, Notifications, Settings, Logout */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Quick "+ New Sale" button on tablet/desktop */}
        <button
          onClick={onOpenRecordSale}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Order</span>
        </button>

        {/* Date Pill with Calendar Icon */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg shadow-2xs">
          <CalendarIcon className="w-4 h-4 text-slate-600" />
          <span>{currentDate}</span>
        </div>

        <span className="text-slate-300 hidden md:inline">|</span>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left"
          >
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
              <User className="w-4 h-4 text-blue-800" />
            </div>
            
            <div className="hidden sm:block leading-tight">
              <p className="text-[10px] text-slate-400 font-medium">Welcome,</p>
              <div className="flex items-center gap-1 font-bold text-xs text-slate-900">
                <span>{operatorName}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </div>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{operatorName}</p>
                <p className="text-[10px] text-slate-500 font-medium">Managing Director · Wholesale Operations</p>
              </div>
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  onOpenRecordSale();
                }}
                className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg transition-colors cursor-pointer text-left font-medium"
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>+ New Order / Estimate</span>
              </button>
              {onNavigateToTab && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onNavigateToTab('settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-left font-medium"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Terminal Configuration</span>
                </button>
              )}
              {onSignOut && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left font-medium border-t border-slate-100 mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notification Bell with Red Badge */}
        <div className="relative">
          <button 
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
            }}
            title={`Notifications (${unreadCount} unread)`}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Notifications Drawer */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs tracking-wide">Live Operations Alerts</span>
                  {unreadCount > 0 && (
                    <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-amber-300 hover:text-amber-100 font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                      !notif.read ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {notif.type === 'stock' && (
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {notif.type === 'credit' && (
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {notif.type === 'hr' && (
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs ${!notif.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{notif.message}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 mt-1.5">
                        <span>Action item</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Close Alerts Panel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings Gear */}
        <button 
          onClick={() => onNavigateToTab && onNavigateToTab('settings')}
          title="Terminal Settings"
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-amber-100 text-amber-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Sign Out Button */}
        {onSignOut && (
          <button 
            onClick={onSignOut}
            title="Sign Out"
            className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
