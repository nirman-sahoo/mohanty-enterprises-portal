import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  CheckCircle2,
  Eye,
  Search,
  Send,
  Trash2,
  Wallet,
  Building2,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  BankAccount,
  CompanySettings,
  ContraEntry,
  CustomerLedger,
  MoneyReceipt,
  PaymentVoucher,
  PurchaseRecord,
  SaleRecord,
} from '../../types';
import { formatINR, generateMoneyReceiptWhatsAppUrl, numberToIndianWords } from '../../utils/formatters';
import {
  CASH_DRAWER_ID,
  computeAllAccountBalances,
  getNextVoucherSequence,
  isCashAccount,
} from '../../utils/accountingEngine';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { DEFAULT_COMPANY_SETTINGS } from '../../services/firebaseService';

interface ReceiptVoucherViewProps {
  ledgers: CustomerLedger[];
  moneyReceipts: MoneyReceipt[];
  bankAccounts: BankAccount[];
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  contraEntries: ContraEntry[];
  settings?: CompanySettings;
  onSaveReceipt: (receipt: MoneyReceipt, ledger?: CustomerLedger) => Promise<void>;
  onDeleteReceipt: (receipt: MoneyReceipt) => Promise<void>;
  onViewReceipt: (receipt: MoneyReceipt) => void;
  onGoToSalesVoucher?: () => void;
}

interface EligibleSalesParty {
  key: string;
  partyName: string;
  ledger?: CustomerLedger;
  totalSales: number;
  billCount: number;
  lastSaleDate: string;
  outstandingDue: number;
  salesList: SaleRecord[];
}

const PAYMENT_MODES: MoneyReceipt['paymentMode'][] = [
  'Cash',
  'RTGS / NEFT',
  'UPI / QR',
  'Cheque / DD',
];

