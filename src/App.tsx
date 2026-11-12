import React, { useEffect, useMemo, useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DashboardView } from './components/DashboardView';
import { SalesVoucherView } from './components/transactions/SalesVoucherView';
import { PurchaseVoucherView } from './components/transactions/PurchaseVoucherView';
import { BankBookView } from './components/banking/BankBookView';
import { CashBookView } from './components/banking/CashBookView';
import { ContraEntryView } from './components/banking/ContraEntryView';
import { SalesRegisterView } from './components/reports/SalesRegisterView';
import { PurchaseRegisterView } from './components/reports/PurchaseRegisterView';
import { StockReportView } from './components/reports/StockReportView';
import { PartyOutstandingsView } from './components/reports/PartyOutstandingsView';
import { PayablesView } from './components/reports/PayablesView';
import { SettingsView } from './components/SettingsView';
import { InvoiceModal } from './components/InvoiceModal';
import { MoneyReceiptModal } from './components/MoneyReceiptModal';
import { PartyStatementModal } from './components/PartyStatementModal';
import { ReceivePaymentModal } from './components/modals/ReceivePaymentModal';
import { PaySupplierModal } from './components/modals/PaySupplierModal';
import {
  BankAccount,
  CompanySettings,
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
} from './types';
import { testConnection } from './firebase/config';
import { computeSupplierPayables, getNextVoucherSequence } from './utils/accountingEngine';
import {
  DEFAULT_COMPANY_SETTINGS,
  subscribeToInventory,
  subscribeToOrders,
  subscribeToLedgers,
  subscribeToMoneyReceipts,
  subscribeToPaymentVouchers,
  subscribeToPurchases,
  subscribeToBankAccounts,
  subscribeToContraEntries,
  subscribeToCompanySettings,
  createOrderInDb,
  deleteOrderInDb,
  restockItemInDb,
  saveInventoryItemInDb,
  deleteInventoryItemInDb,
  recordPaymentInDb,
  deleteMoneyReceiptInDb,
  updateFollowUpInDb,
  addStatementEntryInDb,
  deleteLedgerInDb,
  savePurchaseInDb,
  deletePurchaseInDb,
  savePaymentVoucherInDb,
  deletePaymentVoucherInDb,
  saveBankAccountInDb,
  deleteBankAccountInDb,
  saveContraEntryInDb,
  deleteContraEntryInDb,
  saveCompanySettingsInDb,
  resetProductionDatabaseInDb,
} from './services/firebaseService';

