/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { motion, animate } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
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
  getCashAccounts,
  markTransactionCompleted
} from '../data/mockDatabase';
import { compressImage } from '../lib/imageUtils';
import { uploadPrivateDocument } from '../lib/privateDocuments';
import { Transaction, CashflowType, TransactionStatus, Category, Company, CashAccount } from '../types';
import { toast } from 'sonner';

function AnimatedCounter({ value, className }: { value: number, className?: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const controls = animate(prevValue.current, value, {
        duration: 0.8,
        ease: "easeOut",
        onUpdate: (latest) => {
          node.textContent = new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP"
          }).format(latest);
        }
      });
      prevValue.current = value;
      return () => controls.stop();
    }
  }, [value]);

  return <span ref={nodeRef} className={className}>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value)}</span>;
}

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType, selectedCategory, selectedStatus, selectedPaymentMethod, startDate, endDate]);

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
  const [encTagsInput, setEncTagsInput] = useState('');
  const [encTags, setEncTags] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);

  // Receipt modal State
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvMapping, setCsvMapping] = useState({
    date: '',
    amount: '',
    description: '',
    type: '',
    category: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    return getCashAccounts(companyId);
  }, [companies, companyId]);

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

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      if (json.length === 0) {
        toast.error("File is empty");
        return;
      }
      
      const headers = Object.keys(json[0] as object);
      setCsvHeaders(headers);
      setCsvData(json);
      setCsvMapping({
        date: '',
        amount: '',
        description: '',
        type: '',
        category: ''
      });
      setIsImportModalOpen(true);
    } catch (err: any) {
      toast.error("Failed to parse file: " + err.message);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMarkCompleted = (txnId: string) => {
    const res = markTransactionCompleted(userId, txnId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Transaction successfully marked as completed (Money Moved).");
      window.dispatchEvent(new Event('db-update'));
    }
  };

  const handleDownloadCsvTemplate = () => {
    const headers = ['date', 'amount', 'description', 'type', 'category'];
    const sampleRow1 = ['2023-10-25', '1500.50', 'Office Supplies', 'cash_out', 'Supplies'];
    const sampleRow2 = ['2023-10-26', '5000.00', 'Client Payment', 'cash_in', 'Revenue'];
    const csvContent = [headers.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'ledger_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template Downloaded', { description: 'CSV template for ledger import has been downloaded.' });
  };

  const handleImportCsvData = () => {
    const missing = ['date', 'amount', 'description', 'type', 'category'].filter(f => !(csvMapping as any)[f]);
    if (missing.length > 0) {
      toast.error(`Please map all required fields. Missing: ${missing.join(', ')}`);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    csvData.forEach(row => {
      try {
        const rawDate = row[csvMapping.date];
        const rawAmount = row[csvMapping.amount];
        const rawDesc = row[csvMapping.description];
        const rawType = row[csvMapping.type];
        const rawCategory = row[csvMapping.category];

        const dateObj = new Date(rawDate);
        if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
        const date = dateObj.toISOString().split('T')[0];
        
        const amount = parseFloat(rawAmount);
        if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
        
        let type: CashflowType = 'cash_out';
        if (String(rawType).toLowerCase().includes('in') || String(rawType).toLowerCase().includes('income') || String(rawType).toLowerCase().includes('credit')) {
          type = 'cash_in';
        }

        let categoryId = categories.find(c => c.type === type)?.id || '';
        const foundCategory = categories.find(c => c.name.toLowerCase() === String(rawCategory).toLowerCase().trim() && c.type === type);
        if (foundCategory) {
          categoryId = foundCategory.id;
        }

        const { error } = insertTransaction(userId, {
          companyId: companyId === 'all' ? companies[0]?.id || '' : companyId,
          txnDate: date,
          type,
          amount,
          categoryId,
          purpose: String(rawDesc),
          responsiblePerson: profiles.find(p => p.id === userId)?.email || 'Imported User',
          reversalOf: null,
          receiptPath: null
        });

        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        errorCount++;
      }
    });

    toast.success(`Import complete! ${successCount} added, ${errorCount} failed.`);
    setIsImportModalOpen(false);
    onAuditLogged();
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
    // Total cash in/out completed for selected period
    const postedTxns = rawTxns.filter(t => t.status === 'approved' || t.status === 'completed');
    const allCashInTxns = postedTxns.filter(t => t.type === 'cash_in');
    const cashOutTxns = postedTxns.filter(t => t.type === 'cash_out');
    
    // Separate capital from regular cash inputs
    const capitalTxns = allCashInTxns.filter(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      return cat?.name.toLowerCase().includes('capital');
    });
    
    const regularCashInTxns = allCashInTxns.filter(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      return !cat?.name.toLowerCase().includes('capital');
    });

    const beginning = allCashAccounts.reduce((sum, a) => sum + (Number(a.openingBalance) || 0), 0) + capitalTxns.reduce((sum, t) => sum + t.amount, 0);
    const cashIn = regularCashInTxns.reduce((sum, t) => sum + t.amount, 0);
    const cashOut = cashOutTxns.reduce((sum, t) => sum + t.amount, 0);
    const ending = beginning + cashIn - cashOut;

    const breakdown = {
      beginning: { Bank: 0, 'E-Wallet': 0, 'Cash on Hand': 0, 'Main Vault': 0 } as Record<string, number>,
      cashIn: { Bank: 0, 'E-Wallet': 0, 'Cash on Hand': 0, 'Main Vault': 0 } as Record<string, number>,
      cashOut: { Bank: 0, 'E-Wallet': 0, 'Cash on Hand': 0, 'Main Vault': 0 } as Record<string, number>,
      ending: { Bank: 0, 'E-Wallet': 0, 'Cash on Hand': 0, 'Main Vault': 0 } as Record<string, number>
    };

    allCashAccounts.forEach(a => {
      if (breakdown.beginning[a.accountType] !== undefined) {
        breakdown.beginning[a.accountType] += (Number(a.openingBalance) || 0);
      } else {
        breakdown.beginning['Bank'] += (Number(a.openingBalance) || 0);
      }
    });

    capitalTxns.forEach(t => {
      const acc = allCashAccounts.find(a => a.id === t.cashAccountId);
      if (acc && breakdown.beginning[acc.accountType] !== undefined) {
        breakdown.beginning[acc.accountType] += t.amount;
      } else {
        breakdown.beginning['Bank'] += t.amount;
      }
    });

    regularCashInTxns.forEach(t => {
      const acc = allCashAccounts.find(a => a.id === t.cashAccountId);
      if (acc && breakdown.cashIn[acc.accountType] !== undefined) {
        breakdown.cashIn[acc.accountType] += t.amount;
      } else {
        breakdown.cashIn['Bank'] += t.amount;
      }
    });

    cashOutTxns.forEach(t => {
      const acc = allCashAccounts.find(a => a.id === t.cashAccountId);
      if (acc && breakdown.cashOut[acc.accountType] !== undefined) {
        breakdown.cashOut[acc.accountType] += t.amount;
      } else {
        breakdown.cashOut['Bank'] += t.amount;
      }
    });

    allCashAccounts.forEach(acc => {
      if (breakdown.ending[acc.accountType] !== undefined) {
        breakdown.ending[acc.accountType] += acc.currentBalance;
      }
    });

    return {
      beginning,
      cashIn,
      cashOut,
      ending,
      breakdown
    };
  }, [rawTxns, companyId, allCashAccounts, categories]);

  // 2. FILTER TRANSACTIONS
  const filteredTransactions = useMemo(() => {
    return rawTxns.filter(t => {
      // Search
      const catName = categories.find(c => c.id === t.categoryId)?.name || 'Operations';
      const acc = allCashAccounts.find(a => a.id === t.cashAccountId);
      const accName = acc ? `${acc.bankName} ${acc.accountName}` : '';
      const tagsStr = (t.tags || []).join(' ');
      const searchStr = `${t.purpose} ${t.responsiblePerson} ${t.id} ${catName} ${t.paymentMethod || ''} ${accName} ${tagsStr}`.toLowerCase();
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
  // Only approved/completed transactions count toward the balance. Pending and
  // rejected transactions are tracked separately so they don't inflate Net Balance.
  const filteredSummary = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let pendingInflow = 0;
    let pendingOutflow = 0;
    let rejectedInflow = 0;
    let rejectedOutflow = 0;
    filteredTransactions.forEach(t => {
      const isPosted = t.status === 'approved' || t.status === 'completed';
      const isPending = t.status === 'pending';
      if (t.type === 'cash_in') {
        if (isPosted) inflow += t.amount;
        else if (isPending) pendingInflow += t.amount;
        else rejectedInflow += t.amount;
      } else if (t.type === 'cash_out') {
        if (isPosted) outflow += t.amount;
        else if (isPending) pendingOutflow += t.amount;
        else rejectedOutflow += t.amount;
      }
    });
    return {
      inflow, outflow, net: inflow - outflow,
      pendingInflow, pendingOutflow,
      rejectedInflow, rejectedOutflow
    };
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

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 4. FILE UPLOAD SIMULATOR (BASE64)
  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEncReceiptFile(file);
      if (file.type.startsWith('image/')) {
        try {
          const compressedBase64 = await compressImage(file);
          setEncReceipt(compressedBase64);
        } catch (err) {
          toast.error("Failed to process image");
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEncReceipt(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
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
    if (encReceipt) {
      try {
        finalReceiptPath = await uploadPrivateDocument(
          encReceipt,
          targetCompanyId,
          encReceiptFile?.name || `receipt-${Date.now()}.jpg`,
        );
      } catch (error: any) {
        setFormError(error.message || 'Secure receipt upload failed.');
        return;
      }
    }

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
      tags: encTags,
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
          fileUrl: finalReceiptPath,
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
      setEncTags([]);
      setEncTagsInput('');
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

    const netTotal = filteredTransactions.reduce((sum, t) => sum + (t.type === 'cash_in' ? t.amount : -t.amount), 0);
    const totalRow = [
      '""',
      '""',
      '""',
      '"NET TOTAL"',
      netTotal.toFixed(2),
      '""',
      '""',
      '""',
      '""'
    ];

    const csvContent = [headers.join(','), ...rows.map(r => r.join(',')), totalRow.join(',')].join('\n');
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

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1"
        >
          {/* Box 1 */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
            }}
            className="uiverse-parent"
          >
            <div 
              className="uiverse-card card-amber"
              onClick={() => {
                setSearchTerm('capital');
                setSelectedType('cash_in');
                setSelectedStatus('approved');
              }}
            >
              <div className="uiverse-front">
                <div className="uiverse-logo">
                    <span className="uiverse-circle uiverse-circle1"></span>
                    <span className="uiverse-circle uiverse-circle2"></span>
                    <span className="uiverse-circle uiverse-circle3"></span>
                    <span className="uiverse-circle uiverse-circle4"></span>
                </div>
                <div className="uiverse-glass"></div>
                <div className="uiverse-content">
                    <span className="uiverse-title text-amber-900">Beginning Capital Asset</span>
                    <AnimatedCounter value={balanceSummary.beginning} className="uiverse-text text-amber-950" />
                </div>
              </div>
              <div className="uiverse-back">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold mb-2">Breakdown</span>
                <div className="space-y-1 overflow-y-auto pr-1 custom-scrollbar text-xs font-mono">
                  <div className="flex justify-between items-center"><span className="text-slate-600">Banks:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.beginning['Bank'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">Cash:</span> <span className="font-bold">{formatPeso((balanceSummary.breakdown.beginning['Cash on Hand'] || 0) + (balanceSummary.breakdown.beginning['Main Vault'] || 0))}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">E-Wallet:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.beginning['E-Wallet'] || 0)}</span></div>
                </div>
              </div>
            </div>
          </motion.div>
          {/* Box 2 */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
            }}
            className="uiverse-parent"
          >
            <div 
              className="uiverse-card card-emerald"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('cash_in');
                setSelectedStatus('approved');
              }}
            >
              <div className="uiverse-front">
                <div className="uiverse-logo">
                    <span className="uiverse-circle uiverse-circle1"></span>
                    <span className="uiverse-circle uiverse-circle2"></span>
                    <span className="uiverse-circle uiverse-circle3"></span>
                    <span className="uiverse-circle uiverse-circle4"></span>
                </div>
                <div className="uiverse-glass"></div>
                <div className="uiverse-content">
                    <span className="uiverse-title text-emerald-900">Approved Cash Inputs (+)</span>
                    <AnimatedCounter value={balanceSummary.cashIn} className="uiverse-text text-emerald-950" />
                </div>
              </div>
              <div className="uiverse-back">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold mb-2">Cash In By Account</span>
                <div className="space-y-1 overflow-y-auto pr-1 custom-scrollbar text-xs font-mono">
                  <div className="flex justify-between items-center"><span className="text-slate-600">Banks:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.cashIn['Bank'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">Cash:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.cashIn['Cash on Hand'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">Vault:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.cashIn['Main Vault'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">E-Wallet:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.cashIn['E-Wallet'] || 0)}</span></div>
                </div>
              </div>
            </div>
          </motion.div>
          {/* Box 3 */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
            }}
            className="uiverse-parent"
          >
            <div 
              className="uiverse-card card-rose"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('cash_out');
                setSelectedStatus('approved');
              }}
            >
              <div className="uiverse-front">
                <div className="uiverse-logo">
                    <span className="uiverse-circle uiverse-circle1"></span>
                    <span className="uiverse-circle uiverse-circle2"></span>
                    <span className="uiverse-circle uiverse-circle3"></span>
                    <span className="uiverse-circle uiverse-circle4"></span>
                </div>
                <div className="uiverse-glass"></div>
                <div className="uiverse-content">
                    <span className="uiverse-title text-rose-900">Approved Disbursements (-)</span>
                    <AnimatedCounter value={balanceSummary.cashOut} className="uiverse-text text-rose-950" />
                </div>
              </div>
              <div className="uiverse-back">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold mb-2">Cash Out By Account</span>
                <div className="space-y-1 overflow-y-auto pr-1 custom-scrollbar text-xs font-mono">
                  <div className="flex justify-between items-center"><span className="text-slate-600">Banks:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.cashOut['Bank'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">Cash:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.cashOut['Cash on Hand'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">Vault:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.cashOut['Main Vault'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">E-Wallet:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.cashOut['E-Wallet'] || 0)}</span></div>
                </div>
              </div>
            </div>
          </motion.div>
          {/* Box 4 */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
            }}
            className="uiverse-parent"
          >
            <div 
              className="uiverse-card card-sky"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setSelectedStatus('approved');
              }}
            >
              <div className="uiverse-front">
                <div className="uiverse-logo">
                    <span className="uiverse-circle uiverse-circle1"></span>
                    <span className="uiverse-circle uiverse-circle2"></span>
                    <span className="uiverse-circle uiverse-circle3"></span>
                    <span className="uiverse-circle uiverse-circle4"></span>
                </div>
                <div className="uiverse-glass"></div>
                <div className="uiverse-content">
                    <span className="uiverse-title text-sky-900">Ending Treasury Balance (=)</span>
                    <AnimatedCounter value={balanceSummary.ending} className="uiverse-text text-sky-950" />
                </div>
              </div>
              <div className="uiverse-back">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold mb-2">Current Total Balances</span>
                <div className="space-y-1 overflow-y-auto pr-1 custom-scrollbar text-xs font-mono">
                  <div className="flex justify-between items-center"><span className="text-slate-600">Banks:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.ending['Bank'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">Cash:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.ending['Cash on Hand'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">Vault:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.ending['Main Vault'] || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600">E-Wallet:</span> <span className="font-bold">{formatPeso(balanceSummary.breakdown.ending['E-Wallet'] || 0)}</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ACTION HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/40 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono uppercase">Corporate Transaction Ledger</h1>
          <p className="text-xs text-slate-600 mt-1 font-mono italic">Record payments, income statements, corrections, and verify attached vouchers.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 no-print">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 hover:text-black text-slate-700 border border-slate-200 hover:border-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-150 cursor-pointer shadow-md select-none"
            title="Import CSV"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleCsvFileChange} 
            accept=".csv,.xlsx,.xls" 
            className="hidden" 
          />

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

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-8 gap-3">
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
              <option value="cash_in" className="bg-white">Inflow / Gross Sales</option>
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
          <div className="sm:col-span-2 lg:col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Date Range</span>
              <select 
                onChange={(e) => {
                  const val = e.target.value;
                  const today = new Date();
                  if (val === 'today') {
                    const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  } else if (val === 'this_week') {
                    const first = today.getDate() - today.getDay();
                    const firstDay = new Date(today.setDate(first));
                    const lastDay = new Date(today.setDate(first + 6));
                    setStartDate(new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
                    setEndDate(new Date(lastDay.getTime() - lastDay.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
                  } else if (val === 'this_month') {
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    setStartDate(new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
                    setEndDate(new Date(lastDay.getTime() - lastDay.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
                  } else if (val === 'last_month') {
                    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                    setStartDate(new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
                    setEndDate(new Date(lastDay.getTime() - lastDay.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
                  } else if (val === 'all_time') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="text-[9px] bg-slate-50 border border-slate-200 py-0.5 px-1.5 rounded text-slate-600 font-mono tracking-widest cursor-pointer uppercase focus:outline-hidden"
                value={(!startDate && !endDate) ? 'all_time' : 'custom'}
              >
                <option value="custom">Custom</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="all_time">All Time</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl transition-all"
                title="Start Date"
              />
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 text-slate-900 text-xs font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-xl transition-all"
                title="End Date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* DISPLAYED LIST SUMMARY */}
      <div className="flex gap-4 p-4 bg-white border border-sky-500/20 rounded-2xl shadow-inner mb-4 no-print sm:flex-row flex-col justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full"></div>
        <div className="text-slate-600 font-mono text-xs max-w-sm">
          <strong className="text-sky-400 block uppercase tracking-wider mb-1">Displayed Search Results</strong>
          Totals below include APPROVED / COMPLETED transactions only from the currently filtered table. Pending and rejected entries are excluded from Net Balance and shown separately.
        </div>
        <div className="grid grid-cols-3 gap-6 sm:gap-12 relative z-10 w-full sm:w-auto text-center sm:text-right">
          <div>
            <div className="text-[10px] font-bold text-[#00B67A] uppercase tracking-widest font-mono">Posted Inflow</div>
            <div className="font-mono text-lg text-[#00B67A] font-bold">{formatPeso(filteredSummary.inflow)}</div>
            {filteredSummary.pendingInflow > 0 && (
              <div className="text-[9px] text-amber-500 font-mono mt-0.5">+{formatPeso(filteredSummary.pendingInflow)} pending</div>
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold text-rose-450 uppercase tracking-widest font-mono">Posted Outflow</div>
            <div className="font-mono text-lg text-rose-450 font-bold">{formatPeso(filteredSummary.outflow)}</div>
            {filteredSummary.pendingOutflow > 0 && (
              <div className="text-[9px] text-amber-500 font-mono mt-0.5">+{formatPeso(filteredSummary.pendingOutflow)} pending</div>
            )}
          </div>
          <div className="border-l border-slate-200 pl-6 sm:pl-12">
            <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest font-mono">Net Balance</div>
            <div className={`font-mono text-xl font-bold ${filteredSummary.net >= 0 ? 'text-slate-900' : 'text-rose-400'}`}>{formatPeso(filteredSummary.net)}</div>
            {(filteredSummary.rejectedInflow > 0 || filteredSummary.rejectedOutflow > 0) && (
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">{formatPeso(filteredSummary.rejectedInflow + filteredSummary.rejectedOutflow)} rejected (excluded)</div>
            )}
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
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((t) => {
                  // Find category label
                  const catName = t.transferRef ? (t.type === 'cash_in' ? 'Incoming Transfer' : 'Outgoing Transfer') : (categories.find(c => c.id === t.categoryId)?.name || 'Operations');
                  const encoderEmail = profiles.find(p => p.id === t.encodedBy)?.email || 'finance@sys.com';
                  const txnAttachments = vaultAttachments.filter(a => a.entityId === t.id && a.entityType === 'transaction');

                  return (
                    <tr key={t.id} className="even:bg-slate-50 odd:bg-white hover:!bg-sky-50 transition-colors">
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
                            {t.tags?.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg font-mono text-[8px] font-semibold uppercase">
                                {tag}
                              </span>
                            ))}
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
                        {t.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg font-mono font-bold tracking-wider uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>COMPLETED</span>
                          </span>
                        )}
                        {t.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] bg-sky-500/10 text-sky-500 border border-sky-500/20 rounded-lg font-mono font-bold tracking-wider uppercase">
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
                      <td className="p-3 text-right whitespace-nowrap no-print space-x-2">
                        {t.status === 'approved' && !t.reversalOf && (
                          <>
                            <button 
                              onClick={() => handleMarkCompleted(t.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] border border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white rounded-lg transition-all font-mono uppercase tracking-wider cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Mark Completed</span>
                            </button>
                            <button 
                              onClick={() => handleReversal(t.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] border border-slate-200 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg transition-all font-mono uppercase tracking-wider cursor-pointer"
                            >
                              <RefreshCcw className="w-3 h-3 text-slate-500" />
                              <span>Intelligent Reverse</span>
                            </button>
                          </>
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

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="text-xs font-mono text-slate-500">
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold font-mono hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold font-mono hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
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

      {/* CSV IMPORT MAPPING MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
          >
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 uppercase tracking-widest font-mono text-sm">Map CSV Columns</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-mono mb-4">Select the column from your file that matches each required field.</p>
              
              {['date', 'amount', 'description', 'type', 'category'].map((field) => (
                <div key={field} className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    {field}
                  </label>
                  <select
                    value={(csvMapping as any)[field]}
                    onChange={(e) => setCsvMapping({ ...csvMapping, [field]: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#00B67A] rounded-xl font-mono cursor-pointer"
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <button
                onClick={handleDownloadCsvTemplate}
                className="px-4 py-2 text-xs font-bold text-sky-600 uppercase tracking-wider hover:bg-sky-50 rounded-xl transition cursor-pointer"
              >
                Download CSV Template
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportCsvData}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#00B67A] hover:bg-[#009E6B] uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
                >
                  Import Data
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
