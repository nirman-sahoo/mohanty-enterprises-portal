import React, { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  CheckCircle2,
  Wallet,
  Building2,
  Clock,
  Split,
  Search,
} from 'lucide-react';
import {
  BankAccount,
  Category,
  CompanySettings,
  InventoryItem,
  PaymentVoucher,
  PurchaseItem,
  PurchaseRecord,
  UnitType,
} from '../../types';
import { ALL_UNITS, CATEGORIES, formatINR } from '../../data/inventoryData';
import {
  CASH_DRAWER_ID,
  getNextVoucherSequence,
  getPurchaseLiveStatus,
  isCashAccount,
} from '../../utils/accountingEngine';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { DEFAULT_COMPANY_SETTINGS } from '../../services/firebaseService';

interface PurchaseVoucherViewProps {
  inventory: InventoryItem[];
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  bankAccounts: BankAccount[];
  settings?: CompanySettings;
  onSavePurchase: (purchase: PurchaseRecord) => Promise<void>;
  onDeletePurchase: (purchase: PurchaseRecord) => Promise<void>;
}

type PurchaseSettlement = 'Pending' | 'Cash' | 'Bank' | 'Partial';

export const PurchaseVoucherView: React.FC<PurchaseVoucherViewProps> = ({
  inventory,
  purchases,
  paymentVouchers,
  bankAccounts,
  settings = DEFAULT_COMPANY_SETTINGS,
  onSavePurchase,
  onDeletePurchase,
}) => {
  const cashAccount = bankAccounts.find((a) => isCashAccount(a));
  const bankOnlyAccounts = bankAccounts.filter((a) => !isCashAccount(a));

  const nextPurchaseNo = useMemo(() => {
    const num = getNextVoucherSequence(purchases.map((p) => p.purchaseNo));
    return `${settings.purchasePrefix || 'PUR/'}${String(num).padStart(4, '0')}`;
  }, [purchases, settings.purchasePrefix]);

  const [purchaseNo, setPurchaseNo] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [challanNo, setChallanNo] = useState<string>('');
  const [truckNumber, setTruckNumber] = useState<string>('');

  const [settlementChoice, setSettlementChoice] = useState<PurchaseSettlement>('Pending');
  const [partialChannel, setPartialChannel] = useState<'Cash' | 'Bank'>('Bank');
  const [selectedBankId, setSelectedBankId] = useState<string>(bankOnlyAccounts[0]?.id || '');
  const [bankPaymentMode, setBankPaymentMode] = useState<'RTGS / NEFT' | 'UPI / QR' | 'Cheque / DD'>('RTGS / NEFT');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');

  const defaultInv = inventory[0];
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      itemId: defaultInv?.id || '',
      itemName: defaultInv?.name || '',
      category: defaultInv?.category || 'CEMENT',
      quantity: 0,
      unit: defaultInv?.unit || 'Bags',
      rate: defaultInv ? defaultInv.unitPrice : 0,
      amount: 0,
    },
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseRecord | null>(null);

  const effectivePurchaseNo = purchaseNo.trim() || nextPurchaseNo;

  const handleSupplierChange = (name: string) => {
    setSupplierName(name);
    setFormError(null);
    const prevPo = purchases.find((p) => p.supplierName.toLowerCase() === name.trim().toLowerCase());
    if (prevPo) {
      if (prevPo.supplierPhone) setSupplierPhone(prevPo.supplierPhone);
    }
  };

  const handleAddLine = () => {
    const first = inventory[0];
    setItems((prev) => [
      ...prev,
      {
        itemId: first?.id || '',
        itemName: first?.name || '',
        category: first?.category || 'CEMENT',
        quantity: 0,
        unit: first?.unit || 'Bags',
        rate: first ? first.unitPrice : 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: keyof PurchaseItem, val: any) => {
    setFormError(null);
    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        const updated = { ...row, [field]: val };

        if (field === 'category') {
          const newCat = val as Category;
          const catInv = inventory.filter((i) => i.category === newCat);
          const first = catInv[0];
          updated.category = newCat;
          if (first) {
            updated.itemId = first.id;
            updated.itemName = first.name;
            updated.unit = first.unit;
            updated.rate = first.unitPrice;
          } else {
            updated.itemId = '';
          }
        }

        if (field === 'itemName') {
          const typedName = String(val);
          const inv = inventory.find((i) => i.name.toLowerCase() === typedName.trim().toLowerCase());
          if (inv) {
            updated.itemId = inv.id;
            updated.itemName = inv.name;
            updated.category = inv.category;
            updated.unit = inv.unit;
            if (!updated.rate) updated.rate = inv.unitPrice;
          } else {
            updated.itemId = '';
          }
        }

        updated.amount = Math.max(0, (Number(updated.quantity) || 0) * (Number(updated.rate) || 0));
        return updated;
      })
    );
  };

  const rawSubtotal = items.reduce((s, it) => s + (it.amount || 0), 0);
  const grandTotal = settings.roundOffInvoices ? Math.round(rawSubtotal) : Number(rawSubtotal.toFixed(2));
  const subtotal = grandTotal;

  const resolvedPaidAmount = useMemo(() => {
    if (settlementChoice === 'Pending') return 0;
    if (settlementChoice === 'Cash' || settlementChoice === 'Bank') return grandTotal;
    const entered = parseFloat(paidAmountInput) || 0;
    return Math.min(grandTotal, Math.max(0, entered));
  }, [settlementChoice, grandTotal, paidAmountInput]);

  const balancePayable = Math.max(0, grandTotal - resolvedPaidAmount);

  const resetForm = () => {
    setPurchaseNo('');
    setSupplierName('');
    setSupplierPhone('');
    setChallanNo('');
    setTruckNumber('');
    setPaidAmountInput('');
    setPaymentReference('');
    setSettlementChoice('Pending');
    const first = inventory[0];
    setItems([
      {
        itemId: first?.id || '',
        itemName: first?.name || '',
        category: first?.category || 'CEMENT',
        quantity: 0,
        unit: first?.unit || 'Bags',
        rate: first ? first.unitPrice : 0,
        amount: 0,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierName.trim()) {
      setFormError('Supplier / Vendor Name is required.');
      return;
    }
    if (items.some((it) => !it.itemName.trim())) {
      setFormError('Enter an SKU / Material Name for all line items.');
      return;
    }
    if (items.some((it) => !it.quantity || it.quantity <= 0)) {
      setFormError('Enter an inward quantity greater than zero for all items.');
      return;
    }
    if (settlementChoice === 'Partial' && (resolvedPaidAmount <= 0 || resolvedPaidAmount >= grandTotal)) {
      setFormError('For Partial payment, enter an amount paid now between 1 and Grand Total.');
      return;
    }

    const useCash =
      settlementChoice === 'Cash' || (settlementChoice === 'Partial' && partialChannel === 'Cash');
    const useBank =
      settlementChoice === 'Bank' || (settlementChoice === 'Partial' && partialChannel === 'Bank');

    if (useBank && bankOnlyAccounts.length === 0) {
      setFormError('No bank account found. Add a corporate bank account under Configuration → Settings, or choose Cash / Credit.');
      return;
    }

    const chosenBank = bankAccounts.find((a) => a.id === selectedBankId) || bankOnlyAccounts[0];
    const paymentStatus: PurchaseRecord['paymentStatus'] =
      settlementChoice === 'Pending'
        ? 'Pending'
        : settlementChoice === 'Partial'
        ? 'Partial'
        : 'Paid';

    const paymentMode: PurchaseRecord['paymentMode'] = useCash
      ? 'Cash'
      : useBank
      ? bankPaymentMode
      : 'Credit';

    const bankAccountId = useCash
      ? cashAccount?.id || CASH_DRAWER_ID
      : useBank
      ? chosenBank?.id || ''
      : '';

    const bankAccountName = useCash
      ? cashAccount?.bankName || 'Office Cash Drawer'
      : useBank
      ? chosenBank?.bankName || 'Bank Account'
      : 'Supplier Payable Account';

    const newPurchase: PurchaseRecord = {
      id: `po-${Date.now()}`,
      purchaseNo: effectivePurchaseNo,
      supplierName: supplierName.trim(),
      supplierGst: '',
      supplierPhone: supplierPhone.trim(),
      date,
      category: items[0].category,
      items,
      subtotal,
      isGst: false,
      gstRate: 0,
      gstAmount: 0,
      totalAmount: grandTotal,
      paymentStatus,
      paymentMode,
      paidAmount: resolvedPaidAmount,
      bankAccountId,
      bankAccountName,
      paymentReference: paymentReference.trim(),
      truckNumber: truckNumber.trim(),
      challanNo: challanNo.trim() || effectivePurchaseNo,
    };

    setIsSubmitting(true);
    try {
      await onSavePurchase(newPurchase);
      setSuccessMsg(
        `Purchase Voucher ${newPurchase.purchaseNo} saved (${formatINR(newPurchase.totalAmount)}). Stock restocked, Payables & Books updated.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      resetForm();
    } catch (err) {
      console.error('Failed to post Purchase Voucher:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to post Purchase Voucher. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const supplierSuggestions = Array.from(
    new Set(purchases.map((p) => p.supplierName).filter(Boolean))
  );

  const filteredPurchases = purchases.filter(
    (p) =>
      p.purchaseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.challanNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Purchase Voucher</h1>
            <p className="text-xs text-slate-500">
              Restocks warehouse inventory and posts directly to Supplier Payables or Cash/Bank Book
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Next Voucher No</span>
          <span className="font-mono text-sm font-bold text-slate-900">{effectivePurchaseNo}</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Purchase Voucher Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Supplier / Manufacturer Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              list="purchase-supplier-list"
              value={supplierName}
              onChange={(e) => handleSupplierChange(e.target.value)}
              placeholder="Select manufacturer or enter supplier name..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
            />
            <datalist id="purchase-supplier-list">
              {supplierSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Purchase Date <span className="text-rose-500">*</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Purchase Voucher No</label>
            <input
              type="text"
              value={purchaseNo}
              onChange={(e) => setPurchaseNo(e.target.value)}
              placeholder={nextPurchaseNo}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Supplier Bill / Challan No</label>
            <input
              type="text"
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              placeholder="Supplier bill / challan no"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Truck / Trailer No</label>
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value.toUpperCase())}
              placeholder="Vehicle registration no"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase text-slate-900"
            />
          </div>
        </div>

        {/* Material Line Items */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Inward Material Line Items</h3>
            <button
              type="button"
              onClick={handleAddLine}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item Row</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Warehouse SKU</th>
                  <th className="py-2.5 px-3 w-28">Inward Qty</th>
                  <th className="py-2.5 px-3 w-24">Unit</th>
                  <th className="py-2.5 px-3 w-28">Purchase Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-32">Amount (₹)</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row, idx) => {
                  const skusInCat = inventory.filter((i) => i.category === row.category);
                  const list = skusInCat.length > 0 ? skusInCat : inventory;
                  return (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <select
                          value={row.category}
                          onChange={(e) => handleLineChange(idx, 'category', e.target.value as Category)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-xs text-slate-900"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          list={`purchase-sku-${idx}`}
                          value={row.itemName}
                          onChange={(e) => handleLineChange(idx, 'itemName', e.target.value)}
                          placeholder={list.length > 0 ? 'Select or type new SKU...' : 'Enter new SKU / Material name...'}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-xs text-slate-900"
                        />
                        {list.length > 0 && (
                          <datalist id={`purchase-sku-${idx}`}>
                            {list.map((inv) => (
                              <option key={inv.id} value={inv.name}>
                                {inv.name} (Stock: {inv.stockLevel} {inv.unit})
                              </option>
                            ))}
                          </datalist>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.quantity === 0 ? '' : row.quantity}
                          placeholder="0"
                          onChange={(e) =>
                            handleLineChange(idx, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={row.unit}
                          onChange={(e) => handleLineChange(idx, 'unit', e.target.value as UnitType)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                        >
                          {ALL_UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.rate || ''}
                          onChange={(e) => handleLineChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatINR(row.amount)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Settlement & Tax Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Supplier Payment / Payable Posting
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'Pending', label: 'Credit (Payable)', icon: Clock },
                { id: 'Cash', label: 'Cash Book', icon: Wallet },
                { id: 'Bank', label: 'Bank Book', icon: Building2 },
                { id: 'Partial', label: 'Partial', icon: Split },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = settlementChoice === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSettlementChoice(opt.id as PurchaseSettlement)}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-amber-400 border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {settlementChoice === 'Partial' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Paid Now (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Paid From
                  </label>
                  <select
                    value={partialChannel}
                    onChange={(e) => setPartialChannel(e.target.value as 'Cash' | 'Bank')}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Cash">Cash Book (Drawer)</option>
                    <option value="Bank">Bank Account</option>
                  </select>
                </div>
              </div>
            )}

            {(settlementChoice === 'Bank' || (settlementChoice === 'Partial' && partialChannel === 'Bank')) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Bank Account</label>
                  <select
                    value={selectedBankId || bankOnlyAccounts[0]?.id || ''}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {bankOnlyAccounts.length === 0 ? (
                      <option value="">No bank added (configure in Settings)</option>
                    ) : (
                      bankOnlyAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.bankName}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mode</label>
                  <select
                    value={bankPaymentMode}
                    onChange={(e) => setBankPaymentMode(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="RTGS / NEFT">RTGS / NEFT</option>
                    <option value="UPI / QR">UPI / QR</option>
                    <option value="Cheque / DD">Cheque / DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">UTR / Ref</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Optional ref"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <span>Posting Preview:</span>
              <span className="font-mono font-bold text-slate-900">
                Paid Now: {formatINR(resolvedPaidAmount)} · Payable Due: {formatINR(balancePayable)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Purchase Summary</span>
              <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-amber-400">
                Commercial Bill (Non-GST)
              </span>
            </div>

            <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3">
              <div className="flex justify-between text-slate-400">
                <span>Line Items ({items.length})</span>
                <span className="font-mono tabular-nums">{formatINR(rawSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Paid Now</span>
                <span className="font-mono tabular-nums text-emerald-400">{formatINR(resolvedPaidAmount)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2.5 border-t border-slate-800">
                <span className="font-bold text-sm text-white">Total Purchase Voucher</span>
                <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
                  {formatINR(grandTotal)}
                </span>
              </div>
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
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold text-xs rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
            <span>{isSubmitting ? 'Posting Voucher...' : 'Post Purchase Voucher & Restock'}</span>
          </button>
        </div>
      </form>

      {/* Recent Purchase Vouchers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Posted Purchase Vouchers ({purchases.length})</h2>
            <p className="text-[11px] text-slate-500">Deleting a voucher reverses inward stock, Payables, and Cash/Bank payments</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voucher no, supplier, challan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3">Items Inward</th>
                <th className="py-3 px-3 text-right">Bill Total (₹)</th>
                <th className="py-3 px-3 text-right">Balance Due (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No purchase vouchers posted yet. Create your first Purchase Voucher above.
                  </td>
                </tr>
              ) : (
                filteredPurchases.slice(0, 20).map((po) => {
                  const live = getPurchaseLiveStatus(po, paymentVouchers);
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{po.purchaseNo}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{po.date}</td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{po.supplierName}</p>
                        <p className="text-[10px] font-mono text-slate-400">Challan: {po.challanNo || '—'}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {po.items.map((it, idx) => (
                          <div key={idx} className="truncate max-w-[200px]">
                            {it.itemName} ({it.quantity} {it.unit})
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">{formatINR(po.totalAmount)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-rose-700">{formatINR(live.balanceDue)}</td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[11px] font-semibold ${
                            live.status === 'Paid'
                              ? 'text-emerald-700'
                              : live.status === 'Partial'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {live.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setPurchaseToDelete(po)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Delete Purchase Voucher"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!purchaseToDelete}
        title="Delete Purchase Voucher"
        message={`Deleting purchase voucher ${purchaseToDelete?.purchaseNo} from ${purchaseToDelete?.supplierName} will deduct the added quantities from inventory stock, update Supplier Payables, and remove immediate Cash/Bank outflows.`}
        itemDetails={
          purchaseToDelete
            ? [
                { label: 'Voucher No', value: purchaseToDelete.purchaseNo },
                { label: 'Supplier', value: purchaseToDelete.supplierName },
                { label: 'Amount', value: formatINR(purchaseToDelete.totalAmount) },
                { label: 'Date', value: purchaseToDelete.date },
              ]
            : []
        }
        confirmButtonText="Delete Purchase Voucher"
        onConfirm={async () => {
          if (purchaseToDelete) await onDeletePurchase(purchaseToDelete);
        }}
        onClose={() => setPurchaseToDelete(null)}
      />
    </div>
  );
};
