import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Search,
  Trash2,
  Wallet,
  Building2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  BankAccount,
  CompanySettings,
  ContraEntry,
  MoneyReceipt,
  PaymentVoucher,
  PurchaseRecord,
  SaleRecord,
} from '../../types';
import { formatINR, numberToIndianWords } from '../../utils/formatters';
import {
  CASH_DRAWER_ID,
  computeAllAccountBalances,
  computeSupplierPayables,
  getNextVoucherSequence,
  getPurchaseLiveStatus,
  isCashAccount,
} from '../../utils/accountingEngine';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { DEFAULT_COMPANY_SETTINGS } from '../../services/firebaseService';

interface PaymentVoucherViewProps {
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  bankAccounts: BankAccount[];
  sales: SaleRecord[];
  moneyReceipts: MoneyReceipt[];
  contraEntries: ContraEntry[];
  settings?: CompanySettings;
  onSavePaymentVoucher: (voucher: PaymentVoucher) => Promise<void>;
  onDeletePaymentVoucher: (voucher: PaymentVoucher) => Promise<void>;
  onGoToPurchaseVoucher?: () => void;
}

const PAYMENT_MODES: PaymentVoucher['paymentMode'][] = [
  'Cash',
  'RTGS / NEFT',
  'UPI / QR',
  'Cheque / DD',
];

