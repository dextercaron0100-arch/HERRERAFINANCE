import React, { useState, useMemo } from 'react';
import { AreaChart, Area, Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import { 
  ArrowRight,
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet,
  AlertTriangle,
  Info,
  Building2,
  Calendar,
  Download,
  Sparkles,
  Search,
  Filter,
  X,
  Loader2,
  ChevronRight
} from "lucide-react";

import { 
  getTransactions, 
  getCompanies, 
  getPayables, 
  getReceivables, 
  getCashAccounts,
  getBudgetVsActual,
  getCategories,
  useDBUpdate
} from "../data/mockDatabase";

import { 
  getMoneyFlowSummary, 
  getProfitSummary, 
  getUpcomingCashRisk, 
  getMoneyLeakAlerts,
  getCompanyProfitComparison,
  getCashFlowTimeline
} from "../lib/financeMetrics";

interface MoneyFlowProfitCenterProps {
  userId: string;
  companyId: string;
  isConsolidated: boolean;
}

export default function MoneyFlowProfitCenter({ userId, companyId, isConsolidated }: MoneyFlowProfitCenterProps) {
  const dbTick = useDBUpdate();
  const [dateRange, setDateRange] = useState<"7" | "30" | "90" | "ytd">("30");
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const companies = getCompanies();
  const targetCompanies = isConsolidated ? companies : companies.filter(c => c.id === companyId);
  const targetCompanyIds = targetCompanies.map(c => c.id);

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Data fetching
  const { transactions, payables, receivables, cashAccounts, budgets, categories } = useMemo(() => {
    let txns: any[] = [];
    let pays: any[] = [];
    let recs: any[] = [];
    let cash: any[] = [];
    let bdgs: any[] = [];
    let cats: any[] = [];

    targetCompanyIds.forEach(cId => {
      txns = [...txns, ...getTransactions(userId, cId)];
      pays = [...pays, ...getPayables(userId, cId)];
      recs = [...recs, ...getReceivables(userId, cId)];
      cash = [...cash, ...getCashAccounts(cId)];
      bdgs = [...bdgs, ...getBudgetVsActual(cId, "2026-06-01")]; // Currently mock using current month
      cats = [...cats, ...getCategories(cId)];
    });

    return { transactions: txns, payables: pays, receivables: recs, cashAccounts: cash, budgets: bdgs, categories: cats };
  }, [dbTick, userId, targetCompanyIds]);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const limitDays = dateRange === "ytd" ? 365 : parseInt(dateRange);
    const start = new Date();
    if (dateRange === "ytd") {
      start.setFullYear(today.getFullYear(), 0, 1);
    } else {
      start.setDate(today.getDate() - limitDays);
    }
    const startStr = start.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    return transactions.filter(t => t.txnDate >= startStr && t.txnDate <= todayStr);
  }, [transactions, dateRange]);

  // Summaries
  const flowSummary = useMemo(() => getMoneyFlowSummary(filteredTransactions), [filteredTransactions]);
  const profitSummary = useMemo(() => getProfitSummary(filteredTransactions, categories), [filteredTransactions, categories]);
  const cashRisk = useMemo(() => getUpcomingCashRisk(payables, receivables, cashAccounts), [payables, receivables, cashAccounts]);
  const leakAlerts = useMemo(() => getMoneyLeakAlerts(filteredTransactions, payables, receivables, budgets), [filteredTransactions, payables, receivables, budgets]);
  
  const chartData = useMemo(() => getCashFlowTimeline(transactions, parseInt(dateRange) || 30), [transactions, dateRange]);
  const companyComparisons = useMemo(() => getCompanyProfitComparison(targetCompanies, filteredTransactions, categories), [targetCompanies, filteredTransactions, categories]);

  const profitBreakdownData = [
    { name: 'Revenue', amount: profitSummary.revenue, fill: '#00B67A' },
    { name: 'COGS', amount: -profitSummary.cogs, fill: '#F59E0B' },
    { name: 'Payroll', amount: -profitSummary.payroll, fill: '#EC4899' },
    { name: 'Operating Exp', amount: -profitSummary.operatingExpenses, fill: '#3B82F6' }
  ];

  const handleExplain = async () => {
    setIsExplaining(true);
    setExplanation(null);
    try {
      const response = await fetch("/api/explain-profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          dateRange,
          summary: { ...flowSummary, ...profitSummary },
          companyComparison: companyComparisons,
          alerts: leakAlerts
        })
      });
      const data = await response.json();
      if (data.explanation) {
        setExplanation(data.explanation);
      } else {
        setExplanation(data.error || "Failed to generate explanation");
      }
    } catch (e: any) {
      setExplanation("Network error: Could not reach AI service.");
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0D0D0D] text-white p-4 md:p-6 lg:p-8 font-sans relative">
      
      {/* AI EXPLANATION MODAL */}
      {(isExplaining || explanation) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181A1C] border border-[#24272C] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-emerald-400 font-mono uppercase tracking-widest font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> AI Money Flow Analysis
              </h3>
              {!isExplaining && (
                <button onClick={() => setExplanation(null)} className="text-zinc-500 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {isExplaining ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-400 font-mono text-xs uppercase tracking-widest gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                Analyzing financial flow and profitability...
              </div>
            ) : (
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 font-mono uppercase tracking-tight">
            <Wallet className="w-6 h-6 text-emerald-400" />
            Money Flow & Profit Center
          </h1>
          <p className="text-zinc-400 text-sm mt-1.5 font-mono uppercase tracking-widest">
            {isConsolidated ? "Group Financial Overview" : `${targetCompanies[0]?.name || "Company"} Financial Overview`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#181A1C] border border-[#24272C] rounded-lg p-1">
            {(["7", "30", "90", "ytd"] as const).map(d => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded-md transition ${dateRange === d ? "bg-[#24272C] text-white font-bold" : "text-zinc-400 hover:text-white"}`}
              >
                {d === "ytd" ? "YTD" : `${d}D`}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 bg-[#181A1C] border border-[#24272C] hover:border-zinc-500 px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest transition">
            <Download className="w-4 h-4" /> Export
          </button>

          <button 
            onClick={handleExplain}
            disabled={isExplaining}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border border-emerald-400/30 px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExplaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
            Explain Money Flow
          </button>
        </div>
      </div>

      {/* SECTION 1: OWNER SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition" />
          <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Cash In
          </h3>
          <div className="text-2xl font-bold font-mono">{formatPeso(flowSummary.cashIn)}</div>
        </div>

        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition" />
          <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-rose-400" /> Cash Out
          </h3>
          <div className="text-2xl font-bold font-mono">{formatPeso(flowSummary.cashOut)}</div>
        </div>

        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-zinc-300" /> Net Cash Flow
          </h3>
          <div className={`text-2xl font-bold font-mono ${flowSummary.netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {flowSummary.netCashFlow >= 0 ? "+" : ""}{formatPeso(flowSummary.netCashFlow)}
          </div>
        </div>

        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <h3 className="text-zinc-400 text-xs font-mono uppercase tracking-widest flex items-center justify-between mb-2">
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> Net Profit</span>
            <span className={`px-2 py-0.5 rounded text-[10px] ${profitSummary.profitMargin >= 20 ? "bg-emerald-900/50 text-emerald-400" : profitSummary.profitMargin >= 0 ? "bg-amber-900/50 text-amber-400" : "bg-rose-900/50 text-rose-400"}`}>
              {profitSummary.profitMargin.toFixed(1)}% Margin
            </span>
          </h3>
          <div className={`text-2xl font-bold font-mono ${profitSummary.netProfit >= 0 ? "text-white" : "text-rose-400"}`}>
            {formatPeso(profitSummary.netProfit)}
          </div>
        </div>
      </div>

      {/* SECTION 2 & 3: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg flex flex-col h-96">
          <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-6 flex justify-between items-center">
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-400" /> Money Flow Trend</span>
            <span className="text-[10px] text-zinc-500 bg-[#24272C] px-2 py-1 rounded">LAST {dateRange === "ytd" ? "365" : dateRange} DAYS</span>
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B67A" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#00B67A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCashOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip
                  contentStyle={{ backgroundColor: "#141618", borderColor: "#24272C", borderRadius: "8px", fontSize: "10px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value: number) => formatPeso(value)}
                  labelStyle={{ color: "#888", marginBottom: "4px" }}
                />
                <Area type="monotone" dataKey="cashIn" stroke="#00B67A" strokeWidth={1} fillOpacity={1} fill="url(#colorCashIn)" name="Cash In" />
                <Area type="monotone" dataKey="cashOut" stroke="#F43F5E" strokeWidth={1} fillOpacity={1} fill="url(#colorCashOut)" name="Cash Out" />
                <Line type="monotone" dataKey="netCash" stroke="#3B82F6" strokeWidth={2} dot={false} name="Net Cash" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg flex flex-col h-96">
          <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-2 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-amber-400" /> Profit Breakdown
          </h3>
          <div className="flex-1 min-h-0 relative flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={profitBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="amount"
                  stroke="none"
                >
                  {profitBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#141618", borderColor: "#24272C", borderRadius: "8px", fontSize: "10px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value: number) => formatPeso(Math.abs(value))}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Revenue</span>
              <span className="text-lg font-bold font-mono text-emerald-400">{formatPeso(profitSummary.revenue)}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {profitBreakdownData.filter(d => d.name !== 'Revenue').map(d => (
              <div key={d.name} className="bg-[#24272C]/30 p-2 rounded-lg flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest">{d.name}</span>
                </div>
                <span className="text-xs font-bold font-mono text-white">{formatPeso(Math.abs(d.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4, 5, 6: LOWER PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEAK ALERTS & CASH RISK */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition" />
            <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-6 flex items-center gap-2 relative">
              <Calendar className="w-4 h-4 text-amber-400" /> Upcoming Cash Risk
            </h3>
            
            <div className="space-y-5 relative">
              <div className="relative">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Expected Collections (7 Days)</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">{formatPeso(cashRisk.upcomingReceivables)}</div>
                </div>
                <div className="w-full bg-[#24272C] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (cashRisk.upcomingReceivables / Math.max(1, cashRisk.projectedCash)) * 100)}%` }} />
                </div>
              </div>
              
              <div className="relative">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Upcoming Payables (7 Days)</div>
                  <div className="text-sm font-bold font-mono text-rose-400">{formatPeso(cashRisk.upcomingPayables)}</div>
                </div>
                <div className="w-full bg-[#24272C] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (cashRisk.upcomingPayables / Math.max(1, cashRisk.projectedCash)) * 100)}%` }} />
                </div>
              </div>

              <div className="pt-5 border-t border-[#24272C] mt-2">
                <div className="flex justify-between items-center">
                  <div className="text-[11px] text-zinc-400 font-mono uppercase tracking-widest">Projected Balance</div>
                  <div className="text-xl font-bold font-mono text-white">{formatPeso(cashRisk.projectedCash)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg">
            <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Money Leak Alerts
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {leakAlerts.length > 0 ? leakAlerts.map((alert, i) => (
                <div key={i} className={`p-3 rounded-lg border text-[11px] font-mono leading-relaxed flex items-start gap-3 ${
                  alert.type === 'high' ? 'bg-rose-950/20 border-rose-900/50 text-rose-400' :
                  alert.type === 'warning' ? 'bg-amber-950/20 border-amber-900/50 text-amber-400' :
                  'bg-blue-950/20 border-blue-900/50 text-blue-400'
                }`}>
                  <div className={`mt-0.5 rounded-full p-1 ${alert.type === 'high' ? 'bg-rose-900/30' : alert.type === 'warning' ? 'bg-amber-900/30' : 'bg-blue-900/30'}`}>
                    {alert.type === 'high' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                  </div>
                  <div>{alert.message}</div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-[#24272C] rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-emerald-950/30 flex items-center justify-center mb-3">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
                    No active leaks detected
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COMPANY COMPARISON TABLE */}
        <div className="lg:col-span-2 bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg overflow-hidden flex flex-col">
          <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" /> Profit Comparison Matrix</div>
          </h3>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#24272C] text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                  <th className="pb-3 font-medium text-right">Expenses</th>
                  <th className="pb-3 font-medium text-right">Net Profit</th>
                  <th className="pb-3 font-medium text-right">Margin</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {companyComparisons.length > 0 ? companyComparisons.map((c, i) => (
                  <tr key={c.companyId} className={`border-b border-[#24272C]/50 hover:bg-[#24272C]/30 transition group ${i === companyComparisons.length -1 ? "border-0" : ""}`}>
                    <td className="py-4">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        {c.companyName}
                        <ChevronRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">{c.companyCode}</div>
                    </td>
                    <td className="py-4 text-right font-mono text-xs">{formatPeso(c.revenue)}</td>
                    <td className="py-4 text-right font-mono text-xs text-rose-400">{formatPeso(c.operatingExpenses + c.cogs + c.payroll)}</td>
                    <td className="py-4 text-right font-mono text-xs font-bold text-emerald-400">{formatPeso(c.netProfit)}</td>
                    <td className="py-4 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="font-mono text-xs">{c.profitMargin.toFixed(1)}%</span>
                        <div className="w-16 h-1 bg-[#24272C] rounded-full overflow-hidden flex justify-end">
                          <div 
                            className={`h-full rounded-full ${c.profitMargin >= 20 ? 'bg-emerald-500' : c.profitMargin >= 10 ? 'bg-amber-500' : c.profitMargin >= 0 ? 'bg-orange-500' : 'bg-rose-500'}`} 
                            style={{ width: `${Math.min(100, Math.max(0, c.profitMargin))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-widest ${
                        c.status === 'Healthy' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' : 
                        c.status === 'Watch' ? 'bg-amber-900/30 text-amber-400 border border-amber-900/50' : 
                        c.status === 'Low Profit' ? 'bg-orange-900/30 text-orange-400 border border-orange-900/50' :
                        'bg-rose-900/30 text-rose-400 border border-rose-900/50'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="inline-flex flex-col items-center justify-center text-zinc-500">
                        <Building2 className="w-8 h-8 mb-3 opacity-20" />
                        <span className="text-xs font-mono uppercase tracking-widest">No company data available for selected period</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
