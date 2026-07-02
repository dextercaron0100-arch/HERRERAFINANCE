import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, ArrowRightLeft, Building2, BookOpen, AlertTriangle } from "lucide-react";
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Liquidity Balances */}
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl col-span-1 md:col-span-3 lg:col-span-1 shadow-xs">
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Consolidated Liquidity
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-100">
                    <span className="text-sm font-bold text-slate-600">Total Cash</span>
                    <span className="text-lg font-bold text-slate-900">{formatPeso(stats.totalCash)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-100">
                    <span className="text-sm font-bold text-slate-600">Total Bank</span>
                    <span className="text-lg font-bold text-slate-900">{formatPeso(stats.totalBank)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-100">
                    <span className="text-sm font-bold text-slate-600">Total E-Wallet</span>
                    <span className="text-lg font-bold text-slate-900">{formatPeso(stats.totalEWallet)}</span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-emerald-800 uppercase tracking-widest">Total Position</span>
                    <span className="text-xl font-bold text-emerald-700">{formatPeso(stats.totalCash + stats.totalBank + stats.totalEWallet)}</span>
                  </div>
                </div>
              </div>

              {/* Transfer Summaries */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl col-span-1 md:col-span-3 lg:col-span-2 shadow-xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-sky-500" /> Transfer Summaries
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-[calc(100%-2rem)]">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Pending Approval</span>
                    <span className="text-2xl font-bold text-amber-600">{formatPeso(stats.pendingTransfers)}</span>
                  </div>
                  <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-xs font-bold text-sky-700 uppercase tracking-widest mb-1">Approved & Posted</span>
                    <span className="text-2xl font-bold text-sky-600">{formatPeso(stats.approvedTransfers)}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col justify-center">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Completed Transfers</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatPeso(stats.completedTransfers)}</span>
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
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
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
