import React, { useEffect, useState } from 'react';
import { X, ArrowDownLeft, CheckCircle2 } from 'lucide-react';
import { BankAccount, CustomerLedger, MoneyReceipt } from '../../types';
import { formatINR, numberToIndianWords } from '../../utils/formatters';
import { CASH_DRAWER_ID, isCashAccount } from '../../utils/accountingEngine';

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledgers: CustomerLedger[];
  bankAccounts: BankAccount[];
  initialParty?: CustomerLedger | null;
  defaultBookType?: 'cash' | 'bank';
  defaultAccountId?: string;
  receiptPrefix?: string;
  nextSequenceNumber?: number;
  onSaveReceipt: (receipt: MoneyReceipt, ledger?: CustomerLedger) => Promise<void>;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  isOpen,
  onClose,
  ledgers,
  bankAccounts,
  initialParty = null,
  defaultBookType = 'bank',
  defaultAccountId,
  receiptPrefix = 'MR/',
  nextSequenceNumber = 1,
  onSaveReceipt,
}) => {
  const cashAccount = bankAccounts.find((a) => isCashAccount(a));
  const bankOnlyAccounts = bankAccounts.filter((a) => !isCashAccount(a));

  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');
  const [partyNameManual, setPartyNameManual] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<MoneyReceipt['paymentMode']>(
    defaultBookType === 'cash' ? 'Cash' : 'RTGS / NEFT'
  );
  const [accountId, setAccountId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDate(new Date().toISOString().split('T')[0]);
    if (initialParty) {
      setSelectedLedgerId(initialParty.id);
      setPartyNameManual(initialParty.name);
      setAmount(initialParty.outstandingReceivable > 0 ? String(initialParty.outstandingReceivable) : '');
    } else {
      const firstDue = ledgers.find((l) => l.outstandingReceivable > 0) || ledgers[0];
      setSelectedLedgerId(firstDue ? firstDue.id : '__manual__');
      setPartyNameManual(firstDue ? firstDue.name : '');
      setAmount(firstDue && firstDue.outstandingReceivable > 0 ? String(firstDue.outstandingReceivable) : '');
    }

    if (defaultBookType === 'cash') {
      setPaymentMode('Cash');
      setAccountId(cashAccount?.id || CASH_DRAWER_ID);
    } else {
      setPaymentMode('RTGS / NEFT');
      setAccountId(defaultAccountId || bankOnlyAccounts[0]?.id || cashAccount?.id || CASH_DRAWER_ID);
    }
    setReferenceNo('');
    setRemarks('');
  }, [isOpen, initialParty, defaultBookType, defaultAccountId]);

  if (!isOpen) return null;

  const selectedLedger = ledgers.find((l) => l.id === selectedLedgerId);
  const selectedAccount = bankAccounts.find((a) => a.id === accountId);

  const handlePartyChange = (val: string) => {
    setSelectedLedgerId(val);
    const match = ledgers.find((l) => l.id === val);
    if (match) {
      setPartyNameManual(match.name);
      if (match.outstandingReceivable > 0) {
        setAmount(String(match.outstandingReceivable));
      }
    } else {
      setPartyNameManual('');
    }
  };

  const handleModeChange = (mode: MoneyReceipt['paymentMode']) => {
    setPaymentMode(mode);
    if (mode === 'Cash') {
      setAccountId(cashAccount?.id || CASH_DRAWER_ID);
    } else if (accountId === CASH_DRAWER_ID || (selectedAccount && isCashAccount(selectedAccount))) {
      if (bankOnlyAccounts[0]) setAccountId(bankOnlyAccounts[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    const partyName = selectedLedger ? selectedLedger.name : partyNameManual.trim();
    if (!partyName || !numericAmount || numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const receiptNo = `${receiptPrefix}${String(nextSequenceNumber).padStart(4, '0')}`;
      const newReceipt: MoneyReceipt = {
        id: `rcp-${Date.now()}`,
        receiptNo,
        date,
        partyName,
        partyAddress: selectedLedger?.address || '',
        partyPhone: selectedLedger?.phone || '',
        amount: numericAmount,
        amountInWords: numberToIndianWords(numericAmount),
        paymentMode,
        bankAccountId: accountId || (paymentMode === 'Cash' ? CASH_DRAWER_ID : bankOnlyAccounts[0]?.id || ''),
        bankAccountName:
          selectedAccount?.bankName ||
          (paymentMode === 'Cash' ? 'Office Cash Drawer' : bankOnlyAccounts[0]?.bankName || 'Bank Account'),
        forAccount: 'Material Supply Ledger Settlement',
        paidAmount: (selectedLedger?.totalPaid || 0) + numericAmount,
        dueAmount: Math.max(0, (selectedLedger?.outstandingReceivable || 0) - numericAmount),
        referenceNo: referenceNo.trim(),
        remarks: remarks.trim(),
      };

      await onSaveReceipt(newReceipt, selectedLedger);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-400">
          <div className="flex items-center gap-2.5">
            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm tracking-wide">Record Customer Receipt (Money Receipt)</h3>
              <p className="text-[11px] text-slate-400">Updates Party Outstandings &amp; Cash/Bank Book simultaneously</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Party / Customer Account</label>
            <select
              value={selectedLedgerId}
              onChange={(e) => handlePartyChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-semibold text-slate-900"
            >
              {ledgers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — Due: {formatINR(l.outstandingReceivable)}
                </option>
              ))}
              <option value="__manual__">+ Enter Custom Party Name</option>
            </select>
          </div>

          {selectedLedgerId === '__manual__' && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">Custom Party Name</label>
              <input
                type="text"
                required
                value={partyNameManual}
                onChange={(e) => setPartyNameManual(e.target.value)}
                placeholder="Enter customer or contractor name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-semibold"
              />
            </div>
          )}

          {selectedLedger && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <span className="text-amber-900 font-semibold">Current Party Outstanding:</span>
              <span className="font-mono font-bold text-rose-700 tabular-nums">
                {formatINR(selectedLedger.outstandingReceivable)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Amount Received (₹) *</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Receipt Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => handleModeChange(e.target.value as MoneyReceipt['paymentMode'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-semibold"
              >
                <option value="Cash">Cash (Safe Drawer)</option>
                <option value="RTGS / NEFT">RTGS / NEFT</option>
                <option value="UPI / QR">UPI / QR</option>
                <option value="Cheque / DD">Cheque / DD</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Deposit Into Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-semibold"
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">UTR / Cheque / Ref No</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional reference"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Narration / Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Payment narration or notes"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting...' : 'Post Receipt & Generate Slip'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
