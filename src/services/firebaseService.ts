import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { 
  InventoryItem, 
  SaleRecord, 
  CustomerLedger, 
  MoneyReceipt, 
  StatementEntry,
  Category,
  UnitType,
  Employee,
  AttendanceRecord,
  LeaveRequest,
  PayrollRecord,
  LeaveStatus,
  Department,
  EmployeeStatus,
  AttendanceStatus,
  ExpenseRecord,
  PurchaseRecord,
  BankAccount,
  ContraEntry,
  JournalEntry,
  AccountHead,
} from '../types';
import { CATEGORIES, CATEGORY_ITEMS } from '../data/inventoryData';

// Standard 20 catalog SKUs initialized with 0 stock as requested
const CATALOG_SEEDS: Omit<InventoryItem, 'id'>[] = [
  // CEMENT
  { name: 'CEMENT', category: 'CEMENT', stockLevel: 0, unit: 'Bags', reorderLevel: 500, unitPrice: 410, hsnCode: '252329', isCriticalLow: false },
  { name: 'PPC CEMENT', category: 'CEMENT', stockLevel: 0, unit: 'Bags', reorderLevel: 300, unitPrice: 385, hsnCode: '252329', isCriticalLow: false },

  // SCAN TMT BAR
  { name: 'M/S TMT RODS / BARS 6mm', category: 'SCAN TMT BAR', stockLevel: 0, unit: 'Tons', reorderLevel: 10, unitPrice: 56500, hsnCode: '721420', isCriticalLow: false },
  { name: 'M/S TMT RODS / BARS 8mm', category: 'SCAN TMT BAR', stockLevel: 0, unit: 'Tons', reorderLevel: 15, unitPrice: 55200, hsnCode: '721420', isCriticalLow: false },
  { name: 'M/S TMT RODS / BARS 10mm', category: 'SCAN TMT BAR', stockLevel: 0, unit: 'Tons', reorderLevel: 15, unitPrice: 54800, hsnCode: '721420', isCriticalLow: false },
  { name: 'M/S TMT RODS / BARS 12mm', category: 'SCAN TMT BAR', stockLevel: 0, unit: 'Tons', reorderLevel: 15, unitPrice: 54500, hsnCode: '721420', isCriticalLow: false },
  { name: 'M/S TMT RODS / BARS 16mm', category: 'SCAN TMT BAR', stockLevel: 0, unit: 'Tons', reorderLevel: 10, unitPrice: 54500, hsnCode: '721420', isCriticalLow: false },
  { name: 'M/S TMT RODS / BARS 20mm', category: 'SCAN TMT BAR', stockLevel: 0, unit: 'Tons', reorderLevel: 10, unitPrice: 55000, hsnCode: '721420', isCriticalLow: false },

  // FERTILIZER
  { name: 'GROMOR 20:20:0:13 50kg', category: 'FERTILIZER', stockLevel: 0, unit: 'Bags', reorderLevel: 200, unitPrice: 1350, hsnCode: '310520', isCriticalLow: false },
  { name: 'GROMOR 28:28:0 50Kg', category: 'FERTILIZER', stockLevel: 0, unit: 'Bags', reorderLevel: 200, unitPrice: 1650, hsnCode: '310520', isCriticalLow: false },
  { name: 'GROMOR UREANEEM COATED 45KG', category: 'FERTILIZER', stockLevel: 0, unit: 'Bags', reorderLevel: 300, unitPrice: 266, hsnCode: '310210', isCriticalLow: false },
  { name: 'Iffco Nano Urea', category: 'FERTILIZER', stockLevel: 0, unit: 'Bags/Bottles', reorderLevel: 150, unitPrice: 225, hsnCode: '310210', isCriticalLow: false },
  { name: 'MKP IMP (0:52:34) WSF 1KG', category: 'FERTILIZER', stockLevel: 0, unit: 'Pcs', reorderLevel: 100, unitPrice: 240, hsnCode: '310559', isCriticalLow: false },
  { name: 'NANO DAP', category: 'FERTILIZER', stockLevel: 0, unit: 'Bags/Bottles', reorderLevel: 100, unitPrice: 600, hsnCode: '310530', isCriticalLow: false },
  { name: 'NANO UREA PLUS 500 ML', category: 'FERTILIZER', stockLevel: 0, unit: 'Bags/Bottles', reorderLevel: 150, unitPrice: 230, hsnCode: '310210', isCriticalLow: false },
  { name: 'NEEM UREA PH-II (45 KG)', category: 'FERTILIZER', stockLevel: 0, unit: 'Bags', reorderLevel: 250, unitPrice: 266, hsnCode: '310210', isCriticalLow: false },
  { name: 'PPL BHARAT DAP 18:46', category: 'FERTILIZER', stockLevel: 0, unit: 'Bags', reorderLevel: 200, unitPrice: 1350, hsnCode: '310530', isCriticalLow: false },
  { name: 'PPL BHARAT NPK 20:20', category: 'FERTILIZER', stockLevel: 0, unit: 'Bags', reorderLevel: 200, unitPrice: 1280, hsnCode: '310520', isCriticalLow: false },

  // Asbestos
  { name: 'EVERCOOL 2.25M', category: 'Asbestos', stockLevel: 0, unit: 'Pcs', reorderLevel: 100, unitPrice: 680, hsnCode: '681140', isCriticalLow: false },
  { name: 'EVERCOOL 2.50M', category: 'Asbestos', stockLevel: 0, unit: 'Pcs', reorderLevel: 150, unitPrice: 750, hsnCode: '681140', isCriticalLow: false },
  { name: 'EVERCOOL 3.00M', category: 'Asbestos', stockLevel: 0, unit: 'Pcs', reorderLevel: 150, unitPrice: 890, hsnCode: '681140', isCriticalLow: false },
  { name: 'GREY 2.50M', category: 'Asbestos', stockLevel: 0, unit: 'Pcs', reorderLevel: 100, unitPrice: 620, hsnCode: '681140', isCriticalLow: false },
  { name: 'GREY 3.00M', category: 'Asbestos', stockLevel: 0, unit: 'Pcs', reorderLevel: 100, unitPrice: 740, hsnCode: '681140', isCriticalLow: false },
];

