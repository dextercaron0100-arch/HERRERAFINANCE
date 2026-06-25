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
  Globe,
  Plus,
  Sliders,
  Percent,
  Sun,
  Moon,
  RefreshCw,
  BookOpen,
  Notebook,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

import OwnerDashboard from "./components/OwnerDashboard";
import Dashboard from "./components/Dashboard";
import AccountingOfficerWorkbench from "./components/AccountingOfficerWorkbench";
import MoneyFlowProfitCenter from "./components/MoneyFlowProfitCenter";
import Ledger from "./components/Ledger";
import Approvals from "./components/Approvals";
import WorkspaceSyncCenter from "./components/WorkspaceSyncCenter";
import Budgets from "./components/Budgets";
import PayablesReceivables from "./components/PayablesReceivables";
import Payroll from "./components/Payroll";
import Reports from "./components/Reports";
import BankReconciliation from "./components/BankReconciliation";
import CashBankModule from "./components/CashBankModule";
import AuditLog from "./components/AuditLog";
import EnterpriseSuite from "./components/EnterpriseSuite";
import TaxComplianceDashboard from "./components/TaxComplianceDashboard";
import AlertsMenu from "./components/AlertsMenu";
import FinancialAssistant from "./components/FinancialAssistant";
import DocumentVault from "./components/DocumentVault";
import LoginPage from "./components/LoginPage";
import AccountingWorkflow from "./components/AccountingWorkflow";
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
  getTransactions,
  writeAuditLog,
  resetAllData,
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
  | "reports"
  | "bank_rec"
  | "cash_acc"
  | "audit_log"
  | "workspace"
  | "enterprise"
  | "assistant"
  | "vault"
  | "tax_compliance"
  | "workflow"
  | "owner_dashboard"
  | "settings";

