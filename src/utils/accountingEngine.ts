import {
  BankAccount,
  ContraEntry,
  CustomerLedger,
  InventoryItem,
  LedgerBookEntry,
  MoneyReceipt,
  PaymentVoucher,
  PurchaseRecord,
  SaleRecord,
  StatementEntry,
  SupplierPayableSummary,
} from '../types';

export const CASH_DRAWER_ID = 'bank-drawer';

export function isCashAccount(account: Pick<BankAccount, 'id' | 'accountType' | 'bankName'>): boolean {
  return (
    account.id === CASH_DRAWER_ID ||
    account.accountType === 'Cash Drawer' ||
    account.bankName.toLowerCase().includes('cash drawer') ||
    account.bankName.toLowerCase().includes('cash in')
  );
}

/**
 * Generates a collision-free next voucher sequence number even after older vouchers are deleted.
 */
export function getNextVoucherSequence(existingVoucherNos: string[]): number {
  let maxSeq = 0;
  for (const no of existingVoucherNos) {
    if (!no) continue;
    const match = String(no).trim().match(/(\d+)$/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }
  return Math.max(existingVoucherNos.length, maxSeq) + 1;
}

/**
 * Converts sold/purchased quantities when line-item unit differs from inventory SKU base unit (e.g. Tons <-> KG).
 */
export function convertUnitQty(qty: number, fromUnit?: string, toUnit?: string): number {
  const numericQty = Number(qty) || 0;
  if (!fromUnit || !toUnit || fromUnit === toUnit) return numericQty;
  if (fromUnit === 'KG' && toUnit === 'Tons') return Number((numericQty / 1000).toFixed(4));
  if (fromUnit === 'Tons' && toUnit === 'KG') return Number((numericQty * 1000).toFixed(2));
  return numericQty;
}

/**
 * Recomputes chronological Dr/Cr running balances for a CustomerLedger's statement entries.
 */
export function recomputeStatementBalances(
  openingBalance: number,
  entries: StatementEntry[]
): StatementEntry[] {
  const sorted = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  let running = Number(openingBalance) || 0;
  return sorted.map((entry) => {
    running = running + (Number(entry.debit) || 0) - (Number(entry.credit) || 0);
    return {
      ...entry,
      balance: Math.abs(Number(running.toFixed(2))),
      balanceType: running >= 0 ? 'Dr' : 'Cr',
    };
  });
}

/**
 * Helper to determine how much was settled immediately on a Sales Voucher and to which account.
 */
export function getSaleCashSettlement(
  sale: SaleRecord,
  accounts: BankAccount[]
): { settledAmount: number; accountId: string; accountName: string; isCash: boolean } {
  const paidAmt =
    typeof sale.paidAmount === 'number'
      ? sale.paidAmount
      : sale.paymentStatus === 'Paid'
      ? sale.totalAmount
      : sale.paymentStatus === 'Partial'
      ? Math.round(sale.totalAmount * 0.5)
      : 0;

  if (paidAmt <= 0 || sale.status === 'Cancelled') {
    return { settledAmount: 0, accountId: '', accountName: '', isCash: false };
  }

  const cashAcc = accounts.find((a) => isCashAccount(a));
  const defaultBank = accounts.find((a) => !isCashAccount(a));
  const modeLower = (sale.paymentMode || '').toLowerCase();

  let targetAcc = sale.bankAccountId ? accounts.find((a) => a.id === sale.bankAccountId) : undefined;
  if (!targetAcc) {
    if (modeLower === 'cash' || modeLower.includes('cash')) {
      targetAcc = cashAcc;
    } else if (sale.paymentStatus === 'Paid' && !sale.paymentMode) {
      targetAcc = defaultBank || cashAcc;
    } else {
      targetAcc = defaultBank || cashAcc;
    }
  }

  const accId = sale.bankAccountId || targetAcc?.id || (modeLower.includes('cash') ? CASH_DRAWER_ID : '');
  const accName =
    sale.bankAccountName || targetAcc?.bankName || (accId === CASH_DRAWER_ID ? 'Office Cash Drawer' : 'Bank Account');
  const isCash = targetAcc ? isCashAccount(targetAcc) : accId === CASH_DRAWER_ID || modeLower === 'cash';

  return { settledAmount: paidAmt, accountId: accId, accountName: accName, isCash };
}

/**
 * Helper to determine how much was paid immediately on a Purchase Voucher and from which account.
 */
export function getPurchaseCashSettlement(
  purchase: PurchaseRecord,
  accounts: BankAccount[]
): { paidAmount: number; accountId: string; accountName: string; isCash: boolean } {
  const paidAmt =
    typeof purchase.paidAmount === 'number'
      ? purchase.paidAmount
      : purchase.paymentStatus === 'Paid'
      ? purchase.totalAmount
      : purchase.paymentStatus === 'Partial'
      ? Math.round(purchase.totalAmount * 0.5)
      : 0;

  if (paidAmt <= 0) {
    return { paidAmount: 0, accountId: '', accountName: '', isCash: false };
  }

  const cashAcc = accounts.find((a) => isCashAccount(a));
  const defaultBank = accounts.find((a) => !isCashAccount(a));
  const modeLower = (purchase.paymentMode || '').toLowerCase();

  let targetAcc = purchase.bankAccountId ? accounts.find((a) => a.id === purchase.bankAccountId) : undefined;
  if (!targetAcc) {
    if (modeLower === 'cash' || modeLower.includes('cash')) {
      targetAcc = cashAcc;
    } else {
      targetAcc = defaultBank || cashAcc;
    }
  }

  const accId = purchase.bankAccountId || targetAcc?.id || (modeLower.includes('cash') ? CASH_DRAWER_ID : '');
  const accName =
    purchase.bankAccountName || targetAcc?.bankName || (accId === CASH_DRAWER_ID ? 'Office Cash Drawer' : 'Bank Account');
  const isCash = targetAcc ? isCashAccount(targetAcc) : accId === CASH_DRAWER_ID || modeLower === 'cash';

  return { paidAmount: paidAmt, accountId: accId, accountName: accName, isCash };
}

/**
 * Resolve MoneyReceipt target account (Cash Drawer vs specific Bank Account).
 */
export function getMoneyReceiptAccount(
  receipt: MoneyReceipt,
  accounts: BankAccount[]
): { accountId: string; accountName: string; isCash: boolean } {
  const cashAcc = accounts.find((a) => isCashAccount(a));
  const defaultBank = accounts.find((a) => !isCashAccount(a));

  if (receipt.bankAccountId) {
    const matched = accounts.find((a) => a.id === receipt.bankAccountId);
    if (matched) {
      return { accountId: matched.id, accountName: matched.bankName, isCash: isCashAccount(matched) };
    }
  }

  if (receipt.paymentMode === 'Cash') {
    return {
      accountId: cashAcc?.id || CASH_DRAWER_ID,
      accountName: cashAcc?.bankName || 'Office Cash Drawer',
      isCash: true,
    };
  }

  return {
    accountId: receipt.bankAccountId || defaultBank?.id || '',
    accountName: receipt.bankAccountName || defaultBank?.bankName || 'Bank Account',
    isCash: false,
  };
}

/**
 * Resolve PaymentVoucher source account (Cash Drawer vs specific Bank Account).
 */
export function getPaymentVoucherAccount(
  voucher: PaymentVoucher,
  accounts: BankAccount[]
): { accountId: string; accountName: string; isCash: boolean } {
  const cashAcc = accounts.find((a) => isCashAccount(a));
  const defaultBank = accounts.find((a) => !isCashAccount(a));

  if (voucher.bankAccountId) {
    const matched = accounts.find((a) => a.id === voucher.bankAccountId);
    if (matched) {
      return { accountId: matched.id, accountName: matched.bankName, isCash: isCashAccount(matched) };
    }
  }

  if (voucher.paymentMode === 'Cash') {
    return {
      accountId: cashAcc?.id || CASH_DRAWER_ID,
      accountName: cashAcc?.bankName || 'Office Cash Drawer',
      isCash: true,
    };
  }

  return {
    accountId: voucher.bankAccountId || defaultBank?.id || '',
    accountName: voucher.bankAccountName || defaultBank?.bankName || 'Bank Account',
    isCash: false,
  };
}

function resolveAccountByIdOrName(accounts: BankAccount[], id?: string, name?: string): BankAccount | undefined {
  if (id) {
    const byId = accounts.find((a) => a.id === id);
    if (byId) return byId;
  }
  if (name) {
    const byName = accounts.find((a) => a.bankName.toLowerCase() === name.toLowerCase());
    if (byName) return byName;
  }
  return undefined;
}

/**
 * Builds chronological Cash Book OR Bank Book ledger entries from all interlinked vouchers.
 * Double-entry convention for Asset Book (Cash / Bank):
 * - Debit (Dr) = Receipt / Inward (increases balance)
 * - Credit (Cr) = Payment / Outward (decreases balance)
 */
export function computeAccountBook(params: {
  bookType: 'cash' | 'bank';
  selectedAccountId?: string;
  accounts: BankAccount[];
  sales: SaleRecord[];
  moneyReceipts: MoneyReceipt[];
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  contraEntries: ContraEntry[];
}): {
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entries: LedgerBookEntry[];
} {
  const {
    bookType,
    selectedAccountId = 'ALL',
    accounts,
    sales,
    moneyReceipts,
    purchases,
    paymentVouchers,
    contraEntries,
  } = params;

  const targetAccounts =
    bookType === 'cash'
      ? accounts.filter((a) => isCashAccount(a))
      : accounts.filter((a) => !isCashAccount(a) && (selectedAccountId === 'ALL' || a.id === selectedAccountId));

  const targetIds = new Set(targetAccounts.map((a) => a.id));
  if (bookType === 'cash' && targetIds.size === 0) {
    targetIds.add(CASH_DRAWER_ID);
  }

  const openingBalance = targetAccounts.reduce((sum, a) => sum + (Number(a.openingBalance) || 0), 0);
  const rawEntries: Omit<LedgerBookEntry, 'runningBalance'>[] = [];

  // 1. Sales Vouchers (Immediate Cash / Bank Receipts)
  sales.forEach((sale) => {
    const settlement = getSaleCashSettlement(sale, accounts);
    if (settlement.settledAmount <= 0) return;

    const belongsToBook =
      bookType === 'cash'
        ? settlement.isCash || targetIds.has(settlement.accountId)
        : !settlement.isCash && (selectedAccountId === 'ALL' || targetIds.has(settlement.accountId));

    if (!belongsToBook) return;

    rawEntries.push({
      id: `book-sale-${sale.id}`,
      sourceId: sale.id,
      sourceCollection: 'orders',
      date: sale.date || '',
      voucherNo: sale.invoiceNo || sale.orderNo,
      particulars: `Sales Receipt · ${sale.customerName}`,
      voucherType: 'Sales Receipt',
      accountId: settlement.accountId,
      accountName: settlement.accountName,
      paymentMode: sale.paymentMode || (settlement.isCash ? 'Cash' : 'Bank'),
      referenceNo: sale.paymentReference || sale.orderNo,
      debit: settlement.settledAmount,
      credit: 0,
      canDeleteDirect: false,
    });
  });

  // 2. Customer Money Receipts (Against Credit Sales / Party Outstandings)
  moneyReceipts.forEach((rcp) => {
    const accInfo = getMoneyReceiptAccount(rcp, accounts);
    const belongsToBook =
      bookType === 'cash'
        ? accInfo.isCash || targetIds.has(accInfo.accountId)
        : !accInfo.isCash && (selectedAccountId === 'ALL' || targetIds.has(accInfo.accountId));

    if (!belongsToBook) return;

    rawEntries.push({
      id: `book-rcp-${rcp.id}`,
      sourceId: rcp.id,
      sourceCollection: 'money_receipts',
      date: rcp.date || '',
      voucherNo: rcp.receiptNo,
      particulars: `Receipt from ${rcp.partyName}${rcp.remarks ? ` · ${rcp.remarks}` : ''}`,
      voucherType: 'Money Receipt',
      accountId: accInfo.accountId,
      accountName: accInfo.accountName,
      paymentMode: rcp.paymentMode,
      referenceNo: rcp.referenceNo,
      debit: Number(rcp.amount) || 0,
      credit: 0,
      canDeleteDirect: true,
    });
  });

  // 3. Purchase Vouchers (Immediate Cash / Bank Outflows)
  purchases.forEach((po) => {
    const settlement = getPurchaseCashSettlement(po, accounts);
    if (settlement.paidAmount <= 0) return;

    const belongsToBook =
      bookType === 'cash'
        ? settlement.isCash || targetIds.has(settlement.accountId)
        : !settlement.isCash && (selectedAccountId === 'ALL' || targetIds.has(settlement.accountId));

    if (!belongsToBook) return;

    rawEntries.push({
      id: `book-po-${po.id}`,
      sourceId: po.id,
      sourceCollection: 'purchases',
      date: po.date || '',
      voucherNo: po.purchaseNo,
      particulars: `Purchase Payment · ${po.supplierName}`,
      voucherType: 'Purchase Payment',
      accountId: settlement.accountId,
      accountName: settlement.accountName,
      paymentMode: po.paymentMode || (settlement.isCash ? 'Cash' : 'Bank'),
      referenceNo: po.paymentReference || po.challanNo,
      debit: 0,
      credit: settlement.paidAmount,
      canDeleteDirect: false,
    });
  });

  // 4. Supplier Payment Vouchers (Against Credit Purchases / Payables)
  paymentVouchers.forEach((pv) => {
    const accInfo = getPaymentVoucherAccount(pv, accounts);
    const belongsToBook =
      bookType === 'cash'
        ? accInfo.isCash || targetIds.has(accInfo.accountId)
        : !accInfo.isCash && (selectedAccountId === 'ALL' || targetIds.has(accInfo.accountId));

    if (!belongsToBook) return;

    rawEntries.push({
      id: `book-pv-${pv.id}`,
      sourceId: pv.id,
      sourceCollection: 'payment_vouchers',
      date: pv.date || '',
      voucherNo: pv.voucherNo,
      particulars: `Payment to ${pv.supplierName}${pv.purchaseNo ? ` (Ref: ${pv.purchaseNo})` : ''}`,
      voucherType: 'Payment Voucher',
      accountId: accInfo.accountId,
      accountName: accInfo.accountName,
      paymentMode: pv.paymentMode,
      referenceNo: pv.referenceNo,
      debit: 0,
      credit: Number(pv.amount) || 0,
      canDeleteDirect: true,
    });
  });

  // 5. Contra Entries (Cash <-> Bank / Bank <-> Bank)
  contraEntries.forEach((ce) => {
    const fromAcc = resolveAccountByIdOrName(accounts, ce.fromAccountId, ce.fromAccount);
    const toAcc = resolveAccountByIdOrName(accounts, ce.toAccountId, ce.toAccount);

    const fromId = fromAcc?.id || ce.fromAccountId || '';
    const toId = toAcc?.id || ce.toAccountId || '';
    const fromIsCash = fromAcc ? isCashAccount(fromAcc) : ce.fromAccount.toLowerCase().includes('cash');
    const toIsCash = toAcc ? isCashAccount(toAcc) : ce.toAccount.toLowerCase().includes('cash');

    // Outward side (Credit)
    const fromMatchesBook =
      bookType === 'cash'
        ? fromIsCash || targetIds.has(fromId)
        : !fromIsCash && (selectedAccountId === 'ALL' || targetIds.has(fromId));

    if (fromMatchesBook) {
      rawEntries.push({
        id: `book-contra-out-${ce.id}`,
        sourceId: ce.id,
        sourceCollection: 'contra_entries',
        date: ce.date || '',
        voucherNo: ce.voucherNo,
        particulars: `Contra Transfer to ${ce.toAccount}${ce.remarks ? ` · ${ce.remarks}` : ''}`,
        voucherType: toIsCash ? 'Contra Withdrawal' : fromIsCash ? 'Contra Deposit' : 'Contra Transfer',
        accountId: fromId || ce.fromAccount,
        accountName: fromAcc?.bankName || ce.fromAccount,
        paymentMode: 'Contra',
        referenceNo: ce.referenceNo,
        debit: 0,
        credit: Number(ce.amount) || 0,
        canDeleteDirect: true,
      });
    }

    // Inward side (Debit)
    const toMatchesBook =
      bookType === 'cash'
        ? toIsCash || targetIds.has(toId)
        : !toIsCash && (selectedAccountId === 'ALL' || targetIds.has(toId));

    if (toMatchesBook) {
      rawEntries.push({
        id: `book-contra-in-${ce.id}`,
        sourceId: ce.id,
        sourceCollection: 'contra_entries',
        date: ce.date || '',
        voucherNo: ce.voucherNo,
        particulars: `Contra Transfer from ${ce.fromAccount}${ce.remarks ? ` · ${ce.remarks}` : ''}`,
        voucherType: toIsCash ? 'Contra Withdrawal' : fromIsCash ? 'Contra Deposit' : 'Contra Transfer',
        accountId: toId || ce.toAccount,
        accountName: toAcc?.bankName || ce.toAccount,
        paymentMode: 'Contra',
        referenceNo: ce.referenceNo,
        debit: Number(ce.amount) || 0,
        credit: 0,
        canDeleteDirect: true,
      });
    }
  });

  // Sort oldest-first for accurate running balance calculation
  rawEntries.sort((a, b) => {
    const cmp = (a.date || '').localeCompare(b.date || '');
    if (cmp !== 0) return cmp;
    return (a.voucherNo || '').localeCompare(b.voucherNo || '');
  });

  let running = openingBalance;
  let totalDebits = 0;
  let totalCredits = 0;

  const entries: LedgerBookEntry[] = rawEntries.map((item) => {
    running = running + item.debit - item.credit;
    totalDebits += item.debit;
    totalCredits += item.credit;
    return {
      ...item,
      runningBalance: running,
    };
  });

  return {
    openingBalance,
    totalDebits,
    totalCredits,
    closingBalance: running,
    entries,
  };
}

/**
 * Computes Sundry Creditors / Supplier Payables dynamically from Purchase Vouchers & Payment Vouchers.
 */
export function computeSupplierPayables(
  purchases: PurchaseRecord[],
  paymentVouchers: PaymentVoucher[]
): SupplierPayableSummary[] {
  const map = new Map<string, SupplierPayableSummary>();
  const getKey = (name: string) => name.trim().toLowerCase();

  purchases.forEach((po) => {
    const key = getKey(po.supplierName || 'Unknown Supplier');
    const existing = map.get(key) || {
      supplierName: po.supplierName.trim(),
      supplierGst: po.supplierGst || '',
      supplierPhone: po.supplierPhone || '',
      totalPurchased: 0,
      totalPaid: 0,
      outstandingPayable: 0,
      billCount: 0,
      unpaidBillCount: 0,
      lastPurchaseDate: '',
      lastPaymentDate: '',
      purchases: [],
      payments: [],
    };

    const immediatePaid =
      typeof po.paidAmount === 'number'
        ? po.paidAmount
        : po.paymentStatus === 'Paid'
        ? po.totalAmount
        : po.paymentStatus === 'Partial'
        ? Math.round(po.totalAmount * 0.5)
        : 0;

    existing.totalPurchased += po.totalAmount || 0;
    existing.totalPaid += immediatePaid;
    existing.billCount += 1;
    if (!existing.lastPurchaseDate || (po.date && po.date > existing.lastPurchaseDate)) {
      existing.lastPurchaseDate = po.date;
    }
    if (!existing.supplierGst && po.supplierGst) existing.supplierGst = po.supplierGst;
    if (!existing.supplierPhone && po.supplierPhone) existing.supplierPhone = po.supplierPhone;
    existing.purchases.push(po);

    map.set(key, existing);
  });

  paymentVouchers.forEach((pv) => {
    const key = getKey(pv.supplierName || 'Unknown Supplier');
    const existing = map.get(key) || {
      supplierName: pv.supplierName.trim(),
      supplierGst: pv.supplierGst || '',
      supplierPhone: '',
      totalPurchased: 0,
      totalPaid: 0,
      outstandingPayable: 0,
      billCount: 0,
      unpaidBillCount: 0,
      lastPurchaseDate: '',
      lastPaymentDate: '',
      purchases: [],
      payments: [],
    };

    existing.totalPaid += Number(pv.amount) || 0;
    if (!existing.lastPaymentDate || (pv.date && pv.date > existing.lastPaymentDate)) {
      existing.lastPaymentDate = pv.date;
    }
    existing.payments.push(pv);
    map.set(key, existing);
  });

  const result: SupplierPayableSummary[] = [];
  map.forEach((summary) => {
    summary.outstandingPayable = Math.max(0, summary.totalPurchased - summary.totalPaid);

    summary.unpaidBillCount = summary.purchases.filter((po) => {
      const upfront =
        typeof po.paidAmount === 'number'
          ? po.paidAmount
          : po.paymentStatus === 'Paid'
          ? po.totalAmount
          : po.paymentStatus === 'Partial'
          ? Math.round(po.totalAmount * 0.5)
          : 0;
      const linkedPaid = summary.payments
        .filter((pv) => pv.purchaseId === po.id)
        .reduce((s, pv) => s + (Number(pv.amount) || 0), 0);
      return po.totalAmount - (upfront + linkedPaid) > 0.5;
    }).length;

    summary.purchases.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    summary.payments.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    result.push(summary);
  });

  return result.sort((a, b) => b.outstandingPayable - a.outstandingPayable);
}

/**
 * Helper to compute live payment status of a single PurchaseRecord including linked PaymentVouchers.
 */
export function getPurchaseLiveStatus(
  po: PurchaseRecord,
  paymentVouchers: PaymentVoucher[]
): { upfrontPaid: number; voucherPaid: number; totalSettled: number; balanceDue: number; status: 'Paid' | 'Partial' | 'Pending' } {
  const upfrontPaid =
    typeof po.paidAmount === 'number'
      ? po.paidAmount
      : po.paymentStatus === 'Paid'
      ? po.totalAmount
      : po.paymentStatus === 'Partial'
      ? Math.round(po.totalAmount * 0.5)
      : 0;

  const voucherPaid = paymentVouchers
    .filter((pv) => pv.purchaseId === po.id)
    .reduce((sum, pv) => sum + (Number(pv.amount) || 0), 0);

  const totalSettled = Math.min(po.totalAmount, upfrontPaid + voucherPaid);
  const balanceDue = Math.max(0, po.totalAmount - totalSettled);

  const status: 'Paid' | 'Partial' | 'Pending' =
    balanceDue <= 0.5 ? 'Paid' : totalSettled > 0 ? 'Partial' : 'Pending';

  return { upfrontPaid, voucherPaid, totalSettled, balanceDue, status };
}

/**
 * Computes true balance for every BankAccount & Cash Drawer from openingBalance + live vouchers.
 */
export function computeAllAccountBalances(params: {
  accounts: BankAccount[];
  sales: SaleRecord[];
  moneyReceipts: MoneyReceipt[];
  purchases: PurchaseRecord[];
  paymentVouchers: PaymentVoucher[];
  contraEntries: ContraEntry[];
}): Record<string, number> {
  const { accounts, sales, moneyReceipts, purchases, paymentVouchers, contraEntries } = params;
  const balances: Record<string, number> = {};

  accounts.forEach((acc) => {
    if (isCashAccount(acc)) {
      const cashBook = computeAccountBook({
        bookType: 'cash',
        accounts,
        sales,
        moneyReceipts,
        purchases,
        paymentVouchers,
        contraEntries,
      });
      balances[acc.id] = cashBook.closingBalance;
    } else {
      const bankBook = computeAccountBook({
        bookType: 'bank',
        selectedAccountId: acc.id,
        accounts,
        sales,
        moneyReceipts,
        purchases,
        paymentVouchers,
        contraEntries,
      });
      balances[acc.id] = bankBook.closingBalance;
    }
  });

  return balances;
}

/**
 * Computes Financial Summary across Sales, Purchases, Stock, Cash/Bank, Debtors, Creditors (Non-GST).
 * Uses true COGS formula: Gross Trading Profit = Sales - (Opening/Adjusted Stock + Purchases - Closing Stock).
 */
export function computeFinancialSummary(params: {
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  inventory: InventoryItem[];
  ledgers: CustomerLedger[];
  paymentVouchers: PaymentVoucher[];
  moneyReceipts: MoneyReceipt[];
  accounts: BankAccount[];
  contraEntries: ContraEntry[];
}) {
  const { sales, purchases, inventory, ledgers, paymentVouchers, moneyReceipts, accounts, contraEntries } = params;

  const activeSales = sales.filter((s) => s.status !== 'Cancelled');
  const grossSales = activeSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const grossPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  const cashBook = computeAccountBook({
    bookType: 'cash',
    accounts,
    sales,
    moneyReceipts,
    purchases,
    paymentVouchers,
    contraEntries,
  });

  const bankBook = computeAccountBook({
    bookType: 'bank',
    selectedAccountId: 'ALL',
    accounts,
    sales,
    moneyReceipts,
    purchases,
    paymentVouchers,
    contraEntries,
  });

  const totalReceivables = ledgers.reduce((sum, l) => sum + Math.max(0, l.outstandingReceivable || 0), 0);
  const payablesList = computeSupplierPayables(purchases, paymentVouchers);
  const totalPayables = payablesList.reduce((sum, p) => sum + p.outstandingPayable, 0);
  const closingStockValue = inventory.reduce((sum, i) => sum + i.stockLevel * i.unitPrice, 0);

  // Derive Opening / Manual Stock value per SKU so opening stock isn't counted as fake profit
  const purchasedQtyBySku: Record<string, number> = {};
  purchases.forEach((po) => {
    (po.items || []).forEach((it) => {
      const key = it.itemName.trim().toLowerCase();
      purchasedQtyBySku[key] = (purchasedQtyBySku[key] || 0) + (Number(it.quantity) || 0);
    });
  });

  const soldQtyBySku: Record<string, number> = {};
  activeSales.forEach((sale) => {
    const lines = sale.items && sale.items.length > 0 ? sale.items : [sale];
    lines.forEach((it) => {
      const key = (it.itemDescription || '').trim().toLowerCase();
      if (!key) return;
      const matchedInv = inventory.find((inv) => inv.name.trim().toLowerCase() === key);
      const convertedQty = matchedInv ? convertUnitQty(it.quantity, it.unit, matchedInv.unit) : Number(it.quantity) || 0;
      soldQtyBySku[key] = (soldQtyBySku[key] || 0) + convertedQty;
    });
  });

  const openingStockValue = inventory.reduce((sum, inv) => {
    const key = inv.name.trim().toLowerCase();
    const inQty = purchasedQtyBySku[key] || 0;
    const outQty = soldQtyBySku[key] || 0;
    const inferredOpeningQty = Math.max(0, inv.stockLevel + outQty - inQty);
    return sum + inferredOpeningQty * inv.unitPrice;
  }, 0);

  const cogs = openingStockValue + grossPurchases - closingStockValue;
  const grossTradingProfit = grossSales - cogs;

  // Cash & Bank Operating Inflows vs Outflows (excluding internal Contra transfers)
  const operatingInflows = [...cashBook.entries, ...bankBook.entries]
    .filter((e) => e.sourceCollection !== 'contra_entries')
    .reduce((s, e) => s + e.debit, 0);

  const operatingOutflows = [...cashBook.entries, ...bankBook.entries]
    .filter((e) => e.sourceCollection !== 'contra_entries')
    .reduce((s, e) => s + e.credit, 0);

  return {
    grossSales,
    grossPurchases,
    cashClosingBalance: cashBook.closingBalance,
    bankClosingBalance: bankBook.closingBalance,
    totalLiquidity: cashBook.closingBalance + bankBook.closingBalance,
    totalReceivables,
    totalPayables,
    openingStockValue,
    closingStockValue,
    cogs,
    grossTradingProfit,
    operatingInflows,
    operatingOutflows,
    netWorkingCapital:
      cashBook.closingBalance + bankBook.closingBalance + totalReceivables + closingStockValue - totalPayables,
  };
}
