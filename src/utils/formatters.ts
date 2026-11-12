import { SaleRecord, MoneyReceipt, CustomerLedger, CompanySettings } from '../types';

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

export function generateOrderWhatsAppUrl(order: SaleRecord, settings?: CompanySettings): string {
  const company = settings?.companyName || 'MOHANTY ENTERPRISES';
  const itemsText = order.items && order.items.length > 0
    ? order.items.map((it, idx) => `${idx + 1}. ${it.itemDescription} - ${it.quantity} ${it.unit} @ ₹${it.unitPrice.toLocaleString('en-IN')}`).join('\n')
    : `1. ${order.itemDescription} - ${order.quantity} ${order.unit} @ ₹${order.unitPrice.toLocaleString('en-IN')}`;

  const message = 
`*${company}*
Order Verification & Confirmation

*Order No:* ${order.orderNo || order.invoiceNo}
*Date:* ${order.date} ${order.time || ''}
*Party Name:* ${order.customerName}
*Ship To:* ${order.shipToAddress || '—'}
*Vehicle No:* ${order.truckNumber || '—'}

*Material Items:*
${itemsText}

*Net Bill Amount:* ${formatINR(order.totalAmount)}
*Payment Terms:* ${order.paymentStatus}
*Order Status:* ${order.status}${settings?.address ? `\n\n${settings.address}` : ''}`;

  return createWhatsAppUrl(order.customerPhone, message);
}

export function generateBillWhatsAppUrl(order: SaleRecord, settings?: CompanySettings): string {
  const company = settings?.companyName || 'MOHANTY ENTERPRISES';
  const itemsText = order.items && order.items.length > 0
    ? order.items.map((it) => `• ${it.itemDescription}: ${it.quantity} ${it.unit} x ₹${it.unitPrice} = ₹${it.amount.toLocaleString('en-IN')}`).join('\n')
    : `• ${order.itemDescription}: ${order.quantity} ${order.unit} = ₹${order.totalAmount.toLocaleString('en-IN')}`;

  const headerMeta = settings?.address || '';

  const message =
`*${company}*${headerMeta ? `\n${headerMeta}` : ''}

*SALES BILL / ESTIMATE*
*Bill No:* ${order.invoiceNo}
*Date:* ${order.date}
*Billed To:* ${order.customerName}
*Delivery Location:* ${order.shipToAddress || '—'}
*Dispatch Vehicle:* ${order.truckNumber || '—'}

*Items Summary:*
${itemsText}

*Total Payable:* ${formatINR(order.totalAmount)}
*Payment Status:* ${order.paymentStatus}
*Delivery Status:* ${order.status}

_Thank you for trading with ${company}._`;

  return createWhatsAppUrl(order.customerPhone, message);
}

export function generateMoneyReceiptWhatsAppUrl(receipt: MoneyReceipt, settings?: CompanySettings): string {
  const company = settings?.companyName || 'MOHANTY ENTERPRISES';
  const headerMeta = settings?.address || '';

  const message =
`*${company} - MONEY RECEIPT*${headerMeta ? `\n${headerMeta}` : ''}

*Receipt No:* ${receipt.receiptNo}
*Date:* ${receipt.date}
*Received with thanks from:* ${receipt.partyName}
${receipt.partyAddress ? `*Address:* ${receipt.partyAddress}\n` : ''}
*Amount Received:* ${formatINR(receipt.amount)}
*Amount in words:* ${receipt.amountInWords}
*Payment Mode:* ${receipt.paymentMode} ${receipt.referenceNo ? `(Ref: ${receipt.referenceNo})` : ''}
*On Account of:* ${receipt.forAccount}

*Remaining Due Balance:* ${formatINR(receipt.dueAmount)}${settings?.directorName ? `\n\nAuthorized Signatory: ${settings.directorName}` : ''}`;

  return createWhatsAppUrl(receipt.partyPhone, message);
}

export function generateLedgerReminderWhatsAppUrl(ledger: CustomerLedger, settings?: CompanySettings): string {
  const company = settings?.companyName || 'MOHANTY ENTERPRISES';
  const message =
`*${company} - ACCOUNT BALANCE NOTICE*
To: ${ledger.name}

Dear Customer,
This is a payment reminder regarding your outstanding balance with ${company}:

*Total Billed:* ${formatINR(ledger.totalBilled)}
*Total Received:* ${formatINR(ledger.totalPaid)}
*Current Outstanding Due:* ${formatINR(ledger.outstandingReceivable)}
*Total Overdue:* ${formatINR(ledger.totalOverdue)}
*Oldest Due Period:* ${ledger.oldestDueDays} days
*Credit Days Allowed:* ${ledger.creditDays} days

Kindly arrange payment at your earliest convenience.${settings?.phone ? `\nFor ledger queries, contact ${settings.phone}.` : ''}`;

  return createWhatsAppUrl(ledger.phone, message);
}
