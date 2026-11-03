import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Layers, 
  Package, 
  IndianRupee, 
  ReceiptText,
  Truck,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Edit2
} from 'lucide-react';
import { Category, UnitType, SaleRecord, InventoryItem, OrderItem, OrderStatus, PaymentStatus } from '../types';
import { 
  CATEGORIES, 
  CATEGORY_ITEMS, 
  DEFAULT_UNITS, 
  ALL_UNITS, 
  CONTRACTOR_SUGGESTIONS 
} from '../data/inventoryData';
import { formatINR, generateOrderWhatsAppUrl } from '../utils/formatters';

interface SaleEntryFormProps {
  inventory: InventoryItem[];
  onRecordSale: (newSale: SaleRecord) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const SaleEntryForm: React.FC<SaleEntryFormProps> = ({
  inventory,
  onRecordSale,
  onCancel,
  isModal = false,
}) => {
  // Order Header details (Page 1)
  const [customerName, setCustomerName] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+91 94370 28190');
  const [dateOfSale, setDateOfSale] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfSale, setTimeOfSale] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [orderNumber, setOrderNumber] = useState(
    () => `ORD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [truckNumber, setTruckNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Credit');
  const [isGst, setIsGst] = useState<boolean>(true);

  // Multi-item order items list (Page 1: "item (select multipal item)")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      id: `item-${Date.now()}-1`,
      category: 'CEMENT',
      itemDescription: CATEGORY_ITEMS['CEMENT'][0],
      quantity: 100,
      unit: 'Bags',
      unitPrice: 410,
      amount: 41000,
    },
  ]);

  // Stage in pipeline: 1 = Create Order, 2 = Verify WhatsApp, 3 = Fulfillment
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1);
  const [currentCreatedOrder, setCurrentCreatedOrder] = useState<SaleRecord | null>(null);
  const [orderVerificationStatus, setOrderVerificationStatus] = useState<'Pending' | 'Confirmed' | 'Cancelled'>('Pending');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Line item manipulation
  const handleAddItemRow = () => {
    const newItem: OrderItem = {
      id: `item-${Date.now()}-${orderItems.length + 1}`,
      category: 'SCAN TMT BAR',
      itemDescription: CATEGORY_ITEMS['SCAN TMT BAR'][3], // M/S TMT RODS 12mm
      quantity: 5,
      unit: 'Tons',
      unitPrice: 54500,
      amount: 272500,
    };
    setOrderItems([...orderItems, newItem]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (orderItems.length <= 1) return;
    setOrderItems(orderItems.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof OrderItem, val: any) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };

          // If category changed, update default item description and unit
          if (field === 'category') {
            const newCat = val as Category;
            const available = CATEGORY_ITEMS[newCat];
            updated.category = newCat;
            updated.itemDescription = available[0];
            const defUnits = DEFAULT_UNITS[newCat];
            if (defUnits && defUnits.length > 0) updated.unit = defUnits[0];

            const matchInv = inventory.find((i) => i.name === available[0]);
            if (matchInv) updated.unitPrice = matchInv.unitPrice;
          }

          // If itemDescription changed, sync price
          if (field === 'itemDescription') {
            const matchInv = inventory.find((i) => i.name === val);
            if (matchInv) {
              updated.unitPrice = matchInv.unitPrice;
              updated.unit = matchInv.unit;
            }
          }

          // Recalculate line total
          if (field === 'quantity' || field === 'unitPrice' || field === 'category' || field === 'itemDescription') {
            updated.amount = Math.max(0, (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0));
          }

          return updated;
        }
        return item;
      })
    );
  };

  // Calculation totals
  const subtotal = orderItems.reduce((acc, it) => acc + (it.amount || 0), 0);
  const gstRate = 0.18;
  const gstAmount = isGst ? Math.round(subtotal * gstRate) : 0;
  const grandTotal = subtotal + gstAmount;

  // Primary Action: Place Order
  const handlePlaceOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Party Name is required';
    }
    if (orderItems.length === 0) {
      newErrors.items = 'Please add at least one line item';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = `ME/2026/${randomSuffix}`;
    const generatedTruck = truckNumber.trim() || `OD-02-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: SaleRecord = {
      id: `ord-${Date.now()}`,
      orderNo: orderNumber,
      invoiceNo,
      customerName: customerName.trim(),
      shipToAddress: shipToAddress.trim() || 'Site Yard Delivery',
      customerPhone: customerPhone.trim(),
      date: dateOfSale,
      time: timeOfSale,
      items: orderItems,
      // Default to first item for legacy compatibility
      category: orderItems[0].category,
      itemDescription: orderItems[0].itemDescription,
      quantity: orderItems[0].quantity,
      unit: orderItems[0].unit,
      unitPrice: orderItems[0].unitPrice,
      subtotal,
      isGst,
      gstAmount,
      totalAmount: grandTotal,
      status: 'Pending Verification',
      paymentStatus,
      truckNumber: generatedTruck,
    };

    setCurrentCreatedOrder(newOrder);
    setActiveStage(2); // Move to Stage 2: WhatsApp Verification (as in PDF Page 1)
  };

