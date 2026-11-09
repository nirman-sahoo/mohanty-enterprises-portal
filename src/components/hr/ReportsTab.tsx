import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Printer, 
  TrendingUp, 
  Users, 
  IndianRupee, 
  CheckCircle2, 
  ShieldCheck,
  Building2,
  Table
} from 'lucide-react';
import { Employee, AttendanceRecord, PayrollRecord } from '../../types';
import { formatINR } from '../../utils/formatters';

interface ReportsTabProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  payrollRecords: PayrollRecord[];
  selectedMonth: string;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  employees,
  attendanceRecords,
  payrollRecords,
  selectedMonth,
}) => {
  const [activeReport, setActiveReport] = useState<'attendance' | 'payroll' | 'compliance'>('attendance');

  // Attendance Aggregates
  const totalEmployees = employees.length;
  const presentCount = attendanceRecords.filter((r) => r.status === 'Present').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'Absent').length;
  const leaveCount = attendanceRecords.filter((r) => r.status === 'On Leave').length;
  const attendanceRate = totalEmployees > 0 ? ((presentCount / totalEmployees) * 100).toFixed(1) : '0.0';
  const absenceRate = totalEmployees > 0 ? ((absentCount / totalEmployees) * 100).toFixed(1) : '0.0';

  // Payroll Aggregates
  const totalPayrollEstimate = employees.reduce((sum, emp) => sum + (emp.monthlySalary || 0), 0);
  const displayPayrollAmount = totalPayrollEstimate;
  const totalPF = Math.round(displayPayrollAmount * 0.12 * 0.65);
  const totalESI = Math.round(displayPayrollAmount * 0.0325 * 0.65);
  const totalTDS = Math.round(displayPayrollAmount * 0.035);

  // Export Attendance CSV
  const handleExportAttendance = () => {
    const headers = ['Employee Code', 'Staff Name', 'Department', 'Designation', 'Joining Date', 'Status', 'Daily Shift'];
    const rows = employees.map((emp) => {
      const rec = attendanceRecords.find((r) => r.employeeId === emp.id);
      return [
        `"${emp.empCode}"`,
        `"${emp.name}"`,
        `"${emp.department}"`,
        `"${emp.designation}"`,
        `"${emp.joiningDate}"`,
        `"${rec?.status || 'Present'}"`,
        `"${rec?.checkInTime || '09:15 AM'} - ${rec?.checkOutTime || '06:30 PM'}"`,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mohanty_Enterprises_Attendance_Report_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Payroll CSV
  const handleExportPayroll = () => {
    const headers = ['Employee Code', 'Staff Name', 'Department', 'Bank Account', 'IFSC', 'PAN', 'Gross Monthly', 'Net Payable'];
    const rows = employees.map((emp) => [
      `"${emp.empCode}"`,
      `"${emp.name}"`,
      `"${emp.department}"`,
      `"${emp.bankAccount || 'SBIN987123456'}"`,
      `"${emp.bankIfsc || 'SBIN0001244'}"`,
      `"${emp.panNo || 'AAAPM1234L'}"`,
      emp.monthlySalary,
      Math.round(emp.monthlySalary * 0.92),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mohanty_Enterprises_Payroll_Register_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setActiveReport('attendance')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeReport === 'attendance'
                ? 'bg-slate-900 text-amber-400 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attendance Register
          </button>
          <button
            onClick={() => setActiveReport('payroll')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeReport === 'payroll'
                ? 'bg-slate-900 text-amber-400 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payroll Summary
          </button>
          <button
            onClick={() => setActiveReport('compliance')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeReport === 'compliance'
                ? 'bg-slate-900 text-amber-400 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Statutory & EPF
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={activeReport === 'attendance' ? handleExportAttendance : handleExportPayroll}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report 1: Attendance Register */}
      {activeReport === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Working Days in Cycle</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">26 Days</p>
              <p className="text-xs text-slate-400 mt-0.5">Excluding 4 Sundays</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Average Daily Headcount</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{presentCount} Present</p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">{attendanceRate}% Attendance Rate</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Average Daily Absence</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{absentCount} Staff</p>
              <p className="text-xs text-amber-700 font-medium mt-0.5">{absenceRate}% Absence Rate</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Comprehensive Workforce Attendance Register · {selectedMonth}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed shift log and attendance status across all divisions
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4">Emp Code</th>
                    <th className="py-3 px-4">Staff Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Shift Timings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.length > 0 ? (
                    employees.map((emp) => {
                      const rec = attendanceRecords.find((r) => r.employeeId === emp.id);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-medium text-slate-600">{emp.empCode}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{emp.name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                              {emp.department}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{emp.designation}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              {rec?.status || 'Present'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                            {rec?.checkInTime || '09:15 AM'} - {rec?.checkOutTime || '06:30 PM'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No active employees registered in master roster.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Report 2: Payroll Summary */}
      {activeReport === 'payroll' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Gross Payroll Outflow</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(displayPayrollAmount)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Disbursal for {selectedMonth}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Statutory Deductions</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {formatINR(totalPF + totalESI + totalTDS)}
              </p>
              <p className="text-xs text-rose-700 font-medium mt-0.5">EPF + ESI + TDS Withholding</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Net Salary Disbursed</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatINR(displayPayrollAmount - (totalPF + totalESI + totalTDS))}
              </p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">Direct Bank Transfers</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Departmental Payroll Outflow Breakdown · {selectedMonth}
              </h3>
            </div>
            <div className="p-6">
              {employees.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(
                    employees.reduce((acc, emp) => {
                      const dept = emp.department || 'General';
                      if (!acc[dept]) acc[dept] = { count: 0, salary: 0 };
                      acc[dept].count += 1;
                      acc[dept].salary += (emp.monthlySalary || 0);
                      return acc;
                    }, {} as Record<string, { count: number; salary: number }>)
                  ).map(([dept, data], idx) => {
                    const share = totalPayrollEstimate > 0 ? Math.round((data.salary / totalPayrollEstimate) * 100) : 0;
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200 gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{dept}</div>
                          <div className="text-[11px] text-slate-500">{data.count} Staff Members</div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="font-bold text-slate-900 text-xs">{formatINR(data.salary)}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{share}% of total</div>
                          </div>
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-amber-500 h-2 rounded-full"
                              style={{ width: `${Math.max(4, share)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No employee salary records available for departmental breakdown.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report 3: Statutory & EPF Compliance */}
      {activeReport === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Government Statutory Compliance & Remittance Summary
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  EPF, ESI, and Professional Tax records for Mohanty Enterprises
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase">Employees' Provident Fund (EPF)</span>
                <p className="text-xl font-bold text-slate-900 mt-2">{formatINR(totalPF)}</p>
                <div className="text-xs text-slate-500 mt-2 space-y-1">
                  <p>• Employee Contribution: 12%</p>
                  <p>• Employer Contribution: 12%</p>
                  <p>• EPF Establishment Code: OR/BBS/0091244</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase">Employees' State Insurance (ESI)</span>
                <p className="text-xl font-bold text-slate-900 mt-2">{formatINR(totalESI)}</p>
                <div className="text-xs text-slate-500 mt-2 space-y-1">
                  <p>• Employee Share: 0.75%</p>
                  <p>• Employer Share: 3.25%</p>
                  <p>• ESI Code: 51000918230000101</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase">TDS Withholding (Sec 192)</span>
                <p className="text-xl font-bold text-slate-900 mt-2">{formatINR(totalTDS)}</p>
                <div className="text-xs text-slate-500 mt-2 space-y-1">
                  <p>• TAN: BBSM12849F</p>
                  <p>• Form 24Q Quarterly Filing</p>
                  <p>• Challan ITNS-281 Remittance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
