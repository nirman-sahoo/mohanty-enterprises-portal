import React from 'react';
import { X, Printer, CheckCircle2, Download, Building2 } from 'lucide-react';
import { SaleRecord } from '../types';
import { formatINR } from '../data/inventoryData';

interface InvoiceModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const gstRate = 0.18; // 18% GST (9% CGST + 9% SGST)
  const gstAmount = Math.round(sale.totalAmount * gstRate);
  const grandTotal = sale.totalAmount + gstAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Sale Recorded Successfully · Invoice Generated</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Document */}
        <div className="p-8 space-y-6 text-slate-900 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xs">
                  ME
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  MOHANTY ENTERPRISES
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Wholesale Dealers & C&F Agents
              </p>
              <p className="text-xs text-slate-500">
                Plot No. 128, Industrial Estate, Rasulgarh, Bhubaneswar - 751010
              </p>
              <p className="text-xs text-slate-500 font-mono">
                GSTIN: 21AAAFM9201E1Z8 · Phone: +91 674 258 9120
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-slate-100 rounded text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                TAX INVOICE
              </span>
              <p className="text-xs text-slate-500">Invoice No:</p>
              <p className="text-sm font-bold font-mono text-slate-900">{sale.invoiceNo}</p>
              <p className="text-xs text-slate-500 mt-1">Date:</p>
              <p className="text-xs font-semibold text-slate-800">{sale.date}</p>
            </div>
          </div>

          {/* Billed To / Consignee */}
          <div className="grid grid-cols-2 gap-4 text-xs p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                BILLED TO / BUYER
              </p>
              <p className="font-bold text-slate-900 text-sm">{sale.customerName}</p>
              <p className="text-slate-600 mt-0.5">Wholesale Commercial Account</p>
              <p className="text-slate-500 mt-1">Payment Terms: <span className="font-semibold text-slate-700">{sale.paymentStatus}</span></p>
            </div>
            <div className="text-right sm:text-left">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                DISPATCH & TRANSPORT
              </p>
              <p className="text-slate-700">Vehicle No: <span className="font-mono font-semibold text-slate-900">{sale.truckNumber || 'OD-02-AK-9142'}</span></p>
              <p className="text-slate-700">Category: <span className="font-semibold text-slate-900">{sale.category}</span></p>
              <p className="text-slate-500 mt-1">Status: <span className="text-emerald-700 font-semibold">{sale.status}</span></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                <tr>
                  <td className="py-3 px-3 text-slate-400 font-mono">01</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900">{sale.itemDescription}</p>
                    <p className="text-[11px] text-slate-500">Wholesale Lot Grade A</p>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {sale.quantity} {sale.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    ₹{sale.unitPrice.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-bold font-mono tabular-nums text-slate-900">
                    ₹{sale.totalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Calculation Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount</span>
                <span className="font-mono tabular-nums">{formatINR(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST (9.0%)</span>
                <span className="font-mono tabular-nums">{formatINR(Math.round(gstAmount / 2))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST (9.0%)</span>
                <span className="font-mono tabular-nums">{formatINR(Math.round(gstAmount / 2))}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-950">
                <span>Invoice Total</span>
                <span className="font-mono text-base text-slate-900 tabular-nums">{formatINR(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Terms and Signature */}
          <div className="border-t border-slate-200 pt-5 flex justify-between items-end text-[11px] text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Terms & Conditions:</p>
              <p>1. Goods once sold will not be taken back without valid inspection report.</p>
              <p>2. Subject to Bhubaneswar Jurisdiction.</p>
            </div>
            <div className="text-right">
              <div className="h-10" />
              <p className="font-bold text-slate-900">For Mohanty Enterprises</p>
              <p className="text-slate-400">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
