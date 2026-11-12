export type Category = 'CEMENT' | 'SCAN TMT BAR' | 'FERTILIZER' | 'Asbestos';

export type UnitType = 'Bags' | 'Tons' | 'Pcs' | 'CFT' | 'Bags/Bottles' | 'KG';

export type SettlementChannel = 'Cash' | 'Bank' | 'Credit';

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
  customerGstin?: string;
  shipToAddress: string;
  customerPhone: string;
  date: string;
  time: string;
  items: OrderItem[];
  category: Category;
  itemDescription: string;
  quantity: number;
  unit: UnitType;
  unitPrice: number;

  subtotal: number;
  isGst: boolean;
  gstRate?: number;
  gstAmount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMode?: string; // 'Cash' | 'RTGS / NEFT' | 'UPI / QR' | 'Cheque / DD' | 'Credit'
  paidAmount?: number;
  bankAccountId?: string;
  bankAccountName?: string;
  paymentReference?: string;
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
  bankAccountId?: string;
  bankAccountName?: string;
  forAccount: string;
  paidAmount: number;
  dueAmount: number;
  referenceNo?: string;
  remarks?: string;
}

export interface PaymentVoucher {
  id: string;
  voucherNo: string;
  date: string;
  supplierName: string;
  supplierGst?: string;
  purchaseId?: string;
  purchaseNo?: string;
  amount: number;
  paymentMode: 'Cash' | 'RTGS / NEFT' | 'UPI / QR' | 'Cheque / DD';
  bankAccountId: string;
  bankAccountName: string;
  referenceNo?: string;
  remarks?: string;
}

export type VoucherType = 'Sales' | 'Pur' | 'Payment' | 'Discount';

export interface StatementEntry {
  id: string;
  date: string;
  voucherType: VoucherType;
  voucherRefId?: string;
  details: string;
  itemQty?: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface CustomerLedger {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  address: string;
  shipToAddress?: string;
  openingBalance?: number;
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

export interface PurchaseItem {
  itemId: string;
  itemName: string;
  category: Category;
  quantity: number;
  unit: UnitType;
  rate: number;
  amount: number;
}

export interface PurchaseRecord {
  id: string;
  purchaseNo: string;
  supplierName: string;
  supplierGst: string;
  supplierPhone?: string;
  supplierAddress?: string;
  date: string;
  category: Category;
  items: PurchaseItem[];
  subtotal: number;
  isGst?: boolean;
  gstRate?: number;
  gstAmount: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  paymentMode?: 'Cash' | 'RTGS / NEFT' | 'UPI / QR' | 'Cheque / DD' | 'Credit';
  paidAmount?: number;
  bankAccountId?: string;
  bankAccountName?: string;
  paymentReference?: string;
  truckNumber: string;
  challanNo: string;
  notes?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  ifsc: string;
  accountType: 'Current' | 'Cash Credit (CC)' | 'Cash Drawer';
  openingBalance?: number;
  currentBalance: number;
  unclearedChequesCount: number;
  status: 'Active' | 'Reconciled';
}

export interface ContraEntry {
  id: string;
  voucherNo: string;
  date: string;
  fromAccountId?: string;
  fromAccount: string;
  toAccountId?: string;
  toAccount: string;
  amount: number;
  referenceNo: string;
  remarks: string;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  directorName: string;
  designation: string;
  tradeTagline: string;
  slogan: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  address: string;
  invoicePrefix: string;
  purchasePrefix: string;
  receiptPrefix: string;
  paymentPrefix: string;
  contraPrefix: string;
  defaultGstRate: number;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  whatsappAlerts: boolean;
  autoPrintEstimate: boolean;
  roundOffInvoices: boolean;
}

export type BookEntrySource =
  | 'Sales Receipt'
  | 'Money Receipt'
  | 'Purchase Payment'
  | 'Payment Voucher'
  | 'Contra Deposit'
  | 'Contra Withdrawal'
  | 'Contra Transfer';

export interface LedgerBookEntry {
  id: string;
  sourceId: string;
  sourceCollection: 'orders' | 'money_receipts' | 'purchases' | 'payment_vouchers' | 'contra_entries';
  date: string;
  voucherNo: string;
  particulars: string;
  voucherType: BookEntrySource;
  accountId: string;
  accountName: string;
  paymentMode: string;
  referenceNo?: string;
  debit: number;  // Inward / Receipt
  credit: number; // Outward / Payment
  runningBalance: number;
  canDeleteDirect?: boolean;
}

export interface SupplierPayableSummary {
  supplierName: string;
  supplierGst: string;
  supplierPhone?: string;
  totalPurchased: number;
  totalPaid: number;
  outstandingPayable: number;
  billCount: number;
  unpaidBillCount: number;
  lastPurchaseDate: string;
  lastPaymentDate: string;
  purchases: PurchaseRecord[];
  payments: PaymentVoucher[];
}
