/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { useDBUpdate } from "../data/mockDatabase";
import {
  Building2,
  TrendingUp,
  Coins,
  ShieldCheck,
  FileText,
  FileSignature,
  PiggyBank,
  Percent,
  Search,
  Plus,
  ArrowRight,
  Upload,
  Link,
  ShieldAlert,
  Fingerprint,
  Lock,
  Unlock,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UploadCloud,
  CheckSquare,
  FilePlus,
  AlertCircle,
  Eye,
  FileCode,
  Sliders,
  PhilippinePeso,
  Activity,
  Award,
  BookOpen,
  FolderLock,
  X,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  getTransactions,
  getCompanies,
  getProfiles,
  getUserRole,
  writeAuditLog,
  getPayables,
  getReceivables,
  getCashAccounts
} from "../data/mockDatabase";
import { Transaction, Company, Profile, CashAccount } from "../types";
import { toast } from "sonner";

interface EnterpriseSuiteProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
}

type SubModule =
  | "consolidation_forecast"
  | "bank_reconciliation"
  | "tax_compliance"
  | "approvals_matrix_fraud"
  | "ocr_vault"
  | "month_end_workspace"
  | "governance_security";

export default function EnterpriseSuite({
  userId,
  companyId,
  onAuditLogged,
}: EnterpriseSuiteProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubModule>(
    "consolidation_forecast",
  );

  // SHARED STATES & PRESETS
  const companies = getCompanies();
  const profiles = getProfiles();
  const currentCompany =
    companies.find((c) => c.id === companyId) || companies[0];
  const allTxns = getTransactions(userId, "all");

  // EFFECT: Reset mock states when data is cleared
  useEffect(() => {
    if (allTxns.length === 0) {
      setBankFeeds([]);
      setIntercompanyLogged([]);
      setBirSubmissionLog([]);
      setClosingSteps((prev) => prev.map((s) => ({ ...s, completed: false })));
      setFraudAuditLogs([]);
      setClosingAuditScore(60);
      setActiveSubTab("consolidation_forecast");
      setIntercompanyExpense((prev) => ({ ...prev, amount: 0, purpose: "" }));
      setBirInvoiceForm((prev) => ({
        ...prev,
        referenceNum: "",
        orNumber: "",
      }));
    }
  }, [allTxns.length]);
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  // ---------------------------------------------------------
  // MODULE 10 & 14: CONSOLIDATION & SIMULATION SCENARIO PLANNER
  // ---------------------------------------------------------
  const [forecastScenario, setForecastScenario] = useState<
    "worst_case_runway" | "expected_runway" | "best_case_runway"
  >("expected_runway");
  const [intercompanyExpense, setIntercompanyExpense] = useState({
    sourceCompanyId: "c-frh",
    targetCompanyId: "c-bls",
    amount: 75000,
    purpose: "Shared Centralized Marketing Allocation for Fragrance Lines",
  });
  const [intercompanyLogged, setIntercompanyLogged] = useState<any[]>([]);

  // Simulation calculations based on pre-seeded records
  const dbTick = useDBUpdate();
  const companyBalances = useMemo(() => {
    const list: Record<
      string,
      { cash: number; payables: number; receivables: number; net: number }
    > = {};
    const allPayables = getPayables(userId, "all");
    const allReceivables = getReceivables(userId, "all");
    companies.forEach((com) => {
      const txs = allTxns.filter(
        (t) => t.companyId === com.id && t.status === "approved",
      );
      const cashIn = txs
        .filter((t) => t.type === "cash_in")
        .reduce((sum, t) => sum + t.amount, 0);
      const cashOut = txs
        .filter((t) => t.type === "cash_out")
        .reduce((sum, t) => sum + t.amount, 0);
      const startBalance = 0;
      const cash = startBalance + cashIn - cashOut;

      const payables = allPayables
        .filter((p) => p.companyId === com.id && p.status === "unpaid")
        .reduce((sum, p) => sum + p.amount, 0);

      const receivables = allReceivables
        .filter((r) => r.companyId === com.id && r.status === "uncollected")
        .reduce((sum, r) => sum + r.amount, 0);

      list[com.id] = {
        cash,
        payables,
        receivables,
        net: cash + receivables - payables,
      };
    });
    return list;
  }, [dbTick, companies, allTxns, userId]);

  // Group Consolidated total metrics
  const consolidatedTotals = useMemo(() => {
    let tCash = 0;
    let tPay = 0;
    let tRec = 0;
    Object.keys(companyBalances).forEach((key) => {
      const cb = companyBalances[key];
      if (cb) {
        tCash += cb.cash;
        tPay += cb.payables;
        tRec += cb.receivables;
      }
    });
    return {
      cash: tCash,
      payables: tPay,
      receivables: tRec,
      consolidatedNetWorth: tCash + tRec - tPay,
    };
  }, [dbTick, companyBalances]);

  // Exact Bank Balances based on Accounts setup and transactions mapping
  const activeCashAccounts = useMemo(() => {
    let accounts: (CashAccount & { currentBalance: number })[] = [];
    let accList: CashAccount[] = [];
    
    if (companyId === 'all') {
      companies.forEach(com => {
        accList.push(...getCashAccounts(com.id));
      });
    } else {
      accList = getCashAccounts(companyId);
    }

    const txs = allTxns.filter((t) => t.status === "approved");

    accounts = accList.map(acc => {
      let runBal = acc.openingBalance || 0;
      
      txs.forEach(t => {
        if (t.cashAccountId === acc.id) {
          if (t.type === 'cash_in') runBal += t.amount;
          else if (t.type === 'cash_out') runBal -= t.amount;
        }
      });
      return { ...acc, currentBalance: runBal };
    });

    return accounts;
  }, [allTxns, companyId, companies, dbTick]);

  // Runway Projection Chart Data
  const runwayForecastData = useMemo(() => {
    const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let workingCash = consolidatedTotals.cash;
    let growthMultiplier = 1.05; // Expected
    let burnRate = consolidatedTotals.cash > 0 ? 420000 : 0; // Expected PH operations burn rate

    if (forecastScenario === "best_case_runway") {
      growthMultiplier = 1.15;
      burnRate = consolidatedTotals.cash > 0 ? 390000 : 0; // optimized
    } else if (forecastScenario === "worst_case_runway") {
      growthMultiplier = 0.98;
      burnRate = consolidatedTotals.cash > 0 ? 470000 : 0; // higher inflation/overhead
    }

    return months.map((month, idx) => {
      // Simulate cumulative net inflows/outflows
      const projectedIncome =
        consolidatedTotals.cash *
        (Math.pow(growthMultiplier, idx + 1) - Math.pow(growthMultiplier, idx));
      workingCash = workingCash + projectedIncome - burnRate;
      return {
        month,
        cashPosition: Math.max(0, workingCash),
        recommendedBuffer: consolidatedTotals.cash * 0.4,
        scenarioLabel: forecastScenario.replace("_", " ").toUpperCase(),
      };
    });
  }, [dbTick, consolidatedTotals, forecastScenario]);

  const handlePostIntercompany = (e: React.FormEvent) => {
    e.preventDefault();
    const sourceCode =
      companies.find((c) => c.id === intercompanyExpense.sourceCompanyId)
        ?.code || "";
    const targetCode =
      companies.find((c) => c.id === intercompanyExpense.targetCompanyId)
        ?.code || "";

    const newRecord = {
      id: `ic-${Date.now()}`,
      source: sourceCode,
      target: targetCode,
      amount: intercompanyExpense.amount,
      purpose: intercompanyExpense.purpose,
      timestamp: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "MATCHED_ELIMINATED",
    };

    setIntercompanyLogged((prev) => [newRecord, ...prev]);
    writeAuditLog(
      userId,
      companyId,
      "INTERCOMPANY_ALLOCATION_POSTED",
      "ledger",
      newRecord.id,
      {
        source: sourceCode,
        target: targetCode,
        amount: intercompanyExpense.amount,
        eliminationStatus: "Cleared on Consolidation Ledger",
      },
    );
    onAuditLogged();
    toast.success("Intercompany Expense Posted", {
      description:
        "Expense posted & automatically eliminated from consolidation worksheet to prevent double-counting!",
    });
  };

  // ---------------------------------------------------------
  // MODULE 9: BANK RECONCILIATION & POSITIONING
  // ---------------------------------------------------------
  const [selectedBank, setSelectedBank] = useState<string>("bdo");
  // Simulated Bank Statement Feed
  const [bankFeeds, setBankFeeds] = useState([
    {
      id: "bf-1",
      date: "2026-06-12",
      description: "BIR-E-FILING DEPOST REF",
      amount: 125000.0,
      type: "credit",
      matchedTxId: null,
      isReconciled: false,
    },
    {
      id: "bf-2",
      date: "2026-06-11",
      description: "PAYROLL DISBURSEMENT BLS-JUN-1",
      amount: 285400.0,
      type: "debit",
      matchedTxId: null,
      isReconciled: false,
    },
    {
      id: "bf-3",
      date: "2026-06-10",
      description: "BLESSCENT FRANCHISE PYMT - QC",
      amount: 150000.0,
      type: "credit",
      matchedTxId: null,
      isReconciled: false,
    },
    {
      id: "bf-4",
      date: "2026-06-08",
      description: "PETTY CASH DRAW BGS BRANCH",
      amount: 15450.0,
      type: "debit",
      matchedTxId: null,
      isReconciled: false,
    },
    {
      id: "bf-5",
      date: "2026-06-05",
      description: "INTER-ENTITY SCENTIMO REPLENISH",
      amount: 50000.0,
      type: "credit",
      matchedTxId: null,
      isReconciled: false,
    },
  ]);

  const unMatchedLedgTxns = useMemo(() => {
    return allTxns
      .filter((t) => t.companyId === companyId && t.status === "approved")
      .slice(0, 5);
  }, [dbTick, allTxns, companyId]);

  const handleMatchReconcile = (bankFeedId: string, ledgerTxId: string) => {
    setBankFeeds((prev) =>
      prev.map((item) =>
        item.id === bankFeedId
          ? { ...item, isReconciled: true, matchedTxId: ledgerTxId }
          : item,
      ),
    );
    writeAuditLog(userId, companyId, "BANK_RECON_MATCH", "bank", bankFeedId, {
      ledgerTxId,
      matchedBy: userId,
    });
    onAuditLogged();
  };

  // ---------------------------------------------------------
  // MODULE 8: TAX COMPLIANCE & BIR FILING PREPARATION
  // ---------------------------------------------------------
  const [birInvoiceForm, setBirInvoiceForm] = useState({
    classification: "vat_12",
    withholding: "ewt_2",
    referenceNum: "BIR-INV-2026-0034a",
    orNumber: "OR-789012",
    tin: "008-348-129-000",
    vatRegisteredName: "HERRERA VENTURES GROUP INC",
  });

  const taxBreakdown = useMemo(() => {
    const txObj = allTxns.filter(
      (t) => t.companyId === companyId && t.status === "approved",
    );
    const taxableSales = txObj
      .filter((t) => t.type === "cash_in")
      .reduce((sum, t) => sum + t.amount, 0);
    const taxableExpenses = txObj
      .filter((t) => t.type === "cash_out")
      .reduce((sum, t) => sum + t.amount, 0);

    const outputVat = taxableSales * 0.12;
    const inputVat = taxableExpenses * 0.08; // average input credit index
    const netVatPayable = Math.max(0, outputVat - inputVat);
    const ewtDeductions = taxableExpenses * 0.02; // Average expanded withholding tax

    return {
      taxableSales,
      taxableExpenses,
      outputVat,
      inputVat,
      netVatPayable,
      ewtDeductions,
    };
  }, [dbTick, allTxns, companyId]);

  const [birSubmissionLog, setBirSubmissionLog] = useState<any[]>([]);
  const [isSubmittingEInvoice, setIsSubmittingEInvoice] = useState(false);

  const handleTriggerBIRSubmission = () => {
    setIsSubmittingEInvoice(true);
    setTimeout(() => {
      const filingReceiptNum = `BIR-FILING-RCPT-${Math.floor(Math.random() * 899999 + 100000)}`;
      const newFiling = {
        formType: "BIR Form 2550M",
        refNum: birInvoiceForm.referenceNum,
        vatDue: taxBreakdown.netVatPayable,
        referenceReceipt: filingReceiptNum,
        status: "SUBMITTED_VALIDATED",
        timestamp: new Date().toLocaleString(),
      };
      setBirSubmissionLog((prev) => [newFiling, ...prev]);
      setIsSubmittingEInvoice(false);
      writeAuditLog(
        userId,
        companyId,
        "TAX_BIR_EFILING_SUBMISSION",
        "tax",
        filingReceiptNum,
        {
          details: newFiling,
        },
      );
      onAuditLogged();
    }, 1200);
  };

  // ---------------------------------------------------------
  // MODULE 11 & 13: APPROVAL MATRIX & FRAUD ANOMALY RADAR
  // ---------------------------------------------------------
  const [matrixSettings, setMatrixSettings] = useState({
    lvl1Max: 50000,
    lvl2Max: 250000,
    twoLevelApprovalEnabled: true,
    strictSodEnabled: true, // Segregation of Duties active
  });

  const [escalatedAuditId, setEscalatedAuditId] = useState<string | null>(null);

  // Simulated live fraud anomaly indicators
  const [fraudAuditLogs, setFraudAuditLogs] = useState([
    {
      id: "f-101",
      type: "DUPLICATE_INVOICE",
      severity: "HIGH",
      companyCode: "BLS",
      message:
        "Supplier FragranceHub Inc submitted invoice BL-8493 for ₱45,000.00 twice within 4 hours.",
      dt: "2026-06-12 09:12:00",
      active: true,
    },
    {
      id: "f-102",
      type: "ROUND_PESO_ANOMALY",
      severity: "MEDIUM",
      companyCode: "SCT",
      message:
        "Transaction ₱150,000.00 exact amount logged without specific centavo values on cash disbursements.",
      dt: "2026-06-11 14:24:00",
      active: true,
    },
    {
      id: "f-103",
      type: "OFF_HOURS_APPROVAL",
      severity: "HIGH",
      companyCode: "BGS",
      message: "Capital approval executed by u-blsapprover at 03:14:55 AM PHT.",
      dt: "2026-06-10 03:14:00",
      active: true,
    },
    {
      id: "f-104",
      type: "BUDGET_OVERRUN_TRIGGER",
      severity: "LOW",
      companyCode: "FRH",
      message:
        'Category "Utilities" exceeded the monthly set limit by ₱24,500.00.',
      dt: "2026-06-08 11:05:00",
      active: false,
    },
  ]);

  const handleEscalateFraudAlert = (id: string) => {
    setEscalatedAuditId(id);
    writeAuditLog(
      userId,
      companyId,
      "FRAUD_ALERT_ESCALATED",
      "compliance",
      id,
      { escalatedBy: userId },
    );
    onAuditLogged();
    toast.warning("Fraud Escalated!", {
      description:
        "Alert escalated to Internal Corporate Board Auditor for immediate physical review.",
    });
  };

  const handleDismissFraudAlert = (id: string) => {
    setFraudAuditLogs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: false } : f)),
    );
    writeAuditLog(
      userId,
      companyId,
      "FRAUD_ALERT_DISMISSED",
      "compliance",
      id,
      { dismissedBy: userId },
    );
    onAuditLogged();
  };

  // ---------------------------------------------------------
  // MODULE 12: DOCUMENT VAULT & OCR PREVIEW SIMULATOR
  // ---------------------------------------------------------
  const [currentAttachmentFile, setCurrentAttachmentFile] = useState<
    string | null
  >(null);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "scanning" | "success">(
    "idle",
  );
  const [ocrExtractedData, setOcrExtractedData] = useState<any>(null);

  const predefinedVaultTemplates = [
    {
      label: "Visayas Operations Supplies Receipt",
      filename: "invoice-visayas-supplies.pdf",
      text: "Supplier: Visayas Retail Supplies Inc | Total: ₱12,450.00 | Date: 2026-06-10 | TIN: 112-902-884",
    },
    {
      label: "BDO Deposit Confirmation Slip",
      filename: "deposit-slip-bdo-blesscent.jpg",
      text: "BDO Unibank QC | Transfer: ₱250,000.00 | Ref: BDO-DP-2026A | Date: 2026-06-11",
    },
    {
      label: "Meralco Utility Invoice (Scentimo Retail)",
      filename: "meralco-billing-sct.pdf",
      text: "MERALCO Power Bill | Amount: ₱48,930.00 | Account: 0495-2384-11 | Due: 2026-06-25",
    },
  ];

  const handleSimulateOCR = (filename: string, contentText: string) => {
    setCurrentAttachmentFile(filename);
    setOcrStatus("scanning");
    setOcrExtractedData(null);
    setTimeout(() => {
      setOcrStatus("success");
      // Parse template content
      const lines = contentText.split(" | ");
      const parsed: Record<string, string> = {};
      lines.forEach((l) => {
        const [k, v] = l.split(": ");
        parsed[k.toLowerCase()] = v;
      });
      setOcrExtractedData(parsed);

      writeAuditLog(
        userId,
        companyId,
        "OCR_DOCUMENT_SCAN_EXTRACT",
        "document",
        filename,
        {
          extractedText: contentText,
          confidenceLevel: "99.2%",
        },
      );
      onAuditLogged();
    }, 1500);
  };

  // ---------------------------------------------------------
  // MODULE 15: MONTH-END CLOSING & AUDIT READY WORKSPACE
  // ---------------------------------------------------------
  const [closingSteps, setClosingSteps] = useState([
    {
      id: "step-1",
      task: "Reconcile BDO and GCash central cash vaults with ledgers",
      completed: true,
    },
    {
      id: "step-2",
      task: "Review unapproved transaction queues for Blesscent",
      completed: true,
    },
    {
      id: "step-3",
      task: "Formulate and withhold PHP withholding taxes (Form 1601C)",
      completed: false,
    },
    {
      id: "step-4",
      task: "Perform Intercompany elimination balancing",
      completed: false,
    },
    {
      id: "step-5",
      task: "Validate OCR document attachments for high amount cash-outs (>₱100k)",
      completed: false,
    },
  ]);

  const [periodLocked, setPeriodLocked] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [closingAuditScore, setClosingAuditScore] = useState(82);

  const toggleClosingStep = (id: string) => {
    const updated = closingSteps.map((s) =>
      s.id === id ? { ...s, completed: !s.completed } : s,
    );
    setClosingSteps(updated);

    // Calculate new audit ready score
    const compleCount = updated.filter((s) => s.completed).length;
    const finalScore = 60 + Math.round((compleCount / updated.length) * 40);
    setClosingAuditScore(finalScore);
  };

  const handleCloseAndLockPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode !== "2026") {
      toast.error("Security Bypass Failure", {
        description:
          "Security Error: Invalid trustee authorization pincode bypass keys!",
      });
      return;
    }
    setPeriodLocked(true);
    writeAuditLog(
      userId,
      companyId,
      "FISCAL_PERIOD_CLOSED_LOCK",
      "ledger",
      "closed_june_2026",
      {
        closedBy: userId,
        auditScore: closingAuditScore,
        action: "LOCKED_LEDGERS_PERMANENT",
      },
    );
    onAuditLogged();
    toast.success("Fiscal Period Locked", {
      description:
        "Fiscal period June 2026 permanently locked. Ledger entries can no longer be modified or amended without Group Admin audit override credentials.",
    });
  };

  // ---------------------------------------------------------
  // MODULE 16: ENTERPRISE SECURITY & GOVERNANCE AUDIT
  // ---------------------------------------------------------
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [dataEncryptionKey, setDataEncryptionKey] = useState(
    "aes256_kms_gcp_prod_k7a3",
  );
  const [encryptionRotatedDate, setEncryptionRotatedDate] =
    useState("2026-06-01");

  const rotatedEncryptionKeys = () => {
    const newKey = `aes256_kms_gcp_prod_k${Math.random().toString(36).substring(2, 6)}`;
    setDataEncryptionKey(newKey);
    setEncryptionRotatedDate(new Date().toISOString().split("T")[0]);
    writeAuditLog(
      userId,
      companyId,
      "ENCRYPTION_KEY_ROTATE",
      "security",
      newKey,
      {
        rotatedBy: userId,
        algorithm: "AES-256-GCM",
      },
    );
    onAuditLogged();
    toast.success("Encryption Key Rotated", {
      description:
        "Financial ledger database encryption keys rotated successfully across all shards.",
    });
  };

  const securityDevicesNode = [
    {
      ip: "192.168.1.104",
      location: "Manila, PH",
      device: "Chrome / macOS (Verified)",
      mfaState: "PASSED",
      time: "Active Now",
    },
    {
      ip: "124.83.21.90",
      location: "Cebu City, PH",
      device: "Android App SDK / Port 3000",
      mfaState: "PASSED",
      time: "5 mins ago",
    },
    {
      ip: "45.112.23.4",
      location: "Davao, PH",
      device: "Firefox / Windows",
      mfaState: "BYPASSED_KEY",
      time: "1 hour ago",
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn" id="enterprise-control-board">
      {/* HEADER SECTION */}
      <div
        className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 gap-4"
        id="ent-header"
      >
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sliders className="w-5 h-5 text-[#00B67A] shrink-0 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-[#00B67A] uppercase font-bold bg-white border border-emerald-200 px-3.5 py-1 rounded-full">
              Suite Module 8-16
            </span>
          </div>
          <h1 className="text-2xl font-light text-slate-900 tracking-tight font-sans">
            Enterprise Compliance &{" "}
            <span className="text-[#00B67A] font-serif italic">
              Finance Suite
            </span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Centralized command center for group consolidation, bank
            reconciliation, BIR tax-readiness, risk audit, month-end locks, and
            data governance.
          </p>
        </div>

        {/* LEDGER LOCK BADGE STATUS */}
        <div
          className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl select-none"
          id="ent-ledger-lock"
        >
          <div
            className={`p-2 rounded-xl ${periodLocked ? "bg-red-50 text-red-400 border border-red-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}
          >
            {periodLocked ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
          </div>
          <div className="text-left font-mono">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest block">
              Ledger Status
            </span>
            <span className="text-xs font-bold text-slate-900 uppercase block leading-none mt-1">
              {periodLocked ? "LOCKED (JUNE 2026)" : "OPEN & SECURE"}
            </span>
          </div>
        </div>
      </div>

      {/* ENTERPRISE SUITE HUB CARDS */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn"
        id="ent-hub-cards"
      >
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-[#00B67A]" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold block">
              MoM Revenue Trend
            </span>
            <span className="text-[#00B67A] bg-emerald-950/30 px-2 py-0.5 rounded-lg text-[9px] font-mono border border-emerald-900">
              +24.5%
            </span>
          </div>
          <div className="text-3xl font-sans font-light tracking-tight text-slate-900 mb-2">
            {formatPeso(companyBalances[companyId]?.cash || 0)}
          </div>
          <div className="h-12 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { val: 32 },
                  { val: 45 },
                  { val: 38 },
                  { val: 56 },
                  { val: 51 },
                  { val: 78 },
                ]}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sparkGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B67A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00B67A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#00B67A"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#sparkGreen)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-blue-500" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold block">
              MoM Operating Runway
            </span>
            <span className="text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded-lg text-[9px] font-mono border border-blue-900">
              Stable
            </span>
          </div>
          <div className="text-3xl font-sans font-light tracking-tight text-slate-900 mb-2">
            8.4 <span className="text-sm text-slate-500">mos</span>
          </div>
          <div className="h-12 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { val: 6.2 },
                  { val: 6.5 },
                  { val: 6.8 },
                  { val: 7.4 },
                  { val: 8.0 },
                  { val: 8.4 },
                ]}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sparkBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#sparkBlue)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 left-0 w-[4px] h-full bg-amber-500" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold block">
              MoM Liabilities Trend
            </span>
            <span className="text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-lg text-[9px] font-mono border border-amber-900">
              -4.2%
            </span>
          </div>
          <div className="text-3xl font-sans font-light tracking-tight text-slate-900 mb-2">
            {formatPeso(companyBalances[companyId]?.payables || 0)}
          </div>
          <div className="h-12 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { val: 98 },
                  { val: 92 },
                  { val: 88 },
                  { val: 95 },
                  { val: 85 },
                  { val: 81 },
                ]}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sparkAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#sparkAmber)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CORE MODULAR SYSTEM TAB NAVIGATION */}
      <div
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-1"
        id="submodule-nav"
      >
        {[
          {
            id: "consolidation_forecast",
            label: "Consolidation & Forecast",
            icon: Building2,
          },
          {
            id: "bank_reconciliation",
            label: "Bank Reconciliation",
            icon: Coins,
          },
          { id: "tax_compliance", label: "PH Tax compliance", icon: Percent },
          {
            id: "approvals_matrix_fraud",
            label: "Matrix & Anomaly Watch",
            icon: ShieldAlert,
          },
          { id: "ocr_vault", label: "OCR Voucher Vault", icon: UploadCloud },
          {
            id: "month_end_workspace",
            label: "Month-End CLOSING",
            icon: CheckSquare,
          },
          {
            id: "governance_security",
            label: "Governance & Security",
            icon: ShieldCheck,
          },
        ].map((subTab) => {
          const Icon = subTab.icon;
          const isSel = activeSubTab === subTab.id;
          return (
            <button
              id={`tab-btn-${subTab.id}`}
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id as any)}
              className={`px-3.5 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-all duration-200 border-b-2 flex items-center gap-2 cursor-pointer ${
                isSel
                  ? "border-[#00B67A] text-[#00B67A] font-bold bg-white/30"
                  : "border-transparent text-zinc-450 hover:text-slate-900 hover:border-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{subTab.label}</span>
            </button>
          );
        })}
      </div>

      {/* RENDER ACTIVE MODULES WITH PREMIUM BENTO GRIDS */}
      <div id="submodule-container" className="space-y-6">
        {/* ========================================== */}
        {/* 10 & 14: CONSOLIDATION & SIMULATION SCENARIO PLANNER */}
        {/* ========================================== */}
        {activeSubTab === "consolidation_forecast" && (
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn"
            id="module-consolidation"
          >
            {/* CONSOLIDATION SPREADSHEET BENTO */}
            <div className="lg:col-span-2 space-y-6">
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5"
                id="bento-consolidated-sheet"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-[#00B67A]" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 font-mono">
                      Multi-Company Consolidation Sheet
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                    Consolidated Live
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs text-slate-700">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="py-2.5">Entity / Code</th>
                        <th className="py-2.5 text-right">Cash Assets</th>
                        <th className="py-2.5 text-right">
                          Accounts Receivables
                        </th>
                        <th className="py-2.5 text-right">Accounts Payables</th>
                        <th className="py-2.5 text-right text-emerald-400">
                          Net Position
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/40">
                      {companies.map((com) => {
                        const dat = companyBalances[com.id] || {
                          cash: 0,
                          payables: 0,
                          receivables: 0,
                          net: 0,
                        };
                        return (
                          <tr
                            key={com.id}
                            className="hover:bg-slate-50/40 transition"
                          >
                            <td className="py-3 font-semibold text-slate-900">
                              {com.name}{" "}
                              <span className="text-slate-500 text-[9px]">
                                ({com.code})
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {formatPeso(dat.cash)}
                            </td>
                            <td className="py-3 text-right">
                              {formatPeso(dat.receivables)}
                            </td>
                            <td className="py-3 text-right text-zinc-450">
                              {formatPeso(dat.payables)}
                            </td>
                            <td className="py-3 text-right text-[#00B67A] font-bold">
                              {formatPeso(dat.net)}
                            </td>
                          </tr>
                        );
                      })}
                      {/* INTERCOMPANY ELIMINATION BIAS ADJUSTMENTS */}
                      <tr className="bg-slate-100 font-semibold border-t border-slate-200">
                        <td className="py-3.5 pr-2 pl-4 text-slate-600">
                          Intercompany Eliminations
                        </td>
                        <td className="py-3.5 text-right text-amber-500">
                          - ₱0.00
                        </td>
                        <td className="py-3.5 text-right text-amber-500">
                          - ₱0.00
                        </td>
                        <td className="py-3.5 text-right text-amber-500">
                          - ₱0.00
                        </td>
                        <td className="py-3.5 text-right text-amber-400">
                          Consolidated Base
                        </td>
                      </tr>
                      {/* CONSOLIDATED TOTALS */}
                      <tr className="bg-white border-t-2 border-slate-200 text-sm text-[#00B67A] font-bold">
                        <td className="py-4 pl-4 uppercase font-sans tracking-tight text-slate-900">
                          Group Consolidated Total
                        </td>
                        <td className="py-4 text-right">
                          {formatPeso(consolidatedTotals.cash)}
                        </td>
                        <td className="py-4 text-right">
                          {formatPeso(consolidatedTotals.receivables)}
                        </td>
                        <td className="py-4 text-right text-slate-600 font-semibold">
                          {formatPeso(consolidatedTotals.payables)}
                        </td>
                        <td className="py-4 text-right text-emerald-400 underline decoration-double">
                          {formatPeso(consolidatedTotals.consolidatedNetWorth)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TREASURY FORECAST RUNWAY & SIMULATOR */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="bento-scenario-forecaster"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-2">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />{" "}
                      Scenario Forecasting & Runway Planning
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Simulate corporate cash availability across worst-case,
                      expected, or best-case business projections.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white p-1 border border-slate-200 rounded-xl">
                    {(
                      [
                        "worst_case_runway",
                        "expected_runway",
                        "best_case_runway",
                      ] as const
                    ).map((scenario) => (
                      <button
                        key={scenario}
                        onClick={() => setForecastScenario(scenario)}
                        className={`px-2 py-1 text-[8px] font-mono tracking-widest uppercase transition-all rounded-lg cursor-pointer ${
                          forecastScenario === scenario
                            ? "bg-[#00B67A] text-white font-bold"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {scenario.split("_")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PROJECTED LINE CHART */}
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={runwayForecastData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorRunway"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#00B67A"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor="#00B67A"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#24272C" />
                      <XAxis
                        dataKey="month"
                        stroke="#71717A"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#71717A"
                        fontSize={11}
                        tickFormatter={(val) =>
                          `₱${(val / 1000000).toFixed(1)}M`
                        }
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#141618",
                          borderColor: "#24272C",
                        }}
                        labelClassName="text-slate-900 font-mono text-xs"
                        formatter={(val: number) => [
                          formatPeso(val),
                          "Projected Cash Locked",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="cashPosition"
                        stroke="#00B67A"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRunway)"
                      />
                      <Legend verticalAlign="top" height={36} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* INTERCOMPANY ENTRY & TRANSFER MANAGEMENT */}
            <div className="space-y-6">
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="intercompany-entry-box"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#00B67A] font-mono">
                  Post Intercompany Expense / Transfer
                </h3>

                <form
                  onSubmit={handlePostIntercompany}
                  className="space-y-4 text-left"
                >
                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Debited Entity (Paying Source)
                    </label>
                    <select
                      value={intercompanyExpense.sourceCompanyId}
                      onChange={(e) =>
                        setIntercompanyExpense((old) => ({
                          ...old,
                          sourceCompanyId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#00B67A]"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Credited Entity (Beneficiary Target)
                    </label>
                    <select
                      value={intercompanyExpense.targetCompanyId}
                      onChange={(e) =>
                        setIntercompanyExpense((old) => ({
                          ...old,
                          targetCompanyId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#00B67A]"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Transaction Share Amount (PHP)
                    </label>
                    <input
                      type="number"
                      required
                      value={intercompanyExpense.amount}
                      onChange={(e) =>
                        setIntercompanyExpense((old) => ({
                          ...old,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#00B67A]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Purpose & Cost-Sharing Agreement Reference
                    </label>
                    <textarea
                      value={intercompanyExpense.purpose}
                      required
                      onChange={(e) =>
                        setIntercompanyExpense((old) => ({
                          ...old,
                          purpose: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#00B67A] h-16"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#00B67A] text-white font-bold font-mono text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-600 transition duration-150 cursor-pointer text-center"
                  >
                    Post cost-sharing ledger
                  </button>
                </form>
              </div>

              {/* RECORDED INTERCOMPANY SPREADS CONTROLLER */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="intercompany-log"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                    Consolidated Elimination Log
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Live Cleared
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                  {intercompanyLogged.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 font-mono text-xs">
                      No intercompany shared expense posted in this sandbox
                      session.
                    </div>
                  ) : (
                    intercompanyLogged.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 font-mono text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#00B67A]">
                            {log.source} ➔ {log.target}
                          </span>
                          <span className="text-slate-500 text-[9px]">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-tight">
                          {log.purpose}
                        </p>
                        <div className="flex items-center justify-between border-t border-slate-200/80 pt-1.5">
                          <span className="font-bold text-slate-900">
                            {formatPeso(log.amount)}
                          </span>
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-200">
                            CONSOLIDATED ELIMINATION
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 9: BANK RECONCILIATION & POSITIONING */}
        {/* ========================================== */}
        {activeSubTab === "bank_reconciliation" && (
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-mono text-xs"
            id="module-reconciliation"
          >
            {/* BANK SELECTION & LIVE LIQUIDITY COCKPIT */}
            <div className="space-y-6">
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="bento-bank-picker"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Live Central Cash Accounts
                </h3>
                <div className="space-y-2.5 mt-2">
                  {activeCashAccounts.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBank(b.id)}
                      className={`w-full p-4 border rounded-xl text-left transition duration-150 flex flex-col justify-between cursor-pointer ${
                        selectedBank === b.id
                          ? "bg-slate-50 hover:bg-slate-50 border-[#00B67A] shadow-md"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-slate-900 text-xs">
                          {b.bankName} - {b.accountName}
                        </span>
                        {b.isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00B67A] inline-block animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">
                        {b.accountNumber}
                      </span>
                      <div className="flex items-end justify-between mt-3">
                        <span className="text-[9px] text-zinc-455">
                          Live balance
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          {formatPeso(b.currentBalance)}
                        </span>
                      </div>
                    </button>
                  ))}
                  {activeCashAccounts.length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-200 rounded-xl italic">
                       No Central Accounts configured.
                    </div>
                  )}
                </div>
              </div>

              {/* LEDGER FEED PREVIEW BOX */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="bento-ledger-feed"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Focus Entity General Ledger
                </h3>
                <div className="space-y-2">
                  {unMatchedLedgTxns.map((lTx) => (
                    <div
                      key={lTx.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-[#00B67A]">
                          {lTx.id}
                        </span>
                        <span className="text-slate-500">{lTx.txnDate}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate font-semibold">
                        {lTx.purpose}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-850/60">
                        <span
                          className={`text-[10px] font-bold ${lTx.type === "cash_in" ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {lTx.type === "cash_in" ? "+" : "-"}
                          {formatPeso(lTx.amount)}
                        </span>
                        <span className="text-[9px] text-slate-500 italic block">
                          General Journal Entry
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LIVE BANK STATEMENT CORRELATION MATCHING BOARD */}
            <div
              className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5"
              id="bento-match-board"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
                    Bank Feed Auto-Matching Engine
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select and match bank statement lines directly to general
                    ledger records below.
                  </p>
                </div>
                <button
                  onClick={() =>
                    toast.success("Bank feed synced", {
                      description:
                        "Reset bank feed feeds to active matching entries",
                    })
                  }
                  className="px-3.5 py-1.5 border border-zinc-850 bg-white text-[9px] text-slate-600 rounded-xl flex items-center gap-1.5 hover:text-slate-900 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Sync Bank Feed
                </button>
              </div>

              <div className="space-y-3">
                {bankFeeds.map((feed) => (
                  <div
                    key={feed.id}
                    className={`p-4 border rounded-2xl transition duration-150 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 ${
                      feed.isReconciled
                        ? "bg-slate-100 border-emerald-900/30 text-slate-500"
                        : "bg-white border-slate-200/80 text-slate-700"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 select-none">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                          {feed.date}
                        </span>
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded font-bold ${feed.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-[#EF4444]"}`}
                        >
                          {feed.type.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 tracking-tight">
                        {feed.description}
                      </h4>
                      <span className="text-sm font-bold text-slate-900 block mt-1">
                        {formatPeso(feed.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 sm:self-center shrink-0">
                      {feed.isReconciled ? (
                        <div className="flex items-center gap-1 text-[#00B67A] text-[10px] font-bold uppercase tracking-wider px-3.5 py-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-[#00B67A]" />{" "}
                          Reconciled ({feed.matchedTxId})
                        </div>
                      ) : (
                        <div className="flex flex-col items-stretch gap-1.5">
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest text-center">
                            Suggested Match:
                          </span>
                          <select
                            onChange={(e) => {
                              if (e.target.value)
                                handleMatchReconcile(feed.id, e.target.value);
                            }}
                            className="px-3.5 py-2.5 bg-white border border-slate-200 text-[10px] text-[#00B67A] rounded-xl font-bold cursor-pointer hover:border-white focus:outline-hidden"
                          >
                            <option value="">Choose Ledger Match...</option>
                            {unMatchedLedgTxns.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.id} - {formatPeso(l.amount)} (
                                {l.purpose.slice(0, 15)}...)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 8: TAX COMPLIANCE & BIR FILING PREPARATION */}
        {/* ========================================== */}
        {activeSubTab === "tax_compliance" && (
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-mono text-xs"
            id="module-tax"
          >
            {/* COMPLIANCE INDICES COCKPIT */}
            <div className="space-y-6">
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="tax-cockpit-stats"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  VAT & Withholding Audit Matrix
                </h3>

                <div className="space-y-3.5 divide-y divide-slate-200/60 mt-1">
                  <div className="pt-2">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
                      Output VAT (12% of Sales)
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-1">
                      {formatPeso(taxBreakdown.outputVat)}
                    </span>
                    <p className="text-[9px] text-zinc-550 italic mt-1">
                      Self-collected liability from franchise fees and retail
                    </p>
                  </div>

                  <div className="pt-3">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
                      Input VAT (Credits Claimable)
                    </span>
                    <span className="text-sm font-bold text-slate-700 block mt-1">
                      {formatPeso(taxBreakdown.inputVat)}
                    </span>
                    <p className="text-[9px] text-zinc-550 italic mt-1">
                      Offset credits from BIR VAT registered suppliers
                    </p>
                  </div>

                  <div className="pt-3">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
                      Estimated NET VAT Payable
                    </span>
                    <span className="text-sm font-bold text-rose-450 text-amber-400 block mt-1">
                      {formatPeso(taxBreakdown.netVatPayable)}
                    </span>
                  </div>

                  <div className="pt-3">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
                      Expanded Withholding Tax (EWT Liability)
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-1">
                      {formatPeso(taxBreakdown.ewtDeductions)}
                    </span>
                    <p className="text-[9px] text-zinc-550 italic mt-1">
                      2% Average deducted from corporate supplier disbursements
                    </p>
                  </div>
                </div>
              </div>

              {/* FILING INSTRUCTIONS INFORMATION */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[#000000]/60 space-y-3"
                id="tax-ph-guideline"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00B67A]" />
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-tight">
                    BIR Statutory Regulation Guidance
                  </span>
                </div>
                <div className="space-y-2 text-slate-600 text-[11px] leading-relaxed">
                  <p>
                    <b>VAT Tagging:</b> Tagging purchases is mandatory to claim
                    Input Taxes under <b>Section 110</b> of the Tax Code.
                  </p>
                  <p>
                    In accordance with the <b>E-Invoicing requirements (EIS)</b>{" "}
                    of Philippines, all invoices generated must possess
                    certified compliance signatures.
                  </p>
                </div>
              </div>
            </div>

            {/* TAX TRANSACTION CONFIG AND FORM SUBMISSION PANEL */}
            <div className="lg:col-span-2 space-y-6">
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5"
                id="tax-tagger-form"
              >
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
                    BIR-Ready Electronic Invoicing Preparation
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Encode & tag certified BIR Invoice classification schemas
                    before uploading to statutory platforms.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      VAT Tagging Schema (12% standard)
                    </label>
                    <select
                      value={birInvoiceForm.classification}
                      onChange={(e) =>
                        setBirInvoiceForm((old) => ({
                          ...old,
                          classification: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00B67A]"
                    >
                      <option value="vat_12">VAT standard (12%)</option>
                      <option value="vat_0">VAT Zero-rated (0%)</option>
                      <option value="vat_exempt">VAT Exempt</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Withholding Tax (EWT/EWT Sector)
                    </label>
                    <select
                      value={birInvoiceForm.withholding}
                      onChange={(e) =>
                        setBirInvoiceForm((old) => ({
                          ...old,
                          withholding: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00B67A]"
                    >
                      <option value="ewt_2">
                        EWT - Purchases of Services (2%)
                      </option>
                      <option value="ewt_1">
                        EWT - Purchases of Goods (1%)
                      </option>
                      <option value="ewt_5">
                        EWT - Rent leasehold parameters (5%)
                      </option>
                      <option value="none">None</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Invoice/Signature Reference ID
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00B67A]"
                      value={birInvoiceForm.referenceNum}
                      onChange={(e) =>
                        setBirInvoiceForm((old) => ({
                          ...old,
                          referenceNum: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Official Receipt Number Partner (OR)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00B67A]"
                      value={birInvoiceForm.orNumber}
                      onChange={(e) =>
                        setBirInvoiceForm((old) => ({
                          ...old,
                          orNumber: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Registered Enterprise VAT TIN No.
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00B67A]"
                      value={birInvoiceForm.tin}
                      onChange={(e) =>
                        setBirInvoiceForm((old) => ({
                          ...old,
                          tin: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                      Corporate Registration Legal Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white text-[#00B67A] font-bold border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-[#00B67A]"
                      value={birInvoiceForm.vatRegisteredName}
                      onChange={(e) =>
                        setBirInvoiceForm((old) => ({
                          ...old,
                          vatRegisteredName: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-200/40">
                  <button
                    onClick={handleTriggerBIRSubmission}
                    disabled={isSubmittingEInvoice}
                    className="px-6 py-3 bg-[#00B67A] text-white rounded-xl text-xs uppercase tracking-widest font-bold font-mono transition duration-150 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmittingEInvoice ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Digitally
                        Signing & Submitting...
                      </>
                    ) : (
                      <>
                        <FileCode className="w-4 h-4" /> Submit E-Invoice Schema
                        to BIR Portal
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* HISTORICAL STATUTORY FILINGS */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="tax-shards-log"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Submitted Government Filings
                </h3>

                <div className="space-y-3">
                  {birSubmissionLog.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                      No e-filings submitted during this terminal runtime
                      context.
                    </div>
                  ) : (
                    birSubmissionLog.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-900 font-bold">
                              {item.formType}
                            </span>
                            <span className="text-[9px] bg-emerald-950/40 text-[#00B67A] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-900/40">
                              PASSED
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-450">
                            Filing Receipt ID:{" "}
                            <b className="text-slate-700 font-sans">
                              {item.referenceReceipt}
                            </b>
                          </p>
                          <span className="text-[9px] text-slate-500 block">
                            {item.timestamp}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
                            VAT Account Liability Lock
                          </span>
                          <span className="text-xs font-semibold text-[#00B67A] block mt-1">
                            {formatPeso(item.vatDue)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 11 & 13: APPROVAL MATRIX & FRAUD ANOMALY RADAR */}
        {/* ========================================== */}
        {activeSubTab === "approvals_matrix_fraud" && (
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-mono text-xs"
            id="module-approval-fraud"
          >
            {/* WORKFLOW MATRIX CONTROLLER CONFIG */}
            <div className="space-y-6">
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="approval-matrix-settings"
              >
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#00B67A]">
                    Corporate Approvals Segregation
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Configurable role authorization matrices and spending limits
                    safeguards.
                  </p>
                </div>

                <div className="space-y-4 text-left">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">
                      Tier 1 Automatic Limit (Staff): ₱
                      {matrixSettings.lvl1Max.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="10000"
                      max="100000"
                      step="5000"
                      value={matrixSettings.lvl1Max}
                      onChange={(e) =>
                        setMatrixSettings((o) => ({
                          ...o,
                          lvl1Max: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full accent-[#00B67A] bg-slate-50 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">
                      Tier 2 Manager Required: ₱
                      {matrixSettings.lvl2Max.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="100000"
                      max="1000000"
                      step="25000"
                      value={matrixSettings.lvl2Max}
                      onChange={(e) =>
                        setMatrixSettings((o) => ({
                          ...o,
                          lvl2Max: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full accent-[#00B67A] bg-slate-50 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-slate-200/80">
                    <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={matrixSettings.twoLevelApprovalEnabled}
                        onChange={(e) =>
                          setMatrixSettings((o) => ({
                            ...o,
                            twoLevelApprovalEnabled: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-200 text-[#00B67A] focus:ring-[#00B67A] bg-white w-4 h-4 cursor-pointer"
                      />
                      <span>Enforce Double Signature (&gt; ₱100k)</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={matrixSettings.strictSodEnabled}
                        onChange={(e) =>
                          setMatrixSettings((o) => ({
                            ...o,
                            strictSodEnabled: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-200 text-[#00B67A] focus:ring-[#00B67A] bg-white w-4 h-4 cursor-pointer"
                      />
                      <span>Strict Segregation of Duties (SoD)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SEGREGATION VERIFICATION METRICS */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="sod-matrix-box"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Active SoD Hierarchy Verification
                </h3>

                <div className="space-y-3">
                  {[
                    {
                      entity: "Blesscent (BLS)",
                      creator: "Staff - encoded",
                      reviewer: "Finance Officer - audited",
                      approver: "Corporate Approver - final",
                    },
                    {
                      entity: "Scentimo (SCT)",
                      creator: "Staff - encoded",
                      reviewer: "Finance Officer - audited",
                      approver: "Group Admin - bypassed",
                    },
                  ].map((s_itm, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-zinc-850 rounded-xl space-y-2 text-[11px]"
                    >
                      <span className="font-bold text-slate-900 block">
                        {s_itm.entity}
                      </span>
                      <div className="space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span>Creator:</span>{" "}
                          <span className="text-slate-500 font-bold">
                            {s_itm.creator}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reviewer:</span>{" "}
                          <span className="text-slate-500 font-bold">
                            {s_itm.reviewer}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Approver:</span>{" "}
                          <span className="text-[#00B67A] font-bold">
                            {s_itm.approver}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FRAUD DETECTION & ANOMALY MONITOR RADAR */}
            <div
              className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5"
              id="fraud-bento-box"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="text-red-400 w-5 h-5 animate-bounce" />{" "}
                    Fraud Detection & Transaction Heuristics Radar
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Real-time artificial anomaly monitors scanning general
                    disbursements for irregularities.
                  </p>
                </div>
                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest bg-rose-950/20 border border-rose-900/30 px-3 py-1 rounded-full shrink-0">
                  Anomaly Monitor active
                </span>
              </div>

              <div className="space-y-3">
                {fraudAuditLogs.map((alertItem) => (
                  <div
                    key={alertItem.id}
                    onClick={() => setEscalatedAuditId(alertItem.id)}
                    className={`cursor-pointer hover:shadow-lg p-4 border-l-4 rounded-2xl transition duration-150 flex flex-col sm:flex-row items-start justify-between gap-4 ${
                      alertItem.active
                        ? alertItem.severity === "HIGH"
                          ? "bg-red-50 border-red-500 hover:bg-red-100"
                          : "bg-amber-50 border-amber-500 hover:bg-amber-100"
                        : "bg-slate-50/40 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 text-left">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            alertItem.active
                              ? alertItem.severity === "HIGH"
                                ? "bg-red-950/80 text-red-400 border border-red-900/40"
                                : "bg-amber-950/80 text-amber-400 border border-amber-900/40"
                              : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          {alertItem.type}
                        </span>
                        <span className="text-[10px] text-slate-600 font-bold font-sans">
                          [{alertItem.severity} RISK]
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          {alertItem.dt}
                        </span>
                      </div>
                      <p
                        className={`text-xs ${alertItem.active ? "text-slate-800" : "text-zinc-550"} leading-tight`}
                      >
                        {alertItem.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 sm:self-center shrink-0">
                      {alertItem.active ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissFraudAlert(alertItem.id);
                            }}
                            className="bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl cursor-pointer hover:border-slate-300 text-[10px] transition"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEscalateFraudAlert(alertItem.id);
                            }}
                            className="bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-200/80 px-3.5 py-1.5 rounded-xl cursor-pointer text-[10px] font-bold tracking-wide transition"
                          >
                            Escalate Audit
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic uppercase">
                          Log Cleared
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 12: DOCUMENT ARCHIVE & OCR ATTACHMENT VAULT */}
        {/* ========================================== */}
        {activeSubTab === "ocr_vault" && (
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-mono text-xs"
            id="module-ocr-vault"
          >
            {/* DOCUMENT QUEUE AND OCR PRE-DEFINED LIST */}
            <div className="space-y-6">
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
                id="vault-predefined-list"
              >
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#00B67A]">
                    Supplier Invoices & Receipts
                  </h3>
                  <p className="text-[10.5px] text-slate-500">
                    Choose a physical document variant below to simulate
                    immediate machine OCR recognition
                  </p>
                </div>

                <div className="space-y-3">
                  {predefinedVaultTemplates.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        handleSimulateOCR(item.filename, item.text)
                      }
                      className={`w-full p-4 border rounded-xl text-left transition duration-150 flex flex-col justify-between cursor-pointer ${
                        currentAttachmentFile === item.filename
                          ? "bg-slate-50 hover:bg-slate-50 border-[#00B67A]"
                          : "bg-white border-zinc-850 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-bold text-slate-900 text-[11px] leading-tight block">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1.5 font-sans italic">
                        {item.filename}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE VAULT METRICS INTEGRITY */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-3"
                id="vault-integrity-stats"
              >
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
                  SECURE VAULT INTEGRITY
                </span>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] text-zinc-450 block">
                      Encrypted Assets
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      42 Files
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-450 block">
                      OCR Match Success
                    </span>
                    <span className="text-sm font-bold text-[#00B67A]">
                      100.0%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* OCR EXTRACTOR AREA CONTAINER */}
            <div
              className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5"
              id="bento-ocr-workspace"
            >
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
                  Voucher OCR Extraction Desk
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Simulate instant optical character recognition alignment with
                  active Filipino transactions.
                </p>
              </div>

              {/* DROP OR ACTIVE FILE VIEWPORT */}
              <div
                className="border border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/30"
                id="ocr-simulation-pane"
              >
                {ocrStatus === "idle" ? (
                  <div className="py-12 space-y-3 flex flex-col items-center">
                    <Upload className="w-10 h-10 text-slate-500 animate-pulse" />
                    <p className="text-zinc-450 text-xs">
                      Drag and drop supplier invoice/receipt PDFs here, or
                      choose a pre-loaded document from the sidebar list.
                    </p>
                  </div>
                ) : ocrStatus === "scanning" ? (
                  <div className="py-12 space-y-4 flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 text-[#00B67A] animate-spin" />
                    <span className="text-slate-900 text-xs font-bold uppercase tracking-widest animate-pulse">
                      Running OCR Neural Text Scan...
                    </span>
                  </div>
                ) : (
                  <div
                    className="text-left space-y-4 animate-fadeIn"
                    id="ocr-success-display"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-900 font-bold bg-white border border-zinc-805 px-3 py-1 rounded-lg uppercase tracking-wider">
                          File: {currentAttachmentFile}
                        </span>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-xl uppercase font-bold tracking-widest">
                        OCR Cleared 99.2% Conf
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                          Extracted Vendor Name
                        </span>
                        <span className="text-xs font-bold text-slate-900 uppercase block mt-1">
                          {ocrExtractedData?.supplier || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                          Filing Invoice Date
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-1">
                          {ocrExtractedData?.date || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                          Taxpayer Registry TIN
                        </span>
                        <span className="text-xs font-bold text-[#00B67A] block mt-1">
                          {ocrExtractedData?.tin || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                          Identified Value Match (Gross)
                        </span>
                        <span className="text-sm font-bold text-slate-900 block mt-1 underline decoration-emerald-500 font-mono">
                          {ocrExtractedData?.total ||
                            ocrExtractedData?.transfer ||
                            "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        onClick={() => {
                          toast.success("Metadata Applied", {
                            description:
                              "OCR parsed metadata applied. Receipt values linked to ledger parameters matching June 10 expenditures.",
                          });
                          setOcrStatus("idle");
                        }}
                        className="px-5 py-2.5 bg-[#00B67A] text-white font-bold rounded-xl hover:bg-emerald-600 transition tracking-wider text-[10px]"
                      >
                        Map Metadata & Link to General Ledger
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 15: MONTH-END CLOSING WORKSPACE */}
        {/* ========================================== */}
        {activeSubTab === "month_end_workspace" && (
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-mono text-xs"
            id="module-month-closing"
          >
            {/* COMPLIANCE RATING INDEX & CLOSING PROCESS */}
            <div className="space-y-6">
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md text-center space-y-4"
                id="closing-audit-cockpit"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Month-End Audit Readiness Rating
                </h3>

                <div className="relative py-4 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-200 flex items-center justify-center relative">
                    <span className="text-3xl font-extrabold text-[#00B67A] font-sans">
                      {closingAuditScore}%
                    </span>
                  </div>
                  <span className="text-[9px] text-[#00B67A] bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full uppercase font-bold tracking-widest mt-4">
                    Audit Ready
                  </span>
                </div>

                <p className="text-[10.5px] text-slate-600 leading-relaxed text-left">
                  An automatic compliance check grading completeness of ledger
                  entries, associated compliance codes, bank matches, and
                  security levels. Reaching <b>&gt;85%</b> permits permanent
                  monthly locks.
                </p>
              </div>

              {/* PIN LOCK BYPASS INSTRUCTIONS */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-3 font-sans text-left"
                id="bypass-info"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Award className="w-5 h-5 text-[#00B67A]" />
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Simulated Bypass Code
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 tracking-tight leading-relaxed">
                  To simulate the monthly lock operation and permanently freeze
                  ledger parameters, use the bypass token code:{" "}
                  <b className="text-emerald-400 font-mono text-xs font-black">
                    2026
                  </b>
                  .
                </p>
              </div>
            </div>

            {/* MONTH-END CHECKLIST WORKSPACE */}
            <div
              className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5"
              id="bento-closings-manager"
            >
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
                  Fiscal Closings Tracker
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Track compliance items and reconcile general accounts prior to
                  freezing the monthly journals.
                </p>
              </div>

              <div className="space-y-2.5">
                {closingSteps.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => toggleClosingStep(s.id)}
                    className="w-full p-4 bg-white border border-slate-200/40 hover:border-slate-300 rounded-2xl text-left transition flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 select-none flex-1">
                      <div
                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                          s.completed
                            ? "border-[#00B67A] bg-emerald-50 text-emerald-600"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        {s.completed && <CheckSquare className="w-4 h-4" />}
                      </div>
                      <span
                        className={`text-xs ${s.completed ? "text-zinc-450 line-through" : "text-slate-800"}`}
                      >
                        {s.task}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold ${s.completed ? "text-[#00B67A]" : "text-amber-500"}`}
                    >
                      {s.completed ? "COMPLETED" : "PENDING"}
                    </span>
                  </button>
                ))}
              </div>

              {/* CLOSINGS LOCK FOOTER PANEL */}
              <div className="pt-5 border-t border-slate-200/40">
                <form
                  onSubmit={handleCloseAndLockPeriod}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-left"
                >
                  <div>
                    <label className="text-[10.5px] uppercase text-slate-500 block mb-1">
                      Authorization Bypass PIN Code Key
                    </label>
                    <input
                      type="password"
                      placeholder="Input Trustee PIN Code..."
                      required
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      disabled={periodLocked}
                      className="px-3.5 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl focus:outline-hidden focus:border-red-400 placeholder-zinc-700 font-mono text-xs font-black min-w-[200px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={periodLocked || closingAuditScore < 85}
                    className={`px-6 py-3 font-mono font-bold text-xs uppercase tracking-widest rounded-xl transition duration-150 cursor-pointer ${
                      periodLocked
                        ? "bg-red-950/20 text-red-500 border border-red-900/40 cursor-not-allowed"
                        : closingAuditScore < 85
                          ? "bg-slate-50 text-slate-500 cursor-not-allowed"
                          : "bg-red-950/60 hover:bg-rose-900/60 text-red-400 border border-red-200/80 hover:border-red-500"
                    }`}
                  >
                    {periodLocked
                      ? "PERIOD PERMANENTLY LOCKED"
                      : "COMMIT MONTH-END LOCK"}
                  </button>
                </form>
                {closingAuditScore < 85 && !periodLocked && (
                  <p className="text-[10.5px] text-amber-500 font-bold mt-3">
                    ⚠️ Complete at least 2 more checklist categories to hit
                    &gt;85% Audit score to lock period.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* 16: ENTERPRISE SECURITY & DATA GOVERNANCE */}
        {/* ========================================== */}
        {activeSubTab === "governance_security" && (
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-mono text-xs"
            id="module-security"
          >
            {/* DATA GOVERNANCE CONTROL COCKPIT */}
            <div className="space-y-6">
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4 text-left"
                id="security-control-matrix"
              >
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#00B67A]">
                    MFA & Security Parameters
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Protect sensitive group corporate records and files.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white border border-zinc-850 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 text-xs block">
                        MFA Access Gateways
                      </span>
                      <span className="text-[9.5px] text-slate-500 block">
                        Enforce authentication checkpoints
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setMfaEnabled(!mfaEnabled);
                        onAuditLogged();
                      }}
                      className={`px-3.5 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer ${
                        mfaEnabled
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-red-50 text-[#EF4444] border border-red-900/40"
                      }`}
                    >
                      {mfaEnabled ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
                      Active Encryption Shards standard
                    </span>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-700 font-semibold truncate max-w-[120px]">
                        {dataEncryptionKey}
                      </span>
                      <button
                        onClick={rotatedEncryptionKeys}
                        className="text-[9px] bg-slate-50 text-slate-700 px-2.5 py-1 rounded hover:bg-slate-100 transition"
                      >
                        Rotate Key
                      </button>
                    </div>
                    <span className="text-[9px] text-zinc-550 block">
                      Last encryption key rotation: {encryptionRotatedDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECURE BLOCKCHAIN BACKUP ARCHIVE */}
              <div
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-3 text-left"
                id="security-audit-integrity"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Fingerprint className="text-[#00B67A] w-5 h-5 animate-pulse" />
                  <span className="font-bold text-slate-900 text-xs uppercase">
                    Ledger Encryption Integrity
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed leading-tight text-slate-500">
                  Every transaction ledger modification hashes into block
                  states, creating irreversible cryptographic audit tracking
                  signatures.
                </p>
              </div>
            </div>

            {/* IP RANGE AND SESSION CONTROLS */}
            <div
              className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4"
              id="bento-security-nodes"
            >
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
                  Active Authorized Session Nodes
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Authorized terminals and network endpoints permitted to alter
                  consolidated systems.
                </p>
              </div>

              <div className="space-y-3">
                {securityDevicesNode.map((node, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-900 font-bold">
                          {node.ip}
                        </span>
                        <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-200">
                          {node.mfaState}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 font-semibold">
                        {node.device}
                      </p>
                      <span className="text-[9px] text-slate-500 block">
                        {node.time}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block">
                        Geographical Node
                      </span>
                      <span className="text-xs font-semibold text-slate-900 block mt-1">
                        {node.location}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULL-SCREEN DETAILED AUDIT TRAIL MODAL */}
      {escalatedAuditId &&
        (() => {
          const activeAudit = fraudAuditLogs.find(
            (l) => l.id === escalatedAuditId,
          );
          if (!activeAudit) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fadeIn">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-light text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="text-red-400 w-5 h-5" /> Detailed
                      Audit Trail
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      Audit ID: {activeAudit.id} | Generated: {activeAudit.dt}
                    </p>
                  </div>
                  <button
                    onClick={() => setEscalatedAuditId(null)}
                    className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                      System Compliance Alert Trigger
                    </h4>
                    <div className="bg-red-50 border border-red-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-red-950 text-red-400 px-2.5 py-1 rounded-md text-[10px] font-bold border border-red-900/50">
                          {activeAudit.severity} RISK
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900 tracking-widest">
                          {activeAudit.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {activeAudit.message}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">
                        Involved Entity
                      </span>
                      <span className="text-sm text-slate-900 font-mono">
                        {activeAudit.companyCode} Subsidiary
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">
                        Detection Vector
                      </span>
                      <span className="text-sm text-slate-900 font-mono">
                        Heuristic Analysis Model v2.4
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">
                        Action Required
                      </span>
                      <span className="text-sm text-amber-500 font-mono">
                        Manual CFO Escalation
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">
                        Network Trace
                      </span>
                      <span className="text-sm text-slate-600 font-mono">
                        IP: 192.168.1.104
                      </span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3 text-left">
                    <button
                      onClick={() => setEscalatedAuditId(null)}
                      className="px-4 py-2 text-[10px] md:text-xs font-mono font-bold tracking-widest text-slate-600 hover:text-slate-900 transition cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => {
                        handleDismissFraudAlert(activeAudit.id);
                        setEscalatedAuditId(null);
                      }}
                      className="px-5 py-2 text-[10px] md:text-xs font-mono font-bold tracking-widest bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-200/80 rounded-xl transition cursor-pointer"
                    >
                      FREEZE RELATED TRANSACTIONS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
