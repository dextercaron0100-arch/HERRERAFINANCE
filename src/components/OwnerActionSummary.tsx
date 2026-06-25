import React from 'react';
import { 
  Sparkles, 
  ArrowRight,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Wallet,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

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
  };
  leakAlerts: {
    type: "high" | "warning" | "info";
    message: string;
  }[];
  formatPeso: (value: number) => string;
  onExplain: () => void;
  dateRange: string;
  isLoading?: boolean;
};

const statusStyles = {
  healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  watch: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  critical: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

export default function OwnerActionSummary({
  flowSummary,
  profitSummary,
  cashRisk,
  leakAlerts,
  formatPeso,
  onExplain,
  dateRange,
  isLoading
}: OwnerActionSummaryProps) {
  
  // Calculate cash runway (simplified assumption based on daily average outflow)
  const daysInPeriod = dateRange === "ytd" ? 365 : parseInt(dateRange);
  const avgDailyOutflow = flowSummary.cashOut / daysInPeriod;
  const runwayDays = avgDailyOutflow > 0 ? Math.floor(cashRisk.currentCash / avgDailyOutflow) : 999;
  
  // Main Action Logic
  function getMainOwnerAction() {
    if (cashRisk.projectedCash < 0) {
      return {
        level: "critical",
        title: "Cash shortage risk",
        message: "Projected cash may fall below zero. Review upcoming payables immediately.",
        actionLabel: "Review Payables",
        actionColor: "bg-rose-600 hover:bg-rose-500 text-white"
      };
    }

    if (profitSummary.netProfit < 0) {
      return {
        level: "critical",
        title: "Business is currently losing money",
        message: "Net profit is negative for this period. Check top expenses and low-performing areas.",
        actionLabel: "Review Profit",
        actionColor: "bg-rose-600 hover:bg-rose-500 text-white"
      };
    }

    if (cashRisk.upcomingReceivables > 0) {
      return {
        level: "watch",
        title: "Collection opportunity",
        message: `Collecting ${formatPeso(cashRisk.upcomingReceivables)} can improve short-term cash.`,
        actionLabel: "Review Collections",
        actionColor: "bg-amber-600 hover:bg-amber-500 text-white"
      };
    }

    if (profitSummary.profitMargin < 10 && profitSummary.revenue > 0) {
      return {
        level: "watch",
        title: "Profit margin is low",
        message: `Margin is only ${profitSummary.profitMargin.toFixed(1)}%. Review payroll, COGS, and operating expenses.`,
        actionLabel: "Review Expenses",
        actionColor: "bg-amber-600 hover:bg-amber-500 text-white"
      };
    }

    return {
      level: "healthy",
      title: "Cash and profit look stable",
      message: "No urgent owner action is required for the selected period.",
      actionLabel: "View Details",
      actionColor: "bg-emerald-600 hover:bg-emerald-500 text-white"
    };
  }

  const mainAction = getMainOwnerAction();
  
  const getCashStatus = () => {
    if (runwayDays < 14 || cashRisk.projectedCash < 0) return { label: "Critical", style: statusStyles.critical, desc: `${runwayDays} days runway` };
    if (runwayDays < 30) return { label: "Watch", style: statusStyles.watch, desc: `${runwayDays} days runway` };
    return { label: "Healthy", style: statusStyles.healthy, desc: `${runwayDays > 100 ? '>90' : runwayDays} days runway` };
  };

  const getProfitStatus = () => {
    if (profitSummary.netProfit < 0) return { label: "Losing", style: statusStyles.critical, desc: "Negative profit" };
    if (profitSummary.profitMargin < 15) return { label: "Watch", style: statusStyles.watch, desc: `${profitSummary.profitMargin.toFixed(1)}% margin` };
    return { label: "Profitable", style: statusStyles.healthy, desc: `${profitSummary.profitMargin.toFixed(1)}% margin` };
  };
  
  const getActionNeeded = () => {
    const highAlerts = leakAlerts.filter(a => a.type === 'high').length;
    if (highAlerts > 0) return { label: "Urgent", style: statusStyles.critical, desc: `${highAlerts} critical items` };
    if (leakAlerts.length > 0 || cashRisk.upcomingReceivables > 0) return { label: "Review today", style: statusStyles.watch, desc: "Pending items" };
    return { label: "No action", style: statusStyles.healthy, desc: "All clear" };
  };

  const cashStatus = getCashStatus();
  const profitStatus = getProfitStatus();
  const actionNeeded = getActionNeeded();

  // Pick main headline
  let mainHeadline = "Cash is Healthy";
  let mainHeadlineIcon = <CheckCircle2 className="w-8 h-8 text-emerald-400" />;
  let mainDesc = "Projected cash remains positive after upcoming bills and expected collections.";
  
  if (cashRisk.projectedCash < 0) {
    mainHeadline = "Critical Cash Flow Risk";
    mainHeadlineIcon = <AlertCircle className="w-8 h-8 text-rose-400" />;
    mainDesc = "Projected cash balance is negative. Immediate action required.";
  } else if (profitSummary.netProfit < 0) {
    mainHeadline = "Business is Losing Money";
    mainHeadlineIcon = <AlertTriangle className="w-8 h-8 text-rose-400" />;
    mainDesc = "Expenses have exceeded revenue for the selected period.";
  } else if (runwayDays < 30 || profitSummary.profitMargin < 15) {
    mainHeadline = "Requires Attention";
    mainHeadlineIcon = <AlertTriangle className="w-8 h-8 text-amber-400" />;
    mainDesc = "Cash or profit margins are below target thresholds.";
  }

  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isLoading) {
    return (
      <section className="mb-8 rounded-2xl border border-[#24272C] bg-[#181A1C] p-5 md:p-6 shadow-lg relative overflow-hidden">
        <div className="animate-pulse flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 mb-6">
          <div className="space-y-4 flex-1 w-full">
            <div className="h-4 bg-[#24272C] rounded w-32"></div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-[#24272C] rounded-full hidden sm:block"></div>
              <div className="space-y-2 flex-1">
                <div className="h-8 bg-[#24272C] rounded w-3/4 max-w-md"></div>
                <div className="h-4 bg-[#24272C] rounded w-1/2 max-w-sm"></div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <div className="h-6 bg-[#24272C] rounded-full w-24"></div>
              <div className="h-6 bg-[#24272C] rounded-full w-24"></div>
            </div>
          </div>
          <div className="w-full xl:w-80 rounded-xl border border-[#24272C] bg-black/20 p-5 shrink-0 h-36 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-[#24272C] rounded w-24"></div>
              <div className="h-6 bg-[#24272C] rounded w-3/4"></div>
            </div>
            <div className="h-10 bg-[#24272C] rounded-lg w-full"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#24272C] animate-pulse">
          <div className="h-16 bg-[#24272C] rounded-lg w-full"></div>
          <div className="h-16 bg-[#24272C] rounded-lg w-full"></div>
          <div className="h-16 bg-[#24272C] rounded-lg w-full"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-2xl border border-[#24272C] bg-[#181A1C] p-5 md:p-6 shadow-lg relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -z-10 group-hover:bg-emerald-500/10 transition-colors duration-700" />
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 mb-6">
        {/* Main Summary */}
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
              Owner Action Summary
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-zinc-500 hidden sm:block">
                Last updated: Today, {timeString}
              </span>
              <p className="text-[10px] font-mono text-zinc-500 xl:hidden">
                Viewing: {dateRange === 'ytd' ? 'YTD' : `Last ${dateRange} days`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="pt-1 hidden sm:block">
              {mainHeadlineIcon}
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <span className="sm:hidden">{mainHeadlineIcon}</span>
                {mainHeadline}
              </h2>
              <p className="mt-2 text-sm md:text-base text-zinc-400 max-w-2xl">
                {mainDesc}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
             <span className={`rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-widest ${cashStatus.style}`}>
              {cashStatus.label}: {cashStatus.desc}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-widest ${profitStatus.style}`}>
              {profitStatus.label}: {profitStatus.desc}
            </span>
          </div>
          
          <div className="pt-2">
            <button 
              onClick={onExplain}
              className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition"
            >
              <Sparkles className="w-4 h-4" /> Explain Money Flow
            </button>
          </div>
        </div>

        {/* Owner To-Do */}
        <div className="w-full xl:w-80 rounded-xl border border-[#24272C] bg-black/20 p-5 flex flex-col justify-between self-stretch shrink-0">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 flex items-center justify-between">
              Main Action Today
              <span className="text-[9px] text-zinc-600 xl:block hidden">
                {dateRange === 'ytd' ? 'YTD' : `${dateRange}D`}
              </span>
            </p>
            <h3 className="mt-3 text-sm font-bold text-white leading-snug">
              {mainAction.title}
            </h3>
            <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
              {mainAction.message}
            </p>
          </div>
          <button className={`mt-5 w-full rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 ${mainAction.actionColor}`}>
            {mainAction.actionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Decision Chips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#24272C]">
        <div className="bg-black/20 hover:bg-black/40 transition-colors rounded-lg p-3 border border-[#24272C] group/chip cursor-default">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 group-hover/chip:text-zinc-400 transition-colors">Cash Status</p>
          <div className="flex items-center justify-between">
             <span className="text-sm font-bold text-white">{cashStatus.label}</span>
             <span className="text-xs font-mono text-zinc-400 group-hover/chip:text-zinc-300 transition-colors">{cashStatus.desc}</span>
          </div>
        </div>
        <div className="bg-black/20 hover:bg-black/40 transition-colors rounded-lg p-3 border border-[#24272C] group/chip cursor-default">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 group-hover/chip:text-zinc-400 transition-colors">Profit Status</p>
          <div className="flex items-center justify-between">
             <span className="text-sm font-bold text-white">{profitStatus.label}</span>
             <span className="text-xs font-mono text-zinc-400 group-hover/chip:text-zinc-300 transition-colors">{profitStatus.desc}</span>
          </div>
        </div>
        <div className="bg-black/20 hover:bg-black/40 transition-colors rounded-lg p-3 border border-[#24272C] group/chip cursor-default">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 group-hover/chip:text-zinc-400 transition-colors">Action Needed</p>
          <div className="flex items-center justify-between">
             <span className="text-sm font-bold text-white">{actionNeeded.label}</span>
             <span className="text-xs font-mono text-zinc-400 group-hover/chip:text-zinc-300 transition-colors">{actionNeeded.desc}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
