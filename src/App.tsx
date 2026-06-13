/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  Coins,
  ShieldCheck,
  FileText,
  FileSignature,
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
  Moon
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
import WorkspaceSyncCenter from './components/WorkspaceSyncCenter';
import Budgets from './components/Budgets';
import PayablesReceivables from './components/PayablesReceivables';
import Payroll from './components/Payroll';
import Reports from './components/Reports';
import AuditLog from './components/AuditLog';
import EnterpriseSuite from './components/EnterpriseSuite';
import TaxComplianceDashboard from './components/TaxComplianceDashboard';

import {
  getCompanies,
  getProfiles,
  getUserRole,
  isGroupAdmin,
  canWriteFinance,
  canManagePayroll,
  getTransactions,
  writeAuditLog
} from './data/mockDatabase';
import { Company, Profile } from './types';
import { triggerWorkspaceOAuth } from './lib/workspace';

import { Toaster, toast } from 'sonner';

type ActivePage = 
  | 'dashboard' 
  | 'ledger' 
  | 'approvals' 
  | 'budgets' 
  | 'pay_rec' 
  | 'payroll' 
  | 'reports' 
  | 'audit_log' 
  | 'workspace'
  | 'enterprise'
  | 'tax_compliance';

export default function App() {
  // Active User profile and active company sessions
  const [activeUserId, setActiveUserId] = useState<string>('u-gadmin'); // Default Group Admin
  const [activeCompanyId, setActiveCompanyId] = useState<string>('c-bls'); // Default Blesscent
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  // Mobile sidebar overlays
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Theme Toggler
  const [isLightMode, setIsLightMode] = useState<boolean>(false);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [isLightMode]);

  // Triggering state changes logger
  const [triggerCount, setTriggerCount] = useState(0);

  // Synchronously redirect old approvals page references to workspace
  useEffect(() => {
    if (activePage === 'approvals') {
      setActivePage('workspace');
    }
  }, [activePage]);

  // LOAD DB METRICS
  const companies = getCompanies();
  const profiles = getProfiles();
  const currentCompany = companies.find(c => c.id === activeCompanyId);
  const currentProfile = profiles.find(p => p.id === activeUserId);
  const currentRole = getUserRole(activeUserId, activeCompanyId);

  // PESO FORMATTER
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(num);
  };

  const currentRoleLabel = useMemo(() => {
    if (isGroupAdmin(activeUserId)) return 'Group Admin / Trustee';
    return `${currentRole?.replace('_', ' ')} (${currentCompany?.code})`;
  }, [activeUserId, activeCompanyId, currentRole, currentCompany]);

  // Aggregate Total Treasury cash asset across all pre-seeded companies (group statistics)
  const groupTotalTreasury = useMemo(() => {
    // Collect from mock transactions
    let sum = 0;
    companies.forEach(com => {
      const txns = getTransactions(activeUserId, com.id).filter(t => t.status === 'approved');
      const inflow = txns.filter(t => t.type === 'cash_in').reduce((acc, t) => acc + t.amount, 0);
      const outflow = txns.filter(t => t.type === 'cash_out').reduce((acc, t) => acc + t.amount, 0);
      sum += (500000.00 + inflow - outflow); // pre-seeded beginning capital is 500K
    });
    return sum;
  }, [companies, activeUserId, triggerCount]);

  // Sync session logs upon profiling swaps
  const handleUserSwap = (userId: string) => {
    setActiveUserId(userId);
    // Logging security log
    const changedProf = profiles.find(p => p.id === userId);
    writeAuditLog(userId, null, 'USER_SESSION_SWAP', 'profile', userId, { comment: `Swapped active security actor session profile to ${changedProf?.fullName}`, level: 'info' });
    toast.success(`Actor Profile Changed`, { description: `Switched session to ${changedProf?.fullName}` });
    setTriggerCount(prev => prev + 1);
  };

  const handleCompanySwap = (companyId: string) => {
    setActiveCompanyId(companyId);
    const company = companies.find(c => c.id === companyId);
    writeAuditLog(activeUserId, companyId, 'COMPANY_CONTEXT_SWAP', 'company', companyId, { comment: `Swapped focus company context to code ${company?.code}`, level: 'info' });
    toast.success(`Company Context Switched`, { description: `Now managing ${company?.name} (${company?.code})` });
    setTriggerCount(prev => prev + 1);
  };

  const forceTriggerAuditTrail = () => {
    setTriggerCount(prev => prev + 1);
  };

  // Google OAuth setup dispatcher
  const handleOAuthSetup = () => {
    triggerWorkspaceOAuth();
  };

  return (
    <div className="min-h-screen bg-[#0F1113] text-[#F1F5F9] flex flex-col antialiased font-sans">
      <Toaster theme="dark" position="bottom-right" className="font-mono text-xs" />
      
      {/* GLOBAL ENTERPRISE TOP STICKY BAR */}
      <header className="bg-[#141618] text-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-[#24272C] select-none font-sans">
        
        {/* MOB TRIGGERS AND BRANDING */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 hover:bg-zinc-800/80 rounded-lg text-zinc-400 cursor-pointer transition-all"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-3 select-none">
            <div className="font-display font-light text-2xl tracking-tighter text-white">
              HF<span className="text-[#00B67A] font-serif italic text-xl">.</span>
            </div>
            <div className="border-l border-[#24272C] pl-3">
              <h1 className="text-xs uppercase font-semibold font-display tracking-[3px] text-white leading-none">HERRERA <span className="serif-italic text-sm font-light text-[#00B67A] font-serif">finance</span></h1>
              <p className="text-[8px] text-zinc-500 font-mono font-medium tracking-widest uppercase">Atelier Workspace Suite</p>
            </div>
          </div>
        </div>

        {/* COMPREHENSIVE CONTROLS DECK */}
        <div className="flex items-center gap-3 md:gap-5">
          
          {/* THEME TOGGLE BUTTON */}
          <button
            onClick={() => {
              setIsLightMode(!isLightMode);
              toast.success(`Theme Changed`, { description: `Switched to ${!isLightMode ? 'Clean Light' : 'Midnight Dark'} mode` });
            }}
            className="hidden sm:flex p-1.5 items-center justify-center bg-[#181A1C] border border-[#24272C] text-zinc-400 hover:text-white rounded-lg transition-all"
            title={isLightMode ? "Switch to Midnight Dark Mode" : "Switch to Clean Light Mode"}
          >
            {isLightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>

          {/* GROUP TOTAL TREASURY STAT PILL */}
          <div className="hidden sm:flex items-center gap-2 bg-[#181A1C] border border-[#24272C] px-3.5 py-1.5 text-xs rounded-xl shadow-inner">
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[#94A3B8] font-medium uppercase tracking-wider text-[10px]">Group Treasury:</span>
            <span className="font-mono text-white font-bold tracking-tight">{formatPeso(groupTotalTreasury)}</span>
          </div>

          {/* ACTIVE COMPANY CONTEXT DROPDOWN */}
          <div className="flex items-center gap-1.5">
            <span className="hidden lg:inline text-[9px] uppercase font-bold text-zinc-500 tracking-widest font-mono">Focus Entity:</span>
            <select
              value={activeCompanyId}
              onChange={(e) => handleCompanySwap(e.target.value)}
              className="px-3 py-1.5 bg-[#181A1C] text-[#F1F5F9] text-xs focus:ring-1 focus:ring-[#00B67A] focus:outline-hidden font-medium border border-[#24272C] rounded-lg cursor-pointer max-w-[130px] sm:max-w-none text-ellipsis transition-all hover:bg-[#1D2024]"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* SIMULATOR SECURITY ACTOR SWITCHER */}
          <div className="flex items-center gap-2 border-l border-[#24272C] pl-3 md:pl-5">
            <span className="hidden lg:inline text-[9px] uppercase font-semibold text-zinc-500 tracking-widest font-mono">Actor:</span>
            <select
              value={activeUserId}
              onChange={(e) => handleUserSwap(e.target.value)}
              className="px-2.5 py-1.5 bg-[#181A1C] text-[#F1F5F9] text-xs focus:ring-1 focus:ring-[#00B67A] focus:outline-hidden font-mono font-medium border border-[#24272C] rounded-lg cursor-pointer transition-all hover:bg-[#1D2024]"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.isGroupAdmin ? 'Trustee' : 'Staff'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative">

        {/* SIDEBAR NAVIGATION PANEL (STATIC DESKTOP, PORTAL ON MOBILE) */}
        <aside className={`w-64 bg-[#141618] text-gray-300 border-r border-[#24272C] shrink-0 select-none flex flex-col justify-between z-30 transition-all ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'hidden md:flex'}`}>
          <div className="p-5 space-y-6">
            
            {/* CURRENT LOGGED IN USER CONTEXT CARD */}
            <div className="p-4 bg-[#181A1C] border border-[#24272C] space-y-3 flex flex-col justify-between rounded-2xl shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-[#00B67A] text-white shrink-0 shadow-lg select-none">
                  {currentProfile?.fullName ? currentProfile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'NS'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate uppercase tracking-wider">{currentProfile?.fullName}</h3>
                  <p className="text-[10px] text-zinc-500 truncate font-mono">{currentProfile?.email}</p>
                </div>
              </div>
              <div className="text-[9px] bg-zinc-900/60 border border-[#24272C] text-[#00B67A] px-2 py-1 rounded-lg font-mono font-bold uppercase tracking-widest text-center shadow-inner">
                {currentRoleLabel}
              </div>
            </div>

            {/* NAVIGATION MENU ITEMS */}
            <nav className="space-y-1.5">
              {[
                { id: 'dashboard', label: 'Overview Dashboard', icon: TrendingUp },
                { id: 'ledger', label: 'Transaction Journal', icon: Coins },
                { id: 'budgets', label: 'Budgets Monitor', icon: PiggyBank },
                { id: 'pay_rec', label: 'Liabilities & Assets (AP/AR)', icon: FolderMinus },
                { id: 'payroll', label: 'Wages & Payroll', icon: Users },
                { id: 'reports', label: 'Executive Sheets Reports', icon: FileText },
                { id: 'enterprise', label: 'Enterprise Suite Hub', icon: Sliders, pulse: true },
                { id: 'tax_compliance', label: 'PH TAX Compliance Hub', icon: Percent },
                { id: 'audit_log', label: 'Security Compliance Log', icon: ShieldCheck },
                { id: 'workspace', label: 'Workspace Sync Center', icon: Globe, pulse: true }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = activePage === item.id;
                return (
                  <button 
                    key={item.id}
                    onClick={() => { setActivePage(item.id as any); setMobileSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-[#00B67A] text-white font-bold shadow-[0_4px_12px_rgba(0,182,122,0.25)]' 
                        : 'text-zinc-400 hover:text-white hover:bg-[#181A1C]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-zinc-500'} ${item.pulse && !isSelected ? 'animate-pulse text-amber-500' : ''}`} />
                      <span className="uppercase tracking-wider text-[10px]">{item.label}</span>
                    </div>
                    {!isSelected && <ChevronDown className="w-3 h-3 opacity-30" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* OAUTH INTEGRATION FOOTER ACCORDION */}
          <div className="p-5 border-t border-[#24272C] bg-[#181A1C]/20 space-y-4 select-none text-[10px] text-zinc-500">
            <div className="space-y-1">
              <span className="font-bold text-zinc-400 uppercase tracking-widest text-[9px]">Environment:</span>
              <p className="font-mono text-zinc-600">Cloud Run Isolation Platform</p>
            </div>
            
            <button 
              onClick={handleOAuthSetup}
              className="w-full py-2 px-3 bg-[#181A1C] hover:bg-[#1D2024] text-zinc-400 hover:text-white rounded-lg text-[9px] font-mono font-bold cursor-pointer transition text-center block tracking-widest uppercase border border-[#24272C]"
            >
              Configure OAuth scopes
            </button>
          </div>
        </aside>

        {/* CONTAINER VIEWPORTS PORTALS COMPONENT ROUTING */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full transition overflow-y-auto space-y-6">
          
          {/* SYSTEM WIDE WARNING NOTICES */}
          {activePage !== 'audit_log' && (
            <div className="hidden lg:flex items-center justify-between bg-[#181A1C] border border-[#24272C] rounded-2xl p-4 select-none animate-fadeIn no-print shadow-sm">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00B67A] shrink-0 animate-pulse" />
                <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                  Accounting Ledger Context: <b className="text-white font-sans text-xs">{currentCompany?.name} ({currentCompany?.code})</b>
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-500 tracking-wider uppercase">
                <Activity className="w-3 h-3 text-[#00B67A] shrink-0" />
                <span>Routines: Fully compliant with Philippine Treasury regulations.</span>
              </div>
            </div>
          )}

          {/* PAGE COMPONENT BINDINGS */}
          {activePage === 'dashboard' && (
            <Dashboard 
              userId={activeUserId} 
              companyId={activeCompanyId}
              isConsolidated={isGroupAdmin(activeUserId)}
              onNavigate={(tab) => {
                if (tab === 'general_journal') {
                  setActivePage('ledger');
                } else {
                  setActivePage(tab as any);
                }
              }}
            />
          )}

          {activePage === 'ledger' && (
            <Ledger 
              userId={activeUserId} 
              companyId={activeCompanyId} 
              onAuditLogged={forceTriggerAuditTrail}
            />
          )}

          {/* Re-routed to unified Workspace Sync Center */}

          {activePage === 'budgets' && (
            <Budgets 
              userId={activeUserId} 
              companyId={activeCompanyId} 
              onAuditLogged={forceTriggerAuditTrail}
            />
          )}

          {activePage === 'pay_rec' && (
            <PayablesReceivables 
              userId={activeUserId} 
              companyId={activeCompanyId} 
              onAuditLogged={forceTriggerAuditTrail}
            />
          )}

          {activePage === 'payroll' && (
            <Payroll 
              userId={activeUserId} 
              companyId={activeCompanyId} 
              onAuditLogged={forceTriggerAuditTrail}
            />
          )}

          {activePage === 'reports' && (
            <Reports 
              userId={activeUserId} 
              companyId={activeCompanyId} 
            />
          )}

          {activePage === 'enterprise' && (
            <EnterpriseSuite 
              userId={activeUserId} 
              companyId={activeCompanyId}
              onAuditLogged={forceTriggerAuditTrail}
            />
          )}

          {activePage === 'tax_compliance' && (
            <TaxComplianceDashboard 
              userId={activeUserId} 
              companyId={activeCompanyId}
              onAuditLogged={forceTriggerAuditTrail}
            />
          )}

          {activePage === 'audit_log' && (
            <AuditLog userId={activeUserId} companyId={activeCompanyId} />
          )}

          {(activePage === 'workspace' || activePage === 'approvals') && (
            <WorkspaceSyncCenter 
              userId={activeUserId} 
              companyId={activeCompanyId}
              onAuditLogged={forceTriggerAuditTrail}
              onRequestOAuth={handleOAuthSetup}
            />
          )}

        </main>
      </div>

      {/* MOBILE BAR MENU SLIDER POPUP PORTAL OVERLAY */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden animate-fadeIn">
          <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col justify-between animate-slideRight">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <span className="font-bold font-mono text-xs text-indigo-400">SIDEBAR OVERVIEW</span>
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
                  onClick={() => { setActivePage('dashboard'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span>Overview Dashboard</span>
                </button>
                <button 
                  onClick={() => { setActivePage('ledger'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <Coins className="w-4 h-4 text-gray-400" />
                  <span>Transaction Journal</span>
                </button>
                <button 
                  onClick={() => { setActivePage('approvals'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <FileSignature className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>Approvals queue</span>
                </button>
                <button 
                  onClick={() => { setActivePage('budgets'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <PiggyBank className="w-4 h-4 text-gray-400" />
                  <span>Budgets monitor</span>
                </button>
                <button 
                  onClick={() => { setActivePage('pay_rec'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <FolderMinus className="w-4 h-4 text-gray-400" />
                  <span>Corporate AP/AR</span>
                </button>
                <button 
                  onClick={() => { setActivePage('payroll'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>Payroll compensation</span>
                </button>
                <button 
                  onClick={() => { setActivePage('reports'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>Analytical Executive sheets</span>
                </button>
                <button 
                  onClick={() => { setActivePage('enterprise'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-gray-400" />
                  <span>Enterprise Suite Hub</span>
                </button>
                <button 
                  onClick={() => { setActivePage('tax_compliance'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <Percent className="w-4 h-4 text-gray-400" />
                  <span>PH TAX Compliance Hub</span>
                </button>
                <button 
                  onClick={() => { setActivePage('audit_log'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer font-mono"
                >
                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                  <span>Compliance logs</span>
                </button>
                <button 
                  onClick={() => { setActivePage('workspace'); setMobileSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-gray-800 text-left cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span>Workspace Sync Center</span>
                </button>
              </nav>
            </div>

            <div className="p-4 border-t border-gray-800 text-[10px] text-gray-500 font-mono text-center">
              FM Sandbox Platform
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
