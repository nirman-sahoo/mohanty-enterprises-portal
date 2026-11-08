import React, { useState } from 'react';
import { 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  Search, 
  Download, 
  FileText, 
  Filter, 
  CreditCard,
  Building2,
  Send,
  AlertCircle
} from 'lucide-react';
import { Employee, PayrollRecord, Department } from '../../types';
import { formatINR } from '../../utils/formatters';

interface PayrollTabProps {
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  selectedMonth: string;
  onViewPayslip: (employee: Employee, record: PayrollRecord) => void;
  onMarkAsPaid: (recordId: string, paymentDate: string, bankRef: string) => Promise<void>;
}

export const PayrollTab: React.FC<PayrollTabProps> = ({
  employees,
  payrollRecords,
  selectedMonth,
  onViewPayslip,
  onMarkAsPaid,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [payingRecordId, setPayingRecordId] = useState<string | null>(null);
  const [bankUtr, setBankUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate or match payroll entries for all employees for the selected cycle
  const displayPayrollRows = employees.map((emp) => {
    const existing = payrollRecords.find(
      (r) => r.employeeId === emp.id && (r.month === selectedMonth || !r.month)
    );

    if (existing) {
      return {
        employee: emp,
        record: existing,
      };
    }

    // Dynamic standard calculation based on employee's registered monthly salary
    const basicSalary = Math.round(emp.monthlySalary * 0.65);
    const allowances = Math.round(emp.monthlySalary * 0.35);
    const pfDeduction = Math.round(basicSalary * 0.12);
    const taxDeduction = emp.monthlySalary > 60000 ? Math.round(emp.monthlySalary * 0.05) : 0;
    const netSalary = (basicSalary + allowances) - (pfDeduction + taxDeduction);

    const generatedRecord: PayrollRecord = {
      id: `pay-${emp.id}-${selectedMonth.replace(/\s+/g, '-').toLowerCase()}`,
      month: selectedMonth,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      designation: emp.designation,
      basicSalary,
      allowances,
      pfDeduction,
      taxDeduction,
      netSalary,
      paymentStatus: 'Pending',
    };

    return {
      employee: emp,
      record: generatedRecord,
    };
  });

  // Filter rows
  const filteredRows = displayPayrollRows.filter(({ employee }) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.empCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || employee.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Totals calculations
  const totalPayrollAmount = displayPayrollRows.reduce((sum, r) => sum + r.record.netSalary, 0);
  const totalPaidAmount = displayPayrollRows
    .filter((r) => r.record.paymentStatus === 'Paid')
    .reduce((sum, r) => sum + r.record.netSalary, 0);
  const totalPendingAmount = totalPayrollAmount - totalPaidAmount;
  const paidCount = displayPayrollRows.filter((r) => r.record.paymentStatus === 'Paid').length;

  const handleConfirmPayment = async (record: PayrollRecord) => {
    if (!bankUtr.trim()) {
      alert('Please enter a Bank UTR / Transaction Reference number.');
      return;
    }
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await onMarkAsPaid(record.id, today, bankUtr.trim());
      setPayingRecordId(null);
      setBankUtr('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Emp Code',
      'Name',
      'Department',
      'Designation',
      'Basic Salary',
      'Allowances',
      'PF Deduction',
      'Tax Deduction',
      'Net Salary',
      'Status',
      'Bank Ref',
    ];

    const csvContent = [
      headers.join(','),
      ...filteredRows.map(({ employee, record }) =>
        [
          `"${employee.empCode}"`,
          `"${employee.name}"`,
          `"${employee.department}"`,
          `"${employee.designation}"`,
          record.basicSalary,
          record.allowances,
          record.pfDeduction,
          record.taxDeduction,
          record.netSalary,
          `"${record.paymentStatus}"`,
          `"${record.bankReference || 'N/A'}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mohanty_Enterprises_Payroll_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Payroll Outflow
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatINR(totalPayrollAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Cycle: {selectedMonth}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-200">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Disbursed / Paid
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {formatINR(totalPaidAmount)}
            </p>
            <p className="text-xs text-emerald-700 font-medium mt-1">
              {paidCount} of {displayPayrollRows.length} staff cleared
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Outflow
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {formatINR(totalPendingAmount)}
            </p>
            <p className="text-xs text-amber-700 font-medium mt-1">
              {displayPayrollRows.length - paidCount} pending bank transfers
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-200">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Disbursement Channel
            </p>
            <p className="text-sm font-bold text-slate-900 mt-1">
              SBI Commercial A/C
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct NEFT / Corporate RTGS
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-200">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filter, Search & Export */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by staff name, code or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-500">Dept:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value="Accounts">Accounts</option>
              <option value="Sales">Sales</option>
              <option value="HR">HR</option>
              <option value="Admin">Admin</option>
              <option value="Warehouse / Yard">Warehouse / Yard</option>
              <option value="Logistics">Logistics</option>
            </select>
          </div>
        </div>

        {/* Export Action */}
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Payroll CSV</span>
        </button>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Monthly Salary Disbursement Register
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Statutory earnings, EPF/ESI contributions, TDS withholding and net pay
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
            {filteredRows.length} Employees
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Staff Details</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Basic Pay</th>
                <th className="py-3 px-4 text-right">HRA & Allowances</th>
                <th className="py-3 px-4 text-right">EPF & Tax</th>
                <th className="py-3 px-4 text-right">Net Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.map(({ employee, record }) => {
                const isPaid = record.paymentStatus === 'Paid';

                return (
                  <tr key={record.id} className="hover:bg-slate-50/75 transition-colors">
                    {/* Staff details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs shadow-sm">
                          {employee.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{employee.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {employee.empCode} · {employee.designation}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {employee.department}
                      </span>
                    </td>

                    {/* Basic */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {formatINR(record.basicSalary)}
                    </td>

                    {/* Allowances */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {formatINR(record.allowances)}
                    </td>

                    {/* Deductions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="text-rose-600 font-medium">
                        -{formatINR(record.pfDeduction + record.taxDeduction)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        EPF: {formatINR(record.pfDeduction)}
                      </div>
                    </td>

                    {/* Net Payable */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {formatINR(record.netSalary)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {isPaid ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Paid
                          </span>
                          {record.bankReference && (
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {record.bankReference}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Payslip */}
                        <button
                          onClick={() => onViewPayslip(employee, record)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                          title="Generate official printable payslip"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Slip</span>
                        </button>

                        {/* Mark as Paid Action */}
                        {!isPaid && (
                          <button
                            onClick={() => {
                              setPayingRecordId(record.id);
                              setBankUtr(`UTR-SBIN-${Math.floor(100000 + Math.random() * 900000)}`);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Disburse</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Bank UTR Confirmation Modal */}
      {payingRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold">Record Salary Bank Transfer</h4>
              </div>
              <button
                onClick={() => setPayingRecordId(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Confirm salary disbursement for employee. This will update the status to{' '}
                <strong className="text-emerald-700">Paid</strong> and stamp the bank transaction reference.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Reference / UTR Number *
                </label>
                <input
                  type="text"
                  value={bankUtr}
                  onChange={(e) => setBankUtr(e.target.value)}
                  placeholder="e.g. UTR-SBIN-847291"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingRecordId(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    const row = displayPayrollRows.find((r) => r.record.id === payingRecordId);
                    if (row) handleConfirmPayment(row.record);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Disbursement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
