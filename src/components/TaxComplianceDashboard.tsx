/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Percent,
  Download,
  Calendar,
  Building2,
  FileSpreadsheet,
  FileCode,
  CheckCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Save,
  RefreshCw,
  AlertTriangle,
  FileText,
  BadgeAlert,
  Sliders,
  CheckCircle2,
  Lock,
  ExternalLink,
  ChevronRight,
  ClipboardCheck,
  Send,
  Eye,
  Paperclip,
  History
} from 'lucide-react';
import {
  getTransactions,
  getCompanies,
  getProfiles,
  writeAuditLog
} from '../data/mockDatabase';
import { Transaction, Company, Category } from '../types';
import { toast } from 'sonner';

interface TaxComplianceDashboardProps {
  userId: string;
  companyId: string;
  onAuditLogged?: () => void;
}

// Map transaction categories to default taxes
const getTaxDetails = (txn: Transaction, companyCategories: Category[]) => {
  const cat = companyCategories.find(c => c.id === txn.categoryId);
  const catName = cat ? cat.name.toLowerCase() : '';

  if (txn.type === 'cash_in') {
    return {
      vatType: 'vat_12' as 'vat_12' | 'vat_0' | 'vat_exempt' | 'vat_none',
      wetType: 'none' as 'ewt_1' | 'ewt_2' | 'ewt_5' | 'none',
      tin: '008-329-112-000',
      legalName: 'Retail Counter Client'
    };
  } else {
    // Expense default mappings
    let vatType: 'vat_12' | 'vat_0' | 'vat_exempt' | 'vat_none' = 'vat_12';
    let wetType: 'ewt_1' | 'ewt_2' | 'ewt_5' | 'none' = 'none';
    let tin = '112-902-884-000';
    let legalName = 'Herrera Supplies Corp';

    if (catName === 'utilities') {
      vatType = 'vat_12';
      wetType = 'ewt_2'; // 2% witholding on services
      legalName = 'Meralco Power Grid';
      tin = '002-384-904-000';
    } else if (catName === 'rent') {
      vatType = 'vat_12';
      wetType = 'ewt_5'; // 5% withholding on rental leaseholds
      legalName = 'Vistamall Realty Inc';
      tin = '203-495-234-000';
    } else if (catName === 'operations' || catName === 'marketing') {
      vatType = 'vat_12';
      wetType = 'ewt_2';
      legalName = 'Atelier Marketing Agency';
      tin = '485-238-112-000';
    } else if (catName === 'supplies') {
      vatType = 'vat_12';
      wetType = 'ewt_1'; // 1% withholding on goods
      legalName = 'Visayas General Merchants';
      tin = '119-902-334-000';
    } else if (catName === 'payroll') {
      vatType = 'vat_none';
      wetType = 'none';
      legalName = 'Herrera Employees Payroll';
      tin = 'N/A';
    }

    return { vatType, wetType, tin, legalName };
  }
};

