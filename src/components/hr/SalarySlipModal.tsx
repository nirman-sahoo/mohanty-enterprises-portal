import React from 'react';
import { X, Printer, Download, Building2, CheckCircle2 } from 'lucide-react';
import { Employee, PayrollRecord } from '../../types';
import { formatINR, numberToIndianWords } from '../../utils/formatters';

interface SalarySlipModalProps {
  employee: Employee | null;
  payroll: PayrollRecord | null;
  monthName: string;
  onClose: () => void;
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  employee,
  payroll,
  monthName,
  onClose,
}) => {
  if (!employee || !payroll) return null;

  const basicPay = payroll.basicSalary;
  const hra = Math.round(payroll.allowances * 0.6);
  const conveyance = Math.round(payroll.allowances * 0.4);
  const totalEarnings = basicPay + hra + conveyance;

  const epf = payroll.pfDeduction;
  const esi = Math.round(payroll.pfDeduction * 0.25);
  const tds = payroll.taxDeduction;
  const totalDeductions = epf + esi + tds;

  const netPay = Math.max(0, totalEarnings - totalDeductions);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Top Actions */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Official Salary Slip
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-300 font-medium">{monthName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="p-8 text-slate-900 text-xs font-sans print:p-0">
          {/* Company Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                M
              </div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 uppercase">
                MOHANTY ENTERPRISES
              </h1>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Wholesale Trading Terminal · Cement, SCAN TMT Bar, Fertilizer & Asbestos
            </p>
            <p className="text-[10px] text-slate-500">
              Plot No. 104, Industrial Estate, Cuttack Road, Bhubaneswar, Odisha - 751010
            </p>
            <div className="inline-block mt-3 px-3 py-1 bg-slate-100 rounded border border-slate-300 font-bold uppercase tracking-wider text-[11px] text-slate-800">
              Salary Slip for the Month of {monthName}
            </div>
          </div>

          {/* Employee Meta Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-5 text-xs">
            <div>
              <span className="text-slate-500">Employee Name:</span>{' '}
              <strong className="text-slate-900 font-semibold">{employee.name}</strong>
            </div>
            <div>
              <span className="text-slate-500">Employee Code:</span>{' '}
              <strong className="text-slate-900 font-mono">{employee.empCode}</strong>
            </div>
            <div>
              <span className="text-slate-500">Department:</span>{' '}
              <strong className="text-slate-900">{employee.department}</strong>
            </div>
            <div>
              <span className="text-slate-500">Designation:</span>{' '}
              <strong className="text-slate-900">{employee.designation}</strong>
            </div>
            <div>
              <span className="text-slate-500">Joining Date:</span>{' '}
              <span className="text-slate-800 font-mono">{employee.joiningDate}</span>
            </div>
            <div>
              <span className="text-slate-500">PAN Number:</span>{' '}
              <span className="text-slate-800 font-mono">{employee.panNo}</span>
            </div>
            <div>
              <span className="text-slate-500">Bank Account:</span>{' '}
              <span className="text-slate-800 font-mono">{employee.bankAccount}</span>
            </div>
            <div>
              <span className="text-slate-500">IFSC Code:</span>{' '}
              <span className="text-slate-800 font-mono">{employee.bankIfsc}</span>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Earnings Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-800 flex justify-between">
                <span>Earnings Description</span>
                <span>Amount (₹)</span>
              </div>
              <div className="p-3 space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span>Basic Salary</span>
                  <span className="font-mono font-medium">{formatINR(basicPay)}</span>
                </div>
                <div className="flex justify-between">
                  <span>House Rent Allowance (HRA)</span>
                  <span className="font-mono font-medium">{formatINR(hra)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conveyance & Yard Allowance</span>
                  <span className="font-mono font-medium">{formatINR(conveyance)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                  <span>Gross Earnings</span>
                  <span className="font-mono">{formatINR(totalEarnings)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-800 flex justify-between">
                <span>Deductions Description</span>
                <span>Amount (₹)</span>
              </div>
              <div className="p-3 space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span>Provident Fund (EPF 12%)</span>
                  <span className="font-mono font-medium">{formatINR(epf)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ESI Contribution (0.75%)</span>
                  <span className="font-mono font-medium">{formatINR(esi)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TDS / Professional Tax</span>
                  <span className="font-mono font-medium">{formatINR(tds)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-rose-700">
                  <span>Total Deductions</span>
                  <span className="font-mono">{formatINR(totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Box */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] font-bold text-amber-900 uppercase">
                Net Salary Payable
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Amount in Words:{' '}
                <strong className="text-slate-900 capitalize font-medium">
                  {numberToIndianWords(netPay)}
                </strong>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                {formatINR(netPay)}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>{payroll.paymentStatus === 'Paid' ? 'Disbursed via Bank Transfer' : 'Approved for Disbursement'}</span>
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 pt-6 border-t border-slate-200 text-center">
            <div>
              <div className="h-10"></div>
              <p className="text-xs font-semibold text-slate-800">Ayushman Mohanty</p>
              <p className="text-[10px] text-slate-500">Managing Director / Authorized Signatory</p>
            </div>
            <div>
              <div className="h-10"></div>
              <p className="text-xs font-semibold text-slate-800">{employee.name}</p>
              <p className="text-[10px] text-slate-500">Employee Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
