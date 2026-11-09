import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Download, 
  Search,
  X,
  Boxes,
  CheckCircle2
} from 'lucide-react';
import { PurchaseRecord, InventoryItem, Category } from '../types';
import { formatINR } from '../data/inventoryData';

interface ProcurementViewProps {
  inventory: InventoryItem[];
  purchases: PurchaseRecord[];
  onSavePurchase: (po: PurchaseRecord) => Promise<void>;
}

export const ProcurementView: React.FC<ProcurementViewProps> = ({
  inventory,
  purchases,
  onSavePurchase
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    supplierName: 'UltraTech Cement Ltd (Jharsuguda Plant)',
    supplierGst: '21AAACU1234F1Z8',
    category: 'CEMENT' as Category,
    selectedItemId: inventory[0]?.id || '',
    quantity: '200',
    rate: '345',
    truckNumber: 'OD-05-AH-2201',
    challanNo: 'CH-2026-789',
    paymentStatus: 'Paid' as PurchaseRecord['paymentStatus']
  });

  const filteredPurchases = purchases.filter((po) => {
    const matchesSearch = 
      po.purchaseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.truckNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || po.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalProcurement = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.selectedItemId || !formData.quantity || !formData.rate) return;

    setIsSubmitting(true);
    const selectedItem = inventory.find(i => i.id === formData.selectedItemId) || inventory[0];
    const qty = parseFloat(formData.quantity);
    const rate = parseFloat(formData.rate);
    const subtotal = qty * rate;
    const gstRate = formData.category === 'CEMENT' ? 0.28 : formData.category === 'FERTILIZER' ? 0.05 : 0.18;
    const gstAmount = Math.round(subtotal * gstRate);
    const totalAmount = subtotal + gstAmount;

    const newPO: PurchaseRecord = {
      id: `po-${Date.now()}`,
      purchaseNo: `PO-2026-${String(purchases.length + 1).padStart(4, '0')}`,
      supplierName: formData.supplierName,
      supplierGst: formData.supplierGst,
      date: new Date().toISOString().split('T')[0],
      category: formData.category,
      items: [
        {
          itemId: selectedItem ? selectedItem.id : 'sku-1',
          itemName: selectedItem ? selectedItem.name : 'Raw Material Inward',
          category: formData.category,
          quantity: qty,
          unit: selectedItem ? selectedItem.unit : 'Bags',
          rate,
          amount: subtotal
        }
      ],
      subtotal,
      gstAmount,
      totalAmount,
      paymentStatus: formData.paymentStatus,
      truckNumber: formData.truckNumber,
      challanNo: formData.challanNo
    };

    try {
      await onSavePurchase(newPO);
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['PO Number', 'Date', 'Supplier', 'Category', 'Truck No', 'Challan', 'Subtotal (₹)', 'GST (₹)', 'Total (₹)', 'Status'];
    const rows = purchases.map(p => [
      `"${p.purchaseNo}"`,
      p.date,
      `"${p.supplierName}"`,
      `"${p.category}"`,
      `"${p.truckNumber}"`,
      `"${p.challanNo}"`,
      p.subtotal,
      p.gstAmount,
      p.totalAmount,
      `"${p.paymentStatus}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mohanty_Procurement_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-2xs">
            <ShoppingBag className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Material Purchase & Procurement Register
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Inward raw consignments from cement plants, steel mills, and fertilizer manufacturers recorded live in database
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] active:scale-[0.99] text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Inward Consignment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Procurement Value</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalProcurement)}</p>
          <p className="text-[11px] text-slate-400 mt-1">{purchases.length} recorded consignments</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Input Tax Credit (ITC)</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {formatINR(purchases.reduce((s, p) => s + p.gstAmount, 0))}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Claimable against GST output liability</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse Restock Actions</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">100% Synced</p>
          <p className="text-[11px] text-slate-400 mt-1">Direct integration with live catalog levels</p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search PO, supplier, or truck number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'CEMENT', 'SCAN TMT BAR', 'FERTILIZER', 'Asbestos'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#F6B118] text-slate-950 font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">PO Number</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Primary Supplier</th>
                <th className="py-3.5 px-4">Material Inward</th>
                <th className="py-3.5 px-4">Truck / Trailer</th>
                <th className="py-3.5 px-4 text-right">Taxable (₹)</th>
                <th className="py-3.5 px-4 text-right">Total Payable (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No inward consignments recorded yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;+ Inward Consignment&rdquo; to record material procurement and auto-restock inventory.</p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{po.purchaseNo}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{po.date}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{po.supplierName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">GST: {po.supplierGst}</p>
                    </td>
                    <td className="py-3 px-4">
                      {po.items.map((it, idx) => (
                        <div key={idx} className="font-medium text-slate-800">
                          {it.itemName} - <span className="font-bold text-slate-900">{it.quantity} {it.unit}</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-slate-700">{po.truckNumber}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Challan: {po.challanNo}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{formatINR(po.subtotal)}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{formatINR(po.totalAmount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Received</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inward Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-400">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-wide">Inward Material Consignment & Auto-Restock</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Supplier Company</label>
                  <select
                    value={formData.supplierName}
                    onChange={(e) => {
                      const name = e.target.value;
                      let gst = '21AAACU1234F1Z8';
                      let cat: Category = 'CEMENT';
                      if (name.includes('SCAN Steels')) {
                        gst = '21AABCS9981K1ZQ';
                        cat = 'SCAN TMT BAR';
                      } else if (name.includes('IFFCO')) {
                        gst = '21AAACI0023B1ZT';
                        cat = 'FERTILIZER';
                      } else if (name.includes('Everest')) {
                        gst = '21AAACE5562P1Z3';
                        cat = 'Asbestos';
                      }
                      setFormData({ ...formData, supplierName: name, supplierGst: gst, category: cat });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="UltraTech Cement Ltd (Jharsuguda Plant)">UltraTech Cement Ltd</option>
                    <option value="SCAN Steels Ltd (Rajgangpur Unit)">SCAN Steels Ltd</option>
                    <option value="IFFCO Fertilizer Hub (Paradip)">IFFCO Fertilizer Hub</option>
                    <option value="Everest Industries Ltd (Asbestos Division)">Everest Industries Ltd</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Supplier GSTIN</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.supplierGst}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-mono text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Warehouse SKU to Restock</label>
                <select
                  value={formData.selectedItemId}
                  onChange={(e) => setFormData({ ...formData, selectedItemId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-medium"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Current Stock: {item.stockLevel} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Inward Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Purchase Rate per Unit (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Delivery Truck / Trailer No</label>
                  <input
                    type="text"
                    required
                    value={formData.truckNumber}
                    onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Manufacturer Challan / Bilty No</label>
                  <input
                    type="text"
                    required
                    value={formData.challanNo}
                    onChange={(e) => setFormData({ ...formData, challanNo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                <Boxes className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Instant Warehouse Restock:</strong> Confirming this inward receipt will automatically increase the live warehouse stock in Firestore without requiring manual entry.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Inwarding...' : 'Confirm Inward & Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
