import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, ArrowRightLeft, Building2, BookOpen, AlertTriangle, Clock, ShieldCheck, Coins, Banknote } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import CashAccounts from "./CashAccounts";
import FundTransfers from "./FundTransfers";
import CashLedger from "./CashLedger";
import { getCashAccounts, getFundTransfers, getCashLedgerEntries, useDBUpdate } from "../data/mockDatabase";

interface MoneyFlowProfitCenterProps {
  userId: string;
  companyId: string;
  isConsolidated: boolean;
}

export default function MoneyFlowProfitCenter({ userId, companyId, isConsolidated }: MoneyFlowProfitCenterProps) {
  useDBUpdate();
  const [activeTab, setActiveTab] = useState<"dashboard" | "accounts" | "transfers" | "ledger">("dashboard");
  const [forceRender, setForceRender] = useState(0);

  useEffect(() => {
    setForceRender(prev => prev + 1);
  }, [companyId]);

  const allAccounts = getCashAccounts(companyId === "all" ? "" : companyId);
  const allTransfers = getFundTransfers(companyId === "all" ? "" : companyId);
  const allLedgers = getCashLedgerEntries(companyId === "all" ? "" : companyId);

  const warnings = useMemo(() => {
    const issues: { id: string; message: string; type: "error" | "warning" }[] = [];

    // Negative Balance
    allAccounts.forEach(a => {
      if (a.currentBalance < 0) {
        issues.push({ id: `neg-bal-${a.id}`, message: `Negative Balance: ${a.accountName} has a balance of ${a.currentBalance}.`, type: "error" });
      }
    });

    // Transfer Issues
    const transferIds = new Set<string>();
    const duplicateIds = new Set<string>();

    allTransfers.forEach(t => {
      // Duplicate Transfer IDs
      if (transferIds.has(t.id)) duplicateIds.add(t.id);
      transferIds.add(t.id);

      // Missing Reference Number
      if (t.status === "Completed" && !t.transferReferenceNumber) {
        issues.push({ id: `no-ref-${t.id}`, message: `Missing Reference: Transfer ${t.id} is Completed but has no reference number.`, type: "warning" });
      }

      // Approved transfer has no approver
      if (t.status === "Approved" && !t.approvedBy) {
        issues.push({ id: `no-approver-${t.id}`, message: `Missing Approver: Transfer ${t.id} is Approved but has no approver recorded.`, type: "error" });
      }

      // From Account and To Account are the same
      if (t.fromAccountId === t.toAccountId) {
        issues.push({ id: `same-acc-${t.id}`, message: `Invalid Transfer: Transfer ${t.id} has the same source and destination account.`, type: "error" });
      }

      // Intercompany transfer has no purpose
      if (t.fromCompanyId !== t.toCompanyId && !t.purpose) {
        issues.push({ id: `no-purpose-${t.id}`, message: `Missing Purpose: Intercompany transfer ${t.id} has no purpose specified.`, type: "warning" });
      }
    });

    duplicateIds.forEach(id => {
      issues.push({ id: `dup-${id}`, message: `Duplicate Transfer ID: ${id} appears multiple times.`, type: "error" });
    });

    return issues;
  }, [allAccounts, allTransfers]);

  const stats = useMemo(() => {
    let totalCash = 0;
    let totalBank = 0;
    let totalEWallet = 0;

    allAccounts.forEach(a => {
      if (a.accountType === "Cash on Hand" || a.accountType === "Main Vault") totalCash += a.currentBalance;
      if (a.accountType === "Bank") totalBank += a.currentBalance;
      if (a.accountType === "E-Wallet") totalEWallet += a.currentBalance;
    });

    let pendingTransfers = 0;
    let approvedTransfers = 0;
    let completedTransfers = 0;

    allTransfers.forEach(t => {
      if (t.status === 'Pending') pendingTransfers += t.amount;
      else if (t.status === 'Approved') approvedTransfers += t.amount;
      else if (t.status === 'Completed') completedTransfers += t.amount;
    });

    return {
      totalCash, totalBank, totalEWallet,
      pendingTransfers, approvedTransfers, completedTransfers
    };
  }, [allAccounts, allTransfers]);

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  const chartData1 = useMemo(() => {
    if (stats.totalCash === 0) return Array.from({ length: 8 }, () => ({ value: 0 }));
    const data = Array.from({ length: 7 }, () => ({ value: Math.random() * (stats.totalCash * 0.5) + (stats.totalCash * 0.5) }));
    data.push({ value: stats.totalCash });
    return data;
  }, [stats.totalCash]);
  const chartData2 = useMemo(() => {
    if (stats.totalBank === 0) return Array.from({ length: 8 }, () => ({ value: 0 }));
    const data = Array.from({ length: 7 }, () => ({ value: Math.random() * (stats.totalBank * 0.5) + (stats.totalBank * 0.5) }));
    data.push({ value: stats.totalBank });
    return data;
  }, [stats.totalBank]);
  const chartData3 = useMemo(() => {
    if (stats.totalEWallet === 0) return Array.from({ length: 8 }, () => ({ value: 0 }));
    const data = Array.from({ length: 7 }, () => ({ value: Math.random() * (stats.totalEWallet * 0.5) + (stats.totalEWallet * 0.5) }));
    data.push({ value: stats.totalEWallet });
    return data;
  }, [stats.totalEWallet]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            Cash Flow & Fund Transfers
          </h2>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Manage inter-account transfers, intercompany funds, and liquidity.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200">
        {[
          { id: "dashboard", label: "Dashboard", icon: Wallet },
          { id: "accounts", label: "Accounts Master", icon: Building2 },
          { id: "transfers", label: "Transfer Requests", icon: ArrowRightLeft },
          { id: "ledger", label: "Transfer Ledger", icon: BookOpen }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest rounded-t-lg transition whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-slate-900 text-white border-b-4 border-emerald-500"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 relative overflow-hidden shadow-2xl mb-6 border border-slate-200">
              
              <div className="flex flex-col md:flex-row justify-between items-start mb-10 relative z-10 gap-4">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                Modern Liquidity<br/>Pro Dashboard
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
              {/* Left Panel - Consolidated Liquidity */}
              <div className="lg:col-span-5 bg-[#f0f2f5] border border-emerald-200/50 rounded-3xl p-6 shadow-sm">
                <div className="bg-slate-200/50 text-slate-800 font-bold px-6 py-4 rounded-2xl mb-8">
                  Consolidated Liquidity
                </div>
                <div className="px-2 space-y-8 flex-1 py-2 mb-8">
                  <div className="flex justify-between items-center group">
                    <div>
                      <div className="text-sm text-slate-500 mb-1 font-medium">Total Cash</div>
                      <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-wide truncate">{formatPeso(stats.totalCash)}</div>
                    </div>
                    <div className="w-24 h-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData1}>
                          <YAxis domain={[0, 'dataMax']} hide />
                          <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex justify-between items-center group">
                    <div>
                      <div className="text-sm text-slate-500 mb-1 font-medium">Total Bank</div>
                      <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-wide truncate">{formatPeso(stats.totalBank)}</div>
                    </div>
                    <div className="w-24 h-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData2}>
                          <YAxis domain={[0, 'dataMax']} hide />
                          <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex justify-between items-center group">
                    <div>
                      <div className="text-sm text-slate-500 mb-1 font-medium">Total E-Wallet</div>
                      <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-wide truncate">{formatPeso(stats.totalEWallet)}</div>
                    </div>
                    <div className="w-24 h-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData3}>
                          <YAxis domain={[0, 'dataMax']} hide />
                          <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-200/50 rounded-2xl p-6 mt-4">
                  <div className="text-sm text-slate-500 mb-2 font-medium">Total Position</div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-500 tracking-wide truncate">{formatPeso(stats.totalCash + stats.totalBank + stats.totalEWallet)}</div>
                </div>
              </div>

              {/* Right Panel - Transfer Summaries */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <h3 className="text-slate-800 font-semibold mb-6 text-lg tracking-wide">Transfer Summaries</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 h-32">
                  <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm text-center flex flex-col items-center justify-center relative overflow-hidden group hover:border-amber-300 transition-all">
                    <div className="absolute inset-0 bg-amber-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Clock className="w-10 h-10 text-amber-500 mb-2" strokeWidth={1.5} />
                    <div className="text-[10px] text-slate-500 mb-1 z-10 font-medium">Pending Approval</div>
                    <div className="text-sm sm:text-base font-bold text-amber-600 z-10 tracking-wide truncate text-center">{formatPeso(stats.pendingTransfers)}</div>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm text-center flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-300 transition-all">
                    <div className="absolute inset-0 bg-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <ShieldCheck className="w-10 h-10 text-blue-500 mb-2" strokeWidth={1.5} />
                    <div className="text-[10px] text-slate-500 mb-1 z-10 font-medium">Approved & Posted</div>
                    <div className="text-sm sm:text-base font-bold text-blue-600 z-10 tracking-wide truncate text-center">{formatPeso(stats.approvedTransfers)}</div>
                  </div>
                  <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm text-center flex flex-col items-center justify-center relative overflow-hidden group hover:border-emerald-300 transition-all">
                    <div className="absolute inset-0 bg-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Coins className="w-10 h-10 text-emerald-500 mb-2" strokeWidth={1.5} />
                    <div className="text-[10px] text-slate-500 mb-1 z-10 font-medium">Completed Transfers</div>
                    <div className="text-sm sm:text-base font-bold text-emerald-600 z-10 tracking-wide truncate text-center">{formatPeso(stats.completedTransfers)}</div>
                  </div>
                </div>
                <div className="bg-cyan-50/50 border border-cyan-200 rounded-xl p-6 shadow-sm flex items-center justify-center gap-6 relative overflow-hidden group hover:border-cyan-300 transition-all mt-4">
                  <div className="absolute inset-0 bg-cyan-100/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Banknote className="w-12 h-12 text-cyan-600 z-10" strokeWidth={1.5} />
                  <div className="z-10 flex flex-col items-center sm:items-start">
                    <div className="text-[11px] text-slate-500 mb-1 font-medium">Total Transfer Volume</div>
                    <div className="text-xl sm:text-2xl font-bold text-cyan-700 tracking-wide truncate">
                      {formatPeso(stats.pendingTransfers + stats.approvedTransfers + stats.completedTransfers)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
            {/* Warnings/Alerts */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-rose-50/50 border-b border-slate-200 p-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-rose-900 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Real-time Warnings & Alerts
                </h3>
                <span className="text-xs font-bold px-2 py-1 bg-white rounded-full text-slate-500 border border-slate-200 shadow-sm">{warnings.length} Active</span>
              </div>
              <div className="p-4">
                {warnings.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm font-mono">
                    <AlertTriangle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    All systems nominal. No active warnings or alerts.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {warnings.map((w) => (
                      <li key={w.id} className={`flex items-start gap-3 p-3 rounded-xl border ${w.type === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                        <AlertTriangle className={`w-5 h-5 shrink-0 ${w.type === 'error' ? 'text-rose-500' : 'text-amber-500'}`} />
                        <span className={`text-sm ${w.type === 'error' ? 'text-rose-900 font-bold' : 'text-amber-900 font-medium'}`}>
                          {w.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Balances Per Account Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 border-b border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Balances Per Account</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-white text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 font-mono">
                    <tr>
                      <th className="p-4">Account ID</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Account Name</th>
                      <th className="p-4 text-right">Current Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allAccounts.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-mono text-xs">{a.id}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            a.accountType === 'Bank' ? 'bg-blue-100 text-blue-700' :
                            a.accountType === 'E-Wallet' ? 'bg-purple-100 text-purple-700' :
                            a.accountType === 'Cash on Hand' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {a.accountType}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-900">{a.accountName} {a.bankName && `(${a.bankName})`}</td>
                        <td className="p-4 text-right font-bold text-slate-900 font-mono">{formatPeso(a.currentBalance)}</td>
                      </tr>
                    ))}
                    {allAccounts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 font-mono text-xs">No accounts found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "accounts" && (
          <CashAccounts userId={userId} companyId={companyId} />
        )}

        {activeTab === "transfers" && (
          <FundTransfers userId={userId} companyId={companyId} />
        )}

        {activeTab === "ledger" && (
          <CashLedger userId={userId} companyId={companyId} />
        )}
      </div>
    </div>
  );
}
