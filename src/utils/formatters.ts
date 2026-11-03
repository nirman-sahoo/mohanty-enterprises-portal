import { SaleRecord, MoneyReceipt, CustomerLedger } from '../types';

/**
 * Converts a number into Indian Currency Words (Lakhs, Crores, Thousands)
 * Example: 154200 -> "Rupees One Lakh Fifty Four Thousand Two Hundred Only"
 */
export function numberToIndianWords(num: number): string {
  const rounded = Math.round(Math.abs(num));
  if (rounded === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertSection(n: number): string {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str.trim();
  }

  let crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundred = remainder;

  let words = '';

  if (crore > 0) {
    words += convertSection(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertSection(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertSection(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    words += convertSection(hundred);
  }

  return `Rupees ${words.trim()} Only`;
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Encodes text cleanly for direct WhatsApp URL invocation
 */
function createWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const phoneParam = cleanPhone.length >= 10 ? (cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`) : '';
  const encodedText = encodeURIComponent(text);
  return phoneParam ? `https://wa.me/${phoneParam}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
}

/**
 * WhatsApp Order Verification message (Page 1)
 */
export function generateOrderWhatsAppUrl(order: SaleRecord): string {
  const itemsText = order.items && order.items.length > 0
    ? order.items.map((it, idx) => `${idx + 1}. ${it.itemDescription} - ${it.quantity} ${it.unit} @ ₹${it.unitPrice.toLocaleString('en-IN')}`).join('\n')
    : `1. ${order.itemDescription} - ${order.quantity} ${order.unit} @ ₹${order.unitPrice.toLocaleString('en-IN')}`;

  const message = 
`*MOHANTY ENTERPRISES - B2B TRADING TERMINAL*
Wholesale Order Verification & Confirmation

*Order No:* ${order.orderNo || order.invoiceNo}
*Date:* ${order.date} ${order.time || ''}
*Party Name:* ${order.customerName}
*Ship To (Site):* ${order.shipToAddress || 'Direct Yard Delivery'}
*Vehicle No:* ${order.truckNumber || 'Pending Allocation'}

*Material Items:*
${itemsText}

*Taxable Subtotal:* ${formatINR(order.subtotal || order.totalAmount)}
${order.isGst ? `*GST (18% CGST+SGST):* ${formatINR(order.gstAmount || 0)}\n*Grand Total:* ${formatINR(order.totalAmount)}` : `*Net Bill Amount (Non-GST / Estimate):* ${formatINR(order.totalAmount)}`}
*Payment Terms:* ${order.paymentStatus}
*Order Status:* ${order.status}

_Kindly reply to confirm or modify this order dispatch._
Mohanty Enterprises · Rasulgarh, Bhubaneswar`;

  return createWhatsAppUrl(order.customerPhone, message);
}

/**
 * WhatsApp Bill Text Format (Page 2)
 */
export function generateBillWhatsAppUrl(order: SaleRecord): string {
  const itemsText = order.items && order.items.length > 0
    ? order.items.map((it, idx) => `• ${it.itemDescription}: ${it.quantity} ${it.unit} x ₹${it.unitPrice} = ₹${it.amount.toLocaleString('en-IN')}`).join('\n')
    : `• ${order.itemDescription}: ${order.quantity} ${order.unit} = ₹${order.totalAmount.toLocaleString('en-IN')}`;

  const message =
`*MOHANTY ENTERPRISES*
Wholesale Dealers & C&F Agents
Plot 128, Industrial Estate, Rasulgarh, Bhubaneswar
GSTIN: 21AAAFM9201E1Z8

*COMMERCIAL ${order.isGst ? 'TAX INVOICE' : 'ESTIMATE BILL'}*
*Bill / Inv No:* ${order.invoiceNo}
*Date:* ${order.date}
*Billed To:* ${order.customerName}
*Delivery Location:* ${order.shipToAddress || 'Direct Delivery'}
*Dispatch Vehicle:* ${order.truckNumber || 'Dispatched'}

*Items Summary:*
${itemsText}

*Total Payable:* ${formatINR(order.totalAmount)}
*Payment Status:* ${order.paymentStatus}
*Delivery Status:* ${order.status}

_Thank you for trading with Mohanty Enterprises!_`;

  return createWhatsAppUrl(order.customerPhone, message);
}

/**
 * WhatsApp Money Receipt Text Format (Page 2)
 */
export function generateMoneyReceiptWhatsAppUrl(receipt: MoneyReceipt): string {
  const message =
`*MOHANTY ENTERPRISES - MONEY RECEIPT*
Plot 128, Industrial Estate, Rasulgarh, Bhubaneswar
GSTIN: 21AAAFM9201E1Z8

*Receipt No:* ${receipt.receiptNo}
*Date:* ${receipt.date}
*Received with thanks from:* ${receipt.partyName}
*Address:* ${receipt.partyAddress}

*Amount Received:* ${formatINR(receipt.amount)}
*Amount in words:* ${receipt.amountInWords}
*Payment Mode:* ${receipt.paymentMode} ${receipt.referenceNo ? `(Ref: ${receipt.referenceNo})` : ''}
*On Account of:* ${receipt.forAccount}

*Remaining Due Balance:* ${formatINR(receipt.dueAmount)}

_This is a computer-generated confirmation receipt._
Authorized Signatory: Ayushman Mohanty`;

  return createWhatsAppUrl(receipt.partyPhone, message);
}

/**
 * WhatsApp Khatabook Reminder Message (Page 3 & 4)
 */
export function generateLedgerReminderWhatsAppUrl(ledger: CustomerLedger): string {
  const message =
`*MOHANTY ENTERPRISES - ACCOUNT BALANCE NOTICE*
To: ${ledger.name}
GSTIN: ${ledger.gstin}

Dear Customer,
This is a gentle payment reminder regarding your outstanding balance with Mohanty Enterprises:

*Total Billed:* ${formatINR(ledger.totalBilled)}
*Total Received:* ${formatINR(ledger.totalPaid)}
*Current Outstanding Due:* ${formatINR(ledger.outstandingReceivable)}
*Total Overdue:* ${formatINR(ledger.totalOverdue)}
*Oldest Due Period:* ${ledger.oldestDueDays} days
*Credit Days Allowed:* ${ledger.creditDays} days

Kindly arrange the payment at your earliest convenience via RTGS/NEFT or Cheque.
For ledger queries, please contact our Accounts Desk at +91 674 258 9120.`;

  return createWhatsAppUrl(ledger.phone, message);
}
