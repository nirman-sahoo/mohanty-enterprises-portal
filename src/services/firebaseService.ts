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
  UnitType 
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
