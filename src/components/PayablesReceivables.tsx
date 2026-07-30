/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Plus,
  AlertTriangle,
  FolderMinus,
  FolderPlus,
  CheckCircle2,
  Search,
  XCircle,
  UploadCloud,
  FileCheck2,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  getPayables,
  getReceivables,
  insertPayable,
  insertReceivable,
  markPayableAsPaid,
  markReceivableAsCollected,
  canWriteFinance,
  getCategories,
  getCashAccounts,
  getCompanies,
  saveAttachment,
  useDBUpdate,
} from "../data/mockDatabase";
import { CashAccount, Payable, Receivable } from "../types";
import { compressImage } from "../lib/imageUtils";
import { uploadPrivateDocument } from "../lib/privateDocuments";
import { toast } from "sonner";

interface PayablesReceivablesProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
}

type StatusFilter = "all" | "overdue" | "open" | "settled";
type SettlementTarget =
  | { kind: "ap"; record: Payable }
  | { kind: "ar"; record: Receivable };

const TONE_STYLES = {
  neutral: { bg: "bg-slate-50", text: "text-slate-900", border: "border-slate-200" },
  danger: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  success: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
} as const;

const FORM_LABEL_CLASS =
  "mb-1 block text-[10px] font-mono font-medium uppercase tracking-widest text-slate-500";
const FORM_CONTROL_CLASS =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 font-mono placeholder:text-slate-400 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const accountLabel = (account: CashAccount) =>
  `${account.bankName || account.accountType} — ${account.accountName} ••••${account.accountNumber.slice(-4)}`;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the selected receipt."));
    reader.readAsDataURL(file);
  });

function StatCard({
  label,
  amount,
  count,
  tone,
}: {
  label: string;
  amount: string;
  count: number;
  tone: keyof typeof TONE_STYLES;
}) {
  const t = TONE_STYLES[tone];
  return (
    <div className={`p-4 rounded-2xl border ${t.border} ${t.bg}`}>
      <div className="text-[9px] font-bold uppercase tracking-widest font-mono text-slate-500">
        {label}
      </div>
      <div className={`mt-1.5 font-mono text-lg font-bold ${t.text} truncate`}>
        {amount}
      </div>
      <div className="mt-0.5 text-[10px] font-mono text-slate-500">
        {count} {count === 1 ? "item" : "items"}
      </div>
    </div>
  );
}

