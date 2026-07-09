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
  getCompanies,
} from "../data/mockDatabase";
import { Payable, Receivable } from "../types";
import { toast } from "sonner";

interface PayablesReceivablesProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
}

type StatusFilter = "all" | "overdue" | "open" | "settled";

const TONE_STYLES = {
  neutral: { bg: "bg-slate-50", text: "text-slate-900", border: "border-slate-200" },
  danger: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  success: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
} as const;

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

export default function PayablesReceivables({
  userId,
  companyId,
  onAuditLogged,
}: PayablesReceivablesProps) {
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

  // AR form states
  const [arPayer, setArPayer] = useState("");
  const [arDesc, setArDesc] = useState("");
  const [arAmount, setArAmount] = useState("");
  const [arDueDate, setArDueDate] = useState("");

  // Local errors
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Search / filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const payables = getPayables(userId, companyId);
  const receivables = getReceivables(userId, companyId);
  const categories = getCategories(companyId);
  const companies = getCompanies();

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

  const switchSegment = (segment: "ap" | "ar") => {
    setActiveSegment(segment);
    setShowAddForm(false);
    setSearchTerm("");
    setStatusFilter("all");
  };

  // AP derived stats + filtered/sorted rows
  const apStats = useMemo(() => {
    const outstanding = payables.filter((p) => p.status === "unpaid");
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
        const isOverdue = p.status === "unpaid" && p.dueDate < todayStr;
        if (statusFilter === "overdue") return isOverdue;
        if (statusFilter === "open") return p.status === "unpaid";
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
    const outstanding = receivables.filter((r) => r.status === "uncollected");
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
        const isOverdue = r.status === "uncollected" && r.dueDate < todayStr;
        if (statusFilter === "overdue") return isOverdue;
        if (statusFilter === "open") return r.status === "uncollected";
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

  // Submit AP invoice
  const handleAddAP = (e: React.FormEvent) => {
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
    if (!apPayee.trim() || !apDesc.trim() || !apDueDate) {
      setFormError("All fields represent strictly mandatory auditing values.");
      return;
    }
    const finalCompanyId = targetCompany || companyId;
    if (finalCompanyId === "all" || !finalCompanyId) {
      setFormError("Please select a valid company for this payable target.");
      return;
    }

    const { error, payable } = insertPayable(userId, {
      companyId: finalCompanyId,
      payee: apPayee,
      description: apDesc,
      amount: amt,
      qty: apQty ? parseFloat(apQty) : undefined,
      uom: apUom ? apUom.trim() : undefined,
      unitPrice: apUnitPrice ? parseFloat(apUnitPrice) : undefined,
      remarks: apRemarks ? apRemarks.trim() : undefined,
      dueDate: apDueDate,
    });

    if (error) {
      setFormError(error);
    } else {
      setFormSuccess("Accounts payable logged successfully!");
      setApPayee("");
      setApDesc("");
      setApAmount("");
      setApDueDate("");
      setApQty("");
      setApUom("");
      setApUnitPrice("");
      setApRemarks("");
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess("");
      }, 1500);
      onAuditLogged();
    }
  };

  // Submit AR invoice
  const handleAddAR = (e: React.FormEvent) => {
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
    if (!arPayer.trim() || !arDesc.trim() || !arDueDate) {
      setFormError("All fields represent strictly mandatory auditing values.");
      return;
    }
    const finalCompanyId = targetCompany || companyId;
    if (finalCompanyId === "all" || !finalCompanyId) {
      setFormError("Please select a valid company for this receivable target.");
      return;
    }

    const { error, receivable } = insertReceivable(userId, {
      companyId: finalCompanyId,
      payer: arPayer,
      description: arDesc,
      amount: amt,
      dueDate: arDueDate,
    });

    if (error) {
      setFormError(error);
    } else {
      setFormSuccess("Accounts receivable logged successfully!");
      setArPayer("");
      setArDesc("");
      setArAmount("");
      setArDueDate("");
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess("");
      }, 1500);
      onAuditLogged();
    }
  };

  // Mark Payable Paid Event (Triggers Pending cash_out)
  const handleMarkPaid = (apId: string) => {
    const defaultOutCategoryId =
      categories.find((c) => c.name === "operations" && c.type === "cash_out")
        ?.id || categories.filter((c) => c.type === "cash_out")[0]?.id;

    if (!defaultOutCategoryId) {
      toast.error("Operations category missing", {
        description:
          "Internal error: operations category could not be resolved.",
      });
      return;
    }

    const { error, payable, txn } = markPayableAsPaid(
      userId,
      apId,
      defaultOutCategoryId,
    );
    if (error) {
      toast.error("Payment Failed", { description: error });
    } else {
      toast.success("Bill marked paid", {
        description: `Generated pending cash outbound transaction #${txn?.id} awaiting reviews approval.`,
      });
      onAuditLogged();
    }
  };

  // Mark Receivable Collected Event (Triggers Pending cash_in)
  const handleMarkCollected = (arId: string) => {
    const defaultInCategoryId =
      categories.find((c) => c.name === "collections" && c.type === "cash_in")
        ?.id || categories.filter((c) => c.type === "cash_in")[0]?.id;

    if (!defaultInCategoryId) {
      toast.error("Collections category missing", {
        description:
          "Internal error: collections category could not be resolved.",
      });
      return;
    }

    const { error, receivable, txn } = markReceivableAsCollected(
      userId,
      arId,
      defaultInCategoryId,
    );
    if (error) {
      toast.error("Collection Registration Failed", { description: error });
    } else {
      toast.success("Claims mark collected", {
        description: `Generated pending cash inflows entry #${txn?.id} awaiting reviews approval.`,
      });
      onAuditLogged();
    }
  };

  return (
    <div className="space-y-6">
      {/* SEGMENT HEADERS NAVIGATION */}
      <div className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl">
        <div className="flex gap-1 p-1 bg-slate-100 border border-slate-200 rounded-2xl select-none">
          <button
            onClick={() => switchSegment("ap")}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-xl cursor-pointer transition flex items-center gap-1.5 ${activeSegment === "ap" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            <FolderMinus className="w-4 h-4" />
            <span>Accounts Payable (AP)</span>
          </button>
          <button
            onClick={() => switchSegment("ar")}
            className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-xl cursor-pointer transition flex items-center gap-1.5 ${activeSegment === "ar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>Accounts Receivable (AR)</span>
          </button>
        </div>

        {canWriteFinance(userId, companyId) && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
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
        <div className="bg-white border border-slate-200 p-6 shadow-md animate-fadeIn space-y-4 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h3 className="font-display text-base text-slate-900 tracking-tight">
                Log New Outstanding{" "}
                {activeSegment === "ap"
                  ? "Accounts Payable liability"
                  : "Accounts Receivable asset"}
              </h3>
              <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider mt-0.5 font-semibold">
                Values are tracked into monthly cash forecasts.
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              aria-label="Close form"
              className="p-1 text-slate-500 hover:bg-slate-50 rounded-2xl cursor-pointer hover:text-slate-900"
            >
              <XCircle className="w-4.5 h-4.5" />
            </button>
          </div>

          {activeSegment === "ap" ? (
            <form
              onSubmit={handleAddAP}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              {companyId === "all" && (
                <div className="md:col-span-4 space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                    Target Company
                  </span>
                  <select
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono cursor-pointer transition-all"
                    required
                  >
                    <option value="" disabled className="bg-white text-slate-500">Select a company</option>
                    {companies.filter(c => c.id !== "all").map(c => (
                      <option key={c.id} value={c.id} className="bg-white">
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  Creditor / Payee Company
                </span>
                <input
                  type="text"
                  value={apPayee}
                  onChange={(e) => setApPayee(e.target.value)}
                  placeholder="e.g., Prime Logistics Group"
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  Invoice Description
                </span>
                <input
                  type="text"
                  value={apDesc}
                  onChange={(e) => setApDesc(e.target.value)}
                  placeholder="e.g., Branch bulk raw materials warehousing invoice"
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  QTY
                </span>
                <input
                  type="number"
                  value={apQty}
                  onChange={(e) => {
                    setApQty(e.target.value);
                    if (e.target.value && apUnitPrice) {
                      setApAmount((parseFloat(e.target.value) * parseFloat(apUnitPrice)).toFixed(2));
                    }
                  }}
                  placeholder="0"
                  step="0.01"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  UOM
                </span>
                <input
                  type="text"
                  value={apUom}
                  onChange={(e) => setApUom(e.target.value)}
                  placeholder="e.g., pcs, kg"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  UNIT PRICE
                </span>
                <input
                  type="number"
                  value={apUnitPrice}
                  onChange={(e) => {
                    setApUnitPrice(e.target.value);
                    if (apQty && e.target.value) {
                      setApAmount((parseFloat(apQty) * parseFloat(e.target.value)).toFixed(2));
                    }
                  }}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  Settlement PHP Amount
                </span>
                <input
                  type="number"
                  value={apAmount}
                  onChange={(e) => setApAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  Due Date Limits
                </span>
                <input
                  type="date"
                  value={apDueDate}
                  onChange={(e) => setApDueDate(e.target.value)}
                  required
                  className="w-full text-xs p-2 px-3 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  Remarks
                </span>
                <input
                  type="text"
                  value={apRemarks}
                  onChange={(e) => setApRemarks(e.target.value)}
                  placeholder="Optional remarks"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="md:col-span-4 flex justify-end gap-2 pt-3 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-2xl text-xs font-mono uppercase tracking-wider text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Write Liability entry
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleAddAR}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              {companyId === "all" && (
                <div className="md:col-span-4 space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                    Target Company
                  </span>
                  <select
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono cursor-pointer transition-all"
                    required
                  >
                    <option value="" disabled className="bg-white text-slate-500">Select a company</option>
                    {companies.filter(c => c.id !== "all").map(c => (
                      <option key={c.id} value={c.id} className="bg-white">
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  Client / Debtor Company
                </span>
                <input
                  type="text"
                  value={arPayer}
                  onChange={(e) => setArPayer(e.target.value)}
                  placeholder="e.g., Robinson Mall Franchise branch"
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  Invoice Description
                </span>
                <input
                  type="text"
                  value={arDesc}
                  onChange={(e) => setArDesc(e.target.value)}
                  placeholder="e.g., Materials distribution rent consignment percentage"
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  Collection PHP Amount
                </span>
                <input
                  type="number"
                  value={arAmount}
                  onChange={(e) => setArAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                  Limits claims due Date
                </span>
                <input
                  type="date"
                  value={arDueDate}
                  onChange={(e) => setArDueDate(e.target.value)}
                  required
                  className="w-full text-xs p-2 px-3 bg-white border border-slate-200 text-slate-900 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] rounded-2xl font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="md:col-span-4 flex justify-end gap-2 pt-3 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-2xl text-xs font-mono uppercase tracking-wider text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Write Claims Asset
                </button>
              </div>
            </form>
          )}

          {formError && (
            <p className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono font-semibold rounded-2xl">
              {formError}
            </p>
          )}
          {formSuccess && (
            <p className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl animate-pulse">
              {formSuccess}
            </p>
          )}
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
                        p.status === "unpaid" && p.dueDate < todayStr;
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
                          <td className="p-3 whitespace-nowrap">
                            {p.status === "paid" ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                                SETTLED PAID
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
                            {p.status === "unpaid" &&
                            canWriteFinance(userId, companyId) ? (
                              <button
                                onClick={() => handleMarkPaid(p.id)}
                                className="px-3 py-1.5 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-[9px] font-bold uppercase tracking-wider cursor-pointer transition"
                              >
                                Trigger Payment
                              </button>
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
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-10 text-center">
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
                        r.status === "uncollected" && r.dueDate < todayStr;
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
                          <td className="p-3 whitespace-nowrap">
                            {r.status === "collected" ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-bold rounded-2xl uppercase tracking-wider">
                                COMPLETED
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
                            {r.status === "uncollected" &&
                            canWriteFinance(userId, companyId) ? (
                              <button
                                onClick={() => handleMarkCollected(r.id)}
                                className="px-3 py-1.5 bg-[#00B67A] hover:bg-[#009E6B] text-white border-transparent rounded-2xl text-[9px] font-bold uppercase tracking-wider cursor-pointer transition"
                              >
                                Collect Funds
                              </button>
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
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-10 text-center">
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
    </div>
  );
}
