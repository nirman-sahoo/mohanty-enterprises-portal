import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  CreditCard,
  MessageCircle,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Wallet,
  Landmark,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { BankAccount, CompanySettings } from '../types';
import { DEFAULT_COMPANY_SETTINGS } from '../services/firebaseService';
import { isCashAccount } from '../utils/accountingEngine';
import { formatINR } from '../utils/formatters';
import { DeleteConfirmModal } from './common/DeleteConfirmModal';

interface SettingsViewProps {
  settings?: CompanySettings;
  bankAccounts?: BankAccount[];
  onSaveSettings: (settings: CompanySettings) => Promise<void>;
  onSaveBankAccount: (account: BankAccount) => Promise<void>;
  onDeleteBankAccount: (accountId: string) => Promise<void>;
  onResetDatabase?: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings = DEFAULT_COMPANY_SETTINGS,
  bankAccounts = [],
  onSaveSettings,
  onSaveBankAccount,
  onDeleteBankAccount,
  onResetDatabase,
}) => {
  const [config, setConfig] = useState<CompanySettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Opening balance edits map
  const [openingEdits, setOpeningEdits] = useState<Record<string, string>>({});

  // Add new Bank Account state
  const [isAddBankOpen, setIsAddBankOpen] = useState<boolean>(false);
  const [newBankName, setNewBankName] = useState<string>('');
  const [newAccountNo, setNewAccountNo] = useState<string>('');
  const [newIfsc, setNewIfsc] = useState<string>('');
  const [newBranch, setNewBranch] = useState<string>('');
  const [newAccountType, setNewAccountType] = useState<'Current' | 'Cash Credit (CC)'>('Current');
  const [newOpeningBal, setNewOpeningBal] = useState<string>('0');

  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  useEffect(() => {
    setConfig(settings);
  }, [settings]);

  useEffect(() => {
    const initial: Record<string, string> = {};
    bankAccounts.forEach((acc) => {
      initial[acc.id] = String(acc.openingBalance ?? 0);
    });
    setOpeningEdits(initial);
  }, [bankAccounts]);

  const showToast = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3500);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        ...config,
        gstin: config.gstin || '',
        defaultGstRate: 0,
      });
      showToast('Company Settings saved to Firestore!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOpeningBalance = async (acc: BankAccount) => {
    const val = parseFloat(openingEdits[acc.id] || '0') || 0;
    await onSaveBankAccount({
      ...acc,
      openingBalance: val,
    });
    showToast(`Opening balance updated for ${acc.bankName}`);
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newAccountNo.trim()) return;
    const openBal = parseFloat(newOpeningBal) || 0;
    const newAcc: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: newBankName.trim(),
      accountNumber: newAccountNo.trim(),
      branch: newBranch.trim() || 'Main Branch',
      ifsc: newIfsc.trim().toUpperCase(),
      accountType: newAccountType,
      openingBalance: openBal,
      currentBalance: openBal,
      unclearedChequesCount: 0,
      status: 'Active',
    };
    await onSaveBankAccount(newAcc);
    setNewBankName('');
    setNewAccountNo('');
    setNewIfsc('');
    setNewBranch('');
    setNewOpeningBal('0');
    setIsAddBankOpen(false);
    showToast(`Added Bank Account: ${newAcc.bankName}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center border border-slate-800 shadow-2xs">
            <SettingsIcon className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise &amp; Accounting Configuration</h1>
            <p className="text-xs text-slate-500 font-medium">
              Company profile, voucher numbering, Cash/Bank opening balances &amp; accounts master
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{savedSuccess}</span>
          </div>
        )}
      </div>

      {/* Section A: Cash & Bank Accounts Master + Opening Balances */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#F6B118]" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Cash &amp; Bank Accounts Master (Opening Balances)</h2>
              <p className="text-[11px] text-slate-500">
                Set opening balances for Cash Book &amp; Bank Books or add corporate bank accounts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddBankOpen(!isAddBankOpen)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddBankOpen ? 'Close Form' : 'Add Bank Account'}</span>
          </button>
        </div>

        {isAddBankOpen && (
          <form
            onSubmit={handleAddBankAccount}
            className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
          >
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bank Name *</label>
              <input
                type="text"
                required
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="Bank account name"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Number *</label>
              <input
                type="text"
                required
                value={newAccountNo}
                onChange={(e) => setNewAccountNo(e.target.value)}
                placeholder="Account Number"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={newIfsc}
                onChange={(e) => setNewIfsc(e.target.value)}
                placeholder="Bank IFSC code"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Branch</label>
              <input
                type="text"
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder="Branch city / address"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Type</label>
              <select
                value={newAccountType}
                onChange={(e) => setNewAccountType(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
              >
                <option value="Current">Current A/C</option>
                <option value="Cash Credit (CC)">Cash Credit (CC)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Opening Balance (₹)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={newOpeningBal}
                  onChange={(e) => setNewOpeningBal(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg shrink-0 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {bankAccounts.map((acc) => {
            const cash = isCashAccount(acc);
            return (
              <div
                key={acc.id}
                className="p-3.5 bg-white hover:bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      cash ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {cash ? <Wallet className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{acc.bankName}</p>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      {cash
                        ? 'Physical Safe Drawer'
                        : `A/C ${acc.accountNumber}${acc.ifsc ? ` · IFSC ${acc.ifsc}` : ''}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-[11px] font-semibold text-slate-500">Opening Bal (₹):</label>
                  <input
                    type="number"
                    step="any"
                    value={openingEdits[acc.id] ?? '0'}
                    onChange={(e) => setOpeningEdits({ ...openingEdits, [acc.id]: e.target.value })}
                    className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-right"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveOpeningBalance(acc)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg cursor-pointer"
                  >
                    Update
                  </button>
                  {!cash && (
                    <button
                      type="button"
                      onClick={() => setAccountToDelete(acc)}
                      title="Delete Bank Account"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section B: Company Legal & Voucher Configuration Form */}
      <form onSubmit={handleSaveConfig} className="space-y-6 text-xs">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-[#F6B118]" />
            <h2 className="font-bold text-slate-900 text-sm">Company Legal Profile (Synced to Invoices &amp; Receipts)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Company Trade Name</label>
              <input
                type="text"
                value={config.companyName}
                onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Managing Director / Proprietor</label>
              <input
                type="text"
                value={config.directorName}
                onChange={(e) => setConfig({ ...config, directorName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Trade Tagline</label>
              <input
                type="text"
                value={config.tradeTagline}
                onChange={(e) => setConfig({ ...config, tradeTagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Header Slogan</label>
              <input
                type="text"
                value={config.slogan}
                onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">PAN Number</label>
              <input
                type="text"
                value={config.pan}
                onChange={(e) => setConfig({ ...config, pan: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Registered Yard &amp; Office Address</label>
            <input
              type="text"
              value={config.address}
              onChange={(e) => setConfig({ ...config, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Primary Email</label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Accounts &amp; Dispatch Phone</label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        {/* Voucher Numbering Prefixes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-[#F6B118]" />
            <h2 className="font-bold text-slate-900 text-sm">Voucher Numbering Prefixes</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Sales Bill Prefix</label>
              <input
                type="text"
                value={config.invoicePrefix}
                onChange={(e) => setConfig({ ...config, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Purchase Voucher Prefix</label>
              <input
                type="text"
                value={config.purchasePrefix}
                onChange={(e) => setConfig({ ...config, purchasePrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Money Receipt Prefix</label>
              <input
                type="text"
                value={config.receiptPrefix}
                onChange={(e) => setConfig({ ...config, receiptPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Voucher Prefix</label>
              <input
                type="text"
                value={config.paymentPrefix}
                onChange={(e) => setConfig({ ...config, paymentPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Contra Prefix</label>
              <input
                type="text"
                value={config.contraPrefix}
                onChange={(e) => setConfig({ ...config, contraPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Bill Display Bank Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-[#F6B118]" />
            <h2 className="font-bold text-slate-900 text-sm">Default Bank Printed on Bills &amp; Receipts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Bank Name</label>
              <input
                type="text"
                value={config.bankName}
                onChange={(e) => setConfig({ ...config, bankName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Account Number</label>
              <input
                type="text"
                value={config.bankAccount}
                onChange={(e) => setConfig({ ...config, bankAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">IFSC Code</label>
              <input
                type="text"
                value={config.bankIfsc}
                onChange={(e) => setConfig({ ...config, bankIfsc: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold uppercase"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageCircle className="w-4 h-4 text-[#F6B118]" />
            <h2 className="font-bold text-slate-900 text-sm">Workflow Automation</h2>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoPrintEstimate}
              onChange={(e) => setConfig({ ...config, autoPrintEstimate: e.target.checked })}
              className="w-4 h-4 text-amber-500 rounded"
            />
            <div>
              <p className="font-bold text-slate-900">Open Bill Preview after posting Sales Voucher</p>
              <p className="text-[11px] text-slate-500">Shows printable bill / estimate modal right after voucher confirmation</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={config.whatsappAlerts}
              onChange={(e) => setConfig({ ...config, whatsappAlerts: e.target.checked })}
              className="w-4 h-4 text-amber-500 rounded"
            />
            <div>
              <p className="font-bold text-slate-900">Enable Quick WhatsApp Voucher Sharing</p>
              <p className="text-[11px] text-slate-500">Show one-click WhatsApp dispatch and payment reminder buttons</p>
            </div>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving to Firestore...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {onResetDatabase && (
        <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Clear Database &amp; Start Fresh</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanently deletes all Sales Vouchers, Purchase Vouchers, Party Ledgers, Cash/Bank entries, Inventory SKUs, and custom banks from Firestore so you can start clean in production.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Data</span>
          </button>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!accountToDelete}
        title="Delete Bank Account?"
        message="This removes the bank account from Settings and Bank Book selector. Existing posted vouchers referencing this account will still show in Consolidated Bank Book."
        itemDetails={
          accountToDelete
            ? [
                { label: 'Bank Name', value: accountToDelete.bankName },
                { label: 'Account No', value: accountToDelete.accountNumber },
                { label: 'Opening Balance', value: formatINR(accountToDelete.openingBalance || 0) },
              ]
            : undefined
        }
        onCancel={() => setAccountToDelete(null)}
        onConfirm={async () => {
          if (accountToDelete) {
            await onDeleteBankAccount(accountToDelete.id);
          }
        }}
      />

      <DeleteConfirmModal
        isOpen={isResetModalOpen}
        title="Reset Entire Production Database?"
        message="This will permanently erase all vouchers, inventory SKUs, party outstandings, payments, and custom bank accounts, and reset Office Cash Drawer to ₹0 and Company Configuration to clean non-GST production defaults. This cannot be undone."
        confirmButtonText="Yes, Clear All Records"
        onCancel={() => setIsResetModalOpen(false)}
        onConfirm={async () => {
          if (onResetDatabase) {
            await onResetDatabase();
            showToast('All database collections cleared for a fresh start.');
          }
        }}
      />
    </div>
  );
};
