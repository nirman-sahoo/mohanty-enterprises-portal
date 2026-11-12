import React, { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Eye,
  ReceiptText,
  CheckCircle2,
  Wallet,
  Building2,
  Clock,
  Split,
  Search,
  Send,
} from 'lucide-react';
import {
  BankAccount,
  Category,
  CompanySettings,
  CustomerLedger,
  InventoryItem,
  OrderItem,
  PaymentStatus,
  SaleRecord,
  UnitType,
} from '../../types';
import { ALL_UNITS, CATEGORIES, DEFAULT_UNITS } from '../../data/inventoryData';
import { formatINR, generateBillWhatsAppUrl } from '../../utils/formatters';
import { CASH_DRAWER_ID, getNextVoucherSequence, isCashAccount } from '../../utils/accountingEngine';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { DEFAULT_COMPANY_SETTINGS } from '../../services/firebaseService';

interface SalesVoucherViewProps {
  inventory: InventoryItem[];
  sales: SaleRecord[];
  ledgers: CustomerLedger[];
  bankAccounts: BankAccount[];
  settings?: CompanySettings;
  onCreateSale: (sale: SaleRecord) => Promise<void>;
  onDeleteSale: (sale: SaleRecord) => Promise<void>;
  onViewInvoice: (sale: SaleRecord) => void;
}

type SettlementChoice = 'Credit' | 'Cash' | 'Bank' | 'Partial';

