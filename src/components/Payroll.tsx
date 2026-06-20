/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Coins,
  Plus,
  Trash2,
  Calendar,
  Lock,
  Percent,
  Calculator,
  UserPlus,
  Briefcase,
  AlertOctagon,
  Settings2,
  Cpu,
  BookmarkCheck,
  FileSpreadsheet,
  Printer,
  Paperclip,
  X
} from 'lucide-react';
import {
  getEmployees,
  saveEmployee,
  getPayrollRuns,
  getPayrollItems,
  createPayrollRun,
  updatePayrollDeductions,
  processPayrollPayout,
  updatePayrollRunMetadata,
  canManagePayroll,
  getCategories,
  isGroupAdmin,
  getUserRole,
  getCompanies
} from '../data/mockDatabase';
import { Employee, PayrollRun, PayrollItem, Deductions } from '../types';
import { toast } from 'sonner';

interface PayrollProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
}

export default function Payroll({ userId, companyId, onAuditLogged }: PayrollProps) {
  // Tabs
  const [payrollSegment, setPayrollSegment] = useState<'employees' | 'runs'>('employees');

  // Employee CRUD states
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empTargetCompany, setEmpTargetCompany] = useState<string>(companyId === "all" ? "" : companyId);
  const [empId, setEmpId] = useState<string | undefined>(undefined);
  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [empSalary, setEmpSalary] = useState('');
  const [empActive, setEmpActive] = useState(true);

  // Run creation states
  const [runStart, setRunStart] = useState('2026-06-01');
  const [runEnd, setRunEnd] = useState('2026-06-15');
  const [payoutMode, setPayoutMode] = useState<'per_employee' | 'batch'>('batch');

  // Selected run state
  const [draftTargetCompany, setDraftTargetCompany] = useState<string>(companyId === "all" ? "" : companyId);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);

  // Deduction override overrides
  const [dedSSS, setDedSSS] = useState('');
  const [dedPH, setDedPH] = useState('');
  const [dedPI, setDedPI] = useState('');
  const [dedTax, setDedTax] = useState('');
  const [dedOther, setDedOther] = useState('');

  // Metadata attachment
  const [activeMetadataRun, setActiveMetadataRun] = useState<PayrollRun | null>(null);
  const [metaScanRef, setMetaScanRef] = useState('');
  const [metaTimestamp, setMetaTimestamp] = useState('');

  // Is Admin check
  const isAuthorized = companyId === 'all' ? isGroupAdmin(userId) : canManagePayroll(userId, companyId);

  // LOAD DB
  const employees = isAuthorized ? getEmployees(userId, companyId) : [];
  const runs = isAuthorized ? getPayrollRuns(userId, companyId) : [];
  const companies = getCompanies();
  const selectedItems = useMemo(() => {
    if (!selectedRun) return [];
    return getPayrollItems(userId, selectedRun.id);
  }, [userId, selectedRun]);

  const categories = getCategories(companyId);

  // PESO FORMATTER
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(num);
  };

  // 1. ACCESS DENIED SCREEN
  if (!isAuthorized) {
    const role = getUserRole(userId, companyId);
    return (
      <div className="bg-white rounded-2xl border border-rose-100 p-8 shadow-sm flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
        <div className="p-4 bg-rose-50 text-rose-650 rounded-full animate-pulse">
          <AlertOctagon className="w-10 h-10 text-rose-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-gray-900 font-sans">Corporate Security Lockout</h2>
          <p className="text-xs text-rose-700 font-mono font-semibold">ROLE ENFORCEMENT AUDIT: ACCESS VIOLATION</p>
          <p className="text-xs text-gray-400 leading-relaxed px-4">
            Under strict RLS governance guidelines, employee wages, positions and payroll records are restricted exclusively to Group Admins and Company Admins. Your active role is <b className="uppercase text-amber-600">[{role || 'Viewer'}]</b>.
          </p>
        </div>
        <div className="border border-amber-100 bg-amber-50 rounded-lg p-3 text-left w-full space-y-1 text-[11px] text-amber-800">
          <p className="font-bold">✨ Preview Sandbox Tip:</p>
          <p>Please use the role-switcher dropdown in the upper right header, select <b>mark@herrera.com</b> or <b>ryan@herrera.com</b>, and return here to explore.</p>
        </div>
      </div>
    );
  }

  // Submit employee Form
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const sal = parseFloat(empSalary);
    if (!empName.trim() || !empPosition.trim() || isNaN(sal) || sal < 0) {
      toast.error('Invalid Employee Details', { description: 'Provide valid information. Basic wage can not be negative.' });
      return;
    }

    const finalCompanyId = empTargetCompany || companyId;
    if (finalCompanyId === "all" || !finalCompanyId) {
       toast.error("Invalid Company", { description: "Please select a specific company to assign this employee to." });
       return;
    }

    const { error, employee } = saveEmployee(userId, {
      id: empId,
      companyId: finalCompanyId,
      fullName: empName,
      position: empPosition,
      baseSalary: sal,
      active: empActive
    });

    if (error) {
      toast.error('Employee Registration Failed', { description: error });
    } else {
      toast.success('Employee Profile Configured', { description: `Saved details for ${employee?.fullName}` });
      setShowEmpForm(false);
      setEmpId(undefined);
      setEmpName('');
      setEmpPosition('');
      setEmpSalary('');
      setEmpActive(true);
      onAuditLogged();
    }
  };

  // Add document metadata to run
  const handleSaveMetadata = () => {
    if (!activeMetadataRun) return;
    const { error } = updatePayrollRunMetadata(userId, activeMetadataRun.id, {
      scanRef: metaScanRef,
      timestamp: metaTimestamp || new Date().toISOString()
    });
    if (error) {
      toast.error('Failed to attach metadata', { description: error });
    } else {
      toast.success('Metadata Attached', { description: 'Mock file metadata successfully attached.' });
      setActiveMetadataRun(null);
      setMetaScanRef('');
      setMetaTimestamp('');
      onAuditLogged(); // triggers re-render 
    }
  };

  // Create run
  const handleCreateRun = () => {
    const finalCompanyId = draftTargetCompany || companyId;
    if (finalCompanyId === "all" || !finalCompanyId) {
      toast.error('Invalid Company', { description: 'Please select a specific company to run payroll for.' });
      return;
    }

    const { error, run, items } = createPayrollRun(userId, finalCompanyId, runStart, runEnd);
    if (error) {
      toast.error('Payroll Compilation Failed', { description: error });
    } else {
      toast.success('Draft Payroll Scheduled', { description: 'Draft schedule compiled! Load details sheet to verify deductions.' });
      if (run) setSelectedRun(run);
      onAuditLogged();
    }
  };

  // Trigger edit single item
  const openEditDeduction = (item: PayrollItem) => {
    setEditingItem(item);
    setDedSSS(String(item.deductions.sss));
    setDedPH(String(item.deductions.philhealth));
    setDedPI(String(item.deductions.pagibig));
    setDedTax(String(item.deductions.tax));
    setDedOther(String(item.deductions.other));
  };

  // Save edit single item
  const handleSaveDeduction = () => {
    if (!editingItem) return;
    const s = parseFloat(dedSSS) || 0;
    const ph = parseFloat(dedPH) || 0;
    const pi = parseFloat(dedPI) || 0;
    const tx = parseFloat(dedTax) || 0;
    const ot = parseFloat(dedOther) || 0;

    const deductions: Deductions = { sss: s, philhealth: ph, pagibig: pi, tax: tx, other: ot };
    const { error, item } = updatePayrollDeductions(userId, editingItem.id, deductions);

    if (error) {
      toast.error('Deduction Profile Invalid', { description: error });
    } else {
      toast.success('Deductions Saved');
      setEditingItem(null);
      // Reload Selected Run state
      if (selectedRun) setSelectedRun({ ...selectedRun });
    }
  };

  // Process and payout run (creates pending cash_out transactions)
  const handleProcessPayout = () => {
    if (!selectedRun) return;
    const payrollCat = categories.find(c => c.name === 'payroll' && c.type === 'cash_out');
    if (!payrollCat) {
      toast.error('System Failure', { description: 'Internal error: Outbound Category "payroll" must be established first.' });
      return;
    }

    const confirmed = window.confirm('Process Remittance: You are about to finalize this payroll run and emit pending cash outward entries. Continue?');
    if (!confirmed) return;

    const { error, run } = processPayrollPayout(userId, selectedRun.id, payoutMode, payrollCat.id);
    if (error) {
      toast.error('Payout Issuance Failed', { description: error });
    } else {
      toast.success('Payout Files Trasmitting', { description: 'Payout files finalized and transmitted to reviewer approvals desk!' });
      setSelectedRun(null);
      onAuditLogged();
    }
  };

  // EXPORT TO CSV
  const handleDownloadCSV = () => {
    if (payrollSegment === 'employees') {
      const headers = ['Employee ID', 'Full Name', 'Position', 'Base Salary (PHP)', 'Status'];
      const rows = employees.map(emp => [
        `"${emp.id}"`,
        `"${emp.fullName}"`,
        `"${emp.position}"`,
        emp.baseSalary.toFixed(2),
        `"${emp.active ? 'ACTIVE' : 'SUSPENDED'}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `company_employees_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV Exported', { description: `Company active team roster saved to disk.` });
    } else {
      if (!selectedRun) {
        toast.warning('Selection required', { description: 'Please select a payroll run to export.' });
        return;
      }
      const headers = ['Employee', 'Gross Wage', 'SSS', 'PhilHealth', 'Pagibig', 'Tax', 'Other', 'Total Deductions', 'Net Salary'];
      const rows = selectedItems.map(item => {
        const empName = employees.find(e => e.id === item.employeeId)?.fullName || 'Unknown';
        const d = item.deductions;
        const totalD = d.sss + d.philhealth + d.pagibig + d.tax + d.other;
        return [
          `"${empName}"`,
          item.gross.toFixed(2),
          d.sss.toFixed(2),
          d.philhealth.toFixed(2),
          d.pagibig.toFixed(2),
          d.tax.toFixed(2),
          d.other.toFixed(2),
          totalD.toFixed(2),
          item.net.toFixed(2)
        ];
      });
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_run_${selectedRun.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV Exported', { description: `Payroll execution variables saved to disk.` });
    }
  };

  // PRINT TO PDF
  const handlePrintPDF = () => {
    toast.info('Generating Document', { description: 'Initializing print sequence...' });
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* TRACT DESIGN SEGMENT SUB-HEADERS */}
      <div className="bg-[#181A1C] border border-[#24272C] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl no-print">
        <div className="flex gap-1.5 p-0.5 bg-[#141618] border border-[#24272C] rounded-2xl select-none">
          <button 
            onClick={() => {
              setPayrollSegment('employees');
              setSelectedRun(null);
            }}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-2xl cursor-pointer transition flex items-center gap-1.5 ${payrollSegment === 'employees' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
          >
            <Users className="w-4 h-4 text-zinc-550" />
            <span>Employee register ({employees.length})</span>
          </button>
          <button 
            onClick={() => setPayrollSegment('runs')}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-2xl cursor-pointer transition flex items-center gap-1.5 ${payrollSegment === 'runs' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
          >
            <Coins className="w-4 h-4 text-zinc-550" />
            <span>Outflow Payroll runs ({runs.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#181A1C] hover:bg-white hover:text-black text-zinc-300 border border-[#24272C] hover:border-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-150 cursor-pointer shadow-md select-none"
            title="Export view as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          
          <button 
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-[#24272C] text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-150 cursor-pointer shadow-md select-none"
            title="Download currently active view as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {payrollSegment === 'employees' && (
            <button 
              onClick={() => {
                setEmpId(undefined);
                setEmpName('');
                setEmpPosition('');
                setEmpSalary('');
                setEmpActive(true);
                setShowEmpForm(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent text-[10px] font-bold uppercase tracking-wider rounded-2xl cursor-pointer transition shadow-xs ml-2"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#333]" />
              <span>Register New Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* SEGMENT 1: EMPLOYEE DIRECTORY */}
      {payrollSegment === 'employees' ? (
        <div className="space-y-6">
          {showEmpForm && (
            <div className="bg-[#181A1C] border border-[#24272C] p-6 shadow-md animate-fadeIn space-y-4 rounded-2xl no-print">
              <h3 className="font-display text-base text-white tracking-tight border-b border-[#24272C]/50 pb-2.5">
                {empId ? 'Edit Employee Wages Profile' : 'Register New Employee File'}
              </h3>
              
              <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {companyId === "all" && (
                  <div className="md:col-span-4 space-y-1.5">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Select Target Company</span>
                    <select
                      value={empTargetCompany}
                      onChange={(e) => setEmpTargetCompany(e.target.value)}
                      className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] rounded-2xl font-mono cursor-pointer transition-all"
                      required
                    >
                      <option value="" disabled className="bg-[#181A1C] text-zinc-500">Select a company for this employee</option>
                      {companies.filter(c => c.id !== "all").map(c => (
                        <option key={c.id} value={c.id} className="bg-[#181A1C]">
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Employee Full Name</span>
                  <input 
                    type="text" 
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g., Arthur Pendelton Jr."
                    required
                    className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Organizational Position</span>
                  <input 
                    type="text" 
                    value={empPosition}
                    onChange={(e) => setEmpPosition(e.target.value)}
                    placeholder="e.g., Marketing Lead"
                    required
                    className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Monthly Base Salary (PHP)</span>
                  <input 
                    type="number" 
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    placeholder="e.g., 35000.00"
                    step="0.01"
                    required
                    className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono placeholder:text-zinc-650"
                  />
                </div>
                <div className="space-y-1.5 flex items-center gap-3 pt-5 justify-center">
                  <input 
                    type="checkbox" 
                    checked={empActive}
                    onChange={(e) => setEmpActive(e.target.checked)}
                    id="chk-emp"
                    className="w-4 h-4 bg-[#141618] border border-[#24272C] text-white rounded-2xl focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="chk-emp" className="text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                    Active on payroll
                  </label>
                </div>
                
                <div className="md:col-span-4 flex justify-end gap-2 pt-3 border-t border-[#24272C]/50">
                  <button 
                    type="button" 
                    onClick={() => setShowEmpForm(false)}
                    className="px-4 py-2 border border-[#24272C] rounded-2xl text-xs font-mono uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {empId ? 'Save Profile' : 'Enroll Employee'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div id="print-canvas" className="bg-[#181A1C] border border-[#24272C] shadow-md rounded-2xl overflow-hidden print:shadow-none print:border-none print:p-0">
            <div className="p-4 border-b border-[#24272C] bg-[#141618] flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-zinc-450" />
                <span>Personnel Roster Registry (Audited Base Salaries)</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#181A1C]/50 text-zinc-400 font-medium uppercase tracking-[1px] font-mono border-b border-[#24272C]">
                  <tr>
                    <th className="p-3 border-b border-[#24272C]">Employee Name</th>
                    <th className="p-3 border-b border-[#24272C]">Particular Position</th>
                    <th className="p-3 border-b border-[#24272C] text-right">Base Wage (Monthly)</th>
                    <th className="p-3 border-b border-[#24272C]">Payroll Status</th>
                    <th className="p-3 border-b border-[#24272C] text-right no-print">Profile actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#24272C] font-medium text-zinc-300">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-zinc-800/20 transition">
                      <td className="p-3 text-white font-display text-sm font-semibold whitespace-nowrap">{emp.fullName}</td>
                      <td className="p-3 text-zinc-450 whitespace-nowrap">{emp.position}</td>
                      <td className="p-3 text-right font-mono font-bold text-white text-sm whitespace-nowrap">
                        {formatPeso(emp.baseSalary)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {emp.active ? (
                          <span className="px-2 py-0.5 bg-emerald-955/25 text-emerald-400 border border-emerald-900/50 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                            ACTIVE PAYROLL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 border border-zinc-800 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                            DELETION SUSPENDED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap no-print">
                        <button 
                          onClick={() => {
                            setEmpId(emp.id);
                            setEmpName(emp.fullName);
                            setEmpPosition(emp.position);
                            setEmpSalary(String(emp.baseSalary));
                            setEmpActive(emp.active);
                            setShowEmpForm(true);
                          }}
                          className="px-2.5 py-1.5 border border-[#24272C] hover:border-zinc-450 font-mono text-[9px] text-white bg-[#141618] hover:bg-zinc-950 transition cursor-pointer"
                        >
                          Modify Wages
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* SEGMENT 2: PAYROLL PROCESS RUNS */
        <div className="space-y-6">
          {/* RUN CREATION COMPRESS */}
          <div className="bg-[#181A1C] border border-[#24272C] p-5 shadow-sm space-y-4 rounded-2xl no-print">
            <div>
              <h2 className="text-serif text-base text-white tracking-tight">Trigger Draft payroll schedule</h2>
              <p className="text-[10px] text-zinc-450 font-mono uppercase tracking-wider mt-0.5 font-semibold">Instantiates salary items calculations for active roster.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {companyId === "all" && (
                <div className="md:col-span-4 space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Target Company</span>
                  <select
                    value={draftTargetCompany}
                    onChange={(e) => setDraftTargetCompany(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-[#00B67A] rounded-2xl font-mono cursor-pointer transition-all"
                  >
                    <option value="" disabled className="bg-[#181A1C] text-zinc-500">Select a company for this payroll run</option>
                    {companies.filter(c => c.id !== "all").map(c => (
                      <option key={c.id} value={c.id} className="bg-[#181A1C]">
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Period Start Date</span>
                <input 
                  type="date" 
                  value={runStart}
                  onChange={(e) => setRunStart(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Period End Date</span>
                <input 
                  type="date" 
                  value={runEnd}
                  onChange={(e) => setRunEnd(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden focus:border-white rounded-2xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Disbursement remitting mode</span>
                <select
                  value={payoutMode}
                  onChange={(e) => setPayoutMode(e.target.value as any)}
                  className="w-full px-2.5 py-2.5 bg-[#141618] border border-[#24272C] text-white focus:outline-hidden font-mono uppercase cursor-pointer"
                >
                  <option value="batch">Consolidated Bank Batch (Sumned)</option>
                  <option value="per_employee">Per Employee lines items</option>
                </select>
              </div>
              <button 
                onClick={handleCreateRun}
                className="py-2.5 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent text-xs font-bold uppercase tracking-wider rounded-2xl cursor-pointer transition h-10 shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Calculator className="w-4 h-4 text-zinc-700" />
                <span>Compile Draft Run</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* HISTORICAL WORKFLOW RUNS */}
            <div className="bg-[#181A1C] border border-[#24272C] shadow-md p-4 space-y-3 rounded-2xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block border-b border-[#24272C] pb-2 font-mono">
                Outbound payroll history
              </span>
              
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {runs.length > 0 ? (
                  runs.map((r, i) => (
                    <div 
                      key={i}
                      onClick={() => {
                        setSelectedRun(r);
                        setEditingItem(null);
                      }}
                      className={`p-3 rounded-2xl border transition cursor-pointer select-none text-xs space-y-1 ${selectedRun?.id === r.id ? 'border-white bg-[#141618]' : 'border-[#24272C]/65 bg-[#141618]/60 hover:bg-[#141618] hover:border-zinc-550'}`}
                    >
                      <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500 font-bold">
                        <span>#{r.id}</span>
                        {r.status === 'processed' ? (
                          <span className="px-1.5 py-0.2 bg-emerald-955/25 text-emerald-400 font-bold border border-emerald-950 rounded-2xl text-[8px] font-mono">
                            PROCESSED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-amber-955/20 text-amber-300 font-bold border border-amber-950 rounded-2xl text-[8px] font-mono">
                            OPEN DRAFT
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-white font-mono">
                        {r.periodStart} to {r.periodEnd}
                      </div>
                      <p className="text-[9px] text-zinc-500 font-mono">Created by admin staff.</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-zinc-500 font-mono uppercase tracking-wider text-xs py-12">No payroll runs produced yet.</p>
                )}
              </div>
            </div>

            {/* DETAILED ITEMS SHEET AND CALC OVERRIDE */}
            <div className="lg:col-span-2 bg-[#181A1C] border border-[#24272C] rounded-2xl p-5 shadow-sm space-y-4" id="print-canvas">
              <div className="flex items-center justify-between border-b border-[#24272C] pb-3">
                <div>
                  <h3 className="text-sm font-semibold font-mono text-white uppercase tracking-widest">Deductions and Net Compensation Registry</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Loads calculations from chosen active run file.</p>
                </div>

                {selectedRun && selectedRun.status === 'draft' && (
                  <button 
                    onClick={handleProcessPayout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Authorize & Process Payouts</span>
                  </button>
                )}
              </div>

              {selectedRun ? (
                <div className="space-y-4 animate-fadeIn">
                  {/* METADATA RUN HEADER */}
                  <div className="p-3 bg-[#141618] border border-[#24272C] rounded-2xl flex items-center justify-between text-xs font-medium text-zinc-300">
                    <div className="flex items-center gap-2">
                      <span>Active File: <b className="font-mono text-[10px] text-zinc-400">#{selectedRun.id}</b></span>
                      <button
                        onClick={() => {
                          setActiveMetadataRun(selectedRun);
                          setMetaScanRef(selectedRun.mockMetadata?.scanRef || '');
                          setMetaTimestamp(selectedRun.mockMetadata?.timestamp || '');
                        }}
                        className={`px-1.5 py-0.5 border rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                          selectedRun.mockMetadata ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-[#181A1C] text-zinc-400 border-[#24272C] hover:text-white hover:border-zinc-500'
                        }`}
                        title="Attach or View Mock Reference Metadata"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span className="text-[10px] uppercase font-mono font-bold">{selectedRun.mockMetadata ? 'Metadata Attached' : 'Attach Meta'}</span>
                      </button>
                    </div>
                    <div>
                      Remittance Plan: <span className="px-2 py-0.5 bg-zinc-900 text-zinc-450 rounded-2xl font-mono text-[10px] uppercase font-bold">{payoutMode} mode</span>
                    </div>
                  </div>

                  {/* ACTIVE ITEMS TABLE */}
                  <div className="overflow-x-auto rounded-2xl border border-[#24272C]">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-[#181A1C]/50 text-zinc-400 font-medium font-mono uppercase tracking-[1px]">
                        <tr>
                          <th className="p-2.5">Employee Name</th>
                          <th className="p-2.5 text-right">Gross Wage</th>
                          <th className="p-2.5 text-right">Total Deducts</th>
                          <th className="p-2.5 text-right">Net Compensation</th>
                          <th className="p-2.5 text-right no-print">Deduction console</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#24272C] font-medium text-zinc-350">
                        {selectedItems.map((item, idx) => {
                          const empObj = employees.find(e => e.id === item.employeeId);
                          const totalDeduct = item.deductions.sss + item.deductions.philhealth + item.deductions.pagibig + item.deductions.tax + item.deductions.other;
                          return (
                            <tr key={idx} className="hover:bg-zinc-900/30">
                              <td className="p-2.5 font-bold font-display text-white">{empObj?.fullName || 'Wages line'}</td>
                              <td className="p-2.5 text-right font-mono text-zinc-300">{formatPeso(item.gross)}</td>
                              <td className="p-2.5 text-right font-mono text-rose-455">({formatPeso(totalDeduct)})</td>
                              <td className="p-2.5 text-right font-mono text-emerald-400 font-bold">{formatPeso(item.net)}</td>
                              <td className="p-2.5 text-right no-print">
                                {selectedRun.status === 'draft' ? (
                                  <button 
                                    onClick={() => openEditDeduction(item)}
                                    className="p-1 px-2 border border-[#24272C] hover:border-zinc-500 bg-[#141618] rounded-2xl text-[9px] font-bold font-mono text-zinc-350 hover:text-white cursor-pointer transition uppercase"
                                  >
                                    Edit Deducts
                                  </button>
                                ) : (
                                  <span className="text-zinc-650 font-mono text-[10px]">Locked</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MINI FORM: DEDUCTIONS OVERRIDE CONSOLE */}
                  {editingItem && (
                    <div className="p-4 bg-[#141618] border border-zinc-800 rounded-2xl space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-[#24272C]/50 pb-2.5">
                        <span className="text-[11px] font-bold text-white font-display uppercase flex items-center gap-1.5 select-none">
                          <Settings2 className="w-4 h-4 text-zinc-450" />
                          <span>Deductions Tuning: {employees.find(e => e.id === editingItem.employeeId)?.fullName}</span>
                        </span>
                        <button 
                          onClick={() => setEditingItem(null)}
                          className="text-xs text-zinc-450 hover:text-white cursor-pointer font-mono uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-zinc-500 block uppercase font-mono">SSS (PHP)</span>
                          <input type="number" step="0.01" value={dedSSS} onChange={(e) => setDedSSS(e.target.value)} className="w-full text-xs p-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-mono" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-zinc-500 block uppercase font-mono">PhilHealth (PHP)</span>
                          <input type="number" step="0.01" value={dedPH} onChange={(e) => setDedPH(e.target.value)} className="w-full text-xs p-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-mono" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-zinc-500 block uppercase font-mono">Pag-IBIG (PHP)</span>
                          <input type="number" step="0.01" value={dedPI} onChange={(e) => setDedPI(e.target.value)} className="w-full text-xs p-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-mono" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-zinc-500 block uppercase font-mono">Tax</span>
                          <input type="number" step="0.01" value={dedTax} onChange={(e) => setDedTax(e.target.value)} className="w-full text-xs p-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-mono" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-zinc-500 block uppercase font-mono">Other</span>
                          <input type="number" step="0.01" value={dedOther} onChange={(e) => setDedOther(e.target.value)} className="w-full text-xs p-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-mono" />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button 
                          onClick={handleSaveDeduction}
                          className="px-3 py-1.5 bg-[#00B67A] text-white hover:bg-[#009E6B] rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer font-display select-none"
                        >
                          Update Registry values
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-zinc-550 font-mono uppercase tracking-wider">
                  Pick a historical payroll run file from the Left or compile a fresh draft run on top to verify calculations.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* METADATA ATTACHMENT DRAWER/MODAL */}
      {activeMetadataRun && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn animate-duration-200">
          <div className="bg-[#181A1C] border border-[#24272C] p-6 max-w-md w-full relative space-y-5 rounded-2xl">
            <button 
              onClick={() => setActiveMetadataRun(null)}
              className="absolute right-4 top-4 p-1.5 text-zinc-400 hover:text-white hover:bg-[#1E2124] rounded-lg cursor-pointer transition-all"
            >
              <X className="w-4.5 h-4.5" />
            </button>
            <div>
              <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider">Payroll Documentation Metadata</h3>
              <p className="text-xs text-zinc-405 font-mono mt-0.5">Attach physical scanner reference codes to run #{activeMetadataRun.id}.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Archive Scan Reference Code</label>
                <input 
                  type="text" 
                  value={metaScanRef}
                  onChange={(e) => setMetaScanRef(e.target.value)}
                  placeholder="e.g. DOC-RUN-9X"
                  className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs font-mono focus:outline-hidden focus:border-sky-500 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Attachment Processed Timestamp</label>
                <input 
                  type="text" 
                  value={metaTimestamp}
                  onChange={(e) => setMetaTimestamp(e.target.value)}
                  placeholder="ISO Date"
                  className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs font-mono focus:outline-hidden focus:border-sky-500 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#24272C]">
              <button 
                onClick={() => setActiveMetadataRun(null)}
                className="px-4 py-2 border border-[#24272C] text-zinc-400 bg-transparent hover:bg-[#1E2124] text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer font-mono transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveMetadata}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer font-mono transition-all"
              >
                Save Metadata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
