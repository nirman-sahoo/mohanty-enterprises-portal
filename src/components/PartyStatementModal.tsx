import React, { useEffect, useMemo, useState } from 'react';
import { 
  X, 
  Send, 
  Printer, 
  Plus, 
} from 'lucide-react';
import { CompanySettings, CustomerLedger, StatementEntry, VoucherType } from '../types';
import { formatINR } from '../utils/formatters';
import { recomputeStatementBalances } from '../utils/accountingEngine';

interface PartyStatementModalProps {
  ledger: CustomerLedger | null;
  onClose: () => void;
  onAddTransaction?: (ledgerId: string, entry: Omit<StatementEntry, 'id'>) => void;
  settings?: CompanySettings;
}

export const PartyStatementModal: React.FC<PartyStatementModalProps> = ({
  ledger,
  onClose,
  onAddTransaction,
  settings,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const monthStartStr = `${todayStr.slice(0, 8)}01`;

  const entries = ledger?.statementEntries || [];
  const earliestEntryDate = entries.reduce((min, e) => (!min || (e.date && e.date < min) ? e.date : min), '');
  const latestEntryDate = entries.reduce((max, e) => (!max || (e.date && e.date > max) ? e.date : max), '');

  const [startDate, setStartDate] = useState(earliestEntryDate || monthStartStr);
  const [endDate, setEndDate] = useState(latestEntryDate > todayStr ? latestEntryDate : todayStr);
  const [voucherFilter, setVoucherFilter] = useState<string>('ALL');
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);

  // New transaction form state
  const [txType, setTxType] = useState<VoucherType>('Sales');
  const [txDetails, setTxDetails] = useState('');
  const [txItemQty, setTxItemQty] = useState('');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDate, setTxDate] = useState(todayStr);

  useEffect(() => {
    if (!ledger) return;
    const list = ledger.statementEntries || [];
    const firstDate = list.reduce((min, e) => (!min || (e.date && e.date < min) ? e.date : min), '');
    const lastDate = list.reduce((max, e) => (!max || (e.date && e.date > max) ? e.date : max), '');
    setStartDate(firstDate || monthStartStr);
    setEndDate(lastDate > todayStr ? lastDate : todayStr);
    setVoucherFilter('ALL');
  }, [ledger?.id]);

  // Recompute chronological balances starting from ledger.openingBalance + any transactions prior to startDate
  const { openingBalance, totalDebit, totalCredit, netBalance, filteredEntries } = useMemo(() => {
    const baseOpening = ledger?.openingBalance || 0;
    const chronological = recomputeStatementBalances(baseOpening, entries);
    const priorNet = entries
      .filter((e) => (e.date || '') < startDate)
      .reduce((acc, e) => acc + (Number(e.debit) || 0) - (Number(e.credit) || 0), 0);

    const periodOpening = baseOpening + priorNet;

    const matching = chronological.filter((e) => {
      const inRange = (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate);
      const matchesVoucher = voucherFilter === 'ALL' || e.voucherType === voucherFilter;
      return inRange && matchesVoucher;
    });

    const periodDebits = matching.reduce((acc, e) => acc + (Number(e.debit) || 0), 0);
    const periodCredits = matching.reduce((acc, e) => acc + (Number(e.credit) || 0), 0);
    const closing = periodOpening + periodDebits - periodCredits;

    return {
      openingBalance: periodOpening,
      totalDebit: periodDebits,
      totalCredit: periodCredits,
      netBalance: closing,
      filteredEntries: matching,
    };
  }, [entries, ledger?.openingBalance, startDate, endDate, voucherFilter]);

  if (!ledger) return null;

  const handleWhatsAppShare = () => {
    const companyName = settings?.companyName || 'MOHANTY ENTERPRISES';
    const balanceLabel = netBalance >= 0 ? `${formatINR(netBalance)} Dr` : `${formatINR(Math.abs(netBalance))} Cr`;
    const summary = 
`*${companyName} · PARTY STATEMENT*
Party: ${ledger.name}
${ledger.phone ? `Phone: ${ledger.phone}\n` : ''}Period: ${startDate} to ${endDate}

*Opening Balance:* ${formatINR(openingBalance)}
*Total Debit (Material Billed):* ${formatINR(totalDebit)}
*Total Credit (Payments Received):* ${formatINR(totalCredit)}
*Net Closing Balance:* ${balanceLabel}${settings?.phone ? `\n\nFor ledger inquiries, contact ${settings.phone}.` : ''}`;

    const cleanPhone = (ledger.phone || '').replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone.length >= 10 ? (cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`) : '';
    const url = phoneParam 
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(summary)}`
      : `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  };

  const handleAddTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDetails || txAmount <= 0) return;

    // Customer Ledger convention: Sales = Debit (increases receivable); Payment / Discount / Pur Return = Credit (reduces receivable)
    const isDebit = txType === 'Sales';
    const debit = isDebit ? txAmount : 0;
    const credit = !isDebit ? txAmount : 0;
    const currentNet =
      (ledger.openingBalance || 0) +
      entries.reduce((acc, row) => acc + (Number(row.debit) || 0) - (Number(row.credit) || 0), 0);
    const newBal = currentNet + debit - credit;

    const newEntry: Omit<StatementEntry, 'id'> = {
      date: txDate,
      voucherType: txType,
      details: txDetails,
      itemQty: txItemQty || '-',
      debit,
      credit,
      balance: Math.abs(newBal),
      balanceType: newBal >= 0 ? 'Dr' : 'Cr',
    };

    if (onAddTransaction) {
      onAddTransaction(ledger.id, newEntry);
    }
    setIsAddTxOpen(false);
    setTxDetails('');
    setTxItemQty('');
    setTxAmount(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Top Control Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Khatabook Ledger</span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-semibold text-white truncate">{ledger.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddTxOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Entry</span>
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp Statement</span>
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="Print Statement"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Statement Document */}
        <div className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Header Banner (Matches PDF Page 4 layout) */}
          <div className="bg-slate-900 text-white p-4 rounded-lg flex items-center justify-between border-b-2 border-amber-500">
            <div>
              <p className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                {settings?.companyName || 'MOHANTY ENTERPRISES'}
              </p>
              <h2 className="text-base font-bold tracking-tight text-white">{ledger.name} · Party Statement</h2>
              {ledger.phone && (
                <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                  <span>Phone: {ledger.phone}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Party Statement
              </span>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Period: {startDate} to {endDate}
              </p>
            </div>
          </div>

          {/* Date Filter & Voucher Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Statement Period:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-slate-800"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Voucher Filter:</span>
              <select
                value={voucherFilter}
                onChange={(e) => setVoucherFilter(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
              >
                <option value="ALL">All Vouchers</option>
                <option value="Sales">Sales Only</option>
                <option value="Pur">Purchase (Pur) Only</option>
                <option value="Payment">Payment Only</option>
                <option value="Discount">Discount Only</option>
              </select>
            </div>
          </div>

          {/* Khatabook Summary KPI Strip (Matches PDF Page 4 red box strip) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Opening Balance</p>
              <p className="text-sm font-bold font-mono text-slate-800 mt-1 tabular-nums">{formatINR(openingBalance)}</p>
              <p className="text-[10px] text-slate-400 font-mono">Before {startDate}</p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total Debit (-)</p>
              <p className="text-sm font-bold font-mono text-slate-900 mt-1 tabular-nums">{formatINR(totalDebit)}</p>
              <p className="text-[10px] text-slate-400">Material Dispatched</p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-emerald-700 uppercase">Total Credit (+)</p>
              <p className="text-sm font-bold font-mono text-emerald-700 mt-1 tabular-nums">{formatINR(totalCredit)}</p>
              <p className="text-[10px] text-slate-400">Payments Received</p>
            </div>

            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 shadow-sm">
              <p className="text-[11px] font-bold text-rose-700 uppercase">Net Balance ({netBalance >= 0 ? 'Due' : 'Advance'})</p>
              <p className="text-base font-extrabold font-mono text-rose-700 mt-0.5 tabular-nums">
                {formatINR(Math.abs(netBalance))} {netBalance >= 0 ? 'Dr' : 'Cr'}
              </p>
              <p className="text-[10px] text-rose-600 font-semibold">
                {netBalance >= 0 ? 'Receivable Balance' : 'Credit / Advance Balance'}
              </p>
            </div>
          </div>

          {/* Detailed Statement Table with Specific Columns requested in Page 4 */}
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Voucher</th>
                  <th className="py-2.5 px-3">Details / Particulars</th>
                  <th className="py-2.5 px-3">Purchase & Sales Qty</th>
                  <th className="py-2.5 px-3 text-right">Debit (-)</th>
                  <th className="py-2.5 px-3 text-right">Credit (+)</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No statement transactions recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const getVoucherColor = (type: VoucherType) => {
                      switch (type) {
                        case 'Sales':
                          return 'text-blue-700';
                        case 'Pur':
                          return 'text-purple-700';
                        case 'Payment':
                          return 'text-emerald-700';
                        case 'Discount':
                          return 'text-amber-700';
                      }
                    };

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`text-[11px] font-semibold ${getVoucherColor(entry.voucherType)}`}>
                            {entry.voucherType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[200px] truncate">
                          {entry.details}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {entry.itemQty && entry.itemQty !== '-' ? (
                            <span className="font-semibold text-slate-800">{entry.itemQty}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 font-bold">
                          {entry.debit > 0 ? formatINR(entry.debit) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 font-bold">
                          {entry.credit > 0 ? formatINR(entry.credit) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-950 whitespace-nowrap">
                          {formatINR(entry.balance)} <span className="text-[10px] text-slate-500 font-normal">{entry.balanceType}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Transaction Modal Sub-dialog */}
        {isAddTxOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
                Add Khatabook Transaction Voucher
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Record manual voucher for <strong className="text-slate-800">{ledger.name}</strong>
              </p>

              <form onSubmit={handleAddTxSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Voucher Type
                    </label>
                    <select
                      value={txType}
                      onChange={(e) => setTxType(e.target.value as VoucherType)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="Sales">Sales (Material Out / Debit)</option>
                      <option value="Pur">Purchase Offset / Return (Credit)</option>
                      <option value="Payment">Payment (Receipt / Credit)</option>
                      <option value="Discount">Discount / Credit Note</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Details / Particulars
                  </label>
                  <input
                    type="text"
                    required
                    value={txDetails}
                    onChange={(e) => setTxDetails(e.target.value)}
                    placeholder="Enter transaction particulars"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Traded Item & Quantity (Optional)
                  </label>
                  <input
                    type="text"
                    value={txItemQty}
                    onChange={(e) => setTxItemQty(e.target.value)}
                    placeholder="Item description and quantity"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={txAmount || ''}
                    onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddTxOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm"
                  >
                    Post Voucher
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
