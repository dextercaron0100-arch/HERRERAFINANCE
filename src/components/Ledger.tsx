/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  FileCheck2,
  Paperclip,
  Sparkles,
  Camera
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getTransactions,
  getCategories,
  getCompanies,
  getProfiles,
  getDailyBalances,
  insertTransaction,
  createReversalTransaction,
  updateTransactionMetadata,
  getUserRole,
  canWriteFinance,
  getNextControlNumber,
  getAttachments,
  saveAttachment,
  getCashAccounts
} from '../data/mockDatabase';
import { Transaction, CashflowType, TransactionStatus, Category, Company, CashAccount } from '../types';
import { toast } from 'sonner';


interface LedgerProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
}

export default function Ledger({ userId, companyId, onAuditLogged }: LedgerProps) {
  // Queries & Filter State
  const [searchTerm, setSearchTerm] = useState(() => {
    const s = localStorage.getItem('ledger_search_term');
    if (s) {
      localStorage.removeItem('ledger_search_term');
      return s;
    }
    return '';
  });
  const [selectedType, setSelectedType] = useState<string>(() => {
    const t = localStorage.getItem('ledger_filter_type');
    if (t) {
      localStorage.removeItem('ledger_filter_type');
      return t;
    }
    return 'all';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const c = localStorage.getItem('ledger_filter_category');
    if (c) {
      localStorage.removeItem('ledger_filter_category');
      return c;
    }
    return 'all';
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Encode form toggle & fields
  const [isEncoding, setIsEncoding] = useState(false);
  const [encDate, setEncDate] = useState(new Date().toISOString().split('T')[0]);
  const [encType, setEncType] = useState<CashflowType>('cash_out');
  const [encTargetCompany, setEncTargetCompany] = useState(companyId === 'all' ? '' : companyId);
  const [encCategory, setEncCategory] = useState('');
  const [encAmount, setEncAmount] = useState('');
  const [encPurpose, setEncPurpose] = useState('');
  const [encResponsible, setEncResponsible] = useState('');
  const [encAccountId, setEncAccountId] = useState('');
  const [encReceipt, setEncReceipt] = useState<string | null>(null);
  const [encReceiptFile, setEncReceiptFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);

  // Receipt modal State
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Attachment/Metadata Drawer State
  const [activeMetadataTxn, setActiveMetadataTxn] = useState<Transaction | null>(null);
  const [metaScanRef, setMetaScanRef] = useState('');
  const [metaTimestamp, setMetaTimestamp] = useState('');
  const [metaReceiptUrl, setMetaReceiptUrl] = useState('');

  // LOAD DB

  const companies = getCompanies();
  const currentCompany = companies.find(c => c.id === companyId);
  const categories = getCategories(companyId);
  const profiles = getProfiles();
  const rawTxns = getTransactions(userId, companyId);
  const vaultAttachments = getAttachments(companyId);

  const allCashAccounts = useMemo(() => {
    const accs: CashAccount[] = [];
    companies.forEach(c => {
      accs.push(...getCashAccounts(c.id));
    });
    return accs;
  }, [companies]);

  // Filter Categories on selected type for encode form
  const formCategories = useMemo(() => {
    const activeCats = getCategories(encTargetCompany || companyId);
    return activeCats.filter(c => c.type === encType);
  }, [encType, encTargetCompany, companyId]);

  const formCashAccounts = useMemo(() => {
    return getCashAccounts(encTargetCompany || companyId);
  }, [encTargetCompany, companyId]);

  // Adjust default form category when type toggles
  React.useEffect(() => {
    if (formCategories.length > 0) {
      if (!formCategories.find(c => c.id === encCategory)) {
        setEncCategory(formCategories[0].id);
      }
    } else {
      setEncCategory('');
    }
  }, [formCategories, encCategory]);

  const handleSuggestCategory = async () => {
    if (!encPurpose.trim()) {
      toast.error('Enter a purpose first to suggest a category.');
      return;
    }
    
    try {
      setIsSuggestingCategory(true);
      toast.loading('Analyzing purpose...', { id: 'suggest-cat' });
      
      const payload = {
        purpose: encPurpose,
        categories: formCategories.map(c => ({ id: c.id, name: c.name }))
      };

      const res = await fetch('/api/suggest-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to suggest category');
      }
      
      const data = await res.json();
      if (data.categoryId && formCategories.some(c => c.id === data.categoryId)) {
        setEncCategory(data.categoryId);
        toast.success(`Category auto-selected!`, { id: 'suggest-cat' });
      } else {
        toast.error('No strong category match found.', { id: 'suggest-cat' });
      }
    } catch (e: any) {
      toast.error(e.message || 'Smart categorize failed', { id: 'suggest-cat' });
    } finally {
      setIsSuggestingCategory(false);
    }
  };

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
    // Total cash in/out approved for selected period
    const approvedTxns = rawTxns.filter(t => t.status === 'approved');
    const cashIn = approvedTxns.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0);
    const cashOut = approvedTxns.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0);
    
    // Find initial capital (first cash-in or specific category)
    // For simplicity, we can just say beginning is 0 for an all-time view, 
    // but to match the UI which might expect something, let's just make beginning 0,
    // cashIn as all cash inputs, and ending as cashIn - cashOut.
    const beginning = 0;
    const ending = cashIn - cashOut;

    return {
      beginning,
      cashIn,
      cashOut,
      ending
    };
  }, [rawTxns, companyId]);

  // 2. FILTER TRANSACTIONS
  const filteredTransactions = useMemo(() => {
    return rawTxns.filter(t => {
      // Search
      const catName = categories.find(c => c.id === t.categoryId)?.name || 'Operations';
      const acc = allCashAccounts.find(a => a.id === t.cashAccountId);
      const accName = acc ? `${acc.bankName} ${acc.accountName}` : '';
      const searchStr = `${t.purpose} ${t.responsiblePerson} ${t.id} ${catName} ${t.paymentMethod || ''} ${accName}`.toLowerCase();
      if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;

      // Type
      if (selectedType !== 'all' && t.type !== selectedType) return false;

      // Category
      if (selectedCategory !== 'all' && t.categoryId !== selectedCategory) return false;

      // Status
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;

      // Payment Method / Account
      if (selectedPaymentMethod !== 'all') {
        if (!t.paymentMethod && !t.cashAccountId && selectedPaymentMethod !== 'unspecified') return false;
        if (t.cashAccountId && t.cashAccountId !== selectedPaymentMethod && selectedPaymentMethod !== 'unspecified') return false;
        if (t.paymentMethod && !t.cashAccountId && t.paymentMethod.toLowerCase() !== selectedPaymentMethod.toLowerCase()) return false;
      }

      // Date Range
      if (startDate && t.txnDate < startDate) return false;
      if (endDate && t.txnDate > endDate) return false;

      return true;
    });
  }, [rawTxns, searchTerm, selectedType, selectedCategory, selectedStatus, startDate, endDate, selectedPaymentMethod]);

  // 3. CALCULATE FILTERED SUMMARY
  const filteredSummary = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'cash_in') inflow += t.amount;
      if (t.type === 'cash_out') outflow += t.amount;
    });
    return { inflow, outflow, net: inflow - outflow };
  }, [filteredTransactions]);

  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set<string>();
    rawTxns.forEach(t => {
      if (t.cashAccountId) {
        methods.add(t.cashAccountId);
      } else if (t.paymentMethod) {
        methods.add(t.paymentMethod.toLowerCase().trim());
      }
    });
    return Array.from(methods).sort();
  }, [rawTxns]);

  // 4. FILE UPLOAD SIMULATOR (BASE64)
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEncReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEncReceipt(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleScanReceipt = async () => {
    if (!encReceipt) {
      toast.error('No receipt attached. Please attach an image first.');
      return;
    }

    try {
      setIsScanning(true);
      toast.loading('Analyzing receipt with Gemini...', { id: 'scan-receipt' });
      
      const parts = encReceipt.split(',');
      const mimeMatch = encReceipt.match(/^data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const imageBase64 = parts[1];

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageBase64, mimeType })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to scan receipt');
      }

      const data = await res.json();
      
      if (data.txnDate) setEncDate(data.txnDate);
      if (data.amount) setEncAmount(String(data.amount));
      if (data.purpose) setEncPurpose(data.purpose);
      
      toast.success('Receipt analyzed successfully', { id: 'scan-receipt' });
    } catch (e: any) {
      toast.error(e.message || 'Error parsing receipt', { id: 'scan-receipt' });
    } finally {
      setIsScanning(false);
    }
  };

  // 5. SUBMIT FORM
  const handleEncodeSubmit = async (e: React.FormEvent) => {
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

    const targetCompanyId = encTargetCompany || companyId;
    if (targetCompanyId === 'all' || !targetCompanyId) {
       setFormError('Please select a specific company to log the transaction against.');
       return;
    }

    let finalReceiptPath = encReceipt;

    const { error, transaction } = insertTransaction(userId, {
      companyId: targetCompanyId,
      txnDate: encDate,
      type: encType,
      amount: parseFloat(encAmount),
      categoryId: encCategory,
      purpose: encPurpose,
      responsiblePerson: encResponsible,
      cashAccountId: encAccountId || undefined,
      receiptPath: finalReceiptPath,
      reversalOf: null
    });

    if (error) {
      setFormError(error);
    } else {
      // If we uploaded a receipt, link it via DocumentVault logic too!
      if (encReceiptFile && encReceipt) {
        saveAttachment(userId, targetCompanyId, {
          fileName: encReceiptFile.name,
          fileType: encReceiptFile.type,
          fileUrl: encReceipt,
          entityType: "transaction",
          entityId: transaction?.id || null 
        });
      }

      setFormSuccess('Financial ledger record registered successfully! Routing to reviewer signatures queue.');
      // Clear
      setEncAmount('');
      setEncPurpose('');
      setEncResponsible('');
      setEncReceipt(null);
      setEncReceiptFile(null);
      // close delay
      setTimeout(() => {
        setIsEncoding(false);
        setFormSuccess('');
      }, 1500);
      onAuditLogged();
    }
  };

  // 5. ATTACH METADATA
  const handleSaveMetadata = () => {
    if (!activeMetadataTxn) return;

    let controlNumber = activeMetadataTxn.mockMetadata?.controlNumber;
    if (!controlNumber) {
        controlNumber = getNextControlNumber();
    }

    const { error } = updateTransactionMetadata(
      userId, 
      activeMetadataTxn.id, 
      {
        scanRef: metaScanRef,
        timestamp: metaTimestamp || new Date().toISOString(),
        controlNumber
      },
      metaReceiptUrl || undefined
    );
    if (error) {
      toast.error('Failed to attach metadata', { description: error });
    } else {
      toast.success('Metadata Attached', { description: `Mock file metadata successfully attached. Control No: ${controlNumber}` });
      setActiveMetadataTxn(null);
      setMetaScanRef('');
      setMetaTimestamp('');
      setMetaReceiptUrl('');
      onAuditLogged();
    }
  };

  // 6. TRIGGER ADJUSTMENT REVERSAL
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

  // Current Month/Year for title
  const currentMonthYear = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }, []);

  return (
    <div className="space-y-6">
      {/* DAILY BALANCES SUMMARY */}
      <div className="bg-white border border-slate-200 p-6 shadow-xl relative overflow-hidden rounded-2xl print:shadow-none print:border-none print:p-0">
        {/* Abstract design vector accent lines */}
        <div className="absolute top-0 right-0 w-32 h-[1px] bg-gradient-to-l from-zinc-500/30 to-transparent"></div>
        <div className="absolute right-0 bottom-0 w-[1px] h-24 bg-gradient-to-t from-zinc-500/10 to-transparent"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
          <div>
            <h2 className="text-lg font-mono text-slate-900 uppercase tracking-wider flex items-center gap-2 font-bold">
              <FileCheck2 className="w-5 h-5 text-slate-600" />
              <span>{currentMonthYear} Daily Cash Position</span>
            </h2>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-mono mt-0.5">Values aggregated daily based on authorized transactional ledgers.</p>
          </div>
          <div className="text-[10px] bg-white border border-slate-200 py-1.5 px-3.5 text-slate-600 font-mono tracking-widest uppercase rounded-xl">
            Company Cash Ledger: <span className="font-bold text-slate-900">{currentCompany?.code}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Box 1 */}
          <div 
            onClick={() => {
              setSearchTerm('capital');
              setSelectedType('cash_in');
              setSelectedStatus('approved');
            }}
            className="p-4 bg-white border border-slate-200 border-l-2 border-l-amber-500 space-y-1 rounded-xl shadow-inner cursor-pointer hover:bg-slate-50 transition-colors group"
          >
            <span className="text-[9px] font-bold text-slate-500 group-hover:text-amber-400 uppercase tracking-widest block font-mono transition-colors">Beginning Capital Asset</span>
            <div className="text-lg font-bold text-slate-900 font-mono tracking-tight">{formatPeso(balanceSummary.beginning)}</div>
          </div>
          {/* Box 2 */}
          <div 
            onClick={() => {
              setSearchTerm('');
              setSelectedType('cash_in');
              setSelectedStatus('approved');
            }}
            className="p-4 bg-white border border-slate-200 border-l-2 border-l-[#00B67A] space-y-1 rounded-xl shadow-inner cursor-pointer hover:bg-slate-50 transition-colors group"
          >
            <span className="text-[9px] font-bold text-[#00B67A] group-hover:text-emerald-400 uppercase tracking-widest block font-mono transition-colors">Approved Cash Inputs (+)</span>
            <div className="text-lg font-bold text-[#00B67A] font-mono tracking-tight">{formatPeso(balanceSummary.cashIn)}</div>
          </div>
          {/* Box 3 */}
          <div 
            onClick={() => {
              setSearchTerm('');
              setSelectedType('cash_out');
              setSelectedStatus('approved');
            }}
            className="p-4 bg-white border border-slate-200 border-l-2 border-l-rose-500 space-y-1 rounded-xl shadow-inner cursor-pointer hover:bg-slate-50 transition-colors group"
          >
            <span className="text-[9px] font-bold text-rose-450 group-hover:text-rose-400 uppercase tracking-widest block font-mono transition-colors">Approved Disbursements (-)</span>
            <div className="text-lg font-bold text-rose-450 font-mono tracking-tight">{formatPeso(balanceSummary.cashOut)}</div>
          </div>
          {/* Box 4 */}
          <div 
            onClick={() => {
              setSearchTerm('');
              setSelectedType('all');
              setSelectedStatus('approved');
            }}
            className="p-4 bg-white border border-slate-200 border-l-2 border-l-sky-500 space-y-1 rounded-xl shadow-inner cursor-pointer hover:bg-slate-50 transition-colors group"
          >
            <span className="text-[9px] font-bold text-sky-400 group-hover:text-sky-300 uppercase tracking-widest block font-mono transition-colors">Ending Treasury Balance (=)</span>
            <div className="text-lg font-bold text-slate-900 font-mono tracking-tight">{formatPeso(balanceSummary.ending)}</div>
          </div>
        </div>
      </div>

      {/* ACTION HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/40 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono uppercase">Corporate Transaction Ledger</h1>
          <p className="text-xs text-slate-600 mt-1 font-mono italic">Record payments, income statements, corrections, and verify attached vouchers.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 no-print">
          <button 
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 hover:text-black text-slate-700 border border-slate-200 hover:border-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-150 cursor-pointer shadow-md select-none"
            title="Export view as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          
          <button 
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00B67A] hover:bg-[#009E6B] text-slate-900 border border-slate-200 hover:border-[#009E6B] text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-150 cursor-pointer shadow-md select-none"
            title="Download currently filtered transactions as CSV file"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS TRAY */}
      <div className="bg-white border border-slate-200 p-6 shadow-xl space-y-4 rounded-2xl no-print">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[2px] flex items-center gap-1.5 font-mono">
            <Filter className="w-4 h-4 text-[#00B67A]" />
            <span>Advanced Search filters</span>
          </span>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedType('all');
              setSelectedCategory('all');
              setSelectedStatus('all');
              setSelectedPaymentMethod('all');
              setStartDate('');
              setEndDate('');
            }}
            className="text-[10px] bg-white border border-slate-200 py-1 px-3 rounded-lg text-slate-600 font-mono tracking-widest hover:text-[#00B67A] transition-all cursor-pointer uppercase"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* SEARCH */}
          <div className="sm:col-span-2 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Keyword search</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search purpose, ID, category, or account..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl font-mono transition-all"
              />
            </div>
          </div>

          {/* TYPE */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Flow Type</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl cursor-pointer font-mono transition-all"
            >
              <option value="all" className="bg-white">All Flows</option>
              <option value="cash_in" className="bg-white">Inflows / Net Income</option>
              <option value="cash_out" className="bg-white">Outflows / Expenses</option>
            </select>
          </div>

          {/* CATEGORY */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Ledger Category</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl cursor-pointer font-mono transition-all"
            >
              <option value="all" className="bg-white">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id} className="bg-white">
                  {c.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Signatures Status</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl cursor-pointer font-mono transition-all"
            >
              <option value="all" className="bg-white">All Statuses</option>
              <option value="pending" className="bg-white">Pending review</option>
              <option value="approved" className="bg-white">Approved / Finalized</option>
              <option value="rejected" className="bg-white">Rejected / Returned</option>
            </select>
          </div>

          {/* PAYMENT METHOD */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Source / Method</span>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl cursor-pointer font-mono transition-all"
            >
              <option value="all" className="bg-white">All Methods</option>
              <option value="unspecified" className="bg-white">Unspecified</option>
              {uniquePaymentMethods.map(method => {
                const acc = allCashAccounts.find(a => a.id === method);
                const label = acc ? `${acc.bankName} - ${acc.accountName}` : method.toUpperCase();
                return (
                  <option key={method} value={method} className="bg-white">
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* DATES */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Start Date</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl transition-all"
            />
          </div>
        </div>
      </div>

      {/* DISPLAYED LIST SUMMARY */}
      <div className="flex gap-4 p-4 bg-white border border-sky-500/20 rounded-2xl shadow-inner mb-4 no-print sm:flex-row flex-col justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full"></div>
        <div className="text-slate-600 font-mono text-xs max-w-sm">
          <strong className="text-sky-400 block uppercase tracking-wider mb-1">Displayed Search Results</strong>
          Calculating aggregated totals strictly across currently filtered table transactions. Adjust filters above to change this summary.
        </div>
        <div className="grid grid-cols-3 gap-6 sm:gap-12 relative z-10 w-full sm:w-auto text-center sm:text-right">
          <div>
            <div className="text-[10px] font-bold text-[#00B67A] uppercase tracking-widest font-mono">Total Inflow</div>
            <div className="font-mono text-lg text-[#00B67A] font-bold">{formatPeso(filteredSummary.inflow)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-rose-450 uppercase tracking-widest font-mono">Total Outflow</div>
            <div className="font-mono text-lg text-rose-450 font-bold">{formatPeso(filteredSummary.outflow)}</div>
          </div>
          <div className="border-l border-slate-200 pl-6 sm:pl-12">
            <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest font-mono">Net Balance</div>
            <div className={`font-mono text-xl font-bold ${filteredSummary.net >= 0 ? 'text-slate-900' : 'text-rose-400'}`}>{formatPeso(filteredSummary.net)}</div>
          </div>
        </div>
      </div>

      {/* LEDGER DATA TABLE */}
      <div id="print-canvas" className="bg-white border border-slate-200 shadow-xl overflow-hidden rounded-2xl print:shadow-none print:border-none">
        {/* TABLE ACTION CONTROLS / TOOLBAR SEARCH BAR */}
        <div className="bg-white border-b border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-slate-600" />
            </span>
            <input
              type="text"
              className="block w-full pl-9 pr-8 py-2 bg-white border border-slate-200 placeholder-zinc-500 text-slate-900 text-xs font-mono rounded-xl focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] transition-all"
              placeholder="Search by description, reference ID, category, or account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-600 hover:text-slate-900 cursor-pointer"
                title="Clear Search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-mono text-[10px] uppercase tracking-wider">
            <span>Showed <strong className="text-slate-900 font-semibold">{filteredTransactions.length}</strong> of <strong className="text-slate-500">{rawTxns.length}</strong> entries</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white text-slate-600 font-medium uppercase tracking-[1px] font-mono border-b border-slate-200">
              <tr>
                <th className="p-3.5 border-b border-slate-200">Txn ID</th>
                <th className="p-3.5 border-b border-slate-200">Val Date</th>
                <th className="p-3.5 border-b border-slate-200">Flow</th>
                <th className="p-3.5 border-b border-slate-200">Principal Amount</th>
                <th className="p-3.5 border-b border-slate-200">Purpose & Details</th>
                <th className="p-3.5 border-b border-slate-200">Clerk / Controller</th>
                <th className="p-3.5 border-b border-slate-200">Signatures</th>
                <th className="p-3.5 border-b border-slate-200 text-center no-print">Docs & Meta</th>
                <th className="p-3.5 border-b border-slate-200 text-right text-slate-500 no-print">Adjustment Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 font-medium text-slate-700">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => {
                  // Find category label
                  const catName = categories.find(c => c.id === t.categoryId)?.name || 'Operations';
                  const encoderEmail = profiles.find(p => p.id === t.encodedBy)?.email || 'finance@sys.com';
                  const txnAttachments = vaultAttachments.filter(a => a.entityId === t.id && a.entityType === 'transaction');

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/40 transition">
                      {/* ID */}
                      <td className="p-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        #{t.id}
                      </td>

                      {/* DATE */}
                      <td className="p-3 font-mono whitespace-nowrap text-slate-700">
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
                      <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatPeso(t.amount)}
                      </td>

                      {/* PURPOSE & CATEGORY */}
                      <td className="p-3 max-w-[200px]">
                        <div className="space-y-1">
                          <div className="text-zinc-100 font-mono text-sm truncate" title={t.purpose}>
                            {t.purpose}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-white text-slate-600 font-bold font-mono text-[8px] border border-slate-200 rounded-lg uppercase">
                              {catName}
                            </span>
                            {(t.cashAccountId || t.paymentMethod) && (
                              <span className="px-1.5 py-0.5 bg-sky-950/20 text-sky-400 border border-sky-900/30 rounded-lg font-mono text-[8px] font-semibold uppercase">
                                {(() => {
                                  if (t.cashAccountId) {
                                    const acc = allCashAccounts.find(a => a.id === t.cashAccountId);
                                    return acc ? `${acc.bankName} - ${acc.accountName}` : t.cashAccountId;
                                  }
                                  return t.paymentMethod;
                                })()}
                              </span>
                            )}
                            {t.reversalOf && (
                              <span className="px-1.5 py-0.5 bg-rose-950/25 text-rose-450 border border-rose-900/30 rounded-lg font-mono text-[8px] font-semibold uppercase">
                                ADJUSTMENT ADJ
                              </span>
                            )}
                            {txnAttachments.length > 0 && (
                              <span 
                                className="px-1 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg flex items-center justify-center cursor-help"
                                title={`Vault Docs: ${txnAttachments.map(a => a.fileName).join(', ')}`}
                              >
                                <Paperclip className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ACCOUNTABLE AND ENCODER */}
                      <td className="p-3 text-slate-600">
                        <div className="space-y-1">
                          <div className="text-zinc-255 font-mono text-[11px] font-medium">{t.responsiblePerson}</div>
                          <div className="text-[9px] text-slate-500 flex items-center gap-0.5 font-mono">
                            <User className="w-2.5 h-2.5 text-slate-400" />
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

                      {/* RECEIPT PREVIEW & METADATA */}
                      <td className="p-3 text-center whitespace-nowrap no-print">
                        <div className="flex items-center justify-center gap-2">
                          {/* Image receipt toggle */}
                          {t.receiptPath ? (
                            <button 
                              onClick={() => setPreviewReceiptUrl(t.receiptPath)}
                              className="p-1 text-slate-600 hover:text-[#00B67A] bg-white border border-slate-200 hover:border-[#00B67A] rounded-lg cursor-pointer transition-all"
                              title="Preview secure billing vouchers"
                            >
                              <Eye className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          ) : (
                            <span className="text-zinc-600 font-bold text-[10px] font-mono w-6 text-center">-</span>
                          )}
                          {/* Metadata document viewer toggle */}
                          <button
                            onClick={() => {
                              setActiveMetadataTxn(t);
                              setMetaScanRef(t.mockMetadata?.scanRef || '');
                              setMetaTimestamp(t.mockMetadata?.timestamp || '');
                              setMetaReceiptUrl(t.receiptPath || '');
                            }}
                            className={`p-1 border rounded-lg cursor-pointer transition-all ${
                              t.mockMetadata ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                            }`}
                            title="Attach or View Mock Reference Metadata"
                          >
                            <Paperclip className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </div>
                      </td>

                      {/* ACTION CORRECTIONS */}
                      <td className="p-3 text-right whitespace-nowrap no-print">
                        {t.status === 'approved' && !t.reversalOf && (
                          <button 
                            onClick={() => handleReversal(t.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] border border-slate-200 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg transition-all font-mono uppercase tracking-wider cursor-pointer"
                          >
                            <RefreshCcw className="w-3 h-3 text-slate-500" />
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
                    No matching TRANSACTION entries located under current selections.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT VIEWER POPUP MODAL */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn animate-duration-200">
          <div className="bg-white border border-slate-200 p-6 max-w-lg w-full relative space-y-4 rounded-2xl">
            <button 
              onClick={() => setPreviewReceiptUrl(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
            >
              <X className="w-4.5 h-4.5" />
            </button>
            <div>
              <h3 className="font-mono text-base font-bold text-slate-900 uppercase tracking-wider">Secure Receipt Image Preview</h3>
              <p className="text-xs text-zinc-405 font-mono mt-0.5">Accessed through secure mock encrypted local storage asset pathways.</p>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[350px] flex items-center justify-center bg-white">
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
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer font-mono"
              >
                Close Anchor Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* METADATA ATTACHMENT DRAWER/MODAL */}
      {activeMetadataTxn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn animate-duration-200">
          <div className="bg-white border border-slate-200 p-6 max-w-md w-full relative space-y-5 rounded-2xl">
            <button 
              onClick={() => setActiveMetadataTxn(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
            >
              <X className="w-4.5 h-4.5" />
            </button>
            <div>
              <h3 className="font-mono text-base font-bold text-slate-900 uppercase tracking-wider">Document Metadata</h3>
              <p className="text-xs text-zinc-405 font-mono mt-0.5">Attach physical scanner reference codes to txn #{activeMetadataTxn.id}.</p>
            </div>
            
            <div className="space-y-4">
              {activeMetadataTxn.mockMetadata?.controlNumber && (
                <div className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl items-center">
                  <div className="flex-1">
                    <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">Control Number</p>
                    <p className="text-sm font-mono font-bold text-sky-400 mt-1">#{activeMetadataTxn.mockMetadata.controlNumber}</p>
                  </div>
                  <div className="bg-white p-1 rounded-md">
                    <QRCodeSVG 
                      value={`TXN:${activeMetadataTxn.id}|CTRL:${activeMetadataTxn.mockMetadata.controlNumber}`}
                      size={64}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">Receipt Image Link</label>
                <input 
                  type="text" 
                  value={metaReceiptUrl}
                  onChange={(e) => setMetaReceiptUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-mono focus:outline-hidden focus:border-sky-500 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">Scan Reference Code</label>
                <input 
                  type="text" 
                  value={metaScanRef}
                  onChange={(e) => setMetaScanRef(e.target.value)}
                  placeholder="e.g. DOC-2026-XQ91"
                  className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-mono focus:outline-hidden focus:border-sky-500 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">Document Timestamp</label>
                <input 
                  type="text" 
                  value={metaTimestamp}
                  onChange={(e) => setMetaTimestamp(e.target.value)}
                  placeholder="ISO Date"
                  className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-900 text-xs font-mono focus:outline-hidden focus:border-sky-500 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button 
                onClick={() => setActiveMetadataTxn(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 bg-transparent hover:bg-slate-50 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer font-mono transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveMetadata}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer font-mono transition-all"
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
