import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DashboardView } from './components/DashboardView';
import { SaleEntryForm } from './components/SaleEntryForm';
import { SaleEntryModal } from './components/SaleEntryModal';
import { InvoiceModal } from './components/InvoiceModal';
import { InvoicesView } from './components/InvoicesView';
import { InventoryView } from './components/InventoryView';
import { LedgerView } from './components/LedgerView';
import { HRPayrollView } from './components/hr/HRPayrollView';
import { ReportsView } from './components/ReportsView';
import { ExpensesView } from './components/ExpensesView';
import { ProcurementView } from './components/ProcurementView';
import { BankingView } from './components/BankingView';
import { AccountMasterView } from './components/AccountMasterView';
import { JournalView } from './components/JournalView';
import { SettingsView } from './components/SettingsView';
import { MoneyReceiptModal } from './components/MoneyReceiptModal';
import { PartyStatementModal } from './components/PartyStatementModal';
import { 
  InventoryItem, 
  SaleRecord, 
  CustomerLedger, 
  MoneyReceipt, 
  StatementEntry 
} from './types';
import { numberToIndianWords } from './utils/formatters';
import { testConnection } from './firebase/config';
import { 
  subscribeToInventory, 
  subscribeToOrders, 
  subscribeToLedgers,
  createOrderInDb,
  restockItemInDb,
  recordPaymentInDb,
  updateFollowUpInDb,
  addStatementEntryInDb,
  updateOrderGstInDb
} from './services/firebaseService';

export default function App() {
  // Authentication state (Default initial view is Login Screen)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string>('Ayushman Mohanty');

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Live Firebase state (clean production data, no mock records)
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [ledgers, setLedgers] = useState<CustomerLedger[]>([]);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);

  // Modals state
  const [isRecordSaleModalOpen, setIsRecordSaleModalOpen] = useState<boolean>(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<SaleRecord | null>(null);
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<MoneyReceipt | null>(null);
  const [selectedLedgerForStatement, setSelectedLedgerForStatement] = useState<CustomerLedger | null>(null);

  // Initialize live Firestore listeners
  useEffect(() => {
    testConnection();

    const unsubInventory = subscribeToInventory((items) => {
      setInventory(items);
      setIsDbLoading(false);
    });

    const unsubOrders = subscribeToOrders((orders) => {
      setSales(orders);
    });

    const unsubLedgers = subscribeToLedgers((parties) => {
      setLedgers(parties);
    });

    return () => {
      unsubInventory();
      unsubOrders();
      unsubLedgers();
    };
  }, []);

  // Record Sale Handler (writes to live Firestore, deducts inventory, syncs ledger)
  const handleRecordSale = async (newSale: SaleRecord) => {
    // 1. Optimistically update local modal immediately
    setSelectedInvoiceForModal(newSale);

    // 2. Persist to live Firestore database
    await createOrderInDb(newSale, inventory, ledgers);
  };

  // Restock inventory handler (writes live to Firestore)
  const handleRestockItem = async (itemId: string, addQuantity: number) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    await restockItemInDb(itemId, addQuantity, item.stockLevel, item.reorderLevel);
  };

  // Open Receive Payment and generate official Money Receipt
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

    // Persist to live Firestore
    recordPaymentInDb(newReceipt, party);
  };

  // Add manual transaction to party Khatabook statement
  const handleAddTransactionToLedger = async (ledgerId: string, entry: Omit<StatementEntry, 'id'>) => {
    const ledger = ledgers.find((l) => l.id === ledgerId);
    if (!ledger) return;
    await addStatementEntryInDb(ledger, entry);
  };

  // Update follow-up date and remarks in Khatabook single-format ledger
  const handleUpdateFollowUp = async (ledgerId: string, nextFollowUpDate: string, note: string) => {
    await updateFollowUpInDb(ledgerId, nextFollowUpDate, note);
  };

  // Update GST state on invoice
  const handleUpdateGst = async (saleId: string, isGst: boolean) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const subtotal = sale.subtotal || sale.totalAmount;
    const gstAmount = isGst ? Math.round(subtotal * 0.18) : 0;
    const totalAmount = isGst ? subtotal + gstAmount : subtotal;
    await updateOrderGstInDb(saleId, isGst, subtotal, gstAmount, totalAmount);
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
    <div className="flex h-screen w-full bg-[#F4F6F9] overflow-hidden font-sans text-slate-900">
      {/* Sidebar: Dark slate left navigation bar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        onSignOut={() => setIsAuthenticated(false)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header matching overview.jpeg */}
        <Header
          activeTab={activeTab}
          onOpenRecordSale={() => setIsRecordSaleModalOpen(true)}
          operatorName={operatorName}
          onSignOut={() => setIsAuthenticated(false)}
          onNavigateToTab={(tab) => setActiveTab(tab)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-[#F4F6F9]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <DashboardView
                inventory={inventory}
                sales={sales}
                ledgers={ledgers}
                onOpenRecordSale={() => setIsRecordSaleModalOpen(true)}
                onViewInvoice={(sale) => setSelectedInvoiceForModal(sale)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'account-master' && (
              <AccountMasterView />
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

            {activeTab === 'purchase' && (
              <ProcurementView 
                inventory={inventory}
                onRestockItem={handleRestockItem}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView />
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

            {activeTab === 'banking' && (
              <BankingView />
            )}

            {activeTab === 'journal' && (
              <JournalView />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                sales={sales}
                inventory={inventory}
                ledgers={ledgers}
                onOpenRecordSale={() => setIsRecordSaleModalOpen(true)}
              />
            )}

            {activeTab === 'hr-payroll' && (
              <HRPayrollView />
            )}

            {activeTab === 'settings' && (
              <SettingsView />
            )}
          </div>
        </main>

        {/* Global Persistent Footer matching overview.jpeg */}
        <Footer />
      </div>

      {/* Sale / Order Entry Modal */}
      <SaleEntryModal
        isOpen={isRecordSaleModalOpen}
        onClose={() => setIsRecordSaleModalOpen(false)}
        inventory={inventory}
        onRecordSale={handleRecordSale}
      />

      {/* Commercial Tax / Estimate Invoice Modal */}
      <InvoiceModal
        sale={selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        onUpdateGst={handleUpdateGst}
      />

      {/* Official Money Receipt Modal */}
      <MoneyReceiptModal
        receipt={selectedReceiptForModal}
        onClose={() => setSelectedReceiptForModal(null)}
      />

      {/* Detailed Khatabook Party Statement Modal */}
      <PartyStatementModal
        ledger={selectedLedgerForStatement}
        onClose={() => setSelectedLedgerForStatement(null)}
        onAddTransaction={handleAddTransactionToLedger}
      />
    </div>
  );
}
