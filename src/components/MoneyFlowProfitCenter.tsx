import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BookOpen,
  Building2,
  Landmark,
  Smartphone,
  TrendingUp,
  Wallet,
  WalletCards
} from "lucide-react";
import CashAccounts from "./CashAccounts";
import FundTransfers from "./FundTransfers";
import CashLedger from "./CashLedger";
import { getCashAccounts, getFundTransfers, useDBUpdate } from "../data/mockDatabase";

interface MoneyFlowProfitCenterProps {
  userId: string;
  companyId: string;
  isConsolidated: boolean;
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP"
});

const formatPeso = (num: number) => pesoFormatter.format(num);

function AnimatedPeso({ value, className }: { value: number; className?: string }) {
  const amountRef = useRef<HTMLSpanElement>(null);
  const previousValue = useRef(0);
  const shouldReduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (!amountRef.current) return;

    if (shouldReduceMotion) {
      amountRef.current.textContent = formatPeso(value);
      previousValue.current = value;
      return;
    }

    const controls = animate(previousValue.current, value, {
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: latest => {
        if (amountRef.current) amountRef.current.textContent = formatPeso(latest);
      }
    });

    previousValue.current = value;
    return () => controls.stop();
  }, [shouldReduceMotion, value]);

  return (
    <span ref={amountRef} className={className}>
      {formatPeso(value)}
    </span>
  );
}

