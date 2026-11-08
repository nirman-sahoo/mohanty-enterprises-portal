import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  FileText, 
  Printer, 
  MessageCircle, 
  ShieldCheck, 
  Save, 
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  CreditCard
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [config, setConfig] = useState({
    companyName: 'MOHANTY ENTERPRISES',
    directorName: 'Ayushman Mohanty',
    designation: 'Managing Director',
    tradeTagline: 'CEMENT • STEEL • CONSTRUCTION MATERIALS',
    slogan: 'Building a Stronger Tomorrow... Together',
    gstin: '21AAAPM1234L1Z5',
    pan: 'AAAPM1234L',
    email: 'mohantyenterprises.ayushman@gmail.com',
    phone: '+91 98765 43210',
    address: 'Plot No. 42, Industrial Estate, Choudwar, Cuttack, Odisha - 754025',
    invoicePrefix: 'ME-2026-',
    receiptPrefix: 'MR-2026-',
    bankName: 'State Bank of India',
    bankAccount: '394821004921',
    bankIfsc: 'SBIN0001234',
    whatsappAlerts: true,
    autoPrintEstimate: true,
    roundOffInvoices: true
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center border border-slate-800 shadow-2xs">
            <SettingsIcon className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Enterprise & Terminal Settings
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Legal entity credentials, GSTIN registration, banking, print templates, and WhatsApp gateway
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Card 1: Company Profile */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-[#F6B118]" />
            <h2 className="font-bold text-slate-900 text-sm">Company Legal Registration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Company Trade Name</label>
              <input
                type="text"
                value={config.companyName}
                onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Managing Director / Proprietor</label>
              <input
                type="text"
                value={config.directorName}
                onChange={(e) => setConfig({ ...config, directorName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">GSTIN (Odisha State Code: 21)</label>
              <input
                type="text"
                value={config.gstin}
                onChange={(e) => setConfig({ ...config, gstin: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Permanent Account Number (PAN)</label>
              <input
                type="text"
                value={config.pan}
                onChange={(e) => setConfig({ ...config, pan: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Registered Wholesale Yard & Office Address</label>
            <input
              type="text"
              value={config.address}
              onChange={(e) => setConfig({ ...config, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Primary Email</label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">WhatsApp & Support Phone</label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Invoicing & Banking Details on Estimates */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-[#F6B118]" />
            <h2 className="font-bold text-slate-900 text-sm">Official Bank Account Display on Invoices</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Bank Name</label>
              <input
                type="text"
                value={config.bankName}
                onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Account Number</label>
              <input
                type="text"
                value={config.bankAccount}
                onChange={(e) => setConfig({ ...config, bankAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">IFSC Code</label>
              <input
                type="text"
                value={config.bankIfsc}
                onChange={(e) => setConfig({ ...config, bankIfsc: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Automation & Integrations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageCircle className="w-4 h-4 text-[#F6B118]" />
            <h2 className="font-bold text-slate-900 text-sm">Automation & Customer Communication</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={config.whatsappAlerts}
                onChange={(e) => setConfig({ ...config, whatsappAlerts: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
              />
              <div>
                <p className="font-bold text-slate-900">Automatic WhatsApp Dispatch Notifications</p>
                <p className="text-[11px] text-slate-500">Send instant truck loading and bilty updates to contractor mobile numbers upon order creation</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={config.autoPrintEstimate}
                onChange={(e) => setConfig({ ...config, autoPrintEstimate: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
              />
              <div>
                <p className="font-bold text-slate-900">Auto-prompt Invoicing Modal after Sales Entry</p>
                <p className="text-[11px] text-slate-500">Automatically display printable commercial tax invoice once verified</p>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.2]" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
