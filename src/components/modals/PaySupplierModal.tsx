import React, { useEffect, useState } from 'react';
import { X, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { BankAccount, PaymentVoucher, PurchaseRecord, SupplierPayableSummary } from '../../types';
import { formatINR } from '../../utils/formatters';
import { CASH_DRAWER_ID, getPurchaseLiveStatus, isCashAccount } from '../../utils/accountingEngine';

interface PaySupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  payables: SupplierPayableSummary[];
  bankAccounts: BankAccount[];
  paymentVouchers: PaymentVoucher[];
  initialSupplier?: SupplierPayableSummary | null;
  defaultBookType?: 'cash' | 'bank';
  defaultAccountId?: string;
  paymentPrefix?: string;
  nextSequenceNumber?: number;
  onSavePaymentVoucher: (voucher: PaymentVoucher) => Promise<void>;
}

export const PaySupplierModal: React.FC<PaySupplierModalProps> = ({
  isOpen,
  onClose,
  payables,
  bankAccounts,
  paymentVouchers,
  initialSupplier = null,
  defaultBookType = 'bank',
  defaultAccountId,
  paymentPrefix = 'PAY/',
  nextSequenceNumber = 1,
  onSavePaymentVoucher,
}) => {
  const cashAccount = bankAccounts.find((a) => isCashAccount(a));
  const bankOnlyAccounts = bankAccounts.filter((a) => !isCashAccount(a));

  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('');
  const [customSupplierName, setCustomSupplierName] = useState<string>('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentVoucher['paymentMode']>(
    defaultBookType === 'cash' ? 'Cash' : 'RTGS / NEFT'
  );
  const [accountId, setAccountId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDate(new Date().toISOString().split('T')[0]);
    const targetSupplier =
      initialSupplier || payables.find((p) => p.outstandingPayable > 0) || payables[0] || null;

    if (targetSupplier) {
      setSelectedSupplierName(targetSupplier.supplierName);
      setCustomSupplierName('');
      const unpaidBill = targetSupplier.purchases.find(
        (po) => getPurchaseLiveStatus(po, paymentVouchers).balanceDue > 0.5
      );
      setSelectedPurchaseId(unpaidBill ? unpaidBill.id : '');
      setAmount(
        unpaidBill
          ? String(Math.round(getPurchaseLiveStatus(unpaidBill, paymentVouchers).balanceDue))
          : targetSupplier.outstandingPayable > 0
          ? String(Math.round(targetSupplier.outstandingPayable))
          : ''
      );
    } else {
      setSelectedSupplierName('__manual__');
      setCustomSupplierName('');
      setSelectedPurchaseId('');
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
  }, [isOpen, initialSupplier, defaultBookType, defaultAccountId]);

  if (!isOpen) return null;

  const activeSupplier = payables.find((p) => p.supplierName === selectedSupplierName);
  const unpaidBills: PurchaseRecord[] = activeSupplier
    ? activeSupplier.purchases.filter((po) => getPurchaseLiveStatus(po, paymentVouchers).balanceDue > 0.5)
    : [];
  const selectedAccount = bankAccounts.find((a) => a.id === accountId);

  const handleSupplierSelect = (name: string) => {
    setSelectedSupplierName(name);
    const match = payables.find((p) => p.supplierName === name);
    if (match) {
      const unpaid = match.purchases.find(
        (po) => getPurchaseLiveStatus(po, paymentVouchers).balanceDue > 0.5
      );
      setSelectedPurchaseId(unpaid ? unpaid.id : '');
      setAmount(
        unpaid
          ? String(Math.round(getPurchaseLiveStatus(unpaid, paymentVouchers).balanceDue))
          : match.outstandingPayable > 0
          ? String(Math.round(match.outstandingPayable))
          : ''
      );
    } else {
      setSelectedPurchaseId('');
    }
  };

  const handleBillSelect = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    const bill = activeSupplier?.purchases.find((p) => p.id === purchaseId);
    if (bill) {
      const live = getPurchaseLiveStatus(bill, paymentVouchers);
      setAmount(String(Math.round(live.balanceDue)));
    }
  };

  const handleModeChange = (mode: PaymentVoucher['paymentMode']) => {
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
    const supplierName =
      selectedSupplierName === '__manual__' ? customSupplierName.trim() : selectedSupplierName;
    if (!supplierName || !numericAmount || numericAmount <= 0) return;

    const linkedBill = activeSupplier?.purchases.find((p) => p.id === selectedPurchaseId);

    setIsSubmitting(true);
    try {
      const voucherNo = `${paymentPrefix}${String(nextSequenceNumber).padStart(4, '0')}`;
      const voucher: PaymentVoucher = {
        id: `pv-${Date.now()}`,
        voucherNo,
        date,
        supplierName,
        supplierGst: activeSupplier?.supplierGst || '',
        purchaseId: linkedBill?.id || '',
        purchaseNo: linkedBill?.purchaseNo || '',
        amount: numericAmount,
        paymentMode,
        bankAccountId: accountId || (paymentMode === 'Cash' ? CASH_DRAWER_ID : bankOnlyAccounts[0]?.id || ''),
        bankAccountName:
          selectedAccount?.bankName ||
          (paymentMode === 'Cash' ? 'Office Cash Drawer' : bankOnlyAccounts[0]?.bankName || 'Bank Account'),
        referenceNo: referenceNo.trim(),
        remarks: remarks.trim() || (linkedBill ? `Against Purchase ${linkedBill.purchaseNo}` : 'Supplier account settlement'),
      };

      await onSavePaymentVoucher(voucher);
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
            <ArrowUpRight className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm tracking-wide">Record Supplier Payment Voucher</h3>
              <p className="text-[11px] text-slate-400">Reduces Supplier Payables &amp; debits Cash/Bank Book</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Supplier / Creditor Account</label>
            <select
              value={selectedSupplierName}
              onChange={(e) => handleSupplierSelect(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-semibold text-slate-900"
            >
              {payables.map((p) => (
                <option key={p.supplierName} value={p.supplierName}>
                  {p.supplierName} — Payable: {formatINR(p.outstandingPayable)}
                </option>
              ))}
              <option value="__manual__">+ Enter Other Supplier</option>
            </select>
          </div>

          {selectedSupplierName === '__manual__' && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">Supplier Name *</label>
              <input
                type="text"
                required
                value={customSupplierName}
                onChange={(e) => setCustomSupplierName(e.target.value)}
                placeholder="Enter manufacturer or vendor name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-semibold"
              />
            </div>
          )}

          {activeSupplier && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
              <span className="text-rose-900 font-semibold">Current Payable Balance:</span>
              <span className="font-mono font-bold text-rose-700 tabular-nums">
                {formatINR(activeSupplier.outstandingPayable)}
              </span>
            </div>
          )}

          {unpaidBills.length > 0 && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">Link to Purchase Voucher (Optional)</label>
              <select
                value={selectedPurchaseId}
                onChange={(e) => handleBillSelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-medium"
              >
                <option value="">On-Account (General Settlement)</option>
                {unpaidBills.map((bill) => {
                  const live = getPurchaseLiveStatus(bill, paymentVouchers);
                  return (
                    <option key={bill.id} value={bill.id}>
                      {bill.purchaseNo} ({bill.date}) — Balance Due: {formatINR(live.balanceDue)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Amount (₹) *</label>
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
              <label className="block text-slate-700 font-bold mb-1">Payment Date *</label>
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
                onChange={(e) => handleModeChange(e.target.value as PaymentVoucher['paymentMode'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-semibold"
              >
                <option value="Cash">Cash (Safe Drawer)</option>
                <option value="RTGS / NEFT">RTGS / NEFT</option>
                <option value="UPI / QR">UPI / QR</option>
                <option value="Cheque / DD">Cheque / DD</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Paid From Account</label>
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
                placeholder="UTR / cheque reference"
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
              <span>{isSubmitting ? 'Posting...' : 'Post Payment Voucher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
