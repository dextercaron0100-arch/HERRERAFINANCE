/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from "react";
import { motion, Reorder } from "motion/react";
import { 
  getTransactions, getAllCategories, useDBUpdate, 
  getProfiles, getCashAccounts, getAttachments, getCompanies, createReversalTransaction 
} from "../data/mockDatabase";
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, PhilippinePeso, Activity, Settings2, ArrowUp, ArrowDown, Eye, EyeOff, X, GripVertical, Calendar, ChevronDown, Download,
  ArrowUpRight, ArrowDownLeft, Paperclip, User, CheckCircle2, XCircle, Clock, RefreshCcw
} from "lucide-react";
import { Transaction } from "../types";
import AttachmentViewer from "./AttachmentViewer";

interface DashboardProps {
  userId: string;
  companyId: string;
  isConsolidated: boolean;
  onNavigate: (tab: string) => void;
  isSyncing?: boolean;
}

const formatPeso = (num: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(num || 0);
};

const DEFAULT_LAYOUT = [
  { id: 'totalFund', title: 'Total Fund', visible: true },
  { id: 'capital', title: 'Capital', visible: true },
  { id: 'sales', title: 'Total Sales', visible: true },
  { id: 'expenses', title: 'Total Expenses', visible: true },
  { id: 'profit', title: 'Net Profit', visible: true }
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    let formattedDate = label;
    if (label) {
      const [y, m] = label.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1);
      formattedDate = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 font-sans min-w-[220px]">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">{formattedDate}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}
              </span>
              <span className="font-mono font-medium text-slate-900">{formatPeso(entry.value)}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center text-sm">
             <span className="text-slate-700 font-bold">Total Balance</span>
             <span className="font-mono font-bold text-emerald-600">{formatPeso(data.totalFund)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard({
  userId,
  companyId,
  isConsolidated,
  onNavigate,
  isSyncing,
}: DashboardProps) {
  const dbTick = useDBUpdate();

  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('dashboard_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_LAYOUT.length) {
          return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_LAYOUT;
  });

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedDocsTxn, setSelectedDocsTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    localStorage.setItem('dashboard_layout', JSON.stringify(layout));
  }, [layout]);

  const [dateRange, setDateRange] = useState("all_time");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefreshed(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const DATE_RANGES = [
    { id: 'today', label: 'Today (Exact Date)' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_quarter', label: 'Last Quarter' },
    { id: 'year_to_date', label: 'Year to Date' },
    { id: 'all_time', label: 'All Time' },
    { id: 'custom', label: 'Custom Range' }
  ];

  const txns = useMemo(() => {
    const allTxns = getTransactions(userId, isConsolidated ? null : companyId)
      .filter(t => t.status === "approved" || t.status === "completed");
    if (dateRange === "all_time") return allTxns;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return allTxns.filter(t => {
      const txDate = new Date(t.txnDate);
      if (dateRange === "today") {
        return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth && txDate.getDate() === now.getDate();
      } else if (dateRange === "this_month") {
        return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
      } else if (dateRange === "last_quarter") {
        const currentQuarter = Math.floor(currentMonth / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear;
        const txQuarter = Math.floor(txDate.getMonth() / 3);
        return txDate.getFullYear() === lastQuarterYear && txQuarter === lastQuarter;
      } else if (dateRange === "year_to_date") {
        return txDate.getFullYear() === currentYear;
      } else if (dateRange === "custom") {
        if (customStartDate && txDate < new Date(customStartDate)) return false;
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) return false;
        }
        return true;
      }
      return true;
    });
  }, [userId, companyId, isConsolidated, dateRange, lastRefreshed, customStartDate, customEndDate, dbTick]);

  const allCategories = useMemo(() => getAllCategories(), [dbTick]);
  const categoryMap = useMemo(() => Object.fromEntries(allCategories.map(c => [c.id, c.name])), [allCategories]);

  // Data for recent transactions table
  const recentTransactions = useMemo(() => {
    return [...txns].sort((a, b) => new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime()).slice(0, 5);
  }, [txns]);

  const profiles = useMemo(() => getProfiles(), []);
  const vaultAttachments = useMemo(() => getAttachments(''), []); // Get all since we might be consolidated
  const allCashAccounts = useMemo(() => {
    let accs: any[] = [];
    const comps = getCompanies();
    comps.forEach(c => {
      accs.push(...getCashAccounts(c.id));
    });
    return accs;
  }, []);

  const handleReversal = (txnId: string) => {
    const confirmed = window.confirm('Reversal adjustment rule: You are about to instantiate a reversing transaction. Original records are immutable. Initiate adjust?');
    if (!confirmed) return;

    const txnToReverse = txns.find(t => t.id === txnId);
    if (!txnToReverse) return;
    const targetCompanyId = txnToReverse.companyId;

    const { error } = createReversalTransaction(userId, txnId, targetCompanyId);
    if (error) {
      alert(error);
    } else {
      window.dispatchEvent(new Event("db-update"));
    }
  };

  const handleDownloadCSV = () => {
    if (!txns || txns.length === 0) return;
    
    const headers = ["Date", "Description", "Category", "Amount", "Type"];
    const csvRows = [headers.join(",")];
    
    for (const txn of txns) {
      const date = new Date(txn.txnDate).toLocaleDateString();
      const desc = `"${(txn.purpose || "").replace(/"/g, '""')}"`;
      const cat = `"${(categoryMap[txn.categoryId] || "").replace(/"/g, '""')}"`;
      const amount = txn.amount;
      const type = txn.type;
      csvRows.push([date, desc, cat, amount, type].join(","));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `summary_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = useMemo(() => {
    let sales = 0;
    let expenses = 0;
    let capital = 0;

    txns.forEach(t => {
      const catName = categoryMap[t.categoryId] || "";
      if (t.type === "cash_in") {
        if (catName.toLowerCase().includes("capital")) {
          capital += t.amount;
        } else {
          sales += t.amount;
        }
      } else if (t.type === "cash_out") {
        // Moving money between company accounts is a balance-sheet movement,
        // not an operating expense or a reduction in profit.
        if (t.transferRef) return;
        if (catName.toLowerCase().includes("capital")) {
          capital -= t.amount;
        } else {
          expenses += t.amount;
        }
      }
    });

    const profit = sales - expenses;
    const totalFund = (sales + capital) - expenses;

    return { sales, expenses, capital, profit, totalFund };
  }, [txns, categoryMap]);

  const monthlyData = useMemo(() => {
    const monthMap: Record<string, { month: string; sales: number; expenses: number; profit: number; capital: number; totalFund: number }> = {};
    
    const allHistoricalTxns = getTransactions(userId, isConsolidated ? null : companyId)
      .filter(t => t.status === "approved" || t.status === "completed");

    allHistoricalTxns.forEach(t => {
      const month = t.txnDate.slice(0, 7); // YYYY-MM
      if (!monthMap[month]) {
        monthMap[month] = { month, sales: 0, expenses: 0, profit: 0, capital: 0, totalFund: 0 };
      }
      
      const catName = categoryMap[t.categoryId] || "";
      if (t.type === "cash_in") {
        if (catName.toLowerCase().includes("capital")) {
          monthMap[month].capital += t.amount;
        } else {
          monthMap[month].sales += t.amount;
        }
      } else if (t.type === "cash_out") {
        // Keep transfers in cash-flow/account balances, but exclude them from
        // expense and profit reporting.
        if (t.transferRef) return;
        if (catName.toLowerCase().includes("capital")) {
          monthMap[month].capital -= t.amount;
        } else {
          monthMap[month].expenses += t.amount;
        }
      }
    });

    // compute profit
    Object.values(monthMap).forEach(d => {
      d.profit = d.sales - d.expenses;
    });

    const sorted = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
    
    // If there's no data, add current month with zero values
    if (sorted.length === 0) {
       const now = new Date();
       const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
       sorted.push({ month: currentMonthStr, sales: 0, expenses: 0, profit: 0, capital: 0, totalFund: 0 });
    }

    // If there's only one month, the area chart won't render the line/area. Add a previous empty month to make it visible.
    if (sorted.length === 1) {
       const [year, m] = sorted[0].month.split("-").map(Number);
       const prevMonthDate = new Date(year, m - 2, 1); // m is 1-indexed in string, 0-indexed in Date, so m-2 gives previous month
       const prevMonthStr = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
       sorted.unshift({ month: prevMonthStr, sales: 0, expenses: 0, profit: 0, capital: 0, totalFund: 0 });
    }

    let runningFund = 0;
    sorted.forEach(d => {
       runningFund += d.capital + d.sales - d.expenses;
       d.totalFund = runningFund;
    });

    return sorted;
  }, [userId, companyId, isConsolidated, categoryMap, dbTick]);

  const generateSparkline = (currentValue: number) => {
    // Generate dummy historical points for a nice looking sparkline
    if (currentValue === 0) return Array(7).fill({ value: 0 });
    const points = [];
    let val = currentValue * 0.7; // Start at 70%
    for (let i = 0; i < 6; i++) {
      points.push({ value: val });
      // Random walk towards current value
      const remaining = currentValue - val;
      val += (remaining / (6 - i)) + (Math.random() * (currentValue * 0.05) - (currentValue * 0.025));
    }
    points.push({ value: currentValue });
    return points;
  };

  const cardDefinitions: Record<string, any> = {
    totalFund: {
      title: "Total Fund",
      subtitle: "Current overall balance",
      value: summary.totalFund,
      icon: Wallet,
      color: "text-[#00B67A]",
      strokeColor: "#00B67A",
      data: generateSparkline(summary.totalFund)
    },
    capital: {
      title: "Capital",
      subtitle: "Initial business capital",
      value: summary.capital,
      icon: PhilippinePeso,
      color: "text-amber-400",
      strokeColor: "#FBBF24",
      data: generateSparkline(summary.capital)
    },
    sales: {
      title: "Total Sales",
      subtitle: "All incoming revenue",
      value: summary.sales,
      icon: TrendingUp,
      color: "text-blue-400",
      strokeColor: "#60A5FA",
      data: generateSparkline(summary.sales)
    },
    expenses: {
      title: "Total Expenses",
      subtitle: "All outgoing costs",
      value: summary.expenses,
      icon: TrendingDown,
      color: "text-rose-400",
      strokeColor: "#FB7185",
      data: generateSparkline(summary.expenses)
    },
    profit: {
      title: "Net Profit",
      subtitle: "Revenue minus expenses",
      value: summary.profit,
      icon: Activity,
      color: summary.profit >= 0 ? "text-[#00B67A]" : "text-rose-400",
      strokeColor: summary.profit >= 0 ? "#00B67A" : "#FB7185",
      data: generateSparkline(summary.profit)
    }
  };

  const visibleCards = layout.filter(item => item.visible);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 lg:p-8 h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar bg-slate-50"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex flex-col gap-1 w-full md:w-auto md:flex-1 pr-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-widest uppercase font-sans">FINANCIAL OVERVIEW</h2>
            <div className="h-px bg-gradient-to-r from-zinc-700 to-transparent flex-1 hidden md:block"></div>
          </div>
          <p className="text-sm text-slate-600 flex items-center gap-2 flex-wrap mt-1">
            <span>High-level summary of your business performance.</span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-slate-500 font-mono text-[10px] uppercase tracking-widest bg-slate-50/80 border border-slate-200/50 px-2 py-1 rounded-md flex items-center gap-1.5 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live: {new Date(lastRefreshed).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-50 rounded-lg text-sm text-slate-900 font-medium border border-slate-200 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 text-slate-600" />
              {DATE_RANGES.find(r => r.id === dateRange)?.label}
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
            
            {isDateMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDateMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="py-1">
                    {DATE_RANGES.map((range) => (
                      <button
                        key={range.id}
                        onClick={() => {
                          setDateRange(range.id);
                          setIsDateMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          dateRange === range.id 
                            ? 'bg-[#00B67A]/10 text-[#00B67A] font-medium' 
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 text-sm text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-[#00B67A] transition-colors h-[38px]"
              />
              <span className="text-slate-500 text-sm">to</span>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 text-sm text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-[#00B67A] transition-colors h-[38px]"
              />
            </div>
          )}
          
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-50 rounded-lg text-sm text-slate-900 font-medium border border-slate-200 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Download CSV
          </button>
          <button 
            onClick={() => setIsCustomizing(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-50 rounded-lg text-sm text-slate-900 font-medium border border-slate-200 transition-colors shadow-sm"
          >
            <Settings2 className="w-4 h-4 text-slate-600" />
            Customize
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      {visibleCards.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          {visibleCards.map((item) => {
            const def = cardDefinitions[item.id];
            if (!def) return null;
            return (
              <MetricCard 
                key={item.id}
                title={def.title} 
                subtitle={def.subtitle}
                value={def.value} 
                icon={def.icon} 
                color={def.color}
                strokeColor={def.strokeColor}
                data={def.data}
                onClick={() => {
                  let type = 'all';
                  let search = '';
                  
                  if (item.id === 'sales') {
                    type = 'cash_in';
                  } else if (item.id === 'capital') {
                    type = 'all';
                    search = 'capital';
                  } else if (item.id === 'expenses') {
                    type = 'cash_out';
                  }
                  
                  localStorage.setItem('ledger_filter_type', type);
                  if (search) {
                    localStorage.setItem('ledger_search_term', search);
                  }
                  
                  onNavigate('ledger');
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="p-8 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
          <EyeOff className="w-8 h-8 text-zinc-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-widest">All cards hidden</h3>
          <p className="text-xs text-slate-500 mt-2">Click Customize to show metrics.</p>
        </div>
      )}

      {/* Graph Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-inner flex-1 min-h-[400px] flex flex-col">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 font-mono uppercase tracking-widest">Revenue & Profit Trend</h3>
          <p className="text-xs text-slate-600">Monthly historical performance</p>
        </div>
        
        <div className="flex-1 w-full relative min-h-[350px]">
          {monthlyData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center absolute inset-0">
              <p className="text-sm text-slate-500 font-mono">No financial data available to display.</p>
            </div>
          ) : (
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748B" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                  tickFormatter={(val) => {
                    const [y, m] = val.split('-');
                    const date = new Date(parseInt(y), parseInt(m)-1);
                    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
                  }}
                />
                <YAxis 
                  stroke="#64748B" 
                  fontSize={12}
                  tickLine={false} 
                  axisLine={false}
                  dx={-10}
                  tickFormatter={(val) => `₱${(val / 1000)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '24px' }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-inner flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 font-mono uppercase tracking-widest">Recent Transactions</h3>
          <p className="text-xs text-slate-600">Latest recorded activities across accounts</p>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white text-slate-600 font-medium uppercase tracking-[1px] font-mono border-b border-slate-200">
              <tr>
                <th className="p-3.5 border-b border-slate-200">Txn ID</th>
                <th className="p-3.5 border-b border-slate-200">Val Date</th>
                <th className="p-3.5 border-b border-slate-200">Flow</th>
                <th className="p-3.5 border-b border-slate-200">Principal Amount</th>
                <th className="p-3.5 border-b border-slate-200">Purpose & Details</th>
                <th className="p-3.5 border-b border-slate-200">Clerk / Controller</th>
                <th className="p-3.5 border-b border-slate-200">Signatures</th>
                <th className="p-3.5 border-b border-slate-200 text-center">Docs & Meta</th>
                <th className="p-3.5 border-b border-slate-200 text-right text-slate-500">Adjustment Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 font-medium text-slate-700">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((t) => {
                  const catName = t.transferRef ? (t.type === 'cash_in' ? 'Incoming Transfer' : 'Outgoing Transfer') : (categoryMap[t.categoryId] || 'Operations');
                  const encoderEmail = profiles.find(p => p.id === t.encodedBy)?.email || 'finance@sys.com';
                  const txnAttachments = vaultAttachments.filter(a => a.entityId === t.id && a.entityType === 'transaction');

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/40 transition">
                      {/* ID */}
                      <td className="p-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        #{t.id}
                      </td>

                      {/* DATE */}
                      <td className="p-3 font-mono whitespace-nowrap text-slate-700">
                        {t.txnDate}
                      </td>

                      {/* FLOW */}
                      <td className="p-3 whitespace-nowrap">
                        {t.type === 'cash_in' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px] uppercase font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Inflow</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-450 font-mono text-[10px] uppercase font-semibold text-[#FB7185]">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Outflow</span>
                          </span>
                        )}
                      </td>

                      {/* AMOUNT */}
                      <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatPeso(t.amount)}
                      </td>

                      {/* PURPOSE & CATEGORY */}
                      <td className="p-3 max-w-[200px]">
                        <div className="space-y-1">
                          <div className="text-zinc-100 font-mono text-sm truncate uppercase tracking-tight" title={t.purpose}>
                            {t.purpose}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-white text-slate-600 font-bold font-mono text-[8px] border border-slate-200 rounded-lg uppercase">
                              {catName}
                            </span>
                            {(t.cashAccountId || t.paymentMethod) && (
                              <span className="px-1.5 py-0.5 bg-sky-950/20 text-sky-400 border border-sky-900/30 rounded-lg font-mono text-[8px] font-semibold uppercase">
                                {(() => {
                                  if (t.cashAccountId) {
                                    const acc = allCashAccounts.find(a => a.id === t.cashAccountId);
                                    return acc ? `${acc.bankName} - ${acc.accountName}` : t.cashAccountId;
                                  }
                                  return t.paymentMethod;
                                })()}
                              </span>
                            )}
                            {t.reversalOf && (
                              <span className="px-1.5 py-0.5 bg-rose-950/25 text-[#FB7185] border border-rose-900/30 rounded-lg font-mono text-[8px] font-semibold uppercase">
                                ADJUSTMENT ADJ
                              </span>
                            )}
                            {txnAttachments.length > 0 && (
                              <span 
                                className="px-1 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg flex items-center justify-center"
                                title={`Vault Docs: ${txnAttachments.map(a => a.fileName).join(', ')}`}
                              >
                                <Paperclip className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ACCOUNTABLE AND ENCODER */}
                      <td className="p-3 text-slate-600">
                        <div className="space-y-1">
                          <div className="text-slate-700 font-mono text-[11px] font-medium uppercase tracking-tight">{t.responsiblePerson}</div>
                          <div className="text-[9px] text-slate-500 flex items-center gap-0.5 font-mono">
                            <User className="w-2.5 h-2.5 text-zinc-600" />
                            <span className="truncate max-w-[120px]">{encoderEmail}</span>
                          </div>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="p-3 whitespace-nowrap">
                        {t.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg font-mono font-bold tracking-wider uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>COMPLETED</span>
                          </span>
                        )}
                        {t.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] bg-sky-500/10 text-sky-600 border border-sky-500/20 rounded-lg font-mono font-bold tracking-wider uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>APPROVED</span>
                          </span>
                        )}
                        {t.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] bg-rose-500/10 text-[#FB7185] border border-[#FB7185]/20 rounded-lg font-mono font-bold tracking-wider uppercase">
                            <XCircle className="w-3 h-3" />
                            <span>REJECTED</span>
                          </span>
                        )}
                        {t.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-mono font-bold tracking-wider uppercase animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>

                      {/* RECEIPT PREVIEW & METADATA */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {t.receiptPath ? (
                            <button 
                              onClick={() => setSelectedDocsTxn(t)}
                              className="p-1 text-slate-600 hover:text-[#00B67A] bg-white border border-slate-200 hover:border-[#00B67A] rounded-lg cursor-pointer transition-all"
                              title="Preview secure billing vouchers"
                            >
                              <Eye className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          ) : (
                            <span className="text-zinc-600 font-bold text-[10px] font-mono w-6 text-center">-</span>
                          )}
                          <button
                            onClick={() => setSelectedDocsTxn(t)}
                            className={`p-1 border rounded-lg cursor-pointer transition-all ${
                              t.mockMetadata ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                            }`}
                            title="Attach or View Mock Reference Metadata"
                          >
                            <Paperclip className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </div>
                      </td>

                      {/* ACTION CORRECTIONS */}
                      <td className="p-3 text-right whitespace-nowrap">
                        {(t.status === 'approved' || t.status === 'completed') && !t.reversalOf && (
                          <button 
                            onClick={() => handleReversal(t.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] border border-slate-200 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg transition-all font-mono uppercase tracking-wider cursor-pointer"
                          >
                            <RefreshCcw className="w-3 h-3 text-slate-500" />
                            <span>Intelligent Reverse</span>
                          </button>
                        )}
                        {t.status !== 'approved' && (
                          <span className="text-[10px] text-zinc-600 font-mono">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-mono text-sm">
                    No recent transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDocsTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Documents & Metadata</h3>
                <p className="text-xs text-slate-500 mt-1">Transaction {selectedDocsTxn.id}</p>
              </div>
              <button onClick={() => setSelectedDocsTxn(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDocsTxn.receiptPath ? (
              <AttachmentViewer transaction={selectedDocsTxn} userId={userId} />
            ) : (
              <div className="mb-5 p-5 rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-500">
                No receipt is attached to this transaction.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Scan Reference</div>
                <div className="mt-1 font-mono text-slate-800">{selectedDocsTxn.mockMetadata?.scanRef || "Not supplied"}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Timestamp</div>
                <div className="mt-1 font-mono text-slate-800">{selectedDocsTxn.mockMetadata?.timestamp || selectedDocsTxn.createdAt}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Control Number</div>
                <div className="mt-1 font-mono text-slate-800">{selectedDocsTxn.mockMetadata?.controlNumber || "Not supplied"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCustomizing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Customize Dashboard</h3>
              <button onClick={() => setIsCustomizing(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <Reorder.Group axis="y" values={layout} onReorder={setLayout} className="space-y-3">
              {layout.map((item) => (
                <Reorder.Item 
                  key={item.id} 
                  value={item} 
                  className="flex items-center justify-between p-3 bg-slate-50/30 border border-slate-200/50 rounded-lg cursor-grab active:cursor-grabbing hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-slate-500 flex items-center justify-center">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <button 
                      onClick={() => {
                        const newLayout = layout.map(l => l.id === item.id ? { ...l, visible: !l.visible } : l);
                        setLayout(newLayout);
                      }}
                      className={`p-1.5 rounded-md ${item.visible ? 'text-[#00B67A] hover:bg-[#00B67A]/10' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <span className={`text-sm font-medium ${item.visible ? 'text-slate-900' : 'text-slate-500 line-through'}`}>{item.title}</span>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setIsCustomizing(false)}
                className="px-4 py-2 bg-[#00B67A] hover:bg-[#009b68] text-slate-900 text-sm font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function MetricCard({ title, subtitle, value, icon: Icon, color, strokeColor, data, onClick }: { title: string; subtitle?: string; value: number; icon: any; color: string; strokeColor: string; data: any[], onClick?: () => void }) {
  let bgClass = "bg-blue-500";
  if (color.includes("amber")) bgClass = "bg-amber-500";
  else if (color.includes("rose")) bgClass = "bg-red-500";
  else if (color.includes("00B67A")) bgClass = "bg-[#2fcc86]";

  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={`${bgClass} text-white rounded-2xl p-5 flex flex-col relative overflow-hidden ${onClick ? 'cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]' : 'shadow-[0_8px_30px_rgb(0,0,0,0.12)]'}`}
      style={{ minHeight: '160px' }}
    >
      {/* Top right chip */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center gap-1 border border-white/40 rounded-full px-2 py-0.5 text-[10px] bg-white/10 backdrop-blur-sm font-medium">
          <Activity className="w-3 h-3" />
          Live
        </div>
      </div>

      <div className="flex items-center gap-2 z-10 w-full mb-3 mt-1 min-w-0">
        <div className="p-2 rounded-full border border-white/30 bg-white/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div 
          className="text-xl sm:text-2xl lg:text-lg xl:text-xl 2xl:text-2xl font-extrabold tracking-tight truncate min-w-0 flex-1"
          title={formatPeso(value)}
        >
          {formatPeso(value)}
        </div>
      </div>
      
      <div className="z-10 mt-1 flex flex-col gap-1">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
        <p className="text-[10px] text-white/80 font-medium tracking-wide">{subtitle || "Key financial metric"}</p>
        <p className="text-xs font-bold text-white mt-1 opacity-80">—</p>
      </div>

      {/* Wavy Background */}
      <svg className="absolute bottom-0 left-0 w-full z-0 opacity-40 translate-y-1" viewBox="0 0 1440 320" preserveAspectRatio="none" height="80">
        <path fill="#ffffff" fillOpacity="1" d="M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,234.7C672,224,768,224,864,240C960,256,1056,288,1152,282.7C1248,277,1344,235,1392,213.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        <path fill="#ffffff" fillOpacity="0.5" d="M0,192L48,208C96,224,192,256,288,256C384,256,480,224,576,213.3C672,203,768,213,864,229.3C960,245,1056,267,1152,266.7C1248,267,1344,245,1392,234.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
      </svg>
    </motion.div>
  );
}