export const ReceiptVoucherView: React.FC<ReceiptVoucherViewProps> = ({
  ledgers,
  moneyReceipts,
  bankAccounts,
  sales,
  purchases,
  paymentVouchers,
  contraEntries,
  settings = DEFAULT_COMPANY_SETTINGS,
  onSaveReceipt,
  onDeleteReceipt,
  onViewReceipt,
  onGoToSalesVoucher,
}) => {
  const cashAccount = bankAccounts.find((a) => isCashAccount(a));
  const bankOnlyAccounts = bankAccounts.filter((a) => !isCashAccount(a));

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

  // Strictly derive parties ONLY from past non-cancelled Sales entries
  const eligibleParties = useMemo<EligibleSalesParty[]>(() => {
    const map = new Map<string, EligibleSalesParty>();

    sales.forEach((sale) => {
      if (sale.status === 'Cancelled') return;
      const rawName = (sale.customerName || '').trim();
      if (!rawName) return;

      const key = rawName.toLowerCase();
      const matchedLedger = ledgers.find((l) => l.name.trim().toLowerCase() === key);

      const existing = map.get(key) || {
        key,
        partyName: matchedLedger?.name || rawName,
        ledger: matchedLedger,
        totalSales: 0,
        billCount: 0,
        lastSaleDate: '',
        outstandingDue: matchedLedger ? Math.max(0, matchedLedger.outstandingReceivable || 0) : 0,
        salesList: [],
      };

      existing.totalSales += Number(sale.totalAmount) || 0;
      existing.billCount += 1;
      if (!existing.lastSaleDate || (sale.date && sale.date > existing.lastSaleDate)) {
        existing.lastSaleDate = sale.date || '';
      }
      if (!existing.ledger && matchedLedger) {
        existing.ledger = matchedLedger;
        existing.partyName = matchedLedger.name;
        existing.outstandingDue = Math.max(0, matchedLedger.outstandingReceivable || 0);
      }
      existing.salesList.push(sale);
      map.set(key, existing);
    });

    const list = Array.from(map.values()).map((entry) => {
      entry.salesList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      if (!entry.ledger) {
        const immediatePaid = entry.salesList.reduce((sum, s) => {
          const paid =
            typeof s.paidAmount === 'number'
              ? s.paidAmount
              : s.paymentStatus === 'Paid'
              ? s.totalAmount
              : s.paymentStatus === 'Partial'
              ? Math.round(s.totalAmount * 0.5)
              : 0;
          return sum + paid;
        }, 0);
        const receiptPaid = moneyReceipts
          .filter((r) => r.partyName.trim().toLowerCase() === entry.key)
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        entry.outstandingDue = Math.max(0, entry.totalSales - immediatePaid - receiptPaid);
      }
      return entry;
    });

    return list.sort((a, b) => {
      if (b.outstandingDue !== a.outstandingDue) return b.outstandingDue - a.outstandingDue;
      return a.partyName.localeCompare(b.partyName);
    });
  }, [sales, ledgers, moneyReceipts]);

  const nextReceiptNo = useMemo(() => {
    const seq = getNextVoucherSequence(moneyReceipts.map((r) => r.receiptNo));
    return `${settings.receiptPrefix || 'MR/'}${String(seq).padStart(4, '0')}`;
  }, [moneyReceipts, settings.receiptPrefix]);

  // Form State
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPartyKey, setSelectedPartyKey] = useState<string>(eligibleParties[0]?.key || '');
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>(
    eligibleParties[0]?.outstandingDue && eligibleParties[0].outstandingDue > 0
      ? String(eligibleParties[0].outstandingDue)
      : ''
  );
  const [paymentMode, setPaymentMode] = useState<MoneyReceipt['paymentMode']>('Cash');
  const [selectedBankId, setSelectedBankId] = useState<string>(bankOnlyAccounts[0]?.id || '');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [forAccount, setForAccount] = useState<string>('Material Supply Ledger Settlement');
  const [remarks, setRemarks] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Register filters & deletion modal
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'Cash' | 'Bank'>('ALL');
  const [receiptToDelete, setReceiptToDelete] = useState<MoneyReceipt | null>(null);

  // Sync party selection automatically whenever Sales / Ledgers update from Firestore
  useEffect(() => {
    if (eligibleParties.length === 0) {
      if (selectedPartyKey !== '') {
        setSelectedPartyKey('');
        setSelectedSaleId('');
        setAmountInput('');
      }
      return;
    }

    const exists = eligibleParties.some((p) => p.key === selectedPartyKey);
    if (!exists) {
      const first = eligibleParties[0];
      setSelectedPartyKey(first.key);
      setSelectedSaleId('');
      setAmountInput(first.outstandingDue > 0 ? String(first.outstandingDue) : '');
    }
  }, [eligibleParties, selectedPartyKey]);

  const effectiveReceiptNo = (receiptNo.trim() || nextReceiptNo).slice(0, 50);

  const selectedParty = useMemo(
    () => eligibleParties.find((p) => p.key === selectedPartyKey) || null,
    [eligibleParties, selectedPartyKey]
  );

  const selectedLedger = selectedParty?.ledger;
  const effectivePartyName = selectedParty?.partyName || '';

  const linkedSale = useMemo(
    () => selectedParty?.salesList.find((s) => s.id === selectedSaleId) || null,
    [selectedParty, selectedSaleId]
  );

  const numericAmount = Math.max(0, parseFloat(amountInput) || 0);
  const currentPartyDue = selectedParty?.outstandingDue || 0;
  const remainingPartyDue = Math.max(0, currentPartyDue - numericAmount);
  const excessAdvance =
    numericAmount > currentPartyDue && currentPartyDue > 0 ? numericAmount - currentPartyDue : 0;

  const isCashMode = paymentMode === 'Cash';
  const activeDepositAccount = isCashMode
    ? cashAccount
    : bankAccounts.find((a) => a.id === selectedBankId) || bankOnlyAccounts[0];

  const activeAccountId = isCashMode
    ? cashAccount?.id || CASH_DRAWER_ID
    : activeDepositAccount?.id || '';
  const activeAccountName = isCashMode
    ? cashAccount?.bankName || 'Office Cash Drawer'
    : activeDepositAccount?.bankName || 'Bank Account';
  const currentAccountBalance = accountBalances[activeAccountId] || 0;
  const projectedAccountBalance = currentAccountBalance + numericAmount;

  const handlePartySelect = (key: string) => {
    setSelectedPartyKey(key);
    setSelectedSaleId('');
    setFormError(null);
    const found = eligibleParties.find((p) => p.key === key);
    if (found) {
      setAmountInput(found.outstandingDue > 0 ? String(found.outstandingDue) : '');
      setForAccount('Material Supply Ledger Settlement');
    } else {
      setAmountInput('');
    }
  };

  const handleLinkedSaleSelect = (saleId: string) => {
    setSelectedSaleId(saleId);
    const matched = selectedParty?.salesList.find((s) => s.id === saleId);
    if (matched) {
      setForAccount(`Against Sales ${matched.invoiceNo}`);
      const billPaid =
        typeof matched.paidAmount === 'number'
          ? matched.paidAmount
          : matched.paymentStatus === 'Paid'
          ? matched.totalAmount
          : matched.paymentStatus === 'Partial'
          ? Math.round(matched.totalAmount * 0.5)
          : 0;
      const billBalance = Math.max(0, matched.totalAmount - billPaid);
      if (billBalance > 0) {
        setAmountInput(String(billBalance));
      }
    } else {
      setForAccount('Material Supply Ledger Settlement');
    }
  };

  const handleModeChange = (mode: MoneyReceipt['paymentMode']) => {
    setPaymentMode(mode);
    setFormError(null);
    if (mode !== 'Cash' && !selectedBankId && bankOnlyAccounts[0]) {
      setSelectedBankId(bankOnlyAccounts[0].id);
    }
  };

  const resetForm = () => {
    setReceiptNo('');
    setSelectedSaleId('');
    setAmountInput(
      selectedParty && selectedParty.outstandingDue > 0
        ? String(selectedParty.outstandingDue)
        : ''
    );
    setReferenceNo('');
    setRemarks('');
    setForAccount('Material Supply Ledger Settlement');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (eligibleParties.length === 0 || !selectedParty || !effectivePartyName) {
      setFormError(
        'Receipts can only be recorded for parties with a past Sales Voucher. Post a Sales Voucher first.'
      );
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setFormError('Enter a receipt amount greater than ₹0.');
      return;
    }
    if (!isCashMode && bankOnlyAccounts.length === 0) {
      setFormError(
        'No corporate bank account found. Add a bank account under Configuration → Settings, or choose Cash mode.'
      );
      return;
    }
    if (!isCashMode && !activeAccountId) {
      setFormError('Select a destination bank account for this receipt.');
      return;
    }

    const finalAmount = settings.roundOffInvoices
      ? Math.round(numericAmount)
      : Number(numericAmount.toFixed(2));

    const newReceipt: MoneyReceipt = {
      id: `rcp-${Date.now()}`,
      receiptNo: effectiveReceiptNo,
      date,
      partyName: effectivePartyName.slice(0, 150),
      partyAddress: (selectedLedger?.address || selectedParty.salesList[0]?.shipToAddress || '').slice(0, 250),
      partyPhone: (selectedLedger?.phone || selectedParty.salesList[0]?.customerPhone || '').slice(0, 30),
      amount: finalAmount,
      amountInWords: numberToIndianWords(finalAmount).slice(0, 300),
      paymentMode,
      bankAccountId: activeAccountId,
      bankAccountName: activeAccountName.slice(0, 120),
      forAccount: (
        forAccount.trim() ||
        (linkedSale ? `Against Sales ${linkedSale.invoiceNo}` : 'Material Supply Ledger Settlement')
      ).slice(0, 150),
      paidAmount: Number(((selectedLedger?.totalPaid || 0) + finalAmount).toFixed(2)),
      dueAmount: Number(Math.max(0, currentPartyDue - finalAmount).toFixed(2)),
      referenceNo: referenceNo.trim().slice(0, 50),
      remarks: (
        remarks.trim() ||
        (linkedSale ? `Receipt against ${linkedSale.invoiceNo}` : '')
      ).slice(0, 250),
    };

    setIsSubmitting(true);
    try {
      await onSaveReceipt(newReceipt, selectedLedger);
      setSuccessMsg(
        `Receipt Voucher ${newReceipt.receiptNo} posted (${formatINR(newReceipt.amount)}). ${activeAccountName} & ${newReceipt.partyName} ledger updated.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      resetForm();
    } catch (err) {
      console.error('Failed to post Receipt Voucher:', err);
      setFormError(
        err instanceof Error ? err.message : 'Failed to post Receipt Voucher. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReceipts = useMemo(() => {
    return moneyReceipts.filter((r) => {
      const matchesMode =
        modeFilter === 'ALL' ||
        (modeFilter === 'Cash' && r.paymentMode === 'Cash') ||
        (modeFilter === 'Bank' && r.paymentMode !== 'Cash');

      const q = searchTerm.trim().toLowerCase();
      const matchesQuery =
        !q ||
        r.receiptNo.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q) ||
        (r.referenceNo || '').toLowerCase().includes(q) ||
        (r.bankAccountName || '').toLowerCase().includes(q);

      return matchesMode && matchesQuery;
    });
  }, [moneyReceipts, searchTerm, modeFilter]);

  const totalCollectedFiltered = useMemo(
    () => filteredReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [filteredReceipts]
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Receipt Voucher</h1>
            <p className="text-xs text-slate-500">
              Linked to Sales Vouchers · Debits Cash / Bank Book and credits Customer Party Ledger
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Next Receipt No</span>
          <span className="font-mono text-sm font-bold text-slate-900">{effectiveReceiptNo}</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {eligibleParties.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No Sales Parties Available Yet</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Receipt Voucher lists only parties for whom a Sales Voucher has been recorded. Create a Sales Voucher first to collect payment.
              </p>
            </div>
          </div>
          {onGoToSalesVoucher && (
            <button
              type="button"
              onClick={onGoToSalesVoucher}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg shrink-0 cursor-pointer"
            >
              <span>Go to Sales Voucher</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Receipt Voucher Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Received From (Past Sales Parties Only) <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPartyKey}
              disabled={eligibleParties.length === 0}
              onChange={(e) => handlePartySelect(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white disabled:opacity-60"
            >
              {eligibleParties.length === 0 ? (
                <option value="">No party with past Sales entry found</option>
              ) : (
                eligibleParties.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.partyName} — {p.outstandingDue > 0 ? `Due: ${formatINR(p.outstandingDue)}` : `Settled`} ({p.billCount} {p.billCount === 1 ? 'sale' : 'sales'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Receipt Voucher No
            </label>
            <input
              type="text"
              maxLength={50}
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              placeholder={nextReceiptNo}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Receipt Date <span className="text-rose-500">*</span>
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

        {/* Linked Past Sales Summary & Bill Reference */}
        {selectedParty && (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                Link to Past Sales Voucher (Optional)
              </label>
              <select
                value={selectedSaleId}
                onChange={(e) => handleLinkedSaleSelect(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">On-Account (Overall Customer Ledger Settlement)</option>
                {selectedParty.salesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.invoiceNo} ({s.date}) — Bill Total: {formatINR(s.totalAmount)} ({s.paymentStatus})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-amber-900 flex flex-wrap items-center justify-between md:justify-end gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Total Billed ({selectedParty.billCount})</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatINR(selectedParty.totalSales)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Outstanding Due</span>
                <span className="font-mono text-sm font-black text-rose-700 tabular-nums">
                  {formatINR(selectedParty.outstandingDue)}
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
                Receipt Mode (Debit Account Type)
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
                  Amount Received (₹) <span className="text-rose-500">*</span>
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
                  Deposit Into (Dr Account)
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  UTR / Cheque / Ref No
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder={isCashMode ? 'Cash slip / ref (optional)' : 'UTR, cheque or UPI ref'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Against Account / Purpose
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={forAccount}
                  onChange={(e) => setForAccount(e.target.value)}
                  placeholder="Material Supply Ledger Settlement"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>
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
                placeholder="Payment narration, bill reference, or remarks"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Double-Entry Posting Summary */}
          <div className="p-5 rounded-xl bg-slate-900 text-white flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Double-Entry Posting Preview
              </span>
              <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-amber-400">
                Non-GST Receipt
              </span>
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold uppercase text-[10px]">
                    Dr · Deposit Account
                  </span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    +{formatINR(numericAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-semibold truncate">{activeAccountName}</span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    Bal: {formatINR(currentAccountBalance)} → {formatINR(projectedAccountBalance)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold uppercase text-[10px]">
                    Cr · Sales Party Account
                  </span>
                  <span className="font-mono font-bold text-amber-400 tabular-nums">
                    -{formatINR(numericAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-semibold truncate">
                    {effectivePartyName || 'No sales party selected'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {selectedParty
                      ? `Due: ${formatINR(currentPartyDue)} → ${formatINR(remainingPartyDue)}`
                      : 'Requires past Sale'}
                  </span>
                </div>
                {excessAdvance > 0 && (
                  <p className="text-[11px] text-amber-300 pt-1">
                    Includes {formatINR(excessAdvance)} advance credit above current outstanding.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-sm text-white">Total Receipt Amount</span>
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
            disabled={isSubmitting || eligibleParties.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold text-xs rounded-lg shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
            <span>{isSubmitting ? 'Posting Receipt...' : 'Post Receipt Voucher & Generate Slip'}</span>
          </button>
        </div>
      </form>

      {/* Posted Receipt Vouchers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Posted Receipt Vouchers ({filteredReceipts.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Total Collected: <span className="font-mono font-bold text-emerald-700 tabular-nums">{formatINR(totalCollectedFiltered)}</span> · Deleting reverses Party Ledger &amp; Cash/Bank Book
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
                placeholder="Search receipt no, party, ref..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Party Name</th>
                <th className="py-3 px-3">Credited Account &amp; Mode</th>
                <th className="py-3 px-3">Ref / Narration</th>
                <th className="py-3 px-3 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No receipt vouchers recorded yet. Post a Sales Voucher first, then record a Receipt Voucher above.
                  </td>
                </tr>
              ) : (
                filteredReceipts.slice(0, 30).map((rcp) => (
                  <tr key={rcp.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{rcp.receiptNo}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{rcp.date}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{rcp.partyName}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {rcp.forAccount}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">
                        {rcp.bankAccountName || (rcp.paymentMode === 'Cash' ? 'Office Cash Drawer' : 'Bank Account')}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">{rcp.paymentMode}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <p className="font-mono text-[11px]">{rcp.referenceNo || '—'}</p>
                      {rcp.remarks && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{rcp.remarks}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      {formatINR(rcp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(rcp)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                          title="View / Print Money Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={generateMoneyReceiptWhatsAppUrl(rcp, settings)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Share Receipt on WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setReceiptToDelete(rcp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Delete Receipt Voucher"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!receiptToDelete}
        title="Delete Receipt Voucher"
        message={`Deleting receipt voucher ${receiptToDelete?.receiptNo} from ${receiptToDelete?.partyName} will reverse the credit on the Party Outstandings ledger and remove the inward entry from ${receiptToDelete?.bankAccountName || 'Cash / Bank Book'}.`}
        itemDetails={
          receiptToDelete
            ? [
                { label: 'Receipt No', value: receiptToDelete.receiptNo },
                { label: 'Party', value: receiptToDelete.partyName },
                { label: 'Amount', value: formatINR(receiptToDelete.amount) },
                { label: 'Date', value: receiptToDelete.date },
              ]
            : []
        }
        confirmButtonText="Delete Receipt Voucher"
        onConfirm={async () => {
          if (receiptToDelete) await onDeleteReceipt(receiptToDelete);
        }}
        onClose={() => setReceiptToDelete(null)}
      />
    </div>
  );
};