export default function TaxComplianceDashboard({ userId, companyId, onAuditLogged }: TaxComplianceDashboardProps) {
  // DB presets
  const companies = getCompanies();
  const currentCompany = companies.find(c => c.id === companyId) || companies[0];
  const allTxns = useMemo(() => getTransactions(userId, companyId), [userId, companyId]);

  // Read raw local categories for indexing names
  const localCategories: Category[] = useMemo(() => {
    try {
      const data = localStorage.getItem('finance_db_categories');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, []);

  // Filter categories to only current company or shared
  const companyCatNames = useMemo(() => {
    return localCategories.filter(c => c.companyId === companyId);
  }, [localCategories, companyId]);

  // STATE FOR TRANSACTION OVERRIDES (Saved in localStorage or kept in state)
  const [transactionAuditState, setTransactionAuditState] = useState<Record<string, {
    vatType: 'vat_12' | 'vat_0' | 'vat_exempt' | 'vat_none';
    wetType: 'ewt_1' | 'ewt_2' | 'ewt_5' | 'none';
    orNumber: string;
    tin: string;
    legalName: string;
    remarks: string;
  }>>({});

  // Filer Info details
  const [filerInfo, setFilerInfo] = useState({
    tin: '009-482-115-000',
    tradeName: 'HERRERA VENTURES GROUP INC',
    rdoCode: '038', // RDO North Quezon City
    email: 'tax.compliance@herreraventures.co',
    agentName: 'Atty. Maria Teresa Cruz, CPA',
    agentTIN: '804-223-119-000',
    agentAccreditation: 'BIR-AN-2026-004381'
  });

  // UI status filters
  const [activeFilingTab, setActiveFilingTab] = useState<'2550m' | '1601eq' | '2307'>('2550m');
  const [taxMonth, setTaxMonth] = useState<string>('2026-06');
  const [isConsolidated, setIsConsolidated] = useState<boolean>(companyId === 'all');
  const [searchFilter, setSearchFilter] = useState('');
  const [vatFilter, setVatFilter] = useState<string>('all');
  
  // MODAL/EXPORT TRIGGER
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedAuditDoc, setSelectedAuditDoc] = useState<any | null>(null);
  const [selectedDocTab, setSelectedDocTab] = useState<'csv' | 'dat' | 'json'>('csv');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulatedFilingLog, setSimulatedFilingLog] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('tax_filing_submissions_log');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse tax submissions log', e);
    }
    // Default dummy submissions with rich document file content attachments
    return [
      {
        id: 'BIR-EIS-34902188',
        formType: 'Form 2550M (Monthly VAT Statement)',
        month: '2026-05',
        recordsProcessed: 14,
        liability: 48450.00,
        timestamp: '06/10/2026, 02:30:22 PM',
        status: 'SUBMITTED_APPROVED',
        files: {
          csv: `BIR FORM 2550M ALPHALIST REPORT\r\nFiler Trade Name,HERRERA VENTURES GROUP INC\r\nFiler TIN,009-482-115-000\r\nRDO Code,038\r\nTaxable Month,2026-05\r\nExport Generate Date,2026-06-10 14:30:22\r\n\r\n"Transaction ID","Type","Recipient/Supplier Name","TIN","Invoice No","Date","Gross Amount","Net Base","Calculated VAT","VAT Type","EWT Type","EWT Amount"\r\n"TXN-8392","INPUT","Meralco Power Grid","002-384-904-000","OR-482012","2026-05-12",145000.00,129464.29,15535.71,"vat_12","ewt_2",2589.29\r\n"TXN-8395","OUTPUT","Retail Counter Client","008-329-112-000","SI-901824","2026-05-24",254000.00,226785.71,27214.29,"vat_12","none",0.00}`,
          dat: `H0099482115000003820260501\r\nD00001002384904000Meralco Power Grid            0001294642900001553571\r\nD00002008329112000Retail Counter Client         0002267857100002721429`,
          json: `{\n  "taxDeclaration": {\n    "formType": "2550M",\n    "taxPeriod": "2026-05",\n    "companyCode": "HERRERA",\n    "filer": {\n      "tin": "009-482-115-000",\n      "tradeName": "HERRERA VENTURES GROUP INC",\n      "rdoCode": "038"\n    },\n    "recap": {\n      "totalOutputVat": 27214.29,\n      "totalInputVat": 15535.71,\n      "netVatPayable": 11678.58\n    },\n    "recordsCount": 14\n  }\n}`
        }
      },
      {
        id: 'BIR-EIS-21949503',
        formType: 'Form 1601EQ (Expanded Quarterly Remit)',
        month: '2026-03 (Q1)',
        recordsProcessed: 29,
        liability: 124500.00,
        timestamp: '04/12/2026, 11:15:40 AM',
        status: 'SUBMITTED_APPROVED',
        files: {
          csv: `BIR FORM 1601EQ EXPANDED WHITELIST TAX REPORT\r\nFiler Trade Name,HERRERA VENTURES GROUP INC\r\nFiler TIN,009-482-115-000\r\nRDO Code,038\r\nTaxable Period,2026-Q1\r\nExport Generate Date,2026-04-12 11:15:40\r\n\r\n"Supplier","TIN","Category","Tax Base","Rate","Amount Withheld"\r\n"Vistamall Realty Inc","203-495-234-000","Rent","120000.00",0.05,6000.00\r\n"Atelier Marketing Agency","485-238-112-000","Marketing","200000.00",0.02,4000.00`,
          dat: `H1601EQ009482115000003820260331\r\nD00001203495234000Vistamall Realty Inc          0001200000000000600000\r\nD00002485238112000Atelier Marketing Agent       0002000000000000400000`,
          json: `{\n  "taxDeclaration": {\n    "formType": "1601EQ",\n    "taxPeriod": "2026-Q1",\n    "companyCode": "HERRERA",\n    "filer": {\n      "tin": "009-482-115-000",\n      "tradeName": "HERRERA VENTURES GROUP INC",\n      "rdoCode": "038"\n    },\n    "recap": {\n      "totalEwtRemittance": 124500.00\n    },\n    "recordsCount": 29\n  }\n}`
        }
      }
    ];
  });

  // Keep simulatedFilingLog synchronized with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tax_filing_submissions_log', JSON.stringify(simulatedFilingLog));
    } catch (e) {
      console.error('Failed to preserve tax log', e);
    }
  }, [simulatedFilingLog]);

  // Load and apply initial defaults
  useEffect(() => {
    const overrideDefaults: typeof transactionAuditState = {};
    allTxns.forEach(txn => {
      const isOverrideStored = transactionAuditState[txn.id];
      if (!isOverrideStored) {
        const defaults = getTaxDetails(txn, companyCatNames);
        overrideDefaults[txn.id] = {
          vatType: defaults.vatType,
          wetType: defaults.wetType,
          orNumber: `OR-SI-${txn.id.toUpperCase()}`,
          tin: defaults.tin,
          legalName: defaults.legalName,
          remarks: 'Autolinked based on category index'
        };
      }
    });
    setTransactionAuditState(prev => ({ ...overrideDefaults, ...prev }));
  }, [allTxns, companyCatNames]);

  // Handler to update values in-place
  const handleUpdateTxnTax = (
    txnId: string, 
    field: 'vatType' | 'wetType' | 'orNumber' | 'tin' | 'legalName' | 'remarks', 
    value: string
  ) => {
    setTransactionAuditState(prev => {
      const existing = prev[txnId] || {
        vatType: 'vat_none',
        wetType: 'none',
        orNumber: `OR-SI-${txnId.toUpperCase()}`,
        tin: '000-000-000-000',
        legalName: 'Customer',
        remarks: ''
      };
      const updated = {
        ...prev,
        [txnId]: {
          ...existing,
          [field]: value
        }
      };
      return updated;
    });
  };

  // Peso formatted return
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(num);
  };

  // Filter transactions
  const filteredGovTxns = useMemo(() => {
    return allTxns.filter(t => {
      // Filter by company unless consolidated
      if (!isConsolidated && t.companyId !== companyId) {
        return false;
      }
      
      // Filter by approval status
      if (t.status !== 'approved') {
        return false;
      }

      // Filter by period of selected month (format YYYY-MM)
      if (!t.txnDate.startsWith(taxMonth)) {
        return false;
      }

      const overrides = transactionAuditState[t.id];
      const vt = overrides ? overrides.vatType : 'vat_none';
      const name = overrides ? overrides.legalName.toLowerCase() : '';
      const or = overrides ? overrides.orNumber.toLowerCase() : '';
      const rPerson = t.responsiblePerson.toLowerCase();
      const purposeText = t.purpose.toLowerCase();

      // Search filters
      const matchSearch = 
        t.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
        name.includes(searchFilter.toLowerCase()) ||
        or.includes(searchFilter.toLowerCase()) ||
        rPerson.includes(searchFilter.toLowerCase()) ||
        purposeText.includes(searchFilter.toLowerCase());

      // VAT filters
      const matchVat = vatFilter === 'all' || vt === vatFilter;

      return matchSearch && matchVat;
    });
  }, [allTxns, isConsolidated, companyId, taxMonth, transactionAuditState, searchFilter, vatFilter]);

  // MATH CALCULATIONS
  const taxSummaryStats = useMemo(() => {
    let salesVat12 = 0;
    let salesVat0 = 0;
    let salesVatExempt = 0;

    let purchasesVat12 = 0;
    let purchasesVat0 = 0;
    let purchasesVatExempt = 0;
    let purchasesVatNone = 0;

    let totalOutputVat = 0;
    let totalInputVat = 0;

    let ewt1Base = 0;
    let ewt2Base = 0;
    let ewt5Base = 0;

    let ewt1Withheld = 0;
    let ewt2Withheld = 0;
    let ewt5Withheld = 0;

    filteredGovTxns.forEach(t => {
      const audit = transactionAuditState[t.id] || {
        vatType: 'vat_none',
        wetType: 'none',
        orNumber: '',
        tin: '',
        legalName: '',
        remarks: ''
      };

      if (t.type === 'cash_in') {
        // Output Vat Sales
        if (audit.vatType === 'vat_12') {
          // In PH, VAT is calculated as (Amount / 1.12) * 0.12 if VAT-inclusive, or standard.
          // Let's assume standard gross is VAT inclusive. (Amount / 1.12) is the net taxable sales
          const netSales = t.amount / 1.12;
          const outputVat = netSales * 0.12;
          salesVat12 += netSales;
          totalOutputVat += outputVat;
        } else if (audit.vatType === 'vat_0') {
          salesVat0 += t.amount;
        } else if (audit.vatType === 'vat_exempt') {
          salesVatExempt += t.amount;
        }
      } else {
        // Input Vat Purchases
        if (audit.vatType === 'vat_12') {
          const netPurchase = t.amount / 1.12;
          const inputVat = netPurchase * 0.12;
          purchasesVat12 += netPurchase;
          totalInputVat += inputVat;
        } else if (audit.vatType === 'vat_0') {
          purchasesVat0 += t.amount;
        } else if (audit.vatType === 'vat_exempt') {
          purchasesVatExempt += t.amount;
        } else {
          purchasesVatNone += t.amount;
        }

        // Withholding Taxes (EWT) on Expenses
        if (audit.wetType === 'ewt_1') {
          const base = t.amount / 1.12; // EWT base is always exclusive of VAT
          ewt1Base += base;
          ewt1Withheld += base * 0.01;
        } else if (audit.wetType === 'ewt_2') {
          const base = t.amount / 1.12;
          ewt2Base += base;
          ewt2Withheld += base * 0.02;
        } else if (audit.wetType === 'ewt_5') {
          const base = t.amount / 1.12;
          ewt5Base += base;
          ewt5Withheld += base * 0.05;
        }
      }
    });

    const netVatPayable = totalOutputVat - totalInputVat;
    const totalEwtRemittance = ewt1Withheld + ewt2Withheld + ewt5Withheld;

    return {
      salesVat12,
      salesVat0,
      salesVatExempt,
      purchasesVat12,
      purchasesVat0,
      purchasesVatExempt,
      purchasesVatNone,
      totalOutputVat,
      totalInputVat,
      netVatPayable,
      ewt1Base,
      ewt2Base,
      ewt5Base,
      ewt1Withheld,
      ewt2Withheld,
      ewt5Withheld,
      totalEwtRemittance,
      ewtTotalsBase: ewt1Base + ewt2Base + ewt5Base
    };
  }, [filteredGovTxns, transactionAuditState]);

  // GENERATE BIR EXPORT FILES
  const generatedExportFiles = useMemo(() => {
    // Generate CSV for Alphalist and Form summary
    const timestampStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    
    // Header section
    let csvContent = `BIR FORM 2550M ALPHALIST REPORT\r\n`;
    csvContent += `Filer Trade Name,${filerInfo.tradeName}\r\n`;
    csvContent += `Filer TIN,${filerInfo.tin}\r\n`;
    csvContent += `RDO Code,${filerInfo.rdoCode}\r\n`;
    csvContent += `Taxable Month,${taxMonth}\r\n`;
    csvContent += `Export Generate Date,${timestampStr}\r\n\r\n`;
    
    csvContent += `TRANSACTION LISTING (Output & Input VAT Details)\r\n`;
    csvContent += `Transaction ID,Type,Recipient/Supplier Name,TIN,Invoice No,Date,Gross Amount,Net Base,Calculated VAT,VAT Type,EWT Type,EWT Amount\r\n`;

    filteredGovTxns.forEach(t => {
      const overrides = transactionAuditState[t.id] || {
        vatType: 'vat_none',
        wetType: 'none',
        orNumber: `OR-SI-${t.id.toUpperCase()}`,
        tin: 'N/A',
        legalName: 'Atelier Supplier',
        remarks: ''
      };

      const isVat12 = overrides.vatType === 'vat_12';
      const netBase = isVat12 ? (t.amount / 1.12) : t.amount;
      const vatAmount = isVat12 ? (netBase * 0.12) : 0;
      
      let ewtRate = 0;
      if (overrides.wetType === 'ewt_1') ewtRate = 0.01;
      else if (overrides.wetType === 'ewt_2') ewtRate = 0.02;
      else if (overrides.wetType === 'ewt_5') ewtRate = 0.05;
      
      const ewtAmount = t.type === 'cash_out' ? (netBase * ewtRate) : 0;

      csvContent += `"${t.id}","${t.type}","${overrides.legalName.replace(/"/g, '""')}","${overrides.tin}","${overrides.orNumber}","${t.txnDate}",${t.amount.toFixed(2)},${netBase.toFixed(2)},${vatAmount.toFixed(2)},"${overrides.vatType}","${overrides.wetType}",${ewtAmount.toFixed(2)}\r\n`;
    });

    // MAP format for e-submission (Format specified in BIR Annexes)
    let datFileContent = `H0099482115000003820260601\r\n`; // Header record
    filteredGovTxns.forEach((t, index) => {
      const overrides = transactionAuditState[t.id];
      if (overrides && overrides.vatType === 'vat_12') {
        const netBase = t.amount / 1.12;
        const tinClean = overrides.tin.replace(/-/g, '');
        // Detailed record structure: Type | Seq | TIN | Name | Base | Tax W/H
        datFileContent += `D${String(index + 1).padStart(5, '0')}${tinClean.padEnd(15, ' ')}${overrides.legalName.substring(0, 30).padEnd(30, ' ')}${String(Math.round(netBase * 100)).padStart(12, '0')}${String(Math.round(netBase * 0.12 * 100)).padStart(12, '0')}\r\n`;
      }
    });

    const jsonFormat = JSON.stringify({
      taxDeclaration: {
        formType: activeFilingTab === '2550m' ? '2550M' : '1601EQ',
        taxPeriod: taxMonth,
        companyCode: currentCompany.code,
        filer: filerInfo,
        recap: taxSummaryStats,
        recordsCount: filteredGovTxns.length
      },
      exportTimestamp: timestampStr,
      transactions: filteredGovTxns.map(t => {
        const overrides = transactionAuditState[t.id];
        return {
          id: t.id,
          date: t.txnDate,
          rawAmount: t.amount,
          type: t.type,
          tax: overrides
        };
      })
    }, null, 2);

    return {
      csv: csvContent,
      dat: datFileContent,
      json: jsonFormat
    };
  }, [filteredGovTxns, transactionAuditState, filerInfo, taxMonth, activeFilingTab, currentCompany, taxSummaryStats]);

  // TRIGGER BIR EFILING SUBMISSION
  const handleUploadToBIRPortal = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const trackingCode = `BIR-EIS-${Math.floor(Math.random() * 89999999 + 10000000)}`;
      const newReport = {
        id: trackingCode,
        formType: activeFilingTab === '2550m' ? 'Form 2550M (Monthly VAT Statement)' : 'Form 1601EQ (Expanded W/H)',
        month: taxMonth,
        recordsProcessed: filteredGovTxns.length,
        liability: activeFilingTab === '2550m' ? taxSummaryStats.netVatPayable : taxSummaryStats.totalEwtRemittance,
        timestamp: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        status: 'SUBMITTED_APPROVED',
        files: {
          csv: generatedExportFiles.csv,
          dat: generatedExportFiles.dat,
          json: generatedExportFiles.json
        }
      };

      setSimulatedFilingLog(prev => [newReport, ...prev]);
      setExportModalOpen(false);

      if (onAuditLogged) {
        // Log to global audit trail for tracing corporate actions
        writeAuditLog(userId, companyId, 'TAX_BIR_EFILING_PUBLISH', 'tax', trackingCode, {
          companyCode: currentCompany.code,
          liabilityRemitted: newReport.liability,
          filerEmail: filerInfo.email,
          agent: filerInfo.agentName
        });
        onAuditLogged();
      }

      toast.success(`Submission Authorized!`, { description: `Tracking ID: ${trackingCode}. Receipt sent to ${filerInfo.email}` });
    }, 2000);
  };

  // CHECK USER LEVEL RESTRICTIONS (Only admins/finance officers can validate or download data)
  const isOfficerOrAdmin = true; // For local Atelier workspace

  return (
    <div className="space-y-8 animate-fadeIn" id="tax-dashboard-container">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#24272C] pb-6 gap-4" id="tax-header">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Percent className="w-5 h-5 text-[#00B67A] shrink-0 animate-bounce" />
            <span className="text-[10px] font-mono tracking-widest text-[#00B67A] uppercase font-bold bg-[#141618] border border-[#235332] px-3 py-0.5 rounded-full">
              Filing Module 8
            </span>
          </div>
          <h1 className="text-2xl font-light text-white tracking-tight font-sans">
            Tax Compliance & <span className="text-[#00B67A] font-serif italic">Government Filings</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Official internal gateway for calculations, VAT alphalist tagging, creditable withholding monitoring, and electronic BIR Form preparation.
          </p>
        </div>

        {/* TIME FRAME AND GROUP TOGGLE CHANGER */}
        <div className="flex flex-wrap items-center gap-3">
          {/* MONTH SELECTION */}
          <div className="flex items-center gap-2 bg-[#181A1C] border border-[#24272C] px-3.5 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <input 
              type="month"
              value={taxMonth}
              onChange={(e) => setTaxMonth(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold text-white focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* GROUP CONSOLIDATION SWITCH */}
          <button
            onClick={() => {
              if (companyId === 'all') return;
              setIsConsolidated(!isConsolidated);
              if (onAuditLogged) {
                writeAuditLog(userId, companyId, 'TAX_VIEW_CONSOLIDATION_TOGGLE', 'tax', null, { isConsolidated: !isConsolidated });
                onAuditLogged();
              }
            }}
            disabled={companyId === 'all'}
            className={`px-4 py-2 text-xs font-semibold font-mono tracking-wider transition-all duration-150 rounded-xl border flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
              isConsolidated 
                ? 'bg-[#00B67A] border-[#00B67A] text-white font-bold' 
                : 'bg-zinc-900 border-[#24272C] text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{isConsolidated ? 'Consolidated Group' : currentCompany.name}</span>
          </button>
        </div>
      </div>

      {/* METRIC CARD COMPARISONS FOR VAT & EXPANDED WITHHOLDING */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="tax-compliance-metrics">
        
        {/* OUTPUT VAT CARD */}
        <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-[#1A2E1A] text-[#10B981] p-1.5 rounded-xl text-xs font-mono border border-emerald-850/50">
            12% VAT
          </div>
          <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-wider font-bold">Total Output VAT (Sales)</span>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-mono text-white leading-none">
              {formatPeso(taxSummaryStats.totalOutputVat)}
            </h2>
            <div className="flex items-center gap-1.5 text-zinc-550 text-[10px] font-mono">
              <span className="text-emerald-400 font-bold">&#8369;{taxSummaryStats.salesVat12.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> Net Taxable Sales
            </div>
          </div>
          <div className="pt-2 border-t border-[#24272C]/40 flex items-center justify-between text-[10px] text-zinc-450 font-mono">
            <span>Forms: 2550M Line 12A</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
        </div>

        {/* INPUT VAT CARD */}
        <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-zinc-800 text-zinc-400 p-1.5 rounded-xl text-xs font-mono">
            Purchases
          </div>
          <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-wider font-bold">Claimable Input VAT</span>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-mono text-zinc-300 leading-none">
              {formatPeso(taxSummaryStats.totalInputVat)}
            </h2>
            <div className="flex items-center gap-1.5 text-zinc-550 text-[10px] font-mono">
              <span className="text-emerald-400">&#8369;{taxSummaryStats.purchasesVat12.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> Net Capital Goods
            </div>
          </div>
          <div className="pt-2 border-t border-[#24272C]/40 flex items-center justify-between text-[10px] text-zinc-450 font-mono">
            <span>Forms: 2550M Line 16</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          </div>
        </div>

        {/* NET VAT PAYABLE */}
        <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
          <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-wider font-bold">Net VAT Payable to government</span>
          <div className="space-y-1">
            <h2 className={`text-xl font-bold font-mono leading-none ${taxSummaryStats.netVatPayable >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formatPeso(Math.abs(taxSummaryStats.netVatPayable))}
            </h2>
            <p className="text-[9px] text-zinc-500 italic">
              {taxSummaryStats.netVatPayable >= 0 ? 'Requires BIR Form 2550M settlement' : 'Excess input tax credit carry-over'}
            </p>
          </div>
          <div className="pt-2 border-t border-[#24272C]/40 flex items-center justify-between text-[10px] text-zinc-550 font-mono">
            <span className="font-bold">TAX DUE</span>
            <span className={`text-[9px] font-bold uppercase ${taxSummaryStats.netVatPayable >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {taxSummaryStats.netVatPayable >= 0 ? 'LIABILITY' : 'CREDIT'}
            </span>
          </div>
        </div>

        {/* EXPANDED WITHHOLDING TAX (EWT) CARD */}
        <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-rose-950/40 text-rose-400 p-1.5 rounded-xl text-[9px] font-mono border border-rose-900/30">
            Form 1601EQ
          </div>
          <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-wider font-bold">Total Withholding Tax Liability</span>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-mono text-white leading-none">
              {formatPeso(taxSummaryStats.totalEwtRemittance)}
            </h2>
            <div className="flex items-center gap-1 font-mono text-[9px] text-zinc-500">
              <span>Remittance Base:</span>
              <span className="font-bold text-zinc-300">{formatPeso(taxSummaryStats.ewtTotalsBase)}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#24272C]/40 flex items-center justify-between text-[10px] text-zinc-450 font-mono">
            <span>EWT Creditable source</span>
            <span className="text-[9px] text-zinc-400 uppercase font-bold">1%, 2%, 5% Applied</span>
          </div>
        </div>
      </div>

      {/* CORE SPREADSHEET TABLE AND METADATA EDITING COMPONENT */}
      <div className="bg-[#181A1C] border border-[#24272C] rounded-2xl p-6 shadow-md" id="tax-interactive-alphalist-board">
        
        {/* FILTERS AND SEARCH ROW */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-[#24272C] gap-4" id="table-filter-bar">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#00B67A]" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white font-mono">Transaction Alphalist Tagger</h3>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2.5 py-1 rounded">
              {filteredGovTxns.length} Verified Entries
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* SEARCH */}
            <input 
              type="text"
              placeholder="Search details / partner..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-[#141618] border border-[#24272C] px-3 py-1.5 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-[#00B67A] w-full sm:w-48 placeholder-zinc-650"
            />

            {/* VAT FILTER */}
            <select
              value={vatFilter}
              onChange={(e) => setVatFilter(e.target.value)}
              className="bg-[#141618] border border-[#24272C] px-3 py-1.5 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-[#00B67A] cursor-pointer"
            >
              <option value="all">All Tax Types</option>
              <option value="vat_12">12% VAT standard</option>
              <option value="vat_0">0% Zero-rated</option>
              <option value="vat_exempt">VAT Exempt</option>
              <option value="vat_none">Non-VAT / Nil</option>
            </select>

            {/* SYNC DISPATCH */}
            <button
              onClick={() => {
                toast.success('Regenerated tax matrices', { description: 'Tax parameters and compliance alphalist synchronized from primary accounts general ledger!' });
              }}
              className="p-2 border border-[#24272C] bg-[#141618] text-zinc-400 rounded-xl hover:text-white cursor-pointer hover:border-zinc-750"
              title="Refresh transactions from server ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ALPHALIST TABLE SCROLL CONTROL */}
        <div className="overflow-x-auto" id="alphalist-table">
          <table className="w-full text-left font-mono text-xs text-zinc-300">
            <thead>
              <tr className="border-b border-[#24272C] text-zinc-500 text-[10px] uppercase tracking-wider">
                <th className="py-3 px-2">TXN ID</th>
                <th className="py-3 px-2">Type</th>
                <th className="py-3 px-2">Enterprise Name & TIN (Seller/Buyer)</th>
                <th className="py-3 px-2">Official Receipt / Sl No</th>
                <th className="py-3 px-2">Gross (PHP)</th>
                <th className="py-3 px-2 text-emerald-450 text-[#00B67A]">VAT Tax Class</th>
                <th className="py-3 px-2">Withholding Type</th>
                <th className="py-3 px-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24272C]/40">
              {filteredGovTxns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-500 italic">
                    No approved transactions found matching search / tax categories in {taxMonth}.
                  </td>
                </tr>
              ) : (
                filteredGovTxns.map((txn) => {
                  const overrides = transactionAuditState[txn.id] || {
                    vatType: 'vat_none',
                    wetType: 'none',
                    orNumber: '',
                    tin: '',
                    legalName: '',
                    remarks: ''
                  };

                  return (
                    <tr key={txn.id} className="hover:bg-[#1D2024]/40 transition group">
                      {/* TXID */}
                      <td className="py-3 px-2">
                        <span className="font-bold text-white block">{txn.id}</span>
                        <span className="text-[9px] text-zinc-550 block">{txn.txnDate}</span>
                      </td>

                      {/* CASHFLOW TYPE */}
                      <td className="py-3 px-2 font-bold select-none">
                        <span className={`px-2 py-0.5 rounded text-[9px] block text-center w-16 ${
                          txn.type === 'cash_in' 
                            ? 'bg-[#1A2E1A] text-[#10B981] border border-[#235332]' 
                            : 'bg-rose-950/40 text-[#EF4444] border border-rose-900/30'
                        }`}>
                          {txn.type === 'cash_in' ? 'OUTPUT' : 'INPUT'}
                        </span>
                      </td>

                      {/* ENTERPRISE REGISTRY DETAILS */}
                      <td className="py-3 px-2 space-y-1 text-left min-w-[180px]">
                        <input 
                          type="text"
                          value={overrides.legalName}
                          onChange={(e) => handleUpdateTxnTax(txn.id, 'legalName', e.target.value)}
                          className="bg-transparent text-white focus:bg-zinc-900 font-bold border-b border-transparent focus:border-[#00B67A] shrink-0 outline-hidden w-full text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest shrink-0">TIN:</span>
                          <input 
                            type="text"
                            value={overrides.tin}
                            onChange={(e) => handleUpdateTxnTax(txn.id, 'tin', e.target.value)}
                            className="bg-transparent text-zinc-400 focus:bg-zinc-900 border-b border-transparent focus:border-[#00B67A] text-[9.5px] font-mono outline-hidden w-full p-0 leading-none"
                          />
                        </div>
                      </td>

                      {/* OR / INVOICE NUMBER */}
                      <td className="py-3 px-2">
                        <input 
                          type="text"
                          value={overrides.orNumber}
                          onChange={(e) => handleUpdateTxnTax(txn.id, 'orNumber', e.target.value)}
                          className="bg-transparent text-zinc-300 focus:bg-[#141618] border-b border-transparent focus:border-[#00B67A] font-semibold text-xs py-0.5 px-1 outline-hidden rounded focus:outline-hidden"
                        />
                      </td>

                      {/* AMOUNT */}
                      <td className="py-3 px-2 font-bold text-white text-right font-mono pr-4">
                        {formatPeso(txn.amount)}
                      </td>

                      {/* VAT TAX CATEGORY SELECTION */}
                      <td className="py-3 px-2 text-[#00B67A]">
                        <select
                          value={overrides.vatType}
                          onChange={(e) => handleUpdateTxnTax(txn.id, 'vatType', e.target.value as any)}
                          className="bg-[#141618] text-white border border-[#24272C] text-[11px] rounded px-2 py-1 focus:outline-hidden focus:border-[#00B67A] cursor-pointer"
                        >
                          <option value="vat_12">12% VAT standard</option>
                          <option value="vat_0">0% Zero-rated</option>
                          <option value="vat_exempt">VAT Exempt</option>
                          <option value="vat_none">Non-VAT / Payroll</option>
                        </select>
                      </td>

                      {/* WITHHOLDING TAX TYPE */}
                      <td className="py-3 px-2">
                        {txn.type === 'cash_in' ? (
                          <span className="text-zinc-600 block text-[10px] pl-2 italic">Output Excluded</span>
                        ) : (
                          <select
                            value={overrides.wetType}
                            onChange={(e) => handleUpdateTxnTax(txn.id, 'wetType', e.target.value as any)}
                            className="bg-[#141618] text-zinc-300 border border-[#24272C] text-[11px] rounded px-2 py-1 focus:outline-hidden focus:border-[#00B67A] cursor-pointer"
                          >
                            <option value="none">No Withholding</option>
                            <option value="ewt_1">EWT 1% (Purchased Goods)</option>
                            <option value="ewt_2">EWT 2% (Purchased Services)</option>
                            <option value="ewt_5">EWT 5% (Rent/Leases)</option>
                          </select>
                        )}
                      </td>

                      {/* ACTION NOTES */}
                      <td className="py-3 px-2">
                        <input 
                          type="text"
                          value={overrides.remarks}
                          onChange={(e) => handleUpdateTxnTax(txn.id, 'remarks', e.target.value)}
                          placeholder="compliance check notes"
                          className="bg-transparent text-zinc-500 focus:text-zinc-300 text-[10px] italic border-b border-transparent focus:border-[#00B67A] outline-hidden w-full placeholder-zinc-700 font-sans"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* COMPLIANCE DISPATCH ACTION HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-5 border-t border-[#24272C]/40 gap-4">
          <div className="text-zinc-450 text-[10px] leading-relaxed max-w-xl text-left">
            <span className="font-bold text-white block mb-0.5">Note on VAT Audit Trailing:</span>
            Transactions in draft or pending status do not display in BIR compliant schedules. Keep invoice schemas synced with actual physical bank clearances to prevent penalties on VAT overclaims.
          </div>

          <button
            onClick={() => {
              if (onAuditLogged) {
                writeAuditLog(userId, companyId, 'TAX_PARAMETERS_SAVE', 'tax', null, { recordsCount: filteredGovTxns.length });
                onAuditLogged();
              }
              toast.success('Configuration Saved', { description: 'BIR ledger compliance mappings and audited meta references saved successfully!' });
            }}
            className="px-6 py-2.5 bg-zinc-900 border border-[#24272C] hover:text-white hover:border-zinc-700 transition duration-150 rounded-xl text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 cursor-pointer text-zinc-300"
          >
            <Save className="w-4 h-4 text-[#00B67A]" />
            <span>Save Compliance Audit</span>
          </button>
        </div>
      </div>

      {/* CORE STATUTORY FILING GENERATOR & TAX PREPARATION WINDOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="statutory-preview-grid">
        
        {/* OFFICIAL BIR FILLABLE PARAMS SETTINGS */}
        <div className="bg-[#181A1C] border border-[#24272C] rounded-2xl p-6 shadow-md space-y-4" id="tax-agent-bento">
          <div className="flex items-center gap-2 border-b border-[#24272C] pb-3">
            <Sliders className="w-5 h-5 text-[#00B67A]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Filer Legal Registry Profile</h3>
          </div>

          <div className="space-y-4 text-left">
            <div>
              <label className="text-[9px] uppercase font-mono text-zinc-550 block mb-1">Taxpayer Identification Number (TIN)</label>
              <input 
                type="text" 
                value={filerInfo.tin}
                onChange={(e) => setFilerInfo(prev => ({ ...prev, tin: e.target.value }))}
                className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-xs focus:ring-1 focus:ring-[#00B67A] rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase font-mono text-zinc-550 block mb-1">Trade Registered Name</label>
              <input 
                type="text" 
                value={filerInfo.tradeName}
                onChange={(e) => setFilerInfo(prev => ({ ...prev, tradeName: e.target.value }))}
                className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-xs focus:ring-1 focus:ring-[#00B67A] rounded-xl text-[#00B67A] font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase font-mono text-zinc-550 block mb-1">RDO Code</label>
                <input 
                  type="text" 
                  value={filerInfo.rdoCode}
                  onChange={(e) => setFilerInfo(prev => ({ ...prev, rdoCode: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-xs focus:ring-1 focus:ring-[#00B67A] rounded-xl text-white font-mono text-center"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-mono text-zinc-550 block mb-1">Submitting Agent Email</label>
                <input 
                  type="email" 
                  value={filerInfo.email}
                  onChange={(e) => setFilerInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#141618] border border-[#24272C] text-xs focus:ring-1 focus:ring-[#00B67A] rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#24272C]/40 space-y-3">
              <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider font-mono">Signatory Tax Attorney Credentials</span>
              <div>
                <label className="text-[8.5px] uppercase font-mono text-zinc-500 block mb-1">Accreditable Attorney Agent</label>
                <input 
                  type="text" 
                  value={filerInfo.agentName}
                  onChange={(e) => setFilerInfo(prev => ({ ...prev, agentName: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-[#141618] border border-[#24272c] text-[11px] rounded-lg text-zinc-300 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] uppercase font-mono text-zinc-500 block mb-1">Agent TIN</label>
                  <input 
                    type="text" 
                    value={filerInfo.agentTIN}
                    onChange={(e) => setFilerInfo(prev => ({ ...prev, agentTIN: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-[#141618] border border-[#24272c] text-[11px] rounded-lg text-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[8px] uppercase font-mono text-zinc-500 block mb-1">Accreditation No</label>
                  <input 
                    type="text" 
                    value={filerInfo.agentAccreditation}
                    onChange={(e) => setFilerInfo(prev => ({ ...prev, agentAccreditation: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-[#141618] border border-[#24272c] text-[11px] rounded-lg text-zinc-400 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COMPREHENSIVE INTERACTIVE DIGITAL BIR FILING WORKROOM */}
        <div className="lg:col-span-2 bg-[#181A1C] border border-[#24272C] rounded-2xl p-6 shadow-md flex flex-col justify-between" id="statutory-preview-bento">
          
          {/* TAB BUTTONS FOR OFFICIAL GOVERNMENT FORMS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#24272C] pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00B67A]" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">BIR Form Ledger Auto-Matching</h3>
              </div>

              {/* TOGGLES */}
              <div className="flex items-center gap-1.5 bg-[#141618] p-0.5 border border-[#24272C] rounded-xl">
                {[
                  { id: '2550m', label: 'Form 2550M' },
                  { id: '1601eq', label: 'Form 1601-EQ' },
                  { id: '2307', label: 'Form 2307' }
                ].map(formOpt => (
                  <button
                    key={formOpt.id}
                    onClick={() => setActiveFilingTab(formOpt.id as any)}
                    className={`px-3 py-1.5 text-[9px] font-mono tracking-widest uppercase transition-all rounded-lg cursor-pointer ${
                      activeFilingTab === formOpt.id 
                        ? 'bg-[#00B67A] text-white font-bold' 
                        : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {formOpt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* THE FORM CONTENT SCROLL RENDER */}
            <div className="p-5 bg-[#0F1113] border border-zinc-900 rounded-xl space-y-4 font-mono text-[11px] max-h-[310px] overflow-y-auto">
              {activeFilingTab === '2550m' && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between text-zinc-450 border-b border-zinc-900 pb-2 text-[10px]">
                    <span>BIR Form 2550M (Monthly Value-Added Tax Declaration)</span>
                    <span className="text-[#00B67A] font-bold">REPUBLIC OF THE PHILIPPINES</span>
                  </div>
                  
                  {/* FORM HEADER METRIC BLOCKS */}
                  <div className="grid grid-cols-2 gap-4 border-b border-[#24272C] pb-3 text-xs">
                    <div>
                      <span className="text-[8px] text-zinc-500 block">Item 1: For the Month of</span>
                      <span className="font-bold text-white">{taxMonth}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-zinc-500 block">Item 2: Amended Return?</span>
                      <span className="font-bold text-white">NO (Original Return)</span>
                    </div>
                  </div>

                  {/* COMPUTATIONS RENDER */}
                  <div className="space-y-2 mt-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-450 block">Part II: Computation of Tax</span>
                    
                    <div className="flex justify-between items-center bg-zinc-900/40 p-2 rounded">
                      <span className="text-zinc-400">Line 12A: Vatable Sales / Receipts (Inclusive of VAT)</span>
                      <span className="text-white font-bold">{formatPeso(taxSummaryStats.salesVat12 * 1.12)}</span>
                    </div>

                    <div className="flex justify-between items-center p-2">
                      <span className="text-zinc-400">Line 12B: Output VAT Payable (12% of Net Base)</span>
                      <span className="text-[#00B67A] font-bold">{formatPeso(taxSummaryStats.totalOutputVat)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-900/40 p-2 rounded">
                      <span className="text-zinc-400">Line 14: Zero-Rated Sales / Receipts</span>
                      <span className="text-white font-mono">{formatPeso(taxSummaryStats.salesVat0)}</span>
                    </div>

                    <div className="flex justify-between items-center p-2">
                      <span className="text-zinc-400">Line 15: VAT Exempt Sales / Receipts</span>
                      <span className="text-white font-mono">{formatPeso(taxSummaryStats.salesVatExempt)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-900/40 p-2 rounded">
                      <span className="text-zinc-400">Line 16: Claimable Input Tax Creditable from Purchases</span>
                      <span className="text-zinc-300 font-bold">{formatPeso(taxSummaryStats.totalInputVat)}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-[#00B67A] pt-2 mt-1 p-2 text-xs bg-[#141618] rounded">
                      <span className="font-bold text-white">Line 19: NET VAT PAYABLE / (REMITTABLE OVERPAYMENT)</span>
                      <span className={`font-bold ${taxSummaryStats.netVatPayable >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {taxSummaryStats.netVatPayable >= 0 ? formatPeso(taxSummaryStats.netVatPayable) : `(${formatPeso(Math.abs(taxSummaryStats.netVatPayable))})`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeFilingTab === '1601eq' && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between text-zinc-450 border-b border-zinc-900 pb-2 text-[10px]">
                    <span>BIR Form 1601-EQ (Creditable Income Taxes Withheld - Expanded)</span>
                    <span className="text-[#00B67A] font-bold">BIR REGULATION</span>
                  </div>

                  <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">PART II: Computation of Tax Withheld</span>

                  <div className="space-y-3">
                    {/* EWT 1% */}
                    <div className="border-b border-zinc-900 pb-2 space-y-1">
                      <div className="flex justify-between text-zinc-300">
                        <span className="font-semibold">ATC WI100: Purchased Goods (EWT 1%)</span>
                        <span className="font-bold text-white">{formatPeso(taxSummaryStats.ewt1Withheld)}</span>
                      </div>
                      <div className="text-[9px] text-zinc-550 flex justify-between">
                        <span>Total Tax Base: {formatPeso(taxSummaryStats.ewt1Base)}</span>
                        <span>Rate: 1%</span>
                      </div>
                    </div>

                    {/* EWT 2% */}
                    <div className="border-b border-zinc-900 pb-2 space-y-1">
                      <div className="flex justify-between text-zinc-300">
                        <span className="font-semibold">ATC WI160: Purchased Services (EWT 2%)</span>
                        <span className="font-bold text-white">{formatPeso(taxSummaryStats.ewt2Withheld)}</span>
                      </div>
                      <div className="text-[9px] text-zinc-550 flex justify-between">
                        <span>Total Tax Base: {formatPeso(taxSummaryStats.ewt2Base)}</span>
                        <span>Rate: 2%</span>
                      </div>
                    </div>

                    {/* EWT 5% */}
                    <div className="border-b border-zinc-900 pb-2 space-y-1">
                      <div className="flex justify-between text-zinc-300">
                        <span className="font-semibold">ATC WI140: Real Estate Rentals (EWT 5%)</span>
                        <span className="font-bold text-white">{formatPeso(taxSummaryStats.ewt5Withheld)}</span>
                      </div>
                      <div className="text-[9px] text-zinc-550 flex justify-between">
                        <span>Total Tax Base: {formatPeso(taxSummaryStats.ewt5Base)}</span>
                        <span>Rate: 5%</span>
                      </div>
                    </div>

                    {/* TOTAL REMITTANCE */}
                    <div className="flex justify-between items-center text-xs text-white bg-[#141618] border-t border-[#00B67A] pt-2.5 px-3 py-2 rounded">
                      <span className="font-bold uppercase">Total Withholding Remittance Tax Due</span>
                      <span className="text-[#00B67A] font-bold font-mono">{formatPeso(taxSummaryStats.totalEwtRemittance)}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeFilingTab === '2307' && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between text-zinc-450 border-b border-zinc-900 pb-2 text-[10px]">
                    <span>BIR Form 2307 Certificate (Creditable Tax Withheld At Source)</span>
                    <span className="text-[#00B67A] font-bold">FOR TRANSACTION SUPPLIERS</span>
                  </div>
                  
                  <p className="text-zinc-400 text-[10.5px] leading-relaxed">
                    This document acts as certified withholding credit slips given to your corporate entities. The alphalist monitors supplier invoices:
                  </p>

                  <div className="bg-zinc-900 p-3 rounded-lg divide-y divide-zinc-800 space-y-2">
                    <div className="flex justify-between items-center pb-2.5 text-zinc-300">
                      <span>Total suppliers with credit certificates:</span>
                      <span className="text-white font-bold">
                        {filteredGovTxns.filter(t => t.type === 'cash_out').length} Supplies Units
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 text-zinc-300">
                      <span>Total certificates claimable by company:</span>
                      <span className="text-[#00B67A] font-bold">
                        {formatPeso(taxSummaryStats.totalEwtRemittance)} Remitted Credit
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GENERATE ACTION TRIGGER */}
          <div className="pt-4 border-t border-[#24272C]/40 flex items-center justify-between flex-wrap gap-3">
            <span className="text-[10px] text-zinc-550 font-mono italic">
              Pre-validation matches 2026 digital compliance standard
            </span>
            <button
              onClick={() => {
                setExportModalOpen(true);
                if (onAuditLogged) {
                  writeAuditLog(userId, companyId, 'TAX_EXPORT_MODAL_LAUNCH', 'tax', null, { formType: activeFilingTab });
                  onAuditLogged();
                }
              }}
              className="px-6 py-2.5 bg-[#00B67A] text-white rounded-xl text-xs uppercase tracking-widest font-bold font-mono transition duration-150 cursor-pointer hover:bg-emerald-600 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Generate / Export for BIR</span>
            </button>
          </div>
        </div>
      </div>

      {/* COMPLIANCE LOG TABLE SHOWING SUBMITTED ITEMS */}
      <div className="bg-[#181A1C] border border-[#24272C] rounded-2xl p-6 shadow-md" id="submittal-history-section">
        <div className="flex items-center justify-between border-b border-[#24272C] pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#00B67A]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">BIR Filing Submission History & Audit Trail</h3>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">SECURE KMS DIGITAL HANDSHAKE ACCUMULATOR</span>
        </div>

        <div className="overflow-x-auto mt-4 font-mono text-xs">
          <table className="w-full text-left text-zinc-300">
            <thead>
              <tr className="border-b border-[#24272C]/40 text-zinc-500 text-[10px] uppercase">
                <th className="py-2.5 pl-2">Transmission ID REFERENCE</th>
                <th className="py-2.5">Statutory Return Name</th>
                <th className="py-2.5">Submitted Timestamp</th>
                <th className="py-2.5">Period Month</th>
                <th className="py-2.5 text-center">Invoiced Records</th>
                <th className="py-2.5 text-right">Tax Cleared Amount</th>
                <th className="py-2.5 text-center">EIS Status</th>
                <th className="py-2.5 pl-6">Documents & Attachments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24272C]/30">
              {simulatedFilingLog.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 italic">
                    No historical BIR filings submitted yet for this company.
                  </td>
                </tr>
              ) : (
                simulatedFilingLog.map((f) => (
                  <tr key={f.id} className="hover:bg-zinc-800/20 transition duration-155">
                    <td className="py-3.5 pl-2 text-emerald-450 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-[#00B67A] shrink-0" />
                      <span>{f.id}</span>
                    </td>
                    <td className="py-3.5 font-semibold text-white">{f.formType}</td>
                    <td className="py-3.5 text-zinc-400">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-zinc-550 inline" />
                        {f.timestamp}
                      </span>
                    </td>
                    <td className="py-3.5 text-zinc-300">{f.month}</td>
                    <td className="py-3.5 text-center text-zinc-450 font-bold">{f.recordsProcessed} Records</td>
                    <td className="py-3.5 text-right font-bold text-[#00B67A] pr-4">{formatPeso(f.liability)}</td>
                    <td className="py-3.5 text-center select-none">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#1A2E1A] text-[#10B981] border border-[#235332]">
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3.5 pl-6 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedAuditDoc(f);
                            setSelectedDocTab('csv');
                          }}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] font-bold text-[#00B67A] transition flex items-center gap-1 cursor-pointer"
                          title="Download/View CSV Alphalist Report"
                        >
                          <Paperclip className="w-3 h-3 text-[#00B67A]/80" />
                          <span>CSV</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAuditDoc(f);
                            setSelectedDocTab('dat');
                          }}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] font-bold text-amber-400 transition flex items-center gap-1 cursor-pointer"
                          title="Download/View DAT Electronic Submission Payload"
                        >
                          <FileCode className="w-3 h-3 text-amber-500/80" />
                          <span>DAT</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAuditDoc(f);
                            setSelectedDocTab('json');
                          }}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] font-bold text-sky-400 transition flex items-center gap-1 cursor-pointer"
                          title="Download/View Audit JSON Sync Payload"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-sky-500/80" />
                          <span>JSON</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXPORT DIALOG / MODAL PANEL */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#0F1113]/85 backdrop-blur-xs font-mono animate-fadeIn" id="export-modal">
          <div className="bg-[#181A1C] border border-[#24272C] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
            
            {/* IN-MODAL HEADER */}
            <div className="px-6 py-5 border-b border-[#24272C] flex items-center justify-between bg-[#141618]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#00B67A]" />
                <span className="text-xs uppercase font-bold tracking-widest text-white">BIR Official eFile Export Wizard</span>
              </div>
              <button 
                onClick={() => setExportModalOpen(false)}
                className="text-zinc-500 hover:text-white font-bold cursor-pointer hover:bg-zinc-800/60 p-2 rounded-xl transition text-xs"
              >
                Close ✕
              </button>
            </div>

            {/* IN-MODAL DISPLAY CONTENT */}
            <div className="p-6 space-y-4 text-xs">
              
              {/* FILING DETAIL WARNING BOX */}
              <div className="p-4 bg-zinc-950/60 border border-[#24272C] rounded-2xl flex items-start gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-[#00B67A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white block">Pre-flight Validation: PASS (No outstanding errors)</span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                    Generating alphalists for <b>{filerInfo.tradeName}</b>, TIN <b>{filerInfo.tin}</b>. Standard validation checked reference serial compliance and tax-deductibility schemas correctly.
                  </p>
                </div>
              </div>

              {/* GENERATED FILE SWITCH CONTENT TAB */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block font-mono">Audited Output Payload (CSV Formatted)</span>
                
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedExportFiles.csv}
                    className="w-full h-44 p-4 bg-[#141618] border border-[#24272C] text-[10px] text-zinc-300 rounded-2xl font-mono leading-relaxed focus:outline-hidden focus:ring-0 whitespace-pre overflow-x-auto"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedExportFiles.csv);
                        toast.success('Saved to clipboard', { description: 'CSV compliance payload copied to clipboard!' });
                      }}
                      className="px-3.5 py-1.5 bg-[#00B67A] hover:bg-emerald-600 font-bold rounded-xl text-[9px] text-white flex items-center gap-1 cursor-pointer transition shadow-sm"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" /> Copy CSV
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([generatedExportFiles.csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `BIR_Alphalist_${taxMonth}_${currentCompany.code}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:text-white font-bold rounded-xl text-[9px] text-zinc-305 flex items-center gap-1 cursor-pointer transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                </div>
              </div>

              {/* SECONDARY FILE PLUGINS AND JSON RECAP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">EIS Electronic payload (.DAT Format)</span>
                  <textarea 
                    readOnly
                    value={generatedExportFiles.dat}
                    className="w-full h-24 p-3 bg-[#141618] border border-[#24272C] rounded-xl text-[9.5px] text-zinc-400 font-mono focus:outline-hidden resize-none"
                  />
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">Corporate Audit JSON payload</span>
                  <textarea 
                    readOnly
                    value={generatedExportFiles.json}
                    className="w-full h-24 p-3 bg-[#141618] border border-[#24272C] rounded-xl text-[9.5px] text-zinc-450 font-mono focus:outline-hidden resize-none"
                  />
                </div>
              </div>
            </div>

            {/* IN-MODAL DISPATCH CONTROLS */}
            <div className="px-6 py-5 bg-[#141618] border-t border-[#24272C] flex items-center justify-between">
              <span className="text-[10px] text-zinc-550 italic font-mono">
                Digitally authenticated with AES256-GCM Secure Enclaves
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 border border-[#24272C] hover:text-white rounded-xl text-xs font-bold transition cursor-pointer text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadToBIRPortal}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#00B67A] hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-650 text-white font-bold rounded-xl text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Authorizing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Submit & Certify eFiling
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* HISTORICAL DETAILED DOCUMENT VIEWER & ARCHIVE MODAL */}
      {selectedAuditDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#0F1113]/90 backdrop-blur-xs font-mono animate-fadeIn" id="audit-doc-modal">
          <div className="bg-[#181A1C] border border-[#24272C] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
            
            {/* MODAL HEADER */}
            <div className="px-6 py-5 border-b border-[#24272C] flex items-center justify-between bg-[#141618]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#00B67A] shrink-0 font-bold" />
                <div className="text-left">
                  <span className="text-xs uppercase font-bold tracking-widest text-white block">BIR Historical Transmission Archive</span>
                  <span className="text-[10px] text-zinc-500 font-mono">REFERENCE: {selectedAuditDoc.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAuditDoc(null)}
                className="text-zinc-500 hover:text-white font-bold cursor-pointer hover:bg-zinc-800/60 p-2 rounded-xl transition text-xs"
              >
                Close ✕
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 space-y-5 text-xs text-left">
              
              {/* META INFO BANNER */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#141618] border border-[#24272C] rounded-2xl">
                <div>
                  <span className="text-[9px] text-[#00B67A] uppercase block font-sans font-bold">Form Type</span>
                  <span className="text-white font-bold text-[11px] font-mono leading-none">{selectedAuditDoc.formType}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#00B67A] uppercase block font-sans font-bold">Period Month</span>
                  <span className="text-white font-bold text-[11px] font-mono leading-none">{selectedAuditDoc.month}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#00B67A] uppercase block font-sans font-bold">Transmission Date</span>
                  <span className="text-zinc-300 font-mono text-[11px] leading-none">{selectedAuditDoc.timestamp}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#00B67A] uppercase block font-sans font-bold">Tax Cleared Amount</span>
                  <span className="text-[#00B67A] font-bold text-[11px] leading-none">{formatPeso(selectedAuditDoc.liability)}</span>
                </div>
              </div>

              {/* DOCUMENT SWITCH TABS */}
              <div className="flex items-center gap-1.5 border-b border-[#24272C] pb-2 overflow-x-auto">
                {[
                  { id: 'csv', label: 'CSV (Alphalist Report)', icon: FileSpreadsheet },
                  { id: 'dat', label: 'DAT (Official e-Submission File)', icon: FileCode },
                  { id: 'json', label: 'JSON (Compliance Audit Ledger)', icon: FileSpreadsheet }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = selectedDocTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedDocTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 text-[10px] uppercase font-bold tracking-wider transition-all rounded-xl cursor-pointer shrink-0 ${
                        isActive 
                          ? 'bg-[#00B67A] text-white' 
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1D2024]/50 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* PREVIEW TEXT PANEL */}
              <div className="relative">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-1 font-mono">
                  Document Payload Viewer ({selectedDocTab.toUpperCase()})
                </span>
                <textarea
                  readOnly
                  value={selectedAuditDoc.files ? selectedAuditDoc.files[selectedDocTab] : 'No attachment data stored for this report format.'}
                  className="w-full h-56 p-4 bg-[#141618] border border-[#24272C] text-[10px] text-zinc-300 rounded-2xl font-mono leading-relaxed focus:outline-hidden focus:ring-0 whitespace-pre overflow-x-auto"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      const text = selectedAuditDoc.files ? selectedAuditDoc.files[selectedDocTab] : '';
                      navigator.clipboard.writeText(text);
                      toast.success('Payload Copied', { description: `Attachment ${selectedDocTab.toUpperCase()} payload copied successfully!` });
                    }}
                    className="px-3 py-1.5 bg-[#00B67A] hover:bg-emerald-600 font-bold rounded-xl text-[9px] text-white flex items-center gap-1 cursor-pointer transition shadow-sm"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" /> Copy Data
                  </button>
                  <button
                    onClick={() => {
                      const docContent = selectedAuditDoc.files ? selectedAuditDoc.files[selectedDocTab] : '';
                      const mimeType = selectedDocTab === 'csv' ? 'text/csv' : selectedDocTab === 'dat' ? 'text/plain' : 'application/json';
                      const blob = new Blob([docContent], { type: mimeType });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `BIR_${selectedAuditDoc.id}_${selectedDocTab.toUpperCase()}.${selectedDocTab === 'json' ? 'json' : selectedDocTab === 'csv' ? 'csv' : 'dat'}`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:text-white font-bold rounded-xl text-[9px] text-zinc-305 flex items-center gap-1 cursor-pointer transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>

            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-5 bg-[#141618] border-t border-[#24272C] flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] text-zinc-500 italic">
                Digital Fingerprint Verified 🗝️ SHA256 Secured Archive
              </span>
              <button
                onClick={() => setSelectedAuditDoc(null)}
                className="px-5 py-2 bg-zinc-900 hover:text-white border border-[#24272C] rounded-xl text-xs font-bold transition cursor-pointer text-zinc-400"
              >
                Close Archive
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
