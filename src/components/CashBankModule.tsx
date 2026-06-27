import React, { useState, useMemo, useEffect } from "react";
import { 
  Wallet, Landmark, Receipt, AlertCircle, FileText, CheckCircle2, 
  ArrowRight, Plus, Upload, Filter, User
} from "lucide-react";
import { 
  CashAccount, CashCustodian, CashCount, BankDeposit, CashLedgerEntry
} from "../types";
import {
  getCashAccounts, saveCashAccount, getCompanies, getCashCustodians,
  saveCashCustodian, getCashCounts, saveCashCount, getBankDeposits, saveBankDeposit,
  getCashLedgerEntries, saveCashLedgerEntry, getBankReconciliations
} from "../data/mockDatabase";
import { toast } from "sonner";
import CashAccounts from "./CashAccounts";
import CashLedger from "./CashLedger";
import CashCounts from "./CashCounts";
import BankDeposits from "./BankDeposits";

interface Props {
  userId: string;
  companyId: string;
}

export default function CashBankModule({ userId, companyId }: Props) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "accounts" | "custodians" | "ledger" | "counts" | "deposits">("dashboard");
  const [forceRender, setForceRender] = useState(0);

  useEffect(() => {
    setForceRender(prev => prev + 1);
  }, [companyId]);

  const allAccounts = getCashAccounts(companyId === "all" ? "" : companyId);
  const allCustodians = getCashCustodians(companyId === "all" ? "" : companyId);
  const allCounts = getCashCounts(companyId === "all" ? "" : companyId);
  const allDeposits = getBankDeposits(companyId === "all" ? "" : companyId);
  const allLedgers = getCashLedgerEntries(companyId === "all" ? "" : companyId);
  const allRecons = getBankReconciliations(companyId === "all" ? "" : companyId);

  // Stats computation
  const stats = useMemo(() => {
    let totalBank = 0;
    let totalGCash = 0;
    let totalCashOnHand = 0;
    
    allAccounts.forEach(a => {
      if (a.accountType === "Bank") totalBank += a.currentBalance;
      else if (a.accountType === "E-Wallet") totalGCash += a.currentBalance;
      else if (a.accountType === "Cash on Hand") totalCashOnHand += a.currentBalance;
    });

    let totalShort = 0;
    let totalOver = 0;
    allCounts.forEach(c => {
      if (c.difference < 0) totalShort += Math.abs(c.difference);
      else if (c.difference > 0) totalOver += c.difference;
    });

    const pendingCounts = allCounts.filter(c => c.status !== "Reconciled").length;
    const pendingDeposits = allDeposits.filter(d => d.status !== "Posted").length;
    const unreconciledBanks = allRecons.filter(r => r.status !== "reconciled").length;

    return {
      totalBank, totalGCash, totalCashOnHand, totalShort, totalOver,
      pendingCounts, pendingDeposits, unreconciledBanks
    };
  }, [allAccounts, allCounts, allDeposits, allRecons]);

  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-slate-900 font-display text-2xl tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-500" />
            Cash & Bank Reconciliation
          </h1>
          <p className="text-sm text-slate-600 font-mono mt-1">
            Manage company bank balances, e-wallets, and physical cash custodians.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "accounts", label: "Cash & Bank Accounts" },
          { id: "custodians", label: "Custodians" },
          { id: "ledger", label: "Cash Ledger" },
          { id: "counts", label: "Daily Cash Counts" },
          { id: "deposits", label: "Bank Deposits" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-slate-50 text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl">
                <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Total Cash on Hand</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{formatPeso(stats.totalCashOnHand)}</div>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl">
                <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Total Bank Balance</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{formatPeso(stats.totalBank)}</div>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl">
                <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Total E-Wallet</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{formatPeso(stats.totalGCash)}</div>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl">
                <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest flex justify-between">
                  <span>Cash Short / Over</span>
                </div>
                <div className="text-xl font-bold mt-2 flex gap-4">
                  <span className="text-rose-400">-{formatPeso(stats.totalShort)}</span>
                  <span className="text-emerald-400">+{formatPeso(stats.totalOver)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Pending Cash Counts</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">{stats.pendingCounts}</div>
                </div>
                <Receipt className="w-8 h-8 text-[#24272C]" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Pending Bank Deposits</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">{stats.pendingDeposits}</div>
                </div>
                <Upload className="w-8 h-8 text-[#24272C]" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Unreconciled Bank Accounts</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">{stats.unreconciledBanks}</div>
                </div>
                <AlertCircle className="w-8 h-8 text-[#24272C]" />
              </div>
            </div>

            {/* Cash by Custodian Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-white">
                <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-widest">Cash by Custodian</h3>
              </div>
              <table className="w-full text-left text-xs text-slate-600 font-mono">
                <thead className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="p-3">Custodian</th>
                    <th className="p-3">Account Name</th>
                    <th className="p-3 text-right">Current Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {allCustodians.map(c => {
                    const acc = allAccounts.find(a => a.id === c.assignedCashAccountId);
                    return (
                      <tr key={c.id} className="border-b border-slate-200">
                        <td className="p-3 text-slate-900 font-bold">{c.name} <span className="text-slate-500 font-normal">({c.role})</span></td>
                        <td className="p-3">{acc ? acc.accountName : "No account assigned"}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{acc ? formatPeso(acc.currentBalance) : formatPeso(0)}</td>
                      </tr>
                    );
                  })}
                  {allCustodians.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-500">No custodians found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Custodians Tab */}
        {activeTab === "custodians" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-widest">Cash Custodians</h3>
              <button 
                onClick={() => {
                  saveCashCustodian({
                    name: "New Custodian",
                    companyId: companyId === "all" ? getCompanies()[0].id : companyId,
                    role: "Cashier",
                    assignedCashAccountId: null,
                  });
                  setForceRender(prev => prev + 1);
                  toast.success("Custodian created. Edit feature coming soon.");
                }}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                <Plus className="w-3 h-3" /> New Custodian
              </button>
            </div>
            <table className="w-full text-left text-xs text-slate-600 font-mono">
              <thead className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-3">Custodian</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Assigned Account</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {allCustodians.map(c => {
                  const acc = allAccounts.find(a => a.id === c.assignedCashAccountId);
                  return (
                    <tr key={c.id} className="border-b border-slate-200">
                      <td className="p-3 text-slate-900 font-bold">{c.name}</td>
                      <td className="p-3">{c.role}</td>
                      <td className="p-3">{acc ? acc.accountName : "None"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[10px] ${c.isActive ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {allCustodians.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500">No custodians found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "accounts" && (
          <CashAccounts userId={userId} companyId={companyId} />
        )}
        
        {activeTab === "ledger" && (
          <CashLedger userId={userId} companyId={companyId} />
        )}

        {activeTab === "counts" && (
          <CashCounts userId={userId} companyId={companyId} />
        )}

        {activeTab === "deposits" && (
          <BankDeposits userId={userId} companyId={companyId} />
        )}

        {/* Placeholder for other tabs, will fill out incrementally or let user explore */}
        {activeTab !== "dashboard" && activeTab !== "custodians" && activeTab !== "accounts" && activeTab !== "ledger" && activeTab !== "counts" && activeTab !== "deposits" && (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
            <h2 className="text-xl font-bold text-slate-700">Under Construction</h2>
            <p className="text-slate-500 text-sm mt-2 font-mono">The {activeTab} section is coming shortly in the next build step.</p>
          </div>
        )}

      </div>
    </div>
  );
}
