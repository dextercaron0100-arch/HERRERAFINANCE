export type DatasetId =
  | "cash_flow_trend"
  | "profit_loss"
  | "category_breakdown"
  | "company_comparison"
  | "budget_vs_actual";

export type PeriodKind = "days" | "months" | "range" | "month";

export interface DatasetConfig {
  id: DatasetId;
  label: string;
  description: string;
  periodKind: PeriodKind;
  /** Only meaningful (and only shown) when the consolidated "all companies" view is active. */
  consolidatedOnly?: boolean;
}

export const DATASETS: DatasetConfig[] = [
  {
    id: "cash_flow_trend",
    label: "Cash Flow Trend",
    description: "Daily cash in vs. cash out over time.",
    periodKind: "days",
  },
  {
    id: "profit_loss",
    label: "Profit & Loss",
    description: "Monthly revenue, expenses, and net income.",
    periodKind: "months",
  },
  {
    id: "category_breakdown",
    label: "Category Breakdown",
    description: "Where spending went, broken down by category.",
    periodKind: "range",
  },
  {
    id: "company_comparison",
    label: "Company Comparison",
    description: "Net profit and health status across every company.",
    periodKind: "range",
    consolidatedOnly: true,
  },
  {
    id: "budget_vs_actual",
    label: "Budget vs Actual",
    description: "Planned vs. actual spend per category for one month.",
    periodKind: "month",
  },
];

export type RangePreset = "this_month" | "last_30" | "last_90" | "year_to_date" | "custom";

export interface PeriodState {
  days: number;
  monthsBack: number;
  rangePreset: RangePreset;
  customStart: string;
  customEnd: string;
  month: string; // YYYY-MM-01
}

export function defaultPeriodState(): PeriodState {
  const now = new Date();
  const month = `${now.toISOString().slice(0, 7)}-01`;
  return {
    days: 30,
    monthsBack: 6,
    rangePreset: "last_30",
    customStart: "",
    customEnd: "",
    month,
  };
}

/** Resolves a range preset (or custom dates) into concrete YYYY-MM-DD bounds. */
export function resolveDateRange(period: PeriodState): { start: string; end: string; label: string } {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  if (period.rangePreset === "custom") {
    const start = period.customStart || "0000-01-01";
    const end = period.customEnd || todayStr;
    return { start, end, label: `${period.customStart || "…"} to ${period.customEnd || "today"}` };
  }

  if (period.rangePreset === "this_month") {
    const start = `${now.toISOString().slice(0, 7)}-01`;
    return { start, end: todayStr, label: "This Month" };
  }

  if (period.rangePreset === "year_to_date") {
    const start = `${now.getFullYear()}-01-01`;
    return { start, end: todayStr, label: "Year to Date" };
  }

  // last_30 / last_90
  const days = period.rangePreset === "last_90" ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(now.getDate() - days);
  const start = startDate.toISOString().split("T")[0];
  return { start, end: todayStr, label: `Last ${days} Days` };
}
