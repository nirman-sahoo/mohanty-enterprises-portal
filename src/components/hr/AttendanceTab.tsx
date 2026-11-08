import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  UserX, 
  Search,
  Download,
  Filter
} from 'lucide-react';
import { Employee, AttendanceRecord, AttendanceStatus, Department } from '../../types';

interface AttendanceTabProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  onRecordAttendance: (record: AttendanceRecord) => Promise<void>;
  onBulkMarkAttendance: (records: AttendanceRecord[]) => Promise<void>;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  employees,
  attendanceRecords,
  onRecordAttendance,
  onBulkMarkAttendance,
}) => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Map employee with their attendance record for selectedDate
  const employeeAttendanceRows = employees.map((emp) => {
    const existingRec = attendanceRecords.find(
      (r) => r.employeeId === emp.id && r.date === selectedDate
    );

    const status: AttendanceStatus = existingRec ? existingRec.status : 'Present';

    return {
      employee: emp,
      attendanceId: existingRec ? existingRec.id : `att-${emp.id}-${selectedDate}`,
      status,
      checkInTime: existingRec?.checkInTime || (status === 'Present' ? '09:15 AM' : ''),
      checkOutTime: existingRec?.checkOutTime || (status === 'Present' ? '06:30 PM' : ''),
      notes: existingRec?.notes || '',
    };
  });

  const filteredRows = employeeAttendanceRows.filter(({ employee }) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.empCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || employee.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Counters
  const presentCount = employeeAttendanceRows.filter((r) => r.status === 'Present').length;
  const absentCount = employeeAttendanceRows.filter((r) => r.status === 'Absent').length;
  const leaveCount = employeeAttendanceRows.filter((r) => r.status === 'On Leave').length;
  const halfDayCount = employeeAttendanceRows.filter((r) => r.status === 'Half Day').length;

  const handleStatusChange = async (
    emp: Employee,
    attId: string,
    newStatus: AttendanceStatus
  ) => {
    const updatedRecord: AttendanceRecord = {
      id: attId,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      date: selectedDate,
      status: newStatus,
      checkInTime: newStatus === 'Present' || newStatus === 'Half Day' ? '09:15 AM' : '',
      checkOutTime: newStatus === 'Present' ? '06:30 PM' : newStatus === 'Half Day' ? '02:00 PM' : '',
    };
    await onRecordAttendance(updatedRecord);
  };

  const handleMarkAllPresent = async () => {
    const bulkRecords: AttendanceRecord[] = employees.map((emp) => ({
      id: `att-${emp.id}-${selectedDate}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      date: selectedDate,
      status: 'Present',
      checkInTime: '09:15 AM',
      checkOutTime: '06:30 PM',
    }));
    await onBulkMarkAttendance(bulkRecords);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Daily Attendance Register
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift in/out records, biometric verification status, and daily workforce presence logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-300 text-xs">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleMarkAllPresent}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </button>
        </div>
      </div>

      {/* Metric Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Present</span>
            <p className="text-xl font-bold font-mono text-emerald-600 tabular-nums">{presentCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Absent</span>
            <p className="text-xl font-bold font-mono text-rose-600 tabular-nums">{absentCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <UserX className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">On Leave</span>
            <p className="text-xl font-bold font-mono text-amber-600 tabular-nums">{leaveCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Half Day</span>
            <p className="text-xl font-bold font-mono text-blue-600 tabular-nums">{halfDayCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="text-xs text-slate-500">
            Date: <strong className="text-slate-800 font-mono">{selectedDate}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Emp Code</th>
                <th className="py-2.5 px-4">Employee Name</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Shift In</th>
                <th className="py-2.5 px-4">Shift Out</th>
                <th className="py-2.5 px-4">Current Status</th>
                <th className="py-2.5 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRows.map(({ employee, attendanceId, status, checkInTime, checkOutTime }) => (
                <tr key={employee.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                    {employee.empCode}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {employee.name}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-600">
                    {employee.department}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {checkInTime || '-'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {checkOutTime || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                        status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : status === 'Absent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : status === 'Half Day'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleStatusChange(employee, attendanceId, 'Present')}
                        title="Mark Present"
                        className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                          status === 'Present'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800'
                        }`}
                      >
                        P
                      </button>
                      <button
                        onClick={() => handleStatusChange(employee, attendanceId, 'Absent')}
                        title="Mark Absent"
                        className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                          status === 'Absent'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800'
                        }`}
                      >
                        A
                      </button>
                      <button
                        onClick={() => handleStatusChange(employee, attendanceId, 'On Leave')}
                        title="Mark On Leave"
                        className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                          status === 'On Leave'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800'
                        }`}
                      >
                        L
                      </button>
                      <button
                        onClick={() => handleStatusChange(employee, attendanceId, 'Half Day')}
                        title="Mark Half Day"
                        className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                          status === 'Half Day'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800'
                        }`}
                      >
                        HD
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