export default function App() {
  // Active User profile and active company sessions
  const [activeUserId, setActiveUserId] = useState<string>(""); // Default to no user
  const [activeCompanyId, setActiveCompanyId] = useState<string>("all"); // Default ALL Consolidated
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Mobile sidebar overlays
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [rolesState, setRolesState] = useState(getRoles());
  const [navOrder, setNavOrder] = useState<string[]>([
    "owner_dashboard",
    "accounting_workbench",
    "dashboard",
    "money_flow",
    "workflow",
    "ledger",
    "approvals",
    "budgets",
    "pay_rec",
    "payroll",
    "reports",
    "cash_acc",
    "bank_rec",
    "assistant",
    "vault",
    "enterprise",
    "tax_compliance",
    "audit_log",
    "workspace",
    "settings"
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

  // Theme Toggler
  const [isLightMode, setIsLightMode] = useState<boolean>(false);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  }, [isLightMode]);

  // Triggering state changes logger
  const [triggerCount, setTriggerCount] = useState(0);

  // Manual Sync Data
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      setLastSyncTime(new Date());
      toast.success("Database Synced", {
        description: "Data successfully refreshed from treasury group ledger.",
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
  // Also fetch data on mount and refresh
  useEffect(() => {
    const handleDbUpdate = () => {
      setRolesState(getRoles());
    };
    window.addEventListener("db-update", handleDbUpdate);
    return () => window.removeEventListener("db-update", handleDbUpdate);
  }, []);

  const currentRole = getUserRole(activeUserId, activeCompanyId);
  const currentUserRoleData = rolesState.find(r => r.userId === activeUserId && r.companyId === activeCompanyId);

  useEffect(() => {
    if (currentProfile?.dashboardLayout && currentProfile.dashboardLayout.length > 0) {
      const defaultOrder = [
        "owner_dashboard", "accounting_workbench", "dashboard", "money_flow", "workflow", "ledger",
        "approvals", "budgets", "pay_rec", "payroll", "reports", "cash_acc", "bank_rec", "assistant",
        "vault", "enterprise", "tax_compliance", "audit_log", "workspace", "settings"
      ];
      const newOrder = [...currentProfile.dashboardLayout];
      // Append any missing items that might be new
      defaultOrder.forEach(item => {
        if (!newOrder.includes(item)) {
          newOrder.push(item);
        }
      });
      setNavOrder(newOrder);
    } else {
      setNavOrder([
        "owner_dashboard", "accounting_workbench", "dashboard", "money_flow", "workflow", "ledger",
        "approvals", "budgets", "pay_rec", "payroll", "reports", "cash_acc", "bank_rec", "assistant",
        "vault", "enterprise", "tax_compliance", "audit_log", "workspace", "settings"
      ]);
    }
  }, [currentProfile?.dashboardLayout ? currentProfile.dashboardLayout.join(',') : '']);

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
    const data: { date: string, balance: number }[] = [];
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
          (t) => t.status === "approved" && t.txnDate === dateStr
        );
        const inflow = txns.filter(t => t.type === "cash_in").reduce((acc, t) => acc + t.amount, 0);
        const outflow = txns.filter(t => t.type === "cash_out").reduce((acc, t) => acc + t.amount, 0);
        currentBalance -= (inflow - outflow);
      });
    }
    return data;
  }, [groupTotalTreasury, companies, activeUserId, triggerCount]);

  // Sync session logs upon profiling swaps
  const handleUserSwap = (userId: string) => {
    setActiveUserId(userId);
    if (isAccountingUser(userId) && ["audit_log", "workspace", "approvals"].includes(activePage)) {
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
    <div className="h-screen bg-[#0F1113] text-[#F1F5F9] flex flex-col antialiased font-sans overflow-hidden">
      <Toaster
        theme="dark"
        position="bottom-right"
        className="font-mono text-xs"
      />

      {/* GLOBAL ENTERPRISE TOP STICKY BAR */}
      <header className="bg-[#141618] text-white sticky top-0 z-40 px-3 md:px-6 h-16 flex items-center justify-between border-b border-[#24272C] select-none font-sans gap-4 w-full overflow-x-auto no-scrollbar">
        {/* MOB TRIGGERS AND BRANDING */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 -ml-1 hover:bg-zinc-800/80 rounded-lg text-zinc-400 cursor-pointer transition-all shrink-0"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-2 md:gap-3 select-none">
            <div className="font-display font-light text-xl md:text-2xl tracking-tighter text-white shrink-0">
              HF
              <span className="text-[#00B67A] font-serif italic text-lg md:text-xl">
                .
              </span>
            </div>
            <div className="border-l border-[#24272C] pl-3 hidden lg:block shrink-0">
              <h1 className="text-xs uppercase font-semibold font-display tracking-[3px] text-white leading-none whitespace-nowrap">
                HERRERA{" "}
                <span className="serif-italic text-sm font-light text-[#00B67A] font-serif">
                  finance
                </span>
              </h1>
              <p className="text-[8px] text-zinc-500 font-mono font-medium tracking-widest uppercase whitespace-nowrap mt-1">
                Atelier Workspace Suite
              </p>
            </div>
          </div>
        </div>

        {/* GLOBAL SEARCH BAR */}
        <div className="flex-1 max-w-xl min-w-[200px] hidden xl:flex items-center">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search companies, groups or transactions..."
              className="w-full bg-[#0F1113] border border-[#24272C] text-sm text-white pl-10 pr-4 py-2 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-600 bg-[#24272C]/50 px-1.5 py-0.5 rounded border border-[#24272C]">
              ⌘K
            </div>
          </div>
        </div>

        {/* COMPREHENSIVE CONTROLS DECK */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* SYNC CONTROLS */}
          <div className="hidden xl:flex items-center gap-3 bg-[#181A1C] border border-[#24272C] px-3.5 py-1.5 rounded-xl shadow-inner shrink-0">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest leading-none">
                Last Sync
              </span>
              <span className="text-[10px] font-mono text-zinc-300">
                {lastSyncTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="w-[1px] h-6 bg-[#24272C]"></div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="group flex items-center gap-1.5 focus:outline-hidden cursor-pointer shrink-0"
              title="Force Data Sync"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#00B67A]" : "text-zinc-400 group-hover:text-white transition-colors"}`}
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${isSyncing ? "text-[#00B67A]" : "text-zinc-400 group-hover:text-white transition-colors"}`}
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </span>
            </button>
          </div>

          <AlertsMenu activeUserId={activeUserId} />

          {/* THEME TOGGLE BUTTON */}
          <button
            onClick={() => {
              setIsLightMode(!isLightMode);
              toast.success(`Theme Changed`, {
                description: `Switched to ${!isLightMode ? "Clean Light" : "Midnight Dark"} mode`,
              });
            }}
            className="hidden sm:flex shrink-0 p-1.5 items-center justify-center bg-[#181A1C] border border-[#24272C] text-zinc-400 hover:text-white rounded-lg transition-all"
            title={
              isLightMode
                ? "Switch to Midnight Dark Mode"
                : "Switch to Clean Light Mode"
            }
          >
            {isLightMode ? (
              <Moon className="w-3.5 h-3.5" />
            ) : (
              <Sun className="w-3.5 h-3.5" />
            )}
          </button>

          {/* GROUP TOTAL TREASURY STAT PILL */}
          <div className="hidden xl:flex items-center gap-3 bg-[#181A1C] border border-[#24272C] pl-3.5 pr-2 py-1.5 text-xs rounded-xl shadow-inner shrink-0">
            <div className="flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[#94A3B8] font-medium uppercase tracking-wider text-[10px] whitespace-nowrap">
                Group Treasury:
              </span>
              <span className="font-mono text-white font-bold tracking-tight whitespace-nowrap">
                {formatPeso(groupTotalTreasury)}
              </span>
            </div>
            <div className="h-6 w-16 border-l border-[#24272C] pl-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={groupTreasuryTrend}>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
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
            <span className="hidden xl:inline text-[9.5px] uppercase font-bold text-zinc-400 tracking-wider font-sans whitespace-nowrap">
              Focus Company:
            </span>
            <select
              value={activeCompanyId}
              onChange={(e) => handleCompanySwap(e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#181A1C] text-[#F1F5F9] text-[10px] sm:text-xs focus:ring-1 focus:ring-[#00B67A] focus:outline-hidden font-medium border border-[#24272C] rounded-lg cursor-pointer max-w-[100px] sm:max-w-[120px] lg:max-w-none text-ellipsis transition-all hover:bg-[#1D2024] font-semibold"
            >
              <option value="all" className="font-bold text-[#00B67A]">
                Consolidated (ALL)
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* SIMULATOR SECURITY ACTOR SWITCHER */}
          <div className="flex items-center gap-1.5 border-l border-[#24272C] pl-1.5 md:pl-5 shrink-0">
            {isConfirmingReset ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    await resetAllData();
                    window.location.href = '/';
                  }}
                  className="text-[9px] uppercase font-bold text-white bg-red-600 hover:bg-red-500 px-2 flex items-center justify-center py-1.5 rounded-lg border border-red-500 transition-colors cursor-pointer"
                >
                  <span className="hidden sm:inline">Confirm Reset</span>
                  <span className="sm:hidden">Confirm</span>
                </button>
                <button
                  onClick={() => setIsConfirmingReset(false)}
                  className="text-[9px] uppercase font-bold text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg border border-[#24272C] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingReset(true)}
                className="text-[9px] uppercase font-bold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-1.5 rounded-lg border border-red-500/20 transition-colors md:mr-2 cursor-pointer flex items-center gap-1"
                title="Reset All Data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset Data</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        {/* MOBILE SIDEBAR OVERLAY */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR NAVIGATION PANEL (STATIC DESKTOP, PORTAL ON MOBILE) */}
        <aside
          className={`bg-[#141618] text-gray-300 border-r border-[#24272C] shrink-0 select-none flex flex-col justify-between z-30 transition-all duration-300 overflow-y-auto ${mobileSidebarOpen ? "fixed inset-y-0 left-0 translate-x-0 w-64 pt-20 pb-4 shadow-2xl" : "hidden md:flex h-full"} ${sidebarMinimized && !mobileSidebarOpen ? "w-20" : "w-64"}`}
        >
          <div className={`space-y-6 ${sidebarMinimized && !mobileSidebarOpen ? "p-3 pt-6" : "p-5"}`}>
            {/* CURRENT LOGGED IN USER CONTEXT CARD */}
            <div className={`bg-[#181A1C] border border-[#24272C] flex flex-col justify-between shadow-md overflow-hidden ${sidebarMinimized && !mobileSidebarOpen ? "p-1.5 rounded-full items-center space-y-0" : "p-4 space-y-3 rounded-2xl"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-[#00B67A] text-white shrink-0 shadow-lg select-none" title={currentProfile?.fullName}>
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
                    <h3 className="text-xs font-bold text-white truncate uppercase tracking-wider">
                      {currentProfile?.fullName}
                    </h3>
                    <p className="text-[10px] text-zinc-500 truncate font-mono">
                      {currentProfile?.email}
                    </p>
                  </div>
                )}
              </div>
              {(!sidebarMinimized || mobileSidebarOpen) && (
                <div className="text-[9px] bg-zinc-900/60 border border-[#24272C] text-[#00B67A] px-2 py-1 rounded-lg font-mono font-bold uppercase tracking-widest text-center shadow-inner">
                  {currentRoleLabel}
                </div>
              )}
            </div>

            {/* COMPANY ENTITY QUICK SELECTOR PANEL */}
            {(!sidebarMinimized || mobileSidebarOpen) && (
              <div className="space-y-2 border-b border-[#24272C]/40 pb-5">
                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest font-mono block pl-1">
                  CORPORATE ENTITY SWITCHER
                </span>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleCompanySwap("all")}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border font-sans font-medium text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                      activeCompanyId === "all"
                        ? "bg-[#00B67A] text-white border-transparent shadow-[0_4px_12px_rgba(0,182,122,0.25)] font-bold"
                        : "bg-[#181A1C] text-zinc-400 border-[#24272C] hover:text-white hover:bg-[#1D2024]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Consolidated (ALL)</span>
                    </div>
                    <span className="font-mono text-[8px] px-1.5 py-0.5 bg-black/30 rounded border border-white/10 uppercase shrink-0">
                      ALL
                    </span>
                  </button>
                  <div className="grid grid-cols-2 gap-1.5">
                    {companies.map((c) => {
                      const isSelected = activeCompanyId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleCompanySwap(c.id)}
                          className={`text-left px-2.5 py-2 rounded-xl border font-sans text-[10px] transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-[#00B67A]/25 text-[#00B67A] border-[#00B67A] font-bold"
                              : "bg-[#181A1C] text-zinc-400 border-[#24272C] hover:text-white hover:bg-[#1D2024]"
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="font-mono text-[8px] px-1 bg-black/20 rounded border border-white/5 text-zinc-500 uppercase shrink-0">
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
            <nav className="space-y-1.5 flex flex-col justify-center">
              {[
                {
                  id: "owner_dashboard",
                  label: "Owner Action Summary",
                  icon: Activity,
                },
                {
                  id: "accounting_workbench",
                  label: "Accounting Workbench",
                  icon: CheckSquare,
                },
                {
                  id: "dashboard",
                  label: "Overview Dashboard",
                  icon: TrendingUp,
                },
                {
                  id: "money_flow",
                  label: "Money Flow & Profit",
                  icon: Wallet,
                },
                {
                  id: "workflow",
                  label: "Accounting Workflow SOPs",
                  icon: CheckCircle2,
                  pulse: true,
                },
                { id: "ledger", label: "Transaction Journal", icon: Coins },
                {
                  id: "approvals",
                  label: "Approvals queue",
                  icon: FileSignature,
                  pulse: true,
                },
                { id: "budgets", label: "Budgets Monitor", icon: PiggyBank },
                {
                  id: "pay_rec",
                  label: "Liabilities & Assets (AP/AR)",
                  icon: FolderMinus,
                },
                { id: "payroll", label: "Wages & Payroll", icon: Users },
                {
                  id: "reports",
                  label: "Executive Sheets Reports",
                  icon: FileText,
                },
                {
                  id: "cash_acc",
                  label: "Cash & Bank Accounts",
                  icon: Notebook,
                },
                {
                  id: "bank_rec",
                  label: "Bank Reconciliation",
                  icon: BookOpen,
                },
                {
                  id: "assistant",
                  label: "Intelligence Assistant",
                  icon: CloudLightning,
                  pulse: true,
                },
                {
                  id: "vault",
                  label: "Document Vault",
                  icon: FileText,
                },
                {
                  id: "enterprise",
                  label: "Enterprise Suite Hub",
                  icon: Sliders,
                  pulse: true,
                },
                {
                  id: "tax_compliance",
                  label: "PH TAX Compliance Hub",
                  icon: Percent,
                },
                {
                  id: "audit_log",
                  label: "Security Compliance Log",
                  icon: ShieldCheck,
                },
                {
                  id: "workspace",
                  label: "Workspace Sync Center",
                  icon: Globe,
                  pulse: true,
                },
                {
                  id: "settings",
                  label: "Settings",
                  icon: Settings,
                },
              ].filter(item => {
                if (isGroupAdmin(activeUserId)) return true;
                
                if (currentUserRoleData && currentUserRoleData.allowedSections && currentUserRoleData.allowedSections.length > 0) {
                  return currentUserRoleData.allowedSections.includes(item.id);
                }

                if (item.id === "owner_dashboard") {
                  return currentRole === "company_admin" || currentRole === "owner";
                }
                if (item.id === "payroll") {
                  return activeCompanyId === 'all' ? false : canManagePayroll(activeUserId, activeCompanyId);
                }
                if (isAccountingUser(activeUserId)) {
                  if (item.id === "audit_log" || item.id === "workspace" || item.id === "approvals" || item.id === "settings") {
                    return false;
                  }
                }
                return true;
              }).sort((a, b) => {
                 const aIdx = navOrder.indexOf(a.id);
                 const bIdx = navOrder.indexOf(b.id);
                 if (aIdx === -1 && bIdx === -1) return 0;
                 if (aIdx === -1) return 1;
                 if (bIdx === -1) return -1;
                 return aIdx - bIdx;
              }).map((item) => {
                const Icon = item.icon;
                const isSelected = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePage(item.id as any);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center ${
                      (!sidebarMinimized || mobileSidebarOpen) ? "justify-between px-3.5" : "justify-center px-0"
                    } py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-[#00B67A] text-white font-bold shadow-[0_4px_12px_rgba(0,182,122,0.25)]"
                        : "text-zinc-400 hover:text-white hover:bg-[#181A1C]/60"
                    }`}
                    title={sidebarMinimized && !mobileSidebarOpen ? item.label : undefined}
                  >
                    <div className={`flex items-center ${(!sidebarMinimized || mobileSidebarOpen) ? "gap-2.5" : ""}`}>
                      <Icon
                        className={`w-4 h-4 ${isSelected ? "text-white" : "text-zinc-500"} ${item.pulse && !isSelected ? "animate-pulse text-amber-500" : ""}`}
                      />
                      {(!sidebarMinimized || mobileSidebarOpen) && (
                        <span className="uppercase tracking-wider text-[10px]">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {(!sidebarMinimized || mobileSidebarOpen) && !isSelected && (
                      <ChevronDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* OAUTH INTEGRATION FOOTER ACCORDION */}
          <div className={`border-t border-[#24272C] bg-[#181A1C]/20 select-none text-[10px] text-zinc-500 flex flex-col ${sidebarMinimized && !mobileSidebarOpen ? "p-3 space-y-3" : "p-5 space-y-4"}`}>
            {(!sidebarMinimized || mobileSidebarOpen) && (
              <>
                <div className="space-y-1">
                  <span className="font-bold text-zinc-400 uppercase tracking-widest text-[9px]">
                    Environment:
                  </span>
                  <p className="font-mono text-zinc-600">
                    Cloud Run Isolation Platform
                  </p>
                </div>

                <button
                  onClick={handleOAuthSetup}
                  className="w-full py-2 px-3 bg-[#181A1C] hover:bg-[#1D2024] text-zinc-400 hover:text-white rounded-lg text-[9px] font-mono font-bold cursor-pointer transition text-center block tracking-widest uppercase border border-[#24272C]"
                >
                  Configure OAuth scopes
                </button>
              </>
            )}
            
            <button
              onClick={() => {
                import('./lib/firebase').then(({ auth }) => {
                  auth.signOut().then(() => {
                    setActiveUserId("");
                  }).catch(() => setActiveUserId(""));
                });
              }}
              className={`w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-lg text-[9px] font-mono font-bold cursor-pointer transition flex items-center justify-center gap-1.5 tracking-widest uppercase border border-red-500/20 ${sidebarMinimized && !mobileSidebarOpen ? "px-0" : "px-3"}`}
              title="End Session"
            >
              <LogOut className="w-3 h-3 shrink-0" /> {(!sidebarMinimized || mobileSidebarOpen) && "End Session"}
            </button>

            <button
              onClick={() => setSidebarMinimized(!sidebarMinimized)}
              className={`hidden md:flex w-full py-2 bg-[#181A1C] hover:bg-[#1D2024] text-zinc-400 hover:text-white rounded-lg text-[9px] font-mono font-bold cursor-pointer transition items-center justify-center gap-1.5 tracking-widest uppercase border border-[#24272C] ${sidebarMinimized && !mobileSidebarOpen ? "px-0" : "px-3"}`}
              title={sidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
            >
              {sidebarMinimized ? <PanelLeftOpen className="w-4 h-4 shrink-0" /> : <><PanelLeftClose className="w-4 h-4 shrink-0" /> Minimize Mode</>}
            </button>
          </div>
        </aside>

        {/* CONTAINER VIEWPORTS PORTALS COMPONENT ROUTING */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full min-w-0 transition overflow-y-auto space-y-6">
          {/* SYSTEM WIDE WARNING NOTICES */}
          {activePage !== "audit_log" && (
            <div className="hidden lg:flex items-center justify-between bg-[#181A1C] border border-[#24272C] rounded-2xl p-4 select-none animate-fadeIn no-print shadow-sm">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00B67A] shrink-0 animate-pulse" />
                <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                  Accounting Ledger Context:{" "}
                  <b className="text-white font-sans text-xs">
                    {currentCompany?.name} ({currentCompany?.code})
                  </b>
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-500 tracking-wider uppercase">
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
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.1 }}
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

              {activePage === "reports" && (
                <Reports userId={activeUserId} companyId={activeCompanyId} />
              )}
              
              {activePage === "cash_acc" && (
                <CashBankModule userId={activeUserId} companyId={activeCompanyId} />
              )}

              {activePage === "bank_rec" && (
                <BankReconciliation userId={activeUserId} companyId={activeCompanyId} />
              )}

              {activePage === "assistant" && (
                <FinancialAssistant companyId={activeCompanyId} />
              )}

              {activePage === "vault" && (
                <DocumentVault userId={activeUserId} companyId={activeCompanyId} />
              )}

              {activePage === "enterprise" && (
                <EnterpriseSuite
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  onAuditLogged={forceTriggerAuditTrail}
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

              {activePage === "workspace" && (
                <WorkspaceSyncCenter
                  userId={activeUserId}
                  companyId={activeCompanyId}
                  onAuditLogged={forceTriggerAuditTrail}
                  onRequestOAuth={handleOAuthSetup}
                />
              )}
              {activePage === "workflow" && (
                <AccountingWorkflow onNavigate={(page) => setActivePage(page as ActivePage)} />
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

      {/* MOBILE BAR MENU SLIDER POPUP PORTAL OVERLAY */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <span className="font-bold font-mono text-xs text-indigo-400">
                    SIDEBAR OVERVIEW
                  </span>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 cursor-pointer text-white"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* NAV COMPONENT */}
                <nav className="space-y-2">
                  <button
                    onClick={() => {
                      setActivePage("accounting_workbench");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4 text-gray-400" />
                    <span>Accounting Workbench</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("dashboard");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span>Overview Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("money_flow");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-gray-400" />
                    <span>Money Flow & Profit</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("workflow");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-gray-400" />
                    <span>Accounting Workflow SOPs</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("ledger");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <Coins className="w-4 h-4 text-gray-400" />
                    <span>Transaction Journal</span>
                  </button>
                  {!isAccountingUser(activeUserId) && (
                    <button
                      onClick={() => {
                        setActivePage("approvals");
                        setMobileSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                    >
                      <FileSignature className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>Approvals queue</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActivePage("budgets");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <PiggyBank className="w-4 h-4 text-gray-400" />
                    <span>Budgets monitor</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("pay_rec");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <FolderMinus className="w-4 h-4 text-gray-400" />
                    <span>Corporate AP/AR</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("payroll");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>Payroll compensation</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("reports");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>Analytical Executive sheets</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("cash_acc");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <Notebook className="w-4 h-4 text-gray-400" />
                    <span>Cash & Bank Accounts</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("bank_rec");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <span>Bank Reconciliation</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("assistant");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <CloudLightning className="w-4 h-4 text-gray-400 animate-pulse" />
                    <span>Intelligence Assistant</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("vault");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>Document Vault</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("enterprise");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-gray-400" />
                    <span>Enterprise Suite Hub</span>
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("tax_compliance");
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                  >
                    <Percent className="w-4 h-4 text-gray-400" />
                    <span>PH TAX Compliance Hub</span>
                  </button>
                  {!isAccountingUser(activeUserId) && (
                    <button
                      onClick={() => {
                        setActivePage("audit_log");
                        setMobileSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer font-mono"
                    >
                      <ShieldCheck className="w-4 h-4 text-gray-400" />
                      <span>Compliance logs</span>
                    </button>
                  )}
                  {!isAccountingUser(activeUserId) && (
                    <button
                      onClick={() => {
                        setActivePage("workspace");
                        setMobileSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                    >
                      <Globe className="w-4 h-4 text-indigo-400 animate-pulse" />
                      <span>Workspace Sync Center</span>
                    </button>
                  )}
                </nav>
              </div>

              <div className="p-4 border-t border-gray-800 text-[10px] text-gray-500 font-mono text-center">
                FM Sandbox Platform
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