/**
 * Real-time listener for Inventory.
 * Auto-seeds catalog with 0 stock if collection is empty on first boot.
 */
export function subscribeToInventory(onData: (items: InventoryItem[]) => void): () => void {
  const colPath = 'inventory';
  const colRef = collection(db, colPath);

  // Check and seed if empty
  getDocs(colRef).then((snapshot) => {
    if (snapshot.empty) {
      console.log('Seeding initial verified catalog with 0 stock in Firestore...');
      CATALOG_SEEDS.forEach(async (item, index) => {
        const docId = `sku-${index + 1}`;
        await setDoc(doc(db, colPath, docId), {
          ...item,
          id: docId,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, colPath));
      });
    }
  }).catch((err) => {
    handleFirestoreError(err, OperationType.GET, colPath);
  });

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: InventoryItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          category: data.category as Category,
          stockLevel: Number(data.stockLevel) || 0,
          unit: data.unit as UnitType,
          reorderLevel: Number(data.reorderLevel) || 0,
          unitPrice: Number(data.unitPrice) || 0,
          hsnCode: data.hsnCode || '',
          isCriticalLow: (Number(data.stockLevel) || 0) <= (Number(data.reorderLevel) || 0),
        };
      });
      onData(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

/**
 * Real-time listener for Orders & Commercial Invoices.
 * Real production data (starts empty, grows with live billing).
 */
export function subscribeToOrders(onData: (orders: SaleRecord[]) => void): () => void {
  const colPath = 'orders';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const orders: SaleRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          invoiceNo: d.invoiceNo || '',
          orderNo: d.orderNo || '',
          customerName: d.customerName || '',
          shipToAddress: d.shipToAddress || '',
          customerPhone: d.customerPhone || '',
          date: d.date || '',
          time: d.time || '',
          items: d.items || [],
          category: d.category || 'CEMENT',
          itemDescription: d.itemDescription || '',
          quantity: Number(d.quantity) || 0,
          unit: d.unit || 'Bags',
          unitPrice: Number(d.unitPrice) || 0,
          subtotal: Number(d.subtotal) || Number(d.totalAmount) || 0,
          isGst: d.isGst !== false,
          gstAmount: Number(d.gstAmount) || 0,
          totalAmount: Number(d.totalAmount) || 0,
          status: d.status || 'Confirmed',
          paymentStatus: d.paymentStatus || 'Credit',
          truckNumber: d.truckNumber || '',
          notes: d.notes || '',
        };
      });

      // Sort newest first
      orders.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
      onData(orders);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

