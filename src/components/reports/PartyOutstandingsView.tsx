import React, { useMemo, useState } from 'react';
import {
  Users,
  Search,
  Download,
  Printer,
  Plus,
  MessageCircle,
  Smartphone,
  ArrowDownLeft,
  Calendar,
  Eye,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { CustomerLedger, MoneyReceipt } from '../../types';
import { formatINR, generateLedgerReminderWhatsAppUrl } from '../../utils/formatters';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface PartyOutstandingsViewProps {
  ledgers: CustomerLedger[];
  moneyReceipts: MoneyReceipt[];
  onOpenReceivePayment: (party: CustomerLedger | null) => void;
  onOpenStatement: (party: CustomerLedger) => void;
  onUpdateFollowUp: (ledgerId: string, nextFollowUpDate: string, note: string) => Promise<void>;
  onNewSalesVoucher: () => void;
  onDeleteLedger: (party: CustomerLedger) => Promise<void>;
  onDeleteMoneyReceipt: (receipt: MoneyReceipt) => Promise<void>;
}

export const PartyOutstandingsView: React.FC<PartyOutstandingsViewProps> = ({
  ledgers,
  moneyReceipts,
  onOpenReceivePayment,
  onOpenStatement,
  onUpdateFollowUp,
  onNewSalesVoucher,
  onDeleteLedger,
  onDeleteMoneyReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dueFilter, setDueFilter] = useState<'ALL' | 'DUE' | 'CLEARED'>('ALL');
  const [selectedFollowUpParty, setSelectedFollowUpParty] = useState<CustomerLedger | null>(null);
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpNote, setFollowUpNote] = useState<string>('');
  const [copiedSmsId, setCopiedSmsId] = useState<string | null>(null);
  const [partyToDelete, setPartyToDelete] = useState<CustomerLedger | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<MoneyReceipt | null>(null);

  const filteredLedgers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return ledgers.filter((l) => {
      if (dueFilter === 'DUE' && l.outstandingReceivable <= 0) return false;
      if (dueFilter === 'CLEARED' && l.outstandingReceivable > 0) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.address || '').toLowerCase().includes(q)
      );
    });
  }, [ledgers, searchTerm, dueFilter]);

  const metrics = useMemo(() => {
    const totalBilled = ledgers.reduce((s, l) => s + (l.totalBilled || 0), 0);
    const totalReceived = ledgers.reduce((s, l) => s + (l.totalPaid || 0), 0);
    const totalOutstanding = ledgers.reduce((s, l) => s + Math.max(0, l.outstandingReceivable || 0), 0);
    const duePartyCount = ledgers.filter((l) => l.outstandingReceivable > 0).length;
    return { totalBilled, totalReceived, totalOutstanding, duePartyCount };
  }, [ledgers]);

  const handleSmsCopy = (party: CustomerLedger) => {
    const smsText = `MOHANTY ENTERPRISES: Payment reminder for ${party.name}. Outstanding balance: ${formatINR(
      party.outstandingReceivable
    )}. Please clear via RTGS/NEFT or Cash.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(smsText).catch(() => {});
    }
    setCopiedSmsId(party.id);
    setTimeout(() => setCopiedSmsId(null), 2500);
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUpParty) return;
    await onUpdateFollowUp(selectedFollowUpParty.id, followUpDate, followUpNote);
    setSelectedFollowUpParty(null);
  };

  const handleExportCSV = () => {
    const headers = [
      'Party Name',
      'Phone',
      'Total Billed (INR)',
      'Total Received (INR)',
      'Outstanding Due (INR)',
      'Last Payment Date',
      'Next Follow-Up',
      'Remarks',
    ];
    const rows = filteredLedgers.map((p) => [
      `"${p.name}"`,
      `"${p.phone || ''}"`,
      p.totalBilled,
      p.totalPaid,
      p.outstandingReceivable,
      p.lastPaymentDate || '',
      p.nextFollowUpDate || '',
      `"${(p.followUpNote || p.promisesToPay || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Party_Outstandings_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Party Outstandings (Sundry Debtors)</h1>
            <p className="text-xs text-slate-500 font-medium">
              Customer receivables ledger, follow-up promises, WhatsApp reminders &amp; Money Receipt collections
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenReceivePayment(null)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Receive Payment</span>
          </button>
          <button
            onClick={onNewSalesVoucher}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Sales Voucher</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-slate-500">Total Billed to Parties</p>
          <p className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1">
            {formatINR(metrics.totalBilled)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{ledgers.length} Customer Accounts</p>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-emerald-700">Total Collected</p>
          <p className="text-lg font-black font-mono tabular-nums text-emerald-700 mt-1">
            {formatINR(metrics.totalReceived)}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Counter + Money Receipts</p>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <p className="text-[11px] font-bold uppercase text-rose-700">Net Receivable Due</p>
          <p className="text-lg font-black font-mono tabular-nums text-rose-700 mt-1">
            {formatINR(metrics.totalOutstanding)}
          </p>
          <p className="text-[10px] text-rose-600 mt-0.5">{metrics.duePartyCount} Parties with Balance</p>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-amber-400 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-amber-400">Money Receipts Posted</p>
          <p className="text-lg font-black font-mono tabular-nums text-white mt-1">{moneyReceipts.length}</p>
          <p className="text-[10px] text-slate-300 mt-0.5">Synced with Cash &amp; Bank Books</p>
        </div>
      </div>

      {/* Filters & Debtors Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contractor name, phone, site..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs"
          >
            <option value="ALL">All Parties</option>
            <option value="DUE">Pending Receivables Only</option>
            <option value="CLEARED">Cleared (Zero Balance)</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Party / Contractor</th>
                <th className="py-3 px-4 text-right">Total Billed</th>
                <th className="py-3 px-4 text-right text-emerald-700">Received</th>
                <th className="py-3 px-4 text-right text-rose-700">Outstanding Due</th>
                <th className="py-3 px-4">Follow-Up</th>
                <th className="py-3 px-4 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No customer party ledgers found. Post a Sales Voucher to create a customer ledger automatically.
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((party) => (
                  <tr key={party.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{party.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">
                        {party.phone || 'No Phone'}
                        {party.shipToAddress || party.address ? ` · ${party.shipToAddress || party.address}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatINR(party.totalBilled)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {formatINR(party.totalPaid)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-rose-700">
                      {party.outstandingReceivable > 0 ? (
                        formatINR(party.outstandingReceivable)
                      ) : (
                        <span className="text-emerald-600 font-bold">Settled</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedFollowUpParty(party);
                          setFollowUpDate(party.nextFollowUpDate || '');
                          setFollowUpNote(party.followUpNote || party.promisesToPay || '');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-amber-50 text-[11px] font-medium text-slate-700 cursor-pointer"
                      >
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span>{party.nextFollowUpDate || 'Schedule'}</span>
                      </button>
                      {(party.followUpNote || party.promisesToPay) && (
                        <p className="text-[10px] text-slate-500 mt-0.5 max-w-[180px] truncate">
                          {party.followUpNote || party.promisesToPay}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenReceivePayment(party)}
                          title="Receive Payment"
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Collect</span>
                        </button>
                        <button
                          onClick={() => onOpenStatement(party)}
                          title="View Khatabook Statement"
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={generateLedgerReminderWhatsAppUrl(party)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Send WhatsApp Reminder"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleSmsCopy(party)}
                          title="Copy SMS Reminder"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        >
                          {copiedSmsId === party.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setPartyToDelete(party)}
                          title="Delete Party Ledger"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Money Receipts History */}
      {moneyReceipts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Customer Money Receipts Log ({moneyReceipts.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              All collections automatically posted to Cash Book or Bank Book
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Receipt No</th>
                  <th className="py-2.5 px-4">Party Name</th>
                  <th className="py-2.5 px-4">Deposited Account</th>
                  <th className="py-2.5 px-4">Mode / Ref</th>
                  <th className="py-2.5 px-4 text-right text-emerald-700">Amount</th>
                  <th className="py-2.5 px-4 text-center print:hidden">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {moneyReceipts.map((rcp) => (
                  <tr key={rcp.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-slate-600">{rcp.date}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{rcp.receiptNo}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{rcp.partyName}</td>
                    <td className="py-2.5 px-4 text-slate-700">{rcp.bankAccountName || rcp.paymentMode}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {rcp.paymentMode}
                      {rcp.referenceNo ? ` · ${rcp.referenceNo}` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                      {formatINR(rcp.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-center print:hidden">
                      <button
                        onClick={() => setReceiptToDelete(rcp)}
                        title="Delete Money Receipt"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Follow-Up Modal */}
      {selectedFollowUpParty && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-amber-400">
              <h3 className="font-bold text-sm">Follow-Up Reminder · {selectedFollowUpParty.name}</h3>
              <button
                onClick={() => setSelectedFollowUpParty(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFollowUp} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Next Follow-Up Date</label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Promise to Pay / Notes</label>
                <textarea
                  rows={3}
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Follow-up notes or payment commitment"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFollowUpParty(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F6B118] hover:bg-[#E5A010] text-slate-950 font-bold rounded-lg cursor-pointer"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!partyToDelete}
        title="Delete Party Ledger?"
        message="This will permanently delete the customer ledger record and its statement history from Firestore."
        itemDetails={
          partyToDelete
            ? [
                { label: 'Party', value: partyToDelete.name },
                { label: 'Outstanding', value: formatINR(partyToDelete.outstandingReceivable) },
              ]
            : undefined
        }
        onCancel={() => setPartyToDelete(null)}
        onConfirm={async () => {
          if (partyToDelete) {
            await onDeleteLedger(partyToDelete);
          }
        }}
      />

      <DeleteConfirmModal
        isOpen={!!receiptToDelete}
        title="Delete Money Receipt?"
        message="Deleting this Money Receipt will add the amount back to the Customer Party Outstanding and remove the receipt from Cash/Bank Book."
        itemDetails={
          receiptToDelete
            ? [
                { label: 'Receipt No', value: receiptToDelete.receiptNo },
                { label: 'Party', value: receiptToDelete.partyName },
                { label: 'Amount', value: formatINR(receiptToDelete.amount) },
              ]
            : undefined
        }
        onCancel={() => setReceiptToDelete(null)}
        onConfirm={async () => {
          if (receiptToDelete) {
            await onDeleteMoneyReceipt(receiptToDelete);
          }
        }}
      />
    </div>
  );
};
