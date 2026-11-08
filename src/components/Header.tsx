import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Bell, 
  Settings, 
  LogOut, 
  ChevronDown, 
  User, 
  Plus 
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  onOpenRecordSale: () => void;
  operatorName?: string;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenRecordSale,
  operatorName = 'Ayushman Mohanty',
  onSignOut,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Format date matching the screenshot style: "Mon, 27 Oct 2026"
  const currentDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="h-20 bg-white border-b-2 border-amber-400 px-6 flex items-center justify-between shrink-0 z-30 select-none shadow-sm">
      {/* Left: Brand Identity matching overview.jpeg */}
      <div className="flex items-center">
        {/* Official Gold Medallion Logo */}
        <img 
          src="/images/logo.png" 
          alt="Mohanty Enterprises Logo" 
          className="w-12 h-12 sm:w-13 sm:h-13 object-contain drop-shadow-sm" 
        />

        {/* Thin vertical dark separator */}
        <div className="h-10 w-[1.5px] bg-slate-900 mx-3 sm:mx-3.5 hidden sm:block" />

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
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Date Pill with Calendar Icon */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg shadow-2xs">
          <CalendarIcon className="w-4 h-4 text-slate-600" />
          <span>{currentDate}</span>
        </div>

        <span className="text-slate-300 hidden md:inline">|</span>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left"
          >
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs">
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
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{operatorName}</p>
                <p className="text-[10px] text-slate-500">Managing Director · Wholesale</p>
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
              {onSignOut && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notification Bell with Red Badge "2" */}
        <div className="relative">
          <button 
            title="Notifications (2 Unread)"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
              2
            </span>
          </button>
        </div>

        {/* Settings Gear */}
        <button 
          title="Terminal Settings"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