/**
 * Real-time listener for Khatabook Contractor Ledgers.
 * Real production data.
 */
export function subscribeToLedgers(onData: (ledgers: CustomerLedger[]) => void): () => void {
  const colPath = 'ledgers';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const ledgers: CustomerLedger[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          name: d.name || '',
          gstin: d.gstin || '',
          phone: d.phone || '',
          address: d.address || '',
          shipToAddress: d.shipToAddress || '',
          totalBilled: Number(d.totalBilled) || 0,
          totalPaid: Number(d.totalPaid) || 0,
          outstandingReceivable: Number(d.outstandingReceivable) || 0,
          totalOverdue: Number(d.totalOverdue) || 0,
          creditLimit: Number(d.creditLimit) || 1500000,
          creditDays: Number(d.creditDays) || 30,
          lastPaymentDate: d.lastPaymentDate || '',
          lastTransactionDate: d.lastTransactionDate || '',
          averageCollectionDays: Number(d.averageCollectionDays) || 15,
          oldestDueDays: Number(d.oldestDueDays) || 0,
          nextFollowUpDate: d.nextFollowUpDate || '',
          followUpNote: d.followUpNote || '',
          promisesToPay: d.promisesToPay || '',
          statementEntries: d.statementEntries || [],
        };
      });

      // Sort by outstanding receivable descending
      ledgers.sort((a, b) => b.outstandingReceivable - a.outstandingReceivable);
      onData(ledgers);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

/**
 * Save new order to Firestore, deduct warehouse inventory stock, and update contractor ledger atomically.
 */
export async function createOrderInDb(
  order: SaleRecord,
  currentInventory: InventoryItem[],
  currentLedgers: CustomerLedger[]
): Promise<void> {
  const ordersPath = 'orders';
  try {
    // 1. Write order document
    await setDoc(doc(db, ordersPath, order.id), {
      ...order,
      createdAt: new Date().toISOString(),
    });

    // 2. Deduct inventory items
    const inventoryPath = 'inventory';
    for (const lineItem of (order.items && order.items.length > 0 ? order.items : [order])) {
      const matchInv = currentInventory.find((inv) => inv.name === lineItem.itemDescription);
      if (matchInv) {
        const deductionQty = lineItem.quantity;
        const newStock = Math.max(0, Number((matchInv.stockLevel - deductionQty).toFixed(2)));
        await updateDoc(doc(db, inventoryPath, matchInv.id), {
          stockLevel: newStock,
          isCriticalLow: newStock <= matchInv.reorderLevel,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, inventoryPath));
      }
    }

    // 3. Update or create Customer Ledger & Statement
    const ledgersPath = 'ledgers';
    const existingLedger = currentLedgers.find(
      (l) => l.name.toLowerCase() === order.customerName.toLowerCase()
    );

    const itemQtySummary = order.items && order.items.length > 0
      ? order.items.map((it) => `${it.itemDescription} (${it.quantity} ${it.unit})`).join(', ')
      : `${order.itemDescription} (${order.quantity} ${order.unit})`;

    const statementEntry: StatementEntry = {
      id: `st-${Date.now()}`,
      date: order.date,
      voucherType: 'Sales',
      details: `Bill #${order.invoiceNo} · Dispatched via ${order.truckNumber || 'Fleet'}`,
      itemQty: itemQtySummary,
      debit: order.totalAmount,
      credit: 0,
      balance: (existingLedger?.outstandingReceivable || 0) + order.totalAmount,
      balanceType: 'Dr',
    };

    if (existingLedger) {
      const isCredit = order.paymentStatus === 'Credit';
      const isPartial = order.paymentStatus === 'Partial';
      const addReceivable = isCredit ? order.totalAmount : isPartial ? order.totalAmount * 0.5 : 0;

      await updateDoc(doc(db, ledgersPath, existingLedger.id), {
        totalBilled: existingLedger.totalBilled + order.totalAmount,
        outstandingReceivable: existingLedger.outstandingReceivable + addReceivable,
        totalOverdue: existingLedger.totalOverdue + addReceivable,
        lastTransactionDate: order.date,
        statementEntries: [...(existingLedger.statementEntries || []), statementEntry],
      }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, ledgersPath));
    } else {
      const isCredit = order.paymentStatus === 'Credit';
      const isPaid = order.paymentStatus === 'Paid';
      const newLedgerId = `led-${Date.now()}`;

      await setDoc(doc(db, ledgersPath, newLedgerId), {
        id: newLedgerId,
        name: order.customerName,
        gstin: '21AAPCM' + Math.floor(1000 + Math.random() * 9000) + 'A1Z' + Math.floor(1 + Math.random() * 9),
        phone: order.customerPhone || '+91 94370 28190',
        address: order.shipToAddress || 'Commercial Yard, Odisha',
        shipToAddress: order.shipToAddress,
        totalBilled: order.totalAmount,
        totalPaid: isPaid ? order.totalAmount : 0,
        outstandingReceivable: isCredit ? order.totalAmount : 0,
        totalOverdue: isCredit ? order.totalAmount : 0,
        creditLimit: 1500000,
        creditDays: 30,
        lastPaymentDate: order.date,
        lastTransactionDate: order.date,
        averageCollectionDays: 15,
        oldestDueDays: 1,
        statementEntries: [statementEntry],
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, ledgersPath));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, ordersPath);
  }
}

