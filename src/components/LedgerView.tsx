import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Download, 
  Plus, 
  FileText,
  MessageCircle,
  Smartphone,
  ArrowDownRight, 
  FileSpreadsheet,
  FileCheck,
  Calendar,
  Eye,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react';
import { CustomerLedger, StatementEntry } from '../types';
import { formatINR, generateLedgerReminderWhatsAppUrl } from '../utils/formatters';
import { DeleteConfirmModal } from './common/DeleteConfirmModal';

interface LedgerViewProps {
  ledgers: CustomerLedger[];
  onOpenReceivePayment: (party: CustomerLedger) => void;
  onOpenStatement: (party: CustomerLedger) => void;
  onUpdateFollowUp: (ledgerId: string, nextFollowUpDate: string, note: string) => void;
  onOpenRecordSale: () => void;
  onDeleteLedger?: (party: CustomerLedger) => Promise<void>;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  ledgers,
  onOpenReceivePayment,
  onOpenStatement,
  onUpdateFollowUp,
  onOpenRecordSale,
  onDeleteLedger,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFollowUpParty, setSelectedFollowUpParty] = useState<CustomerLedger | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [copiedSmsPartyId, setCopiedSmsPartyId] = useState<string | null>(null);
  const [partyToDelete, setPartyToDelete] = useState<CustomerLedger | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredLedgers = ledgers.filter((party) =>
    party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.phone.includes(searchTerm) ||
    party.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = ledgers.reduce((acc, l) => acc + l.outstandingReceivable, 0);
  const totalOverdue = ledgers.reduce((acc, l) => acc + (l.totalOverdue || l.outstandingReceivable), 0);

  // Direct WhatsApp Reminder click
  const handleWhatsAppReminder = (party: CustomerLedger) => {
    const url = generateLedgerReminderWhatsAppUrl(party);
    window.open(url, '_blank');
  };

  // Direct SMS Copy action
  const handleSmsAction = (party: CustomerLedger) => {
    const smsText = `MOHANTY ENTERPRISES: Payment reminder for ${party.name}. Outstanding balance: ${formatINR(party.outstandingReceivable)}. Oldest due: ${party.oldestDueDays} days. Please clear via RTGS/NEFT. Contact: 9861044211.`;
    navigator.clipboard.writeText(smsText);
    setCopiedSmsPartyId(party.id);
    setTimeout(() => setCopiedSmsPartyId(null), 2500);
  };

  const handleConfirmDelete = async () => {
    if (!partyToDelete || !onDeleteLedger) return;
    try {
      setIsDeleting(true);
      await onDeleteLedger(partyToDelete);
      setPartyToDelete(null);
    } catch (err) {
      console.error('Failed to delete party ledger:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      'Company Name',
      'GSTIN',
      'Phone',
      'Total Due',
      'Total Overdue',
      'Last Payment Date',
      'Average Collection (Days)',
      'Oldest Due (Days)',
      'Next Follow-Up',
      'Promises to Pay / Remark'
    ];

    const rows = filteredLedgers.map((p) => [
      `"${p.name}"`,
      p.gstin,
      p.phone,
      p.outstandingReceivable,
      p.totalOverdue || p.outstandingReceivable,
      p.lastPaymentDate || '',
      p.averageCollectionDays || '',
      p.oldestDueDays || '',
      p.nextFollowUpDate || '',
      `"${p.promisesToPay || p.followUpNote || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Khatabook_Ledger_Mohanty_Enterprises_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFollowUpParty && followUpDate) {
      onUpdateFollowUp(selectedFollowUpParty.id, followUpDate, followUpNote);
      setSelectedFollowUpParty(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Summaries */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 text-xs font-bold rounded border border-amber-500/20 uppercase tracking-wider">
              Khatabook System
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Party Accounts & Ledger Registry
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Credit book, follow-ups, and collection tracking for registered wholesale contractors
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Outstanding</p>
            <p className="text-xl font-bold font-mono text-rose-700 tabular-nums">
              {formatINR(totalOutstanding)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF button (Page 3) */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              title="Download or Print PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            {/* Download Excel button (Page 3) */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              title="Download Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Download Excel</span>
            </button>

            <button
              onClick={onOpenRecordSale}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ New Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Feedback Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search parties by company name, GSTIN, phone, or town..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white"
          />
        </div>

        {copiedSmsPartyId && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>SMS reminder copied to clipboard!</span>
          </div>
        )}
      </div>

      {/* KHATABOOK SINGLE-FORMAT CONSOLIDATED TABLE (Matching Page 3 layout) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase font-bold text-[11px] border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Company Name</th>
                <th className="py-3 px-3 text-right">Total Due (₹)</th>
                <th className="py-3 px-3 text-right">Total Overdue (₹)</th>
                <th className="py-3 px-3">Last Payment</th>
                <th className="py-3 px-3 text-center">Avg. Collection</th>
                <th className="py-3 px-3 text-center">Oldest Due</th>
                <th className="py-3 px-3">Next Follow-Up</th>
                <th className="py-3 px-3">Promises to Pay / Remark</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No contractor ledger accounts found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Contractor accounts will appear here automatically when sales and billing records are created.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((party) => (
                  <tr key={party.id} className="hover:bg-slate-50/90 transition-colors">
                  {/* Company Name */}
                  <td className="py-3 px-3.5 font-bold text-slate-900 max-w-[190px]">
                    <button
                      onClick={() => onOpenStatement(party)}
                      className="text-left hover:text-amber-600 transition-colors cursor-pointer group"
                    >
                      <p className="group-hover:underline text-xs">{party.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono font-normal truncate mt-0.5">
                        {party.gstin} · {party.phone}
                      </p>
                    </button>
                  </td>

                  {/* Total Due */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {formatINR(party.outstandingReceivable)}
                  </td>

                  {/* Total Overdue */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 tabular-nums">
                    {formatINR(party.totalOverdue || party.outstandingReceivable)}
                  </td>

                  {/* Last Payment */}
                  <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap text-[11px]">
                    {party.lastPaymentDate || 'Pending'}
                  </td>

                  {/* Average Collection */}
                  <td className="py-3 px-3 text-center font-mono text-slate-600 tabular-nums">
                    {party.averageCollectionDays ? `${party.averageCollectionDays} days` : '-'}
                  </td>

                  {/* Oldest Due */}
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 tabular-nums">
                    {party.oldestDueDays ? `${party.oldestDueDays} days` : '-'}
                  </td>

                  {/* Next Follow-Up (With '+ Add' button as in PDF Page 3) */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {party.nextFollowUpDate ? (
                      <button
                        onClick={() => {
                          setSelectedFollowUpParty(party);
                          setFollowUpDate(party.nextFollowUpDate || '');
                          setFollowUpNote(party.followUpNote || '');
                        }}
                        className="text-[11px] text-slate-700 hover:text-amber-700 font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span>{party.nextFollowUpDate}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedFollowUpParty(party);
                          setFollowUpDate('');
                          setFollowUpNote('');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    )}
                  </td>

                  {/* Promises to Pay / Remark */}
                  <td className="py-3 px-3 text-[11px] text-slate-600 max-w-[160px] truncate" title={party.promisesToPay || party.followUpNote}>
                    {party.promisesToPay || party.followUpNote || '-'}
                  </td>

                  {/* Action Column with WhatsApp, SMS, Money Receipt, and Statement icons (PDF Page 3) */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* WhatsApp icon */}
                      <button
                        onClick={() => handleWhatsAppReminder(party)}
                        title="Send WhatsApp Reminder"
                        className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 fill-emerald-100 stroke-[2.2]" />
                      </button>

                      {/* SMS icon */}
                      <button
                        onClick={() => handleSmsAction(party)}
                        title="Copy SMS Reminder text"
                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4 stroke-[2.2]" />
                      </button>

                      {/* Receive Payment / Money Receipt button */}
                      <button
                        onClick={() => onOpenReceivePayment(party)}
                        title="Receive Payment & Create Money Receipt"
                        className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                      >
                        <ArrowDownRight className="w-4 h-4 stroke-[2.4]" />
                      </button>

                      {/* View Statement button */}
                      <button
                        onClick={() => onOpenStatement(party)}
                        title="Open Khatabook Statement"
                        className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4 stroke-[2.2]" />
                      </button>

                      {/* Delete Ledger button */}
                      <button
                        onClick={() => setPartyToDelete(party)}
                        title="Delete Party Ledger"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
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

      {/* Follow-up Note & Date Modal */}
      {selectedFollowUpParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Schedule Collection Follow-up
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Party: <strong className="text-slate-800">{selectedFollowUpParty.name}</strong>
            </p>

            <form onSubmit={handleFollowUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Next Follow-Up Date
                </label>
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Promises to Pay / Follow-up Remark
                </label>
                <textarea
                  rows={3}
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="e.g. Promised ₹5,00,000 RTGS after site bill passed on 18th"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFollowUpParty(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Follow-Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {partyToDelete && (
        <DeleteConfirmModal
          isOpen={!!partyToDelete}
          title="Delete Party Ledger"
          message={`Are you sure you want to permanently delete the ledger for ${partyToDelete.name}? All historical entries, follow-up logs, and balance records for this party will be removed.`}
          itemDetails={`Party: ${partyToDelete.name} • GSTIN: ${partyToDelete.gstin || 'Unregistered'} • Outstanding: ${formatINR(partyToDelete.outstandingReceivable)}`}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPartyToDelete(null)}
        />
      )}
    </div>
  );
};
