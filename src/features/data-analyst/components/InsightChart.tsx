import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export type ChartSeries = { dataKey: string; name: string; color: string };

export type InsightChartConfig =
  | { chartType: "area"; data: any[]; xKey: string; series: ChartSeries[] }
  | { chartType: "bar"; data: any[]; xKey: string; series: ChartSeries[]; colorByStatus?: Record<string, string> }
  | { chartType: "pie"; data: any[]; nameKey: string; valueKey: string; colors: string[] };

const formatPeso = (num: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(num || 0);

const TooltipCard = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 font-sans min-w-[180px]">
      {label ? (
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1.5">
          {label}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex justify-between items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.payload?.fill }} />
              {entry.name}
            </span>
            <span className="font-mono font-semibold text-slate-900">
              {typeof entry.value === "number" ? formatPeso(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function InsightChart(config: InsightChartConfig) {
  if (config.chartType === "area") {
    const { data, xKey, series } = config;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.dataKey} id={`insight-color-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={10} tickMargin={8} />
          <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<TooltipCard />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              fill={`url(#insight-color-${s.dataKey})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (config.chartType === "bar") {
    const { data, xKey, series, colorByStatus } = config;
    const singleSeries = series.length === 1 && !!colorByStatus;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={10} tickMargin={8} interval={0} angle={data.length > 6 ? -20 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 50 : 30} />
          <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<TooltipCard />} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} radius={[4, 4, 0, 0]}>
              {singleSeries &&
                data.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={colorByStatus?.[entry.status] || s.color} />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const { data, nameKey, valueKey, colors } = config;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={<TooltipCard />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="45%" outerRadius="80%" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={`slice-${i}`} fill={colors[i % colors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
