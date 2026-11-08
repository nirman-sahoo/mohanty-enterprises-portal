import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="h-11 bg-[#08162B] border-t-2 border-amber-400 px-6 flex items-center justify-between text-xs text-slate-300 shrink-0 z-20 select-none">
      {/* Left Contact Information */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Phone */}
        <div className="flex items-center gap-1.5 text-slate-200">
          <Phone className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
          <span className="font-semibold">+91 98765 43210</span>
        </div>

        <span className="text-amber-500/70 hidden sm:inline">|</span>

        {/* Email */}
        <div className="flex items-center gap-1.5 text-slate-200">
          <Mail className="w-3.5 h-3.5 text-amber-400" />
          <a 
            href="mailto:mohantyenterprises.ayushman@gmail.com" 
            className="hover:text-amber-400 transition-colors"
          >
            mohantyenterprises.ayushman@gmail.com
          </a>
        </div>

        <span className="text-amber-500/70 hidden md:inline">|</span>

        {/* Location */}
        <div className="hidden md:flex items-center gap-1.5 text-slate-200">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>Odisha, India</span>
        </div>
      </div>

      {/* Right Brand Motto */}
      <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px] font-medium">
        <span className="text-white font-semibold">Mohanty Enterprises</span>
        <span className="text-amber-500/70">|</span>
        <span className="text-slate-300">Building Trust Since Day One</span>
      </div>
    </footer>
  );
};
