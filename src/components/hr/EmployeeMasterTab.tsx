import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  X,
  CreditCard
} from 'lucide-react';
import { Employee, Department, EmployeeStatus } from '../../types';
import { formatINR } from '../../utils/formatters';

interface EmployeeMasterTabProps {
  employees: Employee[];
  onSaveEmployee: (employee: Employee) => Promise<void>;
}

export const EmployeeMasterTab: React.FC<EmployeeMasterTabProps> = ({
  employees,
  onSaveEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for adding/editing an employee
  const [name, setName] = useState('');
  const [empCode, setEmpCode] = useState(
    () => `ME-STF-${Math.floor(100 + Math.random() * 900)}`
  );
  const [department, setDepartment] = useState<Department>('Accounts');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [joiningDate, setJoiningDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [monthlySalary, setMonthlySalary] = useState<number>(35000);
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('SBIN0001244');
  const [panNo, setPanNo] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('Active');

  const departments: Department[] = [
    'Accounts',
    'Sales',
    'HR',
    'Admin',
    'Warehouse / Yard',
    'Logistics',
  ];

  // Filtering
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm);

    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  const totalSalaryLiability = employees.reduce((acc, e) => acc + (e.monthlySalary || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      empCode,
      name: name.trim(),
      department,
      designation: designation.trim() || `${department} Specialist`,
      phone: phone.trim() || '+91 94370 00000',
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@mohantyenterprises.in`,
      joiningDate,
      monthlySalary: Number(monthlySalary) || 30000,
      bankAccount: bankAccount.trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      bankIfsc: bankIfsc.trim().toUpperCase() || 'SBIN0001244',
      panNo: panNo.trim().toUpperCase() || 'ABCDE1234F',
      status,
    };

    await onSaveEmployee(newEmp);
    setIsAddModalOpen(false);

    // Reset form
    setName('');
    setDesignation('');
    setPhone('');
    setEmail('');
    setBankAccount('');
    setPanNo('');
    setEmpCode(`ME-STF-${Math.floor(100 + Math.random() * 900)}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Metric Strip */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Employee Master & Staff Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Profiles, designations, salary CTC structures, and banking credentials for Mohanty Enterprises workforce
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Monthly CTC</p>
            <p className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {formatINR(totalSalaryLiability)}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Add Employee</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code, role or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        {/* Department Filters */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
              selectedDept === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({employees.length})
          </button>
          {departments.map((dept) => {
            const count = employees.filter((e) => e.department === dept).length;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
                  selectedDept === dept
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {dept} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Emp Code</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4 text-right">Monthly CTC (₹)</th>
                <th className="py-3 px-4">Bank & PAN</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No employees match this filter</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search criteria or register a new staff member.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {emp.empCode}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{emp.name}</p>
                      <p className="text-[11px] text-slate-500">{emp.designation}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-800 text-[11px]">
                        {emp.department}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      <div>{emp.phone}</div>
                      <div className="text-slate-400 font-sans text-[10px] truncate max-w-[170px]">{emp.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {emp.joiningDate}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatINR(emp.monthlySalary)}
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      <p className="font-mono text-slate-700">{emp.bankAccount}</p>
                      <p className="font-mono text-slate-400 text-[10px]">{emp.bankIfsc} · PAN: {emp.panNo}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                          emp.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : emp.status === 'On Leave'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold tracking-tight text-white uppercase tracking-wider">
                Register New Employee
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Employee Code
                  </label>
                  <input
                    type="text"
                    required
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra Sahoo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Accounts Executive"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 94370 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@mohantyenterprises.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Monthly CTC Salary (₹)
                  </label>
                  <input
                    type="number"
                    min="10000"
                    step="500"
                    required
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Bank Account No
                  </label>
                  <input
                    type="text"
                    placeholder="918237461928"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    PAN Card No
                  </label>
                  <input
                    type="text"
                    placeholder="BKRPK9182A"
                    value={panNo}
                    onChange={(e) => setPanNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono uppercase text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Save Employee Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