function ReceiptUploadField({
  file,
  isPreparing,
  isSubmitting,
  onSelect,
  onRemove,
}: {
  file: File | null;
  isPreparing: boolean;
  isSubmitting: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const disabled = isPreparing || isSubmitting;

  return (
    <div className="sm:col-span-2">
      <span className={FORM_LABEL_CLASS}>Receipt / Supporting Document</span>
      <label
        className={`flex min-h-20 items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-3 transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
            : "cursor-pointer border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/40"
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            event.currentTarget.value = "";
            if (selectedFile) onSelect(selectedFile);
          }}
        />
        {isPreparing ? (
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        ) : (
          <UploadCloud className="h-5 w-5 text-slate-500" />
        )}
        <div>
          <p className="text-xs font-semibold text-slate-700">
            {isPreparing ? "Preparing receipt..." : "Upload receipt or invoice"}
          </p>
          <p className="mt-0.5 text-[10px] font-mono text-slate-400">
            JPG, PNG, WEBP, or PDF · maximum 10 MB
          </p>
        </div>
      </label>

      {file && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-emerald-800">{file.name}</p>
              <p className="text-[9px] font-mono text-emerald-600">
                {(file.size / 1024).toFixed(1)} KB ready to upload
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="cursor-pointer rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Remove selected receipt"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function PayablesReceivables({
  userId,
  companyId,
  onAuditLogged,
}: PayablesReceivablesProps) {
  useDBUpdate();

  // Tabs
  const [activeSegment, setActiveSegment] = useState<"ap" | "ar">("ap");

  // Modal Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetCompany, setTargetCompany] = useState<string>(companyId === "all" ? "" : companyId);
  const [apPayee, setApPayee] = useState("");
  const [apDesc, setApDesc] = useState("");
  const [apAmount, setApAmount] = useState("");
  const [apDueDate, setApDueDate] = useState("");
  const [apQty, setApQty] = useState("");
  const [apUom, setApUom] = useState("");
  const [apUnitPrice, setApUnitPrice] = useState("");
  const [apRemarks, setApRemarks] = useState("");
  const [apSettlementAccountId, setApSettlementAccountId] = useState("");
  const [apCategoryId, setApCategoryId] = useState("");

  // AR form states
  const [arPayer, setArPayer] = useState("");
  const [arDesc, setArDesc] = useState("");
  const [arAmount, setArAmount] = useState("");
  const [arDueDate, setArDueDate] = useState("");
  const [arCollectionAccountId, setArCollectionAccountId] = useState("");
  const [arCategoryId, setArCategoryId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null);
  const [isPreparingReceipt, setIsPreparingReceipt] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  // Payment / collection confirmation
  const [settlementTarget, setSettlementTarget] =
    useState<SettlementTarget | null>(null);
  const [settlementAccountId, setSettlementAccountId] = useState("");
  const [settlementCategoryId, setSettlementCategoryId] = useState("");

  // Local errors
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Search / filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const payables = getPayables(userId, companyId);
  const receivables = getReceivables(userId, companyId);
  const companies = getCompanies();
  const formCompanyId =
    targetCompany || (companyId === "all" ? "" : companyId);
  const formAccounts = formCompanyId
    ? getCashAccounts(formCompanyId).filter((account) => account.isActive)
    : [];
  const apCategories = formCompanyId
    ? getCategories(formCompanyId).filter(
        (category) => category.type === "cash_out",
      )
    : [];
  const arCategories = formCompanyId
    ? getCategories(formCompanyId).filter(
        (category) => category.type === "cash_in",
      )
    : [];
  const allCashAccounts = companies.flatMap((company) =>
    getCashAccounts(company.id),
  );
  const cashAccountById = new Map(
    allCashAccounts.map((account) => [account.id, account]),
  );

  const settlementCompanyId = settlementTarget?.record.companyId || "";
  const settlementAccounts = settlementCompanyId
    ? getCashAccounts(settlementCompanyId).filter(
        (account) => account.isActive,
      )
    : [];
  const settlementCategories = settlementCompanyId
    ? getCategories(settlementCompanyId).filter((category) =>
        settlementTarget?.kind === "ap"
          ? category.type === "cash_out"
          : category.type === "cash_in",
      )
    : [];
  const selectedSettlementAccount =
    settlementAccounts.find(
      (account) => account.id === settlementAccountId,
    ) || null;
  const settlementAmount = settlementTarget?.record.amount || 0;
  const projectedSettlementBalance = selectedSettlementAccount
    ? selectedSettlementAccount.currentBalance +
      (settlementTarget?.kind === "ap"
        ? -settlementAmount
        : settlementAmount)
    : null;

  // PESO FORMATTER
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const sevenDaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  const daysOverdue = (dueDate: string) => {
    const diffMs = new Date(todayStr).getTime() - new Date(dueDate).getTime();
    return Math.max(1, Math.round(diffMs / 86400000));
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptDataUrl(null);
    setIsPreparingReceipt(false);
  };

  const handleReceiptSelect = async (file: File) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      setFormError("Receipt must be a JPG, PNG, WEBP, or PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError("Receipt file must be 10 MB or smaller.");
      return;
    }

    setFormError("");
    setIsPreparingReceipt(true);
    try {
      const dataUrl = file.type.startsWith("image/")
        ? await compressImage(file)
        : await readFileAsDataUrl(file);
      setReceiptFile(file);
      setReceiptDataUrl(dataUrl);
    } catch (error: any) {
      clearReceipt();
      setFormError(error?.message || "Could not prepare the selected receipt.");
    } finally {
      setIsPreparingReceipt(false);
    }
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    clearReceipt();
    setFormError("");
    setFormSuccess("");
  };

  const switchSegment = (segment: "ap" | "ar") => {
    setActiveSegment(segment);
    closeAddForm();
    setSearchTerm("");
    setStatusFilter("all");
  };

  // AP derived stats + filtered/sorted rows
  const apStats = useMemo(() => {
    const outstanding = payables.filter((p) => p.status !== "paid");
    const overdue = outstanding.filter((p) => p.dueDate < todayStr);
    const dueSoon = outstanding.filter(
      (p) => p.dueDate >= todayStr && p.dueDate <= sevenDaysStr,
    );
    const settled = payables.filter((p) => p.status === "paid");
    const sum = (list: Payable[]) => list.reduce((s, p) => s + p.amount, 0);
    return {
      outstanding: { count: outstanding.length, amount: sum(outstanding) },
      overdue: { count: overdue.length, amount: sum(overdue) },
      dueSoon: { count: dueSoon.length, amount: sum(dueSoon) },
      settled: { count: settled.length, amount: sum(settled) },
    };
  }, [payables, todayStr, sevenDaysStr]);

  const filteredPayables = useMemo(() => {
    return payables
      .filter((p) => {
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          if (
            !p.payee.toLowerCase().includes(s) &&
            !p.description.toLowerCase().includes(s)
          )
            return false;
        }
        const isOverdue = p.status !== "paid" && p.dueDate < todayStr;
        if (statusFilter === "overdue") return isOverdue;
        if (statusFilter === "open") return p.status !== "paid";
        if (statusFilter === "settled") return p.status === "paid";
        return true;
      })
      .sort((a, b) => {
        const aDone = a.status === "paid" ? 1 : 0;
        const bDone = b.status === "paid" ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [payables, searchTerm, statusFilter, todayStr]);

  // AR derived stats + filtered/sorted rows
  const arStats = useMemo(() => {
    const outstanding = receivables.filter((r) => r.status !== "collected");
    const overdue = outstanding.filter((r) => r.dueDate < todayStr);
    const dueSoon = outstanding.filter(
      (r) => r.dueDate >= todayStr && r.dueDate <= sevenDaysStr,
    );
    const settled = receivables.filter((r) => r.status === "collected");
    const sum = (list: Receivable[]) => list.reduce((s, r) => s + r.amount, 0);
    return {
      outstanding: { count: outstanding.length, amount: sum(outstanding) },
      overdue: { count: overdue.length, amount: sum(overdue) },
      dueSoon: { count: dueSoon.length, amount: sum(dueSoon) },
      settled: { count: settled.length, amount: sum(settled) },
    };
  }, [receivables, todayStr, sevenDaysStr]);

  const filteredReceivables = useMemo(() => {
    return receivables
      .filter((r) => {
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          if (
            !r.payer.toLowerCase().includes(s) &&
            !r.description.toLowerCase().includes(s)
          )
            return false;
        }
        const isOverdue = r.status !== "collected" && r.dueDate < todayStr;
        if (statusFilter === "overdue") return isOverdue;
        if (statusFilter === "open") return r.status !== "collected";
        if (statusFilter === "settled") return r.status === "collected";
        return true;
      })
      .sort((a, b) => {
        const aDone = a.status === "collected" ? 1 : 0;
        const bDone = b.status === "collected" ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [receivables, searchTerm, statusFilter, todayStr]);

  const stats = activeSegment === "ap" ? apStats : arStats;
  const hasAnyRecords =
    activeSegment === "ap" ? payables.length > 0 : receivables.length > 0;
  const filteredCount =
    activeSegment === "ap" ? filteredPayables.length : filteredReceivables.length;
  const isFiltering = searchTerm.trim() !== "" || statusFilter !== "all";

  const apFilterOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "open", label: "Unpaid" },
    { value: "overdue", label: "Overdue" },
    { value: "settled", label: "Paid" },
  ];
  const arFilterOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "overdue", label: "Overdue" },
    { value: "settled", label: "Collected" },
  ];
  const filterOptions = activeSegment === "ap" ? apFilterOptions : arFilterOptions;

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const handleTargetCompanyChange = (nextCompanyId: string) => {
    setTargetCompany(nextCompanyId);
    setApSettlementAccountId("");
    setApCategoryId("");
    setArCollectionAccountId("");
    setArCategoryId("");
  };

  // Submit AP invoice
  const handleAddAP = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const amt = parseFloat(apAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError(
        "Liability pricing error: capital must be strictly positive.",
      );
      return;
    }
    if (
      !apPayee.trim() ||
      !apDesc.trim() ||
      !apDueDate ||
      !apSettlementAccountId ||
      !apCategoryId
    ) {
      setFormError(
        "Payee, description, due date, payment account, and category are required.",
      );
      return;
    }
    const finalCompanyId = targetCompany || companyId;
    if (finalCompanyId === "all" || !finalCompanyId) {
      setFormError("Please select a valid company for this payable target.");
      return;
    }

    setIsSubmittingEntry(true);
    try {
      const receiptPath =
        receiptFile && receiptDataUrl
          ? await uploadPrivateDocument(
              receiptDataUrl,
              finalCompanyId,
              receiptFile.name,
            )
          : null;
      const { error, payable } = insertPayable(userId, {
        companyId: finalCompanyId,
        payee: apPayee,
        description: apDesc,
        amount: amt,
        qty: apQty ? parseFloat(apQty) : undefined,
        uom: apUom ? apUom.trim() : undefined,
        unitPrice: apUnitPrice ? parseFloat(apUnitPrice) : undefined,
        remarks: apRemarks ? apRemarks.trim() : undefined,
        receiptPath,
        dueDate: apDueDate,
        settlementAccountId: apSettlementAccountId,
        settlementCategoryId: apCategoryId,
      });

      if (error || !payable) {
        setFormError(error || "Unable to save the payable.");
        return;
      }

      if (receiptFile && receiptPath) {
        const attachmentResult = saveAttachment(userId, finalCompanyId, {
          fileName: receiptFile.name,
          fileType: receiptFile.type,
          fileUrl: receiptPath,
          entityType: "payable",
          entityId: payable.id,
        });
        if (attachmentResult.error) {
          toast.warning("Payable saved, but the receipt could not be added to Document Vault.");
        }
      }

      setFormSuccess("Accounts payable logged successfully!");
      setApPayee("");
      setApDesc("");
      setApAmount("");
      setApDueDate("");
      setApQty("");
      setApUom("");
      setApUnitPrice("");
      setApRemarks("");
      setApSettlementAccountId("");
      setApCategoryId("");
      clearReceipt();
      setTimeout(closeAddForm, 1500);
      onAuditLogged();
    } catch (error: any) {
      setFormError(error?.message || "Secure receipt upload failed.");
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  // Submit AR invoice
  const handleAddAR = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const amt = parseFloat(arAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError(
        "Asset claim pricing error: capital must be strictly positive.",
      );
      return;
    }
    if (
      !arPayer.trim() ||
      !arDesc.trim() ||
      !arDueDate ||
      !arCollectionAccountId ||
      !arCategoryId
    ) {
      setFormError(
        "Payer, description, claim due date, collection account, and category are required.",
      );
      return;
    }
    const finalCompanyId = targetCompany || companyId;
    if (finalCompanyId === "all" || !finalCompanyId) {
      setFormError("Please select a valid company for this receivable target.");
      return;
    }

    setIsSubmittingEntry(true);
    try {
      const receiptPath =
        receiptFile && receiptDataUrl
          ? await uploadPrivateDocument(
              receiptDataUrl,
              finalCompanyId,
              receiptFile.name,
            )
          : null;
      const { error, receivable } = insertReceivable(userId, {
        companyId: finalCompanyId,
        payer: arPayer,
        description: arDesc,
        amount: amt,
        receiptPath,
        dueDate: arDueDate,
        collectionAccountId: arCollectionAccountId,
        collectionCategoryId: arCategoryId,
      });

      if (error || !receivable) {
        setFormError(error || "Unable to save the receivable.");
        return;
      }

      if (receiptFile && receiptPath) {
        const attachmentResult = saveAttachment(userId, finalCompanyId, {
          fileName: receiptFile.name,
          fileType: receiptFile.type,
          fileUrl: receiptPath,
          entityType: "receivable",
          entityId: receivable.id,
        });
        if (attachmentResult.error) {
          toast.warning("Receivable saved, but the receipt could not be added to Document Vault.");
        }
      }

      setFormSuccess("Accounts receivable logged successfully!");
      setArPayer("");
      setArDesc("");
      setArAmount("");
      setArDueDate("");
      setArCollectionAccountId("");
      setArCategoryId("");
      clearReceipt();
      setTimeout(closeAddForm, 1500);
      onAuditLogged();
    } catch (error: any) {
      setFormError(error?.message || "Secure receipt upload failed.");
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const openSettlementConfirmation = (target: SettlementTarget) => {
    const accounts = getCashAccounts(target.record.companyId).filter(
      (account) => account.isActive,
    );
    const categoryType = target.kind === "ap" ? "cash_out" : "cash_in";
    const categories = getCategories(target.record.companyId).filter(
      (category) => category.type === categoryType,
    );
    const savedAccountId =
      target.kind === "ap"
        ? target.record.settlementAccountId
        : target.record.collectionAccountId;
    const savedCategoryId =
      target.kind === "ap"
        ? target.record.settlementCategoryId
        : target.record.collectionCategoryId;

    setSettlementTarget(target);
    setSettlementAccountId(savedAccountId || accounts[0]?.id || "");
    setSettlementCategoryId(savedCategoryId || categories[0]?.id || "");
  };

  const handleConfirmSettlement = () => {
    if (!settlementTarget || !settlementAccountId || !settlementCategoryId) {
      toast.error("Account and category are required.");
      return;
    }

    if (settlementTarget.kind === "ap") {
      const { error, txn } = markPayableAsPaid(
        userId,
        settlementTarget.record.id,
        settlementCategoryId,
        settlementAccountId,
      );
      if (error) {
        toast.error("Payment request failed", { description: error });
        return;
      }
      toast.success("Payment sent for approval", {
        description: `Pending cash-out transaction #${txn?.id} will use the selected account after approval.`,
      });
    } else {
      const { error, txn } = markReceivableAsCollected(
        userId,
        settlementTarget.record.id,
        settlementCategoryId,
        settlementAccountId,
      );
      if (error) {
        toast.error("Collection request failed", { description: error });
        return;
      }
      toast.success("Collection sent for approval", {
        description: `Pending cash-in transaction #${txn?.id} will post to the selected account after approval.`,
      });
    }

    setSettlementTarget(null);
    setSettlementAccountId("");
    setSettlementCategoryId("");
    onAuditLogged();
  };

  return (
    <div className="space-y-6">
      {/* SEGMENT HEADERS NAVIGATION */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl">
        <div className="flex gap-1 p-1 bg-slate-100 border border-slate-200 rounded-2xl select-none">
          <button
            onClick={() => switchSegment("ap")}
            disabled={isPreparingReceipt || isSubmittingEntry}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-xl cursor-pointer transition flex items-center gap-1.5 ${activeSegment === "ap" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            <FolderMinus className="w-4 h-4" />
            <span>Accounts Payable (AP)</span>
          </button>
          <button
            onClick={() => switchSegment("ar")}
            disabled={isPreparingReceipt || isSubmittingEntry}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-xl cursor-pointer transition flex items-center gap-1.5 ${activeSegment === "ar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>Accounts Receivable (AR)</span>
          </button>
        </div>

        {canWriteFinance(userId, companyId) && (
          <button
            onClick={() => (showAddForm ? closeAddForm() : setShowAddForm(true))}
            disabled={isPreparingReceipt || isSubmittingEntry}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-2xl cursor-pointer shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              Register New{" "}
              {activeSegment === "ap" ? "Liability bill" : "Asset claim"}
            </span>
          </button>
        )}
      </div>

      {/* KPI SUMMARY ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Outstanding"
          amount={formatPeso(stats.outstanding.amount)}
          count={stats.outstanding.count}
          tone="neutral"
        />
        <StatCard
          label="Overdue"
          amount={formatPeso(stats.overdue.amount)}
          count={stats.overdue.count}
          tone="danger"
        />
        <StatCard
          label="Due Within 7 Days"
          amount={formatPeso(stats.dueSoon.amount)}
          count={stats.dueSoon.count}
          tone="warning"
        />
        <StatCard
          label={activeSegment === "ap" ? "Paid" : "Collected"}
          amount={formatPeso(stats.settled.amount)}
          count={stats.settled.count}
          tone="success"
        />
      </div>

      {/* RENDER ADD POPUP ACCORDION */}
      {showAddForm && (
        <div className="animate-fadeIn overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-emerald-600">
                Quick Encode —{" "}
                {activeSegment === "ap"
                  ? "Accounts Payable"
                  : "Accounts Receivable"}
              </h3>
              <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                {activeSegment === "ap"
                  ? "Record the liability and account that will fund payment."
                  : "Record the claim and account that will receive collection."}
              </p>
            </div>
            <button
              onClick={closeAddForm}
              disabled={isPreparingReceipt || isSubmittingEntry}
              aria-label="Close form"
              className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4">
            <div className="mx-auto max-w-3xl">
              {activeSegment === "ap" ? (
              <form
                onSubmit={handleAddAP}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Type</span>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <span className="flex-1 rounded-md py-1.5 text-center text-xs font-mono text-slate-500">
                      Cash In
                    </span>
                    <span className="flex-1 rounded-md bg-rose-500 py-1.5 text-center text-xs font-mono font-bold text-white">
                      Cash Out
                    </span>
                  </div>
                </div>

                {companyId === "all" && (
                  <div className="sm:col-span-2">
                    <span className={FORM_LABEL_CLASS}>Target Company</span>
                    <select
                      value={targetCompany}
                      onChange={(e) =>
                        handleTargetCompanyChange(e.target.value)
                      }
                      className={FORM_CONTROL_CLASS}
                      required
                    >
                      <option value="" disabled>
                        Select a company
                      </option>
                      {companies
                        .filter((company) => company.id !== "all")
                        .map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name} ({company.code})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <span className={FORM_LABEL_CLASS}>Due Date Limit</span>
                  <input
                    type="date"
                    value={apDueDate}
                    onChange={(e) => setApDueDate(e.target.value)}
                    required
                    className={FORM_CONTROL_CLASS}
                  />
                </div>
                <div>
                  <span className={FORM_LABEL_CLASS}>PHP Amount</span>
                  <input
                    type="number"
                    value={apAmount}
                    onChange={(e) => setApAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    required
                    className={FORM_CONTROL_CLASS}
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Purpose / Payee</span>
                  <input
                    type="text"
                    value={apPayee}
                    onChange={(e) => setApPayee(e.target.value)}
                    placeholder="e.g., Prime Logistics Group"
                    required
                    className={FORM_CONTROL_CLASS}
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>
                    Invoice Description
                  </span>
                  <input
                    type="text"
                    value={apDesc}
                    onChange={(e) => setApDesc(e.target.value)}
                    placeholder="e.g., Branch bulk raw materials warehousing invoice"
                    required
                    className={FORM_CONTROL_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-3">
                  <div>
                    <span className={FORM_LABEL_CLASS}>Qty</span>
                    <input
                      type="number"
                      value={apQty}
                      onChange={(e) => {
                        setApQty(e.target.value);
                        if (e.target.value && apUnitPrice) {
                          setApAmount(
                            (
                              parseFloat(e.target.value) *
                              parseFloat(apUnitPrice)
                            ).toFixed(2),
                          );
                        }
                      }}
                      placeholder="0"
                      step="0.01"
                      className={FORM_CONTROL_CLASS}
                    />
                  </div>
                  <div>
                    <span className={FORM_LABEL_CLASS}>UOM</span>
                    <input
                      type="text"
                      value={apUom}
                      onChange={(e) => setApUom(e.target.value)}
                      placeholder="e.g., pcs, kg"
                      className={FORM_CONTROL_CLASS}
                    />
                  </div>
                  <div>
                    <span className={FORM_LABEL_CLASS}>Unit Price</span>
                    <input
                      type="number"
                      value={apUnitPrice}
                      onChange={(e) => {
                        setApUnitPrice(e.target.value);
                        if (apQty && e.target.value) {
                          setApAmount(
                            (
                              parseFloat(apQty) *
                              parseFloat(e.target.value)
                            ).toFixed(2),
                          );
                        }
                      }}
                      placeholder="0.00"
                      step="0.01"
                      className={FORM_CONTROL_CLASS}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Category</span>
                  <select
                    value={apCategoryId}
                    onChange={(e) => setApCategoryId(e.target.value)}
                    disabled={!formCompanyId}
                    required
                    className={FORM_CONTROL_CLASS}
                  >
                    <option value="">
                      {formCompanyId
                        ? "Select payment category"
                        : "Select a company first"}
                    </option>
                    {apCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>
                    Payment Source Account
                  </span>
                  <select
                    value={apSettlementAccountId}
                    onChange={(e) => setApSettlementAccountId(e.target.value)}
                    disabled={!formCompanyId}
                    required
                    className={FORM_CONTROL_CLASS}
                  >
                    <option value="">
                      {formCompanyId
                        ? "Select account to pay from"
                        : "Select a company first"}
                    </option>
                    {formAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {accountLabel(account)} —{" "}
                        {formatPeso(account.currentBalance)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] font-mono text-slate-400">
                    The approved payment will be deducted from this account.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Remarks</span>
                  <input
                    type="text"
                    value={apRemarks}
                    onChange={(e) => setApRemarks(e.target.value)}
                    placeholder="Optional remarks"
                    className={FORM_CONTROL_CLASS}
                  />
                </div>

                <ReceiptUploadField
                  file={receiptFile}
                  isPreparing={isPreparingReceipt}
                  isSubmitting={isSubmittingEntry}
                  onSelect={handleReceiptSelect}
                  onRemove={clearReceipt}
                />

                <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:col-span-2">
                  <button
                    type="button"
                    onClick={closeAddForm}
                    disabled={isPreparingReceipt || isSubmittingEntry}
                    className="w-full rounded-lg bg-slate-50 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPreparingReceipt || isSubmittingEntry}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingEntry && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmittingEntry ? "Saving Liability..." : "Write Liability Entry"}
                  </button>
                </div>
              </form>
              ) : (
              <form
                onSubmit={handleAddAR}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Type</span>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <span className="flex-1 rounded-md bg-emerald-500 py-1.5 text-center text-xs font-mono font-bold text-white">
                      Cash In
                    </span>
                    <span className="flex-1 rounded-md py-1.5 text-center text-xs font-mono text-slate-500">
                      Cash Out
                    </span>
                  </div>
                </div>

                {companyId === "all" && (
                  <div className="sm:col-span-2">
                    <span className={FORM_LABEL_CLASS}>Target Company</span>
                    <select
                      value={targetCompany}
                      onChange={(e) =>
                        handleTargetCompanyChange(e.target.value)
                      }
                      className={FORM_CONTROL_CLASS}
                      required
                    >
                      <option value="" disabled>
                        Select a company
                      </option>
                      {companies
                        .filter((company) => company.id !== "all")
                        .map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name} ({company.code})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <span className={FORM_LABEL_CLASS}>
                    Claim Due Date Limit
                  </span>
                  <input
                    type="date"
                    value={arDueDate}
                    onChange={(e) => setArDueDate(e.target.value)}
                    required
                    className={FORM_CONTROL_CLASS}
                  />
                </div>
                <div>
                  <span className={FORM_LABEL_CLASS}>PHP Amount</span>
                  <input
                    type="number"
                    value={arAmount}
                    onChange={(e) => setArAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    required
                    className={FORM_CONTROL_CLASS}
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Purpose / Client</span>
                  <input
                    type="text"
                    value={arPayer}
                    onChange={(e) => setArPayer(e.target.value)}
                    placeholder="e.g., Robinson Mall Franchise branch"
                    required
                    className={FORM_CONTROL_CLASS}
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>
                    Invoice Description
                  </span>
                  <input
                    type="text"
                    value={arDesc}
                    onChange={(e) => setArDesc(e.target.value)}
                    placeholder="e.g., Materials distribution rent consignment percentage"
                    required
                    className={FORM_CONTROL_CLASS}
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>Category</span>
                  <select
                    value={arCategoryId}
                    onChange={(e) => setArCategoryId(e.target.value)}
                    disabled={!formCompanyId}
                    required
                    className={FORM_CONTROL_CLASS}
                  >
                    <option value="">
                      {formCompanyId
                        ? "Select collection category"
                        : "Select a company first"}
                    </option>
                    {arCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <span className={FORM_LABEL_CLASS}>
                    Collection Destination Account
                  </span>
                  <select
                    value={arCollectionAccountId}
                    onChange={(e) => setArCollectionAccountId(e.target.value)}
                    disabled={!formCompanyId}
                    required
                    className={FORM_CONTROL_CLASS}
                  >
                    <option value="">
                      {formCompanyId
                        ? "Select account to receive funds"
                        : "Select a company first"}
                    </option>
                    {formAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {accountLabel(account)} —{" "}
                        {formatPeso(account.currentBalance)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] font-mono text-slate-400">
                    The approved collection will be posted to this account.
                  </p>
                </div>

                <ReceiptUploadField
                  file={receiptFile}
                  isPreparing={isPreparingReceipt}
                  isSubmitting={isSubmittingEntry}
                  onSelect={handleReceiptSelect}
                  onRemove={clearReceipt}
                />

                <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:col-span-2">
                  <button
                    type="button"
                    onClick={closeAddForm}
                    disabled={isPreparingReceipt || isSubmittingEntry}
                    className="w-full rounded-lg bg-slate-50 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPreparingReceipt || isSubmittingEntry}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingEntry && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmittingEntry ? "Saving Claim..." : "Write Claims Asset"}
                  </button>
                </div>
              </form>
              )}

              {formError && (
                <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-mono font-semibold text-rose-700">
                  {formError}
                </p>
              )}
              {formSuccess && (
                <p className="mt-4 animate-pulse rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                  {formSuccess}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CORE TABLES SQUEEZED */}
      <div className="bg-white border border-slate-200 shadow-md rounded-2xl overflow-hidden animate-fadeIn">
        {activeSegment === "ap" ? (
          <div>
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                <FolderMinus className="w-4 h-4 text-slate-500" />
                <span>Liability invoices (AP Queue)</span>
              </span>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search payee or description..."
                    aria-label="Search accounts payable"
                    className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] transition-all"
                  />
                </div>
                <div className="flex gap-1">
                  {filterOptions.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className={`px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider font-mono border cursor-pointer transition whitespace-nowrap ${statusFilter === f.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-900"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-medium uppercase tracking-[1px] font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3 border-b border-slate-200">
                      Creditor Payee
                    </th>
                    <th className="p-3 border-b border-slate-200">
                      Particular Details
                    </th>
                    <th className="p-3 border-b border-slate-200 text-right">
                      Outstanding value
                    </th>
                    <th className="p-3 border-b border-slate-200">
                      Due Date
                    </th>
                    <th className="p-3 border-b border-slate-200">
                      Payment Account
                    </th>
                    <th className="p-3 border-b border-slate-200">
                      Payment status
                    </th>
                    <th className="p-3 border-b border-slate-200 text-center">
                      Reference #
                    </th>
                    <th className="p-3 border-b border-slate-200 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {filteredPayables.length > 0 ? (
                    filteredPayables.map((p) => {
                      const isOverdue =
                        p.status !== "paid" && p.dueDate < todayStr;
                      const plannedAccount = p.settlementAccountId
                        ? cashAccountById.get(p.settlementAccountId)
                        : undefined;
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50 transition"
                        >
                          <td className="p-3 whitespace-nowrap text-slate-900 font-display text-sm font-semibold">
                            {p.payee}
                          </td>
                          <td
                            className="p-3 max-w-xs truncate text-[11px] text-slate-500"
                            title={p.description}
                          >
                            {p.description}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                            {formatPeso(p.amount)}
                          </td>
                          <td className="p-3 font-mono whitespace-nowrap">
                            <span
                              className={
                                isOverdue
                                  ? "text-rose-600 font-bold flex items-center gap-1"
                                  : "text-slate-500"
                              }
                            >
                              {isOverdue && (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                              )}
                              <span>
                                {p.dueDate}
                                {isOverdue && (
                                  <span className="text-[9px] ml-1">
                                    ({daysOverdue(p.dueDate)}d overdue)
                                  </span>
                                )}
                              </span>
                            </span>
                          </td>
                          <td className="p-3 min-w-52">
                            {plannedAccount ? (
                              <div>
                                <div className="text-[11px] font-semibold text-slate-800">
                                  {plannedAccount.accountName}
                                </div>
                                <div className="text-[9px] font-mono text-slate-500">
                                  {plannedAccount.bankName ||
                                    plannedAccount.accountType}{" "}
                                  ••••{plannedAccount.accountNumber.slice(-4)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400">
                                Not assigned
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {p.status === "paid" ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                                SETTLED PAID
                              </span>
                            ) : p.status === "payment_pending" ? (
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                                PAYMENT PENDING
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 text-[9px] rounded-2xl font-mono font-bold border uppercase tracking-wider ${isOverdue ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}
                              >
                                {isOverdue ? "AGED OVERDUE" : "UNPAID"}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-[10px] text-slate-500 whitespace-nowrap">
                            {p.paidTransactionId
                              ? `#${p.paidTransactionId}`
                              : "-"}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {p.receiptPath && (
                                <button
                                  onClick={() => window.open(p.receiptPath!, "_blank", "noopener,noreferrer")}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-sky-700 transition hover:bg-sky-100"
                                  title="Open uploaded receipt"
                                >
                                  <FileCheck2 className="h-3 w-3" />
                                  Receipt
                                </button>
                              )}
                              {p.status === "unpaid" &&
                              canWriteFinance(userId, p.companyId) ? (
                                <button
                                  onClick={() =>
                                    openSettlementConfirmation({
                                      kind: "ap",
                                      record: p,
                                    })
                                  }
                                  className="px-3 py-1.5 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-[9px] font-bold uppercase tracking-wider cursor-pointer transition"
                                >
                                  Trigger Payment
                                </button>
                              ) : p.status === "payment_pending" ? (
                                <span className="text-sky-700 text-[10px] font-mono font-semibold">
                                  Awaiting approval
                                </span>
                              ) : p.status === "paid" ? (
                                <span className="text-slate-500 text-[10px] font-mono flex items-center justify-end gap-1 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Completed</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[10px]">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-10 text-center">
                        <FolderMinus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        {hasAnyRecords && isFiltering ? (
                          <>
                            <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                              No payables match your search or filter.
                            </p>
                            <button
                              onClick={clearFilters}
                              className="mt-3 px-3 py-1.5 border border-slate-200 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Clear filters
                            </button>
                          </>
                        ) : (
                          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                            No outstanding accounts payables documented for
                            this company.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                <FolderPlus className="w-4 h-4 text-slate-500" />
                <span>Claims and Receivables (AR Queue)</span>
              </span>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search payer or description..."
                    aria-label="Search accounts receivable"
                    className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl font-mono focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] transition-all"
                  />
                </div>
                <div className="flex gap-1">
                  {filterOptions.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className={`px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider font-mono border cursor-pointer transition whitespace-nowrap ${statusFilter === f.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-900"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-medium uppercase tracking-[1px] font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3 border-b border-slate-200">
                      Debtor Payer
                    </th>
                    <th className="p-3 border-b border-slate-200">
                      Billing details
                    </th>
                    <th className="p-3 border-b border-slate-200 text-right">
                      Invoice value
                    </th>
                    <th className="p-3 border-b border-slate-200">
                      Due Date
                    </th>
                    <th className="p-3 border-b border-slate-200">
                      Destination Account
                    </th>
                    <th className="p-3 border-b border-slate-200">
                      Collection status
                    </th>
                    <th className="p-3 border-b border-slate-200 text-center">
                      Reference #
                    </th>
                    <th className="p-3 border-b border-slate-200 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {filteredReceivables.length > 0 ? (
                    filteredReceivables.map((r) => {
                      const isOverdue =
                        r.status !== "collected" && r.dueDate < todayStr;
                      const plannedAccount = r.collectionAccountId
                        ? cashAccountById.get(r.collectionAccountId)
                        : undefined;
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50 transition"
                        >
                          <td className="p-3 whitespace-nowrap text-slate-900 font-display text-sm font-semibold">
                            {r.payer}
                          </td>
                          <td
                            className="p-3 max-w-xs truncate text-[11px] text-slate-500"
                            title={r.description}
                          >
                            {r.description}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                            {formatPeso(r.amount)}
                          </td>
                          <td className="p-3 font-mono whitespace-nowrap">
                            <span
                              className={
                                isOverdue
                                  ? "text-rose-600 font-bold flex items-center gap-1"
                                  : "text-slate-500"
                              }
                            >
                              {isOverdue && (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                              )}
                              <span>
                                {r.dueDate}
                                {isOverdue && (
                                  <span className="text-[9px] ml-1">
                                    ({daysOverdue(r.dueDate)}d overdue)
                                  </span>
                                )}
                              </span>
                            </span>
                          </td>
                          <td className="p-3 min-w-52">
                            {plannedAccount ? (
                              <div>
                                <div className="text-[11px] font-semibold text-slate-800">
                                  {plannedAccount.accountName}
                                </div>
                                <div className="text-[9px] font-mono text-slate-500">
                                  {plannedAccount.bankName ||
                                    plannedAccount.accountType}{" "}
                                  ••••{plannedAccount.accountNumber.slice(-4)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400">
                                Not assigned
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {r.status === "collected" ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                                COMPLETED
                              </span>
                            ) : r.status === "collection_pending" ? (
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                                COLLECTION PENDING
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 text-[9px] rounded-2xl font-mono font-bold border uppercase tracking-wider ${isOverdue ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-indigo-50 border-indigo-200 text-indigo-700"}`}
                              >
                                {isOverdue
                                  ? "OVERDUE AGING"
                                  : "OPEN UNCOLLECTED"}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-[10px] text-slate-500 whitespace-nowrap">
                            {r.collectedTransactionId
                              ? `#${r.collectedTransactionId}`
                              : "-"}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {r.receiptPath && (
                                <button
                                  onClick={() => window.open(r.receiptPath!, "_blank", "noopener,noreferrer")}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-sky-700 transition hover:bg-sky-100"
                                  title="Open uploaded receipt"
                                >
                                  <FileCheck2 className="h-3 w-3" />
                                  Receipt
                                </button>
                              )}
                              {r.status === "uncollected" &&
                              canWriteFinance(userId, r.companyId) ? (
                                <button
                                  onClick={() =>
                                    openSettlementConfirmation({
                                      kind: "ar",
                                      record: r,
                                    })
                                  }
                                  className="px-3 py-1.5 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-[9px] font-bold uppercase tracking-wider cursor-pointer transition"
                                >
                                  Collect Funds
                                </button>
                              ) : r.status === "collection_pending" ? (
                                <span className="text-sky-700 text-[10px] font-mono font-semibold">
                                  Awaiting approval
                                </span>
                              ) : r.status === "collected" ? (
                                <span className="text-slate-500 text-[10px] font-mono flex items-center justify-end gap-1 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Completed</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[10px]">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-10 text-center">
                        <FolderPlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        {hasAnyRecords && isFiltering ? (
                          <>
                            <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                              No receivables match your search or filter.
                            </p>
                            <button
                              onClick={clearFilters}
                              className="mt-3 px-3 py-1.5 border border-slate-200 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Clear filters
                            </button>
                          </>
                        ) : (
                          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                            No outstanding accounts receivables documented for
                            this company.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {settlementTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settlement-dialog-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSettlementTarget(null);
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-fadeIn">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-[#00A86B]">
                  Accounting Workbench
                </p>
                <h2
                  id="settlement-dialog-title"
                  className="mt-1 font-display text-lg font-semibold text-slate-900"
                >
                  {settlementTarget.kind === "ap"
                    ? "Confirm AP Payment"
                    : "Confirm AR Collection"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Review the account impact before sending this transaction for
                  approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettlementTarget(null)}
                aria-label="Close settlement confirmation"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                    {settlementTarget.kind === "ap" ? "Payee" : "Payer"}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {settlementTarget.kind === "ap"
                      ? settlementTarget.record.payee
                      : settlementTarget.record.payer}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {settlementTarget.record.description}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                    Due-date limit
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                    {settlementTarget.record.dueDate}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-600">
                    {settlementTarget.kind === "ap"
                      ? "Debit From Account"
                      : "Deposit To Account"}
                  </span>
                  <select
                    value={settlementAccountId}
                    onChange={(event) =>
                      setSettlementAccountId(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 outline-hidden transition focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A]"
                  >
                    <option value="">Select cash account</option>
                    {settlementAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {accountLabel(account)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-600">
                    Transaction Category
                  </span>
                  <select
                    value={settlementCategoryId}
                    onChange={(event) =>
                      setSettlementCategoryId(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 outline-hidden transition focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A]"
                  >
                    <option value="">Select category</option>
                    {settlementCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
                <div className="bg-white p-4">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                    Transaction amount
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                    {formatPeso(settlementAmount)}
                  </p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                    Current balance
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                    {selectedSettlementAccount
                      ? formatPeso(selectedSettlementAccount.currentBalance)
                      : "—"}
                  </p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">
                    Projected balance
                  </p>
                  <p
                    className={`mt-1 font-mono text-lg font-bold ${
                      projectedSettlementBalance === null
                        ? "text-slate-400"
                        : settlementTarget.kind === "ap" &&
                            projectedSettlementBalance < 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {projectedSettlementBalance === null
                      ? "—"
                      : formatPeso(projectedSettlementBalance)}
                  </p>
                </div>
              </div>

              {settlementTarget.kind === "ap" &&
                projectedSettlementBalance !== null &&
                projectedSettlementBalance < 0 && (
                  <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      This account has insufficient funds. The approval check
                      will block posting until the balance is sufficient or a
                      different account is selected.
                    </p>
                  </div>
                )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setSettlementTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                disabled={!settlementAccountId || !settlementCategoryId}
                className="rounded-xl bg-[#00B67A] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-[#009E6B] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Send for Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
