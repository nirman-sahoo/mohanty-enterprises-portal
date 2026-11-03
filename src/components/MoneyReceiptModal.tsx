import React, { useState } from 'react';
import { X, CheckCircle2, Send, Printer } from 'lucide-react';
import { MoneyReceipt } from '../types';
import { formatINR, numberToIndianWords, generateMoneyReceiptWhatsAppUrl } from '../utils/formatters';

interface MoneyReceiptModalProps {
  receipt: MoneyReceipt | null;
  onClose: () => void;
  onSaveAndSend?: (receipt: MoneyReceipt) => void;
}

export const MoneyReceiptModal: React.FC<MoneyReceiptModalProps> = ({
  receipt,
  onClose,
}) => {
  if (!receipt) return null;

  const handleWhatsAppSend = () => {
    const url = generateMoneyReceiptWhatsAppUrl(receipt);
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Top Control Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Money Receipt Voucher · Official Payment Confirmation</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppSend}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send in WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Money Receipt Card (Layout matches PDF Page 2 reference) */}
        <div className="p-8 space-y-6 text-slate-900 bg-white border border-slate-300 m-4 rounded-lg shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xs">
                  ME
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  MOHANTY ENTERPRISES
                </h2>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Plot 128, Industrial Estate, Rasulgarh, Bhubaneswar
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                GSTIN: 21AAAFM9201E1Z8 · Phone: +91 674 258 9120
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded">
                MONEY RECEIPT
              </span>
              <p className="text-xs text-slate-500 mt-1.5">Receipt No: <strong className="font-mono text-slate-900">{receipt.receiptNo}</strong></p>
              <p className="text-xs text-slate-500">Date: <strong className="font-mono text-slate-800">{receipt.date}</strong></p>
            </div>
          </div>

          {/* Body Lines */}
          <div className="space-y-4 text-xs">
            <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1.5">
              <span className="text-slate-500 uppercase font-bold shrink-0">Received with thanks from:</span>
              <span className="font-bold text-slate-950 text-sm flex-1 truncate">{receipt.partyName}</span>
            </div>

            <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1.5">
              <span className="text-slate-500 uppercase font-bold shrink-0">Address / Location:</span>
              <span className="text-slate-800 flex-1">{receipt.partyAddress}</span>
            </div>

            <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1.5">
              <span className="text-slate-500 uppercase font-bold shrink-0">Amount in Words:</span>
              <span className="font-semibold text-slate-900 italic flex-1">{receipt.amountInWords}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1.5">
                <span className="text-slate-500 uppercase font-bold shrink-0">Payment Mode:</span>
                <span className="font-bold text-slate-900 font-mono">{receipt.paymentMode} {receipt.referenceNo ? `(${receipt.referenceNo})` : ''}</span>
              </div>
              <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-1.5">
                <span className="text-slate-500 uppercase font-bold shrink-0">On Account of:</span>
                <span className="text-slate-800 truncate">{receipt.forAccount}</span>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Total Paid</p>
                <p className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                  {formatINR(receipt.paidAmount || receipt.amount)}
                </p>
              </div>
              <div className="border-x border-slate-200">
                <p className="text-[11px] text-slate-500 uppercase font-semibold">This Receipt</p>
                <p className="text-base font-black font-mono text-slate-950 tabular-nums">
                  {formatINR(receipt.amount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Remaining Due</p>
                <p className="text-base font-bold font-mono text-rose-700 tabular-nums">
                  {formatINR(receipt.dueAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
            <div>
              <p className="font-mono text-slate-400">Subject to Realisation of Cheque/RTGS</p>
              <p className="text-slate-400">Thank you for your business.</p>
            </div>
            <div className="text-right">
              <div className="h-10" />
              <p className="font-bold text-slate-950 text-xs">For Mohanty Enterprises</p>
              <p className="text-slate-600 font-medium">Ayushman Mohanty · Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
          <button
            onClick={handleWhatsAppSend}
            className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send in WhatsApp text format</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