  // Stage 2: Send WhatsApp Verification
  const handleSendWhatsAppVerification = () => {
    if (!currentCreatedOrder) return;
    const url = generateOrderWhatsAppUrl(currentCreatedOrder);
    window.open(url, '_blank');
  };

  // Stage 2: Party Confirm in WhatsApp
  const handleConfirmOrder = () => {
    if (!currentCreatedOrder) return;
    const confirmedOrder: SaleRecord = {
      ...currentCreatedOrder,
      status: 'Confirmed',
    };
    setCurrentCreatedOrder(confirmedOrder);
    setOrderVerificationStatus('Confirmed');
    setActiveStage(3); // Move to Stage 3: Fulfillment & Create Bill
  };

  // Stage 2: Cancel Order
  const handleCancelOrder = () => {
    if (!currentCreatedOrder) return;
    const cancelledOrder: SaleRecord = {
      ...currentCreatedOrder,
      status: 'Cancelled',
    };
    setCurrentCreatedOrder(cancelledOrder);
    setOrderVerificationStatus('Cancelled');
  };

  // Stage 3: Create Party Bill & Finalize
  const handleCreatePartyBill = () => {
    if (!currentCreatedOrder) return;
    const finalizedSale: SaleRecord = {
      ...currentCreatedOrder,
      status: 'In Transit',
    };
    onRecordSale(finalizedSale);
  };

