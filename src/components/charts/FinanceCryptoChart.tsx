import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type FinanceChartPoint = { timestamp: string; sales: number; expenses: number; netProfit: number };
type Metric = "sales" | "expenses" | "netProfit";
type Range = "24H" | "7D" | "30D" | "3M" | "1Y" | "ALL";

const metrics: Record<Metric, { label: string; color: string }> = {
  sales: { label: "Sales", color: "#3b82f6" },
  expenses: { label: "Expenses", color: "#f43f5e" },
  netProfit: { label: "Net Profit", color: "#10b981" },
};
const ranges: Range[] = ["24H", "7D", "30D", "3M", "1Y", "ALL"];
const duration: Partial<Record<Range, number>> = {
  "24H": 86_400_000, "7D": 604_800_000, "30D": 2_592_000_000,
  "3M": 7_776_000_000, "1Y": 31_536_000_000,
};
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const compactPeso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 });

function TooltipCard({ active, payload, metric }: any) {
  if (!active || !payload?.length) return null;
  const config = metrics[metric as Metric];
  return <div className="min-w-48 rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl">
    <p className="mb-2 text-xs text-slate-400">{new Date(payload[0].payload.timestamp).toLocaleDateString("en-PH", { dateStyle: "medium" })}</p>
    <div className="flex items-center justify-between gap-5 text-sm">
      <span className="flex items-center gap-2 text-slate-300"><i className="h-2.5 w-2.5 rounded-full" style={{ background: config.color }} />{config.label}</span>
      <strong className="text-white">{peso.format(Number(payload[0].value ?? 0))}</strong>
    </div>
  </div>;
}

export function FinanceCryptoChart({ data, loading = false }: { data: FinanceChartPoint[]; loading?: boolean }) {
  const [metric, setMetric] = useState<Metric>("sales");
  const [range, setRange] = useState<Range>("30D");
  const config = metrics[metric];
  const filtered = useMemo(() => {
    const sorted = [...data].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    if (range === "ALL" || !sorted.length) return sorted;
    const cutoff = Date.parse(sorted.at(-1)!.timestamp) - (duration[range] ?? 0);
    return sorted.filter(point => Date.parse(point.timestamp) >= cutoff);
  }, [data, range]);
  const first = filtered[0]?.[metric] ?? 0;
  const current = filtered.at(-1)?.[metric] ?? 0;
  const change = current - first;
  const percent = first ? change / Math.abs(first) * 100 : 0;
  const positive = change >= 0;
  const gradient = `finance-gradient-${metric}`;

  return <motion.section layout className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
    <header className="border-b border-slate-800/80 p-5">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-400">{config.label}</p>
          <div className="flex flex-wrap items-end gap-3">
            <motion.h2 key={`${metric}-${current}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-semibold tracking-tight text-white">{peso.format(current)}</motion.h2>
            <span className={`mb-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${positive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
              {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{positive ? "+" : ""}{percent.toFixed(2)}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{positive ? "+" : ""}{peso.format(change)} during selected period</p>
        </div>
        <div className="flex flex-wrap gap-2">{(Object.keys(metrics) as Metric[]).map(key => <button key={key} type="button" onClick={() => setMetric(key)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${metric === key ? "border-slate-600 bg-slate-800 text-white" : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"}`}><i className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: metrics[key].color }} />{metrics[key].label}</button>)}</div>
      </div>
      <div className="mt-5 flex w-fit flex-wrap gap-1 rounded-lg bg-slate-900/80 p-1">{ranges.map(item => <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${range === item ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-200"}`}>{item}</button>)}</div>
    </header>
    <div className="relative h-[380px] p-3 sm:p-5">
      {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" /></div>}
      {!filtered.length ? <div className="flex h-full items-center justify-center text-sm text-slate-500">No chart data available</div> :
        <ResponsiveContainer width="100%" height="100%"><AreaChart data={filtered} margin={{ top: 20, right: 8, left: 0, bottom: 5 }}>
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={config.color} stopOpacity={0.35} /><stop offset="55%" stopColor={config.color} stopOpacity={0.1} /><stop offset="100%" stopColor={config.color} stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 6" />
          <XAxis dataKey="timestamp" axisLine={false} tickLine={false} minTickGap={35} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={value => new Date(value).toLocaleDateString("en-PH", { month: "short", day: range === "1Y" || range === "ALL" ? undefined : "numeric", year: range === "1Y" || range === "ALL" ? "2-digit" : undefined })} />
          <YAxis orientation="right" axisLine={false} tickLine={false} width={76} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={value => compactPeso.format(value)} />
          <Tooltip content={<TooltipCard metric={metric} />} cursor={{ stroke: "#64748b", strokeDasharray: "4 4" }} />
          <ReferenceLine y={current} stroke={config.color} strokeOpacity={0.45} strokeDasharray="5 5" />
          <Area key={metric} type="monotone" dataKey={metric} stroke={config.color} strokeWidth={2.5} fill={`url(#${gradient})`} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: "#020617", fill: config.color }} animationDuration={450} />
        </AreaChart></ResponsiveContainer>}
    </div>
  </motion.section>;
}
