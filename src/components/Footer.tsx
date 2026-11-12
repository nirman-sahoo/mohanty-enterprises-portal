import React from 'react';
import { CompanySettings } from '../types';
import { DEFAULT_COMPANY_SETTINGS } from '../services/firebaseService';

interface FooterProps {
  settings?: CompanySettings;
}

export const Footer: React.FC<FooterProps> = ({ settings = DEFAULT_COMPANY_SETTINGS }) => {
  return (
    <footer className="h-10 bg-white border-t border-slate-200/80 px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0 z-20 select-none print:hidden">
      <span className="font-semibold text-slate-700 truncate">{settings.companyName}</span>
      <div className="flex items-center gap-4 font-mono">
        {settings.phone && <span>{settings.phone}</span>}
        {settings.email && (
          <a href={`mailto:${settings.email}`} className="hidden sm:inline hover:text-slate-900 transition-colors">
            {settings.email}
          </a>
        )}
      </div>
    </footer>
  );
};
