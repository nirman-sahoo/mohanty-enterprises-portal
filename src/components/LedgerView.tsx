import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  CreditCard, 
  Plus, 
  ArrowDownRight, 
  CheckCircle2, 
  Building2,
  Phone,
  FileCheck
} from 'lucide-react';
import { CustomerLedger } from '../types';
import { formatINR } from '../data/inventoryData';

interface LedgerViewProps {
  ledgers: CustomerLedger[];
  onRecordPayment: (ledgerId: string, amount: number) => void;
  onOpenRecordSale: () => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  ledgers,
  onRecordPayment,
  onOpenRecordSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModalParty, setPaymentModalParty] = useState<CustomerLedger | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(100000);
  const [paymentMode, setPaymentMode] = useState<string>('RTGS / NEFT');

  const filteredLedgers = ledgers.filter((party) =>
    party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = ledgers.reduce((acc, l) => acc + l.outstandingReceivable, 0);
  const totalBilled = ledgers.reduce((acc, l) => acc + l.totalBilled, 0);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentModalParty && paymentAmount > 0) {
      onRecordPayment(paymentModalParty.id, paymentAmount);
      setPaymentModalParty(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Contractor & Buyer Party Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit book, receivable tracking, and payment reconciliations for registered contractors
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Outstanding Balance</p>
            <p className="text-xl font-bold font-mono text-rose-700 tabular-nums">
              {formatINR(totalOutstanding)}
            </p>
          </div>
          <button
            onClick={onOpenRecordSale}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ New Billing Entry</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search parties by company name, GSTIN, or city..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white"
          />
        </div>
      </div>

      {/* Party Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLedgers.map((party) => {
          const utilizationPct = Math.min(100, Math.round((party.outstandingReceivable / party.creditLimit) * 100));
          return (
            <div
              key={party.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{party.name}</h3>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">GSTIN: {party.gstin}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{party.phone}</span>
                      <span className="text-slate-300">·</span>
                      <span>{party.address}</span>
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                    {party.creditDays} Days Credit
                  </span>
                </div>

                {/* Billing Summary */}
                <div className="grid grid-cols-3 gap-2 py-4 text-xs">
                  <div>
                    <p className="text-slate-500 text-[11px]">Total Billed</p>
                    <p className="font-mono font-bold text-slate-900 mt-0.5 tabular-nums">
                      {formatINR(party.totalBilled)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[11px]">Total Paid</p>
                    <p className="font-mono font-bold text-emerald-700 mt-0.5 tabular-nums">
                      {formatINR(party.totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[11px]">Current Outstanding</p>
                    <p className="font-mono font-bold text-rose-700 mt-0.5 tabular-nums">
                      {formatINR(party.outstandingReceivable)}
                    </p>
                  </div>
                </div>

                {/* Credit limit progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Credit Limit: {formatINR(party.creditLimit)}</span>
                    <span className="font-mono font-semibold">{utilizationPct}% Utilized</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        utilizationPct > 80 ? 'bg-rose-500' : utilizationPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${utilizationPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Last sale: <strong className="text-slate-600 font-mono">{party.lastTransactionDate}</strong>
                </span>
                <button
                  onClick={() => {
                    setPaymentModalParty(party);
                    setPaymentAmount(Math.min(party.outstandingReceivable, 150000));
                  }}
                  className="px-3 py-1.5 font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Receive Payment</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Record Payment Receipt Modal */}
      {paymentModalParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Record Payment Receipt
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Collecting funds from <strong className="text-slate-800">{paymentModalParty.name}</strong>
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="RTGS / NEFT">RTGS / NEFT Bank Transfer</option>
                  <option value="Cheque / DD">Account Payee Cheque / DD</option>
                  <option value="UPI / QR">Business UPI / Immediate Transfer</option>
                  <option value="Cash Deposit">Bank Cash Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex justify-between">
                <span>Remaining Balance:</span>
                <span className="font-mono font-bold text-rose-700">
                  {formatINR(Math.max(0, paymentModalParty.outstandingReceivable - paymentAmount))}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalParty(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
                >
                  Post to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
