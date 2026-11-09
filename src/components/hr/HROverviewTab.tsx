import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  IndianRupee, 
  Calendar, 
  Clock, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Employee, AttendanceRecord, HRSubTab } from '../../types';
import { formatINR } from '../../utils/formatters';

interface HROverviewTabProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  selectedMonth: string;
  onNavigateTab: (tab: HRSubTab) => void;
  onOpenAddEmployee: () => void;
}

export const HROverviewTab: React.FC<HROverviewTabProps> = ({
  employees,
  attendanceRecords,
  selectedMonth,
  onNavigateTab,
  onOpenAddEmployee,
}) => {
  // Metric Calculations
  // Total workforce headcount backed by live active employee roster from Firestore
  const totalEmployeesCount = employees.length;
  
  // Real-time daily attendance rates
  const todayPresentCount = attendanceRecords.filter((r) => r.status === 'Present').length;
  const todayAbsentCount = attendanceRecords.filter((r) => r.status === 'Absent').length;
  const todayLeaveCount = attendanceRecords.filter((r) => r.status === 'On Leave').length;

  const presentDisplay = todayPresentCount;
  const absentDisplay = todayAbsentCount;
  const leaveDisplay = todayLeaveCount;

  const presentPercent = totalEmployeesCount > 0 ? ((presentDisplay / totalEmployeesCount) * 100).toFixed(1) : '0.0';
  const absentPercent = totalEmployeesCount > 0 ? ((absentDisplay / totalEmployeesCount) * 100).toFixed(1) : '0.0';
  const leavePercent = totalEmployeesCount > 0 ? ((leaveDisplay / totalEmployeesCount) * 100).toFixed(1) : '0.0';

  // Live monthly payroll calculation from employees' actual registered salaries
  const totalMonthlyPayroll = employees.reduce((sum, emp) => sum + (emp.monthlySalary || 0), 0);
  const payrollLakhs = (totalMonthlyPayroll / 100000).toFixed(2);

  // Dynamic monthly payroll trend based on actual payroll
  const currentLakhs = parseFloat(payrollLakhs) || 0;
  const payrollMonths = [
    { month: 'Jun', amount: (currentLakhs * 0.9).toFixed(1), height: currentLakhs > 0 ? '70%' : '8%' },
    { month: 'Jul', amount: (currentLakhs * 0.92).toFixed(1), height: currentLakhs > 0 ? '75%' : '8%' },
    { month: 'Aug', amount: (currentLakhs * 0.94).toFixed(1), height: currentLakhs > 0 ? '80%' : '8%' },
    { month: 'Sep', amount: (currentLakhs * 0.96).toFixed(1), height: currentLakhs > 0 ? '85%' : '8%' },
    { month: 'Oct', amount: (currentLakhs * 0.98).toFixed(1), height: currentLakhs > 0 ? '90%' : '8%' },
    { month: 'Nov', amount: currentLakhs.toFixed(1), height: currentLakhs > 0 ? '96%' : '8%' },
  ];

  return (
    <div className="space-y-6">
      {/* 4 TOP METRIC CARDS (Exact Match to PDF Page 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Employees */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Employees
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {totalEmployeesCount}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Wholesale & Yard Workforce</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Roster Status</span>
            <span className="font-semibold text-emerald-600">Active</span>
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Present Today
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-600 tabular-nums">
              {presentDisplay}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">On Duty & Verified</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Attendance Rate</span>
            <span className="font-semibold text-emerald-700 font-mono">{presentPercent}%</span>
          </div>
        </div>

        {/* Card 3: Absent Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Absent Today
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserX className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tracking-tight text-amber-600 tabular-nums">
              {absentDisplay < 10 ? `0${absentDisplay}` : absentDisplay}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Unexcused / Shift Off</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Variance</span>
            <span className="font-semibold text-slate-700 font-mono">{absentPercent}% of team</span>
          </div>
        </div>

        {/* Card 4: Monthly Payroll */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly Payroll
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {totalMonthlyPayroll > 0 ? `₹${payrollLakhs}L` : '₹0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Current Disbursal Cycle</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Cycle</span>
            <span className="font-semibold text-indigo-700 font-mono">{selectedMonth}</span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN ROW: ATTENDANCE SUMMARY & PAYROLL TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Attendance Summary Card */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Attendance Summary
              </h2>
              <span className="text-xs font-mono text-slate-500 font-semibold">Today</span>
            </div>

            <div className="space-y-4">
              {/* Present */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-700 font-bold">Present</span>
                  <span className="font-mono font-bold text-emerald-700">{presentPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${presentPercent}%` }}
                  />
                </div>
              </div>

              {/* Absent */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-700 font-bold">Absent</span>
                  <span className="font-mono font-bold text-rose-700">{absentPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(6, parseFloat(absentPercent))}%` }}
                  />
                </div>
              </div>

              {/* On Leave */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-700 font-bold">On Leave</span>
                  <span className="font-mono font-bold text-amber-700">{leavePercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, parseFloat(leavePercent))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('attendance')}
              className="w-full py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <span>Open Daily Attendance Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Illustrative Monthly Payroll Chart */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Monthly Payroll Trends
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Illustrative monthly payroll figures in ₹ Lakh
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                FY 2026-27
              </span>
            </div>

            {/* Bar Chart Container */}
            <div className="h-44 flex items-end justify-between gap-3 px-2 pt-6 pb-2">
              {payrollMonths.map((bar) => (
                <div key={bar.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-mono text-slate-500 font-semibold mb-1.5 opacity-80 group-hover:opacity-100">
                    ₹{bar.amount}L
                  </div>
                  <div
                    className="w-full max-w-[48px] bg-blue-500 group-hover:bg-blue-600 rounded-t-md transition-all duration-300"
                    style={{ height: bar.height }}
                  />
                  <div className="text-xs font-semibold text-slate-700 mt-2 font-mono">
                    {bar.month}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Disbursement Status: <strong className="text-emerald-700 font-semibold">100% Processed via Bank NEFT</strong></span>
            <button
              onClick={() => onNavigateTab('payroll')}
              className="text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
            >
              View Payroll Slips →
            </button>
          </div>
        </div>
      </div>

      {/* EMPLOYEE ATTENDANCE REGISTER TABLE (PDF Page 1 Middle Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Employee Attendance Register
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live roster attendance records for accounts, sales, and warehouse team
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('attendance')}
            className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
          >
            View Complete Register →
          </button>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Designation</th>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {employees.length > 0 ? (
                employees.slice(0, 6).map((emp) => {
                  const rec = attendanceRecords.find((r) => r.employeeId === emp.id);
                  const status = rec ? rec.status : 'Present';
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{emp.empCode}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {emp.department}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {emp.designation}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {emp.phone}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                            status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status === 'Absent'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No active employees registered. Use the Employee Master tab to add personnel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN MANAGEMENT MODULES (PDF Page 1 Bottom 6-Card Grid) */}
      <div className="space-y-3">
        <div className="pb-1 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Admin Management Modules
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Core workforce governance modules for employee master, daily shifts, and payouts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Module 1: Employee Master */}
          <div
            onClick={() => onNavigateTab('employee')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-wider">
                  Employee Master
                </h3>
                <p className="text-[11px] text-slate-500">
                  Add, edit and manage staff
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Manage complete employee profiles, department allocations, bank accounts, and salary structures.
            </p>
          </div>

          {/* Module 2: Attendance */}
          <div
            onClick={() => onNavigateTab('attendance')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Calendar className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-wider">
                  Attendance
                </h3>
                <p className="text-[11px] text-slate-500">
                  Daily in/out and leave records
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Track daily shift logs, check-in timestamps, half-days, and unexcused absences across trading desks.
            </p>
          </div>

          {/* Module 3: Payroll */}
          <div
            onClick={() => onNavigateTab('payroll')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <IndianRupee className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-wider">
                  Payroll
                </h3>
                <p className="text-[11px] text-slate-500">
                  Salary, deductions and net pay
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Calculate basic pay, HRA, EPF, professional taxes, and generate authentic printable employee salary slips.
            </p>
          </div>

          {/* Module 4: Reports */}
          <div
            onClick={() => onNavigateTab('reports')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <FileText className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-wider">
                  Reports
                </h3>
                <p className="text-[11px] text-slate-500">
                  Monthly HR and salary reports
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Export comprehensive monthly attendance registers, bank payout sheets, and CTC summaries to CSV.
            </p>
          </div>

          {/* Module 5: Leave Management */}
          <div
            onClick={() => onNavigateTab('leave')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-wider">
                  Leave Management
                </h3>
                <p className="text-[11px] text-slate-500">
                  Approve or reject leave requests
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Review pending leave requests, track remaining annual quotas, and manage staff absence approvals.
            </p>
          </div>

          {/* Module 6: Settings */}
          <div
            onClick={() => onNavigateTab('payroll')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Settings className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-wider">
                  Settings
                </h3>
                <p className="text-[11px] text-slate-500">
                  Company and payroll settings
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Configure working days, standard shift hours (09:00 - 18:30), PF percentages, and company bank accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