  return (
    <div className="space-y-6">
      {/* 3-STAGE PIPELINE INDICATOR (Directly matches Page 1 layout) */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Multi-Stage Order Engine
            </span>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Create Order & Estimate Workflow
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            {/* Stage 1 */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                activeStage === 1
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">1</span>
              <span>1. Order Details</span>
            </div>

            <span className="text-slate-600">→</span>

            {/* Stage 2 */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                activeStage === 2
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">2</span>
              <span>2. WhatsApp Verify</span>
            </div>

            <span className="text-slate-600">→</span>

            {/* Stage 3 */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                activeStage === 3
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">3</span>
              <span>3. Bill & Dispatch</span>
            </div>
          </div>
        </div>
      </div>

      {/* STAGE 1: CREATE ORDER PAGE (Multi-Item Entry) */}
      {activeStage === 1 && (
        <form onSubmit={handlePlaceOrderSubmit} className="space-y-6">
          {/* Box 1 Header: Party name, Ship To 2nd line, Order number, Date & Time */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Party Name (Customer / Contractor) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="party-suggestions"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (errors.customerName) setErrors({ ...errors, customerName: '' });
                  }}
                  placeholder="e.g. M/s Supraval Nayak or Kalinga Infrastructure"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <datalist id="party-suggestions">
                  {CONTRACTOR_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {errors.customerName && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ship To (2nd Line Delivery Site / Warehouse)
                </label>
                <input
                  type="text"
                  value={shipToAddress}
                  onChange={(e) => setShipToAddress(e.target.value)}
                  placeholder="e.g. Sector-5 Flyover Project Yard, Gate No 3"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Order Number
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Date & Time
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={dateOfSale}
                    onChange={(e) => setDateOfSale(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={truckNumber}
                  onChange={(e) => setTruckNumber(e.target.value)}
                  placeholder="OD-02-AK-9142"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Customer Phone (WhatsApp)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 94370 28190"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* MULTI-ITEM SELECTOR (PDF Page 1: "item (select multipal item)") */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Select Multiple Material Items
                </h3>
                <p className="text-[11px] text-slate-500">
                  Restricted strictly to Cement, SCAN TMT Bar, Fertilizer, and Asbestos
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 w-28">Quantity</th>
                    <th className="py-2.5 px-3 w-24">Unit</th>
                    <th className="py-2.5 px-3 w-28">Price (₹)</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orderItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      {/* Category */}
                      <td className="py-2 px-3">
                        <select
                          value={item.category}
                          onChange={(e) => handleItemChange(item.id, 'category', e.target.value as Category)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-xs text-slate-900"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>

                      {/* Item Description (Dynamically filtered by Category) */}
                      <td className="py-2 px-3">
                        <select
                          value={item.itemDescription}
                          onChange={(e) => handleItemChange(item.id, 'itemDescription', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-xs text-slate-900"
                        >
                          {CATEGORY_ITEMS[item.category].map((desc) => (
                            <option key={desc} value={desc}>{desc}</option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          required
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs text-slate-900 font-semibold"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-3">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value as UnitType)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
                        >
                          {ALL_UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          required
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs text-slate-900 font-semibold"
                        />
                      </td>

                      {/* Line Amount */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatINR(item.amount)}
                      </td>

                      {/* Delete Row */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(item.id)}
                          disabled={orderItems.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing & GST Breakdown Banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tax Structure:
              </span>
              <button
                type="button"
                onClick={() => setIsGst(!isGst)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isGst ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isGst ? 'GST (18% Tax Included)' : 'Non-GST / Estimate'}
              </button>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">
                <span>Subtotal: {formatINR(subtotal)}</span>
                {isGst && <span> · GST: {formatINR(gstAmount)}</span>}
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight text-amber-400 tabular-nums">
                {formatINR(grandTotal)}
              </p>
            </div>
          </div>

          {/* Action Button: Place Order */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-amber-500/20 hover:shadow-amber-500/35 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ReceiptText className="w-4 h-4 stroke-[2.2]" />
              <span>Place Order & Proceed to WhatsApp Verify</span>
            </button>
          </div>
        </form>
      )}

      {/* STAGE 2: VERIFY ORDER IN SEND WHATSAPP (PDF Page 1 Box 2) */}
      {activeStage === 2 && currentCreatedOrder && (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Stage 2: WhatsApp Verification & Party Confirmation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Send itemized order text to contractor WhatsApp and await acceptance
            </p>
          </div>

          {/* Order Summary Card */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between font-bold text-slate-900">
              <span>Order ID: {currentCreatedOrder.orderNo}</span>
              <span className="font-mono text-amber-700">{formatINR(currentCreatedOrder.totalAmount)}</span>
            </div>
            <p className="text-slate-600">Party: <strong className="text-slate-900">{currentCreatedOrder.customerName}</strong></p>
            <p className="text-slate-600">Ship To: {currentCreatedOrder.shipToAddress}</p>
            <p className="text-slate-600">WhatsApp: <span className="font-mono">{currentCreatedOrder.customerPhone}</span></p>

            <div className="pt-2 border-t border-slate-200">
              <p className="font-bold text-slate-700 mb-1">Items to Dispatch:</p>
              <ul className="space-y-0.5 text-slate-600 list-disc list-inside">
                {currentCreatedOrder.items.map((it) => (
                  <li key={it.id}>
                    {it.itemDescription} — {it.quantity} {it.unit} @ ₹{it.unitPrice}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interactive Controls matching Box 2: Verify WhatsApp, Confirm, Cancel, Modify */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Verify order in send WhatsApp */}
            <button
              type="button"
              onClick={handleSendWhatsAppVerification}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Verify Order in Send WhatsApp</span>
            </button>

            {/* Party confirm in WhatsApp */}
            <button
              type="button"
              onClick={handleConfirmOrder}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Party Confirmed in WhatsApp</span>
            </button>

            {/* Modify Order */}
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Modify Order</span>
            </button>

            {/* Cancel Order */}
            <button
              type="button"
              onClick={handleCancelOrder}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Order</span>
            </button>
          </div>

          {orderVerificationStatus === 'Cancelled' && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200">
              Order has been marked as Cancelled. You can return to step 1 to modify or start a new order.
            </div>
          )}
        </div>
      )}

      {/* STAGE 3: FULFILLMENT & INVOICING (PDF Page 1 Box 3) */}
      {activeStage === 3 && currentCreatedOrder && (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Stage 3: Generate Order ID, Deliver & Create Party Bill
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Order confirmed by customer. Ready for gate dispatch and tax billing.
              </p>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
              Status: Confirmed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Generated Order ID</span>
              <p className="font-mono font-bold text-sm text-slate-900 mt-1">{currentCreatedOrder.orderNo}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Assigned Dispatch Vehicle</span>
              <p className="font-mono font-bold text-sm text-slate-900 mt-1">{currentCreatedOrder.truckNumber}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Commercial Total</span>
              <p className="font-mono font-bold text-sm text-amber-700 mt-1">{formatINR(currentCreatedOrder.totalAmount)}</p>
            </div>
          </div>

          {/* Actions matching Box 3 */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Create Party Bill (send WhatsApp) */}
            <button
              type="button"
              onClick={handleCreatePartyBill}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer"
            >
              <ReceiptText className="w-4 h-4 stroke-[2.2]" />
              <span>Create Party Bill & Launch Invoice</span>
            </button>

            {/* Generate Order ID (Send WhatsApp) */}
            <button
              type="button"
              onClick={handleSendWhatsAppVerification}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Order ID on WhatsApp</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
