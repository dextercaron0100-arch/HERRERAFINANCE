import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
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
  Loader2
} from "lucide-react";

import { 
  getTransactions, 
  getCompanies, 
  getPayables, 
  getReceivables, 
  getCashAccounts,
  getBudgetVsActual,
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
  const { transactions, payables, receivables, cashAccounts, budgets } = useMemo(() => {
    let txns: any[] = [];
    let pays: any[] = [];
    let recs: any[] = [];
    let cash: any[] = [];
    let bdgs: any[] = [];

    targetCompanyIds.forEach(cId => {
      txns = [...txns, ...getTransactions(userId, cId)];
      pays = [...pays, ...getPayables(userId, cId)];
      recs = [...recs, ...getReceivables(userId, cId)];
      cash = [...cash, ...getCashAccounts(cId)];
      bdgs = [...bdgs, ...getBudgetVsActual(cId, "2026-06-01")]; // Currently mock using current month
    });

    return { transactions: txns, payables: pays, receivables: recs, cashAccounts: cash, budgets: bdgs };
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
  const profitSummary = useMemo(() => getProfitSummary(filteredTransactions), [filteredTransactions]);
  const cashRisk = useMemo(() => getUpcomingCashRisk(payables, receivables, cashAccounts), [payables, receivables, cashAccounts]);
  const leakAlerts = useMemo(() => getMoneyLeakAlerts(filteredTransactions, payables, receivables, budgets), [filteredTransactions, payables, receivables, budgets]);
  
  const chartData = useMemo(() => getCashFlowTimeline(transactions, parseInt(dateRange) || 30), [transactions, dateRange]);
  const companyComparisons = useMemo(() => getCompanyProfitComparison(targetCompanies, filteredTransactions), [targetCompanies, filteredTransactions]);

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg flex flex-col h-96">
          <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-6 flex justify-between items-center">
            <span>Money Flow Trend</span>
            <span className="text-[10px] text-zinc-500">LAST {dateRange === "ytd" ? "365" : dateRange} DAYS</span>
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNetCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip
                  contentStyle={{ backgroundColor: "#141618", borderColor: "#24272C", borderRadius: "8px", fontSize: "10px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value: number) => formatPeso(value)}
                  labelStyle={{ color: "#888", marginBottom: "4px" }}
                />
                <Area type="monotone" dataKey="netCash" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorNetCash)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg flex flex-col h-96">
          <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-6">
            Profit Breakdown
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={40}>
                <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: "#141618", borderColor: "#24272C", borderRadius: "8px", fontSize: "10px", fontFamily: "monospace" }}
                  formatter={(value: number) => formatPeso(value)}
                />
                <Bar dataKey="amount" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 4, 5, 6: LOWER PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEAK ALERTS & CASH RISK */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg">
            <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Upcoming Cash Risk
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1">Expected Collections (7 Days)</div>
                <div className="text-lg font-bold font-mono text-emerald-400">{formatPeso(cashRisk.upcomingReceivables)}</div>
              </div>
              
              <div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1">Upcoming Payables (7 Days)</div>
                <div className="text-lg font-bold font-mono text-rose-400">{formatPeso(cashRisk.upcomingPayables)}</div>
              </div>

              <div className="pt-4 border-t border-[#24272C]">
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1">Projected Cash Balance</div>
                <div className="text-lg font-bold font-mono text-white">{formatPeso(cashRisk.projectedCash)}</div>
              </div>
            </div>
          </div>

          <div className="bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg">
            <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Money Leak Alerts
            </h3>
            <div className="space-y-3">
              {leakAlerts.length > 0 ? leakAlerts.map((alert, i) => (
                <div key={i} className={`p-3 rounded-lg border text-[11px] font-mono leading-relaxed ${
                  alert.type === 'high' ? 'bg-rose-950/20 border-rose-900/50 text-rose-400' :
                  alert.type === 'warning' ? 'bg-amber-950/20 border-amber-900/50 text-amber-400' :
                  'bg-blue-950/20 border-blue-900/50 text-blue-400'
                }`}>
                  <div className="flex items-start gap-2">
                    {alert.type === 'high' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    {alert.message}
                  </div>
                </div>
              )) : (
                <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest text-center py-4">
                  No active leaks detected
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COMPANY COMPARISON TABLE */}
        <div className="lg:col-span-2 bg-[#181A1C] border border-[#24272C] rounded-xl p-5 shadow-lg overflow-hidden flex flex-col">
          <h3 className="text-white text-sm font-mono uppercase tracking-widest mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" /> Profit Comparison Matrix</div>
          </h3>
          
          <div className="overflow-x-auto">
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
                  <tr key={c.companyId} className={`border-b border-[#24272C]/50 hover:bg-[#24272C]/30 transition ${i === companyComparisons.length -1 ? "border-0" : ""}`}>
                    <td className="py-4">
                      <div className="font-bold text-white text-sm">{c.companyName}</div>
                      <div className="text-[10px] text-zinc-500 font-mono uppercase">{c.companyCode}</div>
                    </td>
                    <td className="py-4 text-right font-mono text-xs">{formatPeso(c.revenue)}</td>
                    <td className="py-4 text-right font-mono text-xs text-rose-400">{formatPeso(c.operatingExpenses + c.cogs + c.payroll)}</td>
                    <td className="py-4 text-right font-mono text-xs font-bold text-emerald-400">{formatPeso(c.netProfit)}</td>
                    <td className="py-4 text-right font-mono text-xs">{c.profitMargin.toFixed(1)}%</td>
                    <td className="py-4 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest ${
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
                    <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs font-mono uppercase tracking-widest">
                      No company data available for selected period
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
