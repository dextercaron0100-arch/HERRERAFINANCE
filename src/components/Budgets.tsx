/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  Sparkles,
  Lock,
  PiggyBank,
  ChevronRight,
  TrendingDown,
  Percent
} from 'lucide-react';
import {
  getBudgetVsActual,
  savePlannedBudget,
  canAdminCompany,
  getCategories
} from '../data/mockDatabase';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BudgetsProps {
  userId: string;
  companyId: string;
  onAuditLogged: () => void;
}

export default function Budgets({ userId, companyId, onAuditLogged }: BudgetsProps) {
  const [selectedMonth, setSelectedMonth] = useState('2026-06-01');
  const [editingBudget, setEditingBudget] = useState<{ categoryId: string; val: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  
  // Is Admin checks
  const isAdmin = canAdminCompany(userId, companyId);

  // PESO FORMATTER
  const formatPeso = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(num);
  };

  // Get data
  const budgetActualList = useMemo(() => {
    return getBudgetVsActual(companyId, selectedMonth);
  }, [companyId, selectedMonth]);

  // Aggregate totals
  const aggregates = useMemo(() => {
    const planned = budgetActualList.reduce((acc, curr) => acc + curr.plannedAmount, 0);
    const actual = budgetActualList.reduce((acc, curr) => acc + curr.actualAmount, 0);
    const variance = planned - actual;
    const usage = planned > 0 ? (actual / planned) * 100 : 0;
    return { planned, actual, variance, usage };
  }, [budgetActualList]);

  // Notifications logic
  const [notifiedCategories, setNotifiedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.requestPermission) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    budgetActualList.forEach(item => {
      // Trigger if usage >= 80% and we haven't notified yet for this category in the current session
      if (item.usagePercent >= 80 && !notifiedCategories.has(item.categoryId)) {
        const title = `Budget Alert: ${item.categoryName.replace('_', ' ').toUpperCase()}`;
        const msg = `This cost center is at ${item.usagePercent.toFixed(1)}% of its planned budget.`;
        
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(title, { body: msg, icon: '/favicon.ico' });
        }
        
        toast.warning(title, { description: msg, duration: 8000 });
        
        setNotifiedCategories(prev => new Set(prev).add(item.categoryId));
      }
    });
  }, [budgetActualList, notifiedCategories]);

  // Handle planned update
  const handleSaveBudgetAmount = (categoryId: string, targetCompanyId: string, val: string) => {
    setSaveStatus('');
    const amt = parseFloat(val);
    if (isNaN(amt) || amt < 0) {
      toast.error('Invalid Budget Allocation', { description: 'Budget allocations must be non-negative values.' });
      return;
    }

    const { error, budget } = savePlannedBudget(userId, targetCompanyId, categoryId, selectedMonth, amt);
    if (error) {
      toast.error('Update Failed', { description: error });
    } else {
      setSaveStatus('Draft saved successfully!');
      toast.success('Budget Draft Saved!');
      setTimeout(() => setSaveStatus(''), 1500);
      onAuditLogged();
    }
    setEditingBudget(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="bg-white border border-slate-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl">
        <div>
          <h1 className="text-xl font-display text-slate-900 tracking-tight flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-zinc-450" />
            <span>Operational Budget Allocations Manager</span>
          </h1>
          <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider mt-0.5">Configure planned expense allocations per accounting category.</p>
        </div>

        {/* MONTH PICKER */}
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 text-xs bg-white text-slate-900 focus:outline-hidden focus:border-zinc-550 font-mono font-semibold rounded-2xl cursor-pointer"
          >
            <option value="2026-05-01">May 2026</option>
            <option value="2026-06-01">June 2026</option>
            <option value="2026-07-01">July 2026</option>
            <option value="2026-08-01">August 2026</option>
          </select>
        </div>
      </div>

      {/* OVERALL STATISTICS BLOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 border border-slate-200 bg-white space-y-1 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Planned Allocations</span>
          <div className="text-xl font-bold text-slate-900 font-mono">{formatPeso(aggregates.planned)}</div>
        </div>
        <div className="p-5 border border-slate-200 bg-white space-y-1 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Actual Expense Spent</span>
          <div className="text-xl font-bold text-slate-900 font-mono">{formatPeso(aggregates.actual)}</div>
        </div>
        <div className="p-5 border border-slate-200 bg-white space-y-1 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Cushion Variance</span>
          <div className={`text-xl font-bold font-mono ${aggregates.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPeso(aggregates.variance)}
          </div>
        </div>
        <div className="p-5 border border-slate-200 bg-white space-y-1 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Planned Burn Rate</span>
          <div className="text-xl font-bold text-slate-900 font-mono flex items-center gap-1.5">
            <Percent className="w-4 h-4 shrink-0 text-slate-600" />
            <span>{aggregates.usage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* PROJECTED VS ACTUAL CHART */}
      <div className="bg-white border border-slate-200 shadow-md rounded-2xl overflow-hidden p-5">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold font-mono text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#00B67A]" /> Projected vs Actual Spending
            </h3>
            <p className="text-xs text-slate-600 mt-1 uppercase font-mono tracking-wider">Visual breakdown of budget cushion and total allocations</p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={budgetActualList}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#24272C" vertical={false} />
              <XAxis 
                dataKey="categoryName" 
                stroke="#A1A1AA" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val.replace('_', ' ').toUpperCase()} 
              />
              <YAxis 
                stroke="#A1A1AA" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                cursor={{ fill: '#24272C', opacity: 0.4 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl min-w-[200px]">
                        <div className="text-slate-900 text-xs font-bold font-mono tracking-wider uppercase border-b border-slate-200 pb-2 mb-2 flex items-center justify-between gap-4">
                          <span>{String(label).replace('_', ' ')}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${data.status === 'over_budget' ? 'bg-rose-500/20 text-rose-400' : data.status === 'near_limit' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {data.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex justify-between items-center gap-4 text-[10px] font-mono">
                              <span style={{ color: entry.color }} className="uppercase">{entry.name}</span>
                              <span className="font-bold text-slate-900">{formatPeso(entry.value as number)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5">
                          <div className="flex justify-between items-center gap-4 text-[10px] font-mono">
                            <span className="uppercase text-slate-600">Variance</span>
                            <span className={`font-bold ${data.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatPeso(data.variance)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-4 text-[10px] font-mono">
                            <span className="uppercase text-slate-600">Burn Rate</span>
                            <span className="font-bold text-slate-900">{data.usagePercent?.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar 
                dataKey="plannedAmount" 
                name="Planned Budget" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              />
              <Bar 
                dataKey="actualAmount" 
                name="Actual Spent" 
                fill="#00B67A" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BUDGETS TABLE VIEW */}
      <div className="bg-white border border-slate-200 shadow-md rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-slate-500" />
            <span>BUDGET MONITOR / DUE DATES</span>
          </span>
          {saveStatus && (
            <span className="text-xs text-emerald-450 font-semibold font-mono uppercase tracking-wider animate-pulse">{saveStatus}</span>
          )}
          {!isAdmin && (
            <span className="inline-flex items-center gap-1 text-[9px] text-slate-600 bg-slate-50 px-2 py-1 rounded-2xl border border-slate-200 font-mono font-bold tracking-wider uppercase">
              <Lock className="w-3 h-3 text-zinc-550" />
              <span>Read-Only</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-500 text-slate-600 font-medium uppercase tracking-[1px] font-mono border-b border-slate-200">
              <tr>
                <th className="p-3 border-b border-slate-200">Disbursement Category</th>
                <th className="p-3 border-b border-slate-200 text-right">Planned Allocation</th>
                <th className="p-3 border-b border-slate-200 text-right">Actual Spent</th>
                <th className="p-3 border-b border-slate-200 text-right">Remaining Variance</th>
                <th className="p-3 border-b border-slate-200 text-center">Efficiency Rate</th>
                <th className="p-3 border-b border-slate-200 text-right">Status Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              {budgetActualList.map((item, idx) => {
                const pct = Math.min(item.usagePercent, 100);
                let barColor = 'bg-white';
                let textColor = 'text-emerald-400';
                let badgeBg = 'bg-emerald-955/20 border-emerald-900/50';
                let rowBg = 'hover:bg-slate-50/20 border-l-2 border-transparent';

                if (item.status === 'over_budget') {
                  barColor = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
                  textColor = 'text-rose-400 font-bold';
                  badgeBg = 'bg-rose-955/20 border-rose-500/50 animate-pulse';
                  rowBg = 'bg-rose-500/5 hover:bg-rose-500/10 border-l-2 border-rose-500';
                } else if (item.status === 'near_limit') {
                  barColor = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
                  textColor = 'text-amber-400 font-bold';
                  badgeBg = 'bg-amber-955/20 border-amber-500/50 animate-pulse';
                  rowBg = 'bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-amber-500';
                }

                const isEditing = editingBudget?.categoryId === item.categoryId;

                return (
                  <tr key={idx} className={`${rowBg} transition`}>
                    {/* NAME */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-display text-xs uppercase tracking-wider text-slate-900 font-medium">
                        {item.categoryName.replaceAll('_', ' ')}
                      </div>
                    </td>

                    {/* PLANNED ALLOCATIONS (EDITABLE FOR ADMINS) */}
                    <td className="p-3 text-right whitespace-nowrap">
                      {isEditing && isAdmin ? (
                        <div className="flex items-center justify-end gap-1 select-none">
                          <input 
                            type="number" 
                            defaultValue={item.plannedAmount}
                            id={`input-bud-${item.categoryId}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveBudgetAmount(item.categoryId, item.companyId, (e.target as HTMLInputElement).value);
                              }
                            }}
                            className="w-24 text-right p-1 bg-white border border-white text-xs font-mono text-slate-900 rounded-2xl"
                            autoFocus
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById(`input-bud-${item.categoryId}`) as HTMLInputElement;
                              if (input) handleSaveBudgetAmount(item.categoryId, item.companyId, input.value);
                            }}
                            className="p-1 px-2 bg-[#00B67A] text-white hover:bg-[#009E6B] text-[10px] font-mono font-bold uppercase tracking-wider rounded-2xl cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2.5 group select-none">
                          <span className="font-mono text-slate-900 font-bold">{formatPeso(item.plannedAmount)}</span>
                          {isAdmin && (
                            <button 
                              onClick={() => setEditingBudget({ categoryId: item.categoryId, val: String(item.plannedAmount) })}
                              className="text-[10px] text-zinc-450 hover:text-slate-900 cursor-pointer hover:underline font-bold font-mono uppercase"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* ACTUAL */}
                    <td className="p-3 text-right font-mono font-bold text-zinc-350 whitespace-nowrap">
                      {formatPeso(item.actualAmount)}
                    </td>

                    {/* VARIANCE */}
                    <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${item.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatPeso(item.variance)}
                    </td>

                    {/* EFFICIENCY BAR */}
                    <td className="p-3 max-w-[120px] select-none text-left">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono uppercase">
                          <span>Burn pace:</span>
                          <span className="font-bold text-slate-700">{item.usagePercent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-white border border-slate-200 h-1.5 rounded-2xl overflow-hidden">
                          <div className={`h-full rounded-2xl ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>

                    {/* STATUS BADGE */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[8px] font-bold border rounded-2xl font-mono uppercase tracking-wider ${badgeBg} ${textColor}`}>
                        {item.status === 'over_budget' && <AlertTriangle className="w-2.5 h-2.5 text-rose-455" />}
                        <span>{item.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
