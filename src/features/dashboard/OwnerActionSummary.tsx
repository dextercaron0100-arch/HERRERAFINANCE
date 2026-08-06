import React from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";

type AlertItem = {
  type: "high" | "warning" | "info";
  message: string;
};

type OwnerActionSummaryProps = {
  flowSummary: {
    cashIn: number;
    cashOut: number;
    netCashFlow: number;
  };
  profitSummary: {
    revenue: number;
    netProfit: number;
    profitMargin: number;
  };
  cashRisk: {
    currentCash: number;
    projectedCash: number;
    upcomingPayables: number;
    upcomingReceivables: number;
    overdueReceivables?: number;
    overduePayables?: number;
  };
  leakAlerts: AlertItem[];
  formatPeso: (value: number) => string;
  onExplain: () => void;
  dateRange: string;
  isLoading?: boolean;
  pendingApprovals?: number;
};

type Tone = "emerald" | "blue" | "amber" | "rose" | "violet" | "zinc";

const toneStyles: Record<Tone, string> = {
  emerald: "text-[#00B67A] bg-[#00B67A]/10 border-[#00B67A]/25",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/25",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/25",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/25",
  zinc: "text-slate-600 bg-white border-slate-200",
};

function StatusCard({
  title,
  value,
  desc,
  tone,
  icon,
}: {
  title: string;
  value: string;
  desc: string;
  tone: Tone;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-white transition-all duration-200 group">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 group-hover:text-slate-600 transition-colors">
          {title}
        </p>
        <div className={`${toneStyles[tone]} p-2 rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold tracking-tight ${toneStyles[tone].split(' ')[0]}`}>{value}</span>
      </div>

      <p className="mt-2 text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function OwnerActionSummary({
  flowSummary,
  profitSummary,
  cashRisk,
  leakAlerts,
  formatPeso,
  onExplain,
  dateRange,
  isLoading,
  pendingApprovals = 0,
}: OwnerActionSummaryProps) {
  const daysInPeriod = dateRange === "ytd" ? 365 : Number.parseInt(dateRange || "30", 10);
  const safeDaysInPeriod = Number.isFinite(daysInPeriod) && daysInPeriod > 0 ? daysInPeriod : 30;

  const avgDailyOutflow = flowSummary.cashOut / safeDaysInPeriod;
  const runwayDays =
    avgDailyOutflow > 0 ? Math.floor(cashRisk.currentCash / avgDailyOutflow) : 999;

  const overdueCollections =
    typeof cashRisk.overdueReceivables === "number"
      ? cashRisk.overdueReceivables
      : cashRisk.upcomingReceivables;

  const highAlerts = leakAlerts.filter((alert) => alert.type === "high").length;
  const warningAlerts = leakAlerts.filter((alert) => alert.type === "warning").length;

  const getCashStatus = () => {
    if (cashRisk.projectedCash < 0 || runwayDays < 14) {
      return {
        label: "Critical",
        tone: "rose" as Tone,
        desc: `${Math.max(runwayDays, 0)} days runway`,
      };
    }

    if (runwayDays < 30) {
      return {
        label: "Watch",
        tone: "amber" as Tone,
        desc: `${runwayDays} days runway`,
      };
    }

    if (runwayDays < 60) {
      return {
        label: "Healthy",
        tone: "emerald" as Tone,
        desc: `${runwayDays} days runway`,
      };
    }

    return {
      label: "Strong",
      tone: "emerald" as Tone,
      desc: runwayDays > 100 ? ">90 days runway" : `${runwayDays} days runway`,
    };
  };

  const getProfitStatus = () => {
    if (profitSummary.netProfit < 0) {
      return {
        label: "Losing",
        tone: "rose" as Tone,
        desc: "Negative profit",
      };
    }

    if (profitSummary.profitMargin < 10 && profitSummary.revenue > 0) {
      return {
        label: "Low",
        tone: "rose" as Tone,
        desc: `${profitSummary.profitMargin.toFixed(1)}% margin`,
      };
    }

    if (profitSummary.profitMargin < 15 && profitSummary.revenue > 0) {
      return {
        label: "Watch",
        tone: "amber" as Tone,
        desc: `${profitSummary.profitMargin.toFixed(1)}% margin`,
      };
    }

    return {
      label: "Profitable",
      tone: "blue" as Tone,
      desc: `${profitSummary.profitMargin.toFixed(1)}% margin`,
    };
  };

  const cashStatus = getCashStatus();
  const profitStatus = getProfitStatus();

  const hasCollectionPriority = overdueCollections > 0;
  const hasApprovalPriority = pendingApprovals > 0;
  const hasUrgentIssue =
    cashRisk.projectedCash < 0 ||
    profitSummary.netProfit < 0 ||
    highAlerts > 0 ||
    hasCollectionPriority ||
    hasApprovalPriority;

  let headline = "Business looks stable";
  let headlineDesc =
    "Cash and profit are in good condition for the selected period. No urgent owner action is required.";
  let headlineTone: Tone = "emerald";
  let headlineIcon = <CheckCircle2 className="h-6 w-6 text-[#00B67A]" />;

  if (cashRisk.projectedCash < 0) {
    headline = "Critical cash flow risk";
    headlineDesc =
      "Projected cash may fall below zero after upcoming payables. Review payments and collections immediately.";
    headlineTone = "rose";
    headlineIcon = <AlertCircle className="h-6 w-6 text-rose-400" />;
  } else if (profitSummary.netProfit < 0) {
    headline = "Business is losing money";
    headlineDesc =
      "Expenses exceeded revenue for this period. Review payroll, COGS, and operating expenses.";
    headlineTone = "rose";
    headlineIcon = <AlertTriangle className="h-6 w-6 text-rose-400" />;
  } else if (hasCollectionPriority) {
    headline = "Profitable, but collections need attention";
    headlineDesc = `Profit margin is ${profitSummary.profitMargin.toFixed(
      1
    )}%, but ${formatPeso(overdueCollections)} needs collection to strengthen cash position.`;
    headlineTone = "amber";
    headlineIcon = <AlertTriangle className="h-6 w-6 text-amber-400" />;
  } else if (profitSummary.profitMargin < 15 && profitSummary.revenue > 0) {
    headline = "Profit needs review";
    headlineDesc =
      "Cash is stable, but profit margin is below target. Review high expense categories.";
    headlineTone = "amber";
    headlineIcon = <AlertTriangle className="h-6 w-6 text-amber-400" />;
  }

  let mainActionTitle = "No urgent action";
  let mainActionDesc = "Everything looks stable for the selected period.";
  let mainActionLabel = "Ask AI for Summary";
  let mainActionTone: Tone = "emerald";

  if (cashRisk.projectedCash < 0) {
    mainActionTitle = "Review cash shortage";
    mainActionDesc = "Projected cash is negative after bills and collections.";
    mainActionLabel = "Explain Cash Risk";
    mainActionTone = "rose";
  } else if (profitSummary.netProfit < 0) {
    mainActionTitle = "Review profit loss";
    mainActionDesc = "Find which expenses are pushing profit below zero.";
    mainActionLabel = "Explain Profit Loss";
    mainActionTone = "rose";
  } else if (hasCollectionPriority) {
    mainActionTitle = `Collect ${formatPeso(overdueCollections)}`;
    mainActionDesc = "Overdue receivables need follow-up today.";
    mainActionLabel = "Review Collections";
    mainActionTone = "amber";
  } else if (hasApprovalPriority) {
    mainActionTitle = `Review ${pendingApprovals} pending approvals`;
    mainActionDesc = "Pending transactions should be reviewed before daily closing.";
    mainActionLabel = "Review Approvals";
    mainActionTone = "violet";
  } else if (warningAlerts > 0) {
    mainActionTitle = "Review spending warnings";
    mainActionDesc = `${warningAlerts} warning item${warningAlerts > 1 ? "s" : ""} need checking.`;
    mainActionLabel = "Review Alerts";
    mainActionTone = "amber";
  }

  const periodLabel = dateRange === "ytd" ? "Year to date" : `Last ${dateRange} days`;
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isLoading) {
    return (
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-lg relative overflow-hidden">
        <div className="animate-pulse space-y-6">
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="h-4 w-52 rounded bg-slate-50" />
              <div className="h-10 w-full max-w-xl rounded bg-slate-50" />
              <div className="h-5 w-full max-w-2xl rounded bg-slate-50" />
              <div className="flex gap-2">
                <div className="h-7 w-32 rounded-full bg-slate-50" />
                <div className="h-7 w-32 rounded-full bg-slate-50" />
              </div>
            </div>
            <div className="h-52 w-full xl:w-[360px] rounded-2xl bg-white border border-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="h-32 rounded-2xl bg-white border border-slate-200" />
            <div className="h-32 rounded-2xl bg-white border border-slate-200" />
            <div className="h-32 rounded-2xl bg-white border border-slate-200" />
            <div className="h-32 rounded-2xl bg-white border border-slate-200" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-lg overflow-hidden relative">
      <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[#00B67A]/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative flex flex-col xl:flex-row gap-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-[#00B67A]">
              <div className={`rounded-lg border p-1.5 ${toneStyles[headlineTone]}`}>
                <Activity className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-mono uppercase tracking-widest font-bold">
                Owner Action Summary
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-slate-500">
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1">
                {periodLabel}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1">
                <Clock className="h-3 w-3" />
                Updated {timeString}
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-4">
            <div className="hidden sm:block pt-1">{headlineIcon}</div>

            <div>
              <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                <span className="sm:hidden">{headlineIcon}</span>
                {headline}
              </h2>

              <p className="mt-2 max-w-2xl text-xs md:text-sm leading-relaxed text-slate-600">
                {headlineDesc}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest ${toneStyles[cashStatus.tone]}`}>
              Cash runway: {cashStatus.desc}
            </span>

            <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest ${toneStyles[profitStatus.tone]}`}>
              Profit: {profitStatus.desc}
            </span>

            {hasCollectionPriority && (
              <span className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-amber-400">
                Collect: {formatPeso(overdueCollections)}
              </span>
            )}

            {hasApprovalPriority && (
              <span className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-violet-400">
                Approvals: {pendingApprovals}
              </span>
            )}

            {!hasUrgentIssue && (
              <span className="rounded-lg border border-[#00B67A]/25 bg-[#00B67A]/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-[#00B67A]">
                No urgent action
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onExplain}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#00B67A]/90 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI to Explain
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-900 hover:border-white transition"
            >
              View Details
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="w-full xl:w-[360px] rounded-2xl border border-slate-200 bg-white p-5 self-stretch flex flex-col">
          <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
            Main Action Today
          </p>

          <div className={`mt-4 inline-flex self-start rounded-xl border p-2.5 ${toneStyles[mainActionTone]}`}>
            {mainActionTone === "rose" ? (
              <AlertCircle className="h-5 w-5" />
            ) : mainActionTone === "amber" ? (
              <AlertTriangle className="h-5 w-5" />
            ) : mainActionTone === "violet" ? (
              <Clock className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </div>

          <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900 leading-tight">
            {mainActionTitle}
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {mainActionDesc}
          </p>

          <div className="mt-auto pt-6">
            <button
              onClick={onExplain}
              className={`w-full rounded-xl border px-4 py-2.5 text-xs font-bold transition flex items-center justify-center gap-2 ${
                mainActionTone === "emerald" 
                  ? "bg-[#00B67A] border-[#00B67A] text-black hover:bg-[#00B67A]/90" 
                  : `${toneStyles[mainActionTone]} hover:bg-slate-50`
              }`}
            >
              {mainActionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatusCard
          title="Cash Runway"
          value={runwayDays > 100 ? ">90 Days" : `${Math.max(runwayDays, 0)} Days`}
          desc={cashStatus.label === "Strong" ? "Strong cash coverage" : cashStatus.label === "Healthy" ? "Healthy cash coverage" : "Needs cash monitoring"}
          tone={cashStatus.tone}
          icon={<Wallet className="h-4 w-4" />}
        />

        <StatusCard
          title="Profit Margin"
          value={`${profitSummary.profitMargin.toFixed(1)}%`}
          desc={profitStatus.label === "Profitable" ? "Strong profitability" : profitStatus.label === "Watch" ? "Below target margin" : "Profit needs attention"}
          tone={profitStatus.tone}
          icon={<TrendingUp className="h-4 w-4" />}
        />

        <StatusCard
          title="Collect Today"
          value={formatPeso(overdueCollections)}
          desc={hasCollectionPriority ? "Overdue or due soon receivables" : "No urgent collection issue"}
          tone={hasCollectionPriority ? "amber" : "emerald"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />

        <StatusCard
          title="Needs Approval"
          value={`${pendingApprovals}`}
          desc={hasApprovalPriority ? "Pending transactions before closing" : "No pending approvals"}
          tone={hasApprovalPriority ? "violet" : "zinc"}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>
    </section>
  );
}
