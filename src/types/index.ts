export type Category = 'CEMENT' | 'SCAN TMT BAR' | 'FERTILIZER' | 'Asbestos';

export type UnitType = 'Bags' | 'Tons' | 'Pcs' | 'CFT' | 'Bags/Bottles' | 'KG';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  stockLevel: number;
  unit: UnitType;
  reorderLevel: number;
  unitPrice: number;
  hsnCode: string;
  isCriticalLow?: boolean;
}

export interface OrderItem {
  id: string;
  category: Category;
  itemDescription: string;
  quantity: number;
  unit: UnitType;
  unitPrice: number;
  amount: number;
}

export type OrderStatus = 'Pending Verification' | 'Confirmed' | 'In Transit' | 'Delivered' | 'Cancelled';

export type PaymentStatus = 'Paid' | 'Credit' | 'Partial';

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  orderNo: string;
  customerName: string;
  shipToAddress: string;
  customerPhone: string;
  date: string;
  time: string;
  items: OrderItem[];
  // For backwards compatibility and fast table view
  category: Category;
  itemDescription: string;
  quantity: number;
  unit: UnitType;
  unitPrice: number;
  
  subtotal: number;
  isGst: boolean;
  gstAmount: number;
  totalAmount: number; // Final payable
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  truckNumber?: string;
  notes?: string;
}

export interface MoneyReceipt {
  id: string;
  receiptNo: string;
  date: string;
  partyName: string;
  partyAddress: string;
  partyPhone: string;
  amount: number;
  amountInWords: string;
  paymentMode: 'Cash' | 'RTGS / NEFT' | 'UPI / QR' | 'Cheque / DD';
  forAccount: string;
  paidAmount: number;
  dueAmount: number;
  referenceNo?: string;
}

export type VoucherType = 'Sales' | 'Pur' | 'Payment' | 'Discount';

export interface StatementEntry {
  id: string;
  date: string;
  voucherType: VoucherType;
  details: string;
  itemQty?: string; // Purchase & sales column qty wise
  debit: number;    // Amount billed / material out
  credit: number;   // Amount received / paid
  balance: number;  // Running balance
  balanceType: 'Dr' | 'Cr';
}

export interface CustomerLedger {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  address: string;
  shipToAddress?: string;
  totalBilled: number;
  totalPaid: number;
  outstandingReceivable: number;
  totalOverdue: number;
  creditLimit: number;
  creditDays: number;
  lastPaymentDate: string;
  lastTransactionDate: string;
  averageCollectionDays: number;
  oldestDueDays: number;
  nextFollowUpDate?: string;
  followUpNote?: string;
  promisesToPay?: string;
  statementEntries: StatementEntry[];
}
