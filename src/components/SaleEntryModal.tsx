import React from 'react';
import { X, Receipt } from 'lucide-react';
import { SaleEntryForm } from './SaleEntryForm';
import { InventoryItem, SaleRecord } from '../types';

interface SaleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onRecordSale: (newSale: SaleRecord) => void;
}

export const SaleEntryModal: React.FC<SaleEntryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onRecordSale,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">
                Record New Wholesale B2B Sale
              </h2>
              <p className="text-[11px] text-slate-400">
                Mohanty Enterprises Commercial Order Desk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <SaleEntryForm
            inventory={inventory}
            onRecordSale={(sale) => {
              onRecordSale(sale);
              onClose();
            }}
            onCancel={onClose}
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
};
