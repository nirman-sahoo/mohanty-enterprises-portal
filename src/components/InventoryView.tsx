import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { InventoryItem, Category } from '../types';
import { CATEGORIES, formatINR } from '../data/inventoryData';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onRestockItem: (itemId: string, addQuantity: number) => void;
  onOpenRecordSale: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onRestockItem,
  onOpenRecordSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [restockModalItem, setRestockModalItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(50);

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hsnCode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (restockModalItem && restockQty > 0) {
      onRestockItem(restockModalItem.id, restockQty);
      setRestockModalItem(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Wholesale Inventory Master
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict catalog monitoring for Cement, SCAN TMT Bar, Fertilizer, and Asbestos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tracked SKU Count</p>
            <p className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {inventory.length} Verified Items
            </p>
          </div>
          <button
            onClick={onOpenRecordSale}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Dispatch Sale</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items by name or HSN code..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="ALL">All Categories ({inventory.length})</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">HSN Code</th>
                <th className="py-3 px-3 text-right">Available Stock</th>
                <th className="py-3 px-3 text-right">Reorder Threshold</th>
                <th className="py-3 px-3 text-right">Standard Wholesale Rate</th>
                <th className="py-3 px-3">Stock Condition</th>
                <th className="py-3 px-4 text-right">Supply Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInventory.map((item) => {
                const isLow = item.isCriticalLow || item.stockLevel <= item.reorderLevel;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {item.category}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {item.hsnCode}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                      {item.stockLevel} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                      {item.reorderLevel} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800">
                      ₹{item.unitPrice.toLocaleString('en-IN')} / {item.unit}
                    </td>
                    <td className="py-3 px-3">
                      {isLow ? (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Critical Low
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Sufficient Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setRestockModalItem(item);
                          setRestockQty(item.category === 'SCAN TMT BAR' ? 10 : 100);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors cursor-pointer"
                      >
                        + Restock Lot
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Restock Warehouse Shipment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add new manufacturer batch for <strong className="text-slate-800">{restockModalItem.name}</strong>
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Received Quantity ({restockModalItem.unit})
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex justify-between">
                <span>New Expected Stock:</span>
                <span className="font-mono font-bold text-slate-900">
                  {restockModalItem.stockLevel + (Number(restockQty) || 0)} {restockModalItem.unit}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm"
                >
                  Confirm Inward Supply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
