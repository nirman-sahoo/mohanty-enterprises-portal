import React, { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SaleEntryForm } from './components/SaleEntryForm';
import { SaleEntryModal } from './components/SaleEntryModal';
import { InvoiceModal } from './components/InvoiceModal';
import { InvoicesView } from './components/InvoicesView';
import { InventoryView } from './components/InventoryView';
import { LedgerView } from './components/LedgerView';
import { MoneyReceiptModal } from './components/MoneyReceiptModal';
import { PartyStatementModal } from './components/PartyStatementModal';
import { 
  INITIAL_INVENTORY, 
  INITIAL_SALES, 
  INITIAL_LEDGERS 
} from './data/inventoryData';
import { 
  InventoryItem, 
  SaleRecord, 
  CustomerLedger, 
  MoneyReceipt, 
  StatementEntry 
} from './types';
import { numberToIndianWords } from './utils/formatters';

export default function App() {
  // Authentication state (Default initial view is Login Screen)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string>('Ayushman Mohanty');

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // Business state
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [sales, setSales] = useState<SaleRecord[]>(INITIAL_SALES);
  const [ledgers, setLedgers] = useState<CustomerLedger[]>(INITIAL_LEDGERS);

  // Modals state
  const [isRecordSaleModalOpen, setIsRecordSaleModalOpen] = useState<boolean>(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<SaleRecord | null>(null);
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<MoneyReceipt | null>(null);
  const [selectedLedgerForStatement, setSelectedLedgerForStatement] = useState<CustomerLedger | null>(null);

  // Record Sale Handler (supports multi-item order, deducts stock, updates ledger, opens invoice)
  const handleRecordSale = (newSale: SaleRecord) => {
    // 1. Add to sales list
    setSales((prev) => [newSale, ...prev]);

    // 2. Deduct all line items from inventory
    setInventory((prev) =>
      prev.map((item) => {
        const soldInOrder = newSale.items && newSale.items.length > 0
          ? newSale.items.filter((it) => it.itemDescription === item.name)
          : (newSale.itemDescription === item.name ? [{ quantity: newSale.quantity }] : []);

        if (soldInOrder.length > 0) {
          const totalQtySold = soldInOrder.reduce((acc, it) => acc + (it.quantity || 0), 0);
          const newStock = Math.max(0, Number((item.stockLevel - totalQtySold).toFixed(2)));
          return {
            ...item,
            stockLevel: newStock,
            isCriticalLow: newStock <= item.reorderLevel,
          };
        }
        return item;
      })
    );

    // 3. Update customer ledger & statement entries
    setLedgers((prev) => {
      const existing = prev.find((l) => l.name.toLowerCase() === newSale.customerName.toLowerCase());
      const itemQtySummary = newSale.items && newSale.items.length > 0
        ? newSale.items.map((it) => `${it.itemDescription} (${it.quantity} ${it.unit})`).join(', ')
        : `${newSale.itemDescription} (${newSale.quantity} ${newSale.unit})`;

      if (existing) {
        const newStatementEntry: StatementEntry = {
          id: `st-${Date.now()}`,
          date: newSale.date,
          voucherType: 'Sales',
          details: `Bill #${newSale.invoiceNo} · Dispatched via ${newSale.truckNumber || 'Fleet'}`,
          itemQty: itemQtySummary,
          debit: newSale.totalAmount,
          credit: 0,
          balance: existing.outstandingReceivable + newSale.totalAmount,
          balanceType: 'Dr',
        };

        return prev.map((l) =>
          l.id === existing.id
            ? {
                ...l,
                totalBilled: l.totalBilled + newSale.totalAmount,
                outstandingReceivable:
                  newSale.paymentStatus === 'Credit'
                    ? l.outstandingReceivable + newSale.totalAmount
                    : newSale.paymentStatus === 'Partial'
                    ? l.outstandingReceivable + newSale.totalAmount * 0.5
                    : l.outstandingReceivable,
                totalOverdue:
                  newSale.paymentStatus === 'Credit'
                    ? l.totalOverdue + newSale.totalAmount
                    : l.totalOverdue,
                lastTransactionDate: newSale.date,
                statementEntries: [...l.statementEntries, newStatementEntry],
              }
            : l
        );
      } else {
        const newStatementEntry: StatementEntry = {
          id: `st-${Date.now()}`,
          date: newSale.date,
          voucherType: 'Sales',
          details: `Bill #${newSale.invoiceNo}`,
          itemQty: itemQtySummary,
          debit: newSale.totalAmount,
          credit: 0,
          balance: newSale.totalAmount,
          balanceType: 'Dr',
        };

        const newLedger: CustomerLedger = {
          id: `led-${Date.now()}`,
          name: newSale.customerName,
          gstin: '21AAPCM' + Math.floor(1000 + Math.random() * 9000) + 'A1Z' + Math.floor(1 + Math.random() * 9),
          phone: newSale.customerPhone || '+91 94370 28190',
          address: newSale.shipToAddress || 'Commercial Yard, Odisha',
          shipToAddress: newSale.shipToAddress,
          totalBilled: newSale.totalAmount,
          totalPaid: newSale.paymentStatus === 'Paid' ? newSale.totalAmount : 0,
          outstandingReceivable: newSale.paymentStatus === 'Credit' ? newSale.totalAmount : 0,
          totalOverdue: newSale.paymentStatus === 'Credit' ? newSale.totalAmount : 0,
          creditLimit: 1500000,
          creditDays: 30,
          lastPaymentDate: newSale.date,
          lastTransactionDate: newSale.date,
          averageCollectionDays: 15,
          oldestDueDays: 1,
          statementEntries: [newStatementEntry],
        };
        return [newLedger, ...prev];
      }
    });

    // 4. Open Tax Invoice Modal immediately for the newly recorded sale
    setSelectedInvoiceForModal(newSale);
  };

  // Restock inventory handler
  const handleRestockItem = (itemId: string, addQuantity: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedStock = Number((item.stockLevel + addQuantity).toFixed(2));
          return {
            ...item,
            stockLevel: updatedStock,
            isCriticalLow: updatedStock <= item.reorderLevel,
          };
        }
        return item;
      })
    );
  };

  // Open Receive Payment and generate official Money Receipt (PDF Page 2)
  const handleOpenReceivePayment = (party: CustomerLedger) => {
    const defaultAmount = Math.min(party.outstandingReceivable, 150000) || 50000;
    const receiptNo = `MR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];

    const newReceipt: MoneyReceipt = {
      id: `rcp-${Date.now()}`,
      receiptNo,
      date: today,
      partyName: party.name,
      partyAddress: party.address,
      partyPhone: party.phone,
      amount: defaultAmount,
      amountInWords: numberToIndianWords(defaultAmount),
      paymentMode: 'RTGS / NEFT',
      forAccount: 'CEMENT & TMT MATERIAL SUPPLY A/C',
      paidAmount: party.totalPaid + defaultAmount,
      dueAmount: Math.max(0, party.outstandingReceivable - defaultAmount),
      referenceNo: `UTR-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    setSelectedReceiptForModal(newReceipt);

    // Update ledger balances & statement
    setLedgers((prev) =>
      prev.map((ledger) => {
        if (ledger.id === party.id) {
          const newOutstanding = Math.max(0, ledger.outstandingReceivable - defaultAmount);
          const newStatementEntry: StatementEntry = {
            id: `st-${Date.now()}`,
            date: today,
            voucherType: 'Payment',
            details: `Receipt #${receiptNo} via RTGS / NEFT`,
            itemQty: '-',
            debit: 0,
            credit: defaultAmount,
            balance: newOutstanding,
            balanceType: 'Dr',
          };

          return {
            ...ledger,
            totalPaid: ledger.totalPaid + defaultAmount,
            outstandingReceivable: newOutstanding,
            totalOverdue: Math.max(0, (ledger.totalOverdue || 0) - defaultAmount),
            lastPaymentDate: today,
            statementEntries: [...ledger.statementEntries, newStatementEntry],
          };
        }
        return ledger;
      })
    );
  };

  // Add manual transaction to party Khatabook statement
  const handleAddTransactionToLedger = (ledgerId: string, entry: Omit<StatementEntry, 'id'>) => {
    const fullEntry: StatementEntry = {
      ...entry,
      id: `st-${Date.now()}`,
    };

    setLedgers((prev) =>
      prev.map((l) => {
        if (l.id === ledgerId) {
          const updatedEntries = [...l.statementEntries, fullEntry];
          const newOutstanding = entry.debit > 0
            ? l.outstandingReceivable + entry.debit
            : Math.max(0, l.outstandingReceivable - entry.credit);

          return {
            ...l,
            outstandingReceivable: newOutstanding,
            statementEntries: updatedEntries,
            lastTransactionDate: entry.date,
          };
        }
        return l;
      })
    );
  };

  // Update follow-up date and remarks in Khatabook single-format ledger
  const handleUpdateFollowUp = (ledgerId: string, nextFollowUpDate: string, note: string) => {
    setLedgers((prev) =>
      prev.map((l) =>
        l.id === ledgerId
          ? {
              ...l,
              nextFollowUpDate,
              followUpNote: note,
              promisesToPay: note,
            }
          : l
      )
    );
  };

  // Update GST state on invoice
  const handleUpdateGst = (saleId: string, isGst: boolean) => {
    setSales((prev) =>
      prev.map((s) => {
        if (s.id === saleId) {
          const subtotal = s.subtotal || s.totalAmount;
          const gstAmount = isGst ? Math.round(subtotal * 0.18) : 0;
          return {
            ...s,
            isGst,
            gstAmount,
            totalAmount: isGst ? subtotal + gstAmount : subtotal,
          };
        }
        return s;
      })
    );
  };

  // 1. LOGIN SCREEN (Default Initial View)
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setOperatorName(user.toLowerCase().includes('mohanty') ? 'Ayushman Mohanty' : user);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // 2. AUTHENTICATED LAYOUT
  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans text-slate-900">
      {/* Sidebar: Dark slate left navigation bar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onSignOut={() => setIsAuthenticated(false)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header: Clean white bar */}
        <Header
          activeTab={activeTab}
          onOpenRecordSale={() => setIsRecordSaleModalOpen(true)}
          operatorName={operatorName}
        />

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <DashboardView
                inventory={inventory}
                sales={sales}
                onOpenRecordSale={() => setIsRecordSaleModalOpen(true)}
                onViewInvoice={(sale) => setSelectedInvoiceForModal(sale)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'new-sale' && (
              <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    Orders & Estimates Terminal
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Multi-item order entry, WhatsApp verification pipeline, gate dispatch, and tax invoicing
                  </p>
                </div>
                <SaleEntryForm
                  inventory={inventory}
                  onRecordSale={(sale) => {
                    handleRecordSale(sale);
                    setActiveTab('overview');
                  }}
                  onCancel={() => setActiveTab('overview')}
                />
              </div>
            )}

            {activeTab === 'invoices' && (
              <InvoicesView
                sales={sales}
                onViewInvoice={(sale) => setSelectedInvoiceForModal(sale)}
                onOpenRecordSale={() => setIsRecordSaleModalOpen(true)}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView
                inventory={inventory}
                onRestockItem={handleRestockItem}
                onOpenRecordSale={() => setIsRecordSaleModalOpen(true)}
              />
            )}

            {activeTab === 'ledger' && (
              <LedgerView
                ledgers={ledgers}
                onOpenReceivePayment={handleOpenReceivePayment}
                onOpenStatement={(party) => setSelectedLedgerForStatement(party)}
                onUpdateFollowUp={handleUpdateFollowUp}
                onOpenRecordSale={() => setIsRecordSaleModalOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Sale / Order Entry Modal */}
      <SaleEntryModal
        isOpen={isRecordSaleModalOpen}
        onClose={() => setIsRecordSaleModalOpen(false)}
        inventory={inventory}
        onRecordSale={handleRecordSale}
      />

      {/* Commercial Tax / Estimate Invoice Modal (with GST toggle and Compact Thermal Slip view) */}
      <InvoiceModal
        sale={selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        onUpdateGst={handleUpdateGst}
      />

      {/* Official Money Receipt Modal (Page 2) */}
      <MoneyReceiptModal
        receipt={selectedReceiptForModal}
        onClose={() => setSelectedReceiptForModal(null)}
      />

      {/* Detailed Khatabook Party Statement Modal (Page 4) */}
      <PartyStatementModal
        ledger={selectedLedgerForStatement}
        onClose={() => setSelectedLedgerForStatement(null)}
        onAddTransaction={handleAddTransactionToLedger}
      />
    </div>
  );
}
