import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Landmark,
  Lock,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Unlock,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  approveAccountingPeriodReopen,
  canManagePeriodClose,
  closeAccountingPeriod,
  getAccountingPeriod,
  getAccountingPeriods,
  getCompanies,
  getMonthEndChecklist,
  getProfiles,
  rejectAccountingPeriodReopen,
  requestAccountingPeriodReopen,
  useDBUpdate,
} from "@/data/mockDatabase";

interface MonthEndCloseProps {
  userId: string;
  companyId: string;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

const formatMonth = (periodMonth: string) =>
  new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(
    new Date(`${periodMonth}-01T00:00:00`),
  );

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

export default function MonthEndClose({ userId, companyId }: MonthEndCloseProps) {
  useDBUpdate();
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
  const [closeNotes, setCloseNotes] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const company = useMemo(
    () => getCompanies().find((entry) => entry.id === companyId),
    [companyId],
  );
  const profiles = getProfiles();
  const period = companyId === "all" ? null : getAccountingPeriod(companyId, periodMonth);
  const checklist = companyId === "all" ? null : getMonthEndChecklist(companyId, periodMonth);
  const canManage = companyId !== "all" && canManagePeriodClose(userId, companyId);
  const history = companyId === "all" ? [] : getAccountingPeriods(userId, companyId).slice(0, 8);
  const status = period?.status ?? "open";

  const actorName = (actorId: string | null) =>
    profiles.find((profile) => profile.id === actorId)?.fullName || actorId || "—";

  const runAction = (action: () => { error?: string }, successMessage: string) => {
    setIsWorking(true);
    try {
      const result = action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setCloseNotes("");
      setReopenReason("");
      toast.success(successMessage);
    } finally {
      setIsWorking(false);
    }
  };

  if (companyId === "all") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <div className="flex items-start gap-4">
          <Building2 className="mt-0.5 h-6 w-6 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Select a company to manage period close</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Accounting periods are locked separately for each company. Choose a specific company from the header before reviewing or closing a month.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!company || !checklist) return null;

  const checks = [
    {
      label: "Pending transactions",
      value: checklist.pendingTransactions,
      detail: "Must be approved or rejected before close.",
      blocking: true,
      icon: FileText,
    },
    {
      label: "Open payroll runs",
      value: checklist.openPayrollRuns,
      detail: "Draft or pending payroll must be completed or cancelled.",
      blocking: true,
      icon: Users,
    },
    {
      label: "Missing receipts",
      value: checklist.missingReceipts,
      detail: "Warning only; supporting documents may still be attached later.",
      blocking: false,
      icon: Receipt,
    },
    {
      label: "Unreconciled bank accounts",
      value: checklist.unreconciledBankAccounts,
      detail: "Warning only; verify statement reconciliation before close.",
      blocking: false,
      icon: Landmark,
    },
    {
      label: "Open payables",
      value: checklist.openPayables,
      detail: "Tracked for visibility and allowed to carry forward.",
      blocking: false,
      icon: AlertTriangle,
    },
    {
      label: "Open receivables",
      value: checklist.openReceivables,
      detail: "Tracked for visibility and allowed to carry forward.",
      blocking: false,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600">
            <Calendar className="h-4 w-4" />
            Accounting Control
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Month-End Close</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review closing readiness and lock financial activity for {company.name}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="close-period-month" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Period
          </label>
          <input
            id="close-period-month"
            type="month"
            value={periodMonth}
            max={currentMonth()}
            onChange={(event) => setPeriodMonth(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${status === "open" ? "border-emerald-200 bg-emerald-50" : status === "closed" ? "border-slate-300 bg-slate-100" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {status === "open" ? <Unlock className="h-6 w-6 text-emerald-600" /> : <Lock className={`h-6 w-6 ${status === "closed" ? "text-slate-700" : "text-amber-600"}`} />}
            <div>
              <h2 className="font-bold text-slate-900">{formatMonth(periodMonth)} is {status === "reopen_requested" ? "awaiting reopen approval" : status}</h2>
              <p className="mt-1 text-xs text-slate-600">
                {status === "open"
                  ? "Financial records may still be posted or changed."
                  : status === "closed"
                    ? `Closed by ${actorName(period?.closedBy ?? null)} on ${formatDateTime(period?.closedAt ?? null)}.`
                    : `Requested by ${actorName(period?.reopenRequestedBy ?? null)}: ${period?.reopenReason}`}
              </p>
            </div>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${status === "open" ? "bg-emerald-100 text-emerald-700" : status === "closed" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-700"}`}>
            {status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => {
          const Icon = check.icon;
          const clear = check.value === 0;
          return (
            <div key={check.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${clear ? "text-emerald-500" : check.blocking ? "text-red-500" : "text-amber-500"}`} />
                <span className={`text-2xl font-bold ${clear ? "text-emerald-600" : "text-slate-900"}`}>{check.value}</span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-800">{check.label}</h3>
              <p className="mt-1 text-xs text-slate-500">{check.detail}</p>
            </div>
          );
        })}
      </div>

      {status === "open" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            <div>
              <h2 className="font-bold text-slate-900">Close {formatMonth(periodMonth)}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Closing prevents financial posting, approval, deletion, payroll changes, reconciliation changes, and transfer posting in this month.
              </p>
            </div>
          </div>

          {canManage ? (
            <div className="mt-5 space-y-3">
              <textarea
                value={closeNotes}
                onChange={(event) => setCloseNotes(event.target.value)}
                placeholder="Optional closing notes"
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {checklist.blockingIssues > 0 && (
                <p className="flex items-center gap-2 text-xs font-semibold text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Resolve all pending transactions and open payroll runs before closing.
                </p>
              )}
              <button
                type="button"
                disabled={isWorking || checklist.blockingIssues > 0}
                onClick={() => runAction(
                  () => closeAccountingPeriod(userId, companyId, periodMonth, closeNotes),
                  `${formatMonth(periodMonth)} is now closed.`,
                )}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Lock className="h-4 w-4" />
                Close Period
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
              Only Owner and IT accounts can close an accounting period. You may review the checklist in read-only mode.
            </div>
          )}
        </div>
      )}

      {status === "closed" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-slate-900">Request Reopening</h2>
          <p className="mt-1 text-sm text-slate-600">A reason is required. An Owner or IT account must approve before financial changes are allowed.</p>
          <textarea
            value={reopenReason}
            onChange={(event) => setReopenReason(event.target.value)}
            placeholder="Explain why this period must be reopened"
            rows={3}
            className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            disabled={isWorking || !reopenReason.trim()}
            onClick={() => runAction(
              () => requestAccountingPeriodReopen(userId, companyId, periodMonth, reopenReason),
              "Reopen request submitted.",
            )}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" />
            Request Reopen
          </button>
        </div>
      )}

      {status === "reopen_requested" && canManage && (
        <div className="rounded-2xl border border-amber-200 bg-white p-6">
          <h2 className="font-bold text-slate-900">Reopen Approval Required</h2>
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{period?.reopenReason}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isWorking}
              onClick={() => runAction(
                () => approveAccountingPeriodReopen(userId, companyId, periodMonth),
                `${formatMonth(periodMonth)} has been reopened.`,
              )}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Reopen
            </button>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => runAction(
                () => rejectAccountingPeriodReopen(userId, companyId, periodMonth),
                "Reopen request rejected.",
              )}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Keep Period Closed
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-slate-900">Period History</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {history.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{formatMonth(entry.periodMonth)}</p>
                  <p className="text-xs text-slate-500">Closed by {actorName(entry.closedBy)} · {formatDateTime(entry.closedAt)}</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{entry.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
