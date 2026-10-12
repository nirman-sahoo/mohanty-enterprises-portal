import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  Layers, 
  Package, 
  IndianRupee, 
  ReceiptText,
  Truck,
  Sparkles
} from 'lucide-react';
import { Category, UnitType, SaleRecord, InventoryItem } from '../types';
import { 
  CATEGORIES, 
  CATEGORY_ITEMS, 
  DEFAULT_UNITS, 
  ALL_UNITS, 
  CONTRACTOR_SUGGESTIONS,
  formatINR 
} from '../data/inventoryData';

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
  const [customerName, setCustomerName] = useState('');
  const [dateOfSale, setDateOfSale] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Category>('CEMENT');
  const [itemDescription, setItemDescription] = useState<string>(CATEGORY_ITEMS['CEMENT'][0]);
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<UnitType>('Bags');
  const [unitPrice, setUnitPrice] = useState<number>(410);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Credit' | 'Partial'>('Credit');
  const [truckNumber, setTruckNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // When category changes, update available item descriptions and default unit/price
  const handleCategoryChange = (newCat: Category) => {
    setCategory(newCat);
    const availableItems = CATEGORY_ITEMS[newCat];
    const firstItem = availableItems[0];
    setItemDescription(firstItem);

    // Set default unit for category
    const defaultUnitsForCat = DEFAULT_UNITS[newCat];
    if (defaultUnitsForCat && defaultUnitsForCat.length > 0) {
      setUnit(defaultUnitsForCat[0]);
    }

    // Lookup unit price from inventory if exists
    const matchingItem = inventory.find((item) => item.name === firstItem);
    if (matchingItem) {
      setUnitPrice(matchingItem.unitPrice);
    }
  };

  // When item changes, sync unit and price
  const handleItemChange = (newItem: string) => {
    setItemDescription(newItem);
    const matchingItem = inventory.find((item) => item.name === newItem);
    if (matchingItem) {
      setUnitPrice(matchingItem.unitPrice);
      setUnit(matchingItem.unit);
    }
  };

  // Auto-calculated total amount
  const totalAmount = Math.max(0, (Number(quantity) || 0) * (Number(unitPrice) || 0));

  // Find matching inventory item stock level for informational notice
  const currentItemInStock = inventory.find((item) => item.name === itemDescription);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Customer / Contractor name is required';
    }
    if (!dateOfSale) {
      newErrors.dateOfSale = 'Date of sale is required';
    }
    if (!itemDescription) {
      newErrors.itemDescription = 'Item description is required';
    }
    if (!quantity || quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (!unitPrice || unitPrice <= 0) {
      newErrors.unitPrice = 'Unit price must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Generate Invoice Number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = `ME/2026/${randomSuffix}`;
    const generatedTruck = truckNumber.trim() || `OD-02-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSaleRecord: SaleRecord = {
      id: `sale-${Date.now()}`,
      invoiceNo,
      customerName: customerName.trim(),
      date: dateOfSale,
      category,
      itemDescription,
      quantity: Number(quantity),
      unit,
      unitPrice: Number(unitPrice),
      totalAmount,
      status: 'In Transit',
      paymentStatus,
      truckNumber: generatedTruck,
    };

    onRecordSale(newSaleRecord);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer / Contractor Name & Date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Customer / Contractor Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              list="contractors-list"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (errors.customerName) setErrors({ ...errors, customerName: '' });
              }}
              placeholder="e.g. Kalinga Infrastructure Corp or Contractor Name"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:bg-white transition-all font-medium"
            />
            <datalist id="contractors-list">
              {CONTRACTOR_SUGGESTIONS.map((sug) => (
                <option key={sug} value={sug} />
              ))}
            </datalist>
          </div>
          {errors.customerName && (
            <p className="text-xs text-rose-600 mt-1">{errors.customerName}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Date of Sale <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={dateOfSale}
              onChange={(e) => setDateOfSale(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:bg-white transition-all font-mono"
            />
          </div>
          {errors.dateOfSale && (
            <p className="text-xs text-rose-600 mt-1">{errors.dateOfSale}</p>
          )}
        </div>
      </div>

      {/* Material Category & Specific Item Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Material Category <span className="text-rose-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value as Category)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:bg-white transition-all font-medium"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Specific Item Description <span className="text-rose-500">*</span>
          </label>
          <select
            value={itemDescription}
            onChange={(e) => handleItemChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:bg-white transition-all font-medium"
          >
            {CATEGORY_ITEMS[category].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {currentItemInStock && (
            <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
              Available in warehouse:{' '}
              <span className="font-semibold text-slate-800">
                {currentItemInStock.stockLevel} {currentItemInStock.unit}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Quantity & Unit and Unit Price */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Quantity <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="0.1"
            step="any"
            required
            value={quantity || ''}
            onChange={(e) => {
              setQuantity(parseFloat(e.target.value) || 0);
              if (errors.quantity) setErrors({ ...errors, quantity: '' });
            }}
            placeholder="0"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:bg-white transition-all font-mono tabular-nums"
          />
          {errors.quantity && (
            <p className="text-xs text-rose-600 mt-1">{errors.quantity}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Unit <span className="text-rose-500">*</span>
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as UnitType)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:bg-white transition-all font-medium"
          >
            {ALL_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Unit Price (₹) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <span className="text-sm font-semibold">₹</span>
            </div>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={unitPrice || ''}
              onChange={(e) => {
                setUnitPrice(parseFloat(e.target.value) || 0);
                if (errors.unitPrice) setErrors({ ...errors, unitPrice: '' });
              }}
              placeholder="0"
              className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:bg-white transition-all font-mono tabular-nums"
            />
          </div>
          {errors.unitPrice && (
            <p className="text-xs text-rose-600 mt-1">{errors.unitPrice}</p>
          )}
        </div>
      </div>

      {/* Additional B2B details: Payment Terms & Logistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Payment Term
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Credit', 'Paid', 'Partial'] as const).map((term) => (
              <button
                type="button"
                key={term}
                onClick={() => setPaymentStatus(term)}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                  paymentStatus === term
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Dispatch Truck Reg. No (Optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Truck className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              placeholder="e.g. OD-02-AK-9142 (Auto-assigned if empty)"
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:bg-white font-mono uppercase"
            />
          </div>
        </div>
      </div>

      {/* Auto-calculated Total Amount Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Calculated Invoice Subtotal
          </p>
          <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
            <span className="font-mono tabular-nums">{quantity} {unit}</span>
            <span>×</span>
            <span className="font-mono tabular-nums">₹{unitPrice}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono tracking-tight text-amber-400 tabular-nums">
            {formatINR(totalAmount)}
          </p>
          <p className="text-[11px] text-slate-400">Exclusive of GST (Standard wholesale terms)</p>
        </div>
      </div>

      {/* Action Buttons */}
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
        
        {/* Primary Action Button */}
        <button
          type="submit"
          className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-amber-500/20 hover:shadow-amber-500/35 transition-all flex items-center gap-2 cursor-pointer"
        >
          <ReceiptText className="w-4 h-4 stroke-[2.2]" />
          <span>Record Sale & Generate Invoice</span>
        </button>
      </div>
    </form>
  );
};
