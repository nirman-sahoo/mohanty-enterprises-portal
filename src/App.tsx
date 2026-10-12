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
import { 
  INITIAL_INVENTORY, 
  INITIAL_SALES, 
  INITIAL_LEDGERS 
} from './data/inventoryData';
import { InventoryItem, SaleRecord, CustomerLedger } from './types';

export default function App() {
  // Authentication state (Default initial view is Login Screen as requested)
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

  // Record Sale Handler (updates inventory, sales, and launches invoice modal)
  const handleRecordSale = (newSale: SaleRecord) => {
    // 1. Add to sales list
    setSales((prev) => [newSale, ...prev]);

    // 2. Deduct from inventory
    setInventory((prev) =>
      prev.map((item) => {
        if (item.name === newSale.itemDescription) {
          const newStock = Math.max(0, Number((item.stockLevel - newSale.quantity).toFixed(2)));
          const isCritical = newStock <= item.reorderLevel;
          return {
            ...item,
            stockLevel: newStock,
            isCriticalLow: isCritical,
          };
        }
        return item;
      })
    );

    // 3. Update customer ledger if customer exists, or add new ledger record
    setLedgers((prev) => {
      const existing = prev.find((l) => l.name.toLowerCase() === newSale.customerName.toLowerCase());
      if (existing) {
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
                lastTransactionDate: newSale.date,
              }
            : l
        );
      } else {
        const newLedger: CustomerLedger = {
          id: `led-${Date.now()}`,
          name: newSale.customerName,
          gstin: '21AAPCM' + Math.floor(1000 + Math.random() * 9000) + 'A1Z' + Math.floor(1 + Math.random() * 9),
          phone: '+91 9437' + Math.floor(100000 + Math.random() * 900000),
          address: 'Commercial Yard, Odisha',
          totalBilled: newSale.totalAmount,
          totalPaid: newSale.paymentStatus === 'Paid' ? newSale.totalAmount : 0,
          outstandingReceivable: newSale.paymentStatus === 'Credit' ? newSale.totalAmount : 0,
          creditLimit: 1500000,
          creditDays: 30,
          lastTransactionDate: newSale.date,
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

  // Payment receipt handler for ledger
  const handleRecordPayment = (ledgerId: string, amount: number) => {
    setLedgers((prev) =>
      prev.map((ledger) => {
        if (ledger.id === ledgerId) {
          const newOutstanding = Math.max(0, ledger.outstandingReceivable - amount);
          return {
            ...ledger,
            totalPaid: ledger.totalPaid + amount,
            outstandingReceivable: newOutstanding,
          };
        }
        return ledger;
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
              <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    Record Wholesale B2B Sale
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate instant commercial tax invoice and allocate material delivery from warehouse stock
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
                onRecordPayment={handleRecordPayment}
                onOpenRecordSale={() => setIsRecordSaleModalOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Sale Entry Modal (Triggered by "+ Record Sale" in Header) */}
      <SaleEntryModal
        isOpen={isRecordSaleModalOpen}
        onClose={() => setIsRecordSaleModalOpen(false)}
        inventory={inventory}
        onRecordSale={handleRecordSale}
      />

      {/* Commercial Tax Invoice Modal */}
      <InvoiceModal
        sale={selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
      />
    </div>
  );
}
