import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Send, 
  Receipt, 
  FileText,
  FileCheck2,
  Percent,
  Image as ImageIcon,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { SaleRecord } from '../types';
import { formatINR, generateBillWhatsAppUrl } from '../utils/formatters';
import { generateAndCopyReceiptImage } from '../utils/generateReceiptImage';

interface InvoiceModalProps {
  sale: SaleRecord | null;
  onClose: () => void;
  onUpdateGst?: (saleId: string, isGst: boolean) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ 
  sale, 
  onClose,
  onUpdateGst 
}) => {
  if (!sale) return null;

  // Layout mode: 'standard' (A4 Invoice) or 'thermal-slip' (2-inch / 3-inch compact receipt format)
  const [layoutMode, setLayoutMode] = useState<'standard' | 'thermal-slip'>('thermal-slip');
  const [isGst, setIsGst] = useState<boolean>(sale.isGst ?? true);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Recalculate based on GST toggle
  const subtotal = sale.subtotal || sale.totalAmount;
  const gstRate = 0.18;
  const gstAmount = isGst ? Math.round(subtotal * gstRate) : 0;
  const grandTotal = isGst ? subtotal + gstAmount : subtotal;

  const currentSaleWithGst: SaleRecord = {
    ...sale,
    isGst,
    subtotal,
    gstAmount,
    totalAmount: grandTotal,
  };

  const handleToggleGst = (newGstState: boolean) => {
    setIsGst(newGstState);
    if (onUpdateGst) {
      onUpdateGst(sale.id, newGstState);
    }
  };

  // Button 1: Text Format (PDF Page 1: "CREATE IN IMAGE FORMATE OR TEXT FORMAT (ADD 2 BUTTON)")
  const handleTextFormatAction = () => {
    const itemsSummary = (sale.items && sale.items.length > 0)
      ? sale.items.map((it, idx) => `${idx + 1}. ${it.itemDescription}: ${it.quantity} ${it.unit} @ ₹${it.unitPrice} = ₹${it.amount}`).join('\n')
      : `1. ${sale.itemDescription}: ${sale.quantity} ${sale.unit} = ₹${grandTotal}`;

    const textToCopy = 
`*MOHANTY ENTERPRISES*
Wholesale Dealers & C&F Agents
Plot 128, Industrial Estate, Rasulgarh, Bhubaneswar
${isGst ? 'GSTIN: 21AAAFM9201E1Z8\n' : ''}*${isGst ? 'COMMERCIAL TAX INVOICE' : 'ESTIMATE / CASH MEMO'}*
Invoice No: ${sale.invoiceNo}
Date: ${sale.date} ${sale.time || ''}
Party: ${sale.customerName}
${sale.shipToAddress ? `Ship To: ${sale.shipToAddress}\n` : ''}${sale.truckNumber ? `Vehicle: ${sale.truckNumber}\n` : ''}
*Items:*
${itemsSummary}

Subtotal: ${formatINR(subtotal)}
${isGst ? `CGST (9%): ${formatINR(Math.round(gstAmount / 2))}\nSGST (9%): ${formatINR(Math.round(gstAmount / 2))}\n` : ''}*TOTAL AMOUNT: ${formatINR(grandTotal)}*
Payment Terms: ${sale.paymentStatus}

Thank you for trading with Mohanty Enterprises!`;

    navigator.clipboard.writeText(textToCopy);
    setToastMessage('Bill Text Copied to Clipboard & Launching WhatsApp...');
    setTimeout(() => setToastMessage(null), 3500);

    const url = generateBillWhatsAppUrl(currentSaleWithGst);
    window.open(url, '_blank');
  };

  // Button 2: Image Format (PDF Page 1: "CREATE IN IMAGE FORMATE OR TEXT FORMAT (ADD 2 BUTTON)")
  const handleImageFormatAction = async () => {
    setIsGeneratingImage(true);
    setToastMessage('Rendering high-definition receipt image...');

    const result = await generateAndCopyReceiptImage(currentSaleWithGst);
    setIsGeneratingImage(false);

    if (result.success) {
      if (result.copiedToClipboard) {
        setToastMessage('Receipt PNG downloaded & copied to clipboard! Paste directly (Ctrl+V) into WhatsApp.');
      } else {
        setToastMessage('Receipt PNG image downloaded to your device!');
      }
    } else {
      setToastMessage('Failed to generate image. Please try again.');
    }

    setTimeout(() => setToastMessage(null), 4500);
  };

  const handlePrint = () => {
    window.print();
  };

  const lineItems = sale.items && sale.items.length > 0
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
      <div className={`relative w-full ${layoutMode === 'thermal-slip' ? 'max-w-md' : 'max-w-2xl'} bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8 transition-all`}>
        {/* Top Notification Toast */}
        {toastMessage && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in transition-all print:hidden">
            <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold truncate">
              {isGst ? 'Tax Invoice' : 'Wholesale Estimate / Bill'} · {sale.invoiceNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* GST or Non-GST Toggle Button */}
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => handleToggleGst(true)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  isGst ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                GST Bill
              </button>
              <button
                type="button"
                onClick={() => handleToggleGst(false)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  !isGst ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Non-GST / Estimate
              </button>
            </div>

            {/* Layout Format: Standard vs Compact Thermal Slip */}
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
                title="2-inch / 3-inch Thermal Slip Format"
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  layoutMode === 'thermal-slip' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handlePrint}
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

        {/* PROMINENT DUAL BUTTONS BAR (As requested in PDF Page 1: "CREATE IN IMAGE FORMATE OR TEXT FORMAT (ADD 2 BUTTON)") */}
        <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="font-bold text-slate-800">Share Slip:</span>
            <span>Choose format to send to customer:</span>
          </div>

          <div className="flex items-center gap-2">
            {/* BUTTON 1: TEXT FORMAT */}
            <button
              type="button"
              onClick={handleTextFormatAction}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Text Format</span>
            </button>

            {/* BUTTON 2: IMAGE FORMAT */}
            <button
              type="button"
              onClick={handleImageFormatAction}
              disabled={isGeneratingImage}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{isGeneratingImage ? 'Creating Image...' : 'Image Format'}</span>
            </button>
          </div>
        </div>

        {/* FORMAT 1: COMPACT 2-INCH / 3-INCH THERMAL SLIP FORMAT (Requested view format without physical print) */}
        {layoutMode === 'thermal-slip' ? (
          <div className="p-6 bg-slate-50 font-mono text-slate-900 select-text">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-slate-300 space-y-3.5 max-w-sm mx-auto text-xs">
              {/* Slip Header */}
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <h3 className="font-bold text-sm tracking-tight text-slate-950">MOHANTY ENTERPRISES</h3>
                <p className="text-[10px] text-slate-600">Plot 128, Industrial Estate, Rasulgarh</p>
                <p className="text-[10px] text-slate-600">Bhubaneswar · Phone: 9861044211</p>
                {isGst && <p className="text-[10px] font-bold text-slate-800">GSTIN: 21AAAFM9201E1Z8</p>}
                <div className="mt-2 inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 text-[10px] font-bold uppercase">
                  {isGst ? 'COMMERCIAL TAX INVOICE' : 'ESTIMATE / CASH MEMO'}
                </div>
              </div>

              {/* Bill Details */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>Inv No:</span>
                  <span className="font-bold">{sale.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{sale.date} {sale.time || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold text-right truncate max-w-[170px]">{sale.customerName}</span>
                </div>
                {sale.truckNumber && (
                  <div className="flex justify-between">
                    <span>Vehicle:</span>
                    <span className="font-bold">{sale.truckNumber}</span>
                  </div>
                )}
                {sale.shipToAddress && (
                  <div className="text-[10px] text-slate-500 pt-0.5">
                    <span>Ship To: </span>
                    <span className="truncate">{sale.shipToAddress}</span>
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="space-y-2 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500">
                  <span>Item & Qty</span>
                  <span>Rate</span>
                  <span>Amount</span>
                </div>
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

              {/* Calculations */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                {isGst && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (9%):</span>
                      <span>{formatINR(Math.round(gstAmount / 2))}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (9%):</span>
                      <span>{formatINR(Math.round(gstAmount / 2))}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-950 border-t border-dashed border-slate-400 pt-1.5">
                  <span>Total Amount:</span>
                  <span className="font-black text-base">{formatINR(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>Payment Terms:</span>
                  <span className="font-semibold">{sale.paymentStatus}</span>
                </div>
              </div>

              {/* Slip Footer */}
              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-0.5">
                <p className="font-bold text-slate-700">Thank you for trading with us!</p>
                <p>Goods once sold will not be returned.</p>
                <p className="font-mono text-[9px] text-slate-400">Printed from Mohanty B2B Terminal</p>
              </div>
            </div>
          </div>
        ) : (
          /* FORMAT 2: STANDARD A4 COMMERCIAL TAX INVOICE */
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
                  Wholesale Dealers & C&F Agents · Cement, TMT Bars, Fertilizers, Asbestos
                </p>
                <p className="text-xs text-slate-500">
                  Plot No. 128, Industrial Estate, Rasulgarh, Bhubaneswar - 751010
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {isGst ? 'GSTIN: 21AAAFM9201E1Z8 · ' : ''}Phone: +91 674 258 9120
                </p>
              </div>

              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 ${
                  isGst ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}>
                  {isGst ? 'TAX INVOICE' : 'WHOLESALE ESTIMATE / BILL'}
                </span>
                <p className="text-xs text-slate-500">Invoice No:</p>
                <p className="text-sm font-bold font-mono text-slate-900">{sale.invoiceNo}</p>
                {sale.orderNo && (
                  <p className="text-[11px] font-mono text-slate-500">Order: {sale.orderNo}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">Date:</p>
                <p className="text-xs font-semibold text-slate-800">{sale.date} {sale.time || ''}</p>
              </div>
            </div>

            {/* Billed To / Consignee */}
            <div className="grid grid-cols-2 gap-4 text-xs p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  BILLED TO / BUYER
                </p>
                <p className="font-bold text-slate-900 text-sm">{sale.customerName}</p>
                {sale.shipToAddress && (
                  <p className="text-slate-600 mt-0.5">
                    <span className="font-semibold text-slate-700">Ship To: </span>
                    {sale.shipToAddress}
                  </p>
                )}
                {sale.customerPhone && (
                  <p className="text-slate-500 mt-0.5 font-mono">Contact: {sale.customerPhone}</p>
                )}
                <p className="text-slate-500 mt-1">
                  Payment Terms: <span className="font-semibold text-slate-700">{sale.paymentStatus}</span>
                </p>
              </div>
              <div className="text-right sm:text-left">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  DISPATCH & TRANSPORT
                </p>
                <p className="text-slate-700">
                  Vehicle Reg. No: <span className="font-mono font-bold text-slate-900">{sale.truckNumber || 'OD-02-AK-9142'}</span>
                </p>
                <p className="text-slate-700">
                  Primary Category: <span className="font-semibold text-slate-900">{sale.category}</span>
                </p>
                <p className="text-slate-500 mt-1">
                  Delivery Status: <span className="text-emerald-700 font-semibold">{sale.status}</span>
                </p>
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
                    <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-3 px-3 text-slate-400 font-mono">0{idx + 1}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{item.itemDescription}</p>
                        <p className="text-[11px] text-slate-500">Category: {item.category} · Wholesale Standard Lot</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        ₹{item.unitPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold font-mono tabular-nums text-slate-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation Breakdown */}
            <div className="flex justify-end pt-2">
              <div className="w-72 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Amount</span>
                  <span className="font-mono tabular-nums">{formatINR(subtotal)}</span>
                </div>
                {isGst && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (9.0%)</span>
                      <span className="font-mono tabular-nums">{formatINR(Math.round(gstAmount / 2))}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (9.0%)</span>
                      <span className="font-mono tabular-nums">{formatINR(Math.round(gstAmount / 2))}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-950">
                  <span>{isGst ? 'Invoice Total' : 'Net Estimate Amount'}</span>
                  <span className="font-mono text-base text-slate-950 tabular-nums">{formatINR(grandTotal)}</span>
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
                <p className="text-slate-500 font-medium">Ayushman Mohanty · Authorized Signatory</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLayoutMode(layoutMode === 'standard' ? 'thermal-slip' : 'standard')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              <span>{layoutMode === 'standard' ? 'Switch to Compact Thermal Slip View' : 'Switch to Standard Invoice View'}</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
