import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import {
  getTransactions,
  getCompanies,
  getAllCategories,
  getCategories,
  getBudgetVsActual,
  getProfitLoss,
  useDBUpdate,
} from "@/data/mockDatabase";
import { getCashFlowTimeline, getCompanyProfitComparison } from "@/lib/financeMetrics";
import { exportDataAnalystReport } from "@/lib/dataAnalystExport";
import { DATASETS, DatasetId, PeriodState, defaultPeriodState, resolveDateRange } from "./datasets";
import DatasetPicker from "./components/DatasetPicker";
import InsightChart, { InsightChartConfig } from "./components/InsightChart";
import NarrativePanel, { DataAnalystInsight } from "./components/NarrativePanel";

interface DataAnalystProps {
  userId: string;
  companyId: string;
}

const PIE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#8B5CF6", "#EC4899", "#84CC16", "#94A3B8"];
const STATUS_COLORS: Record<string, string> = {
  Healthy: "#10B981",
  Watch: "#F59E0B",
  "Low Profit": "#F97316",
  Loss: "#EF4444",
};

const formatPeso = (num: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(num || 0);

/** Rolls up a long daily timeline into ~30 buckets before sending to the AI, so the
 *  prompt (and token cost) stays bounded for wide date ranges like 180d/365d. */
function summarizeTimelineForAI<T extends { date: string; cashIn: number; cashOut: number; netCash: number }>(
  timeline: T[],
): { date: string; cashIn: number; cashOut: number; netCash: number }[] {
  if (timeline.length <= 60) return timeline;
  const bucketSize = Math.ceil(timeline.length / 30);
  const buckets: { date: string; cashIn: number; cashOut: number; netCash: number }[] = [];
  for (let i = 0; i < timeline.length; i += bucketSize) {
    const slice = timeline.slice(i, i + bucketSize);
    buckets.push({
      date: `${slice[0].date} to ${slice[slice.length - 1].date}`,
      cashIn: slice.reduce((s, d) => s + d.cashIn, 0),
      cashOut: slice.reduce((s, d) => s + d.cashOut, 0),
      netCash: slice.reduce((s, d) => s + d.netCash, 0),
    });
  }
  return buckets;
}

function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-");
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1).toLocaleString("default", { month: "long", year: "numeric" });
}

interface Report {
  chartConfig: InsightChartConfig;
  headlineCallouts: { label: string; value: string }[];
  exportRows: Record<string, string | number>[];
  currencyColumns: string[];
  scopeLabel: string;
  periodLabel: string;
  isEmpty: boolean;
  aiContext: unknown;
}

