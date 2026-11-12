import React, { useState } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Send,
  Receipt,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { CompanySettings, SaleRecord } from '../types';
import { formatINR, generateBillWhatsAppUrl } from '../utils/formatters';
import { generateAndCopyReceiptImage } from '../utils/generateReceiptImage';
import { DEFAULT_COMPANY_SETTINGS } from '../services/firebaseService';

interface InvoiceModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
  settings?: CompanySettings;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  onClose,
  settings = DEFAULT_COMPANY_SETTINGS,
}) => {
  const [layoutMode, setLayoutMode] = useState<'standard' | 'thermal-slip'>('standard');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!sale) return null;

  const subtotal = sale.totalAmount || sale.subtotal || 0;
  const grandTotal = subtotal;

  const nonGstSale: SaleRecord = {
    ...sale,
    isGst: false,
    gstRate: 0,
    subtotal,
    gstAmount: 0,
    totalAmount: grandTotal,
  };

  const handleTextFormatAction = () => {
    const itemsSummary =
      sale.items && sale.items.length > 0
        ? sale.items
            .map(
              (it, idx) =>
                `${idx + 1}. ${it.itemDescription}: ${it.quantity} ${it.unit} @ ₹${it.unitPrice} = ₹${it.amount}`
            )
            .join('\n')
        : `1. ${sale.itemDescription}: ${sale.quantity} ${sale.unit} = ₹${grandTotal}`;

    const textToCopy = `*${settings.companyName}*
${settings.address ? `${settings.address}\n` : ''}*ESTIMATE / SALES BILL*
Bill No: ${sale.invoiceNo}
Date: ${sale.date} ${sale.time || ''}
Party: ${sale.customerName}
${sale.shipToAddress ? `Ship To: ${sale.shipToAddress}\n` : ''}${sale.truckNumber ? `Vehicle: ${sale.truckNumber}\n` : ''}
*Items:*
${itemsSummary}

*TOTAL AMOUNT: ${formatINR(grandTotal)}*
Payment Terms: ${sale.paymentStatus}${sale.paymentMode ? ` (${sale.paymentMode})` : ''}`;

    navigator.clipboard.writeText(textToCopy);
    setToastMessage('Bill text copied & launching WhatsApp...');
    setTimeout(() => setToastMessage(null), 3500);

    const url = generateBillWhatsAppUrl(nonGstSale, settings);
    window.open(url, '_blank');
  };

  const handleImageFormatAction = async () => {
    setIsGeneratingImage(true);
    setToastMessage('Rendering receipt image...');

    const result = await generateAndCopyReceiptImage(nonGstSale, settings);
    setIsGeneratingImage(false);

    if (result.success) {
      setToastMessage(
        result.copiedToClipboard
          ? 'Receipt PNG downloaded & copied to clipboard.'
          : 'Receipt PNG downloaded.'
      );
    } else {
      setToastMessage('Failed to generate image.');
    }

    setTimeout(() => setToastMessage(null), 4500);
  };

  const lineItems =
    sale.items && sale.items.length > 0
      ? sale.items
      : [
          {
            id: 'item-default',
            category: sale.category,
            itemDescription: sale.itemDescription,
            quantity: sale.quantity,
            unit: sale.unit,
            unitPrice: sale.unitPrice,
            amount: subtotal,
          },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div
        className={`relative w-full ${
          layoutMode === 'thermal-slip' ? 'max-w-md' : 'max-w-2xl'
        } bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8 transition-all`}
      >
        {toastMessage && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 print:hidden">
            <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold truncate">
              Sales Bill / Estimate · {sale.invoiceNo}
            </span>
          </div>

          <div className="flex items-center gap-2">

            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setLayoutMode('standard')}
                title="Standard A4 Invoice"
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  layoutMode === 'standard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('thermal-slip')}
                title="Thermal Slip Format"
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  layoutMode === 'thermal-slip' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="Print"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Share Bar */}
        <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <div className="text-xs text-slate-600 font-medium">
            <span className="font-bold text-slate-800">Share Voucher:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTextFormatAction}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp Text</span>
            </button>

            <button
              type="button"
              onClick={handleImageFormatAction}
              disabled={isGeneratingImage}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{isGeneratingImage ? 'Generating...' : 'Download PNG'}</span>
            </button>
          </div>
        </div>

        {layoutMode === 'thermal-slip' ? (
          <div className="p-6 bg-slate-50 font-mono text-slate-900 select-text">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-slate-300 space-y-3.5 max-w-sm mx-auto text-xs">
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <h3 className="font-bold text-sm tracking-tight text-slate-950">{settings.companyName}</h3>
                {settings.address && <p className="text-[10px] text-slate-600">{settings.address}</p>}
                {settings.phone && <p className="text-[10px] text-slate-600">Phone: {settings.phone}</p>}
                <div className="mt-2 inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 text-[10px] font-bold uppercase">
                  ESTIMATE / CASH MEMO
                </div>
              </div>

              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>Bill No:</span>
                  <span className="font-bold">{sale.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{sale.date} {sale.time || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Party:</span>
                  <span className="font-bold text-right truncate max-w-[170px]">{sale.customerName}</span>
                </div>
                {sale.truckNumber && (
                  <div className="flex justify-between">
                    <span>Vehicle:</span>
                    <span className="font-bold">{sale.truckNumber}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-b border-dashed border-slate-300 pb-2">
                {lineItems.map((item, idx) => (
                  <div key={item.id || idx} className="text-[11px]">
                    <p className="font-semibold text-slate-950">{item.itemDescription}</p>
                    <div className="flex justify-between text-slate-600">
                      <span>{item.quantity} {item.unit}</span>
                      <span>@ ₹{item.unitPrice.toLocaleString('en-IN')}</span>
                      <span className="font-bold text-slate-900">₹{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-sm text-slate-950 pt-1">
                  <span>Total:</span>
                  <span className="font-black text-base">{formatINR(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>Settlement:</span>
                  <span className="font-semibold">{sale.paymentStatus} {sale.paymentMode ? `(${sale.paymentMode})` : ''}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-6 text-slate-900 bg-white">
            <div className="flex justify-between items-start border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xs">
                    ME
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-950">
                    {settings.companyName}
                  </h2>
                </div>
                {settings.tradeTagline && <p className="text-xs text-slate-500">{settings.tradeTagline}</p>}
                {settings.address && <p className="text-xs text-slate-500">{settings.address}</p>}
                {settings.phone && (
                  <p className="text-xs text-slate-500 font-mono">Phone: {settings.phone}</p>
                )}
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 bg-slate-100 text-slate-800 border border-slate-200">
                  SALES BILL / ESTIMATE
                </span>
                <p className="text-xs text-slate-500">Bill No:</p>
                <p className="text-sm font-bold font-mono text-slate-900">{sale.invoiceNo}</p>
                <p className="text-xs text-slate-500 mt-1">Date: <span className="font-semibold text-slate-800">{sale.date}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">BILLED TO / PARTY</p>
                <p className="font-bold text-slate-900 text-sm">{sale.customerName}</p>
                {sale.shipToAddress && <p className="text-slate-600 mt-0.5">Site: {sale.shipToAddress}</p>}
                {sale.customerPhone && <p className="text-slate-500 font-mono">Phone: {sale.customerPhone}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">SETTLEMENT &amp; DISPATCH</p>
                <p className="text-slate-700">Payment Status: <span className="font-bold text-slate-900">{sale.paymentStatus}</span></p>
                <p className="text-slate-700">Mode / A/C: <span className="font-semibold">{sale.bankAccountName || sale.paymentMode || 'Credit Ledger'}</span></p>
                <p className="text-slate-700">Vehicle No: <span className="font-mono font-bold text-slate-900">{sale.truckNumber || '—'}</span></p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-3 px-3 text-slate-400 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{item.itemDescription}</p>
                        <p className="text-[11px] text-slate-500">{item.category}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">{item.quantity} {item.unit}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-bold font-mono tabular-nums text-slate-900">₹{item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-start pt-2 gap-6">
              {settings.bankName || settings.bankAccount ? (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 flex-1">
                  <p className="font-bold text-slate-800 uppercase text-[10px] mb-1">Bank Details for RTGS / NEFT</p>
                  {settings.bankName && <p>Bank: <span className="font-semibold text-slate-900">{settings.bankName}</span></p>}
                  {settings.bankAccount && (
                    <p className="font-mono">
                      A/C: {settings.bankAccount}{settings.bankIfsc ? ` · IFSC: ${settings.bankIfsc}` : ''}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Total</span>
                  <span className="font-mono tabular-nums">{formatINR(subtotal)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-950">
                  <span>Grand Total</span>
                  <span className="font-mono text-base tabular-nums">{formatINR(grandTotal)}</span>
                </div>
                {typeof sale.paidAmount === 'number' && sale.paidAmount > 0 && sale.paidAmount < grandTotal && (
                  <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                    <span>Paid Now</span>
                    <span className="font-mono">{formatINR(sale.paidAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5 flex justify-between items-end text-[11px] text-slate-500">
              <div>
                <p className="font-semibold text-slate-700">Terms &amp; Conditions:</p>
                <p>1. Goods once sold will not be taken back without valid inspection report.</p>
                <p>2. All disputes subject to local jurisdiction only.</p>
              </div>
              <div className="text-right">
                <div className="h-8" />
                <p className="font-bold text-slate-900">For {settings.companyName}</p>
                <p className="text-slate-500 font-medium">
                  {settings.directorName ? `${settings.directorName} · ` : ''}Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
