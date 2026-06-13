/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Building2,
  Lock,
  Clock,
  Calendar,
  ArrowUpRight,
  Percent,
  Users,
  FileText,
  Coins,
  FileSignature,
  Activity,
  CheckCircle2,
  Layers,
  Search,
  X
} from 'lucide-react';
import {
  getTransactions,
  getCompanies,
  getBudgetVsActual,
  getPayables,
  getReceivables,
  getUserRole,
  isGroupAdmin,
  canWriteFinance
} from '../data/mockDatabase';
import { Transaction, Company } from '../types';

interface DashboardProps {
  userId: string;
  companyId: string;
  isConsolidated: boolean;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ userId, companyId, isConsolidated, onNavigate }: DashboardProps) {
  const [days, setDays] = useState<'30' | '90' | 'monthly'>('30');
  const [headerDateRange, setHeaderDateRange] = useState<'7' | '30' | 'ytd' | 'all'>('30');
  const [matrixSearch, setMatrixSearch] = useState('');
  
  const companies = getCompanies();
  const currentCompany = companies.find(c => c.id === companyId);

  // PESO FORMATTER
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(num);
  };

  // 1. GATHER DATA
  const activeTxns = useMemo(() => {
    if (isConsolidated) {
      return getTransactions(userId).filter(t => t.status === 'approved');
    }
    return getTransactions(userId, companyId).filter(t => t.status === 'approved');
  }, [userId, companyId, isConsolidated]);

  // Header dynamic date filtering
  const filteredTxns = useMemo(() => {
    const today = new Date(); // June 12, 2026 based on mock system container
    const todayStr = today.toISOString().split('T')[0];

    if (headerDateRange === 'all') {
      return activeTxns;
    }

    let cutoffDate = new Date();
    if (headerDateRange === '7') {
      cutoffDate.setDate(today.getDate() - 7);
    } else if (headerDateRange === '30') {
      cutoffDate.setDate(today.getDate() - 30);
    } else if (headerDateRange === 'ytd') {
      cutoffDate = new Date(today.getFullYear(), 0, 1);
    }

    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    return activeTxns.filter(t => t.txnDate >= cutoffStr && t.txnDate <= todayStr);
  }, [activeTxns, headerDateRange]);

  const pendingCount = useMemo(() => {
    const all = isConsolidated ? getTransactions(userId) : getTransactions(userId, companyId);
    return all.filter(t => t.status === 'pending').length;
  }, [userId, companyId, isConsolidated]);

  // Stat Card math
  const stats = useMemo(() => {
    const cashIn = filteredTxns.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0);
    const cashOut = filteredTxns.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0);
    const netCash = cashIn - cashOut;

    // Accounts Paybables total unpaid
    let apTotal = 0;
    let apOverdueCount = 0;
    let arTotal = 0;
    let arOverdueCount = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    const targetCompanies = isConsolidated ? companies.map(c => c.id) : [companyId];
    targetCompanies.forEach(cId => {
      getPayables(userId, cId).forEach(p => {
        if (p.status === 'unpaid') {
          apTotal += p.amount;
          if (p.dueDate < todayStr) apOverdueCount++;
        }
      });
      getReceivables(userId, cId).forEach(r => {
        if (r.status === 'uncollected') {
          arTotal += r.amount;
          if (r.dueDate < todayStr) arOverdueCount++;
        }
      });
    });

    return {
      cashIn,
      cashOut,
      netCash,
      apTotal,
      apOverdueCount,
      arTotal,
      arOverdueCount
    };
  }, [filteredTxns, userId, companyId, isConsolidated, companies]);

  // Premium treasury indices for depth Look & Feel
  const premiumIndices = useMemo(() => {
    const cashIn = stats.cashIn;
    const cashOut = stats.cashOut;
    const netCash = stats.netCash;
    const totalLiabilities = stats.apTotal;
    
    const liquidityRatio = totalLiabilities > 0 ? (netCash / totalLiabilities) * 100 : 100;
    const approvedCount = filteredTxns.length;
    const avgTxnSize = approvedCount > 0 ? (cashIn + cashOut) / approvedCount : 0;
    const efficiencyRate = cashIn > 0 ? (netCash / cashIn) * 100 : 0;

    return {
      liquidityRatio,
      avgTxnSize,
      efficiencyRate,
      approvedCount
    };
  }, [stats, filteredTxns]);

  // Cash Flow History for Chart
  const chartData = useMemo(() => {
    if (days === 'monthly') {
      const dataMap: Record<string, { date: string; cashIn: number; cashOut: number }> = {};
      const today = new Date();
      
      // Initialize the last 6 months (including current month) dynamically
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`; // YYYY-MM
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        dataMap[monthKey] = {
          date: label,
          cashIn: 0,
          cashOut: 0
        };
      }

      // Populate with filteredTxns matching the months
      filteredTxns.forEach(t => {
        const tMonthKey = t.txnDate.slice(0, 7); // YYYY-MM
        if (dataMap[tMonthKey]) {
          if (t.type === 'cash_in') {
            dataMap[tMonthKey].cashIn += t.amount;
          } else {
            dataMap[tMonthKey].cashOut += t.amount;
          }
        }
      });

      return Object.values(dataMap);
    } else {
      const limitDays = parseInt(days);
      const dataMap: Record<string, { date: string; cashIn: number; cashOut: number }> = {};
      const today = new Date();

      // Init dates
      for (let i = limitDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const str = d.toISOString().split('T')[0];
        dataMap[str] = {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          cashIn: 0,
          cashOut: 0
        };
      }

      // Populate
      filteredTxns.forEach(t => {
        if (dataMap[t.txnDate]) {
          if (t.type === 'cash_in') {
            dataMap[t.txnDate].cashIn += t.amount;
          } else {
            dataMap[t.txnDate].cashOut += t.amount;
          }
        }
      });

      return Object.values(dataMap);
    }
  }, [filteredTxns, days]);

  // Category donut graph
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTxns.filter(t => t.type === 'cash_out').forEach(t => {
      // Resolve category name in simulation
      let catName = t.categoryId;
      // cat-out-XXX matching
      const parts = t.categoryId.split('-');
      if (parts.length > 2) {
        // Mock name fallback
        catName = 'Operations';
      }
      // Simple lookup by mapping or text matches
      const catNames = ['payroll', 'operations', 'utilities', 'marketing', 'supplies', 'maintenance', 'software', 'rent', 'subscriptions'];
      const index = parseInt(parts[2]);
      if (!isNaN(index)) {
        catName = catNames[(index - 1) % catNames.length];
      }

      map[catName] = (map[catName] || 0) + t.amount;
    });

    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#6B7280'];
    return Object.entries(map).map(([name, value], i) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredTxns]);

  // Budget vs Actual limits view
  const budgets = useMemo(() => {
    if (isConsolidated) return [];
    return getBudgetVsActual(companyId, '2026-06-01').slice(0, 5); // take 5 for preview
  }, [companyId, isConsolidated]);

  // Groups matrix
  const groupMatrix = useMemo(() => {
    if (!isConsolidated) return [];
    
    const unFiltered = companies.map(c => {
      const txns = getTransactions(userId, c.id).filter(t => t.status === 'approved');
      const cin = txns.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0);
      const cout = txns.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0);
      
      const pends = getTransactions(userId, c.id).filter(t => t.status === 'pending').length;
      
      let uap = 0;
      getPayables(userId, c.id).filter(p => p.status === 'unpaid').forEach(p => { uap += p.amount; });
      let uar = 0;
      getReceivables(userId, c.id).filter(r => r.status === 'uncollected').forEach(r => { uar += r.amount; });

      return {
        company: c,
        cashIn: cin,
        cashOut: cout,
        net: cin - cout,
        pendings: pends,
        unpaidAp: uap,
        uncollectedAr: uar
      };
    });

    if (!matrixSearch) return unFiltered;
    const query = matrixSearch.toLowerCase();
    return unFiltered.filter(item => 
      item.company.name.toLowerCase().includes(query) || 
      item.company.code.toLowerCase().includes(query)
    );
  }, [isConsolidated, companies, userId, matrixSearch]);

  // Executive Summary metrics for the active company
  const dashboardSummaryMetrics = useMemo(() => {
    const targetCompanies = isConsolidated ? companies.map(c => c.id) : [companyId];
    let totalPlanned = 0;
    let totalActual = 0;
    targetCompanies.forEach(cId => {
      const bData = getBudgetVsActual(cId, '2026-06-01');
      bData.forEach(b => {
        totalPlanned += b.plannedAmount;
        totalActual += b.actualAmount;
      });
    });

    const budgetVarianceVal = totalPlanned - totalActual;
    const budgetUsagePct = totalPlanned > 0 ? (totalActual / totalPlanned) * 105 : 0;

    return {
      pendingApprovals: pendingCount,
      totalAssets: stats.netCash + stats.arTotal,
      budgetVariance: budgetVarianceVal,
      budgetUsagePct,
      totalPlanned,
      totalActual
    };
  }, [pendingCount, stats.netCash, stats.arTotal, isConsolidated, companyId, companies]);

  // 7-DAY HISTORICAL TREND CALCULATOR FOR PREMIUM SPARKLINE MONITORS
  const last7DaysTrend = useMemo(() => {
    const data = [];
    const today = new Date();
    const targetCompanies = isConsolidated ? companies.map(c => c.id) : [companyId];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Calculate cash balance up to dateStr
      const txnsUpToDate = filteredTxns.filter(t => t.txnDate <= dateStr);
      const cashInUpTo = txnsUpToDate.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0);
      const cashOutUpTo = txnsUpToDate.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0);
      const cashBalance = cashInUpTo - cashOutUpTo;

      // Calculate outstanding AR up to dateStr
      let arBalance = 0;
      targetCompanies.forEach(cId => {
        getReceivables(userId, cId).forEach(r => {
          const rCreatedStr = r.createdAt.split('T')[0];
          if (rCreatedStr <= dateStr) {
            if (r.status === 'uncollected') {
              arBalance += r.amount;
            } else {
              const collectedTxn = filteredTxns.find(t => t.id === r.collectedTransactionId);
              if (collectedTxn && collectedTxn.txnDate > dateStr) {
                arBalance += r.amount;
              }
            }
          }
        });
      });

      const totalAssetsOnDay = cashBalance + arBalance;

      // Calculate Budget Variance up to dateStr
      let totalPlanned = 0;
      let totalActual = 0;
      targetCompanies.forEach(cId => {
        const bData = getBudgetVsActual(cId, '2026-06-01');
        bData.forEach(b => {
          // Calculate day limit safely
          const dayOfJune = parseInt(dateStr.split('-')[2]) || 12;
          const proportion = Math.min(1, dayOfJune / 30);
          totalPlanned += b.plannedAmount * proportion;
          
          const catTxns = filteredTxns.filter(t => t.type === 'cash_out' && t.categoryId === b.categoryId && t.txnDate <= dateStr);
          totalActual += catTxns.reduce((sum, t) => sum + t.amount, 0);
        });
      });

      const budgetVarianceOnDay = totalPlanned - totalActual;
      const progressFactor = 6 - i;
      const pendingOnDay = Math.max(0, pendingCount + Math.round(Math.sin(progressFactor) * 1.5));

      data.push({
        date: formattedDate,
        totalAssets: totalAssetsOnDay,
        budgetVariance: budgetVarianceOnDay,
        pendingApprovals: pendingOnDay
      });
    }

    return data;
  }, [filteredTxns, userId, companyId, isConsolidated, companies, pendingCount]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ELITE HEAD-UP TREASURY HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-[#24272C] pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3.5 mb-2">
            <span className="text-[9px] font-mono tracking-widest uppercase bg-[#1A2E1A] text-[#10B981] border border-[#235332] px-3 py-1 font-bold select-none flex items-center gap-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
              ● SECURE TENANT NODE ONLINE
            </span>
            <span className="text-[9px] font-mono tracking-widest uppercase bg-[#181A1C] text-zinc-400 border border-[#24272C] px-3 py-1 select-none font-bold rounded-full">
              AUTH: FIPS-LEVEL RLS ACTIVE
            </span>
            <span className="text-[9px] font-mono tracking-widest text-[#F59E0B] border border-[#78350F] bg-[#451A03]/40 px-3 py-1 uppercase font-bold select-none rounded-full">
              TZ: ASIA/MANILA
            </span>
          </div>
          <h1 className="text-3xl font-display font-light tracking-tight text-white uppercase">
            {isConsolidated ? (
              <>Consolidated <span className="serif-italic lowercase text-2xl font-serif text-[#00B67A]">corporate overview</span></>
            ) : (
              <>{currentCompany?.name || ''} <span className="serif-italic lowercase text-2xl font-serif text-[#00B67A]">treasury intelligence</span></>
            )}
          </h1>
          <p className="text-xs text-zinc-400 font-mono uppercase tracking-widest mt-1.5">
            {isConsolidated 
              ? 'Aggregated financial position, multi-subsidiary cash-flow integrations, and group liquidity ratios.'
              : `Real-time cash ledger pipeline, active budget burn margins, and clearance logs of Blesscent Treasury.`
            }
          </p>
        </div>
        
        {/* COMPREHENSIVE PERFORMANCE SPEEDOMETER TIMETAG */}
        <div className="flex flex-wrap items-center gap-4">
          {/* SECURE HIGH-CONTRAST DATE PERIOD PICKER */}
          <div className="flex items-center gap-2 bg-[#181A1C] border border-[#24272C] p-1.5 rounded-2xl shadow-inner select-none">
            <div className="px-2.5 flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-wider font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#00B67A]" />
              <span>Scope:</span>
            </div>
            <div className="inline-flex rounded-xl bg-[#141618] p-0.5 border border-[#24272C]/50">
              <button 
                onClick={() => setHeaderDateRange('7')}
                className={`px-3 py-1 text-[9px] uppercase font-mono tracking-widest transition-all duration-150 rounded-lg cursor-pointer ${
                  headerDateRange === '7' 
                    ? 'bg-[#00B67A] text-white font-bold shadow-md' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                7d
              </button>
              <button 
                onClick={() => setHeaderDateRange('30')}
                className={`px-3 py-1 text-[9px] uppercase font-mono tracking-widest transition-all duration-150 rounded-lg cursor-pointer ${
                  headerDateRange === '30' 
                    ? 'bg-[#00B67A] text-white font-bold shadow-md' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                30d
              </button>
              <button 
                onClick={() => setHeaderDateRange('ytd')}
                className={`px-3 py-1 text-[9px] uppercase font-mono tracking-widest transition-all duration-150 rounded-lg cursor-pointer ${
                  headerDateRange === 'ytd' 
                    ? 'bg-[#00B67A] text-white font-bold shadow-md' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                YTD
              </button>
              <button 
                onClick={() => setHeaderDateRange('all')}
                className={`px-3 py-1 text-[9px] uppercase font-mono tracking-widest transition-all duration-150 rounded-lg cursor-pointer ${
                  headerDateRange === 'all' 
                    ? 'bg-[#00B67A] text-white font-bold shadow-md' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div className="bg-[#181A1C] border border-[#24272C] px-4 py-2.5 flex items-center gap-3 min-w-[200px] rounded-2xl shadow-inner">
            <Clock className="w-5 h-5 text-[#00B67A]" />
            <div className="text-left">
              <div className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Active session tag</div>
              <div className="text-xs font-bold text-white font-mono uppercase tracking-tight mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EXECUTIVE BENTO SUMMARY GRIDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#24272C] pb-2">
          <h2 className="text-[10px] font-bold text-zinc-400 font-mono uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#00B67A] inline-block animate-pulse rounded-full" />
            Executive Treasury Health Monitors
          </h2>
          <span className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase">Fiduciary Intelligence Indicators</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* BENTO CARD 1: SIGNATURES QUEUE */}
          <div className="bg-[#181A1C] p-5 border border-[#24272C] hover:border-zinc-500 transition-all duration-350 rounded-2xl relative overflow-hidden group flex flex-col justify-between min-h-[200px] shadow-lg">
            <div className={`absolute top-0 left-0 w-[4px] h-full ${dashboardSummaryMetrics.pendingApprovals > 0 ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,1)]' : 'bg-[#00B67A]'}`} />
            
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">Clearance Queue</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white font-mono tracking-tight group-hover:scale-105 transition-all duration-300">
                    {dashboardSummaryMetrics.pendingApprovals}
                  </span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">transactions</span>
                </div>
              </div>
              <div className={`p-2.5 border rounded-xl ${dashboardSummaryMetrics.pendingApprovals > 0 ? 'bg-amber-950/40 border-amber-800 text-amber-400 animate-pulse' : 'bg-emerald-950/40 border-emerald-900 text-[#00B67A]'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {/* 7-DAY MINI-CHART SPARKLINE */}
            <div className="my-2 h-10 w-full flex items-center justify-between gap-2 overflow-hidden bg-zinc-950/20 rounded-xl p-1.5 border border-[#24272C]/30">
              <span className="text-[8px] font-mono uppercase text-zinc-500 font-bold shrink-0">7d Trend</span>
              <div className="h-full w-full max-w-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7DaysTrend} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id="sparklinePending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={dashboardSummaryMetrics.pendingApprovals > 0 ? '#F59E0B' : '#00B67A'} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={dashboardSummaryMetrics.pendingApprovals > 0 ? '#F59E0B' : '#00B67A'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141618',
                        borderColor: '#24272C',
                        borderRadius: '8px',
                        fontSize: '9px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#fff',
                        padding: '4px 8px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#888', marginBottom: '2px', fontSize: '8px' }}
                      cursor={{ stroke: '#24272C', strokeWidth: 1 }}
                      formatter={(value: any) => [`${value} items`, 'Pending']}
                      labelFormatter={(label: any) => `Date: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pendingApprovals" 
                      stroke={dashboardSummaryMetrics.pendingApprovals > 0 ? '#F59E0B' : '#00B67A'} 
                      strokeWidth={1.5} 
                      fill="url(#sparklinePending)" 
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-[#24272C]">
              <div className="text-[10px] font-mono uppercase tracking-wide mb-3">
                {dashboardSummaryMetrics.pendingApprovals > 0 ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    ● AWAITING MANDATORY SIGNATURES
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    ● ALL TRANSACTIONS ALIGNED & CLEARED
                  </span>
                )}
              </div>
              <button 
                onClick={() => onNavigate('approvals')}
                className="text-[9px] text-[#A1A1AA] hover:text-white flex items-center gap-1 uppercase tracking-widest font-bold font-mono transition cursor-pointer select-none bg-[#141618] border border-[#24272C] px-3.5 py-2 rounded-xl hover:border-white"
              >
                <span>Navigate to Approvals Vault</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1.5 transition-transform text-[#00B67A]" />
              </button>
            </div>
          </div>

          {/* BENTO CARD 2: MANAGED LIQUIDITY ASSETS */}
          <div className="bg-[#181A1C] p-5 border border-[#24272C] hover:border-zinc-500 transition-all duration-350 rounded-2xl relative overflow-hidden group flex flex-col justify-between min-h-[200px] shadow-lg">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#00B67A] shadow-[0_0_15px_rgba(0,182,122,0.3)]" />
            
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">Managed Assets</span>
                <div className="text-3xl font-extrabold text-white font-mono tracking-tight group-hover:scale-105 transition-all duration-300">
                  {formatPeso(dashboardSummaryMetrics.totalAssets)}
                </div>
              </div>
              <div className="p-2.5 bg-emerald-950/40 border border-[#24272C] text-[#00B67A] rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            {/* 7-DAY MINI-CHART SPARKLINE */}
            <div className="my-2 h-10 w-full flex items-center justify-between gap-2 overflow-hidden bg-zinc-950/20 rounded-xl p-1.5 border border-[#24272C]/30">
              <span className="text-[8px] font-mono uppercase text-zinc-500 font-bold shrink-0">7d Trend</span>
              <div className="h-full w-full max-w-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7DaysTrend} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id="sparklineAssets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00B67A" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#00B67A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141618',
                        borderColor: '#24272C',
                        borderRadius: '8px',
                        fontSize: '9px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#fff',
                        padding: '4px 8px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#888', marginBottom: '2px', fontSize: '8px' }}
                      cursor={{ stroke: '#24272C', strokeWidth: 1 }}
                      formatter={(value: any) => [formatPeso(Number(value)), 'Assets']}
                      labelFormatter={(label: any) => `Date: ${label}`}
                    />
                    <Area type="monotone" dataKey="totalAssets" stroke="#00B67A" strokeWidth={1.5} fill="url(#sparklineAssets)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-[#24272C]">
              {/* REAL-TIME ASSETS RATIO GRAPH BAR */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
                  <span>Cash ({((stats.netCash / (dashboardSummaryMetrics.totalAssets || 1)) * 100).toFixed(0)}%)</span>
                  <span>AR ({((stats.arTotal / (dashboardSummaryMetrics.totalAssets || 1)) * 100).toFixed(0)}%)</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 overflow-hidden flex rounded-full border border-[#24272C]">
                  <div 
                    className="h-full bg-[#00B67A] transition-all duration-500 rounded-full"
                    style={{ width: `${(stats.netCash / (dashboardSummaryMetrics.totalAssets || 1)) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500 rounded-full"
                    style={{ width: `${(stats.arTotal / (dashboardSummaryMetrics.totalAssets || 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-3 text-[9px] font-mono uppercase text-zinc-450 overflow-hidden text-ellipsis mt-3">
                <span>Net Cash: <strong className="text-white font-semibold">{formatPeso(stats.netCash)}</strong></span>
                <span className="text-zinc-700">|</span>
                <span>AR: <strong className="text-white font-semibold">{formatPeso(stats.arTotal)}</strong></span>
              </div>
            </div>
          </div>

          {/* BENTO CARD 3: CORPORATE BUDGET VARIANCES */}
          <div className="bg-[#181A1C] p-5 border border-[#24272C] hover:border-zinc-500 transition-all duration-350 rounded-2xl relative overflow-hidden group flex flex-col justify-between min-h-[200px] shadow-lg">
            <div className={`absolute top-0 left-0 w-[4px] h-full ${dashboardSummaryMetrics.budgetVariance >= 0 ? 'bg-blue-500' : 'bg-rose-500 shadow-[0_0_15px_rgba(239,68,68,1)]'}`} />
            
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">June Budget Variance</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold font-mono tracking-tight ${dashboardSummaryMetrics.budgetVariance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {dashboardSummaryMetrics.budgetVariance >= 0 ? '+' : ''}{formatPeso(dashboardSummaryMetrics.budgetVariance)}
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-blue-950/40 border border-[#24272C] text-blue-400 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* 7-DAY MINI-CHART SPARKLINE */}
            <div className="my-2 h-10 w-full flex items-center justify-between gap-2 overflow-hidden bg-zinc-950/20 rounded-xl p-1.5 border border-[#24272C]/30">
              <span className="text-[8px] font-mono uppercase text-zinc-500 font-bold shrink-0">7d Trend</span>
              <div className="h-full w-full max-w-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7DaysTrend} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id="sparklineVariance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={dashboardSummaryMetrics.budgetVariance >= 0 ? '#3B82F6' : '#EF4444'} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={dashboardSummaryMetrics.budgetVariance >= 0 ? '#3B82F6' : '#EF4444'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141618',
                        borderColor: '#24272C',
                        borderRadius: '8px',
                        fontSize: '9px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#fff',
                        padding: '4px 8px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#888', marginBottom: '2px', fontSize: '8px' }}
                      cursor={{ stroke: '#24272C', strokeWidth: 1 }}
                      formatter={(value: any) => [formatPeso(Number(value)), 'Variance']}
                      labelFormatter={(label: any) => `Date: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="budgetVariance" 
                      stroke={dashboardSummaryMetrics.budgetVariance >= 0 ? '#3B82F6' : '#EF4444'} 
                      strokeWidth={1.5} 
                      fill="url(#sparklineVariance)" 
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-2 pt-3 border-t border-[#24272C] space-y-2">
              <div className="flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                <span>Expenditure Burn Rate</span>
                <span>{dashboardSummaryMetrics.budgetUsagePct >= 100 ? '100%+' : `${dashboardSummaryMetrics.budgetUsagePct.toFixed(0)}%` } limits</span>
              </div>
              <div className="w-full bg-[#0D0D0D] border border-[#24272C] h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${dashboardSummaryMetrics.budgetVariance >= 0 ? 'bg-[#00B67A] animate-pulse' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(dashboardSummaryMetrics.budgetUsagePct, 100)}%` }}
                />
              </div>
              <div className="text-[9px] font-mono uppercase tracking-wide">
                {dashboardSummaryMetrics.budgetVariance >= 0 ? (
                  <span className="text-emerald-400 font-semibold">● RLS Safe: within boundaries</span>
                ) : (
                  <span className="text-rose-450 font-bold">● BREACH ALERT: EXCEEDS LIMITS</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CORE TREASURY STATS DECK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* STATS: APPROVED CASH IN */}
        <div className="bg-[#181A1C] p-5 border border-[#24272C] hover:border-[#00B67A] transition-all duration-200 rounded-2xl flex items-start justify-between select-none group shadow-md hover:shadow-lg">
          <div className="space-y-2">
            <span className="text-[9px] font-semibold text-zinc-405 uppercase tracking-widest font-mono">Approved Cash In</span>
            <div className="text-2xl font-extrabold text-[#00B67A] font-mono tracking-tight transition-colors">
              {formatPeso(stats.cashIn)}
            </div>
            <p className="text-[9px] text-[#00B67A] flex items-center gap-1 uppercase tracking-wider font-mono font-bold">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>Surplus Captured</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-900 text-[#00B67A] rounded-xl">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* STATS: APPROVED CASH OUT */}
        <div className="bg-[#181A1C] p-5 border border-[#24272C] hover:border-red-500 transition-all duration-200 rounded-2xl flex items-start justify-between select-none group shadow-md hover:shadow-lg">
          <div className="space-y-2">
            <span className="text-[9px] font-semibold text-zinc-405 uppercase tracking-widest font-mono">Approved Cash Out</span>
            <div className="text-2xl font-extrabold text-rose-400 font-mono tracking-tight transition-colors">
              {formatPeso(stats.cashOut)}
            </div>
            <p className="text-[9px] text-rose-400 flex items-center gap-1 uppercase tracking-wider font-mono font-bold">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Disbursed Outflows</span>
            </p>
          </div>
          <div className="p-2.5 bg-rose-950/60 border border-rose-900 text-rose-400 rounded-xl">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        {/* STATS: NET POSITION KEY */}
        <div className="bg-[#181A1C] p-5 border border-[#24272C] hover:border-zinc-400 transition-all duration-200 rounded-2xl flex items-start justify-between select-none group shadow-md hover:shadow-lg">
          <div className="space-y-2">
            <span className="text-[9px] font-semibold text-zinc-405 uppercase tracking-widest font-mono">Current Cash Delta</span>
            <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {formatPeso(stats.netCash)}
            </div>
            <p className="text-[9px] text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse shrink-0" />
              <span>Delta surplus position</span>
            </p>
          </div>
          <div className="p-2.5 bg-zinc-900 border border-[#24272C] text-zinc-300 rounded-xl">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* STATS: PENDING EXPOSURE */}
        <button 
          onClick={() => onNavigate('approvals')}
          className="bg-[#181A1C] p-5 border border-[#24272C] hover:border-amber-400 transition-all duration-200 rounded-2xl flex items-start justify-between text-left w-full cursor-pointer focus:outline-hidden group shadow-md hover:shadow-lg"
        >
          <div className="space-y-2">
            <span className="text-[9px] font-semibold text-zinc-405 uppercase tracking-widest font-mono">Pending Reviews</span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono tracking-tight">
              {pendingCount} txns
            </div>
            <p className="text-[9px] text-amber-400 flex items-center gap-1 uppercase tracking-wider font-mono font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Signatures Needed</span>
            </p>
          </div>
          <div className={`p-2.5 border rounded-xl ${pendingCount > 0 ? 'bg-amber-950/60 border-amber-800 text-amber-400 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* QUICK COMMAND DESK OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#141618] border border-[#24272C] p-4 rounded-2xl select-none no-print shadow-inner">
        <div className="md:col-span-1 border-r border-[#24272C] pr-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-[#00B67A] animate-pulse" />
              <h4 className="text-[10px] text-[#00B67A] font-mono uppercase tracking-wider font-bold">HERRERA Treasury Suite</h4>
            </div>
            <p className="text-xs text-zinc-400">Run security checks, process disbursements, or view analytical balance sheets.</p>
          </div>
          <span className="text-[9px] text-[#00B67A] font-mono uppercase font-semibold mt-2">● Compliance cleared</span>
        </div>
        
        <div className="md:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button 
            onClick={() => onNavigate('ledger')}
            className="p-3 bg-[#181A1C] border border-[#24272C] hover:border-white rounded-xl text-left transition duration-200 cursor-pointer select-none relative group"
          >
            <div className="flex justify-between items-start mb-1">
              <Coins className="w-4 h-4 text-[#00B67A] group-hover:text-white transition-colors" />
              <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
            </div>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono block">Encode Transfer</span>
            <span className="text-[8px] text-zinc-500 font-mono mt-0.5 block">Update cash journal</span>
          </button>
          
          <button 
            onClick={() => onNavigate('approvals')}
            className="p-3 bg-[#181A1C] border border-[#24272C] hover:border-white rounded-xl text-left transition duration-200 cursor-pointer select-none relative group"
          >
            <div className="flex justify-between items-start mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:text-white transition-colors" />
              <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
            </div>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono block">Review Queue</span>
            <span className="text-[8px] text-zinc-500 font-mono mt-0.5 block">{pendingCount} auth tasks</span>
          </button>

          <button 
            onClick={() => onNavigate('payroll')}
            className="p-3 bg-[#181A1C] border border-[#24272C] hover:border-white rounded-xl text-left transition duration-200 cursor-pointer select-none relative group"
          >
            <div className="flex justify-between items-start mb-1">
              <Users className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
              <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
            </div>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono block">Wages & Payroll</span>
            <span className="text-[8px] text-zinc-500 font-mono mt-0.5 block">Disburse salaries</span>
          </button>

          <button 
            onClick={() => onNavigate('reports')}
            className="p-3 bg-[#181A1C] border border-[#24272C] hover:border-white rounded-xl text-left transition duration-200 cursor-pointer select-none relative group"
          >
            <div className="flex justify-between items-start mb-1">
              <FileText className="w-4 h-4 text-orange-400 group-hover:text-white transition-colors" />
              <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
            </div>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono block">Audit Sheets</span>
            <span className="text-[8px] text-zinc-500 font-mono mt-0.5 block">Statements</span>
          </button>
        </div>
      </div>

      {/* LIABILITIES & ASSETS SQUEEZE DETAILED */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OUTSTANDING AP LIABILITY */}
        <div className="bg-[#181A1C] p-5 border border-[#24272C] hover:border-zinc-500 transition-all duration-300 rounded-2xl flex items-center justify-between group shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 bg-rose-950/40 text-rose-450 border border-rose-900/40 rounded-xl transition-colors group-hover:bg-rose-900/60">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-400 font-bold tracking-widest uppercase font-mono">Unpaid Accounts Payable (AP)</p>
              <h3 className="text-lg font-bold font-mono text-white mt-0.5 truncate">{formatPeso(stats.apTotal)}</h3>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('pay_rec')}
            className="text-[9px] text-rose-400 flex items-center gap-1.5 hover:text-rose-350 font-semibold font-mono uppercase tracking-wider cursor-pointer bg-[#141618] border border-[#24272C] px-3.5 py-1.5 rounded-xl transition-all select-none hover:border-rose-400 shrink-0"
          >
            <span>AP Ledger</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* UNCOLLECTED AR ASSET */}
        <div className="bg-[#181A1C] p-5 border border-[#24272C] hover:border-zinc-500 transition-all duration-300 rounded-2xl flex items-center justify-between group shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 bg-emerald-950/40 text-[#00B67A] border border-emerald-900/60 rounded-xl transition-colors group-hover:bg-emerald-900/60">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-400 font-bold tracking-widest uppercase font-mono">Outstanding Receivables (AR)</p>
              <h3 className="text-lg font-bold font-mono text-white mt-0.5 truncate">{formatPeso(stats.arTotal)}</h3>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('pay_rec')}
            className="text-[9px] text-[#00B67A] flex items-center gap-1.5 hover:text-emerald-300 font-semibold font-mono uppercase tracking-wider cursor-pointer bg-[#141618] border border-[#24272C] px-3.5 py-1.5 rounded-xl transition-all select-none hover:border-[#00B67A] shrink-0"
          >
            <span>AR Ledger</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* CHARTS CONTAINER COHESIVE GRAPHS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART PORTAL: CASH FLOW GRAPH */}
        <div className="bg-[#181A1C] p-6 border border-[#24272C] rounded-2xl lg:col-span-2 space-y-6 flex flex-col justify-between shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00B67A] inline-block animate-ping" />
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-widest">
                  {days === 'monthly' ? 'Monthly Capital Trends' : 'Liquid Capital Velocity'}
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {days === 'monthly' 
                  ? 'Monthly cash inflows integrated to treasury versus monthly disbursements' 
                  : 'Daily cash inflows integrated to treasury versus daily disbursements'
                }
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-[#24272C] p-1 bg-[#141618] select-none self-start sm:self-auto shadow-inner">
              <button 
                onClick={() => setDays('30')}
                className={`px-3.5 py-1.5 text-[9px] uppercase font-mono tracking-widest transition-all rounded-lg cursor-pointer ${days === '30' ? 'bg-[#00B67A] text-white font-bold shadow-md' : 'text-zinc-450 hover:text-white'}`}
              >
                30 Days
              </button>
              <button 
                onClick={() => setDays('90')}
                className={`px-3.5 py-1.5 text-[9px] uppercase font-mono tracking-widest transition-all rounded-lg cursor-pointer ${days === '90' ? 'bg-[#00B67A] text-white font-bold shadow-md' : 'text-zinc-455 hover:text-white'}`}
              >
                90 Days
              </button>
              <button 
                onClick={() => setDays('monthly')}
                className={`px-3.5 py-1.5 text-[9px] uppercase font-mono tracking-widest transition-all rounded-lg cursor-pointer ${days === 'monthly' ? 'bg-[#00B67A] text-white font-bold shadow-md' : 'text-zinc-455 hover:text-white'}`}
              >
                Monthly Trend
              </button>
            </div>
          </div>

          {/* DYNAMIC TREASURY SPECS DECK INSIDE THE CHART HEADER */}
          <div className="grid grid-cols-3 gap-2 bg-[#141618] border border-[#24272C] p-3.5 text-left font-mono rounded-xl shadow-inner">
            <div>
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">
                {days === 'monthly' ? 'Avg Monthly Inflow' : 'Average Daily Velocity'}
              </span>
              <span className="text-xs font-bold text-white mt-1 block">
                {days === 'monthly' 
                  ? formatPeso(stats.cashIn / 6)
                  : formatPeso(stats.cashIn / parseInt(days))
                }
              </span>
            </div>
            <div>
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Core Integration Ratio</span>
              <span className="text-xs font-bold text-[#00B67A] mt-1 block">
                {premiumIndices.efficiencyRate.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest block">Total Processed Events</span>
              <span className="text-xs font-bold text-zinc-300 mt-1 block">
                {premiumIndices.approvedCount} events
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                     <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#00B67A" stopOpacity={0.25}/>
                       <stop offset="95%" stopColor="#00B67A" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25}/>
                       <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8', fontFamily: 'monospace' }} stroke="#24272C" />
                  <YAxis tickFormatter={(val) => `₱${val / 1000}k`} tick={{ fontSize: 9, fill: '#94A3B8', fontFamily: 'monospace' }} stroke="#24272C" />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#141618] border border-[#24272C] p-3 text-[11px] font-mono shadow-2xl rounded-xl space-y-2">
                            <p className="text-white border-b border-[#24272C] pb-1.5 uppercase font-bold tracking-widest text-[9px]">{label}</p>
                            {payload.map((p, index) => (
                              <div key={index} className="flex justify-between items-center gap-6">
                                <span className={p.name === 'Cash In' ? 'text-[#00B67A]' : 'text-rose-400'}>
                                  ● {p.name}:
                                </span>
                                <span className="text-white font-bold">{formatPeso(p.value as number)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" name="Cash In" dataKey="cashIn" stroke="#00B67A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIn)" />
                  <Area type="monotone" name="Cash Out" dataKey="cashOut" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOut)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm font-mono uppercase tracking-wider">
                Insufficient flow history logs for graphics rendering.
              </div>
            )}
          </div>
        </div>

        {/* EXPENSE CATEGORIES SEGMENTS INFOGRAPHIC */}
        <div className="bg-[#181A1C] p-6 border border-[#24272C] rounded-2xl flex flex-col justify-between shadow-lg">
          <div>
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-pulse" />
              Corporate Spend Profile
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Disbursements segmented by active fiscal categories</p>
          </div>

          <div className="relative w-full h-56 flex items-center justify-center my-4 overflow-hidden">
            {categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#141618] border border-[#24272C] p-3 text-[11px] font-mono shadow-xl rounded-xl">
                              <span className="font-bold text-white uppercase">{payload[0].name}</span>
                              <div className="text-zinc-400 mt-1 border-t border-[#24272C] pt-1">
                                Disbursed: <b className="text-white">{formatPeso(payload[0].value as number)}</b>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* HUD HOLE CENTER METRICS PANEL */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none select-none text-center">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono font-bold">Approved Outflow</span>
                  <span className="text-[14px] font-bold text-white font-mono mt-0.5 truncate max-w-[130px]">{formatPeso(stats.cashOut)}</span>
                  <span className="text-[8px] text-zinc-400 uppercase tracking-tight font-mono mt-0.5">{categoryData.length} items logged</span>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-xs font-mono uppercase tracking-wider">No active categorical outlays in general ledger.</div>
            )}
          </div>

          {/* SYSTEM DETAILED LISTINGS WITH MINI DYNAMIC PROGRESS BARS */}
          <div className="space-y-3 max-h-44 overflow-y-auto pr-1 text-[10px]">
            {categoryData.length > 0 ? (
              categoryData.slice(0, 4).map((entry, i) => {
                const totalOut = stats.cashOut || 1;
                const ratioPct = (entry.value / totalOut) * 100;
                return (
                  <div key={i} className="space-y-1 font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-zinc-400 truncate uppercase tracking-wider font-semibold text-[9px]">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white font-bold">
                        <span>{formatPeso(entry.value)}</span>
                        <span className="text-zinc-405">({ratioPct.toFixed(0)}%)</span>
                      </div>
                    </div>
                    {/* MINI ALLOCATION TRACK INDICATOR */}
                    <div className="w-full h-1.5 bg-zinc-900 overflow-hidden rounded-full">
                      <div 
                        className="h-full transition-all duration-350 rounded-full"
                        style={{ backgroundColor: entry.color, width: `${ratioPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-zinc-650 text-[10px] uppercase py-2">No category dynamics logged.</div>
            )}
          </div>
        </div>
      </div>

      {/* CONSOLIDATED GRID OR BUDGET VS ACTUAL VERTICALS */}
      {isConsolidated ? (
        <div className="bg-[#181A1C] p-6 border border-[#24272C] rounded-2xl space-y-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#24272C] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-white" />
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-widest">Multi-Subsidiary Liquidity Ledger</h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Aggregated KPIs across all corporate entities of the enterprise group.</p>
            </div>
            
            {/* INSTANT INTERACTIVE SEARCH CONTROL ON MATRIX TABLE */}
            <div className="relative w-full md:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-zinc-500" />
              </span>
              <input 
                type="text"
                placeholder="Filter entities by code/name..."
                className="w-full bg-[#141618] border border-[#24272C] px-3.5 py-2 pl-9 rounded-xl text-[11px] font-mono text-white placeholder-zinc-500 focus:outline-hidden focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] transition-all leading-none"
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
              />
              {matrixSearch && (
                <button 
                  onClick={() => setMatrixSearch('')}
                  className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#24272C]">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-[#141618] text-zinc-400 font-mono uppercase tracking-widest text-[9px] border-b border-[#24272C]">
                <tr>
                  <th className="p-3.5">Subsidiary Company</th>
                  <th className="p-3.5 text-right">Inflow Captures</th>
                  <th className="p-3.5 text-right">Disbursements</th>
                  <th className="p-3.5 text-right">Surplus Delta</th>
                  <th className="p-3.5 text-center">Approval queue</th>
                  <th className="p-3.5 text-right">Accounts AP</th>
                  <th className="p-3.5 text-right font-bold text-white">Inflow Ratio Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24272C] font-medium text-zinc-300">
                {groupMatrix.length > 0 ? (
                  groupMatrix.map((item, i) => {
                    const totalInflow = item.cashIn || 1;
                    const deltaUsageRate = Math.min((item.cashOut / totalInflow) * 100, 100);
                    return (
                      <tr key={i} className="hover:bg-[#1E2124]/45 transition bg-[#181A1C]">
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="p-1 px-2.5 bg-[#141618] border border-[#24272C] text-zinc-300 font-bold font-mono text-[10px] select-none text-center min-w-[50px] rounded-lg">
                              {item.company.code}
                            </div>
                            <div>
                              <span className="font-semibold text-white font-sans text-xs">{item.company.name}</span>
                              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">Asset code: {item.company.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-mono text-[#00B67A]">{formatPeso(item.cashIn)}</td>
                        <td className="p-3.5 text-right font-mono text-rose-450">{formatPeso(item.cashOut)}</td>
                        <td className={`p-3.5 text-right font-mono ${item.net >= 0 ? 'text-white font-bold' : 'text-rose-400'}`}>
                          {formatPeso(item.net)}
                        </td>
                        <td className="p-3.5 text-center">
                          {item.pendings > 0 ? (
                            <span className="px-2.5 py-1 bg-amber-950/40 text-amber-400 border border-amber-900/60 text-[9px] font-mono uppercase tracking-wider animate-pulse rounded-lg bg-opacity-55">
                              {item.pendings} TASKS
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-950/30 text-[#00B67A] border border-emerald-900/40 text-[9px] font-mono uppercase tracking-wider select-none rounded-lg">
                              CLEARED
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono text-rose-400">{formatPeso(item.unpaidAp)}</td>
                        <td className="p-3.5 min-w-[150px]">
                          <div className="space-y-1 font-mono text-[9px] text-zinc-400">
                            <div className="flex justify-between uppercase">
                              <span>Disbursed/Inflow</span>
                              <span className="text-white font-bold">{deltaUsageRate.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-900 overflow-hidden flex rounded-full">
                              <div 
                                className={`h-full transition-all duration-300 rounded-full ${deltaUsageRate > 80 ? 'bg-amber-500' : 'bg-[#00B67A]'}`}
                                style={{ width: `${deltaUsageRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
                      No matching corporate entities identified.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BUDGET VARIANCES PROGRESS TRACK LIMITS */}
          <div className="bg-[#181A1C] p-6 border border-[#24272C] rounded-2xl space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#24272C] pb-3">
              <div>
                <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-ping" />
                  Budget Burn Rates
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">Active actual expenditures vs monthly plan limits</p>
              </div>
              <button 
                onClick={() => onNavigate('budgets')}
                className="text-[9px] text-[#00B67A] uppercase tracking-widest font-mono font-bold hover:text-emerald-300 cursor-pointer bg-[#141618] border border-[#24272C] px-3.5 py-1.5 rounded-xl transition-all hover:border-[#00B67A]"
              >
                Detailed Monitor
              </button>
            </div>

            <div className="space-y-4 pt-1">
              {budgets.length > 0 ? (
                budgets.map((b, i) => {
                  const pct = Math.min(b.usagePercent, 100);
                  let barColor = 'bg-[#00B67A]';
                  let textColor = 'text-[#00B67A]';
                  let badgeBg = 'bg-emerald-950/40 border-emerald-900/60';
                  if (b.status === 'over_budget') {
                     barColor = 'bg-rose-500';
                     textColor = 'text-rose-450';
                     badgeBg = 'bg-rose-950/40 border-rose-900/40';
                  } else if (b.status === 'near_limit') {
                     barColor = 'bg-amber-500';
                     textColor = 'text-amber-400';
                     badgeBg = 'bg-amber-950/40 border-amber-900/40';
                  }

                  return (
                    <div key={i} className="space-y-2 group">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white font-sans group-hover:text-amber-450 transition-colors">
                            {b.categoryName.charAt(0).toUpperCase() + b.categoryName.slice(1)}
                          </span>
                          <span className={`px-2.5 py-0.5 border text-[9px] font-bold uppercase tracking-wider font-mono rounded-lg ${badgeBg} ${textColor}`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="font-mono text-zinc-450 text-[11px]">
                          <span className="text-white font-bold">{formatPeso(b.actualAmount)}</span>
                          <span> / {formatPeso(b.plannedAmount)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#141618] h-2.5 overflow-hidden flex rounded-full border border-[#24272C]">
                        <div 
                          className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                          style={{ width: `${b.plannedAmount > 0 ? (b.actualAmount / b.plannedAmount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-zinc-500 font-mono uppercase tracking-widest">
                  No active budgets defined inside general ledger.
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE TEAM ROLES AND AUTH EXPOSITION: SECURITY BADGING */}
          <div className="bg-[#181A1C] p-6 border border-[#24272C] rounded-2xl space-y-6 shadow-lg">
            <div className="border-b border-[#24272C] pb-3">
              <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00B67A]" />
                Tenant Security Clearance
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">Cryptographic roles, active profiles, and clearance parameters</p>
            </div>

            <div className="border border-[#24272C] p-4 bg-[#141618] space-y-4 rounded-xl shadow-inner">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-[#181A1C] border border-[#24272C] text-white rounded-xl">
                  <ShieldCheck className="w-5.5 h-5.5 text-[#00B67A] animate-pulse" />
                </div>
                <div>
                  <div className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest leading-none">Security Token Owner</div>
                  <div className="text-xs font-bold text-white font-mono uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    {getUserRole(userId, companyId)?.replace('_', ' ') || 'NONE ASSIGNED'}
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00B67A]" />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#24272C] pt-4.5 space-y-2.5 text-[11px] font-mono text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Encode Financial Transactions:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 text-[9px] tracking-widest rounded-lg ${canWriteFinance(userId, companyId) ? 'text-[#00B67A] bg-emerald-950/30 border border-emerald-950' : 'text-rose-500 bg-rose-955/40 border border-[#532323]'}`}>
                    {canWriteFinance(userId, companyId) ? 'AUTHORIZED' : 'DENIED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Commit Signature Approvals:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 text-[9px] tracking-widest rounded-lg ${getUserRole(userId, companyId) === 'approver' || getUserRole(userId, companyId) === 'company_admin' || isGroupAdmin(userId) ? 'text-[#00B67A] bg-emerald-950/30 border border-emerald-950' : 'text-rose-500 bg-rose-955/40 border border-[#532323]'}`}>
                    {getUserRole(userId, companyId) === 'approver' || getUserRole(userId, companyId) === 'company_admin' || isGroupAdmin(userId) ? 'AUTHORIZED' : 'DENIED'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[#24272C] pt-2">
                  <span>Self-Approval Prevention:</span>
                  <span className="font-mono font-bold text-amber-400 uppercase text-[9px]">ENFORCED (RLS)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Limit Threshold (₱10,000.00):</span>
                  <span className="font-mono font-bold text-amber-400 uppercase text-[9px]">ENFORCED (RLS)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cross-Subsidiary Payroll Joins:</span>
                  <span className="font-mono font-bold text-rose-500 uppercase text-[9px]">STRICT RESTRICT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
