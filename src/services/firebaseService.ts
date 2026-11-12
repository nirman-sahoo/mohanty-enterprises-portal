import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import {
  InventoryItem,
  SaleRecord,
  CustomerLedger,
  MoneyReceipt,
  PaymentVoucher,
  StatementEntry,
  Category,
  UnitType,
  PurchaseRecord,
  BankAccount,
  ContraEntry,
  CompanySettings,
} from '../types';
import { convertUnitQty, recomputeStatementBalances } from '../utils/accountingEngine';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: 'company_config',
  companyName: 'MOHANTY ENTERPRISES',
  directorName: '',
  designation: 'Managing Director',
  tradeTagline: 'CEMENT • STEEL • CONSTRUCTION MATERIALS',
  slogan: '',
  gstin: '',
  pan: '',
  email: '',
  phone: '',
  address: '',
  invoicePrefix: 'INV/',
  purchasePrefix: 'PUR/',
  receiptPrefix: 'MR/',
  paymentPrefix: 'PAY/',
  contraPrefix: 'CNT/',
  defaultGstRate: 0,
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
  whatsappAlerts: true,
  autoPrintEstimate: true,
  roundOffInvoices: true,
};

// ==========================================
// INVENTORY SUBSCRIPTION & OPERATIONS
// ==========================================

export function subscribeToInventory(onData: (items: InventoryItem[]) => void): () => void {
  const colPath = 'inventory';
  const colRef = collection(db, colPath);

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
      items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
  );
}

