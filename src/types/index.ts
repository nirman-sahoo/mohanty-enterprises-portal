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
  paymentMode?: string;
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

export type Department = 'Accounts' | 'Sales' | 'HR' | 'Admin' | 'Warehouse / Yard' | 'Logistics';

export type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive';

export interface Employee {
  id: string;
  empCode: string;
  name: string;
  department: Department;
  designation: string;
  phone: string;
  email: string;
  joiningDate: string;
  monthlySalary: number; // in ₹
  bankAccount: string;
  bankIfsc: string;
  panNo: string;
  status: EmployeeStatus;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'On Leave' | 'Half Day';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: Department;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
}

export type LeaveType = 'Casual' | 'Sick' | 'Earned';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: Department;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
}

export interface PayrollRecord {
  id: string;
  month: string; // YYYY-MM
  employeeId: string;
  employeeName: string;
  department: Department;
  designation: string;
  basicSalary: number;
  allowances: number;
  pfDeduction: number;
  taxDeduction: number;
  netSalary: number;
  paymentStatus: 'Paid' | 'Processing' | 'Pending';
  paymentDate?: string;
  bankReference?: string;
}

export type HRSubTab = 'overview' | 'employee' | 'attendance' | 'payroll' | 'leave' | 'reports';

export interface ExpenseRecord {
  id: string;
  expenseNo: string;
  date: string;
  category: 'Logistics & Diesel' | 'Yard Labour' | 'Vehicle Maintenance' | 'Utilities & Rent' | 'Loading & Unloading' | 'Office Tea & Snacks';
  description: string;
  amount: number;
  paymentMode: 'Cash' | 'Bank Transfer (RTGS/NEFT)' | 'UPI' | 'Cheque';
  paidTo: string;
  approvedBy: string;
  status: 'Approved' | 'Pending' | 'Rejected';
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
  date: string;
  category: Category;
  items: PurchaseItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  truckNumber: string;
  challanNo: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  ifsc: string;
  accountType: 'Current' | 'Cash Credit (CC)' | 'Cash Drawer';
  currentBalance: number;
  unclearedChequesCount: number;
  status: 'Active' | 'Reconciled';
}

export interface ContraEntry {
  id: string;
  voucherNo: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  referenceNo: string;
  remarks: string;
}

export interface JournalEntry {
  id: string;
  jvNo: string;
  date: string;
  debitAccount: string;
  debitAmount: number;
  creditAccount: string;
  creditAmount: number;
  narration: string;
  authorizedBy: string;
}

export interface AccountHead {
  id: string;
  code: string;
  name: string;
  group: 'Current Assets' | 'Fixed Assets' | 'Current Liabilities' | 'Direct Incomes' | 'Direct Expenses' | 'Indirect Expenses';
  balance: number;
  balanceType: 'Dr' | 'Cr';
}