export const SalesVoucherView: React.FC<SalesVoucherViewProps> = ({
  inventory,
  sales,
  ledgers,
  bankAccounts,
  settings = DEFAULT_COMPANY_SETTINGS,
  onCreateSale,
  onDeleteSale,
  onViewInvoice,
}) => {
  const cashAccount = bankAccounts.find((a) => isCashAccount(a));
  const bankOnlyAccounts = bankAccounts.filter((a) => !isCashAccount(a));

  const nextInvoiceNo = useMemo(() => {
    const num = getNextVoucherSequence(sales.map((s) => s.invoiceNo || s.orderNo));
    return `${settings.invoicePrefix || 'INV/'}${String(num).padStart(4, '0')}`;
  }, [sales, settings.invoicePrefix]);

  // Voucher Header State
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [shipToAddress, setShipToAddress] = useState<string>('');
  const [truckNumber, setTruckNumber] = useState<string>('');

  // Settlement State
  const [settlementChoice, setSettlementChoice] = useState<SettlementChoice>('Credit');
  const [partialChannel, setPartialChannel] = useState<'Cash' | 'Bank'>('Cash');
  const [selectedBankId, setSelectedBankId] = useState<string>(bankOnlyAccounts[0]?.id || '');
  const [bankPaymentMode, setBankPaymentMode] = useState<'RTGS / NEFT' | 'UPI / QR' | 'Cheque / DD'>('RTGS / NEFT');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Line items
  const defaultItem = inventory[0];
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: `line-${Date.now()}-1`,
      category: defaultItem?.category || 'CEMENT',
      itemDescription: defaultItem?.name || '',
      quantity: 0,
      unit: defaultItem?.unit || 'Bags',
      unitPrice: defaultItem?.unitPrice || 0,
      amount: 0,
    },
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);

  const effectiveInvoiceNo = invoiceNo.trim() || nextInvoiceNo;

  // Party autocomplete handler
  const handlePartyNameChange = (val: string) => {
    setCustomerName(val);
    setFormError(null);
    const matchedLedger = ledgers.find((l) => l.name.toLowerCase() === val.trim().toLowerCase());
    if (matchedLedger) {
      if (!customerPhone && matchedLedger.phone) setCustomerPhone(matchedLedger.phone);
      if (!shipToAddress && (matchedLedger.shipToAddress || matchedLedger.address)) {
        setShipToAddress(matchedLedger.shipToAddress || matchedLedger.address);
      }
    }
  };

  // Line Item handlers
  const handleAddLine = () => {
    const first = inventory[0];
    setItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length + 1}`,
        category: first?.category || 'CEMENT',
        itemDescription: first?.name || '',
        quantity: 0,
        unit: first?.unit || 'Bags',
        unitPrice: first?.unitPrice || 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleLineChange = (id: string, field: keyof OrderItem, val: any) => {
    setFormError(null);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };

        if (field === 'category') {
          const newCat = val as Category;
          const invInCat = inventory.filter((i) => i.category === newCat);
          const firstMatch = invInCat[0];
          updated.category = newCat;
          updated.itemDescription = firstMatch?.name || '';
          updated.unit = firstMatch?.unit || (DEFAULT_UNITS[newCat]?.[0] as UnitType) || 'Bags';
          updated.unitPrice = firstMatch?.unitPrice || 0;
        }

        if (field === 'itemDescription') {
          const matchInv = inventory.find((i) => i.name === val);
          if (matchInv) {
            updated.unitPrice = matchInv.unitPrice;
            updated.unit = matchInv.unit;
          }
        }

        if (field === 'unit') {
          const newUnit = val as UnitType;
          if (newUnit === 'KG' && item.unit === 'Tons' && item.unitPrice > 1000) {
            updated.unitPrice = Number((item.unitPrice / 1000).toFixed(2));
          } else if (newUnit === 'Tons' && item.unit === 'KG' && item.unitPrice < 200) {
            updated.unitPrice = Math.round(item.unitPrice * 1000);
          }
        }

        updated.amount = Math.max(0, (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0));
        return updated;
      })
    );
  };

  const rawSubtotal = items.reduce((s, it) => s + (it.amount || 0), 0);
  const grandTotal = settings.roundOffInvoices ? Math.round(rawSubtotal) : Number(rawSubtotal.toFixed(2));
  const subtotal = grandTotal;

  const resolvedPaidAmount = useMemo(() => {
    if (settlementChoice === 'Credit') return 0;
    if (settlementChoice === 'Cash' || settlementChoice === 'Bank') return grandTotal;
    const entered = parseFloat(paidAmountInput) || 0;
    return Math.min(grandTotal, Math.max(0, entered));
  }, [settlementChoice, grandTotal, paidAmountInput]);

  const balanceToLedger = Math.max(0, grandTotal - resolvedPaidAmount);

  const resetForm = () => {
    setInvoiceNo('');
    setCustomerName('');
    setCustomerPhone('');
    setShipToAddress('');
    setTruckNumber('');
    setPaidAmountInput('');
    setPaymentReference('');
    setNotes('');
    setSettlementChoice('Credit');
    const first = inventory[0];
    setItems([
      {
        id: `line-${Date.now()}-1`,
        category: first?.category || 'CEMENT',
        itemDescription: first?.name || '',
        quantity: 0,
        unit: first?.unit || 'Bags',
        unitPrice: first?.unitPrice || 0,
        amount: 0,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Customer / Party Name is required.');
      return;
    }
    if (items.some((it) => !it.itemDescription.trim())) {
      setFormError('Enter an item description for all line items.');
      return;
    }
    if (items.some((it) => !it.quantity || it.quantity <= 0)) {
      setFormError('Enter a valid quantity greater than zero for all line items.');
      return;
    }
    if (settlementChoice === 'Partial' && (resolvedPaidAmount <= 0 || resolvedPaidAmount >= grandTotal)) {
      setFormError('For Partial settlement, enter an advance paid amount greater than 0 and less than Grand Total.');
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
    const paymentStatus: PaymentStatus =
      settlementChoice === 'Credit'
        ? 'Credit'
        : settlementChoice === 'Partial'
        ? 'Partial'
        : 'Paid';

    const paymentMode = useCash
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
      : 'Party Credit Ledger';

    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newSale: SaleRecord = {
      id: `ord-${Date.now()}`,
      invoiceNo: effectiveInvoiceNo,
      orderNo: `SV-${Date.now().toString().slice(-6)}`,
      customerName: customerName.trim(),
      customerGstin: '',
      shipToAddress: shipToAddress.trim(),
      customerPhone: customerPhone.trim(),
      date,
      time: nowTime,
      items,
      category: items[0].category,
      itemDescription:
        items.length > 1 ? `${items[0].itemDescription} (+${items.length - 1} more)` : items[0].itemDescription,
      quantity: items.reduce((s, it) => s + it.quantity, 0),
      unit: items[0].unit,
      unitPrice: items[0].unitPrice,
      subtotal,
      isGst: false,
      gstRate: 0,
      gstAmount: 0,
      totalAmount: grandTotal,
      status: 'Delivered',
      paymentStatus,
      paymentMode,
      paidAmount: resolvedPaidAmount,
      bankAccountId,
      bankAccountName,
      paymentReference: paymentReference.trim(),
      truckNumber: truckNumber.trim(),
      notes: notes.trim(),
    };

    setIsSubmitting(true);
    try {
      await onCreateSale(newSale);
      setSuccessMsg(
        `Sales Voucher ${newSale.invoiceNo} posted (${formatINR(newSale.totalAmount)}). Stock, Party Ledger & Books updated.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      resetForm();
    } catch (err) {
      console.error('Failed to post Sales Voucher:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to post Sales Voucher. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const partySuggestions = Array.from(
    new Set([...ledgers.map((l) => l.name), ...sales.map((s) => s.customerName)].filter(Boolean))
  );

  const filteredSales = sales.filter(
    (s) =>
      s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.itemDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Sales Voucher</h1>
            <p className="text-xs text-slate-500">
              Auto-deducts stock, debits Party Receivable, and posts Cash/Bank Receipts on settlement
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Next Voucher No</span>
          <span className="font-mono text-sm font-bold text-slate-900">{effectiveInvoiceNo}</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sales Voucher Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 space-y-6">
        {/* Party & Voucher Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Customer / Party Account <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              list="sales-party-list"
              value={customerName}
              onChange={(e) => handlePartyNameChange(e.target.value)}
              placeholder="Select existing party or type new contractor name..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
            />
            <datalist id="sales-party-list">
              {partySuggestions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Voucher Date <span className="text-rose-500">*</span>
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
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Bill / Voucher No</label>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder={nextInvoiceNo}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Party Phone / WhatsApp</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="10-digit phone number"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Vehicle / Truck No</label>
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value.toUpperCase())}
              placeholder="Vehicle registration no"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono uppercase text-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Delivery Site / Ship To Address</label>
          <input
            type="text"
            value={shipToAddress}
            onChange={(e) => setShipToAddress(e.target.value)}
            placeholder="Delivery destination address"
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
          />
        </div>

        {/* Material Line Items */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Material Line Items</h3>
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
            <table className="w-full text-left text-xs border-collapse min-w-[720px]">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Item Description (Live Stock)</th>
                  <th className="py-2.5 px-3 w-24">Qty</th>
                  <th className="py-2.5 px-3 w-28">Unit</th>
                  <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-32">Amount (₹)</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const itemsInCategory = inventory.filter((i) => i.category === item.category);
                  const optionsList = itemsInCategory.length > 0 ? itemsInCategory : inventory;
                  return (
                    <tr key={item.id}>
                      <td className="py-2 px-3">
                        <select
                          value={item.category}
                          onChange={(e) => handleLineChange(item.id, 'category', e.target.value as Category)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-xs text-slate-900"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        {optionsList.length > 0 ? (
                          <input
                            type="text"
                            list={`sales-sku-${item.id}`}
                            value={item.itemDescription}
                            onChange={(e) => handleLineChange(item.id, 'itemDescription', e.target.value)}
                            placeholder="Select SKU or type item name..."
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-xs text-slate-900"
                          />
                        ) : (
                          <input
                            type="text"
                            value={item.itemDescription}
                            onChange={(e) => handleLineChange(item.id, 'itemDescription', e.target.value)}
                            placeholder="Enter item description..."
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-xs text-slate-900"
                          />
                        )}
                        {optionsList.length > 0 && (
                          <datalist id={`sales-sku-${item.id}`}>
                            {optionsList.map((inv) => (
                              <option key={inv.id} value={inv.name}>
                                {inv.name} (Avail: {inv.stockLevel} {inv.unit})
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
                          value={item.quantity === 0 ? '' : item.quantity}
                          placeholder="0"
                          onChange={(e) =>
                            handleLineChange(item.id, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <select
                            value={item.unit}
                            onChange={(e) => handleLineChange(item.id, 'unit', e.target.value as UnitType)}
                            className="w-full px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                          >
                            {ALL_UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleLineChange(item.id, 'unit', 'KG')}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded border cursor-pointer ${
                              item.unit === 'KG'
                                ? 'bg-amber-500 text-slate-950 border-amber-600'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            KG
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleLineChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatINR(item.amount)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(item.id)}
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

        {/* Accounting Settlement & Tax Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Payment / Accounting Posting */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Accounting Settlement Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { id: 'Credit', label: 'Credit (Party A/C)', icon: Clock },
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
                    onClick={() => setSettlementChoice(opt.id as SettlementChoice)}
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
                    Amount Paid Now (₹)
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
                    Received In
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
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">UTR / Cheque Ref</label>
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
                Cash/Bank: {formatINR(resolvedPaidAmount)} · Party Due: {formatINR(balanceToLedger)}
              </span>
            </div>
          </div>

          {/* Right: Non-GST Bill Summary Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bill Summary</span>
              <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-semibold text-amber-400">
                Commercial Estimate (Non-GST)
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
                <span className="font-bold text-sm text-white">Voucher Grand Total</span>
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
            <ReceiptText className="w-4 h-4 stroke-[2.2]" />
            <span>{isSubmitting ? 'Posting Voucher...' : 'Post Sales Voucher'}</span>
          </button>
        </div>
      </form>

      {/* Recent Sales Vouchers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Posted Sales Vouchers ({sales.length})</h2>
            <p className="text-[11px] text-slate-500">Deleting a voucher reverses stock, party ledger, and Cash/Bank book entries</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voucher no, party, item..."
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
                <th className="py-3 px-3">Customer / Party</th>
                <th className="py-3 px-3">Items Summary</th>
                <th className="py-3 px-3 text-right">Bill Total (₹)</th>
                <th className="py-3 px-3">Settlement</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No sales vouchers posted yet. Create your first Sales Voucher above.
                  </td>
                </tr>
              ) : (
                filteredSales.slice(0, 20).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{sale.invoiceNo}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{sale.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{sale.customerName}</td>
                    <td className="py-3 px-3 text-slate-700 max-w-[200px] truncate">{sale.itemDescription}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">{formatINR(sale.totalAmount)}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold ${
                          sale.paymentStatus === 'Paid'
                            ? 'text-emerald-700'
                            : sale.paymentStatus === 'Partial'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {sale.paymentStatus}
                        {sale.paymentMode && sale.paymentMode !== 'Credit' ? ` · ${sale.paymentMode}` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewInvoice(sale)}
                          className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Bill</span>
                        </button>
                        <button
                          onClick={() => window.open(generateBillWhatsAppUrl(sale, settings), '_blank')}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                          title="Send on WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSaleToDelete(sale)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Delete Sales Voucher"
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
        isOpen={!!saleToDelete}
        title="Delete Sales Voucher"
        message={`Deleting voucher ${saleToDelete?.invoiceNo} will restore sold inventory stock, reverse ${saleToDelete?.customerName}'s party ledger balance, and remove any linked Cash/Bank Book receipt.`}
        itemDetails={
          saleToDelete
            ? [
                { label: 'Voucher No', value: saleToDelete.invoiceNo },
                { label: 'Party', value: saleToDelete.customerName },
                { label: 'Amount', value: formatINR(saleToDelete.totalAmount) },
                { label: 'Date', value: saleToDelete.date },
              ]
            : []
        }
        confirmButtonText="Delete Sales Voucher"
        onConfirm={async () => {
          if (saleToDelete) await onDeleteSale(saleToDelete);
        }}
        onClose={() => setSaleToDelete(null)}
      />
    </div>
  );
};