export const PaymentVoucherView: React.FC<PaymentVoucherViewProps> = ({
  purchases,
  paymentVouchers,
  bankAccounts,
  sales,
  moneyReceipts,
  contraEntries,
  settings = DEFAULT_COMPANY_SETTINGS,
  onSavePaymentVoucher,
  onDeletePaymentVoucher,
  onGoToPurchaseVoucher,
}) => {
  const cashAccount = bankAccounts.find((a) => isCashAccount(a));
  const bankOnlyAccounts = bankAccounts.filter((a) => !isCashAccount(a));

  // Strictly restrict suppliers to parties for whom at least one Purchase entry exists (billCount > 0)
  const eligibleSuppliers = useMemo(
    () =>
      computeSupplierPayables(purchases, paymentVouchers)
        .filter((p) => p.billCount > 0)
        .sort((a, b) => {
          if (b.outstandingPayable !== a.outstandingPayable) {
            return b.outstandingPayable - a.outstandingPayable;
          }
          return a.supplierName.localeCompare(b.supplierName);
        }),
    [purchases, paymentVouchers]
  );

  const accountBalances = useMemo(
    () =>
      computeAllAccountBalances({
        accounts: bankAccounts,
        sales,
        moneyReceipts,
        purchases,
        paymentVouchers,
        contraEntries,
      }),
    [bankAccounts, sales, moneyReceipts, purchases, paymentVouchers, contraEntries]
  );

  const nextVoucherNo = useMemo(() => {
    const seq = getNextVoucherSequence(paymentVouchers.map((v) => v.voucherNo));
    return `${settings.paymentPrefix || 'PAY/'}${String(seq).padStart(4, '0')}`;
  }, [paymentVouchers, settings.paymentPrefix]);

  const initialSupplier = eligibleSuppliers[0] || null;
  const initialUnpaidBill = initialSupplier
    ? initialSupplier.purchases.find(
        (po) => getPurchaseLiveStatus(po, paymentVouchers).balanceDue > 0.5
      )
    : undefined;

  // Form State
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSupplierKey, setSelectedSupplierKey] = useState<string>(
    initialSupplier ? initialSupplier.supplierName.trim().toLowerCase() : ''
  );
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>(
    initialUnpaidBill?.id || ''
  );
  const [amountInput, setAmountInput] = useState<string>(
    initialUnpaidBill
      ? String(getPurchaseLiveStatus(initialUnpaidBill, paymentVouchers).balanceDue)
      : initialSupplier && initialSupplier.outstandingPayable > 0
      ? String(initialSupplier.outstandingPayable)
      : ''
  );
  const [paymentMode, setPaymentMode] = useState<PaymentVoucher['paymentMode']>('Cash');
  const [selectedBankId, setSelectedBankId] = useState<string>(bankOnlyAccounts[0]?.id || '');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Register filters & deletion modal
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'Cash' | 'Bank'>('ALL');
  const [voucherToDelete, setVoucherToDelete] = useState<PaymentVoucher | null>(null);

  // Sync supplier selection automatically whenever Purchases / Payment Vouchers update from Firestore
  useEffect(() => {
    if (eligibleSuppliers.length === 0) {
      if (selectedSupplierKey !== '') {
        setSelectedSupplierKey('');
        setSelectedPurchaseId('');
        setAmountInput('');
      }
      return;
    }

    const exists = eligibleSuppliers.some(
      (p) => p.supplierName.trim().toLowerCase() === selectedSupplierKey
    );
    if (!exists) {
      const first = eligibleSuppliers[0];
      const unpaid = first.purchases.find(
        (po) => getPurchaseLiveStatus(po, paymentVouchers).balanceDue > 0.5
      );
      setSelectedSupplierKey(first.supplierName.trim().toLowerCase());
      setSelectedPurchaseId(unpaid ? unpaid.id : '');
      setAmountInput(
        unpaid
          ? String(getPurchaseLiveStatus(unpaid, paymentVouchers).balanceDue)
          : first.outstandingPayable > 0
          ? String(first.outstandingPayable)
          : ''
      );
    }
  }, [eligibleSuppliers, selectedSupplierKey, paymentVouchers]);

  const effectiveVoucherNo = (voucherNo.trim() || nextVoucherNo).slice(0, 50);

  const activeSupplier = useMemo(
    () =>
      eligibleSuppliers.find(
        (p) => p.supplierName.trim().toLowerCase() === selectedSupplierKey
      ) || null,
    [eligibleSuppliers, selectedSupplierKey]
  );

  const unpaidBills = useMemo(() => {
    if (!activeSupplier) return [];
    return activeSupplier.purchases.filter(
      (po) => getPurchaseLiveStatus(po, paymentVouchers).balanceDue > 0.5
    );
  }, [activeSupplier, paymentVouchers]);

  const linkedBill = useMemo(
    () => activeSupplier?.purchases.find((po) => po.id === selectedPurchaseId) || null,
    [activeSupplier, selectedPurchaseId]
  );

  const linkedBillDue = linkedBill
    ? getPurchaseLiveStatus(linkedBill, paymentVouchers).balanceDue
    : 0;

  const effectiveSupplierName = activeSupplier?.supplierName || '';

  const numericAmount = Math.max(0, parseFloat(amountInput) || 0);
  const currentPayable = activeSupplier?.outstandingPayable || 0;
  const remainingPayable = Math.max(0, currentPayable - numericAmount);

  const isCashMode = paymentMode === 'Cash';
  const activeSourceAccount = isCashMode
    ? cashAccount
    : bankAccounts.find((a) => a.id === selectedBankId) || bankOnlyAccounts[0];

  const activeAccountId = isCashMode
    ? cashAccount?.id || CASH_DRAWER_ID
    : activeSourceAccount?.id || '';
  const activeAccountName = isCashMode
    ? cashAccount?.bankName || 'Office Cash Drawer'
    : activeSourceAccount?.bankName || 'Bank Account';
  const currentAccountBalance = accountBalances[activeAccountId] || 0;
  const projectedAccountBalance = currentAccountBalance - numericAmount;

  const isInsufficientCash =
    isCashMode && numericAmount > 0 && currentAccountBalance - numericAmount < 0;

  const handleSupplierSelect = (key: string) => {
    setSelectedSupplierKey(key);
    setFormError(null);
    const found = eligibleSuppliers.find(
      (p) => p.supplierName.trim().toLowerCase() === key
    );
    if (found) {
      const unpaid = found.purchases.find(
        (po) => getPurchaseLiveStatus(po, paymentVouchers).balanceDue > 0.5
      );
      setSelectedPurchaseId(unpaid ? unpaid.id : '');
      setAmountInput(
        unpaid
          ? String(getPurchaseLiveStatus(unpaid, paymentVouchers).balanceDue)
          : found.outstandingPayable > 0
          ? String(found.outstandingPayable)
          : ''
      );
    } else {
      setSelectedPurchaseId('');
      setAmountInput('');
    }
  };

  const handleBillSelect = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setFormError(null);
    const bill = activeSupplier?.purchases.find((po) => po.id === purchaseId);
    if (bill) {
      const live = getPurchaseLiveStatus(bill, paymentVouchers);
      setAmountInput(String(live.balanceDue));
    }
  };

  const handleModeChange = (mode: PaymentVoucher['paymentMode']) => {
    setPaymentMode(mode);
    setFormError(null);
    if (mode !== 'Cash' && !selectedBankId && bankOnlyAccounts[0]) {
      setSelectedBankId(bankOnlyAccounts[0].id);
    }
  };

  const resetForm = () => {
    setVoucherNo('');
    setSelectedPurchaseId('');
    setAmountInput(
      activeSupplier && activeSupplier.outstandingPayable > 0
        ? String(activeSupplier.outstandingPayable)
        : ''
    );
    setReferenceNo('');
    setRemarks('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (eligibleSuppliers.length === 0 || !activeSupplier || !effectiveSupplierName) {
      setFormError(
        'Payments can only be recorded for suppliers with a past Purchase Voucher. Post a Purchase Voucher first.'
      );
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setFormError('Enter a payment amount greater than ₹0.');
      return;
    }
    if (!isCashMode && bankOnlyAccounts.length === 0) {
      setFormError(
        'No corporate bank account found. Add a bank account under Configuration → Settings, or choose Cash mode.'
      );
      return;
    }
    if (!isCashMode && !activeAccountId) {
      setFormError('Select a source bank account for this payment.');
      return;
    }

    const finalAmount = settings.roundOffInvoices
      ? Math.round(numericAmount)
      : Number(numericAmount.toFixed(2));

    const newVoucher: PaymentVoucher = {
      id: `pv-${Date.now()}`,
      voucherNo: effectiveVoucherNo,
      date,
      supplierName: effectiveSupplierName.slice(0, 150),
      supplierGst: '',
      purchaseId: linkedBill?.id || '',
      purchaseNo: (linkedBill?.purchaseNo || '').slice(0, 50),
      amount: finalAmount,
      paymentMode,
      bankAccountId: activeAccountId,
      bankAccountName: activeAccountName.slice(0, 120),
      referenceNo: referenceNo.trim().slice(0, 80),
      remarks: (
        remarks.trim() ||
        (linkedBill
          ? `Against Purchase ${linkedBill.purchaseNo}`
          : 'Supplier account settlement')
      ).slice(0, 250),
    };

    setIsSubmitting(true);
    try {
      await onSavePaymentVoucher(newVoucher);
      setSuccessMsg(
        `Payment Voucher ${newVoucher.voucherNo} posted (${formatINR(newVoucher.amount)}). ${activeAccountName} & Supplier Payables updated.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      resetForm();
    } catch (err) {
      console.error('Failed to post Payment Voucher:', err);
      setFormError(
        err instanceof Error ? err.message : 'Failed to post Payment Voucher. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVouchers = useMemo(() => {
    return paymentVouchers.filter((v) => {
      const matchesMode =
        modeFilter === 'ALL' ||
        (modeFilter === 'Cash' && v.paymentMode === 'Cash') ||
        (modeFilter === 'Bank' && v.paymentMode !== 'Cash');

      const q = searchTerm.trim().toLowerCase();
      const matchesQuery =
        !q ||
        v.voucherNo.toLowerCase().includes(q) ||
        v.supplierName.toLowerCase().includes(q) ||
        (v.purchaseNo || '').toLowerCase().includes(q) ||
        (v.referenceNo || '').toLowerCase().includes(q) ||
        (v.bankAccountName || '').toLowerCase().includes(q);

      return matchesMode && matchesQuery;
    });
  }, [paymentVouchers, searchTerm, modeFilter]);

  const totalPaidFiltered = useMemo(
    () => filteredVouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0),
    [filteredVouchers]
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
            <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Payment Voucher</h1>
            <p className="text-xs text-slate-500">
              Linked to Purchase Vouchers · Debits Supplier Account (Reduces Payables) and credits Cash / Bank Book
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Next Voucher No</span>
          <span className="font-mono text-sm font-bold text-slate-900">{effectiveVoucherNo}</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {eligibleSuppliers.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No Purchase Suppliers Available Yet</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Payment Voucher lists only parties for whom a Purchase Voucher has been recorded. Create a Purchase Voucher first to record a payment.
              </p>
            </div>
          </div>
          {onGoToPurchaseVoucher && (
            <button
              type="button"
              onClick={onGoToPurchaseVoucher}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg shrink-0 cursor-pointer"
            >
              <span>Go to Purchase Voucher</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Payment Voucher Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Paid To (Past Purchase Parties Only) <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSupplierKey}
              disabled={eligibleSuppliers.length === 0}
              onChange={(e) => handleSupplierSelect(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white disabled:opacity-60"
            >
              {eligibleSuppliers.length === 0 ? (
                <option value="">No party with past Purchase entry found</option>
              ) : (
                eligibleSuppliers.map((p) => (
                  <option key={p.supplierName} value={p.supplierName.trim().toLowerCase()}>
                    {p.supplierName} — {p.outstandingPayable > 0 ? `Payable: ${formatINR(p.outstandingPayable)}` : `Settled`} ({p.billCount} {p.billCount === 1 ? 'bill' : 'bills'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Payment Voucher No
            </label>
            <input
              type="text"
              maxLength={50}
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              placeholder={nextVoucherNo}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {activeSupplier && (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                Bill-Wise Settlement (Link to Purchase Voucher)
              </label>
              <select
                value={selectedPurchaseId}
                onChange={(e) => handleBillSelect(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">On-Account (General Supplier Settlement)</option>
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
            <div className="text-xs text-amber-900 flex flex-wrap items-center justify-between md:justify-end gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Total Purchased ({activeSupplier.billCount})
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatINR(activeSupplier.totalPurchased)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  {linkedBill ? `Bill ${linkedBill.purchaseNo} Due` : 'Total Payable'}
                </span>
                <span className="font-mono text-sm font-black text-rose-700 tabular-nums">
                  {formatINR(linkedBill ? linkedBillDue : currentPayable)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Details & Double Entry Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Mode (Credit Account Type)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {PAYMENT_MODES.map((mode) => {
                  const active = paymentMode === mode;
                  const Icon = mode === 'Cash' ? Wallet : Building2;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleModeChange(mode)}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-amber-400 border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{mode}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Paid From (Cr Account)
                </label>
                {isCashMode ? (
                  <div className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 flex items-center justify-between">
                    <span>{cashAccount?.bankName || 'Office Cash Drawer'}</span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      Bal: {formatINR(currentAccountBalance)}
                    </span>
                  </div>
                ) : (
                  <select
                    value={activeAccountId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {bankOnlyAccounts.length === 0 ? (
                      <option value="">No bank added (configure in Settings)</option>
                    ) : (
                      bankOnlyAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} (Bal: {formatINR(accountBalances[acc.id] || 0)})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            </div>

            {isInsufficientCash && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Payment exceeds current Cash Drawer balance ({formatINR(currentAccountBalance)}). Fund Cash via Contra Entry if needed.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  UTR / Cheque / Ref No
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder={isCashMode ? 'Voucher slip / ref (optional)' : 'UTR, cheque or NEFT ref'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Narration / Remarks
                </label>
                <input
                  type="text"
                  maxLength={250}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Bill settlement or payment narration"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Double-Entry Posting Summary */}
          <div className="p-5 rounded-xl bg-slate-900 text-white flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Double-Entry Posting Preview
              </span>
              <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-amber-400">
                Non-GST Payment
              </span>
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold uppercase text-[10px]">
                    Dr · Purchase Supplier A/C
                  </span>
                  <span className="font-mono font-bold text-amber-400 tabular-nums">
                    -{formatINR(numericAmount)} payable
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-semibold truncate">
                    {effectiveSupplierName || 'No purchase supplier selected'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {activeSupplier
                      ? `Due: ${formatINR(currentPayable)} → ${formatINR(remainingPayable)}`
                      : 'Requires past Purchase'}
                  </span>
                </div>
                {linkedBill && (
                  <p className="text-[11px] text-slate-400">
                    Settling Purchase Voucher:{' '}
                    <span className="font-mono text-slate-200">{linkedBill.purchaseNo}</span>
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-bold uppercase text-[10px]">
                    Cr · Paid From Account
                  </span>
                  <span className="font-mono font-bold text-rose-400 tabular-nums">
                    -{formatINR(numericAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-semibold truncate">{activeAccountName}</span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    Bal: {formatINR(currentAccountBalance)} → {formatINR(projectedAccountBalance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-sm text-white">Total Payment Voucher</span>
                <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
                  {formatINR(numericAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic truncate">
                {numberToIndianWords(numericAmount)}
              </p>
            </div>
          </div>
        </div>

        {formError && (
          <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-lg">
            {formError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting || eligibleSuppliers.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold text-xs rounded-lg shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
            <span>{isSubmitting ? 'Posting Payment...' : 'Post Payment Voucher'}</span>
          </button>
        </div>
      </form>

      {/* Posted Payment Vouchers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Posted Payment Vouchers ({filteredVouchers.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Total Disbursed: <span className="font-mono font-bold text-rose-700 tabular-nums">{formatINR(totalPaidFiltered)}</span> · Deleting restores Supplier Payable &amp; Cash/Bank Book balance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
              {(['ALL', 'Cash', 'Bank'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeFilter(m)}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    modeFilter === m
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {m === 'ALL' ? 'All Modes' : m}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search voucher no, supplier, bill..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Supplier / Payee</th>
                <th className="py-3 px-3">Purchase Ref</th>
                <th className="py-3 px-3">Paid From &amp; Mode</th>
                <th className="py-3 px-3">UTR / Narration</th>
                <th className="py-3 px-3 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No payment vouchers recorded yet. Post a Purchase Voucher first, then record a Payment Voucher above.
                  </td>
                </tr>
              ) : (
                filteredVouchers.slice(0, 30).map((pv) => (
                  <tr key={pv.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{pv.voucherNo}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{pv.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{pv.supplierName}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                      {pv.purchaseNo || 'On-Account'}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">
                        {pv.bankAccountName || (pv.paymentMode === 'Cash' ? 'Office Cash Drawer' : 'Bank Account')}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">{pv.paymentMode}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <p className="font-mono text-[11px]">{pv.referenceNo || '—'}</p>
                      {pv.remarks && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{pv.remarks}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 tabular-nums">
                      {formatINR(pv.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setVoucherToDelete(pv)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete Payment Voucher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!voucherToDelete}
        title="Delete Payment Voucher"
        message={`Deleting payment voucher ${voucherToDelete?.voucherNo} to ${voucherToDelete?.supplierName} will restore the payable balance on Supplier Payables and reverse the outflow in ${voucherToDelete?.bankAccountName || 'Cash / Bank Book'}.`}
        itemDetails={
          voucherToDelete
            ? [
                { label: 'Voucher No', value: voucherToDelete.voucherNo },
                { label: 'Supplier', value: voucherToDelete.supplierName },
                { label: 'Amount', value: formatINR(voucherToDelete.amount) },
                { label: 'Date', value: voucherToDelete.date },
              ]
            : []
        }
        confirmButtonText="Delete Payment Voucher"
        onConfirm={async () => {
          if (voucherToDelete) await onDeletePaymentVoucher(voucherToDelete);
        }}
        onClose={() => setVoucherToDelete(null)}
      />
    </div>
  );
};
