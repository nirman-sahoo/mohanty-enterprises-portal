import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowDownLeft, CheckCircle2 } from 'lucide-react';
import { BankAccount, CustomerLedger, MoneyReceipt, SaleRecord } from '../../types';
import { formatINR, numberToIndianWords } from '../../utils/formatters';
import { CASH_DRAWER_ID, isCashAccount } from '../../utils/accountingEngine';

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledgers: CustomerLedger[];
  sales: SaleRecord[];
  bankAccounts: BankAccount[];
  initialParty?: CustomerLedger | null;
  defaultBookType?: 'cash' | 'bank';
  defaultAccountId?: string;
  receiptPrefix?: string;
  nextSequenceNumber?: number;
  onSaveReceipt: (receipt: MoneyReceipt, ledger?: CustomerLedger) => Promise<void>;
}

interface SalesPartyOption {
  key: string;
  name: string;
  ledger?: CustomerLedger;
  outstandingDue: number;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  isOpen,
  onClose,
  ledgers,
  sales,
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

  const eligibleParties = useMemo<SalesPartyOption[]>(() => {
    const map = new Map<string, SalesPartyOption>();
    sales.forEach((sale) => {
      if (sale.status === 'Cancelled') return;
      const rawName = (sale.customerName || '').trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();
      if (map.has(key)) return;
      const matchedLedger = ledgers.find((l) => l.name.trim().toLowerCase() === key);
      map.set(key, {
        key,
        name: matchedLedger?.name || rawName,
        ledger: matchedLedger,
        outstandingDue: matchedLedger ? Math.max(0, matchedLedger.outstandingReceivable || 0) : 0,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.outstandingDue - a.outstandingDue);
  }, [sales, ledgers]);

  const [selectedPartyKey, setSelectedPartyKey] = useState<string>('');
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
    const matchedInitial = initialParty
      ? eligibleParties.find((p) => p.key === initialParty.name.trim().toLowerCase())
      : null;
    const target = matchedInitial || eligibleParties[0] || null;

    if (target) {
      setSelectedPartyKey(target.key);
      setAmount(target.outstandingDue > 0 ? String(target.outstandingDue) : '');
    } else {
      setSelectedPartyKey('');
      setAmount('');
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
  }, [isOpen, initialParty, defaultBookType, defaultAccountId, eligibleParties]);

  if (!isOpen) return null;

  const selectedParty = eligibleParties.find((p) => p.key === selectedPartyKey) || null;
  const selectedLedger = selectedParty?.ledger;
  const selectedAccount = bankAccounts.find((a) => a.id === accountId);

  const handlePartyChange = (key: string) => {
    setSelectedPartyKey(key);
    const match = eligibleParties.find((p) => p.key === key);
    if (match && match.outstandingDue > 0) {
      setAmount(String(match.outstandingDue));
    } else {
      setAmount('');
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
    if (!selectedParty || !numericAmount || numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const receiptNo = `${receiptPrefix}${String(nextSequenceNumber).padStart(4, '0')}`;
      const newReceipt: MoneyReceipt = {
        id: `rcp-${Date.now()}`,
        receiptNo,
        date,
        partyName: selectedParty.name.slice(0, 150),
        partyAddress: (selectedLedger?.address || '').slice(0, 250),
        partyPhone: (selectedLedger?.phone || '').slice(0, 30),
        amount: numericAmount,
        amountInWords: numberToIndianWords(numericAmount).slice(0, 300),
        paymentMode,
        bankAccountId: accountId || (paymentMode === 'Cash' ? CASH_DRAWER_ID : bankOnlyAccounts[0]?.id || ''),
        bankAccountName:
          selectedAccount?.bankName ||
          (paymentMode === 'Cash' ? 'Office Cash Drawer' : bankOnlyAccounts[0]?.bankName || 'Bank Account'),
        forAccount: 'Material Supply Ledger Settlement',
        paidAmount: (selectedLedger?.totalPaid || 0) + numericAmount,
        dueAmount: Math.max(0, (selectedLedger?.outstandingReceivable || 0) - numericAmount),
        referenceNo: referenceNo.trim().slice(0, 50),
        remarks: remarks.trim().slice(0, 250),
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
              <p className="text-[11px] text-slate-400">Linked to past Sales parties · Updates Party Outstandings &amp; Cash/Bank Book</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Party / Customer Account (Past Sales Only)</label>
            <select
              value={selectedPartyKey}
              disabled={eligibleParties.length === 0}
              onChange={(e) => handlePartyChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-semibold text-slate-900 disabled:opacity-60"
            >
              {eligibleParties.length === 0 ? (
                <option value="">No party with past Sales Voucher found</option>
              ) : (
                eligibleParties.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} — Due: {formatINR(p.outstandingDue)}
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedParty && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <span className="text-amber-900 font-semibold">Current Party Outstanding:</span>
              <span className="font-mono font-bold text-rose-700 tabular-nums">
                {formatINR(selectedParty.outstandingDue)}
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
                maxLength={50}
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
                maxLength={250}
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
              disabled={isSubmitting || eligibleParties.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