export default function DataAnalyst({ userId, companyId }: DataAnalystProps) {
  const dbTick = useDBUpdate();
  const isConsolidated = companyId === "all";

  const [selectedDatasetId, setSelectedDatasetId] = useState<DatasetId>("cash_flow_trend");
  const [period, setPeriod] = useState<PeriodState>(defaultPeriodState());
  const [question, setQuestion] = useState("");

  const [aiAvailable, setAiAvailable] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [insight, setInsight] = useState<DataAnalystInsight | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setAiAvailable(Boolean(d.ai)))
      .catch(() => setAiAvailable(false));
  }, []);

  // A company-comparison-only dataset stops being valid if the user leaves the
  // consolidated view — fall back to the always-available trend dataset.
  useEffect(() => {
    const ds = DATASETS.find((d) => d.id === selectedDatasetId);
    if (ds?.consolidatedOnly && !isConsolidated) setSelectedDatasetId("cash_flow_trend");
  }, [isConsolidated, selectedDatasetId]);

  // The chart underneath a generated insight changed — the old narrative no longer applies.
  useEffect(() => {
    setInsight(null);
    setError(null);
  }, [selectedDatasetId, companyId, JSON.stringify(period)]);

  const companies = useMemo(() => getCompanies(), [dbTick]);
  const scopeLabel = isConsolidated
    ? "Consolidated (All Companies)"
    : companies.find((c) => c.id === companyId)?.name || companyId;

  const report: Report = useMemo(() => {
    if (selectedDatasetId === "cash_flow_trend") {
      const transactions = getTransactions(userId, companyId);
      const timeline = getCashFlowTimeline(transactions, period.days);
      const totalIn = timeline.reduce((s, d) => s + d.cashIn, 0);
      const totalOut = timeline.reduce((s, d) => s + d.cashOut, 0);
      const headlineCallouts = [
        { label: "Total Cash In", value: formatPeso(totalIn) },
        { label: "Total Cash Out", value: formatPeso(totalOut) },
        { label: "Net Cash Flow", value: formatPeso(totalIn - totalOut) },
        { label: "Days Covered", value: String(period.days) },
      ];
      return {
        chartConfig: {
          chartType: "area",
          data: timeline.map((d) => ({ date: d.date.slice(5), cashIn: d.cashIn, cashOut: d.cashOut, netCash: d.netCash })),
          xKey: "date",
          series: [
            { dataKey: "cashIn", name: "Cash In", color: "#10B981" },
            { dataKey: "cashOut", name: "Cash Out", color: "#EF4444" },
            { dataKey: "netCash", name: "Net Cash", color: "#6366F1" },
          ],
        },
        headlineCallouts,
        exportRows: timeline.map((d) => ({ Date: d.date, "Cash In": d.cashIn, "Cash Out": d.cashOut, "Net Cash": d.netCash })),
        currencyColumns: ["Cash In", "Cash Out", "Net Cash"],
        scopeLabel,
        periodLabel: `Last ${period.days} Days`,
        isEmpty: totalIn === 0 && totalOut === 0,
        aiContext: { headlineCallouts, dailySeries: summarizeTimelineForAI(timeline) },
      };
    }

    if (selectedDatasetId === "profit_loss") {
      const rows = getProfitLoss(companyId);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - (period.monthsBack - 1));
      const cutoffMonth = cutoff.toISOString().slice(0, 7);
      const filtered = rows.filter((r) => r.month >= cutoffMonth);

      const monthly: Record<string, { revenue: number; expenses: number }> = {};
      filtered.forEach((r) => {
        monthly[r.month] = monthly[r.month] || { revenue: 0, expenses: 0 };
        monthly[r.month].revenue += r.totalRevenue;
        monthly[r.month].expenses += r.totalExpenses;
      });
      const chartData = Object.keys(monthly)
        .sort()
        .map((month) => ({
          month,
          revenue: monthly[month].revenue,
          expenses: monthly[month].expenses,
          netIncome: monthly[month].revenue - monthly[month].expenses,
        }));

      const totalRevenue = chartData.reduce((s, r) => s + r.revenue, 0);
      const totalExpenses = chartData.reduce((s, r) => s + r.expenses, 0);
      const netIncome = totalRevenue - totalExpenses;
      const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
      const headlineCallouts = [
        { label: "Total Revenue", value: formatPeso(totalRevenue) },
        { label: "Total Expenses", value: formatPeso(totalExpenses) },
        { label: "Net Income", value: formatPeso(netIncome) },
        { label: "Margin", value: `${margin.toFixed(1)}%` },
      ];

      return {
        chartConfig: {
          chartType: "area",
          data: chartData,
          xKey: "month",
          series: [
            { dataKey: "revenue", name: "Revenue", color: "#10B981" },
            { dataKey: "expenses", name: "Expenses", color: "#EF4444" },
            { dataKey: "netIncome", name: "Net Income", color: "#6366F1" },
          ],
        },
        headlineCallouts,
        exportRows: chartData.map((r) => ({ Month: r.month, Revenue: r.revenue, Expenses: r.expenses, "Net Income": r.netIncome })),
        currencyColumns: ["Revenue", "Expenses", "Net Income"],
        scopeLabel,
        periodLabel: `Last ${period.monthsBack} Months`,
        isEmpty: chartData.length === 0,
        aiContext: { headlineCallouts, monthly: chartData },
      };
    }

    if (selectedDatasetId === "category_breakdown") {
      const { start, end, label: rangeLabel } = resolveDateRange(period);
      const transactions = getTransactions(userId, companyId).filter(
        (t) => t.type === "cash_out" && t.status === "completed" && t.txnDate >= start && t.txnDate <= end,
      );
      const categories = isConsolidated ? getAllCategories() : getCategories(companyId);
      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

      const totals: Record<string, number> = {};
      transactions.forEach((t) => {
        totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
      });
      let entries = Object.entries(totals)
        .map(([catId, value]) => ({ name: categoryMap.get(catId) || "Uncategorized", value }))
        .sort((a, b) => b.value - a.value);
      if (entries.length > 8) {
        const top = entries.slice(0, 8);
        const otherSum = entries.slice(8).reduce((s, e) => s + e.value, 0);
        entries = [...top, { name: "Other", value: otherSum }];
      }

      const totalSpend = entries.reduce((s, e) => s + e.value, 0);
      const headlineCallouts = [
        { label: "Total Spend", value: formatPeso(totalSpend) },
        { label: "Top Category", value: entries[0] ? `${entries[0].name} (${formatPeso(entries[0].value)})` : "N/A" },
        { label: "Categories", value: String(entries.length) },
      ];

      return {
        chartConfig: { chartType: "pie", data: entries, nameKey: "name", valueKey: "value", colors: PIE_COLORS },
        headlineCallouts,
        exportRows: entries.map((e) => ({ Category: e.name, Amount: e.value })),
        currencyColumns: ["Amount"],
        scopeLabel,
        periodLabel: rangeLabel,
        isEmpty: entries.length === 0,
        aiContext: { headlineCallouts, byCategory: entries },
      };
    }

    if (selectedDatasetId === "company_comparison") {
      const { start, end, label: rangeLabel } = resolveDateRange(period);
      const allCompanies = getCompanies();
      const allTxns = getTransactions(userId).filter((t) => t.txnDate >= start && t.txnDate <= end);
      const categories = getAllCategories();
      const comparison = getCompanyProfitComparison(allCompanies, allTxns, categories);

      const best = comparison[0];
      const worst = comparison[comparison.length - 1];
      const headlineCallouts = [
        { label: "Top Performer", value: best ? `${best.companyName} (${formatPeso(best.netProfit)})` : "N/A" },
        {
          label: "Needs Attention",
          value: worst && worst.companyId !== best?.companyId ? `${worst.companyName} (${formatPeso(worst.netProfit)})` : "N/A",
        },
        { label: "Companies", value: String(comparison.length) },
      ];

      return {
        chartConfig: {
          chartType: "bar",
          data: comparison.map((c) => ({ name: c.companyCode, netProfit: c.netProfit, status: c.status })),
          xKey: "name",
          series: [{ dataKey: "netProfit", name: "Net Profit", color: "#6366F1" }],
          colorByStatus: STATUS_COLORS,
        },
        headlineCallouts,
        exportRows: comparison.map((c) => ({
          Company: c.companyName,
          "Net Profit": c.netProfit,
          "Profit Margin %": Number(c.profitMargin.toFixed(1)),
          Status: c.status,
        })),
        currencyColumns: ["Net Profit"],
        scopeLabel,
        periodLabel: rangeLabel,
        isEmpty: comparison.length === 0,
        aiContext: {
          headlineCallouts,
          companies: comparison.map((c) => ({ name: c.companyName, netProfit: c.netProfit, margin: c.profitMargin, status: c.status })),
        },
      };
    }

    // budget_vs_actual
    const rows = getBudgetVsActual(companyId, period.month);
    const totalPlanned = rows.reduce((s, r) => s + r.plannedAmount, 0);
    const totalActual = rows.reduce((s, r) => s + r.actualAmount, 0);
    const overBudgetCount = rows.filter((r) => r.status === "over_budget").length;
    const headlineCallouts = [
      { label: "Total Planned", value: formatPeso(totalPlanned) },
      { label: "Total Actual", value: formatPeso(totalActual) },
      { label: "Variance", value: formatPeso(totalPlanned - totalActual) },
      { label: "Over Budget", value: String(overBudgetCount) },
    ];

    return {
      chartConfig: {
        chartType: "bar",
        data: rows.map((r) => ({ name: r.categoryName, Planned: r.plannedAmount, Actual: r.actualAmount })),
        xKey: "name",
        series: [
          { dataKey: "Planned", name: "Planned", color: "#94A3B8" },
          { dataKey: "Actual", name: "Actual", color: "#6366F1" },
        ],
      },
      headlineCallouts,
      exportRows: rows.map((r) => ({
        Category: r.categoryName,
        Planned: r.plannedAmount,
        Actual: r.actualAmount,
        Variance: r.variance,
        "Usage %": Number(r.usagePercent.toFixed(1)),
        Status: r.status,
      })),
      currencyColumns: ["Planned", "Actual", "Variance"],
      scopeLabel,
      periodLabel: monthLabel(period.month),
      isEmpty: rows.length === 0,
      aiContext: {
        headlineCallouts,
        budgetLines: rows.map((r) => ({ category: r.categoryName, planned: r.plannedAmount, actual: r.actualAmount, status: r.status })),
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatasetId, JSON.stringify(period), userId, companyId, isConsolidated, scopeLabel, dbTick]);

  const selectedDataset = DATASETS.find((d) => d.id === selectedDatasetId) || DATASETS[0];

  const handleGenerateInsight = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/data-analyst-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetLabel: selectedDataset.label,
          scopeLabel: report.scopeLabel,
          periodLabel: report.periodLabel,
          question: question.trim() || undefined,
          context: report.aiContext,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to generate insight");
      setInsight(data);
    } catch (e: any) {
      const message = e.message || "Failed to generate insight";
      setError(message);
      toast.error("AI Insight Failed", { description: message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    exportDataAnalystReport(
      selectedDataset.label,
      report.scopeLabel,
      report.periodLabel,
      report.exportRows,
      report.currencyColumns,
      insight?.narrative,
      insight?.headlineCallouts,
    );
    toast.success("Report exported to Excel");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-5 shadow-sm rounded-2xl">
        <h1 className="text-base font-display font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <span>Data Analyst</span>
        </h1>
        <p className="text-[10px] text-zinc-450 font-mono uppercase tracking-wider mt-0.5 font-semibold">
          Pick a data set to chart, then generate an AI-written insight of what it shows.
        </p>
      </div>

      <DatasetPicker
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={setSelectedDatasetId}
        isConsolidated={isConsolidated}
        period={period}
        onPeriodChange={(patch) => setPeriod((p) => ({ ...p, ...patch }))}
        question={question}
        onQuestionChange={setQuestion}
      />

      {report.isEmpty ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs text-slate-500 font-mono">
          No data available for this selection.
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900">{selectedDataset.label}</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {report.scopeLabel} • {report.periodLabel}
                </p>
              </div>
              <button
                onClick={handleExport}
                className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export to Excel
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {report.headlineCallouts.map((c, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest mb-1">{c.label}</div>
                  <div className="text-sm font-mono font-bold text-slate-900">{c.value}</div>
                </div>
              ))}
            </div>

            <div className="h-72 w-full">
              <InsightChart {...report.chartConfig} />
            </div>
          </div>

          <NarrativePanel
            aiAvailable={aiAvailable}
            isGenerating={isGenerating}
            error={error}
            insight={insight}
            question={question}
            datasetLabel={selectedDataset.label}
            scopeLabel={report.scopeLabel}
            periodLabel={report.periodLabel}
            context={report.aiContext}
            onGenerate={handleGenerateInsight}
          />
        </>
      )}
    </div>
  );
}
