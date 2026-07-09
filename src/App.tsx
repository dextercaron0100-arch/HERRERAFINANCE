/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  Users,
  TrendingUp,
  Coins,
  ShieldCheck,
  FileText,
  FileSignature,
  CheckSquare,
  PiggyBank,
  FolderMinus,
  Settings,
  ChevronDown,
  Calendar,
  LogOut,
  Menu,
  X,
  CreditCard,
  User,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Search,
  CheckCircle2,
  CloudLightning,
  AlertTriangle,
  Plus,
  Percent,
  Sun,
  Moon,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

import OwnerDashboard from "./components/OwnerDashboard";
import Dashboard from "./components/Dashboard";
import AccountingOfficerWorkbench from "./components/AccountingOfficerWorkbench";
import MoneyFlowProfitCenter from "./components/MoneyFlowProfitCenter";
import Ledger from "./components/Ledger";
import Approvals from "./components/Approvals";
import Budgets from "./components/Budgets";
import PayablesReceivables from "./components/PayablesReceivables";
import Payroll from "./components/Payroll";
import DueDates from "./components/DueDates";
import Reports from "./components/Reports";
import AuditLog from "./components/AuditLog";
import TaxComplianceDashboard from "./components/TaxComplianceDashboard";
import AlertsMenu from "./components/AlertsMenu";
import FinancialAssistant from "./components/FinancialAssistant";
import DocumentVault from "./components/DocumentVault";
import LoginPage from "./components/LoginPage";
import SettingsPage from "./components/Settings";

import {
  getCompanies,
  getProfiles,
  getRoles,
  getUserRole,
  isGroupAdmin,
  isAccountingUser,
  canWriteFinance,
  canManagePayroll,
  canAccessCompany,
  getTransactions,
  writeAuditLog,
} from "./data/mockDatabase";
import { Company, Profile } from "./types";
import { triggerWorkspaceOAuth } from "./lib/workspace";

import { Toaster, toast } from "sonner";

type ActivePage =
  | "accounting_workbench"
  | "dashboard"
  | "money_flow"
  | "ledger"
  | "approvals"
  | "budgets"
  | "pay_rec"
  | "payroll"
  | "due_dates"
  | "reports"
  | "vault"
  | "tax_compliance"
  | "audit_log"
  | "assistant"
  | "owner_dashboard"
  | "settings";