export default function MoneyFlowProfitCenter({ userId, companyId, isConsolidated }: MoneyFlowProfitCenterProps) {
  useDBUpdate();
  const [activeTab, setActiveTab] = useState<"dashboard" | "accounts" | "transfers" | "ledger">("dashboard");
  const shouldReduceMotion = useReducedMotion();
  const scopeCompanyId = isConsolidated || companyId === "all" ? "all" : companyId;

  const allAccounts = getCashAccounts(scopeCompanyId);
  const allTransfers = getFundTransfers(scopeCompanyId);

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
      if (t.status.toLowerCase() === "completed" && !t.transferReferenceNumber) {
        issues.push({ id: `no-ref-${t.id}`, message: `Missing Reference: Transfer ${t.id} is Completed but has no reference number.`, type: "warning" });
      }

      // Approved transfer has no approver
      if (t.status.toLowerCase() === "approved" && !t.approvedBy) {
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
      const status = t.status.toLowerCase();
      if (status === 'pending') pendingTransfers += t.amount;
      else if (status === 'approved') approvedTransfers += t.amount;
      else if (status === 'completed') completedTransfers += t.amount;
    });

    return {
      totalCash, totalBank, totalEWallet,
      pendingTransfers, approvedTransfers, completedTransfers
    };
  }, [allAccounts, allTransfers]);

  const totalPosition = stats.totalCash + stats.totalBank + stats.totalEWallet;
  const totalTransferVolume =
    stats.pendingTransfers + stats.approvedTransfers + stats.completedTransfers;
  const liquidityShare = (value: number) =>
    totalPosition > 0 ? Math.min(100, Math.max(0, (value / totalPosition) * 100)) : 0;
  const transferShare = (value: number) =>
    totalTransferVolume > 0
      ? Math.min(100, Math.max(0, (value / totalTransferVolume) * 100))
      : 0;

  const liquidityMetrics = [
    {
      label: "Total Cash",
      value: stats.totalCash,
      icon: WalletCards,
      barClass: "bg-blue-500"
    },
    {
      label: "Total Bank",
      value: stats.totalBank,
      icon: Landmark,
      barClass: "bg-red-500"
    },
    {
      label: "Total E-Wallet",
      value: stats.totalEWallet,
      icon: Smartphone,
      barClass: "bg-emerald-500"
    }
  ];

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
            <motion.section
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-7">
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.08, rotate: -4 }}
                  className="flex h-8 w-8 items-center justify-center border border-slate-200 bg-slate-50 text-slate-600"
                >
                  <Activity className="h-4 w-4" aria-hidden="true" />
                </motion.div>
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.16, duration: 0.4 }}
                >
                  <h2 className="text-base font-bold tracking-tight text-slate-950">
                    Liquidity
                  </h2>
                  <p className="text-xs font-semibold text-slate-600">Pro</p>
                </motion.div>
              </div>

              <div className="space-y-6 p-5 sm:p-7">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  {liquidityMetrics.map((metric, index) => {
                    const MetricIcon = metric.icon;
                    const share = liquidityShare(metric.value);

                    return (
                      <motion.article
                        key={metric.label}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.12 + index * 0.08,
                          duration: 0.46,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        whileHover={
                          shouldReduceMotion
                            ? undefined
                            : {
                                y: -4,
                                boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)"
                              }
                        }
                        className="group flex min-h-48 flex-col justify-between border border-slate-200 bg-white p-7 transition-colors duration-300 hover:border-slate-300"
                      >
                        <div>
                          <motion.div
                            whileHover={shouldReduceMotion ? undefined : { scale: 1.08, rotate: -3 }}
                            transition={{ type: "spring", stiffness: 400, damping: 22 }}
                            className="mb-4 flex h-10 w-10 items-center justify-center border border-slate-200 bg-slate-50 text-slate-600 transition-colors duration-300 group-hover:bg-slate-100"
                          >
                            <MetricIcon className="h-5 w-5" aria-hidden="true" />
                          </motion.div>
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                            {metric.label}
                          </p>
                          <AnimatedPeso
                            value={metric.value}
                            className="mt-2 block break-words font-mono text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
                          />
                        </div>
                        <div className="mt-7 h-1.5 w-full bg-slate-100" aria-hidden="true">
                          <motion.div
                            className={`h-full ${metric.barClass}`}
                            initial={shouldReduceMotion ? false : { width: 0 }}
                            animate={{ width: `${share}%` }}
                            transition={{
                              delay: 0.3 + index * 0.08,
                              duration: 0.8,
                              ease: [0.16, 1, 0.3, 1]
                            }}
                          />
                        </div>
                      </motion.article>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  <motion.article
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.34, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : { y: -3, boxShadow: "0 12px 28px rgba(15, 23, 42, 0.07)" }
                    }
                    className="border border-slate-200 bg-white p-7 transition-colors duration-300 hover:border-slate-300 lg:col-span-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Total Position
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-4">
                      <AnimatedPeso
                        value={totalPosition}
                        className="break-words font-mono text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl"
                      />
                      <motion.span
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.35 }}
                        className="inline-flex items-center gap-1.5 border border-slate-900 px-3 py-2 text-xs font-bold text-slate-800"
                      >
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                        <motion.span
                          animate={
                            shouldReduceMotion
                              ? undefined
                              : { opacity: [0.45, 1, 0.45], scale: [0.85, 1, 0.85] }
                          }
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                          aria-hidden="true"
                        />
                        Live
                      </motion.span>
                    </div>

                    <div className="mt-16 border-t border-slate-200 pt-8">
                      <div className="mb-4 flex flex-col justify-between gap-3 text-xs text-slate-500 sm:flex-row sm:items-center">
                        <span>Liquidity Breakdown</span>
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          {liquidityMetrics.map(metric => (
                            <span key={metric.label} className="inline-flex items-center gap-2">
                              <span className={`h-2 w-2 ${metric.barClass}`} aria-hidden="true" />
                              {metric.label.replace("Total ", "")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div
                        className="flex h-3 w-full overflow-hidden bg-slate-100"
                        aria-label="Liquidity breakdown"
                      >
                        {liquidityMetrics.map(metric => (
                          <motion.div
                            key={metric.label}
                            className={metric.barClass}
                            initial={shouldReduceMotion ? false : { width: 0 }}
                            animate={{ width: `${liquidityShare(metric.value)}%` }}
                            transition={{
                              delay: 0.52,
                              duration: 0.9,
                              ease: [0.16, 1, 0.3, 1]
                            }}
                            title={`${metric.label}: ${formatPeso(metric.value)}`}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.article>

                  <motion.article
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : { y: -3, boxShadow: "0 12px 28px rgba(15, 23, 42, 0.07)" }
                    }
                    className="border border-slate-200 bg-white p-7 transition-colors duration-300 hover:border-slate-300"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Total Transfer Volume
                    </p>
                    <AnimatedPeso
                      value={totalTransferVolume}
                      className="mt-6 block break-words font-mono text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                    />

                    <div className="mt-8 space-y-7">
                      {[
                        { label: "Pending", value: stats.pendingTransfers },
                        { label: "Approved", value: stats.approvedTransfers },
                        { label: "Completed", value: stats.completedTransfers }
                      ].map((transfer, index) => (
                        <motion.div
                          key={transfer.label}
                          initial={shouldReduceMotion ? false : { opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.54 + index * 0.08, duration: 0.4 }}
                        >
                          <div className="mb-3 flex items-center justify-between gap-4 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 bg-slate-300" aria-hidden="true" />
                              {transfer.label}
                            </span>
                            <AnimatedPeso
                              value={transfer.value}
                              className="font-mono font-semibold text-slate-900"
                            />
                          </div>
                          <div className="h-1 w-full bg-slate-100">
                            <motion.div
                              className="h-full bg-slate-300"
                              initial={shouldReduceMotion ? false : { width: 0 }}
                              animate={{ width: `${transferShare(transfer.value)}%` }}
                              transition={{
                                delay: 0.62 + index * 0.08,
                                duration: 0.75,
                                ease: [0.16, 1, 0.3, 1]
                              }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.article>
                </div>
              </div>
            </motion.section>
          
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
          <CashAccounts userId={userId} companyId={scopeCompanyId} />
        )}

        {activeTab === "transfers" && (
          <FundTransfers userId={userId} companyId={scopeCompanyId} />
        )}

        {activeTab === "ledger" && (
          <CashLedger userId={userId} companyId={scopeCompanyId} />
        )}
      </div>
    </div>
  );
}
