/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Plus,
  RefreshCcw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  User,
  UploadCloud,
  FileCheck2
} from 'lucide-react';
import {
  getTransactions,
  getCategories,
  getCompanies,
  getProfiles,
  getDailyBalances,
  insertTransaction,
  createReversalTransaction,
  getUserRole,
  canWriteFinance
} from '../data/mockDatabase';
import { Transaction, CashflowType, TransactionStatus, Category, Company } from '../types';
import { toast } from 'sonner';

interface LedgerProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
}

export default function Ledger({ userId, companyId, onAuditLogged }: LedgerProps) {
  // Queries & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Encode form toggle & fields
  const [isEncoding, setIsEncoding] = useState(false);
  const [encDate, setEncDate] = useState(new Date().toISOString().split('T')[0]);
  const [encType, setEncType] = useState<CashflowType>('cash_out');
  const [encCategory, setEncCategory] = useState('');
  const [encAmount, setEncAmount] = useState('');
  const [encPurpose, setEncPurpose] = useState('');
  const [encResponsible, setEncResponsible] = useState('');
  const [encReceipt, setEncReceipt] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Receipt modal State
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // LOAD DB
  const companies = getCompanies();
  const currentCompany = companies.find(c => c.id === companyId);
  const categories = getCategories(companyId);
  const profiles = getProfiles();
  const rawTxns = getTransactions(userId, companyId);

  // Filter Categories on selected type for encode form
  const formCategories = useMemo(() => {
    return categories.filter(c => c.type === encType);
  }, [categories, encType]);

  // Adjust default form category when type toggles
  React.useEffect(() => {
    if (formCategories.length > 0) {
      setEncCategory(formCategories[0].id);
    } else {
      setEncCategory('');
    }
  }, [formCategories]);

  // PESO FORMATTER
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(num);
  };

  // 1. CALCULATE DAILY BALANCES SUMMARY CARD
  const balanceSummary = useMemo(() => {
    // Approved cash flow aggregation
    const comBalances = getDailyBalances(companyId);
    if (comBalances.length === 0) {
      return {
        beginning: 500000.00, // Preseeded Capital injection
        cashIn: 0,
        cashOut: 0,
        ending: 500000.00
      };
    }
    const latest = comBalances[comBalances.length - 1];
    
    // Total cash in/out approved for selected period
    const approvedTxns = rawTxns.filter(t => t.status === 'approved');
    const cashIn = approvedTxns.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0);
    const cashOut = approvedTxns.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0);

    return {
      beginning: latest.beginningBalance,
      cashIn,
      cashOut,
      ending: latest.endingBalance
    };
  }, [rawTxns, companyId]);

  // 2. FILTER TRANSACTIONS
  const filteredTransactions = useMemo(() => {
    return rawTxns.filter(t => {
      // Search
      const searchStr = `${t.purpose} ${t.responsiblePerson} ${t.id}`.toLowerCase();
      if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;

      // Type
      if (selectedType !== 'all' && t.type !== selectedType) return false;

      // Category
      if (selectedCategory !== 'all' && t.categoryId !== selectedCategory) return false;

      // Status
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;

      // Date Range
      if (startDate && t.txnDate < startDate) return false;
      if (endDate && t.txnDate > endDate) return false;

      return true;
    });
  }, [rawTxns, searchTerm, selectedType, selectedCategory, selectedStatus, startDate, endDate]);

  // 3. FILE UPLOAD SIMULATOR (BASE64)
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEncReceipt(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 4. SUBMIT FORM
  const handleEncodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!encAmount || isNaN(parseFloat(encAmount)) || parseFloat(encAmount) <= 0) {
      setFormError('Encode limits: transaction amount must be strictly superior to zero.');
      return;
    }
    if (!encPurpose.trim()) {
      setFormError('Purpose declaration is strictly required for auditing audits.');
      return;
    }
    if (!encResponsible.trim()) {
      setFormError('Accountable controller responsible person must be declared.');
      return;
    }

    const { error, transaction } = insertTransaction(userId, {
      companyId,
      txnDate: encDate,
      type: encType,
      amount: parseFloat(encAmount),
      categoryId: encCategory,
      purpose: encPurpose,
      responsiblePerson: encResponsible,
      receiptPath: encReceipt,
      reversalOf: null
    });

    if (error) {
      setFormError(error);
    } else {
      setFormSuccess('Financial ledger record registered successfully! Routing to reviewer signatures queue.');
      // Clear
      setEncAmount('');
      setEncPurpose('');
      setEncResponsible('');
      setEncReceipt(null);
      // close delay
      setTimeout(() => {
        setIsEncoding(false);
        setFormSuccess('');
      }, 1500);
      onAuditLogged();
    }
  };

  // 5. TRIGGER ADJUSTMENT REVERSAL
  const handleReversal = (txnId: string) => {
    const confirmed = window.confirm('Reversal adjustment rule: You are about to instantiate a reversing transaction. Original records are immutable. Initiate adjust?');
    if (!confirmed) return;

    const { error, transaction } = createReversalTransaction(userId, txnId, companyId);
    if (error) {
      toast.error('Reversal Failed', { description: error });
    } else {
      toast.success('Adjustment registered', { description: 'Reversal line registered as pending! Awaiting approval checks.' });
      onAuditLogged();
    }
  };

  // 6. EXPORT FILTERED TRANSACTIONS TO CSV
  const handleDownloadCSV = () => {
    const headers = ['Txn ID', 'Val Date', 'Flow Type', 'Account Category', 'Amount (PHP)', 'Purpose & Details', 'Accountable Officer', 'Encoded By', 'Status'];
    
    const rows = filteredTransactions.map(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.name || 'Operations';
      const encoderEmail = profiles.find(p => p.id === t.encodedBy)?.email || 'finance@sys.com';
      const typeStr = t.type === 'cash_in' ? 'Inflow' : 'Outflow';
      
      const escape = (str: string) => {
        const clean = (str || '').replace(/"/g, '""');
        return `"${clean}"`;
      };

      return [
        `"${t.id}"`,
        `"${t.txnDate}"`,
        `"${typeStr}"`,
        escape(catName),
        t.amount.toFixed(2),
        escape(t.purpose),
        escape(t.responsiblePerson),
        `"${encoderEmail}"`,
        `"${t.status.toUpperCase()}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const companyCode = currentCompany?.code || 'COMPANY';
    const dateToday = new Date().toISOString().split('T')[0];
    
    link.href = url;
    link.setAttribute('download', `${companyCode}_ledger_export_${dateToday}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Datasheet Exported', { description: `Ledger dataset exported as CSV format.` });
  };

  // 7. PRINT TO PDF
  const handlePrintPDF = () => {
    toast.info('Generating PDF', { description: 'Preparing ledger view for print layout...' });
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* DAILY BALANCES SUMMARY */}
      <div className="bg-[#181A1C] border border-[#24272C] p-6 shadow-xl relative overflow-hidden rounded-2xl print:shadow-none print:border-none print:p-0">
        {/* Abstract design vector accent lines */}
        <div className="absolute top-0 right-0 w-32 h-[1px] bg-gradient-to-l from-zinc-500/30 to-transparent"></div>
        <div className="absolute right-0 bottom-0 w-[1px] h-24 bg-gradient-to-t from-zinc-500/10 to-transparent"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#24272C] pb-4 mb-5">
          <div>
            <h2 className="text-lg font-mono text-white uppercase tracking-wider flex items-center gap-2 font-bold">
              <FileCheck2 className="w-5 h-5 text-zinc-400" />
              <span>June 2026 Daily Cash Position</span>
            </h2>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono mt-0.5">Values aggregated daily based on authorized transactional ledgers.</p>
          </div>
          <div className="text-[10px] bg-[#141618] border border-[#24272C] py-1.5 px-3.5 text-zinc-400 font-mono tracking-widest uppercase rounded-xl">
            Company Cash Ledger: <span className="font-bold text-white">{currentCompany?.code}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Box 1 */}
          <div className="p-4 bg-[#141618] border border-[#24272C] border-l-2 border-l-amber-500 space-y-1 rounded-xl shadow-inner">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Beginning Capital Asset</span>
            <div className="text-lg font-bold text-white font-mono tracking-tight">{formatPeso(balanceSummary.beginning)}</div>
          </div>
          {/* Box 2 */}
          <div className="p-4 bg-[#141618] border border-[#24272C] border-l-2 border-l-[#00B67A] space-y-1 rounded-xl shadow-inner">
            <span className="text-[9px] font-bold text-[#00B67A] uppercase tracking-widest block font-mono">Approved Cash Inputs (+)</span>
            <div className="text-lg font-bold text-[#00B67A] font-mono tracking-tight">{formatPeso(balanceSummary.cashIn)}</div>
          </div>
          {/* Box 3 */}
          <div className="p-4 bg-[#141618] border border-[#24272C] border-l-2 border-l-rose-500 space-y-1 rounded-xl shadow-inner">
            <span className="text-[9px] font-bold text-rose-450 uppercase tracking-widest block font-mono">Approved Disbursements (-)</span>
            <div className="text-lg font-bold text-rose-450 font-mono tracking-tight">{formatPeso(balanceSummary.cashOut)}</div>
          </div>
          {/* Box 4 */}
          <div className="p-4 bg-[#141618] border border-[#24272C] border-l-2 border-l-sky-500 space-y-1 rounded-xl shadow-inner">
            <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest block font-mono">Ending Treasury Balance (=)</span>
            <div className="text-lg font-bold text-white font-mono tracking-tight">{formatPeso(balanceSummary.ending)}</div>
          </div>
        </div>
      </div>

      {/* ACTION HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#24272C]/40 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono uppercase">Corporate Transaction Ledger</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono italic">Record payments, income statements, corrections, and verify attached vouchers.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 no-print">
          <button 
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#181A1C] hover:bg-white hover:text-black text-zinc-300 border border-[#24272C] hover:border-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-150 cursor-pointer shadow-md select-none"
            title="Export view as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          
          <button 
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00B67A] hover:bg-[#009E6B] text-white border border-[#24272C] hover:border-[#009E6B] text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-150 cursor-pointer shadow-md select-none"
            title="Download currently filtered transactions as CSV file"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {canWriteFinance(userId, companyId) && (
            <button 
              onClick={() => setIsEncoding(!isEncoding)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00B67A] hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-150 cursor-pointer shadow-lg select-none border border-[#05C482]/20"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Encode Capital Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* ENCODE DRAWER / ACCORDION */}
      {isEncoding && (
        <div className="bg-[#181A1C] border border-[#24272C] p-6 shadow-2xl relative animate-fadeIn space-y-6 rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#24272C] pb-3">
            <div>
              <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">Encode Financial Transaction Form</h3>
              <p className="text-xs text-zinc-450 font-mono mt-0.5">Newly logged items trigger approval requirements inside Signatures queue.</p>
            </div>
            <button 
              onClick={() => setIsEncoding(false)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1E2124] rounded-lg cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleEncodeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* DATE */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Transaction Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <input 
                  type="date" 
                  value={encDate}
                  onChange={(e) => setEncDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl transition-all"
                />
              </div>
            </div>

            {/* FLOW TYPE */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Cashflow Category Type</label>
              <select
                value={encType}
                onChange={(e) => setEncType(e.target.value as CashflowType)}
                className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl cursor-pointer transition-all"
              >
                <option value="cash_out" className="bg-[#181A1C]">Cash Out / Outflow Expense</option>
                <option value="cash_in" className="bg-[#181A1C]">Cash In / Inflow Income</option>
              </select>
            </div>

            {/* CATEGORY */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Account Category</label>
              <select
                value={encCategory}
                onChange={(e) => setEncCategory(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl cursor-pointer transition-all"
              >
                {formCategories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-[#181A1C]">
                    {cat.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* AMOUNT */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Principal Amount (PHP)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-zinc-450 font-bold font-mono">₱</span>
                <input 
                  type="number" 
                  value={encAmount}
                  onChange={(e) => setEncAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  required
                  className="w-full pl-8 pr-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-bold transition-all"
                />
              </div>
            </div>

            {/* RESPONSIBLE PERSON */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Accountable Officer</label>
              <input 
                type="text" 
                value={encResponsible}
                onChange={(e) => setEncResponsible(e.target.value)}
                placeholder="Name of clerk or payee"
                required
                className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-white text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono transition-all"
              />
            </div>

            {/* RECEIPT ATTACHMENT */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Receipt File Upload (Optional)</label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-[#141618] border border-[#24272C] text-xs text-zinc-300 hover:bg-[#1E2124] hover:text-white rounded-xl transition-all select-none">
                  <UploadCloud className="w-4 h-4 text-zinc-500" />
                  <span>Choose billing image</span>
                  <input 
                    type="file" 
                    onChange={handleReceiptChange}
                    accept="image/*"
                    className="hidden" 
                  />
                </label>
                {encReceipt && (
                  <span className="text-[9px] bg-emerald-950/30 text-[#00B67A] font-mono border border-emerald-900/40 py-1 px-2.5 rounded-lg truncate max-w-[150px]">
                    Image attached
                  </span>
                )}
              </div>
            </div>

            {/* PURPOSE DECLARATION */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">Explicit Audit Purpose / Remarks</label>
              <input 
                type="text" 
                value={encPurpose}
                onChange={(e) => setEncPurpose(e.target.value)}
                placeholder="e.g., Meralco Store power branch bill settlement June"
                required
                className="w-full px-3.5 py-2 bg-[#141618] border border-[#24272C] text-white text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono transition-all"
              />
            </div>

            <div className="md:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#24272C]">
              <div className="text-xs text-amber-400 font-mono">
                {encAmount && parseFloat(encAmount) > 10000 && '⚠️ Amount exceeds ₱10,000 threshold. Escalated to administrator.'}
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsEncoding(false)}
                  className="px-4 py-2 border border-[#24272C] text-zinc-400 bg-transparent hover:bg-[#1E2124] text-xs font-semibold rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-[#00B67A] hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all shadow-md"
                >
                  Confirm and Log Record
                </button>
              </div>
            </div>
          </form>

          {formError && (
            <p className="p-3 bg-rose-950/20 border border-[#532323] text-rose-300 rounded-xl text-xs font-mono">
              {formError}
            </p>
          )}
          {formSuccess && (
            <p className="p-3 bg-emerald-950/20 border border-emerald-900/40 text-[#00B67A] rounded-xl text-xs font-mono animate-pulse">
              {formSuccess}
            </p>
          )}
        </div>
      )}

      {/* FILTER CONTROLS TRAY */}
      <div className="bg-[#181A1C] border border-[#24272C] p-6 shadow-xl space-y-4 rounded-2xl no-print">
        <div className="flex items-center justify-between border-b border-[#24272C] pb-3.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[2px] flex items-center gap-1.5 font-mono">
            <Filter className="w-4 h-4 text-[#00B67A]" />
            <span>Advanced Search filters</span>
          </span>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedType('all');
              setSelectedCategory('all');
              setSelectedStatus('all');
              setStartDate('');
              setEndDate('');
            }}
            className="text-[10px] bg-[#141618] border border-[#24272C] py-1 px-3 rounded-lg text-zinc-400 font-mono tracking-widest hover:text-[#00B67A] transition-all cursor-pointer uppercase"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* SEARCH */}
          <div className="sm:col-span-2 space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Keyword search</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search purpose, clerk, code..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#141618] border border-[#24272C] text-white text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono transition-all"
              />
            </div>
          </div>

          {/* TYPE */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Flow Type</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#141618] border border-[#24272C] text-white text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl cursor-pointer font-mono transition-all"
            >
              <option value="all" className="bg-[#181A1C]">All Flows</option>
              <option value="cash_in" className="bg-[#181A1C]">Inflows / Net Income</option>
              <option value="cash_out" className="bg-[#181A1C]">Outflows / Expenses</option>
            </select>
          </div>

          {/* CATEGORY */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Ledger Category</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#141618] border border-[#24272C] text-white text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl cursor-pointer font-mono transition-all"
            >
              <option value="all" className="bg-[#181A1C]">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id} className="bg-[#181A1C]">
                  {c.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Signatures Status</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#141618] border border-[#24272C] text-white text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl cursor-pointer font-mono transition-all"
            >
              <option value="all" className="bg-[#181A1C]">All Statuses</option>
              <option value="pending" className="bg-[#181A1C]">Pending review</option>
              <option value="approved" className="bg-[#181A1C]">Approved / Finalized</option>
              <option value="rejected" className="bg-[#181A1C]">Rejected / Returned</option>
            </select>
          </div>

          {/* DATES */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Start Date</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#141618] border border-[#24272C] text-white text-xs font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl transition-all"
            />
          </div>
        </div>
      </div>

      {/* LEDGER DATA TABLE */}
      <div id="print-canvas" className="bg-[#181A1C] border border-[#24272C] shadow-xl overflow-hidden rounded-2xl print:shadow-none print:border-none">
        {/* TABLE ACTION CONTROLS / TOOLBAR SEARCH BAR */}
        <div className="bg-[#141618] border-b border-[#24272C] p-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </span>
            <input
              type="text"
              className="block w-full pl-9 pr-8 py-2 bg-[#181A1C] border border-[#24272C] placeholder-zinc-500 text-white text-xs font-mono rounded-xl focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] transition-all"
              placeholder="Search by description, payee/officer, or Txn Reference ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white cursor-pointer"
                title="Clear Search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
            <span>Showed <strong className="text-white font-semibold">{filteredTransactions.length}</strong> of <strong className="text-zinc-500">{rawTxns.length}</strong> entries</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#141618] text-zinc-400 font-medium uppercase tracking-[1px] font-mono border-b border-[#24272C]">
              <tr>
                <th className="p-3.5 border-b border-[#24272C]">Txn ID</th>
                <th className="p-3.5 border-b border-[#24272C]">Val Date</th>
                <th className="p-3.5 border-b border-[#24272C]">Flow</th>
                <th className="p-3.5 border-b border-[#24272C]">Principal Amount</th>
                <th className="p-3.5 border-b border-[#24272C]">Purpose & Details</th>
                <th className="p-3.5 border-b border-[#24272C]">Clerk / Controller</th>
                <th className="p-3.5 border-b border-[#24272C]">Signatures</th>
                <th className="p-3.5 border-b border-[#24272C] text-center no-print">Receipt</th>
                <th className="p-3.5 border-b border-[#24272C] text-right text-zinc-500 no-print">Adjustment Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24272C]/60 font-medium text-zinc-300">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => {
                  // Find category label
                  const catName = categories.find(c => c.id === t.categoryId)?.name || 'Operations';
                  const encoderEmail = profiles.find(p => p.id === t.encodedBy)?.email || 'finance@sys.com';

                  return (
                    <tr key={t.id} className="hover:bg-zinc-900/40 transition">
                      {/* ID */}
                      <td className="p-3 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                        #{t.id}
                      </td>

                      {/* DATE */}
                      <td className="p-3 font-mono whitespace-nowrap text-zinc-300">
                        {t.txnDate}
                      </td>

                      {/* FLOW */}
                      <td className="p-3 whitespace-nowrap">
                        {t.type === 'cash_in' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px] uppercase font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Inflow</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-450 font-mono text-[10px] uppercase font-semibold">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Outflow</span>
                          </span>
                        )}
                      </td>

                      {/* AMOUNT */}
                      <td className="p-3 font-mono font-bold text-white whitespace-nowrap">
                        {formatPeso(t.amount)}
                      </td>

                      {/* PURPOSE & CATEGORY */}
                      <td className="p-3 max-w-[200px]">
                        <div className="space-y-1">
                          <div className="text-zinc-100 font-mono text-sm truncate" title={t.purpose}>
                            {t.purpose}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-[#141618] text-zinc-400 font-bold font-mono text-[8px] border border-[#24272C] rounded-lg uppercase">
                              {catName}
                            </span>
                            {t.reversalOf && (
                              <span className="px-1.5 py-0.5 bg-rose-950/25 text-rose-450 border border-rose-900/30 rounded-lg font-mono text-[8px] font-semibold uppercase">
                                ADJUSTMENT ADJ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ACCOUNTABLE AND ENCODER */}
                      <td className="p-3 text-zinc-400">
                        <div className="space-y-1">
                          <div className="text-zinc-255 font-mono text-[11px] font-medium">{t.responsiblePerson}</div>
                          <div className="text-[9px] text-zinc-500 flex items-center gap-0.5 font-mono">
                            <User className="w-2.5 h-2.5 text-zinc-650" />
                            <span className="truncate max-w-[120px]">{encoderEmail}</span>
                          </div>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="p-3 whitespace-nowrap">
                        {t.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] bg-[#00B67A]/10 text-[#00B67A] border border-[#00B67A]/20 rounded-lg font-mono font-bold tracking-wider uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>APPROVED</span>
                          </span>
                        )}
                        {t.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg font-mono font-bold tracking-wider uppercase">
                            <XCircle className="w-3 h-3" />
                            <span>REJECTED</span>
                          </span>
                        )}
                        {t.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-mono font-bold tracking-wider uppercase animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>

                      {/* RECEIPT PREVIEW */}
                      <td className="p-3 text-center whitespace-nowrap no-print">
                        {t.receiptPath ? (
                          <button 
                            onClick={() => setPreviewReceiptUrl(t.receiptPath)}
                            className="p-1.5 text-zinc-400 hover:text-[#00B67A] bg-[#141618] border border-[#24272C] hover:border-[#00B67A] rounded-lg cursor-pointer transition-all"
                            title="Preview secure billing vouchers"
                          >
                            <Eye className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        ) : (
                          <span className="text-zinc-600 font-bold text-[10px] font-mono">-</span>
                        )}
                      </td>

                      {/* ACTION CORRECTIONS */}
                      <td className="p-3 text-right whitespace-nowrap no-print">
                        {t.status === 'approved' && !t.reversalOf && (
                          <button 
                            onClick={() => handleReversal(t.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] border border-[#24272C] text-zinc-300 hover:text-white bg-[#141618] hover:bg-[#1E2124] rounded-lg transition-all font-mono uppercase tracking-wider cursor-pointer"
                          >
                            <RefreshCcw className="w-3 h-3 text-zinc-500" />
                            <span>Intelligent Reverse</span>
                          </button>
                        )}
                        {t.status !== 'approved' && (
                          <span className="text-[10px] text-zinc-600 font-mono">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-550 font-mono uppercase text-xs">
                    No matching transaction journal entries located under current selections.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT VIEWER POPUP MODAL */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn animate-duration-200">
          <div className="bg-[#181A1C] border border-[#24272C] p-6 max-w-lg w-full relative space-y-4 rounded-2xl">
            <button 
              onClick={() => setPreviewReceiptUrl(null)}
              className="absolute right-4 top-4 p-1.5 text-zinc-400 hover:text-white hover:bg-[#1E2124] rounded-lg cursor-pointer transition-all"
            >
              <X className="w-4.5 h-4.5" />
            </button>
            <div>
              <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider">Secure Receipt Image Preview</h3>
              <p className="text-xs text-zinc-405 font-mono mt-0.5">Accessed through secure mock encrypted local storage asset pathways.</p>
            </div>
            
            <div className="border border-[#24272C] rounded-xl overflow-hidden max-h-[350px] flex items-center justify-center bg-[#141618]">
              <img 
                src={previewReceiptUrl} 
                alt="Payment voucher attachment" 
                className="max-h-[350px] object-contain max-w-full"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setPreviewReceiptUrl(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer font-mono"
              >
                Close Anchor Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
