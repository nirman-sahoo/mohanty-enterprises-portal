import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  LayoutDashboard, 
  UserCheck, 
  IndianRupee, 
  FileText, 
  CalendarDays, 
  BarChart3, 
  Plus, 
  ChevronDown,
  Building2,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { 
  HRSubTab, 
  Employee, 
  AttendanceRecord, 
  LeaveRequest, 
  PayrollRecord 
} from '../../types';
import { 
  subscribeToEmployees, 
  saveEmployeeInDb, 
  subscribeToAttendance, 
  recordAttendanceInDb, 
  bulkMarkAttendanceInDb, 
  subscribeToLeaves, 
  saveLeaveRequestInDb, 
  updateLeaveStatusInDb, 
  subscribeToPayroll, 
  markPayrollPaidInDb 
} from '../../services/firebaseService';
import { HROverviewTab } from './HROverviewTab';
import { EmployeeMasterTab } from './EmployeeMasterTab';
import { AttendanceTab } from './AttendanceTab';
import { PayrollTab } from './PayrollTab';
import { LeaveManagementTab } from './LeaveManagementTab';
import { ReportsTab } from './ReportsTab';
import { SalarySlipModal } from './SalarySlipModal';

const MONTH_CYCLE_OPTIONS = [
  'November 2026',
  'October 2026',
  'September 2026',
  'August 2026',
  'July 2026',
  'June 2026',
];

export const HRPayrollView: React.FC = () => {
  // Active Management Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<HRSubTab>('overview');

  // Month/Year filter matching PDF Annotation 2: "November 2026"
  const [selectedMonth, setSelectedMonth] = useState<string>('November 2026');

  // Live Firestore State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Salary Slip
  const [slipModalEmployee, setSlipModalEmployee] = useState<Employee | null>(null);
  const [slipModalPayroll, setSlipModalPayroll] = useState<PayrollRecord | null>(null);

  // Subscribe to Employees
  useEffect(() => {
    const unsub = subscribeToEmployees((data) => {
      setEmployees(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to Attendance for today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const unsub = subscribeToAttendance(today, (records) => {
      setAttendanceRecords(records);
    });
    return () => unsub();
  }, []);

  // Subscribe to Leaves
  useEffect(() => {
    const unsub = subscribeToLeaves((leaves) => {
      setLeaveRequests(leaves);
    });
    return () => unsub();
  }, []);

  // Subscribe to Payroll for the selected cycle
  useEffect(() => {
    const unsub = subscribeToPayroll(selectedMonth, (records) => {
      setPayrollRecords(records);
    });
    return () => unsub();
  }, [selectedMonth]);

  // View Payslip Handler
  const handleOpenPayslip = (employee: Employee, record: PayrollRecord) => {
    setSlipModalEmployee(employee);
    setSlipModalPayroll(record);
  };

  // Sub-tabs list matching client PDF "CREATE THIS" Management Menu
  const subTabs: { id: HRSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'employee', label: 'Employee', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: UserCheck },
    { id: 'payroll', label: 'Payroll', icon: IndianRupee },
    { id: 'leave', label: 'Leave', icon: CalendarDays },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950">
                Enterprise Module
              </span>
              <span className="text-slate-400 text-xs">·</span>
              <span className="text-slate-300 text-xs font-medium">B2B Wholesale Operations</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-3">
              <Users className="w-7 h-7 text-amber-400" />
              HR & Payroll Management Terminal
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Complete workforce administration: automated attendance tracking, monthly salary disbursement registers, statutory EPF/ESI compliance, and employee master records.
            </p>
          </div>

          {/* Month/Year Filter (Client PDF Annotation 2: "CREATE THIS FILTER") */}
          <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700/80 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-amber-400">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Cycle:
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-600 text-white text-xs font-bold py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-inner"
              >
                {MONTH_CYCLE_OPTIONS.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white font-medium">
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Client PDF Red Annotation: "CREATE THIS" Management Menu */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden lg:inline-block">
                Management Menu:
              </span>
              {subTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSubTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-extrabold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Live Sync Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">Firestore Live Synchronized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area based on Active Sub-Tab */}
      <div>
        {activeSubTab === 'overview' && (
          <HROverviewTab
            employees={employees}
            attendanceRecords={attendanceRecords}
            selectedMonth={selectedMonth}
            onNavigateTab={(tab) => setActiveSubTab(tab)}
            onOpenAddEmployee={() => setActiveSubTab('employee')}
          />
        )}

        {activeSubTab === 'employee' && (
          <EmployeeMasterTab
            employees={employees}
            onSaveEmployee={saveEmployeeInDb}
          />
        )}

        {activeSubTab === 'attendance' && (
          <AttendanceTab
            employees={employees}
            attendanceRecords={attendanceRecords}
            onRecordAttendance={recordAttendanceInDb}
            onBulkMarkAttendance={bulkMarkAttendanceInDb}
          />
        )}

        {activeSubTab === 'payroll' && (
          <PayrollTab
            employees={employees}
            payrollRecords={payrollRecords}
            selectedMonth={selectedMonth}
            onViewPayslip={handleOpenPayslip}
            onMarkAsPaid={markPayrollPaidInDb}
          />
        )}

        {activeSubTab === 'leave' && (
          <LeaveManagementTab
            employees={employees}
            leaveRequests={leaveRequests}
            onSaveLeaveRequest={saveLeaveRequestInDb}
            onUpdateLeaveStatus={updateLeaveStatusInDb}
          />
        )}

        {activeSubTab === 'reports' && (
          <ReportsTab
            employees={employees}
            attendanceRecords={attendanceRecords}
            payrollRecords={payrollRecords}
            selectedMonth={selectedMonth}
          />
        )}
      </div>

      {/* Printable Salary Slip Modal */}
      <SalarySlipModal
        employee={slipModalEmployee}
        payroll={slipModalPayroll}
        monthName={selectedMonth}
        onClose={() => {
          setSlipModalEmployee(null);
          setSlipModalPayroll(null);
        }}
      />
    </div>
  );
};
