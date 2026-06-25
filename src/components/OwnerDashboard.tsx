import React, { useMemo, useState } from "react";
import { getTransactions, getPayables, getReceivables, getCompanies } from "../data/mockDatabase";
import { 
  TrendingUp, TrendingDown, PhilippinePeso, AlertTriangle, 
  CheckCircle2, Clock, Bot, ArrowRight, Activity, Percent, ArrowDownRight, ArrowUpRight 
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import AIAccountingAssistant from "./AIAccountingAssistant";

export default function OwnerDashboard({ userId, companyId, isConsolidated, onNavigate }: any) {
  const [showAI, setShowAI] = useState(false);
  const companies = getCompanies();
  const currentCompany = companies.find(c => c.id === companyId);

  const activeTxns = useMemo(() => {
    return isConsolidated 
      ? getTransactions(userId).filter(t => t.status === "approved")
      : getTransactions(userId, companyId).filter(t => t.status === "approved");
  }, [userId, companyId, isConsolidated]);

  const pendingTxns = useMemo(() => {
    return isConsolidated 
      ? getTransactions(userId).filter(t => t.status === "pending")
      : getTransactions(userId, companyId).filter(t => t.status === "pending");
  }, [userId, companyId, isConsolidated]);

  const payables = useMemo(() => {
    const targetCompanies = isConsolidated ? companies.map((c) => c.id) : [companyId];
    let allP: any[] = [];
    targetCompanies.forEach(cId => {
       allP = allP.concat(getPayables(userId, cId).map(p => ({ ...p, companyId: cId })));
    });
    return allP;
  }, [userId, companyId, isConsolidated, companies]);

  const receivables = useMemo(() => {
    const targetCompanies = isConsolidated ? companies.map((c) => c.id) : [companyId];
    let allR: any[] = [];
    targetCompanies.forEach(cId => {
       allR = allR.concat(getReceivables(userId, cId).map(r => ({ ...r, companyId: cId })));
    });
    return allR;
  }, [userId, companyId, isConsolidated, companies]);

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  // Date calculations
  const thirtyDaysAgoDate = new Date();
  thirtyDaysAgoDate.setDate(today.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgoDate.toISOString().split("T")[0];

  const sixtyDaysAgoDate = new Date();
  sixtyDaysAgoDate.setDate(today.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgoDate.toISOString().split("T")[0];

  const current30Txns = activeTxns.filter(t => t.txnDate >= thirtyDaysAgoStr && t.txnDate <= todayStr);
  const prev30Txns = activeTxns.filter(t => t.txnDate >= sixtyDaysAgoStr && t.txnDate < thirtyDaysAgoStr);

  // Key numbers - Current 30 days
  const cashIn = current30Txns.filter(t => t.type === "cash_in").reduce((s, t) => s + t.amount, 0);
  const cashOut = current30Txns.filter(t => t.type === "cash_out").reduce((s, t) => s + t.amount, 0);
  const netProfit = cashIn - cashOut;
  const profitMargin = cashIn > 0 ? (netProfit / cashIn) * 100 : 0;

  // Key numbers - Previous 30 days
  const prevCashIn = prev30Txns.filter(t => t.type === "cash_in").reduce((s, t) => s + t.amount, 0);
  const prevCashOut = prev30Txns.filter(t => t.type === "cash_out").reduce((s, t) => s + t.amount, 0);
  const prevNetProfit = prevCashIn - prevCashOut;
  const prevProfitMargin = prevCashIn > 0 ? (prevNetProfit / prevCashIn) * 100 : 0;

  const cashInChange = prevCashIn ? ((cashIn - prevCashIn) / prevCashIn) * 100 : 0;
  const cashOutChange = prevCashOut ? ((cashOut - prevCashOut) / prevCashOut) * 100 : 0;
  const netProfitChange = prevNetProfit ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : 0;
  const marginChange = profitMargin - prevProfitMargin;

  // Current Cash (All time)
  const totalCashIn = activeTxns.filter(t => t.type === "cash_in").reduce((s, t) => s + t.amount, 0);
  const totalCashOut = activeTxns.filter(t => t.type === "cash_out").reduce((s, t) => s + t.amount, 0);
  const currentCash = totalCashIn - totalCashOut;

  // Cash Runway
  const dailyAverageCashOut = cashOut > 0 ? cashOut / 30 : 1;
  const runwayDays = Math.round(currentCash / dailyAverageCashOut);
  const runwayStatus = runwayDays >= 30 ? "Healthy" : runwayDays >= 14 ? "Watch" : "Critical";

  // Action Summary Stats
  const cashStatus = currentCash > 500000 ? "Healthy" : currentCash > 100000 ? "Watch" : "Critical";
  const profitStatus = profitMargin > 15 ? "Profitable" : profitMargin > 0 ? "Low Margin" : "Losing";
  
  const overdueAR = receivables.filter(r => r.status === "uncollected" && r.dueDate < todayStr);
  const overdueARAmount = overdueAR.reduce((s, r) => s + r.amount, 0);
  
  const pendingApprovalsCount = pendingTxns.length;

  // Profit Waterfall Data
  const cogs = current30Txns.filter(t => t.type === "cash_out" && t.categoryId.includes("supplies")).reduce((s, t) => s + t.amount, 0);
  const payroll = current30Txns.filter(t => t.type === "cash_out" && t.categoryId.includes("payroll")).reduce((s, t) => s + t.amount, 0);
  const opex = cashOut - cogs - payroll;
  
  const waterfallData = [
    { name: "Revenue", amount: cashIn, fill: "#10B981" },
    { name: "COGS", amount: -cogs, fill: "#EF4444" },
    { name: "Payroll", amount: -payroll, fill: "#EF4444" },
    { name: "OpEx", amount: -opex, fill: "#EF4444" },
    { name: "Net Profit", amount: netProfit, fill: netProfit >= 0 ? "#10B981" : "#EF4444" }
  ];

  // Collection Priority (AR)
  const collectionPriority = [...overdueAR].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Payment Priority (AP)
  const unpaidAP = payables.filter(p => p.status === "unpaid");
  const paymentPriority = [...unpaidAP].sort((a, b) => {
    if (a.dueDate < todayStr && b.dueDate >= todayStr) return -1;
    if (b.dueDate < todayStr && a.dueDate >= todayStr) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }).slice(0, 5);

  // Pending Approval Impact
  const pendingCashIn = pendingTxns.filter(t => t.type === "cash_in").reduce((s, t) => s + t.amount, 0);
  const pendingCashOut = pendingTxns.filter(t => t.type === "cash_out").reduce((s, t) => s + t.amount, 0);
  const netPendingEffect = pendingCashIn - pendingCashOut;

  // Forecast
  const expectedCollections = receivables.filter(r => r.status === "uncollected" && r.dueDate >= todayStr).reduce((s, r) => s + r.amount, 0);
  const upcomingPayables = unpaidAP.filter(p => p.dueDate >= todayStr).reduce((s, p) => s + p.amount, 0);
  // Estimate future payroll
  const expectedPayroll = payroll > 0 ? payroll : 50000;
  const projectedMonthEndCash = currentCash + expectedCollections - upcomingPayables - expectedPayroll;

  // Company Ranking
  const companyRankings = companies.map(c => {
    const cTxns = getTransactions(userId, c.id).filter(t => t.status === "approved" && t.txnDate >= thirtyDaysAgoStr);
    const cIn = cTxns.filter(t => t.type === "cash_in").reduce((s, t) => s + t.amount, 0);
    const cOut = cTxns.filter(t => t.type === "cash_out").reduce((s, t) => s + t.amount, 0);
    const cProfit = cIn - cOut;
    const cMargin = cIn > 0 ? (cProfit / cIn) * 100 : 0;
    return { name: c.name, rev: cIn, exp: cOut, profit: cProfit, margin: cMargin };
  }).sort((a, b) => b.profit - a.profit);

  // Spending Spikes (Mock logic based on current/prev)
  const prevPayroll = prev30Txns.filter(t => t.type === "cash_out" && t.categoryId.includes("payroll")).reduce((s, t) => s + t.amount, 0);
  const payrollSpike = prevPayroll ? ((payroll - prevPayroll) / prevPayroll) * 100 : 0;
  
  const prevCogs = prev30Txns.filter(t => t.type === "cash_out" && t.categoryId.includes("supplies")).reduce((s, t) => s + t.amount, 0);
  const cogsSpike = prevCogs ? ((cogs - prevCogs) / prevCogs) * 100 : 0;

  return (
    <div className="w-full min-h-screen bg-[#0D0D0D] text-white space-y-6 animate-fadeIn pb-20">
      
      {/* 1. OWNER ACTION SUMMARY */}
      <div className="bg-[#181A1C] border border-[#24272C] rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold font-mono tracking-tight uppercase mb-4 text-[#00B67A] flex items-center gap-2">
          <Activity className="w-5 h-5" /> Owner Action Summary
        </h2>
        <div className="mb-6 space-y-2">
          <p className="text-sm text-zinc-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cash is <strong className="text-white">{cashStatus.toLowerCase()}</strong> for the next {runwayDays} days.
          </p>
          <p className="text-sm text-zinc-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Profit margin is <strong className="text-white">{profitStatus.toLowerCase()}</strong> ({profitMargin.toFixed(1)}%).
          </p>
          <p className="text-sm text-zinc-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Collect <strong className="text-white">{formatPeso(overdueARAmount)}</strong> from {overdueAR.length} overdue receivables.
          </p>
          <p className="text-sm text-zinc-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Approve <strong className="text-white">{pendingApprovalsCount}</strong> pending transactions before closing today.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-[#24272C] rounded-xl bg-[#141618]">
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-1">Cash Status</div>
            <div className={`text-xl font-bold font-mono ${cashStatus === 'Healthy' ? 'text-emerald-400' : cashStatus === 'Watch' ? 'text-amber-400' : 'text-red-400'}`}>{cashStatus}</div>
          </div>
          <div className="p-4 border border-[#24272C] rounded-xl bg-[#141618]">
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-1">Profit Status</div>
            <div className={`text-xl font-bold font-mono ${profitStatus === 'Profitable' ? 'text-emerald-400' : profitStatus === 'Low Margin' ? 'text-amber-400' : 'text-red-400'}`}>{profitStatus}</div>
          </div>
          <div className="p-4 border border-[#24272C] rounded-xl bg-[#141618]">
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-1">Collection Priority</div>
            <div className="text-xl font-bold font-mono text-amber-400">{formatPeso(overdueARAmount)} <span className="text-xs font-normal text-zinc-500">overdue</span></div>
          </div>
          <div className="p-4 border border-[#24272C] rounded-xl bg-[#141618]">
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-1">Approval Priority</div>
            <div className="text-xl font-bold font-mono text-purple-400">{pendingApprovalsCount} <span className="text-xs font-normal text-zinc-500">pending</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 2. "WHAT CHANGED?" COMPARISON (Key Numbers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#181A1C] border border-[#24272C] p-4 rounded-xl">
              <div className="text-xs text-zinc-500 uppercase font-mono tracking-widest mb-2">Cash In (30d)</div>
              <div className="text-xl font-bold font-mono">{formatPeso(cashIn)}</div>
              <div className={`text-[10px] mt-2 flex items-center font-mono ${cashInChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {cashInChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {Math.abs(cashInChange).toFixed(1)}% vs previous 30 days
              </div>
            </div>
            
            <div className="bg-[#181A1C] border border-[#24272C] p-4 rounded-xl">
              <div className="text-xs text-zinc-500 uppercase font-mono tracking-widest mb-2">Cash Out (30d)</div>
              <div className="text-xl font-bold font-mono">{formatPeso(cashOut)}</div>
              <div className={`text-[10px] mt-2 flex items-center font-mono ${cashOutChange <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {cashOutChange <= 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                {Math.abs(cashOutChange).toFixed(1)}% vs previous 30 days
              </div>
            </div>

            <div className="bg-[#181A1C] border border-[#24272C] p-4 rounded-xl">
              <div className="text-xs text-zinc-500 uppercase font-mono tracking-widest mb-2">Net Profit (30d)</div>
              <div className="text-xl font-bold font-mono">{formatPeso(netProfit)}</div>
              <div className={`text-[10px] mt-2 flex items-center font-mono ${netProfitChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netProfitChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {Math.abs(netProfitChange).toFixed(1)}% vs previous 30 days
              </div>
            </div>

            <div className="bg-[#181A1C] border border-[#24272C] p-4 rounded-xl">
              <div className="text-xs text-zinc-500 uppercase font-mono tracking-widest mb-2">Profit Margin (30d)</div>
              <div className="text-xl font-bold font-mono">{profitMargin.toFixed(1)}%</div>
              <div className={`text-[10px] mt-2 flex items-center font-mono ${marginChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {marginChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {Math.abs(marginChange).toFixed(1)} pts vs previous 30 days
              </div>
            </div>
          </div>

          {/* 5. PROFIT WATERFALL */}
          <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-xl">
            <h3 className="text-sm font-bold font-mono tracking-widest uppercase mb-4 text-zinc-400">Profit Waterfall (Last 30 Days)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#24272C" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525B" fontSize={10} fontFamily="JetBrains Mono" tickMargin={10} />
                  <YAxis stroke="#52525B" fontSize={10} fontFamily="JetBrains Mono" tickFormatter={(value) => `₱${(value / 1000)}k`} />
                  <Tooltip 
                    cursor={{fill: '#24272C', opacity: 0.4}}
                    contentStyle={{ backgroundColor: '#141618', borderColor: '#24272C', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                    formatter={(value: number) => formatPeso(value)}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 7 & 8. ACTION PANELS: COLLECTION & PAYMENT PRIORITY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-xl">
              <h3 className="text-sm font-bold font-mono tracking-widest uppercase mb-4 text-amber-400 flex items-center gap-2">
                Collect First
              </h3>
              <div className="space-y-3">
                {collectionPriority.length === 0 ? (
                  <div className="text-xs text-zinc-500 font-mono py-4 text-center">No overdue collections</div>
                ) : collectionPriority.map(ar => (
                  <div key={ar.id} className="flex justify-between items-center p-3 border border-[#24272C] rounded-lg bg-[#141618]">
                    <div>
                      <div className="text-sm font-bold">{ar.customerName || ar.payeeId}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1">Due: {ar.dueDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-amber-400">{formatPeso(ar.amount)}</div>
                      <button onClick={() => onNavigate('payables_receivables')} className="text-[10px] text-[#00B67A] hover:underline uppercase font-mono mt-1">Follow up</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-xl">
              <h3 className="text-sm font-bold font-mono tracking-widest uppercase mb-4 text-red-400 flex items-center gap-2">
                Pay First
              </h3>
              <div className="space-y-3">
                {paymentPriority.length === 0 ? (
                  <div className="text-xs text-zinc-500 font-mono py-4 text-center">No urgent payables</div>
                ) : paymentPriority.map(ap => {
                  const isCritical = ap.dueDate <= todayStr;
                  return (
                    <div key={ap.id} className="flex justify-between items-center p-3 border border-[#24272C] rounded-lg bg-[#141618]">
                      <div>
                        <div className="text-sm font-bold">{ap.supplierName || ap.payeeId}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-[10px] text-zinc-500 font-mono">Due: {ap.dueDate}</div>
                          {isCritical && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold">Critical</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono">{formatPeso(ap.amount)}</div>
                        <button onClick={() => onNavigate('payables_receivables')} className="text-[10px] text-[#00B67A] hover:underline uppercase font-mono mt-1">Pay</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 6. COMPANY RANKING */}
          {isConsolidated && (
            <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-xl">
              <h3 className="text-sm font-bold font-mono tracking-widest uppercase mb-4 text-zinc-400">Company Ranking (Last 30 Days)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#24272C]">
                      <th className="p-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">Rank</th>
                      <th className="p-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">Company</th>
                      <th className="p-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">Revenue</th>
                      <th className="p-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">Expenses</th>
                      <th className="p-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">Profit</th>
                      <th className="p-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">Margin</th>
                      <th className="p-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyRankings.map((c, idx) => (
                      <tr key={c.name} className="border-b border-[#24272C]/50">
                        <td className="p-3 text-xs font-mono">{idx + 1}</td>
                        <td className="p-3 text-xs font-bold">{c.name}</td>
                        <td className="p-3 text-xs font-mono">{formatPeso(c.rev)}</td>
                        <td className="p-3 text-xs font-mono">{formatPeso(c.exp)}</td>
                        <td className="p-3 text-xs font-mono text-emerald-400">{formatPeso(c.profit)}</td>
                        <td className="p-3 text-xs font-mono">{c.margin.toFixed(1)}%</td>
                        <td className="p-3 text-xs font-mono">
                          {c.profit > 50000 ? (
                            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Healthy</span>
                          ) : c.profit > 0 ? (
                            <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Watch</span>
                          ) : (
                            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded">Loss</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* 3. OWNER TO-DO LIST */}
          <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-xl">
            <h3 className="text-sm font-bold font-mono tracking-widest uppercase mb-4 text-[#00B67A]">Today's Owner To-Do</h3>
            <div className="space-y-3">
              {pendingApprovalsCount > 0 && (
                <div className="flex items-start justify-between p-3 border border-[#24272C] bg-[#141618] rounded-lg">
                  <div className="text-xs">Approve {pendingApprovalsCount} pending transactions</div>
                  <button onClick={() => onNavigate('approvals')} className="shrink-0 ml-3 text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded font-mono uppercase">Review</button>
                </div>
              )}
              {collectionPriority.length > 0 && (
                <div className="flex items-start justify-between p-3 border border-[#24272C] bg-[#141618] rounded-lg">
                  <div className="text-xs">Follow up {formatPeso(collectionPriority[0].amount)} receivable from {collectionPriority[0].customerName || collectionPriority[0].payeeId}</div>
                  <button onClick={() => onNavigate('payables_receivables')} className="shrink-0 ml-3 text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded font-mono uppercase">Follow Up</button>
                </div>
              )}
              <div className="flex items-start justify-between p-3 border border-[#24272C] bg-[#141618] rounded-lg">
                <div className="text-xs">Review expenses - Net profit changed {netProfitChange > 0 ? '+' : ''}{netProfitChange.toFixed(1)}%</div>
                <button onClick={() => onNavigate('ledger')} className="shrink-0 ml-3 text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded font-mono uppercase">Details</button>
              </div>
            </div>
          </div>

          {/* 4. CASH RUNWAY */}
          <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-xl">
            <h3 className="text-sm font-bold font-mono tracking-widest uppercase mb-2 text-zinc-400">Cash Runway</h3>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-4xl font-black font-mono tracking-tight">{runwayDays}</span>
              <span className="text-sm text-zinc-500 font-mono uppercase pb-1">Days</span>
            </div>
            <p className="text-xs text-zinc-400">
              At the current spending pace, available cash can cover about {runwayDays} days.
            </p>
            <div className="mt-4 pt-4 border-t border-[#24272C] flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-zinc-500">Status</span>
              <span className={`text-xs font-bold font-mono uppercase px-2 py-1 rounded ${runwayStatus === 'Healthy' ? 'bg-emerald-500/20 text-emerald-400' : runwayStatus === 'Watch' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                {runwayStatus}
              </span>
            </div>
          </div>

          {/* 10. PENDING APPROVAL IMPACT */}
          <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-xl">
            <h3 className="text-sm font-bold font-mono tracking-widest uppercase mb-4 text-purple-400">Pending Approval Impact</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Pending Cash Out</span>
                <span className="text-sm font-mono text-red-400">-{formatPeso(pendingCashOut)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Pending Cash In</span>
                <span className="text-sm font-mono text-emerald-400">+{formatPeso(pendingCashIn)}</span>
              </div>
              <div className="pt-3 border-t border-[#24272C] flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-300">Net Effect if Approved</span>
                <span className={`text-sm font-bold font-mono ${netPendingEffect >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netPendingEffect >= 0 ? '+' : ''}{formatPeso(netPendingEffect)}
                </span>
              </div>
            </div>
          </div>

          {/* 11. END OF MONTH FORECAST */}
          <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-xl">
            <h3 className="text-sm font-bold font-mono tracking-widest uppercase mb-4 text-blue-400">End-of-Month Forecast</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Current Cash</span>
                <span className="text-sm font-mono">{formatPeso(currentCash)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Expected Collections</span>
                <span className="text-sm font-mono text-emerald-400">+{formatPeso(expectedCollections)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Upcoming Payables</span>
                <span className="text-sm font-mono text-red-400">-{formatPeso(upcomingPayables)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">Expected Payroll</span>
                <span className="text-sm font-mono text-red-400">-{formatPeso(expectedPayroll)}</span>
              </div>
              <div className="pt-3 border-t border-[#24272C] flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-300">Projected Ending Cash</span>
                <span className="text-sm font-bold font-mono text-white">{formatPeso(projectedMonthEndCash)}</span>
              </div>
            </div>
          </div>

          {/* 12. "ASK AI" QUICK BUTTONS & ASSISTANT PANEL */}
          <div className="bg-[#181A1C] border border-[#24272C] p-5 rounded-xl">
            <h3 className="text-sm font-bold font-mono tracking-widest uppercase mb-4 text-indigo-400 flex items-center gap-2">
              <Bot className="w-4 h-4" /> Ask AI
            </h3>
            
            <div className="space-y-2 mb-4">
              <button onClick={() => setShowAI(true)} className="w-full text-left px-3 py-2 bg-[#141618] hover:bg-[#24272C] border border-[#24272C] rounded-lg text-xs font-mono text-zinc-300 transition-colors">
                Why is profit down?
              </button>
              <button onClick={() => setShowAI(true)} className="w-full text-left px-3 py-2 bg-[#141618] hover:bg-[#24272C] border border-[#24272C] rounded-lg text-xs font-mono text-zinc-300 transition-colors">
                Where is money leaking?
              </button>
              <button onClick={() => setShowAI(true)} className="w-full text-left px-3 py-2 bg-[#141618] hover:bg-[#24272C] border border-[#24272C] rounded-lg text-xs font-mono text-zinc-300 transition-colors">
                What should I collect first?
              </button>
              <button onClick={() => setShowAI(true)} className="w-full text-left px-3 py-2 bg-[#141618] hover:bg-[#24272C] border border-[#24272C] rounded-lg text-xs font-mono text-zinc-300 transition-colors">
                Summarize today for owner.
              </button>
            </div>

            {showAI && (
              <div className="mt-4 border-t border-[#24272C] pt-4 animate-fadeIn">
                 <AIAccountingAssistant userId={userId} companyId={companyId} />
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
