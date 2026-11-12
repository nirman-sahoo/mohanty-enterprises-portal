import React, { useMemo, useState } from 'react';
import {
  Boxes,
  Search,
  Download,
  Printer,
  Plus,
  PackagePlus,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Category, InventoryItem, PurchaseRecord, SaleRecord, UnitType } from '../../types';
import { ALL_UNITS, CATEGORIES } from '../../data/inventoryData';
import { formatINR } from '../../utils/formatters';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface StockReportViewProps {
  inventory: InventoryItem[];
  purchases: PurchaseRecord[];
  sales: SaleRecord[];
  onRestockItem: (itemId: string, addQuantity: number) => Promise<void>;
  onSaveItem: (item: InventoryItem) => Promise<void>;
  onDeleteItem: (item: InventoryItem) => Promise<void>;
}

export const StockReportView: React.FC<StockReportViewProps> = ({
  inventory,
  purchases,
  sales,
  onRestockItem,
  onSaveItem,
  onDeleteItem,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'INSTOCK'>('ALL');

  // Restock modal state
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<string>('');
  const [isSavingRestock, setIsSavingRestock] = useState<boolean>(false);

  // Add SKU modal state
  const [isAddSkuOpen, setIsAddSkuOpen] = useState<boolean>(false);
  const [newSkuName, setNewSkuName] = useState<string>('');
  const [newSkuCat, setNewSkuCat] = useState<Category>('CEMENT');
  const [newSkuUnit, setNewSkuUnit] = useState<UnitType>('Bags');
  const [newSkuStock, setNewSkuStock] = useState<string>('0');
  const [newSkuReorder, setNewSkuReorder] = useState<string>('0');
  const [newSkuRate, setNewSkuRate] = useState<string>('0');
  const [newSkuHsn, setNewSkuHsn] = useState<string>('');
  const [isSavingSku, setIsSavingSku] = useState<boolean>(false);

  // Delete SKU state
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Aggregate total inward (purchased) & outward (sold) quantities per item name
  const movementStats = useMemo(() => {
    const purchasedMap: Record<string, number> = {};
    const soldMap: Record<string, number> = {};

    purchases.forEach((po) => {
      (po.items || []).forEach((it) => {
        const key = it.itemName.trim().toLowerCase();
        purchasedMap[key] = (purchasedMap[key] || 0) + (Number(it.quantity) || 0);
      });
    });

    sales
      .filter((s) => s.status !== 'Cancelled')
      .forEach((sale) => {
        const lines = sale.items && sale.items.length > 0 ? sale.items : [sale];
        lines.forEach((it) => {
          const key = (it.itemDescription || '').trim().toLowerCase();
          if (key) soldMap[key] = (soldMap[key] || 0) + (Number(it.quantity) || 0);
        });
      });

    return { purchasedMap, soldMap };
  }, [purchases, sales]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return inventory.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      const isLow = item.stockLevel <= item.reorderLevel;
      if (stockFilter === 'LOW' && !isLow) return false;
      if (stockFilter === 'INSTOCK' && isLow) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.hsnCode || '').toLowerCase().includes(q)
      );
    });
  }, [inventory, searchTerm, categoryFilter, stockFilter]);

  const summary = useMemo(() => {
    const totalValuation = inventory.reduce((sum, i) => sum + i.stockLevel * i.unitPrice, 0);
    const lowStockCount = inventory.filter((i) => i.stockLevel <= i.reorderLevel).length;
    const totalUnits = inventory.reduce((sum, i) => sum + i.stockLevel, 0);
    return {
      totalSkus: inventory.length,
      totalValuation,
      lowStockCount,
      totalUnits,
    };
  }, [inventory]);

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    const qty = parseFloat(restockQty);
    if (!qty || qty <= 0) return;

    setIsSavingRestock(true);
    try {
      await onRestockItem(restockTarget.id, qty);
      setRestockTarget(null);
      setRestockQty('');
    } finally {
      setIsSavingRestock(false);
    }
  };

  const handleCreateSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkuName.trim()) return;
    const stockLevel = Math.max(0, parseFloat(newSkuStock) || 0);
    const reorderLevel = Math.max(0, parseFloat(newSkuReorder) || 0);
    const unitPrice = Math.max(0, parseFloat(newSkuRate) || 0);

    setIsSavingSku(true);
    try {
      const item: InventoryItem = {
        id: `sku-${Date.now()}`,
        name: newSkuName.trim(),
        category: newSkuCat,
        stockLevel,
        unit: newSkuUnit,
        reorderLevel,
        unitPrice,
        hsnCode: newSkuHsn.trim(),
        isCriticalLow: stockLevel <= reorderLevel,
      };
      await onSaveItem(item);
      setIsAddSkuOpen(false);
      setNewSkuName('');
      setNewSkuStock('0');
      setNewSkuRate('0');
      setNewSkuHsn('');
    } finally {
      setIsSavingSku(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'SKU Name',
      'Category',
      'HSN Code',
      'Unit',
      'Purchased Qty',
      'Sold Qty',
      'Closing Stock',
      'Reorder Level',
      'Unit Rate (INR)',
      'Stock Value (INR)',
      'Condition',
    ];
    const rows = filteredItems.map((i) => {
      const key = i.name.trim().toLowerCase();
      return [
        `"${i.name}"`,
        `"${i.category}"`,
        `"${i.hsnCode || ''}"`,
        `"${i.unit}"`,
        movementStats.purchasedMap[key] || 0,
        movementStats.soldMap[key] || 0,
        i.stockLevel,
        i.reorderLevel,
        i.unitPrice,
        i.stockLevel * i.unitPrice,
        i.stockLevel <= i.reorderLevel ? 'Low Stock' : 'Optimal',
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stock_Valuation_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Stock Report &amp; Closing Valuation</h1>
            <p className="text-xs text-slate-500 font-medium">
              Live Stock Inward (Purchases), Stock Outward (Sales), Reorder Alerts &amp; Valuation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddSkuOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>Add Item SKU</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Catalog SKUs</p>
          <p className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1">{summary.totalSkus}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active Inventory Items</p>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-amber-400 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-amber-400">Closing Stock Valuation</p>
          <p className="text-lg font-black font-mono tabular-nums text-white mt-1">{formatINR(summary.totalValuation)}</p>
          <p className="text-[10px] text-slate-300 mt-0.5">At Standard Unit Rates</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Total Physical Units</p>
          <p className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1">
            {summary.totalUnits.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Bags / Tons / Pcs Combined</p>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-rose-700">Below Reorder Level</p>
          <p className="text-lg font-black font-mono tabular-nums text-rose-700 mt-1">{summary.lowStockCount}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Items Requiring Restock</p>
        </div>
      </div>

      {/* Filters & Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search material name, category, HSN code..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs"
            >
              <option value="ALL">All Stock Conditions</option>
              <option value="LOW">Low / Zero Stock Only</option>
              <option value="INSTOCK">Adequate Stock Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">HSN</th>
                <th className="py-3 px-4 text-right text-emerald-700">Purchased</th>
                <th className="py-3 px-4 text-right text-blue-700">Sold</th>
                <th className="py-3 px-4 text-right">Closing Stock</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Stock Value</th>
                <th className="py-3 px-4 text-center">Condition</th>
                <th className="py-3 px-4 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">
                      {inventory.length === 0 ? 'No inventory SKUs added yet' : 'No matching items found'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {inventory.length === 0
                        ? 'Add your first material SKU below or post a Purchase Voucher to auto-register items.'
                        : 'Try clearing your search or category filter.'}
                    </p>
                    {inventory.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddSkuOpen(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Item SKU</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                const key = item.name.trim().toLowerCase();
                const inQty = movementStats.purchasedMap[key] || 0;
                const outQty = movementStats.soldMap[key] || 0;
                const isLow = item.stockLevel <= item.reorderLevel;
                const val = item.stockLevel * item.unitPrice;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{item.category}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{item.hsnCode || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700">
                      {inQty > 0 ? `${inQty} ${item.unit}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-700">
                      {outQty > 0 ? `${outQty} ${item.unit}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-slate-950">
                      {item.stockLevel} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatINR(item.unitPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatINR(val)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Low (Min {item.reorderLevel})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Adequate</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setRestockTarget(item);
                            setRestockQty('');
                          }}
                          title="Add Opening Stock / Manual Adjustment"
                          className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <PackagePlus className="w-3 h-3" />
                          <span>Adjust</span>
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          title="Delete SKU"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock / Opening Stock Modal */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-400">
              <h3 className="font-bold text-sm">Add Stock Adjustment · {restockTarget.name}</h3>
              <button onClick={() => setRestockTarget(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmRestock} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Current Yard Stock:</span>
                <span className="font-mono font-bold text-slate-900">
                  {restockTarget.stockLevel} {restockTarget.unit}
                </span>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Quantity to Add ({restockTarget.unit}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="Enter opening or adjusted quantity"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRestock}
                  className="px-5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {isSavingRestock ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New SKU Modal */}
      {isAddSkuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-400">
              <h3 className="font-bold text-sm">Add New Material SKU to Master</h3>
              <button onClick={() => setIsAddSkuOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSku} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Item Description / Name *</label>
                <input
                  type="text"
                  required
                  value={newSkuName}
                  onChange={(e) => setNewSkuName(e.target.value)}
                  placeholder="Enter material / SKU name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <select
                    value={newSkuCat}
                    onChange={(e) => setNewSkuCat(e.target.value as Category)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unit</label>
                  <select
                    value={newSkuUnit}
                    onChange={(e) => setNewSkuUnit(e.target.value as UnitType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  >
                    {ALL_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Opening Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newSkuStock}
                    onChange={(e) => setNewSkuStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newSkuReorder}
                    onChange={(e) => setNewSkuReorder(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Standard Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newSkuRate}
                    onChange={(e) => setNewSkuRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={newSkuHsn}
                    onChange={(e) => setNewSkuHsn(e.target.value)}
                    placeholder="Optional HSN / item code"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSkuOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSku}
                  className="px-5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {isSavingSku ? 'Saving...' : 'Save SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Inventory SKU?"
        message="This removes the item from your active Stock Master catalog. Historical Sales and Purchase vouchers will remain untouched."
        itemDetails={
          itemToDelete
            ? [
                { label: 'SKU Name', value: itemToDelete.name },
                { label: 'Current Stock', value: `${itemToDelete.stockLevel} ${itemToDelete.unit}` },
              ]
            : undefined
        }
        onCancel={() => setItemToDelete(null)}
        onConfirm={async () => {
          if (itemToDelete) {
            await onDeleteItem(itemToDelete);
          }
        }}
      />
    </div>
  );
};