export async function restockItemInDb(
  itemId: string,
  addQuantity: number,
  currentStock: number,
  reorderLevel: number
): Promise<void> {
  const path = 'inventory';
  const newStock = Math.max(0, Number((currentStock + addQuantity).toFixed(2)));
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

export async function saveInventoryItemInDb(item: InventoryItem): Promise<void> {
  const path = 'inventory';
  try {
    await setDoc(doc(db, path, item.id), {
      ...item,
      isCriticalLow: item.stockLevel <= item.reorderLevel,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteInventoryItemInDb(itemId: string): Promise<void> {
  const path = 'inventory';
  try {
    await deleteDoc(doc(db, path, itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==========================================
// SALES VOUCHERS (ORDERS)
// ==========================================

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
          customerGstin: d.customerGstin || '',
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
          subtotal: Number(d.totalAmount) || Number(d.subtotal) || 0,
          isGst: false,
          gstRate: 0,
          gstAmount: 0,
          totalAmount: Number(d.totalAmount) || 0,
          status: d.status || 'Confirmed',
          paymentStatus: d.paymentStatus || 'Credit',
          paymentMode: d.paymentMode || '',
          paidAmount: typeof d.paidAmount === 'number' ? d.paidAmount : undefined,
          bankAccountId: d.bankAccountId || '',
          bankAccountName: d.bankAccountName || '',
          paymentReference: d.paymentReference || '',
          truckNumber: d.truckNumber || '',
          notes: d.notes || '',
        };
      });

      orders.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
      onData(orders);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
  );
}

/**
 * Create Sales Voucher:
 * 1. Saves order doc to `orders`
 * 2. Deducts stock from `inventory`
 * 3. Updates/creates Party Ledger in `ledgers` (debiting totalAmount, crediting any immediate paidAmount)
 */
export async function createOrderInDb(
  order: SaleRecord,
  currentInventory: InventoryItem[],
  currentLedgers: CustomerLedger[]
): Promise<void> {
  const ordersPath = 'orders';
  try {
    await setDoc(doc(db, ordersPath, order.id), {
      ...order,
      createdAt: new Date().toISOString(),
    });

    // Deduct inventory (with unit conversion e.g. KG <-> Tons)
    const inventoryPath = 'inventory';
    const lineItems = order.items && order.items.length > 0 ? order.items : [order];
    for (const lineItem of lineItems) {
      const matchInv = currentInventory.find(
        (inv) => inv.name.trim().toLowerCase() === (lineItem.itemDescription || '').trim().toLowerCase()
      );
      if (matchInv) {
        const deductQty = convertUnitQty(Number(lineItem.quantity) || 0, lineItem.unit, matchInv.unit);
        const newStock = Math.max(0, Number((matchInv.stockLevel - deductQty).toFixed(2)));
        await updateDoc(doc(db, inventoryPath, matchInv.id), {
          stockLevel: newStock,
          isCriticalLow: newStock <= matchInv.reorderLevel,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, inventoryPath));
      }
    }

    // Update or create Customer Ledger
    const ledgersPath = 'ledgers';
    const existingLedger = currentLedgers.find(
      (l) => l.name.trim().toLowerCase() === order.customerName.trim().toLowerCase()
    );

    const immediatePaid =
      typeof order.paidAmount === 'number'
        ? Math.min(order.totalAmount, Math.max(0, order.paidAmount))
        : order.paymentStatus === 'Paid'
        ? order.totalAmount
        : order.paymentStatus === 'Partial'
        ? Math.round(order.totalAmount * 0.5)
        : 0;

    const itemQtySummary =
      order.items && order.items.length > 0
        ? order.items.map((it) => `${it.itemDescription} (${it.quantity} ${it.unit})`).join(', ')
        : `${order.itemDescription} (${order.quantity} ${order.unit})`;

    const salesEntry: StatementEntry = {
      id: `st-sale-${order.id}`,
      voucherRefId: order.id,
      date: order.date,
      voucherType: 'Sales',
      details: `Sales Voucher #${order.invoiceNo}${order.truckNumber ? ` · ${order.truckNumber}` : ''}`,
      itemQty: itemQtySummary,
      debit: order.totalAmount,
      credit: 0,
      balance: 0,
      balanceType: 'Dr',
    };

    const newStatementEntries: StatementEntry[] = [salesEntry];
    if (immediatePaid > 0) {
      newStatementEntries.push({
        id: `st-salepay-${order.id}`,
        voucherRefId: order.id,
        date: order.date,
        voucherType: 'Payment',
        details: `Settlement on #${order.invoiceNo} (${order.paymentMode || 'Cash/Bank'})`,
        itemQty: '-',
        debit: 0,
        credit: immediatePaid,
        balance: 0,
        balanceType: 'Dr',
      });
    }

    if (existingLedger) {
      const newTotalBilled = (existingLedger.totalBilled || 0) + order.totalAmount;
      const newTotalPaid = (existingLedger.totalPaid || 0) + immediatePaid;
      const newOutstanding = Math.max(
        0,
        (existingLedger.openingBalance || 0) + newTotalBilled - newTotalPaid
      );
      const recomputedEntries = recomputeStatementBalances(
        existingLedger.openingBalance || 0,
        [...(existingLedger.statementEntries || []), ...newStatementEntries]
      );

      await updateDoc(doc(db, ledgersPath, existingLedger.id), {
        gstin: order.customerGstin || existingLedger.gstin,
        phone: order.customerPhone || existingLedger.phone,
        shipToAddress: order.shipToAddress || existingLedger.shipToAddress,
        totalBilled: newTotalBilled,
        totalPaid: newTotalPaid,
        outstandingReceivable: newOutstanding,
        totalOverdue: newOutstanding,
        lastTransactionDate: order.date,
        lastPaymentDate: immediatePaid > 0 ? order.date : existingLedger.lastPaymentDate,
        statementEntries: recomputedEntries,
      }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, ledgersPath));
    } else {
      const addReceivable = Math.max(0, order.totalAmount - immediatePaid);
      const recomputedEntries = recomputeStatementBalances(0, newStatementEntries);
      const newLedgerId = `led-${Date.now()}`;
      await setDoc(doc(db, ledgersPath, newLedgerId), {
        id: newLedgerId,
        name: order.customerName.trim(),
        gstin: order.customerGstin || '',
        phone: order.customerPhone || '',
        address: order.shipToAddress || '',
        shipToAddress: order.shipToAddress || '',
        openingBalance: 0,
        totalBilled: order.totalAmount,
        totalPaid: immediatePaid,
        outstandingReceivable: addReceivable,
        totalOverdue: addReceivable,
        creditLimit: 0,
        creditDays: 0,
        lastPaymentDate: immediatePaid > 0 ? order.date : '',
        lastTransactionDate: order.date,
        averageCollectionDays: 0,
        oldestDueDays: addReceivable > 0 ? 1 : 0,
        statementEntries: recomputedEntries,
      }).catch((err) => handleFirestoreError(err, OperationType.WRITE, ledgersPath));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, ordersPath);
  }
}

export async function deleteOrderInDb(
  orderId: string,
  sale?: SaleRecord,
  currentInventory?: InventoryItem[],
  currentLedgers?: CustomerLedger[]
): Promise<void> {
  const colPath = 'orders';
  try {
    await deleteDoc(doc(db, colPath, orderId));

    // Restore stock levels (with unit conversion)
    if (sale && currentInventory) {
      const items = sale.items && sale.items.length > 0 ? sale.items : [sale];
      for (const item of items) {
        const inv = currentInventory.find(
          (i) => i.name.trim().toLowerCase() === (item.itemDescription || '').trim().toLowerCase() || i.id === item.id
        );
        if (inv) {
          const restoreQty = convertUnitQty(Number(item.quantity) || 0, item.unit, inv.unit);
          const restoredStock = Number((inv.stockLevel + restoreQty).toFixed(2));
          await updateDoc(doc(db, 'inventory', inv.id), {
            stockLevel: restoredStock,
            isCriticalLow: restoredStock <= inv.reorderLevel,
            updatedAt: new Date().toISOString(),
          }).catch((e) => console.warn('Could not restore stock:', e));
        }
      }
    }

    // Reverse ledger billed, paid, receivable, and recompute chronological statement balances
    if (sale && currentLedgers) {
      const party = currentLedgers.find(
        (l) => l.name.trim().toLowerCase() === sale.customerName.trim().toLowerCase()
      );
      if (party) {
        const immediatePaid =
          typeof sale.paidAmount === 'number'
            ? sale.paidAmount
            : sale.paymentStatus === 'Paid'
            ? sale.totalAmount
            : sale.paymentStatus === 'Partial'
            ? Math.round(sale.totalAmount * 0.5)
            : 0;

        const filteredEntries = (party.statementEntries || []).filter(
          (e) =>
            e.voucherRefId !== sale.id &&
            (!sale.invoiceNo || !e.details.includes(sale.invoiceNo))
        );

        const newTotalBilled = Math.max(0, (party.totalBilled || 0) - sale.totalAmount);
        const newTotalPaid = Math.max(0, (party.totalPaid || 0) - immediatePaid);
        const newOutstanding = Math.max(0, (party.openingBalance || 0) + newTotalBilled - newTotalPaid);
        const recomputedEntries = recomputeStatementBalances(party.openingBalance || 0, filteredEntries);

        await updateDoc(doc(db, 'ledgers', party.id), {
          totalBilled: newTotalBilled,
          totalPaid: newTotalPaid,
          outstandingReceivable: newOutstanding,
          totalOverdue: newOutstanding,
          statementEntries: recomputedEntries,
          updatedAt: new Date().toISOString(),
        }).catch((e) => console.warn('Could not adjust ledger on delete:', e));
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

// ==========================================
// PARTY OUTSTANDINGS / RECEIVABLES LEDGERS
// ==========================================

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
          openingBalance: Number(d.openingBalance) || 0,
          totalBilled: Number(d.totalBilled) || 0,
          totalPaid: Number(d.totalPaid) || 0,
          outstandingReceivable: Number(d.outstandingReceivable) || 0,
          totalOverdue: Number(d.totalOverdue) || 0,
          creditLimit: Number(d.creditLimit) || 0,
          creditDays: Number(d.creditDays) || 0,
          lastPaymentDate: d.lastPaymentDate || '',
          lastTransactionDate: d.lastTransactionDate || '',
          averageCollectionDays: Number(d.averageCollectionDays) || 0,
          oldestDueDays: Number(d.oldestDueDays) || 0,
          nextFollowUpDate: d.nextFollowUpDate || '',
          followUpNote: d.followUpNote || '',
          promisesToPay: d.promisesToPay || '',
          statementEntries: d.statementEntries || [],
        };
      });

      ledgers.sort((a, b) => b.outstandingReceivable - a.outstandingReceivable);
      onData(ledgers);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
  );
}

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

export async function addStatementEntryInDb(ledger: CustomerLedger, entry: Omit<StatementEntry, 'id'>): Promise<void> {
  const path = 'ledgers';
  const newEntry: StatementEntry = {
    ...entry,
    id: `st-${Date.now()}`,
  };

  const newTotalBilled = (ledger.totalBilled || 0) + (Number(entry.debit) || 0);
  const newTotalPaid = (ledger.totalPaid || 0) + (Number(entry.credit) || 0);
  const newOutstanding = Math.max(0, (ledger.openingBalance || 0) + newTotalBilled - newTotalPaid);
  const recomputedEntries = recomputeStatementBalances(ledger.openingBalance || 0, [
    ...(ledger.statementEntries || []),
    newEntry,
  ]);

  try {
    await updateDoc(doc(db, path, ledger.id), {
      totalBilled: newTotalBilled,
      totalPaid: newTotalPaid,
      outstandingReceivable: newOutstanding,
      totalOverdue: newOutstanding,
      statementEntries: recomputedEntries,
      lastTransactionDate: entry.date,
      lastPaymentDate: entry.credit > 0 ? entry.date : ledger.lastPaymentDate,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteLedgerInDb(ledgerId: string): Promise<void> {
  const colPath = 'ledgers';
  try {
    await deleteDoc(doc(db, colPath, ledgerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

// ==========================================
// MONEY RECEIPTS (CUSTOMER COLLECTIONS -> CASH / BANK BOOK)
// ==========================================

export function subscribeToMoneyReceipts(onData: (receipts: MoneyReceipt[]) => void): () => void {
  const colPath = 'money_receipts';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const receipts: MoneyReceipt[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          receiptNo: d.receiptNo || '',
          date: d.date || '',
          partyName: d.partyName || '',
          partyAddress: d.partyAddress || '',
          partyPhone: d.partyPhone || '',
          amount: Number(d.amount) || 0,
          amountInWords: d.amountInWords || '',
          paymentMode: d.paymentMode || 'Cash',
          bankAccountId: d.bankAccountId || '',
          bankAccountName: d.bankAccountName || '',
          forAccount: d.forAccount || '',
          paidAmount: Number(d.paidAmount) || 0,
          dueAmount: Number(d.dueAmount) || 0,
          referenceNo: d.referenceNo || '',
          remarks: d.remarks || '',
        };
      });
      receipts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(receipts);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
  );
}

export async function recordPaymentInDb(
  receipt: MoneyReceipt,
  ledger?: CustomerLedger,
  allLedgers?: CustomerLedger[]
): Promise<void> {
  const receiptsPath = 'money_receipts';
  const ledgersPath = 'ledgers';

  try {
    await setDoc(doc(db, receiptsPath, receipt.id), {
      ...receipt,
      createdAt: new Date().toISOString(),
    });

    const targetLedger =
      ledger ||
      (allLedgers || []).find(
        (l) => l.name.trim().toLowerCase() === receipt.partyName.trim().toLowerCase()
      );

    const newStatementEntry: StatementEntry = {
      id: `st-rcp-${receipt.id}`,
      voucherRefId: receipt.id,
      date: receipt.date,
      voucherType: 'Payment',
      details: `Money Receipt #${receipt.receiptNo} (${receipt.paymentMode}${receipt.bankAccountName ? ` · ${receipt.bankAccountName}` : ''})`,
      itemQty: '-',
      debit: 0,
      credit: receipt.amount,
      balance: 0,
      balanceType: 'Dr',
    };

    if (targetLedger) {
      const newPaid = (targetLedger.totalPaid || 0) + receipt.amount;
      const newOutstanding = Math.max(
        0,
        (targetLedger.openingBalance || 0) + (targetLedger.totalBilled || 0) - newPaid
      );
      const recomputedEntries = recomputeStatementBalances(targetLedger.openingBalance || 0, [
        ...(targetLedger.statementEntries || []),
        newStatementEntry,
      ]);

      await updateDoc(doc(db, ledgersPath, targetLedger.id), {
        totalPaid: newPaid,
        outstandingReceivable: newOutstanding,
        totalOverdue: newOutstanding,
        lastPaymentDate: receipt.date,
        lastTransactionDate: receipt.date,
        statementEntries: recomputedEntries,
      });
    } else if (receipt.partyName.trim()) {
      const newLedgerId = `led-${Date.now()}`;
      const recomputedEntries = recomputeStatementBalances(0, [newStatementEntry]);
      await setDoc(doc(db, ledgersPath, newLedgerId), {
        id: newLedgerId,
        name: receipt.partyName.trim(),
        gstin: '',
        phone: receipt.partyPhone || '',
        address: receipt.partyAddress || '',
        shipToAddress: '',
        openingBalance: 0,
        totalBilled: 0,
        totalPaid: receipt.amount,
        outstandingReceivable: 0,
        totalOverdue: 0,
        creditLimit: 0,
        creditDays: 0,
        lastPaymentDate: receipt.date,
        lastTransactionDate: receipt.date,
        averageCollectionDays: 0,
        oldestDueDays: 0,
        statementEntries: recomputedEntries,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, receiptsPath);
  }
}

export async function deleteMoneyReceiptInDb(
  receipt: MoneyReceipt,
  currentLedgers: CustomerLedger[]
): Promise<void> {
  const receiptsPath = 'money_receipts';
  try {
    await deleteDoc(doc(db, receiptsPath, receipt.id));

    const ledger = currentLedgers.find(
      (l) => l.name.trim().toLowerCase() === receipt.partyName.trim().toLowerCase()
    );
    if (ledger) {
      const filteredEntries = (ledger.statementEntries || []).filter(
        (e) => e.voucherRefId !== receipt.id && (!receipt.receiptNo || !e.details.includes(receipt.receiptNo))
      );
      const newPaid = Math.max(0, (ledger.totalPaid || 0) - receipt.amount);
      const newOutstanding = Math.max(
        0,
        (ledger.openingBalance || 0) + (ledger.totalBilled || 0) - newPaid
      );
      const recomputedEntries = recomputeStatementBalances(ledger.openingBalance || 0, filteredEntries);

      await updateDoc(doc(db, 'ledgers', ledger.id), {
        totalPaid: newPaid,
        outstandingReceivable: newOutstanding,
        totalOverdue: newOutstanding,
        statementEntries: recomputedEntries,
        updatedAt: new Date().toISOString(),
      }).catch((e) => console.warn('Could not reverse ledger on receipt delete:', e));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, receiptsPath);
  }
}

// ==========================================
// PURCHASE VOUCHERS & STOCK INWARD
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
          supplierPhone: d.supplierPhone || '',
          supplierAddress: d.supplierAddress || '',
          date: d.date || '',
          category: d.category || 'CEMENT',
          items: d.items || [],
          subtotal: Number(d.totalAmount) || Number(d.subtotal) || 0,
          isGst: false,
          gstRate: 0,
          gstAmount: 0,
          totalAmount: Number(d.totalAmount) || 0,
          paymentStatus: d.paymentStatus || 'Pending',
          paymentMode: d.paymentMode || 'Credit',
          paidAmount: typeof d.paidAmount === 'number' ? d.paidAmount : undefined,
          bankAccountId: d.bankAccountId || '',
          bankAccountName: d.bankAccountName || '',
          paymentReference: d.paymentReference || '',
          truckNumber: d.truckNumber || '',
          challanNo: d.challanNo || '',
          notes: d.notes || '',
        };
      });
      purchases.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(purchases);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
  );
}

export async function savePurchaseInDb(
  purchase: PurchaseRecord,
  currentInventory: InventoryItem[]
): Promise<void> {
  const colPath = 'purchases';
  try {
    await setDoc(doc(db, colPath, purchase.id), {
      ...purchase,
      updatedAt: new Date().toISOString(),
    });

    // Increase warehouse inventory for existing items, or create new SKU automatically
    const inventoryPath = 'inventory';
    for (let idx = 0; idx < purchase.items.length; idx++) {
      const item = purchase.items[idx];
      const matchInv = currentInventory.find(
        (inv) =>
          (item.itemId && inv.id === item.itemId) ||
          inv.name.trim().toLowerCase() === item.itemName.trim().toLowerCase()
      );
      if (matchInv) {
        const addQty = convertUnitQty(Number(item.quantity) || 0, item.unit, matchInv.unit);
        const newStock = Number((matchInv.stockLevel + addQty).toFixed(2));
        await updateDoc(doc(db, inventoryPath, matchInv.id), {
          stockLevel: newStock,
          unitPrice: item.rate > 0 ? item.rate : matchInv.unitPrice,
          isCriticalLow: newStock <= matchInv.reorderLevel,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, inventoryPath));
      } else if (item.itemName.trim()) {
        const newSkuId = item.itemId && /^[a-zA-Z0-9_-]+$/.test(item.itemId) ? item.itemId : `sku-${Date.now()}-${idx}`;
        const qty = Number(item.quantity) || 0;
        const newItem: InventoryItem = {
          id: newSkuId,
          name: item.itemName.trim(),
          category: item.category,
          stockLevel: qty,
          unit: item.unit,
          reorderLevel: 0,
          unitPrice: Number(item.rate) || 0,
          hsnCode: '',
          isCriticalLow: false,
        };
        await setDoc(doc(db, inventoryPath, newSkuId), {
          ...newItem,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, inventoryPath));
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

export async function deletePurchaseInDb(
  purchaseId: string,
  purchase?: PurchaseRecord,
  currentInventory?: InventoryItem[]
): Promise<void> {
  const colPath = 'purchases';
  try {
    await deleteDoc(doc(db, colPath, purchaseId));

    // Reverse added stock from inventory (with unit conversion)
    if (purchase && currentInventory && purchase.items) {
      for (const item of purchase.items) {
        const inv = currentInventory.find(
          (i) => i.id === item.itemId || i.name.trim().toLowerCase() === item.itemName.trim().toLowerCase()
        );
        if (inv) {
          const reverseQty = convertUnitQty(Number(item.quantity) || 0, item.unit, inv.unit);
          const adjustedStock = Math.max(0, Number((inv.stockLevel - reverseQty).toFixed(2)));
          await updateDoc(doc(db, 'inventory', inv.id), {
            stockLevel: adjustedStock,
            isCriticalLow: adjustedStock <= inv.reorderLevel,
            updatedAt: new Date().toISOString(),
          }).catch((e) => console.warn('Could not reverse purchase stock:', e));
        }
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

// ==========================================
// SUPPLIER PAYMENT VOUCHERS (PAYABLES -> CASH / BANK BOOK)
// ==========================================

export function subscribeToPaymentVouchers(onData: (vouchers: PaymentVoucher[]) => void): () => void {
  const colPath = 'payment_vouchers';
  const colRef = collection(db, colPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const vouchers: PaymentVoucher[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          voucherNo: d.voucherNo || '',
          date: d.date || '',
          supplierName: d.supplierName || '',
          supplierGst: d.supplierGst || '',
          purchaseId: d.purchaseId || '',
          purchaseNo: d.purchaseNo || '',
          amount: Number(d.amount) || 0,
          paymentMode: d.paymentMode || 'Cash',
          bankAccountId: d.bankAccountId || 'bank-drawer',
          bankAccountName: d.bankAccountName || '',
          referenceNo: d.referenceNo || '',
          remarks: d.remarks || '',
        };
      });
      vouchers.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(vouchers);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
  );
}

export async function savePaymentVoucherInDb(voucher: PaymentVoucher): Promise<void> {
  const colPath = 'payment_vouchers';
  try {
    await setDoc(doc(db, colPath, voucher.id), {
      ...voucher,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

export async function deletePaymentVoucherInDb(voucherId: string): Promise<void> {
  const colPath = 'payment_vouchers';
  try {
    await deleteDoc(doc(db, colPath, voucherId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

// ==========================================
// BANK & CASH ACCOUNTS SERVICES
// ==========================================

export function subscribeToBankAccounts(onData: (accounts: BankAccount[]) => void): () => void {
  const colPath = 'bank_accounts';
  const colRef = collection(db, colPath);

  getDocs(colRef)
    .then((snapshot) => {
      if (snapshot.empty) {
        const drawerAccount: BankAccount = {
          id: 'bank-drawer',
          bankName: 'Office Cash Drawer',
          accountNumber: 'CASH-01',
          branch: 'Cash Counter',
          ifsc: 'CASH',
          accountType: 'Cash Drawer',
          openingBalance: 0,
          currentBalance: 0,
          unclearedChequesCount: 0,
          status: 'Active',
        };
        setDoc(doc(db, colPath, drawerAccount.id), {
          ...drawerAccount,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, colPath));
      }
    })
    .catch((err) => handleFirestoreError(err, OperationType.GET, colPath));

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
          openingBalance: Number(d.openingBalance) || 0,
          currentBalance: Number(d.currentBalance) || 0,
          unclearedChequesCount: Number(d.unclearedChequesCount) || 0,
          status: d.status || 'Active',
        };
      });
      onData(accounts);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
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

export async function deleteBankAccountInDb(accountId: string): Promise<void> {
  const colPath = 'bank_accounts';
  try {
    await deleteDoc(doc(db, colPath, accountId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
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
          fromAccountId: d.fromAccountId || '',
          fromAccount: d.fromAccount || '',
          toAccountId: d.toAccountId || '',
          toAccount: d.toAccount || '',
          amount: Number(d.amount) || 0,
          referenceNo: d.referenceNo || '',
          remarks: d.remarks || '',
        };
      });
      entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(entries);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, colPath)
  );
}

export async function saveContraEntryInDb(entry: ContraEntry): Promise<void> {
  const contraPath = 'contra_entries';
  try {
    await setDoc(doc(db, contraPath, entry.id), {
      ...entry,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, contraPath);
  }
}

export async function deleteContraEntryInDb(contraId: string): Promise<void> {
  const colPath = 'contra_entries';
  try {
    await deleteDoc(doc(db, colPath, contraId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colPath);
  }
}

// ==========================================
// ENTERPRISE CONFIGURATION SETTINGS
// ==========================================

export function subscribeToCompanySettings(onData: (settings: CompanySettings) => void): () => void {
  const colPath = 'settings';
  const docId = 'company_config';
  const colRef = collection(db, colPath);

  getDocs(colRef)
    .then((snapshot) => {
      if (snapshot.empty) {
        setDoc(doc(db, colPath, docId), {
          ...DEFAULT_COMPANY_SETTINGS,
          updatedAt: new Date().toISOString(),
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, colPath));
      }
    })
    .catch((err) => handleFirestoreError(err, OperationType.GET, colPath));

  return onSnapshot(
    doc(db, colPath, docId),
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        onData({
          ...DEFAULT_COMPANY_SETTINGS,
          ...d,
          id: docSnap.id,
          defaultGstRate: 0,
        });
      } else {
        onData(DEFAULT_COMPANY_SETTINGS);
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, `${colPath}/${docId}`)
  );
}

export async function saveCompanySettingsInDb(settings: CompanySettings): Promise<void> {
  const colPath = 'settings';
  try {
    await setDoc(doc(db, colPath, settings.id || 'company_config'), {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colPath);
  }
}

// ==========================================
// FRESH PRODUCTION DATABASE RESET
// ==========================================

export async function resetProductionDatabaseInDb(): Promise<void> {
  const collectionsToClear = [
    'orders',
    'purchases',
    'ledgers',
    'money_receipts',
    'payment_vouchers',
    'contra_entries',
    'inventory',
  ];

  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      await Promise.all(
        snap.docs.map((d) =>
          deleteDoc(doc(db, colName, d.id)).catch((err) =>
            handleFirestoreError(err, OperationType.DELETE, colName)
          )
        )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colName);
    }
  }

  // Clear non-drawer banks and reset Cash Drawer cleanly to 0
  const bankCol = 'bank_accounts';
  try {
    const bankSnap = await getDocs(collection(db, bankCol));
    await Promise.all(
      bankSnap.docs.map((d) => {
        if (d.id === 'bank-drawer') {
          return setDoc(doc(db, bankCol, d.id), {
            id: 'bank-drawer',
            bankName: 'Office Cash Drawer',
            accountNumber: 'CASH-01',
            branch: 'Cash Counter',
            ifsc: 'CASH',
            accountType: 'Cash Drawer',
            openingBalance: 0,
            currentBalance: 0,
            unclearedChequesCount: 0,
            status: 'Active',
            updatedAt: new Date().toISOString(),
          }).catch((err) => handleFirestoreError(err, OperationType.WRITE, bankCol));
        }
        return deleteDoc(doc(db, bankCol, d.id)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, bankCol)
        );
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, bankCol);
  }

  // Reset company configuration to clean non-GST production defaults
  try {
    await setDoc(doc(db, 'settings', 'company_config'), {
      ...DEFAULT_COMPANY_SETTINGS,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings');
  }
}