export default function App() {
  // Active User profile and active company sessions
  const [activeUserId, setActiveUserId] = useState<string>(""); // Default to no user
  const [activeCompanyId, setActiveCompanyId] = useState<string>("all"); // Default ALL Consolidated
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");

  // Mobile sidebar overlays
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [rolesState, setRolesState] = useState(getRoles());
  const [navOrder, setNavOrder] = useState<string[]>([
    "dashboard",
    "accounting_workbench",
    "ledger",
    "money_flow",
    "budgets",
    "approvals",
    "pay_rec",
    "payroll",
    "due_dates",
    "reports",
    "vault",
    "tax_compliance",
    "audit_log",
    "assistant",
    "owner_dashboard",
    "settings",
  ]);

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileSidebarOpen]);

  // Triggering state changes logger
  const [triggerCount, setTriggerCount] = useState(0);

  // Manual Sync Data
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // Real sync: fetch cash accounts from SQL and refresh localStorage cache
      const DB_PREFIX = "finance_db_v3_";
      const CASH_ACCOUNTS_KEY = DB_PREFIX + "cash_accounts";
      try {
        const res = await fetch("/api/cash-accounts/all");
        if (res.ok) {
          const sqlAccounts = await res.json();
          localStorage.setItem(CASH_ACCOUNTS_KEY, JSON.stringify(sqlAccounts));
        }
      } catch (_) {
        // SQL may not be available; swallow and continue with local data
      }
      // Notify all components to re-read from localStorage
      window.dispatchEvent(new Event("db-update"));
      setLastSyncTime(new Date());
      toast.success("Database Synced", {
        description: "Cash accounts refreshed from SQL. Local data updated.",
      });
    } catch (e) {
      toast.error("Sync Failed", {
        description: "Could not connect to the group data layer.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // LOAD DB METRICS
  const companies = getCompanies();
  const accessibleCompanies = isGroupAdmin(activeUserId)
    ? companies
    : companies.filter((c) => canAccessCompany(activeUserId, c.id));
  const canViewConsolidated = isGroupAdmin(activeUserId) || accessibleCompanies.length > 1;
  const profiles = getProfiles();
  const currentCompany =
    activeCompanyId === "all"
      ? {
          id: "all",
          name: "Consolidated Group Entity",
          code: "ALL",
          createdAt: "2026-01-01T08:00:00Z",
        }
      : companies.find((c) => c.id === activeCompanyId) || companies[0];
  const currentProfile = profiles.find((p) => p.id === activeUserId);

  // If the active company context isn't one this user can actually access
  // (e.g. defaulted to "all" but they're scoped to a single company, or
  // their access changed), snap them into the first company they can see.
  useEffect(() => {
    if (!activeUserId) return;
    const stillValid =
      activeCompanyId === "all"
        ? canViewConsolidated
        : accessibleCompanies.some((c) => c.id === activeCompanyId);
    if (!stillValid && accessibleCompanies.length > 0) {
      setActiveCompanyId(accessibleCompanies[0].id);
    }
  }, [activeUserId, activeCompanyId, canViewConsolidated, accessibleCompanies]);

  // Also fetch data on mount and refresh
  useEffect(() => {
    const handleDbUpdate = () => {
      setRolesState(getRoles());
    };
    window.addEventListener("db-update", handleDbUpdate);
    return () => window.removeEventListener("db-update", handleDbUpdate);
  }, []);

  const currentRole = getUserRole(activeUserId, activeCompanyId);
  const currentUserRoleData =
    activeCompanyId === "all"
      ? rolesState.find((r) => r.userId === activeUserId)
      : rolesState.find(
          (r) => r.userId === activeUserId && r.companyId === activeCompanyId,
        );

  useEffect(() => {
    if (
      currentProfile?.dashboardLayout &&
      currentProfile.dashboardLayout.length > 0
    ) {
      const defaultOrder = [
        "owner_dashboard",
        "accounting_workbench",
        "dashboard",
        "money_flow",
        "ledger",
        "approvals",
        "budgets",
        "pay_rec",
        "payroll",
        "due_dates",
        "reports",
        "assistant",
        "vault",
        "tax_compliance",
        "audit_log",
        "settings",
      ];
      const newOrder = [...currentProfile.dashboardLayout];
      // Append any missing items that might be new
      defaultOrder.forEach((item) => {
        if (!newOrder.includes(item)) {
          newOrder.push(item);
        }
      });
      setNavOrder(newOrder);
    } else {
      setNavOrder([
        "owner_dashboard",
        "accounting_workbench",
        "dashboard",
        "money_flow",
        "ledger",
        "approvals",
        "budgets",
        "pay_rec",
        "payroll",
        "due_dates",
        "reports",
        "assistant",
        "vault",
        "tax_compliance",
        "audit_log",
        "settings",
      ]);
    }
  }, [
    currentProfile?.dashboardLayout
      ? currentProfile.dashboardLayout.join(",")
      : "",
  ]);

  // PESO FORMATTER
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const currentRoleLabel = useMemo(() => {
    if (isGroupAdmin(activeUserId)) return "Group Admin / Trustee";
    return `${currentRole?.replace("_", " ")} (${currentCompany?.code})`;
  }, [activeUserId, activeCompanyId, currentRole, currentCompany]);

  // Aggregate Total Treasury cash asset across all pre-seeded companies (group statistics)
  const groupTotalTreasury = useMemo(() => {
    // Collect from mock transactions
    let sum = 0;
    companies.forEach((com) => {
      const txns = getTransactions(activeUserId, com.id).filter(
        (t) => t.status === "approved",
      );
      const inflow = txns
        .filter((t) => t.type === "cash_in")
        .reduce((acc, t) => acc + t.amount, 0);
      const outflow = txns
        .filter((t) => t.type === "cash_out")
        .reduce((acc, t) => acc + t.amount, 0);
      sum += inflow - outflow;
    });
    return sum;
  }, [companies, activeUserId, triggerCount]);

  const groupTreasuryTrend = useMemo(() => {
    const today = new Date();
    const data: { date: string; balance: number }[] = [];
    let currentBalance = groupTotalTreasury;

    // Calculate balances for the last 7 days backwards
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      data.unshift({ date: dateStr, balance: currentBalance });

      // Remove the net of that day to get the previous day's balance
      companies.forEach((com) => {
        const txns = getTransactions(activeUserId, com.id).filter(
          (t) => t.status === "approved" && t.txnDate === dateStr,
        );
        const inflow = txns
          .filter((t) => t.type === "cash_in")
          .reduce((acc, t) => acc + t.amount, 0);
        const outflow = txns
          .filter((t) => t.type === "cash_out")
          .reduce((acc, t) => acc + t.amount, 0);
        currentBalance -= inflow - outflow;
      });
    }
    return data;
  }, [groupTotalTreasury, companies, activeUserId, triggerCount]);

  // Sync session logs upon profiling swaps
  const handleUserSwap = (userId: string) => {
    setActiveUserId(userId);
    if (
      isAccountingUser(userId) &&
      ["audit_log"].includes(activePage)
    ) {
      setActivePage("dashboard");
    }
    // Logging security log
    const changedProf = profiles.find((p) => p.id === userId);
    writeAuditLog(userId, null, "USER_SESSION_SWAP", "profile", userId, {
      comment: `Swapped active security actor session profile to ${changedProf?.fullName}`,
      level: "info",
    });
    toast.success(`Actor Profile Changed`, {
      description: `Switched session to ${changedProf?.fullName}`,
    });
    setTriggerCount((prev) => prev + 1);
  };

  const handleCompanySwap = (companyId: string) => {
    if (companyId === "all" ? !canViewConsolidated : !canAccessCompany(activeUserId, companyId)) {
      toast.error("You do not have access to that company.");
      return;
    }
    setActiveCompanyId(companyId);
    setMobileSidebarOpen(false);
    const company = companies.find((c) => c.id === companyId);
    writeAuditLog(
      activeUserId,
      companyId,
      "COMPANY_CONTEXT_SWAP",
      "company",
      companyId,
      {
        comment: `Swapped focus company context to code ${company?.code}`,
        level: "info",
      },
    );
    toast.success(`Company Context Switched`, {
      description: `Now managing ${company?.name} (${company?.code})`,
    });
    setTriggerCount((prev) => prev + 1);
  };

  const forceTriggerAuditTrail = () => {
    setTriggerCount((prev) => prev + 1);
  };

  // Google OAuth setup dispatcher
  const handleOAuthSetup = () => {
    triggerWorkspaceOAuth();
  };

  if (!activeUserId) {
    return <LoginPage onLogin={setActiveUserId} />;
  }

  return (
    <div className="h-screen bg-gray-100 text-slate-900 flex flex-col antialiased font-sans overflow-hidden">
      <Toaster
        theme="dark"
        position="bottom-right"
        className="font-mono text-xs"
      />

      {/* GLOBAL ENTERPRISE TOP STICKY BAR */}
      <header className="bg-white text-slate-900 sticky top-0 z-40 px-3 md:px-6 h-16 flex items-center justify-between border-b border-slate-200 select-none font-sans gap-4 w-full">
        {/* MOB TRIGGERS AND BRANDING */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 -ml-1 hover:bg-slate-50/80 rounded-lg text-slate-600 cursor-pointer transition-all shrink-0"
          >
            <Menu className="w-5 h-5 text-slate-900" />
          </button>

          <div className="flex items-center gap-2 md:gap-3 select-none">
            <div className="font-display font-light text-xl md:text-2xl tracking-tighter text-slate-900 shrink-0">
              HF
              <span className="text-[#00B67A] font-serif italic text-lg md:text-xl">
                .
              </span>
            </div>
            <div className="border-l border-slate-200 pl-3 hidden lg:block shrink-0">
              <h1 className="text-xs uppercase font-semibold font-display tracking-[3px] text-slate-900 leading-none whitespace-nowrap">
                HERRERA{" "}
                <span className="serif-italic text-sm font-light text-[#00B67A] font-serif">
                  finance
                </span>
              </h1>
              <p className="text-[8px] text-slate-500 font-mono font-medium tracking-widest uppercase whitespace-nowrap mt-1">
                Atelier Workspace Suite
              </p>
            </div>
          </div>
        </div>

        {/* GLOBAL SEARCH BAR */}
        <div className="flex-1 max-w-xl min-w-[200px] hidden xl:flex items-center">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search companies, groups or transactions..."
              className="w-full bg-white border border-slate-200 text-sm text-slate-900 pl-10 pr-4 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </div>
          </div>
        </div>

        {/* COMPREHENSIVE CONTROLS DECK */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* SYNC CONTROLS */}
          <div className="hidden xl:flex items-center gap-3 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-inner shrink-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest leading-none">
                  Last Sync
                </span>
                <div className="relative flex h-1.5 w-1.5">
                  <motion.span
                    key={lastSyncTime.getTime()}
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 3.5, opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute inline-flex h-full w-full rounded-full bg-[#00B67A]"
                  />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00B67A]"></span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-700 leading-none">
                {lastSyncTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="w-[1px] h-6 bg-slate-50"></div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="group flex items-center gap-1.5 focus:outline-hidden cursor-pointer shrink-0"
              title="Force Data Sync"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#00B67A]" : "text-slate-600 group-hover:text-slate-900 transition-colors"}`}
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${isSyncing ? "text-[#00B67A]" : "text-slate-600 group-hover:text-slate-900 transition-colors"}`}
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </span>
            </button>
          </div>

          <AlertsMenu activeUserId={activeUserId} />

          {/* GROUP TOTAL TREASURY STAT PILL */}
          <div className="hidden xl:flex items-center gap-3 bg-white border border-slate-200 pl-3.5 pr-2 py-1.5 text-xs rounded-xl shadow-inner shrink-0">
            <div className="flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px] whitespace-nowrap">
                Group Treasury:
              </span>
              <span className="font-mono text-slate-900 font-bold tracking-tight whitespace-nowrap">
                {formatPeso(groupTotalTreasury)}
              </span>
            </div>
            <div className="h-6 w-16 border-l border-slate-200 pl-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={groupTreasuryTrend}>
                  <YAxis domain={["dataMin", "dataMax"]} hide />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#00B67A"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ACTIVE COMPANY CONTEXT DROPDOWN */}
          <div className="flex items-center gap-1.5 font-sans shrink-0">
            <span className="hidden xl:inline text-[9.5px] uppercase font-bold text-slate-600 tracking-wider font-sans whitespace-nowrap">
              Focus Company:
            </span>
            <select
              value={activeCompanyId}
              onChange={(e) => handleCompanySwap(e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white text-slate-900 text-[10px] sm:text-xs focus:ring-1 focus:ring-[#00B67A] focus:outline-hidden font-medium border border-slate-200 rounded-lg cursor-pointer max-w-[100px] sm:max-w-[120px] lg:max-w-none text-ellipsis transition-all hover:bg-slate-50 font-semibold"
            >
              {canViewConsolidated && (
                <option value="all" className="font-bold text-[#00B67A]">
                  Consolidated (ALL)
                </option>
              )}
              {accessibleCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* SIMULATOR SECURITY ACTOR SWITCHER */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-1.5 md:pl-5 shrink-0">
            {/* Reset button removed from header */}
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        {/* MOBILE SIDEBAR OVERLAY */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* SIDEBAR NAVIGATION PANEL (STATIC DESKTOP, PORTAL ON MOBILE) */}
        <aside
          className={`bg-white/80 backdrop-blur-xl text-slate-700 border-r border-slate-200/60 shrink-0 select-none flex flex-col justify-between z-30 overflow-y-auto custom-scrollbar transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            mobileSidebarOpen 
              ? "fixed inset-y-0 left-0 translate-x-0 w-80 pt-16 pb-4 shadow-[10px_0_40px_rgba(0,0,0,0.08)]" 
              : "fixed inset-y-0 -translate-x-full md:relative md:translate-x-0 md:flex h-full"
          } ${
            sidebarMinimized && !mobileSidebarOpen ? "md:w-[88px]" : "md:w-80"
          }`}
        >
          <div
            className={`space-y-6 ${sidebarMinimized && !mobileSidebarOpen ? "p-3 pt-6" : "p-5"}`}
          >
            {/* CURRENT LOGGED IN USER CONTEXT CARD */}
            <div
              className={`bg-white border border-slate-200 flex flex-col justify-between shadow-md overflow-hidden ${sidebarMinimized && !mobileSidebarOpen ? "p-1.5 rounded-full items-center space-y-0" : "p-4 space-y-3 rounded-2xl"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-[#00B67A] text-white shrink-0 shadow-lg select-none"
                  title={currentProfile?.fullName}
                >
                  {currentProfile?.fullName
                    ? currentProfile.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                    : "NS"}
                </div>
                {(!sidebarMinimized || mobileSidebarOpen) && (
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate uppercase tracking-wider">
                      {currentProfile?.fullName}
                    </h3>
                    <p className="text-[10px] text-slate-500 truncate font-mono">
                      {currentProfile?.email}
                    </p>
                  </div>
                )}
              </div>
              {(!sidebarMinimized || mobileSidebarOpen) && (
                <div className="text-[9px] bg-slate-100 border border-slate-200 text-[#00B67A] px-2 py-1 rounded-lg font-mono font-bold uppercase tracking-widest text-center shadow-inner">
                  {currentRoleLabel}
                </div>
              )}
            </div>

            {/* COMPANY ENTITY QUICK SELECTOR PANEL */}
            {(!sidebarMinimized || mobileSidebarOpen) && (
              <div className="space-y-2 border-b border-slate-200/40 pb-5">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest font-mono block pl-1">
                  CORPORATE ENTITY SWITCHER
                </span>
                <div className="space-y-1.5">
                  {canViewConsolidated && (
                    <button
                      onClick={() => handleCompanySwap("all")}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border font-sans font-medium text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                        activeCompanyId === "all"
                          ? "bg-[#00B67A] text-white border-transparent shadow-[0_4px_12px_rgba(0,182,122,0.25)] font-bold"
                          : "bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Consolidated (ALL)</span>
                      </div>
                      <span className="font-mono text-[8px] px-1.5 py-0.5 bg-slate-50 rounded border border-slate-200 uppercase shrink-0">
                        ALL
                      </span>
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-1.5">
                    {accessibleCompanies.map((c) => {
                      const isSelected = activeCompanyId === c.id;

                      let baseColorClass =
                        "bg-[#00B67A] text-white border-transparent";
                      let shadowClass =
                        "shadow-[0_4px_12px_rgba(0,182,122,0.25)]";

                      switch (c.code) {
                        case "BMC":
                          baseColorClass =
                            "bg-yellow-500 text-white border-transparent";
                          shadowClass = "shadow-[0_4px_12px_rgba(234,179,8,0.25)]";
                          break;
                        case "HFH":
                          baseColorClass =
                            "bg-amber-500 text-white border-transparent";
                          shadowClass = "shadow-[0_4px_12px_rgba(245,158,11,0.25)]";
                          break;
                        case "BS":
                          baseColorClass =
                            "bg-red-500 text-white border-transparent";
                          shadowClass = "shadow-[0_4px_12px_rgba(239,68,68,0.25)]";
                          break;
                        case "SMC":
                          baseColorClass =
                            "bg-green-500 text-white border-transparent";
                          shadowClass = "shadow-[0_4px_12px_rgba(34,197,94,0.25)]";
                          break;
                        case "HBP":
                          baseColorClass =
                            "bg-blue-500 text-white border-transparent";
                          shadowClass = "shadow-[0_4px_12px_rgba(59,130,246,0.25)]";
                          break;
                      }

                      return (
                        <button
                          key={c.id}
                          onClick={() => handleCompanySwap(c.id)}
                          className={`text-left px-2.5 py-2 rounded-xl border font-sans text-[10px] transition-all flex items-center justify-between cursor-pointer ${baseColorClass} ${
                            isSelected
                              ? `font-bold ring-2 ring-slate-300 ${shadowClass}`
                              : "opacity-75 hover:opacity-100"
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          <span
                            className={`font-mono text-[8px] px-1 bg-slate-50 rounded border border-slate-200 uppercase shrink-0 ${isSelected ? "text-slate-900 opacity-100" : "text-slate-900 opacity-90"}`}
                          >
                            {c.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* NAVIGATION MENU ITEMS */}
            {(() => {
              const activeCompanyCode =
                activeCompanyId === "all"
                  ? "ALL"
                  : companies.find((c) => c.id === activeCompanyId)?.code;
              let navActiveColorClass =
                "bg-[#00B67A] text-white font-bold shadow-[0_4px_12px_rgba(0,182,122,0.25)]";
              switch (activeCompanyCode) {
                case "BMC":
                  navActiveColorClass =
                    "bg-yellow-500 text-white font-bold shadow-[0_4px_12px_rgba(234,179,8,0.25)]";
                  break;
                case "HFH":
                  navActiveColorClass =
                    "bg-amber-500 text-white font-bold shadow-[0_4px_12px_rgba(245,158,11,0.25)]";
                  break;
                case "BS":
                  navActiveColorClass =
                    "bg-red-500 text-white font-bold shadow-[0_4px_12px_rgba(239,68,68,0.25)]";
                  break;
                case "SMC":
                  navActiveColorClass =
                    "bg-green-500 text-white font-bold shadow-[0_4px_12px_rgba(34,197,94,0.25)]";
                  break;
                case "HBP":
                  navActiveColorClass =
                    "bg-blue-500 text-white font-bold shadow-[0_4px_12px_rgba(59,130,246,0.25)]";
                  break;
              }

              return (
                <nav className="space-y-1.5 flex flex-col justify-center">
                  {[
                    {
                      id: "dashboard",
                      label: "Overview Dashboard",
                      icon: TrendingUp,
                    },
                    {
                      id: "accounting_workbench",
                      label: "Accounting Workbench",
                      icon: CheckSquare,
                    },
                    { id: "ledger", label: "Transaction History", icon: Coins },
                    {
                      id: "money_flow",
                      label: "Cash Flow",
                      icon: Wallet,
                    },
                    { id: "budgets", label: "Budget Monitor", icon: PiggyBank },
                    {
                      id: "approvals",
                      label: "Approvals Queue",
                      icon: FileSignature,
                      pulse: true,
                    },
                    {
                      id: "assistant",
                      label: "Intelligence Assistant",
                      icon: CloudLightning,
                      pulse: true,
                    },
                    {
                      id: "owner_dashboard",
                      label: "Owner Action Summary",
                      icon: Activity,
                    },
                    {
                      id: "pay_rec",
                      label: "Corporate AP/AR",
                      icon: FolderMinus,
                    },
                    { id: "payroll", label: "Wages & Payroll", icon: Users },
                    { id: "due_dates", label: "Due Dates", icon: Calendar },
                    {
                      id: "reports",
                      label: "Executive Sheets",
                      icon: FileText,
                    },
                    {
                      id: "vault",
                      label: "Document Vault",
                      icon: FileText,
                    },
                    {
                      id: "tax_compliance",
                      label: "Tax Compliance",
                      icon: Percent,
                    },
                    {
                      id: "audit_log",
                      label: "Security & Audit",
                      icon: ShieldCheck,
                    },
                    {
                      id: "settings",
                      label: "Settings",
                      icon: Settings,
                    },
                  ]
                    .filter((item) => {
                      if (activeUserId === "u-it") return true; // IT sees everything

                      const isOwnerUser = isGroupAdmin(activeUserId) || (currentRole as string) === "owner";

                      if (isOwnerUser) {
                        // The owner should ONLY see these items (excluding budgets and owner_dashboard per request).
                        const ownerAllowed = [
                          "dashboard",
                          "accounting_workbench",
                          "ledger",
                          "money_flow",
                          "approvals",
                          "assistant",
                          "pay_rec",
                          "payroll",
                          "due_dates",
                          "settings",
                        ];
                        return ownerAllowed.includes(item.id);
                      }

                      if (
                        currentUserRoleData &&
                        currentUserRoleData.allowedSections &&
                        currentUserRoleData.allowedSections.length > 0
                      ) {
                        return currentUserRoleData.allowedSections.includes(
                          item.id,
                        );
                      }

                      if (item.id === "owner_dashboard") {
                        return (
                          currentRole === "company_admin" ||
                          (currentRole as string) === "owner"
                        );
                      }
                      if (item.id === "payroll") {
                        return activeCompanyId === "all"
                          ? false
                          : canManagePayroll(activeUserId, activeCompanyId);
                      }
                      if (isAccountingUser(activeUserId)) {
                        if (
                          item.id === "audit_log" ||
                          item.id === "settings"
                        ) {
                          return false;
                        }
                      }
                      return true;
                    })
                    .sort((a, b) => {
                      const aIdx = navOrder.indexOf(a.id);
                      const bIdx = navOrder.indexOf(b.id);
                      if (aIdx === -1 && bIdx === -1) return 0;
                      if (aIdx === -1) return 1;
                      if (bIdx === -1) return -1;
                      return aIdx - bIdx;
                    })
                    .map((item) => {
                      const Icon = item.icon;
                      const isSelected = activePage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActivePage(item.id as any);
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full flex items-center group relative overflow-hidden ${
                            !sidebarMinimized || mobileSidebarOpen
                              ? "justify-between px-3.5"
                              : "justify-center px-0"
                          } py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 ease-out cursor-pointer ${
                            isSelected
                              ? navActiveColorClass
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:shadow-sm border border-transparent hover:border-slate-200"
                          }`}
                          title={
                            sidebarMinimized && !mobileSidebarOpen
                              ? item.label
                              : undefined
                          }
                        >
                          <div
                            className={`flex items-center z-10 ${!sidebarMinimized || mobileSidebarOpen ? "gap-3" : ""}`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isSelected ? "text-white drop-shadow-sm" : "text-slate-500 group-hover:text-slate-700"} ${item.pulse && !isSelected ? "animate-pulse text-amber-500 group-hover:text-amber-600" : ""}`}
                            />
                            {(!sidebarMinimized || mobileSidebarOpen) && (
                              <span className="text-[13px] text-left leading-tight font-medium tracking-wide">
                                {item.label}
                              </span>
                            )}
                          </div>
                          {(!sidebarMinimized || mobileSidebarOpen) &&
                            !isSelected && (
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-40 group-hover:translate-x-0 text-slate-400" />
                            )}
                          {isSelected && (
                              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                          )}
                        </button>
                      );
                    })}
                </nav>
              );
            })()}
          </div>

          {/* OAUTH INTEGRATION FOOTER ACCORDION */}
          <div
            className={`border-t border-slate-200 bg-white/20 select-none text-[10px] text-slate-500 flex flex-col ${sidebarMinimized && !mobileSidebarOpen ? "p-3 space-y-3" : "p-5 space-y-4"}`}
          >
            {(!sidebarMinimized || mobileSidebarOpen) && (
              <>
                <div className="space-y-1">
                  <span className="font-bold text-slate-600 uppercase tracking-widest text-[9px]">
                    Environment:
                  </span>
                  <p className="font-mono text-zinc-600">
                    Cloud Run Isolation Platform
                  </p>
                </div>

                <button
                  onClick={handleOAuthSetup}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg text-[9px] font-mono font-bold cursor-pointer transition text-center block tracking-widest uppercase border border-slate-200"
                >
                  Configure OAuth scopes
                </button>
              </>
            )}

            <button
              onClick={() => {
                import("./lib/firebase").then(({ auth }) => {
                  auth
                    .signOut()
                    .then(() => {
                      setActiveUserId("");
                    })
                    .catch(() => setActiveUserId(""));
                });
              }}
              className={`w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-lg text-[9px] font-mono font-bold cursor-pointer transition flex items-center justify-center gap-1.5 tracking-widest uppercase border border-red-500/20 ${sidebarMinimized && !mobileSidebarOpen ? "px-0" : "px-3"}`}
              title="End Session"
            >
              <LogOut className="w-3 h-3 shrink-0" />{" "}
              {(!sidebarMinimized || mobileSidebarOpen) && "End Session"}
            </button>

            <button
              onClick={() => setSidebarMinimized(!sidebarMinimized)}
              className={`hidden md:flex w-full py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg text-[9px] font-mono font-bold cursor-pointer transition items-center justify-center gap-1.5 tracking-widest uppercase border border-slate-200 ${sidebarMinimized && !mobileSidebarOpen ? "px-0" : "px-3"}`}
              title={sidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
            >
              {sidebarMinimized ? (
                <PanelLeftOpen className="w-4 h-4 shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 shrink-0" /> Minimize Mode
                </>
              )}
            </button>
          </div>
        </aside>

        {/* CONTAINER VIEWPORTS PORTALS COMPONENT ROUTING */}
        <main className="flex-1 p-4 md:p-8 w-full min-w-0 transition overflow-y-auto space-y-6">
          {/* SYSTEM WIDE WARNING NOTICES */}
          {activePage !== "audit_log" && (
            <div className="hidden lg:flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 select-none animate-fadeIn no-print shadow-sm">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00B67A] shrink-0 animate-pulse" />
                <span className="text-[11px] uppercase tracking-wider text-slate-600">
                  Accounting Ledger Context:{" "}
                  <b className="text-slate-900 font-sans text-xs">
                    {currentCompany?.name} ({currentCompany?.code})
                  </b>
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500 tracking-wider uppercase">
                <Activity className="w-3 h-3 text-[#00B67A] shrink-0" />
                <span>
                  Routines: Fully compliant with Philippine Treasury
                  regulations.
                </span>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)", scale: 0.98 }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)", scale: 0.98 }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                staggerChildren: 0.1,
              }}
              className="space-y-6"
            >
              {/* PAGE COMPONENT BINDINGS */}

              {activePage === "accounting_workbench" && (
                <AccountingOfficerWorkbench
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  isConsolidated={activeCompanyId === "all"}
                />
              )}

              {activePage === "owner_dashboard" && (
                <OwnerDashboard
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  isConsolidated={activeCompanyId === "all"}
                  onNavigate={(tab: string) => {
                    if (tab === "general_journal") {
                      setActivePage("ledger");
                    } else {
                      setActivePage(tab as any);
                    }
                  }}
                />
              )}

              {activePage === "dashboard" && (
                <Dashboard
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  isConsolidated={activeCompanyId === "all"}
                  isSyncing={isSyncing}
                  onNavigate={(tab) => {
                    if (tab === "general_journal") {
                      setActivePage("ledger");
                    } else {
                      setActivePage(tab as any);
                    }
                  }}
                />
              )}

              {activePage === "money_flow" && (
                <MoneyFlowProfitCenter
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  isConsolidated={activeCompanyId === "all"}
                />
              )}

              {activePage === "ledger" && (
                <Ledger
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  onAuditLogged={forceTriggerAuditTrail}
                />
              )}

              {activePage === "approvals" && (
                <Approvals
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  onAuditLogged={forceTriggerAuditTrail}
                />
              )}

              {activePage === "budgets" && (
                <Budgets
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  onAuditLogged={forceTriggerAuditTrail}
                />
              )}

              {activePage === "pay_rec" && (
                <PayablesReceivables
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  onAuditLogged={forceTriggerAuditTrail}
                />
              )}

              {activePage === "payroll" && (
                <Payroll
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  onAuditLogged={forceTriggerAuditTrail}
                />
              )}

              {activePage === "due_dates" && (
                <DueDates
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  onAuditLogged={forceTriggerAuditTrail}
                />
              )}

              {activePage === "reports" && (
                <Reports userId={activeUserId} companyId={activeCompanyId} />
              )}

              {activePage === "assistant" && (
                <FinancialAssistant companyId={activeCompanyId} />
              )}

              {activePage === "vault" && (
                <DocumentVault
                  userId={activeUserId}
                  companyId={activeCompanyId}
                />
              )}

              {activePage === "tax_compliance" && (
                <TaxComplianceDashboard
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  onAuditLogged={forceTriggerAuditTrail}
                />
              )}

              {activePage === "audit_log" && (
                <AuditLog userId={activeUserId} companyId={activeCompanyId} />
              )}

              {activePage === "settings" && (
                <SettingsPage
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  navOrder={navOrder}
                  setNavOrder={setNavOrder}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
