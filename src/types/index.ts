export type Category = 'CEMENT' | 'SCAN TMT BAR' | 'FERTILIZER' | 'Asbestos';

export type UnitType = 'Bags' | 'Tons' | 'Pcs' | 'CFT' | 'Bags/Bottles';

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

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  customerName: string;
  date: string;
  category: Category;
  itemDescription: string;
  quantity: number;
  unit: UnitType;
  unitPrice: number;
  totalAmount: number;
  status: 'Delivered' | 'In Transit' | 'Pending Dispatch';
  paymentStatus: 'Paid' | 'Credit' | 'Partial';
  truckNumber?: string;
}

export interface CustomerLedger {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  address: string;
  totalBilled: number;
  totalPaid: number;
  outstandingReceivable: number;
  creditLimit: number;
  creditDays: number;
  lastTransactionDate: string;
}
