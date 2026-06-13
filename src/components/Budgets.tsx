/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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

  // Handle planned update
  const handleSaveBudgetAmount = (categoryId: string, val: string) => {
    setSaveStatus('');
    const amt = parseFloat(val);
    if (isNaN(amt) || amt < 0) {
      toast.error('Invalid Budget Allocation', { description: 'Budget allocations must be non-negative values.' });
      return;
    }

    const { error, budget } = savePlannedBudget(userId, companyId, categoryId, selectedMonth, amt);
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
      <div className="bg-[#181A1C] border border-[#24272C] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl">
        <div>
          <h1 className="text-xl font-display text-white tracking-tight flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-zinc-450" />
            <span>Operational Budget Allocations Manager</span>
          </h1>
          <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mt-0.5">Configure planned expense allocations per accounting category.</p>
        </div>

        {/* MONTH PICKER */}
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-[#24272C] text-xs bg-[#141618] text-white focus:outline-hidden focus:border-zinc-550 font-mono font-semibold rounded-2xl cursor-pointer"
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
        <div className="p-5 border border-[#24272C] bg-[#181A1C] space-y-1 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Planned Allocations</span>
          <div className="text-xl font-bold text-white font-mono">{formatPeso(aggregates.planned)}</div>
        </div>
        <div className="p-5 border border-[#24272C] bg-[#181A1C] space-y-1 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Actual Expense Spent</span>
          <div className="text-xl font-bold text-white font-mono">{formatPeso(aggregates.actual)}</div>
        </div>
        <div className="p-5 border border-[#24272C] bg-[#181A1C] space-y-1 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Cushion Variance</span>
          <div className={`text-xl font-bold font-mono ${aggregates.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPeso(aggregates.variance)}
          </div>
        </div>
        <div className="p-5 border border-[#24272C] bg-[#181A1C] space-y-1 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Planned Burn Rate</span>
          <div className="text-xl font-bold text-white font-mono flex items-center gap-1.5">
            <Percent className="w-4 h-4 shrink-0 text-zinc-400" />
            <span>{aggregates.usage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* PROJECTED VS ACTUAL CHART */}
      <div className="bg-[#181A1C] border border-[#24272C] shadow-md rounded-2xl overflow-hidden p-5">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold font-mono text-white uppercase tracking-widest flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#00B67A]" /> Projected vs Actual Spending
            </h3>
            <p className="text-xs text-zinc-400 mt-1 uppercase font-mono tracking-wider">Visual breakdown of budget cushion and total allocations</p>
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
                contentStyle={{ backgroundColor: '#181A1C', borderColor: '#24272C', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                formatter={(val: number) => [formatPeso(val), undefined]}
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
      <div className="bg-[#181A1C] border border-[#24272C] shadow-md rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#24272C] flex items-center justify-between bg-[#141618]">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-zinc-500" />
            <span>Expense Category Budgets Monitor</span>
          </span>
          {saveStatus && (
            <span className="text-xs text-emerald-450 font-semibold font-mono uppercase tracking-wider animate-pulse">{saveStatus}</span>
          )}
          {!isAdmin && (
            <span className="inline-flex items-center gap-1 text-[9px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded-2xl border border-[#24272C] font-mono font-bold tracking-wider uppercase">
              <Lock className="w-3 h-3 text-zinc-550" />
              <span>Read-Only</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#181A1C]/50 text-zinc-400 font-medium uppercase tracking-[1px] font-mono border-b border-[#24272C]">
              <tr>
                <th className="p-3 border-b border-[#24272C]">Disbursement Category</th>
                <th className="p-3 border-b border-[#24272C] text-right">Planned Allocation</th>
                <th className="p-3 border-b border-[#24272C] text-right">Actual Spent</th>
                <th className="p-3 border-b border-[#24272C] text-right">Remaining Variance</th>
                <th className="p-3 border-b border-[#24272C] text-center">Efficiency Rate</th>
                <th className="p-3 border-b border-[#24272C] text-right">Status Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24272C] font-medium text-zinc-300">
              {budgetActualList.map((item, idx) => {
                const pct = Math.min(item.usagePercent, 100);
                let barColor = 'bg-white';
                let textColor = 'text-emerald-400';
                let badgeBg = 'bg-emerald-955/20 border-emerald-900/50';

                if (item.status === 'over_budget') {
                  barColor = 'bg-rose-500';
                  textColor = 'text-rose-400';
                  badgeBg = 'bg-rose-955/20 border-rose-900/50';
                } else if (item.status === 'near_limit') {
                  barColor = 'bg-amber-500';
                  textColor = 'text-amber-300';
                  badgeBg = 'bg-amber-955/20 border-amber-900/50';
                }

                const isEditing = editingBudget?.categoryId === item.categoryId;

                return (
                  <tr key={idx} className="hover:bg-zinc-800/20 transition">
                    {/* NAME */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-display text-xs uppercase tracking-wider text-white font-medium">
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
                                handleSaveBudgetAmount(item.categoryId, (e.target as HTMLInputElement).value);
                              }
                            }}
                            className="w-24 text-right p-1 bg-[#141618] border border-white text-xs font-mono text-white rounded-2xl"
                            autoFocus
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById(`input-bud-${item.categoryId}`) as HTMLInputElement;
                              if (input) handleSaveBudgetAmount(item.categoryId, input.value);
                            }}
                            className="p-1 px-2 bg-[#00B67A] text-white hover:bg-[#009E6B] text-[10px] font-mono font-bold uppercase tracking-wider rounded-2xl cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2.5 group select-none">
                          <span className="font-mono text-white font-bold">{formatPeso(item.plannedAmount)}</span>
                          {isAdmin && (
                            <button 
                              onClick={() => setEditingBudget({ categoryId: item.categoryId, val: String(item.plannedAmount) })}
                              className="text-[10px] text-zinc-450 hover:text-white cursor-pointer hover:underline font-bold font-mono uppercase"
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
                        <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono uppercase">
                          <span>Burn pace:</span>
                          <span className="font-bold text-zinc-300">{item.usagePercent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-[#141618] border border-[#24272C] h-1.5 rounded-2xl overflow-hidden">
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