export default function App() {
  // Authentication state (LoginScreen kept strictly unchanged)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string>('Administrator');

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Live Firestore collections
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [ledgers, setLedgers] = useState<CustomerLedger[]>([]);
  const [moneyReceipts, setMoneyReceipts] = useState<MoneyReceipt[]>([]);
  const [paymentVouchers, setPaymentVouchers] = useState<PaymentVoucher[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [contraEntries, setContraEntries] = useState<ContraEntry[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

  // Modals state
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<SaleRecord | null>(null);
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<MoneyReceipt | null>(null);
  const [selectedLedgerForStatement, setSelectedLedgerForStatement] = useState<CustomerLedger | null>(null);

  const [receiveModalConfig, setReceiveModalConfig] = useState<{
    isOpen: boolean;
    party: CustomerLedger | null;
    bookType: 'cash' | 'bank';
    accountId?: string;
  }>({
    isOpen: false,
    party: null,
    bookType: 'bank',
  });

  const [paySupplierModalConfig, setPaySupplierModalConfig] = useState<{
    isOpen: boolean;
    supplier: SupplierPayableSummary | null;
    bookType: 'cash' | 'bank';
    accountId?: string;
  }>({
    isOpen: false,
    supplier: null,
    bookType: 'bank',
  });

  // Live Firestore subscriptions
  useEffect(() => {
    testConnection();

    const unsubInventory = subscribeToInventory(setInventory);
    const unsubOrders = subscribeToOrders(setSales);
    const unsubLedgers = subscribeToLedgers(setLedgers);
    const unsubReceipts = subscribeToMoneyReceipts(setMoneyReceipts);
    const unsubPayments = subscribeToPaymentVouchers(setPaymentVouchers);
    const unsubPurchases = subscribeToPurchases(setPurchases);
    const unsubBanks = subscribeToBankAccounts(setBankAccounts);
    const unsubContra = subscribeToContraEntries(setContraEntries);
    const unsubSettings = subscribeToCompanySettings(setCompanySettings);

    return () => {
      unsubInventory();
      unsubOrders();
      unsubLedgers();
      unsubReceipts();
      unsubPayments();
      unsubPurchases();
      unsubBanks();
      unsubContra();
      unsubSettings();
    };
  }, []);

  const supplierPayables = useMemo(
    () => computeSupplierPayables(purchases, paymentVouchers),
    [purchases, paymentVouchers]
  );

  // Handlers
  const handleCreateSale = async (newSale: SaleRecord) => {
    await createOrderInDb(newSale, inventory, ledgers);
    if (companySettings.autoPrintEstimate) {
      setSelectedInvoiceForModal(newSale);
    }
  };

  const handleDeleteSale = async (sale: SaleRecord) => {
    await deleteOrderInDb(sale.id, sale, inventory, ledgers);
  };

  const handleSaveMoneyReceipt = async (receipt: MoneyReceipt, ledger?: CustomerLedger) => {
    await recordPaymentInDb(receipt, ledger, ledgers);
    setSelectedReceiptForModal(receipt);
  };

  const handleDeleteBookEntry = async (entry: LedgerBookEntry) => {
    if (entry.sourceCollection === 'money_receipts') {
      const rcp = moneyReceipts.find((r) => r.id === entry.sourceId);
      if (rcp) await deleteMoneyReceiptInDb(rcp, ledgers);
    } else if (entry.sourceCollection === 'payment_vouchers') {
      await deletePaymentVoucherInDb(entry.sourceId);
    } else if (entry.sourceCollection === 'contra_entries') {
      await deleteContraEntryInDb(entry.sourceId);
    }
  };

  const handleAddStatementEntry = async (ledgerId: string, entry: Omit<StatementEntry, 'id'>) => {
    const ledger = ledgers.find((l) => l.id === ledgerId);
    if (!ledger) return;
    await addStatementEntryInDb(ledger, entry);
  };

  // Keep statement modal synced if ledger updates in Firestore
  const activeStatementLedger = useMemo(() => {
    if (!selectedLedgerForStatement) return null;
    return ledgers.find((l) => l.id === selectedLedgerForStatement.id) || selectedLedgerForStatement;
  }, [selectedLedgerForStatement, ledgers]);

  // 1. LOGIN SCREEN (Unchanged)
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setOperatorName(companySettings.directorName || user);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // 2. AUTHENTICATED ACCOUNTING WORKSPACE
  return (
    <div className="flex h-screen w-full bg-[#F4F6F9] overflow-hidden font-sans text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        onSignOut={() => setIsAuthenticated(false)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        companyPhone={companySettings.phone}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          onNewSalesVoucher={() => setActiveTab('sales-voucher')}
          operatorName={companySettings.directorName || operatorName}
          companyName={companySettings.companyName}
          companyTagline={companySettings.tradeTagline}
          companySlogan={companySettings.slogan}
          inventory={inventory}
          ledgers={ledgers}
          payables={supplierPayables}
          onSignOut={() => setIsAuthenticated(false)}
          onNavigateToTab={(tab) => setActiveTab(tab)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-[#F4F6F9]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                inventory={inventory}
                sales={sales}
                ledgers={ledgers}
                purchases={purchases}
                moneyReceipts={moneyReceipts}
                paymentVouchers={paymentVouchers}
                bankAccounts={bankAccounts}
                contraEntries={contraEntries}
                onViewInvoice={(sale) => setSelectedInvoiceForModal(sale)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onOpenReceivePayment={() =>
                  setReceiveModalConfig({
                    isOpen: true,
                    party: null,
                    bookType: 'bank',
                  })
                }
                onOpenPaySupplier={() =>
                  setPaySupplierModalConfig({
                    isOpen: true,
                    supplier: null,
                    bookType: 'bank',
                  })
                }
              />
            )}

            {/* TRANSACTIONS GROUP */}
            {activeTab === 'sales-voucher' && (
              <SalesVoucherView
                inventory={inventory}
                sales={sales}
                ledgers={ledgers}
                bankAccounts={bankAccounts}
                settings={companySettings}
                onCreateSale={handleCreateSale}
                onDeleteSale={handleDeleteSale}
                onViewInvoice={(sale) => setSelectedInvoiceForModal(sale)}
              />
            )}

            {activeTab === 'purchase-voucher' && (
              <PurchaseVoucherView
                inventory={inventory}
                purchases={purchases}
                paymentVouchers={paymentVouchers}
                bankAccounts={bankAccounts}
                settings={companySettings}
                onSavePurchase={async (po) => {
                  await savePurchaseInDb(po, inventory);
                }}
                onDeletePurchase={async (po) => {
                  await deletePurchaseInDb(po.id, po, inventory);
                }}
              />
            )}

            {/* BANKING GROUP */}
            {activeTab === 'bank-book' && (
              <BankBookView
                accounts={bankAccounts}
                sales={sales}
                moneyReceipts={moneyReceipts}
                purchases={purchases}
                paymentVouchers={paymentVouchers}
                contraEntries={contraEntries}
                onOpenReceivePayment={(accountId) =>
                  setReceiveModalConfig({
                    isOpen: true,
                    party: null,
                    bookType: 'bank',
                    accountId,
                  })
                }
                onOpenPaySupplier={(accountId) =>
                  setPaySupplierModalConfig({
                    isOpen: true,
                    supplier: null,
                    bookType: 'bank',
                    accountId,
                  })
                }
                onDeleteBookEntry={handleDeleteBookEntry}
              />
            )}

            {activeTab === 'cash-book' && (
              <CashBookView
                accounts={bankAccounts}
                sales={sales}
                moneyReceipts={moneyReceipts}
                purchases={purchases}
                paymentVouchers={paymentVouchers}
                contraEntries={contraEntries}
                onOpenReceivePayment={() =>
                  setReceiveModalConfig({
                    isOpen: true,
                    party: null,
                    bookType: 'cash',
                  })
                }
                onOpenPaySupplier={() =>
                  setPaySupplierModalConfig({
                    isOpen: true,
                    supplier: null,
                    bookType: 'cash',
                  })
                }
                onDeleteBookEntry={handleDeleteBookEntry}
              />
            )}

            {activeTab === 'contra-entry' && (
              <ContraEntryView
                accounts={bankAccounts}
                sales={sales}
                moneyReceipts={moneyReceipts}
                purchases={purchases}
                paymentVouchers={paymentVouchers}
                contraEntries={contraEntries}
                settings={companySettings}
                onSaveContra={saveContraEntryInDb}
                onDeleteContra={async (entry) => {
                  await deleteContraEntryInDb(entry.id);
                }}
              />
            )}

            {/* REPORTS GROUP */}
            {activeTab === 'sales-register' && (
              <SalesRegisterView
                sales={sales}
                settings={companySettings}
                onViewInvoice={(sale) => setSelectedInvoiceForModal(sale)}
                onNewSalesVoucher={() => setActiveTab('sales-voucher')}
                onDeleteSale={handleDeleteSale}
              />
            )}

            {activeTab === 'purchase-register' && (
              <PurchaseRegisterView
                purchases={purchases}
                paymentVouchers={paymentVouchers}
                onNewPurchaseVoucher={() => setActiveTab('purchase-voucher')}
                onPayBill={(supplierName) => {
                  const matched = supplierPayables.find((s) => s.supplierName === supplierName) || null;
                  setPaySupplierModalConfig({
                    isOpen: true,
                    supplier: matched,
                    bookType: 'bank',
                  });
                }}
                onDeletePurchase={async (po) => {
                  await deletePurchaseInDb(po.id, po, inventory);
                }}
              />
            )}

            {activeTab === 'stock-report' && (
              <StockReportView
                inventory={inventory}
                purchases={purchases}
                sales={sales}
                onRestockItem={async (itemId, addQty) => {
                  const item = inventory.find((i) => i.id === itemId);
                  if (item) await restockItemInDb(itemId, addQty, item.stockLevel, item.reorderLevel);
                }}
                onSaveItem={saveInventoryItemInDb}
                onDeleteItem={async (item) => {
                  await deleteInventoryItemInDb(item.id);
                }}
              />
            )}

            {activeTab === 'party-outstandings' && (
              <PartyOutstandingsView
                ledgers={ledgers}
                moneyReceipts={moneyReceipts}
                onOpenReceivePayment={(party) =>
                  setReceiveModalConfig({
                    isOpen: true,
                    party,
                    bookType: 'bank',
                  })
                }
                onOpenStatement={(party) => setSelectedLedgerForStatement(party)}
                onUpdateFollowUp={updateFollowUpInDb}
                onNewSalesVoucher={() => setActiveTab('sales-voucher')}
                onDeleteLedger={async (party) => {
                  await deleteLedgerInDb(party.id);
                }}
                onDeleteMoneyReceipt={async (rcp) => {
                  await deleteMoneyReceiptInDb(rcp, ledgers);
                }}
              />
            )}

            {activeTab === 'payables' && (
              <PayablesView
                purchases={purchases}
                paymentVouchers={paymentVouchers}
                onOpenPaySupplier={(supplier) =>
                  setPaySupplierModalConfig({
                    isOpen: true,
                    supplier,
                    bookType: 'bank',
                  })
                }
                onDeletePaymentVoucher={async (pv) => {
                  await deletePaymentVoucherInDb(pv.id);
                }}
              />
            )}

            {/* CONFIGURATION GROUP */}
            {activeTab === 'settings' && (
              <SettingsView
                settings={companySettings}
                bankAccounts={bankAccounts}
                onSaveSettings={saveCompanySettingsInDb}
                onSaveBankAccount={saveBankAccountInDb}
                onDeleteBankAccount={deleteBankAccountInDb}
                onResetDatabase={resetProductionDatabaseInDb}
              />
            )}
          </div>
        </main>

        <Footer settings={companySettings} />
      </div>

      {/* Shared Modals */}
      <ReceivePaymentModal
        isOpen={receiveModalConfig.isOpen}
        onClose={() => setReceiveModalConfig((prev) => ({ ...prev, isOpen: false }))}
        ledgers={ledgers}
        bankAccounts={bankAccounts}
        initialParty={receiveModalConfig.party}
        defaultBookType={receiveModalConfig.bookType}
        defaultAccountId={receiveModalConfig.accountId}
        receiptPrefix={companySettings.receiptPrefix}
        nextSequenceNumber={getNextVoucherSequence(moneyReceipts.map((r) => r.receiptNo))}
        onSaveReceipt={handleSaveMoneyReceipt}
      />

      <PaySupplierModal
        isOpen={paySupplierModalConfig.isOpen}
        onClose={() => setPaySupplierModalConfig((prev) => ({ ...prev, isOpen: false }))}
        payables={supplierPayables}
        bankAccounts={bankAccounts}
        paymentVouchers={paymentVouchers}
        initialSupplier={paySupplierModalConfig.supplier}
        defaultBookType={paySupplierModalConfig.bookType}
        defaultAccountId={paySupplierModalConfig.accountId}
        paymentPrefix={companySettings.paymentPrefix}
        nextSequenceNumber={getNextVoucherSequence(paymentVouchers.map((v) => v.voucherNo))}
        onSavePaymentVoucher={savePaymentVoucherInDb}
      />

      <InvoiceModal
        sale={selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        settings={companySettings}
      />

      <MoneyReceiptModal
        receipt={selectedReceiptForModal}
        onClose={() => setSelectedReceiptForModal(null)}
        settings={companySettings}
      />

      <PartyStatementModal
        ledger={activeStatementLedger}
        onClose={() => setSelectedLedgerForStatement(null)}
        onAddTransaction={handleAddStatementEntry}
        settings={companySettings}
      />
    </div>
  );
}