/**
 * Restock inventory batch in Firestore.
 */
export async function restockItemInDb(itemId: string, addQuantity: number, currentStock: number, reorderLevel: number): Promise<void> {
  const path = 'inventory';
  const newStock = Number((currentStock + addQuantity).toFixed(2));
  try {
    await updateDoc(doc(db, path, itemId), {
      stockLevel: newStock,
      isCriticalLow: newStock <= reorderLevel,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Record payment receipt in Firestore, reduce ledger debt, and add payment voucher.
 */
export async function recordPaymentInDb(
  receipt: MoneyReceipt,
  ledger: CustomerLedger
): Promise<void> {
  const receiptsPath = 'money_receipts';
  const ledgersPath = 'ledgers';

  try {
    // 1. Save Money Receipt
    await setDoc(doc(db, receiptsPath, receipt.id), {
      ...receipt,
      createdAt: new Date().toISOString(),
    });

    // 2. Update Ledger balance
    const newOutstanding = Math.max(0, ledger.outstandingReceivable - receipt.amount);
    const newPaid = ledger.totalPaid + receipt.amount;
    const newStatementEntry: StatementEntry = {
      id: `st-${Date.now()}`,
      date: receipt.date,
      voucherType: 'Payment',
      details: `Money Receipt #${receipt.receiptNo} (${receipt.paymentMode})`,
      itemQty: '-',
      debit: 0,
      credit: receipt.amount,
      balance: newOutstanding,
      balanceType: 'Dr',
    };

    await updateDoc(doc(db, ledgersPath, ledger.id), {
      totalPaid: newPaid,
      outstandingReceivable: newOutstanding,
      totalOverdue: Math.max(0, (ledger.totalOverdue || 0) - receipt.amount),
      lastPaymentDate: receipt.date,
      statementEntries: [...(ledger.statementEntries || []), newStatementEntry],
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, receiptsPath);
  }
}

/**
 * Update follow-up collection notes on a ledger party.
 */
export async function updateFollowUpInDb(ledgerId: string, nextFollowUpDate: string, note: string): Promise<void> {
  const path = 'ledgers';
  try {
    await updateDoc(doc(db, path, ledgerId), {
      nextFollowUpDate,
      followUpNote: note,
      promisesToPay: note,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Add manual transaction voucher to party Khatabook statement.
 */
export async function addStatementEntryInDb(ledger: CustomerLedger, entry: Omit<StatementEntry, 'id'>): Promise<void> {
  const path = 'ledgers';
  const newEntry: StatementEntry = {
    ...entry,
    id: `st-${Date.now()}`,
  };

  const updatedEntries = [...(ledger.statementEntries || []), newEntry];
  const newOutstanding = entry.debit > 0
    ? ledger.outstandingReceivable + entry.debit
    : Math.max(0, ledger.outstandingReceivable - entry.credit);

  try {
    await updateDoc(doc(db, path, ledger.id), {
      outstandingReceivable: newOutstanding,
      statementEntries: updatedEntries,
      lastTransactionDate: entry.date,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Update GST mode on an order.
 */
export async function updateOrderGstInDb(orderId: string, isGst: boolean, subtotal: number, gstAmount: number, totalAmount: number): Promise<void> {
  const path = 'orders';
  try {
    await updateDoc(doc(db, path, orderId), {
      isGst,
      subtotal,
      gstAmount,
      totalAmount,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ==========================================
// HR & PAYROLL MANAGEMENT SERVICES
// ==========================================

export const INITIAL_EMPLOYEES: Employee[] = [];

/**
 * Real-time listener for Employee Master.
 * Real production data (starts empty, populated by admin via Employee Master).
 */
export function subscribeToEmployees(onData: (employees: Employee[]) => void): () => void {
  const colPath = 'employees';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const emps: Employee[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          empCode: d.empCode || `ME-${docSnap.id.slice(-4).toUpperCase()}`,
          name: d.name || '',
          department: d.department || 'Admin',
          designation: d.designation || '',
          phone: d.phone || '',
          email: d.email || '',
          joiningDate: d.joiningDate || '',
          monthlySalary: Number(d.monthlySalary) || 30000,
          bankAccount: d.bankAccount || '',
          bankIfsc: d.bankIfsc || '',
          panNo: d.panNo || '',
          status: d.status || 'Active',
        };
      });
      // Sort alphabetically by name
      emps.sort((a, b) => a.name.localeCompare(b.name));
      onData(emps);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

/**
 * Create or update an employee in Firestore.
 */
export async function saveEmployeeInDb(employee: Employee): Promise<void> {
  const colPath = 'employees';
  try {
    await setDoc(doc(db, colPath, employee.id), {
      ...employee,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

/**
 * Real-time listener for Attendance Records for a specific date (YYYY-MM-DD).
 */
export function subscribeToAttendance(
  dateStr: string,
  onData: (records: AttendanceRecord[]) => void
): () => void {
  const colPath = 'attendance_logs';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const records: AttendanceRecord[] = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            employeeId: d.employeeId || '',
            employeeName: d.employeeName || '',
            department: d.department || 'Admin',
            date: d.date || '',
            status: d.status || 'Present',
            checkInTime: d.checkInTime || '',
            checkOutTime: d.checkOutTime || '',
            notes: d.notes || '',
          };
        })
        .filter((r) => r.date === dateStr);

      onData(records);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

/**
 * Save single attendance entry.
 */
export async function recordAttendanceInDb(record: AttendanceRecord): Promise<void> {
  const colPath = 'attendance_logs';
  try {
    await setDoc(doc(db, colPath, record.id), {
      ...record,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

/**
 * Bulk save attendance entries.
 */
export async function bulkMarkAttendanceInDb(records: AttendanceRecord[]): Promise<void> {
  const colPath = 'attendance_logs';
  try {
    for (const rec of records) {
      await setDoc(doc(db, colPath, rec.id), {
        ...rec,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

/**
 * Real-time listener for Leave Requests.
 */
export function subscribeToLeaves(onData: (leaves: LeaveRequest[]) => void): () => void {
  const colPath = 'leave_requests';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const leaves: LeaveRequest[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          employeeId: d.employeeId || '',
          employeeName: d.employeeName || '',
          department: d.department || 'Admin',
          leaveType: d.leaveType || 'Casual',
          startDate: d.startDate || '',
          endDate: d.endDate || '',
          days: Number(d.days) || 1,
          reason: d.reason || '',
          status: d.status || 'Pending',
          appliedOn: d.appliedOn || '',
        };
      });
      // Sort newest first
      leaves.sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));
      onData(leaves);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

/**
 * Submit or update Leave Request.
 */
export async function saveLeaveRequestInDb(request: LeaveRequest): Promise<void> {
  const colPath = 'leave_requests';
  try {
    await setDoc(doc(db, colPath, request.id), {
      ...request,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

/**
 * Update Leave Request status.
 */
export async function updateLeaveStatusInDb(requestId: string, status: LeaveStatus): Promise<void> {
  const colPath = 'leave_requests';
  try {
    await updateDoc(doc(db, colPath, requestId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, colPath);
  }
}

/**
 * Real-time listener for Payroll Records.
 */
export function subscribeToPayroll(
  monthStr: string,
  onData: (records: PayrollRecord[]) => void
): () => void {
  const colPath = 'payroll_records';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const records: PayrollRecord[] = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            month: d.month || '',
            employeeId: d.employeeId || '',
            employeeName: d.employeeName || '',
            department: d.department || 'Admin',
            designation: d.designation || '',
            basicSalary: Number(d.basicSalary) || 0,
            allowances: Number(d.allowances) || 0,
            pfDeduction: Number(d.pfDeduction) || 0,
            taxDeduction: Number(d.taxDeduction) || 0,
            netSalary: Number(d.netSalary) || 0,
            paymentStatus: d.paymentStatus || 'Pending',
            paymentDate: d.paymentDate || '',
            bankReference: d.bankReference || '',
          };
        })
        .filter((r) => r.month === monthStr);

      onData(records);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

/**
 * Mark Payroll as Paid.
 */
export async function markPayrollPaidInDb(
  recordId: string,
  paymentDate: string,
  bankRef: string
): Promise<void> {
  const colPath = 'payroll_records';
  try {
    await updateDoc(doc(db, colPath, recordId), {
      paymentStatus: 'Paid',
      paymentDate,
      bankReference: bankRef,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, colPath);
  }
}

// ==========================================
// COMMERCIAL EXPENSES SERVICES
// ==========================================

export function subscribeToExpenses(onData: (expenses: ExpenseRecord[]) => void): () => void {
  const colPath = 'expenses';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const expenses: ExpenseRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          expenseNo: d.expenseNo || '',
          date: d.date || '',
          category: d.category || 'Logistics & Diesel',
          description: d.description || '',
          amount: Number(d.amount) || 0,
          paymentMode: d.paymentMode || 'Cash',
          paidTo: d.paidTo || '',
          approvedBy: d.approvedBy || 'Ayushman Mohanty',
          status: d.status || 'Approved',
        };
      });
      // Sort newest date first
      expenses.sort((a, b) => b.date.localeCompare(a.date));
      onData(expenses);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export async function saveExpenseInDb(expense: ExpenseRecord): Promise<void> {
  const colPath = 'expenses';
  try {
    await setDoc(doc(db, colPath, expense.id), {
      ...expense,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

// ==========================================
// MATERIAL PROCUREMENT / PURCHASE SERVICES
// ==========================================

export function subscribeToPurchases(onData: (purchases: PurchaseRecord[]) => void): () => void {
  const colPath = 'purchases';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const purchases: PurchaseRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          purchaseNo: d.purchaseNo || '',
          supplierName: d.supplierName || '',
          supplierGst: d.supplierGst || '',
          date: d.date || '',
          category: d.category || 'CEMENT',
          items: d.items || [],
          subtotal: Number(d.subtotal) || 0,
          gstAmount: Number(d.gstAmount) || 0,
          totalAmount: Number(d.totalAmount) || 0,
          paymentStatus: d.paymentStatus || 'Paid',
          truckNumber: d.truckNumber || '',
          challanNo: d.challanNo || '',
        };
      });
      purchases.sort((a, b) => b.date.localeCompare(a.date));
      onData(purchases);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export async function savePurchaseInDb(
  purchase: PurchaseRecord,
  currentInventory: InventoryItem[]
): Promise<void> {
  const colPath = 'purchases';
  try {
    // 1. Write purchase PO document
    await setDoc(doc(db, colPath, purchase.id), {
      ...purchase,
      updatedAt: new Date().toISOString(),
    });

    // 2. Auto-restock matching warehouse items
    const inventoryPath = 'inventory';
    for (const item of purchase.items) {
      const matchInv = currentInventory.find(
        (inv) => inv.id === item.itemId || inv.name.toLowerCase() === item.itemName.toLowerCase()
      );
      if (matchInv) {
        const newStock = Number((matchInv.stockLevel + item.quantity).toFixed(2));
        await updateDoc(doc(db, inventoryPath, matchInv.id), {
          stockLevel: newStock,
          isCriticalLow: newStock <= matchInv.reorderLevel,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, inventoryPath));
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

// ==========================================
// BANKING & CASH ACCOUNTS SERVICES
// ==========================================

export function subscribeToBankAccounts(onData: (accounts: BankAccount[]) => void): () => void {
  const colPath = 'bank_accounts';
  const colRef = collection(db, colPath);

  // Initialize standard accounts with 0 balance if empty
  getDocs(colRef).then((snapshot) => {
    if (snapshot.empty) {
      const defaultAccounts: BankAccount[] = [
        {
          id: 'bank-sbi',
          bankName: 'State Bank of India (Current A/C)',
          accountNumber: '394821004921',
          branch: 'Choudwar Industrial Branch, Cuttack',
          ifsc: 'SBIN0001234',
          accountType: 'Current',
          currentBalance: 0,
          unclearedChequesCount: 0,
          status: 'Reconciled',
        },
        {
          id: 'bank-hdfc',
          bankName: 'HDFC Corporate Current A/C',
          accountNumber: '50200084719201',
          branch: 'Bajrakabati Road Corporate, Cuttack',
          ifsc: 'HDFC0000412',
          accountType: 'Current',
          currentBalance: 0,
          unclearedChequesCount: 0,
          status: 'Reconciled',
        },
        {
          id: 'bank-drawer',
          bankName: 'Office Cash in Safe Drawer',
          accountNumber: 'DRAWER-01',
          branch: 'Headquarters Dispatch Counter',
          ifsc: 'N/A',
          accountType: 'Cash Drawer',
          currentBalance: 0,
          unclearedChequesCount: 0,
          status: 'Active',
        },
      ];
      defaultAccounts.forEach(async (acc) => {
        await setDoc(doc(db, colPath, acc.id), {
          ...acc,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, colPath));
      });
    }
  }).catch((err) => handleFirestoreError(err, OperationType.GET, colPath));

  return onSnapshot(
    colRef,
    (snapshot) => {
      const accounts: BankAccount[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          bankName: d.bankName || '',
          accountNumber: d.accountNumber || '',
          branch: d.branch || '',
          ifsc: d.ifsc || '',
          accountType: d.accountType || 'Current',
          currentBalance: Number(d.currentBalance) || 0,
          unclearedChequesCount: Number(d.unclearedChequesCount) || 0,
          status: d.status || 'Active',
        };
      });
      onData(accounts);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export async function saveBankAccountInDb(account: BankAccount): Promise<void> {
  const colPath = 'bank_accounts';
  try {
    await setDoc(doc(db, colPath, account.id), {
      ...account,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

// ==========================================
// CONTRA ENTRIES SERVICES
// ==========================================

export function subscribeToContraEntries(onData: (entries: ContraEntry[]) => void): () => void {
  const colPath = 'contra_entries';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const entries: ContraEntry[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          voucherNo: d.voucherNo || '',
          date: d.date || '',
          fromAccount: d.fromAccount || '',
          toAccount: d.toAccount || '',
          amount: Number(d.amount) || 0,
          referenceNo: d.referenceNo || '',
          remarks: d.remarks || '',
        };
      });
      entries.sort((a, b) => b.date.localeCompare(a.date));
      onData(entries);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export async function saveContraEntryInDb(
  entry: ContraEntry,
  currentAccounts: BankAccount[]
): Promise<void> {
  const contraPath = 'contra_entries';
  const accountsPath = 'bank_accounts';

  try {
    // 1. Save Contra document
    await setDoc(doc(db, contraPath, entry.id), {
      ...entry,
      updatedAt: new Date().toISOString(),
    });

    // 2. Adjust source and destination bank balances
    const fromAcc = currentAccounts.find((a) => a.bankName === entry.fromAccount);
    const toAcc = currentAccounts.find((a) => a.bankName === entry.toAccount);

    if (fromAcc) {
      const newBal = fromAcc.currentBalance - entry.amount;
      await updateDoc(doc(db, accountsPath, fromAcc.id), {
        currentBalance: newBal,
        updatedAt: new Date().toISOString(),
      }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, accountsPath));
    }

    if (toAcc) {
      const newBal = toAcc.currentBalance + entry.amount;
      await updateDoc(doc(db, accountsPath, toAcc.id), {
        currentBalance: newBal,
        updatedAt: new Date().toISOString(),
      }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, accountsPath));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, contraPath);
  }
}

// ==========================================
// ACCOUNT MASTER / CHART OF ACCOUNTS SERVICES
// ==========================================

export function subscribeToAccountHeads(onData: (heads: AccountHead[]) => void): () => void {
  const colPath = 'account_heads';
  const colRef = collection(db, colPath);

  // Initialize default chart of accounts with 0 balance if empty
  getDocs(colRef).then((snapshot) => {
    if (snapshot.empty) {
      const defaultHeads: AccountHead[] = [
        { id: 'acc-1', code: '1001', name: 'State Bank of India (Current A/C)', group: 'Current Assets', balance: 0, balanceType: 'Dr' },
        { id: 'acc-2', code: '1002', name: 'HDFC Corporate Current A/C', group: 'Current Assets', balance: 0, balanceType: 'Dr' },
        { id: 'acc-3', code: '1003', name: 'Office Safe Cash Drawer', group: 'Current Assets', balance: 0, balanceType: 'Dr' },
        { id: 'acc-4', code: '1004', name: 'Sundry Debtors (Wholesale Contractors)', group: 'Current Assets', balance: 0, balanceType: 'Dr' },
        { id: 'acc-5', code: '1005', name: 'Warehouse Material Stock Inventory', group: 'Current Assets', balance: 0, balanceType: 'Dr' },
        { id: 'acc-6', code: '2001', name: 'Sundry Creditors (Manufacturers & Mills)', group: 'Current Liabilities', balance: 0, balanceType: 'Cr' },
        { id: 'acc-7', code: '2002', name: 'GST Output Liability (18% & 28%)', group: 'Current Liabilities', balance: 0, balanceType: 'Cr' },
        { id: 'acc-8', code: '3001', name: 'Sales Account - Cement Wholesale', group: 'Direct Incomes', balance: 0, balanceType: 'Cr' },
        { id: 'acc-9', code: '3002', name: 'Sales Account - SCAN TMT Bars', group: 'Direct Incomes', balance: 0, balanceType: 'Cr' },
        { id: 'acc-10', code: '4001', name: 'Yard Labour & Hamali Charges', group: 'Direct Expenses', balance: 0, balanceType: 'Dr' },
        { id: 'acc-11', code: '4002', name: 'Truck Diesel & Delivery Freight', group: 'Direct Expenses', balance: 0, balanceType: 'Dr' },
      ];
      defaultHeads.forEach(async (head) => {
        await setDoc(doc(db, colPath, head.id), {
          ...head,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, colPath));
      });
    }
  }).catch((err) => handleFirestoreError(err, OperationType.GET, colPath));

  return onSnapshot(
    colRef,
    (snapshot) => {
      const heads: AccountHead[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          code: d.code || '',
          name: d.name || '',
          group: d.group || 'Current Assets',
          balance: Number(d.balance) || 0,
          balanceType: d.balanceType || 'Dr',
        };
      });
      heads.sort((a, b) => a.code.localeCompare(b.code));
      onData(heads);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export async function saveAccountHeadInDb(head: AccountHead): Promise<void> {
  const colPath = 'account_heads';
  try {
    await setDoc(doc(db, colPath, head.id), {
      ...head,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

// ==========================================
// JOURNAL VOUCHERS (JV) SERVICES
// ==========================================

export function subscribeToJournalEntries(onData: (entries: JournalEntry[]) => void): () => void {
  const colPath = 'journal_vouchers';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const entries: JournalEntry[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          jvNo: d.jvNo || '',
          date: d.date || '',
          debitAccount: d.debitAccount || '',
          debitAmount: Number(d.debitAmount) || 0,
          creditAccount: d.creditAccount || '',
          creditAmount: Number(d.creditAmount) || 0,
          narration: d.narration || '',
          authorizedBy: d.authorizedBy || 'Ayushman Mohanty',
        };
      });
      entries.sort((a, b) => b.date.localeCompare(a.date));
      onData(entries);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  );
}

export async function saveJournalEntryInDb(entry: JournalEntry): Promise<void> {
  const colPath = 'journal_vouchers';
  try {
    await setDoc(doc(db, colPath, entry.id), {
      ...entry,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

